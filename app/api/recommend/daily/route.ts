import { NextRequest, NextResponse } from "next/server";
import { loadPoems, randomSample, createResponse } from "@/lib/poems";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const countParam = searchParams.get("count");
  
  // 解析 count 参数，默认 5，范围 1-20
  let count = 5;
  if (countParam) {
    const parsed = parseInt(countParam, 10);
    if (!isNaN(parsed)) {
      count = Math.min(20, Math.max(1, parsed));
    }
  }
  
  const data = loadPoems();
  let poems = data.recommend;
  
  // 如果推荐列表为空，从全量集合中随机返回
  if (poems.length === 0) {
    poems = data.all;
  }
  
  const result = randomSample(poems, count);
  
  return NextResponse.json(
    createResponse(0, "每日推荐", result, { count: result.length })
  );
}
