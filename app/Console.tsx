"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  APPS,
  DOMAIN_LABELS,
  ENDPOINTS,
  consumersOf,
  getEndpoint,
  orphanEndpoints,
  resolveProbeUrl,
  type Endpoint,
  type RegisteredApp,
} from "@/lib/core/registry";

/** 探测请求带上这个 App-Id，让控制台自测流量与真实 APP 流量在统计里分得开 */
const CONSOLE_APP_ID = "console";

const STATS_URL = "/api/_stats/traffic";
const POLL_MS = 10_000;

interface EndpointStat {
  appId: string;
  method: string;
  path: string;
  totalHits: number;
  lastHitAt: number;
}

interface AppStat {
  appId: string;
  totalHits: number;
  lastHitAt: number;
}

interface TrafficSnapshot {
  countingSince: number;
  totalHits: number;
  byApp: AppStat[];
  byEndpoint: EndpointStat[];
}

interface ProbeResult {
  state: "pending" | "ok" | "err";
  status?: number;
  ms?: number;
  message?: string;
}

/* ============================================================
 * 工具
 * ============================================================ */

function formatWhen(ts: number): string {
  if (!ts) return "从未";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return new Date(ts).toLocaleDateString("zh-CN");
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} 秒`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} 分钟`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时`;
  return `${Math.floor(h / 24)} 天`;
}

/* ============================================================
 * 单个接口行
 * ============================================================ */

function EndpointRow({
  endpoint,
  hits,
  lastHitAt,
  onProbe,
  probe,
}: {
  endpoint: Endpoint;
  hits: number;
  lastHitAt: number;
  onProbe: (ep: Endpoint) => void;
  probe?: ProbeResult;
}) {
  const probeUrl = resolveProbeUrl(endpoint);
  const canProbe = probeUrl !== null;

  return (
    <div className="ep">
      <span className={`method ${endpoint.method}`}>{endpoint.method}</span>

      <div>
        <div className="ep-path">{endpoint.path}</div>
        <div className="ep-desc">{endpoint.description}</div>
      </div>

      <div className={`ep-hits${hits === 0 ? " zero" : ""}`}>
        {hits.toLocaleString("zh-CN")}
        <small>{formatWhen(lastHitAt)}</small>
      </div>

      <div className="probe">
        {probe && (
          <span
            className={`result ${probe.state}`}
            title={probe.message ?? ""}
          >
            {probe.state === "pending" && "…"}
            {probe.state === "ok" && `${probe.status} · ${probe.ms}ms`}
            {probe.state === "err" && (probe.message ?? "失败")}
          </span>
        )}
        <button
          className="btn"
          disabled={!canProbe || probe?.state === "pending"}
          onClick={() => onProbe(endpoint)}
          title={
            canProbe
              ? `GET ${probeUrl}`
              : "写操作不提供一键测试，避免误触产生副作用"
          }
        >
          测试
        </button>
      </div>
    </div>
  );
}

/* ============================================================
 * 主组件
 * ============================================================ */

export default function Console() {
  const [snapshot, setSnapshot] = useState<TrafficSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [probes, setProbes] = useState<Record<string, ProbeResult>>({});
  const [now, setNow] = useState(() => Date.now());

  /* ---- 拉取统计 ---- */
  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(STATS_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`统计接口返回 ${res.status}`);
      const json = await res.json();
      setSnapshot(json.data as TrafficSnapshot);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "统计接口不可达");
    }
  }, []);

  useEffect(() => {
    loadStats();
    const t = setInterval(loadStats, POLL_MS);
    return () => clearInterval(t);
  }, [loadStats]);

  // 让「多久之前」这类相对时间自己走动
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  /* ---- 探测某个接口 ---- */
  const runProbe = useCallback(
    async (ep: Endpoint) => {
      const url = resolveProbeUrl(ep);
      if (!url) return;

      setProbes((p) => ({ ...p, [ep.id]: { state: "pending" } }));
      const started = performance.now();

      try {
        const res = await fetch(url, {
          cache: "no-store",
          headers: { "X-App-Id": CONSOLE_APP_ID },
        });
        const ms = Math.round(performance.now() - started);
        setProbes((p) => ({
          ...p,
          [ep.id]: {
            state: res.ok ? "ok" : "err",
            status: res.status,
            ms,
            message: res.ok ? undefined : `HTTP ${res.status}`,
          },
        }));
        loadStats();
      } catch (e) {
        setProbes((p) => ({
          ...p,
          [ep.id]: {
            state: "err",
            message: e instanceof Error ? e.message : "请求失败",
          },
        }));
      }
    },
    [loadStats]
  );

  /* ---- 按 (appId, endpointId) 取命中数 ---- */
  const hitsFor = useCallback(
    (appId: string, ep: Endpoint) => {
      const row = snapshot?.byEndpoint.find(
        (s) => s.appId === appId && s.method === ep.method && s.path === ep.path
      );
      return { hits: row?.totalHits ?? 0, lastHitAt: row?.lastHitAt ?? 0 };
    },
    [snapshot]
  );

  /** 某接口在所有 APP 上的合计命中 */
  const totalHitsFor = useCallback(
    (ep: Endpoint) =>
      (snapshot?.byEndpoint ?? [])
        .filter((s) => s.method === ep.method && s.path === ep.path)
        .reduce((sum, s) => sum + s.totalHits, 0),
    [snapshot]
  );

  const orphans = useMemo(() => orphanEndpoints(), []);

  const appHits = useCallback(
    (appId: string) =>
      snapshot?.byApp.find((a) => a.appId === appId) ?? {
        appId,
        totalHits: 0,
        lastHitAt: 0,
      },
    [snapshot]
  );

  /** 统计里出现了、但注册表里没登记的 App-Id —— 说明有未登记的调用方 */
  const unregisteredApps = useMemo(() => {
    if (!snapshot) return [];
    const known = new Set([...APPS.map((a) => a.id), CONSOLE_APP_ID]);
    return snapshot.byApp.filter((a) => !known.has(a.appId));
  }, [snapshot]);

  return (
    <div className="wrap">
      {/* ============ 抬头 ============ */}
      <header className="masthead">
        <div className="eyebrow">API Platform · Console</div>
        <h1>接口平台控制台</h1>
        <p className="tagline">
          每个应用接入了哪些接口、各调用了多少次，以及哪些接口已经没有消费方。
        </p>
      </header>

      {/* ============ 概览 ============ */}
      <div className="overview">
        <div className="ov">
          <span className="n">{APPS.length}</span>
          <span className="k">已接入应用</span>
        </div>
        <div className="ov">
          <span className="n">{ENDPOINTS.length}</span>
          <span className="k">平台接口总数</span>
        </div>
        <div className="ov">
          <span className="n">
            {(snapshot?.totalHits ?? 0).toLocaleString("zh-CN")}
          </span>
          <span className="k">
            {snapshot
              ? `本实例累计调用（${formatDuration(now - snapshot.countingSince)}内）`
              : "累计调用"}
          </span>
        </div>
        <div className="ov">
          <span className="n" style={orphans.length ? { color: "var(--bad)" } : undefined}>
            {orphans.length}
          </span>
          <span className="k">无消费方接口</span>
        </div>
      </div>

      {/* ============ 数据可信度声明 ============ */}
      <div className="banner">
        <span className="ic">!</span>
        <span>
          <b>这里的调用数是「软统计」，攒在当前函数实例的内存里。</b>
          Vercel 冷启动或实例回收会让它清零，多实例部署时每个实例各算各的。
          用来看趋势和「哪些接口没人调」够用，不能当作精确账单。
          接入 Upstash Redis 后（重构方案阶段 3）这些数字才会持久且跨实例准确。
        </span>
      </div>

      {error && (
        <div className="banner" style={{ borderLeftColor: "var(--bad)" }}>
          <span className="ic" style={{ color: "var(--bad)" }}>
            ×
          </span>
          <span>
            <b>统计接口读取失败：</b>
            {error}
          </span>
        </div>
      )}

      {/* ============ 应用 ============ */}
      <section>
        <div className="sec-head">
          <h2>应用</h2>
          <span className="hint">
            按 <span className="mono">X-App-Id</span> 请求头归组
          </span>
        </div>

        {APPS.map((app: RegisteredApp) => {
          const stat = appHits(app.id);
          return (
            <div className="app" key={app.id}>
              <div className="app-head">
                <span className="app-id">{app.id}</span>
                <span className="app-name">{app.name}</span>
                <span className="app-meta">
                  {app.platform} · v{app.version}
                </span>
                <span className={`badge ${app.status}`}>{app.status}</span>
                <span className="app-hits">
                  <span className="n">
                    {stat.totalHits.toLocaleString("zh-CN")}
                  </span>
                  <span className="k">次调用 · {formatWhen(stat.lastHitAt)}</span>
                </span>
              </div>

              <div className="eps">
                {app.endpoints.map((epId) => {
                  const ep = getEndpoint(epId);
                  if (!ep) return null;
                  const { hits, lastHitAt } = hitsFor(app.id, ep);
                  return (
                    <EndpointRow
                      key={epId}
                      endpoint={ep}
                      hits={hits}
                      lastHitAt={lastHitAt}
                      onProbe={runProbe}
                      probe={probes[ep.id]}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* ============ 未登记的调用方 ============ */}
      {unregisteredApps.length > 0 && (
        <section>
          <div className="sec-head">
            <h2>未登记的调用方</h2>
            <span className="hint">
              有流量但不在注册表里 —— 要么补登记，要么就是没带 X-App-Id 的旧版
            </span>
          </div>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>App-Id</th>
                  <th style={{ textAlign: "right" }}>调用次数</th>
                  <th style={{ textAlign: "right" }}>最近调用</th>
                </tr>
              </thead>
              <tbody>
                {unregisteredApps.map((a) => (
                  <tr key={a.appId}>
                    <td className="mono">{a.appId}</td>
                    <td className="n">{a.totalHits.toLocaleString("zh-CN")}</td>
                    <td className="n">{formatWhen(a.lastHitAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ============ 无消费方的接口 ============ */}
      <section>
        <div className="sec-head">
          <h2>无消费方的接口</h2>
          <span className="hint">没有任何已登记应用引用 —— 下线候选</span>
        </div>

        {orphans.length === 0 ? (
          <div className="empty">所有接口都有应用在消费。</div>
        ) : (
          <div className="app orphan">
            <div className="eps">
              {orphans.map((ep) => (
                <EndpointRow
                  key={ep.id}
                  endpoint={ep}
                  hits={totalHitsFor(ep)}
                  lastHitAt={
                    snapshot?.byEndpoint.find(
                      (s) => s.method === ep.method && s.path === ep.path
                    )?.lastHitAt ?? 0
                  }
                  onProbe={runProbe}
                  probe={probes[ep.id]}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ============ 全部接口 ============ */}
      <section>
        <div className="sec-head">
          <h2>全部接口</h2>
          <span className="hint">
            按业务域分组 · 合计跨所有调用方
          </span>
        </div>

        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>域</th>
                <th>方法</th>
                <th>路径</th>
                <th>说明</th>
                <th style={{ textAlign: "right" }}>消费方</th>
                <th style={{ textAlign: "right" }}>调用次数</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((ep) => {
                const consumers = consumersOf(ep.id);
                return (
                  <tr key={ep.id}>
                    <td>{DOMAIN_LABELS[ep.domain]}</td>
                    <td>
                      <span className={`method ${ep.method}`}>{ep.method}</span>
                    </td>
                    <td className="mono" style={{ fontSize: "12.5px" }}>
                      {ep.path}
                    </td>
                    <td style={{ color: "var(--ink-3)", fontSize: "12.5px" }}>
                      {ep.description}
                    </td>
                    <td className="n">
                      {consumers.length === 0 ? (
                        <span className="orphan-note">无</span>
                      ) : (
                        consumers.map((c) => c.name).join("、")
                      )}
                    </td>
                    <td className="n">
                      {totalHitsFor(ep).toLocaleString("zh-CN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <footer>
        <span>
          {snapshot
            ? `统计起点 ${new Date(snapshot.countingSince).toLocaleString("zh-CN")}`
            : "统计加载中"}
        </span>
        <span>每 {POLL_MS / 1000} 秒自动刷新</span>
      </footer>
    </div>
  );
}
