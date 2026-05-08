import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = (searchParams.get("q") || searchParams.get("keyword") || searchParams.get("query") || "").trim();
  const countParam = searchParams.get("count");

  const nextUrl = new URL(request.url);
  nextUrl.pathname = "/api/poems/search";
  nextUrl.searchParams.set("q", query);
  if (countParam) nextUrl.searchParams.set("count", countParam);

  return NextResponse.redirect(nextUrl, 307);
}
