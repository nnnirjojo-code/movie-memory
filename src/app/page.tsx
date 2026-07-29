// 📁 src/app/page.tsx — 首页：海报墙
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import type { Movie } from '@/types/movie'

const IMG_BASE = 'https://image.tmdb.org/t/p'

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
    .limit(50)

  return (data as Movie[]) || []
}

export default async function HomePage() {
  const movies = await getMovies()

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative text-center px-6 pt-20 pb-10 bg-gradient-to-b from-[#c0392b]/[0.06] to-transparent">
        <h1 className="text-5xl md:text-7xl font-bold mb-3 bg-gradient-to-r from-[#d4a760] to-[#c0392b] bg-clip-text text-transparent">
          🎬 电影档案馆
        </h1>
        <p className="text-[#8888a0] text-lg tracking-widest">
          — 一个人通过电影记录自己人生变化的档案系统 —
        </p>
        <p className="text-[#8888a0] text-sm mt-4">
          {movies.length > 0
            ? `已收录 ${movies.length} 部电影`
            : '还没有电影，快来添加吧'}
        </p>
      </section>

      {/* Poster Wall */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        {movies.length === 0 ? (
          <div className="text-center py-32 text-[#8888a0]">
            <div className="text-6xl mb-4 opacity-30">🎬</div>
            <p>电影数据库还是空的</p>
            <p className="text-sm mt-2">
              先去 <Link href="/admin" className="text-[#c0392b] hover:underline">管理页面</Link> 添加电影吧
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {movies.map((movie) => (
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

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent
                  opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <h3 className="text-white font-bold text-sm leading-tight">{movie.title}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    {movie.year && (
                      <span className="text-[#d4a760] text-xs">{movie.year}</span>
                    )}
                    {movie.tmdb_rating && (
                      <span className="text-[#8888a0] text-xs">★ {movie.tmdb_rating}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
