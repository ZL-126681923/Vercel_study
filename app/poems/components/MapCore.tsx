"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MapGL, { Layer, NavigationControl, Popup, Source } from "react-map-gl/maplibre";
import type { Map as MapLibreMap } from "maplibre-gl";
import { getGeoJson } from "@/lib/geoCache";
import { useTheme } from "@/components/ThemeProvider";
import PoemPopup from "./PoemPopup";

export type MaoPoemItem = {
  id: string;
  title: string;
  type: string;
  content: string[];
  poet: string;
  dynasty: string;
  creationTime: string;
  background: string;
  likedCount: number;
  location: {
    name: string;
    city: string;
    province: string;
    coordinates: [number, number];
  };
};

const MOBILE = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const CHINA_URL = "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json";
const MAP_STYLE = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {},
  layers: [{ id: "bg", type: "background", paint: { "background-color": "#09090b" } }],
} as const;

const getYear = (text: string) => Number((text.match(/(\d{4})年/) || [])[1] || 0);
const getMonth = (text: string) => Number((text.match(/(\d{1,2})月/) || [])[1] || 0);
const getWeight = (text: string) => getYear(text) * 100 + (getMonth(text) || 35);
const getEra = (year: number) => (year < 1935 ? "星火初燃" : year < 1949 ? "长征北上" : year < 1958 ? "山河新生" : "岁月回望");
const getTimeLabel = (text: string) => {
  const year = getYear(text);
  const month = getMonth(text);
  return month ? `${year}.${String(month).padStart(2, "0")}` : `${year}`;
};

function buildFlowGradient(isLight: boolean, phase: number) {
  return ["literal", [isLight, phase]] as any;
}

function getBounds(points: [number, number][]) {
  if (!points.length) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of points) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }
  return [[minLng - 6, minLat - 5], [maxLng + 6, maxLat + 5]] as const;
}

