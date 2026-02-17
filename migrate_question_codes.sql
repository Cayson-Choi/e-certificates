-- 기존 문제 코드를 새로운 형식으로 변환 (PostgreSQL)
-- ⚠️ 실행 전 백업 필수!

-- 1. 전기기능사 문제 코드 변경

-- 전기기능사 - 전기이론 (subject_id = 1)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM questions
  WHERE exam_id = 1 AND subject_id = 1
)
UPDATE questions q
SET question_code = 'ELEC-F-TH-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE q.id = n.id;

-- 전기기능사 - 전기기기 (subject_id = 2)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM questions
  WHERE exam_id = 1 AND subject_id = 2
)
UPDATE questions q
SET question_code = 'ELEC-F-MA-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE q.id = n.id;

-- 전기기능사 - 전기설비 (subject_id = 3)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM questions
  WHERE exam_id = 1 AND subject_id = 3
)
UPDATE questions q
SET question_code = 'ELEC-F-FA-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE q.id = n.id;

-- 2. 전기산업기사 문제 코드 변경

-- 전기산업기사 - 전기이론 (subject_id = 4)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM questions
  WHERE exam_id = 2 AND subject_id = 4
)
UPDATE questions q
SET question_code = 'ELEC-I-TH-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE q.id = n.id;

-- 전기산업기사 - 전기기기 (subject_id = 5)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM questions
  WHERE exam_id = 2 AND subject_id = 5
)
UPDATE questions q
SET question_code = 'ELEC-I-MA-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE q.id = n.id;

-- 전기산업기사 - 회로이론 (subject_id = 6)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM questions
  WHERE exam_id = 2 AND subject_id = 6
)
UPDATE questions q
SET question_code = 'ELEC-I-CI-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE q.id = n.id;

-- 전기산업기사 - 제어공학 (subject_id = 7)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM questions
  WHERE exam_id = 2 AND subject_id = 7
)
UPDATE questions q
SET question_code = 'ELEC-I-CT-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE q.id = n.id;

-- 전기산업기사 - 전기설비기술기준 (subject_id = 8)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM questions
  WHERE exam_id = 2 AND subject_id = 8
)
UPDATE questions q
SET question_code = 'ELEC-I-EL-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE q.id = n.id;

-- 3. 전기기사 문제 코드 변경

-- 전기기사 - 전기이론 (subject_id = 9)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM questions
  WHERE exam_id = 3 AND subject_id = 9
)
UPDATE questions q
SET question_code = 'ELEC-E-TH-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE q.id = n.id;

-- 전기기사 - 전기기기 (subject_id = 10)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM questions
  WHERE exam_id = 3 AND subject_id = 10
)
UPDATE questions q
SET question_code = 'ELEC-E-MA-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE q.id = n.id;

-- 전기기사 - 전력공학 (subject_id = 11)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM questions
  WHERE exam_id = 3 AND subject_id = 11
)
UPDATE questions q
SET question_code = 'ELEC-E-PC-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE q.id = n.id;

-- 전기기사 - 전기설비기술기준 (subject_id = 12)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM questions
  WHERE exam_id = 3 AND subject_id = 12
)
UPDATE questions q
SET question_code = 'ELEC-E-EL-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE q.id = n.id;

-- 전기기사 - 제어공학 (subject_id = 13)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM questions
  WHERE exam_id = 3 AND subject_id = 13
)
UPDATE questions q
SET question_code = 'ELEC-E-CT-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE q.id = n.id;

-- 확인 쿼리
SELECT exam_id, subject_id, question_code, LEFT(question_text, 50) as question_preview
FROM questions
ORDER BY exam_id, subject_id, question_code
LIMIT 50;
