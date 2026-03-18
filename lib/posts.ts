import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { Element } from "hast";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import chardet from "chardet";
import iconv from "iconv-lite";
import type { Post, PostMeta } from "@/types/post";

const postsDirectory = path.join(process.cwd(), "content");

// ─── 内存缓存 ────────────────────────────────────────────────────────────────
// 列表缓存：用"文件数量 + 所有文件 mtime 之和"做 key，任何变化都会失效
let metaCache: { key: string; posts: PostMeta[] } | null = null;

// 文章详情缓存：slug → { fileMtime, post }
const postCache = new Map<string, { fileMtime: number; post: Post }>();

/** 生成目录指纹：文件名列表 + 各文件 mtime 拼接，Windows 下比目录 mtime 更可靠 */
function getDirFingerprint(): string {
  try {
    if (!fs.existsSync(postsDirectory)) return "empty";
    const files = fs.readdirSync(postsDirectory).filter(f => f.endsWith(".md")).sort();
    const mtimes = files.map(f => {
      try { return fs.statSync(path.join(postsDirectory, f)).mtimeMs; } catch { return 0; }
    });
    return `${files.length}:${mtimes.join(",")}`;
  } catch {
    return "error";
  }
}

/** 获取文件最后修改时间（毫秒），不存在时返回 0 */
function getFileMtime(filePath: string): number {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}
// ─────────────────────────────────────────────────────────────────────────────

/** 读取文件，自动检测编码转为 UTF-8 字符串（只取前 4KB 做编码检测，节省 CPU） */
function readFileUtf8(filePath: string): string {
  const buf = fs.readFileSync(filePath);

  // BOM UTF-8
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.slice(3).toString("utf-8");
  }

  // 只用前 4096 字节做编码探测，大文件无需全量扫描
  const sample = buf.length > 4096 ? buf.slice(0, 4096) : buf;
  const detected = chardet.detect(sample);
  const encoding = (detected || "utf-8").toLowerCase().replace(/-/g, "");

  if (encoding === "utf8" || encoding === "ascii") {
    return buf.toString("utf-8");
  }

  try {
    return iconv.decode(buf, detected!);
  } catch {
    return buf.toString("utf-8");
  }
}

async function markdownToHtml(markdown: string): Promise<string> {
  function rehypeNoReferrerImages() {
    return (tree: Parameters<typeof visit>[0]) => {
      visit(tree, "element", (node: Element) => {
        if (node.tagName === "img") {
          node.properties = node.properties ?? {};
          node.properties.referrerpolicy = "no-referrer";
          node.properties.loading = "lazy";
        }
      });
    };
  }

  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeHighlight, { detect: true })
    .use(rehypeNoReferrerImages)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);
  return result.toString();
}

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) return [];
  return fs
    .readdirSync(postsDirectory)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""));
}

export function getAllPosts(): PostMeta[] {
  const key = getDirFingerprint();

  // 缓存命中：文件集合没有任何变化，直接返回
  if (metaCache && metaCache.key === key) {
    return metaCache.posts;
  }

  // 缓存失效：重新读取所有文件的 front matter
  const posts = getAllPostSlugs()
    .map((slug) => getPostMeta(slug))
    .filter((post): post is PostMeta => post !== null)
    .sort((a, b) => {
      // 统一转为 Date 比较，兼容 "2026-03-16" 和 "2026-03-16T10:00:00.000Z" 两种格式
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

  metaCache = { key, posts };
  return posts;
}

/** 获取精选文章：优先取 featured:true 的，没有则取最新一篇 */
export function getFeaturedPost(posts: PostMeta[]): PostMeta | null {
  if (posts.length === 0) return null;
  return posts.find(p => p.featured) ?? posts[0];
}

export function getPostMeta(slug: string): PostMeta | null {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;
  try {
    const fileContents = readFileUtf8(fullPath);
    const { data } = matter(fileContents);
    return {
      slug,
      title: data.title || slug,
      summary: data.summary || "",
      publishedAt: data.publishedAt || new Date().toISOString(),
      tags: data.tags || [],
      coverImage: data.coverImage,
      featured: data.featured === true,
    };
  } catch {
    return null;
  }
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;

  const fileMtime = getFileMtime(fullPath);

  // 缓存命中：文件没有改动，直接返回
  const cached = postCache.get(slug);
  if (cached && cached.fileMtime === fileMtime) {
    return cached.post;
  }

  try {
    const fileContents = readFileUtf8(fullPath);
    const { data, content } = matter(fileContents);
    const contentHtml = await markdownToHtml(content);
    const post: Post = {
      slug,
      title: data.title || slug,
      summary: data.summary || "",
      content: contentHtml,
      publishedAt: data.publishedAt || new Date().toISOString(),
      updatedAt: data.updatedAt,
      tags: data.tags || [],
      coverImage: data.coverImage,
      author: data.author,
    };

    // 写入缓存
    postCache.set(slug, { fileMtime, post });

    // 防止缓存无限增长：超过 200 篇时淘汰最早的条目
    if (postCache.size > 200) {
      const firstKey = postCache.keys().next().value;
      if (firstKey !== undefined) postCache.delete(firstKey);
    }

    return post;
  } catch {
    return null;
  }
}

/** 上传/删除文章后调用，主动让列表缓存失效 */
export function invalidatePostsCache() {
  metaCache = null;
}
