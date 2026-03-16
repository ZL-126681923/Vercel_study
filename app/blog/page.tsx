import { getAllPosts } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "全部文章",
  description: "浏览所有博客文章，探索技术与思考的交汇点。",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 noise-bg" />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <h1 className="font-serif text-4xl md:text-5xl text-stone-100 mb-4">
            全部文章
          </h1>
          <p className="text-stone-400 text-lg max-w-xl mx-auto">
            共 {posts.length} 篇文章，记录技术探索与思考
          </p>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, index) => (
              <div
                key={post.slug}
                className="opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms`, animationFillMode: "forwards" }}
              >
                <PostCard post={post} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <div className="text-stone-600 text-6xl mb-6">📝</div>
            <h2 className="font-serif text-2xl text-stone-300 mb-4">
              还没有文章
            </h2>
            <p className="text-stone-500">
              在 <code className="text-amber-400">content/</code> 目录下添加 Markdown 文件开始写作
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
