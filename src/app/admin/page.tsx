// 📁 src/app/admin/page.tsx — 管理后台（单个搜索 + 批量导入）
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

type ImportTab = 'single' | 'batch'

export default function AdminPage() {
  const [tab, setTab] = useState<ImportTab>('single')

  return (
    <div className="min-h-screen px-6 py-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-[#d4a760] to-[#c0392b] bg-clip-text text-transparent mb-2">
        📋 管理后台
      </h1>
      <p className="text-[#8888a0] text-sm mb-8">搜索 TMDB 并添加电影到你的档案馆</p>

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-8 bg-white/[0.04] rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('single')}
          className={`px-5 py-1.5 rounded-lg text-sm transition-all ${
            tab === 'single' ? 'bg-[var(--accent)] text-white' : 'text-[#8888a0] hover:text-white'
          }`}
        >
          🔍 单个搜索
        </button>
        <button
          onClick={() => setTab('batch')}
          className={`px-5 py-1.5 rounded-lg text-sm transition-all ${
            tab === 'batch' ? 'bg-[var(--accent)] text-white' : 'text-[#8888a0] hover:text-white'
          }`}
        >
          📦 批量导入
        </button>
      </div>

      {tab === 'single' ? <SingleSearch /> : <BatchImport />}
    </div>
  )
}

