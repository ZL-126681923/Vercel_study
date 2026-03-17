import { NextRequest, NextResponse } from "next/server";
import { searchByAuthor, createResponse, DYNASTY_ALIAS } from "@/lib/poems";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get("name") || searchParams.get("author");
  const dynasty = searchParams.get("dynasty");
  const countParam = searchParams.get("count");
  
  // 验证作者参数
  if (!name) {
    return NextResponse.json(
      createResponse(400, "缺少 name 或 author 参数", null),
      { status: 400 }
    );
  }
  
  // 验证朝代参数
  if (dynasty && !DYNASTY_ALIAS[dynasty]) {
    return NextResponse.json(
      createResponse(400, "无效的朝代参数，支持：唐/宋/元/tang/song/yuan/recommend", null),
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
  
  const poems = searchByAuthor(name, dynasty || undefined, count);
  
  return NextResponse.json(
    createResponse(0, "按作者查询（随机）", poems, {
      author: name,
      dynasty: dynasty || "all",
      total: poems.length,
      count: poems.length,
    })
  );
}
