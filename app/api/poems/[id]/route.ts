import { NextRequest, NextResponse } from "next/server";
import { getPoemById, createResponse } from "@/lib/poems";

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
  
  return NextResponse.json(
    createResponse(0, "查询成功", poem)
  );
}
