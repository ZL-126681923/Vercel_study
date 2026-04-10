import Link from "next/link";
import FrontendToolLab from "@/components/FrontendToolLab";

export default function BookmarksLabPage() {
  return (
    <div className="min-h-screen">
      <div className="relative border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/40">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <Link
            href="/bookmarks"
            className="group inline-flex items-center gap-1.5 text-xs tracking-wide text-[var(--text-muted)] transition-colors duration-200 hover:text-[var(--accent)]"
          >
            <svg className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回收藏
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8 md:py-10">
        <FrontendToolLab />
      </div>
    </div>
  );
}
