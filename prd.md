# 전기 자격시험 CBT - 요구사항 명세서 (PRD)

> 최종 업데이트: 2026-02-17 | 상태: 전체 구현 완료

## 0) 서비스 한 줄
학생이 컴퓨터로 전기 자격시험 문제를 풀고, 서버가 채점해서 점수와 오늘/어제 랭킹을 보여주는 CBT 사이트.

---

## 1) 절대 규칙

### 규칙 1) 시험지는 "시작 순간 고정" ✅
- 시험 시작 버튼 누르는 순간 서버가 문제를 랜덤으로 뽑음
- 그 목록/순서를 DB(`attempt_questions`)에 저장해서 "시험지 스냅샷" 생성
- 새로고침/재접속해도 문제와 순서가 절대 안 바뀜

### 규칙 2) 채점/점수 계산은 서버만 ✅
- 브라우저에서 점수 계산 금지 (조작 방지)
- 제출 시 서버가 정답과 비교해서 채점
- **정답(answer)은 프론트로 절대 내려보내지 않음**

### 규칙 3) 랭킹은 "한국 날짜(KST)" 기준 ✅
- 오늘 랭킹: KST 오늘 날짜 데이터만 집계
- 밤 12시(00:00 KST) 지나면 새로운 "오늘 랭킹" 시작

---

## 2) 운영 규칙

### A) 23:00~23:59(KST) 신규 시험 시작 금지 ✅
- 이 시간에는 새 시험지를 만들 수 없음
- 단, 이미 진행 중(IN_PROGRESS)이고 만료 전이면 "이어풀기" 가능

### B) 시험 시간 제한 60분 ✅
- `started_at`부터 60분 안에 제출해야 함
- 60분 지나면 자동 만료(EXPIRED)

### C) 동시 시험 1개만 가능 ✅
- 하나 시작하면 제출하거나 만료될 때까지 다른 시험 시작 불가
- DB 유니크 인덱스로 강제:
  ```sql
  CREATE UNIQUE INDEX idx_one_active_attempt_per_user
  ON attempts(user_id)
  WHERE status = 'IN_PROGRESS';
  ```

---

## 3) 학생 흐름

1. 회원가입/로그인 ✅
2. 홈에서 시험 선택 (기능사/산업기사/기사) ✅
3. 시험 시작 버튼 ✅
   - 진행 중 시험이 있으면 "이어풀기" (만료 전이면)
   - 23~24시는 "새 시험 시작" 차단
4. 문제 풀기 (답 고를 때마다 서버에 자동 저장) ✅
5. 제출 (60분 안에만 가능) ✅
6. 결과 보기 (점수/오답/해설) ✅
7. 홈에서 오늘/어제 랭킹 + 내 순위 보기 ✅
8. 마이페이지에서 응시 기록/오답 노트 보기 ✅
9. 프로필 수정 / 비밀번호 변경 ✅
10. 회원 탈퇴 (학생 스스로 가능) ✅

---

## 4) DB 설계

### 4-1) profiles (회원정보)
| 컬럼 | 설명 |
|------|------|
| id (PK) | auth.users.id와 연결 |
| name | 이름 |
| email | 이메일 |
| affiliation | 소속 (교수/전기반/소방반/신중년) |
| phone | 전화번호 |
| is_admin | 관리자 여부 |
| created_at, updated_at | 타임스탬프 |

### 4-2) exams / subjects
**exams**: id(PK), name

**subjects**: id(PK), exam_id(FK), name, questions_per_attempt, order_no

총 문항 수 = subjects.questions_per_attempt 합계

### 4-3) questions (문제은행)
| 컬럼 | 설명 |
|------|------|
| id (PK) | |
| question_code (UNIQUE) | 이미지 파일 이름과 연결되는 고유번호 |
| exam_id, subject_id | FK |
| question_text | 문제 본문 |
| choice_1~choice_4 | 선택지 |
| answer (1~4) | 정답. 프론트에 절대 보내면 안 됨 |
| explanation | 해설. 제출 후만 공개 |
| image_url (nullable) | Supabase Storage 공개 URL |
| is_active (bool) | soft delete |
| created_at, updated_at | 타임스탬프 |

