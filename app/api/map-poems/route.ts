import { NextResponse } from "next/server";
import { createResponse } from "@/lib/poems";
import type { PoemItem } from "@/app/poems/components/MapCore";
import fs from "fs";
import path from "path";

// 强制取消缓存，保证地图数据随时是最新的
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stage = searchParams.get("stage") || "all";

  try {
    const filePath = path.join(process.cwd(), "data/map_poems.json");
    const fileData = fs.readFileSync(filePath, "utf-8");
    const allPoems = JSON.parse(fileData) as PoemItem[];

    let filteredPoems: PoemItem[] = allPoems || [];

    // 根据 stage 参数过滤 (xiao, chu, gao)
    if (stage !== "all") {
      filteredPoems = filteredPoems.filter((poem: PoemItem) => {
        // xiao043 -> startsWith("xiao")
        if (stage === "xiao" || stage === "primary") return poem.id.startsWith("xiao");
        if (stage === "chu" || stage === "junior") return poem.id.startsWith("chu");
        if (stage === "gao" || stage === "senior") return poem.id.startsWith("gao");
        return true;
      });
    }

    return NextResponse.json(
      createResponse(0, "地图诗词列表", filteredPoems, {
        total: filteredPoems.length,
        stage,
      })
    );
  } catch (error) {
    console.error("Failed to load map poems:", error);
    return NextResponse.json(
      createResponse(500, "加载地图诗词数据失败", null),
      { status: 500 }
    );
  }
}
