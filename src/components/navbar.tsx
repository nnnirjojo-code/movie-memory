// 📁 src/components/navbar.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Navbar() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span className="text-[#d4a760]">🎬</span>
          <span className="bg-gradient-to-r from-[#d4a760] to-[#c0392b] bg-clip-text text-transparent">
            电影档案馆
          </span>
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-[#8888a0] hover:text-white transition-colors">
            首页
          </Link>
          <Link href="/movies" className="text-[#8888a0] hover:text-white transition-colors">
            电影库
          </Link>

          {!loading && user && (
            <>
              <Link href="/timeline" className="text-[#8888a0] hover:text-white transition-colors">
                时间线
              </Link>
              <Link href="/admin" className="text-[#8888a0] hover:text-white transition-colors">
                管理
              </Link>
              <button
                onClick={handleLogout}
                className="text-[#8888a0] hover:text-[#e74c3c] transition-colors"
              >
                退出
              </button>
            </>
          )}

          {!loading && !user && (
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-lg bg-[#c0392b] text-white text-sm hover:bg-[#e74c3c] transition-colors"
            >
              登录
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
