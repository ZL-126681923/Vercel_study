# 重构架构设计文档 — 从「个人内容站」到「多 APP 接口聚合平台」

> 状态：**已定稿，执行中**（2026-08-28）
>
> 已确认的前提：
> - 部署继续用 **Vercel**
> - 网页部分**全部下线**，仓库只留 API
> - 第一版公共能力聚焦**统计与监控**
> - 存储采用 **静态 JSON（只读） + Upstash Redis（写）** 的分层（替代原「SQLite」选项，理由见 §3）
>
> **已拍板的 4 项决策**（原 §10）：
>
> | # | 决策 | 影响 |
> |---|---|---|
> | 1 | **元曲全砍** | 删除 `yuanqu.json`，搜索池 10024 → 800 条，内容体积 2036 KB → 166 KB。§6.2 简化，§8 阶段 4 大幅缩短 |
> | 2 | **6 个小游戏直接删** | 不另开存档仓库。代码保留在 git 历史与 tag `pre-refactor-2026-08-28` 中 |
> | 3 | **指纹首页 / 书签 / API 监控页直接删** | 同上 |
> | 4 | **仓库改名** | `Vercel_study` → `api-platform`，package name `temp-blog` → `api-platform` |
>
> 回滚点：`git tag pre-refactor-2026-08-28` → `659659b`。所有被删内容均可通过
> `git checkout pre-refactor-2026-08-28 -- <路径>` 取回。

---

## 1. 现状体检

### 1.1 这个仓库现在实际是什么

`PROJECT_ARCHITECTURE.md` 已经**严重过期**——它描述的博客系统（`content/*.md`、`app/blog/`、`lib/posts.ts`）在 commit `ae089c0 feat：文章模块删除` 之后已经不存在了。`content/` 目录现在是空的。

仓库当前的真实构成：

| 部分 | 内容 | 谁在用 |
|---|---|---|
| **诗词 API** | `app/api/poems/**` 5 个路由 | ✅ 拾诗纪 APP（唯一真实消费方） |
| **网页：小游戏** | 6 个游戏 + Phaser + 移动端适配 | 只有你自己 |
| **网页：指纹首页** | `app/page.tsx`，采集 60+ 项浏览器指纹 | 只有你自己 |
| **网页：书签** | `app/bookmarks/` + 写文件 | 只有你自己 |
| **网页：API 监控** | `components/ApiMonitor.tsx` + `lib/apiWatch.ts` | 只有你自己 |
| **遗留接口** | `/api/geo`、`/api/img`、`/api/mao-poems`、`/api/meta/dynasties`、`/api/bookmarks` | 无 APP 消费 |

**关键结论：一个装了 Phaser 4 + ECharts + MapLibre + framer-motion + react-map-gl 的前端仓库，实际对外提供的价值是 5 个诗词 JSON 接口。** 依赖体积和心智负担与产出严重不匹配——这就是你「感觉不对」的根源。

### 1.2 数据层体检

| 文件 | 条数 | 体积（压缩后） | 占总量 | 实际被谁读 |
|---|---|---|---|---|
| `data/yuanqu.json` | 9124 | **1870 KB** | **82%** | 仅 `/poems/search` |
| `data/map_poems.json` | 165 | 248 KB | 11% | `/poems/stage`（APP 学习模块核心） |
| `data/tangshi.json` | 470 | 80 KB | 3.5% | 仅 `/poems/search` |
| `data/songci.json` | 280 | 65 KB | 2.8% | 仅 `/poems/search` |
| `data/like.json` | 50 | 21 KB | 0.9% | `/poems/recommend`（APP 首页核心） |
| `data/mao.json` | 38 | 45 KB | — | 仅网页 `/api/mao-poems` |
| `data/likes_state.json` | 4 | 135 B | — | 点赞（**写入在 Vercel 上失效**） |

