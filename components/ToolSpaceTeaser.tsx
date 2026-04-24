"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function ToolSpaceTeaser() {
  const pathname = usePathname();
  const ref = useRef<HTMLAnchorElement>(null);
  const [mounted, setMounted] = useState(false);
  const hidden = pathname.startsWith("/poems");

  const state = useRef({
    x: 0,
    y: 0,
    vx: 0.6 + Math.random() * 0.4,
    vy: 0.4 + Math.random() * 0.4,
    squashX: 1,
    squashY: 1,
    bounceDecay: 0,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = el.offsetWidth || 120;
    const h = el.offsetHeight || 40;

    const s = state.current;
    s.x = vw - w - 30;
    s.y = vh - h - 100;

    const dir = Math.random() * Math.PI * 2;
    const speed = 0.55 + Math.random() * 0.35;
    s.vx = Math.cos(dir) * speed;
    s.vy = Math.sin(dir) * speed;

    el.style.left = `${s.x}px`;
    el.style.top = `${s.y}px`;

    const t = setTimeout(() => setMounted(true), 150);

    let raf: number;
    let paused = false;

    const tick = () => {
      if (paused) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const s = state.current;
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      const ew = el.offsetWidth || 120;
      const eh = el.offsetHeight || 40;

      s.x += s.vx;
      s.y += s.vy;

      let hitX = false;
      let hitY = false;

      if (s.x <= 0) {
        s.x = 0;
        s.vx = Math.abs(s.vx);
        hitX = true;
      } else if (s.x >= cw - ew) {
        s.x = cw - ew;
        s.vx = -Math.abs(s.vx);
        hitX = true;
      }

      if (s.y <= 0) {
        s.y = 0;
        s.vy = Math.abs(s.vy);
        hitY = true;
      } else if (s.y >= ch - eh) {
        s.y = ch - eh;
        s.vy = -Math.abs(s.vy);
        hitY = true;
      }

      if (hitX || hitY) {
        s.bounceDecay = 1;
        s.squashX = hitX ? 0.78 : 1.15;
        s.squashY = hitY ? 0.78 : 1.15;
      }

      if (s.bounceDecay > 0.01) {
        s.bounceDecay *= 0.88;
        s.squashX += (1 - s.squashX) * 0.15;
        s.squashY += (1 - s.squashY) * 0.15;
      } else {
        s.squashX = 1;
        s.squashY = 1;
        s.bounceDecay = 0;
      }

      el.style.left = `${s.x}px`;
      el.style.top = `${s.y}px`;
      el.style.transform = `scale(${s.squashX}, ${s.squashY})`;

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    const onEnter = () => { paused = true; };
    const onLeave = () => { paused = false; };
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);

    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <Link
      ref={ref}
      href="/poems"
      className="group fixed z-50 flex items-center gap-2 rounded-full border border-[var(--accent)]/40 bg-[var(--bg-secondary)]/90 px-4 py-2.5 shadow-lg shadow-[var(--accent)]/10 backdrop-blur-md will-change-transform hover:border-[var(--accent)]/70 hover:shadow-xl hover:shadow-[var(--accent)]/25"
      style={{
        opacity: mounted && !hidden ? 1 : 0,
        pointerEvents: hidden ? "none" : "auto",
        transition: "opacity 0.5s ease, border-color 0.3s, box-shadow 0.3s",
      }}
    >
      {/* 呼吸光点 */}
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-50" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
      </span>

      {/* 图标 */}
      <svg
        className="h-4 w-4 text-[var(--accent)] transition-transform duration-500 group-hover:rotate-90"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M11.42 15.17l-5.384-3.108A2.25 2.25 0 014.5 9.98V6.34a2.25 2.25 0 011.536-2.082l5.384-1.793a2.25 2.25 0 011.16 0l5.384 1.793A2.25 2.25 0 0119.5 6.34v3.64a2.25 2.25 0 01-1.536 2.082l-5.384 3.108a2.25 2.25 0 01-2.16 0z"
        />
      </svg>

      {/* 文字 */}
      <span className="text-sm font-medium text-[var(--text-primary)]">
        诗图
      </span>

      {/* hover 箭头 */}
      <svg
        className="h-3.5 w-3.5 text-[var(--accent)] opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
