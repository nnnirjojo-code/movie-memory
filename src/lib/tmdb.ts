// 📁 src/lib/tmdb.ts — TMDB API 客户端（undici fetch + 代理）
import { fetch, ProxyAgent } from 'undici'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_KEY = process.env.TMDB_API_KEY
const PROXY_URL = 'http://127.0.0.1:10818'

let proxyAgent: ProxyAgent | null = null
function getAgent() {
  if (!proxyAgent) {
    proxyAgent = new ProxyAgent(PROXY_URL)
  }
  return proxyAgent
}

const CACHE = new Map<string, { data: any; expiry: number }>()

async function tmdbFetch<T>(path: string, ttl = 60000): Promise<T> {
  const url = `${TMDB_BASE}${path}&api_key=${TMDB_KEY}`
  
  const cached = CACHE.get(url)
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T
  }

  const response = await fetch(url, {
    dispatcher: getAgent(),
  })

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`)
  }

  const data = await response.json() as T
  CACHE.set(url, { data, expiry: Date.now() + ttl })
  return data
}

interface TMDBMovieResult {
  id: number
  title: string
  original_title: string
  release_date: string
  poster_path: string | null
  vote_average: number
}

interface TMDBMovieDetail {
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

export async function searchMovies(query: string, page = '1') {
  return tmdbFetch<{ results: TMDBMovieResult[] }>(
    `/search/movie?query=${encodeURIComponent(query)}&language=zh-CN&page=${page}&include_adult=false`,
    60000
  )
}

export async function getMovieDetail(id: string) {
  return tmdbFetch<TMDBMovieDetail>(
    `/movie/${id}?language=zh-CN&append_to_response=credits`,
    86400000
  )
}
