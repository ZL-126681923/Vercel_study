"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import TextAvoidance from "@/components/TextAvoidance";
import TakenParticles, {
  DEFAULT_PARTICLE_CONFIG,
  PARTICLE_PRESETS,
  type ParticleConfig,
  type TakenParticlesHandle,
} from "@/app/components/TakenParticles";

/* ============================================================
 *  类型
 * ============================================================ */
interface Fingerprint {
  readAt: string;
  hour: number;
  weekday: string;
  weekOfYear: number;
  timezone: string;
  timezoneOffset: number;

  browser: string;
  os: string;
  device: string;
  isMobile: boolean;
  platform: string;
  vendor: string;
  appVersion: string;
  userAgent: string;
  pdfViewer: boolean;

  screenW: number;
  screenH: number;
  availW: number;
  availH: number;
  innerW: number;
  innerH: number;
  dpr: number;
  colorDepth: number;
  pixelDepth: number;
  touchPoints: number;
  orientation: string;

  gpu: string;
  webglVendor: string;
  webglRenderer: string;
  webglVersion: string;
  webglShading: string;
  canvasHash: string;
  audioHash: string;

  batterySupported: boolean;
  batteryLevel: number | null;
  batteryCharging: boolean | null;

  cores: number;
  memory: number | null;
  cpuArch: string;
  cpuBits: string;
  wow64: boolean | null;
  perfMemory: { used: number; total: number; limit: number } | null;

  connectionType: string;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
  ip: string;
  ipCity: string;
  ipCountry: string;
  ipRegion: string;
  ipOrg: string;
  geoSource: string;
  geoAccuracy: string;
  ipTimezone: string;
  ipLat: number | null;
  ipLon: number | null;
  timezoneAligned: boolean | null;

  primaryLanguage: string;
  allLanguages: string[];

  detectedFonts: string[];

  cookiesEnabled: boolean;
  doNotTrack: boolean | string;
  globalPrivacyControl: boolean;
  colorScheme: string;
  colorGamut: string;
  dynamicRange: string;
  contrastPreference: string;
  reducedMotion: boolean;
  forcedColors: boolean;
  displayMode: string;
  storageQuota: string;
  storageUsage: string;
  indexedDb: boolean;
  serviceWorker: boolean;

  plugins: string[];
  mimeTypes: string[];

  mediaDevices: number;
  mediaLabels: string[];

  referrer: string;
  isOnline: boolean;
  cookieEnabled: boolean;
  webdriver: boolean;
  isBot: boolean;

  combinedHash: string;
}

/* ============================================================
 *  常量 & 工具
 * ============================================================ */
const ROMAN = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
];

