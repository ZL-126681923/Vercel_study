import type { Metadata } from "next";
import { Noto_Serif_SC, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const notoSerifSC = Noto_Serif_SC({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "墨迹 | 个人博客",
    template: "%s | 墨迹",
  },
  description: "记录思考，分享见解。一个用 Next.js 构建的个人博客。",
  keywords: ["博客", "技术", "编程", "Next.js", "React"],
  authors: [{ name: "墨迹博客" }],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "墨迹博客",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="scroll-smooth">
      <body
        className={`${notoSerifSC.variable} ${jetbrainsMono.variable} antialiased bg-stone-950 text-stone-100 min-h-screen flex flex-col`}
      >
        <Header />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
