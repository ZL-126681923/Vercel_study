import { NextResponse } from "next/server";
import { getStats, createResponse } from "@/lib/poems";

export async function GET() {
  const stats = getStats();
  
  return NextResponse.json(
    createResponse(0, "服务健康", {
      status: "ok",
      uptime: process.uptime(),
      stats,
    })
  );
}
