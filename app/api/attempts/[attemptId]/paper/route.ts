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

    // 2. attempt 조회 및 권한 확인
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('id, user_id, exam_id, status, started_at, expires_at, total_questions')
      .eq('id', attemptId)
      .single()

    if (attemptError || !attempt) {
      return NextResponse.json({ error: '시험을 찾을 수 없습니다' }, { status: 404 })
    }

    // 본인의 시험인지 확인
    if (attempt.user_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    // 3. exam 정보 조회
    const { data: exam } = await supabase
      .from('exams')
      .select('name')
      .eq('id', attempt.exam_id)
      .single()

    // 4. attempt_questions 기준으로 문제 조회 (정답 제외!)
    const { data: attemptQuestions, error: questionsError } = await supabase
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

    if (questionsError) {
      console.error('Questions fetch error:', questionsError)
      return NextResponse.json({ error: '문제를 불러올 수 없습니다' }, { status: 500 })
    }

    // 5. 기존 답안 조회 (이어풀기를 위해)
    const { data: savedAnswers } = await supabase
      .from('attempt_items')
      .select('question_id, selected')
      .eq('attempt_id', attemptId)

    // 답안을 question_id로 매핑
    const answersMap = new Map()
    savedAnswers?.forEach((item) => {
      answersMap.set(item.question_id, item.selected)
    })

    // 6. 응답 데이터 구성 (정답 제외!)
    const questions = attemptQuestions?.map((aq: any) => ({
      seq: aq.seq,
      question_id: aq.questions.id,
      question_code: aq.questions.question_code,
      question_text: aq.questions.question_text,
      choice_1: aq.questions.choice_1,
      choice_2: aq.questions.choice_2,
      choice_3: aq.questions.choice_3,
      choice_4: aq.questions.choice_4,
      image_url: aq.questions.image_url,
      subject_name: aq.questions.subjects?.name,
      selected: answersMap.get(aq.questions.id) || null, // 저장된 답안
    }))

    return NextResponse.json({
      attempt_id: attempt.id,
      exam_id: attempt.exam_id,
      exam_name: exam?.name,
      status: attempt.status,
      started_at: attempt.started_at,
      expires_at: attempt.expires_at,
      total_questions: attempt.total_questions,
      questions: questions || [],
    })
  } catch (error) {
    console.error('Get paper error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
