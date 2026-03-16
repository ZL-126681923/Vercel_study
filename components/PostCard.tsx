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
        <article className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-900 to-stone-800 border border-stone-800/50 hover:border-amber-500/30 transition-all duration-500">
          {post.coverImage && (
            <div className="aspect-[2/1] overflow-hidden">
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent" />
            </div>
          )}
          <div className={`p-8 ${post.coverImage ? "absolute bottom-0 left-0 right-0" : ""}`}>
            <div className="flex items-center gap-3 mb-4">
              <time className="text-amber-400/80 text-sm font-mono">
                {formatDate(post.publishedAt)}
              </time>
              {post.tags && post.tags.length > 0 && (
                <>
                  <span className="text-stone-600">·</span>
                  <span className="text-stone-500 text-sm">{post.tags[0]}</span>
                </>
              )}
            </div>
            <h2 className="font-serif text-2xl md:text-3xl text-stone-100 mb-3 group-hover:text-amber-400 transition-colors duration-300">
              {post.title}
            </h2>
            <p className="text-stone-400 line-clamp-2 leading-relaxed">
              {post.summary}
            </p>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="p-6 rounded-xl bg-stone-900/50 border border-stone-800/50 hover:border-amber-500/30 hover:bg-stone-900 transition-all duration-300">
        <div className="flex items-center gap-3 mb-3">
          <time className="text-amber-400/80 text-xs font-mono">
            {formatDate(post.publishedAt)}
          </time>
          {post.tags && post.tags.length > 0 && (
            <>
              <span className="text-stone-700">·</span>
              <span className="text-stone-500 text-xs">{post.tags[0]}</span>
            </>
          )}
        </div>
        <h3 className="font-serif text-lg text-stone-100 mb-2 group-hover:text-amber-400 transition-colors duration-300">
          {post.title}
        </h3>
        <p className="text-stone-500 text-sm line-clamp-2 leading-relaxed">
          {post.summary}
        </p>
      </article>
    </Link>
  );
}
