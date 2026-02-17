import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. 로그인 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // 2. exam_id 검증
    const { exam_id } = await request.json()

    if (!exam_id) {
      return NextResponse.json({ error: 'exam_id가 필요합니다' }, { status: 400 })
    }

    // exam 존재 확인
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, name')
      .eq('id', exam_id)
      .single()

    if (examError || !exam) {
      return NextResponse.json({ error: '존재하지 않는 시험입니다' }, { status: 404 })
    }

    // 3. 진행 중인 시험 확인 (시험 종류 상관없이)
    const { data: existingAttempts } = await supabase
      .from('attempts')
      .select('id, exam_id, status, started_at, expires_at')
      .eq('user_id', user.id)
      .eq('status', 'IN_PROGRESS')
      .order('started_at', { ascending: false })
      .limit(1)

    if (existingAttempts && existingAttempts.length > 0) {
      const existing = existingAttempts[0]
      const now = new Date()
      const expiresAt = new Date(existing.expires_at)

      // 만료 전이면 이어풀기
      if (now < expiresAt) {
        return NextResponse.json({
          attempt_id: existing.id,
          exam_id: existing.exam_id,
          is_existing: true,
          message: '이미 진행 중인 시험이 있습니다',
        })
      }

      // 만료됨 - EXPIRED 처리 및 답안 삭제
      await supabase
        .from('attempts')
        .update({ status: 'EXPIRED' })
        .eq('id', existing.id)

      // 답안 삭제
      await supabase.from('attempt_items').delete().eq('attempt_id', existing.id)

      // 과목 점수 삭제
      await supabase.from('subject_scores').delete().eq('attempt_id', existing.id)
    }

    // 4. 23:00~23:59 KST 체크
    const now = new Date()
    const kstOffset = 9 * 60 // KST는 UTC+9
    const kstDate = new Date(now.getTime() + kstOffset * 60 * 1000)
    const kstHour = kstDate.getUTCHours()

    if (kstHour === 23) {
      return NextResponse.json(
        {
          error: '23:00~23:59(KST)에는 새 시험을 시작할 수 없습니다',
          can_start: false,
        },
        { status: 403 }
      )
    }

    // 5. 과목 및 문항 수 조회
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name, questions_per_attempt')
      .eq('exam_id', exam_id)
      .order('order_no')

    if (subjectsError || !subjects || subjects.length === 0) {
      return NextResponse.json({ error: '과목 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    // 총 문항 수 계산
    const totalQuestions = subjects.reduce(
      (sum, subject) => sum + subject.questions_per_attempt,
      0
    )

    // 6. 새 attempt 생성
    const startedAt = new Date()
    const expiresAt = new Date(startedAt.getTime() + 60 * 60 * 1000) // 60분 후

    const { data: newAttempt, error: attemptError } = await supabase
      .from('attempts')
      .insert({
        user_id: user.id,
        exam_id: exam_id,
        status: 'IN_PROGRESS',
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        total_questions: totalQuestions,
      })
      .select('id')
      .single()

    if (attemptError || !newAttempt) {
      console.error('Attempt creation error:', attemptError)
      return NextResponse.json(
        { error: '시험 생성에 실패했습니다: ' + attemptError?.message },
        { status: 500 }
      )
    }

    // 7. 각 과목별로 문제 랜덤 선택
    const attemptQuestions = []
    let seq = 1

    for (const subject of subjects) {
      // 해당 과목의 활성 문제 조회
      const { data: availableQuestions, error: questionsError } = await supabase
        .from('questions')
        .select('id')
        .eq('exam_id', exam_id)
        .eq('subject_id', subject.id)
        .eq('is_active', true)

      if (questionsError || !availableQuestions || availableQuestions.length === 0) {
        // 롤백: attempt 삭제
        await supabase.from('attempts').delete().eq('id', newAttempt.id)
        return NextResponse.json(
          { error: `${subject.name} 과목의 활성 문제가 없습니다` },
          { status: 404 }
        )
      }

      // 필요한 수보다 문제가 적으면 에러
      if (availableQuestions.length < subject.questions_per_attempt) {
        await supabase.from('attempts').delete().eq('id', newAttempt.id)
        return NextResponse.json(
          {
            error: `${subject.name} 과목의 문제가 부족합니다 (필요: ${subject.questions_per_attempt}, 현재: ${availableQuestions.length})`,
          },
          { status: 400 }
        )
      }

      // 랜덤 선택 (Fisher-Yates shuffle)
      const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5)
      const selected = shuffled.slice(0, subject.questions_per_attempt)

      // attempt_questions에 추가
      for (const question of selected) {
        attemptQuestions.push({
          attempt_id: newAttempt.id,
          seq: seq++,
          question_id: question.id,
        })
      }
    }

    // 8. attempt_questions 일괄 삽입
    const { error: insertError } = await supabase
      .from('attempt_questions')
      .insert(attemptQuestions)

    if (insertError) {
      console.error('Attempt questions insert error:', insertError)
      // 롤백: attempt 삭제
      await supabase.from('attempts').delete().eq('id', newAttempt.id)
      return NextResponse.json(
        { error: '시험지 생성에 실패했습니다: ' + insertError.message },
        { status: 500 }
      )
    }

    // 9. 성공 응답
    return NextResponse.json({
      attempt_id: newAttempt.id,
      exam_id: exam_id,
      exam_name: exam.name,
      total_questions: totalQuestions,
      expires_at: expiresAt.toISOString(),
      is_existing: false,
      message: '시험이 시작되었습니다',
    })
  } catch (error) {
    console.error('Start attempt error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
