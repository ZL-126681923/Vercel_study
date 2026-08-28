/**
 * 平台注册表 —— 「聚合平台」的核心数据模型
 *
 * 两张表：
 *   ENDPOINTS  平台提供的全部接口
 *   APPS       接入平台的全部应用，以及各自消费哪些接口
 *
 * 加新 APP 时只需在 APPS 里加一条，控制台会自动出现它的分组。
 * 没有被任何 APP 消费的接口会被标为「无消费方」—— 那就是下一轮该砍的。
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/** 业务域：一个域对应 lib/modules 下的一个目录 */
export type Domain = "poems" | "common" | "system";

export interface Endpoint {
  /** 唯一 ID，也是 APP 引用它的键 */
  id: string;
  method: HttpMethod;
  /** 路径模板，动态段写成 [id] */
  path: string;
  description: string;
  domain: Domain;
  /**
   * 探测配置。只有存在此字段的接口才允许在控制台点「测试」。
   * 写操作一律不配，避免误触产生副作用。
   */
  probe?: {
    /** 动态段填充值，如 { id: "xiao001" } */
    params?: Record<string, string>;
    /** query 字符串，不含 ? */
    query?: string;
  };
}

export interface RegisteredApp {
  /** 对应请求头 X-App-Id */
  id: string;
  name: string;
  platform: string;
  version: string;
  status: "live" | "dev" | "planned";
  /** 消费的接口 ID 列表 */
  endpoints: string[];
}

export const DOMAIN_LABELS: Record<Domain, string> = {
  poems: "诗词",
  common: "公共能力",
  system: "平台",
};

// ==================== 接口表 ====================

export const ENDPOINTS: Endpoint[] = [
  {
    id: "poems.search",
    method: "GET",
    path: "/api/poems/search",
    description: "按诗名或作者搜索",
    domain: "poems",
    probe: { query: "q=%E6%9D%8E%E7%99%BD&count=1" },
  },
  {
    id: "poems.recommend",
    method: "GET",
    path: "/api/poems/recommend",
    description: "首页推荐（随机采样）",
    domain: "poems",
    probe: { query: "count=1" },
  },
  {
    id: "poems.stage",
    method: "GET",
    path: "/api/poems/stage",
    description: "按学段返回诗词，含拼音/注释/译文/赏析",
    domain: "poems",
    probe: { query: "stage=xiao&count=1" },
  },
  {
    id: "poems.byId",
    method: "GET",
    path: "/api/poems/[id]",
    description: "按 ID 查询单首诗词",
    domain: "poems",
    probe: { params: { id: "xiao001" } },
  },
  {
    id: "poems.like.get",
    method: "GET",
    path: "/api/poems/[id]/like",
    description: "查询点赞数",
    domain: "poems",
    probe: { params: { id: "xiao001" } },
  },
  {
    id: "poems.like.post",
    method: "POST",
    path: "/api/poems/[id]/like",
    description: "点赞 / 取消点赞",
    domain: "poems",
  },
  {
    id: "system.health",
    method: "GET",
    path: "/api/health",
    description: "健康检查，返回 uptime 与诗词数量统计",
    domain: "system",
    probe: {},
  },
];

// ==================== 应用表 ====================

export const APPS: RegisteredApp[] = [
  {
    id: "shishiji",
    name: "拾诗纪",
    platform: "HarmonyOS",
    version: "2.0.0",
    status: "live",
    endpoints: [
      "poems.search",
      "poems.recommend",
      "poems.stage",
      "poems.like.get",
      "poems.like.post",
    ],
  },
];

// ==================== 派生查询 ====================

export function getEndpoint(id: string): Endpoint | undefined {
  return ENDPOINTS.find((e) => e.id === id);
}

/** 某接口被哪些 APP 消费。返回空数组即「无消费方」，是下线候选 */
export function consumersOf(endpointId: string): RegisteredApp[] {
  return APPS.filter((app) => app.endpoints.includes(endpointId));
}

/** 没有任何 APP 消费的接口 */
export function orphanEndpoints(): Endpoint[] {
  return ENDPOINTS.filter((e) => consumersOf(e.id).length === 0);
}

/** 把模板路径 + probe 参数解析成可直接请求的 URL */
export function resolveProbeUrl(endpoint: Endpoint): string | null {
  if (!endpoint.probe) return null;
  let path = endpoint.path;
  for (const [key, value] of Object.entries(endpoint.probe.params ?? {})) {
    path = path.replace(`[${key}]`, encodeURIComponent(value));
  }
  if (endpoint.probe.query) path += `?${endpoint.probe.query}`;
  return path;
}

/**
 * 把真实请求路径还原成模板路径，用于统计聚合。
 * /api/poems/xiao001/like → /api/poems/[id]/like
 *
 * 不做这一步的话，每首诗会各占一行统计，表会被撑爆。
 *
 * ⚠️ 静态路径必须先于动态模板匹配，否则 /api/poems/recommend 会被
 * /api/poems/[id] 的正则吞掉 —— 与 Next.js 自身的路由优先级保持一致。
 */
export function normalizeToTemplate(path: string): string {
  // 1. 静态路径精确命中优先
  for (const ep of ENDPOINTS) {
    if (!ep.path.includes("[") && ep.path === path) return ep.path;
  }

  // 2. 再逐段比对动态模板：段数相同，且非动态段逐一相等
  const parts = path.split("/");
  for (const ep of ENDPOINTS) {
    if (!ep.path.includes("[")) continue;
    const tpl = ep.path.split("/");
    if (tpl.length !== parts.length) continue;
    const match = tpl.every(
      (seg, i) => (seg.startsWith("[") && seg.endsWith("]")) || seg === parts[i]
    );
    if (match) return ep.path;
  }

  return path;
}
