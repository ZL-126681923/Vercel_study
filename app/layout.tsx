import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "接口平台控制台",
  description: "多 APP 接口聚合平台 —— 应用、接口与调用统计",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
