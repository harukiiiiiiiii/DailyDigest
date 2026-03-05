import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "每日智讯 — Daily Digest",
  description: "AI 驱动的多频道信息聚合，每天 5 分钟掌握全局",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased min-h-screen bg-bg text-text">
        {children}
      </body>
    </html>
  );
}