**问题 A：冷启动税。** `lib/poems.ts:236` 的 `loadPoems()` 一次性把 tangshi + songci + yuanqu + like 四个文件全部 `JSON.parse` 进内存，合计 **2036 KB**。Vercel serverless 每次冷启动都要重付这笔解析开销，**而这 2036 KB 里有 1870 KB（92%）是元曲**——服务的是几乎不存在的搜索需求。

**问题 B：数据价值倒挂。** 数据质量最高的是 `map_poems.json`（165 条，带拼音、注释、译文、赏析、地理坐标），这也是 APP 学习模块真正在用的。而占了 92% 体积的元曲只有 `title/content/poet` 三个裸字段，连注释都没有。

**问题 C：`likes_state.json` 是死的。** `lib/poems.ts:171` 用 `fs.writeFileSync` 写点赞。Vercel 的函数文件系统只读（`/tmp` 除外且会被回收），**这个写入从来没成功过**。文件里只有 4 条记录、累计 3 个赞，是本地开发时留下的。

### 1.3 接口层体检

**问题 D：没有版本号。** 所有接口都是 `/api/poems/*`。APP 一旦发版就无法回收，用户可能长期停在旧版本。现在你改任何一个接口的返回结构，**线上所有旧版本 APP 立刻崩**。这是当前架构最大的定时炸弹。

**问题 E：重复接口。** `/api/poems/[id]/like` 和 `/api/poems/[id]/feedback` 是两份**逐行相同**的代码，只有提示文案不同。同样 `/api/poems/route.ts?id=x` 和 `/api/poems/[id]/route.ts` 也完全重复。

**问题 F：业务与通用能力耦合。** 「点赞」被写死成诗歌专属（`updateLikes` 内部先 `getPoemById` 校验）。下一个 APP 想给别的资源点赞，只能复制一份。

**问题 G：残留空目录。** `app/api/hot/`、`map-poems/`、`posts/`、`recommend/`、`search/`、`upload/` 六个目录里已经没有 `route.ts` 了，是删除路由后的残骸。

**问题 H：`proxy.ts` 的统计与限流在 serverless 下不可靠。** 文件名是对的——Next.js 16 已把 `middleware.ts` 改名为 `proxy.ts`（`next/dist/lib/constants.js:274`，`PROXY_FILENAME = 'proxy'`），构建输出里的 `ƒ Proxy (Middleware)` 可以确认它**已经生效**，**不要改回 `middleware.ts`**。

真正的问题在实现：限流和统计都用**进程内存 Map**。在 serverless 下——

- **统计会丢**：每次冷启动计数清零，拿不到任何跨时间的数据
- **限流形同虚设**：每个实例各算各的，实际阈值是 `60 × 实例数`，而非代码里写的 60

修法是把状态挪到 Redis，不是改文件名。

### 1.4 APP 侧体检（`collecting_poem`）

**问题 I：两个 HTTP 客户端指向两个不同域名。**

| 文件 | baseURL | 状态 |
|---|---|---|
| `utils/changeReq.ets` | `https://www.zlzwj.top/api` | ✅ 实际在用（8 个页面） |
| `utils/request.ets` | `https://api.ssj.lzzvx.com/api` | ❌ **零引用，死代码** |

**问题 J：APP 内嵌了 142KB 静态 JSON。** `resources/rawfile/` 下的 `mao.json`、`libai.json`、`dufu.json`、`masterpiece.json` 被 `PoetFootprint.ets:235` 直接读取。这些数据改一个字就得重新发版审核。

**问题 K：用户数据全在设备本地。** `utils/myPreferences.ets`（823 行）把点赞、收藏、学习进度全存在设备 Preferences 里。**用户换机 / 卸载重装，所有学习进度归零。**

---

## 2. 目标定位

### 2.1 一句话

> 把这个仓库从「一个塞满了小游戏的个人 Next.js 站」，改造成「**一个为你所有 APP 提供后端能力的、版本化的、可观测的接口平台**」。

### 2.2 「聚合平台」和「一堆接口堆在一起」的区别

