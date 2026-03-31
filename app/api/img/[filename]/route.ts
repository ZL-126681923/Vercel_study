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

  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { code: -1, message: "文件不存在" },
      { status: 404 }
    );
  }

  const fileBuffer = fs.readFileSync(filePath);
  const contentType = MIME_TYPES[ext];

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
