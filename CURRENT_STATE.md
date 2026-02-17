# 현재 개발 상태

## 최종 업데이트
2026-02-17

## 완료된 기능

### 1. 프로젝트 기반 ✅
- [x] Next.js 15 (App Router, TypeScript, Tailwind CSS)
- [x] Supabase 연동 (Auth, DB, Storage)
- [x] 다크모드 지원 (next-themes, class 전략)
- [x] 미들웨어 인증/권한 체크 (/exam, /my, /admin 보호)

### 2. 인증 시스템 ✅
- [x] 회원가입 (이름, 이메일, 비밀번호, 전화번호, 소속)
- [x] 로그인/로그아웃
- [x] 프로필 수정 (이름, 전화번호, 소속)
- [x] 비밀번호 변경
- [x] 회원 탈퇴

### 3. 시험 시스템 ✅
- [x] 시험 선택 (기능사/산업기사/기사)
- [x] 시험 시작 (랜덤 문제 선택, 시험지 스냅샷)
- [x] 문제 풀이 (4지선다, 이미지 문제, 타이머)
- [x] 답안 실시간 저장 (서버 저장)
- [x] 이어풀기 (새로고침/재접속 시 복원)
- [x] 제출/채점 (서버 채점, 과목별 점수)
- [x] 시험 결과 화면 (정답/오답, 해설, 과목별 점수)
- [x] 23:00~23:59 KST 신규 시험 시작 금지
- [x] 60분 시간 제한, 만료 처리

### 4. 랭킹 시스템 ✅
- [x] 오늘 Top5 (daily_best_scores)
- [x] 어제 Top5 스냅샷 (daily_leaderboard_snapshots)
- [x] NEW/▲▼ 순위 변동 표시
- [x] 내 순위 표시

### 5. 마이페이지 ✅
- [x] 응시 기록 조회 (날짜별, 시험별)
- [x] 오답 노트 (틀린 문제 모아보기, 해설 포함)

### 6. 관리자 페이지 ✅
- [x] 문제 관리 (추가/수정/삭제)
  - [x] Canvas 스타일 분할 편집기 (왼쪽=편집, 오른쪽=실시간 미리보기)
  - [x] 연속 저장 (닫지 않고 계속 저장)
  - [x] MathText 렌더링 (sub/sup/frac 태그)
  - [x] 이미지 업로드 (Supabase Storage)
  - [x] 문제코드 자동생성/중복검사
  - [x] 드롭다운 필터 + 페이지네이션 (20개씩)
- [x] 일괄 문제 업로드 (JSON/CSV)
  - [x] Canvas 스타일 분할 편집기
  - [x] 업로드 전 미리보기 + 개별 삭제
  - [x] PDF 추출 텍스트 줄바꿈 정규화
- [x] 회원 관리 (목록, 권한 부여/해제, 삭제)
  - [x] 소속별 통계 (인라인 뱃지, 오늘 증감)
  - [x] 드롭다운 필터 + 페이지네이션 (20명씩)

## 프로젝트 구조

```
app/
├── layout.tsx              # 루트 레이아웃 (Header, Footer, ThemeProvider)
├── page.tsx                # 홈 (시험 선택 + 리더보드)
├── globals.css             # 전역 스타일 + 애니메이션
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
├── admin/
│   ├── page.tsx            # 관리자 대시보드
│   ├── questions/page.tsx  # 문제 관리
│   └── users/page.tsx      # 회원 관리
├── exam/
│   ├── [examId]/page.tsx        # 시험 시작 화면
│   ├── attempt/[attemptId]/     # 문제 풀이
│   └── result/[attemptId]/      # 결과 확인
├── my/
│   ├── page.tsx            # 응시 기록
│   ├── profile/page.tsx    # 프로필 수정
│   ├── withdraw/page.tsx   # 회원 탈퇴
│   └── wrong-answers/page.tsx  # 오답 노트
└── api/                    # 21개 API 라우트
    ├── auth/               # 로그인/가입/로그아웃
    ├── account/            # 프로필/비밀번호/탈퇴
    ├── admin/              # 문제/회원 관리 (관리자 전용)
    ├── attempts/           # 시험 시작/풀이/제출
    ├── exams/              # 시험/과목 조회
    ├── home/               # 리더보드
    ├── my/                 # 응시기록/오답노트
    └── upload/             # 이미지 업로드

components/
├── Header.tsx              # 네비게이션 (서버 컴포넌트)
├── Footer.tsx              # 푸터
├── ThemeProvider.tsx        # 다크모드 프로바이더
├── ThemeToggle.tsx          # 다크모드 토글 버튼
├── Leaderboard.tsx          # 랭킹 컴포넌트
├── LogoutButton.tsx         # 로그아웃 버튼
├── MathText.tsx             # 수학 표기법 렌더링
├── QuestionSplitEditor.tsx  # 문제 편집 분할 뷰 (lazy loaded)
└── BulkUploadSplitEditor.tsx # 일괄 업로드 분할 뷰 (lazy loaded)

lib/supabase/
├── client.ts               # 브라우저용 Supabase 클라이언트
├── server.ts               # 서버용 Supabase 클라이언트 (쿠키 기반)
└── admin.ts                # 관리자용 Supabase 클라이언트 (service_role, 서버 전용)
```

## 최적화 현황

### 성능
- [x] next/image 사용 (시험/결과/관리자 페이지)
- [x] next.config 이미지 remotePatterns 설정 (Supabase Storage)
- [x] 무거운 컴포넌트 lazy loading (QuestionSplitEditor, BulkUploadSplitEditor)
- [x] 페이지네이션으로 대량 데이터 렌더링 최적화

### 보안
- [x] SUPABASE_SERVICE_ROLE_KEY는 서버 전용 (NEXT_PUBLIC 접두사 없음)
- [x] 정답(answer)은 프론트로 전송 금지 (제출 후 결과에서만 표시)
- [x] 모든 관리자 API에 is_admin 검증
- [x] 모든 시험 API에 user_id 소유권 검증
- [x] 파일 업로드 검증 (이미지 타입, 5MB 제한)
- [x] RLS 정책으로 데이터 격리
- [x] 리더보드: open RLS 테이블은 일반 클라이언트, profiles만 admin 클라이언트

## 이슈 / 개선 가능 사항
- Rate limiting 미구현 (로그인/가입 엔드포인트)
- API 응답 타입 정의 미완 (현재 any 사용)
