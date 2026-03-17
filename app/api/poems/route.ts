import { NextRequest, NextResponse } from "next/server";
import { getPoemsByDynasty, randomSample, createResponse, DYNASTY_ALIAS } from "@/lib/poems";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const dynasty = searchParams.get("dynasty");
  const countParam = searchParams.get("count");
  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize");
  
  // 解析分页参数
  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeParam || "20", 10) || 20));
  
  // count 优先于 pageSize
  let count = pageSize;
  if (countParam) {
    const parsed = parseInt(countParam, 10);
    if (!isNaN(parsed)) {
      count = Math.min(100, Math.max(1, parsed));
    }
  }
  
  // 验证朝代参数
  if (dynasty && !DYNASTY_ALIAS[dynasty]) {
    return NextResponse.json(
      createResponse(400, "无效的朝代参数，支持：唐/宋/元/tang/song/yuan/recommend", null),
      { status: 400 }
    );
  }
  
  const poems = dynasty ? getPoemsByDynasty(dynasty) : getPoemsByDynasty("all");
  const result = randomSample(poems, count);
  
  return NextResponse.json(
    createResponse(0, "诗歌列表（随机）", result, {
      total: poems.length,
      count: result.length,
      page,
      pageSize,
    })
  );
}
