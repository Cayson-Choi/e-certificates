0) 서비스 한 줄
학생이 컴퓨터로 전기 자격시험 문제를 풀고, 서버가 채점해서 점수와 오늘/어제 랭킹을 보여주는 CBT 사이트.
________________________________________
1) 절대 규칙(이건 무조건 지킨다)
규칙 1) 랜덤이지만 시험지는 “시작 순간 고정”
•	시험 시작 버튼 누르는 순간 서버가 문제를 랜덤으로 뽑고
•	그 목록/순서를 DB에 저장해서 “시험지(스냅샷)”를 만든다
•	그래서 새로고침/재접속/꺼졌다 켜도 문제와 순서가 절대 안 바뀜
규칙 2) 채점/점수 계산은 서버만
•	브라우저에서 점수 계산하면 조작 가능
•	제출하면 서버가 정답과 비교해서 채점하고 점수를 저장한 뒤 결과만 보여줌
•	정답(answer)은 프론트로 절대 내려보내지 않는다
규칙 3) 랭킹은 “한국 날짜(KST)” 기준
•	오늘 랭킹은 KST 오늘 날짜 데이터만 모아서 만든다
•	밤 12시(00:00 KST) 지나면 새로운 “오늘 랭킹”이 시작됨
________________________________________
2) 운영 규칙(추가 확정사항 전부 포함)
A) 23:00~23:59(KST)에는 “새 시험 시작” 금지
•	이 시간에는 새 시험지를 만들 수 없다
•	단, 이미 진행 중(IN_PROGRESS)이고 만료 전이면 “이어풀기”는 가능
B) 시험 시간 제한은 60분
•	started_at부터 60분 안에 제출해야 한다
•	60분이 지나면 자동으로 만료(EXPIRED)
C) 동시에 시험은 1개만 가능
•	기능사 하다가 산업기사 시작하고 다시 기능사 돌아오기 같은 건 불가
•	하나 시작했으면:
o	제출해서 끝내거나
o	60분 지나서 만료돼야
o	다음 시험 시작 가능
________________________________________
3) 학생이 하는 일(전체 흐름)
1.	회원가입/로그인
2.	홈에서 시험 선택(기능사/산업기사/기사)
3.	시험 시작 버튼 누름
o	진행 중 시험이 있으면 “이어풀기”로 들어감(만료 전이면)
o	23~24시는 “새 시험 시작”이 막힘
4.	문제 풀기(답 고를 때마다 localStorage 자동 저장)
5.	제출(60분 안에만 가능)
6.	결과 보기(점수/오답/해설)
7.	홈에서 오늘/어제 랭킹 + 내 순위 보기
8.	마이페이지에서 기록/통계 보기
9.	원하면 회원 탈퇴(학생 스스로 가능)
________________________________________
4) DB 설계(엑셀 표 여러 장이라고 생각)
아래 표(테이블)들만 제대로 만들면 시스템이 돌아간다.
4-1) profiles (회원정보)
•	id (PK, auth.users.id와 연결)
•	name (가입 후 변경 불가)
•	affiliation (교수/전기반/소방반/신중년)
•	phone
•	is_admin
•	created_at, updated_at
________________________________________
4-2) exams / subjects (문항 수 유연하게 하기 위한 설정표)
exams
•	id(PK), name
subjects
•	id(PK)
•	exam_id(FK)
•	name(과목명)
•	questions_per_attempt(과목당 몇 문제 뽑을지)
•	order_no(표시 순서)
✅ 총 문항 수 = subjects.questions_per_attempt 합계
(그래서 15문항이 될 수도 있고 25문항이 될 수도 있음)
________________________________________
4-3) questions (문제은행) — question_code로 이미지 매칭 확정
•	id(PK)
•	question_code(UNIQUE) ✅ 이미지 파일 이름과 연결되는 고유번호
•	exam_id, subject_id
•	question_text
•	choice_1~choice_4
•	answer(정답 1~4) ❌ 프론트에 절대 보내면 안 됨
•	explanation(해설) ✅ 제출 후만 공개
•	image_url(nullable) ✅ DB는 image_url로 통일
•	is_active(bool, soft delete)
•	created_at, updated_at
________________________________________
4-4) attempts (시험 응시 1회 기록)
•	id(PK)
•	user_id(FK)
•	exam_id(FK)
•	status: IN_PROGRESS / SUBMITTED / EXPIRED
•	started_at
•	expires_at (= started_at + 60분)
•	submitted_at(nullable)
•	total_questions
•	total_correct(nullable)
•	total_score(nullable)
•	created_at, updated_at
✅ 동시성 제어 방식 확정(가장 안전)
한 사람은 IN_PROGRESS 시험을 동시에 1개만 가질 수 있게 DB가 강제로 막는다.
CREATE UNIQUE INDEX idx_one_active_attempt_per_user 
ON attempts(user_id) 
WHERE status = 'IN_PROGRESS';
________________________________________
4-5) attempt_questions (시험지 스냅샷: 문제 목록+순서)
•	attempt_id(FK)
•	seq(1..N)
•	question_id(FK)
•	PK(attempt_id, seq)
•	UNIQUE(attempt_id, question_id) 권장
✅ 이 표가 있어서 “시험 시작 순간 고정된 시험지”가 유지됨.
________________________________________
4-6) attempt_items (학생이 고른 답 + 정오답)
•	attempt_id
•	question_id
•	selected(1~4, nullable)
•	is_correct(nullable)
•	PK(attempt_id, question_id)
________________________________________
4-7) subject_scores (과목별 점수)
•	attempt_id
•	subject_id
•	subject_questions
•	subject_correct
•	subject_score
•	PK(attempt_id, subject_id)
✅ 점수 공식 확정
•	전체 점수: round(total_correct / total_questions * 100)
•	과목 점수: round(subject_correct / subject_questions * 100)
________________________________________
4-8) daily_best_scores (오늘 랭킹용)
•	kst_date(date)
•	exam_id
•	user_id
•	best_score
•	best_submitted_at(동점이면 빠른 사람 우선)
•	attempt_id
•	PK(kst_date, exam_id, user_id)
________________________________________
4-9) daily_leaderboard_snapshots (어제 Top5 스냅샷)
•	kst_date(date) // 어제 날짜
•	exam_id
•	rank(1~5)
•	user_id(nullable)
•	user_name_display(text)
•	score
•	submitted_at
•	PK(kst_date, exam_id, rank)
________________________________________
4-10) audit_logs (관리자 변경 이력)
•	admin_user_id
•	action_type
•	target_table
•	target_id
•	reason
•	changed_fields(jsonb)
•	old_data(jsonb)
•	new_data(jsonb)
•	created_at
________________________________________
5) 이미지 저장/매칭 규칙(확정)
•	Storage 경로: /question-images/q_{question_code}.{ext}
•	확장자: png, jpg, jpeg
•	DB 저장: questions.image_url (공개 URL)
•	매칭 실패 시: 문제는 저장되지만 image_url=null
________________________________________
6) EXPIRED(만료) 처리 정책 — 이번에 최종 확정
만료가 언제 발생?
•	started_at + 60분이 지나면 만료
만료된 시험은 마이페이지에 보인다
•	상태를 “미제출(시간초과)”로 표시
•	학생이 왜 점수가 없는지 이해하도록
만료된 시험의 답안은 완전 삭제(확정)
•	attempt_items 삭제(학생이 고른 답 제거)
•	subject_scores 삭제(과목 점수 제거)
•	attempts는 남기고 status를 EXPIRED로 변경(기록만 유지)
✅ 이번에 확정: attempt_questions는 “유지” (옵션 B)
•	만료되더라도 시험지(어떤 문제가 나왔는지)는 남긴다
왜 유지하냐?
•	용량이 크지 않음
•	나중에 “어떤 시험/과목에서 만료가 많이 나는지” 분석 가능
•	운영 개선에 도움이 됨
정리하면:
•	시험지(문제 목록)는 남김
•	학생 답안은 삭제
•	기록은 EXPIRED로 남김
________________________________________
7) 탈퇴 정책(확정) — 오늘 랭킹/어제 스냅샷까지 포함
학생이 탈퇴하면 이렇게 처리한다.
7-1) 오늘 랭킹(daily_best_scores) 처리 (확정)
•	탈퇴 순간부터 오늘 랭킹에서 빠져야 한다
•	그래서 탈퇴 시 daily_best_scores 레코드 삭제
•	결과: 오늘 Top5 조회 시 탈퇴자는 보이지 않음
7-2) 어제 Top5 스냅샷(daily_leaderboard_snapshots) 처리 (확정)
•	스냅샷은 통계 목적이라 유지
•	대신 익명 처리:
o	user_name_display = “(탈퇴한 사용자)”
o	user_id = NULL(또는 특수값)
7-3) 나머지 개인정보 데이터
•	profiles/auth.users 삭제
•	개인 응시 데이터는 정책대로 삭제(개인정보 보호)
________________________________________
8) Storage cleanup 문구 정리(확정)
•	“탈퇴 시 Storage cleanup”은 삭제한다(문구 제거)
•	문제 이미지는 questions에 속하고, 학생 탈퇴와 무관하다
________________________________________
9) API 설계(버튼 누르면 서버에서 하는 일)
공통으로 서버가 항상 확인하는 것
•	로그인했는지
•	내 attempt인지
•	status가 맞는지
•	만료 전인지(expires_at > now)
________________________________________
9-1) 시험 시작
POST /api/attempts/start (입력: exam_id)
서버 로직:
1.	IN_PROGRESS가 있는지 확인(시험 종류 상관없이)
2.	있으면:
o	만료 전이면 그 attempt_id 반환(이어풀기)
o	만료면 EXPIRED 처리 + 답안 삭제 + 계속 진행
3.	진행 중이 없고 현재 시간이 23:00~23:59(KST)이면 새 시험 생성 거절
4.	새 attempt 생성(started_at, expires_at=+60분, status=IN_PROGRESS)
5.	과목 설정값대로 랜덤으로 문제를 뽑고 attempt_questions에 저장(순서 포함)
6.	attempt_id 반환
동시성은 DB 유니크 인덱스가 막아줌(확정)
________________________________________
9-2) 시험지 조회(정답 제외)
GET /api/attempts/:attemptId/paper
•	attempt_questions 기준으로 문제를 가져옴
•	정답(answer)은 절대 포함하지 않음
________________________________________
9-3) 제출/채점(서버만)
POST /api/attempts/:attemptId/submit
서버 로직:
1.	내 것인지, IN_PROGRESS인지, 만료 전인지 확인
2.	attempt_questions에 있는 문제만 채점(조작 방지)
3.	attempt_items 저장(is_correct 확정)
4.	subject_scores 계산/저장
o	round(subject_correct / subject_questions * 100)
5.	total_correct 계산
6.	total_score 계산/저장
o	round(total_correct / total_questions * 100)
7.	SUBMITTED 처리 + submitted_at 기록
8.	daily_best_scores upsert(오늘 KST 기준)
9.	결과 반환
________________________________________
9-4) 홈 랭킹
GET /api/home/leaderboard?exam_id=...
반환:
•	오늘 Top5(daily_best_scores)
•	어제 Top5(daily_leaderboard_snapshots)
•	NEW/▲▼ 계산
•	로그인 시 내 순위 포함
NEW 규칙:
•	어제 Top5에 없었는데 오늘 Top5에 들어오면 NEW
________________________________________
9-5) 회원 탈퇴
POST /api/account/withdraw
서버 로직:
1.	본인 확인
2.	daily_best_scores에서 오늘 레코드 삭제(오늘 랭킹 제외)
3.	daily_leaderboard_snapshots 익명 처리
4.	profiles/auth.users 등 개인정보 삭제
________________________________________
10) 프론트(학생 화면) 계획
홈
•	시험 선택
•	버튼 상태:
o	IN_PROGRESS 있으면 “이어하기”
o	없으면:
	23~24시: “새 시험 시작 불가”
	그 외: “시험 시작”