这是整个重构的核心，值得说清楚：

| | 接口堆 | 聚合平台 |
|---|---|---|
| 加新 APP | 复制一份 route，改改字段 | 新建一个 module 目录，公共能力直接复用 |
| 改接口 | 祈祷没有旧版 APP 在用 | 加 `/v2`，`/v1` 继续跑，旧 APP 不受影响 |
| 点赞收藏 | 每个 APP 自己实现一遍 | 一套通用 interaction 服务，传 `resourceType` 即可 |
| 出问题 | 用户投诉了才知道 | 统计面板能看到哪个 APP、哪个接口、什么错误率 |

**你要的是第二列。** 而实现第二列的关键只有三件事：**接口版本化、业务域隔离、公共能力下沉**。

---

## 3. 技术选型

### 3.1 存储：静态 JSON（只读） + Upstash Redis（写）

**为什么不用数据库**：把你所有的写需求列出来后，形态高度一致——

| 写什么 | 数据形态 | Redis 操作 |
|---|---|---|
| 点赞数 | 计数器 | `INCR` |
| 接口调用量 | 计数器 | `INCR` |
| 收藏列表 | 集合 | `SADD` / `SMEMBERS` |
| APP 版本分布 | 哈希 | `HINCRBY` |

**没有一项需要「表关联」或「多条件查询」**——而这两件事才是数据库存在的理由。为计数器上 Postgres，是拿 ERP 记流水账。

**为什么是 Upstash 而不是 Turso / Neon**：

| 方案 | Vercel 兼容 | 你要学的东西 | 判断 |
|---|---|---|---|
| **Upstash Redis** | ✅ 原生（HTTP 协议，无连接池问题） | `get` / `set` / `incr` / `sadd` | ✅ **选它** |
| 本地 SQLite | ❌ **写入无效**（无状态文件系统） | — | ❌ 技术上不成立 |
| Turso（托管 SQLite） | ✅ | SQL + 建表 + 迁移 | 需要关联查询时再上 |
| Neon / Supabase | ⚠️ 需配连接池 | SQL + 建表 + 迁移 + **连接池**（新手必踩坑） | 有真实用户量再上 |

**接入成本**：Vercel 后台 → Marketplace → Upstash → 装。环境变量自动注入，**不用配任何连接串**。免费额度 1 万命令/天。

**升级路径不封死**：以后真要做用户体系，加 Neon Postgres 管关系数据，Redis 继续管计数——两者本来就是互补的，不需要推倒重来。

### 3.2 静态内容：留在仓库里

诗词正文是**只读**的，Vercel 直接从仓库读文件完全没问题，还免费、还快。不要把只读内容塞进数据库——那是新手最常见的过度设计。

### 3.3 技术栈裁剪

网页下线后，这些依赖全部可以删：

```
phaser  echarts  echarts-for-react  maplibre-gl  react-map-gl
framer-motion  @dnd-kit/*  jsdom  turndown  chardet  iconv-lite
remark*  rehype*  gray-matter  @chenglou/pretext  date-fns
```

保留：`next` / `react` / `react-dom`（Next.js 需要）+ `@upstash/redis` + `zod`（参数校验）。

`node_modules` 会从数百 MB 降到几十 MB，冷启动、构建时间同步下降。

---

## 4. 目标架构

### 4.1 目录结构

