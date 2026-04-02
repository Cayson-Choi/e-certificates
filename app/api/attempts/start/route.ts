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
    const { exam_id, password } = await request.json()

    if (!exam_id) {
      return NextResponse.json({ error: 'exam_id가 필요합니다' }, { status: 400 })
    }

    // exam 존재 확인 (exam_mode, password, duration_minutes 포함)
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id, name, exam_mode, password, duration_minutes, is_published')
      .eq('id', exam_id)
      .single()

    if (examError || !exam) {
      return NextResponse.json({ error: '존재하지 않는 시험입니다' }, { status: 404 })
    }

    const isOfficial = exam.exam_mode === 'OFFICIAL'

    // OFFICIAL 모드: 게시 상태 및 비밀번호 검증
    if (isOfficial) {
      if (!exam.is_published) {
        return NextResponse.json({ error: '현재 응시할 수 없는 시험입니다' }, { status: 403 })
      }
      if (!password || password !== exam.password) {
        return NextResponse.json({ error: '비밀번호가 일치하지 않습니다' }, { status: 403 })
      }
    }

    // 3. 진행 중인 시험이 있으면 자동 삭제 (기록 남기지 않음)
    const { data: existingAttempts } = await supabase
      .from('attempts')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'IN_PROGRESS')

    if (existingAttempts && existingAttempts.length > 0) {
      for (const existing of existingAttempts) {
        await supabase.from('attempt_items').delete().eq('attempt_id', existing.id)
        await supabase.from('subject_scores').delete().eq('attempt_id', existing.id)
        await supabase.from('attempt_questions').delete().eq('attempt_id', existing.id)
        await supabase.from('attempts').delete().eq('id', existing.id)
      }
    }

    // 4. 23:00~23:59 KST 체크 (PRACTICE 모드에서만)
    if (!isOfficial) {
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

    // 6. 문제 선택 로직 (PRACTICE vs OFFICIAL)
    const attemptQuestions: { attempt_id: number; seq: number; question_id: number }[] = []
    let totalQuestions: number

    if (isOfficial) {
      // OFFICIAL: 전체 활성 문제를 id 순서로 전부 사용
      const { data: allQuestions, error: questionsError } = await supabase
        .from('questions')
        .select('id')
        .eq('exam_id', exam_id)
        .eq('is_active', true)
        .order('id')

      if (questionsError || !allQuestions || allQuestions.length === 0) {
        return NextResponse.json(
          { error: '출제할 문제가 없습니다' },
          { status: 404 }
        )
      }

      totalQuestions = allQuestions.length

      // 6-1. attempt 생성 (OFFICIAL duration 사용)
      const startedAt = new Date()
      const expiresAt = new Date(startedAt.getTime() + exam.duration_minutes * 60 * 1000)

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

      let seq = 1
      for (const q of allQuestions) {
        attemptQuestions.push({
          attempt_id: newAttempt.id,
          seq: seq++,
          question_id: q.id,
        })
      }

      // attempt_questions 일괄 삽입
      const { error: insertError } = await supabase
        .from('attempt_questions')
        .insert(attemptQuestions)

      if (insertError) {
        console.error('Attempt questions insert error:', insertError)
        await supabase.from('attempts').delete().eq('id', newAttempt.id)
        return NextResponse.json(
          { error: '시험지 생성에 실패했습니다: ' + insertError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        attempt_id: newAttempt.id,
        exam_id: exam_id,
        exam_name: exam.name,
        exam_mode: exam.exam_mode,
        duration_minutes: exam.duration_minutes,
        total_questions: totalQuestions,
        expires_at: expiresAt.toISOString(),
        is_existing: false,
        message: '시험이 시작되었습니다',
      })
    } else {
      // PRACTICE: 기존 랜덤 선택 로직
      totalQuestions = subjects.reduce(
        (sum, subject) => sum + subject.questions_per_attempt,
        0
      )

      const startedAt = new Date()
      const expiresAt = new Date(startedAt.getTime() + exam.duration_minutes * 60 * 1000)

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

      let seq = 1

      for (const subject of subjects) {
        const { data: availableQuestions, error: questionsError } = await supabase
          .from('questions')
          .select('id')
          .eq('exam_id', exam_id)
          .eq('subject_id', subject.id)
          .eq('is_active', true)

        if (questionsError || !availableQuestions || availableQuestions.length === 0) {
          await supabase.from('attempts').delete().eq('id', newAttempt.id)
          return NextResponse.json(
            { error: `${subject.name} 과목의 활성 문제가 없습니다` },
            { status: 404 }
          )
        }

        if (availableQuestions.length < subject.questions_per_attempt) {
          await supabase.from('attempts').delete().eq('id', newAttempt.id)
          return NextResponse.json(
            {
              error: `${subject.name} 과목의 문제가 부족합니다 (필요: ${subject.questions_per_attempt}, 현재: ${availableQuestions.length})`,
            },
            { status: 400 }
          )
        }

        const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5)
        const selected = shuffled.slice(0, subject.questions_per_attempt)

        for (const question of selected) {
          attemptQuestions.push({
            attempt_id: newAttempt.id,
            seq: seq++,
            question_id: question.id,
          })
        }
      }

      const { error: insertError } = await supabase
        .from('attempt_questions')
        .insert(attemptQuestions)

      if (insertError) {
        console.error('Attempt questions insert error:', insertError)
        await supabase.from('attempts').delete().eq('id', newAttempt.id)
        return NextResponse.json(
          { error: '시험지 생성에 실패했습니다: ' + insertError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        attempt_id: newAttempt.id,
        exam_id: exam_id,
        exam_name: exam.name,
        exam_mode: exam.exam_mode,
        duration_minutes: exam.duration_minutes,
        total_questions: totalQuestions,
        expires_at: expiresAt.toISOString(),
        is_existing: false,
        message: '시험이 시작되었습니다',
      })
    }
  } catch (error) {
    console.error('Start attempt error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
