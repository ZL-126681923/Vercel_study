"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MapGL, { NavigationControl, Popup } from "react-map-gl/maplibre";
import type { Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import { getGeoJson } from "@/lib/geoCache";
import { useTheme } from "@/components/ThemeProvider";
import PoemPopup from "./PoemPopup";

type Stage = "all" | "primary" | "junior" | "senior";

export type PoemItem = {
  id: string;
  title: string;
  content: string[];
  poet: string;
  dynasty: string;
  location?: {
    name: string;
    city: string;
    province: string;
    coordinates: [number, number];
  };
};

const isMobile =
  typeof navigator !== "undefined" &&
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const CHINA_STYLE = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {},
  layers: [
    {
      id: "bg",
      type: "background",
      paint: { "background-color": "#0b0a09" },
    },
  ],
} as any;

function hashHue(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

function computeBboxFromGeoJson(geo: any): [[number, number], [number, number]] | null {
  const feats: any[] = Array.isArray(geo?.features) ? geo.features : [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const walk = (coords: any) => {
    if (!coords) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      const x = coords[0];
      const y = coords[1];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      return;
    }
    if (Array.isArray(coords)) {
      for (const c of coords) walk(c);
    }
  };

  for (const f of feats) {
    const coords = f?.geometry?.coordinates;
    walk(coords);
  }

  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return null;
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

function computeBboxFromFeature(feature: any): [[number, number], [number, number]] | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const walk = (coords: any) => {
    if (!coords) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      const x = coords[0];
      const y = coords[1];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      return;
    }
    if (Array.isArray(coords)) {
      for (const c of coords) walk(c);
    }
  };

  walk(feature?.geometry?.coordinates);

  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return null;
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

function cityNameZoom(count: number) {
  if (count >= 15) return 3.2;
  if (count >= 8) return 4.0;
  if (count >= 4) return 5.0;
  if (count >= 2) return 6.0;
  return 7.0;
}

export default function MapCore({ poemList = [] }: { poemList?: PoemItem[] } = {}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [stage, setStage] = useState<Stage>("all");
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedPoem, setSelectedPoem] = useState<PoemItem | null>(null);
  const provinceAdcodeRef = useRef<Record<string, number>>({});
  const fittedRef = useRef(false);
  const markerAnimationRef = useRef<number | null>(null);
  const [cityPopup, setCityPopup] = useState<{
    key: string;
    province: string;
    city: string;
    lng: number;
    lat: number;
  } | null>(null);

  const hasPoems = poemList.length > 0;

  const filteredPoems = useMemo(() => {
    if (!hasPoems) return [];
    if (stage === "all") return poemList;
    const prefix = { primary: "xiao", junior: "chu", senior: "gao" }[stage];
    return poemList.filter((p) => p.id && p.id.startsWith(prefix));
  }, [poemList, stage, hasPoems]);

  const cityClusters = useMemo(() => {
    const groups = new Map<
      string,
      {
        province: string;
        city: string;
        sumLon: number;
        sumLat: number;
        count: number;
        poems: PoemItem[];
      }
    >();

    for (const p of filteredPoems) {
      const loc = p.location;
      if (!loc?.coordinates) continue;
      const province = (loc.province || "未知").trim();
      const city = (loc.city || loc.name || province).trim();
      const key = `${province}|${city}`;
      const g = groups.get(key);
      if (g) {
        g.sumLon += loc.coordinates[0];
        g.sumLat += loc.coordinates[1];
        g.count += 1;
        g.poems.push(p);
      } else {
        groups.set(key, {
          province,
          city,
          sumLon: loc.coordinates[0],
          sumLat: loc.coordinates[1],
          count: 1,
          poems: [p],
        });
      }
    }

    return Array.from(groups.entries())
      .map(([key, g]: any) => ({
        key,
        province: g.province,
        city: g.city,
        count: g.count,
        lng: g.sumLon / g.count,
        lat: g.sumLat / g.count,
        poems: g.poems,
      }))
      .sort((a: any, b: any) => b.count - a.count);
  }, [filteredPoems]);

  const cityGeoJson = useMemo(() => {
    if (!hasPoems) {
      return { type: "FeatureCollection", features: [] } as any;
    }
    return {
      type: "FeatureCollection",
      features: (cityClusters as any[]).map((c: any) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [c.lng, c.lat] },
        properties: {
          key: c.key,
          province: c.province,
          city: c.city,
          count: c.count,
          nameZoom: cityNameZoom(c.count),
        },
      })),
    } as any;
  }, [cityClusters, hasPoems]);

  const provinceOutlineUrl = "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json";

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const applyThemePaints = () => {
      if (map.getLayer("bg")) {
        map.setPaintProperty("bg", "background-color", isLight ? "#ede9e0" : "#0b0a09");
      }
      if (map.getLayer("cn-province-outline")) {
        map.setPaintProperty(
          "cn-province-outline",
          "line-color",
          isLight ? "rgba(51, 65, 85, 0.58)" : "rgba(231, 229, 228, 0.55)"
        );
        map.setPaintProperty("cn-province-outline", "line-width", isLight ? 1.8 : 1.4);
      }
      if (map.getLayer("cn-city-outline")) {
        map.setPaintProperty(
          "cn-city-outline",
          "line-color",
          isLight ? "rgba(51, 65, 85, 0.66)" : "rgba(231, 229, 228, 0.78)"
        );
        map.setPaintProperty("cn-city-outline", "line-width", isLight ? 1.4 : 1.0);
      }
      if (map.getLayer("cn-province-label")) {
        map.setPaintProperty(
          "cn-province-label",
          "text-color",
          isLight ? "rgba(28, 25, 23, 0.88)" : "rgba(250, 250, 249, 0.92)"
        );
        map.setPaintProperty(
          "cn-province-label",
          "text-halo-color",
          isLight ? "rgba(255, 255, 255, 0.86)" : "rgba(12, 10, 9, 0.9)"
        );
      }
      if (map.getLayer("cn-city-label")) {
        map.setPaintProperty(
          "cn-city-label",
          "text-color",
          isLight ? "rgba(28, 25, 23, 0.82)" : "rgba(250, 250, 249, 0.88)"
        );
        map.setPaintProperty(
          "cn-city-label",
          "text-halo-color",
          isLight ? "rgba(255, 255, 255, 0.9)" : "rgba(12, 10, 9, 0.92)"
        );
      }
      if (map.getLayer("poem-city-points-glow-outer")) {
        map.setPaintProperty("poem-city-points-glow-outer", "circle-color", isLight ? "#d97706" : "#fbbf24");
        map.setPaintProperty("poem-city-points-glow-outer", "circle-opacity", isLight ? 0.12 : 0.18);
      }
      if (map.getLayer("poem-city-points-ring")) {
        map.setPaintProperty(
          "poem-city-points-ring",
          "circle-stroke-color",
          isLight ? "rgba(146, 64, 14, 0.55)" : "rgba(251, 191, 36, 0.65)"
        );
        map.setPaintProperty("poem-city-points-ring", "circle-stroke-width", isLight ? 1 : 1.1);
      }
      if (map.getLayer("poem-city-points")) {
        map.setPaintProperty("poem-city-points", "circle-color", isLight ? "#292524" : "#fafaf9");
        map.setPaintProperty(
          "poem-city-points",
          "circle-stroke-color",
          isLight ? "rgba(255,255,255,0.85)" : "rgba(12,10,9,0.85)"
        );
      }
    };

    applyThemePaints();
    requestAnimationFrame(applyThemePaints);
  }, [mapReady, isLight]);

  useEffect(() => {
    let canceled = false;

    const init = async () => {
      const map = mapRef.current;
      if (!map || !mapReady) return;

      map.setRenderWorldCopies(false);

      const provinces = await getGeoJson(provinceOutlineUrl);
      if (canceled || !provinces) return;

      const byName: Record<string, number> = {};
      const labelFeatures: any[] = [];
      const seenLabel = new Set<string>();
      if (Array.isArray(provinces.features)) {
        for (const f of provinces.features) {
          const name = String(f?.properties?.name ?? "");
          const adcode = f?.properties?.adcode;
          if (!name) continue;
          if (typeof adcode === "number") {
            if (adcode !== 100000) byName[name] = adcode;
          }

          if (!seenLabel.has(name)) {
            const bbox = computeBboxFromFeature(f);
            if (bbox) {
              const lng = (bbox[0][0] + bbox[1][0]) / 2;
              const lat = (bbox[0][1] + bbox[1][1]) / 2;
              labelFeatures.push({
                type: "Feature",
                geometry: { type: "Point", coordinates: [lng, lat] },
                properties: { name, adcode: typeof adcode === "number" ? adcode : undefined },
              });
              seenLabel.add(name);
            }
          }
        }
      }

      if (!map.getSource("cn-provinces")) {
        map.addSource("cn-provinces", { type: "geojson", data: provinces as any });
        map.addLayer({
          id: "cn-province-fill",
          type: "fill",
          source: "cn-provinces",
          paint: { "fill-color": "rgba(0,0,0,0)", "fill-opacity": 0.01 },
        });
        map.addLayer(
          {
            id: "cn-province-highlight-fill",
            type: "fill",
            source: "cn-provinces",
            filter: ["==", ["get", "name"], "__none__"],
            paint: {
              "fill-color": "rgba(251, 191, 36, 0.22)",
              "fill-opacity": 0.7,
            },
          },
          "cn-province-fill"
        );
        map.addLayer({
          id: "cn-province-outline",
          type: "line",
          source: "cn-provinces",
          paint: {
            "line-color": isLight ? "rgba(51, 65, 85, 0.58)" : "rgba(231, 229, 228, 0.55)",
            "line-width": isLight ? 1.8 : 1.4,
          },
        });
        map.addLayer({
          id: "cn-province-highlight-outline",
          type: "line",
          source: "cn-provinces",
          filter: ["==", ["get", "name"], "__none__"],
          paint: {
            "line-color": "rgba(251, 191, 36, 0.95)",
            "line-width": 2.6,
          },
        });
      }
      const labelFc = { type: "FeatureCollection", features: labelFeatures } as any;
      if (!map.getSource("cn-province-labels")) {
        map.addSource("cn-province-labels", { type: "geojson", data: labelFc });
      } else {
        (map.getSource("cn-province-labels") as any).setData(labelFc);
      }
      if (!map.getLayer("cn-province-label")) {
        map.addLayer({
          id: "cn-province-label",
          type: "symbol",
          source: "cn-province-labels",
          minzoom: 1,
          maxzoom: 10,
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["Noto Sans CJK SC Regular", "Noto Sans Regular"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 2, 10, 4, 12, 6, 14, 8, 16],
            "text-allow-overlap": false,
            "text-ignore-placement": false,
            "text-padding": 2,
            "text-anchor": "center",
          },
          paint: {
            "text-color": "rgba(250, 250, 249, 0.92)",
            "text-halo-color": "rgba(12, 10, 9, 0.9)",
            "text-halo-width": 1.2,
          },
        });
      }

      if (!fittedRef.current) {
        const bbox = computeBboxFromGeoJson(provinces);
        if (bbox) {
          const center: [number, number] = [
            (bbox[0][0] + bbox[1][0]) / 2,
            (bbox[0][1] + bbox[1][1]) / 2,
          ];
          map.jumpTo({ center, zoom: isMobile ? 3.0 : 3.6 } as any);
          
          // 放宽 maxBounds，允许用户继续向外缩放至少一倍，并限制纬度在 -90 到 90 之间
          const dx = bbox[1][0] - bbox[0][0];
          const dy = bbox[1][1] - bbox[0][1];
          const paddedBbox = [
            [bbox[0][0] - dx * 0.5, Math.max(-90, bbox[0][1] - dy * 0.5)],
            [bbox[1][0] + dx * 0.5, Math.min(90, bbox[1][1] + dy * 0.5)],
          ];
          map.setMaxBounds(paddedBbox as any);
          
          fittedRef.current = true;
        }
      }

      const onProvinceClick = (e: any) => {
        const f = e?.features?.[0];
        const name = String(f?.properties?.name ?? "");
        if (!name) return;
        setSelectedPoem(null);
        setCityPopup(null);
        setSelectedProvince((prev) => (prev === name ? null : name));
      };
      map.on("click", "cn-province-fill", onProvinceClick);
      if (map.getLayer("cn-province-label")) {
        map.on("click", "cn-province-label", onProvinceClick);
      }
      provinceAdcodeRef.current = byName;

      return () => {
        map.off("click", "cn-province-fill", onProvinceClick);
        if (map.getLayer("cn-province-label")) {
          map.off("click", "cn-province-label", onProvinceClick);
        }
        if (map.getLayer("cn-province-label")) map.removeLayer("cn-province-label");
        if (map.getSource("cn-province-labels")) map.removeSource("cn-province-labels");
        if (map.getLayer("cn-province-highlight-outline")) map.removeLayer("cn-province-highlight-outline");
        if (map.getLayer("cn-province-highlight-fill")) map.removeLayer("cn-province-highlight-fill");
      };
    };

    let cleanup: (() => void) | undefined;
    init().then((fn) => {
      cleanup = fn;
    });
    return () => {
      canceled = true;
      cleanup?.();
    };
  }, [mapReady]);

  useEffect(() => {
    let canceled = false;
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const run = async () => {
      const provinceName = selectedProvince;
      if (!provinceName) {
        if (map.getLayer("cn-city-outline")) map.removeLayer("cn-city-outline");
        if (map.getLayer("cn-city-label")) map.removeLayer("cn-city-label");
        if (map.getSource("cn-cities")) map.removeSource("cn-cities");
        return;
      }

      const adcode = provinceAdcodeRef.current[provinceName];
      if (!adcode) return;
      const url = `https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`;
      const json = await getGeoJson(url);
      if (canceled || !json) return;

      const features: any[] = Array.isArray(json?.features) ? json.features : [];
      const pickByLevel = (level: string) =>
        features.filter((f) => f && f.geometry && f?.properties?.level === level);
      const chosen = pickByLevel("city");
      const cityLike = chosen.length > 0 ? chosen : pickByLevel("district");
      const cityFeatures = cityLike.length > 0 ? cityLike : pickByLevel("county");
      const fc = { type: "FeatureCollection" as const, features: cityFeatures };

      if (!map.getSource("cn-cities")) {
        map.addSource("cn-cities", { type: "geojson", data: fc as any });
      } else {
        (map.getSource("cn-cities") as any).setData(fc);
      }

      if (!map.getLayer("cn-city-outline")) {
        map.addLayer({
          id: "cn-city-outline",
          type: "line",
          source: "cn-cities",
          paint: {
            "line-color": isLight ? "rgba(51, 65, 85, 0.66)" : "rgba(231, 229, 228, 0.78)",
            "line-width": isLight ? 1.4 : 1.0,
          },
        });
      }

      if (!map.getLayer("cn-city-label")) {
        map.addLayer({
          id: "cn-city-label",
          type: "symbol",
          source: "cn-cities",
          minzoom: 4.2,
          maxzoom: 12,
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["Noto Sans CJK SC Regular", "Noto Sans Regular"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 4, 9, 6, 11, 8, 13],
            "text-allow-overlap": false,
            "text-ignore-placement": false,
            "text-padding": 2,
            "text-anchor": "center",
          },
          paint: {
            "text-color": isLight ? "rgba(28, 25, 23, 0.82)" : "rgba(250, 250, 249, 0.88)",
            "text-halo-color": isLight ? "rgba(255, 255, 255, 0.9)" : "rgba(12, 10, 9, 0.92)",
            "text-halo-width": 1.1,
          },
        });
      }
    };

    run();
    return () => {
      canceled = true;
    };
  }, [mapReady, selectedProvince, isLight]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const name = selectedProvince ?? "__none__";
    if (map.getLayer("cn-province-highlight-fill")) {
      map.setFilter("cn-province-highlight-fill", ["==", ["get", "name"], name]);
    }
    if (map.getLayer("cn-province-highlight-outline")) {
      map.setFilter("cn-province-highlight-outline", ["==", ["get", "name"], name]);
    }
  }, [mapReady, selectedProvince]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !hasPoems) return;

    const upsert = () => {
      if (!map.getSource("poem-cities")) {
        map.addSource("poem-cities", { type: "geojson", data: cityGeoJson as any });
      } else {
        (map.getSource("poem-cities") as any).setData(cityGeoJson);
      }

      if (!map.getLayer("poem-city-hit-area")) {
        map.addLayer({
          id: "poem-city-hit-area",
          type: "circle",
          source: "poem-cities",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "count"],
              1, 12,
              6, 16,
              15, 22,
            ],
            "circle-color": isLight ? "#111827" : "#ffffff",
            "circle-opacity": 0.001,
          },
        });
      }

      if (!map.getLayer("poem-city-points-glow-outer")) {
        map.addLayer({
          id: "poem-city-points-glow-outer",
          type: "circle",
          source: "poem-cities",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "count"],
              1, 8,
              6, 11,
              15, 15,
            ],
            "circle-color": isLight ? "#d97706" : "#fbbf24",
            "circle-opacity": isLight ? 0.12 : 0.18,
            "circle-blur": 1.2,
          },
        });
      }

      if (!map.getLayer("poem-city-points-ring")) {
        map.addLayer({
          id: "poem-city-points-ring",
          type: "circle",
          source: "poem-cities",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "count"],
              1, 4.8,
              6, 6.4,
              15, 8.4,
            ],
            "circle-color": "rgba(0,0,0,0)",
            "circle-stroke-color": isLight ? "rgba(146, 64, 14, 0.55)" : "rgba(251, 191, 36, 0.65)",
            "circle-stroke-width": isLight ? 1 : 1.1,
            "circle-opacity": 1,
          },
        });
      }

      if (!map.getLayer("poem-city-points")) {
        map.addLayer({
          id: "poem-city-points",
          type: "circle",
          source: "poem-cities",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "count"],
              1, 2.3,
              6, 3.2,
              15, 4.2,
            ],
            "circle-color": isLight ? "#292524" : "#fafaf9",
            "circle-opacity": 0.98,
            "circle-stroke-color": isLight ? "rgba(255,255,255,0.85)" : "rgba(12,10,9,0.85)",
            "circle-stroke-width": 0.8,
          },
        });

        const openCityPopup = (e: MapLayerMouseEvent) => {
          const f = e.features?.[0] as any;
          if (!f) return;
          const key = String(f.properties?.key ?? "");
          const province = String(f.properties?.province ?? "");
          const city = String(f.properties?.city ?? "");
          const coords = (f.geometry as any)?.coordinates;
          if (!Array.isArray(coords) || coords.length < 2) return;
          setSelectedPoem(null);
          setCityPopup({ key, province, city, lng: coords[0], lat: coords[1] });
        };

        map.on("click", "poem-city-hit-area", openCityPopup);
        map.on("mouseenter", "poem-city-hit-area", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "poem-city-hit-area", () => {
          map.getCanvas().style.cursor = "";
        });
      }
    };

    upsert();
  }, [cityGeoJson, hasPoems, isLight, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !hasPoems) return;

    if (markerAnimationRef.current !== null) {
      cancelAnimationFrame(markerAnimationRef.current);
      markerAnimationRef.current = null;
    }

    const animateMarker = (timestamp: number) => {
      if (map.getLayer("poem-city-points-glow-outer") && map.getLayer("poem-city-points-ring")) {
        const pulse = (Math.sin(timestamp / 700) + 1) / 2;
        const outerOpacity = (isLight ? 0.05 : 0.08) + pulse * (isLight ? 0.08 : 0.1);
        const ringOpacity = (isLight ? 0.3 : 0.4) + pulse * 0.15;

        map.setPaintProperty("poem-city-points-glow-outer", "circle-opacity", outerOpacity);
        map.setPaintProperty("poem-city-points-glow-outer", "circle-radius", [
          "interpolate",
          ["linear"],
          ["get", "count"],
          1, 7.5 + pulse * 1.8,
          6, 10.5 + pulse * 2.4,
          15, 14.5 + pulse * 3.2,
        ]);

        map.setPaintProperty("poem-city-points-ring", "circle-opacity", ringOpacity);
        map.setPaintProperty("poem-city-points-ring", "circle-radius", [
          "interpolate",
          ["linear"],
          ["get", "count"],
          1, 4.6 + pulse * 0.4,
          6, 6.1 + pulse * 0.6,
          15, 8.1 + pulse * 0.8,
        ]);
      }
      markerAnimationRef.current = requestAnimationFrame(animateMarker);
    };

    markerAnimationRef.current = requestAnimationFrame(animateMarker);

    return () => {
      if (markerAnimationRef.current !== null) {
        cancelAnimationFrame(markerAnimationRef.current);
        markerAnimationRef.current = null;
      }
    };
  }, [hasPoems, isLight, mapReady]);

  const cityPoems = useMemo(() => {
    if (!cityPopup) return [];
    const target = (cityClusters as any[]).find((c: any) => c.key === cityPopup.key);
    if (!target) return [];
    return target.poems as PoemItem[];
  }, [cityPopup, cityClusters]);

  const stages: { key: Stage; label: string; color: string }[] = [
    { key: "all", label: "全部", color: "bg-stone-500" },
    { key: "primary", label: "小学", color: "bg-amber-400" },
    { key: "junior", label: "初中", color: "bg-sky-400" },
    { key: "senior", label: "高中", color: "bg-rose-400" },
  ];

  return (
    <div className="relative w-full h-full">
      {hasPoems && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <div
            className={`flex gap-2 p-1 rounded-full border shadow-xl backdrop-blur-sm ${
              isLight
                ? "bg-white/75 border-stone-300"
                : "bg-stone-950/70 border-stone-800"
            }`}
          >
            {stages.map((s) => (
              <button
                key={s.key}
                onClick={() => {
                  setStage(s.key);
                  setSelectedPoem(null);
                  setCityPopup(null);
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  stage === s.key
                    ? `${s.color} text-stone-950 shadow-inner`
                    : isLight
                    ? "text-stone-700 hover:text-stone-900 hover:bg-stone-200/70"
                    : "text-stone-300 hover:text-stone-50 hover:bg-stone-900/60"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {selectedProvince && (
            <button
              onClick={() => setSelectedProvince(null)}
              className={`px-3 py-2 rounded-full border text-xs shadow-xl backdrop-blur-sm transition-colors ${
                isLight
                  ? "bg-white/75 border-stone-300 text-stone-700 hover:bg-stone-100/80"
                  : "bg-stone-950/70 border-stone-800 text-stone-200 hover:bg-stone-900/70"
              }`}
            >
              {selectedProvince} · 清除
            </button>
          )}
        </div>
      )}

      <MapGL
        mapStyle={CHINA_STYLE}
        initialViewState={{
          longitude: 108.9,
          latitude: 34.3,
          zoom: isMobile ? 3.0 : 3.6,
        }}
        maxZoom={12}
        minZoom={1.5}
        scrollZoom={true}
        touchZoomRotate={true}
        doubleClickZoom={true}
        dragRotate={!isMobile}
        pitchWithRotate={false}
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
        onLoad={(e) => {
          mapRef.current = (e.target as any) as MapLibreMap;
          setMapReady(true);
        }}
        onClick={(e) => {
          const map = mapRef.current;
          if (!map) return;
          if (!hasPoems) return;
          const layers: string[] = [];
          if (map.getLayer("cn-province-fill")) layers.push("cn-province-fill");
          if (map.getLayer("cn-province-label")) layers.push("cn-province-label");
          if (map.getLayer("cn-province-highlight-fill")) layers.push("cn-province-highlight-fill");
          if (map.getLayer("poem-city-hit-area")) layers.push("poem-city-hit-area");
          if (map.getLayer("poem-city-points")) layers.push("poem-city-points");
          const features = layers.length ? map.queryRenderedFeatures(e.point, { layers }) : [];
          if (features.length === 0) {
            setCityPopup(null);
            setSelectedPoem(null);
          } else {
            const cityFeature = features.find(
              (f) => f.layer.id === "poem-city-hit-area" || f.layer.id === "poem-city-points"
            );
            if (cityFeature) {
              const coords = (cityFeature.geometry as any)?.coordinates;
              if (Array.isArray(coords) && coords.length >= 2) {
                // 去除 3D 俯冲，仅平滑居中即可，保持用户的原缩放与视角
                map.easeTo({
                  center: [coords[0], coords[1]],
                  duration: 800,
                  essential: true
                });
              }
            }
          }
        }}
      >
        <NavigationControl position="top-right" showCompass={!isMobile} />

        {hasPoems && cityPopup && (
          <Popup
            longitude={cityPopup.lng}
            latitude={cityPopup.lat}
            anchor="top"
            closeButton={false}
            closeOnClick={false}
            maxWidth="360px"
            offset={12}
            className="poem-city-popup"
          >
            <div className="p-[1px] rounded-2xl bg-gradient-to-br from-amber-400/35 via-sky-400/20 to-fuchsia-500/25 shadow-[0_18px_60px_-24px_rgba(251,191,36,0.40)]">
              <div
                className={`rounded-2xl backdrop-blur-xl border overflow-hidden ${
                  isLight
                    ? "bg-white/90 border-stone-300/80"
                    : "bg-stone-950/85 border-stone-800/70"
                }`}
              >
                <div
                  className={`px-3.5 pt-3 pb-2 border-b flex items-start justify-between gap-3 ${
                    isLight ? "border-stone-300/80" : "border-stone-800/70"
                  }`}
                >
                  <div className="min-w-0">
                    <div className={`text-[10px] tracking-widest font-medium ${isLight ? "text-stone-500" : "text-stone-500"}`}>
                      CITY SELECT
                    </div>
                    <div className={`mt-1 font-serif text-base truncate ${isLight ? "text-stone-800" : "text-stone-100"}`}>
                      {cityPopup.city}
                    </div>
                    <div className={`mt-1 text-[11px] ${isLight ? "text-stone-600" : "text-stone-400"}`}>
                      {cityPopup.province} · {cityPoems.length} 首
                    </div>
                  </div>
                  <button
                    onClick={() => setCityPopup(null)}
                    className={`shrink-0 w-7 h-7 rounded-full border transition-colors flex items-center justify-center ${
                      isLight
                        ? "border-stone-300/80 bg-stone-100/70 hover:bg-stone-200/90 text-stone-600"
                        : "border-stone-800/70 bg-stone-900/40 hover:bg-stone-800/60 text-stone-300"
                    }`}
                    aria-label="关闭"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="px-3 pb-3 pt-3">
                  <div className="max-h-[220px] overflow-auto pr-1 space-y-2">
                    {cityPoems.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPoem(p)}
                        className={`w-full text-left group rounded-xl border transition-colors px-3.5 py-3 ${
                          isLight
                            ? "border-stone-300/80 bg-stone-100/65 hover:bg-stone-200/70"
                            : "border-stone-800/70 bg-stone-950/35 hover:bg-stone-900/55"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div
                              className={`font-serif text-sm truncate transition-colors ${
                                isLight
                                  ? "text-stone-800 group-hover:text-amber-700"
                                  : "text-stone-100 group-hover:text-amber-200"
                              }`}
                            >
                              {p.title}
                            </div>
                            <div className={`text-xs mt-1 font-serif truncate ${isLight ? "text-stone-600" : "text-stone-500"}`}>
                              {p.poet} · {p.dynasty}
                            </div>
                          </div>
                          <div
                            className={`text-[10px] font-bold shrink-0 px-2 py-0.5 rounded border ${
                              p.id.startsWith("xiao")
                                ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                                : p.id.startsWith("chu")
                                ? "bg-sky-500/15 text-sky-400 border-sky-500/25"
                                : "bg-rose-500/15 text-rose-400 border-rose-500/25"
                            }`}
                          >
                            {p.id.startsWith("xiao") ? "小学" : p.id.startsWith("chu") ? "初中" : "高中"}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Popup>
        )}

        {hasPoems && selectedPoem && (
          <Popup
            longitude={selectedPoem.location?.coordinates?.[0] ?? cityPopup?.lng ?? 108.9}
            latitude={selectedPoem.location?.coordinates?.[1] ?? cityPopup?.lat ?? 34.3}
            anchor="top"
            closeButton={false}
            closeOnClick={false}
            maxWidth="360px"
            offset={14}
          >
            <div className="p-[1px] rounded-2xl bg-gradient-to-br from-emerald-400/30 via-sky-400/18 to-violet-500/22 shadow-[0_18px_60px_-24px_rgba(52,211,153,0.35)]">
              <div
                className={`rounded-2xl backdrop-blur-xl border overflow-hidden ${
                  isLight
                    ? "bg-white/90 border-stone-300/80"
                    : "bg-stone-950/85 border-stone-800/70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <PoemPopup poem={selectedPoem} />
                  <button
                    onClick={() => setSelectedPoem(null)}
                    className={`m-3 shrink-0 w-7 h-7 rounded-full border transition-colors flex items-center justify-center ${
                      isLight
                        ? "border-stone-300/80 bg-stone-100/70 hover:bg-stone-200/90 text-stone-600"
                        : "border-stone-800/70 bg-stone-900/40 hover:bg-stone-800/60 text-stone-300"
                    }`}
                    aria-label="关闭"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </MapGL>

      {hasPoems && (
        <div
          className={`absolute bottom-4 left-4 z-10 p-3 rounded-lg border text-[10px] pointer-events-none backdrop-blur-sm ${
            isLight
              ? "bg-white/75 border-stone-300 text-stone-700"
              : "bg-stone-950/70 border-stone-800 text-stone-300"
          }`}
        >
          <div className="flex gap-4 mb-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> 小学
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-400" /> 初中
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400" /> 高中
            </span>
          </div>
          点击省份显示该省地级市轮廓 · 点击闪点查看列表
        </div>
      )}
    </div>
  );
}
