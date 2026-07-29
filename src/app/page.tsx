// 📁 src/app/page.tsx — 首页：电影海报墙（显示个人评分）
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import type { Movie } from '@/types/movie'

async function getMovies(): Promise<{ movies: Movie[]; ratings: Record<number, number> }> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data } = await supabase
    .from('movies')
    .select('*')
    .order('year', { ascending: false })
    .limit(100)
  const movies = (data as Movie[]) || []

  // 获取当前用户的个人评分
  const { data: { user } } = await supabase.auth.getUser()
  let ratings: Record<number, number> = {}
  if (user) {
    const { data: memories } = await supabase
      .from('movie_memories')
      .select('movie_id, personal_rating')
      .eq('user_id', user.id)
    if (memories) {
      for (const m of memories) {
        if (m.personal_rating) ratings[m.movie_id] = m.personal_rating
      }
    }
  }

  return { movies, ratings }
}

export default async function HomePage() {
  const { movies, ratings } = await getMovies()

  const allGenres = [...new Set(movies.flatMap(m => m.genres || []))].sort()

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="relative z-[2] text-center px-6 pt-16 pb-8 bg-gradient-to-b from-[#c0392b]/[0.06] to-transparent">
        <h1 className="font-display text-5xl md:text-7xl font-bold mb-2 gradient-gold leading-tight">
          🎬 电影档案馆
        </h1>
        <p className="text-[#8888a0] text-lg tracking-[4px]">
          — {movies.length > 0 ? `${movies.length} 部电影，每一帧都是记忆` : '每一帧都是记忆'} —
        </p>
      </header>

      {/* Toolbar */}
      <div className="relative z-[2] flex justify-center items-center gap-3 flex-wrap px-5 pb-6">
        <Link
          href="/admin"
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c0392b] to-[#e74c3c] text-white text-sm font-medium
            shadow-[0_4px_16px_rgba(192,57,43,.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(192,57,43,.4)]
            transition-all duration-300"
        >
          ＋ 添加电影
        </Link>
        <span className="text-[#8888a0] text-sm flex items-center gap-1">
          🎬 共 {movies.length} 部
        </span>
      </div>

      {/* Filter bar */}
      {allGenres.length > 0 && (
        <div className="relative z-[2] flex justify-center gap-2 flex-wrap px-5 pb-6">
          <Link
            href="/movies"
            className="px-4 py-1.5 rounded-full border border-white/[0.1] text-[#8888a0] text-xs
              hover:border-[#c0392b] hover:text-white transition-all"
          >
            🎬 全部
          </Link>
          {allGenres.map(g => (
            <Link
              key={g}
              href={`/movies?genre=${encodeURIComponent(g)}`}
              className="px-4 py-1.5 rounded-full border border-white/[0.1] text-[#8888a0] text-xs
                hover:border-[#c0392b] hover:text-white transition-all"
            >
              {g}
            </Link>
          ))}
        </div>
      )}

      {/* Movie Grid */}
      <section className="relative z-[2] max-w-7xl mx-auto px-6 pb-20">
        {movies.length === 0 ? (
          <div className="text-center py-32 text-[#8888a0]">
            <div className="text-6xl mb-4 opacity-30">🎬</div>
            <p className="font-title text-2xl">还没有电影</p>
            <p className="text-sm mt-2">点击「添加电影」开始吧</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {movies.map((movie, i) => (
              <Link
                key={movie.id}
                href={`/movies/${movie.id}`}
                className="group relative aspect-[2/3] rounded-[var(--radius)] overflow-hidden bg-[var(--card)]
                  shadow-[var(--shadow)] transition-all duration-400 hover:-translate-y-2 hover:scale-[1.02]
                  card-hover-glow anim-fade-up"
                style={{ animationDelay: `${0.03 + i * 0.04}s` }}
              >
                {movie.poster_url ? (
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#8888a0] p-4 text-center text-sm font-title text-xl">
                    {movie.title}
                  </div>
                )}

                {/* Overlay on hover */}
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
        )}
      </section>
    </div>
  )
}
