import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const supabase = await createClient()
    const { attemptId } = await params

    // 1. 로그인 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // 2. attempt 조회
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select(
        `
        id,
        user_id,
        exam_id,
        status,
        started_at,
        submitted_at,
        total_questions,
        total_correct,
        total_score,
        exams (
          name
        )
      `
      )
      .eq('id', attemptId)
      .single()

    if (attemptError || !attempt) {
      return NextResponse.json({ error: '시험을 찾을 수 없습니다' }, { status: 404 })
    }

    // 본인의 시험인지 확인
    if (attempt.user_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    // 제출되지 않은 시험
    if (attempt.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: '제출된 시험이 아닙니다' },
        { status: 400 }
      )
    }

    // 3. 과목별 점수 조회
    const { data: subjectScores } = await supabase
      .from('subject_scores')
      .select(
        `
        subject_id,
        subject_questions,
        subject_correct,
        subject_score,
        subjects (
          name,
          order_no
        )
      `
      )
      .eq('attempt_id', attemptId)
      .order('subjects(order_no)')

    // 4. 문제별 정답/오답 조회
    const { data: questions } = await supabase
      .from('attempt_questions')
      .select(
        `
        seq,
        question_id,
        questions (
          id,
          question_code,
          question_text,
          choice_1,
          choice_2,
          choice_3,
          choice_4,
          answer,
          explanation,
          image_url,
          subject_id,
          subjects (
            name
          )
        )
      `
      )
      .eq('attempt_id', attemptId)
      .order('seq')

    // 5. 학생 답안 조회
    const { data: studentAnswers } = await supabase
      .from('attempt_items')
      .select('question_id, selected, is_correct')
      .eq('attempt_id', attemptId)

    const answersMap = new Map()
    studentAnswers?.forEach((item) => {
      answersMap.set(item.question_id, item)
    })

    // 6. 문제 데이터 구성
    const questionsWithAnswers = questions?.map((q: any) => {
      const studentAnswer = answersMap.get(q.questions.id)
      return {
        seq: q.seq,
        question_id: q.questions.id,
        question_text: q.questions.question_text,
        choice_1: q.questions.choice_1,
        choice_2: q.questions.choice_2,
        choice_3: q.questions.choice_3,
        choice_4: q.questions.choice_4,
        correct_answer: q.questions.answer,
        explanation: q.questions.explanation,
        image_url: q.questions.image_url,
        subject_name: (q.questions.subjects as any)?.name || '',
        student_answer: studentAnswer?.selected || null,
        is_correct: studentAnswer?.is_correct || false,
      }
    })

    return NextResponse.json({
      attempt_id: attempt.id,
      exam_id: attempt.exam_id,
      exam_name: (attempt.exams as any)?.name || '',
      status: attempt.status,
      started_at: attempt.started_at,
      submitted_at: attempt.submitted_at,
      total_questions: attempt.total_questions,
      total_correct: attempt.total_correct,
      total_score: attempt.total_score,
      subject_scores: subjectScores || [],
      questions: questionsWithAnswers || [],
    })
  } catch (error) {
    console.error('Get result error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
