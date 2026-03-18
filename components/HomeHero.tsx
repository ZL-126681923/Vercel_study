"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ── 粒子系统 ──────────────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; alpha: number;
  life: number; maxLife: number;
  hue: number;
}

interface ParticleConfig {
  maxCount: number;       // 最大粒子数 50-400
  spawnRate: number;      // 生成间隔 ms（越小越快）20-150
  speed: number;          // 速度倍数 0.2-3
  size: number;           // 粒子大小倍数 0.3-3
  lifespan: number;       // 寿命倍数 0.3-3
  mouseTrail: number;     // 鼠标轨迹生成概率 0-1
  burstCount: number;     // 点击爆炸粒子数 5-50
  linkRadius: number;     // 连线检测半径 40-200
  hueShift: number;       // 色相偏移 0-360（基于青绿155）
  opacity: number;        // 整体透明度 0.1-1
}

const DEFAULT_CONFIG: ParticleConfig = {
  maxCount: 200,
  spawnRate: 60,
  speed: 1,
  size: 1,
  lifespan: 1,
  mouseTrail: 0.25,
  burstCount: 18,
  linkRadius: 120,
  hueShift: 0,
  opacity: 1,
};

function createParticle(
  x: number, y: number,
  cfg: ParticleConfig,
  burst = false
): Particle {
  const angle = Math.random() * Math.PI * 2;
  const baseSpeed = burst ? Math.random() * 4 + 1 : Math.random() * 0.6 + 0.1;
  const speed = baseSpeed * cfg.speed;
  const hue = ((Math.random() * 30 + 155) + cfg.hueShift) % 360;
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - (burst ? 0 : 0.3 * cfg.speed),
    size: burst
      ? (Math.random() * 3 + 1) * cfg.size
      : (Math.random() * 1.8 + 0.4) * cfg.size,
    alpha: burst ? 0.9 : Math.random() * 0.5 + 0.2,
    life: 0,
    maxLife: burst
      ? (Math.random() * 40 + 20) * cfg.lifespan
      : (Math.random() * 80 + 40) * cfg.lifespan,
    hue,
  };
}

// ── 文字逐字显现 ───────────────────────────────────────────────────────────────
function useTypewriter(text: string, delay = 80, startAfter = 1200) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    let i = 0;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, ++i));
        if (i >= text.length) { clearInterval(interval); setDone(true); }
      }, delay);
      return () => clearInterval(interval);
    }, startAfter);
    return () => clearTimeout(timer);
  }, [text, delay, startAfter]);
  return { displayed, done };
}

// ── 参数控制面板 ───────────────────────────────────────────────────────────────
interface SliderRowProps {
  label: string; value: number; min: number; max: number; step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}
