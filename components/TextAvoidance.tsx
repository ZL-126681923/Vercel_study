"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "@/components/ThemeProvider";

interface Particle {
  char: string;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  font: string;
  isTitle: boolean;
}

const REPEL_RADIUS = 120;
const REPEL_FORCE = 6;
const SPRING = 0.045;
const DAMPING = 0.87;

export default function TextAvoidance({
  title = "关于我",
  subtitle = "代码与文字的交汇处",
}: {
  title?: string;
  subtitle?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particles = useRef<Particle[]>([]);
  const mouse = useRef({ x: -9999, y: -9999 });
  const raf = useRef(0);
  const { theme } = useTheme();

  const setup = useCallback(async () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (raf.current) cancelAnimationFrame(raf.current);

    const { prepareWithSegments, layoutWithLines } = await import(
      "@chenglou/pretext"
    );

    const dpr = window.devicePixelRatio || 1;
    const { width: w, height: h } = container.getBoundingClientRect();
    if (w === 0 || h === 0) return;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const isMobile = w < 640;
    const titleSize = isMobile ? 36 : 48;
    const subSize = isMobile ? 16 : 20;
    const titleFont = `600 ${titleSize}px ui-serif, Georgia, "Noto Serif SC", serif`;
    const subFont = `400 ${subSize}px ui-sans-serif, system-ui, "Noto Sans SC", sans-serif`;
    const titleLH = titleSize * 1.4;
    const subLH = subSize * 1.5;

    const blocks = [
      { text: title, font: titleFont, isTitle: true, lh: titleLH },
      { text: subtitle, font: subFont, isTitle: false, lh: subLH },
    ];

    const ps: Particle[] = [];
    const totalH = blocks.reduce((a, b) => a + b.lh, 0) + 20;
    let y = (h - totalH) / 2 + blocks[0].lh * 0.5;

    for (const block of blocks) {
      ctx.font = block.font;
      const prepared = prepareWithSegments(block.text, block.font);
      const { lines } = layoutWithLines(prepared, w * 0.9, block.lh);

      for (const line of lines) {
        let x = (w - line.width) / 2;
        for (const ch of line.text) {
          const cw = ctx.measureText(ch).width;
          if (ch.trim()) {
            const angle = Math.random() * Math.PI * 2;
            const scatter = 200 + Math.random() * 300;
            ps.push({
              char: ch,
              font: block.font,
              isTitle: block.isTitle,
              homeX: x,
              homeY: y,
              x: x + Math.cos(angle) * scatter,
              y: y + Math.sin(angle) * scatter,
              vx: 0,
              vy: 0,
            });
          }
          x += cw;
        }
        y += block.lh;
      }
      y += 20;
    }

    particles.current = ps;

    const repelR = isMobile ? 80 : REPEL_RADIUS;

    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    const titleColor = isDark ? "#f5f5f4" : "#1c1917";
    const subColor = isDark ? "#a8a29e" : "#78716c";

    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.textBaseline = "middle";

      const { x: mx, y: my } = mouse.current;

      for (const p of particles.current) {
        const dx = p.x - mx;
        const dy = p.y - my;
        const d2 = dx * dx + dy * dy;

        if (d2 < repelR * repelR && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = ((repelR - d) / repelR) * REPEL_FORCE;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }

        p.vx += (p.homeX - p.x) * SPRING;
        p.vy += (p.homeY - p.y) * SPRING;
        p.vx *= DAMPING;
        p.vy *= DAMPING;
        p.x += p.vx;
        p.y += p.vy;

        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const rotation = speed > 0.5 ? Math.atan2(p.vy, p.vx) * 0.04 : 0;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(rotation);
        ctx.font = p.font;
        ctx.fillStyle = p.isTitle ? titleColor : subColor;
        ctx.globalAlpha = Math.min(
          1,
          1 - Math.sqrt((p.x - p.homeX) ** 2 + (p.y - p.homeY) ** 2) / 600
        );
        ctx.fillText(p.char, 0, 0);
        ctx.restore();
      }

      raf.current = requestAnimationFrame(animate);
    };

    raf.current = requestAnimationFrame(animate);
  }, [title, subtitle, theme]);

  useEffect(() => {
    setup();

    const onResize = () => {
      particles.current = [];
      setup();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf.current);
    };
  }, [setup]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    []
  );

  const onPointerLeave = useCallback(() => {
    mouse.current = { x: -9999, y: -9999 };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-[200px] md:h-[220px]">
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        aria-label={`${title} - ${subtitle}`}
        role="img"
      />
    </div>
  );
}
