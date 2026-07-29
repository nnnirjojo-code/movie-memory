-- 确保 movie_media 表启用了 RLS 且有正确的插入策略
ALTER TABLE movie_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_own_insert" ON movie_media;
CREATE POLICY "media_own_insert"
  ON movie_media FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "media_select_own_or_public" ON movie_media;
CREATE POLICY "media_select_own_or_public"
  ON movie_media FOR SELECT
  USING (user_id = auth.uid() OR is_private = false);

DROP POLICY IF EXISTS "media_own_delete" ON movie_media;
CREATE POLICY "media_own_delete"
  ON movie_media FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- Storage bucket 策略
-- ============================================
-- 如果你还没在 Dashboard 中配置，可以用这里的 SQL

-- 登录用户可上传
DROP POLICY IF EXISTS "upload_own" ON storage.objects;
CREATE POLICY "upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'movie-memory'
    AND auth.role() = 'authenticated'
  );

-- 登录用户可读取自己的文件
DROP POLICY IF EXISTS "read_own" ON storage.objects;
CREATE POLICY "read_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'movie-memory'
    AND (
      auth.role() = 'authenticated'
      OR storage.foldername(name)[1] = 'posters'
    )
  );

-- 登录用户可删除自己的文件
DROP POLICY IF EXISTS "delete_own" ON storage.objects;
CREATE POLICY "delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'movie-memory'
    AND auth.role() = 'authenticated'
  );
