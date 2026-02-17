-- 테스트용 통계 데이터 삽입 (오늘 날짜)
-- 모든 회원이 오늘 가입한 것으로 가정
INSERT INTO daily_user_stats (date, affiliation, signups_count, deletions_count)
VALUES
  (CURRENT_DATE, '교수', 1, 0),
  (CURRENT_DATE, '소방반', 1, 0),
  (CURRENT_DATE, '신중년', 1, 0),
  (CURRENT_DATE, '전기반', 1, 0)
ON CONFLICT (date, affiliation)
DO UPDATE SET
  signups_count = EXCLUDED.signups_count,
  deletions_count = EXCLUDED.deletions_count;
