// 📁 src/app/api/tmdb/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { searchMovies } from '@/lib/tmdb'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  const page = request.nextUrl.searchParams.get('page') || '1'

  if (!query) {
    return NextResponse.json({ error: '缺少搜索关键词' }, { status: 400 })
  }

  try {
    const data = await searchMovies(query, page)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('TMDB search error:', error?.cause || error.message)
    const msg = error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT'
      ? '连接 TMDB 超时 — 请检查 VPN 代理是否开启（端口 10818）'
      : '搜索失败 — ' + (error?.cause?.message || error.message)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
