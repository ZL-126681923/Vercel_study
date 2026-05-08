# 项目整体架构说明

本文档用于帮助你从全局理解这个项目：它是什么、有哪些模块、数据怎么流动、后续应该怎么扩展。

## 1. 项目定位

这是一个基于 **Next.js App Router + TypeScript** 构建的全栈个人博客项目。

它不是单一的博客展示站，而是一个以“内容发布”为核心，叠加了多个内容与工具子系统的综合站点，主要包括：

- 博客文章系统
- 诗歌内容系统
- 书签导航系统
- 地图可视化与实验性工具页面

从产品形态上看，它更像一个“个人内容中台”：

- 博客承载长期输出
- 诗歌模块承载内容专题
- 书签页承载资源导航
- 一些实验性页面承载交互探索

---

## 2. 技术栈总览

### 前端

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- ECharts / MapLibre（地图与可视化）
- dnd-kit（拖拽排序）

### 服务端

- Next.js Route Handlers（`app/api/**/route.ts`）
- Node.js 文件系统（`fs` / `path`）

### 内容处理

- gray-matter（解析 Markdown frontmatter）
- remark / rehype（Markdown 转 HTML）
- rehype-highlight（代码高亮）

### 测试与质量

- ESLint
- Playwright

这个项目没有接数据库，核心数据主要依赖：

- Markdown 文件
- JSON 文件
- 文件系统写入

所以它是一个典型的“轻量全栈内容站”。

---

## 3. 目录结构与职责

```text
app/          路由、页面、API 入口
components/   可复用 UI 组件
lib/          业务逻辑与数据处理
types/        共享类型定义
content/      博客 Markdown 内容
data/         JSON 数据源
public/       静态资源
tests/        E2E 测试
```

### 3.1 `app/`

这是整个项目的路由层。

包含两种内容：

1. 页面路由
2. API 路由

典型页面：

- `app/page.tsx`：首页
- `app/blog/page.tsx`：博客列表页
- `app/blog/[slug]/page.tsx`：博客详情页
- `app/bookmarks/page.tsx`：书签页
- `app/poems/page.tsx`：诗歌地图页
- `app/about/page.tsx`：关于页

典型 API：

- `app/api/posts/route.ts`
- `app/api/bookmarks/route.ts`
- `app/api/poems/**`
- `app/api/upload/route.ts`

### 3.2 `components/`

这里放通用或页面组合组件，偏 UI 层。

例如：

- 布局类：`Header.tsx`、`Footer.tsx`、`LayoutShell.tsx`
- 博客类：`PostCard.tsx`、`PostContent.tsx`、`BlogFilter.tsx`
- 诗歌类：`DailyPoem.tsx`、`DailyPoemMini.tsx`、`PoemSearch.tsx`、`PoemMap.tsx`
- 功能类：`ThemeProvider.tsx`、`ThemeToggle.tsx`、`UploadPostButton.tsx`

### 3.3 `lib/`

这里是项目真正的业务核心层。

当前最重要的文件有：

- `lib/posts.ts`：博客文章读取、缓存、Markdown 转 HTML
- `lib/poems.ts`：诗歌数据读取、规范化、搜索、推荐、点赞
- `lib/mao.ts`：毛主席诗词专题逻辑
- `lib/geoCache.ts`：地图数据缓存逻辑
- `lib/utils.ts`：日期格式化等工具函数

### 3.4 `content/`

博客文章源文件目录。

每篇文章一个 `.md` 文件，通过 `lib/posts.ts` 动态读取。

这意味着博客系统本质上是“文件驱动”的，而不是数据库驱动的。

### 3.5 `data/`

这里存放 JSON 数据源，当前是项目非常关键的一层：

- `tangshi.json` / `songci.json` / `yuanqu.json`：基础诗词数据
- `like.json`：推荐诗歌候选
- `map_poems.json`：学段诗歌主数据
- `mao.json`：毛主席诗词专题
- `bookmarks.json`：书签数据
- `likes_state.json`：诗歌点赞状态

### 3.6 `types/`

目前主要放跨模块共享的类型，例如 `types/post.ts`。

---

## 4. 页面架构

## 4.1 首页 `app/page.tsx`

首页承担三个职责：

- 品牌展示
- 精选文章展示
- 最新文章展示

它的数据来自 `lib/posts.ts`：

- `getAllPosts()`
- `getFeaturedPost()`

同时首页挂了 `DailyPoemMini`，用来展示轻量诗歌内容。

## 4.2 博客系统

博客系统由两层组成：

- 列表页：`app/blog/page.tsx`
- 详情页：`app/blog/[slug]/page.tsx`

博客数据流：

`content/*.md` → `lib/posts.ts` → 页面组件 → HTML 渲染

详情页支持：

- Metadata 生成
- 摘要显示
- 标签显示
- 封面图显示
- 删除文章

## 4.3 书签系统

书签页是一个资源导航系统，并且支持管理能力。

主要特点：

- 分类展示
- 拖拽排序
- 新增 / 删除分类和书签
- favicon 展示

它既是内容展示页，也是一个轻量后台能力页。

## 4.4 诗歌系统

诗歌系统是这个项目里除博客外最完整的第二条业务线。

当前包括：

- 首页推荐诗歌
- 小型轮播诗歌组件
- 搜索诗歌
- 学段诗歌
- 地图诗歌
- 点赞能力