```
app/
  api/
    v1/
      poems/                  ← 【业务域】诗词（拾诗纪 APP）
        search/route.ts
        recommend/route.ts
        stage/route.ts
        [id]/route.ts
        footprint/route.ts    ← 新增：接管 APP 内嵌的 4 个 rawfile
      common/                 ← 【公共能力】任何 APP 都能用
        interactions/route.ts ← 通用点赞/收藏（传 resourceType）
        feedback/route.ts     ← 通用意见反馈
      system/                 ← 【平台自身】
        health/route.ts
        stats/route.ts        ← 统计查询（需 admin key）
    _legacy/                  ← 【兼容层】旧路径转发到 v1，见 §8
      poems/**

app/
  page.tsx                    ← 控制台入口（唯一页面）
  Console.tsx                 ← 控制台组件
  globals.css                 ← 控制台样式（纯 CSS，无 Tailwind）

lib/
  core/                       ← 平台内核，与业务无关
    registry.ts               ← ✅ 已建：APP 表 + 接口表 + 派生查询
    response.ts               ← 统一响应封装
    errors.ts                 ← 错误码表
    validate.ts               ← 参数校验（zod）
    metrics.ts                ← 统计埋点（写 Redis）
    redis.ts                  ← Redis 客户端单例
  modules/
    poems/                    ← 诗词业务
      repository.ts           ← 读数据（含索引、缓存）
      service.ts              ← 业务逻辑
      types.ts
    interactions/             ← 通用互动业务
      service.ts
  # 未来加 APP，只需在 modules/ 下加一个目录

data/
  poems/
    corpus.json               ← 搜索池（唐诗 + 宋词 + 推荐，共 800 条）
    stage.json                ← 学段诗词（原 map_poems.json）
    recommend.json            ← 推荐池（原 like.json）
    footprint/                ← 诗人足迹（原 APP rawfile）
      mao.json  libai.json  dufu.json  masterpiece.json

proxy.ts                      ← Next 16 的 middleware，状态改走 Redis
```

### 4.2 分层规则（一条铁律）

```
route.ts  →  service.ts  →  repository.ts  →  data / redis
  只做       业务逻辑         数据读写
解析入参
```

