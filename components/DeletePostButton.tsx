"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  slug: string;
  title: string;
  /** 删除成功后跳转，默认跳回文章列表 */
  redirectTo?: string;
  /** 紧凑模式：仅显示图标（用于卡片悬停） */
  compact?: boolean;
}

export default function DeletePostButton({ slug, title, redirectTo = "/blog", compact = false }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!password) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(
        `/api/posts?slug=${encodeURIComponent(slug)}&password=${encodeURIComponent(password)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.code === 0) {
        setShowModal(false);
        router.push(redirectTo);
        router.refresh();
      } else {
        setError(data.message || "删除失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {compact ? (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowModal(true); setError(""); }}
          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
          title="删除文章"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      ) : (
        <button
          onClick={() => { setShowModal(true); setError(""); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          删除文章
        </button>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setPassword(""); }}}
        >
          <div className="w-full max-w-sm bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-theme-primary">确认删除文章</h3>
                  <p className="text-xs text-theme-muted mt-0.5 line-clamp-1">《{title}》</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-theme-secondary">
                此操作将永久删除文章文件，无法恢复，请输入管理密码确认。
              </p>

              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="请输入管理密码"
                  onKeyDown={(e) => e.key === "Enter" && handleDelete()}
                  autoFocus
                  className={`w-full px-4 py-3 bg-[var(--bg-secondary)] border rounded-xl text-theme-primary placeholder-theme-muted focus:outline-none focus:border-red-500/50 transition-all ${
                    error ? "border-red-500/50" : "border-[var(--border-color)]"
                  }`}
                />
                {error && (
                  <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowModal(false); setPassword(""); setError(""); }}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-theme-muted hover:text-theme-primary transition-all text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting || !password}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : "确认删除"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
