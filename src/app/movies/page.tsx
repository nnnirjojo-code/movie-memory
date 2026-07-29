// 📁 src/app/movies/page.tsx — 电影目录
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import type { Movie } from '@/types/movie'

async function getMovies(): Promise<Movie[]> {
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

  return (data as Movie[]) || []
}

export default async function MoviesPage() {
  const movies = await getMovies()

  // 提取所有类型和年份用于过滤
  const allGenres = [...new Set(movies.flatMap(m => m.genres || []))].sort()
  const allYears = [...new Set(movies.map(m => m.year).filter(Boolean))].sort((a, b) => b - a)

  return (
    <div className="min-h-screen px-6 py-10 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[#d4a760] to-[#c0392b] bg-clip-text text-transparent">
        🎬 电影库
      </h1>
      <p className="text-[#8888a0] text-sm mb-8">共 {movies.length} 部电影</p>

      {/* Genre & Year filters (client-side JS needed for dynamic filtering) */}
      {/* For MVP, we show all as a grid, no JS filter yet */}
      <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b border-white/[0.06]">
        <span className="text-xs uppercase tracking-widest text-[#8888a0] w-full mb-2">类型</span>
        {allGenres.map(g => (
          <Link
            key={g}
            href={`/movies?genre=${encodeURIComponent(g)}`}
            className="px-3 py-1 rounded-lg bg-white/[0.04] text-xs text-[#8888a0]
              hover:bg-[#c0392b]/20 hover:text-[#e74c3c] transition-colors"
          >
            {g}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {movies.map(movie => (
          <Link
            key={movie.id}
            href={`/movies/${movie.id}`}
            className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-[#1a1a26] shadow-lg
              transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-[#c0392b]/20"
          >
            {movie.poster_url ? (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#8888a0] p-4 text-center text-sm">
                {movie.title}
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent
              opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
              <h3 className="text-white font-bold text-sm leading-tight">{movie.title}</h3>
              <div className="flex items-center gap-2 mt-1.5">
                {movie.year && <span className="text-[#d4a760] text-xs">{movie.year}</span>}
                {movie.tmdb_rating && <span className="text-[#8888a0] text-xs">★ {movie.tmdb_rating}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
