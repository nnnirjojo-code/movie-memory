// 📁 src/app/movies/[id]/page.tsx — 电影详情页
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Movie } from '@/types/movie'
import MovieMemoryForm from '@/components/movie-memory-form'
import MovieMedia from '@/components/movie-media'

interface PageProps { params: Promise<{ id: string }> }

async function getData(id: string) {
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

  const { data: movie } = await supabase
    .from('movies').select('*').eq('id', parseInt(id)).single()

  const { data: memories } = await supabase
    .from('movie_memories').select('*').eq('movie_id', parseInt(id))
    .eq('is_public', true).maybeSingle()

  const { data: { user } } = await supabase.auth.getUser()

  return { movie: movie as Movie | null, memory: memories as any, isLoggedIn: !!user }
}

export default async function MovieDetailPage({ params }: PageProps) {
  const { id } = await params
  const { movie, memory, isLoggedIn } = await getData(id)
  if (!movie) notFound()

  return (
    <div className="min-h-screen relative z-[2]">
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-20">
        {/* Backdrop header */}
        {movie.backdrop_url && (
          <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden mb-8">
            <img src={movie.backdrop_url} alt="" className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-transparent" />
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* LEFT: Poster + Media */}
          <div className="lg:w-[55%] flex-shrink-0">
            {movie.poster_url ? (
              <img src={movie.poster_url} alt={movie.title}
                className="w-full max-w-md rounded-2xl shadow-[var(--shadow)] mx-auto" />
            ) : (
              <div className="w-full max-w-md aspect-[2/3] rounded-2xl bg-[var(--card)]
                flex items-center justify-center text-[#8888a0] font-title text-2xl mx-auto">
                {movie.title}
              </div>
            )}
            <div className="mt-6">
              <MovieMedia movieId={movie.id} isLoggedIn={isLoggedIn} />
            </div>
          </div>

          {/* RIGHT: Info */}
          <div className="lg:w-[45%]">
            <h1 className="font-title text-4xl md:text-5xl font-bold gradient-gold mb-2 leading-tight">
              {movie.title}
            </h1>
            {movie.original_title && movie.original_title !== movie.title && (
              <p className="text-[#8888a0] text-sm mb-5 tracking-wide">{movie.original_title}</p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap gap-3 mb-6 text-sm">
              {movie.year && (
                <span className="px-3 py-1 rounded-full bg-white/[0.06] text-[#8888a0] flex items-center gap-1">📅 {movie.year}</span>
              )}
              {movie.director && (
                <span className="px-3 py-1 rounded-full bg-white/[0.06] text-[#8888a0] flex items-center gap-1">🎬 {movie.director}</span>
              )}
              {movie.duration && (
                <span className="px-3 py-1 rounded-full bg-white/[0.06] text-[#8888a0] flex items-center gap-1">⏱ {movie.duration} 分钟</span>
              )}
              {movie.tmdb_rating && (
                <span className="px-3 py-1 rounded-full bg-[#d4a760]/[0.1] text-[#d4a760] flex items-center gap-1">★ {movie.tmdb_rating}</span>
              )}
            </div>

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {movie.genres.map(g => (
                  <span key={g} className="px-3 py-1 rounded-lg bg-[#c0392b]/10 text-[#e74c3c] text-xs font-medium">{g}</span>
                ))}
              </div>
            )}

            {/* Country */}
            {movie.country && movie.country.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6 text-xs text-[#8888a0]">
                {movie.country.map(c => <span key={c} className="px-2 py-0.5 rounded bg-white/[0.03]">{c}</span>)}
              </div>
            )}

            {/* Actors */}
            {movie.actors && movie.actors.length > 0 && (
              <div className="mb-6">
                <div className="text-[10px] uppercase tracking-[2px] text-[#8888a0] mb-2">🎭 主演</div>
                <div className="flex flex-wrap gap-2">
                  {movie.actors.map(a => (
                    <span key={a} className="text-xs text-[#8888a0] bg-white/[0.03] px-3 py-1 rounded-lg">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 已保存的记忆 */}
            {memory && memory.public_review && (
              <div className="mt-8">
                <div className="text-[10px] uppercase tracking-[2px] text-[var(--gold)] mb-2">💭 我的记忆</div>
                <div className="bg-[#d4a760]/[0.04] border-l-3 border-[var(--gold)] rounded-r-xl px-5 py-4">
                  {memory.personal_rating && (
                    <div className="text-[var(--gold)] text-sm mb-2">
                      {'★'.repeat(memory.personal_rating)}{'☆'.repeat(10 - memory.personal_rating)}
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{memory.public_review}</p>
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-[#8888a0]">
                    {memory.watched_date && <span>🎬 {memory.watched_date}</span>}
                    {memory.watch_environment && <span>📍 {memory.watch_environment}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* 记忆编辑表单 */}
            {isLoggedIn && (
              <div className="mt-6">
                <MovieMemoryForm movieId={movie.id} movieTitle={movie.title} />
              </div>
            )}

            {/* 提示登录 */}
            {!isLoggedIn && !memory?.public_review && (
              <div className="mt-8 text-center py-10 border border-dashed border-white/[0.1] rounded-xl">
                <div className="text-3xl mb-3 opacity-30">💭</div>
                <p className="font-title text-xl text-[#8888a0]">登录后可以添加你的观影记忆</p>
                <Link href="/login" className="inline-block mt-4 px-6 py-2 rounded-xl bg-gradient-to-r from-[#c0392b] to-[#e74c3c]
                  text-white text-sm hover:opacity-90 transition-opacity">登录</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
