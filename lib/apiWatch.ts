/**
 * API 接口清单
 *
 * 列出「API 健康检查 & 访问统计」页需要展示的服务器路由。
 * - safeToTest: 设为 true 表示该接口可被「测试」按钮直接 GET 探测（无副作用或参数已固化）。
 *              写操作（POST/PUT/DELETE）一律 false，避免误触。
 * - sampleQuery / sampleParams: 用于把模板路径渲染为真实 URL（满足后端必填参数）。
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type ApiGroup = "system" | "poems" | "content" | "media";

export interface WatchedEndpoint {
  /** 唯一 ID，用于 React key */
  id: string;
  /** HTTP 方法 */
  method: HttpMethod;
  /** 接口路径模板，如 /api/poems/[id] */
  path: string;
  /** 接口描述 */
  description: string;
  /** 业务分组 */
  group: ApiGroup;
  /** 是否可以在页面里直接「测试」（GET 且无副作用） */
  safeToTest: boolean;
  /** 探测时的 query 字符串（不含 ?），例如 stage=all */
  sampleQuery?: string;
  /** 路径动态段填充值，例如 { id: "xiao1" } */
  sampleParams?: Record<string, string>;
  /** 请求超时（毫秒） */
  timeoutMs?: number;
}

export const API_WATCH_ENDPOINTS: WatchedEndpoint[] = [
  // ============ 系统 ============
  {
    id: "system.health",
    method: "GET",
    path: "/api/health",
    description: "服务健康检查（返回 uptime、诗词统计等）",
    group: "system",
    safeToTest: true,
  },

  // ============ 诗词 ============
  {
    id: "poems.recommend",
    method: "GET",
    path: "/api/poems/recommend",
    description: "首页推荐诗词（随机采样）",
    group: "poems",
    safeToTest: true,
    sampleQuery: "count=1",
  },
  {
    id: "poems.search",
    method: "GET",
    path: "/api/poems/search",
    description: "按诗名 / 作者搜索诗词",
    group: "poems",
    safeToTest: true,
    sampleQuery: "q=%E6%9D%8E%E7%99%BD&count=1",
  },
  {
    id: "poems.stage",
    method: "GET",
    path: "/api/poems/stage",
    description: "按学段返回诗词（小学 / 初中 / 高中）",
    group: "poems",
    safeToTest: true,
    sampleQuery: "stage=all&count=1",
  },
  {
    id: "poems.byId",
    method: "GET",
    path: "/api/poems/[id]",
    description: "按 ID 查询单首诗词",
    group: "poems",
    safeToTest: true,
    sampleParams: { id: "xiao1" },
  },
  {
    id: "poems.like.get",
    method: "GET",
    path: "/api/poems/[id]/like",
    description: "查询点赞数",
    group: "poems",
    safeToTest: true,
    sampleParams: { id: "xiao1" },
  },
  {
    id: "poems.like.post",
    method: "POST",
    path: "/api/poems/[id]/like",
    description: "点赞 / 取消点赞（写操作，需鉴权）",
    group: "poems",
    safeToTest: false,
    sampleParams: { id: "xiao1" },
  },
  {
    id: "poems.feedback.post",
    method: "POST",
    path: "/api/poems/[id]/feedback",
    description: "提交诗词反馈（写操作）",
    group: "poems",
    safeToTest: false,
    sampleParams: { id: "xiao1" },
  },

  // ============ 内容 / 文章 / 收藏 ============
  {
    id: "content.posts",
    method: "GET",
    path: "/api/posts",
    description: "获取文章列表",
    group: "content",
    safeToTest: true,
  },
  {
    id: "content.bookmarks",
    method: "GET",
    path: "/api/bookmarks",
    description: "获取书签列表",
    group: "content",
    safeToTest: true,
  },
  {
    id: "content.dynasties",
    method: "GET",
    path: "/api/meta/dynasties",
    description: "获取朝代元数据",
    group: "content",
    safeToTest: true,
  },
  {
    id: "content.mao",
    method: "GET",
    path: "/api/mao-poems",
    description: "毛主席诗词专题数据",
    group: "content",
    safeToTest: true,
  },

  // ============ 媒体 ============
  {
    id: "media.image",
    method: "GET",
    path: "/api/img/[filename]",
    description: "图片访问 / 代理",
    group: "media",
    safeToTest: true,
    sampleParams: { filename: "app_icon.png" },
  },
];

/** 把模板路径 + sampleParams 解析为真实 URL，例如 /api/poems/[id] -> /api/poems/xiao1 */
export function resolveEndpointPath(endpoint: WatchedEndpoint): string {
  let path = endpoint.path;
  if (endpoint.sampleParams) {
    for (const [key, value] of Object.entries(endpoint.sampleParams)) {
      path = path.replace(`[${key}]`, encodeURIComponent(value));
    }
  }
  if (endpoint.sampleQuery) {
    path += `?${endpoint.sampleQuery}`;
  }
  return path;
}

export const API_GROUP_LABELS: Record<ApiGroup, string> = {
  system: "系统",
  poems: "诗词",
  content: "内容",
  media: "媒体",
};