诗歌页 `app/poems/page.tsx` 的核心是地图浏览体验。

---

## 5. API 架构

项目 API 基本遵循“route 只做入口，逻辑下沉到 lib”的思路。

### 5.1 文章相关

- `GET/DELETE /api/posts`
- `POST /api/upload`

职责：

- 上传 Markdown 文章
- 自动补 frontmatter
- 删除文章
- 读取文章列表

### 5.2 书签相关

- `GET /api/bookmarks`
- `POST /api/bookmarks`
- `DELETE /api/bookmarks`

职责：

- 获取书签
- 新增分类 / 新增书签
- 更新排序
- 删除书签或分类

### 5.3 诗歌相关

当前正式只保留 4 类核心接口：

- `GET /api/poems/search`
- `GET /api/poems/recommend`
- `GET /api/poems/stage`
- `GET/POST /api/poems/[id]/like`

这是当前项目中最清晰的一组内容型 API。

### 5.4 辅助接口

- `GET /api/health`：健康检查
- `GET /api/meta/dynasties`：元信息接口
- `GET /api/img/[filename]`：图片访问或代理
- `GET /api/mao-poems`：专题数据接口

---

## 6. 核心数据流

## 6.1 博客数据流

```text
content/*.md
  -> lib/posts.ts
  -> 页面读取
  -> Markdown 转 HTML
  -> PostContent 渲染
```

特点：

- 文件驱动
- 无数据库
- 带缓存
- 服务端读取

## 6.2 诗歌数据流

```text
data/*.json
  -> lib/poems.ts
  -> API route
  -> 前端组件 fetch
  -> UI 展示
```

特点：

- JSON 驱动
- 同时服务多个页面和组件
- 点赞状态单独存于 `likes_state.json`

## 6.3 书签数据流

```text
data/bookmarks.json
  -> /api/bookmarks
  -> 书签页前端
  -> 用户操作后再写回 JSON
```

特点：

- 读写都走 API
- 使用文件作为持久化层
- 带简单密码保护

---

## 7. 布局与全局能力

根布局在 `app/layout.tsx`。

它统一注入：

- 全局字体
- 全局样式
- 主题能力
- Header / Footer
- LayoutShell
- ToolSpaceTeaser

说明这个项目采用的是“全站壳层 + 页面内容”的结构。

也就是说：

- 页面只负责自己内容
- 全局导航、主题和容器由根布局控制

这让整体结构更稳定。

---

## 8. 当前架构优点

### 8.1 清晰的分层

- `app/` 负责入口
- `components/` 负责表现
- `lib/` 负责业务
- `content/` 和 `data/` 负责内容源

### 8.2 非数据库依赖，部署轻

这个项目很适合：

- Vercel 部署
- 个人博客场景
- 小型内容站
- 快速迭代

### 8.3 内容系统与功能系统并存

它不是纯博客模板，而是“博客 + 诗歌专题 + 书签导航 + 工具实验”的组合结构。

这也是它和标准博客脚手架最大的不同。

---

## 9. 当前架构的局限

### 9.1 文件写入型接口有部署约束

像这些能力：

- 上传文章
- 删除文章
- 点赞写入
- 书签写入

都依赖服务器文件系统。

这在某些无状态部署环境下会有问题，尤其是多实例或只读文件系统环境。

### 9.2 数据模型逐步变复杂

当前诗歌数据已经分成：

- 基础诗词
- 推荐诗词
- 学段诗词
- 专题诗词
- 点赞状态

如果后续继续扩展，`lib/poems.ts` 可能会变得越来越大，需要继续拆分。

### 9.3 管理能力仍是轻量实现

目前后台操作主要靠：

- API + 密码
- 文件系统写入

这对个人站够用，但如果以后变成多人协作或正式 CMS，就需要升级。

---

## 10. 你可以如何理解这个项目

如果用一句话总结：

**这是一个以 Next.js 为骨架、以 Markdown 和 JSON 为内容源、以博客为主线、以诗歌和书签为扩展专题的轻量全栈个人内容站。**

你可以把它拆成三层理解：

### 第一层：站点骨架

- Next.js App Router
- 根布局
- 全局主题
- 页面路由

### 第二层：核心内容系统

- 博客系统
- 诗歌系统
- 书签系统

### 第三层：底层内容存储

- `content/*.md`
- `data/*.json`
- 文件系统读写

这样理解后，后续你无论是改页面、改接口，还是新增模块，都比较容易定位该动哪一层。

---

## 11. 后续扩展建议

如果后续还要继续演进，我建议按这个方向扩展：

1. 把 `lib/poems.ts` 继续拆成更细模块
2. 把写操作逐步从文件系统迁移到数据库或 CMS
3. 给书签和文章管理补更正式的鉴权
4. 给 API 统一响应格式与错误处理工具
5. 增加一份专门的“数据模型文档”和“接口文档索引”

---

## 12. 适合谁维护这个项目

这个项目非常适合：

- 想维护个人博客的人
- 想把内容站做得比普通博客更丰富的人
- 想练习 Next.js 全栈能力的人
- 想做“内容 + 工具 + 可视化”混合站点的人

如果你后续愿意，我下一步还可以继续给你补两份配套文档：

1. `API-architecture.md`：专门讲接口体系
2. `DATA-architecture.md`：专门讲 `content/` 和 `data/` 的数据模型
