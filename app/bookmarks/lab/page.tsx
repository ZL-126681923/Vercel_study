import Link from "next/link";
import FrontendToolLab from "@/components/FrontendToolLab";

export default function BookmarksLabPage() {
  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="absolute inset-0 noise-bg opacity-40" />
        <div className="absolute right-0 top-0 h-96 w-96 translate-x-1/3 -translate-y-1/3 rounded-full bg-[var(--accent)]/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 -translate-x-1/3 translate-y-1/3 rounded-full bg-[var(--accent)]/5 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 py-10">
          <Link
            href="/bookmarks"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)]/55 px-4 py-2 text-sm text-theme-secondary transition-all hover:border-[var(--accent)]/35 hover:text-theme-primary"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回收藏页
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <FrontendToolLab />
      </div>
    </div>
  );
}