- **route 里不许出现业务判断**——只做「解析参数 → 调 service → 包装响应」，超过 30 行就是写错了
- **service 里不许出现 `fs` 和 `redis`**——数据访问全部经过 repository
- **core/ 里不许 import modules/**——内核不依赖业务，这是能加第二个 APP 的前提

现在 `lib/poems.ts` 是 480 行的大杂烩（数据加载 + 规范化 + 搜索 + 点赞 + 响应封装全混在一起），按上面拆开后每个文件都在 100 行以内。

---

## 5. 接口设计

### 5.1 统一约定

**路径**：`/api/v{版本}/{域}/{资源}`

**请求头**（所有接口）：

| 头 | 必填 | 说明 |
|---|---|---|
| `X-App-Id` | 是 | APP 标识，如 `shishiji`。用于统计分组和后续鉴权 |
| `X-App-Version` | 否 | APP 版本号，用于排查「哪个版本在报错」 |
| `X-Device-Id` | 否 | 匿名设备标识，用于点赞去重 |

> 第一版 `X-App-Id` **只统计不校验**（缺失记为 `unknown`），不会挡住线上旧 APP。等 APP 全量升级后再改成强校验。这是能平滑上线的关键。

**响应**（沿用你现有格式，不做破坏性改动）：

```json
{ "code": 0, "message": "OK", "data": {}, "meta": { "ts": 1730352000000 } }
```

**错误码**（新增，现在是散落的裸数字）：

| code | 含义 |
|---|---|
| 0 | 成功 |
| 400xx | 参数错误 |
| 404xx | 资源不存在 |
| 429xx | 触发限流 |
| 500xx | 服务端错误 |

### 5.2 接口清单

**诗词域**（`/api/v1/poems`）

| 接口 | 变化 |
|---|---|
| `GET /search?q=&count=` | 保持。底层改为读索引，不再全量 parse |
| `GET /recommend?count=` | 保持 |
| `GET /stage?stage=&count=` | 保持（APP 学习模块依赖，字段不能动） |
| `GET /{id}` | 保持。**合并**掉重复的 `/api/poems?id=` |
| `GET /footprint?poet=` | **新增**，接管 APP 内嵌的 4 个 rawfile |

**公共能力**（`/api/v1/common`）

| 接口 | 说明 |
|---|---|
| `GET /interactions?type=poem&id=xxx` | 查互动数（点赞/收藏计数） |
| `POST /interactions` | 提交互动。Body: `{ type, resourceId, action }` |

`action` 支持 `like` / `unlike` / `favorite` / `unfavorite`。**`type` 是开放的字符串**——下一个 APP 传 `type: "recipe"` 就能直接用，不用改一行服务端代码。这就是「公共能力」的意思。

**平台**（`/api/v1/system`）

| 接口 | 说明 |
|---|---|
| `GET /health` | 健康检查 + 数据量统计 |
| `GET /stats` | 调用统计（需 `X-Admin-Key`） |

### 5.3 删除清单

| 接口 | 处理 |
|---|---|
| `/api/poems/[id]/feedback` | 删（与 `like` 逐行重复） |
| `/api/poems?id=` | 删（与 `/poems/[id]` 重复） |
| `/api/bookmarks` | 删（网页下线） |
| `/api/geo` | 删（指纹首页专用） |
| `/api/img/[filename]` | 删（改用 `public/` 静态托管，Vercel 自带 CDN，更快） |
| `/api/meta/dynasties` | 删（返回的是硬编码常量，客户端自己写就行） |
| `/api/mao-poems` | 并入 `/v1/poems/footprint` |
| `app/api/` 下 6 个空目录 | 删 |

---

## 6. 数据层方案

### 6.1 静态内容重组

元曲全砍后（§6.2），搜索池只剩 800 条 / 166 KB，**不需要索引和分片**——直接全量加载最简单，也最好维护。

目录只做一次归拢，让数据按用途分开：

```
data/poems/
  corpus.json      ← 搜索池：唐诗 + 宋词 + 推荐，合并去重
  stage.json       ← 学段诗词（原 map_poems.json，APP 学习模块）
  recommend.json   ← 推荐池（原 like.json，APP 首页）
  footprint/       ← 诗人足迹（原 APP rawfile + mao.json）
```

> 若以后诗词量重新涨到几千条以上，再回头上「索引 + 正文分片」不迟。现在上属于过度设计。

### 6.2 元曲：全砍（已定）

选定 **方案 A**：删除 `data/yuanqu.json`（9124 条 / 1870 KB），`loadPoems()` 不再加载。

| 指标 | 改造前 | 改造后 |
|---|---|---|
| 搜索池条数 | 9924 | **800**（唐诗 470 + 宋词 280 + 推荐 50） |
| `loadPoems()` 解析体积 | 2036 KB | **166 KB** |
| 冷启动数据解析开销 | — | **降低 92%** |

**连带简化**：搜索池只剩 800 条、166 KB 后，§6.1 的「索引 + 正文分片」方案**不再必要**——直接全量加载即可，这个体量在内存里毫无压力。§8 阶段 4 因此从「写构建脚本 + 改搜索 + 验证一致性」缩减为「删文件 + 删加载分支」。

**行为变更（唯一的对外影响）**：`/poems/search` 不再返回元曲结果。返回结构不变，只是结果集变小。APP 侧无需改动。

### 6.3 Redis 键设计

```
like:{type}:{resourceId}          计数器      如 like:poem:s1279
fav:{deviceId}                    集合        某设备的收藏列表
metrics:calls:{appId}:{path}      计数器      接口调用量
metrics:daily:{date}:{appId}      哈希        按天汇总
```

**迁移**：`likes_state.json` 里那 4 条记录（3 个赞）作为初始值一次性写入 Redis，之后该文件删除。

---

## 7. 统计与监控（你选的第一版公共能力）

### 7.1 埋点

`proxy.ts` **文件名保持不变**（Next.js 16 的正确命名，见问题 H），只把内存 Map 换成 Redis：

```
每次请求 → proxy.ts
  ├─ 限流：Redis INCR + 60s 过期（替代内存 Map，多实例下才准）
  └─ 埋点：INCR metrics:calls:{appId}:{path}
```

**注意**：现在的限流用内存 Map，在 serverless 多实例下每个实例各算各的，实际阈值是 `60 × 实例数`。改 Redis 后才是真限流，统计也才留得住。

### 7.2 控制台（`/`）

> 决策修订：原方案是「统计只返回 JSON，不值得保留前端」。**已推翻**——控制台是聚合平台自身的一部分，不是被砍的那种「网页」。

仓库保留唯一一个页面：`/`，即接口平台控制台。它不引入任何前端依赖（无 Tailwind、无图表库、无外部字体，纯 CSS 变量 + 系统字体栈），只用已有的 `react` / `react-dom`。

**展示什么**

| 区块 | 内容 |
|---|---|
| 概览 | 已接入应用数、接口总数、累计调用、无消费方接口数 |
| **应用** | 每个 APP 一张卡：id / 平台 / 版本 / 状态 / 调用总数，展开是它消费的接口清单及各自调用次数 |
| **未登记的调用方** | 有流量但不在注册表里的 `X-App-Id` —— 要么补登记，要么是没带头的旧版 APP |
| **无消费方的接口** | 没有任何 APP 引用 —— **下线候选** |
| 全部接口 | 按业务域分组的完整清单，含消费方与合计调用数 |

每个只读接口带一个「测试」按钮，直接发探测请求并显示状态码与耗时。写操作不提供按钮，避免误触产生副作用。控制台自己的探测请求带 `X-App-Id: console`，与真实 APP 流量在统计里分得开。

**数据来源与已知失真**

统计攒在 `proxy.ts` 的内存里。由于 proxy 跑在 Edge Runtime、route handler 跑在 Node Runtime，**两者内存不共享**——所以统计接口 `/api/_stats/traffic` 必须由 proxy 自己吐出，不能做成 route handler。

页面顶部有常驻提示条如实说明：冷启动会清零、多实例各算各的。**阶段 3 接入 Redis 后这些数字才持久且跨实例准确**，提示条届时移除。

### 7.3 能看到什么

| 指标 | 用途 |
|---|---|
| 各 APP 调用量 | 知道哪个 APP 在跑、跑多少 |
| 各接口调用量 | 知道哪些接口真没人用（**下一轮砍的依据**） |
| APP 版本分布 | 知道能不能安全下线旧接口 |
| 错误率 | 出问题时能定位 |

> 这条最有价值：**下一次「该砍什么」不再靠感觉，靠数据。**

---

## 8. 迁移路线

**原则：每一步都能独立上线、独立验证、独立回滚。线上 APP 全程不能崩。**

### 阶段 0 · 兜底（半天）

1. `collecting_poem` 的 `changeReq.ets` 把 baseURL 抽成常量，**加一个备用域名 fallback**
2. 打 tag / 建分支，保留可回滚点

> 先做这个：后面动服务端时，APP 有退路。

### 阶段 1 · 清场（1 天，零风险）

1. 删网页：首页、`app/games/`、`app/bookmarks/`、`app/about/`、`app/components/`、整个 `components/`
2. 删无用接口（见 §5.3）+ 6 个空目录
3. 删杂项：`my-artifact/`（无关的独立 Vite 项目）、`tests/`、`test-results/`、`public/img|cursors|favicons`
4. 删 `data/yuanqu.json`（决策 1）+ `lib/poems.ts` 里的加载分支
5. `package.json` 砍依赖（见 §3.3）+ 改名为 `api-platform`
6. **`/api/poems/{search,recommend,stage,[id]/like}` 原样不动**

> 验证：APP 所有功能照常。唯一的对外变化是搜索不再返回元曲（决策 1 的预期结果）。

### 阶段 2 · 骨架（2 天）

1. 建 `lib/core/`：response / errors / validate / redis / metrics / app-registry
2. 建 `lib/modules/poems/`，把 `lib/poems.ts` 480 行拆进去
3. 建 `/api/v1/poems/**`，逻辑与旧接口**完全一致**
4. **旧路径 `/api/poems/**` 保留，内部转发到 v1** — 这是不崩线上 APP 的关键

> 验证：新旧路径返回完全一致（写个对比脚本跑一遍）。

### 阶段 3 · 存储上线（1 天）

1. Vercel Marketplace 装 Upstash Redis
2. 点赞改走 Redis，`likes_state.json` 的 4 条记录迁进去
3. `proxy.ts` 的限流与埋点从内存 Map 改走 Redis（文件名不动）
4. 上线 `/api/v1/system/stats`

> 验证：点赞在 Vercel 上**第一次真正生效**。

### 阶段 4 · 数据归拢（0.5 天）

> 元曲全砍后此阶段大幅缩水——原计划的索引与分片方案已不需要（§6.1）。

1. 按 §6.1 把 `data/*.json` 归拢到 `data/poems/`
2. 唐诗 + 宋词 + 推荐合并为 `corpus.json`，去重
3. APP rawfile 的 4 份诗人足迹数据移入 `data/poems/footprint/`

> 验证：搜索结果与阶段 1 之后一致。

### 阶段 5 · APP 侧对齐（2 天）

1. 删死代码 `utils/request.ets`
2. `changeReq.ets` 切到 `/api/v1/`，加上 `X-App-Id: shishiji` 等头
3. `PoetFootprint.ets` 的 4 个 rawfile 改走 `/v1/poems/footprint`（保留本地兜底）
4. 通用点赞接口对接

> 验证：APP 发版。**此时服务端新旧路径都在，灰度期任何问题都能回滚。**

### 阶段 6 · 收尾（等 APP 覆盖率上来后）

1. 看 `/system/stats` 的版本分布，确认旧版 APP 占比够低
2. 下线 `_legacy` 兼容层
3. `X-App-Id` 改为强校验

**总计约 8 个工作日**，其中前 4 天完全不影响线上。

---

## 9. 风险与取舍

| 风险 | 影响 | 对策 |
|---|---|---|
| 删网页删过头 | 游戏代码找不回来 | 阶段 1 前打 tag；游戏可另开仓库存档 |
| 旧版 APP 调旧接口 | 线上崩 | `_legacy` 兼容层全程保留，等统计数据确认后再下线 |
| Redis 免费额度超了 | 写入失败 | 1 万命令/天，按当前量级用不完；`metrics` 可本地批量聚合再写 |
| 数据分片改错 | 搜索结果变了 | 阶段 4 前写新旧结果对比脚本 |
| `X-App-Id` 强校验上早了 | 旧 APP 全挂 | 第一版只统计不校验，明确写死 |

### 明确不做的事（防止范围失控）

- ❌ 不上用户体系（等真有需求）
- ❌ 不上 Postgres（等有关联查询需求）
- ❌ 不做管理后台（JSON 接口够用）
- ❌ 不做 CI/CD（Vercel 自带）
- ❌ 不做 Docker / K8s（你在 Vercel 上）

---

## 10. 决策记录

| # | 问题 | 决定 | 状态 |
|---|---|---|---|
| 1 | 元曲怎么处理 | **全砍**（方案 A） | ✅ 已定 · 见 §6.2 |
| 2 | 6 个小游戏 | **直接删**，不另开存档仓库 | ✅ 已定 · 阶段 1 |
| 3 | 指纹首页 / 书签 / API 监控页 | **直接删** | ✅ 已定 · 阶段 1 |
| 4 | 仓库改名 | `Vercel_study` → **`api-platform`** | ✅ 已定 |

**兜底**：`git tag pre-refactor-2026-08-28`（`659659b`）。任何删掉的东西都能取回：

```bash
git checkout pre-refactor-2026-08-28 -- components/games   # 例：取回游戏代码
```

> 仓库改名分两步：本地目录 + GitHub 仓库设置页改名。GitHub 会自动做旧地址跳转，
> 本地改完后跑一次 `git remote set-url origin <新地址>` 即可。
