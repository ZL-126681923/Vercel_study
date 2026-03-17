# 诗歌 APP 后端（Express）

一个基于 Express 的简易诗歌 API 服务，依托 `data/*.json` 与 `recommend/*.json` 数据源，提供：

- 每日推荐
- 按朝代/类型（唐诗/宋词/元曲）分页查询
- 根据诗歌ID查询单首诗歌
- 按主题/作者/标题/朝代综合搜索
- 点赞持久化（本地 JSON）

## 目录

- [运行](#运行)
- [数据目录](#数据目录)
- [统一返回格式](#统一返回格式)
- [诗歌对象结构](#诗歌对象结构)
- [接口说明](#接口说明)
  - [每日推荐](#1-每日推荐)
  - [按学段返回必背古诗](#11-按学段返回必背古诗)
  - [按朝代查询](#2-按朝代查询随机返回)
  - [按作者查询](#3-按作者查询随机返回)
  - [按主题查询](#4-按主题查询随机返回)
  - [按标题查询](#5-按标题查询随机返回)
  - [根据ID查询](#6-根据id查询)
  - [综合搜索](#7-综合搜索随机返回)
  - [点赞接口](#8-点赞接口)
  - [其他辅助接口](#其他)
- [点赞持久化](#点赞持久化)
- [错误码规范](#错误码规范)
- [分页与筛选规则](#分页与筛选规则)
- [朝代字段规则](#朝代字段规则)
- [数据规范化细节](#数据规范化细节)
- [跨域与日志](#跨域与日志)
- [部署建议](#部署建议)
- [常见问题](#常见问题)

## 运行

```bash
# 安装依赖
npm install

# 开发运行（热重载）
npm run dev

# 生产运行
npm run start
```

默认端口：3000，可通过 `PORT` 环境变量覆盖。

环境变量：
- `PORT`：服务端口（默认 3000）
- `NODE_ENV`：`production` 时建议配合进程管理工具运行

## 数据目录

项目根目录的 JSON 数据：

- data/tangshi.json：唐诗
- data/songci.json：宋词
- data/yuanqu.json：元曲
- data/like.json：每日推荐候选集（推荐接口严格以此为源）
- data/must_poem.json：分学段必背古诗词（小学 `xiao*`、初中 `chu*`、高中 `gao*`）

服务启动时统一加载并规范化为相同结构的诗歌对象。

## 统一返回格式

- 成功
```json
{
  "code": 0,
  "message": "OK",
  "data": {},
  "meta": { "ts": 1730352000000 }
}
```
- 失败（示例）
```json
{
  "code": 404,
  "message": "未找到该诗歌",
  "data": null,
  "meta": { "ts": 1730352000000 }
}
```

## 诗歌对象结构
```json
{
  "id": "稳定ID",
  "title": "标题",
  "author": "作者",
  "section": "篇章/类别",
  "dynasty": "tang|song|yuan|recommend",
  "content": ["诗文行1", "诗文行2"],
  "sourceFile": "数据来源相对路径"
}
```

- content 规范化支持：content / paragraphs / paragraph / text（数组或字符串）；字符串先按换行切分，若仍为单行会按中文标点（。！？；）断句。

## 接口说明

### 1) 每日推荐
- GET `/api/recommend/daily`
- 可选参数：
  - `count`：返回条数（默认 5，范围 1-20）
  - （date 已不生效）
- 说明：从 `data/like.json` 中随机返回指定条数；若 `like.json` 为空则从全量集合中随机返回。
  - 提示：返回的 `dynasty` 字段对于推荐源会保留原始中文（如“近现代”“清代”等）；其他来源为标准键（tang/song/yuan）。

示例：
```
GET http://localhost:3000/api/recommend/daily
GET http://localhost:3000/api/recommend/daily?count=8
```

curl：
```bash
curl "http://localhost:3000/api/recommend/daily?count=5"
```

响应（示例，数组）：
```json
{
  "code": 0,
  "message": "每日推荐",
  "data": [
    {
      "id": "r1001",
      "title": "沁园春·雪",
      "author": "毛泽东",
      "section": "",
      "dynasty": "近现代",
      "content": ["北国风光，千里冰封，万里雪飘。"],
      "sourceFile": "data/like.json",
      "likes": 0
    }
  ],
  "meta": { "ts": 1730352000000 }
}
```
  - 提示：返回的 `dynasty` 字段对于推荐源会保留原始中文（如“近现代”“清代”等）；其他来源为标准键（tang/song/yuan）。
- 示例：
```
GET http://localhost:3000/api/recommend/daily
```

### 1.1) 按学段返回必背古诗
- GET `/api/poems/stage`
- 参数：
  - `stage`（或 `level`）：学段（必填）
    - 支持值：`小学` / `初中` / `高中`，或对应简写 `xiao` / `chu` / `gao`
  - `count`：返回条数（可选，默认 5，范围 1-50）
- 数据来源：
  - `data/must_poem.json` 中的必背诗词
  - 通过 `id` 前缀识别学段：
    - 小学：`id` 以 `xiao` 开头
    - 初中：`id` 以 `chu` 开头
    - 高中：`id` 以 `gao` 开头
- 示例：
```text
GET http://localhost:3000/api/poems/stage?stage=小学
GET http://localhost:3000/api/poems/stage?stage=chu&count=10
GET http://localhost:3000/api/poems/stage?stage=高中&count=3
```

响应（示例）：
```json
{
  "code": 0,
  "message": "按学段返回必背古诗",
  "data": [
    {
      "id": "chu1001",
      "title": "关雎",
      "author": "《诗经·周南》",
      "dynasty": "先秦",
      "content": ["关关雎鸠，在河之洲。", "..."],
      "sourceFile": "data/must_poem.json",
      "likes": 0
    }
  ],
  "meta": {
    "ts": 1730352000000,
    "stage": "初中",
    "stageKey": "chu",
    "total": 100,
    "count": 5
  }
}
```

### 2) 按朝代查询（随机返回）
- GET `/api/poems?dynasty=唐|宋|元|tang|song|yuan|recommend`
- 可选参数：
  - `count`：随机返回条数（默认等于 `pageSize`，范围 1-100）
  - `page`、`pageSize`：仅用于决定默认返回条数（不进行顺序分页）
- 返回：数据数组 + `meta.total/count`
- 示例：
```
GET http://localhost:3000/api/poems?dynasty=唐&count=10
GET http://localhost:3000/api/poems?dynasty=song&page=2&pageSize=5  # 将返回 5 条随机数据
```

curl：
```bash
curl "http://localhost:3000/api/poems?dynasty=song&count=10"
```

响应片段：
```json
{
  "code": 0,
  "message": "诗歌列表（随机）",
  "data": [
    {
      "id": "song:念奴娇·赤壁怀古:苏轼",
      "title": "念奴娇·赤壁怀古",
      "author": "苏轼",
      "section": "",
      "dynasty": "song",
      "content": ["大江东去，浪淘尽，千古风流人物。"],
      "sourceFile": "data/songci.json",
      "likes": 0
    }
  ],
  "meta": { "ts": 1730352000000, "total": 6352, "count": 10 }
}
```

### 3) 按作者查询（随机返回）
- GET `/api/poems/author?name=作者名&count=&dynasty=`
- 参数：
  - `name`（或 `author`）：作者名（必填，包含匹配）
  - `count`：返回条数（默认 20，范围 1-100）
  - `dynasty`：可选，限制数据源范围（支持 唐|宋|元|tang|song|yuan|recommend）
- 示例：
```
GET http://localhost:3000/api/poems/author?name=李白&count=10
GET http://localhost:3000/api/poems/author?name=苏轼&dynasty=宋
```

### 4) 按主题查询（随机返回）
- GET `/api/poems/theme?theme=关键词&count=&dynasty=`
- 参数：
  - `theme`：主题关键词，支持逗号/空格分隔多个（必填）
  - `count`：随机返回条数（默认 20，范围 1-100）
  - `dynasty`：可选，限制数据源范围（支持 唐|宋|元|tang|song|yuan|recommend）
- 说明：在标题、section、正文与 `theme` 数组中做包含匹配；返回随机样本。
- 示例：
```
GET http://localhost:3000/api/poems/theme?theme=爱情,离别&count=10
GET http://localhost:3000/api/poems/theme?theme=山水&dynasty=唐
```

### 5) 按标题查询（随机返回）
- GET `/api/poems/title?title=诗歌标题&count=&dynasty=`
- 参数：
  - `title`（或 `name`）：标题关键词（必填，包含匹配）
  - `count`：随机返回条数（默认 20，范围 1-100）
  - `dynasty`：可选，限制数据源范围（支持 唐|宋|元|tang|song|yuan|recommend）
- 示例：
```
GET http://localhost:3000/api/poems/title?title=静夜思
GET http://localhost:3000/api/poems/title?name=将进酒&count=5
```

### 6) 根据ID查询
- GET `/api/poems/:id`
- 参数：
  - `id`：诗歌ID（路径参数，必填）
- 说明：根据诗歌的唯一ID查询单首诗歌的详细信息
- 示例：
```
GET http://localhost:3000/api/poems/t1001
GET http://localhost:3000/api/poems/s1001
```

curl：
```bash
curl "http://localhost:3000/api/poems/t1001"
```

响应（示例）：
```json
{
  "code": 0,
  "message": "查询成功",
  "data": {
    "id": "t1001",
    "title": "蜀先主庙",
    "author": "刘禹锡",
    "section": "",
    "dynasty": "tang",
    "content": [
      "天地英雄气，千秋尚凛然。",
      "势分三足鼎，业复五铢钱。",
      "得相能开国，生儿不象贤。",
      "凄凉蜀故伎，来舞魏宫前。"
    ],
    "sourceFile": "data/tangshi.json",
    "likes": 5
  },
  "meta": { "ts": 1730352000000 }
}
```

错误响应（未找到）：
```json
{
  "code": 404,
  "message": "未找到该ID的诗歌",
  "data": { "id": "invalid_id" },
  "meta": { "ts": 1730352000000 }
}
```

### 7) 综合搜索（随机返回）
- GET `/api/search?q=&count=`
- 参数：
  - `q`：单一关键词（必填）。后端会在 标题、作者、主题、正文 中做包含匹配；若 `q` 是朝代别名（如 唐/宋/元/tang/song/yuan/recommend），将按该朝代限定范围。
  - `count`：随机返回条数（默认 20，范围 1-100）
- 示例：
```
GET http://localhost:3000/api/search?q=李白
GET http://localhost:3000/api/search?q=山水,离别&count=10
GET http://localhost:3000/api/search?q=宋
```

### 8) 点赞接口
- GET `/api/poems/:id/like`：获取该诗点赞数
- POST `/api/poems/:id/like`
  - Body：`{"action":"like"}` 或 `{"action":"unlike"}`（默认 like）
  - 返回：`{ id, likes }`

（兼容接口）
- GET `/api/poems/:id/feedback`：同上，返回 `{ id, likes }`
- POST `/api/poems/:id/feedback`
  - Body：`{"action":"like"|"dislike"}`（内部以 likes +/-1 简化）

curl 示例：
```bash
curl "http://localhost:3000/api/poems/r3001/like"
curl -X POST "http://localhost:3000/api/poems/r3001/like" -H "Content-Type: application/json" -d "{\"action\":\"like\"}"
```

### 其他
- GET `/api/health`：服务健康状态与各分集数量
- GET `/api/meta/dynasties`：支持的朝代键与别名

## 点赞持久化

- 文件：`data/likes_state.json`
- 结构：`{"<poemId>": { "likes": number }}`
- 写入策略：写入临时文件 `.tmp` 后原子替换，尽可能降低损坏风险。
- 并发：单进程内存中累加后落盘；如多进程/多实例部署需改为外部共享存储（如 Redis/DB）。
- 最小值：不会小于 0。

## 示例响应（片段）

```json
{
  "code": 0,
  "message": "诗歌列表",
  "data": [
    {
      "id": "tang:静夜思:李白",
      "title": "静夜思",
      "author": "李白",
      "section": "",
      "dynasty": "tang",
      "content": ["床前明月光，疑是地上霜。", "举头望明月，低头思故乡。"],
      "sourceFile": "data/tangshi.json",
      "likes": 12
    }
  ],
  "meta": { "ts": 1730352000000, "total": 123, "page": 1, "pageSize": 20 }
}
```

## 错误码规范

- 0：成功
- 400：参数错误（如页码非法、count 超界等）
- 404：资源不存在（如无推荐数据）
- 500：服务器内部错误

返回体统一为：
```json
{ "code": <number>, "message": "...", "data": <any|null>, "meta": { "ts": <ms> } }
```

## 分页与筛选规则

- `page` 从 1 开始，最小 1
- `pageSize` 默认 20，范围 [1, 100]
- `count`（每日推荐）默认 5，范围 [1, 20]
- 过滤条件为“包含匹配”，大小写按数据原文（中文为主）

## 朝代字段规则

- 来自 `data/like.json` 的推荐数据：保留原始中文 `dynasty`（如“近现代”“清代”“汉末”）
- 来自常规数据集：标准化为键名 `tang|song|yuan`（亦支持中文入参映射）

## 数据规范化细节

- `content` 优先取数组字段：`content` / `paragraphs` / `paragraph`
- 若为字符串，先按换行切分；仍为单行则按中文标点（。！？；）断句
- `id`：若源数据未提供，会按 `<dynasty>:<title>:<author>` 组合生成稳定 ID

## 跨域与日志

- 已启用 `cors`，默认允许所有来源跨域请求
- 使用 `morgan('dev')` 输出访问日志（开发友好）

## 部署建议

- 生产环境建议使用进程管理工具（如 pm2、systemd、Windows 服务）
- 挂载数据目录为持久化卷或制定备份策略（尤其是 `data/likes_state.json`）
- 若有多实例，建议将点赞存储迁移至共享存储（Redis/数据库）

## 常见问题

- content 为空？已在规范化中兼容多字段并做智能断句；若仍为空，说明源数据确无正文，请检查对应数据文件。
- 扩展新的时期/分类：新增 JSON 数据文件后无需改动代码，`dynasty` 别名映射已包含唐/宋/元与 recommend；如果要新增新的时期，请在 `src/server.js` 的 `DYNASTY_ALIAS` 中扩展映射逻辑与加载逻辑。

## 目录结构（简要）
```
├─ data/
│  ├─ tangshi.json
│  ├─ songci.json
│  ├─ yuanqu.json
│  └─ likes_state.json
├─ recommend/
│  └─ *.json
├─ src/
│  └─ server.js
├─ package.json
└─ README.md
```

## 许可证
ISC
