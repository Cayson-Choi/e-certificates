-- 시험 데이터 입력
-- 기존 데이터 삭제 (재실행 시)
DELETE FROM subjects;
DELETE FROM exams;

-- 시험 종류 추가
INSERT INTO exams (id, name) VALUES
  (1, '전기기능사'),
  (2, '전기산업기사'),
  (3, '전기기사');

-- 과목 추가
-- 전기기능사 (총 15문항: 5+5+5)
INSERT INTO subjects (exam_id, name, questions_per_attempt, order_no) VALUES
  (1, '전기이론', 5, 1),
  (1, '전기기기', 5, 2),
  (1, '전기설비', 5, 3);

-- 전기산업기사 (총 15문항: 3+3+3+3+3)
INSERT INTO subjects (exam_id, name, questions_per_attempt, order_no) VALUES
  (2, '전기자기학', 3, 1),
  (2, '전력공학', 3, 2),
  (2, '전기기기', 3, 3),
  (2, '회로이론', 3, 4),
  (2, '전기설비기술기준', 3, 5);

-- 전기기사 (총 15문항: 3+3+3+3+3)
INSERT INTO subjects (exam_id, name, questions_per_attempt, order_no) VALUES
  (3, '전기자기학', 3, 1),
  (3, '전력공학', 3, 2),
  (3, '전기기기', 3, 3),
  (3, '회로이론 및 제어공학', 3, 4),
  (3, '전기설비기술기준', 3, 5);

-- 시퀀스 리셋 (다음 ID가 4부터 시작하도록)
SELECT setval('exams_id_seq', (SELECT MAX(id) FROM exams));
SELECT setval('subjects_id_seq', (SELECT MAX(id) FROM subjects));
