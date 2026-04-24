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

export default function PoemMap() {
  const [allPoems, setAllPoems] = useState<Poem[]>([]);
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentStage, setCurrentStage] = useState<Stage>("all");
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const chartRef = useRef<any>(null);
  const mapZoomRef = useRef(1);
  const filteredPoemsRef = useRef<Poem[]>([]);

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
      "https://cdn.jsdelivr.net/gh/apache/echarts-website@asf-site/examples/data/asset/geo/china.json",
      "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json",
    ];

    (async () => {
      for (const url of MAP_URLS) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const geoJson = await res.json();
          echarts.registerMap("china", geoJson as any);
          setMapLoaded(true);
          return;
        } catch {
          // 尝试下一个备用地址
        }
      }
      setMapLoaded(true);
    })();
  }, []);

  const filteredPoems = useMemo(() => {
    if (currentStage === "all") return allPoems;
    const prefix = { primary: "xiao", junior: "chu", senior: "gao" }[currentStage];
    return allPoems.filter((p) => p.id.startsWith(prefix));
  }, [allPoems, currentStage]);

  useEffect(() => {
    filteredPoemsRef.current = filteredPoems;
  }, [filteredPoems]);

  const provincePoems = useMemo(
    () => (!selectedProvince ? [] : filteredPoems.filter((p) => p.location?.province === selectedProvince)),
    [filteredPoems, selectedProvince]
  );

  // 静态 base option，只初始化一次，不随任何 state 变化
  const baseOption = useMemo(() => ({
    backgroundColor: "transparent",
    animation: true,
    animationDurationUpdate: 800,
    animationEasingUpdate: "cubicInOut" as const,
    tooltip: {
      trigger: "item",
      formatter: (params: any) => {
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
    geo: {
      map: "china",
      roam: true,
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
        borderColor: "rgba(120, 113, 108, 0.4)",
        borderWidth: 1,
      },
    },
    series: [
      {
        name: "诗词足迹",
        type: "effectScatter",
        coordinateSystem: "geo",
        data: [],
        symbolSize: 10,
        showEffectOn: "render",
        rippleEffect: { brushType: "stroke", scale: 3 },
        label: {
          show: false,
          // formatter 通过 ref 读最新数据，不依赖闭包
          formatter: (params: any) => {
            const id = params.value?.[2] as string;
            const poem = filteredPoemsRef.current.find((p) => p.id === id);
            return poem ? poem.title : "";
          },
          position: "top",
          distance: 5,
          fontSize: 11,
          fontFamily: "serif",
          color: "#e7e5e4",
          textBorderColor: "rgba(15,12,10,0.95)",
          textBorderWidth: 2,
        },
        emphasis: {
          label: { show: true, color: "#fbbf24", fontSize: 12, fontFamily: "serif" },
        },
        zlevel: 2,
      },
    ],
  }), []); // 空依赖：真正静态，ReactECharts 永远不会因此重新 setOption

  // 数据变化时直接更新 series，不碰 geo
  useEffect(() => {
    if (!chartRef.current || !mapLoaded) return;
    const instance = chartRef.current.getEchartsInstance();
    if (!instance || instance.isDisposed()) return;
    try {
      instance.setOption({
        series: [{
          type: "effectScatter",
          symbolSize: currentStage === "all" ? 10 : 14,
          data: filteredPoems.map((p) => ({
            name: `${p.author}·${p.title}`,
            value: [...(p.location?.coordinates ?? []), p.id],
            itemStyle: {
              color: p.id.startsWith("xiao") ? "#fbbf24"
                : p.id.startsWith("chu") ? "#60a5fa"
                : "#f87171",
            },
          })),
        }],
      });
    } catch (e) {
      console.error("[PoemMap] setOption error:", e);
    }
  }, [filteredPoems, currentStage, mapLoaded]);

  // 省份选中变化时只更新 regions，不碰 zoom/center
  useEffect(() => {
    if (!chartRef.current) return;
    const instance = chartRef.current.getEchartsInstance();
    if (!instance || instance.isDisposed()) return;
    instance.setOption({
      geo: [{
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
      }],
    });
  }, [selectedProvince]);

  const onEvents = {
    click: (params: any) => {
      if (params.seriesType === "effectScatter") {
        const poemId = params.value[2];
        const poem = allPoems.find((p) => p.id === poemId);
        if (poem) setSelectedPoem(poem);
      } else if (params.componentType === "geo") {
        const province = params.name as string;
        if (!province) { setSelectedProvince(null); return; }
        setSelectedProvince((prev) => (prev === province ? null : province));
      }
    },
    georoam: () => {
      if (!chartRef.current) return;
      const instance = chartRef.current.getEchartsInstance();
      if (!instance || instance.isDisposed()) return;
      const zoom = instance.getOption()?.geo?.[0]?.zoom ?? 1;
      const wasAbove = mapZoomRef.current >= 2.5;
      const isAbove = zoom >= 2.5;
      mapZoomRef.current = zoom;
      if (wasAbove !== isAbove) {
        instance.setOption({ series: [{ type: "effectScatter", label: { show: isAbove } }] });
      }
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

      {/* 已选省份标签 */}
      {selectedProvince && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-amber-500/15 border border-amber-500/40 rounded-full backdrop-blur-sm shadow-lg">
          <span className="text-amber-400 text-xs font-serif font-semibold">{selectedProvince}</span>
          <span className="text-stone-500 text-[10px]">
            {provincePoems.length} 首
          </span>
          <button
            onClick={() => setSelectedProvince(null)}
            className="text-stone-500 hover:text-amber-400 transition-colors ml-0.5"
            title="还原地图"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <ReactECharts
        ref={chartRef}
        key={String(mapLoaded)}
        echarts={echarts}
        option={baseOption}
        style={{ height: "100%", width: "100%", minHeight: "500px" }}
        onEvents={onEvents}
        opts={{ renderer: "canvas" }}
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

      {/* 图例 */}
      <div className="absolute bottom-4 left-4 p-3 bg-stone-900/80 rounded-lg border border-stone-800 text-[10px] text-stone-500 pointer-events-none backdrop-blur-sm">
        <div className="flex gap-4 mb-1">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> 小学</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> 初中</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> 高中</span>
        </div>
        点击省份放大 · 再次点击还原 · 点击圆点查看诗词
      </div>
    </div>
  );
}
