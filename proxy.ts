import { NextRequest, NextResponse } from "next/server";
import { normalizeToTemplate } from "@/lib/core/registry";

/**
 * /api/* 通用代理（Next.js 16 起 middleware 的正式文件名就是 proxy.ts）
 *
 * 承担两件事：
 *  1. 限流 —— 60s 内同 IP 最多 60 次请求，超出直接 429（挡脚本化滥用）
 *  2. 访问统计 —— 按 (appId, method, 模板路径) 记录命中次数与最近访问时间，
 *     并在内置的 /api/_stats/traffic 直接返回 JSON
 *
 * 为什么统计接口写在这里而不是 route handler：
 *  proxy 跑在 Edge Runtime，route handler 跑在 Node Runtime，两者内存不共享。
 *  统计数据攒在 proxy 的内存里，就必须由 proxy 自己吐出来。
 *
 * ⚠️ 当前是「软统计」，serverless 下有两个已知失真，控制台会如实标注：
 *  - 冷启动 / 实例回收会让计数清零
 *  - 多实例各算各的，限流实际阈值是 60 × 实例数
 *  修法是把状态挪到 Redis（见 REFACTOR_ARCHITECTURE.md 阶段 3），不是改文件名。
 */

// ==================== 限流 ====================
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const CLEANUP_THRESHOLD = 5_000;

type Bucket = number[];
const buckets: Map<string, Bucket> = new Map();

// ==================== 访问统计 ====================
/** 未携带 X-App-Id 的请求归入此桶 */
const UNKNOWN_APP = "unknown";

export interface EndpointStat {
  appId: string;
  method: string;
  /** 模板路径，动态段已归一为 [id] */
  path: string;
  totalHits: number;
  lastHitAt: number; // ms 时间戳；0 表示从未命中
}

const stats: Map<string, EndpointStat> = new Map();

/** 本实例开始计数的时刻，用于让控制台说清「这些数字覆盖多长时间」 */
const countingSince = Date.now();

function statKey(appId: string, method: string, path: string) {
  return `${appId}|${method} ${path}`;
}

function recordHit(appId: string, method: string, path: string) {
  const k = statKey(appId, method, path);
  let s = stats.get(k);
  if (!s) {
    s = { appId, method, path, totalHits: 0, lastHitAt: 0 };
    stats.set(k, s);
  }
  s.totalHits += 1;
  s.lastHitAt = Date.now();
}

export interface AppStat {
  appId: string;
  totalHits: number;
  lastHitAt: number;
}

export interface TrafficSnapshot {
  /** 本实例开始计数的时刻 */
  countingSince: number;
  totalHits: number;
  byApp: AppStat[];
  byEndpoint: EndpointStat[];
}

function getSnapshot(): TrafficSnapshot {
  const byEndpoint = Array.from(stats.values()).sort((a, b) => {
    if (b.totalHits !== a.totalHits) return b.totalHits - a.totalHits;
    return a.path.localeCompare(b.path);
  });

  const appMap = new Map<string, AppStat>();
  let totalHits = 0;
  for (const s of byEndpoint) {
    totalHits += s.totalHits;
    let a = appMap.get(s.appId);
    if (!a) {
      a = { appId: s.appId, totalHits: 0, lastHitAt: 0 };
      appMap.set(s.appId, a);
    }
    a.totalHits += s.totalHits;
    a.lastHitAt = Math.max(a.lastHitAt, s.lastHitAt);
  }

  return {
    countingSince,
    totalHits,
    byApp: Array.from(appMap.values()).sort((a, b) => b.totalHits - a.totalHits),
    byEndpoint,
  };
}

// ==================== 工具 ====================
function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const ip = (req as NextRequest & { ip?: string }).ip;
  if (ip) return ip;
  return "unknown";
}

function normalizePath(req: NextRequest): string {
  const url = req.nextUrl;
  const fullPath = url.pathname;
  const basePath = url.basePath || "";
  if (basePath && fullPath.startsWith(basePath)) {
    return fullPath.slice(basePath.length);
  }
  return fullPath;
}

function pruneBuckets(now: number) {
  if (buckets.size <= CLEANUP_THRESHOLD) return;
  const cutoff = now - WINDOW_MS;
  for (const [key, list] of buckets) {
    if (list.length === 0 || list[list.length - 1] < cutoff) {
      buckets.delete(key);
    }
  }
}

function rateLimitHeaders(remaining: number): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(MAX_REQUESTS),
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
  };
}

// ==================== 主入口 ====================
export function proxy(req: NextRequest) {
  const path = normalizePath(req);
  const method = req.method;
  const ip = getClientIp(req);
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  // 1. 限流 —— 对 /api/_stats/traffic 也生效，防止被刷
  const list = buckets.get(ip);
  const recent: Bucket = list ? list.filter((ts) => ts > cutoff) : [];
  if (recent.length >= MAX_REQUESTS) {
    const oldest = recent[0];
    const resetAt = oldest + WINDOW_MS;
    const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));
    return new NextResponse(
      JSON.stringify({
        code: 429,
        error: "请求过于频繁，请稍后再试",
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Retry-After": String(retryAfter),
          ...rateLimitHeaders(0),
          "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        },
      }
    );
  }
  recent.push(now);
  buckets.set(ip, recent);
  pruneBuckets(now);
  const remaining = MAX_REQUESTS - recent.length;

  // 2. 统计接口：直接在 proxy 返回 JSON，不走 route handler
  //    也不计入 hit —— 避免「看统计」本身污染统计
  if (path === "/api/_stats/traffic" && method === "GET") {
    return NextResponse.json(
      { code: 0, data: getSnapshot() },
      {
        headers: {
          "Cache-Control": "no-store",
          ...rateLimitHeaders(remaining),
        },
      }
    );
  }

  // 3. 其他接口：记录命中，放行到 route handler
  //    路径归一为模板，否则每首诗会各占一行统计
  const appId = req.headers.get("x-app-id")?.trim() || UNKNOWN_APP;
  recordHit(appId, method, normalizeToTemplate(path));

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(rateLimitHeaders(remaining))) {
    res.headers.set(k, v);
  }
  return res;
}

export const config = {
  // 仅对 /api/* 生效；页面、图片、静态资源不走限流
  matcher: "/api/:path*",
};