/* ========== 单个搜索 ========== */
function SingleSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TMDBSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [syncing, setSyncing] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const router = useRouter()

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
    } catch {
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
    } catch {
      setMessage('❌ 同步失败，请检查网络')
    }
    setSyncing(null)
  }

  return (
    <>
      {/* Search bar */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="搜索电影名称…"
          className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1]
            text-white placeholder-[#8888a0] outline-none focus:border-[var(--accent)] transition-colors"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)]
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
              rounded-xl px-4 py-3 hover:border-[var(--accent)]/30 transition-colors"
          >
            {movie.poster_path ? (
              <img src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`} alt=""
                className="w-12 h-18 rounded object-cover" />
            ) : (
              <div className="w-12 h-18 rounded bg-[#1a1a26] flex items-center justify-center text-xs text-[#8888a0]">?</div>
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
              className="px-4 py-1.5 rounded-lg bg-[var(--accent)]/20 text-[var(--accent2)] text-sm
                hover:bg-[var(--accent)]/30 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {syncing === movie.id ? '添加中…' : '添加到档案馆'}
            </button>
          </div>
        ))}

        {searching && results.length === 0 && (
          <div className="text-center py-20 text-[#8888a0]"><p>正在搜索…</p></div>
        )}
        {!searching && results.length === 0 && query && (
          <div className="text-center py-20 text-[#8888a0]"><p>没有找到结果</p></div>
        )}
      </div>
    </>
  )
}

/* ========== 批量导入 ========== */
function BatchImport() {
  const [text, setText] = useState('')
  const [batchResults, setBatchResults] = useState<{
    query: string
    results: TMDBSearchHit[]
    selectedId: number | null
    syncing: boolean
    synced: boolean
  }[]>([])
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleBatchSearch = async () => {
    const names = text.split('\n').map(s => s.trim()).filter(Boolean)
    if (names.length === 0) {
      setMessage('❌ 请输入电影名称，每行一部')
      return
    }
    if (names.length > 20) {
      setMessage('❌ 一次最多导入 20 部电影')
      return
    }

    setSearching(true)
    setMessage('')
    setBatchResults([])

    const initial = names.map(name => ({
      query: name,
      results: [] as TMDBSearchHit[],
      selectedId: null as number | null,
      syncing: false,
      synced: false,
    }))
    setBatchResults(initial)

    // 逐个搜索
    for (let i = 0; i < names.length; i++) {
      try {
        const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(names[i])}`)
        const data = await res.json()
        const hits = (data.results || []).slice(0, 3)

        setBatchResults(prev => {
          const next = [...prev]
          next[i] = {
            ...next[i],
            results: hits,
            selectedId: hits.length > 0 ? hits[0].id : null,
          }
          return next
        })

        // 节流，避免 TMDB 限流
        if (i < names.length - 1) await new Promise(r => setTimeout(r, 600))
      } catch {
        // 搜索失败，留空
      }
    }

    setSearching(false)
  }

  const handleSelect = (idx: number, id: number) => {
    setBatchResults(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], selectedId: id }
      return next
    })
  }

  const handleSyncAll = async () => {
    const toSync = batchResults.filter(r => r.selectedId && !r.synced)
    if (toSync.length === 0) {
      setMessage('❌ 没有选中的电影')
      return
    }

    setMessage(`⏳ 正在导入 ${toSync.length} 部电影…`)

    for (let i = 0; i < toSync.length; i++) {
      const idx = batchResults.findIndex(r => r.query === toSync[i].query)
      if (idx < 0 || !batchResults[idx].selectedId) continue

      setBatchResults(prev => {
        const next = [...prev]
        next[idx] = { ...next[idx], syncing: true }
        return next
      })

      try {
        const res = await fetch(`/api/movies/sync/${batchResults[idx].selectedId}`, { method: 'POST' })
        const data = await res.json()
        if (data.success) {
          setBatchResults(prev => {
            const next = [...prev]
            next[idx] = { ...next[idx], syncing: false, synced: true }
            return next
          })
        }
      } catch {
        // ignore
      }

      setBatchResults(prev => {
        const next = [...prev]
        next[idx] = { ...next[idx], syncing: false }
        return next
      })
    }

    setMessage(`✅ 已完成导入 ${toSync.length} 部电影`)
    router.refresh()
  }

  const addedCount = batchResults.filter(r => r.synced).length
  const totalSelected = batchResults.filter(r => r.selectedId && !r.synced).length

  return (
    <div>
      <div className="mb-2">
        <p className="text-sm text-[#8888a0] mb-4">
          将电影名称粘贴到下方，每行一部（最多 20 部），系统会自动搜索并添加到你的档案馆
        </p>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={`请输入电影名称，每行一部\n例如：\n流浪地球\n让子弹飞\n霸王别姬\n肖申克的救赎\n星际穿越`}
        rows={6}
        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.1]
          text-white text-sm placeholder-[#555] outline-none focus:border-[var(--accent)]
          transition-colors resize-none mb-4"
      />

      <button
        onClick={handleBatchSearch}
        disabled={searching || !text.trim()}
        className="w-full mb-6 py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)]
          text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {searching ? '🔍 搜索中…' : '🔍 批量搜索'}
      </button>

      {/* Message */}
      {message && (
        <div className="mb-6 text-sm bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      {/* Batch results */}
      {batchResults.length > 0 && (
        <>
          {totalSelected > 0 && (
            <button
              onClick={handleSyncAll}
              className="w-full mb-6 py-3 rounded-xl bg-gradient-to-r from-[#27ae60] to-[#2ecc71]
                text-white font-medium hover:opacity-90 transition-opacity shadow-[0_4px_16px_rgba(39,174,96,.3)]"
            >
              📥 全部添加 ({totalSelected} 部)
            </button>
          )}

          <div className="space-y-4">
            {batchResults.map((item, idx) => (
              <div key={idx}
                className={`rounded-xl border px-4 py-3 transition-all ${
                  item.synced
                    ? 'bg-[#27ae60]/[0.06] border-[#27ae60]/[0.2]'
                    : 'bg-white/[0.03] border-white/[0.06]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    {item.synced && <span className="text-green-500">✅</span>}
                    {item.query}
                    {item.syncing && (
                      <span className="inline-block w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    )}
                    {item.synced && <span className="text-xs text-green-400">已添加</span>}
                  </h3>
                  {item.synced && <span className="text-xs text-green-500">✓</span>}
                </div>

                {item.results.length === 0 && !item.synced && (
                  <p className="text-xs text-[#555]">未找到结果</p>
                )}

                {item.results.length > 0 && !item.synced && (
                  <div className="flex flex-wrap gap-2">
                    {item.results.map(movie => (
                      <button
                        key={movie.id}
                        onClick={() => handleSelect(idx, movie.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                          item.selectedId === movie.id
                            ? 'bg-[var(--accent)] text-white ring-2 ring-[var(--accent)]/30'
                            : 'bg-white/[0.04] text-[#8888a0] hover:bg-white/[0.08]'
                        }`}
                      >
                        {movie.title}
                        <span className="ml-1 opacity-60">
                          ({movie.release_date?.slice(0, 4) || '?'})
                        </span>
                        <span className="ml-1 text-[var(--gold)]">★{movie.vote_average?.toFixed(1)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {addedCount > 0 && (
            <div className="mt-6 text-center text-sm text-green-400 bg-[#27ae60]/[0.06] border border-[#27ae60]/[0.2] rounded-xl px-4 py-3">
              ✅ 成功导入 {addedCount} 部电影
            </div>
          )}
        </>
      )}
    </div>
  )
}
