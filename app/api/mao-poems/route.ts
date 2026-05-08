import { NextResponse } from "next/server";
import { loadMaoPoems } from "@/lib/mao";
import { createResponse } from "@/lib/poems";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const poems = loadMaoPoems();

    return NextResponse.json(
      createResponse(0, "毛主席诗词时间轨道", poems, {
        total: poems.length,
      })
    );
  } catch (error) {
    console.error("Failed to load mao poems:", error);
    return NextResponse.json(createResponse(500, "加载毛主席诗词地图失败", null), {
      status: 500,
    });
  }
}
