import type { Metadata } from "next";
import ApiMonitor from "@/components/ApiMonitor";

export const metadata: Metadata = {
  title: "API 监听",
  description: "实时监测博客服务端 API 的健康状态、响应延迟与可用率。",
};

export default function AboutPage() {
  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 noise-bg pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-5 py-10 md:px-8 md:py-14">
        <ApiMonitor />
      </div>
    </div>
  );
}
