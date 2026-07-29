// 📁 src/app/api/movies/transcode/[id]/route.ts — 服务端视频转码 H.264
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFile, unlink, readFile } from 'fs/promises'
import { createReadStream } from 'fs'
import { randomUUID } from 'crypto'

ffmpeg.setFfmpegPath(ffmpegPath.path)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { storagePath } = await request.json()

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
    // 1. 下载原始文件
    const { data: fileData, error: dlError } = await supabase.storage
      .from('movie-memory')
      .download(storagePath)

    if (dlError || !fileData) throw new Error('下载文件失败')

    const tmpInput = join(tmpdir(), `input-${randomUUID()}.mp4`)
    const tmpOutput = join(tmpdir(), `output-${randomUUID()}.mp4`)

    // 2. 写入临时文件
    const buffer = Buffer.from(await fileData.arrayBuffer())
    await writeFile(tmpInput, buffer)

    // 3. 转码为 H.264
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tmpInput)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions(['-preset fast', '-crf 28', '-b:a 128k', '-movflags +faststart'])
        .save(tmpOutput)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
    })

    // 4. 读取转码后的文件
    const transcoded = await readFile(tmpOutput)

    // 5. 上传转码后的文件到新路径（避免覆盖冲突）
    const newPath = storagePath.replace(/\.\w+$/, '_h264.mp4')

    const { error: upError } = await supabase.storage
      .from('movie-memory')
      .upload(newPath, transcoded, {
        contentType: 'video/mp4',
      })

    if (upError) throw new Error('上传转码文件失败: ' + upError.message)

    // 6. 删除原始文件
    await supabase.storage.from('movie-memory').remove([storagePath])

    // 7. 更新数据库记录的路径和 mime_type
    const { data: { publicUrl } } = supabase.storage
      .from('movie-memory')
      .getPublicUrl(newPath)

    const { error: dbError } = await supabase
      .from('movie_media')
      .update({
        storage_path: newPath,
        public_url: publicUrl,
        mime_type: 'video/mp4',
        file_size: transcoded.length,
      })
      .eq('storage_path', storagePath)
      .eq('user_id', user.id)

    if (dbError) console.error('DB update error:', dbError)

    // 清理临时文件
    await unlink(tmpInput).catch(() => {})
    await unlink(tmpOutput).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Transcode error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
