"use client";

import Link from "next/link";

export default function FrontendToolLab() {
  return (
    <div className="space-y-8">
      <div className="tool-head">
        <h1 className="text-3xl font-serif text-stone-100">小工具</h1>
        <p className="text-stone-400 mt-2">一些有趣的小玩意儿。</p>
      </div>

      <Link
        href="/poems"
        className="flex items-center gap-4 p-5 rounded-2xl border border-stone-800 bg-stone-900/50 hover:border-amber-500/40 hover:bg-stone-900 transition-all group"
      >
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 text-2xl group-hover:bg-amber-500/20 transition-colors">
          🗺
        </div>
        <div>
          <div className="font-medium text-stone-100 group-hover:text-amber-400 transition-colors">诗词地图</div>
          <div className="text-sm text-stone-500 mt-0.5">在地图上探索小学 · 初中 · 高中必背古诗词的创作足迹</div>
        </div>
        <svg className="w-4 h-4 text-stone-600 group-hover:text-amber-400 transition-colors ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}
