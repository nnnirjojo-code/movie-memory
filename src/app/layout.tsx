// 📁 src/app/layout.tsx
import type { Metadata } from "next"
import "./globals.css"
import Navbar from "@/components/navbar"

export const metadata: Metadata = {
  title: "🎬 电影档案馆 — 个人电影记忆",
  description: "一个人通过电影记录自己人生变化的档案系统",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0a0a0f] text-[#e8e8ee]">
        <Navbar />
        <main className="flex-1 pt-14">
          {children}
        </main>
      </body>
    </html>
  )
}
