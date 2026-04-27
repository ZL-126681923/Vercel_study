"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import * as echarts from "echarts";
import ReactECharts from "echarts-for-react";

interface PoemLocation {
  name: string;
  city: string;
  province: string;
  coordinates: [number, number];
}

interface Poem {
  id: string;
  title: string;
  content: string[];
  author: string;
  dynasty: string;
  location?: PoemLocation;
}

type Stage = "all" | "primary" | "junior" | "senior";

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

async function getGeoJson(url: string) {
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

export default function PoemMap() {
  const CITY_CLICK_ZOOM = 4;
  const MAX_ZOOM = 9;
  const [allPoems, setAllPoems] = useState<Poem[]>([]);
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null);
  const [cityPopup, setCityPopup] = useState<{ key: string; label: string; x: number; y: number } | null>(null);
  const [provincePopup, setProvincePopup] = useState<{ province: string; x: number; y: number } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [provinceCityLoaded, setProvinceCityLoaded] = useState(false);
  const [currentStage, setCurrentStage] = useState<Stage>("all");
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const zoomRef = useRef(1);
  const provinceAdcodeRef = useRef<Record<string, number>>({});
  const provinceCityProvinceRef = useRef<string | null>(null);
  const roamRafRef = useRef<number | null>(null);
  const roamPendingRef = useRef<{ center: any; zoom: number } | null>(null);
  const mapStateRef = useRef<{ center: [number, number] | null; zoom: number }>({
    center: null,
    zoom: 1,
  });
  const chartRef = useRef<any>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const provincePopupRef = useRef<HTMLDivElement | null>(null);

  const isMaxZoom = (z: number) => z >= MAX_ZOOM - 0.001;
  const getProvinceCitiesOutlineOpacity = (z: number) => {
    if (!selectedProvince || !provinceCityLoaded) return 0;
    if (z <= 1.2) return 0.35;
    if (z >= 3) return 0.75;
    return 0.35 + (z - 1.2) * 0.2222222222;
  };

  const shouldShowCityName = (count: number, zoom: number) => {
    if (isMaxZoom(zoom)) return true;
    if (count >= 15) return zoom >= 3.2;
    if (count >= 8) return zoom >= 4.0;
    if (count >= 4) return zoom >= 5.0;
    if (count >= 2) return zoom >= 6.0;
    return zoom >= 7.0;
  };

  useEffect(() => {
    fetch("/api/poems?dynasty=must&count=200")
      .then((res) => res.json())
      .then((res) => {
        if (res.code === 0 && res.data) {
          setAllPoems(res.data.filter((p: any) => p.location?.coordinates));
        }
      })
      .catch((err) => console.error("Failed to load poems:", err));

    const MAP_URLS = [
      "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json",
      "https://cdn.jsdelivr.net/gh/apache/echarts-website@asf-site/examples/data/asset/geo/china.json",
    ];

    (async () => {
      let nationalGeo: any = null;
      for (const url of MAP_URLS) {
        try {
          nationalGeo = await getGeoJson(url);
          if (!nationalGeo) continue;
          echarts.registerMap("china", nationalGeo as any);
          setMapLoaded(true);
          break;
        } catch {
          // 尝试下一个备用地址
        }
      }

      if (!nationalGeo) setMapLoaded(true);

      if (nationalGeo && Array.isArray(nationalGeo.features)) {
        const byName: Record<string, number> = {};
        for (const f of nationalGeo.features as any[]) {
          const name = String(f?.properties?.name ?? "");
          const adcode = f?.properties?.adcode;
          if (!name || typeof adcode !== "number") continue;
          if (adcode === 100000 || adcode === 710000) continue;
          byName[name] = adcode;
        }
        provinceAdcodeRef.current = byName;
      }
    })();

    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.getEchartsInstance().resize();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const province = selectedProvince;
    if (!province) {
      provinceCityProvinceRef.current = null;
      setProvinceCityLoaded(false);
      return;
    }

    const adcode = provinceAdcodeRef.current[province];
    if (!adcode) {
      provinceCityProvinceRef.current = province;
      setProvinceCityLoaded(false);
      return;
    }

    provinceCityProvinceRef.current = province;
    setProvinceCityLoaded(false);

    (async () => {
      try {
        const json = await getGeoJson(`https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`);
        if (!json) return;
        const features: any[] = Array.isArray(json?.features) ? json.features : [];
        const cityFeatures = features.filter((f) => f && f.geometry && f?.properties?.level === "city");
        if (provinceCityProvinceRef.current !== province) return;
        if (cityFeatures.length === 0) return;
        echarts.registerMap("province-cities", {
          type: "FeatureCollection",
          features: cityFeatures,
        } as any);
        setProvinceCityLoaded(true);
      } catch {
        // ignore
      }
    })();
  }, [selectedProvince]);

  useEffect(() => {
    if (!cityPopup && !provincePopup) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popupRef.current && popupRef.current.contains(target)) return;
      if (provincePopupRef.current && provincePopupRef.current.contains(target)) return;
      setCityPopup(null);
      setProvincePopup(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCityPopup(null);
        setProvincePopup(null);
      }
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [cityPopup, provincePopup]);

  const filteredPoems = useMemo(() => {
    if (currentStage === "all") return allPoems;
    const prefix = { primary: "xiao", junior: "chu", senior: "gao" }[currentStage];
    return allPoems.filter((p) => p.id.startsWith(prefix));
  }, [allPoems, currentStage]);

  const clusterData = useMemo(() => {
    const groups = new Map<
      string,
      {
        label: string;
        count: number;
        sumLon: number;
        sumLat: number;
      }
    >();

    const hash = (s: string) => {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
      return Math.abs(h);
    };

    for (const p of filteredPoems) {
      const loc = p.location!;
      const province = loc.province?.trim() || "未知";
      const city = (loc.city || loc.name || province).trim();
      const key = `${province}|${city}`;
      const g = groups.get(key);
      if (g) {
        g.count += 1;
        g.sumLon += loc.coordinates[0];
        g.sumLat += loc.coordinates[1];
      } else {
        groups.set(key, {
          label: city,
          count: 1,
          sumLon: loc.coordinates[0],
          sumLat: loc.coordinates[1],
        });
      }
    }

    return Array.from(groups.entries()).map(([key, g]) => ({
      name: g.label,
      value: [g.sumLon / g.count, g.sumLat / g.count, g.count, key],
      itemStyle: {
        color: `hsla(${hash(key) % 360}, 85%, 62%, 0.92)`,
        borderColor: `hsla(${(hash(key) + 28) % 360}, 95%, 72%, 0.9)`,
        borderWidth: 1,
        shadowBlur: 18,
        shadowColor: `hsla(${hash(key) % 360}, 90%, 60%, 0.35)`,
      },
    }));
  }, [filteredPoems]);

  const cityPoems = useMemo(() => {
    if (!cityPopup) return [];
    const [province, city] = cityPopup.key.split("|");
    return filteredPoems.filter((p) => {
      const loc = p.location;
      if (!loc) return false;
      const p0 = (loc.province?.trim() || "未知") === province;
      const c0 = ((loc.city || loc.name || loc.province || "未知").trim() || "未知") === city;
      return p0 && c0;
    });
  }, [filteredPoems, cityPopup]);

  const provinceCities = useMemo(() => {
    if (!selectedProvince) return [];
    return clusterData
      .filter((d: any) => String(d?.value?.[3] ?? "").startsWith(`${selectedProvince}|`))
      .map((d: any) => ({
        key: String(d?.value?.[3] ?? ""),
        city: String(d?.name ?? ""),
        count: Number(d?.value?.[2] ?? 0),
        lon: Number(d?.value?.[0] ?? 0),
        lat: Number(d?.value?.[1] ?? 0),
      }))
      .sort((a, b) => b.count - a.count);
  }, [clusterData, selectedProvince]);

  const option = useMemo(() => ({
    backgroundColor: "transparent",
    animation: false,
    tooltip: {
      trigger: "item",
      formatter: (params: any) => {
        if (params.seriesId === "clusters") {
          const count = params.value?.[2] ?? 0;
          return `<div style="font-size:12px;font-weight:600">${params.name}</div>` +
            `<div style="font-size:11px;color:#a8a29e;margin-top:2px">${count} 首</div>` +
            `<div style="font-size:10px;color:#78716c;margin-top:4px">点击查看列表</div>`;
        }
        if (params.componentType === "series") {
          const parts = (params.name as string).split("·");
          const title = parts[1] || parts[0];
          const author = parts[0];
          return `<div style="font-family:serif;font-size:13px;font-weight:600">${title}</div>` +
            `<div style="color:#a8a29e;font-size:11px;margin-top:2px">${author}</div>` +
            `<div style="font-size:10px;color:#78716c;margin-top:4px">点击查看全文</div>`;
        }
        if (params.name) {
          return `<div style="font-size:12px;font-weight:600">${params.name}</div>` +
            `<div style="font-size:10px;color:#78716c;margin-top:2px">点击放大 · 再次点击还原</div>`;
        }
        return "";
      },
      backgroundColor: "rgba(28, 25, 23, 0.92)",
      borderColor: "rgba(120, 113, 108, 0.25)",
      textStyle: { color: "#e7e5e4" },
      padding: [8, 12],
    },
    geo: ([
      {
        map: "china",
        roam: true,
        center: mapStateRef.current.center || undefined,
        zoom: mapStateRef.current.zoom,
        scaleLimit: { min: 1, max: MAX_ZOOM },
        label: {
          show: true,
          color: "rgba(120, 113, 108, 0.85)",
          fontSize: 10,
          fontFamily: "serif",
        },
        emphasis: {
          label: { show: true, color: "#f59e0b", fontSize: 11 },
          itemStyle: { areaColor: "rgba(245, 158, 11, 0.1)" },
        },
        itemStyle: {
          areaColor: "rgba(41, 37, 36, 0.5)",
          borderColor: "rgba(120, 113, 108, 0.7)",
          borderWidth: 1.5,
        },
        regions: selectedProvince
          ? [{
              name: selectedProvince,
              itemStyle: {
                areaColor: "rgba(245, 158, 11, 0.25)",
                borderColor: "rgba(245, 158, 11, 0.9)",
                borderWidth: 2,
              },
              label: {
                show: true,
                color: "#f59e0b",
                fontSize: 12,
                fontWeight: "bold" as const,
                fontFamily: "serif",
              },
            }]
          : [],
      },
      provinceCityLoaded
        ? {
            map: "province-cities",
            roam: false,
            silent: true,
            center: mapStateRef.current.center || undefined,
            zoom: mapStateRef.current.zoom,
            itemStyle: {
              areaColor: "transparent",
              borderColor: `rgba(168, 162, 158, ${getProvinceCitiesOutlineOpacity(zoomRef.current)})`,
              borderWidth: 0.9,
            },
            zlevel: 0,
            z: 2,
          }
        : null,
    ].filter(Boolean) as any[]),
    series: [
      {
        id: "clusters",
        name: "聚合",
        type: "effectScatter",
        coordinateSystem: "geo",
        geoIndex: 0,
        data: clusterData,
        symbolSize: (val: any) => {
          const count = Number(val?.[2] ?? 1);
          const s = 12 + Math.sqrt(Math.max(0, count - 1)) * 4;
          return Math.min(34, Math.max(12, s));
        },
        showEffectOn: "render",
        rippleEffect: { brushType: "stroke", scale: 2.4 },
        label: {
          show: true,
          formatter: (params: any) => {
            const count = Number(params?.value?.[2] ?? 0);
            return shouldShowCityName(count, zoomRef.current) ? `${params.name}\n${count}` : String(count);
          },
          color: "#e7e5e4",
          fontSize: 11,
          fontFamily: "serif",
          textBorderColor: "rgba(15,12,10,0.95)",
          textBorderWidth: 2,
        },
        labelLayout: (p: any) => {
          const count = Number(p?.data?.value?.[2] ?? p?.value?.[2] ?? 0);
          const showName = shouldShowCityName(count, zoomRef.current);
          return { hideOverlap: !showName, moveOverlap: "shiftY" };
        },
        emphasis: {
          scale: true,
        },
        zlevel: 0,
        z: 9,
      },
    ],
  }), [clusterData, currentStage, filteredPoems, selectedProvince, provinceCityLoaded]);

  const onEvents = {
    click: (params: any) => {
      if (params.seriesId === "clusters") {
        if (!chartRef.current) return;
        const instance = chartRef.current.getEchartsInstance();
        if (!instance) return;
        const key = params.value?.[3] as string | undefined;
        const e = params?.event?.event ?? params?.event;
        const rawX = typeof e?.offsetX === "number" ? e.offsetX : typeof e?.zrX === "number" ? e.zrX : null;
        const rawY = typeof e?.offsetY === "number" ? e.offsetY : typeof e?.zrY === "number" ? e.zrY : null;
        const w = typeof instance.getWidth === "function" ? instance.getWidth() : 0;
        const h = typeof instance.getHeight === "function" ? instance.getHeight() : 0;
        const x = rawX == null ? w / 2 : Math.min(Math.max(rawX, 76), Math.max(76, w - 76));
        const y = rawY == null ? h / 2 : Math.min(Math.max(rawY, 120), Math.max(120, h - 24));
        if (key) setCityPopup({ key, label: params.name as string, x, y });
        setSelectedPoem(null);
        return;
      }
      if (params.componentType === "geo") {
        const province = params.name as string;
        if (!province) { setSelectedProvince(null); setProvincePopup(null); return; }
        const e = params?.event?.event ?? params?.event;
        const rawX = typeof e?.offsetX === "number" ? e.offsetX : typeof e?.zrX === "number" ? e.zrX : null;
        const rawY = typeof e?.offsetY === "number" ? e.offsetY : typeof e?.zrY === "number" ? e.zrY : null;
        if (rawX != null && rawY != null && isMaxZoom(zoomRef.current)) {
          setProvincePopup({ province, x: rawX, y: rawY });
        } else {
          setProvincePopup(null);
        }
        setSelectedProvince((prev) => (prev === province ? null : province));
      }
    },
    georoam: (params: any) => {
        if (!chartRef.current) return;
        const instance = chartRef.current.getEchartsInstance();
        if (!instance) return;
        if (cityPopup) setCityPopup(null);
        
        const option = instance.getOption();
        const geo = option.geo[0];
        const zoom =
          typeof params?.totalZoom === "number"
            ? params.totalZoom
            : typeof params?.zoom === "number"
            ? params.zoom
            : geo.zoom;
        
        mapStateRef.current = {
          center: geo.center,
          zoom,
        };

        zoomRef.current = zoom;

        roamPendingRef.current = { center: geo.center, zoom };
        if (roamRafRef.current != null) return;
        roamRafRef.current = window.requestAnimationFrame(() => {
          roamRafRef.current = null;
          const pending = roamPendingRef.current;
          if (!pending) return;
          const z0 = pending.zoom;
          const outlineOpacity = getProvinceCitiesOutlineOpacity(z0);

          instance.setOption(
            {
              geo: provinceCityLoaded
                ? [
                    {},
                    {
                      center: pending.center,
                      zoom: z0,
                      itemStyle: {
                        borderColor: `rgba(168, 162, 158, ${outlineOpacity})`,
                        borderWidth: 0.9,
                      },
                    },
                  ]
                : undefined,
              series: [
                {
                  id: "clusters",
                  label: {
                    formatter: (params: any) => {
                      const count = Number(params?.value?.[2] ?? 0);
                      return shouldShowCityName(count, zoomRef.current) ? `${params.name}\n${count}` : String(count);
                    },
                  },
                  labelLayout: (p: any) => {
                    const count = Number(p?.data?.value?.[2] ?? p?.value?.[2] ?? 0);
                    const showName = shouldShowCityName(count, zoomRef.current);
                    return { hideOverlap: !showName, moveOverlap: "shiftY" };
                  },
                },
              ],
            },
            { lazyUpdate: true }
          );
        });

        if (!selectedProvince || !isMaxZoom(zoomRef.current)) {
          if (provincePopup) setProvincePopup(null);
          return;
        }

        const items = clusterData.filter((d: any) =>
          String(d?.value?.[3] ?? "").startsWith(`${selectedProvince}|`)
        );
        if (items.length === 0) {
          if (provincePopup) setProvincePopup(null);
          return;
        }

        let sumLon = 0;
        let sumLat = 0;
        let sumW = 0;
        for (const it of items as any[]) {
          const lon = Number(it?.value?.[0] ?? 0);
          const lat = Number(it?.value?.[1] ?? 0);
          const w0 = Math.max(1, Number(it?.value?.[2] ?? 1));
          sumLon += lon * w0;
          sumLat += lat * w0;
          sumW += w0;
        }
        const centerLon = sumLon / sumW;
        const centerLat = sumLat / sumW;
        const pixel = instance.convertToPixel({ geoIndex: 0 }, [centerLon, centerLat]) as any;
        if (!Array.isArray(pixel) || pixel.length < 2) return;

        const w = typeof instance.getWidth === "function" ? instance.getWidth() : 0;
        const h = typeof instance.getHeight === "function" ? instance.getHeight() : 0;
        const x = Math.min(Math.max(pixel[0], 86), Math.max(86, w - 86));
        const y = Math.min(Math.max(pixel[1], 120), Math.max(120, h - 24));
        setProvincePopup((prev) => {
          if (prev && prev.province === selectedProvince && Math.abs(prev.x - x) < 1 && Math.abs(prev.y - y) < 1) return prev;
          return { province: selectedProvince, x, y };
        });
      },
  };

  if (!mapLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center text-stone-500">
        正在加载大美山河...
      </div>
    );
  }

  const stages: { key: Stage; label: string; color: string }[] = [
    { key: "all", label: "全部", color: "bg-stone-500" },
    { key: "primary", label: "小学", color: "bg-amber-400" },
    { key: "junior", label: "初中", color: "bg-blue-400" },
    { key: "senior", label: "高中", color: "bg-red-400" },
  ];

  return (
    <div className="relative w-full h-full">
      {/* 筛选器 */}
      <div className="absolute top-4 left-4 z-10 flex gap-2 p-1 bg-stone-900/80 rounded-full border border-stone-800 shadow-xl backdrop-blur-sm">
        {stages.map((stage) => (
          <button
            key={stage.key}
            onClick={() => { setCurrentStage(stage.key); setSelectedProvince(null); }}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              currentStage === stage.key
                ? `${stage.color} text-stone-950 shadow-inner`
                : "text-stone-400 hover:text-stone-200 hover:bg-stone-800"
            }`}
          >
            {stage.label}
          </button>
        ))}
      </div>

      <ReactECharts
        ref={chartRef}
        key={String(mapLoaded)}
        echarts={echarts}
        option={option}
        notMerge={true}
        lazyUpdate={true}
        style={{ height: "100%", width: "100%", minHeight: "500px" }}
        onEvents={onEvents}
        opts={{ renderer: "svg" }}
      />

      {/* 无数据提示 */}
      {mapLoaded && filteredPoems.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-950/50 backdrop-blur-sm z-20">
          <div className="text-center p-8 bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl">
            <p className="text-stone-400">暂无该阶段的诗词位置信息</p>
            <button
              onClick={() => setCurrentStage("all")}
              className="mt-4 px-6 py-2 bg-amber-500 text-stone-950 rounded-full text-sm font-bold"
            >
              查看全部
            </button>
          </div>
        </div>
      )}

      {/* 诗词详情浮层 */}
      {selectedPoem && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-80 bg-stone-900/95 border-l border-stone-800 p-6 overflow-y-auto animate-in slide-in-from-right duration-300 shadow-2xl z-10 backdrop-blur-md">
          <button
            onClick={() => setSelectedPoem(null)}
            className="absolute top-4 right-4 text-stone-500 hover:text-stone-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="mt-8 space-y-6">
            <div className="text-center">
              <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider mb-2 ${
                selectedPoem.id.startsWith("xiao") ? "bg-amber-500/20 text-amber-500" :
                selectedPoem.id.startsWith("chu") ? "bg-blue-500/20 text-blue-500" :
                "bg-red-500/20 text-red-500"
              }`}>
                {selectedPoem.id.startsWith("xiao") ? "小学必背" :
                 selectedPoem.id.startsWith("chu") ? "初中必背" : "高中必背"}
              </div>
              <h2 className="text-2xl font-serif text-stone-100">{selectedPoem.title}</h2>
              <p className="text-stone-400 mt-2 font-serif">
                [{selectedPoem.dynasty}] {selectedPoem.author}
              </p>
            </div>

            <div className="py-6 border-y border-stone-800/50 flex flex-col items-center gap-3">
              {selectedPoem.content.map((line, i) => (
                <p key={i} className="text-lg text-stone-300 font-serif tracking-widest leading-relaxed text-center">
                  {line}
                </p>
              ))}
            </div>

            <div className="flex items-start gap-2 text-stone-400">
              <svg className="w-4 h-4 mt-1 shrink-0 text-amber-500/80" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <div className="text-sm">
                <div className="font-medium text-stone-200">创作地：{selectedPoem.location?.name}</div>
                <div className="text-xs mt-0.5">{selectedPoem.location?.province} · {selectedPoem.location?.city}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {cityPopup && (
        <div
          ref={popupRef}
          className="absolute z-20 w-[260px] max-w-[86vw] animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: cityPopup.x,
            top: cityPopup.y,
            transform: "translate(-50%, calc(-100% - 14px))",
          }}
        >
          <div className="p-[1px] rounded-2xl bg-gradient-to-br from-amber-400/45 via-sky-400/25 to-fuchsia-500/35 shadow-[0_18px_60px_-24px_rgba(251,191,36,0.45)]">
            <div className="rounded-2xl bg-stone-950/80 backdrop-blur-xl border border-stone-800/70 overflow-hidden">
              <div className="relative px-3.5 pt-3.5 pb-2.5">
                <div className="absolute inset-0 bg-[radial-gradient(600px_200px_at_20%_0%,rgba(251,191,36,0.20),transparent_55%),radial-gradient(520px_180px_at_90%_20%,rgba(56,189,248,0.16),transparent_60%)]" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] tracking-widest text-stone-500 font-medium">CITY SELECT</div>
                    <div className="mt-1 font-serif text-stone-100 text-base truncate">{cityPopup.label}</div>
                    <div className="mt-1 text-[11px] text-stone-400">{cityPoems.length} 首 · 点击选择</div>
                  </div>
                  <button
                    onClick={() => setCityPopup(null)}
                    className="shrink-0 w-7 h-7 rounded-full border border-stone-800/70 bg-stone-900/40 hover:bg-stone-800/60 text-stone-400 hover:text-stone-200 transition-colors flex items-center justify-center"
                    aria-label="关闭"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="px-3 pb-3">
                <div className="max-h-[240px] overflow-auto pr-1 space-y-2">
                  {cityPoems.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setCityPopup(null); setSelectedPoem(p); }}
                      className="w-full text-left group rounded-xl border border-stone-800/70 bg-stone-950/35 hover:bg-stone-900/55 transition-colors px-3.5 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-serif text-stone-100 text-sm truncate group-hover:text-amber-200 transition-colors">
                            {p.title}
                          </div>
                          <div className="text-xs text-stone-500 mt-1 font-serif truncate">
                            [{p.dynasty}] {p.author}
                          </div>
                        </div>
                        <div className={`text-[10px] font-bold shrink-0 px-2 py-0.5 rounded border ${
                          p.id.startsWith("xiao") ? "bg-amber-500/15 text-amber-400 border-amber-500/25" :
                          p.id.startsWith("chu") ? "bg-sky-500/15 text-sky-400 border-sky-500/25" :
                          "bg-rose-500/15 text-rose-400 border-rose-500/25"
                        }`}>
                          {p.id.startsWith("xiao") ? "小学" : p.id.startsWith("chu") ? "初中" : "高中"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-3 h-3 rotate-45 bg-stone-950/80 border-r border-b border-stone-800/70" />
        </div>
      )}

      {provincePopup && isMaxZoom(zoomRef.current) && (
        <div
          ref={provincePopupRef}
          className="absolute z-20 w-[240px] max-w-[86vw] animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: provincePopup.x,
            top: provincePopup.y,
            transform: "translate(-50%, calc(-100% - 14px))",
          }}
        >
          <div className="p-[1px] rounded-2xl bg-gradient-to-br from-emerald-400/40 via-sky-400/20 to-violet-500/30 shadow-[0_18px_60px_-24px_rgba(52,211,153,0.40)]">
            <div className="rounded-2xl bg-stone-950/80 backdrop-blur-xl border border-stone-800/70 overflow-hidden">
              <div className="relative px-3.5 pt-3.5 pb-2.5">
                <div className="absolute inset-0 bg-[radial-gradient(600px_200px_at_20%_0%,rgba(52,211,153,0.18),transparent_55%),radial-gradient(520px_180px_at_90%_20%,rgba(56,189,248,0.14),transparent_60%)]" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] tracking-widest text-stone-500 font-medium">PROVINCE CITIES</div>
                    <div className="mt-1 font-serif text-stone-100 text-base truncate">{provincePopup.province}</div>
                    <div className="mt-1 text-[11px] text-stone-400">{provinceCities.length} 市 · 点击可查看诗</div>
                  </div>
                  <button
                    onClick={() => setProvincePopup(null)}
                    className="shrink-0 w-7 h-7 rounded-full border border-stone-800/70 bg-stone-900/40 hover:bg-stone-800/60 text-stone-400 hover:text-stone-200 transition-colors flex items-center justify-center"
                    aria-label="关闭"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="px-3 pb-3">
                <div className="max-h-[220px] overflow-auto pr-1 space-y-2">
                  {provinceCities.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => {
                        if (!chartRef.current) return;
                        const instance = chartRef.current.getEchartsInstance();
                        if (!instance) return;
                        const pixel = instance.convertToPixel({ geoIndex: 0 }, [c.lon, c.lat]) as any;
                        const w = typeof instance.getWidth === "function" ? instance.getWidth() : 0;
                        const h = typeof instance.getHeight === "function" ? instance.getHeight() : 0;
                        const x = Array.isArray(pixel) ? Math.min(Math.max(pixel[0], 76), Math.max(76, w - 76)) : provincePopup.x;
                        const y = Array.isArray(pixel) ? Math.min(Math.max(pixel[1], 120), Math.max(120, h - 24)) : provincePopup.y;
                        setProvincePopup(null);
                        setCityPopup({ key: c.key, label: c.city, x, y });
                        setSelectedPoem(null);
                      }}
                      className="w-full text-left group rounded-xl border border-stone-800/70 bg-stone-950/35 hover:bg-stone-900/55 transition-colors px-3.5 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-serif text-stone-100 text-sm truncate group-hover:text-emerald-200 transition-colors">
                            {c.city}
                          </div>
                        </div>
                        <div className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-300 border-emerald-500/25">
                          {c.count} 首
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-3 h-3 rotate-45 bg-stone-950/80 border-r border-b border-stone-800/70" />
        </div>
      )}

      {/* 图例 */}
      <div className="absolute bottom-4 left-4 p-3 bg-stone-900/80 rounded-lg border border-stone-800 text-[10px] text-stone-500 pointer-events-none backdrop-blur-sm">
        <div className="flex gap-4 mb-1">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> 小学</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> 初中</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> 高中</span>
        </div>
        点击省份放大 · 再次点击还原 · 点击闪点查看列表
      </div>
    </div>
  );
}
