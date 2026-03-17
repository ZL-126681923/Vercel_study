import { NextRequest, NextResponse } from "next/server";
import { getPoemById, updateLikes, loadLikes, createResponse } from "@/lib/poems";

// GET: 获取点赞数（兼容接口）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  if (!id) {
    return NextResponse.json(
      createResponse(400, "缺少 id 参数", null),
      { status: 400 }
    );
  }
  
  const poem = getPoemById(id);
  
  if (!poem) {
    return NextResponse.json(
      createResponse(404, "未找到该ID的诗歌", { id }),
      { status: 404 }
    );
  }
  
  const likes = loadLikes();
  const likeCount = likes[id]?.likes || 0;
  
  return NextResponse.json(
    createResponse(0, "获取反馈数成功", { id, likes: likeCount })
  );
}

// POST: 点赞/取消点赞（兼容接口）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  if (!id) {
    return NextResponse.json(
      createResponse(400, "缺少 id 参数", null),
      { status: 400 }
    );
  }
  
  let action: "like" | "unlike" = "like";
  
  try {
    const body = await request.json();
    if (body.action === "dislike" || body.action === "unlike") {
      action = "unlike";
    }
  } catch {
    // 默认 like
  }
  
  const result = updateLikes(id, action);
  
  if (!result) {
    return NextResponse.json(
      createResponse(404, "未找到该ID的诗歌", { id }),
      { status: 404 }
    );
  }
  
  return NextResponse.json(
    createResponse(0, action === "like" ? "点赞成功" : "取消点赞成功", result)
  );
}
