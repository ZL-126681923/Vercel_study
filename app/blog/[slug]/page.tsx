import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostBySlug } from "@/lib/posts";
import { formatDate } from "@/lib/utils";
import PostContent from "@/components/PostContent";
import DeletePostButton from "@/components/DeletePostButton";
import type { Metadata } from "next";

// 强制动态渲染，上传新文章后无需重新构建即可访问
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return { title: "文章未找到" };
  }

  return {
    title: post.title,
    description: post.summary,
    openGraph: {
      title: post.title,
      description: post.summary,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      images: post.coverImage ? [post.coverImage] : [],
    },
  };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="min-h-screen">
      {/* Hero */}
      <header className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 noise-bg" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-[var(--accent)]/4 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-6">
          {/* 顶部导航栏：返回 + 删除 */}
          <div className="flex items-center justify-between mb-10">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-theme-muted hover:text-[var(--accent)] transition-colors group"
            >
              <svg
                className="w-4 h-4 transition-transform group-hover:-translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              返回文章列表
            </Link>
            <DeletePostButton slug={post.slug} title={post.title} />
          </div>

          {/* Meta：日期 + 标签 */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <time className="text-[var(--accent)] font-mono text-sm tracking-wide">
              {formatDate(post.publishedAt)}
            </time>
            {post.tags && post.tags.length > 0 && (
              <>
                <span className="text-theme-muted opacity-60">·</span>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-xs text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-theme-primary leading-tight mb-6">
            {post.title}
          </h1>

          {/* Summary */}
          {post.summary && (
            <p className="text-theme-secondary text-lg leading-relaxed border-l-2 border-[var(--accent)]/40 pl-4">
              {post.summary}
            </p>
          )}
        </div>
      </header>

      {/* Cover Image */}
      {post.coverImage && (
        <div className="max-w-6xl mx-auto px-6 -mt-4 mb-12">
          <div className="aspect-[2/1] rounded-2xl overflow-hidden border border-[var(--border-color)]">
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Content — 加宽到 max-w-4xl */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <PostContent html={post.content} />

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-[var(--border-color)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {post.updatedAt && (
              <p className="text-theme-muted text-sm">
                最后更新于 {formatDate(post.updatedAt)}
              </p>
            )}
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors group"
            >
              阅读更多文章
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </footer>
      </div>
    </article>
  );
}
