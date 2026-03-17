"use client";

import { useState, useEffect } from "react";

interface Poem {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string[];
  likes: number;
}

export default function DailyPoem() {
  const [poem, setPoem] = useState<Poem | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [copying, setCopying] = useState(false);

  const fetchPoem = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recommend/daily?count=1");
      const data = await res.json();
      if (data.code === 0 && data.data.length > 0) {
        const p = data.data[0];
        setPoem(p);
        setLikeCount(p.likes || 0);
        setLiked(false);
      }
    } catch (error) {
      console.error("获取诗歌失败:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoem();
  }, []);

  const handleLike = async () => {
    if (!poem) return;
    
    try {
      const res = await fetch(`/api/poems/${poem.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: liked ? "unlike" : "like" }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setLikeCount(data.data.likes);
        setLiked(!liked);
      }
    } catch (error) {
      console.error("点赞失败:", error);
    }
  };

  const handleCopy = async () => {
    if (!poem) return;
    
    const text = `${poem.title}\n${poem.author}·${poem.dynasty}\n\n${poem.content.join("\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    } catch (error) {
      console.error("复制失败:", error);
    }
  };

  const handleRefresh = () => {
    fetchPoem();
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl h-[480px] bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 shadow-2xl shadow-amber-900/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CjxyZWN0IHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxIiBmaWxsPSJyZ2JhKDI0NSwxNTgsIDExLCAwLjA1KSIvPgo8L3N2Zz4=')] opacity-60" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        <div className="relative flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-amber-200/60 text-sm tracking-widest">诗韵载入中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!poem) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl group h-[480px] flex flex-col bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 shadow-2xl shadow-amber-900/20 border border-amber-900/20">
      {/* 精致纹理背景 */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CjxyZWN0IHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxIiBmaWxsPSJyZ2JhKDI0NSwxNTgsIDExLCAwLjA1KSIvPgo8L3N2Zz4=')] opacity-60" />
      
      {/* 顶部金色装饰线 */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
      
      {/* 装饰光晕 */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/8 rounded-full blur-3xl transform translate-x-12 -translate-y-12" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-600/6 rounded-full blur-3xl transform -translate-x-12 translate-y-12" />
      
      {/* 角落装饰 */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-amber-500/30 rounded-tl-lg" />
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-amber-500/30 rounded-tr-lg" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-amber-500/30 rounded-bl-lg" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-amber-500/30 rounded-br-lg" />
      
      <div className="relative p-8 md:p-10 flex flex-col h-full">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-500/10">
                <span className="text-2xl">📜</span>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-pulse shadow-lg shadow-amber-400/50" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 bg-clip-text text-transparent tracking-wider">
                每日一诗
              </h3>
              <p className="text-sm text-stone-400 tracking-wide mt-0.5">用诗词开启美好一天</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="p-3 rounded-xl bg-stone-800/60 hover:bg-amber-500/20 border border-stone-700/50 hover:border-amber-500/40 transition-all duration-300 group/btn shadow-lg"
            title="换一首"
          >
            <svg
              className="w-5 h-5 text-stone-400 group-hover/btn:text-amber-400 transition-all group-hover/btn:rotate-180 duration-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        {/* 诗歌内容 */}
        <div className="flex-1 min-h-0 overflow-hidden mb-6">
          <h4 className="font-serif text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 bg-clip-text text-transparent mb-3 tracking-widest drop-shadow-sm">
            {poem.title}
          </h4>
          <p className="text-amber-400/70 text-sm mb-5 tracking-wider font-medium">
            〔{poem.dynasty}〕{poem.author}
          </p>
          <div className="space-y-3 font-serif text-lg leading-loose overflow-y-auto max-h-[180px] pr-3 scrollbar-thin scrollbar-thumb-amber-500/30 scrollbar-track-transparent">
            {(() => {
              const fullText = poem.content.join("");
              const sentences = fullText.split(/[。？！]/).filter(s => s.trim());
              const displaySentences = sentences.slice(0, 6);
              return (
                <>
                  {displaySentences.map((sentence, index) => (
                    <p 
                      key={index} 
                      className="tracking-widest text-stone-200 hover:text-amber-100 transition-colors duration-300"
                    >
                      {sentence.trim()}{index < displaySentences.length - 1 || sentences.length > 6 ? "。" : "。"}
                    </p>
                  ))}
                  {sentences.length > 6 && (
                    <p className="text-amber-500/50 text-sm tracking-wider">· · ·</p>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* 操作栏 */}
        <div className="flex items-center justify-between pt-5 border-t border-amber-500/20 flex-shrink-0 mt-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 border ${
                liked
                  ? "bg-red-500/15 text-red-400 border-red-500/30 shadow-lg shadow-red-500/10"
                  : "bg-stone-800/60 hover:bg-red-500/10 text-stone-400 hover:text-red-400 border-stone-700/50 hover:border-red-500/30"
              }`}
            >
              <svg
                className={`w-5 h-5 transition-transform duration-300 ${liked ? "scale-110" : ""}`}
                fill={liked ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span className="text-sm font-medium">{likeCount}</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-800/60 hover:bg-stone-700/60 text-stone-400 hover:text-stone-200 transition-all duration-300 border border-stone-700/50 hover:border-stone-600/50"
            >
              {copying ? (
                <>
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium text-emerald-400">已复制</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm font-medium">复制</span>
                </>
              )}
            </button>
          </div>
          <a
            href={`/poems/${poem.id}`}
            className="group/link flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/20 text-amber-300 hover:text-amber-200 transition-all duration-300 border border-amber-500/30 hover:border-amber-400/50 shadow-lg shadow-amber-500/10"
          >
            <span className="text-sm font-medium tracking-wide">查看详情</span>
            <svg
              className="w-4 h-4 transition-transform group-hover/link:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
      
      {/* 底部装饰线 */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
    </div>
  );
}
