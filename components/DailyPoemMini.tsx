"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Poem {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string[];
}

export default function DailyPoemMini() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [currentPoemIndex, setCurrentPoemIndex] = useState(0);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef(0);

  // 获取诗歌列表 - 获取5首
  const fetchPoems = useCallback(async () => {
    try {
      const res = await fetch("/api/recommend/daily?count=5");
      const data = await res.json();
      if (data.code === 0 && data.data.length > 0) {
        setPoems(data.data);
      }
    } catch (error) {
      console.error("获取诗歌失败:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPoems();
  }, [fetchPoems]);

  // 解析诗歌，每两句为一组
  const getPoemLinePairs = useCallback((poem: Poem): string[] => {
    if (!poem) return [];
    
    const allLines: string[] = [];
    poem.content.forEach(line => {
      const sentences = line.match(/[^，。！？；、]+[，。！？；、]?/g) || [];
      sentences.forEach(s => {
        const trimmed = s.trim();
        if (trimmed) allLines.push(trimmed);
      });
    });
    
    // 每两句合并为一组
    const pairs: string[] = [];
    for (let i = 0; i < allLines.length; i += 2) {
      if (i + 1 < allLines.length) {
        pairs.push(allLines[i] + allLines[i + 1]);
      } else {
        pairs.push(allLines[i]);
      }
    }
    
    return pairs;
  }, []);

  // 单一定时器处理进度和切换
  useEffect(() => {
    if (poems.length === 0) return;

    // 清除之前的定时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (isPaused) {
      return;
    }

    // 每50ms更新一次，共60次 = 3秒
    const INTERVAL = 50;
    const TOTAL_STEPS = 60;
    
    progressRef.current = 0;
    setProgress(0);

    timerRef.current = setInterval(() => {
      progressRef.current += 1;
      const newProgress = (progressRef.current / TOTAL_STEPS) * 100;
      setProgress(newProgress);

      if (progressRef.current >= TOTAL_STEPS) {
        // 切换到下一组（两句）
        setCurrentLineIndex(prevLine => {
          const currentPoem = poems[currentPoemIndex];
          const pairs = getPoemLinePairs(currentPoem);
          
          if (prevLine < pairs.length - 1) {
            return prevLine + 1;
          } else {
            // 切换到下一首诗
            setCurrentPoemIndex(prev => (prev + 1) % poems.length);
            return 0;
          }
        });
        
        progressRef.current = 0;
        setProgress(0);
      }
    }, INTERVAL);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [poems, currentPoemIndex, isPaused, getPoemLinePairs]);

  if (loading || poems.length === 0) {
    return null;
  }

  const currentPoem = poems[currentPoemIndex];
  const pairs = getPoemLinePairs(currentPoem);
  const currentPair = pairs[currentLineIndex] || pairs[0] || "";

  return (
    <div 
      className="fixed top-20 left-4 z-40 max-w-[320px] group/mini"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        setIsPaused(false);
        progressRef.current = 0;
        setProgress(0);
      }}
    >
      <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl border border-[var(--border-color)] shadow-lg bg-[var(--bg-primary)]/80 transition-all duration-500 group-hover/mini:bg-[var(--bg-primary)]/95 group-hover/mini:shadow-2xl group-hover/mini:shadow-amber-500/20 group-hover/mini:border-amber-500/40 group-hover/mini:scale-105">
        {/* 悬停光晕效果 */}
        <div className="absolute inset-0 opacity-0 group-hover/mini:opacity-100 transition-opacity duration-500">
          <div className="absolute -top-10 -left-10 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl animate-pulse" />
          <div className="absolute -bottom-10 -right-10 w-20 h-20 bg-amber-400/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
        
        {/* 边框流光效果 */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover/mini:opacity-100 transition-opacity duration-300 overflow-hidden">
          <div className="absolute inset-[-2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        </div>
        
        {/* 内容区域 */}
        <div className="relative p-3 z-10">
          <div className="relative flex items-start gap-2">
            <span className="text-base shrink-0 transition-transform duration-300 group-hover/mini:scale-125 group-hover/mini:rotate-12">📜</span>
            <div className="min-w-0">
              <div className="font-serif text-sm text-theme-secondary leading-relaxed tracking-wide transition-colors duration-300 group-hover/mini:text-amber-100">
                {currentPair}
              </div>
              <p className="text-xs text-theme-muted mt-1 truncate transition-colors duration-300 group-hover/mini:text-amber-400/70">
                —— {currentPoem.author}《{currentPoem.title}》
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* 添加CSS动画 */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
