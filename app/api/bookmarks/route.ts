import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const dataPath = path.join(process.cwd(), "data", "bookmarks.json");
const ADMIN_PASSWORD = process.env.BOOKMARK_PASSWORD || "admin123";

function checkPassword(password: string) {
  return password === ADMIN_PASSWORD;
}

function readBookmarks() {
  try {
    const data = fs.readFileSync(dataPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return { categories: [] };
  }
}

function writeBookmarks(data: unknown) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf-8");
}

// 获取所有书签（公开可读）
export async function GET() {
  try {
    const data = readBookmarks();
    return NextResponse.json({ code: 0, data: data.categories });
  } catch (error) {
    console.error("获取书签失败:", error);
    return NextResponse.json({ code: -1, message: "获取书签失败" }, { status: 500 });
  }
}

// 添加/更新书签（需要密码）
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, categoryId, bookmark, category, password } = body;

    if (!checkPassword(password)) {
      return NextResponse.json({ code: 401, message: "密码错误" }, { status: 401 });
    }

    const data = readBookmarks();

    if (action === "addCategory" && category) {
      const newCategory = {
        id: category.id || `cat-${Date.now()}`,
        name: category.name,
        icon: category.icon || "📁",
        color: category.color || "#6366F1",
        bookmarks: [],
      };
      data.categories.push(newCategory);
      writeBookmarks(data);
      return NextResponse.json({ code: 0, data: newCategory });
    }

    if (action === "addBookmark" && categoryId && bookmark) {
      const categoryIndex = data.categories.findIndex((c: { id: string }) => c.id === categoryId);
      if (categoryIndex === -1) {
        return NextResponse.json({ code: -1, message: "分类不存在" }, { status: 400 });
      }
      const newBookmark = {
        id: bookmark.id || `bm-${Date.now()}`,
        title: bookmark.title,
        url: bookmark.url,
        description: bookmark.description || "",
        icon: bookmark.icon || "link",
        iconUrl: bookmark.iconUrl || "",
      };
      data.categories[categoryIndex].bookmarks.push(newBookmark);
      writeBookmarks(data);
      return NextResponse.json({ code: 0, data: newBookmark });
    }

    return NextResponse.json({ code: -1, message: "无效的操作" }, { status: 400 });
  } catch (error) {
    console.error("操作书签失败:", error);
    return NextResponse.json({ code: -1, message: "操作失败" }, { status: 500 });
  }
}

// 删除书签或分类（需要密码）
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const bookmarkId = searchParams.get("bookmarkId");
    const password = searchParams.get("password");

    if (!checkPassword(password || "")) {
      return NextResponse.json({ code: 401, message: "密码错误" }, { status: 401 });
    }

    const data = readBookmarks();

    if (categoryId && !bookmarkId) {
      data.categories = data.categories.filter((c: { id: string }) => c.id !== categoryId);
      writeBookmarks(data);
      return NextResponse.json({ code: 0, message: "分类已删除" });
    }

    if (categoryId && bookmarkId) {
      const categoryIndex = data.categories.findIndex((c: { id: string }) => c.id === categoryId);
      if (categoryIndex !== -1) {
        data.categories[categoryIndex].bookmarks = data.categories[categoryIndex].bookmarks.filter(
          (b: { id: string }) => b.id !== bookmarkId
        );
        writeBookmarks(data);
        return NextResponse.json({ code: 0, message: "书签已删除" });
      }
    }

    return NextResponse.json({ code: -1, message: "未找到目标" }, { status: 404 });
  } catch (error) {
    console.error("删除书签失败:", error);
    return NextResponse.json({ code: -1, message: "删除失败" }, { status: 500 });
  }
}
