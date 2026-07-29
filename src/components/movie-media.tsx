// 📁 src/components/movie-media.tsx — 截图 + 视频上传与展示
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface MediaItem {
  id: string
  file_type: 'screenshot' | 'clip'
  storage_path: string
  public_url: string | null
  created_at: string
}

interface Props {
  movieId: number
  isLoggedIn: boolean
}

export default function MovieMedia({ movieId, isLoggedIn }: Props) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadPhase, setUploadPhase] = useState('')
  const [tab, setTab] = useState<'screenshot' | 'clip'>('screenshot')
  const [preview, setPreview] = useState<{ url: string; type: 'image' | 'video' } | null>(null)
  const [previewIdx, setPreviewIdx] = useState(-1)
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 加载媒体
  useEffect(() => {
    loadMedia()
  }, [movieId, tab])

  async function loadMedia() {
    const { data } = await supabase
      .from('movie_media')
      .select('*')
      .eq('movie_id', movieId)
      .eq('file_type', tab)
      .eq('is_private', false)
      .order('created_at', { ascending: false })

    if (!data) return
    const items = data as MediaItem[]

    // 视频用 signed URL（解决播放黑屏）
    const resolved = await Promise.all(items.map(async (item) => {
      if (item.file_type === 'clip') {
        const { data: signed, error } = await supabase.storage
          .from('movie-memory')
          .createSignedUrl(item.storage_path, 3600)
        if (error) console.error('Signed URL error:', error)
        console.log('Video signed URL:', signed?.signedUrl?.slice(0, 80))
        return { ...item, public_url: signed?.signedUrl || item.public_url }
      }
      return item
    }))

    setItems(resolved)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    setUploading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('请先登录')
      setUploading(false)
      return
    }

    let uploadFile: File | Blob = file
    let fileName: string
    const folder = tab === 'clip' ? 'clips' : 'screenshots'

    // 视频 - 先上传原始文件，再由服务端转码
    if (tab === 'clip') {
      setUploadPhase('📤 上传原始视频…')
      const ext = file.name.split('.').pop() || 'mp4'
      fileName = `${crypto.randomUUID()}.${ext}`
    } else {
      setUploadPhase('📤 上传中…')
      const ext = file.name.split('.').pop() || 'jpg'
      fileName = `${crypto.randomUUID()}.${ext}`
    }

    const filePath = `${folder}/${user.id}/${movieId}/${fileName}`

    // 上传到 Storage
      setUploadPhase('📤 上传中…')
      const { error: uploadError } = await supabase.storage
      .from('movie-memory')
      .upload(filePath, uploadFile, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      alert('上传失败: ' + uploadError.message)
      setUploading(false)
      setUploadPhase('')
      return
    }

    // 获取公开 URL
    const { data: { publicUrl } } = supabase.storage
      .from('movie-memory')
      .getPublicUrl(filePath)

    // 写入数据库
    const { error: dbError } = await supabase
      .from('movie_media')
      .insert({
        user_id: user.id,
        movie_id: movieId,
        file_type: tab,
        storage_path: filePath,
        public_url: publicUrl,
        mime_type: uploadFile.type || file.type,
        file_size: uploadFile.size || file.size,
        is_private: false,
      })

    if (dbError) {
      console.error('DB insert error:', dbError)
      alert('数据库写入失败: ' + dbError.message)
    }

    setUploading(false)
    setUploadPhase('')

    // 视频上传成功后，调用服务端转码
    if (tab === 'clip') {
      setUploadPhase('🔄 服务端转码中…')
      setUploading(true)
      await fetch(`/api/movies/transcode/${movieId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath: filePath }),
      })
      setUploading(false)
      setUploadPhase('')
    }

    router.refresh()

    // 刷新列表
    async function refresh() {
      const { data } = await supabase
        .from('movie_media')
        .select('*')
        .eq('movie_id', movieId)
        .eq('file_type', tab)
        .eq('is_private', false)
        .order('created_at', { ascending: false })

      if (data) {
        const resolved = await Promise.all((data as MediaItem[]).map(async (item) => {
          if (item.file_type === 'clip') {
            const { data: signed } = await supabase.storage
              .from('movie-memory')
              .createSignedUrl(item.storage_path, 3600)
            return { ...item, public_url: signed?.signedUrl || item.public_url }
          }
          return item
        }))
        setItems(resolved)
      }
    }
    refresh()
  }

  const handleDelete = async (item: MediaItem) => {
    if (!confirm(`删除这个${item.file_type === 'clip' ? '视频' : '截图'}？`)) return

    await supabase.storage.from('movie-memory').remove([item.storage_path])
    await supabase.from('movie_media').delete().eq('id', item.id)

    setItems(prev => prev.filter(x => x.id !== item.id))
  }

  // 预览导航
  function goPrev() {
    const screenshotItems = items.filter(i => i.file_type === 'screenshot')
    const idx = screenshotItems.findIndex(i => i.public_url === preview?.url)
    if (idx > 0) {
      const prev = screenshotItems[idx - 1]
      setPreview({ url: prev.public_url || '', type: 'image' })
      setPreviewIdx(items.indexOf(prev))
    }
  }
  function goNext() {
    const screenshotItems = items.filter(i => i.file_type === 'screenshot')
    const idx = screenshotItems.findIndex(i => i.public_url === preview?.url)
    if (idx < screenshotItems.length - 1) {
      const next = screenshotItems[idx + 1]
      setPreview({ url: next.public_url || '', type: 'image' })
      setPreviewIdx(items.indexOf(next))
    }
  }
  function goTo(idx: number) {
    const item = items[idx]
    if (item) {
      setPreview({ url: item.public_url || '', type: item.file_type === 'clip' ? 'video' : 'image' })
      setPreviewIdx(idx)
    }
  }

  return (
    <div>
      {/* Tab 切换 */}
      <div className="flex gap-1 mb-4 bg-white/[0.04] rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('screenshot')}
          className={`px-4 py-1.5 rounded-lg text-xs transition-all ${
            tab === 'screenshot' ? 'bg-[var(--accent)] text-white' : 'text-[#8888a0] hover:text-white'
          }`}
        >
          📸 截图
        </button>
        <button
          onClick={() => setTab('clip')}
          className={`px-4 py-1.5 rounded-lg text-xs transition-all ${
            tab === 'clip' ? 'bg-[var(--accent)] text-white' : 'text-[#8888a0] hover:text-white'
          }`}
        >
          🎬 视频
        </button>
      </div>

      {/* 媒体列表 */}
      {items.length > 0 && (
        <div className="mb-4">
          <div className={`grid gap-3 ${tab === 'clip' ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'}`}>
            {items.map((item, i) => (
              <div key={item.id} className="group relative rounded-xl overflow-hidden bg-[var(--card)]">
                {item.file_type === 'clip' ? (
                  <video
                    src={item.public_url || ''}
                    controls
                    preload="metadata"
                    className="w-full aspect-video object-cover bg-black cursor-pointer"
                    onClick={() => { setPreview({ url: item.public_url || '', type: 'video' }); setPreviewIdx(i); }}
                    onError={(e) => {
                      const video = e.target as HTMLVideoElement
                      const error = video.error
                      console.error('Video error code:', error?.code, 'message:', error?.message)
                    }}
                  />
                ) : (
                  <img
                    src={item.public_url || ''}
                    alt=""
                    className="w-full aspect-video object-cover cursor-pointer"
                    onClick={() => { setPreview({ url: item.public_url || '', type: 'image' }); setPreviewIdx(i); }}
                  />
                )}

                {isLoggedIn && (
                  <button
                    onClick={() => handleDelete(item)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 text-white/80
                      text-xs opacity-0 group-hover:opacity-100 hover:bg-[var(--accent)] transition-all"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 上传区（登录后显示） */}
      {isLoggedIn && (
        <label className={`flex items-center justify-center gap-2 px-4 py-8 rounded-xl border-2
          border-dashed border-white/[0.15] cursor-pointer hover:border-[var(--accent)]
          hover:bg-[#c0392b]/[0.03] transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <input
            ref={fileInputRef}
            type="file"
            accept={tab === 'clip' ? 'video/mp4,video/webm,video/mov' : 'image/*'}
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
          {uploading ? (
            <span className="text-[#8888a0] text-sm flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              {uploadPhase || '上传中…'}
            </span>
          ) : (
            <span className="text-[#8888a0] text-sm flex items-center gap-2">
              <span className="text-2xl opacity-50">{tab === 'clip' ? '🎬' : '📁'}</span>
              {tab === 'clip' ? '点击选择视频（mp4/webm/mov）' : '点击选择截图'}
            </span>
          )}
        </label>
      )}

      {/* 预览弹窗 */}
      {preview && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => { setPreview(null); setPreviewIdx(-1); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') goPrev()
            if (e.key === 'ArrowRight') goNext()
            if (e.key === 'Escape') { setPreview(null); setPreviewIdx(-1); }
          }}
        >
          {previewIdx >= 0 && previewIdx < items.length && items.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50
                  text-white text-xl flex items-center justify-center hover:bg-[var(--accent)]
                  transition-all z-10">
                ‹
              </button>
              <button onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50
                  text-white text-xl flex items-center justify-center hover:bg-[var(--accent)]
                  transition-all z-10">
                ›
              </button>
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2 px-4 py-2 rounded-full bg-black/50">
                {items.map((_, idx) => (
                  <button key={idx} onClick={(e) => { e.stopPropagation(); goTo(idx); }}
                    className={`w-2 h-2 rounded-full transition-all ${idx === previewIdx ? 'bg-[var(--accent)] w-6' : 'bg-white/30'}`} />
                ))}
              </div>
            </>
          )}
          {preview.type === 'video' ? (
            <video src={preview.url} controls autoPlay
              className="max-w-full max-h-full rounded-2xl shadow-2xl"
              onClick={e => e.stopPropagation()} />
          ) : (
            <img src={preview.url} alt="" className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl" />
          )}
          <button onClick={() => { setPreview(null); setPreviewIdx(-1); }}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/60 text-white text-lg
              flex items-center justify-center hover:bg-[var(--accent)] transition-colors">✕</button>
        </div>
      )}
    </div>
  )
}
