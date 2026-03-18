"use client";

import { useEffect, useState } from "react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setVisible(total > 0 && scrolled / total >= 0.3);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = () => {
    setLaunching(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setLaunching(false), 800);
  };

  return (
    <button
      onClick={handleClick}
      aria-label="返回顶部"
      className={`
        fixed bottom-8 right-8 z-50
        w-11 h-11 rounded-full
        bg-[var(--bg-secondary)] border border-[var(--border-color)]
        text-[var(--accent)] shadow-lg shadow-black/20
        flex items-center justify-center
        hover:bg-[var(--accent)] hover:text-[var(--bg-primary)] hover:border-[var(--accent)]
        hover:shadow-[var(--accent)]/30 hover:shadow-xl
        transition-all duration-300
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"}
        ${launching ? "-translate-y-2 scale-110" : ""}
      `}
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`w-5 h-5 transition-transform duration-300 ${launching ? "-translate-y-1" : ""}`}
      >
        {/* 火箭身体 */}
        <path d="M12 2C12 2 7 7 7 13a5 5 0 0010 0C17 7 12 2 12 2z" opacity="0.9"/>
        {/* 火箭窗口 */}
        <circle cx="12" cy="11" r="1.5" fill="var(--bg-primary)" opacity="0.8"/>
        {/* 左翼 */}
        <path d="M7 13c-1.5 0-3 1-3 2.5L7 15v-2z" opacity="0.75"/>
        {/* 右翼 */}
        <path d="M17 13c1.5 0 3 1 3 2.5L17 15v-2z" opacity="0.75"/>
        {/* 火焰 */}
        <path
          d="M10.5 18c.5 1.5 1 2.5 1.5 3 .5-.5 1-1.5 1.5-3"
          opacity="0.6"
          className={launching ? "opacity-100" : ""}
        />
      </svg>
    </button>
  );
}
