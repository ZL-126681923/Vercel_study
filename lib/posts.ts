import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import type { Post, PostMeta } from "@/types/post";

const postsDirectory = path.join(process.cwd(), "content");

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }
  const fileNames = fs.readdirSync(postsDirectory);
  return fileNames
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""));
}

export function getAllPosts(): PostMeta[] {
  const slugs = getAllPostSlugs();
  const posts = slugs
    .map((slug) => getPostMeta(slug))
    .filter((post): post is PostMeta => post !== null)
    .sort((a, b) => (a.publishedAt > b.publishedAt ? -1 : 1));
  return posts;
}

export function getPostMeta(slug: string): PostMeta | null {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data } = matter(fileContents);

  return {
    slug,
    title: data.title || "Untitled",
    summary: data.summary || "",
    publishedAt: data.publishedAt || new Date().toISOString(),
    tags: data.tags || [],
    coverImage: data.coverImage,
  };
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  const processedContent = await remark().use(html).process(content);
  const contentHtml = processedContent.toString();

  return {
    slug,
    title: data.title || "Untitled",
    summary: data.summary || "",
    content: contentHtml,
    publishedAt: data.publishedAt || new Date().toISOString(),
    updatedAt: data.updatedAt,
    tags: data.tags || [],
    coverImage: data.coverImage,
    author: data.author,
  };
}
