// 📁 src/lib/tmdb.ts — TMDB API 客户端（可选代理）
import { fetch, ProxyAgent } from 'undici'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_KEY = process.env.TMDB_API_KEY
const PROXY_URL = process.env.TMDB_PROXY_URL || ''

let proxyAgent: ProxyAgent | null = null
function getDispatcher() {
  if (PROXY_URL) {
    if (!proxyAgent) proxyAgent = new ProxyAgent(PROXY_URL)
    return { dispatcher: proxyAgent }
  }
  return {}
}

const CACHE = new Map<string, { data: any; expiry: number }>()

async function tmdbFetch<T>(path: string, ttl = 60000): Promise<T> {
  const url = `${TMDB_BASE}${path}&api_key=${TMDB_KEY}`
  
  const cached = CACHE.get(url)
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T
  }

  const response = await fetch(url, getDispatcher())

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`)
  }

  const data = await response.json() as T
  CACHE.set(url, { data, expiry: Date.now() + ttl })
  return data
}

export async function searchMovies(query: string, page = '1') {
  return tmdbFetch<{ results: any[] }>(
    `/search/movie?query=${encodeURIComponent(query)}&language=zh-CN&page=${page}&include_adult=false`,
    60000
  )
}

export async function getMovieDetail(id: string) {
  return tmdbFetch<any>(
    `/movie/${id}?language=zh-CN&append_to_response=credits`,
    86400000
  )
}
