"use client";

import { useMemo, useState } from "react";

function toRgba(hex: string, opacity: number) {
  const normalized = hex.replace("#", "");
  const safeHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized.padEnd(6, "0").slice(0, 6);

  const r = Number.parseInt(safeHex.slice(0, 2), 16);
  const g = Number.parseInt(safeHex.slice(2, 4), 16);
  const b = Number.parseInt(safeHex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function rangeLabel(value: number, suffix = "px") {
  return `${value}${suffix}`;
}

export default function FrontendToolLab() {
  const [copiedKey, setCopiedKey] = useState("");

  const [clampConfig, setClampConfig] = useState({
    minSize: 16,
    maxSize: 34,
    minViewport: 375,
    maxViewport: 1440,
  });

  const [shadowConfig, setShadowConfig] = useState({
    x: 0,
    y: 18,
    blur: 48,
    spread: -14,
    opacity: 0.28,
    color: "#7ab8a0",
  });

  const [glassConfig, setGlassConfig] = useState({
    blur: 18,
    radius: 28,
    borderOpacity: 0.2,
    surfaceOpacity: 0.12,
    tint: "#9ecfba",
  });

  const clampValue = useMemo(() => {
    const { minSize, maxSize, minViewport, maxViewport } = clampConfig;
    const slope = ((maxSize - minSize) / (maxViewport - minViewport)) * 100;
    const intercept = minSize - (minViewport / 100) * slope;
    return `clamp(${minSize}px, ${intercept.toFixed(3)}px + ${slope.toFixed(
      3
    )}vw, ${maxSize}px)`;
  }, [clampConfig]);

  const shadowValue = useMemo(() => {
    const { x, y, blur, spread, opacity, color } = shadowConfig;
    return `${x}px ${y}px ${blur}px ${spread}px ${toRgba(color, opacity)}`;
  }, [shadowConfig]);

  const glassCss = useMemo(() => {
    const fill = toRgba(glassConfig.tint, glassConfig.surfaceOpacity);
    const border = toRgba(glassConfig.tint, glassConfig.borderOpacity);

    return [
      `background: ${fill};`,
      `backdrop-filter: blur(${glassConfig.blur}px);`,
      `-webkit-backdrop-filter: blur(${glassConfig.blur}px);`,
      `border: 1px solid ${border};`,
      `border-radius: ${glassConfig.radius}px;`,
      "box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);",
    ].join("\n");
  }, [glassConfig]);

  const glassPreviewStyle = useMemo(
    () => ({
      background: toRgba(glassConfig.tint, glassConfig.surfaceOpacity),
      backdropFilter: `blur(${glassConfig.blur}px)`,
      WebkitBackdropFilter: `blur(${glassConfig.blur}px)`,
      border: `1px solid ${toRgba(glassConfig.tint, glassConfig.borderOpacity)}`,
      borderRadius: `${glassConfig.radius}px`,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
    }),
    [glassConfig]
  );

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(""), 1200);
    } catch {
      setCopiedKey("");
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="relative overflow-hidden rounded-[32px] border border-[var(--border-color)] bg-[var(--bg-secondary)]/85 p-6 md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(122,184,160,0.18),transparent_34%),radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.04),transparent_20%)]" />
          <div className="absolute right-6 top-6 h-28 w-28 rounded-full border border-[var(--accent)]/15 bg-[var(--accent)]/8 blur-2xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--bg-primary)]/60 px-3 py-1 text-xs uppercase tracking-[0.28em] text-theme-accent">
              Frontend Lab
            </div>
            <h1 className="mt-5 font-serif text-4xl text-theme-primary md:text-5xl">
              模拟空间
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-theme-secondary md:text-base">
              把平时最常反复调的前端细节，做成一个可视化的小实验舱。右边是结果，左边是参数，调顺手了直接复制。
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)]/55 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-theme-muted">
                  模块 01
                </p>
                <p className="mt-2 text-lg text-theme-primary">流体字号</p>
                <p className="mt-1 text-sm text-theme-muted">给标题和正文快速算出 `clamp()`。</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)]/55 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-theme-muted">
                  模块 02
                </p>
                <p className="mt-2 text-lg text-theme-primary">阴影工坊</p>
                <p className="mt-1 text-sm text-theme-muted">拖动深浅、模糊和位移，拿到顺手阴影。</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)]/55 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-theme-muted">
                  模块 03
                </p>
                <p className="mt-2 text-lg text-theme-primary">玻璃面板</p>
                <p className="mt-1 text-sm text-theme-muted">做落在暗色页面上的毛玻璃卡片。</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-theme-muted">
                舱内状态
              </p>
              <p className="mt-1 text-theme-primary">可以直接复制的样式结果</p>
            </div>
            <span className="rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-3 py-1 text-xs text-theme-accent">
              Live
            </span>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={() => copyText("clamp", `font-size: ${clampValue};`)}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)]/60 p-4 text-left transition-all hover:border-[var(--accent)]/35"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-theme-primary">字体公式</p>
                  <p className="mt-1 font-mono text-xs text-theme-muted">
                    font-size: {clampValue};
                  </p>
                </div>
                <span className="text-xs text-theme-accent">
                  {copiedKey === "clamp" ? "已复制" : "复制"}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => copyText("shadow", `box-shadow: ${shadowValue};`)}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)]/60 p-4 text-left transition-all hover:border-[var(--accent)]/35"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-theme-primary">阴影公式</p>
                  <p className="mt-1 font-mono text-xs text-theme-muted">
                    box-shadow: {shadowValue};
                  </p>
                </div>
                <span className="text-xs text-theme-accent">
                  {copiedKey === "shadow" ? "已复制" : "复制"}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => copyText("glass", glassCss)}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)]/60 p-4 text-left transition-all hover:border-[var(--accent)]/35"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-theme-primary">玻璃面板 CSS</p>
                  <p className="mt-1 text-xs text-theme-muted">
                    背景、边框、圆角、模糊都已组合好
                  </p>
                </div>
                <span className="text-xs text-theme-accent">
                  {copiedKey === "glass" ? "已复制" : "复制"}
                </span>
              </div>
            </button>
          </div>
        </section>
      </div>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-theme-muted">
                01 / 流体字号
              </p>
              <h2 className="mt-2 text-2xl text-theme-primary">Clamp Builder</h2>
            </div>
            <span className="rounded-full border border-[var(--accent)]/20 px-3 py-1 text-xs text-theme-accent">
              Typography
            </span>
          </div>

          <div className="space-y-4">
            {[
              ["最小字号", "minSize", 12, 28],
              ["最大字号", "maxSize", 20, 72],
              ["最小视口", "minViewport", 320, 768],
              ["最大视口", "maxViewport", 960, 1920],
            ].map(([label, key, min, max]) => {
              const typedKey = key as keyof typeof clampConfig;
              const value = clampConfig[typedKey];
              return (
                <label key={key} className="block">
                  <div className="mb-2 flex items-center justify-between text-sm text-theme-secondary">
                    <span>{label}</span>
                    <span className="font-mono text-theme-accent">
                      {rangeLabel(value)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={min as number}
                    max={max as number}
                    value={value}
                    onChange={(event) =>
                      setClampConfig((prev) => ({
                        ...prev,
                        [typedKey]: Number(event.target.value),
                      }))
                    }
                    className="w-full accent-[var(--accent)]"
                  />
                </label>
              );
            })}
          </div>

          <div className="mt-6 rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-primary)]/60 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-theme-muted">
              Preview
            </p>
            <p className="mt-4 text-theme-muted">当前计算结果</p>
            <p className="mt-2 font-mono text-xs leading-6 text-theme-accent">
              {clampValue}
            </p>
            <div className="mt-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/70 p-5">
              <p style={{ fontSize: clampValue }} className="font-serif leading-tight text-theme-primary">
                模拟空间里的标题会跟着视口平滑变化。
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-theme-muted">
                02 / 阴影工坊
              </p>
              <h2 className="mt-2 text-2xl text-theme-primary">Shadow Forge</h2>
            </div>
            <span className="rounded-full border border-[var(--accent)]/20 px-3 py-1 text-xs text-theme-accent">
              Elevation
            </span>
          </div>

          <div className="space-y-4">
            {[
              ["水平偏移", "x", -40, 40],
              ["垂直偏移", "y", -10, 60],
              ["模糊半径", "blur", 0, 80],
              ["扩散半径", "spread", -30, 30],
            ].map(([label, key, min, max]) => {
              const typedKey = key as keyof typeof shadowConfig;
              const value = shadowConfig[typedKey] as number;
              return (
                <label key={key} className="block">
                  <div className="mb-2 flex items-center justify-between text-sm text-theme-secondary">
                    <span>{label}</span>
                    <span className="font-mono text-theme-accent">
                      {rangeLabel(value)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={min as number}
                    max={max as number}
                    value={value}
                    onChange={(event) =>
                      setShadowConfig((prev) => ({
                        ...prev,
                        [typedKey]: Number(event.target.value),
                      }))
                    }
                    className="w-full accent-[var(--accent)]"
                  />
                </label>
              );
            })}

            <label className="block">
              <div className="mb-2 flex items-center justify-between text-sm text-theme-secondary">
                <span>透明度</span>
                <span className="font-mono text-theme-accent">
                  {shadowConfig.opacity.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.01"
                value={shadowConfig.opacity}
                onChange={(event) =>
                  setShadowConfig((prev) => ({
                    ...prev,
                    opacity: Number(event.target.value),
                  }))
                }
                className="w-full accent-[var(--accent)]"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-sm text-theme-secondary">阴影颜色</div>
              <input
                type="color"
                value={shadowConfig.color}
                onChange={(event) =>
                  setShadowConfig((prev) => ({
                    ...prev,
                    color: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-transparent"
              />
            </label>
          </div>

          <div className="mt-6 rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-primary)]/60 p-5">
            <p className="font-mono text-xs leading-6 text-theme-accent">{shadowValue}</p>
            <div className="mt-5 flex min-h-40 items-center justify-center rounded-[26px] border border-[var(--border-color)] bg-[linear-gradient(160deg,rgba(255,255,255,0.04),rgba(122,184,160,0.06))]">
              <div
                className="rounded-[24px] border border-white/10 bg-[var(--bg-secondary)] px-8 py-6 text-theme-primary"
                style={{ boxShadow: shadowValue }}
              >
                卡片浮起来了
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-theme-muted">
                03 / 玻璃面板
              </p>
              <h2 className="mt-2 text-2xl text-theme-primary">Glass Panel</h2>
            </div>
            <span className="rounded-full border border-[var(--accent)]/20 px-3 py-1 text-xs text-theme-accent">
              Surface
            </span>
          </div>

          <div className="space-y-4">
            {[
              ["模糊强度", "blur", 4, 30],
              ["圆角", "radius", 12, 40],
            ].map(([label, key, min, max]) => {
              const typedKey = key as keyof typeof glassConfig;
              const value = glassConfig[typedKey] as number;
              return (
                <label key={key} className="block">
                  <div className="mb-2 flex items-center justify-between text-sm text-theme-secondary">
                    <span>{label}</span>
                    <span className="font-mono text-theme-accent">
                      {rangeLabel(value)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={min as number}
                    max={max as number}
                    value={value}
                    onChange={(event) =>
                      setGlassConfig((prev) => ({
                        ...prev,
                        [typedKey]: Number(event.target.value),
                      }))
                    }
                    className="w-full accent-[var(--accent)]"
                  />
                </label>
              );
            })}

            <label className="block">
              <div className="mb-2 flex items-center justify-between text-sm text-theme-secondary">
                <span>表面透明度</span>
                <span className="font-mono text-theme-accent">
                  {glassConfig.surfaceOpacity.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.04"
                max="0.3"
                step="0.01"
                value={glassConfig.surfaceOpacity}
                onChange={(event) =>
                  setGlassConfig((prev) => ({
                    ...prev,
                    surfaceOpacity: Number(event.target.value),
                  }))
                }
                className="w-full accent-[var(--accent)]"
              />
            </label>

            <label className="block">
              <div className="mb-2 flex items-center justify-between text-sm text-theme-secondary">
                <span>边框透明度</span>
                <span className="font-mono text-theme-accent">
                  {glassConfig.borderOpacity.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.06"
                max="0.45"
                step="0.01"
                value={glassConfig.borderOpacity}
                onChange={(event) =>
                  setGlassConfig((prev) => ({
                    ...prev,
                    borderOpacity: Number(event.target.value),
                  }))
                }
                className="w-full accent-[var(--accent)]"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-sm text-theme-secondary">面板色调</div>
              <input
                type="color"
                value={glassConfig.tint}
                onChange={(event) =>
                  setGlassConfig((prev) => ({
                    ...prev,
                    tint: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-transparent"
              />
            </label>
          </div>

          <div className="mt-6 rounded-[24px] border border-[var(--border-color)] bg-[linear-gradient(160deg,rgba(122,184,160,0.22),rgba(255,255,255,0.03),rgba(122,184,160,0.08))] p-5">
            <pre className="overflow-x-auto text-xs leading-6 text-theme-accent whitespace-pre-wrap">
              {glassCss}
            </pre>
            <div className="mt-5 rounded-[26px] border border-white/8 bg-[var(--bg-primary)]/55 p-4">
              <div style={glassPreviewStyle}>
                <div className="rounded-[inherit] p-5 text-theme-primary">
                  这块玻璃适合盖在深色背景和图片上。
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
