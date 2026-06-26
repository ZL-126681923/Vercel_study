"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  API_GROUP_LABELS,
  API_WATCH_ENDPOINTS,
  resolveEndpointPath,
  type ApiGroup,
  type WatchedEndpoint,
} from "@/lib/apiWatch";
import { useTheme } from "@/components/ThemeProvider";

/**
 * API 健康检查 & 访问统计页
 *
 * 两个能力，不做轮询：
 *  1. 访问统计 —— 通过 middleware 暴露的 /api/_stats/traffic 拉取
 *  2. 手动测试 —— 点击「测试」单点探测，验证接口是否正常
 */

interface EndpointStat {
  method: string;
  path: string;
  totalHits: number;
  lastHitAt: number;
}

type ProbeStatus = "idle" | "probing" | "ok" | "warn" | "error";

interface ProbeRecord {
  ts: number;
  status: ProbeStatus;
  httpStatus?: number;
  latencyMs?: number;
  size?: number;
  error?: string;
}

const PROBE_TIMEOUT_MS = 8_000;

const STATUS_LABEL: Record<ProbeStatus, string> = {
  idle: "未测试",
  probing: "测试中",
  ok: "正常",
  warn: "告警",
  error: "异常",
};

const STATUS_PILL_DARK: Record<ProbeStatus, string> = {
  idle: "border-stone-600/60 bg-stone-800/60 text-stone-400",
  probing: "border-sky-400/50 bg-sky-500/15 text-sky-200",
  ok: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  warn: "border-amber-400/50 bg-amber-500/15 text-amber-200",
  error: "border-rose-400/50 bg-rose-500/15 text-rose-200",
};

const STATUS_PILL_LIGHT: Record<ProbeStatus, string> = {
  idle: "border-stone-300 bg-stone-100 text-stone-600",
  probing: "border-sky-300 bg-sky-100 text-sky-800",
  ok: "border-emerald-300 bg-emerald-100 text-emerald-800",
  warn: "border-amber-400 bg-amber-100 text-amber-800",
  error: "border-rose-300 bg-rose-100 text-rose-800",
};

const METHOD_BADGE_DARK: Record<WatchedEndpoint["method"], string> = {
  GET: "border-sky-400/50 bg-sky-500/15 text-sky-200",
  POST: "border-emerald-400/50 bg-emerald-500/15 text-emerald-200",
  PUT: "border-amber-400/50 bg-amber-500/15 text-amber-200",
  PATCH: "border-amber-400/50 bg-amber-500/15 text-amber-200",
  DELETE: "border-rose-400/50 bg-rose-500/15 text-rose-200",
};

const METHOD_BADGE_LIGHT: Record<WatchedEndpoint["method"], string> = {
  GET: "border-sky-300 bg-sky-100 text-sky-800",
  POST: "border-emerald-300 bg-emerald-100 text-emerald-800",
  PUT: "border-amber-400 bg-amber-100 text-amber-800",
  PATCH: "border-amber-400 bg-amber-100 text-amber-800",
  DELETE: "border-rose-300 bg-rose-100 text-rose-800",
};

function formatTime(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("zh-CN", { hour12: false });
}

function formatRelative(ts: number | null | undefined) {
  if (!ts) return "从未";
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.max(1, Math.round(diff / 1000))} 秒前`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} 小时前`;
  return `${Math.round(diff / 86_400_000)} 天前`;
}

