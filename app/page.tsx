import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import DailyPoemMini from "@/components/DailyPoemMini";
import PoemSearch from "@/components/PoemSearch";

export default function HomePage() {
  const posts = getAllPosts();
  const featuredPost = posts[0];
  const recentPosts = posts.slice(1, 5);

  return (
    <div className="relative">
      {/* Fixed Daily Poem Mini - Top Left */}
      <DailyPoemMini />

      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden noise-bg">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-theme-primary mb-6 opacity-0 animate-fade-in-up">
            墨
            <span className="gradient-text">迹</span>
          </h1>
          <p className="text-theme-secondary text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed opacity-0 animate-fade-in-up animation-delay-200">
            在代码与文字之间，记录思考的轨迹。
            <br />
            探索技术的深度，分享创造的喜悦。
          </p>
          <div className="flex items-center justify-center gap-4 opacity-0 animate-fade-in-up animation-delay-300">
            <Link
              href="/blog"
              className="btn-primary px-8 py-3 font-medium rounded-full hover:shadow-lg hover:shadow-amber-500/25"
            >
              浏览文章
            </Link>
            <Link
              href="/about"
              className="px-8 py-3 border border-theme text-theme-secondary hover:text-theme-primary rounded-full transition-all duration-300"
            >
              了解更多
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 animate-fade-in animation-delay-400">
          <div className="w-6 h-10 border-2 border-theme rounded-full flex justify-center">
            <div className="w-1 h-2 bg-theme-muted rounded-full mt-2 animate-bounce" />
          </div>
        </div>
      </section>

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

      {/* Poem Search Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="font-serif text-2xl text-theme-primary">诗词探索</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-[var(--border-color)] to-transparent" />
        </div>
        <PoemSearch />
      </section>
    </div>
  );
}
