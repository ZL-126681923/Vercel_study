# 诗词接口文档

本文档描述当前项目中诗词相关 API 的正式接口定义、数据源及字段约定。

## 1. 技术实现

当前项目使用 **Next.js App Router API Routes**：

- 路由目录：`app/api/**/route.ts`
- 统一数据处理：`lib/poems.ts`

项目已不再使用旧版 Express 服务结构。

---

## 2. 数据源

### 基础诗词库

- `data/tangshi.json`：唐诗
- `data/songci.json`：宋词
- `data/yuanqu.json`：元曲

### 推荐数据

- `data/like.json`：每日推荐候选集

说明：

- `GET /api/recommend/daily` 优先从 `data/like.json` 返回
- 若 `like.json` 为空，则回退到全量诗词集合随机返回

### 地图专题数据

- `data/map_poems.json`：当前小学 / 初中 / 高中学段诗词地图主数据源
- `data/mao.json`：毛主席诗词时间轨道专题数据

### 点赞数据

- `data/likes_state.json`：实时点赞状态存储

---

## 3. 统一返回结构

成功：

```json
{
  "code": 0,
  "message": "OK",
  "data": {},
  "meta": {
    "ts": 1730352000000
  }
}
```

失败：

```json
{
  "code": 400,
  "message": "参数错误",
  "data": null,
  "meta": {
    "ts": 1730352000000
  }
}
```

---

## 4. 统一诗歌对象结构

```json
{
  "id": "稳定ID",
  "title": "标题",
  "author": "作者",
  "section": "篇章/类别",
  "dynasty": "朝代或推荐源原始朝代",
  "type": "诗/词/曲",
  "creationTime": "创作时间",
  "background": "背景说明",
  "content": ["诗文行1", "诗文行2"],
  "theme": ["主题1", "主题2"],
  "sourceFile": "数据来源相对路径",
  "likes": 0,
  "location": {
    "name": "地点名",
    "city": "城市",
    "province": "省份",
    "coordinates": [116.4, 39.9]
  }
}
```

说明：

- `author` 由 `poet` / `author` 归一化得到
- `content` 支持从 `content / paragraphs / paragraph / text` 规范化生成
- `likes` 以 `data/likes_state.json` 中的实时数据为准
- `type` / `creationTime` / `background` / `location` 仅部分数据源存在

---

## 5. 正式接口列表

### 5.1 每日推荐

- `GET /api/recommend/daily`

参数：

- `count`：返回条数，默认 `5`，范围 `1-20`

说明：

- 优先从 `data/like.json` 随机返回
- 支持返回扩展字段：`type`、`creationTime`、`background`、`location`

示例：

```text
GET /api/recommend/daily
GET /api/recommend/daily?count=8
```

---

### 5.2 按朝代随机查询

- `GET /api/poems?dynasty=...`

支持值：

- `唐` / `唐代` / `tang`
- `宋` / `宋代` / `song`
- `元` / `元代` / `yuan`
- `推荐` / `recommend`

参数：

- `count`：随机返回条数，优先级高于 `pageSize`
- `page`：仅参与 meta 返回
- `pageSize`：默认 `20`

说明：

- 当前接口是 **随机返回接口**，不是严格分页接口

示例：

```text
GET /api/poems?dynasty=tang&count=10
GET /api/poems?dynasty=recommend&count=5
```

---

### 5.3 按学段返回诗词

- `GET /api/poems/stage`

参数：

- `stage` 或 `level`：必填
  - `小学` / `初中` / `高中`
  - `xiao` / `chu` / `gao`
- `count`：默认 `5`，范围 `1-50`

说明：

- 数据源：`data/map_poems.json`
- 学段通过 `id` 前缀识别：
  - `xiao*`
  - `chu*`
  - `gao*`

示例：

```text
GET /api/poems/stage?stage=小学
GET /api/poems/stage?stage=chu&count=10
```

---

### 5.4 按作者查询

- `GET /api/poems/author?name=作者名&count=&dynasty=`

说明：

- `name` 或 `author` 为必填
- 支持 `dynasty` 可选过滤
- 返回随机样本

---

### 5.5 按主题查询

- `GET /api/poems/theme?theme=关键词&count=&dynasty=`

说明：

- `theme` 必填
- 支持多个主题词
- 在标题、`section`、正文、`theme` 字段中做包含匹配
- 返回随机样本

---

### 5.6 按标题查询

- `GET /api/poems/title?title=诗歌标题&count=&dynasty=`

说明：

- `title` 或 `name` 为必填
- 返回随机样本

---

### 5.7 根据 ID 查询单首诗

- `GET /api/poems/:id`

说明：

- 先从 `data/map_poems.json` 中查找学段诗词
- 再从基础诗词集合与推荐集合中查找

---

### 5.8 综合搜索

- `GET /api/search?q=关键词&count=`

说明：

- `q` 必填
- 在标题、作者、`section`、正文、`theme` 中综合搜索
- 返回随机样本

---

### 5.9 点赞接口

- `POST /api/poems/:id/like`

说明：

- 点赞数据持久化到 `data/likes_state.json`
- 推荐、学段、基础诗词共用一套点赞状态

---

### 5.10 朝代元信息

- `GET /api/meta/dynasties`

说明：

- 返回当前支持的朝代 key、中文别名与展示映射

---

### 5.11 通用地图诗词数据

- `GET /api/map-poems`

参数：

- `stage`：可选，默认 `all`
- 支持：
  - `all`
  - `xiao`
  - `chu`
  - `gao`
  - `primary`
  - `junior`
  - `senior`

说明：

- 数据源：`data/map_poems.json`
- 用于诗词地图功能

---

### 5.12 毛主席诗词时间轨道专题

- `GET /api/mao-poems`

说明：

- 数据源：`data/mao.json`
- 用于毛主席诗词时间轨道专题页面

---

## 6. 已移除 / 不再保留的能力

### 6.1 `must_poem.json`

已弃用并移除。

受影响范围：

- `lib/poems.ts` 不再加载 `data/must_poem.json`
- `/api/poems?dynasty=must` 不再支持
- `/api/meta/dynasties` 不再暴露 `must`

### 6.2 `xiao` 作为朝代查询别名

已移除。

说明：

- `dynasty=xiao` 不再作为正式支持能力
- 学段能力仍然通过 `/api/poems/stage` 与 `/api/map-poems` 保留

### 6.3 `data/chu_gao.json`

已废弃。

当前地图能力统一使用：

- `data/map_poems.json`

---

## 7. 当前建议

- 需要推荐诗词：使用 `/api/recommend/daily`
- 需要按学段诗词：使用 `/api/poems/stage`
- 需要通用地图数据：使用 `/api/map-poems`
- 需要毛主席专题地图数据：使用 `/api/mao-poems`
- 需要按朝代随机取样：使用 `/api/poems?dynasty=...`

如果后续需要“严格分页”，建议新增真正的分页接口，而不是继续复用当前随机接口。
