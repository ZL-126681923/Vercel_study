"use client";

import { useEffect, useMemo, useState } from "react";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getClockHands(date: Date) {
  const ms = date.getMilliseconds();
  const seconds = date.getSeconds() + ms / 1000;
  const minutes = date.getMinutes() + seconds / 60;
  const hours = (date.getHours() % 12) + minutes / 60;

  return {
    secondDeg: seconds * 6,
    minuteDeg: minutes * 6,
    hourDeg: hours * 30,
  };
}

function AnalogClockTool() {
  const [now, setNow] = useState(() => new Date(0));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const { hourDeg, minuteDeg, secondDeg } = useMemo(() => getClockHands(now), [now]);
  const week = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

  return (
    <section className="tool-shell tool-shell-clock overflow-hidden">
      <div className="tool-background tool-background-clock" />
      <div className="tool-clock-overlay" />
      <div className="relative grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-center">
        <div className="flex justify-center">
          <div className="analog-stage">
            <div className="analog-ring" />
            <div className="analog-ring analog-ring-inner" />
            <div className="analog-clock">
              {Array.from({ length: 60 }).map((_, index) => {
                const isMajor = index % 5 === 0;
                return (
                  <span
                    key={index}
                    className={isMajor ? "tick tick-major" : "tick"}
                    style={{ transform: `rotate(${index * 6}deg)` }}
                  />
                );
              })}

              {[12, 3, 6, 9].map((mark) => (
                <span
                  key={mark}
                  className="clock-mark"
                  style={{ transform: `translate(-50%, -50%) rotate(${mark * 30}deg) translateY(-128px) rotate(-${mark * 30}deg)` }}
                >
                  {mark}
                </span>
              ))}

              <span className="hand hand-hour" style={{ transform: `translateX(-50%) rotate(${hourDeg}deg)` }} />
              <span className="hand hand-minute" style={{ transform: `translateX(-50%) rotate(${minuteDeg}deg)` }} />
              <span className="hand hand-second" style={{ transform: `translateX(-50%) rotate(${secondDeg}deg)` }} />
              <span className="clock-center" />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="tool-head">
            <div className="flex flex-wrap items-center gap-3">
              <p className="tool-kicker">模拟时钟</p>
              <span className="tool-pill">实时跳秒</span>
              <span className="tool-pill">桌面感表盘</span>
            </div>
            <p className="tool-description">
              指针每秒推进一次，同时显示数字时间、日期和星期，做成了更安静也更有质感的桌面钟面效果。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-card stat-card-clock">
              <span className="stat-label">当前时间</span>
              <span className="stat-value font-mono text-xl">
                {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
              </span>
            </div>
            <div className="stat-card stat-card-clock">
              <span className="stat-label">当前日期</span>
              <span className="stat-value">
                {now.getFullYear()}-{pad(now.getMonth() + 1)}-{pad(now.getDate())}
              </span>
            </div>
            <div className="stat-card stat-card-clock">
              <span className="stat-label">今天</span>
              <span className="stat-value">{week[now.getDay()]}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function toBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join("");

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function xorWithKey(data: Uint8Array, key: Uint8Array) {
  const output = new Uint8Array(data.length);

  for (let i = 0; i < data.length; i += 1) {
    output[i] = data[i] ^ key[i % key.length];
  }

  return output;
}

function encryptText(plainText: string, password: string) {
  if (!password) {
    throw new Error("请输入口令");
  }

  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(plainText);
  const keyBytes = encoder.encode(password);
  const encryptedBytes = xorWithKey(dataBytes, keyBytes);

  return toBase64Url(encryptedBytes);
}

function decryptText(cipherText: string, password: string) {
  if (!password) {
    throw new Error("请输入口令");
  }

  if (!cipherText.trim()) {
    return "";
  }

  const decoder = new TextDecoder();
  const keyBytes = new TextEncoder().encode(password);
  const cipherBytes = fromBase64Url(cipherText.trim());
  const plainBytes = xorWithKey(cipherBytes, keyBytes);

  return decoder.decode(plainBytes);
}

function TextCipherTool() {
  const [text, setText] = useState("你好 Hello 2026");
  const [password, setPassword] = useState("my-pass");
  const [mode, setMode] = useState<"encrypt" | "decrypt">("encrypt");
  const [copied, setCopied] = useState(false);

  const { result, errorMessage } = useMemo(() => {
    try {
      if (!text.trim()) {
        return { result: "", errorMessage: "" };
      }

      if (mode === "encrypt") {
        const encrypted = encryptText(text, password);
        return { result: encrypted, errorMessage: "" };
      }

      const decrypted = decryptText(text, password);
      return { result: decrypted, errorMessage: "" };
    } catch {
      return { result: "", errorMessage: "口令错误或密文格式无效" };
    }
  }, [mode, password, text]);

  const copyResult = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  return (
    <section className="tool-shell tool-shell-cipher overflow-hidden">
      <div className="tool-background tool-background-cipher" />
      <div className="tool-cipher-grid" />
      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_320px]">
        <div className="space-y-5">
          <div className="tool-head">
            <div className="flex flex-wrap items-center gap-3">
              <p className="tool-kicker">文字加密</p>
              <span className="tool-pill">中文不乱码</span>
              <span className="tool-pill">可逆还原</span>
            </div>
            <p className="tool-description">
              使用口令进行加密，输出 Base64URL 密文；中文、英文和符号都能稳定加密，也能快速解密还原。
            </p>
          </div>

          <div className="cipher-segmented-control" role="tablist" aria-label="文字加密模式切换">
            <button
              onClick={() => setMode("encrypt")}
              className={`cipher-segment ${mode === "encrypt" ? "cipher-segment-active" : ""}`}
              role="tab"
              aria-selected={mode === "encrypt"}
              type="button"
            >
              加密
            </button>
            <button
              onClick={() => setMode("decrypt")}
              className={`cipher-segment ${mode === "decrypt" ? "cipher-segment-active" : ""}`}
              role="tab"
              aria-selected={mode === "decrypt"}
              type="button"
            >
              解密
            </button>
          </div>

          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="输入口令"
            className="tool-input tool-input-cipher"
            type="text"
          />

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={mode === "encrypt" ? "输入你要加密的文本" : "输入你要解密的密文"}
            className="tool-textarea tool-textarea-cipher"
          />
        </div>

        <div className="space-y-4">
          <div className="result-card result-card-cipher">
            <div className="flex items-center justify-between gap-3">
              <span className="result-label">{mode === "encrypt" ? "加密结果" : "解密结果"}</span>
              <button onClick={copyResult} className="mini-action mini-action-cipher">
                {copied ? "已复制" : "复制"}
              </button>
            </div>
            <p className="result-value break-all">{errorMessage ? "—" : result || "—"}</p>
          </div>

          <div className="result-card result-card-cipher">
            <span className="result-label">状态</span>
            <p className="text-sm leading-7 text-[var(--text-secondary)]">
              {errorMessage || `已就绪：当前为${mode === "encrypt" ? "加密" : "解密"}模式`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function ColorPickerTool() {
  const [color, setColor] = useState("#7ab8a0");
  const [copiedLabel, setCopiedLabel] = useState("");

  const rgb = useMemo(() => hexToRgb(color), [color]);
  const presets = ["#7ab8a0", "#e76f51", "#264653", "#e9c46a", "#7f5af0", "#f25f5c", "#2a9d8f", "#f4efe6"];

  const values = rgb
    ? [
        { label: "HEX", value: color.toUpperCase() },
        { label: "RGB", value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
        { label: "CSS", value: `color: ${color};` },
      ]
    : [];

  const copyValue = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);
      window.setTimeout(() => setCopiedLabel(""), 1400);
    } catch {}
  };

  return (
    <section className="tool-shell tool-shell-color overflow-hidden">
      <div className="tool-background tool-background-color" />
      <div className="tool-color-paper" />
      <div className="relative grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        <div className="space-y-5">
          <div className="tool-head">
            <div className="flex flex-wrap items-center gap-3">
              <p className="tool-kicker">颜色选择</p>
              <span className="tool-pill">即时复制</span>
              <span className="tool-pill">预设色板</span>
            </div>
            <p className="tool-description">
              支持取色器、HEX 手动输入和预设色板，右侧同步给出可复制的颜色格式与实时大面积预览。
            </p>
          </div>

          <div className="glass-panel glass-panel-color flex items-center gap-4">
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="color-swatch-input"
            />
            <input
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="tool-input tool-input-color font-mono uppercase"
            />
          </div>

          <div className="color-palette-grid">
            {presets.map((preset) => (
              <button
                key={preset}
                onClick={() => setColor(preset)}
                className="color-chip"
                style={{ backgroundColor: preset }}
                title={preset}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="color-stage" style={{ background: color }}>
            <div className="color-stage-overlay" />
            <div className="color-stage-paper" />
            <div className="relative z-10 space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-white/70">实时预览</p>
              <p className="font-mono text-3xl text-white drop-shadow-[0_6px_20px_rgba(0,0,0,0.25)]">
                {color.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {values.map((item) => (
              <button key={item.label} onClick={() => copyValue(item.label, item.value)} className="result-card result-card-color text-left">
                <div className="flex items-center justify-between gap-3">
                  <span className="result-label">{item.label}</span>
                  <span className="text-xs text-[var(--accent)]">{copiedLabel === item.label ? "已复制" : "复制"}</span>
                </div>
                <p className="result-value mt-3 break-all">{item.value}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function evaluateExpression(expression: string) {
  const sanitized = expression.replace(/\s+/g, "");

  if (!sanitized || !/^[\d.+\-*/()%]+$/.test(sanitized)) {
    return null;
  }

  try {
    const result = Function(`"use strict"; return (${sanitized})`)();

    if (typeof result !== "number" || !Number.isFinite(result)) {
      return null;
    }

    return Number.isInteger(result) ? String(result) : result.toFixed(6).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  } catch {
    return null;
  }
}

function CalculatorTool() {
  const [expression, setExpression] = useState("128+64/2");
  const result = useMemo(() => evaluateExpression(expression), [expression]);

  const appendValue = (value: string) => {
    setExpression((current) => (current === "0" ? value : `${current}${value}`));
  };

  const appendParenthesis = () => {
    setExpression((current) => {
      const opens = (current.match(/\(/g) ?? []).length;
      const closes = (current.match(/\)/g) ?? []).length;
      const next = opens > closes && /[\d.)]$/.test(current) ? ")" : "(";
      return `${current}${next}`;
    });
  };

  const applyAction = (action: string) => {
    if (action === "clear") {
      setExpression("0");
      return;
    }

    if (action === "backspace") {
      setExpression((current) => {
        const next = current.slice(0, -1);
        return next || "0";
      });
      return;
    }

    if (action === "equals") {
      if (result) {
        setExpression(result);
      }
      return;
    }

    if (action === "paren") {
      appendParenthesis();
      return;
    }

    appendValue(action);
  };

  const keys: { label: string; value: string; variant?: "muted" | "operator" | "accent" | "wide" }[] = [
    { label: "AC", value: "clear", variant: "muted" },
    { label: "()", value: "paren", variant: "muted" },
    { label: "%", value: "%", variant: "muted" },
    { label: "÷", value: "/", variant: "operator" },
    { label: "7", value: "7" },
    { label: "8", value: "8" },
    { label: "9", value: "9" },
    { label: "×", value: "*", variant: "operator" },
    { label: "4", value: "4" },
    { label: "5", value: "5" },
    { label: "6", value: "6" },
    { label: "-", value: "-", variant: "operator" },
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "+", value: "+", variant: "operator" },
    { label: "0", value: "0", variant: "wide" },
    { label: ".", value: "." },
    { label: "⌫", value: "backspace", variant: "muted" },
    { label: "=", value: "equals", variant: "accent" },
  ] as const;

  return (
    <section className="tool-shell tool-shell-calc overflow-hidden">
      <div className="tool-background tool-background-calc" />
      <div className="tool-calc-grid" />
      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_380px] xl:items-start">
        <div className="space-y-5">
          <div className="tool-head">
            <div className="flex flex-wrap items-center gap-3">
              <p className="tool-kicker">计算器</p>
              <span className="tool-pill">四则运算</span>
              <span className="tool-pill">即时结果</span>
            </div>
            <p className="tool-description">
              适合做轻量算术面板，支持键盘式点击输入、括号、百分号和即时结果预览。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="result-card result-card-calc">
              <span className="result-label">当前算式</span>
              <p className="result-value break-all">{expression}</p>
            </div>
            <div className="result-card result-card-calc">
              <span className="result-label">结果</span>
              <p className="result-value">{result ?? "—"}</p>
            </div>
          </div>

          <div className="result-card result-card-calc">
            <span className="result-label">提示</span>
            <p className="text-sm leading-7 text-[var(--text-secondary)]">
              可连续输入数字与运算符，点击等号写回结果；表达式无效时不会覆盖当前内容。
            </p>
          </div>
        </div>

        <div className="calc-panel">
          <div className="calc-display">
            <span className="calc-display-label">Expression</span>
            <p className="calc-expression">{expression}</p>
            <p className="calc-result">{result ?? "…"}</p>
          </div>

          <div className="calc-keypad">
            {keys.map((key) => (
              <button
                key={`${key.label}-${key.value}`}
                onClick={() => applyAction(key.value)}
                className={`calc-key ${
                  key.variant === "operator"
                    ? "calc-key-operator"
                    : key.variant === "accent"
                      ? "calc-key-accent"
                      : key.variant === "muted"
                        ? "calc-key-muted"
                        : ""
                } ${key.variant === "wide" ? "calc-key-wide" : ""}`}
              >
                {key.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const tools = [
  {
    key: "clock",
    label: "模拟时钟",
    caption: "Desk Clock / 01",
    note: "时间卡片",
    component: <AnalogClockTool />,
  },
  {
    key: "cipher",
    label: "文字加密",
    caption: "Text Cipher / 02",
    note: "密文往返",
    component: <TextCipherTool />,
  },
  {
    key: "color",
    label: "颜色选择",
    caption: "Color Deck / 03",
    note: "色票预览",
    component: <ColorPickerTool />,
  },
  {
    key: "calc",
    label: "计算器",
    caption: "Calc Pad / 04",
    note: "即点即算",
    component: <CalculatorTool />,
  },
] as const;

export default function FrontendToolLab() {
  const [activeTool, setActiveTool] = useState<(typeof tools)[number]["key"]>("clock");

  return (
    <div className="tool-page space-y-8">
      <section className="tool-hero">
        <div className="tool-hero-grid" />
        <div className="tool-hero-noise" />
        <div className="tool-hero-glow" />
        <div className="tool-hero-orbit tool-hero-orbit-one" />
        <div className="tool-hero-orbit tool-hero-orbit-two" />
        <div className="tool-tab-strip relative z-10 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {tools.map((tool, index) => (
            <button
              key={tool.key}
              onClick={() => setActiveTool(tool.key)}
              className={`tool-tab ${activeTool === tool.key ? "tool-tab-active" : ""}`}
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-[var(--text-primary)]">{tool.label}</span>
                <span className="tool-tab-index">0{index + 1}</span>
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]/80">{tool.caption}</span>
              <span className="text-sm leading-7 text-[var(--text-secondary)]">{tool.note}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="tool-stage-frame">
        <div className="tool-stage-grid" />
        {tools.find((tool) => tool.key === activeTool)?.component}
      </div>
    </div>
  );
}
