import { NextRequest, NextResponse } from "next/server";

/**
 * /api/* 通用中间件
 *
 * 承担两件事：
 *  1. 限流 —— 60s 内同 IP 最多 60 次请求，超出直接 429（挡脚本化滥用）
 *  2. 访问统计 —— 记录每个 (method, path) 的命中次数与最近访问时间
 *     并在内置的 /api/_stats/traffic 直接返回 JSON（避免跨 runtime 状态丢失）
 *
 * 实现说明：
 *  - 运行在 Edge Runtime，单 region 内 in-memory Map 足够。
 *  - 进程重启 / 多 region 部署 / cold start 会让计数清零 —— 这是「软统计」，
 *    真实精确的访问量应交给 Vercel Analytics / 阿里云日志 等专业工具。
 *  - 适配 basePath（如部署在 https://host.tld/blog 下，会自动剥掉 /blog 前缀）。
 */

// ==================== 限流 ====================
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const CLEANUP_THRESHOLD = 5_000;

type Bucket = number[];
const buckets: Map<string, Bucket> = new Map();

// ==================== 访问统计 ====================
export interface EndpointStat {
  method: string;
  path: string;
  totalHits: number;
  lastHitAt: number; // ms 时间戳；0 表示从未命中
}

const stats: Map<string, EndpointStat> = new Map();

function statKey(method: string, path: string) {
  return `${method} ${path}`;
}

function recordHit(method: string, path: string) {
  const k = statKey(method, path);
  let s = stats.get(k);
  if (!s) {
    s = { method, path, totalHits: 0, lastHitAt: 0 };
    stats.set(k, s);
  }
  s.totalHits += 1;
  s.lastHitAt = Date.now();
}

function getAllStats(): EndpointStat[] {
  // 命中多的排前面，再按路径字典序
  return Array.from(stats.values()).sort((a, b) => {
    if (b.totalHits !== a.totalHits) return b.totalHits - a.totalHits;
    return a.path.localeCompare(b.path);
  });
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
export function middleware(req: NextRequest) {
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

  // 2. 统计接口：直接在 middleware 返回 JSON，不走 route handler
  //    也不计入 hit —— 避免「看统计」本身污染统计
  if (path === "/api/_stats/traffic" && method === "GET") {
    return NextResponse.json(
      { code: 0, data: getAllStats() },
      {
        headers: {
          "Cache-Control": "no-store",
          ...rateLimitHeaders(remaining),
        },
      }
    );
  }

  // 3. 其他接口：记录命中，放行到 route handler
  recordHit(method, path);

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
