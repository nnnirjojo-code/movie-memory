-- 📁 supabase/migrations/00001_schema.sql (可重复执行版)
-- 个人电影记忆档案馆 — 完整数据库建表 + RLS 策略
-- 在 Supabase Dashboard → SQL Editor 中执行（可重复执行，不会报错）

-- ============================================
-- 1. movies — 电影核心数据（TMDB 自动填充）
-- ============================================
CREATE TABLE IF NOT EXISTS movies (
  id            BIGINT PRIMARY KEY,
  title         TEXT NOT NULL,
  original_title TEXT,
  year          INTEGER,
  poster_url    TEXT,
  backdrop_url  TEXT,
  director      TEXT,
  actors        TEXT[],
  genres        TEXT[],
  country       TEXT[],
  duration      INTEGER,
  overview      TEXT,
  tmdb_rating   DECIMAL(3,1),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year DESC);
CREATE INDEX IF NOT EXISTS idx_movies_genres ON movies USING GIN(genres);
CREATE INDEX IF NOT EXISTS idx_movies_title_search
  ON movies USING GIN(to_tsvector('simple', title));

-- ============================================
-- 2. movie_memories — 个人电影记忆
-- ============================================
CREATE TABLE IF NOT EXISTS movie_memories (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) NOT NULL,
  movie_id          BIGINT REFERENCES movies(id) NOT NULL,
  watched_date      DATE,
  watch_environment TEXT,
  personal_notes    TEXT,
  personal_rating   INTEGER CHECK (personal_rating >= 1 AND personal_rating <= 10),
  public_review     TEXT,
  is_public         BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, movie_id)
);

-- ============================================
-- 3. movie_media — 用户上传的截图/视频
-- ============================================
CREATE TABLE IF NOT EXISTS movie_media (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) NOT NULL,
  movie_id      BIGINT REFERENCES movies(id) NOT NULL,
  file_type     TEXT NOT NULL CHECK (file_type IN ('screenshot', 'clip', 'poster_custom')),
  storage_path  TEXT NOT NULL,
  public_url    TEXT,
  mime_type     TEXT,
  file_size     BIGINT,
  is_private    BOOLEAN DEFAULT true,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movie_media_movie ON movie_media(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_media_user ON movie_media(user_id);

-- ============================================
-- 4. watch_history — 观看时间线
-- ============================================
CREATE TABLE IF NOT EXISTS watch_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) NOT NULL,
  movie_id      BIGINT REFERENCES movies(id) NOT NULL,
  watched_date  DATE NOT NULL,
  watch_count   INTEGER DEFAULT 1,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watch_history_date ON watch_history(watched_date DESC);
CREATE INDEX IF NOT EXISTS idx_watch_history_user ON watch_history(user_id, watched_date DESC);

-- ============================================
-- updated_at 触发器
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_movies_updated_at ON movies;
CREATE TRIGGER trg_movies_updated_at
  BEFORE UPDATE ON movies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_memories_updated_at ON movie_memories;
CREATE TRIGGER trg_memories_updated_at
  BEFORE UPDATE ON movie_memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY — 先删后建，可重复执行
-- ============================================
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;

-- ----- movies -----
DROP POLICY IF EXISTS "movies_public_select" ON movies;
CREATE POLICY "movies_public_select"
  ON movies FOR SELECT USING (true);

DROP POLICY IF EXISTS "movies_authenticated_all" ON movies;
CREATE POLICY "movies_authenticated_all"
  ON movies FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ----- movie_memories -----
DROP POLICY IF EXISTS "memories_select_own_or_public" ON movie_memories;
CREATE POLICY "memories_select_own_or_public"
  ON movie_memories FOR SELECT
  USING (user_id = auth.uid() OR is_public = true);

DROP POLICY IF EXISTS "memories_own_insert" ON movie_memories;
CREATE POLICY "memories_own_insert"
  ON movie_memories FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "memories_own_update" ON movie_memories;
CREATE POLICY "memories_own_update"
  ON movie_memories FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "memories_own_delete" ON movie_memories;
CREATE POLICY "memories_own_delete"
  ON movie_memories FOR DELETE
  USING (user_id = auth.uid());

-- ----- movie_media -----
DROP POLICY IF EXISTS "media_select_own_or_public" ON movie_media;
CREATE POLICY "media_select_own_or_public"
  ON movie_media FOR SELECT
  USING (user_id = auth.uid() OR is_private = false);

DROP POLICY IF EXISTS "media_own_insert" ON movie_media;
CREATE POLICY "media_own_insert"
  ON movie_media FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "media_own_update" ON movie_media;
CREATE POLICY "media_own_update"
  ON movie_media FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "media_own_delete" ON movie_media;
CREATE POLICY "media_own_delete"
  ON movie_media FOR DELETE
  USING (user_id = auth.uid());

-- ----- watch_history -----
DROP POLICY IF EXISTS "history_select_own" ON watch_history;
CREATE POLICY "history_select_own"
  ON watch_history FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "history_own_insert" ON watch_history;
CREATE POLICY "history_own_insert"
  ON watch_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "history_own_update" ON watch_history;
CREATE POLICY "history_own_update"
  ON watch_history FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "history_own_delete" ON watch_history;
CREATE POLICY "history_own_delete"
  ON watch_history FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- Storage 策略（需要先创建 bucket 后再执行）
-- ============================================
-- 取消下方注释前，请先在 Dashboard → Storage 创建 movie-memory bucket
-- 
-- DROP POLICY IF EXISTS "posters_public_read" ON storage.objects;
-- CREATE POLICY "posters_public_read"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'movie-memory' AND storage.foldername(name)[1] = 'posters');
--
-- DROP POLICY IF EXISTS "private_media_own_all" ON storage.objects;
-- CREATE POLICY "private_media_own_all"
--   ON storage.objects FOR ALL
--   USING (
--     bucket_id = 'movie-memory'
--     AND storage.foldername(name)[2] = auth.uid()::text
--   );
