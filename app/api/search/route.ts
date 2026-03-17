import { NextRequest, NextResponse } from "next/server";
import { searchPoems, createResponse } from "@/lib/poems";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const countParam = searchParams.get("count");
  
  // 验证查询参数
  if (!query) {
    return NextResponse.json(
      createResponse(400, "缺少 q 参数", null),
      { status: 400 }
    );
  }
  
  // 解析 count 参数，默认 20，范围 1-100
  let count = 20;
  if (countParam) {
    const parsed = parseInt(countParam, 10);
    if (!isNaN(parsed)) {
      count = Math.min(100, Math.max(1, parsed));
    }
  }
  
  const poems = searchPoems(query, count);
  
  return NextResponse.json(
    createResponse(0, "综合搜索（随机）", poems, {
      query,
      total: poems.length,
      count: poems.length,
    })
  );
}
