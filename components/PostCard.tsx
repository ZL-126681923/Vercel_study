import Link from "next/link";
import type { PostMeta } from "@/types/post";
import { formatDate } from "@/lib/utils";

interface PostCardProps {
  post: PostMeta;
  featured?: boolean;
}

export default function PostCard({ post, featured = false }: PostCardProps) {
  if (featured) {
    return (
      <Link href={`/blog/${post.slug}`} className="group block">
        <article className="relative overflow-hidden rounded-2xl card hover:border-[var(--accent)] transition-all duration-500">
          {post.coverImage && (
            <div className="aspect-[2/1] overflow-hidden">
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/50 to-transparent" />
            </div>
          )}
          <div className={`p-8 ${post.coverImage ? "absolute bottom-0 left-0 right-0" : ""}`}>
            <div className="flex items-center gap-3 mb-4">
              <time className="text-theme-accent text-sm font-mono opacity-80">
                {formatDate(post.publishedAt)}
              </time>
              {post.tags && post.tags.length > 0 && (
                <>
                  <span className="text-theme-muted">·</span>
                  <span className="text-theme-muted text-sm">{post.tags[0]}</span>
                </>
              )}
            </div>
            <h2 className="font-serif text-2xl md:text-3xl text-theme-primary mb-3 group-hover:text-[var(--accent)] transition-colors duration-300">
              {post.title}
            </h2>
            <p className="text-theme-secondary line-clamp-2 leading-relaxed">
              {post.summary}
            </p>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="p-6 rounded-xl card hover:border-[var(--accent)] transition-all duration-300">
        <div className="flex items-center gap-3 mb-3">
          <time className="text-theme-accent text-xs font-mono opacity-80">
            {formatDate(post.publishedAt)}
          </time>
          {post.tags && post.tags.length > 0 && (
            <>
              <span className="text-theme-muted">·</span>
              <span className="text-theme-muted text-xs">{post.tags[0]}</span>
            </>
          )}
        </div>
        <h3 className="font-serif text-lg text-theme-primary mb-2 group-hover:text-[var(--accent)] transition-colors duration-300">
          {post.title}
        </h3>
        <p className="text-theme-muted text-sm line-clamp-2 leading-relaxed">
          {post.summary}
        </p>
      </article>
    </Link>
  );
}
