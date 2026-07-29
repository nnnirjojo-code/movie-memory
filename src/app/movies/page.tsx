// 📁 src/app/movies/page.tsx — 电影目录（显示个人评分）
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
  const { data } = await supabase.from('movies').select('*').order('year', { ascending: false })
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

export default async function MoviesPage() {
  const { movies, ratings } = await getMovies()
  const allGenres = [...new Set(movies.flatMap(m => m.genres || []))].sort()

  return (
    <div className="min-h-screen relative z-[2] px-6 pt-10 pb-20 max-w-7xl mx-auto">
      <h1 className="font-title text-4xl font-bold gradient-gold mb-1">🎬 电影库</h1>
      <p className="text-[#8888a0] text-sm mb-6">共 {movies.length} 部电影</p>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b border-white/[0.06]">
        <Link href="/movies" className="px-4 py-1.5 rounded-full bg-[#c0392b] text-white text-xs font-medium">
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

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
        {movies.map((movie, i) => (
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
