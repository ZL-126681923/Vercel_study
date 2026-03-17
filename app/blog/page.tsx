import { getAllPosts } from "@/lib/posts";
import BlogFilter from "@/components/BlogFilter";
import UploadPostButton from "@/components/UploadPostButton";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

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
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-[var(--accent)]/4 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div className="text-center sm:text-left">
              <h1 className="font-serif text-4xl md:text-5xl text-theme-primary mb-4">
                全部文章
              </h1>
              <p className="text-theme-secondary text-lg">
                记录技术探索与思考
              </p>
            </div>
            <div className="flex justify-center sm:justify-end">
              <UploadPostButton />
            </div>
          </div>
        </div>
      </section>

      {/* Filter + Posts */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        {posts.length > 0 ? (
          <BlogFilter posts={posts} />
        ) : (
          <div className="text-center py-24">
            <div className="text-theme-muted text-6xl mb-6">📝</div>
            <h2 className="font-serif text-2xl text-theme-primary mb-4">还没有文章</h2>
            <p className="text-theme-muted mb-6">
              点击「导入 MD 文章」按钮，上传 Markdown 文件开始写作
            </p>
            <UploadPostButton />
          </div>
        )}
      </section>
    </div>
  );
}
