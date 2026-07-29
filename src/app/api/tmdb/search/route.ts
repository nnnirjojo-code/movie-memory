// 📁 src/app/api/tmdb/search/route.ts — TMDB 搜索代理
import { NextRequest, NextResponse } from 'next/server'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_KEY = process.env.TMDB_API_KEY

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  const page = request.nextUrl.searchParams.get('page') || '1'

  if (!query) {
    return NextResponse.json({ error: '缺少搜索关键词' }, { status: 400 })
  }

  if (!TMDB_KEY) {
    return NextResponse.json({ error: 'TMDB_API_KEY 未配置' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `${TMDB_BASE}/search/movie?query=${encodeURIComponent(query)}&language=zh-CN&page=${page}&include_adult=false`,
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'TMDB API 错误' }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('TMDB search error:', error)
    return NextResponse.json({ error: '搜索失败' }, { status: 500 })
  }
}
