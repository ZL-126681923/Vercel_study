# 诗歌接口说明文档

本文档描述当前项目中诗歌相关接口的正式定义。  
本次重构后，项目只保留 4 类核心诗歌接口：

1. 按诗歌名 / 作者搜索
2. 首页推荐诗歌
3. 按学段返回诗歌
4. 点赞统计与点赞操作

---

## 1. 技术实现

当前项目使用 **Next.js App Router API Routes**：

- 路由目录：`app/api/**/route.ts`
- 核心数据逻辑：`lib/poems.ts`

接口统一使用 `createResponse()` 返回结构化 JSON。

---

## 2. 数据源说明

### 2.1 基础诗词数据

- `data/tangshi.json`：唐诗
- `data/songci.json`：宋词
- `data/yuanqu.json`：元曲

这三份数据主要用于：

- 搜索接口
- 首页推荐接口的兜底数据源
- 单诗查询接口（如果后续继续使用）

### 2.2 推荐诗歌数据

- `data/like.json`

说明：

- 首页推荐接口优先从 `data/like.json` 中随机返回
- 如果推荐集为空，则自动回退到全量诗词数据中随机返回

### 2.3 学段诗歌数据

- `data/map_poems.json`

说明：

- 这是小学 / 初中 / 高中学段诗歌的唯一正式数据源
- 当前按学段接口全部直接从这份文件读取原始数据
- 返回时会尽量保留原始字段，不做裁剪

### 2.4 点赞数据

- `data/likes_state.json`

说明：

- 记录每首诗的点赞数
- 点赞接口会直接读写这份数据

---

## 3. 统一返回格式

所有接口统一返回如下结构：

### 成功示例

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

### 失败示例

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

字段说明：

- `code`：业务状态码，`0` 表示成功
- `message`：说明信息
- `data`：接口主体数据
- `meta.ts`：响应时间戳

---

## 4. 数据结构说明

## 4.1 统一诗歌结构（搜索 / 推荐常用）

这类结构主要来自 `lib/poems.ts` 对不同数据源的规范化结果。

```json
{
  "id": "稳定ID",
  "title": "标题",
  "author": "作者",
  "section": "篇章或分类",
  "dynasty": "朝代",
  "type": "诗/词/曲",
  "creationTime": "创作时间",
  "background": "背景说明",
  "content": ["内容1", "内容2"],
  "theme": ["主题1", "主题2"],
  "sourceFile": "来源文件",
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

- `author` 由原始数据中的 `poet` / `author` 归一化得到
- `content` 会被标准化为字符串数组
- `likes` 会根据 `likes_state.json` 实时补充

---

## 4.2 学段诗歌原始结构（按学段接口返回）

`/api/poems/stage` 直接返回 `data/map_poems.json` 中的原始字段，因此字段更完整。

典型结构如下：

```json
{
  "id": "xiao001",
  "grade": "一年级上册",
  "title": "咏鹅",
  "author": "骆宾王",
  "dynasty": "唐代",
  "pinyin": ["..."],
  "content": ["..."],
  "annotation": [
    {
      "word": "咏",
      "meaning": "用诗歌赞美、描写事物"
    }
  ],
  "translation": "...",
  "appreciation": "...",
  "location": {
    "name": "地点",
    "city": "城市",
    "province": "省份",
    "coordinates": [120.0812, 29.3105],
    "addressDetail": "详细地址"
  }
}
```

说明：

- 学段接口会保留 `grade`
- 会保留 `pinyin`
- 会保留 `annotation`
- 会保留 `translation`
- 会保留 `appreciation`
- 会保留 `location.addressDetail`

---

# 5. 正式接口列表

---

## 5.1 搜索接口：按诗歌名 / 作者搜索

### 路径

`GET /api/search`

### 用途

根据关键词搜索诗歌，当前仅匹配：

- 诗歌标题 `title`
- 作者 `author`

不再混入主题、正文、朝代关键词等额外逻辑。

### 请求参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `q` | 是 | 搜索关键词 |
| `keyword` | 否 | `q` 的别名 |
| `query` | 否 | `q` 的别名 |
| `count` | 否 | 返回条数，默认 `20`，最大 `100` |

### 示例

```text
GET /api/search?q=李白
GET /api/search?q=静夜思
GET /api/search?keyword=杜甫&count=10
```

### 成功响应示例

```json
{
  "code": 0,
  "message": "按诗名/作者搜索",
  "data": [
    {
      "id": "...",
      "title": "静夜思",
      "author": "李白",
      "dynasty": "tang",
      "content": ["床前明月光", "疑是地上霜"]
    }
  ],
  "meta": {
    "ts": 1730352000000,
    "query": "李白",
    "total": 1,
    "count": 1
  }
}
```

---

## 5.2 首页推荐诗歌接口

### 路径

`GET /api/recommend/daily`

### 用途

首页展示推荐诗歌内容。

### 请求参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `count` | 否 | 返回条数，默认 `5`，最大 `20` |

### 数据逻辑

- 优先从 `data/like.json` 中随机返回
- 如果推荐集为空，则从全量诗歌中随机返回

### 示例

```text
GET /api/recommend/daily
GET /api/recommend/daily?count=1
GET /api/recommend/daily?count=8
```

### 成功响应示例

```json
{
  "code": 0,
  "message": "首页推荐诗歌",
  "data": [
    {
      "id": "...",
      "title": "春夜喜雨",
      "author": "杜甫",
      "dynasty": "tang",
      "content": ["好雨知时节", "当春乃发生"]
    }
  ],
  "meta": {
    "ts": 1730352000000,
    "count": 1
  }
}
```

---

## 5.3 按学段返回诗歌接口

### 路径

`GET /api/poems/stage`

### 用途

按学段返回 `data/map_poems.json` 中的诗歌数据，适用于：

- 小学 / 初中 / 高中诗歌列表
- 诗歌地图页
- 学段专题页

### 请求参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `stage` | 是 | 学段值 |
| `level` | 否 | `stage` 的别名 |
| `count` | 否 | 返回条数，默认 `5`，最大 `100` |

### stage 支持值

| 值 | 含义 |
|----|------|
| `all` | 全部学段 |
| `小学` | 小学 |
| `初中` | 初中 |
| `高中` | 高中 |
| `xiao` | 小学 |
| `chu` | 初中 |
| `gao` | 高中 |
| `primary` | 小学 |
| `junior` | 初中 |
| `senior` | 高中 |

### 学段识别规则

通过 `id` 前缀识别：

- `xiao*` → 小学
- `chu*` → 初中
- `gao*` → 高中

### 重要说明

这个接口返回的是 `map_poems.json` 的原始对象，不做字段裁剪。  
所以你能拿到完整字段，例如：

- `grade`
- `pinyin`
- `annotation`
- `translation`
- `appreciation`
- `location.addressDetail`

### 示例

```text
GET /api/poems/stage?stage=小学
GET /api/poems/stage?stage=初中&count=40
GET /api/poems/stage?stage=高中&count=100
GET /api/poems/stage?stage=all&count=100
```

### 成功响应示例

```json
{
  "code": 0,
  "message": "按学段返回诗词",
  "data": [
    {
      "id": "xiao001",
      "grade": "一年级上册",
      "title": "咏鹅",
      "author": "骆宾王",
      "dynasty": "唐代",
      "pinyin": ["é，é，é，qū xiàng xiàng tiān gē。"],
      "content": ["鹅，鹅，鹅，曲项向天歌。"],
      "annotation": [
        {
          "word": "咏",
          "meaning": "用诗歌赞美、描写事物"
        }
      ],
      "translation": "...",
      "appreciation": "...",
      "location": {
        "name": "骆宾王公园",
        "city": "金华市",
        "province": "浙江省",
        "coordinates": [120.0812, 29.3105],
        "addressDetail": "浙江省金华市义乌市城中中路128号"
      }
    }
  ],
  "meta": {
    "ts": 1730352000000,
    "stage": "小学",
    "stageKey": "xiao",
    "total": 74,
    "count": 74
  }
}
```

---

## 5.4 点赞统计与点赞操作接口

### 路径

`/api/poems/[id]/like`

### 用途

针对单首诗歌：

- 获取点赞统计
- 执行点赞 / 取消点赞

### 5.4.1 获取点赞统计

#### 请求

`GET /api/poems/{id}/like`

#### 示例

```text
GET /api/poems/xiao001/like
```

#### 成功响应

```json
{
  "code": 0,
  "message": "获取点赞数成功",
  "data": {
    "id": "xiao001",
    "likes": 12
  },
  "meta": {
    "ts": 1730352000000
  }
}
```

---

### 5.4.2 点赞 / 取消点赞

#### 请求

`POST /api/poems/{id}/like`

#### 请求体

```json
{
  "action": "like"
}
```

支持值：

- `like`：点赞
- `unlike`：取消点赞
- `dislike`：按取消点赞处理

#### 示例

```text
POST /api/poems/xiao001/like
Content-Type: application/json

