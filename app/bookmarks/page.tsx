import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "实用网站收藏",
  description: "精心整理的实用网站收藏，涵盖开发工具、设计资源、学习平台等。",
};

interface Bookmark {
  name: string;
  url: string;
  description: string;
}

interface Category {
  name: string;
  icon: string;
  color: string;
  bookmarks: Bookmark[];
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return "";
  }
}

const categories: Category[] = [
  {
    name: "开发工具",
    icon: "🛠️",
    color: "from-blue-500 to-cyan-500",
    bookmarks: [
      {
        name: "GitHub",
        url: "https://github.com",
        description: "全球最大的代码托管平台",
      },
      {
        name: "Gitee",
        url: "https://gitee.com",
        description: "国内代码托管平台，速度快",
      },
      {
        name: "VS Code",
        url: "https://code.visualstudio.com",
        description: "强大的代码编辑器",
      },
      {
        name: "CodePen",
        url: "https://codepen.io",
        description: "在线前端代码编辑器",
      },
      {
        name: "StackBlitz",
        url: "https://stackblitz.com",
        description: "在线 IDE，支持多种框架",
      },
      {
        name: "Vercel",
        url: "https://vercel.com",
        description: "现代化部署平台",
      },
    ],
  },
  {
    name: "设计资源",
    icon: "🎨",
    color: "from-pink-500 to-rose-500",
    bookmarks: [
      {
        name: "Figma",
        url: "https://figma.com",
        description: "协作设计工具",
      },
      {
        name: "Dribbble",
        url: "https://dribbble.com",
        description: "设计师作品展示平台",
      },
      {
        name: "Unsplash",
        url: "https://unsplash.com",
        description: "免费高质量图片",
      },
      {
        name: "IconFont",
        url: "https://www.iconfont.cn",
        description: "阿里巴巴图标库",
      },
      {
        name: "Coolors",
        url: "https://coolors.co",
        description: "配色方案生成器",
      },
      {
        name: "Google Fonts",
        url: "https://fonts.google.com",
        description: "免费字体库",
      },
    ],
  },
  {
    name: "学习平台",
    icon: "📚",
    color: "from-green-500 to-emerald-500",
    bookmarks: [
      {
        name: "MDN Web Docs",
        url: "https://developer.mozilla.org",
        description: "Web 技术权威文档",
      },
      {
        name: "掘金",
        url: "https://juejin.cn",
        description: "开发者社区",
      },
      {
        name: "CSDN",
        url: "https://csdn.net",
        description: "中文 IT 社区",
      },
      {
        name: "LeetCode",
        url: "https://leetcode.cn",
        description: "算法练习平台",
      },
      {
        name: "React 官网",
        url: "https://react.dev",
        description: "React 官方文档",
      },
      {
        name: "Next.js",
        url: "https://nextjs.org",
        description: "Next.js 官方文档",
      },
    ],
  },
  {
    name: "AI 工具",
    icon: "🤖",
    color: "from-purple-500 to-violet-500",
    bookmarks: [
      {
        name: "ChatGPT",
        url: "https://chat.openai.com",
        description: "OpenAI 对话 AI",
      },
      {
        name: "Claude",
        url: "https://claude.ai",
        description: "Anthropic AI 助手",
      },
      {
        name: "Midjourney",
        url: "https://midjourney.com",
        description: "AI 图像生成",
      },
      {
        name: "Cursor",
        url: "https://cursor.sh",
        description: "AI 编程助手",
      },
      {
        name: "Notion AI",
        url: "https://notion.so",
        description: "AI 笔记工具",
      },
      {
        name: "Copilot",
        url: "https://github.com/features/copilot",
        description: "GitHub AI 编程助手",
      },
    ],
  },
  {
    name: "效率工具",
    icon: "⚡",
    color: "from-amber-500 to-orange-500",
    bookmarks: [
      {
        name: "Notion",
        url: "https://notion.so",
        description: "全能笔记与协作",
      },
      {
        name: "Obsidian",
        url: "https://obsidian.md",
        description: "本地知识库",
      },
      {
        name: "Excalidraw",
        url: "https://excalidraw.com",
        description: "手绘风格白板",
      },
      {
        name: "TinyPNG",
        url: "https://tinypng.com",
        description: "图片压缩工具",
      },
      {
        name: "Carbon",
        url: "https://carbon.now.sh",
        description: "代码截图美化",
      },
      {
        name: "Regex101",
        url: "https://regex101.com",
        description: "正则表达式测试",
      },
    ],
  },
  {
    name: "技术文档",
    icon: "📄",
    color: "from-teal-500 to-cyan-500",
    bookmarks: [
      {
        name: "TypeScript",
        url: "https://typescriptlang.org",
        description: "TypeScript 官方文档",
      },
      {
        name: "Tailwind CSS",
        url: "https://tailwindcss.com",
        description: "原子化 CSS 框架",
      },
      {
        name: "Node.js",
        url: "https://nodejs.org",
        description: "Node.js 官方文档",
      },
      {
        name: "Prisma",
        url: "https://prisma.io",
        description: "现代 ORM 工具",
      },
      {
        name: "Docker",
        url: "https://docs.docker.com",
        description: "容器化技术文档",
      },
      {
        name: "Kubernetes",
        url: "https://kubernetes.io",
        description: "容器编排文档",
      },
    ],
  },
];

