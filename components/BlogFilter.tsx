"use client";

import { useState, useMemo } from "react";
import PostCard from "@/components/PostCard";
import type { PostMeta } from "@/types/post";

interface BlogFilterProps {
  posts: PostMeta[];
}

export default function BlogFilter({ posts }: BlogFilterProps) {
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");

  // 从文章列表提取所有年份
  const years = useMemo(() => {
    const set = new Set(posts.map((p) => new Date(p.publishedAt).getFullYear().toString()));
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [posts]);

  // 根据选中年份提取可用月份
  const months = useMemo(() => {
    const filtered = selectedYear === "all" ? posts : posts.filter(
      (p) => new Date(p.publishedAt).getFullYear().toString() === selectedYear
    );
    const set = new Set(filtered.map((p) => (new Date(p.publishedAt).getMonth() + 1).toString().padStart(2, "0")));
    return Array.from(set).sort();
  }, [posts, selectedYear]);

  // 提取所有标签（去重）
  const allTags = useMemo(() => {
    const set = new Set(posts.flatMap((p) => p.tags ?? []));
    return Array.from(set).sort();
  }, [posts]);

  // 切换年份时重置月份
  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setSelectedMonth("all");
  };

  // 过滤文章
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

  const MONTH_NAMES = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

  const hasFilter = selectedYear !== "all" || selectedMonth !== "all" || selectedTag !== "all";

  return (
    <>
      {/* 筛选栏 */}
      <div className="mb-8 space-y-4">
        {/* 年份 */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-theme-muted w-8 shrink-0">年份</span>
          <div className="flex flex-wrap gap-2">
            <FilterChip active={selectedYear === "all"} onClick={() => handleYearChange("all")}>全部</FilterChip>
            {years.map((y) => (
              <FilterChip key={y} active={selectedYear === y} onClick={() => handleYearChange(y)}>{y}</FilterChip>
            ))}
          </div>
        </div>

        {/* 月份（只在选了年份时展开，或所有年份都有月份时也展示） */}
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

        {/* 标签 */}
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

        {/* 结果统计 + 重置 */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((post, index) => (
            <div
              key={post.slug}
              className="opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${index * 60}ms`, animationFillMode: "forwards" }}
            >
              <PostCard post={post} />
            </div>
          ))}
        </div>
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
