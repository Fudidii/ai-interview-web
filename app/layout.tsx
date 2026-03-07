import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar"; // 引入 Sidebar 组件

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI 求职超级平台",
  description: "一站式简历优化与模拟面试助手",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <div className="flex h-screen overflow-hidden bg-gray-50">
          {/* 左侧侧边栏 */}
          <Sidebar />
          
          {/* 右侧主内容区域 */}
          <main className="flex-1 overflow-hidden h-full">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