function BookmarkCard({ bookmark }: { bookmark: Bookmark }) {
  const faviconUrl = getFaviconUrl(bookmark.url);
  
  return (
    <a
      href={bookmark.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-amber-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-1"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-110 transition-transform duration-300">
          <Image
            src={faviconUrl}
            alt={bookmark.name}
            width={32}
            height={32}
            className="w-8 h-8 object-contain"
            unoptimized
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-theme-primary group-hover:text-amber-500 transition-colors truncate">
            {bookmark.name}
          </h3>
          <p className="text-sm text-theme-muted mt-1 line-clamp-2">
            {bookmark.description}
          </p>
        </div>
        <svg
          className="w-5 h-5 text-theme-muted group-hover:text-amber-500 transition-all duration-300 group-hover:translate-x-1 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </div>
    </a>
  );
}

function CategorySection({ category }: { category: Category }) {
  return (
    <section className="mb-16">
      <div className="flex items-center gap-4 mb-8">
        <div
          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center text-2xl shadow-lg`}
        >
          {category.icon}
        </div>
        <div>
          <h2 className="font-serif text-2xl text-theme-primary">
            {category.name}
          </h2>
          <p className="text-sm text-theme-muted">
            {category.bookmarks.length} 个网站
          </p>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-[var(--border-color)] to-transparent" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {category.bookmarks.map((bookmark) => (
          <BookmarkCard key={bookmark.url} bookmark={bookmark} />
        ))}
      </div>
    </section>
  );
}

export default function BookmarksPage() {
  const totalBookmarks = categories.reduce(
    (acc, cat) => acc + cat.bookmarks.length,
    0
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 noise-bg" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-500 text-sm mb-6">
            <span>🔖</span>
            <span>精选收藏</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-theme-primary mb-6">
            实用网站
            <span className="gradient-text">收藏夹</span>
          </h1>
          <p className="text-theme-secondary text-lg max-w-2xl mx-auto leading-relaxed">
            精心整理的开发者工具箱，涵盖开发、设计、学习、AI
            等多个领域，助你提升效率。
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mt-10">
            <div className="text-center">
              <div className="font-serif text-3xl text-amber-500">
                {categories.length}
              </div>
              <div className="text-sm text-theme-muted">个分类</div>
            </div>
            <div className="w-px h-10 bg-[var(--border-color)]" />
            <div className="text-center">
              <div className="font-serif text-3xl text-amber-500">
                {totalBookmarks}
              </div>
              <div className="text-sm text-theme-muted">个网站</div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Navigation */}
      <section className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {categories.map((category) => (
            <a
              key={category.name}
              href={`#${category.name}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border-color)] hover:border-amber-500/50 hover:bg-amber-500/5 text-theme-secondary hover:text-amber-500 text-sm transition-all duration-300"
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        {categories.map((category) => (
          <div key={category.name} id={category.name}>
            <CategorySection category={category} />
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl card p-12 text-center">
          <div className="absolute inset-0 noise-bg" />
          <div className="relative">
            <div className="text-5xl mb-6">💡</div>
            <h2 className="font-serif text-2xl md:text-3xl text-theme-primary mb-4">
              有好用的网站推荐？
            </h2>
            <p className="text-theme-secondary mb-8 max-w-md mx-auto">
              欢迎通过邮件或社交媒体联系我，分享你发现的优质资源。
            </p>
            <Link
              href="/about"
              className="btn-primary px-8 py-3 font-medium rounded-full hover:shadow-lg hover:shadow-amber-500/25 inline-flex items-center gap-2"
            >
              <span>联系我</span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
