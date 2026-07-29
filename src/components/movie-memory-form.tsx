// 📁 src/components/movie-memory-form.tsx — 添加/编辑观影记忆
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface MovieMemory {
  personal_rating: number | null
  public_review: string | null
  watched_date: string | null
  watch_environment: string | null
}

const ALL_ENVIRONMENTS = ['🎬 电影院', '🏠 在家', '✈️ 飞机上', '🚄 火车上', '🌙 深夜', '📱 手机', '💻 电脑', '☕ 咖啡馆']

interface Props {
  movieId: number
  movieTitle: string
}

export default function MovieMemoryForm({ movieId, movieTitle }: Props) {
  const router = useRouter()
  const [rating, setRating] = useState<number | null>(null)
  const [review, setReview] = useState('')
  const [date, setDate] = useState('')
  const [environments, setEnvironments] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [saved, setSaved] = useState(false)

  // 加载已有记忆
  useEffect(() => {
    fetch(`/api/movies/memory/${movieId}`)
      .then(r => r.json())
      .then(data => {
        if (data.memory) {
          setRating(data.memory.personal_rating)
          setReview(data.memory.public_review || '')
          setDate(data.memory.watched_date || '')
          if (data.memory.watch_environment) {
            setEnvironments(data.memory.watch_environment.split(', '))
          }
        }
      })
      .finally(() => setFetching(false))
  }, [movieId])

  const toggleEnv = (env: string) => {
    setEnvironments(prev =>
      prev.includes(env) ? prev.filter(e => e !== env) : [...prev, env]
    )
  }

  const handleSave = async () => {
    setLoading(true)
    setSaved(false)

    const res = await fetch(`/api/movies/memory/${movieId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personal_rating: rating,
        public_review: review || null,
        watched_date: date || null,
        watch_environment: environments.join(', ') || null,
        is_public: true,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (data.success) {
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    }
  }

  if (fetching) {
    return <div className="text-center py-8 text-[#8888a0] text-sm">加载中…</div>
  }

  return (
    <div className="border border-white/[0.08] rounded-xl p-6">
      <h3 className="font-title text-xl gradient-gold mb-5">💭 我的记忆</h3>

      {/* 评分 */}
      <div className="mb-6">
        <label className="text-[10px] uppercase tracking-[2px] text-[#8888a0] mb-2 block">评分</label>
        <div className="flex gap-1">
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button
              key={n}
              onClick={() => setRating(n)}
              className={`w-8 h-8 rounded-lg text-sm transition-all ${
                rating && n <= rating
                  ? 'text-[var(--gold)] bg-[#d4a760]/[0.15] scale-110'
                  : 'text-[#555] bg-white/[0.04] hover:bg-white/[0.08]'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* 观看日期 */}
      <div className="mb-6">
        <label className="text-[10px] uppercase tracking-[2px] text-[#8888a0] mb-2 block">观看日期</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1]
            text-white text-sm outline-none focus:border-[var(--accent)] transition-colors"
        />
      </div>

      {/* 观看环境 - 多选 */}
      <div className="mb-6">
        <label className="text-[10px] uppercase tracking-[2px] text-[#8888a0] mb-2 block">观看环境 <span className="text-[#666] normal-case">（可多选）</span></label>
        <div className="flex flex-wrap gap-2">
          {ALL_ENVIRONMENTS.map(env => {
            const selected = environments.includes(env)
            return (
              <button
                key={env}
                onClick={() => toggleEnv(env)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  selected
                    ? 'bg-[var(--accent)] text-white shadow-[0_2px_8px_rgba(192,57,43,.3)]'
                    : 'bg-white/[0.04] text-[#8888a0] hover:bg-white/[0.08]'
                }`}
              >
                {env} {selected && '✓'}
              </button>
            )
          })}
        </div>
      </div>

      {/* 记忆文本 */}
      <div className="mb-6">
        <label className="text-[10px] uppercase tracking-[2px] text-[#8888a0] mb-2 block">我的记忆</label>
        <textarea
          value={review}
          onChange={e => setReview(e.target.value)}
          placeholder={`看过「${movieTitle}」之后，你最深的印象是什么？`}
          rows={5}
          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1]
            text-white text-sm placeholder-[#555] outline-none focus:border-[var(--accent)]
            transition-colors resize-none"
        />
      </div>

      {/* 保存按钮 */}
      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)]
          text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? '保存中…' : saved ? '✅ 已保存' : '💾 保存'}
      </button>
    </div>
  )
}
