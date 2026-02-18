-- 공식 시험 (중간고사/기말고사) 기능을 위한 DB 마이그레이션
-- Supabase SQL Editor에서 실행하세요

-- 1. exams 테이블: 시험 모드, 비밀번호, 시간 제한 추가
ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS exam_mode TEXT NOT NULL DEFAULT 'PRACTICE'
    CHECK (exam_mode IN ('PRACTICE', 'OFFICIAL')),
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 60
    CHECK (duration_minutes > 0 AND duration_minutes <= 300);

-- 2. attempts 테이블: 이탈 횟수 추가
ALTER TABLE attempts
  ADD COLUMN IF NOT EXISTS violation_count INTEGER NOT NULL DEFAULT 0;

-- 3. profiles 테이블: 학번 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS student_id TEXT;

-- 4. exams 테이블: 게시 상태 추가 (OFFICIAL 시험 게시/비게시 제어)
ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;
