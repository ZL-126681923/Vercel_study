"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

/**
 * 「已记下。」页面专用的粒子背景层
 * ── 主题感知：暗色用青绿，浅色用墨绿
 * ── 三种艺术预设：墨韵 / 星尘 / 萤火
 * ── 鼠标移动：尾迹粒子
 * ── 鼠标点击：爆破粒子
 * ── 鼠标附近：粒子连线
 * ── 参数可实时调节：暴露给父组件以承载控制面板
 * ── 持续补充：缓慢生成新粒子，保持氛围
 */

export interface ParticleConfig {
  preset: "ink" | "stardust" | "firefly";
  maxCount: number;        // 粒子总数 30-400
  speed: number;           // 速度倍数 0.2-3
  size: number;            // 粒子大小倍数 0.3-3
  lifespan: number;        // 寿命倍数 0.3-3
  mouseTrail: number;      // 鼠标轨迹生成概率 0-1
  burstCount: number;      // 点击爆炸粒子数 0-60
  linkRadius: number;      // 连线检测半径 0-240
  linkOpacity: number;     // 连线透明度 0-1
  glowRadius: number;      // 鼠标光晕半径 0-400
  opacity: number;         // 整体透明度 0.1-1
  drift: number;           // 漂浮扰动 0-1
}

export const DEFAULT_PARTICLE_CONFIG: ParticleConfig = {
  preset: "ink",
  maxCount: 180,
  speed: 1,
  size: 1,
  lifespan: 1,
  mouseTrail: 0.18,
  burstCount: 18,
  linkRadius: 110,
  linkOpacity: 0.6,
  glowRadius: 220,
  opacity: 1,
  drift: 0,
};

interface ParticlePreset {
  name: string;
  description: string;
  base: ParticleConfig;
}

export const PARTICLE_PRESETS: ParticlePreset[] = [
  {
    name: "墨韵",
    description: "水墨质感 · 青绿主调 · 笔触沉静",
    base: { ...DEFAULT_PARTICLE_CONFIG, preset: "ink" },
  },
  {
    name: "星尘",
    description: "冷蓝星点 · 明亮短促 · 神秘疏朗",
    base: {
      ...DEFAULT_PARTICLE_CONFIG,
      preset: "stardust",
      maxCount: 240,
      speed: 0.7,
      size: 0.9,
      lifespan: 0.6,
      mouseTrail: 0.12,
      burstCount: 24,
      linkRadius: 90,
      linkOpacity: 0.45,
      glowRadius: 160,
      drift: 0.3,
    },
  },
  {
    name: "萤火",
    description: "暖色微光 · 缓慢漂浮 · 温润生灵",
    base: {
      ...DEFAULT_PARTICLE_CONFIG,
      preset: "firefly",
      maxCount: 140,
      speed: 0.6,
      size: 1.3,
      lifespan: 1.6,
      mouseTrail: 0.22,
      burstCount: 14,
      linkRadius: 70,
      linkOpacity: 0.35,
      glowRadius: 260,
      drift: 0.6,
      opacity: 0.9,
    },
  },
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  hue: number;
  sat: number;
  light: number;
  twinkle: number;
}

interface ThemePalette {
  primary: string;
  glow: string;
  link: string;
  base: number;
  hueRange: [number, number];
  satRange: [number, number];
  lightRange: [number, number];
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function readPalette(preset: ParticleConfig["preset"], isDark: boolean): ThemePalette {
  if (preset === "stardust") {
    return isDark
      ? {
          primary: "148,196,255",
          glow: "rgba(148,196,255,0.08)",
          link: "148,196,255",
          base: 0.4,
          hueRange: [200, 230],
          satRange: [55, 75],
          lightRange: [70, 85],
        }
      : {
          primary: "70,120,200",
          glow: "rgba(70,120,200,0.06)",
          link: "70,120,200",
          base: 0.3,
          hueRange: [205, 235],
          satRange: [45, 65],
          lightRange: [50, 70],
        };
  }
  if (preset === "firefly") {
    return isDark
      ? {
          primary: "255,210,120",
          glow: "rgba(255,210,120,0.10)",
          link: "255,210,120",
          base: 0.45,
          hueRange: [40, 58],
          satRange: [70, 90],
          lightRange: [65, 80],
        }
      : {
          primary: "210,140,60",
          glow: "rgba(210,140,60,0.07)",
          link: "210,140,60",
          base: 0.35,
          hueRange: [30, 50],
          satRange: [60, 80],
          lightRange: [50, 68],
        };
  }
  if (isDark) {
    return {
      primary: "122,184,160",
      glow: "rgba(122,184,160,0.07)",
      link: "122,184,160",
      base: 0.35,
      hueRange: [150, 175],
      satRange: [35, 55],
      lightRange: [60, 75],
    };
  }
  return {
    primary: "61,125,101",
    glow: "rgba(61,125,101,0.05)",
    link: "61,125,101",
    base: 0.3,
    hueRange: [155, 180],
    satRange: [30, 50],
    lightRange: [45, 65],
  };
}

function createParticle(
  x: number,
  y: number,
  cfg: ParticleConfig,
  pal: ThemePalette,
  burst = false
): Particle {
  const angle = Math.random() * Math.PI * 2;
  const baseSpeed = burst ? rand(1.5, 4) : rand(0.05, 0.5);
  const speed = baseSpeed * cfg.speed;
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - (burst ? 0 : 0.2 * cfg.speed),
    size: burst ? rand(1.2, 2.6) * cfg.size : rand(0.4, 1.6) * cfg.size,
    alpha: burst ? rand(0.7, 0.95) : rand(0.18, 0.55),
    life: 0,
    maxLife: burst ? rand(40, 70) * cfg.lifespan : rand(120, 280) * cfg.lifespan,
    hue: rand(pal.hueRange[0], pal.hueRange[1]),
    sat: rand(pal.satRange[0], pal.satRange[1]),
    light: rand(pal.lightRange[0], pal.lightRange[1]),
    twinkle: rand(0, Math.PI * 2),
  };
}