### 4-4) attempts (시험 응시 1회 기록)
| 컬럼 | 설명 |
|------|------|
| id (PK) | |
| user_id (FK) | |
| exam_id (FK) | |
| status | IN_PROGRESS / SUBMITTED / EXPIRED |
| started_at | |
| expires_at | started_at + 60분 |
| submitted_at (nullable) | |
| total_questions, total_correct, total_score | |

### 4-5) attempt_questions (시험지 스냅샷)
- attempt_id(FK), seq(1..N), question_id(FK)
- PK(attempt_id, seq)
- UNIQUE(attempt_id, question_id)

### 4-6) attempt_items (학생 답안 + 정오답)
- attempt_id, question_id, selected(1~4), is_correct
- PK(attempt_id, question_id)

### 4-7) subject_scores (과목별 점수)
- attempt_id, subject_id, subject_questions, subject_correct, subject_score
- PK(attempt_id, subject_id)
- 점수 공식: round(correct / questions * 100)

### 4-8) daily_best_scores (오늘 랭킹)
- kst_date, exam_id, user_id, best_score, best_submitted_at, attempt_id
- PK(kst_date, exam_id, user_id)

### 4-9) daily_leaderboard_snapshots (어제 Top5 스냅샷)
- kst_date, exam_id, rank(1~5), user_id, user_name_display, score, submitted_at
- PK(kst_date, exam_id, rank)

### 4-10) audit_logs (관리자 변경 이력)
- admin_user_id, action_type, target_table, target_id, reason
- changed_fields(jsonb), old_data(jsonb), new_data(jsonb), created_at

---

## 5) 이미지 저장/매칭 규칙
- Storage 버킷: `question-images` (Public)
- DB 저장: `questions.image_url` (공개 URL)
- 업로드: 관리자 전용, 이미지 파일만, 5MB 제한
- 파일명: `{timestamp}-{sanitized_name}`

---

## 6) EXPIRED(만료) 처리 정책
- 만료 시점: started_at + 60분
- 마이페이지에 "미제출(시간초과)" 표시
- attempt_items 삭제 (학생 답안 제거)
- subject_scores 삭제 (과목 점수 제거)
- attempts는 유지 (status → EXPIRED)
- attempt_questions는 유지 (시험지 기록 보존)

---

## 7) 탈퇴 정책
1. daily_best_scores에서 오늘 레코드 삭제 (오늘 랭킹 즉시 제외)
2. daily_leaderboard_snapshots 익명 처리 (user_name_display → "(탈퇴한 사용자)", user_id → NULL)
3. profiles/auth.users 등 개인정보 삭제
4. Storage cleanup 불필요 (문제 이미지는 questions에 속하며 학생 탈퇴와 무관)

---

## 8) API 설계

### 공통 서버 확인 사항
- 로그인 여부, 내 attempt인지, status 확인, 만료 전인지(expires_at > now)

### 8-1) 시험 시작 ✅
`POST /api/attempts/start` (입력: exam_id)
1. IN_PROGRESS 확인 (시험 종류 상관없이)
2. 있으면: 만료 전이면 attempt_id 반환(이어풀기), 만료면 EXPIRED 처리
3. 23:00~23:59 KST면 새 시험 거절
4. 새 attempt 생성 (started_at, expires_at=+60분)
5. 과목 설정대로 랜덤 문제 추출 → attempt_questions 저장
6. attempt_id 반환

### 8-2) 시험지 조회 ✅
`GET /api/attempts/:attemptId/paper`
- attempt_questions 기준 문제 조회
- **정답(answer) 절대 미포함**

### 8-3) 답안 저장 ✅
`PUT /api/attempts/:attemptId/answer`
- 학생이 선택한 답을 서버에 저장

