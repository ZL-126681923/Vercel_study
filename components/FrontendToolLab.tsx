"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   1. JSON 格式化 / 校验
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function JsonFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [indent, setIndent] = useState(2);
  const [copied, setCopied] = useState(false);

  const format = useCallback(() => {
    if (!input.trim()) { setOutput(""); setError(""); return; }
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indent));
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setOutput("");
    }
  }, [input, indent]);

  useEffect(() => { format(); }, [format]);

  const compress = () => {
    if (!input.trim()) return;
    try { setOutput(JSON.stringify(JSON.parse(input))); setError(""); } catch (e) { setError((e as Error).message); }
  };

  const copy = async () => {
    if (!output) return;
    try { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] px-2 py-1">
          <span className="text-[10px] text-[var(--text-muted)]">缩进</span>
          {[2, 4].map((n) => (
            <button key={n} onClick={() => setIndent(n)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-mono transition-colors ${indent === n ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}
            >{n}</button>
          ))}
        </div>
        <button onClick={compress} className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)]/30 hover:text-[var(--text-primary)] active:scale-[0.97]">压缩</button>
        <button onClick={copy} className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs transition-colors hover:border-[var(--accent)]/30 active:scale-[0.97]" style={{ color: copied ? "var(--accent)" : "var(--text-secondary)" }}>{copied ? "已复制" : "复制结果"}</button>
        {error && <span className="text-xs text-red-400">格式错误</span>}
        {!error && input.trim() && <span className="text-xs text-[var(--accent)]">有效 JSON</span>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="粘贴 JSON…"
          className="h-72 w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]/40 p-4 font-mono text-xs leading-6 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/30 focus:border-[var(--accent)]/40 focus:outline-none" />
        <pre className="h-72 overflow-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]/40 p-4 font-mono text-xs leading-6 text-[var(--text-primary)]">
          {error ? <span className="text-red-400">{error}</span> : output || <span className="text-[var(--text-muted)]/30">格式化结果</span>}
        </pre>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   2. 时间戳转换
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TimestampTool() {
  const [now, setNow] = useState(Date.now());
  const [tsInput, setTsInput] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [tsResult, setTsResult] = useState("");
  const [dateResult, setDateResult] = useState("");

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const tsToDate = () => {
    if (!tsInput.trim()) return;
    let ts = Number(tsInput.trim());
    if (String(ts).length === 10) ts *= 1000;
    if (isNaN(ts)) { setTsResult("无效时间戳"); return; }
    const d = new Date(ts);
    setTsResult(d.toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + `\n${d.toISOString()}`);
  };

  const dateToTs = () => {
    if (!dateInput.trim()) return;
    const d = new Date(dateInput.trim());
    if (isNaN(d.getTime())) { setDateResult("无效日期"); return; }
    setDateResult(`秒: ${Math.floor(d.getTime() / 1000)}\n毫秒: ${d.getTime()}`);
  };

  const copyText = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  const nowSec = Math.floor(now / 1000);

  return (
    <div className="flex flex-col gap-6">
      {/* 当前时间 */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]/40 p-4">
        <div className="mb-2 text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">当前时间</div>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <button onClick={() => copyText(String(nowSec))} title="点击复制" className="group font-mono text-2xl font-extralight text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]">
            {nowSec}
            <span className="ml-1.5 text-xs text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent)]">秒</span>
          </button>
          <span className="text-sm text-[var(--text-secondary)]">{new Date(now).toLocaleString("zh-CN", { hour12: false })}</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 时间戳 → 日期 */}
        <div className="flex flex-col gap-3">
          <div className="text-xs font-medium text-[var(--text-secondary)]">时间戳 → 日期</div>
          <div className="flex gap-2">
            <input value={tsInput} onChange={(e) => setTsInput(e.target.value)} placeholder="输入时间戳" onKeyDown={(e) => e.key === "Enter" && tsToDate()}
              className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]/40 px-4 py-2.5 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/30 focus:border-[var(--accent)]/40 focus:outline-none" />
            <button onClick={tsToDate} className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--bg-primary)] transition-all hover:bg-[var(--accent-hover)] active:scale-[0.97]">转换</button>
          </div>
          {tsResult && <pre className="rounded-lg bg-[var(--bg-secondary)]/40 p-3 font-mono text-xs leading-6 text-[var(--text-primary)]">{tsResult}</pre>}
        </div>

        {/* 日期 → 时间戳 */}
        <div className="flex flex-col gap-3">
          <div className="text-xs font-medium text-[var(--text-secondary)]">日期 → 时间戳</div>
          <div className="flex gap-2">
            <input value={dateInput} onChange={(e) => setDateInput(e.target.value)} placeholder="2025-01-01 12:00:00" onKeyDown={(e) => e.key === "Enter" && dateToTs()}
              className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]/40 px-4 py-2.5 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/30 focus:border-[var(--accent)]/40 focus:outline-none" />
            <button onClick={dateToTs} className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--bg-primary)] transition-all hover:bg-[var(--accent-hover)] active:scale-[0.97]">转换</button>
          </div>
          {dateResult && <pre className="rounded-lg bg-[var(--bg-secondary)]/40 p-3 font-mono text-xs leading-6 text-[var(--text-primary)]">{dateResult}</pre>}
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   3. 文本统计 & 对比
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TextStats() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"stats" | "transform">("stats");

  const chars = text.length;
  const charsNoSpace = text.replace(/\s/g, "").length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lines = text ? text.split("\n").length : 0;
  const zhChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const enWords = (text.match(/[a-zA-Z]+/g) || []).length;
  const numbers = (text.match(/\d+/g) || []).length;
  const readMin = Math.max(1, Math.ceil((zhChars + enWords) / 300));

  const transform = (fn: (s: string) => string) => setText(fn(text));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-lg border border-[var(--border-color)] p-1 self-start">
        {(["stats", "transform"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`rounded-md px-3 py-1 text-xs transition-colors ${mode === m ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}
          >{m === "stats" ? "统计" : "转换"}</button>
        ))}
      </div>

      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="粘贴或输入文本…"
        className="h-48 w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]/40 p-4 text-sm leading-7 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/30 focus:border-[var(--accent)]/40 focus:outline-none" />

      {mode === "stats" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "总字符", value: chars },
            { label: "不含空格", value: charsNoSpace },
            { label: "中文字数", value: zhChars },
            { label: "英文单词", value: enWords },
            { label: "数字个数", value: numbers },
            { label: "行数", value: lines },
            { label: "词数", value: words },
            { label: "阅读时间", value: `${readMin} 分钟` },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/30 px-4 py-3">
              <div className="text-[10px] text-[var(--text-muted)]">{item.label}</div>
              <div className="mt-1 font-mono text-lg font-extralight text-[var(--text-primary)]">{item.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {[
            { label: "转大写", fn: (s: string) => s.toUpperCase() },
            { label: "转小写", fn: (s: string) => s.toLowerCase() },
            { label: "去首尾空格", fn: (s: string) => s.trim() },
            { label: "去所有空格", fn: (s: string) => s.replace(/\s+/g, "") },
            { label: "去空行", fn: (s: string) => s.split("\n").filter((l) => l.trim()).join("\n") },
            { label: "去重复行", fn: (s: string) => [...new Set(s.split("\n"))].join("\n") },
            { label: "行排序", fn: (s: string) => s.split("\n").sort().join("\n") },
            { label: "反转文本", fn: (s: string) => s.split("").reverse().join("") },
          ].map((item) => (
            <button key={item.label} onClick={() => transform(item.fn)}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]/30 px-3 py-2 text-xs text-[var(--text-secondary)] transition-all hover:border-[var(--accent)]/30 hover:text-[var(--text-primary)] active:scale-[0.97]"
            >{item.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   4. 编解码工具（Base64 / URL / Unicode / HTML）
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
type CodecType = "base64" | "url" | "unicode" | "html";

function CodecTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [type, setType] = useState<CodecType>("base64");
  const [copied, setCopied] = useState(false);

  const encode = useCallback(() => {
    if (!input) { setOutput(""); return; }
    try {
      switch (type) {
        case "base64": setOutput(btoa(unescape(encodeURIComponent(input)))); break;
        case "url": setOutput(encodeURIComponent(input)); break;
        case "unicode": setOutput(input.split("").map((c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")).join("")); break;
        case "html": setOutput(input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")); break;
      }
    } catch { setOutput("编码失败"); }
  }, [input, type]);

  const decode = useCallback(() => {
    if (!input) { setOutput(""); return; }
    try {
      switch (type) {
        case "base64": setOutput(decodeURIComponent(escape(atob(input)))); break;
        case "url": setOutput(decodeURIComponent(input)); break;
        case "unicode": setOutput(input.replace(/\\u([0-9a-fA-F]{4})/g, (_, p) => String.fromCharCode(parseInt(p, 16)))); break;
        case "html": { const el = document.createElement("div"); el.innerHTML = input; setOutput(el.textContent || ""); break; }
      }
    } catch { setOutput("解码失败"); }
  }, [input, type]);

  const copy = async () => {
    if (!output) return;
    try { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  const types: { key: CodecType; label: string }[] = [
    { key: "base64", label: "Base64" },
    { key: "url", label: "URL" },
    { key: "unicode", label: "Unicode" },
    { key: "html", label: "HTML" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {types.map((t) => (
          <button key={t.key} onClick={() => { setType(t.key); setOutput(""); }}
            className={`rounded-lg px-3 py-1.5 text-xs transition-all active:scale-[0.97] ${type === t.key ? "border border-[var(--accent)]/30 bg-[var(--accent)]/15 text-[var(--accent)]" : "border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}
          >{t.label}</button>
        ))}
        <span className="mx-1 h-4 w-px bg-[var(--border-color)]" />
        <button onClick={encode} className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-medium text-[var(--bg-primary)] transition-all hover:bg-[var(--accent-hover)] active:scale-[0.97]">编码</button>
        <button onClick={decode} className="rounded-lg border border-[var(--border-color)] px-4 py-1.5 text-xs text-[var(--text-secondary)] transition-all hover:border-[var(--accent)]/30 hover:text-[var(--text-primary)] active:scale-[0.97]">解码</button>
        <button onClick={copy} className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs transition-colors active:scale-[0.97]" style={{ color: copied ? "var(--accent)" : "var(--text-muted)" }}>{copied ? "已复制" : "复制"}</button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入内容…"
          className="h-52 w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]/40 p-4 font-mono text-xs leading-6 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/30 focus:border-[var(--accent)]/40 focus:outline-none" />
        <pre className="h-52 overflow-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]/40 p-4 font-mono text-xs leading-6 text-[var(--text-primary)] break-all whitespace-pre-wrap">
          {output || <span className="text-[var(--text-muted)]/30">结果</span>}
        </pre>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   5. 颜色转换 (HEX / RGB / HSL)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function ColorTool() {
  const [hex, setHex] = useState("#7ab8a0");
  const [copied, setCopied] = useState("");

  const rgb = hexToRgb(hex);
  const hsl = rgb ? rgbToHsl(...rgb) : null;

  const formats = rgb && hsl ? [
    { label: "HEX", value: hex.toUpperCase() },
    { label: "RGB", value: `rgb(${rgb.join(", ")})` },
    { label: "HSL", value: `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)` },
    { label: "CSS var", value: `--color: ${hex};` },
  ] : [];

  const copy = async (val: string, label: string) => {
    try { await navigator.clipboard.writeText(val); setCopied(label); setTimeout(() => setCopied(""), 1500); } catch {}
  };

  const presets = ["#7ab8a0", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#1e1b18", "#f4f1ea", "#6b7280"];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4">
        {/* 取色器 */}
        <div className="relative">
          <input type="color" value={hex} onChange={(e) => setHex(e.target.value)}
            className="h-16 w-16 cursor-pointer rounded-xl border-2 border-[var(--border-color)] bg-transparent" />
        </div>
        {/* HEX 输入 */}
        <input value={hex} onChange={(e) => setHex(e.target.value)} placeholder="#000000"
          className="w-36 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]/40 px-4 py-2.5 font-mono text-sm text-[var(--text-primary)] uppercase focus:border-[var(--accent)]/40 focus:outline-none" />
        {/* 色块预览 */}
        <div className="h-10 w-10 rounded-lg shadow-inner" style={{ backgroundColor: hex }} />
      </div>

      {/* 预设色 */}
      <div className="flex flex-wrap gap-2">
        {presets.map((c) => (
          <button key={c} onClick={() => setHex(c)}
            className="h-7 w-7 rounded-lg border border-[var(--border-color)] transition-transform hover:scale-110 active:scale-95"
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>

      {/* 格式输出 */}
      {formats.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {formats.map((f) => (
            <button key={f.label} onClick={() => copy(f.value, f.label)}
              className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/30 px-4 py-3 text-left transition-all hover:border-[var(--accent)]/30 active:scale-[0.99]"
            >
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">{f.label}</div>
                <div className="mt-0.5 font-mono text-sm text-[var(--text-primary)]">{f.value}</div>
              </div>
              <span className="text-[10px] text-[var(--text-muted)]">{copied === f.label ? "已复制" : "复制"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   主组件 — 顶部选择 + 下方展示
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const TOOLS = [
  {
    key: "json",
    name: "JSON",
    icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>,
  },
  {
    key: "timestamp",
    name: "时间戳",
    icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    key: "text",
    name: "文本",
    icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>,
  },
  {
    key: "codec",
    name: "编解码",
    icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>,
  },
  {
    key: "color",
    name: "颜色",
    icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.88 2.88M6.75 17.25h.008v.008H6.75v-.008z" /></svg>,
  },
];

const TOOL_COMPONENTS: Record<string, React.ReactNode> = {
  json: <JsonFormatter />,
  timestamp: <TimestampTool />,
  text: <TextStats />,
  codec: <CodecTool />,
  color: <ColorTool />,
};

export default function FrontendToolLab() {
  const [active, setActive] = useState("json");
  const indicatorRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tabsEl = tabsRef.current;
    const indicatorEl = indicatorRef.current;
    if (!tabsEl || !indicatorEl) return;
    const activeBtn = tabsEl.querySelector(`[data-key="${active}"]`) as HTMLElement;
    if (!activeBtn) return;
    indicatorEl.style.left = `${activeBtn.offsetLeft}px`;
    indicatorEl.style.width = `${activeBtn.offsetWidth}px`;
  }, [active]);

  return (
    <div>
      {/* 顶部选择栏 */}
      <div className="relative mb-6" ref={tabsRef}>
        <div className="flex gap-1 overflow-x-auto rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/30 p-1.5 backdrop-blur-sm">
          <div ref={indicatorRef}
            className="absolute top-1.5 h-[calc(100%-12px)] rounded-xl bg-[var(--bg-card)] shadow-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border border-[var(--accent)]/15"
          />
          {TOOLS.map((tool) => (
            <button key={tool.key} data-key={tool.key} onClick={() => setActive(tool.key)}
              className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${active === tool.key ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}
            >
              <span className={`transition-colors duration-200 ${active === tool.key ? "text-[var(--accent)]" : ""}`}>{tool.icon}</span>
              <span className="hidden sm:inline">{tool.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 工具内容 */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 backdrop-blur-sm md:p-8">
        {TOOL_COMPONENTS[active]}
      </div>
    </div>
  );
}
