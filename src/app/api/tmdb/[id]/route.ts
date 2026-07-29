// 📁 src/app/api/tmdb/[id]/route.ts
import { NextResponse } from 'next/server'
import { getMovieDetail } from '@/lib/tmdb'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const data = await getMovieDetail(id)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('TMDB detail error:', error?.cause || error.message)
    return NextResponse.json(
      { error: '获取电影信息失败 — 请检查 VPN 是否开启' },
      { status: 500 }
    )
  }
}