function SliderRow({ label, value, min, max, step, format, onChange }: SliderRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ fontSize: 13, color: "#1c3a2c", width: 80, flexShrink: 0, fontWeight: 500 }}>{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 accent-[var(--accent)]"
        style={{ height: 4, cursor: "pointer" }}
        onMouseDown={e => e.stopPropagation()}
      />
      <span style={{ fontSize: 13, color: "#2d7a58", width: 38, textAlign: "right", flexShrink: 0, fontWeight: 700 }}>
        {format ? format(value) : value}
      </span>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export default function HomeHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -999, y: -999 });
  const rafRef = useRef<number>(0);
  const cfgRef = useRef<ParticleConfig>({ ...DEFAULT_CONFIG });

  const [entered, setEntered] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showSub, setShowSub] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [cfg, setCfg] = useState<ParticleConfig>({ ...DEFAULT_CONFIG });

  // cfg 变化同步到 ref（canvas loop 读 ref，不触发重渲染）
  useEffect(() => { cfgRef.current = cfg; }, [cfg]);

  const set = <K extends keyof ParticleConfig>(key: K, val: ParticleConfig[K]) =>
    setCfg(prev => ({ ...prev, [key]: val }));

  const { displayed: subText } = useTypewriter(
    "在代码与文字之间，记录思考的轨迹。探索技术的深度，分享创造的喜悦。",
    80,
    showSub ? 0 : 99999
  );

  // 开场时序
  useEffect(() => {
    const t1 = setTimeout(() => setEntered(true), 100);
    const t2 = setTimeout(() => setShowTitle(true), 400);
    const t3 = setTimeout(() => setShowSub(true), 1100);
    const t4 = setTimeout(() => setShowButtons(true), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  // 粒子 canvas（spawnRate 变化需要重建 interval → 监听 cfg.spawnRate）
  const spawnRateRef = useRef(cfg.spawnRate);
  useEffect(() => { spawnRateRef.current = cfg.spawnRate; }, [cfg.spawnRate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // 动态 spawnRate 的 interval 管理
    let spawnTimer: ReturnType<typeof setInterval>;
    const startSpawn = () => {
      clearInterval(spawnTimer);
      spawnTimer = setInterval(() => {
        const c = cfgRef.current;
        if (particlesRef.current.length < c.maxCount) {
          const zone = Math.random();
          let spawnY: number;
          if (zone < 0.4) spawnY = canvas.height + 5;
          else if (zone < 0.7) spawnY = Math.random() * canvas.height * 0.6;
          else spawnY = Math.random() * canvas.height;
          particlesRef.current.push(
            createParticle(Math.random() * canvas.width, spawnY, c)
          );
        }
      }, spawnRateRef.current);
    };
    startSpawn();

    // 每 500ms 检查 spawnRate 是否变化，变了就重建 interval
    const rateWatcher = setInterval(() => {
      if (spawnTimer && spawnRateRef.current !== cfgRef.current.spawnRate) {
        spawnRateRef.current = cfgRef.current.spawnRate;
        startSpawn();
      }
    }, 500);

    const draw = () => {
      const c = cfgRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mouse = mouseRef.current;

      // 鼠标光晕
      if (mouse.x > 0) {
        const grd = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 180);
        grd.addColorStop(0, `rgba(122,184,160,${0.06 * c.opacity})`);
        grd.addColorStop(1, "rgba(122,184,160,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 更新 & 绘制粒子
      particlesRef.current = particlesRef.current.filter(p => p.life < p.maxLife);
      for (const p of particlesRef.current) {
        p.x += p.vx; p.y += p.vy; p.life++;
        p.vy -= 0.01 * c.speed;
        const progress = p.life / p.maxLife;
        const a = p.alpha * (1 - progress) * c.opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 50%, 68%, ${a})`;
        ctx.fill();
      }

      // 鼠标附近粒子连线
      const r = c.linkRadius;
      const near = particlesRef.current.filter(p => {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        return Math.sqrt(dx * dx + dy * dy) < r;
      });
      for (let i = 0; i < near.length; i++) {
        for (let j = i + 1; j < near.length; j++) {
          const dx = near[i].x - near[j].x, dy = near[i].y - near[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < r / 2) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(122,184,160,${0.15 * (1 - dist / (r / 2)) * c.opacity})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(near[i].x, near[i].y);
            ctx.lineTo(near[j].x, near[j].y);
            ctx.stroke();
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearInterval(spawnTimer);
      clearInterval(rateWatcher);
      ro.disconnect();
    };
  }, []);

  // 自定义光标 & 鼠标互动
  useEffect(() => {
    let cx = -999, cy = -999, tx = -999, ty = -999;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX; ty = e.clientY;
      mouseRef.current = { x: e.clientX, y: e.clientY };
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        if (Math.random() < cfgRef.current.mouseTrail) {
          particlesRef.current.push(
            createParticle(e.clientX - rect.left, e.clientY - rect.top, cfgRef.current)
          );
        }
      }
    };
    const onClick = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const n = cfgRef.current.burstCount;
      for (let i = 0; i < n; i++) {
        particlesRef.current.push(
          createParticle(e.clientX - rect.left, e.clientY - rect.top, cfgRef.current, true)
        );
      }
    };

    const moveCursor = () => {
      cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
      if (cursorRef.current) cursorRef.current.style.transform = `translate(${cx - 20}px, ${cy - 20}px)`;
      if (cursorDotRef.current) cursorDotRef.current.style.transform = `translate(${tx - 3}px, ${ty - 3}px)`;
      requestAnimationFrame(moveCursor);
    };
    const raf = requestAnimationFrame(moveCursor);

    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    const onSelectStart = (e: Event) => e.preventDefault();
    const onMouseDown = (e: MouseEvent) => {
      // 面板内部的元素（input/button）不拦截，避免滑块无法拖动
      const target = e.target as HTMLElement;
      const isPanel = target.closest("[data-particle-panel]");
      if (!isPanel && e.button === 0) e.preventDefault();

      if (cursorRef.current) {
        cursorRef.current.style.border = "2px solid rgba(122,184,160,1)";
        cursorRef.current.style.background = "rgba(122,184,160,0.18)";
        cursorRef.current.style.boxShadow = "0 0 16px rgba(122,184,160,0.5), inset 0 0 8px rgba(122,184,160,0.2)";
      }
      if (cursorDotRef.current) {
        cursorDotRef.current.style.background = "rgba(158,207,186,1)";
        cursorDotRef.current.style.boxShadow = "0 0 8px rgba(122,184,160,0.8)";
      }
    };
    const onMouseUp = () => {
      if (cursorRef.current) {
        cursorRef.current.style.border = "1px solid rgba(122,184,160,0.6)";
        cursorRef.current.style.background = "transparent";
        cursorRef.current.style.boxShadow = "none";
      }
      if (cursorDotRef.current) {
        cursorDotRef.current.style.background = "rgba(122,184,160,0.9)";
        cursorDotRef.current.style.boxShadow = "none";
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("click", onClick);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("selectstart", onSelectStart);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("click", onClick);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("selectstart", onSelectStart);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      className="hero-section relative min-h-[88vh] flex items-center justify-center overflow-hidden select-none"
      onContextMenu={e => e.preventDefault()}
    >
      {/* 粒子 canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
      <div className="absolute inset-0 noise-bg pointer-events-none" />
      <div className="absolute inset-0 hero-grid pointer-events-none opacity-[0.03]" />
      <div
        className="absolute pointer-events-none"
        style={{
          top: "20%", left: "50%", transform: "translateX(-50%)",
          width: "600px", height: "600px",
          background: "radial-gradient(circle, rgba(122,184,160,0.07) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />

      {/* 自定义光标 */}
      <div
        ref={cursorRef}
        className="cursor-ring fixed top-0 left-0 w-10 h-10 rounded-full pointer-events-none z-[9999]"
        style={{ border: "1px solid rgba(122,184,160,0.6)", transition: "width 0.2s, height 0.2s, opacity 0.2s", mixBlendMode: "screen" }}
      />
      <div
        ref={cursorDotRef}
        className="fixed top-0 left-0 w-1.5 h-1.5 rounded-full pointer-events-none z-[9999]"
        style={{ background: "rgba(122,184,160,0.9)" }}
      />

      {/* ── 粒子参数面板（右上角） ── */}
      <div
        data-particle-panel
        className="absolute top-5 right-16 z-30"
        style={{ pointerEvents: "auto" }}
      >
        {/* 折叠按钮 */}
        <button
          onClick={() => setPanelOpen(o => !o)}
          title="粒子参数"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
          style={{
            background: panelOpen ? "rgba(90,158,132,0.9)" : "rgba(30,50,44,0.85)",
            border: `1px solid ${panelOpen ? "rgba(122,184,160,0.8)" : "rgba(122,184,160,0.45)"}`,
            color: "#ffffff",
            backdropFilter: "blur(8px)",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          粒子参数
          <svg
            className="w-3 h-3 transition-transform"
            style={{ transform: panelOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* 面板内容 */}
        {panelOpen && (
          <div
            className="absolute top-9 right-0 w-80 rounded-xl p-5 space-y-3"
            style={{
              background: "rgba(255,255,255,0.96)",
              border: "1px solid rgba(90,158,132,0.5)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.8)",
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span style={{ fontSize: 13, color: "#1a3a2a", letterSpacing: "0.1em", fontWeight: 700 }}>PARTICLE CONFIG</span>
              <button
                onClick={() => setCfg({ ...DEFAULT_CONFIG })}
                style={{ fontSize: 12, color: "#2d6e50", cursor: "pointer", fontWeight: 500 }}
                className="hover:opacity-100 transition-opacity"
              >
                重置
              </button>
            </div>

            <SliderRow label="最大数量" value={cfg.maxCount} min={20} max={400} step={10}
              onChange={v => set("maxCount", v)} />
            <SliderRow label="生成速率" value={cfg.spawnRate} min={20} max={200} step={5}
              format={v => `${v}ms`} onChange={v => set("spawnRate", v)} />
            <SliderRow label="速度" value={cfg.speed} min={0.1} max={4} step={0.1}
              format={v => v.toFixed(1) + "x"} onChange={v => set("speed", v)} />
            <SliderRow label="大小" value={cfg.size} min={0.2} max={4} step={0.1}
              format={v => v.toFixed(1) + "x"} onChange={v => set("size", v)} />
            <SliderRow label="寿命" value={cfg.lifespan} min={0.2} max={4} step={0.1}
              format={v => v.toFixed(1) + "x"} onChange={v => set("lifespan", v)} />
            <SliderRow label="透明度" value={cfg.opacity} min={0.05} max={1} step={0.05}
              format={v => Math.round(v * 100) + "%"} onChange={v => set("opacity", v)} />
            <SliderRow label="鼠标轨迹" value={cfg.mouseTrail} min={0} max={1} step={0.05}
              format={v => Math.round(v * 100) + "%"} onChange={v => set("mouseTrail", v)} />
            <SliderRow label="点击爆炸" value={cfg.burstCount} min={0} max={60} step={1}
              format={v => `${v}颗`} onChange={v => set("burstCount", v)} />
            <SliderRow label="连线范围" value={cfg.linkRadius} min={0} max={300} step={10}
              format={v => `${v}px`} onChange={v => set("linkRadius", v)} />
            <SliderRow label="色相偏移" value={cfg.hueShift} min={0} max={359} step={1}
              format={v => `${v}°`} onChange={v => set("hueShift", v)} />

            {/* 实时粒子数显示 */}
            <div className="pt-2 border-t" style={{ borderColor: "rgba(90,140,115,0.4)" }}>
              <span style={{ fontSize: 12, color: "#2a4a38", fontWeight: 500 }}>
                当前粒子数：
              </span>
              <LiveCount particlesRef={particlesRef} />
            </div>
          </div>
        )}
      </div>

      {/* ── 主内容 ── */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 text-center">
        {/* 顶部徽标行 */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-10 text-xs tracking-[0.2em] uppercase"
          style={{
            border: "1px solid rgba(122,184,160,0.25)",
            background: "rgba(122,184,160,0.06)",
            color: "var(--accent)",
            opacity: entered ? 1 : 0,
            transform: entered ? "translateY(0)" : "translateY(-10px)",
            transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)", boxShadow: "0 0 6px var(--accent)", animation: "pulse-dot 2s ease-in-out infinite" }} />
          Personal · Blog · Portfolio
        </div>

        {/* 主标题 */}
        <div style={{ opacity: showTitle ? 1 : 0, transform: showTitle ? "translateY(0) scale(1)" : "translateY(30px) scale(0.96)", transition: "all 0.9s cubic-bezier(0.16,1,0.3,1)" }}>
          <h1 className="font-serif leading-none mb-4" style={{ fontSize: "clamp(5rem, 14vw, 11rem)" }}>
            <span className="block" style={{ color: "var(--text-primary)", letterSpacing: "-0.04em", textShadow: "0 0 80px rgba(122,184,160,0.15)" }}>墨</span>
            <span className="block" style={{ background: "linear-gradient(135deg, var(--accent) 0%, #a8d8c8 40%, var(--accent-hover) 70%, #5a9e84 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", letterSpacing: "-0.04em", filter: "drop-shadow(0 0 30px rgba(122,184,160,0.3))" }}>迹</span>
          </h1>
        </div>

        {/* 分割线 */}
        <div className="flex items-center justify-center gap-4 mb-8" style={{ opacity: showTitle ? 1 : 0, transition: "opacity 0.8s ease 0.3s" }}>
          <div style={{ width: "60px", height: "1px", background: "linear-gradient(to right, transparent, rgba(122,184,160,0.4))" }} />
          <div style={{ width: "5px", height: "5px", background: "var(--accent)", borderRadius: "50%", boxShadow: "0 0 8px var(--accent)" }} />
          <div style={{ width: "60px", height: "1px", background: "linear-gradient(to left, transparent, rgba(122,184,160,0.4))" }} />
        </div>

        {/* 副标题打字效果 */}
        <div className="min-h-[3rem] mb-12" style={{ opacity: showSub ? 1 : 0, transition: "opacity 0.5s ease" }}>
          <p className="text-lg md:text-xl max-w-xl mx-auto leading-relaxed" style={{ color: "var(--text-secondary)", letterSpacing: "0.05em" }}>
            {subText}
            <span className="inline-block w-0.5 h-5 ml-0.5 align-middle" style={{ background: "var(--accent)", animation: "blink-cursor 1s step-end infinite" }} />
          </p>
        </div>

        {/* 按钮组 */}
        <div className="flex items-center justify-center gap-4 flex-wrap" style={{ opacity: showButtons ? 1 : 0, transform: showButtons ? "translateY(0)" : "translateY(16px)", transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
          <Link href="/blog" className="hero-btn-primary group relative overflow-hidden px-8 py-3.5 rounded-full font-medium text-sm tracking-wide" style={{ background: "var(--accent)", color: "var(--bg-primary)" }}>
            <span className="relative z-10 flex items-center gap-2">
              浏览文章
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "var(--accent-hover)" }} />
          </Link>
          <Link href="/about" className="hero-btn-outline group px-8 py-3.5 rounded-full font-medium text-sm tracking-wide transition-all" style={{ border: "1px solid rgba(122,184,160,0.35)", color: "var(--accent)" }}>
            <span className="flex items-center gap-2">
              关于我
              <svg className="w-4 h-4 opacity-60 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </span>
          </Link>
        </div>

        {/* 滚动指示 */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" style={{ opacity: showButtons ? 0.5 : 0, transition: "opacity 1s ease 0.5s" }}>
          <span style={{ fontSize: "10px", letterSpacing: "0.2em", color: "var(--text-muted)" }}>SCROLL</span>
          <div className="scroll-mouse"><div className="scroll-wheel" /></div>
        </div>
      </div>

      {/* 左侧装饰 */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center gap-3" style={{ opacity: showButtons ? 0.35 : 0, transition: "opacity 1s ease 0.8s" }}>
        <div style={{ width: "1px", height: "60px", background: "linear-gradient(to bottom, transparent, rgba(122,184,160,0.5))" }} />
        <span style={{ writingMode: "vertical-rl", fontSize: "10px", letterSpacing: "0.2em", color: "var(--text-muted)" }}>SINCE 2025</span>
        <div style={{ width: "1px", height: "60px", background: "linear-gradient(to top, transparent, rgba(122,184,160,0.5))" }} />
      </div>

      {/* 右侧装饰 */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden lg:flex flex-col items-center gap-3" style={{ opacity: showButtons ? 0.35 : 0, transition: "opacity 1s ease 0.8s" }}>
        <div style={{ width: "1px", height: "60px", background: "linear-gradient(to bottom, transparent, rgba(122,184,160,0.5))" }} />
        <span style={{ writingMode: "vertical-rl", fontSize: "10px", letterSpacing: "0.2em", color: "var(--text-muted)" }}>CODE · WRITE · THINK</span>
        <div style={{ width: "1px", height: "60px", background: "linear-gradient(to top, transparent, rgba(122,184,160,0.5))" }} />
      </div>
    </section>
  );
}

// 实时粒子计数（独立组件，每帧刷新不影响主组件）
function LiveCount({ particlesRef }: { particlesRef: React.RefObject<Particle[]> }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount(particlesRef.current?.length ?? 0), 200);
    return () => clearInterval(id);
  }, [particlesRef]);
  return <span style={{ fontSize: 13, color: "#2d7a58", fontFamily: "monospace", fontWeight: 700 }}>{count}</span>;
}
