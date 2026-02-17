-- 기존 트리거와 함수 삭제
DROP TRIGGER IF EXISTS trigger_increment_signup_stats ON profiles;
DROP TRIGGER IF EXISTS trigger_increment_deletion_stats ON profiles;
DROP FUNCTION IF EXISTS increment_signup_stats();
DROP FUNCTION IF EXISTS increment_deletion_stats();

-- 기존 테이블 삭제 (완전히 새로 시작)
DROP TABLE IF EXISTS daily_user_stats CASCADE;