export interface TakenParticlesHandle {
  getCount: () => number;
  burst: (x: number, y: number, n?: number) => void;
}

interface Props {
  config: ParticleConfig;
  burstOnHashChange?: boolean;
  /** 当外部提供一个"标记"变化时，自动触发一次爆破 */
  burstTrigger?: number;
}

const TakenParticles = forwardRef<TakenParticlesHandle, Props>(function TakenParticles(
  { config, burstOnHashChange = false, burstTrigger = 0 },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  const rafRef = useRef<number>(0);
  const cfgRef = useRef<ParticleConfig>(config);
  const [themeTick, setThemeTick] = useState(0);
  const isDark = useMemo(() => {
    if (typeof document === "undefined") return true;
    void themeTick;
    return document.documentElement.getAttribute("data-theme") !== "light";
  }, [themeTick]);
  const palette = useMemo(() => readPalette(config.preset, isDark), [config.preset, isDark]);

  useImperativeHandle(
    ref,
    () => ({
      getCount: () => particlesRef.current.length,
      burst: (x: number, y: number, n = 20) => {
        const c = cfgRef.current;
        for (let i = 0; i < n; i++) {
          particlesRef.current.push(createParticle(x, y, c, palette, true));
        }
      },
    }),
    [palette]
  );

  // 同步配置
  useEffect(() => {
    cfgRef.current = config;
  }, [config]);

  // 监听主题切换
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onTheme = () => setThemeTick((t) => t + 1);
    const obs = new MutationObserver(onTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // 初始撒点
    const seed = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const n = Math.min(cfgRef.current.maxCount, Math.floor((w * h) / 14000));
      for (let i = 0; i < n; i++) {
        particlesRef.current.push(createParticle(Math.random() * w, Math.random() * h, cfgRef.current, palette, false));
      }
    };
    seed();

    // 鼠标事件
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
      if (Math.random() < cfgRef.current.mouseTrail) {
        particlesRef.current.push(createParticle(mouseRef.current.x, mouseRef.current.y, cfgRef.current, palette, false));
      }
    };
    const onLeave = () => { mouseRef.current.active = false; };
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const n = cfgRef.current.burstCount;
      for (let i = 0; i < n; i++) {
        particlesRef.current.push(createParticle(x, y, cfgRef.current, palette, true));
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("click", onClick);

    // 监听主题切换
    const onTheme = () => {
      setThemeTick((t) => t + 1);
    };
    const themeObserver = new MutationObserver(onTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      const c = cfgRef.current;
      const pal = palette;

      // 鼠标光晕
      if (mouseRef.current.active && c.glowRadius > 0) {
        const { x, y } = mouseRef.current;
        const grd = ctx.createRadialGradient(x, y, 0, x, y, c.glowRadius);
        grd.addColorStop(0, pal.glow);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
      }

      // 更新粒子
      const next: Particle[] = [];
      const drift = c.drift;
      const isTwinkle = c.preset !== "ink";
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (drift > 0) p.vx += Math.sin((p.life + p.twinkle) * 0.04) * 0.012 * drift;
        p.vy -= 0.006;
        p.vx *= 0.992;
        p.vy *= 0.992;
        p.life++;
        p.twinkle += 0.06;
        if (p.life < p.maxLife) next.push(p);
      }
      particlesRef.current = next;

      // 持续补充（保持密度）
      if (particlesRef.current.length < c.maxCount && Math.random() < 0.4) {
        particlesRef.current.push(
          createParticle(Math.random() * w, Math.random() * h, c, pal, false)
        );
      }
      if (particlesRef.current.length > c.maxCount) {
        particlesRef.current.splice(0, particlesRef.current.length - c.maxCount);
      }

      // 全局细丝连线：营造星图 / 经络氛围（不依赖鼠标，整片场域始终被织在一起）
      if (c.linkOpacity > 0) {
        const parts = particlesRef.current;
        const R = 38;                 // 邻接半径较小，只连最近的点 → 纤细的网
        const R2 = R * R;
        const maxLines = 800;         // 上限保护，绘制成本封顶
        let drawn = 0;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < parts.length && drawn < maxLines; i++) {
          const pi = parts[i];
          for (let j = i + 1; j < parts.length && drawn < maxLines; j++) {
            const pj = parts[j];
            const dx = pi.x - pj.x, dy = pi.y - pj.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < R2) {
              const dist = Math.sqrt(d2);
              const la = 0.10 * (1 - dist / R) * c.linkOpacity * c.opacity;
              if (la > 0.004) {
                ctx.strokeStyle = `rgba(${pal.link}, ${la})`;
                ctx.beginPath();
                ctx.moveTo(pi.x, pi.y);
                ctx.lineTo(pj.x, pj.y);
                ctx.stroke();
                drawn++;
              }
            }
          }
        }
      }

      // 绘制粒子：柔光晕 + 亮核（星尘/萤火叠加发光，水墨保持沉静）
      const additive = c.preset !== "ink";
      if (additive) ctx.globalCompositeOperation = "lighter";
      for (const p of particlesRef.current) {
        const progress = p.life / p.maxLife;
        const fadeIn = Math.min(1, p.life / 16);            // 缓入，避免硬生生冒出来
        const fadeOut = 1 - progress;
        const env = fadeIn * fadeOut * fadeOut;             // 平滑的生命包络
        const twinkleFactor = isTwinkle ? (0.62 + 0.38 * Math.sin(p.twinkle)) : 1;
        const a = p.alpha * env * pal.base * 2.6 * twinkleFactor * c.opacity;
        if (a <= 0.002) continue;
        const col = `${p.hue}, ${p.sat}%, ${p.light}%`;
        const haloR = p.size * (additive ? 4.6 : 3.1);
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloR);
        grd.addColorStop(0, `hsla(${col}, ${Math.min(1, a)})`);
        grd.addColorStop(0.42, `hsla(${col}, ${Math.max(0, a * 0.32)})`);
        grd.addColorStop(1, `hsla(${col}, 0)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, haloR, 0, Math.PI * 2);
        ctx.fill();
        // 亮核
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${col}, ${Math.min(1, a * 1.7)})`;
        ctx.fill();
      }
      if (additive) ctx.globalCompositeOperation = "source-over";

      // 鼠标附近粒子连线
      if (c.linkRadius > 0 && c.linkOpacity > 0 && mouseRef.current.active) {
        const r = c.linkRadius;
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        const near: Particle[] = [];
        for (const p of particlesRef.current) {
          const dx = p.x - mx, dy = p.y - my;
          if (dx * dx + dy * dy < r * r) near.push(p);
        }
        for (let i = 0; i < near.length; i++) {
          for (let j = i + 1; j < near.length; j++) {
            const dx = near[i].x - near[j].x;
            const dy = near[i].y - near[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < r / 1.6) {
              const a = 0.22 * (1 - dist / (r / 1.6)) * c.linkOpacity;
              ctx.beginPath();
              ctx.strokeStyle = `rgba(${pal.link}, ${a})`;
              ctx.lineWidth = 0.5;
              ctx.moveTo(near[i].x, near[i].y);
              ctx.lineTo(near[j].x, near[j].y);
              ctx.stroke();
            }
          }
        }
        const cursorGlow = ctx.createRadialGradient(mx, my, 0, mx, my, 14);
        cursorGlow.addColorStop(0, `rgba(${pal.link}, 0.9)`);
        cursorGlow.addColorStop(0.35, `rgba(${pal.link}, 0.35)`);
        cursorGlow.addColorStop(1, `rgba(${pal.link}, 0)`);
        ctx.fillStyle = cursorGlow;
        ctx.beginPath();
        ctx.arc(mx, my, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("click", onClick);
    };
  }, [palette]);

  // 外部触发：指纹变化时全屏爆破
  useEffect(() => {
    if (!burstOnHashChange || burstTrigger === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    const c = cfgRef.current;
    const count = 80;
    for (let i = 0; i < count; i++) {
      const x = w * (0.2 + Math.random() * 0.6);
      const y = h * (0.3 + Math.random() * 0.4);
      particlesRef.current.push(createParticle(x, y, c, palette, true));
    }
  }, [burstTrigger, burstOnHashChange, palette]);

  return (
    <canvas
      ref={canvasRef}
      className="taken-particles"
      aria-hidden="true"
    />
  );
});

export default TakenParticles;
