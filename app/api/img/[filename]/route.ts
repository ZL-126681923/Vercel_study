import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

// 进程级缓存：避免同一图片在并发请求中重复读取磁盘
const fileCache = new Map<string, Buffer>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  const ext = path.extname(filename).toLowerCase();
  if (!MIME_TYPES[ext]) {
    return NextResponse.json(
      { code: -1, message: "不支持的文件类型" },
      { status: 400 }
    );
  }

  const filePath = path.join(process.cwd(), "public", "img", filename);

  let fileBuffer = fileCache.get(filePath);
  if (!fileBuffer) {
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { code: -1, message: "文件不存在" },
        { status: 404 }
      );
    }
    fileBuffer = fs.readFileSync(filePath);
    fileCache.set(filePath, fileBuffer);
  }
  const contentType = MIME_TYPES[ext];

  // Node Buffer 通过 Buffer 数组化直接交给 Web Response
  return new NextResponse(new Uint8Array(fileBuffer) as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