async function sha256(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function parseUA(ua: string) {
  let browser = "未知浏览器", os = "未知系统", device = "未知设备", isMobile = false;
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\//.test(ua) || /Opera/.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = "Chrome";
  else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = "Safari";
  else if (/Firefox\//.test(ua)) browser = "Firefox";

  if (/Windows NT 10/.test(ua)) os = "Windows 10/11";
  else if (/Windows NT 6\.3/.test(ua)) os = "Windows 8.1";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";

  if (/iPhone/.test(ua)) device = "iPhone";
  else if (/iPad/.test(ua)) device = "iPad";
  else if (/Android/.test(ua) && /Mobile/.test(ua)) device = "Android 手机";
  else if (/Android/.test(ua)) device = "Android 平板";
  else if (/Macintosh/.test(ua)) device = "Mac";
  else if (/Windows/.test(ua)) device = "PC";

  if (/Mobi|Android|iPhone|iPad/.test(ua)) isMobile = true;
  return { browser, os, device, isMobile };
}

interface HighEntropyUA {
  platform?: string;
  platformVersion?: string;
  model?: string;
  architecture?: string;
  bitness?: string;
  wow64?: boolean;
  fullVersionList?: { brand: string; version: string }[];
}

async function getHardwareHints() {
  const uaData = (navigator as Navigator & {
    userAgentData?: {
      getHighEntropyValues?: (hints: string[]) => Promise<HighEntropyUA>;
    };
  }).userAgentData;
  if (!uaData?.getHighEntropyValues) {
    return { cpuArch: "未知", cpuBits: "未知", wow64: null as boolean | null };
  }
  try {
    const high = await uaData.getHighEntropyValues(["architecture", "bitness", "wow64"]);
    return {
      cpuArch: high.architecture || "未知",
      cpuBits: high.bitness ? `${high.bitness} 位` : "未知",
      wow64: typeof high.wow64 === "boolean" ? high.wow64 : null,
    };
  } catch {
    return { cpuArch: "未知", cpuBits: "未知", wow64: null as boolean | null };
  }
}

/**
 * 用 User-Agent Client Hints 校正浏览器/系统识别。
 * UA 字符串在现代浏览器里被冻结（如 Win11 仍上报 "Windows NT 10.0"），
 * 只有 Client Hints 的 platformVersion 才能区分 Win10/11、给出准确的浏览器版本。
 * 仅 Chromium 系支持；Safari/Firefox 回退到 parseUA 的结果。
 */
async function refineUA(base: ReturnType<typeof parseUA>) {
  const uaData = (navigator as Navigator & {
    userAgentData?: {
      mobile?: boolean;
      platform?: string;
      brands?: { brand: string; version: string }[];
      getHighEntropyValues?: (hints: string[]) => Promise<HighEntropyUA>;
    };
  }).userAgentData;
  if (!uaData) return base;

  let high: HighEntropyUA = {};
  try {
    high = (await uaData.getHighEntropyValues?.(["platformVersion", "fullVersionList", "model"])) ?? {};
  } catch { /* 拿不到高熵值则仅用低熵 brands */ }

  let { browser, os, device } = base;

  // 浏览器：从 fullVersionList / brands 里挑出真实品牌（排除占位的 "Not.A/Brand"）
  const list = high.fullVersionList || uaData.brands || [];
  const real = list.find((b) => !/not.?a.?brand/i.test(b.brand));
  if (real) {
    const major = real.version.split(".")[0];
    browser = `${real.brand}${major ? ` ${major}` : ""}`
      .replace("Microsoft Edge", "Edge")
      .replace("Google Chrome", "Chrome");
  }

  // 系统：用 platformVersion 区分 Windows 版本（微软映射：13+ = Win11，1~10 = Win10）
  const platform = uaData.platform || "";
  const pv = parseInt((high.platformVersion || "").split(".")[0] || "0", 10);
  if (platform === "Windows") {
    os = pv >= 13 ? "Windows 11" : pv >= 1 ? "Windows 10" : "Windows";
  }

  // 移动端机型（如有）
  if (high.model) device = high.model;

  return {
    browser,
    os,
    device,
    isMobile: typeof uaData.mobile === "boolean" ? uaData.mobile : base.isMobile,
  };
}

function detectFonts(): string[] {
  if (typeof document === "undefined") return [];
  const BASELINE = ["monospace", "sans-serif", "serif"];
  const CANDIDATES = [
    "Georgia", "Times New Roman", "Comic Sans MS", "Impact", "Trebuchet MS",
    "Verdana", "Arial", "Courier New", "Tahoma", "Lucida Console",
    "Cambria", "Consolas", "Garamond", "Palatino", "Monaco", "Menlo",
    "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "SimSun", "SimHei",
    "Source Han Sans SC", "Noto Sans CJK SC", "Noto Serif SC",
    "FangSong", "KaiTi", "STHeiti", "STSong",
  ];
  const span = document.createElement("span");
  span.style.position = "absolute";
  span.style.left = "-9999px";
  span.style.fontSize = "72px";
  span.style.lineHeight = "normal";
  span.textContent = "mmmmmmmmmmlli";
  document.body.appendChild(span);

  const base: Record<string, { w: number; h: number }> = {};
  for (const b of BASELINE) {
    span.style.fontFamily = b;
    base[b] = { w: span.offsetWidth, h: span.offsetHeight };
  }
  const detected: string[] = [];
  for (const f of CANDIDATES) {
    let isNew = false;
    for (const b of BASELINE) {
      span.style.fontFamily = `'${f}', ${b}`;
      const w = span.offsetWidth, h = span.offsetHeight;
      if (w !== base[b].w || h !== base[b].h) { isNew = true; break; }
    }
    if (isNew) detected.push(f);
  }
  document.body.removeChild(span);
  return detected;
}

async function getCanvasFingerprint(): Promise<string> {
  try {
    const c = document.createElement("canvas");
    c.width = 320; c.height = 80;
    const ctx = c.getContext("2d");
    if (!ctx) return "不支持";
    ctx.textBaseline = "top";
    ctx.font = "16px 'Times New Roman'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(100, 1, 80, 24);
    ctx.fillStyle = "#069";
    ctx.fillText("Cwm fjordbank glyphs vext quiz, 😃", 2, 18);
    ctx.beginPath();
    ctx.arc(50, 50, 20, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = "rgba(120,200,40,0.6)";
    ctx.fill();
    return (await sha256(c.toDataURL())).slice(0, 24);
  } catch { return "失败"; }
}

async function getAudioFingerprint(): Promise<string> {
  try {
    const AC =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return "不支持";
    const ctx = new AC();
    // 自动播放策略下 AudioContext 默认是 suspended。注意：没有用户手势时 resume()
    // 返回的 Promise 可能永远 pending —— 绝不能 await，否则整个采集流程会卡死在这里。
    // 这里只做「即发即忘」的尝试，真正的兜底由下方 1.5s 超时保证。
    try { if (ctx.state === "suspended") void ctx.resume(); } catch { /* */ }
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(10000, ctx.currentTime);
    const comp = ctx.createDynamicsCompressor();
    osc.connect(comp);
    comp.connect(ctx.destination);
    osc.start(0);
    const buf = new Float32Array(2048);
    const samples = await new Promise<Float32Array>((resolve) => {
      let settled = false;
      const finish = () => { if (!settled) { settled = true; resolve(buf); } };
      // 兜底超时：即便 onaudioprocess 始终不触发（context 被挂起等），也保证 resolve
      const timer = setTimeout(finish, 1500);
      setTimeout(() => {
        try {
          const proc = ctx.createScriptProcessor(2048, 1, 1);
          osc.connect(proc);
          comp.connect(proc);
          proc.connect(ctx.destination);
          proc.onaudioprocess = (e) => {
            const data = e.inputBuffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) buf[i] = data[i];
            clearTimeout(timer);
            finish();
          };
        } catch { clearTimeout(timer); finish(); }
      }, 100);
    });
    try { osc.disconnect(); } catch { /* */ }
    void ctx.close();
    let acc = 0;
    for (let i = 0; i < samples.length; i++) acc += Math.abs(samples[i]);
    return (await sha256(String(acc))).slice(0, 24);
  } catch { return "失败"; }
}

function useTypewriter(text: string, speed = 30, enabled = true) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!enabled || !text) return;
    setOut("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, enabled]);
  return out;
}

function partOfDay(h: number) {
  if (h < 5) return "深夜";
  if (h < 9) return "清晨";
  if (h < 12) return "上午";
  if (h < 14) return "正午";
  if (h < 18) return "下午";
  if (h < 22) return "晚上";
  return "深夜";
}

function pctOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const day = (now.getTime() - start.getTime()) / 86400000;
  const yearLen = 365 + (((now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || now.getFullYear() % 400 === 0) ? 1 : 0);
  return `${Math.round((day / yearLen) * 100)}%`;
}

/* ============================================================
 *  指纹星座：将 32 字符哈希映射成一组 32 颗星的位置
 *  - 角度 = 字符值决定
 *  - 半径 = 字符位置决定
 *  - 大小 = 字符本身决定
 *  是一幅独属于这台设备的"星空画像"
 * ============================================================ */
function useConstellationPoints(hash: string) {
  return useMemo(() => {
    if (!hash) return [];
    const points: { x: number; y: number; r: number; ch: string; idx: number }[] = [];
    const n = hash.length;
    for (let i = 0; i < n; i++) {
      const ch = hash[i];
      const v = parseInt(ch, 16);
      const angle = (i / n) * Math.PI * 2 + (v / 16) * 0.4;
      const radius = 24 + (i / n) * 18 + (v / 16) * 4;
      const x = 50 + Math.cos(angle) * radius;
      const y = 50 + Math.sin(angle) * radius;
      const r = 1 + v * 0.18;
      points.push({ x, y, r, ch, idx: i });
    }
    return points;
  }, [hash]);
}

function FingerprintConstellation({ hash }: { hash: string }) {
  const points = useConstellationPoints(hash);
  const isDark = useTheme().theme === "dark";
  const stroke = isDark ? "rgba(122,184,160,0.18)" : "rgba(61,125,101,0.16)";
  const fill = isDark ? "rgba(158,207,186,0.85)" : "rgba(61,125,101,0.85)";
  const glow = isDark ? "rgba(122,184,160,0.5)" : "rgba(61,125,101,0.4)";

  if (!hash) {
    return (
      <div className="taken-constellation taken-constellation--loading">
        <svg viewBox="0 0 100 100" className="taken-constellation-svg">
          <circle cx="50" cy="50" r="48" className="taken-constellation-ring" />
          <circle cx="50" cy="50" r="36" className="taken-constellation-ring taken-constellation-ring--inner" />
          <circle cx="50" cy="50" r="20" className="taken-constellation-ring taken-constellation-ring--core" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const cx = (50 + Math.cos(a) * 40).toFixed(3);
            const cy = (50 + Math.sin(a) * 40).toFixed(3);
            return <circle key={i} cx={cx} cy={cy} r="0.5" fill="var(--accent)" opacity="0.5" />;
          })}
        </svg>
        <span className="taken-constellation-hint">正在采集指纹 · 等待画布 / 音频 / 字体回声…</span>
      </div>
    );
  }

  return (
    <div className="taken-constellation">
      <svg viewBox="0 0 100 100" className="taken-constellation-svg">
        <defs>
          <radialGradient id="constellation-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={glow} stopOpacity="0.5" />
            <stop offset="100%" stopColor={glow} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" className="taken-constellation-ring" />
        <circle cx="50" cy="50" r="40" className="taken-constellation-ring taken-constellation-ring--inner" />
        <circle cx="50" cy="50" r="20" className="taken-constellation-ring taken-constellation-ring--core" />
        <circle cx="50" cy="50" r="48" fill="url(#constellation-glow)" />

        {/* 连线：相邻点 + 跨越点（每 4 个字符） */}
        {points.map((p, i) => {
          if (i === 0) return null;
          const prev = points[i - 1];
          return (
            <line
              key={`l-${i}`}
              x1={prev.x} y1={prev.y} x2={p.x} y2={p.y}
              stroke={stroke} strokeWidth="0.25"
            />
          );
        })}
        {points.map((p, i) => {
          if (i + 4 >= points.length) return null;
          const far = points[i + 4];
          return (
            <line
              key={`lf-${i}`}
              x1={p.x} y1={p.y} x2={far.x} y2={far.y}
              stroke={stroke} strokeWidth="0.12" strokeDasharray="0.6 0.6"
            />
          );
        })}

        {/* 星点 */}
        {points.map((p) => (
          <g key={p.idx}>
            <circle cx={p.x} cy={p.y} r={p.r * 0.5} fill={glow} opacity="0.4" />
            <circle cx={p.x} cy={p.y} r={p.r * 0.25} fill={fill} />
          </g>
        ))}
      </svg>
      <div className="taken-constellation-hash" aria-label="复合指纹">
        {hash.split("").map((ch, i) => (
          <span key={i} className={`taken-constellation-ch ${i === 0 || i === hash.length - 1 ? "taken-constellation-ch--edge" : ""}`}>
            {ch}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
 *  章节子组件
 * ============================================================ */
/* 安全取值：data 还没拿到时显示「—」 */
const f = (x: unknown, fb = "—"): string => (x ?? fb) as string;

/* 实时时钟：独立组件，自己管理 setInterval，不触发父组件 re-render */
function LiveClock({ tz }: { tz?: string }) {
  const [clock, setClock] = useState("--:--:--");
  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const tick = () => {
      const d = new Date();
      setClock(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="taken-clock" aria-live="polite">
      <TextAvoidance as="span" className="taken-avoid-inline taken-clock-copy" selector=".taken-clock-label, .taken-clock-zone" overscan={20}>
        <span className="taken-clock-label">实时</span>
        {tz && <span className="taken-clock-zone">· {tz}</span>}
      </TextAvoidance>
      <span className="taken-clock-time">{clock}</span>
      <span className="taken-clock-pulse" />
    </div>
  );
}

/* "节奏"小节的高频字段单独抽出来，1s/500ms 更新不影响其他 section */
const LiveStats = ({
  index, setRef, label, loading, mouseEntropy, scrollPct, timeOnPage, mousePos,
}: {
  index: number;
  setRef: (el: HTMLElement | null) => void;
  label: string;
  loading: boolean;
  mouseEntropy: number;
  scrollPct: number;
  timeOnPage: number;
  mousePos: { x: number; y: number } | null;
}) => (
  <Section
    index={index}
    setRef={setRef}
    label={label}
    data={`停留 ${timeOnPage}s · 活跃度 ${mouseEntropy} 格`}
    meta={`滚动 ${scrollPct}% · ${mousePos ? `(${mousePos.x}, ${mousePos.y})` : "尚未移动"}`}
    emphasis="muted"
    loading={loading}
  >
    <p>光标在 <strong>{mouseEntropy}</strong> 个 100×100 网格中留下过痕迹，滚动条读到了 <strong>{scrollPct}%</strong> 的位置，你已停留 <strong>{timeOnPage}</strong> 秒。{mousePos ? <>光标在 <code>({mousePos.x}, {mousePos.y})</code>。</> : "你还没动过鼠标——这同样是一种模式。"} 把这一段轨迹送进 ML 模型，它会比你的指纹更独特。</p>
  </Section>
);

function Section({
  index,
  setRef,
  label,
  data,
  meta,
  children,
  highlight,
  mono,
  emphasis,
  loading,
}: {
  index: number;
  setRef: (el: HTMLElement | null) => void;
  label: string;
  data?: string;
  meta?: string;
  children: React.ReactNode;
  highlight?: boolean;
  mono?: boolean;
  emphasis?: "muted" | "strong" | "warn";
  loading?: boolean;
}) {
  return (
    <section
      ref={setRef}
      className={`taken-section ${highlight ? "taken-section--warn" : ""} ${emphasis ? `taken-section--${emphasis}` : ""} ${loading ? "taken-section--loading" : ""}`}
      data-index={index}
    >
      <div className="taken-section-marker">
        <span className="taken-section-num">{ROMAN[index] ?? String(index + 1)}</span>
        <span className="taken-section-line" />
        <span className="taken-section-tag">{label}</span>
      </div>
      <p className={`taken-data ${mono ? "taken-data--typing" : ""}`}>{loading ? <span className="taken-skel">正在读取…</span> : (data ?? "—")}</p>
      {meta && <p className="taken-meta">{loading ? <span className="taken-skel taken-skel--sm">握手 · 测量 · 等待</span> : meta}</p>}
      <div className="taken-body">{children}</div>
    </section>
  );
}

/* ============================================================
 *  主页面
 * ============================================================ */
export default function TakenPage() {
  const { theme } = useTheme();
  const [data, setData] = useState<Partial<Fingerprint> | null>(null);
  const [timeOnPage, setTimeOnPage] = useState(0);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [mouseEntropy, setMouseEntropy] = useState(0);
  const [scrollPct, setScrollPct] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [hasFocus, setHasFocus] = useState(true);
  const [hashTyped, setHashTyped] = useState(false);
  const [showHash, setShowHash] = useState("");
  const [fullHash, setFullHash] = useState("");
  const [showAllSections, setShowAllSections] = useState(false);

  // 粒子控制
  const [particleCfg, setParticleCfg] = useState<ParticleConfig>({ ...DEFAULT_PARTICLE_CONFIG });
  const [panelOpen, setPanelOpen] = useState(false);
  const particlesHandle = useRef<TakenParticlesHandle>(null);
  const [burstTick, setBurstTick] = useState(0);
  const [particleCount, setParticleCount] = useState(0);

  const entropyCellsRef = useRef<Set<string>>(new Set());

  /* 主题感知光标 */
  useEffect(() => {
    document.body.classList.add("taken-cursor-on");
    return () => document.body.classList.remove("taken-cursor-on");
  }, []);

  /* 计时 */
  useEffect(() => {
    const id = setInterval(() => setTimeOnPage((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  /* 鼠标：position 写入 ref 不触发渲染，每 500ms 同步到 state 一次 */
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      const cell = `${Math.floor(e.clientX / 100)}:${Math.floor(e.clientY / 100)}`;
      const s = entropyCellsRef.current;
      if (!s.has(cell)) { s.add(cell); setMouseEntropy(s.size); }
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    const id = setInterval(() => {
      if (mousePosRef.current) setMousePos(mousePosRef.current);
    }, 500);
    return () => {
      window.removeEventListener("mousemove", onMove);
      clearInterval(id);
    };
  }, []);

  /* 滚动 */
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setScrollPct(max > 0 ? Math.round((h.scrollTop / max) * 100) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* 可见性 */
  useEffect(() => {
    const onVis = () => setIsVisible(document.visibilityState === "visible");
    const onFocus = () => setHasFocus(document.hasFocus());
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onFocus);
    };
  }, []);

  /* 一次性检测：先填轻量字段（screen/locale/UA），再并行跑重型（canvas/audio/fonts/geo） */
  useEffect(() => {
    let cancelled = false;
    const detect = async () => {
      const ua = navigator.userAgent;
      const parsed = await refineUA(parseUA(ua));

      let gpu = "未能读取", webglVendor = "", webglRenderer = "";
      let webglVersion = "", webglShading = "";
      try {
        const canvas = document.createElement("canvas");
        const gl =
          (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
          (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
        if (gl) {
          webglVersion = gl.getParameter(gl.VERSION) as string;
          webglShading = gl.getParameter(gl.SHADING_LANGUAGE_VERSION) as string;
          const dbg = gl.getExtension("WEBGL_debug_renderer_info");
          if (dbg) {
            webglVendor = String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL));
            webglRenderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
            gpu = `${webglVendor} ${webglRenderer}`.trim();
          } else {
            gpu = String(gl.getParameter(gl.RENDERER));
            webglRenderer = gpu;
          }
        }
      } catch { gpu = "WebGL 被禁用"; }

      const nav = navigator as Navigator & {
        connection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
        deviceMemory?: number;
        mozConnection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
        webkitConnection?: { type?: string; effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
        getBattery?: () => Promise<{ level: number; charging: boolean }>;
      };
      const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
      const connectionType = (conn as { effectiveType?: string; type?: string } | undefined)?.effectiveType
        || (conn as { type?: string } | undefined)?.type || "未知";
      const downlink = (conn as { downlink?: number } | undefined)?.downlink ?? null;
      const rtt = (conn as { rtt?: number } | undefined)?.rtt ?? null;
      const saveData = !!(conn as { saveData?: boolean } | undefined)?.saveData;

      const navDnt = (navigator as Navigator & { doNotTrack?: string | null }).doNotTrack;
      let dnt: boolean | string = "未设置";
      if (navDnt === "1" || (window as Window & { doNotTrack?: string }).doNotTrack === "1") dnt = true;
      const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;

      const innerW = window.innerWidth, innerH = window.innerHeight;
      const screenW = screen.width, screenH = screen.height;
      const availW = screen.availWidth, availH = screen.availHeight;

      const now = new Date();
      const readAt = now.toLocaleTimeString("zh-CN", { hour12: false });
      const hour = now.getHours();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "未知";
      const tzOffset = -now.getTimezoneOffset() / 60;
      const weekday = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][now.getDay()];
      const weekOfYear = (() => {
        const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      })();

      let orientation = "未知";
      try { const o = screen.orientation; if (o && o.type) orientation = o.type; } catch { /* */ }
      const colorGamut =
        window.matchMedia?.("(color-gamut: rec2020)").matches ? "Rec.2020" :
        window.matchMedia?.("(color-gamut: p3)").matches ? "P3" :
        window.matchMedia?.("(color-gamut: srgb)").matches ? "sRGB" : "未知";
      const dynamicRange = window.matchMedia?.("(dynamic-range: high)").matches ? "HDR" : "SDR";
      const reducedMotion = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const forcedColors = !!window.matchMedia?.("(forced-colors: active)").matches;
      const contrastPreference =
        window.matchMedia?.("(prefers-contrast: more)").matches ? "更强" :
        window.matchMedia?.("(prefers-contrast: less)").matches ? "更弱" :
        window.matchMedia?.("(prefers-contrast: custom)").matches ? "自定义" : "默认";
      const displayMode = window.matchMedia?.("(display-mode: standalone)").matches ? "独立应用" : "浏览器标签页";

      const plugins: string[] = [];
      try { for (let i = 0; i < navigator.plugins.length; i++) { const p = navigator.plugins[i]; if (p.name) plugins.push(p.name); } } catch { /* */ }
      const mimeTypes: string[] = [];
      try { for (let i = 0; i < navigator.mimeTypes.length; i++) { const m = navigator.mimeTypes[i]; if (m.type) mimeTypes.push(m.type); } } catch { /* */ }

      const referrer = document.referrer || "直接抵达（无来路）";

      // 1) 先用轻量数据渲染，把首屏还给用户
      const lightData: Partial<Fingerprint> = {
        readAt, hour, weekday, weekOfYear, timezone: tz, timezoneOffset: tzOffset,
        browser: parsed.browser, os: parsed.os, device: parsed.device, isMobile: parsed.isMobile,
        platform: navigator.platform || "未知",
        vendor: navigator.vendor || "未知",
        appVersion: navigator.appVersion || "未知",
        userAgent: ua,
        pdfViewer: !!navigator.pdfViewerEnabled,
        screenW, screenH, availW, availH, innerW, innerH,
        dpr: window.devicePixelRatio, colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth, touchPoints: navigator.maxTouchPoints || 0,
        orientation,
        gpu, webglVendor, webglRenderer, webglVersion, webglShading,
        cores: navigator.hardwareConcurrency || 1,
        memory: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
        connectionType, downlink, rtt, saveData,
        primaryLanguage: navigator.language,
        allLanguages: navigator.languages ? Array.from(navigator.languages) : [],
        cookiesEnabled: navigator.cookieEnabled,
        doNotTrack: dnt,
        globalPrivacyControl: gpc,
        colorScheme: window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "深色" : "浅色",
        colorGamut, dynamicRange, contrastPreference, reducedMotion, forcedColors, displayMode,
        indexedDb: !!window.indexedDB,
        serviceWorker: "serviceWorker" in navigator,
        plugins, mimeTypes,
        referrer,
        isOnline: navigator.onLine, cookieEnabled: navigator.cookieEnabled,
        webdriver: !!navigator.webdriver, isBot: /bot|spider|crawl/i.test(ua),
      };
      if (cancelled) return;
      setData(prev => ({ ...(prev || {}), ...lightData }));

      // 2) 让出主线程，等浏览器空闲再跑重型检测
      await new Promise<void>((r) => {
        const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
        if (ric) ric(() => r());
        else setTimeout(r, 50);
      });
      if (cancelled) return;

      // 3) 并行跑重型检测
      const [{ cpuArch, cpuBits, wow64 }, batteryResult, storageResult, mediaResult, geoResult, perfMemory, detectedFonts, canvasHash, audioHash] = await Promise.all([
        getHardwareHints().catch(() => ({ cpuArch: "未知", cpuBits: "未知", wow64: null as boolean | null })),
        (async () => {
          try {
            if (typeof nav.getBattery === "function") {
              const b = await nav.getBattery();
              return { supported: true, level: Math.round(b.level * 100), charging: b.charging };
            }
          } catch { /* */ }
          return { supported: false, level: null as number | null, charging: null as boolean | null };
        })(),
        (async () => {
          try {
            if (navigator.storage && navigator.storage.estimate) {
              const est = await navigator.storage.estimate();
              return {
                quota: est.quota ? `${(est.quota / (1024 * 1024 * 1024)).toFixed(2)} GB` : "未知",
                usage: est.usage ? `${(est.usage / (1024 * 1024)).toFixed(2)} MB` : "0 MB",
              };
            }
          } catch { /* */ }
          return { quota: "未知", usage: "0 MB" };
        })(),
        (async () => {
          try {
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
              const list = await navigator.mediaDevices.enumerateDevices();
              const labels: string[] = [];
              for (const d of list) if (d.label && labels.length < 4) labels.push(d.label);
              return { count: list.length, labels };
            }
          } catch { /* */ }
          return { count: 0, labels: [] as string[] };
        })(),
        (async () => {
          try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 4000);
            const r = await fetch("/api/geo", { signal: ctrl.signal });
            clearTimeout(t);
            if (r.ok) {
              const j = await r.json();
              return {
                ip: j.ip || "未知", ipCity: j.city || "未知", ipCountry: j.country || "未知",
                ipRegion: j.region || "未知", ipOrg: j.org || j.org_asn || "未知",
                ipTimezone: j.timezone || "未知", geoSource: j.source || "未知",
                ipLat: typeof j.latitude === "number" ? j.latitude : null,
                ipLon: typeof j.longitude === "number" ? j.longitude : null,
              };
            }
          } catch { /* */ }
          return { ip: "未知", ipCity: "未知", ipCountry: "未知", ipRegion: "未知",
            ipOrg: "未知", ipTimezone: "未知", geoSource: "未知", ipLat: null as number | null, ipLon: null as number | null };
        })(),
        (async () => {
          try {
            const perf = performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } };
            if (perf.memory) {
              return {
                used: Math.round(perf.memory.usedJSHeapSize / (1024 * 1024)),
                total: Math.round(perf.memory.totalJSHeapSize / (1024 * 1024)),
                limit: Math.round(perf.memory.jsHeapSizeLimit / (1024 * 1024)),
              } as Fingerprint["perfMemory"];
            }
          } catch { /* */ }
          return null as Fingerprint["perfMemory"];
        })(),
        // 字体测量最重（28+ 次 layout），用 rAF 让前面的并发先发出去
        new Promise<string[]>((resolve) => {
          if (typeof requestAnimationFrame !== "undefined") requestAnimationFrame(() => resolve(detectFonts()));
          else setTimeout(() => resolve(detectFonts()), 0);
        }),
        getCanvasFingerprint().catch(() => "失败"),
        getAudioFingerprint().catch(() => "失败"),
      ]);
      if (cancelled) return;

      const ipTimezone = geoResult.ipTimezone;
      const timezoneAligned = ipTimezone && ipTimezone !== "未知" ? ipTimezone === tz : null;
      const geoAccuracy =
        geoResult.ipLat != null && geoResult.ipLon != null ? "城市级" :
        geoResult.ipCity !== "未知" ? "区域级" :
        geoResult.ipCountry !== "未知" ? "国家级" : "未知";

      const combinedSource = [
        ua, gpu, audioHash, canvasHash,
        `${screenW}x${screenH}`, `${innerW}x${innerH}`, String(screen.colorDepth),
        tz, navigator.language, detectedFonts.join(","),
      ].join("|");
      const combinedHash = (await sha256(combinedSource)).slice(0, 32);
      if (cancelled) return;
      setFullHash(combinedHash);
      setTimeout(() => setHashTyped(true), 800);
      setBurstTick((t) => t + 1);

      setData(prev => ({
        ...(prev || {}),
        batterySupported: batteryResult.supported,
        batteryLevel: batteryResult.level,
        batteryCharging: batteryResult.charging,
        cpuArch, cpuBits, wow64,
        perfMemory,
        storageQuota: storageResult.quota,
        storageUsage: storageResult.usage,
        mediaDevices: mediaResult.count,
        mediaLabels: mediaResult.labels,
        ip: geoResult.ip,
        ipCity: geoResult.ipCity,
        ipCountry: geoResult.ipCountry,
        ipRegion: geoResult.ipRegion,
        ipOrg: geoResult.ipOrg,
        ipTimezone,
        ipLat: geoResult.ipLat,
        ipLon: geoResult.ipLon,
        geoSource: geoResult.geoSource,
        geoAccuracy,
        timezoneAligned,
        detectedFonts,
        canvasHash,
        audioHash,
        combinedHash,
      } as Fingerprint));
    };
    void detect();
    return () => { cancelled = true; };
  }, []);

  /* hash 打字机 */
  const typedHash = useTypewriter(hashTyped ? fullHash : "", 28, hashTyped);
  useEffect(() => { setShowHash(typedHash); }, [typedHash]);

  /* IntersectionObserver */
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const setSectionRef = (i: number) => (el: HTMLElement | null) => {
    sectionRefs.current[i] = el;
  };
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) e.target.classList.add("taken-section--in");
      },
      { threshold: 0.18 }
    );
    sectionRefs.current.forEach((s) => s && obs.observe(s));
    return () => obs.disconnect();
  }, [data]);

  /* 自定义光标 */
  useEffect(() => {
    const ring = document.createElement("div");
    const dot = document.createElement("div");
    ring.className = "taken-cursor-ring";
    dot.className = "taken-cursor-dot";
    document.body.appendChild(ring);
    document.body.appendChild(dot);

    let rx = -100, ry = -100, tx = -100, ty = -100, dx = -100, dy = -100;
    const onMove = (e: MouseEvent) => {
      tx = e.clientX; ty = e.clientY; dx = e.clientX; dy = e.clientY;
      dot.style.transform = `translate(${dx - 3}px, ${dy - 3}px)`;
    };
    const loop = () => {
      rx += (tx - rx) * 0.18;
      ry += (ty - ry) * 0.18;
      ring.style.transform = `translate(${rx - 18}px, ${ry - 18}px)`;
      requestAnimationFrame(loop);
    };
    const raf = requestAnimationFrame(loop);
    const onDown = () => ring.classList.add("taken-cursor-ring--down");
    const onUp = () => ring.classList.remove("taken-cursor-ring--down");

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      ring.remove();
      dot.remove();
    };
  }, []);

  /* 实时粒子数（仅面板打开时刷新） */
  useEffect(() => {
    if (!panelOpen) return;
    const id = setInterval(() => {
      setParticleCount(particlesHandle.current?.getCount() ?? 0);
    }, 300);
    return () => clearInterval(id);
  }, [panelOpen]);

  /* 滑块更新 */
  const setParticle = <K extends keyof ParticleConfig>(key: K, val: ParticleConfig[K]) =>
    setParticleCfg((p) => ({ ...p, [key]: val }));

  /* 预设切换 */
  const applyPreset = (name: string) => {
    const preset = PARTICLE_PRESETS.find((p) => p.name === name);
    if (preset) setParticleCfg({ ...preset.base });
  };

  return (
    <div className={`taken-root taken-root--${theme}`}>
      <style>{TAKEN_CSS}</style>

      {/* 粒子背景层 */}
      <TakenParticles ref={particlesHandle} config={particleCfg} burstOnHashChange burstTrigger={burstTick} />

      {/* 噪点 + 扫描线 */}
      <div className="taken-scanline" aria-hidden="true" />
      <div className="taken-noise" aria-hidden="true" />

      {/* 粒子控制面板（移动端隐藏） */}
      <div className="taken-panel-host" data-particle-panel>
        <button
          className={`taken-panel-toggle ${panelOpen ? "is-open" : ""}`}
          onClick={() => setPanelOpen((o) => !o)}
          title="调节粒子"
          aria-label="调节粒子"
        >
          <svg viewBox="0 0 24 24" className="taken-panel-icon" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="3" />
            <circle cx="5"  cy="6"  r="1.4" />
            <circle cx="19" cy="6"  r="1.4" />
            <circle cx="5"  cy="18" r="1.4" />
            <circle cx="19" cy="18" r="1.4" />
            <line x1="12" y1="9"  x2="12" y2="3"  />
            <line x1="12" y1="15" x2="12" y2="21" />
            <line x1="9"  y1="12" x2="4"  y2="12" />
            <line x1="15" y1="12" x2="20" y2="12" />
          </svg>
          <span>粒子</span>
          <svg className={`taken-panel-chev ${panelOpen ? "is-open" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {panelOpen && (
          <div className="taken-panel">
            <div className="taken-panel-head">
              <div className="taken-panel-title">艺术预设</div>
              <button
                className="taken-panel-reset"
                onClick={() => setParticleCfg({ ...DEFAULT_PARTICLE_CONFIG })}
              >重置</button>
            </div>
            <div className="taken-preset-row">
              {PARTICLE_PRESETS.map((p) => (
                <button
                  key={p.name}
                  className={`taken-preset ${particleCfg.preset === (p.name === "墨韵" ? "ink" : p.name === "星尘" ? "stardust" : "firefly") ? "is-active" : ""}`}
                  onClick={() => applyPreset(p.name)}
                  title={p.description}
                >
                  <span className="taken-preset-name">{p.name}</span>
                  <span className="taken-preset-desc">{p.description}</span>
                </button>
              ))}
            </div>

            <div className="taken-panel-title taken-panel-divider">参数</div>
            <SliderRow label="粒子数量" value={particleCfg.maxCount} min={30} max={400} step={10}
              format={(v) => `${v}`} onChange={(v) => setParticle("maxCount", v)} />
            <SliderRow label="速度"     value={particleCfg.speed} min={0.2} max={3} step={0.1}
              format={(v) => `${v.toFixed(1)}x`} onChange={(v) => setParticle("speed", v)} />
            <SliderRow label="大小"     value={particleCfg.size} min={0.3} max={3} step={0.1}
              format={(v) => `${v.toFixed(1)}x`} onChange={(v) => setParticle("size", v)} />
            <SliderRow label="寿命"     value={particleCfg.lifespan} min={0.3} max={3} step={0.1}
              format={(v) => `${v.toFixed(1)}x`} onChange={(v) => setParticle("lifespan", v)} />
            <SliderRow label="透明度"   value={particleCfg.opacity} min={0.1} max={1} step={0.05}
              format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setParticle("opacity", v)} />
            <SliderRow label="漂浮"     value={particleCfg.drift} min={0} max={1} step={0.05}
              format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setParticle("drift", v)} />
            <SliderRow label="鼠标轨迹" value={particleCfg.mouseTrail} min={0} max={1} step={0.05}
              format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setParticle("mouseTrail", v)} />
            <SliderRow label="点击爆破" value={particleCfg.burstCount} min={0} max={60} step={2}
              format={(v) => `${v}颗`} onChange={(v) => setParticle("burstCount", v)} />
            <SliderRow label="连线范围" value={particleCfg.linkRadius} min={0} max={240} step={10}
              format={(v) => `${v}px`} onChange={(v) => setParticle("linkRadius", v)} />
            <SliderRow label="连线强度" value={particleCfg.linkOpacity} min={0} max={1} step={0.05}
              format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setParticle("linkOpacity", v)} />
            <SliderRow label="鼠标光晕" value={particleCfg.glowRadius} min={0} max={400} step={20}
              format={(v) => `${v}px`} onChange={(v) => setParticle("glowRadius", v)} />

            <div className="taken-panel-foot">
              <span>当前粒子</span>
              <span className="taken-panel-count">{particleCount}</span>
              <span className="taken-panel-hint">移动鼠标·点击屏幕·查看效果</span>
            </div>
          </div>
        )}
      </div>

      <article className="taken-article">
        {/* 顶标 */}
        <header className="taken-top">
          <TextAvoidance
            as="div"
            selector="h1, p, span, em, strong"
            overscan={72}
          >
            <div className="taken-eyebrow-row">
              <span className="taken-eyebrow">自你抵达 · 卷四</span>
              <span className="taken-eyebrow-dim">Vol. IV · Since You Arrived</span>
            </div>
            <h1 className="taken-title">
              <span className="taken-title-main">已记下</span>
              <span className="taken-title-dot">。</span>
            </h1>
            <p className="taken-sub">
              在你读到这一行之前，<em>你已经被观察过了</em>。下面这张画像，
              <strong>不是猜的，是浏览器自己说的</strong>。
            </p>
          </TextAvoidance>

          {/* 顶部状态条：未完成时显示"正在测量"，完成后消失 */}
          <div className={`taken-status ${data ? "is-ready" : ""}`} aria-live="polite">
            <span className="taken-status-dot" />
            <TextAvoidance
              as="span"
              className="taken-avoid-inline taken-status-copy"
              selector=".taken-status-text"
              overscan={24}
            >
              <span className="taken-status-text">
                {data ? "数据画像已就绪" : "正在测量你的设备…"}
              </span>
            </TextAvoidance>
            {!data && <span className="taken-status-bar"><span className="taken-status-bar-fill" /></span>}
          </div>

          {/* 清晰说明：四张关键事实卡 */}
          <div className="taken-keyfacts" role="group" aria-label="关键事实速览">
            <div className={`taken-keyfact ${!data ? "taken-keyfact--loading" : ""}`}>
              <TextAvoidance
                as="div"
                className="taken-avoid-block"
                selector=".taken-keyfact-label, .taken-keyfact-value, .taken-keyfact-meta, .taken-skel"
                overscan={20}
              >
                <div className="taken-keyfact-label">来源</div>
                <div className="taken-keyfact-value">{data ? `${f(data.ipCity)} · ${f(data.ipCountry)}` : <span className="taken-skel">正在反查 IP…</span>}</div>
                <div className="taken-keyfact-meta">{data ? `${f(data.ip)} · ${f(data.ipOrg)} · ${f(data.geoSource)}` : <span className="taken-skel taken-skel--sm">IP · 运营商 · 地理来源</span>}</div>
              </TextAvoidance>
            </div>
            <div className={`taken-keyfact ${!data ? "taken-keyfact--loading" : ""}`}>
              <TextAvoidance
                as="div"
                className="taken-avoid-block"
                selector=".taken-keyfact-label, .taken-keyfact-value, .taken-keyfact-meta, .taken-skel"
                overscan={20}
              >
                <div className="taken-keyfact-label">设备</div>
                <div className="taken-keyfact-value">{data ? `${f(data.browser)} · ${f(data.os)}` : <span className="taken-skel">正在识别…</span>}</div>
                <div className="taken-keyfact-meta">{data ? `${f(data.device)} · ${f(data.cpuArch)} · ${f(data.cpuBits)}` : <span className="taken-skel taken-skel--sm">机型 · 架构 · 位数</span>}</div>
              </TextAvoidance>
            </div>
            <div className={`taken-keyfact ${!data ? "taken-keyfact--loading" : ""}`}>
              <TextAvoidance
                as="div"
                className="taken-avoid-block"
                selector=".taken-keyfact-label, .taken-keyfact-value, .taken-keyfact-meta, .taken-skel"
                overscan={20}
              >
                <div className="taken-keyfact-label">唯一性</div>
                <div className="taken-keyfact-value taken-keyfact-value--mono">
                  {data ? f(data.combinedHash) : <span className="taken-skel">正在计算指纹…</span>}
                </div>
                <div className="taken-keyfact-meta">{data ? `${f(data.gpu)} · 画布 ${f(data.canvasHash)} · 回声 ${f(data.audioHash)}` : <span className="taken-skel taken-skel--sm">GPU · Canvas · Audio</span>}</div>
              </TextAvoidance>
            </div>
            <div className={`taken-keyfact ${!data ? "taken-keyfact--loading" : ""}`}>
              <TextAvoidance
                as="div"
                className="taken-avoid-block"
                selector=".taken-keyfact-label, .taken-keyfact-value, .taken-keyfact-meta, .taken-skel"
                overscan={20}
              >
                <div className="taken-keyfact-label">显示</div>
                <div className="taken-keyfact-value">
                  {data ? `${f(data.colorScheme)} · ${f(data.colorGamut)}` : <span className="taken-skel">正在评估…</span>}
                </div>
                <div className="taken-keyfact-meta">{data ? `${f(data.dynamicRange)} · ${f(data.displayMode)} · 对比度 ${f(data.contrastPreference)}` : <span className="taken-skel taken-skel--sm">色域 · 动态范围 · 显示模式</span>}</div>
              </TextAvoidance>
            </div>
          </div>

          {/* 实时时钟 */}
          <LiveClock tz={data?.timezone} />
        </header>

        {/* 指纹星座 */}
        <section className="taken-constellation-block">
          <TextAvoidance
            as="div"
            selector=".taken-section-label"
            overscan={32}
          >
            <div className="taken-section-label">
              <span className="taken-section-label-rule" />
              你的星图
              <span className="taken-section-label-rule" />
            </div>
          </TextAvoidance>
          <FingerprintConstellation hash={fullHash} />
          <p className="taken-constellation-cap">
            这幅星图由你设备上的 32 个字节画成。它是这个页面为你生成的<strong>唯一图像</strong>——
            换一台设备，哪怕分辨率相同，星点也会落在完全不同的位置。
          </p>
        </section>

        {/* 主区 */}
        <main className="taken-main">
          <TextAvoidance
            as="div"
            selector=".taken-section-label"
            overscan={32}
          >
            <div className="taken-section-label">
              <span className="taken-section-label-rule" />
              数据画像
              <span className="taken-section-label-rule" />
            </div>
          </TextAvoidance>

          {/* 1 · 位置 */}
          <Section index={0} setRef={setSectionRef(0)} label="你的位置" data={`${f(data?.ipCity)} · ${f(data?.ipCountry)}`} meta={`${f(data?.ipOrg)} · ${f(data?.geoSource)} · ${f(data?.geoAccuracy)}`} loading={!data}>
            <p>你的公网 IP 是 <code>{f(data?.ip)}</code>，由 <strong>{f(data?.ipOrg)}</strong> 分配。地理位置大致落在 <strong>{f(data?.ipCity)}（{f(data?.ipRegion)}）</strong>{(data?.ipLat != null && data?.ipLon != null) && (<>，坐标约为 <code>{data?.ipLat?.toFixed(2)}, {data?.ipLon?.toFixed(2)}</code></>)}。这一段位置并不是浏览器“猜”的，而是基于 IP 反查得出，当前来源为 <strong>{f(data?.geoSource)}</strong>，精度大约是 <strong>{f(data?.geoAccuracy)}</strong>。</p>
          </Section>

          {/* 2 · 时间 */}
          <Section index={1} setRef={setSectionRef(1)} label="你抵达的时间" data={`${f(data?.readAt)} · ${f(data?.weekday)}`} meta={`设备 ${f(data?.timezone)} · IP ${f(data?.ipTimezone)} · ${data?.timezoneAligned == null ? "待校验" : data.timezoneAligned ? "时区一致" : "时区不一致"}`} loading={!data}>
            <p>现在是 <strong>{data?.hour != null ? partOfDay(data.hour) : "—"}</strong>。设备自报时区为 <code>{f(data?.timezone)}</code>，IP 反查时区为 <code>{f(data?.ipTimezone)}</code>。{data?.timezoneAligned == null ? "当前还无法确认两者是否一致。" : data.timezoneAligned ? "两者一致，说明网络位置与设备环境基本对得上。" : "两者不一致，这通常意味着你在跨区网络、代理、云桌面，或者设备时区被手动改过。"} 一年已过 <strong>{pctOfYear()}</strong>。</p>
          </Section>

          {/* 3 · 设备 */}
          <Section index={2} setRef={setSectionRef(2)} label="你的设备" data={`${f(data?.browser)} · ${f(data?.os)} · ${f(data?.device)}`} meta={`${f(data?.cpuArch)} · ${f(data?.cpuBits)} · ${f(data?.innerW)}×${f(data?.innerH)}`} loading={!data}>
            <p>这是一台运行 <strong>{f(data?.os)}</strong> 的{data?.isMobile ? "移动设备" : "桌面设备"}，浏览器是 <strong>{f(data?.browser)}</strong>。浏览器还暴露了较高价值的硬件线索：机型 <strong>{f(data?.device)}</strong>、架构 <code>{f(data?.cpuArch)}</code>、位数 <code>{f(data?.cpuBits)}</code>，以及视口 <code>{f(data?.innerW)}×{f(data?.innerH)}</code>{(data?.touchPoints ?? 0) > 0 && (<>，支持 {data?.touchPoints} 点触控</>)}。</p>
          </Section>

          {/* 4 · 渲染硬件 */}
          <Section index={3} setRef={setSectionRef(3)} label="渲染你的硬件" data={data?.gpu || "—"} meta={`WebGL · ${f(data?.webglVersion?.split("(")[0]?.trim())}`} loading={!data}>
            <p>图形处理器自报为 <code>{f(data?.gpu)}</code>。再叠上屏幕、字体与下文的画布指纹，它在互联网上足以把你从大多数其他设备里挑出来。技术名：<strong>WebGL 指纹</strong>，全程无需授权。</p>
          </Section>

          {/* 5 · 处理器与内存 */}
          <Section index={4} setRef={setSectionRef(4)} label="你的算力" data={`${f(data?.cores)} 核 · ${f(data?.memory)} GB · ${f(data?.cpuArch)}`} meta={data?.perfMemory ? `JS 堆：${data.perfMemory.used} / ${data.perfMemory.total} MB · ${data?.wow64 ? "WOW64" : "原生环境"}` : `${f(data?.cpuBits)} · ${data?.wow64 ? "WOW64" : "原生环境"}`} loading={!data}>
            <p>CPU 报告 <strong>{f(data?.cores)}</strong> 个逻辑核心，设备内存约 <strong>{data?.memory ?? "未知"}</strong> GB，架构是 <code>{f(data?.cpuArch)}</code>，位数为 <code>{f(data?.cpuBits)}</code>。{data?.wow64 ? "当前像是 32 位兼容层在跑 64 位系统。" : "这更像是原生位数环境。"} {data?.perfMemory ? <>此刻 JS 堆占用 <code>{data.perfMemory.used} MB</code>，距上限 <code>{data.perfMemory.limit - data.perfMemory.used} MB</code>。</> : "你的浏览器没有开放更细的性能内存指标。"} </p>
          </Section>

          {/* 6 · 画布与音频（最具"指纹感"的两项） */}
          <Section index={5} setRef={setSectionRef(5)} label="你的画布与回声" data={`画布 ${f(data?.canvasHash)} · 回声 ${f(data?.audioHash)}`} meta="Canvas 2D · AudioContext · SHA-256(前 24 位)" emphasis="strong" loading={!data}>
            <p>两项 <strong>无需任何授权</strong> 就能生成的稳定指纹：<br />
            <strong>画布</strong>——画一段文字、一个圆、一点透明叠加，把像素哈希：<code>{f(data?.canvasHash)}</code>。<br />
            <strong>回声</strong>——起一个 10kHz 三角波，过压缩器，叠加白噪，把采样累加值哈希：<code>{f(data?.audioHash)}</code>。<br />
            不同的字体、抗锯齿、音频栈、驱动、声卡会得到不同的值。两者合在一起，足以在跨会话里再次认出这台设备。</p>
          </Section>

          {/* 7 · 网络 */}
          <Section index={6} setRef={setSectionRef(6)} label="你的网络" data={`${f(data?.connectionType)} · ${f(data?.downlink)} Mbps · ${f(data?.rtt)} ms`} meta={`${f(data?.ipOrg)} · ${f(data?.geoSource)} · ${data?.saveData ? "省流已开启" : "未开启省流"}`} loading={!data}>
            <p>连接类型 <strong>{f(data?.connectionType)}</strong>，下行 <strong>{data?.downlink ?? "?"} Mbps</strong>，往返 <strong>{data?.rtt ?? "?"} ms</strong>。网络归属组织是 <strong>{f(data?.ipOrg)}</strong>，位置来源是 <strong>{f(data?.geoSource)}</strong>。这些信息合在一起，比单纯一个 IP 更接近“这是谁的网络、从哪里上来”。</p>
          </Section>

          {/* 8 · 字形 */}
          <Section index={7} setRef={setSectionRef(7)} label="你携带的字形" data={`${f(data?.detectedFonts?.length)} 款字体`} meta={(data?.detectedFonts?.slice(0, 5).join(" · ") ?? "") + ((data?.detectedFonts?.length ?? 0) > 5 ? " …" : "")} loading={!data}>
            <p>你的设备装有 <strong>{f(data?.detectedFonts?.length)}</strong> 款常被指纹脚本询问的字体：<code>{data?.detectedFonts?.join(" · ") || "—"}</code>。{data?.isMobile ? "Android 字体集较雷同，单看并不强，但配上屏幕、时区、GPU，足以把你锁定在很小的集合里。" : "桌面端里，这一组具体字体常常近乎唯一——字体会随系统升级、应用安装而累积，最终就是一枚字面拼成的指纹。"}</p>
          </Section>

          {/* 9 · 偏好与隐私 */}
          <Section index={8} setRef={setSectionRef(8)} label="你的偏好" data={`${f(data?.primaryLanguage)} · ${f(data?.colorScheme)} · ${f(data?.colorGamut)}`} meta={`${f(data?.displayMode)} · 对比度 ${f(data?.contrastPreference)} · ${data?.reducedMotion ? "减少动态" : "允许动态"}`} loading={!data}>
            <p>主语言 <code>{f(data?.primaryLanguage)}</code>，偏好序列 <code>{data?.allLanguages?.join("、") || f(data?.primaryLanguage)}</code>。显示环境是 <strong>{f(data?.colorScheme)}</strong> 模式、<strong>{f(data?.colorGamut)}</strong> 色域、<strong>{f(data?.dynamicRange)}</strong> 动态范围，显示模式为 <code>{f(data?.displayMode)}</code>。{data?.reducedMotion ? "你偏好减少动画，这对无障碍和设备习惯都很关键。" : "你没有要求减少动画。"}{data?.forcedColors && " 你启用了强制颜色模式。"} {data?.doNotTrack === true ? <>你启用了 <strong>请勿跟踪</strong>。</> : <>你没有启用 <strong>请勿跟踪</strong>。</>}{data?.globalPrivacyControl && <> 同时启用了 <strong>GPC</strong>。</>}</p>
          </Section>

          {/* 10 · 复合指纹 */}
          <Section index={9} setRef={setSectionRef(9)} label="你的影子" data={showHash || f(data?.combinedHash)} meta="UA × GPU × 音频 × 画布 × 屏幕 × 语言 × 字体" mono emphasis="strong" loading={!data}>
            <p>把以上所有「独立但弱」的指纹信号串起来做一次 SHA-256：<code>{f(data?.combinedHash)}</code>。这 32 位字符在你的设备上高度唯一——不需要 Cookie，不需要账号，不需要你的名字。<strong className="taken-warn">你从未点击「同意」。</strong></p>
          </Section>

          {/* 折叠区：细枝末节 */}
          <div className="taken-extra-toggle">
            <button
              className="taken-extra-btn"
              onClick={() => setShowAllSections((s) => !s)}
              aria-expanded={showAllSections}
            >
              <span className="taken-extra-rule" />
              <span className="taken-extra-label">
                {showAllSections ? "收起细枝末节" : "展开剩余 10 项细枝末节"}
              </span>
              <span className="taken-extra-rule" />
              <svg
                className={`taken-extra-chev ${showAllSections ? "is-open" : ""}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>

          {showAllSections && (
            <div className="taken-extra">
              {/* 11 电池 */}
              <Section index={10} setRef={setSectionRef(10)} label="电量" data={!data?.batterySupported ? "已被屏蔽" : data?.batteryLevel === null ? "读取失败" : `${f(data?.batteryLevel)}%${data?.batteryCharging ? " · 充电中" : ""}`} meta="Battery Status API" emphasis="muted" loading={!data}>
                {data && !data.batterySupported
                  ? <p>你的浏览器没有暴露电量——值得高兴。Firefox 在 2016 年移除了这一接口：研究证明电池百分位 + 放电曲线可跨站稳定追踪一台设备长达 30 分钟。</p>
                  : <p>电量的精确百分比，本身就是一枚指纹。你的浏览器仍然暴露着它。</p>}
              </Section>

              {/* 12 平台 */}
              <Section index={11} setRef={setSectionRef(11)} label="平台" data={`${f(data?.platform)} · ${f(data?.vendor)}`} meta={data?.pdfViewer ? "内置 PDF 阅读器" : "无内置 PDF 阅读器"} highlight={data?.webdriver || data?.isBot} emphasis="muted" loading={!data}>
                <p><code>navigator.platform</code> = <code>{f(data?.platform)}</code>，<code>navigator.vendor</code> = <code>{f(data?.vendor)}</code>。{data?.pdfViewer ? "内置 PDF 阅读器说明是 Chrome / Edge 一类。" : "未启用内置 PDF 阅读器。"}{data?.webdriver && <span className="taken-warn"> ⚠️ 检测到 webdriver 标志，你可能正被自动化驱动。</span>}{data?.isBot && <span className="taken-warn"> ⚠️ UA 命中爬虫关键字。</span>}</p>
              </Section>

              {/* 13 媒介 */}
              <Section index={12} setRef={setSectionRef(12)} label="媒介" data={`${f(data?.mediaDevices)} 个设备`} meta={(data?.mediaLabels?.length ?? 0) > 0 ? data?.mediaLabels?.join(" · ") : "未授权前只显示数量"} emphasis="muted" loading={!data}>
                <p>浏览器枚举到 <strong>{f(data?.mediaDevices)}</strong> 个媒体设备。授权之前只能看数量；一旦授权，连设备 ID 与厂商名都会泄露。{(data?.mediaLabels?.length ?? 0) > 0 && (<>截获到的标签：<code>{data?.mediaLabels?.join(" · ")}</code>。</>)}</p>
              </Section>

              {/* 14 来路 */}
              <Section index={13} setRef={setSectionRef(13)} label="来路" data={f(data?.referrer)} meta="HTTP Referer 头" emphasis="muted" loading={!data}>
                <p>请求本页面时浏览器自动附上 <code>Referer</code>。你的来路是 <code>{f(data?.referrer)}</code>。即使在隐私窗口里，这个头也会被发送——除非浏览器或扩展明确剥离它。在内容站里，这一条足以还原你上一次访问了哪里。</p>
              </Section>

              {/* 15 视线 */}
              <Section index={14} setRef={setSectionRef(14)} label="视线" data={`${isVisible ? "可见" : "已切走"} · ${hasFocus ? "前台" : "失焦"}`} meta={`${data?.serviceWorker ? "支持 SW" : "无 SW"}`} emphasis="muted" loading={!data}>
                <p>页面订阅了 <code>visibilitychange</code> 与 <code>focus</code> 事件：你每一次切到别的标签页、收起窗口、锁屏，它都收到了通知。这就是为什么你「打开就放着」时，某些像素仍在被悄悄刷新。</p>
              </Section>

              {/* 16 节奏 */}
              <LiveStats
                index={15}
                setRef={setSectionRef(15)}
                label="节奏"
                loading={!data}
                mouseEntropy={mouseEntropy}
                scrollPct={scrollPct}
                timeOnPage={timeOnPage}
                mousePos={mousePos}
              />

              {/* 17 尺度 */}
              <Section index={16} setRef={setSectionRef(16)} label="尺度" data={`${f(data?.screenW)}×${f(data?.screenH)} · ${f(data?.dpr)}x`} meta={`${f(data?.colorDepth)}位 · ${f(data?.orientation)} · ${f(data?.availW)}×${f(data?.availH)} 可用`} emphasis="muted" loading={!data}>
                <p>物理屏 <code>{f(data?.screenW)}×{f(data?.screenH)}</code>，设备像素比 <code>{f(data?.dpr)}x</code>，色深 <code>{f(data?.colorDepth)} 位</code>，方向 <code>{f(data?.orientation)}</code>，可用区 <code>{f(data?.availW)}×{f(data?.availH)}</code>。这些数字的组合在公开数据里命中率极低。</p>
              </Section>

              {/* 18 姿态 */}
              <Section index={17} setRef={setSectionRef(17)} label="姿态" data={`${f(data?.plugins?.length)} 插件 · ${f(data?.mimeTypes?.length)} MIME`} meta={`${data?.indexedDb ? "IDB ✓" : "IDB ✗"} · ${data?.serviceWorker ? "SW ✓" : "SW ✗"}`} emphasis="muted" loading={!data}>
                <p>扩展点：<strong>{f(data?.plugins?.length)}</strong> 个 NPAPI 插件，<strong>{f(data?.mimeTypes?.length)}</strong> 种 MIME，{data?.indexedDb ? "支持" : "不支持"} IndexedDB，{data?.serviceWorker ? "支持" : "不支持"} Service Worker。每一个 ✓/✗ 是一比特信息——32 比特就足以把全球 70 亿人分成 43 亿个独立桶。</p>
              </Section>

              {/* 19 存储 */}
              <Section index={18} setRef={setSectionRef(18)} label="存储" data={`配额 ${f(data?.storageQuota)}`} meta={`已用 ${f(data?.storageUsage)}`} emphasis="muted" loading={!data}>
                <p>浏览器允许此页最多向你写入 <code>{f(data?.storageQuota)}</code>，目前已用 <code>{f(data?.storageUsage)}</code>。我们没有写下一个。多数页面不会放过这间房。</p>
              </Section>

              {/* 20 完整 UA */}
              <Section index={19} setRef={setSectionRef(19)} label="完整 UA" data={(data?.userAgent ?? "").length > 90 ? (data?.userAgent ?? "").slice(0, 90) + "…" : (data?.userAgent ?? "")} meta="原始字符串" emphasis="muted" mono loading={!data}>
                <p>未加工的 User-Agent 字符串。它从你打开这一页的第一毫秒起，就附在每个 HTTP 请求里飞到服务器——你从未「提交」过它。<code style={{ wordBreak: "break-all" }}>{data?.userAgent ?? "—"}</code></p>
              </Section>
            </div>
          )}
        </main>

        {/* 脚注 */}
        <footer className="taken-foot">
          <p className="taken-foot-line">
            这一页不写任何东西，关掉标签页就忘记你。
            所有指纹计算都在本地完成，没有向服务器发送原始数据。
          </p>
          <p className="taken-foot-meta">卷四 · 2026 年 6 月</p>
          <p className="taken-foot-meta">
            由 <a className="taken-link" href="#">墨迹</a> 在 <a className="taken-link" href="#">墨迹工作室</a> 制作。<br />
            <a className="taken-link" href="#">@sinceyouarrived</a> 在 Bluesky 上。
          </p>
        </footer>
      </article>
    </div>
  );
}