function formatLatency(ms: number | null | undefined) {
  if (ms == null) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatSize(bytes: number | null | undefined) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function deriveStatus(rec: ProbeRecord | null | undefined): ProbeStatus {
  if (!rec) return "idle";
  if (rec.status === "probing") return "probing";
  if (rec.error) return "error";
  if (typeof rec.httpStatus === "number") {
    if (rec.httpStatus >= 200 && rec.httpStatus < 300) {
      return typeof rec.latencyMs === "number" && rec.latencyMs > 3000 ? "warn" : "ok";
    }
    if (rec.httpStatus >= 400 && rec.httpStatus < 500) return "warn";
    return "error";
  }
  return rec.status;
}

async function probeOnce(endpoint: WatchedEndpoint, signal: AbortSignal): Promise<ProbeRecord> {
  const ts = Date.now();
  const url = resolveEndpointPath(endpoint);
  const start = typeof performance !== "undefined" ? performance.now() : ts;

  try {
    const res = await fetch(url, {
      method: endpoint.method,
      cache: "no-store",
      signal,
      headers: { Accept: "application/json, image/*" },
    });
    const buf = await res.arrayBuffer();
    const latencyMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - start;
    return {
      ts,
      status: res.ok ? "ok" : res.status >= 500 ? "error" : "warn",
      httpStatus: res.status,
      latencyMs,
      size: buf.byteLength,
    };
  } catch (err) {
    const latencyMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - start;
    const aborted = signal.aborted || (err instanceof DOMException && err.name === "AbortError");
    return {
      ts,
      status: "error",
      latencyMs: aborted ? undefined : latencyMs,
      error: aborted ? "请求被取消" : err instanceof Error ? err.message : String(err),
    };
  }
}

export default function ApiMonitor() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const palette = useMemo(() => {
    if (isLight) {
      return {
        sectionBg: "border-stone-300 bg-gradient-to-br from-white via-stone-50 to-stone-100",
        sectionDivider: "border-stone-200 bg-stone-200",
        kbdLabel: "text-stone-500",
        kbdValue: "text-stone-900",
        primaryAccent: "text-amber-700",
        sectionTitle: "text-stone-900",
        sectionDesc: "text-stone-600",
        filterBar: "border-stone-300 bg-white/80",
        filterBtnIdle: "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
        filterBtnActive: "bg-amber-100 text-amber-800 shadow-inner shadow-amber-500/10",
        primaryBtn: "border-amber-400 bg-amber-100 text-amber-800 hover:border-amber-500 hover:bg-amber-200 hover:text-amber-900",
        ghostBtn: "border-stone-300 bg-white text-stone-700 hover:border-stone-500 hover:bg-stone-50 hover:text-stone-900",
        card: "border-stone-300 bg-white/85 hover:border-stone-400 hover:bg-white",
        cardAccentBar: "bg-stone-300",
        cardTitle: "text-stone-900",
        cardDesc: "text-stone-600",
        infoGrid: "border-stone-200 bg-stone-100/70",
        infoLabel: "text-stone-500",
        infoValue: "text-stone-900",
        errorBox: "border-rose-300 bg-rose-50 text-rose-800",
        codeBlock: "bg-stone-100 text-stone-700 border-stone-200",
        trafficAccent: "text-amber-700",
        trafficEmpty: "text-stone-400",
        tableHeader: "bg-stone-100 text-stone-500",
        tableRow: "border-stone-200 hover:bg-stone-50",
        tableCellMuted: "text-stone-500",
        emptyState: "border-dashed border-stone-300 bg-white/40 text-stone-500",
      };
    }
    return {
      sectionBg: "border-white/10 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-stone-950/90",
      sectionDivider: "border-white/10 bg-white/5",
      kbdLabel: "text-stone-400",
      kbdValue: "text-stone-50",
      primaryAccent: "text-amber-300",
      sectionTitle: "text-stone-50",
      sectionDesc: "text-stone-300",
      filterBar: "border-white/10 bg-slate-900/60",
      filterBtnIdle: "text-stone-300 hover:bg-white/5 hover:text-stone-100",
      filterBtnActive: "bg-amber-400/20 text-amber-100 shadow-inner shadow-amber-500/10",
      primaryBtn: "border-amber-300/60 bg-amber-400/15 text-amber-100 hover:border-amber-200 hover:bg-amber-300/25 hover:text-amber-50",
      ghostBtn: "border-white/15 bg-white/[0.04] text-stone-200 hover:border-white/30 hover:bg-white/[0.08] hover:text-stone-50",
      card: "border-white/10 bg-slate-900/65 hover:border-white/20 hover:bg-slate-900/80",
      cardAccentBar: "bg-stone-500/40",
      cardTitle: "text-stone-100",
      cardDesc: "text-stone-300",
      infoGrid: "border-white/10 bg-black/30",
      infoLabel: "text-stone-400",
      infoValue: "text-stone-50",
      errorBox: "border-rose-400/40 bg-rose-500/15 text-rose-100",
      codeBlock: "bg-black/30 text-stone-300 border-transparent",
      trafficAccent: "text-amber-300/90",
      trafficEmpty: "text-stone-600",
      tableHeader: "bg-slate-900/60 text-stone-400",
      tableRow: "border-white/5 hover:bg-white/[0.03]",
      tableCellMuted: "text-stone-500",
      emptyState: "border-dashed border-white/10 bg-slate-900/40 text-stone-400",
    };
  }, [isLight]);

  const [traffic, setTraffic] = useState<EndpointStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsFetchedAt, setStatsFetchedAt] = useState<number>(0);
  const [groupFilter, setGroupFilter] = useState<ApiGroup | "all">("all");
  const [onlyWrite, setOnlyWrite] = useState(false);

  // 手动测试结果
  const [testResults, setTestResults] = useState<Record<string, ProbeRecord>>({});
  const [probing, setProbing] = useState<Set<string>>(new Set());

  // ==================== 拉取访问统计 ====================
  const refreshTraffic = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/_stats/traffic", { cache: "no-store" });
      const data = await res.json();
      if (data?.code === 0 && Array.isArray(data.data)) {
        setTraffic(data.data as EndpointStat[]);
        setStatsFetchedAt(Date.now());
      }
    } catch {
      // 静默失败 —— 拉不到就保持旧数据
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTraffic();
  }, [refreshTraffic]);

  // ==================== 手动测试单个接口 ====================
  const testEndpoint = useCallback(async (endpoint: WatchedEndpoint) => {
    if (!endpoint.safeToTest) return;
    if (probing.has(endpoint.id)) return;

    setProbing((p) => {
      const next = new Set(p);
      next.add(endpoint.id);
      return next;
    });
    setTestResults((r) => ({
      ...r,
      [endpoint.id]: { ts: Date.now(), status: "probing" },
    }));

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
      try {
        const rec = await probeOnce(endpoint, controller.signal);
        setTestResults((r) => ({ ...r, [endpoint.id]: rec }));
      } finally {
        clearTimeout(timeout);
      }
    } finally {
      setProbing((p) => {
        const next = new Set(p);
        next.delete(endpoint.id);
        return next;
      });
    }
  }, [probing]);

  const testAll = useCallback(async () => {
    const targets = API_WATCH_ENDPOINTS.filter((e) => e.safeToTest);
    await Promise.allSettled(targets.map((e) => testEndpoint(e)));
  }, [testEndpoint]);

  // ==================== 派生：合并目录与流量 ====================
  const merged = useMemo(() => {
    const statMap = new Map<string, EndpointStat>();
    for (const s of traffic) statMap.set(`${s.method} ${s.path}`, s);
    return API_WATCH_ENDPOINTS
      .filter((e) => {
        if (groupFilter !== "all" && e.group !== groupFilter) return false;
        if (onlyWrite && e.safeToTest) return false;
        return true;
      })
      .map((endpoint) => {
        const stat = statMap.get(`${endpoint.method} ${endpoint.path}`) ?? null;
        return {
          endpoint,
          stat,
          lastTest: testResults[endpoint.id] ?? null,
        };
      });
  }, [traffic, groupFilter, onlyWrite, testResults]);

  // 总体汇总
  const totals = useMemo(() => {
    let hits = 0;
    let active = 0;
    let lastAt = 0;
    for (const s of traffic) {
      hits += s.totalHits;
      active += 1;
      if (s.lastHitAt > lastAt) lastAt = s.lastHitAt;
    }
    return { hits, active, lastAt };
  }, [traffic]);

  const testableCount = useMemo(() => API_WATCH_ENDPOINTS.filter((e) => e.safeToTest).length, []);
  const anyProbing = probing.size > 0;

  return (
    <div className="space-y-8">
      {/* ============ 顶部标题 ============ */}
      <header className="space-y-1.5">
        <div
          className={`text-[11px] font-semibold uppercase tracking-[0.36em] ${palette.primaryAccent}`}
        >
          API Health · Traffic
        </div>
        <h1 className={`font-serif text-2xl md:text-[28px] ${palette.sectionTitle}`}>
          API 健康检查 &amp; 访问统计
        </h1>
        <p className={`max-w-2xl text-sm leading-6 ${palette.sectionDesc}`}>
          只做两件事：查看外部访问了哪些接口、点击「测试」单点验证接口是否正常。
          <span className="opacity-80"> 不自动轮询，不消耗配额。</span>
        </p>
      </header>

      {/* ============ Section 1: 访问统计 ============ */}
      <section
        className={`relative overflow-hidden rounded-3xl border backdrop-blur-sm ${palette.sectionBg}`}
      >
        <div className="relative flex flex-col gap-4 px-4 py-5 sm:px-6 md:flex-row md:items-center md:justify-between md:px-7 md:py-6">
          <div className="min-w-0">
            <h2 className={`font-serif text-lg md:text-xl ${palette.sectionTitle}`}>外部访问统计</h2>
            <p className={`mt-1 text-xs ${palette.sectionDesc}`}>
              数据由 <code className="break-all font-mono">/api/_stats/traffic</code> 提供，
              基于 Edge Middleware 内存计数。冷启动或多 region 部署时计数会清零，仅供参考。
            </p>
          </div>
          <button
            type="button"
            onClick={refreshTraffic}
            disabled={statsLoading}
            className={`shrink-0 self-start rounded-full border px-4 py-2 text-sm font-semibold transition disabled:opacity-50 sm:self-auto ${palette.ghostBtn}`}
          >
            {statsLoading ? "刷新中…" : "刷新统计"}
          </button>
        </div>

        <div className={`grid grid-cols-2 gap-px border-t md:grid-cols-4 ${palette.sectionDivider}`}>
          <SummaryCell label="总请求数" value={totals.hits.toLocaleString()} palette={palette} />
          <SummaryCell label="活跃接口" value={`${totals.active} / ${API_WATCH_ENDPOINTS.length}`} palette={palette} />
          <SummaryCell
            label="最近访问"
            value={totals.lastAt ? formatRelative(totals.lastAt) : "暂无"}
            palette={palette}
          />
          <SummaryCell
            label="本次更新"
            value={statsFetchedAt ? formatTime(statsFetchedAt) : "—"}
            palette={palette}
          />
        </div>

        {/* 流量表格 */}
        <div className="border-t border-white/5">
          {traffic.length === 0 ? (
            <div className={`px-4 py-10 text-center text-sm sm:px-6 ${palette.trafficEmpty}`}>
              暂无任何接口被访问。等待真实用户访问接口后此处会自动出现数据。
            </div>
          ) : (
            <>
              {/* 移动端：卡片列表 */}
              <ul className="divide-y divide-white/5 sm:hidden">
                {traffic.map((s) => {
                  const pct = totals.hits === 0 ? 0 : (s.totalHits / totals.hits) * 100;
                  return (
                    <li key={`m-${s.method} ${s.path}`} className="px-4 py-3">
                      <div className="mb-2 flex items-center gap-2">
                        <MethodBadge method={s.method as WatchedEndpoint["method"]} isLight={isLight} />
                        <span className={`min-w-0 flex-1 truncate font-mono text-xs ${palette.sectionTitle}`}>
                          {s.path}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <div className="flex min-w-0 items-center gap-1">
                          <span className={palette.tableCellMuted}>请求</span>
                          <span className={`font-mono font-semibold ${palette.sectionTitle}`}>
                            {s.totalHits.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex min-w-0 items-center gap-1">
                          <span className={palette.tableCellMuted}>最后</span>
                          <span className={`truncate ${palette.tableCellMuted}`}>
                            {formatRelative(s.lastHitAt)}
                          </span>
                        </div>
                        <div className="ml-auto flex shrink-0 items-center gap-1.5">
                          <span className={`font-mono ${palette.tableCellMuted}`}>{pct.toFixed(1)}%</span>
                          <div className={`h-1 w-12 overflow-hidden rounded-full ${isLight ? "bg-stone-200" : "bg-white/5"}`}>
                            <div
                              className={`h-full ${isLight ? "bg-amber-500" : "bg-amber-400/80"}`}
                              style={{ width: `${Math.max(2, pct)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* 桌面端：表格 */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead className={palette.tableHeader}>
                    <tr className="text-[10px] uppercase tracking-[0.18em]">
                      <th className="px-5 py-2.5 text-left font-semibold">方法</th>
                      <th className="px-3 py-2.5 text-left font-semibold">接口</th>
                      <th className="px-3 py-2.5 text-right font-semibold">请求数</th>
                      <th className="px-3 py-2.5 text-right font-semibold">最后访问</th>
                      <th className="px-5 py-2.5 text-right font-semibold">占比</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traffic.map((s) => {
                      const pct = totals.hits === 0 ? 0 : (s.totalHits / totals.hits) * 100;
                      return (
                        <tr key={`d-${s.method} ${s.path}`} className={`border-t ${palette.tableRow}`}>
                          <td className="px-5 py-2.5 align-middle">
                            <MethodBadge method={s.method as WatchedEndpoint["method"]} isLight={isLight} />
                          </td>
                          <td className={`px-3 py-2.5 font-mono text-xs ${palette.sectionTitle}`}>{s.path}</td>
                          <td className={`px-3 py-2.5 text-right font-mono ${palette.sectionTitle}`}>
                            {s.totalHits.toLocaleString()}
                          </td>
                          <td className={`px-3 py-2.5 text-right text-xs ${palette.tableCellMuted}`}>
                            {formatRelative(s.lastHitAt)}
                          </td>
                          <td className="px-5 py-2.5 align-middle">
                            <div className="flex items-center justify-end gap-2">
                              <span className={`font-mono text-xs ${palette.tableCellMuted}`}>
                                {pct.toFixed(1)}%
                              </span>
                              <div className={`h-1.5 w-20 overflow-hidden rounded-full ${isLight ? "bg-stone-200" : "bg-white/5"}`}>
                                <div
                                  className={`h-full ${isLight ? "bg-amber-500" : "bg-amber-400/80"}`}
                                  style={{ width: `${Math.max(2, pct)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ============ Section 2: 手动测试 ============ */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className={`font-serif text-lg md:text-xl ${palette.sectionTitle}`}>接口手动测试</h2>
            <p className={`mt-1 text-xs ${palette.sectionDesc}`}>
              共 {API_WATCH_ENDPOINTS.length} 个接口，其中 {testableCount} 个 GET 可直接测试，
              其余写操作需鉴权，请用 Postman / curl 手动验证。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex flex-wrap gap-1 rounded-full border p-1 ${palette.filterBar}`}>
              {(["all", "system", "poems", "content", "media"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroupFilter(g)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    groupFilter === g ? palette.filterBtnActive : palette.filterBtnIdle
                  }`}
                >
                  {g === "all" ? "全部" : API_GROUP_LABELS[g]}
                </button>
              ))}
            </div>
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
                isLight
                  ? "border-stone-300 bg-white/80 text-stone-700 hover:border-stone-400"
                  : "border-white/10 bg-slate-900/60 text-stone-300 hover:border-white/20"
              }`}
            >
              <input
                type="checkbox"
                checked={onlyWrite}
                aria-label="仅写入"
                onChange={(e) => setOnlyWrite(e.target.checked)}
                className="h-3.5 w-3.5 accent-amber-500"
              />
              仅看写操作
            </label>
            <button
              type="button"
              onClick={testAll}
              disabled={anyProbing}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${palette.primaryBtn}`}
            >
              {anyProbing ? "测试中…" : "测试全部"}
            </button>
          </div>
        </div>

        {merged.length === 0 ? (
          <div className={`rounded-2xl border p-10 text-center text-sm ${palette.emptyState}`}>
            当前过滤条件下没有接口。
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {merged.map(({ endpoint, stat, lastTest }) => {
              const status = deriveStatus(lastTest);
              const isProbing = probing.has(endpoint.id);
              const isTestable = endpoint.safeToTest;
              return (
                <article
                  key={endpoint.id}
                  className={`relative flex flex-col overflow-hidden rounded-2xl border p-4 transition sm:p-5 ${palette.card}`}
                >
                  <span
                    className={`absolute inset-x-0 top-0 h-px ${
                      !isTestable
                        ? palette.cardAccentBar
                        : status === "ok"
                        ? isLight
                          ? "bg-emerald-500"
                          : "bg-emerald-400/50"
                        : status === "warn"
                        ? isLight
                          ? "bg-amber-500"
                          : "bg-amber-400/60"
                        : status === "error"
                        ? isLight
                          ? "bg-rose-500"
                          : "bg-rose-400/70"
                        : status === "probing"
                        ? isLight
                          ? "bg-sky-500"
                          : "bg-sky-400/70"
                        : palette.cardAccentBar
                    }`}
                  />

                  <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <MethodBadge method={endpoint.method} isLight={isLight} />
                        <span
                          className={`min-w-0 flex-1 truncate font-mono text-sm ${palette.cardTitle}`}
                          title={endpoint.path}
                        >
                          {endpoint.path}
                        </span>
                      </div>
                      <p className={`mt-1.5 text-sm leading-5 ${palette.cardDesc}`}>
                        {endpoint.description}
                      </p>
                    </div>
                    <StatusPill
                      status={!isTestable ? "idle" : status}
                      label={!isTestable ? "写操作" : STATUS_LABEL[status]}
                      isLight={isLight}
                    />
                  </header>

                  {/* 流量统计 */}
                  <div className={`mt-4 grid grid-cols-2 gap-2 rounded-xl border px-3 py-2.5 ${palette.infoGrid}`}>
                    <Metric
                      label="请求数"
                      value={stat ? stat.totalHits.toLocaleString() : "0"}
                      palette={palette}
                    />
                    <Metric
                      label="最后访问"
                      value={stat ? formatRelative(stat.lastHitAt) : "从未"}
                      palette={palette}
                    />
                  </div>

                  {/* 测试结果 */}
                  {isTestable && lastTest && lastTest.status !== "probing" && (
                    <div className={`mt-3 rounded-xl border px-3 py-2.5 ${palette.infoGrid}`}>
                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <Metric label="HTTP" value={lastTest.httpStatus ? String(lastTest.httpStatus) : "—"} palette={palette} />
                        <Metric label="延迟" value={formatLatency(lastTest.latencyMs)} palette={palette} />
                        <Metric label="大小" value={formatSize(lastTest.size)} palette={palette} />
                      </div>
                      <div className={`mt-1.5 text-[10px] font-mono ${palette.tableCellMuted}`}>
                        {formatTime(lastTest.ts)}
                      </div>
                    </div>
                  )}

                  {isTestable && lastTest?.error && (
                    <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${palette.errorBox}`}>
                      {lastTest.error}
                    </div>
                  )}

                  <footer className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <code
                      className={`min-w-0 flex-1 truncate rounded border px-2 py-1 font-mono text-[11px] ${palette.codeBlock}`}
                      title={resolveEndpointPath(endpoint)}
                    >
                      {resolveEndpointPath(endpoint)}
                    </code>
                    <button
                      type="button"
                      onClick={() => testEndpoint(endpoint)}
                      disabled={!isTestable || isProbing}
                      className={`shrink-0 self-start rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto ${
                        isTestable ? palette.primaryBtn : palette.ghostBtn
                      }`}
                    >
                      {!isTestable ? "需鉴权" : isProbing ? "测试中…" : "测试"}
                    </button>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCell({ label, value, palette }: { label: string; value: string; palette: ReturnType<typeof Object> }) {
  return (
    <div className="px-3 py-3 sm:px-4 sm:py-3.5 md:px-5">
      <div className={`text-[10px] font-semibold uppercase tracking-[0.2em] sm:text-[11px] ${palette.kbdLabel}`}>
        {label}
      </div>
      <div className={`mt-1 font-mono text-base font-semibold sm:text-lg md:text-xl ${palette.kbdValue}`}>
        {value}
      </div>
    </div>
  );
}

function Metric({ label, value, palette }: { label: string; value: string; palette: ReturnType<typeof Object> }) {
  return (
    <div>
      <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${palette.infoLabel}`}>
        {label}
      </div>
      <div className={`mt-0.5 font-mono text-sm font-semibold ${palette.infoValue}`}>{value}</div>
    </div>
  );
}

function MethodBadge({ method, isLight }: { method: WatchedEndpoint["method"]; isLight: boolean }) {
  const map = isLight ? METHOD_BADGE_LIGHT : METHOD_BADGE_DARK;
  return (
    <span
      className={`inline-flex h-5 items-center rounded border px-1.5 font-mono text-[11px] font-bold tracking-wider ${map[method]}`}
    >
      {method}
    </span>
  );
}

function StatusPill({ status, label, isLight }: { status: ProbeStatus; label: string; isLight: boolean }) {
  const map = isLight ? STATUS_PILL_LIGHT : STATUS_PILL_DARK;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${map[status]}`}
    >
      <span
        className={`relative inline-flex h-2 w-2 rounded-full ${
          status === "probing"
            ? "bg-sky-400"
            : status === "ok"
            ? isLight
              ? "bg-emerald-500"
              : "bg-emerald-400"
            : status === "warn"
            ? isLight
              ? "bg-amber-500"
              : "bg-amber-400"
            : status === "error"
            ? "bg-rose-500"
            : isLight
            ? "bg-stone-400"
            : "bg-stone-500"
        }`}
      >
        {status === "probing" && (
          <span className="absolute inset-0 animate-ping rounded-full bg-sky-400" />
        )}
      </span>
      {label}
    </span>
  );
}
