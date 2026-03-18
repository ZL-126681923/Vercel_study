import Link from "next/link";
import { getAllPosts, getFeaturedPost } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import DailyPoemMini from "@/components/DailyPoemMini";
import HomeHero from "@/components/HomeHero";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const posts = getAllPosts();
  const featuredPost = getFeaturedPost(posts);
  // 最新文章排除精选那篇，避免重复
  const recentPosts = posts.filter(p => p.slug !== featuredPost?.slug).slice(0, 4);

  return (
    <div className="relative">
      {/* Fixed Daily Poem Mini - Top Left */}
      <DailyPoemMini />

      {/* Hero Section */}
      <HomeHero />

      {/* Featured Post */}
      {featuredPost && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-serif text-2xl text-theme-primary">精选文章</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-[var(--border-color)] to-transparent" />
          </div>
          <PostCard post={featuredPost} featured />
        </section>
      )}

      {/* Recent Posts */}
      {recentPosts.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <h2 className="font-serif text-2xl text-theme-primary">最新文章</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-[var(--border-color)] to-transparent w-32" />
            </div>
            <Link
              href="/blog"
              className="text-theme-muted hover:text-theme-accent text-sm transition-colors flex items-center gap-1 group"
            >
              查看全部
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentPosts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {posts.length === 0 && (
        <section className="max-w-6xl mx-auto px-6 py-24 text-center">
          <div className="text-theme-muted text-6xl mb-6">📝</div>
          <h2 className="font-serif text-2xl text-theme-secondary mb-4">
            还没有文章
          </h2>
          <p className="text-theme-muted mb-8">
            在 content/ 目录下添加 Markdown 文件开始写作吧
          </p>
        </section>
      )}

    </div>
  );
}