export default function MapCore({ poemList = [] }: { poemList?: MaoPoemItem[] }) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const mapRef = useRef<MapLibreMap | null>(null);
  const fittedRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [chinaGeo, setChinaGeo] = useState<any>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [travelT, setTravelT] = useState(0);
  const [flowPhase, setFlowPhase] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [selectedPoem, setSelectedPoem] = useState<MaoPoemItem | null>(null);

  const poems = useMemo(() => [...poemList].sort((a, b) => getWeight(a.creationTime) - getWeight(b.creationTime)), [poemList]);
  const currentPoem = poems[activeIndex] ?? null;
  const points = useMemo(() => poems.map((p) => p.location.coordinates), [poems]);
  const currentYear = currentPoem ? getYear(currentPoem.creationTime) : 0;
  const progress = poems.length > 1 ? activeIndex / (poems.length - 1) : 0;

  const routeGeo = useMemo(
    () => ({
      type: "FeatureCollection",
      features:
        activeIndex > 0
          ? [
              {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: poems.slice(0, activeIndex + 1).map((p) => p.location.coordinates),
                },
                properties: {},
              },
            ]
          : [],
    }),
    [poems, activeIndex]
  );
  const nodeGeo = useMemo(
    () => ({
      type: "FeatureCollection",
      features: poems.map((p, i) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: p.location.coordinates },
        properties: { active: i === activeIndex ? 1 : 0, past: i <= activeIndex ? 1 : 0 },
      })),
    }),
    [poems, activeIndex]
  );
  const pulseGeo = useMemo(
    () => ({
      type: "FeatureCollection",
      features: currentPoem
        ? [{ type: "Feature", geometry: { type: "Point", coordinates: currentPoem.location.coordinates }, properties: {} }]
        : [],
    }),
    [currentPoem]
  );
  const trailHeadGeo = useMemo(() => {
    if (activeIndex <= 0 || poems.length === 0) {
      return { type: "FeatureCollection", features: [] };
    }

    const from = poems[Math.max(activeIndex - 1, 0)]?.location.coordinates;
    const to = poems[activeIndex]?.location.coordinates;
    if (!from || !to) {
      return { type: "FeatureCollection", features: [] };
    }

    const lng = from[0] + (to[0] - from[0]) * travelT;
    const lat = from[1] + (to[1] - from[1]) * travelT;

    return {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: {} }],
    };
  }, [poems, activeIndex, travelT]);
  const milestones = useMemo(() => {
    const bucket = new Map<number, { year: number; index: number; poem: MaoPoemItem; count: number }>();
    poems.forEach((poem, index) => {
      const year = getYear(poem.creationTime);
      const hit = bucket.get(year);
      if (hit) hit.count += 1;
      else bucket.set(year, { year, index, poem, count: 1 });
    });
    return Array.from(bucket.values()).sort((a, b) => a.year - b.year);
  }, [poems]);
  const timelineItems = useMemo(
    () =>
      poems.map((poem, index) => ({
        id: poem.id,
        title: poem.title,
        time: getTimeLabel(poem.creationTime),
        active: index === activeIndex,
        passed: index < activeIndex,
      })),
    [poems, activeIndex]
  );

  useEffect(() => {
    let cancelled = false;
    getGeoJson(CHINA_URL).then((geo) => {
      if (!cancelled) setChinaGeo(geo);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !chinaGeo || fittedRef.current || !points.length) return;
    const bounds = getBounds(points);
    if (!bounds) return;
    map.fitBounds(bounds as any, { padding: MOBILE ? 64 : 138, duration: 1700, maxZoom: MOBILE ? 3.7 : 4.15, essential: true });
    fittedRef.current = true;
  }, [mapReady, chinaGeo, points]);

  useEffect(() => {
    if (!playing || poems.length <= 1) return;
    setTravelT(0);
    const frame = window.setInterval(() => {
      setTravelT((prev) => {
        const next = prev + 0.008;
        if (next >= 1) {
          setActiveIndex((index) => (index >= poems.length - 1 ? 0 : index + 1));
          return 0;
        }
        return next;
      });
    }, 110);
    return () => window.clearInterval(frame);
  }, [playing, poems.length]);

  useEffect(() => {
    if (activeIndex <= 0) {
      setFlowPhase(0);
      return;
    }
    setFlowPhase(((activeIndex - 1) + travelT) / Math.max(activeIndex, 1));
  }, [activeIndex, travelT]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !currentPoem) return;
    map.easeTo({
      center: currentPoem.location.coordinates,
      duration: 1400,
      zoom: Math.max(map.getZoom(), MOBILE ? 4.05 : 4.55),
      offset: [0, 18],
      essential: true,
    });
  }, [activeIndex, currentPoem, mapReady]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#09090b]">
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_18%,rgba(245,158,11,0.16),transparent_22%),radial-gradient(circle_at_82%_14%,rgba(59,130,246,0.12),transparent_18%),radial-gradient(circle_at_50%_88%,rgba(168,85,247,0.14),transparent_24%)]" />
      <div className="absolute inset-x-4 top-4 bottom-4 z-[2] overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.012))] shadow-[0_34px_110px_-44px_rgba(0,0,0,0.92)] md:inset-x-12 md:top-8 md:bottom-8 md:rounded-[36px]">

      <MapGL
        mapStyle={MAP_STYLE as any}
        initialViewState={{ longitude: 108.9, latitude: 34.3, zoom: MOBILE ? 3.1 : 3.8 }}
        maxZoom={8}
        minZoom={2.6}
        scrollZoom
        dragRotate={false}
        touchZoomRotate
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
        onLoad={(e) => {
          mapRef.current = e.target as unknown as MapLibreMap;
          setMapReady(true);
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {chinaGeo && (
          <Source id="china" type="geojson" data={chinaGeo}>
            <Layer id="china-fill" type="fill" paint={{ "fill-color": isLight ? "rgba(255,255,255,0.28)" : "rgba(24,24,27,0.72)", "fill-outline-color": isLight ? "rgba(71,85,105,0.18)" : "rgba(245,245,244,0.06)" }} />
            <Layer id="china-line" type="line" paint={{ "line-color": isLight ? "rgba(51,65,85,0.35)" : "rgba(231,229,228,0.18)", "line-width": 1.1 }} />
          </Source>
        )}

        <Source id="route-glow" type="geojson" data={routeGeo as any}>
          <Layer id="route-glow-layer" type="line" paint={{ "line-color": isLight ? "rgba(251,146,60,0.18)" : "rgba(251,191,36,0.24)", "line-width": ["interpolate", ["linear"], ["zoom"], 3, 8, 6, 14], "line-opacity": 1, "line-blur": 1.7 }} />
          <Layer id="route-layer" type="line" paint={{ "line-color": isLight ? "rgba(180,83,9,0.55)" : "rgba(245,158,11,0.34)", "line-width": ["interpolate", ["linear"], ["zoom"], 3, 2.2, 6, 4.9], "line-opacity": 0.88 }} />
        </Source>
        <Source id="nodes" type="geojson" data={nodeGeo as any}>
          <Layer id="node-halo" type="circle" paint={{ "circle-radius": ["case", ["==", ["get", "active"], 1], 16, ["==", ["get", "past"], 1], 9, 6], "circle-color": isLight ? "rgba(245,158,11,0.18)" : "rgba(251,191,36,0.20)", "circle-opacity": ["case", ["==", ["get", "past"], 1], 1, 0.55], "circle-blur": 1.2 }} />
          <Layer id="node-core" type="circle" paint={{ "circle-radius": ["case", ["==", ["get", "active"], 1], 6.2, ["==", ["get", "past"], 1], 4.2, 3.2], "circle-color": ["case", ["==", ["get", "active"], 1], isLight ? "#92400e" : "#fde68a", ["==", ["get", "past"], 1], isLight ? "#d97706" : "#f59e0b", isLight ? "rgba(120,113,108,0.65)" : "rgba(168,162,158,0.72)"], "circle-stroke-color": isLight ? "rgba(255,255,255,0.85)" : "rgba(9,9,11,0.9)", "circle-stroke-width": 1.2 }} />
        </Source>
        <Source id="pulse" type="geojson" data={pulseGeo as any}>
          <Layer id="pulse-layer" type="circle" paint={{ "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 18, 6, 30], "circle-color": isLight ? "rgba(245,158,11,0.10)" : "rgba(251,191,36,0.14)", "circle-stroke-color": isLight ? "rgba(251,146,60,0.45)" : "rgba(253,224,71,0.55)", "circle-stroke-width": 1.4 }} />
        </Source>
        <Source id="trail-head" type="geojson" data={trailHeadGeo as any}>
          <Layer id="trail-head-layer" type="circle" paint={{ "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 5, 6, 8], "circle-color": isLight ? "#fb923c" : "#fde68a", "circle-stroke-color": isLight ? "rgba(255,255,255,0.9)" : "rgba(9,9,11,0.95)", "circle-stroke-width": 1.2, "circle-blur": 0.1 }} />
          <Layer id="trail-head-glow" type="circle" paint={{ "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 10, 6, 16], "circle-color": isLight ? "rgba(251,146,60,0.18)" : "rgba(253,224,71,0.24)", "circle-blur": 1.2 }} />
        </Source>

        {selectedPoem && (
          <Popup longitude={selectedPoem.location.coordinates[0]} latitude={selectedPoem.location.coordinates[1]} anchor="top" closeButton={false} closeOnClick={false} offset={16} maxWidth="380px">
            <div className="rounded-2xl bg-gradient-to-br from-amber-400/35 via-orange-400/18 to-sky-400/18 p-[1px]">
              <div className={`overflow-hidden rounded-2xl border backdrop-blur-xl ${isLight ? "border-stone-300/80 bg-white/92" : "border-stone-800/70 bg-stone-950/88"}`}>
                <div className="flex items-start justify-between gap-3">
                  <PoemPopup poem={selectedPoem} />
                  <button onClick={() => setSelectedPoem(null)} className={`m-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${isLight ? "border-stone-300/80 bg-stone-100/70 text-stone-600" : "border-stone-800/70 bg-stone-900/40 text-stone-300"}`} aria-label="关闭">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </MapGL>
      </div>

      <div className="absolute bottom-6 left-6 z-10 w-[min(348px,calc(100vw-3rem))] overflow-hidden rounded-[24px] border border-white/10 bg-stone-950/58 px-4 py-4 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.76)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] tracking-[0.28em] text-amber-300/75">TIME TRACE</div>
            <div className="mt-2 font-serif text-sm text-stone-100">毛主席诗歌时间轨道</div>
            <div className="mt-1 text-xs text-stone-400">{currentPoem ? `${currentPoem.creationTime} · ${currentPoem.title}` : "等待加载"}</div>
          </div>
          <button
            onClick={() => setPlaying((v) => !v)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-stone-300 transition hover:bg-white/10"
          >
            {playing ? "暂停" : "播放"}
          </button>
        </div>

        <div className="relative mt-4">
          <div className="absolute left-[7px] top-0 bottom-0 w-px bg-gradient-to-b from-amber-400/10 via-white/18 to-transparent" />
          <div className="space-y-3">
            {timelineItems.slice(Math.max(0, activeIndex - 1), Math.min(timelineItems.length, activeIndex + 3)).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  const nextIndex = poems.findIndex((poem) => poem.id === item.id);
                  if (nextIndex >= 0) {
                    setPlaying(false);
                    setActiveIndex(nextIndex);
                    setTravelT(0);
                  }
                }}
                className="group flex w-full items-start gap-3 text-left"
              >
                <div className={`mt-1 h-3.5 w-3.5 rounded-full border transition ${item.active ? "border-amber-300 bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.55)]" : item.passed ? "border-amber-400/70 bg-amber-500/70" : "border-stone-600 bg-stone-800"}`} />
                <div className="min-w-0">
                  <div className={`text-[11px] tracking-[0.18em] ${item.active ? "text-amber-200" : "text-stone-500"}`}>{item.time}</div>
                  <div className={`mt-1 font-serif text-sm transition ${item.active ? "text-stone-100" : "text-stone-400 group-hover:text-stone-200"}`}>{item.title}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#f59e0b,#fb7185,#60a5fa)] transition-[width] duration-500"
            style={{ width: `${Math.max(progress * 100, currentPoem ? 4 : 0)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
