import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostBySlug, getAllPostSlugs } from "@/lib/posts";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
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
      <header className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 noise-bg" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-3xl mx-auto px-6">
          {/* Back link */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-stone-500 hover:text-amber-400 transition-colors mb-8 group"
          >
            <svg
              className="w-4 h-4 transition-transform group-hover:-translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            返回文章列表
          </Link>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <time className="text-amber-400 font-mono text-sm">
              {formatDate(post.publishedAt)}
            </time>
            {post.tags && post.tags.length > 0 && (
              <>
                <span className="text-stone-600">·</span>
                <div className="flex gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-xs text-stone-400 bg-stone-800/50 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-stone-100 leading-tight mb-6">
            {post.title}
          </h1>

          {/* Summary */}
          <p className="text-stone-400 text-lg leading-relaxed">
            {post.summary}
          </p>
        </div>
      </header>

      {/* Cover Image */}
      {post.coverImage && (
        <div className="max-w-4xl mx-auto px-6 -mt-8 mb-12">
          <div className="aspect-[2/1] rounded-2xl overflow-hidden border border-stone-800/50">
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 pb-24">
        <div
          className="prose prose-lg prose-stone prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-stone-800/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {post.updatedAt && (
              <p className="text-stone-500 text-sm">
                最后更新于 {formatDate(post.updatedAt)}
              </p>
            )}
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors group"
            >
              阅读更多文章
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </footer>
      </div>
    </article>
  );
}
