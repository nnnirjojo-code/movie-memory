// 📁 src/app/api/tmdb/[id]/route.ts — TMDB 电影详情代理
import { NextResponse } from 'next/server'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_KEY = process.env.TMDB_API_KEY

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!TMDB_KEY) {
    return NextResponse.json(
      { error: 'TMDB_API_KEY 未配置' },
      { status: 500 }
    )
  }

  try {
    const res = await fetch(
      `${TMDB_BASE}/movie/${id}?api_key=${TMDB_KEY}&language=zh-CN&append_to_response=credits`,
      { next: { revalidate: 86400 } } // 缓存 24 小时
    )

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ error: '电影未找到' }, { status: 404 })
      }
      return NextResponse.json(
        { error: 'TMDB API 错误' },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('TMDB fetch error:', error)
    return NextResponse.json(
      { error: '获取电影信息失败' },
      { status: 500 }
    )
  }
}
