import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

interface GeoResponse {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  org?: string;
  org_asn?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  /** 数据来源，便于排查（vercel-edge / ipwho.is / ipapi.co） */
  source?: string;
  error?: string;
}

function dec(v: string | null | undefined): string | undefined {
  if (!v) return undefined;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function num(v: string | null | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** 从转发头里取真实访客 IP（忽略本地回环） */
function clientIp(req: NextRequest): string | undefined {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first && first !== "::1" && first !== "127.0.0.1") return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real && real !== "::1" && real !== "127.0.0.1") return real;
  return undefined;
}

async function fetchJson(url: string, timeoutMs = 4000): Promise<Record<string, unknown> | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    clearTimeout(t);
    if (!r.ok) return null;
    return (await r.json()) as Record<string, unknown>;
  } catch {
    clearTimeout(t);
    return null;
  }
}

/**
 * 用「访客 IP」去查外部地理库。
 * 关键：把 ip 放进路径里查询——否则查到的是发起请求的服务器（Vercel 边缘节点）的位置，而非访客。
 * 不传 ip 时（如本地开发拿不到转发头）按调用方 IP 兜底。
 */
async function lookupExternal(ip?: string): Promise<GeoResponse | null> {
  const seg = ip ? encodeURIComponent(ip) : "";

  // ipwho.is —— 嵌套结构：connection.{org,isp,asn} / timezone.id
  const who = await fetchJson(`https://ipwho.is/${seg}`);
  if (who && who.success !== false && who.ip) {
    const conn = (who.connection ?? {}) as Record<string, unknown>;
    const tz = (who.timezone ?? {}) as Record<string, unknown>;
    return {
      ip: String(who.ip),
      city: typeof who.city === "string" ? who.city : undefined,
      region: typeof who.region === "string" ? who.region : undefined,
      country: typeof who.country === "string" ? who.country : undefined,
      org: (conn.org as string) || (conn.isp as string) || undefined,
      org_asn: conn.asn != null ? String(conn.asn) : undefined,
      timezone: typeof tz.id === "string" ? tz.id : undefined,
      latitude: typeof who.latitude === "number" ? who.latitude : undefined,
      longitude: typeof who.longitude === "number" ? who.longitude : undefined,
      source: "ipwho.is",
    };
  }

  // ipapi.co —— 扁平结构
  const api = await fetchJson(ip ? `https://ipapi.co/${seg}/json/` : "https://ipapi.co/json/");
  if (api && api.ip && !api.error) {
    return {
      ip: String(api.ip),
      city: typeof api.city === "string" ? api.city : undefined,
      region: typeof api.region === "string" ? api.region : undefined,
      country: (api.country_name as string) || (api.country as string) || undefined,
      org: typeof api.org === "string" ? api.org : undefined,
      org_asn: api.asn != null ? String(api.asn) : undefined,
      timezone: typeof api.timezone === "string" ? api.timezone : undefined,
      latitude: typeof api.latitude === "number" ? api.latitude : undefined,
      longitude: typeof api.longitude === "number" ? api.longitude : undefined,
      source: "ipapi.co",
    };
  }

  return null;
}

export async function GET(request: NextRequest) {
  const h = request.headers;
  const ip = clientIp(request);

  // 1) Vercel Edge 自动注入的访客地理头：基于真实访客 IP，生产环境最准
  const vCountry = h.get("x-vercel-ip-country");
  const vCity = dec(h.get("x-vercel-ip-city"));
  const vRegion = dec(h.get("x-vercel-ip-country-region"));
  const vLat = num(h.get("x-vercel-ip-latitude"));
  const vLon = num(h.get("x-vercel-ip-longitude"));
  const vTz = h.get("x-vercel-ip-timezone") || undefined;
  const hasVercelGeo = !!(vCountry || vCity);

  // 2) 外部库补全：org / asn 等 Vercel 头不提供的字段；本地开发时作为主来源
  const ext = await lookupExternal(ip);

  const out: GeoResponse = {
    ip: ip || ext?.ip,
    // 位置字段优先取 Vercel（权威），缺失再退回外部库
    city: vCity || ext?.city,
    region: vRegion || ext?.region,
    country: vCountry || ext?.country,
    timezone: vTz || ext?.timezone,
    latitude: vLat ?? ext?.latitude,
    longitude: vLon ?? ext?.longitude,
    org: ext?.org,
    org_asn: ext?.org_asn,
    source: hasVercelGeo ? "vercel-edge" : ext?.source,
  };

  if (!out.ip && !out.city && !out.country) {
    return NextResponse.json(
      { error: "all_geo_sources_failed" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(out, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
