import type { Metadata } from "next";
import { Noto_Serif_SC, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LayoutShell from "@/components/LayoutShell";
import ThemeProvider from "@/components/ThemeProvider";
import ToolSpaceTeaser from "@/components/ToolSpaceTeaser";
import { cookies } from "next/headers";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get("theme")?.value;
  const initialTheme = cookieTheme === "dark" || cookieTheme === "light" ? cookieTheme : "light";

  return (
    <html
      lang="zh-CN"
      className="scroll-smooth"
      data-theme={initialTheme}
      suppressHydrationWarning
    >
      <body
        className={`${notoSerifSC.variable} ${jetbrainsMono.variable} antialiased min-h-screen flex flex-col transition-colors duration-300`}
      >
        <ThemeProvider initialTheme={initialTheme}>
          <Header />
          <LayoutShell>{children}</LayoutShell>
          <Footer />
          <ToolSpaceTeaser />
        </ThemeProvider>
      </body>
    </html>
  );
}