{
  "action": "like"
}
```

#### 成功响应

```json
{
  "code": 0,
  "message": "点赞成功",
  "data": {
    "id": "xiao001",
    "likes": 13
  },
  "meta": {
    "ts": 1730352000000
  }
}
```

---

# 6. 当前保留接口总览

本次重构后，诗歌业务只保留以下 4 类核心接口：

| 类别 | 路径 | 说明 |
|------|------|------|
| 搜索 | `/api/search` | 按诗歌名 / 作者搜索 |
| 推荐 | `/api/recommend/daily` | 首页推荐诗歌 |
| 学段 | `/api/poems/stage` | 按学段返回诗歌 |
| 点赞 | `/api/poems/[id]/like` | 点赞统计与点赞操作 |

---

# 7. 已废弃接口

以下接口已不再作为正式能力保留：

- `/api/map-poems`
- `/api/poems/author`
- `/api/poems/title`
- `/api/poems/theme`

说明：

- `/api/map-poems` 已废弃，请统一改用 `/api/poems/stage`
- 作者 / 标题搜索已统一收口到 `/api/search`
- 主题搜索已从当前正式需求中移除

---

# 8. 前端调用建议

## 首页推荐

```text
GET /api/recommend/daily?count=1
```

## 搜索

```text
GET /api/search?q=李白&count=6
```

## 诗歌地图 / 学段页

```text
GET /api/poems/stage?stage=all&count=100
GET /api/poems/stage?stage=小学&count=100
```

## 点赞

```text
GET /api/poems/xiao001/like
POST /api/poems/xiao001/like
```

---

# 9. 维护建议

后续如果继续扩展诗歌接口，建议遵循以下原则：

1. 不再新增按作者 / 按标题 / 按主题的独立接口，统一收口到搜索接口
2. 学段相关数据只维护 `data/map_poems.json` 一份正式源
3. 点赞状态只维护 `data/likes_state.json`
4. 新接口如非必要，不要再引入“随机 + 分页 + 多数据源混用”的复杂职责

这样能保持接口简单、稳定、易维护。
