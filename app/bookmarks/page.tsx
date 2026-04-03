"use client";

import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Bookmark {
  id: string;
  title: string;
  url: string;
  description?: string;
  icon?: string;
  iconUrl?: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  bookmarks: Bookmark[];
}

// 从 URL 提取域名
function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

// 书签 favicon 图标组件
function BookmarkFavicon({ url, title, color }: { url: string; title: string; color: string }) {
  const [failed, setFailed] = useState(false);
  const domain = getDomain(url);
  const safeName = domain.replace(/\./g, "_");
  const localFaviconUrl = safeName ? `/favicons/${safeName}.png` : "";

  if (!localFaviconUrl || failed) {
    return (
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
        style={{ backgroundColor: `${color}30`, color }}
      >
        {title.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={localFaviconUrl}
      alt={title}
      className="w-7 h-7 object-contain"
      onError={() => setFailed(true)}
    />
  );
}

// 辅助组件：拖拽时的视觉快照
function BookmarkCard({ 
  bookmark, 
  category, 
  isOverlay,
  isDragging,
  handleDeleteBookmark,
  renderBookmarkIcon 
}: { 
  bookmark: Bookmark; 
  category: Category;
  isOverlay?: boolean;
  isDragging?: boolean;
  handleDeleteBookmark?: (cid: string, bid: string) => void;
  renderBookmarkIcon: (b: Bookmark, c: string) => React.ReactNode;
}) {
  return (
    <div
      className={`group relative p-5 rounded-2xl bg-[var(--bg-secondary)] border transition-all duration-200 h-[140px] flex flex-col justify-between ${
        isOverlay 
          ? 'border-[var(--accent)] shadow-2xl scale-105 rotate-2 z-[100] cursor-grabbing' 
          : isDragging 
            ? 'opacity-30 border-[var(--border-color)]' 
            : 'border-[var(--border-color)] hover:border-[var(--accent)]/40 hover:shadow-lg hover:shadow-[var(--accent)]/5'
      }`}
    >
      {!isOverlay && handleDeleteBookmark && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteBookmark(category.id, bookmark.id); }}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all z-10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <div className="flex items-start gap-4 flex-1 min-h-0">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 overflow-hidden"
          style={{ backgroundColor: `${category.color}15`, color: category.color }}
        >
          {renderBookmarkIcon(bookmark, category.color)}
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <h3 className="font-medium text-theme-primary group-hover:text-[var(--accent)] transition-colors truncate text-[15px]">
            {bookmark.title}
          </h3>
          <p className="text-sm text-theme-muted mt-1 line-clamp-2 leading-relaxed flex-1">
            {bookmark.description || "\u00A0"}
          </p>
          <p className="text-xs text-theme-muted/60 mt-1 truncate">
            {(() => { try { return new URL(bookmark.url).hostname; } catch { return bookmark.url; } })()}
          </p>
        </div>
      </div>

      {!isOverlay && (
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
          <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
      )}
    </div>
  );
}

// 可排序包装组件
function SortableBookmark({ 
  bookmark, 
  category, 
  handleDeleteBookmark, 
  renderBookmarkIcon 
}: { 
  bookmark: Bookmark; 
  category: Category;
  handleDeleteBookmark: (cid: string, bid: string) => void;
  renderBookmarkIcon: (b: Bookmark, c: string) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: bookmark.id });

  const pointerStartPos = useRef<{ x: number; y: number } | null>(null);

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
    listeners?.onPointerDown?.(e as unknown as PointerEvent);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!pointerStartPos.current) {
      window.open(bookmark.url, "_blank", "noopener,noreferrer");
      return;
    }
    const dx = Math.abs(e.clientX - pointerStartPos.current.x);
    const dy = Math.abs(e.clientY - pointerStartPos.current.y);
    pointerStartPos.current = null;
    if (dx < 5 && dy < 5) {
      window.open(bookmark.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <a
      ref={setNodeRef}
      style={style}
      href={bookmark.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        e.preventDefault();
        handleClick(e);
      }}
      onPointerDown={handlePointerDown}
      onKeyDown={listeners?.onKeyDown as React.KeyboardEventHandler<HTMLAnchorElement> | undefined}
      {...attributes}
      className="block cursor-pointer"
    >
      <BookmarkCard 
        bookmark={bookmark} 
        category={category} 
        isDragging={isDragging}
        handleDeleteBookmark={handleDeleteBookmark}
        renderBookmarkIcon={renderBookmarkIcon}
      />
    </a>
  );
}

