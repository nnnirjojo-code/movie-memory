// 📁 src/app/timeline/page.tsx — 个人观看时间线 + 年度统计
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface MovieBrief {
  id: number
  title: string
  original_title: string | null
  year: number | null
  poster_url: string | null
  director: string | null
  genres: string[] | null
  tmdb_rating: number | null
}

interface TimelineEntry {
  id: string
  movie_id: number
  movie: MovieBrief | null
  watched_date: string
  watch_environment: string | null
  personal_rating: number | null
  public_review: string | null
  created_at: string
}

interface YearStat {
  total: number
  avg_rating: number | null
  environments: Record<string, number>
  genres: Record<string, number>
  top_movies: { title: string; rating: number | null; movie_id: number }[]
}

export default function TimelinePage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [timeline, setTimeline] = useState<Record<string, TimelineEntry[]>>({})
  const [stats, setStats] = useState<Record<string, YearStat> | null>(null)
  const [total, setTotal] = useState(0)
  const [selectedYear, setSelectedYear] = useState<string | 'all'>('all')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login?redirect=/timeline')
        return
      }
      setUser(data.user)
      loadTimeline()
    })
  }, [])

  async function loadTimeline() {
    try {
      const res = await fetch('/api/movies/timeline')
      const data = await res.json()
      if (data.timeline) setTimeline(data.timeline)
      if (data.stats) setStats(data.stats)
      if (data.total !== undefined) setTotal(data.total)
    } catch (e) {
      console.error('Failed to load timeline:', e)
    } finally {
      setLoading(false)
    }
  }

  // 年月列表（倒序）
  const monthKeys = useMemo(() => {
    const keys = Object.keys(timeline).sort().reverse()
    if (selectedYear === 'all') return keys
    return keys.filter(k => k.startsWith(selectedYear))
  }, [timeline, selectedYear])

  // 有数据的年份
  const availableYears = useMemo(() => {
    const years = new Set(Object.keys(timeline).map(k => k.slice(0, 4)))
    return [...years].sort().reverse()
  }, [timeline])

  // 评分星星
  function renderStars(rating: number) {
    return '★'.repeat(rating) + '☆'.repeat(10 - rating)
  }

  // 月份标签
  function monthLabel(key: string) {
    const [y, m] = key.split('-')
    return `${y} 年 ${parseInt(m)} 月`
  }

  // 年度统计面板
  function renderYearStats(year: string) {
    if (!stats || !stats[year]) return null
    const s = stats[year]

    // 找到该年内的所有记录
    const yearEntries = Object.entries(timeline)
      .filter(([k]) => k.startsWith(year))
      .flatMap(([, entries]) => entries)

    return (
      <div className="mb-8">
        <h2 className="font-title text-2xl gradient-gold mb-4">
          📊 {year} 年度统计
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-white">{s.total}</div>
            <div className="text-xs text-[#8888a0] mt-1">观影数量</div>
          </div>
          {s.avg_rating && (
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-[var(--gold)]">{s.avg_rating}</div>
              <div className="text-xs text-[#8888a0] mt-1">平均评分</div>
            </div>
          )}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 text-center col-span-2">
            <div className="flex flex-wrap justify-center gap-1.5 mt-1">
              {Object.entries(s.environments)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 4)
                .map(([env, count]) => (
                  <span key={env} className="text-xs bg-[#c0392b]/10 text-[#e74c3c] px-2 py-0.5 rounded-full">
                    {env} ×{count}
                  </span>
                ))}
            </div>
            <div className="text-xs text-[#8888a0] mt-1">观看环境</div>
          </div>
        </div>

        {/* Top 3 评分最高 */}
        {s.top_movies.length > 0 && (
          <div className="mb-6">
            <div className="text-xs uppercase tracking-[2px] text-[#8888a0] mb-3">🏆 评分最高</div>
            <div className="flex flex-wrap gap-2">
              {s.top_movies.map((m, i) => (
                <Link
                  key={m.movie_id}
                  href={`/movies/${m.movie_id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#d4a760]/[0.06] border border-[#d4a760]/[0.15]
                    text-xs text-[var(--gold)] hover:bg-[#d4a760]/[0.12] transition-colors"
                >
                  <span className="font-bold">{['🥇', '🥈', '🥉'][i]}</span>
                  {m.title}
                  <span className="opacity-60">{m.rating}★</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 类型分布 */}
        {Object.keys(s.genres).length > 0 && (
          <div className="mb-4">
            <div className="text-xs uppercase tracking-[2px] text-[#8888a0] mb-2">🎭 类型分布</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(s.genres)
                .sort(([, a], [, b]) => b - a)
                .map(([genre, count]) => (
                  <span key={genre}
                    className="text-xs bg-white/[0.04] text-[#8888a0] px-2.5 py-1 rounded-full"
                  >
                    {genre} ×{count}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) return null

  return (
    <div className="min-h-screen px-6 py-10 max-w-5xl mx-auto">
      {/* Header */}
      <h1 className="text-3xl font-bold bg-gradient-to-r from-[#d4a760] to-[#c0392b] bg-clip-text text-transparent mb-2">
        📅 我的观看时间线
      </h1>
      <p className="text-[#8888a0] text-sm mb-8">
        记录了 {total} 次观影，每一帧都是记忆
      </p>

      {/* Year filter */}
      {availableYears.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedYear('all')}
            className={`px-4 py-1.5 rounded-full text-xs transition-all ${
              selectedYear === 'all'
                ? 'bg-[#c0392b] text-white'
                : 'border border-white/[0.1] text-[#8888a0] hover:border-[#c0392b] hover:text-white'
            }`}
          >
            📆 全部
          </button>
          {availableYears.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-1.5 rounded-full text-xs transition-all ${
                selectedYear === year
                  ? 'bg-[#c0392b] text-white'
                  : 'border border-white/[0.1] text-[#8888a0] hover:border-[#c0392b] hover:text-white'
              }`}
            >
              {year} 年
              {stats?.[year] && (
                <span className="ml-1 opacity-60">({stats[year].total})</span>
              )}
            </button>
          ))}
        </div>
      )}

      {monthKeys.length === 0 ? (
        <div className="text-center py-20 text-[#8888a0]">
          <div className="text-5xl mb-4 opacity-30">📅</div>
          <p>还没有观影记录</p>
          <p className="text-sm mt-2">
            去看电影详情页，添加你的观影记忆吧
          </p>
        </div>
      ) : (
        <>
          {/* Stats for selected year */}
          {selectedYear !== 'all' && stats?.[selectedYear] && (
            <div className="anim-fade-up" style={{ animationDelay: '0.03s' }}>
              {renderYearStats(selectedYear)}
              <div className="border-t border-white/[0.06] my-8" />
            </div>
          )}

          {/* Timeline entries by month */}
          {monthKeys.map((monthKey, mi) => {
            const entries = timeline[monthKey]
            return (
              <div key={monthKey} className="mb-10 anim-fade-up" style={{ animationDelay: `${0.05 + mi * 0.04}s` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-[var(--accent)] ring-4 ring-[#c0392b]/[0.2]" />
                  <h2 className="font-title text-xl text-white">{monthLabel(monthKey)}</h2>
                  <span className="text-xs text-[#8888a0]">共 {entries.length} 部</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {entries.map((entry, ei) => (
                    <Link
                      key={entry.id}
                      href={`/movies/${entry.movie_id}`}
                      className="group relative rounded-[var(--radius)] overflow-hidden bg-[var(--card)]
                        shadow-[var(--shadow)] transition-all duration-400 hover:-translate-y-2 hover:scale-[1.02]
                        card-hover-glow cursor-pointer"
                      style={{ animationDelay: `${0.1 + ei * 0.03}s` }}
                    >
                      {entry.movie?.poster_url ? (
                        <img
                          src={entry.movie.poster_url}
                          alt={entry.movie.title}
                          className="w-full aspect-[2/3] object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] flex items-center justify-center text-[#8888a0] p-3 text-center font-title text-base">
                          {entry.movie?.title || '未知电影'}
                        </div>
                      )}

                      {/* Overlay with rating and details */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent
                        opacity-0 group-hover:opacity-100 transition-opacity duration-350 flex flex-col justify-end p-4">
                        <h3 className="font-title text-white text-base font-bold leading-tight
                          translate-y-2 group-hover:translate-y-0 transition-transform duration-350">
                          {entry.movie?.title}
                        </h3>

                        {entry.personal_rating && (
                          <div className="text-[var(--gold)] text-xs mt-1
                            translate-y-2 group-hover:translate-y-0 transition-transform duration-350 delay-[30ms]">
                            {renderStars(entry.personal_rating)}
                          </div>
                        )}

                        {entry.watch_environment && (
                          <div className="text-[10px] text-[#8888a0] mt-1
                            translate-y-2 group-hover:translate-y-0 transition-transform duration-350 delay-[60ms]">
                            📍 {entry.watch_environment}
                          </div>
                        )}

                        {entry.public_review && (
                          <div className="text-[10px] text-white/60 mt-1 line-clamp-2 leading-tight
                            translate-y-2 group-hover:translate-y-0 transition-transform duration-350 delay-[90ms]">
                            {entry.public_review}
                          </div>
                        )}
                      </div>

                      {/* Rating badge (always visible) */}
                      {entry.personal_rating && (
                        <div className="absolute top-2 right-2 glass px-1.5 py-0.5 rounded-lg text-[10px] text-[var(--gold)] font-bold">
                          ★ {entry.personal_rating}
                        </div>
                      )}

                      {/* Date badge */}
                      <div className="absolute top-2 left-2 glass px-1.5 py-0.5 rounded-lg text-[10px] text-white/60">
                        {entry.watched_date?.slice(5)}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