•	오늘/어제 Top5 + 내 순위
시험 화면
•	남은 시간(60분) 표시
•	답 선택 시 localStorage 저장
•	재접속 시 복원
결과 화면
•	점수/오답/해설(제출 후)
마이페이지
•	SUBMITTED: 점수/기록 표시
•	EXPIRED: “미제출(시간초과)” 표시
•	EXPIRED는 답안 삭제되었으니 “답안 없음” 표시
•	(시험지 attempt_questions는 남아있으므로, 원하면 “출제된 문제 목록” 정도는 보여줄 수도 있음)
탈퇴
•	경고 + 최종 확인
________________________________________
11) 관리자 화면 계획
•	문제 업로드(CSV/JSON)
•	images.zip 업로드 → question_code로 매칭 → image_url 업데이트
•	문제 수정/비활성화(soft delete)
•	변경 시 audit_logs에 “이유+전후 값” 기록
•	어제 스냅샷 재생성 기능(필요 시)
________________________________________
12) 개발 순서(이대로 하면 가장 빠르고 안전)
1.	Supabase Auth + profiles 연결
2.	DB 테이블 생성(위 확정 스키마)
3.	유니크 인덱스 적용(동시성 확정)
4.	Storage 버킷(question-images) 생성 + 공개 URL 세팅
5.	API 구현(start/paper/submit/leaderboard/withdraw)
6.	프론트 구현(홈/시험/결과/마이페이지/탈퇴)
7.	관리자 구현(업로드/zip매칭/audit_logs)
8.	테스트
o	start 연타해도 IN_PROGRESS 1개
o	23:30 새 시험 생성 불가, 이어하기 가능
o	60분 넘으면 EXPIRED 처리 + 답안 삭제 + 마이페이지 표시
o	EXPIRED여도 attempt_questions는 남는지 확인
o	탈퇴하면 오늘 랭킹에서 즉시 제외(daily_best_scores 삭제)
o	어제 스냅샷은 (탈퇴한 사용자)로 익명화
o	이미지 매칭 실패 시 image_url=null

