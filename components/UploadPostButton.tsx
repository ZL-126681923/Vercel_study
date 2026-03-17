"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const PRESET_TAGS = [
  "前端", "后端", "全栈", "移动端", "桌面端",
  "JavaScript", "TypeScript", "Python", "Go", "Rust", "Java",
  "React", "Vue", "Next.js", "Node.js",
  "数据库", "DevOps", "AI / ML",
  "工具", "教程", "笔记", "随笔", "翻译",
];

export default function UploadPostButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ name: string; size: string } | null>(null);

  // 新增：标题和标签
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const resetForm = () => {
    setShowModal(false);
    setError("");
    setPassword("");
    setPendingFile(null);
    setPreview(null);
    setTitle("");
    setTags([]);
    setTagInput("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".md")) {
      setError("只支持 .md 格式的 Markdown 文件");
      return;
    }
    setPendingFile(file);
    setPreview({ name: file.name, size: (file.size / 1024).toFixed(1) + " KB" });
    // 用文件名（去掉扩展名）预填标题
    setTitle(file.name.replace(/\.md$/i, ""));
    setShowModal(true);
    setError("");
    e.target.value = "";
  };

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleUpload = async () => {
    if (!pendingFile || !password) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", pendingFile);
      fd.append("password", password);
      if (title.trim()) fd.append("title", title.trim());
      if (tags.length > 0) fd.append("tags", JSON.stringify(tags));

      const res = await fetch("/api/posts", { method: "POST", body: fd });
      const data = await res.json();
      if (data.code === 0) {
        resetForm();
        router.push(`/blog/${data.slug}`);
      } else {
        setError(data.message || "上传失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-[var(--bg-primary)] text-sm font-medium rounded-xl hover:bg-[var(--accent-hover)] hover:shadow-lg hover:shadow-[var(--accent)]/20 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        导入 MD 文章
      </button>
      <input ref={inputRef} type="file" accept=".md" className="hidden" onChange={handleFileChange} />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] shadow-2xl overflow-hidden">
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
              <h3 className="font-medium text-theme-primary">导入 Markdown 文章</h3>
              <button
                onClick={resetForm}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-theme-muted transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* 文件预览 */}
              {preview && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-theme-primary truncate">{preview.name}</p>
                    <p className="text-xs text-theme-muted">{preview.size}</p>
                  </div>
                </div>
              )}

              {/* 标题 */}
              <div>
                <label className="block text-sm text-theme-muted mb-1.5">文章标题</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="留空则自动从文件名或首行标题提取"
                  className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-theme-primary placeholder-theme-muted focus:outline-none focus:border-[var(--accent)]/50 transition-all text-sm"
                />
              </div>

              {/* 标签 */}
              <div>
                <label className="block text-sm text-theme-muted mb-1.5">文章标签</label>
                {/* 已选标签 */}
                <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] text-xs font-medium"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-400 transition-colors leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                {/* 输入框 */}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  onBlur={() => tagInput.trim() && addTag(tagInput)}
                  placeholder="输入后按 Enter 或逗号添加标签"
                  className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-theme-primary placeholder-theme-muted focus:outline-none focus:border-[var(--accent)]/50 transition-all text-sm"
                />
                {/* 预设标签快速选择 */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {PRESET_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => addTag(tag)}
                      className="px-2 py-0.5 rounded-lg border border-[var(--border-color)] text-theme-muted hover:border-[var(--accent)]/50 hover:text-[var(--accent)] text-xs transition-all"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 密码 */}
              <div>
                <label className="block text-sm text-theme-muted mb-1.5">
                  <svg className="w-3.5 h-3.5 inline mr-1 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  管理密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="请输入管理密码"
                  onKeyDown={(e) => e.key === "Enter" && handleUpload()}
                  className={`w-full px-4 py-2.5 bg-[var(--bg-secondary)] border rounded-xl text-theme-primary placeholder-theme-muted focus:outline-none focus:border-[var(--accent)]/50 transition-all text-sm ${
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

              <button
                onClick={handleUpload}
                disabled={uploading || !password}
                className="w-full py-3 bg-[var(--accent)] text-[var(--bg-primary)] font-medium rounded-xl hover:bg-[var(--accent-hover)] hover:shadow-lg hover:shadow-[var(--accent)]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    确认上传
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
