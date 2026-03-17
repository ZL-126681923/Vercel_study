import { NextResponse } from "next/server";
import { DYNASTY_ALIAS, DYNASTY_DISPLAY, createResponse } from "@/lib/poems";

export async function GET() {
  return NextResponse.json(
    createResponse(0, "朝代键与别名", {
      aliases: DYNASTY_ALIAS,
      display: DYNASTY_DISPLAY,
      supported: ["tang", "song", "yuan", "recommend"],
      chineseAliases: ["唐", "唐代", "宋", "宋代", "元", "元代", "推荐"],
    })
  );
}
