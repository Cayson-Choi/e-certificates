-- ============================================================
-- 통합 DB 초기화 스크립트
-- Supabase SQL Editor에서 한 번에 실행
-- ============================================================

-- =============================================
-- PART 1: 기본 스키마 (init_schema)
-- =============================================

-- 1. profiles (회원 정보)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  affiliation TEXT CHECK (affiliation IN ('교수', '전기반', '소방반', '신중년')),
  phone TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- 2. exams (시험 종류)
CREATE TABLE exams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO exams (name) VALUES
  ('기능사'),
  ('산업기사'),
  ('기사');

-- 3. subjects (과목 설정)
CREATE TABLE subjects (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  questions_per_attempt INTEGER NOT NULL CHECK (questions_per_attempt > 0),
  order_no INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, order_no)
);

-- 4. questions (문제 은행)
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

-- 5. attempts (시험 응시 기록)
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

CREATE UNIQUE INDEX idx_one_active_attempt_per_user
  ON attempts(user_id)
  WHERE status = 'IN_PROGRESS';

CREATE INDEX idx_attempts_user_status ON attempts(user_id, status);
CREATE INDEX idx_attempts_exam ON attempts(exam_id);

CREATE TRIGGER update_attempts_updated_at
  BEFORE UPDATE ON attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. attempt_questions (시험지 스냅샷)
CREATE TABLE attempt_questions (
  attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL CHECK (seq > 0),
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  PRIMARY KEY (attempt_id, seq),
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX idx_attempt_questions_attempt ON attempt_questions(attempt_id);

-- 7. attempt_items (학생 답안)
CREATE TABLE attempt_items (
  attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected INTEGER CHECK (selected BETWEEN 1 AND 4),
  is_correct BOOLEAN,
  PRIMARY KEY (attempt_id, question_id)
);

CREATE INDEX idx_attempt_items_attempt ON attempt_items(attempt_id);

-- 8. subject_scores (과목별 점수)
CREATE TABLE subject_scores (
  attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  subject_questions INTEGER NOT NULL,
  subject_correct INTEGER NOT NULL,
  subject_score INTEGER NOT NULL,
  PRIMARY KEY (attempt_id, subject_id)
);

CREATE INDEX idx_subject_scores_attempt ON subject_scores(attempt_id);

-- 9. daily_best_scores (오늘 랭킹)
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

-- 10. daily_leaderboard_snapshots (어제 Top5 스냅샷)
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

-- 11. audit_logs (관리자 변경 이력)
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

-- 유틸리티 함수들
CREATE OR REPLACE FUNCTION to_kst_date(ts TIMESTAMPTZ)
RETURNS DATE AS $$
BEGIN
  RETURN (ts AT TIME ZONE 'Asia/Seoul')::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION now_kst()
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN NOW() AT TIME ZONE 'Asia/Seoul';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_prohibited_hour_kst()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXTRACT(HOUR FROM now_kst()) = 23;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PART 2: RLS 보안 정책
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempt_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_best_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile on signup"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- exams, subjects
CREATE POLICY "Anyone can view exams"
  ON exams FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can view subjects"
  ON subjects FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage exams"
  ON exams FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
CREATE POLICY "Admins can manage subjects"
  ON subjects FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- questions
CREATE POLICY "Users can view active questions"
  ON questions FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can manage all questions"
  ON questions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- attempts
CREATE POLICY "Users can view own attempts"
  ON attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own attempts"
  ON attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attempts"
  ON attempts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all attempts"
  ON attempts FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- attempt_questions
CREATE POLICY "Users can view own attempt questions"
  ON attempt_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM attempts WHERE attempts.id = attempt_questions.attempt_id AND attempts.user_id = auth.uid()));
CREATE POLICY "System can insert attempt questions"
  ON attempt_questions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM attempts WHERE attempts.id = attempt_questions.attempt_id AND attempts.user_id = auth.uid()));

-- attempt_items
CREATE POLICY "Users can view own answers"
  ON attempt_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM attempts WHERE attempts.id = attempt_items.attempt_id AND attempts.user_id = auth.uid()));
CREATE POLICY "Users can manage own answers"
  ON attempt_items FOR ALL
  USING (EXISTS (SELECT 1 FROM attempts WHERE attempts.id = attempt_items.attempt_id AND attempts.user_id = auth.uid() AND attempts.status = 'IN_PROGRESS'));

-- subject_scores
CREATE POLICY "Users can view own subject scores"
  ON subject_scores FOR SELECT
  USING (EXISTS (SELECT 1 FROM attempts WHERE attempts.id = subject_scores.attempt_id AND attempts.user_id = auth.uid()));
CREATE POLICY "System can insert subject scores"
  ON subject_scores FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM attempts WHERE attempts.id = subject_scores.attempt_id AND attempts.user_id = auth.uid()));

-- daily_best_scores
CREATE POLICY "Anyone can view daily rankings"
  ON daily_best_scores FOR SELECT USING (TRUE);
CREATE POLICY "System can manage daily rankings"
  ON daily_best_scores FOR ALL USING (auth.uid() = user_id);

-- daily_leaderboard_snapshots
CREATE POLICY "Anyone can view leaderboard snapshots"
  ON daily_leaderboard_snapshots FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage snapshots"
  ON daily_leaderboard_snapshots FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- audit_logs
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
CREATE POLICY "Admins can create audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- =============================================
-- PART 3: 공식시험 모드 컬럼 추가
-- =============================================

ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS exam_mode TEXT NOT NULL DEFAULT 'PRACTICE'
    CHECK (exam_mode IN ('PRACTICE', 'OFFICIAL')),
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 60
    CHECK (duration_minutes > 0 AND duration_minutes <= 300);

ALTER TABLE attempts
  ADD COLUMN IF NOT EXISTS violation_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS student_id TEXT;

ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;

-- =============================================
-- PART 4: 전기기초 시험 추가 + sort_order
-- =============================================

ALTER TABLE exams ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 100;

UPDATE exams SET sort_order = 20 WHERE name = '전기기능사';
UPDATE exams SET sort_order = 30 WHERE name = '전기산업기사';
UPDATE exams SET sort_order = 40 WHERE name = '전기기사';

INSERT INTO exams (name, exam_mode, duration_minutes, sort_order)
VALUES ('전기기초', 'PRACTICE', 60, 10);

INSERT INTO subjects (exam_id, name, questions_per_attempt, order_no)
SELECT id, '전기상식', 15, 1
FROM exams WHERE name = '전기기초';

-- ============================================================
-- 완료! 테이블 11개 + RLS 정책 + 공식시험 + 전기기초 시험 생성됨
-- ============================================================
