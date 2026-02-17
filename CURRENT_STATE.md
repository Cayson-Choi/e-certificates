# 현재 개발 상태

## 최종 업데이트
2026-02-16

## 완료된 작업

### 1. 프로젝트 초기 설정 ✅
- [x] Next.js 15 프로젝트 설정 (App Router, TypeScript)
- [x] Tailwind CSS 설정
- [x] Supabase 클라이언트 설정 (client.ts, server.ts)
- [x] 기본 폴더 구조 생성
  - `/app` - Next.js 앱
  - `/components` - 재사용 컴포넌트
  - `/lib` - 유틸리티
  - `/types` - 타입 정의
  - `/hooks` - 커스텀 훅
- [x] 프로젝트 문서 작성 (CLAUDE.md, CURRENT_STATE.md)
- [x] 환경 변수 예제 파일 (.env.example)

### 2. Supabase 데이터베이스 설정 ✅
- [x] DB 스키마 SQL 파일 생성
  - [x] profiles 테이블
  - [x] exams, subjects 테이블
  - [x] questions 테이블
  - [x] attempts, attempt_questions, attempt_items 테이블
  - [x] subject_scores 테이블
  - [x] daily_best_scores, daily_leaderboard_snapshots 테이블
  - [x] audit_logs 테이블
- [x] RLS (Row Level Security) 정책 설정
- [x] 유니크 인덱스 생성 (동시성 제어)
  - [x] `idx_one_active_attempt_per_user` - IN_PROGRESS 시험 1개만
- [x] KST 유틸리티 함수 (to_kst_date, now_kst, is_prohibited_hour_kst)
- [x] Supabase 설정 가이드 문서 작성
- [x] 실제 Supabase 프로젝트 생성 및 마이그레이션 실행
- [x] Storage 버킷 생성 (question-images, Public)

### 3. TypeScript 타입 정의 ✅
- [x] DB 테이블 타입 정의 (`types/database.ts`)
- [ ] API 응답 타입 정의

## 진행 중인 작업
없음

## 다음 단계 (우선순위 순)

### 4. 인증 시스템
- [ ] Supabase Auth 설정
- [ ] 회원가입 페이지
- [ ] 로그인 페이지
- [ ] 프로필 생성 로직

### 5. 시험 시작 API
- [ ] POST `/api/attempts/start` 구현
  - [ ] IN_PROGRESS 중복 체크
  - [ ] 23:00~23:59 신규 시작 제한
  - [ ] 랜덤 문제 선택 + attempt_questions 저장
  - [ ] 만료 시간 설정 (started_at + 60분)

### 6. 시험 풀이 화면
- [ ] 시험지 조회 API (GET `/api/attempts/:id/paper`)
- [ ] 문제 풀이 UI
- [ ] 남은 시간 표시
- [ ] localStorage 답안 임시 저장

### 7. 제출/채점 시스템
- [ ] POST `/api/attempts/:id/submit` 구현
  - [ ] 서버 채점 로직
  - [ ] subject_scores 계산
  - [ ] daily_best_scores 업데이트

### 8. 랭킹 시스템
- [ ] 오늘 랭킹 조회 (daily_best_scores)
- [ ] 어제 스냅샷 조회 (daily_leaderboard_snapshots)
- [ ] NEW/▲▼ 계산 로직

### 9. 마이페이지
- [ ] 응시 기록 조회
- [ ] EXPIRED 상태 표시
- [ ] 회원 탈퇴 기능

### 10. 관리자 페이지
- [ ] 문제 업로드 (CSV/JSON)
- [ ] 이미지 업로드 + question_code 매칭
- [ ] 문제 수정/비활성화
- [ ] audit_logs 기록

## 기술 부채 / 개선 필요 사항
없음

## 이슈 / 블로커
없음

## 참고 사항
- 모든 시간 관련 로직은 KST 기준
- 정답(answer)은 절대 프론트로 전송 금지
- 시험 시작 시 문제 순서 고정 (attempt_questions)
