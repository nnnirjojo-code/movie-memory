// 📁 src/app/layout.tsx
import type { Metadata } from "next"
import "./globals.css"
import Navbar from "@/components/navbar"
import ParticlesBackground from "@/components/particles"

export const metadata: Metadata = {
  title: "🎬 电影档案馆 — 个人电影记忆",
  description: "一个人通过电影记录自己人生变化的档案系统",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ParticlesBackground />
        <Navbar />
        <main className="flex-1 relative z-[2] pt-14">
          {children}
        </main>
      </body>
    </html>
  )
}
