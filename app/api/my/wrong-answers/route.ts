import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // 로그인 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // 1. 사용자의 모든 제출된 시도 조회
    const { data: attempts } = await supabase
      .from('attempts')
      .select('id, exam_id, submitted_at')
      .eq('user_id', user.id)
      .eq('status', 'SUBMITTED')
      .order('submitted_at', { ascending: false })

    if (!attempts || attempts.length === 0) {
      return NextResponse.json({ wrong_answers: [] })
    }

    // 2. 모든 시도의 틀린 문제 조회 (배치 처리)
    const wrongAnswers = []
    const attemptIds = attempts.map((a) => a.id)

    // 모든 attempt_questions 한번에 조회
    const { data: allAttemptQuestions } = await supabase
      .from('attempt_questions')
      .select('attempt_id, question_id')
      .in('attempt_id', attemptIds)

    // 모든 answers 한번에 조회 (attempt_items 테이블 사용)
    const { data: allAnswers } = await supabase
      .from('attempt_items')
      .select('attempt_id, question_id, selected, is_correct')
      .in('attempt_id', attemptIds)

    // attempt별로 그룹화
    const questionsByAttempt = new Map<number, number[]>()
    for (const aq of allAttemptQuestions || []) {
      if (!questionsByAttempt.has(aq.attempt_id)) {
        questionsByAttempt.set(aq.attempt_id, [])
      }
      questionsByAttempt.get(aq.attempt_id)!.push(aq.question_id)
    }

    const answersByAttempt = new Map<number, Map<number, number>>()
    for (const ans of allAnswers || []) {
      if (!answersByAttempt.has(ans.attempt_id)) {
        answersByAttempt.set(ans.attempt_id, new Map())
      }
      answersByAttempt.get(ans.attempt_id)!.set(ans.question_id, ans.selected)
    }

    // 모든 고유 question_id 수집
    const allQuestionIds = Array.from(
      new Set(allAttemptQuestions?.map((aq) => aq.question_id) || [])
    )

    if (allQuestionIds.length === 0) {
      return NextResponse.json({ wrong_answers: [], total_count: 0, subject_stats: [] })
    }

    // 모든 questions 한번에 조회
    const { data: questions } = await supabase
      .from('questions')
      .select('id, question_code, exam_id, subject_id, question_text, choice_1, choice_2, choice_3, choice_4, answer, explanation')
      .in('id', allQuestionIds)

    const questionsMap = new Map((questions || []).map((q) => [q.id, q]))

    // 고유 subject_id, exam_id 수집
    const subjectIds = Array.from(new Set(questions?.map((q) => q.subject_id) || []))
    const examIds = Array.from(new Set(questions?.map((q) => q.exam_id) || []))

    // 모든 subjects 한번에 조회
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name')
      .in('id', subjectIds)

    const subjectsMap = new Map((subjects || []).map((s) => [s.id, s.name]))

    // 모든 exams 한번에 조회
    const { data: exams } = await supabase
      .from('exams')
      .select('id, name')
      .in('id', examIds)

    const examsMap = new Map((exams || []).map((e) => [e.id, e.name]))

    // 데이터 병합 및 틀린 문제 필터링
    for (const attempt of attempts) {
      const questionIds = questionsByAttempt.get(attempt.id) || []
      const answersMap = answersByAttempt.get(attempt.id) || new Map()

      for (const questionId of questionIds) {
        const question = questionsMap.get(questionId)
        if (!question) continue

        const studentAnswer = answersMap.get(questionId)
        const correctAnswer = question.answer

        // 틀린 문제만 추가
        if (studentAnswer && studentAnswer !== correctAnswer) {
          wrongAnswers.push({
            attempt_id: attempt.id,
            attempt_date: attempt.submitted_at,
            exam_id: question.exam_id,
            exam_name: examsMap.get(question.exam_id) || '알 수 없음',
            subject_id: question.subject_id,
            subject_name: subjectsMap.get(question.subject_id) || '알 수 없음',
            question_id: question.id,
            question_code: question.question_code,
            question_text: question.question_text,
            choice_1: question.choice_1,
            choice_2: question.choice_2,
            choice_3: question.choice_3,
            choice_4: question.choice_4,
            correct_answer: correctAnswer,
            student_answer: studentAnswer,
            explanation: question.explanation,
          })
        }
      }
    }

    // 3. 중복 제거 (같은 문제를 여러 번 틀린 경우 가장 최근 것만)
    const uniqueWrongAnswers = Array.from(
      wrongAnswers
        .reduce((map, item) => {
          const existing = map.get(item.question_id)
          if (!existing || new Date(item.attempt_date) > new Date(existing.attempt_date)) {
            map.set(item.question_id, item)
          }
          return map
        }, new Map())
        .values()
    )

    // 4. 과목별 통계
    const subjectStats = uniqueWrongAnswers.reduce((acc: any, item) => {
      const key = item.subject_id
      if (!acc[key]) {
        acc[key] = {
          subject_id: item.subject_id,
          subject_name: item.subject_name,
          count: 0,
        }
      }
      acc[key].count++
      return acc
    }, {})

    return NextResponse.json({
      wrong_answers: uniqueWrongAnswers,
      total_count: uniqueWrongAnswers.length,
      subject_stats: Object.values(subjectStats),
    })
  } catch (error) {
    console.error('Wrong answers error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
