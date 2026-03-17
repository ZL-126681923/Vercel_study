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

export default function FavoritePoem() {
  const [poem, setPoem] = useState<Poem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorite = async () => {
      try {
        // 获取一首经典诗词
        const res = await fetch("/api/poems/stage?stage=高中&count=1");
        const data = await res.json();
        if (data.code === 0 && data.data.length > 0) {
          setPoem(data.data[0]);
        }
      } catch (error) {
        console.error("获取诗词失败:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorite();
  }, []);

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-stone-900/50 border border-stone-800/50 animate-pulse">
        <div className="h-6 bg-stone-800 rounded w-1/3 mb-4" />
        <div className="space-y-2">
          <div className="h-4 bg-stone-800 rounded w-full" />
          <div className="h-4 bg-stone-800 rounded w-5/6" />
          <div className="h-4 bg-stone-800 rounded w-4/6" />
        </div>
      </div>
    );
  }

  if (!poem) return null;

  return (
    <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-purple-500/10 border border-amber-500/20">
      <div className="absolute top-0 right-0 text-6xl opacity-10">📖</div>
      
      <div className="relative">
        <p className="text-amber-500 text-sm mb-2">我喜欢的一首诗</p>
        <h4 className="font-serif text-xl text-stone-100 mb-1">{poem.title}</h4>
        <p className="text-stone-500 text-sm mb-4">〔{poem.dynasty}〕{poem.author}</p>
        
        <div className="font-serif text-stone-300 leading-loose text-sm space-y-1">
          {poem.content.slice(0, 4).map((line, index) => (
            <p key={index}>{line}</p>
          ))}
          {poem.content.length > 4 && (
            <p className="text-stone-500">...</p>
          )}
        </div>
      </div>
    </div>
  );
}
