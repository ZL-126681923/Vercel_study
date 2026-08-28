import Console from "./Console";

/**
 * 控制台是这个仓库唯一的页面。
 * 统计数据来自 proxy.ts 的内存，只能在客户端实时拉取，故整页交给客户端组件。
 */
export const dynamic = "force-dynamic";

export default function Page() {
  return <Console />;
}
