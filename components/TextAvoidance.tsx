"use client";

import { useCallback, useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/**
 * 通用文字避让容器
 * ─────────────────────────────────────────────────────────
 * 把任意内容包进来，自动扫描内部所有文字元素，
 * 逐字符读取 DOM 里的真实位置并画到顶层 canvas 上做粒子化显示。
 * 鼠标进入时粒子被推开，离开时弹簧拉回原位。
 *
 * 特点：
 *  - DOM 文字保留（color: transparent），无障碍与布局不受影响
 *  - 鼠标事件挂在容器上而非 canvas，子元素可正常点击
 *  - ResizeObserver + MutationObserver 监听内容变化
 *  - 主题/字号变化自动重建粒子
 *  - 超过 MAX_PARTICLES 时按顺序丢弃，保持帧率
 */

interface Particle {
  char: string;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  font: string;
  fillStyle: string;
}

const REPEL_RADIUS = 90;
const REPEL_FORCE = 4.5;
const SPRING = 0.04;
const DAMPING = 0.86;
const MAX_PARTICLES = 4000;
const MIN_FONT_SIZE = 10;
const MAX_TEXT_LENGTH = 400;
const DEBOUNCE_MS = 250;

const DEFAULT_SELECTOR =
  // 常见文字标签 + 自定义 class 前缀
  "h1, h2, h3, h4, h5, h6, p, span, code, em, strong, a, button, li, small, time, blockquote, label, dt, dd, figcaption, " +
  // 首页里大量用自定义 class 的文字容器
  "[class*='taken-']";

export default function TextAvoidance({
  children,
  className = "",
  selector = DEFAULT_SELECTOR,
  as: As = "div",
  overscan = 48,
}: {
  children: ReactNode;
  className?: string;
  /** 额外指定要避让的选择器；与默认选择器合并 */
  selector?: string;
  /** 最外层标签 */
  as?: ElementType;
  /** 给粒子运动留出的额外可见空间，避免被容器边界裁掉 */
  overscan?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const particles = useRef<Particle[]>([]);
  const mouse = useRef({ x: -9999, y: -9999 });
  const raf = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ready = useRef(false);
  const [active, setActive] = useState(false);

  const setup = useCallback(async () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (raf.current) {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    }

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const pad = overscan;
    if (w === 0 || h === 0) return;

    const canvasW = w + pad * 2;
    const canvasH = h + pad * 2;

    if (canvas.width !== canvasW * dpr || canvas.height !== canvasH * dpr) {
      canvas.width = canvasW * dpr;
      canvas.height = canvasH * dpr;
    }
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.textBaseline = "middle";

    const containerRect = container.getBoundingClientRect();
    const ps: Particle[] = [];

    // 用 TreeWalker 直接走 text node，可以正确处理行内子元素导致的文字片段错位问题。
    // 每一段文字用 Range.getBoundingClientRect() 拿 DOM 里的真实位置，
    // 避免和它前后被行内元素包裹的文字重叠。
    const sel = selector;
    const matched = new Set<Element>();
    if (sel) {
      for (const el of Array.from(container.querySelectorAll(sel))) matched.add(el);
    }

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const t = (node.nodeValue || "").trim();
        if (!t) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.tagName === "CANVAS" || parent.tagName === "SCRIPT" || parent.tagName === "STYLE" || parent.tagName === "NOSCRIPT") {
          return NodeFilter.FILTER_REJECT;
        }
        // 只采集：祖先链上有任一元素命中 selector 的 text 节点
        if (sel) {
          let p: Element | null = parent;
          let ok = false;
          while (p && p !== container) {
            if (matched.has(p)) { ok = true; break; }
            p = p.parentElement;
          }
          if (!ok) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes: Text[] = [];
    let cur: Node | null = walker.nextNode();
    while (cur) {
      textNodes.push(cur as Text);
      cur = walker.nextNode();
    }

    for (const textNode of textNodes) {
      const parent = textNode.parentElement;
      if (!parent) continue;
      if (parent.closest("[data-avoidance-root]") !== container) continue;

      const style = window.getComputedStyle(parent);
      if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity || "1") === 0) continue;

      const text = textNode.nodeValue || "";
      if (!text.trim() || text.length > MAX_TEXT_LENGTH) continue;

      const fontSize = parseFloat(style.fontSize);
      if (!Number.isFinite(fontSize) || fontSize < MIN_FONT_SIZE) continue;

      const font = `${style.fontWeight || "400"} ${fontSize}px ${style.fontFamily}`;
      const color = style.color;
      ctx.font = font;

      // 直接读取每个字符在 DOM 里的真实位置，避免标题嵌套 span、
      // 中英混排、自动换行、居中对齐时出现字符重叠。
      const range = document.createRange();
      let offset = 0;
      for (const ch of text) {
        const nextOffset = offset + ch.length;
        if (!ch.trim()) {
          offset = nextOffset;
          continue;
        }
        if (ps.length >= MAX_PARTICLES) break;

        try {
          range.setStart(textNode, offset);
          range.setEnd(textNode, nextOffset);
          const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
          const charRect = rects[0];
          if (!charRect) {
            offset = nextOffset;
            continue;
          }

          const angle = Math.random() * Math.PI * 2;
          const scatter = 12 + Math.random() * 50;
          const homeX = charRect.left - containerRect.left + pad;
          const homeY = charRect.top - containerRect.top + charRect.height / 2 + pad;
          ps.push({
            char: ch,
            homeX,
            homeY,
            x: homeX + Math.cos(angle) * scatter,
            y: homeY + Math.sin(angle) * scatter,
            vx: 0,
            vy: 0,
            font,
            fillStyle: color,
          });
        } catch {
          // 极少数情况下 Range 可能无法定位该字符，直接跳过即可。
        }

        offset = nextOffset;
      }
      range.detach();
    }

    particles.current = ps;

    const animate = () => {
      ctx.clearRect(0, 0, canvasW, canvasH);

      const { x: mx, y: my } = mouse.current;

      for (const p of particles.current) {
        const dx = p.x - mx;
        const dy = p.y - my;
        const d2 = dx * dx + dy * dy;

        if (d2 < REPEL_RADIUS * REPEL_RADIUS && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = ((REPEL_RADIUS - d) / REPEL_RADIUS) * REPEL_FORCE;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }

        p.vx += (p.homeX - p.x) * SPRING;
        p.vy += (p.homeY - p.y) * SPRING;
        p.vx *= DAMPING;
        p.vy *= DAMPING;
        p.x += p.vx;
        p.y += p.vy;

        const distFromHome = Math.sqrt((p.x - p.homeX) ** 2 + (p.y - p.homeY) ** 2);
        const alpha = Math.max(0.5, 1 - distFromHome / 250);

        ctx.save();
        ctx.font = p.font;
        ctx.fillStyle = p.fillStyle;
        ctx.globalAlpha = alpha;
        ctx.fillText(p.char, p.x, p.y);
        ctx.restore();
      }

      if (!ready.current) {
        ready.current = true;
        setActive(true);
      }

      raf.current = requestAnimationFrame(animate);
    };

    raf.current = requestAnimationFrame(animate);
  }, [overscan, selector]);

  const scheduleSetup = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void setup();
    }, DEBOUNCE_MS);
  }, [setup]);

  useEffect(() => {
    void setup();

    window.addEventListener("resize", scheduleSetup);

    let ro: ResizeObserver | null = null;
    let mo: MutationObserver | null = null;
    if (containerRef.current) {
      ro = new ResizeObserver(scheduleSetup);
      ro.observe(containerRef.current);

      mo = new MutationObserver(scheduleSetup);
      mo.observe(containerRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    return () => {
      window.removeEventListener("resize", scheduleSetup);
      if (ro) ro.disconnect();
      if (mo) mo.disconnect();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [setup, scheduleSetup]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
      mouse.current = { x: -9999, y: -9999 };
    } else {
      mouse.current = { x, y };
    }
  }, []);

  const onPointerLeave = useCallback(() => {
    mouse.current = { x: -9999, y: -9999 };
  }, []);

  return (
    <As
      ref={containerRef as React.Ref<HTMLElement>}
      data-avoidance-root
      className={`relative overflow-visible ${className}`}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div
        style={active ? { opacity: 0 } : undefined}
        aria-hidden={active ? "true" : undefined}
      >
        {children}
      </div>
      <canvas
        ref={canvasRef}
        className="absolute touch-none pointer-events-none"
        style={{
          left: -overscan,
          top: -overscan,
          width: `calc(100% + ${overscan * 2}px)`,
          height: `calc(100% + ${overscan * 2}px)`,
        }}
        aria-hidden="true"
      />
    </As>
  );
}
