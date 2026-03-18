"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import PostCard from "@/components/PostCard";
import type { PostMeta } from "@/types/post";

const PAGE_SIZE = 9;

interface BlogFilterProps {
  posts: PostMeta[];
}

export default function BlogFilter({ posts }: BlogFilterProps) {
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [animState, setAnimState] = useState<"idle" | "out" | "in">("idle");
  const pendingPage = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const years = useMemo(() => {
    const set = new Set(posts.map((p) => new Date(p.publishedAt).getFullYear().toString()));
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [posts]);

  const months = useMemo(() => {
    const base = selectedYear === "all" ? posts : posts.filter(
      (p) => new Date(p.publishedAt).getFullYear().toString() === selectedYear
    );
    const set = new Set(base.map((p) => (new Date(p.publishedAt).getMonth() + 1).toString().padStart(2, "0")));
    return Array.from(set).sort();
  }, [posts, selectedYear]);

  const allTags = useMemo(() => {
    const set = new Set(posts.flatMap((p) => p.tags ?? []));
    return Array.from(set).sort();
  }, [posts]);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const date = new Date(p.publishedAt);
      const year = date.getFullYear().toString();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      if (selectedYear !== "all" && year !== selectedYear) return false;
      if (selectedMonth !== "all" && month !== selectedMonth) return false;
      if (selectedTag !== "all" && !(p.tags ?? []).includes(selectedTag)) return false;
      return true;
    });
  }, [posts, selectedYear, selectedMonth, selectedTag]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = posts.length > 0 ? Math.min(page, Math.max(0, totalPages - 1)) : 0;
  const pagePosts = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  // 筛选条件变化时重置页码（无动画）
  useEffect(() => { setPage(0); setAnimState("idle"); }, [selectedYear, selectedMonth, selectedTag]);

  // 清理 timer
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const MONTH_NAMES = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
  const hasFilter = selectedYear !== "all" || selectedMonth !== "all" || selectedTag !== "all";

  // 带动画换页：fade-out(500ms) → 切数据 → fade-in(800ms) → idle
  const goPage = useCallback((next: number) => {
    if (animState !== "idle") return;
    const target = ((next % totalPages) + totalPages) % totalPages;
    if (target === currentPage) return;
    pendingPage.current = target;
    setAnimState("out");
    timerRef.current = setTimeout(() => {
      setPage(target);
      setAnimState("in");
      timerRef.current = setTimeout(() => {
        setAnimState("idle");
      }, 800);
    }, 500);
  }, [animState, currentPage, totalPages]);

  const gridClass =
    animState === "out" ? "page-fade-out" :
    animState === "in"  ? "page-fade-in"  : "";

  return (
    <>
      {/* 筛选栏 */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-theme-muted w-8 shrink-0">年份</span>
          <div className="flex flex-wrap gap-2">
            <FilterChip active={selectedYear === "all"} onClick={() => { setSelectedYear("all"); setSelectedMonth("all"); }}>全部</FilterChip>
            {years.map((y) => (
              <FilterChip key={y} active={selectedYear === y} onClick={() => { setSelectedYear(y); setSelectedMonth("all"); }}>{y}</FilterChip>
            ))}
          </div>
        </div>

        {months.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-theme-muted w-8 shrink-0">月份</span>
            <div className="flex flex-wrap gap-2">
              <FilterChip active={selectedMonth === "all"} onClick={() => setSelectedMonth("all")}>全部</FilterChip>
              {months.map((m) => (
                <FilterChip key={m} active={selectedMonth === m} onClick={() => setSelectedMonth(m)}>
                  {MONTH_NAMES[parseInt(m) - 1]}
                </FilterChip>
              ))}
            </div>
          </div>
        )}

        {allTags.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-theme-muted w-8 shrink-0">标签</span>
            <div className="flex flex-wrap gap-2">
              <FilterChip active={selectedTag === "all"} onClick={() => setSelectedTag("all")}>全部</FilterChip>
              {allTags.map((t) => (
                <FilterChip key={t} active={selectedTag === t} onClick={() => setSelectedTag(t)}>{t}</FilterChip>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-theme-muted">
            {hasFilter ? (
              <>筛选结果：<span className="text-theme-accent font-medium">{filtered.length}</span> / {posts.length} 篇</>
            ) : (
              <>共 <span className="text-theme-accent font-medium">{posts.length}</span> 篇文章</>
            )}
          </p>
          {hasFilter && (
            <button
              onClick={() => { setSelectedYear("all"); setSelectedMonth("all"); setSelectedTag("all"); }}
              className="text-xs text-theme-muted hover:text-[var(--accent)] transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              清除筛选
            </button>
          )}
        </div>
      </div>

      {/* 文章列表 */}
      {filtered.length > 0 ? (
        <>
          {/* 固定最小高度容器，防止换批时页面高度变化 */}
          <div style={{ minHeight: `${Math.ceil(PAGE_SIZE / 3) * 220}px` }}>
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${gridClass}`}>
              {pagePosts.map((post) => (
                <div key={post.slug}>
                  <PostCard post={post} />
                </div>
              ))}
            </div>
          </div>

          {/* 换一批按钮 */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center">
              <button
                onClick={() => goPage(currentPage + 1)}
                disabled={animState !== "idle"}
                className="relative group overflow-hidden flex items-center gap-2.5 px-8 py-3 rounded-2xl text-sm font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "var(--accent)",
                  color: "var(--bg-primary)",
                  boxShadow: "0 4px 24px rgba(122,184,160,0.4)",
                  transition: "transform 0.15s ease, box-shadow 0.2s ease",
                }}
              >
                {/* hover 高光 */}
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%)" }}
                />
                {/* 旋转刷新图标 */}
                <svg
                  className={`w-4 h-4 transition-transform duration-500 ${animState !== "idle" ? "animate-spin" : "group-hover:rotate-180"}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="relative z-10">换一批</span>
                <span className="relative z-10 text-xs opacity-60 font-mono">
                  {currentPage + 1} / {totalPages}
                </span>
              </button>
            </div>
          )}

          {/* 页码点阵 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => goPage(i)}
                  disabled={animState !== "idle"}
                  className="rounded-full transition-all"
                  style={{
                    width: i === currentPage ? 20 : 6,
                    height: 6,
                    background: i === currentPage ? "var(--accent)" : "var(--border-color)",
                  }}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <div className="text-5xl mb-4 opacity-30">🔍</div>
          <p className="text-theme-muted">没有符合条件的文章</p>
          <button
            onClick={() => { setSelectedYear("all"); setSelectedMonth("all"); setSelectedTag("all"); }}
            className="mt-4 text-sm text-[var(--accent)] hover:underline"
          >
            清除筛选条件
          </button>
        </div>
      )}
    </>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
        active
          ? "bg-[var(--accent)] text-[var(--bg-primary)] border-[var(--accent)]"
          : "bg-transparent text-theme-muted border-[var(--border-color)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
      }`}
    >
      {children}
    </button>
  );
}
