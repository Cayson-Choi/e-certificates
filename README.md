# 전기 자격시험 CBT 시스템

학생이 컴퓨터로 전기 자격시험 문제를 풀고, 서버가 채점해서 점수와 랭킹을 보여주는 온라인 모의고사 플랫폼

## 시작하기

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.local` 파일을 생성하고 Supabase 정보를 입력하세요:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 주요 기능

- ✅ 랜덤 문제 출제 (시작 순간 고정)
- ✅ 서버 사이드 채점 (보안)
- ✅ 60분 제한 시험
- ✅ 실시간 랭킹 (오늘/어제 Top5)
- ✅ KST 기준 일별 집계
- ✅ 동시 1개 시험만 가능
- ✅ 23:00~23:59 신규 시험 제한

## 기술 스택

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage

## 문서

- [CLAUDE.md](./CLAUDE.md) - 프로젝트 상세 가이드
- [prd.md](./prd.md) - 전체 요구사항 명세서
- [CURRENT_STATE.md](./CURRENT_STATE.md) - 개발 진행 상태

## 개발 명령어

```bash
npm run dev      # 개발 서버 (Turbopack)
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버
npm run lint     # ESLint 검사
```

## 라이선스

Private
