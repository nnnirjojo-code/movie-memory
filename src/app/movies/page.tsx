// 📁 src/app/movies/page.tsx — 电影目录（客户端本地过滤，点标签秒切）
'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Movie } from '@/types/movie'

function MoviesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeGenre = searchParams.get('genre')
  const supabase = createClient()

  const [movies, setMovies] = useState<Movie[]>([])
  const [ratings, setRatings] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('movies').select('*').order('year', { ascending: false })
      setMovies((data as Movie[]) || [])

      // 获取个人评分
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: memories } = await supabase
          .from('movie_memories')
          .select('movie_id, personal_rating')
          .eq('user_id', user.id)
        if (memories) {
          const r: Record<number, number> = {}
          for (const m of memories) {
            if (m.personal_rating) r[m.movie_id] = m.personal_rating
          }
          setRatings(r)
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  const allGenres = useMemo(
    () => [...new Set(movies.flatMap(m => m.genres || []))].sort(),
    [movies]
  )

  const filtered = useMemo(
    () => activeGenre
      ? movies.filter(m => m.genres?.includes(activeGenre))
      : movies,
    [movies, activeGenre]
  )

  const switchGenre = (genre: string | null) => {
    const params = new URLSearchParams()
    if (genre) params.set('genre', genre)
    const qs = params.toString()
    router.replace(`/movies${qs ? '?' + qs : ''}`, { scroll: false })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#8888a0] text-sm">
        <span className="inline-block w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mr-2" />
        加载中…
      </div>
    )
  }

  return (
    <div className="min-h-screen relative z-[2] px-6 pt-10 pb-20 max-w-7xl mx-auto">
      <h1 className="font-title text-4xl font-bold gradient-gold mb-1">🎬 电影库</h1>
      <p className="text-[#8888a0] text-sm mb-6">
        共 {filtered.length} 部电影
        {activeGenre && <span className="ml-2 opacity-60">（{activeGenre}）</span>}
      </p>

      {/* Filter — 客户端切换，不触发页面加载 */}
      <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b border-white/[0.06]">
        <button
          onClick={() => switchGenre(null)}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
            !activeGenre
              ? 'bg-[#c0392b] text-white'
              : 'border border-white/[0.1] text-[#8888a0] hover:border-[#c0392b] hover:text-white'
          }`}
        >
          🎬 全部
        </button>
        {allGenres.map(g => (
          <button
            key={g}
            onClick={() => switchGenre(g)}
            className={`px-4 py-1.5 rounded-full text-xs transition-all ${
              activeGenre === g
                ? 'bg-[#c0392b] text-white'
                : 'border border-white/[0.1] text-[#8888a0] hover:border-[#c0392b] hover:text-white'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
        {filtered.map((movie, i) => (
          <Link
            key={movie.id}
            href={`/movies/${movie.id}`}
            className="group relative aspect-[2/3] rounded-[var(--radius)] overflow-hidden bg-[var(--card)]
              shadow-[var(--shadow)] transition-all duration-400 hover:-translate-y-2 hover:scale-[1.02]
              card-hover-glow anim-fade-up"
            style={{ animationDelay: `${0.03 + i * 0.03}s` }}
          >
            {movie.poster_url ? (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#8888a0] p-4 text-center font-title text-xl">
                {movie.title}
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent
              opacity-0 group-hover:opacity-100 transition-opacity duration-350 flex flex-col justify-end p-5">
              <h3 className="font-title text-white text-xl font-bold leading-tight
                translate-y-2.5 group-hover:translate-y-0 transition-transform duration-350">
                {movie.title}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-[var(--gold)]
                translate-y-2.5 group-hover:translate-y-0 transition-transform duration-350 delay-[50ms]">
                {movie.year && <span>{movie.year}</span>}
                {movie.director && <span>· {movie.director}</span>}
              </div>
            </div>

            {/* 个人评分 */}
            {ratings[movie.id] && (
              <div className="absolute top-3 right-3 glass px-2 py-1 rounded-lg text-xs text-[var(--gold)] font-bold">
                ★ {ratings[movie.id]}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function MoviesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-[#8888a0] text-sm">加载中…</div>
    }>
      <MoviesContent />
    </Suspense>
  )
}
