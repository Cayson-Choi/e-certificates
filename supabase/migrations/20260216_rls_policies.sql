-- Row Level Security (RLS) 정책
-- 보안: 각 테이블별 접근 제어

-- =============================================
-- RLS 활성화
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

-- =============================================
-- profiles 정책
-- =============================================
-- 본인 프로필 조회
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 본인 프로필 수정
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 본인 프로필 생성 (회원가입 시)
CREATE POLICY "Users can insert own profile on signup"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 관리자는 모든 프로필 조회 가능
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- =============================================
-- exams, subjects 정책 (모두 읽기 가능)
-- =============================================
CREATE POLICY "Anyone can view exams"
  ON exams FOR SELECT
  USING (TRUE);

CREATE POLICY "Anyone can view subjects"
  ON subjects FOR SELECT
  USING (TRUE);

-- 관리자만 수정 가능
CREATE POLICY "Admins can manage exams"
  ON exams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Admins can manage subjects"
  ON subjects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- =============================================
-- questions 정책
-- =============================================
-- 일반 사용자: is_active=true인 문제만 조회 (단, answer 제외는 애플리케이션 레벨에서 처리)
CREATE POLICY "Users can view active questions"
  ON questions FOR SELECT
  USING (is_active = TRUE);

-- 관리자: 모든 문제 관리 가능
CREATE POLICY "Admins can manage all questions"
  ON questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- =============================================
-- attempts 정책
-- =============================================
-- 본인 시험 기록 조회
CREATE POLICY "Users can view own attempts"
  ON attempts FOR SELECT
  USING (auth.uid() = user_id);

-- 본인 시험 생성
CREATE POLICY "Users can create own attempts"
  ON attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 본인 시험 수정 (제출 시)
CREATE POLICY "Users can update own attempts"
  ON attempts FOR UPDATE
  USING (auth.uid() = user_id);

-- 관리자는 모든 시험 조회 가능
CREATE POLICY "Admins can view all attempts"
  ON attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- =============================================
-- attempt_questions 정책
-- =============================================
-- 본인 시험지 조회
CREATE POLICY "Users can view own attempt questions"
  ON attempt_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM attempts
      WHERE attempts.id = attempt_questions.attempt_id
        AND attempts.user_id = auth.uid()
    )
  );

-- 시스템이 시험지 생성 (INSERT는 서버 사이드에서만)
CREATE POLICY "System can insert attempt questions"
  ON attempt_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM attempts
      WHERE attempts.id = attempt_questions.attempt_id
        AND attempts.user_id = auth.uid()
    )
  );

-- =============================================
-- attempt_items 정책
-- =============================================
-- 본인 답안 조회
CREATE POLICY "Users can view own answers"
  ON attempt_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM attempts
      WHERE attempts.id = attempt_items.attempt_id
        AND attempts.user_id = auth.uid()
    )
  );

-- 본인 답안 입력/수정
CREATE POLICY "Users can manage own answers"
  ON attempt_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM attempts
      WHERE attempts.id = attempt_items.attempt_id
        AND attempts.user_id = auth.uid()
        AND attempts.status = 'IN_PROGRESS'
    )
  );

-- =============================================
-- subject_scores 정책
-- =============================================
-- 본인 과목 점수 조회
CREATE POLICY "Users can view own subject scores"
  ON subject_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM attempts
      WHERE attempts.id = subject_scores.attempt_id
        AND attempts.user_id = auth.uid()
    )
  );

-- 시스템이 과목 점수 생성 (채점 시)
CREATE POLICY "System can insert subject scores"
  ON subject_scores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM attempts
      WHERE attempts.id = subject_scores.attempt_id
        AND attempts.user_id = auth.uid()
    )
  );

-- =============================================
-- daily_best_scores 정책
-- =============================================
-- 모두 조회 가능 (랭킹)
CREATE POLICY "Anyone can view daily rankings"
  ON daily_best_scores FOR SELECT
  USING (TRUE);

-- 시스템이 랭킹 업데이트
CREATE POLICY "System can manage daily rankings"
  ON daily_best_scores FOR ALL
  USING (auth.uid() = user_id);

-- =============================================
-- daily_leaderboard_snapshots 정책
-- =============================================
-- 모두 조회 가능 (어제 Top5)
CREATE POLICY "Anyone can view leaderboard snapshots"
  ON daily_leaderboard_snapshots FOR SELECT
  USING (TRUE);

-- 관리자만 스냅샷 생성/수정
CREATE POLICY "Admins can manage snapshots"
  ON daily_leaderboard_snapshots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- =============================================
-- audit_logs 정책
-- =============================================
-- 관리자만 감사 로그 조회/생성
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "Admins can create audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- =============================================
-- RLS 정책 설정 완료
-- =============================================