// 图片上传组件
function ImageUploader({
  password,
  onUploaded,
  currentUrl,
  placeholder = "上传图片",
}: {
  password: string;
  onUploaded: (url: string) => void;
  currentUrl?: string;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl || "");

  const handleFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("password", password);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.code === 0) {
        setPreview(data.url);
        onUploaded(data.url);
      } else {
        alert(data.message || "上传失败");
      }
    } catch {
      alert("上传失败");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div
        onClick={() => inputRef.current?.click()}
        className="w-14 h-14 rounded-xl border-2 border-dashed border-[var(--border-color)] flex items-center justify-center cursor-pointer hover:border-amber-500/50 transition-all overflow-hidden flex-shrink-0"
      >
        {preview ? (
          <img src={preview} alt="icon" className="w-full h-full object-contain" />
        ) : uploading ? (
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-6 h-6 text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
        )}
      </div>
      <div className="flex-1 text-sm text-theme-muted">
        <p>{placeholder}</p>
        <p className="text-xs opacity-60 mt-0.5">支持 JPG、PNG、WebP、SVG，最大 2MB</p>
        {preview && (
          <button
            type="button"
            onClick={() => { setPreview(""); onUploaded(""); }}
            className="text-red-400 text-xs mt-1 hover:text-red-300"
          >
            移除图片
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}

export default function BookmarksPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<"bookmark" | "category">("bookmark");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setIsMounted(true);
    fetchBookmarks();
  }, []);

  const activeBookmark = activeId 
    ? categories.flatMap(c => c.bookmarks).find(b => b.id === activeId) 
    : null;
  const activeCategory = activeId
    ? categories.find(c => c.bookmarks.some(b => b.id === activeId))
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // 找到当前拖拽项所属的分类
    const activeCid = categories.find(c => c.bookmarks.some(b => b.id === active.id))?.id;
    const overCid = categories.find(c => c.bookmarks.some(b => b.id === over.id))?.id;

    if (!activeCid || activeCid !== overCid) return;

    setCategories((prev) => {
      const newCategories = [...prev];
      const categoryIndex = newCategories.findIndex(c => c.id === activeCid);
      if (categoryIndex === -1) return prev;

      const category = newCategories[categoryIndex];
      const oldIndex = category.bookmarks.findIndex(b => b.id === active.id);
      const newIndex = category.bookmarks.findIndex(b => b.id === over.id);

      const updatedBookmarks = arrayMove(category.bookmarks, oldIndex, newIndex);
      newCategories[categoryIndex] = { ...category, bookmarks: updatedBookmarks };

      saveOrderToLocal(newCategories);
      return newCategories;
    });
  };

  const SORT_ORDER_KEY = "bookmarks-sort-order";

  const saveOrderToLocal = (cats: Category[]) => {
    try {
      const orderMap: Record<string, string[]> = {};
      for (const cat of cats) {
        orderMap[cat.id] = cat.bookmarks.map(b => b.id);
      }
      localStorage.setItem(SORT_ORDER_KEY, JSON.stringify(orderMap));
    } catch { /* ignore */ }
  };

  const applyLocalOrder = (cats: Category[]): Category[] => {
    try {
      const raw = localStorage.getItem(SORT_ORDER_KEY);
      if (!raw) return cats;
      const orderMap: Record<string, string[]> = JSON.parse(raw);

      return cats.map(cat => {
        const savedOrder = orderMap[cat.id];
        if (!savedOrder || savedOrder.length === 0) return cat;

        const bookmarkMap = new Map(cat.bookmarks.map(b => [b.id, b]));
        const sorted: Bookmark[] = [];
        for (const id of savedOrder) {
          const bm = bookmarkMap.get(id);
          if (bm) {
            sorted.push(bm);
            bookmarkMap.delete(id);
          }
        }
        bookmarkMap.forEach(bm => sorted.push(bm));
        return { ...cat, bookmarks: sorted };
      });
    } catch {
      return cats;
    }
  };

  const [newBookmark, setNewBookmark] = useState({
    title: "",
    url: "",
    description: "",
    categoryId: "",
    icon: "link",
    iconUrl: "",
  });
  const [newCategory, setNewCategory] = useState({
    name: "",
    icon: "📁",
    color: "#6366F1",
    iconUrl: "",
  });

  const COLLAPSED_KEY = "bookmarks-category-collapsed";
  const [collapsedByCategory, setCollapsedByCategory] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(COLLAPSED_KEY);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsedByCategory));
    } catch {
      /* ignore */
    }
  }, [collapsedByCategory]);

  const fetchBookmarks = async () => {
    try {
      const res = await fetch("/api/bookmarks");
      const data = await res.json();
      if (data.code === 0) setCategories(applyLocalOrder(data.data));
    } catch (error) {
      console.error("获取书签失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBookmark = async () => {
    if (!newBookmark.title || !newBookmark.url || !newBookmark.categoryId) return;
    setSubmitting(true);
    setPasswordError("");
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addBookmark",
          categoryId: newBookmark.categoryId,
          bookmark: newBookmark,
          password,
        }),
      });
      const data = await res.json();
      if (data.code === 0) {
        fetchBookmarks();
        setNewBookmark({ title: "", url: "", description: "", categoryId: "", icon: "link", iconUrl: "" });
        setShowAddModal(false);
        setPassword("");
      } else if (data.code === 401) {
        setPasswordError("密码错误，请重试");
      }
    } catch {
      setPasswordError("操作失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name) return;
    setSubmitting(true);
    setPasswordError("");
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addCategory",
          category: newCategory,
          password,
        }),
      });
      const data = await res.json();
      if (data.code === 0) {
        fetchBookmarks();
        setNewCategory({ name: "", icon: "📁", color: "#6366F1", iconUrl: "" });
        setShowAddModal(false);
        setPassword("");
      } else if (data.code === 401) {
        setPasswordError("密码错误，请重试");
      }
    } catch {
      setPasswordError("操作失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBookmark = async (categoryId: string, bookmarkId: string) => {
    const pwd = prompt("请输入管理密码：");
    if (!pwd) return;
    if (!confirm("确定删除这个书签吗？")) return;
    try {
      const res = await fetch(
        `/api/bookmarks?categoryId=${categoryId}&bookmarkId=${bookmarkId}&password=${encodeURIComponent(pwd)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.code === 0) {
        fetchBookmarks();
      } else {
        alert(data.message || "删除失败");
      }
    } catch {
      alert("删除失败");
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    const pwd = prompt("请输入管理密码：");
    if (!pwd) return;
    if (!confirm(`确定删除分类「${categoryName}」及其所有书签吗？`)) return;
    try {
      const res = await fetch(
        `/api/bookmarks?categoryId=${categoryId}&password=${encodeURIComponent(pwd)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.code === 0) {
        if (selectedCategory === categoryId) setSelectedCategory(null);
        fetchBookmarks();
      } else {
        alert(data.message || "删除失败");
      }
    } catch {
      alert("删除失败");
    }
  };

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      bookmarks: cat.bookmarks.filter(
        (b) =>
          b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.description?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((cat) => (selectedCategory ? cat.id === selectedCategory : true))
    .filter((cat) => (searchTerm ? cat.bookmarks.length > 0 : true));

  const totalBookmarks = categories.reduce((sum, cat) => sum + cat.bookmarks.length, 0);

  const renderBookmarkIcon = (bookmark: Bookmark, color: string) => {
    if (bookmark.iconUrl) {
      return (
        <img
          src={bookmark.iconUrl}
          alt={bookmark.title}
          className="w-7 h-7 object-contain"
        />
      );
    }
    return <BookmarkFavicon url={bookmark.url} title={bookmark.title} color={color} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* 头部 */}
      <div className="relative overflow-hidden bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
        <div className="absolute inset-0 noise-bg opacity-40" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--accent)]/4 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--accent)]/3 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20">
              <svg className="w-7 h-7 text-[var(--bg-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-theme-primary tracking-wide">我的收藏夹</h1>
              <p className="text-theme-muted mt-1">
                {categories.length} 个分类 · {totalBookmarks} 个书签
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <div className="relative flex-1">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="搜索书签..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[var(--bg-primary)]/60 border border-[var(--border-color)] rounded-xl text-theme-primary placeholder-theme-muted focus:outline-none focus:border-[var(--accent)]/60 focus:ring-2 focus:ring-[var(--accent)]/15 transition-all"
              />
            </div>
            <button
              onClick={() => { setShowAddModal(true); setPasswordError(""); }}
              className="px-6 py-3 bg-[var(--accent)] text-[var(--bg-primary)] font-medium rounded-xl hover:bg-[var(--accent-hover)] hover:shadow-lg hover:shadow-[var(--accent)]/20 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              添加
            </button>
          </div>

          {/* 分类筛选 */}
          <div className="flex flex-wrap gap-2 mt-6">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                !selectedCategory
                  ? "bg-[var(--accent)] text-[var(--bg-primary)]"
                  : "bg-[var(--bg-primary)]/50 text-theme-muted hover:text-theme-primary border border-[var(--border-color)]"
              }`}
            >
              全部
            </button>
            {categories.map((cat) => (
              <div key={cat.id} className="group relative flex items-center">
                <button
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    selectedCategory === cat.id
                      ? "bg-[var(--accent)] text-[var(--bg-primary)] pr-8"
                      : "bg-[var(--bg-primary)]/50 text-theme-muted hover:text-theme-primary border border-[var(--border-color)] group-hover:pr-8"
                  }`}
                >
                  {cat.icon.startsWith("/") || cat.icon.startsWith("http") ? (
                    <img src={cat.icon} alt="" className="w-4 h-4 object-contain" />
                  ) : (
                    <span>{cat.icon}</span>
                  )}
                  <span>{cat.name}</span>
                  <span className="text-xs opacity-60">({cat.bookmarks.length})</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id, cat.name); }}
                  className="absolute right-1.5 p-1 rounded text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
                  title="删除分类"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 书签列表 */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {!isMounted ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-theme-muted">没有找到匹配的书签</p>
          </div>
        ) : (
          <DndContext
            id="bookmarks-dnd-context"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-12">
              {filteredCategories.map((category) => {
                const isCollapsed = !!collapsedByCategory[category.id];
                return (
                  <div key={category.id} id={category.id} className="scroll-mt-24">
                    <div className="flex items-center gap-2 mb-6">
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedByCategory((prev) => ({
                            ...prev,
                            [category.id]: !prev[category.id],
                          }))
                        }
                        className="flex items-center gap-3 flex-1 min-w-0 rounded-xl -ml-2 pl-2 pr-3 py-1.5 text-left hover:bg-[var(--bg-secondary)]/70 border border-transparent hover:border-[var(--border-color)]/60 transition-all group/collapse"
                        aria-expanded={!isCollapsed}
                        title={isCollapsed ? "展开该分类" : "收起该分类"}
                      >
                        <svg
                          className={`w-5 h-5 shrink-0 text-theme-muted transition-transform duration-200 ${
                            isCollapsed ? "-rotate-90" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        <span
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl overflow-hidden shrink-0"
                          style={{ backgroundColor: `${category.color}20` }}
                        >
                          {category.icon.startsWith("/") || category.icon.startsWith("http") ? (
                            <img src={category.icon} alt="" className="w-6 h-6 object-contain" />
                          ) : (
                            category.icon
                          )}
                        </span>
                        <h2 className="text-xl font-semibold text-theme-primary truncate">{category.name}</h2>
                        <span className="text-sm text-theme-muted shrink-0">({category.bookmarks.length})</span>
                        <div className="flex-1 min-w-[2rem] h-px bg-gradient-to-r from-[var(--border-color)] to-transparent" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category.id, category.name)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all opacity-0 hover:opacity-100 focus:opacity-100 shrink-0"
                        title="删除分类"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {!isCollapsed && (
                      <SortableContext
                        items={category.bookmarks.map(b => b.id)}
                        strategy={rectSortingStrategy}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {category.bookmarks.map((bookmark) => (
                            <SortableBookmark 
                              key={bookmark.id} 
                              bookmark={bookmark} 
                              category={category} 
                              handleDeleteBookmark={handleDeleteBookmark}
                              renderBookmarkIcon={renderBookmarkIcon}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 浮动拖拽预览 */}
            <DragOverlay dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: {
                  active: {
                    opacity: '0.5',
                  },
                },
              }),
            }}>
              {activeId && activeBookmark && activeCategory ? (
                <BookmarkCard 
                  bookmark={activeBookmark} 
                  category={activeCategory} 
                  isOverlay 
                  renderBookmarkIcon={renderBookmarkIcon}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      

      {/* 添加弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)] flex-shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={() => setAddType("bookmark")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    addType === "bookmark"
                      ? "bg-[var(--accent)] text-[var(--bg-primary)]"
                      : "bg-[var(--bg-secondary)] text-theme-muted hover:text-theme-primary"
                  }`}
                >
                  添加书签
                </button>
                <button
                  onClick={() => setAddType("category")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    addType === "category"
                      ? "bg-[var(--accent)] text-[var(--bg-primary)]"
                      : "bg-[var(--bg-secondary)] text-theme-muted hover:text-theme-primary"
                  }`}
                >
                  添加分类
                </button>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setPassword(""); setPasswordError(""); }}
                className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] text-theme-muted hover:text-theme-primary transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 弹窗内容（可滚动） */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {addType === "bookmark" ? (
                <>
                  <div>
                    <label className="block text-sm text-theme-muted mb-2">选择分类</label>
                    <select
                      value={newBookmark.categoryId}
                      onChange={(e) => setNewBookmark({ ...newBookmark, categoryId: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-theme-primary focus:outline-none focus:border-[var(--accent)]/50"
                    >
                      <option value="">请选择分类</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-theme-muted mb-2">标题</label>
                    <input
                      type="text"
                      value={newBookmark.title}
                      onChange={(e) => setNewBookmark({ ...newBookmark, title: e.target.value })}
                      placeholder="网站名称"
                      className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-theme-primary placeholder-theme-muted focus:outline-none focus:border-[var(--accent)]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-theme-muted mb-2">链接</label>
                    <input
                      type="url"
                      value={newBookmark.url}
                      onChange={(e) => setNewBookmark({ ...newBookmark, url: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-theme-primary placeholder-theme-muted focus:outline-none focus:border-[var(--accent)]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-theme-muted mb-2">描述（可选）</label>
                    <input
                      type="text"
                      value={newBookmark.description}
                      onChange={(e) => setNewBookmark({ ...newBookmark, description: e.target.value })}
                      placeholder="简短描述"
                      className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-theme-primary placeholder-theme-muted focus:outline-none focus:border-[var(--accent)]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-theme-muted mb-2">
                      自定义图标（可选，不上传则自动获取网站图标）
                    </label>
                    <ImageUploader
                      password={password}
                      currentUrl={newBookmark.iconUrl}
                      onUploaded={(url) => setNewBookmark({ ...newBookmark, iconUrl: url })}
                      placeholder="上传自定义图标（留空自动抓取）"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm text-theme-muted mb-2">分类名称</label>
                    <input
                      type="text"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      placeholder="例如：常用工具"
                      className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-theme-primary placeholder-theme-muted focus:outline-none focus:border-[var(--accent)]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-theme-muted mb-2">
                      图标（优先使用上传图片）
                    </label>
                    <ImageUploader
                      password={password}
                      currentUrl={newCategory.iconUrl}
                      onUploaded={(url) => setNewCategory({ ...newCategory, iconUrl: url, icon: url || "📁" })}
                      placeholder="上传分类图标"
                    />
                    {!newCategory.iconUrl && (
                      <input
                        type="text"
                        value={newCategory.icon}
                        onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                        placeholder="或输入 Emoji，例如 📁"
                        className="mt-2 w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-theme-primary placeholder-theme-muted focus:outline-none focus:border-[var(--accent)]/50"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-theme-muted mb-2">主题色</label>
                    <div className="flex gap-2">
                      {["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EC4899", "#6366F1"].map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewCategory({ ...newCategory, color })}
                          className={`w-10 h-10 rounded-xl transition-all ${
                            newCategory.color === color ? "ring-2 ring-offset-2 ring-offset-[var(--bg-primary)]" : ""
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* 密码输入 */}
              <div className="pt-2 border-t border-[var(--border-color)]">
                <label className="block text-sm text-theme-muted mb-2">
                  <svg className="w-4 h-4 inline mr-1 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  管理密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                  placeholder="请输入管理密码"
                  className={`w-full px-4 py-3 bg-[var(--bg-secondary)] border rounded-xl text-theme-primary placeholder-theme-muted focus:outline-none focus:border-[var(--accent)]/50 transition-all ${
                    passwordError ? "border-red-500/50" : "border-[var(--border-color)]"
                  }`}
                  onKeyDown={(e) => { if (e.key === "Enter") addType === "bookmark" ? handleAddBookmark() : handleAddCategory(); }}
                />
                {passwordError && (
                  <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {passwordError}
                  </p>
                )}
              </div>

              <button
                onClick={addType === "bookmark" ? handleAddBookmark : handleAddCategory}
                disabled={
                  submitting ||
                  !password ||
                  (addType === "bookmark" && (!newBookmark.title || !newBookmark.url || !newBookmark.categoryId)) ||
                  (addType === "category" && !newCategory.name)
                }
                className="w-full py-3 bg-[var(--accent)] text-[var(--bg-primary)] font-medium rounded-xl hover:bg-[var(--accent-hover)] hover:shadow-lg hover:shadow-[var(--accent)]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {addType === "bookmark" ? "添加书签" : "添加分类"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
