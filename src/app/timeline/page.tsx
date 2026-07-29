// 📁 src/app/timeline/page.tsx — 个人观看时间线（需登录）
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function TimelinePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login?redirect=/timeline')
        return
      }
      setUser(data.user)
      setLoading(false)
    })
  }, [])

  if (loading) return null

  return (
    <div className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-[#d4a760] to-[#c0392b] bg-clip-text text-transparent mb-2">
        📅 我的观看时间线
      </h1>
      <p className="text-[#8888a0] text-sm mb-12">
        记录每一次观影，构建属于你的电影人生
      </p>

      <div className="text-center py-20 text-[#8888a0]">
        <div className="text-5xl mb-4 opacity-30">📅</div>
        <p>时间线功能开发中</p>
        <p className="text-sm mt-2">
          即将支持：按年月查看观影记录、年度统计、最常看的导演/演员
        </p>
      </div>
    </div>
  )
}
