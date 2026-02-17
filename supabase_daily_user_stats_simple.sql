-- 일별 회원 통계 테이블 (단순 버전)
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

-- RLS 비활성화 (임시)
ALTER TABLE daily_user_stats DISABLE ROW LEVEL SECURITY;
