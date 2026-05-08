This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 数据说明

### 推荐诗词数据 `data/like.json`

`data/like.json` 现在作为“推荐诗词”数据源使用，接口 `GET /api/recommend/daily` 会优先从这里读取并随机返回数据。

当前支持并透出的主要字段包括：

- `id`
- `title`
- `content`
- `poet` / `author`
- `dynasty`
- `type`
- `creationTime`
- `background`
- `likedCount`（会在接口层统一映射为实时 `likes`）
- `location`

其中：

- `likes` 以 `data/likes_state.json` 中的实时点赞数据为准
- `like.json` 更适合放带扩展信息的精选/推荐诗词数据
- 如果 `like.json` 为空，`/api/recommend/daily` 会回退到全量诗词集合随机返回

### 推荐接口 `GET /api/recommend/daily`

查询参数：

- `count`: 返回条数，默认 `5`，范围 `1-20`

返回结构：

```json
{
  "code": 0,
  "message": "每日推荐",
  "data": [
    {
      "id": "mao_001",
      "title": "沁园春·雪",
      "author": "毛泽东",
      "dynasty": "近现代",
      "type": "词",
      "creationTime": "1936年2月",
      "background": "...",
      "content": ["..."],
      "likes": 0,
      "location": {
        "name": "陕北清涧县袁家沟",
        "city": "榆林市",
        "province": "陕西省",
        "coordinates": [110.49, 37.15]
      }
    }
  ]
}
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
