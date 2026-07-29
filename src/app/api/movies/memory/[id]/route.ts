// 📁 src/app/api/movies/memory/[id]/route.ts — 保存/更新观影记忆
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

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
    const memory = {
      user_id: user.id,
      movie_id: parseInt(id),
      personal_rating: body.personal_rating || null,
      public_review: body.public_review || null,
      personal_notes: body.personal_notes || null,
      watched_date: body.watched_date || null,
      watch_environment: body.watch_environment || null,
      is_public: body.is_public ?? true,
    }

    const { data, error } = await supabase
      .from('movie_memories')
      .upsert(memory, { onConflict: 'user_id,movie_id' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, memory: data })
  } catch (error: any) {
    console.error('Memory save error:', error)
    return NextResponse.json({ error: '保存失败' }, { status: 500 })
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ memory: null })
  }

  const { data } = await supabase
    .from('movie_memories')
    .select('*')
    .eq('user_id', user.id)
    .eq('movie_id', parseInt(id))
    .maybeSingle()

  return NextResponse.json({ memory: data || null })
}