### 8-4) 제출/채점 ✅
`POST /api/attempts/:attemptId/submit`
1. 권한/상태/만료 확인
2. attempt_questions 기준으로만 채점
3. attempt_items 저장 (is_correct 확정)
4. subject_scores 계산/저장
5. total_correct, total_score 계산
6. SUBMITTED + submitted_at 기록
7. daily_best_scores upsert (KST 기준)
8. 결과 반환

### 8-5) 결과 조회 ✅
`GET /api/attempts/:attemptId/result`
- SUBMITTED 상태에서만 정답/해설 포함하여 반환

### 8-6) 홈 랭킹 ✅
`GET /api/home/leaderboard?exam_id=...`
- 오늘 Top5 (daily_best_scores)
- 어제 Top5 (daily_leaderboard_snapshots)
- NEW/▲▼ 계산
- 로그인 시 내 순위

### 8-7) 회원 탈퇴 ✅
`POST /api/account/withdraw`

### 8-8) 관리자 API ✅
- `GET/POST /api/admin/questions` - 문제 목록/추가
- `PUT/DELETE /api/admin/questions/:id` - 문제 수정/삭제
- `POST /api/admin/questions/bulk` - 일괄 업로드
- `GET /api/admin/questions/next-code` - 다음 문제코드
- `GET /api/admin/questions/check-code` - 문제코드 중복검사
- `GET /api/admin/users` - 회원 목록 + 통계
- `PATCH/DELETE /api/admin/users/:id` - 권한 변경/삭제
- `POST /api/upload/image` - 이미지 업로드

---

## 9) 프론트 화면

### 홈 ✅
- 시험 선택 (기능사/산업기사/기사)
- 버튼 상태: IN_PROGRESS → "이어하기" / 23~24시 → "시작 불가" / 그 외 → "시험 시작"
- 오늘/어제 Top5 + 내 순위

### 시험 화면 ✅
- 남은 시간 표시 (60분 카운트다운)
- 답 선택 시 서버 저장
- 재접속 시 복원

### 결과 화면 ✅
- 점수/오답/해설 (제출 후)
- 과목별 점수 표시

### 마이페이지 ✅
- 응시 기록 (SUBMITTED: 점수, EXPIRED: "미제출(시간초과)")
- 오답 노트 (틀린 문제 + 해설)
- 프로필 수정 / 비밀번호 변경

### 탈퇴 ✅
- 경고 + 최종 확인

---

## 10) 관리자 화면

### 문제 관리 ✅
- Canvas 스타일 분할 편집기 (왼쪽=편집, 오른쪽=실시간 미리보기)
- 개별 문제 추가/수정 (연속 저장 지원)
- 일괄 업로드 (JSON/CSV, 미리보기 + 개별 삭제)
- 이미지 업로드 (파일 + URL 직접 입력)
- 문제코드 자동생성/중복검사
- MathText 렌더링 (sub/sup/frac 태그)
- 드롭다운 필터 + 페이지네이션

### 회원 관리 ✅
- 회원 목록 + 소속별 통계 (오늘 증감 표시)
- 관리자 권한 부여/해제
- 회원 삭제
- 드롭다운 필터 + 페이지네이션

---

## 11) 보안

### 인증/권한 ✅
- 미들웨어: /exam, /my, /admin 경로 보호
- /admin: is_admin 추가 검증 (미들웨어 + API 양쪽)
- 모든 시험 API: user_id 소유권 검증

### 데이터 보호 ✅
- SUPABASE_SERVICE_ROLE_KEY: 서버 전용 (NEXT_PUBLIC 접두사 없음)
- RLS 정책: 테이블별 접근 제어
- 정답(answer): 제출 전 프론트 전송 절대 금지

### 입력 검증 ✅
- 답안 범위 (1~4)
- 이미지: 타입 체크 + 5MB 제한 + 파일명 sanitize
- Supabase ORM 사용 (SQL injection 방지)
