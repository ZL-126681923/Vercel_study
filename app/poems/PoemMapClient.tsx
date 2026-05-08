"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { MaoPoemItem } from "./components/MapCore";

const MapCore = dynamic(() => import("./components/MapCore"), { ssr: false });

export default function PoemMapClient() {
  const [poems, setPoems] = useState<MaoPoemItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchPoems = async () => {
      try {
        const res = await fetch("/api/mao-poems");
        if (!res.ok) throw new Error("Failed to fetch mao poems");
        const json = await res.json();

        if (mounted && json.code === 0 && Array.isArray(json.data)) {
          setPoems(json.data);
        }
      } catch (err) {
        console.error("加载毛主席诗词地图数据失败:", err);
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
    <div className="relative w-full h-full overflow-hidden bg-[#09090b]">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#09090b]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-9 w-9 rounded-full border-2 border-stone-800 border-t-amber-400 animate-spin" />
            <div className="text-sm font-serif tracking-[0.35em] text-stone-500">
              正在点亮诗歌星轨...
            </div>
          </div>
        </div>
      )}
      <MapCore poemList={poems} />
    </div>
  );
}
