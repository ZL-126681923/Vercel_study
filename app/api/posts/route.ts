import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import chardet from "chardet";
import iconv from "iconv-lite";

const ADMIN_PASSWORD = process.env.BOOKMARK_PASSWORD || "admin123";
const contentDir = path.join(process.cwd(), "content");

if (!fs.existsSync(contentDir)) {
  fs.mkdirSync(contentDir, { recursive: true });
}

/**
 * 将任意编码的 Buffer 转换为 UTF-8 字符串
 * 自动检测编码，支持 GBK / GB2312 / UTF-8 / BIG5 等
 */
function bufferToUtf8(buf: Buffer): string {
  const detected = chardet.detect(buf);
  const encoding = detected || "utf-8";

  // chardet 有时返回 "windows-1252" 对应中文其实是 GBK
  const normalized = encoding.toLowerCase().replace(/-/g, "");
  if (normalized === "utf8" || normalized === "utf8bom") {
    // 去掉 BOM
    if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
      return buf.slice(3).toString("utf-8");
    }
    return buf.toString("utf-8");
  }

  // 用 iconv-lite 解码其他编码（GBK、GB2312、Big5 等）
  try {
    return iconv.decode(buf, encoding);
  } catch {
    // 解码失败则强制 UTF-8
    return buf.toString("utf-8");
  }
}

/**
 * 从文件名生成 URL 安全的 slug
 * - 纯英文数字直接小写
 * - 包含中文/特殊字符时用时间戳兜底，保证路由可用
 */
function toSlug(filename: string): string {
  const base = filename.replace(/\.md$/i, "").trim();

  // 只保留 ASCII 字母数字和连字符
  const ascii = base
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")   // 去掉中文等非 ASCII
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  // 如果转换后还有有意义的内容（至少2个字符），直接用
  if (ascii.length >= 2) return ascii;

  // 否则用时间戳 + 随机数兜底，保证唯一
  return `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** 确保 front matter 存在，没有则自动补全；支持传入用户指定的标题和标签 */
function ensureFrontMatter(
  content: string,
  originalName: string,
  overrides?: { title?: string; tags?: string[] }
): string {
  const trimmed = content.trim();
  const now = new Date().toISOString();

  if (trimmed.startsWith("---")) {
    // 已有 front matter —— 如果用户传了覆盖值，则直接替换对应字段
    if (!overrides?.title && !overrides?.tags?.length) return content;

    let result = content;
    if (overrides.title) {
      const safe = overrides.title.replace(/"/g, '\\"');
      // 替换 title 字段，没有则在 --- 结束前追加
      if (/^title:/m.test(result)) {
        result = result.replace(/^title:.*$/m, `title: "${safe}"`);
      } else {
        result = result.replace(/^---\n/, `---\ntitle: "${safe}"\n`);
      }
    }
    if (overrides.tags?.length) {
      const tagsStr = `[${overrides.tags.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(", ")}]`;
      if (/^tags:/m.test(result)) {
        result = result.replace(/^tags:.*$/m, `tags: ${tagsStr}`);
      } else {
        result = result.replace(/^---\n/, `---\ntags: ${tagsStr}\n`);
      }
    }
    return result;
  }

  // 没有 front matter —— 从文件内容或文件名推断标题
  const firstHeading = trimmed.split("\n")[0].replace(/^#+\s*/, "").trim();
  const nameTitle = originalName.replace(/\.md$/i, "").trim();
  const resolvedTitle = overrides?.title || firstHeading || nameTitle;
  const resolvedTags = overrides?.tags ?? [];

  const safeTitle = resolvedTitle.replace(/"/g, '\\"');
  const tagsStr = resolvedTags.length
    ? `[${resolvedTags.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(", ")}]`
    : "[]";

  return `---\ntitle: "${safeTitle}"\nsummary: ""\npublishedAt: "${now}"\ntags: ${tagsStr}\n---\n\n${content}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const password = formData.get("password") as string;
    const file = formData.get("file") as File;
    const titleParam = (formData.get("title") as string | null)?.trim() || "";
    const tagsParam = formData.get("tags") as string | null;
    let tagsArr: string[] = [];
    if (tagsParam) {
      try { tagsArr = JSON.parse(tagsParam); } catch { tagsArr = []; }
    }

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ code: 401, message: "密码错误" }, { status: 401 });
    }

    if (!file) {
      return NextResponse.json({ code: -1, message: "未提供文件" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".md")) {
      return NextResponse.json({ code: -1, message: "只支持 .md 文件" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ code: -1, message: "文件不能超过 5MB" }, { status: 400 });
    }

    // 用 Buffer 读取，再自动检测编码转 UTF-8
    const arrayBuffer = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    const rawContent = bufferToUtf8(buf);

    const content = ensureFrontMatter(rawContent, file.name, {
      title: titleParam || undefined,
      tags: tagsArr.length ? tagsArr : undefined,
    });
    const slug = toSlug(file.name);
    const filePath = path.join(contentDir, `${slug}.md`);

    // 如果同名文件已存在，加随机串避免覆盖
    const finalSlug = fs.existsSync(filePath)
      ? `${slug}-${Date.now()}`
      : slug;
    const finalPath = path.join(contentDir, `${finalSlug}.md`);

    // 统一写入 UTF-8
    fs.writeFileSync(finalPath, content, "utf-8");

    return NextResponse.json({ code: 0, slug: finalSlug, filename: `${finalSlug}.md` });
  } catch (error) {
    console.error("上传文章失败:", error);
    return NextResponse.json({ code: -1, message: `上传失败: ${(error as Error).message}` }, { status: 500 });
  }
}

// 删除文章
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const password = searchParams.get("password");

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ code: 401, message: "密码错误" }, { status: 401 });
    }

    if (!slug) {
      return NextResponse.json({ code: -1, message: "缺少 slug" }, { status: 400 });
    }

    const filePath = path.join(contentDir, `${slug}.md`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ code: -1, message: "文章不存在" }, { status: 404 });
    }

    fs.unlinkSync(filePath);
    return NextResponse.json({ code: 0, message: "删除成功" });
  } catch (error) {
    console.error("删除文章失败:", error);
    return NextResponse.json({ code: -1, message: "删除失败" }, { status: 500 });
  }
}
