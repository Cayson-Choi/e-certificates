# 전기 자격시험 CBT 시스템

## 프로젝트 개요
학생이 컴퓨터로 전기 자격시험 문제를 풀고, 서버가 채점해서 점수와 랭킹을 보여주는 CBT(Computer Based Test) 사이트

## 기술 스택
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (문제 이미지)

## 핵심 규칙 (절대 준수)

### 1. 시험지는 시작 순간 고정
- 시험 시작 버튼 누르는 순간 서버가 문제를 랜덤으로 뽑음
- 그 목록/순서를 DB(`attempt_questions`)에 저장해서 "시험지 스냅샷" 생성
- 새로고침/재접속해도 문제와 순서가 절대 안 바뀜

### 2. 채점/점수 계산은 서버만
- 브라우저에서 점수 계산 금지 (조작 방지)
- 제출 시 서버가 정답과 비교해서 채점
- **정답(answer)은 프론트로 절대 내려보내지 않음**

### 3. 랭킹은 한국 시간(KST) 기준
- 오늘 랭킹: KST 오늘 날짜 데이터만 집계
- 밤 12시(00:00 KST) 지나면 새로운 "오늘 랭킹" 시작

## 운영 규칙

### A. 23:00~23:59(KST) 신규 시험 시작 금지
- 이 시간에는 새 시험지를 만들 수 없음
- 단, 이미 진행 중(IN_PROGRESS)이고 만료 전이면 "이어풀기" 가능

### B. 시험 시간 제한 60분
- `started_at`부터 60분 안에 제출해야 함
- 60분 지나면 자동 만료(EXPIRED)

### C. 동시 시험 1개만 가능
- 하나 시작하면 제출하거나 만료될 때까지 다른 시험 시작 불가
- DB 유니크 인덱스로 강제: `CREATE UNIQUE INDEX idx_one_active_attempt_per_user ON attempts(user_id) WHERE status = 'IN_PROGRESS'`

## 프로젝트 구조

```
/app              - Next.js App Router
  /api            - API Routes
  /(auth)         - 인증 관련 페이지
  /(main)         - 메인 페이지들
/components       - 재사용 컴포넌트
/lib              - 유틸리티
  /supabase       - Supabase 클라이언트
/types            - TypeScript 타입 정의
/hooks            - 커스텀 훅
```

## DB 테이블 요약

1. **profiles** - 회원 정보
2. **exams** - 시험 종류 (기능사/산업기사/기사)
3. **subjects** - 과목 설정 (과목당 문항 수 포함)
4. **questions** - 문제 은행 (정답 포함, 프론트 노출 금지)
5. **attempts** - 시험 응시 기록
6. **attempt_questions** - 시험지 스냅샷 (문제 순서)
7. **attempt_items** - 학생 답안
8. **subject_scores** - 과목별 점수
9. **daily_best_scores** - 오늘 랭킹
10. **daily_leaderboard_snapshots** - 어제 Top5 스냅샷
11. **audit_logs** - 관리자 변경 이력

자세한 스키마는 `prd.md` 참조

## 개발 가이드

### 환경 변수 설정
`.env.local` 파일 생성 (`.env.example` 참조):
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 로컬 개발 서버 실행
```bash
npm install
npm run dev
```

### 코딩 원칙
- 최소 변경(minimal changes) 원칙
- 기존 로직 유지하며 개선 (rewrite 지양, refactor 중심)
- 요청하지 않은 파일 수정 금지
- 큰 변경은 계획(plan) 먼저 제시

## 참고 문서
- `prd.md` - 전체 요구사항 명세서
- `CURRENT_STATE.md` - 현재 개발 진행 상태
