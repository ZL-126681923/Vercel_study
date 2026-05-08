import { NextResponse } from "next/server";
import { createResponse } from "@/lib/poems";
import fs from "fs";
import path from "path";

interface MapPoemItem {
  id: string;
  title: string;
  content: string[];
  poet: string;
  dynasty: string;
  location?: {
    name: string;
    city: string;
    province: string;
    coordinates: [number, number];
  };
}

const STAGE_PREFIX_MAP: Record<string, string | null> = {
  all: null,
  xiao: "xiao",
  primary: "xiao",
  "小学": "xiao",
  chu: "chu",
  junior: "chu",
  "初中": "chu",
  gao: "gao",
  senior: "gao",
  "高中": "gao",
};

// 强制取消缓存，保证地图数据随时是最新的
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stage = (searchParams.get("stage") || "all").trim();
  const stagePrefix = STAGE_PREFIX_MAP[stage] ?? null;
  const countParam = searchParams.get("count");
  const parsedCount = countParam ? Number.parseInt(countParam, 10) : null;
  const limit = parsedCount && parsedCount > 0 ? Math.min(parsedCount, 100) : null;

  try {
    const filePath = path.join(process.cwd(), "data/map_poems.json");
    const fileData = fs.readFileSync(filePath, "utf-8");
    const allPoems = JSON.parse(fileData) as MapPoemItem[];

    const filteredPoems = stagePrefix
      ? allPoems.filter((poem) => poem.id.startsWith(stagePrefix))
      : allPoems;
    const resultPoems = limit ? filteredPoems.slice(0, limit) : filteredPoems;

    return NextResponse.json(
      createResponse(0, "地图诗词列表", resultPoems, {
        total: filteredPoems.length,
        returned: resultPoems.length,
        stage,
        count: limit,
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
