-- 일별 회원 통계 테이블
CREATE TABLE IF NOT EXISTS daily_user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  affiliation TEXT NOT NULL,
  signups_count INT DEFAULT 0,
  deletions_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, affiliation)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_daily_user_stats_date ON daily_user_stats(date);
CREATE INDEX IF NOT EXISTS idx_daily_user_stats_affiliation ON daily_user_stats(affiliation);

-- RLS 활성화
ALTER TABLE daily_user_stats ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Admins can read daily_user_stats" ON daily_user_stats;
DROP POLICY IF EXISTS "Admins can insert daily_user_stats" ON daily_user_stats;
DROP POLICY IF EXISTS "Admins can update daily_user_stats" ON daily_user_stats;

-- 관리자만 읽기/쓰기 가능
CREATE POLICY "Admins can read daily_user_stats"
  ON daily_user_stats
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert daily_user_stats"
  ON daily_user_stats
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update daily_user_stats"
  ON daily_user_stats
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_daily_user_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_daily_user_stats_updated_at ON daily_user_stats;

CREATE TRIGGER trigger_update_daily_user_stats_updated_at
  BEFORE UPDATE ON daily_user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_user_stats_updated_at();
