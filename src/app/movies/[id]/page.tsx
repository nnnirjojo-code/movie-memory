// 📁 src/app/movies/[id]/page.tsx — 电影详情页
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Movie, MovieMemory, MovieMedia } from '@/types/movie'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getMovieData(id: string) {
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
    .from('movies')
    .select('*')
    .eq('id', parseInt(id))
    .single()

  const { data: memories } = await supabase
    .from('movie_memories')
    .select('*')
    .eq('movie_id', parseInt(id))
    .eq('is_public', true)
    .maybeSingle()

  const { data: media } = await supabase
    .from('movie_media')
    .select('*')
    .eq('movie_id', parseInt(id))
    .eq('is_private', false)

  return {
    movie: movie as Movie | null,
    memory: memories as MovieMemory | null,
    media: (media as MovieMedia[]) || [],
  }
}

export default async function MovieDetailPage({ params }: PageProps) {
  const { id } = await params
  const { movie, memory, media } = await getMovieData(id)

  if (!movie) notFound()

  return (
    <div className="min-h-screen">
      {/* Backdrop */}
      {movie.backdrop_url && (
        <div className="relative h-64 md:h-80 overflow-hidden">
          <img
            src={movie.backdrop_url}
            alt=""
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 pb-20 -mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="flex-shrink-0">
            {movie.poster_url ? (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-48 md:w-64 rounded-2xl shadow-2xl shadow-black/60"
              />
            ) : (
              <div className="w-48 md:w-64 aspect-[2/3] rounded-2xl bg-[#1a1a26]
                flex items-center justify-center text-[#8888a0] text-lg">
                {movie.title}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 pt-4 md:pt-16">
            <h1 className="text-3xl md:text-4xl font-bold mb-1">{movie.title}</h1>
            {movie.original_title && movie.original_title !== movie.title && (
              <p className="text-[#8888a0] text-sm mb-4">{movie.original_title}</p>
            )}

            {/* Meta tags */}
            <div className="flex flex-wrap gap-3 mb-6 text-sm">
              {movie.year && (
                <span className="px-3 py-1 rounded-full bg-white/[0.06] text-[#8888a0]">
                  📅 {movie.year}
                </span>
              )}
              {movie.director && (
                <span className="px-3 py-1 rounded-full bg-white/[0.06] text-[#8888a0]">
                  🎬 {movie.director}
                </span>
              )}
              {movie.duration && (
                <span className="px-3 py-1 rounded-full bg-white/[0.06] text-[#8888a0]">
                  ⏱ {movie.duration} 分钟
                </span>
              )}
              {movie.tmdb_rating && (
                <span className="px-3 py-1 rounded-full bg-[#d4a760]/[0.1] text-[#d4a760]">
                  ★ {movie.tmdb_rating}
                </span>
              )}
            </div>

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {movie.genres.map(g => (
                  <span key={g} className="px-3 py-1 rounded-lg bg-[#c0392b]/10 text-[#e74c3c] text-xs">
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            {movie.overview && (
              <div className="mb-6">
                <h3 className="text-xs uppercase tracking-widest text-[#8888a0] mb-2">📖 简介</h3>
                <p className="text-sm leading-relaxed text-[#c8c8d0]">{movie.overview}</p>
              </div>
            )}

            {/* Actors */}
            {movie.actors && movie.actors.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-widest text-[#8888a0] mb-2">🎭 主演</h3>
                <div className="flex flex-wrap gap-2">
                  {movie.actors.map(a => (
                    <span key={a} className="text-sm text-[#8888a0] bg-white/[0.03] px-3 py-1 rounded-lg">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Public Memory */}
            {memory && memory.public_review && (
              <div className="mt-8">
                <h3 className="text-xs uppercase tracking-widest text-[#d4a760] mb-2">💭 我的影评</h3>
                <div className="bg-[#d4a760]/[0.04] border-l-3 border-[#d4a760] rounded-r-xl px-5 py-4">
                  {memory.personal_rating && (
                    <div className="text-[#d4a760] text-sm mb-2">
                      {'★'.repeat(memory.personal_rating)}{'☆'.repeat(10 - memory.personal_rating)}
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{memory.public_review}</p>
                  {memory.watched_date && (
                    <p className="text-xs text-[#8888a0] mt-2">
                      观影于 {memory.watched_date}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Public Media */}
            {media.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xs uppercase tracking-widest text-[#8888a0] mb-3">📸 截图</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {media.map(m => (
                    m.file_type === 'screenshot' && m.public_url ? (
                      <img
                        key={m.id}
                        src={m.public_url}
                        alt={m.description || ''}
                        className="rounded-lg object-cover aspect-video bg-[#1a1a26]"
                      />
                    ) : m.file_type === 'clip' && m.public_url ? (
                      <video
                        key={m.id}
                        src={m.public_url}
                        controls
                        className="rounded-lg aspect-video bg-black"
                      />
                    ) : null
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
