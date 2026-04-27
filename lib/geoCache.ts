const GEO_CACHE_NAME = "poem-map-geo-v1";
const GEO_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14;

const GEO_MEM_CACHE = new Map<string, any>();
const GEO_INFLIGHT = new Map<string, Promise<any>>();

async function readCachedGeoJson(url: string) {
  if (typeof window === "undefined") return null;
  if (!("caches" in window)) return null;
  try {
    const tsKey = `poem-map-geo-ts:${url}`;
    const tsRaw = window.localStorage.getItem(tsKey);
    const ts = tsRaw ? Number(tsRaw) : 0;
    if (!ts || Date.now() - ts > GEO_CACHE_TTL_MS) return null;
    const cache = await caches.open(GEO_CACHE_NAME);
    const res = await cache.match(url);
    if (!res) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function writeCachedGeoJson(url: string, json: any) {
  if (typeof window === "undefined") return;
  if (!("caches" in window)) return;
  try {
    const cache = await caches.open(GEO_CACHE_NAME);
    await cache.put(
      url,
      new Response(JSON.stringify(json), {
        headers: { "content-type": "application/json" },
      })
    );
    window.localStorage.setItem(`poem-map-geo-ts:${url}`, String(Date.now()));
  } catch {
    // ignore
  }
}

export async function getGeoJson(url: string) {
  if (GEO_MEM_CACHE.has(url)) return GEO_MEM_CACHE.get(url);
  if (GEO_INFLIGHT.has(url)) return GEO_INFLIGHT.get(url);

  const p = (async () => {
    const cached = await readCachedGeoJson(url);
    if (cached) {
      GEO_MEM_CACHE.set(url, cached);
      return cached;
    }

    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    GEO_MEM_CACHE.set(url, json);
    await writeCachedGeoJson(url, json);
    return json;
  })();

  GEO_INFLIGHT.set(url, p);
  try {
    return await p;
  } finally {
    GEO_INFLIGHT.delete(url);
  }
}

