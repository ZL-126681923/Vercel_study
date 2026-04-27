"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { PoemItem } from "./components/MapCore";

const MapCore = dynamic(() => import("./components/MapCore"), { ssr: false });

export default function PoemMapClient() {
  const [poems, setPoems] = useState<PoemItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchPoems = async () => {
      try {
        // 请求新增的 map-poems 接口，获取 xiao/chu/gao 所有的地图诗词数据
        const res = await fetch("/api/map-poems");
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        if (mounted && json.code === 0 && Array.isArray(json.data)) {
          setPoems(json.data);
        }
      } catch (err) {
        console.error("加载古诗地图数据失败:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchPoems();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0b0a09]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-stone-800 border-t-amber-500 rounded-full animate-spin" />
            <div className="text-stone-500 text-sm font-serif tracking-widest">
              正在展开星河画卷...
            </div>
          </div>
        </div>
      )}
      <MapCore poemList={poems} />
    </div>
  );
}
