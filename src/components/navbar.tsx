// 📁 src/components/navbar.tsx
'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.refresh()
  }

  const linkClass = (path: string) =>
    `text-sm transition-colors ${
      pathname === path ? 'text-white' : 'text-[#8888a0] hover:text-white'
    }`

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg">🎬</span>
          <span className="font-title text-xl gradient-gold font-bold">
            电影档案馆
          </span>
        </Link>

        <div className="flex items-center gap-5">
          <Link href="/" className={linkClass('/')}>首页</Link>
          <Link href="/movies" className={linkClass('/movies')}>电影库</Link>

          {!loading && user && (
            <>
              <Link href="/timeline" className={linkClass('/timeline')}>时间线</Link>
              <Link href="/admin" className={linkClass('/admin')}>管理</Link>
              <button
                onClick={handleLogout}
                className="text-sm text-[#8888a0] hover:text-[#e74c3c] transition-colors"
              >
                退出
              </button>
            </>
          )}

          {!loading && !user && (
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#c0392b] to-[#e74c3c] text-white text-sm
                hover:opacity-90 transition-opacity"
            >
              登录
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
