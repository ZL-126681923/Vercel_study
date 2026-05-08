import { NextRequest, NextResponse } from "next/server";
import { loadPoems, randomSample, createResponse } from "@/lib/poems";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const countParam = searchParams.get("count");

  let count = 5;
  if (countParam) {
    const parsed = parseInt(countParam, 10);
    if (!isNaN(parsed)) {
      count = Math.min(20, Math.max(1, parsed));
    }
  }

  const data = loadPoems();
  let poems = data.recommend;

  if (poems.length === 0) {
    poems = data.all;
  }

  const result = randomSample(poems, count);

  return NextResponse.json(
    createResponse(0, "首页推荐诗歌", result, { count: result.length })
  );
}
