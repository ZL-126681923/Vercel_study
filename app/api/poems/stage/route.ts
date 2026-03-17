import { NextRequest, NextResponse } from "next/server";
import { getPoemsByStage, createResponse } from "@/lib/poems";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const stage = searchParams.get("stage") || searchParams.get("level");
  const countParam = searchParams.get("count");
  
  // 验证学段参数
  if (!stage) {
    return NextResponse.json(
      createResponse(400, "缺少 stage 参数", null),
      { status: 400 }
    );
  }
  
  // 解析 count 参数，默认 5，范围 1-50
  let count = 5;
  if (countParam) {
    const parsed = parseInt(countParam, 10);
    if (!isNaN(parsed)) {
      count = Math.min(50, Math.max(1, parsed));
    }
  }
  
  // 验证学段值
  const validStages = ["小学", "初中", "高中", "xiao", "chu", "gao"];
  if (!validStages.includes(stage)) {
    return NextResponse.json(
      createResponse(400, "无效的学段参数，支持：小学/初中/高中 或 xiao/chu/gao", null),
      { status: 400 }
    );
  }
  
  const { poems, stageKey, total } = getPoemsByStage(stage, count);
  
  // 学段中文名映射
  const stageNames: Record<string, string> = {
    xiao: "小学",
    chu: "初中",
    gao: "高中",
  };
  
  return NextResponse.json(
    createResponse(0, "按学段返回必背古诗", poems, {
      stage: stageNames[stageKey] || stage,
      stageKey,
      total,
      count: poems.length,
    })
  );
}
