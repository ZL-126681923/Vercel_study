"use client";

import { useState, useEffect, useRef } from "react";

const CURSOR_KEY = "site-cursor-style";
const STYLE_ID = "custom-cursor-style";

interface CursorOption {
  id: string;
  label: string;
  preview: string;
  cursorValue: string;
  hotspot: [number, number];
}

const cursorOptions: CursorOption[] = [
  {
    id: "default",
    label: "默认",
    preview: "",
    cursorValue: "",
    hotspot: [0, 0],
  },
  {
    id: "arrow",
    label: "翠竹",
    preview: "/cursors/arrow.svg",
    cursorValue: "/cursors/arrow.svg",
    hotspot: [4, 2],
  },
  {
    id: "ink",
    label: "水墨",
    preview: "/cursors/ink.svg",
    cursorValue: "/cursors/ink.svg",
    hotspot: [4, 27],
  },
  {
    id: "dot",
    label: "涟漪",
    preview: "/cursors/dot.svg",
    cursorValue: "/cursors/dot.svg",
    hotspot: [16, 16],
  },
  {
    id: "cross",
    label: "准星",
    preview: "/cursors/cross.svg",
    cursorValue: "/cursors/cross.svg",
    hotspot: [16, 16],
  },
  {
    id: "star",
    label: "星辰",
    preview: "/cursors/star.svg",
    cursorValue: "/cursors/star.svg",
    hotspot: [16, 16],
  },
  {
    id: "paw",
    label: "猫爪",
    preview: "/cursors/paw.svg",
    cursorValue: "/cursors/paw.svg",
    hotspot: [16, 16],
  },
  {
    id: "heart",
    label: "心动",
    preview: "/cursors/heart.svg",
    cursorValue: "/cursors/heart.svg",
    hotspot: [16, 16],
  },
  {
    id: "leaf",
    label: "落叶",
    preview: "/cursors/leaf.svg",
    cursorValue: "/cursors/leaf.svg",
    hotspot: [14, 20],
  },
];

function injectCursorStyle(id: string) {
  let el = document.getElementById(STYLE_ID);

  if (id === "default") {
    if (el) el.remove();
    return;
  }

  const opt = cursorOptions.find((o) => o.id === id);
  if (!opt) return;

  const [hx, hy] = opt.hotspot;
  const rule = `url('${opt.cursorValue}') ${hx} ${hy}, auto`;

  const css = `
    html, body, *, *::before, *::after {
      cursor: ${rule} !important;
    }
    a, a:hover, a:active, a:focus,
    button, button:hover, button:active, button:focus,
    [role="button"], [role="button"]:hover,
    input, select, textarea,
    label, label[for],
    [onclick], [tabindex] {
      cursor: ${rule} !important;
    }
  `;

  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

export default function CursorSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("default");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(CURSOR_KEY) || "default";
    setCurrent(saved);
    injectCursorStyle(saved);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function selectCursor(id: string) {
    setCurrent(id);
    localStorage.setItem(CURSOR_KEY, id);
    injectCursorStyle(id);
    setOpen(false);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 rounded-full bg-stone-800/50 hover:bg-stone-700/50 transition-all duration-300 flex items-center justify-center group"
        aria-label="切换鼠标样式"
        title="鼠标样式"
      >
        <svg
          className="w-5 h-5 text-theme-secondary group-hover:text-[var(--accent)] transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M13 13l6 6"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-[220px] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden z-[200] animate-fade-in backdrop-blur-sm">
          <div className="px-3 py-2.5 border-b border-[var(--border-color)] flex items-center gap-2">
            <svg
              className="w-3.5 h-3.5 text-[var(--accent)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"
              />
            </svg>
            <p className="text-xs text-theme-muted font-medium tracking-wide">
              鼠标样式
            </p>
          </div>
          <div className="p-2 grid grid-cols-3 gap-1.5">
            {cursorOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => selectCursor(opt.id)}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all duration-200 text-center ${
                  current === opt.id
                    ? "bg-[var(--accent)]/15 ring-1 ring-[var(--accent)]/50 shadow-sm shadow-[var(--accent)]/10"
                    : "hover:bg-[var(--bg-primary)]/60 hover:scale-105"
                }`}
                title={opt.label}
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  {opt.id === "default" ? (
                    <svg
                      className="w-5 h-5 text-theme-secondary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"
                      />
                    </svg>
                  ) : (
                    <img
                      src={opt.preview}
                      alt={opt.label}
                      className="w-8 h-8 object-contain drop-shadow-sm"
                      draggable={false}
                    />
                  )}
                </div>
                <span
                  className={`text-[10px] leading-tight font-medium ${
                    current === opt.id
                      ? "text-[var(--accent)]"
                      : "text-theme-muted"
                  }`}
                >
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
