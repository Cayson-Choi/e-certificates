import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ examId: string; attemptId: string }> }
) {
  try {
    const supabase = await createClient()
    const { examId, attemptId } = await params

    // 관리자 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // attempt 조회 (JOIN 없이)
    const { data: attempt, error: attemptError } = await adminClient
      .from('attempts')
      .select(`
        id,
        user_id,
        exam_id,
        status,
        started_at,
        submitted_at,
        total_questions,
        total_correct,
        total_score,
        violation_count,
        grading_status
      `)
      .eq('id', attemptId)
      .eq('exam_id', examId)
      .single()

    if (attemptError || !attempt) {
      return NextResponse.json({ error: '시험을 찾을 수 없습니다' }, { status: 404 })
    }

    if (attempt.status !== 'SUBMITTED') {
      return NextResponse.json({ error: '제출된 시험이 아닙니다' }, { status: 400 })
    }

    // profiles 별도 조회
    const { data: studentProfile } = await adminClient
      .from('profiles')
      .select('name, student_id, affiliation')
      .eq('id', attempt.user_id)
      .single()

    // exams 별도 조회
    const { data: examData } = await adminClient
      .from('exams')
      .select('name, exam_mode')
      .eq('id', attempt.exam_id)
      .single()

    // 과목별 점수 조회
    const { data: subjectScores } = await adminClient
      .from('subject_scores')
      .select(`
        subject_id,
        subject_questions,
        subject_correct,
        subject_score
      `)
      .eq('attempt_id', attemptId)

    // subjects 별도 조회 (과목 이름)
    const subjectIds = (subjectScores || []).map((s: any) => s.subject_id)
    let subjectsMap: Record<number, any> = {}
    if (subjectIds.length > 0) {
      const { data: subjectsData } = await adminClient
        .from('subjects')
        .select('id, name, order_no')
        .in('id', subjectIds)
      if (subjectsData) {
        for (const s of subjectsData) {
          subjectsMap[s.id] = s
        }
      }
    }

    const subjectScoresWithNames = (subjectScores || []).map((s: any) => ({
      ...s,
      subjects: subjectsMap[s.subject_id] || { name: '', order_no: 0 },
    }))

    // 문제별 정답/오답 조회
    const { data: attemptQuestions } = await adminClient
      .from('attempt_questions')
      .select('seq, question_id')
      .eq('attempt_id', attemptId)
      .order('seq')

    // questions 별도 조회
    const questionIds = (attemptQuestions || []).map((q: any) => q.question_id)
    let questionsMap: Record<number, any> = {}
    if (questionIds.length > 0) {
      const { data: questionsData } = await adminClient
        .from('questions')
        .select('id, question_code, question_text, question_type, choice_1, choice_2, choice_3, choice_4, answer, answer_text, explanation, image_url, subject_id, points')
        .in('id', questionIds)
      if (questionsData) {
        for (const q of questionsData) {
          questionsMap[q.id] = q
        }
      }
    }

    // 학생 답안 조회
    const { data: studentAnswers } = await adminClient
      .from('attempt_items')
      .select('question_id, selected, is_correct, answer_text, awarded_points, grading_status, ai_feedback')
      .eq('attempt_id', attemptId)

    const answersMap = new Map()
    studentAnswers?.forEach((item) => {
      answersMap.set(item.question_id, item)
    })

    const questionsWithAnswers = (attemptQuestions || []).map((aq: any) => {
      const q = questionsMap[aq.question_id] || {}
      const studentAnswer = answersMap.get(aq.question_id)
      const subjectName = q.subject_id ? (subjectsMap[q.subject_id]?.name || '') : ''
      return {
        seq: aq.seq,
        question_id: aq.question_id,
        question_text: q.question_text || '',
        question_type: q.question_type || 'CHOICE',
        choice_1: q.choice_1 || '',
        choice_2: q.choice_2 || '',
        choice_3: q.choice_3 || '',
        choice_4: q.choice_4 || '',
        correct_answer: q.answer || 0,
        answer_text: q.answer_text || null,
        explanation: q.explanation || '',
        image_url: q.image_url || null,
        subject_name: subjectName,
        points: q.points || 1,
        student_answer: studentAnswer?.selected || null,
        student_answer_text: studentAnswer?.answer_text || null,
        is_correct: studentAnswer?.is_correct ?? null,
        awarded_points: studentAnswer?.awarded_points ?? null,
        grading_status: studentAnswer?.grading_status || 'AUTO',
        ai_feedback: studentAnswer?.ai_feedback || null,
      }
    })

    return NextResponse.json({
      attempt_id: attempt.id,
      exam_id: attempt.exam_id,
      exam_name: examData?.name || '',
      exam_mode: examData?.exam_mode || 'PRACTICE',
      student: {
        name: studentProfile?.name || '',
        student_id: studentProfile?.student_id || '',
        affiliation: studentProfile?.affiliation || '',
      },
      violation_count: attempt.violation_count || 0,
      grading_status: attempt.grading_status || 'COMPLETED',
      status: attempt.status,
      started_at: attempt.started_at,
      submitted_at: attempt.submitted_at,
      total_questions: attempt.total_questions,
      total_correct: attempt.total_correct,
      total_score: attempt.total_score,
      subject_scores: subjectScoresWithNames,
      questions: questionsWithAnswers,
    })
  } catch (error) {
    console.error('Admin attempt detail error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
