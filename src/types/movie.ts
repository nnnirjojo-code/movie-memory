// 📁 src/types/movie.ts — 全栈类型定义

export interface Movie {
  id: number                    // TMDB ID
  title: string                 // 中文名
  original_title: string | null // 原始标题
  year: number | null
  poster_url: string | null
  backdrop_url: string | null
  director: string | null
  actors: string[]              // 主要演员
  genres: string[]              // 类型
  country: string[]             // 国家
  duration: number | null       // 分钟
  overview: string | null
  tmdb_rating: number | null
  created_at: string
  updated_at: string
}

export interface MovieMemory {
  id: string
  user_id: string
  movie_id: number
  watched_date: string | null
  watch_environment: string | null  // "在家" | "电影院" | "飞机上" etc
  personal_notes: string | null     // 私人笔记
  personal_rating: number | null    // 1-10
  public_review: string | null      // 公开影评
  is_public: boolean
  created_at: string
  updated_at: string
}

export type MediaFileType = 'screenshot' | 'clip' | 'poster_custom'

export interface MovieMedia {
  id: string
  user_id: string
  movie_id: number
  file_type: MediaFileType
  storage_path: string
  public_url: string | null
  mime_type: string | null
  file_size: number | null
  is_private: boolean
  description: string | null
  created_at: string
}

export interface WatchHistory {
  id: string
  user_id: string
  movie_id: number
  watched_date: string
  watch_count: number
  notes: string | null
  created_at: string
}

// TMDB API response shapes
export interface TMDBMovie {
  id: number
  title: string
  original_title: string
  release_date: string
  poster_path: string | null
  backdrop_path: string | null
  overview: string
  vote_average: number
  runtime: number | null
  genres: { id: number; name: string }[]
  production_countries: { iso_3166_1: string; name: string }[]
  credits?: {
    crew: { job: string; name: string }[]
    cast: { name: string; order: number }[]
  }
}

export interface TMDBSearchResult {
  id: number
  title: string
  original_title: string
  release_date: string
  poster_path: string | null
  vote_average: number
  genre_ids: number[]
}
