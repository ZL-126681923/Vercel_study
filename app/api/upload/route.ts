import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ADMIN_PASSWORD = process.env.BOOKMARK_PASSWORD || "admin123";
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const password = formData.get("password") as string;
    const file = formData.get("file") as File;

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ code: 401, message: "密码错误" }, { status: 401 });
    }

    if (!file) {
      return NextResponse.json({ code: -1, message: "未提供文件" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/x-icon"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ code: -1, message: "只支持图片文件" }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ code: -1, message: "文件大小不能超过 2MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "png";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ code: 0, url: `/uploads/${filename}` });
  } catch (error) {
    console.error("上传失败:", error);
    return NextResponse.json({ code: -1, message: "上传失败" }, { status: 500 });
  }
}
