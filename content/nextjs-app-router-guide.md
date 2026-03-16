---
title: Next.js App Router 完全指南
summary: 深入理解 Next.js 13+ 的 App Router 架构，包括服务端组件、数据获取、路由处理等核心概念。
publishedAt: 2026-03-15
updatedAt: 2026-03-16
tags:
  - Next.js
  - React
  - 教程
coverImage: https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=600&fit=crop
author:
  name: 墨迹
---

## 什么是 App Router

Next.js 13 引入了全新的 App Router，这是基于 React Server Components 构建的路由系统。它带来了许多激动人心的新特性。

## 核心概念

### 服务端组件 vs 客户端组件

默认情况下，App Router 中的所有组件都是**服务端组件**。

```tsx
// 这是一个服务端组件（默认）
export default async function Page() {
  const data = await fetchData(); // 可以直接使用 async/await
  return <div>{data.title}</div>;
}
```

如果需要使用客户端特性（如 useState、useEffect），需要添加 `"use client"` 指令：

```tsx
"use client";

import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### 文件系统路由

App Router 使用文件系统来定义路由：

```
app/
├── page.tsx        → /
├── about/
│   └── page.tsx    → /about
├── blog/
│   ├── page.tsx    → /blog
│   └── [slug]/
│       └── page.tsx → /blog/:slug
└── layout.tsx      → 共享布局
```

### 数据获取

在服务端组件中，你可以直接使用 async/await 获取数据：

```tsx
async function getPosts() {
  const res = await fetch("https://api.example.com/posts", {
    next: { revalidate: 3600 }, // ISR: 每小时重新验证
  });
  return res.json();
}

export default async function BlogPage() {
  const posts = await getPosts();
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

## 最佳实践

1. **优先使用服务端组件** - 减少客户端 JavaScript 体积
2. **合理使用缓存** - 利用 fetch 的缓存选项优化性能
3. **流式渲染** - 使用 Suspense 提升用户体验
4. **代码分割** - 通过动态导入按需加载组件

## 总结

App Router 代表了 React 应用架构的未来方向。虽然学习曲线略陡，但掌握后能够构建出性能更好、用户体验更佳的应用。
