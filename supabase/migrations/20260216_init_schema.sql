-- 전기 자격시험 CBT 데이터베이스 스키마
-- 생성일: 2026-02-16

-- =============================================
-- 1. profiles (회원 정보)
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  affiliation TEXT CHECK (affiliation IN ('교수', '전기반', '소방반', '신중년')),
  phone TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- profiles 업데이트 시 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 2. exams (시험 종류)
-- =============================================
CREATE TABLE exams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 시험 종류 삽입
INSERT INTO exams (name) VALUES
  ('기능사'),
  ('산업기사'),
  ('기사');

-- =============================================
-- 3. subjects (과목 설정)
-- =============================================
CREATE TABLE subjects (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  questions_per_attempt INTEGER NOT NULL CHECK (questions_per_attempt > 0),
  order_no INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, order_no)
);

-- =============================================
-- 4. questions (문제 은행)
-- =============================================
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  question_code TEXT NOT NULL UNIQUE,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  choice_1 TEXT NOT NULL,
  choice_2 TEXT NOT NULL,
  choice_3 TEXT NOT NULL,
  choice_4 TEXT NOT NULL,
  answer INTEGER NOT NULL CHECK (answer BETWEEN 1 AND 4),
  explanation TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_exam_subject ON questions(exam_id, subject_id, is_active);
CREATE INDEX idx_questions_code ON questions(question_code);

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 5. attempts (시험 응시 기록)
-- =============================================
CREATE TYPE attempt_status AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED');

CREATE TABLE attempts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  status attempt_status NOT NULL DEFAULT 'IN_PROGRESS',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  total_questions INTEGER NOT NULL,
  total_correct INTEGER,
  total_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 동시성 제어: 한 사람은 IN_PROGRESS 시험을 동시에 1개만 가질 수 있음
CREATE UNIQUE INDEX idx_one_active_attempt_per_user
  ON attempts(user_id)
  WHERE status = 'IN_PROGRESS';

CREATE INDEX idx_attempts_user_status ON attempts(user_id, status);
CREATE INDEX idx_attempts_exam ON attempts(exam_id);

CREATE TRIGGER update_attempts_updated_at
  BEFORE UPDATE ON attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 6. attempt_questions (시험지 스냅샷)
-- =============================================
CREATE TABLE attempt_questions (
  attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL CHECK (seq > 0),
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  PRIMARY KEY (attempt_id, seq),
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX idx_attempt_questions_attempt ON attempt_questions(attempt_id);

-- =============================================
-- 7. attempt_items (학생 답안)
-- =============================================
CREATE TABLE attempt_items (
  attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected INTEGER CHECK (selected BETWEEN 1 AND 4),
  is_correct BOOLEAN,
  PRIMARY KEY (attempt_id, question_id)
);

CREATE INDEX idx_attempt_items_attempt ON attempt_items(attempt_id);

-- =============================================
-- 8. subject_scores (과목별 점수)
-- =============================================
CREATE TABLE subject_scores (
  attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  subject_questions INTEGER NOT NULL,
  subject_correct INTEGER NOT NULL,
  subject_score INTEGER NOT NULL,
  PRIMARY KEY (attempt_id, subject_id)
);

CREATE INDEX idx_subject_scores_attempt ON subject_scores(attempt_id);

-- =============================================
-- 9. daily_best_scores (오늘 랭킹)
-- =============================================
CREATE TABLE daily_best_scores (
  kst_date DATE NOT NULL,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  best_score INTEGER NOT NULL,
  best_submitted_at TIMESTAMPTZ NOT NULL,
  attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  PRIMARY KEY (kst_date, exam_id, user_id)
);

CREATE INDEX idx_daily_best_scores_date_exam ON daily_best_scores(kst_date, exam_id, best_score DESC);

-- =============================================
-- 10. daily_leaderboard_snapshots (어제 Top5 스냅샷)
-- =============================================
CREATE TABLE daily_leaderboard_snapshots (
  kst_date DATE NOT NULL,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 5),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name_display TEXT NOT NULL,
  score INTEGER NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (kst_date, exam_id, rank)
);

CREATE INDEX idx_daily_leaderboard_date_exam ON daily_leaderboard_snapshots(kst_date, exam_id);

-- =============================================
-- 11. audit_logs (관리자 변경 이력)
-- =============================================
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id TEXT,
  reason TEXT,
  changed_fields JSONB,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_table, target_id);

-- =============================================
-- 유틸리티 함수: KST 날짜 변환
-- =============================================
CREATE OR REPLACE FUNCTION to_kst_date(ts TIMESTAMPTZ)
RETURNS DATE AS $$
BEGIN
  RETURN (ts AT TIME ZONE 'Asia/Seoul')::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- 유틸리티 함수: 현재 KST 시간
-- =============================================
CREATE OR REPLACE FUNCTION now_kst()
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN NOW() AT TIME ZONE 'Asia/Seoul';
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 유틸리티 함수: 23시대 체크
-- =============================================
CREATE OR REPLACE FUNCTION is_prohibited_hour_kst()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXTRACT(HOUR FROM now_kst()) = 23;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 스키마 초기화 완료
-- =============================================
