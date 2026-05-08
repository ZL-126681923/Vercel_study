import { NextRequest, NextResponse } from "next/server";
import { searchPoems, createResponse } from "@/lib/poems";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = (searchParams.get("q") || searchParams.get("keyword") || searchParams.get("query") || "").trim();
  const countParam = searchParams.get("count");

  if (!query) {
    return NextResponse.json(
      createResponse(400, "缺少 q 参数", null),
      { status: 400 }
    );
  }

  let count = 20;
  if (countParam) {
    const parsed = parseInt(countParam, 10);
    if (!isNaN(parsed)) {
      count = Math.min(100, Math.max(1, parsed));
    }
  }

  const poems = searchPoems(query, count);

  return NextResponse.json(
    createResponse(0, "按诗名/作者搜索", poems, {
      query,
      total: poems.length,
      count: poems.length,
    })
  );
}
