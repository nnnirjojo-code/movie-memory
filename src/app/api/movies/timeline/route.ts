// 📁 src/app/api/movies/timeline/route.ts — 获取当前用户的观影时间线 + 统计
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
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

  // 获取用户的观影记忆，关联电影信息
  const { data: memories, error } = await supabase
    .from('movie_memories')
    .select('*')
    .eq('user_id', user.id)
    .order('watched_date', { ascending: false })

  if (error) {
    console.error('Timeline query error:', error)
    return NextResponse.json({ error: '查询失败' }, { status: 500 })
  }

  if (!memories || memories.length === 0) {
    return NextResponse.json({ timeline: [], stats: null })
  }

  // 获取所有关联的电影信息
  const movieIds = [...new Set(memories.map(m => m.movie_id))]
  const { data: movies } = await supabase
    .from('movies')
    .select('id, title, original_title, year, poster_url, director, genres, tmdb_rating')
    .in('id', movieIds)

  const movieMap = new Map((movies || []).map(m => [m.id, m]))

  // 组装时间线数据
  const timelineEntries = memories
    .filter(m => m.watched_date) // 只展示有观看日期的
    .map(m => ({
      id: m.id,
      movie_id: m.movie_id,
      movie: movieMap.get(m.movie_id) || null,
      watched_date: m.watched_date,
      watch_environment: m.watch_environment,
      personal_rating: m.personal_rating,
      public_review: m.public_review,
      created_at: m.created_at,
    }))
    .filter(e => e.movie) // 过滤掉已删除的电影

  // 按年月分组
  const groups: Record<string, typeof timelineEntries> = {}
  for (const entry of timelineEntries) {
    const key = entry.watched_date!.slice(0, 7) // YYYY-MM
    if (!groups[key]) groups[key] = []
    groups[key].push(entry)
  }

  // 年度统计
  const yearStats: Record<string, {
    total: number
    avg_rating: number | null
    environments: Record<string, number>
    genres: Record<string, number>
    top_movies: { title: string; rating: number | null; movie_id: number }[]
  }> = {}

  for (const entry of timelineEntries) {
    const year = entry.watched_date!.slice(0, 4)
    if (!yearStats[year]) {
      yearStats[year] = {
        total: 0,
        avg_rating: null,
        environments: {},
        genres: {},
        top_movies: [],
      }
    }
    const st = yearStats[year]
    st.total++

    // Rating
    if (entry.personal_rating) {
      const ratings = timelineEntries
        .filter(e => e.watched_date!.startsWith(year) && e.personal_rating)
        .map(e => e.personal_rating!)
      st.avg_rating = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    }

    // Environment
    if (entry.watch_environment) {
      entry.watch_environment.split(', ').forEach((env: string) => {
        st.environments[env] = (st.environments[env] || 0) + 1
      })
    }

    // Genre
    if (entry.movie?.genres) {
      entry.movie.genres.forEach((g: string) => {
        st.genres[g] = (st.genres[g] || 0) + 1
      })
    }
  }

  // Top movies per year (by personal rating)
  for (const year of Object.keys(yearStats)) {
    const yearEntries = timelineEntries.filter(e => e.watched_date!.startsWith(year))
    const withRating = yearEntries.filter(e => e.personal_rating)
    withRating.sort((a, b) => (b.personal_rating || 0) - (a.personal_rating || 0))
    yearStats[year].top_movies = withRating.slice(0, 3).map(e => ({
      title: e.movie?.title || '',
      rating: e.personal_rating,
      movie_id: e.movie_id,
    }))
  }

  return NextResponse.json({
    timeline: groups,
    stats: yearStats,
    total: timelineEntries.length,
  })
}
