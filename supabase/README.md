# Supabase 데이터베이스 설정

## 마이그레이션 파일

### 1. `20260216_init_schema.sql`
전체 데이터베이스 스키마 생성

**포함 내용:**
- 11개 테이블 생성
- 인덱스 설정
- 트리거 설정 (updated_at 자동 갱신)
- 유니크 제약 조건
- 유틸리티 함수 (KST 시간 변환)

**주요 제약 조건:**
- `idx_one_active_attempt_per_user`: 한 사용자는 IN_PROGRESS 시험을 1개만 가질 수 있음
- `question_code`: 문제 고유 코드 (이미지 매칭용)

### 2. `20260216_rls_policies.sql`
Row Level Security 정책 설정

**보안 원칙:**
- 사용자는 본인 데이터만 조회/수정 가능
- 정답(answer)은 애플리케이션 레벨에서 필터링
- 랭킹은 모두 조회 가능
- 관리자는 전체 데이터 관리 가능

## Supabase 프로젝트 설정 방법

### 1. Supabase 프로젝트 생성
1. [Supabase Dashboard](https://app.supabase.com) 접속
2. New Project 클릭
3. 프로젝트 이름: `caysoncbt` (또는 원하는 이름)
4. Database Password 설정
5. Region: `Northeast Asia (Seoul)` 선택
6. Create new project

### 2. 마이그레이션 실행
Supabase Dashboard > SQL Editor에서 다음 순서로 실행:

1. `20260216_init_schema.sql` 전체 복사 & 실행
2. `20260216_rls_policies.sql` 전체 복사 & 실행

### 3. Storage 버킷 생성
문제 이미지 저장용 버킷 생성:

1. Dashboard > Storage
2. Create a new bucket
3. Name: `question-images`
4. Public bucket: ✅ (체크)
5. Create bucket

### 4. 환경 변수 설정
프로젝트 루트의 `.env.local` 파일 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

값 확인: Dashboard > Settings > API

## 데이터베이스 구조

```
profiles                    # 회원 정보
├── exams                   # 시험 종류 (기능사/산업기사/기사)
│   ├── subjects            # 과목 설정
│   │   └── questions       # 문제 은행 (정답 포함)
│   └── attempts            # 시험 응시 기록
│       ├── attempt_questions   # 시험지 스냅샷 (문제 순서)
│       ├── attempt_items       # 학생 답안
│       └── subject_scores      # 과목별 점수
├── daily_best_scores              # 오늘 랭킹
├── daily_leaderboard_snapshots    # 어제 Top5 스냅샷
└── audit_logs                     # 관리자 변경 이력
```

## 주요 기능

### KST 시간 처리
```sql
-- 현재 KST 시간
SELECT now_kst();

-- TIMESTAMPTZ를 KST DATE로 변환
SELECT to_kst_date(NOW());

-- 23시대 체크
SELECT is_prohibited_hour_kst();
```

### 동시성 제어
```sql
-- 이 쿼리는 실패함 (이미 IN_PROGRESS 시험이 있으면)
INSERT INTO attempts (user_id, exam_id, ...)
VALUES ('user-uuid', 1, ...);
```

## 테스트 쿼리

### 시험 목록 조회
```sql
SELECT * FROM exams;
```

### 과목 설정 조회
```sql
SELECT
  e.name AS exam_name,
  s.name AS subject_name,
  s.questions_per_attempt,
  s.order_no
FROM subjects s
JOIN exams e ON s.exam_id = e.id
ORDER BY e.id, s.order_no;
```

### 활성 시험 확인
```sql
SELECT
  a.*,
  e.name AS exam_name
FROM attempts a
JOIN exams e ON a.exam_id = e.id
WHERE a.status = 'IN_PROGRESS'
  AND a.expires_at > NOW();
```

## 주의사항

⚠️ **정답 노출 금지**
- `questions.answer` 필드는 절대 프론트엔드로 전송하지 않음
- API에서 SELECT 시 answer 필드 제외 필수

⚠️ **만료 처리**
- 60분 경과 시 자동 EXPIRED 처리
- attempt_items, subject_scores 삭제
- attempt_questions는 유지 (분석용)

⚠️ **23시대 제한**
- 23:00~23:59 KST에는 새 시험 시작 불가
- 진행 중인 시험은 이어하기 가능