/* ============================================================
 *  滑块
 * ============================================================ */
function SliderRow({
  label, value, min, max, step, format, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="taken-slider-row">
      <span className="taken-slider-label">{label}</span>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseDown={(e) => e.stopPropagation()}
        className="taken-slider"
      />
      <span className="taken-slider-value">{format ? format(value) : value}</span>
    </div>
  );
}

/* ============================================================
 *  样式（主题感知）
 * ============================================================ */
const TAKEN_CSS = `
/* ============= 主题变量 ============= */
.taken-root {
  --paper:      #f4f1ea;
  --paper-2:    #ede9e0;
  --ink:        #1e1b18;
  --soft:       #6b6460;
  --faint:      #b8b2a8;
  --hair:       rgba(30, 27, 24, 0.14);
  --hair-soft:  rgba(30, 27, 24, 0.06);
  --accent:     #3d7d65;
  --accent-2:   #5a9e84;
  --accent-dim: rgba(61, 125, 101, 0.12);
  --warn:       #b04a2e;
  --code-bg:    rgba(30, 27, 24, 0.06);
  --grid:       rgba(61, 125, 101, 0.04);
  --shadow:     0 1px 0 rgba(255,255,255,0.7), 0 24px 64px rgba(30,27,24,0.06);
  --panel-bg:   rgba(253, 250, 244, 0.94);
  --panel-border: rgba(61, 125, 101, 0.28);
}
[data-theme="dark"] .taken-root {
  --paper:      #0e1614;
  --paper-2:    #131c19;
  --ink:        #e8e4dc;
  --soft:       #9a948a;
  --faint:      #5a544c;
  --hair:       rgba(232, 228, 220, 0.14);
  --hair-soft:  rgba(232, 228, 220, 0.05);
  --accent:     #7ab8a0;
  --accent-2:   #9ecfba;
  --accent-dim: rgba(122, 184, 160, 0.20);
  --warn:       #ff8a5b;
  --code-bg:    rgba(122, 184, 160, 0.14);
  --grid:       rgba(122, 184, 160, 0.06);
  --shadow:     0 1px 0 rgba(255,255,255,0.04), 0 24px 64px rgba(0,0,0,0.4);
  --panel-bg:   rgba(20, 28, 26, 0.92);
  --panel-border: rgba(122, 184, 160, 0.32);
}

/* ============= 全局 ============= */
.taken-root {
  position: relative;
  min-height: 100vh;
  background: var(--paper);
  color: var(--ink);
  font-family: "Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", Georgia, serif;
  font-feature-settings: "liga", "kern";
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  padding: clamp(28px, 5vh, 56px) 24px 96px;
  transition: background-color 0.5s ease, color 0.5s ease;
  overflow-x: hidden;
}
.taken-root::before {
  content: "";
  position: fixed; inset: -20%;
  background:
    radial-gradient(ellipse 70% 48% at 30% 8%, var(--accent-dim), transparent 58%),
    radial-gradient(ellipse 56% 40% at 88% 96%, var(--accent-dim), transparent 60%),
    radial-gradient(ellipse 44% 38% at 78% 18%, var(--accent-dim), transparent 64%);
  pointer-events: none;
  z-index: 0;
  will-change: transform, opacity;
  animation: taken-aurora 26s ease-in-out infinite;
}
@keyframes taken-aurora {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1);        opacity: 0.85; }
  33%      { transform: translate3d(2.5%, -2%, 0) scale(1.06); opacity: 1;    }
  66%      { transform: translate3d(-2%, 2.5%, 0) scale(1.03); opacity: 0.9;  }
}
@media (prefers-reduced-motion: reduce) {
  .taken-root::before { animation: none; }
}
.taken-root::after {
  content: "";
  position: fixed; inset: 0;
  background-image:
    linear-gradient(var(--grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid) 1px, transparent 1px);
  background-size: 56px 56px;
  pointer-events: none;
  z-index: 0;
  mask-image: radial-gradient(ellipse 80% 60% at center, black 30%, transparent 100%);
}

/* 噪点 + 扫描线 */
.taken-noise {
  position: fixed; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.035;
  pointer-events: none;
  z-index: 2;
  mix-blend-mode: overlay;
  animation: taken-noise-shift 8s steps(8) infinite;
}
@keyframes taken-noise-shift {
  0%, 100% { transform: translate(0, 0); }
  20%      { transform: translate(1%, 2%); }
  40%      { transform: translate(2%, -2%); }
  60%      { transform: translate(1%, -1%); }
  80%      { transform: translate(-2%, 1%); }
}
.taken-scanline {
  position: fixed; inset: 0;
  background: repeating-linear-gradient(180deg, transparent 0, transparent 2px, var(--hair-soft) 2px, var(--hair-soft) 3px);
  pointer-events: none;
  z-index: 2;
  opacity: 0.4;
  mix-blend-mode: overlay;
}

.taken-particles {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.taken-article {
  position: relative;
  z-index: 2;
  max-width: 720px;
  margin: 0 auto;
  animation: taken-fade-in 0.7s ease both;
}
@keyframes taken-fade-in { from { opacity: 0; } to { opacity: 1; } }
.taken-avoid-inline {
  display: inline-block;
  vertical-align: middle;
}
.taken-status-copy {
  min-width: 10em;
}
.taken-clock-copy {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

/* ============= 顶标 ============= */
.taken-top { margin-bottom: 56px; }
.taken-eyebrow-row {
  display: flex; align-items: center; gap: 16px;
  font-size: 11px; letter-spacing: 0.32em; text-transform: uppercase;
  color: var(--soft);
  margin-bottom: 26px;
  flex-wrap: wrap;
}
.taken-eyebrow { color: var(--accent); font-weight: 600; }
.taken-eyebrow-dim { color: var(--faint); font-weight: 400; }

.taken-title {
  font-family: "Noto Serif SC", "Times New Roman", Georgia, serif;
  font-weight: 600;
  font-size: clamp(64px, 12vw, 140px);
  line-height: 0.92;
  letter-spacing: -0.045em;
  margin: 0 0 32px;
  display: flex; align-items: baseline; gap: 4px;
  animation: taken-title-in 1.2s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes taken-title-in {
  0%   { opacity: 0; transform: translateY(40px) scale(0.96); filter: blur(8px); }
  60%  { opacity: 1; }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
.taken-title-main {
  background: linear-gradient(180deg, var(--ink) 30%, var(--accent) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 30px var(--accent-dim));
  position: relative;
}
.taken-title-main::after {
  content: "已记下";
  position: absolute; left: 0; top: 0;
  background: linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: taken-title-shimmer 6s ease-in-out infinite;
  opacity: 0.5;
  mix-blend-mode: screen;
  pointer-events: none;
}
@keyframes taken-title-shimmer {
  0%, 100% { background-position: 200% 0; }
  50%      { background-position: -100% 0; }
}
.taken-title-dot {
  color: var(--accent);
  animation: taken-dot-pulse 2.4s ease-in-out infinite;
  text-shadow: 0 0 24px var(--accent);
}
@keyframes taken-dot-pulse {
  0%, 100% { opacity: 1; transform: translateY(0) scale(1); }
  50%      { opacity: 0.4; transform: translateY(-6px) scale(0.85); }
}

.taken-sub {
  font-size: clamp(17px, 1.4vw, 19px);
  line-height: 1.65;
  margin: 0 0 32px;
  max-width: 42em;
  font-style: italic;
  color: var(--ink);
}
.taken-sub em { font-style: normal; color: var(--warn); }
.taken-sub strong { font-style: normal; color: var(--accent); font-weight: 600; }

/* 顶部状态条 */
.taken-status {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 24px;
  padding: 7px 14px 7px 12px;
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--accent);
  border: 1px solid var(--accent-dim);
  border-radius: 999px;
  background: var(--accent-dim);
  transition: all 0.4s ease;
  position: relative;
  overflow: hidden;
}
.taken-status.is-ready {
  border-color: var(--accent);
  background: rgba(122, 184, 160, 0.18);
  color: var(--accent-2);
}
.taken-status-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
  animation: taken-pulse 1.4s ease-in-out infinite;
}
.taken-status.is-ready .taken-status-dot {
  background: var(--accent-2);
  box-shadow: 0 0 10px var(--accent-2);
  animation: none;
}
.taken-status-text { font-weight: 600; }
.taken-status-bar {
  display: inline-block;
  width: 80px;
  height: 3px;
  background: var(--hair);
  border-radius: 2px;
  overflow: hidden;
  margin-left: 4px;
}
.taken-status-bar-fill {
  display: block;
  height: 100%;
  width: 30%;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  background-size: 200% 100%;
  animation: taken-status-fill 1.6s ease-in-out infinite;
}
@keyframes taken-status-fill {
  0%   { transform: translateX(-100%); background-position: 0% 0; }
  100% { transform: translateX(400%); background-position: 200% 0; }
}

/* 关键事实卡 */
.taken-keyfacts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 0 0 28px;
}
.taken-keyfact {
  position: relative;
  padding: 16px 14px 14px;
  border: 1px solid var(--hair);
  border-radius: 10px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.025), transparent),
    var(--paper-2);
  overflow: hidden;
  transition: border-color 0.3s ease, transform 0.3s ease;
}
[data-theme="dark"] .taken-keyfact {
  background:
    linear-gradient(180deg, rgba(255,255,255,0.025), transparent),
    var(--paper-2);
}
.taken-keyfact::before {
  content: "";
  position: absolute; left: 0; right: 0; top: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  opacity: 0.6;
}
.taken-keyfact:hover {
  border-color: var(--accent-dim);
  transform: translateY(-1px);
}
.taken-keyfact-label {
  font-size: 10px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 8px;
  font-weight: 600;
}
.taken-keyfact-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.35;
  word-break: break-word;
}
.taken-keyfact-value--mono {
  font-family: "JetBrains Mono", "SF Mono", Menlo, monospace;
  font-size: 13px;
  letter-spacing: 0.02em;
}
.taken-keyfact-meta {
  margin-top: 6px;
  font-size: 11px;
  color: var(--soft);
  font-family: "JetBrains Mono", monospace;
  word-break: break-all;
}
.taken-keyfact--loading {
  opacity: 0.85;
  border-color: var(--hair);
}
.taken-keyfact--loading .taken-keyfact-value { color: var(--soft); font-weight: 500; }

/* 骨架占位：脉冲动画 */
.taken-skel {
  display: inline-block;
  color: var(--accent);
  font-family: "JetBrains Mono", monospace;
  letter-spacing: 0.05em;
  background: linear-gradient(
    90deg,
    var(--accent-dim) 0%,
    var(--accent) 50%,
    var(--accent-dim) 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: taken-skel-shimmer 1.6s ease-in-out infinite;
}
.taken-skel--sm { font-size: 0.85em; opacity: 0.7; }
@keyframes taken-skel-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 章节 loading 状态 */
.taken-section--loading {
  opacity: 0.7;
  transition: opacity 0.4s ease;
}
.taken-section--loading.taken-section--in {
  opacity: 0.85;
  animation: taken-section-pulse 2.4s ease-in-out infinite;
}
@keyframes taken-section-pulse {
  0%, 100% { box-shadow: 0 0 0 0 transparent; }
  50%      { box-shadow: 0 0 24px -8px var(--accent-dim); }
}

.taken-clock {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
  font-size: 13px;
  border-top: 1px solid var(--hair);
  border-bottom: 1px solid var(--hair);
  padding: 9px 16px;
  color: var(--ink);
  position: relative;
  overflow: hidden;
}
.taken-clock::before {
  content: "";
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, var(--accent-dim), transparent);
  transform: translateX(-100%);
  animation: taken-clock-shimmer 4s linear infinite;
}
@keyframes taken-clock-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.taken-clock-label { font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--soft); }
.taken-clock-time  { font-size: 16px; font-weight: 600; letter-spacing: 0.06em; }
.taken-clock-zone  { font-size: 11px; color: var(--soft); }
.taken-clock-pulse {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent);
  animation: taken-pulse 1.6s ease-in-out infinite;
}
@keyframes taken-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.4; transform: scale(0.7); }
}

/* ============= 章节标头 ============= */
.taken-section-label {
  display: flex; align-items: center; gap: 12px;
  font-size: 11px; letter-spacing: 0.32em; text-transform: uppercase;
  color: var(--soft);
  padding: 14px 0;
  border-top: 1px solid var(--hair);
  border-bottom: 1px solid var(--hair);
  margin-bottom: 8px;
}
.taken-section-label-rule {
  flex: 1; height: 1px;
  background: linear-gradient(90deg, transparent, var(--hair), transparent);
}

/* ============= 星座 ============= */
.taken-constellation-block { margin-bottom: 56px; }
.taken-constellation {
  position: relative;
  margin: 28px auto 18px;
  width: min(520px, 100%);
  aspect-ratio: 1 / 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.taken-constellation-svg {
  width: 100%;
  height: auto;
  display: block;
}
.taken-constellation-ring {
  fill: none;
  stroke: var(--hair);
  stroke-width: 0.3;
}
.taken-constellation-ring--inner {
  stroke-dasharray: 0.8 1.2;
  stroke: var(--hair);
}
.taken-constellation-ring--core {
  stroke: var(--accent-dim);
  stroke-dasharray: 1 1.5;
}
.taken-constellation--loading .taken-constellation-svg {
  animation: taken-rotate 14s linear infinite;
}
@keyframes taken-rotate {
  to { transform: rotate(360deg); }
}
.taken-constellation-hint,
.taken-constellation-cap {
  font-size: 12px;
  color: var(--soft);
  font-family: "JetBrains Mono", monospace;
  letter-spacing: 0.1em;
  text-align: center;
}
.taken-constellation-cap {
  font-size: 14px;
  font-family: inherit;
  line-height: 1.7;
  letter-spacing: 0;
  text-align: center;
  color: var(--ink);
  max-width: 32em;
  margin: 4px auto 0;
  font-style: italic;
}
.taken-constellation-cap strong { color: var(--accent); font-weight: 600; font-style: normal; }

.taken-constellation-hash {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2px;
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  letter-spacing: 0.05em;
  color: var(--soft);
  max-width: 320px;
  margin: 0 auto;
  line-height: 1.6;
}
.taken-constellation-ch {
  display: inline-block;
  padding: 1px 3px;
  border-radius: 3px;
  transition: background 0.2s, color 0.2s;
}
.taken-constellation-ch--edge { color: var(--accent); font-weight: 700; }

/* ============= 章节 ============= */
.taken-section {
  padding: 32px 0 36px;
  border-bottom: 1px solid var(--hair);
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.7s ease, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  border-radius: 4px;
  margin: 0 -10px;
  padding-left: 10px;
  padding-right: 10px;
}
.taken-section--in { opacity: 1; transform: translateY(0); }
.taken-section:hover {
  background: linear-gradient(90deg, var(--accent-dim), transparent 60%);
}
.taken-section:last-of-type { border-bottom: none; }
.taken-section::before {
  content: "";
  position: absolute; left: -28px; top: 0; bottom: 0;
  width: 1px;
  background: linear-gradient(180deg, transparent, var(--hair), transparent);
  opacity: 0.5;
  transition: opacity 0.5s ease, width 0.3s ease;
}
.taken-section--in::before { opacity: 1; }
.taken-section--warn::before {
  background: linear-gradient(180deg, transparent, var(--warn), transparent);
  opacity: 0.7;
}
.taken-section--muted { opacity: 0.85; }
.taken-section--strong {
  background: linear-gradient(90deg, var(--accent-dim), transparent 50%);
  border-left: 1px solid var(--accent-dim);
  padding-left: 18px;
  margin-left: -10px;
}

.taken-section-marker {
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 14px;
}
.taken-section-num {
  font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
  font-size: 10px; letter-spacing: 0.15em;
  color: var(--accent);
  border: 1px solid var(--accent-dim);
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 700;
  background: var(--accent-dim);
  flex-shrink: 0;
}
.taken-section-line { flex: 1; height: 1px; background: linear-gradient(90deg, var(--hair), transparent); }
.taken-section-tag {
  font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase;
  color: var(--soft);
  font-weight: 600;
}

.taken-data {
  font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
  font-size: 15px; line-height: 1.5;
  margin: 0 0 6px; word-break: break-word; font-weight: 500;
  color: var(--ink);
}
.taken-data--typing::after {
  content: "▍";
  color: var(--accent);
  margin-left: 2px;
  animation: taken-blink 0.8s steps(2) infinite;
}
@keyframes taken-blink { to { opacity: 0; } }
.taken-meta {
  font-size: 12px;
  font-family: "JetBrains Mono", monospace;
  margin: 0 0 18px; word-break: break-word;
  color: var(--soft);
}
.taken-body {
  font-size: 16px; line-height: 1.8;
  margin: 0; max-width: 36em; text-wrap: pretty;
  color: var(--ink);
}
.taken-body p { margin: 0; }
.taken-body code {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.88em;
  background: var(--code-bg);
  padding: 1px 6px; border-radius: 3px;
  color: var(--accent-2);
}
.taken-body strong { font-weight: 600; color: var(--ink); }
.taken-warn { color: var(--warn); font-weight: 600; }

/* 折叠区 */
.taken-extra-toggle {
  margin: 24px 0 0;
  display: flex;
  justify-content: center;
}
.taken-extra-btn {
  display: inline-flex; align-items: center; gap: 14px;
  padding: 12px 22px;
  border: 1px solid var(--hair);
  background: transparent;
  border-radius: 999px;
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.25s ease;
}
.taken-extra-btn:hover {
  border-color: var(--accent);
  background: var(--accent-dim);
}
.taken-extra-rule {
  display: inline-block;
  width: 36px; height: 1px;
  background: var(--hair);
}
.taken-extra-chev {
  width: 14px; height: 14px;
  transition: transform 0.3s ease;
}
.taken-extra-chev.is-open { transform: rotate(180deg); }
.taken-extra {
  margin-top: 4px;
  animation: taken-extra-in 0.5s ease;
}
@keyframes taken-extra-in {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ============= 脚注 ============= */
.taken-foot {
  margin-top: 80px; padding-top: 36px;
  border-top: 1px solid var(--hair);
  font-size: 15px; line-height: 1.7;
  color: var(--ink);
}
.taken-foot-line { margin: 0 0 32px; text-wrap: pretty; }
.taken-foot-meta {
  font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase;
  margin: 0 0 6px; line-height: 1.6;
  color: var(--soft);
}
.taken-link {
  color: var(--ink); text-decoration: underline;
  text-decoration-thickness: 1px; text-underline-offset: 3px;
  text-decoration-color: var(--hair);
  transition: text-decoration-color 0.2s ease, color 0.2s ease;
}
.taken-link:hover { text-decoration-color: var(--accent); color: var(--accent); }

/* ============= 自定义光标 ============= */
.taken-cursor-on, .taken-cursor-on * { cursor: none !important; }
.taken-cursor-ring {
  position: fixed; top: 0; left: 0;
  width: 36px; height: 36px;
  border-radius: 50%;
  border: 1px solid var(--accent);
  pointer-events: none;
  z-index: 9999;
  box-shadow: 0 0 16px var(--accent-dim);
  transition: width 0.2s, height 0.2s, border-color 0.2s, background 0.2s;
  mix-blend-mode: difference;
}
.taken-cursor-ring--down {
  width: 56px; height: 56px;
  background: var(--accent-dim);
  border-color: var(--accent-2);
}
.taken-cursor-dot {
  position: fixed; top: 0; left: 0;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--accent);
  pointer-events: none;
  z-index: 9999;
  box-shadow: 0 0 8px var(--accent);
}

/* ============= 粒子控制面板 ============= */
.taken-panel-host {
  position: fixed;
  top: 84px;
  right: 20px;
  z-index: 50;
  font-family: "JetBrains Mono", "SF Mono", Menlo, monospace;
  pointer-events: auto;
}
.taken-panel-toggle {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 18px;
  border: 1px solid var(--panel-border);
  background: var(--panel-bg);
  color: var(--accent);
  border-radius: 999px;
  font-size: 14px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  cursor: pointer;
  backdrop-filter: blur(14px);
  box-shadow: var(--shadow);
  transition: all 0.25s ease;
  font-weight: 600;
  font-family: inherit;
}
.taken-panel-toggle:hover { color: var(--accent-2); transform: translateY(-1px); }
.taken-panel-toggle.is-open { background: var(--accent); color: var(--paper); border-color: var(--accent); }
.taken-panel-icon { width: 18px; height: 18px; }
.taken-panel-chev {
  width: 14px; height: 14px;
  transition: transform 0.3s ease;
}
.taken-panel-chev.is-open { transform: rotate(180deg); }
.taken-panel {
  position: absolute;
  top: 56px;
  right: 0;
  width: 360px;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  padding: 22px;
  border: 1px solid var(--panel-border);
  background: var(--panel-bg);
  border-radius: 16px;
  backdrop-filter: blur(18px);
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: taken-panel-in 0.25s ease;
}
@keyframes taken-panel-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.taken-panel-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 2px;
}
.taken-panel-title {
  font-size: 13px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 700;
}
.taken-panel-divider { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--hair); }
.taken-panel-reset {
  font-size: 13px;
  background: transparent;
  border: none;
  color: var(--soft);
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  transition: color 0.2s;
}
.taken-panel-reset:hover { color: var(--accent); }

.taken-preset-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.taken-preset {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 10px;
  border: 1px solid var(--hair);
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  color: var(--ink);
  transition: all 0.2s;
}
.taken-preset:hover { border-color: var(--accent); }
.taken-preset.is-active {
  border-color: var(--accent);
  background: var(--accent-dim);
  color: var(--accent);
}
.taken-preset-name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.taken-preset-desc {
  font-size: 11.5px;
  color: var(--soft);
  line-height: 1.35;
  letter-spacing: 0.04em;
}

.taken-slider-row {
  display: grid;
  grid-template-columns: 78px 1fr 60px;
  align-items: center;
  gap: 12px;
}
.taken-slider-label {
  font-size: 13px;
  color: var(--ink);
  letter-spacing: 0.05em;
}
.taken-slider {
  width: 100%;
  height: 5px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--hair);
  border-radius: 2px;
  cursor: pointer;
  outline: none;
}
.taken-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  box-shadow: 0 0 8px var(--accent-dim);
  transition: transform 0.15s ease;
}
.taken-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
.taken-slider::-moz-range-thumb {
  width: 16px; height: 16px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  cursor: pointer;
  box-shadow: 0 0 8px var(--accent-dim);
}
.taken-slider-value {
  font-size: 13px;
  color: var(--accent);
  font-weight: 700;
  text-align: right;
}

.taken-panel-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--hair);
  font-size: 12px;
  color: var(--soft);
}
.taken-panel-count {
  color: var(--accent);
  font-weight: 700;
  font-size: 15px;
  min-width: 32px;
}
.taken-panel-hint {
  flex-basis: 100%;
  font-size: 11.5px;
  color: var(--faint);
  letter-spacing: 0.05em;
}

/* ============= 响应式 ============= */
@media (max-width: 900px) {
  .taken-keyfacts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .taken-panel-host { display: none; }
}
@media (max-width: 640px) {
  .taken-root { padding: 32px 20px 72px; }
  .taken-title { font-size: clamp(56px, 18vw, 96px); }
  .taken-section { padding: 24px 0 30px; }
  .taken-section::before { left: -16px; }
  .taken-data, .taken-meta { font-size: 13px; }
  .taken-body { font-size: 15px; }
  .taken-keyfacts { grid-template-columns: 1fr 1fr; gap: 8px; }
  .taken-keyfact { padding: 12px 10px 10px; }
  .taken-keyfact-value { font-size: 13px; }
  .taken-keyfact-value--mono { font-size: 11px; }
  .taken-constellation { width: min(380px, 100%); }
  .taken-extra-rule { display: none; }
  .taken-extra-btn { padding: 10px 16px; font-size: 11px; }
  .taken-cursor-ring, .taken-cursor-dot { display: none; }
  .taken-cursor-on, .taken-cursor-on * { cursor: auto !important; }
}
`;
