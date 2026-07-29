// 📁 src/app/admin/page.tsx — 管理后台
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface TMDBSearchHit {
  id: number
  title: string
  original_title: string
  release_date: string
  poster_path: string | null
  vote_average: number
}

export default function AdminPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TMDBSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [syncing, setSyncing] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setResults([])
    setMessage('')

    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()

      if (data.error) {
        setMessage(`❌ ${data.error}`)
      } else {
        setResults(data.results || [])
      }
    } catch (e) {
      setMessage('❌ 搜索失败 — 可能是网络问题，需要开 VPN 翻墙')
    }
    setSearching(false)
  }

  const handleSync = async (tmdbId: number) => {
    setSyncing(tmdbId)
    setMessage('')

    try {
      const res = await fetch(`/api/movies/sync/${tmdbId}`, { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        setMessage(`✅ 已添加: ${data.movie.title}`)
        router.refresh()
      } else {
        setMessage(`❌ ${data.error}`)
      }
    } catch (e) {
      setMessage('❌ 同步失败，请检查网络')
    }
    setSyncing(null)
  }

  return (
    <div className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-[#d4a760] to-[#c0392b] bg-clip-text text-transparent mb-2">
        📋 管理后台
      </h1>
      <p className="text-[#8888a0] text-sm mb-8">搜索 TMDB 并添加电影到你的档案馆</p>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="搜索电影名称…"
          className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1]
            text-white placeholder-[#8888a0] outline-none focus:border-[#c0392b] transition-colors"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#c0392b] to-[#e74c3c]
            text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {searching ? '搜索中…' : '搜索'}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className="mb-6 text-sm bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        {results.map(movie => (
          <div
            key={movie.id}
            className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.06]
              rounded-xl px-4 py-3 hover:border-[#c0392b]/30 transition-colors"
          >
            {movie.poster_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                alt=""
                className="w-12 h-18 rounded object-cover"
              />
            ) : (
              <div className="w-12 h-18 rounded bg-[#1a1a26] flex items-center justify-center text-xs text-[#8888a0]">
                ?
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{movie.title}</h3>
              <p className="text-xs text-[#8888a0]">
                {movie.original_title !== movie.title && `${movie.original_title} · `}
                {movie.release_date?.slice(0, 4)} · ★ {movie.vote_average?.toFixed(1)}
              </p>
            </div>

            <button
              onClick={() => handleSync(movie.id)}
              disabled={syncing === movie.id}
              className="px-4 py-1.5 rounded-lg bg-[#c0392b]/20 text-[#e74c3c] text-sm
                hover:bg-[#c0392b]/30 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {syncing === movie.id ? '添加中…' : '添加到档案馆'}
            </button>
          </div>
        ))}

        {searching && results.length === 0 && (
          <div className="text-center py-20 text-[#8888a0]">
            <p>正在搜索…</p>
          </div>
        )}

        {!searching && results.length === 0 && query && (
          <div className="text-center py-20 text-[#8888a0]">
            <p>没有找到结果</p>
          </div>
        )}
      </div>
    </div>
  )
}
