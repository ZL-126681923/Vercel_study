"use client";

import { useState } from "react";

interface Poem {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string[];
  likes: number;
}

interface PoemSearchProps {
  compact?: boolean;
}

export default function PoemSearch({ compact = false }: PoemSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&count=6`);
      const data = await res.json();
      if (data.code === 0) {
        setResults(data.data);
      }
    } catch (error) {
      console.error("搜索失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const quickSearches = ["李白", "山水", "思乡", "爱情", "月亮", "离别"];

  const handleQuickSearch = async (keyword: string) => {
    setQuery(keyword);
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(keyword)}&count=6`);
      const data = await res.json();
      if (data.code === 0) {
        setResults(data.data);
      }
    } catch (error) {
      console.error("搜索失败:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={compact ? "" : "relative overflow-hidden rounded-3xl card p-8 md:p-12"}>
      {!compact && <div className="absolute inset-0 noise-bg" />}
      
      <div className="relative">
        {!compact && (
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🔍</span>
            <div>
              <h3 className="font-serif text-xl text-theme-primary">诗词探索</h3>
              <p className="text-sm text-theme-muted">搜索你喜欢的诗人、主题或诗句</p>
            </div>
          </div>
        )}

        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入诗人、诗名或关键词..."
              className="w-full px-6 py-4 pr-14 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:border-amber-500/50 focus:outline-none text-theme-primary placeholder:text-theme-muted transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50"
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </button>
          </div>
        </form>

        {/* 快捷搜索 */}
        <div className="flex flex-wrap gap-2 mb-6">
          {quickSearches.map((keyword) => (
            <button
              key={keyword}
              onClick={() => handleQuickSearch(keyword)}
              className="px-4 py-2 rounded-full text-sm border border-[var(--border-color)] text-theme-muted hover:text-amber-500 hover:border-amber-500/50 transition-all"
            >
              {keyword}
            </button>
          ))}
        </div>

        {/* 搜索结果 */}
        {searched && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : results.length > 0 ? (
              <>
                <p className="text-sm text-theme-muted">找到 {results.length} 首相关诗词</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.map((poem) => (
                    <button
                      key={poem.id}
                      onClick={() => setSelectedPoem(selectedPoem?.id === poem.id ? null : poem)}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        selectedPoem?.id === poem.id
                          ? "border-amber-500 bg-amber-500/5"
                          : "border-[var(--border-color)] hover:border-amber-500/50"
                      }`}
                    >
                      <h4 className="font-serif text-lg text-theme-primary mb-1">{poem.title}</h4>
                      <p className="text-sm text-theme-muted mb-2">
                        〔{poem.dynasty}〕{poem.author}
                      </p>
                      <p className="text-sm text-theme-secondary line-clamp-2">
                        {poem.content[0]}
                      </p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-theme-muted">没有找到相关诗词，换个关键词试试？</p>
              </div>
            )}
          </div>
        )}

        {/* 选中诗歌详情 */}
        {selectedPoem && (
          <div className="mt-6 p-6 rounded-2xl bg-[var(--bg-secondary)] border border-amber-500/30">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-serif text-2xl text-theme-primary mb-1">{selectedPoem.title}</h4>
                <p className="text-theme-muted">〔{selectedPoem.dynasty}〕{selectedPoem.author}</p>
              </div>
              <button
                onClick={() => setSelectedPoem(null)}
                className="p-2 rounded-full hover:bg-[var(--bg-primary)] transition-colors"
              >
                <svg className="w-5 h-5 text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2 font-serif text-theme-secondary leading-loose">
              {selectedPoem.content.map((line, index) => (
                <p key={index} className="tracking-wider">{line}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
