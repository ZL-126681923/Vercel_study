import { NextRequest, NextResponse } from "next/server";
import { createResponse, getRawMapPoemsByStage, resolveStagePrefix, STAGE_NAME_MAP } from "@/lib/poems";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const stage = (searchParams.get("stage") || searchParams.get("level") || "").trim();
  const countParam = searchParams.get("count");

  if (!stage) {
    return NextResponse.json(
      createResponse(400, "缺少 stage 参数", null),
      { status: 400 }
    );
  }

  const stageKey = resolveStagePrefix(stage);
  if (stageKey === undefined) {
    return NextResponse.json(
      createResponse(400, "无效的学段参数，支持：all/小学/初中/高中 或 xiao/chu/gao", null),
      { status: 400 }
    );
  }

  let count = 500;
  if (countParam) {
    const parsed = parseInt(countParam, 10);
    if (!isNaN(parsed)) {
      count = Math.min(500, Math.max(1, parsed));
    }
  }

  try {
    const { poems, total, returned } = getRawMapPoemsByStage(stage, count);

    return NextResponse.json(
      createResponse(0, "按学段返回诗词", poems, {
        stage: stageKey ? STAGE_NAME_MAP[stageKey] : stage,
        stageKey,
        total,
        count: returned,
      })
    );
  } catch (error) {
    console.error("Failed to load stage poems:", error);
    return NextResponse.json(
      createResponse(500, "加载学段诗词数据失败", null),
      { status: 500 }
    );
  }
}
