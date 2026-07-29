// 📁 src/app/api/movies/sync/[id]/route.ts — 将 TMDB 数据同步到本地数据库
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const TMDB_BASE = 'https://api.themoviedb.org/3'

async function fetchTMDBMovie(id: string) {
  const res = await fetch(
    `${TMDB_BASE}/movie/${id}?api_key=${process.env.TMDB_API_KEY}&language=zh-CN&append_to_response=credits`,
    { next: { revalidate: 86400 } }
  )
  if (!res.ok) throw new Error('TMDB fetch failed')
  return res.json()
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // 验证登录
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  try {
    // 1. 从 TMDB 获取数据
    const tmdb = await fetchTMDBMovie(id)

    // 2. 提取需要的数据
    const director = tmdb.credits?.crew?.find(
      (c: { job: string }) => c.job === 'Director'
    )?.name || null

    const actors = (tmdb.credits?.cast || [])
      .slice(0, 5)
      .map((c: { name: string }) => c.name)

    const movie = {
      id: tmdb.id,
      title: tmdb.title,
      original_title: tmdb.original_title,
      year: tmdb.release_date ? parseInt(tmdb.release_date.slice(0, 4)) : null,
      poster_url: tmdb.poster_path
        ? `https://image.tmdb.org/t/p/w500${tmdb.poster_path}`
        : null,
      backdrop_url: tmdb.backdrop_path
        ? `https://image.tmdb.org/t/p/original${tmdb.backdrop_path}`
        : null,
      director,
      actors,
      genres: (tmdb.genres || []).map((g: { name: string }) => g.name),
      country: (tmdb.production_countries || []).map(
        (c: { name: string }) => c.name
      ),
      duration: tmdb.runtime,
      overview: tmdb.overview,
      tmdb_rating: tmdb.vote_average,
    }

    // 3. 写入数据库（upsert）
    const { data, error } = await supabase
      .from('movies')
      .upsert(movie, { onConflict: 'id' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, movie: data })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: '同步失败' },
      { status: 500 }
    )
  }
}
