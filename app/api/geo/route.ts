import { NextResponse } from "next/server";

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
  error?: string;
}

async function fetchFrom(url: string, timeoutMs = 4000): Promise<GeoResponse | null> {
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
    return (await r.json()) as GeoResponse;
  } catch {
    clearTimeout(t);
    return null;
  }
}

export async function GET() {
  // 依次尝试 3 个免费接口（任一成功即返回）
  const sources: Array<{ url: string; map: (j: GeoResponse) => GeoResponse }> = [
    {
      url: "https://ipwho.is/",
      map: (j) => ({
        ip: j.ip,
        city: j.city,
        region: j.region,
        country: j.country,
        org: j.org || j.org_asn,
        timezone: j.timezone,
        latitude: typeof j.latitude === "number" ? j.latitude : undefined,
        longitude: typeof j.longitude === "number" ? j.longitude : undefined,
      }),
    },
    {
      url: "https://ipapi.co/json/",
      map: (j) => ({
        ip: j.ip,
        city: j.city,
        region: j.region,
        country: j.country,
        org: j.org,
        timezone: j.timezone,
        latitude: typeof j.latitude === "number" ? j.latitude : undefined,
        longitude: typeof j.longitude === "number" ? j.longitude : undefined,
      }),
    },
    {
      url: "https://api.ipify.org?format=json",
      map: (j) => ({ ip: j.ip }),
    },
  ];

  for (const s of sources) {
    const j = await fetchFrom(s.url);
    if (j && j.ip) {
      const out = s.map(j);
      return NextResponse.json(out, {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }
  }

  return NextResponse.json(
    { error: "all_geo_sources_failed" },
    { status: 502, headers: { "Cache-Control": "no-store" } }
  );
}
