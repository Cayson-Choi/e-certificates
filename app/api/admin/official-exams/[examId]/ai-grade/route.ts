import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { gradeSubjectiveAnswer } from '@/lib/openrouter'
import { NextResponse } from 'next/server'

// Vercel 서버리스 함수 타임아웃 설정 (최대 300초, Hobby 플랜은 60초)
export const maxDuration = 300

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const supabase = await createClient()
    const { examId } = await params

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

    // API 키 확인
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'AI 채점 API 키가 설정되지 않았습니다' }, { status: 500 })
    }

    const adminClient = createAdminClient()

    // PENDING_MANUAL 상태의 attempts 조회
    const { data: attempts, error: attemptsError } = await adminClient
      .from('attempts')
      .select('id, user_id, total_questions')
      .eq('exam_id', examId)
      .eq('status', 'SUBMITTED')
      .eq('grading_status', 'PENDING_MANUAL')

    if (attemptsError) {
      console.error('[AI-GRADE] Attempts fetch error:', attemptsError)
      return NextResponse.json({ error: '시험 데이터 조회 실패' }, { status: 500 })
    }

    if (!attempts || attempts.length === 0) {
      return NextResponse.json({ error: '채점 대기 중인 시험이 없습니다' }, { status: 400 })
    }

    console.log(`[AI-GRADE] Found ${attempts.length} PENDING_MANUAL attempts`)

    let totalGraded = 0
    let totalFailed = 0
    let studentsGraded = 0

    for (const attempt of attempts) {
      console.log(`[AI-GRADE] Processing attempt ${attempt.id}`)

      // attempt_items에는 id 컬럼이 없음 → attempt_id + question_id가 복합 키
      const { data: allItems, error: itemsError } = await adminClient
        .from('attempt_items')
        .select('attempt_id, question_id, answer_text, grading_status, awarded_points')
        .eq('attempt_id', attempt.id)

      if (itemsError) {
        console.error(`[AI-GRADE] Items fetch error for attempt ${attempt.id}:`, itemsError)
        continue
      }

      console.log(`[AI-GRADE] Attempt ${attempt.id}: found ${allItems?.length || 0} total items`)

      if (!allItems || allItems.length === 0) continue

      // 문제 정보 조회
      const questionIds = allItems.map((item) => item.question_id)
      const { data: questions, error: qError } = await adminClient
        .from('questions')
        .select('id, question_text, answer_text, points, question_type')
        .in('id', questionIds)

      if (qError) {
        console.error(`[AI-GRADE] Questions fetch error:`, qError)
        continue
      }

      if (!questions) continue

      const questionsMap = new Map<number, any>()
      questions.forEach((q) => questionsMap.set(q.id, q))

      // 주관식이면서 아직 채점 안 된 항목 필터링
      const ungradedSubjective = allItems.filter((item) => {
        const q = questionsMap.get(item.question_id)
        if (!q) return false
        if (q.question_type === 'CHOICE') return false
        if (item.grading_status === 'GRADED' || item.grading_status === 'AUTO') return false
        return true
      })

      console.log(`[AI-GRADE] Attempt ${attempt.id}: ${ungradedSubjective.length} ungraded subjective items`)

      if (ungradedSubjective.length === 0) continue

      for (const item of ungradedSubjective) {
        const question = questionsMap.get(item.question_id)
        if (!question) continue

        const studentAnswer = item.answer_text?.trim()

        // 빈 답안은 0점 처리 (AI 호출 안함)
        if (!studentAnswer) {
          const { error: updateErr } = await adminClient
            .from('attempt_items')
            .update({
              awarded_points: 0,
              is_correct: false,
              grading_status: 'GRADED',
            })
            .eq('attempt_id', attempt.id)
            .eq('question_id', item.question_id)

          if (updateErr) {
            console.error(`[AI-GRADE] Update error:`, updateErr)
            totalFailed++
          } else {
            console.log(`[AI-GRADE] question_id=${item.question_id}: empty answer → 0 points`)
            totalGraded++
          }
          continue
        }

        // AI 채점 호출
        console.log(`[AI-GRADE] Calling AI for question_id=${item.question_id}: "${studentAnswer.substring(0, 50)}..."`)
        const result = await gradeSubjectiveAnswer({
          questionText: question.question_text,
          answerText: question.answer_text || '',
          studentAnswer,
          points: question.points || 1,
          questionType: question.question_type,
        })

        if (result !== null) {
          const updateData: any = {
            awarded_points: result.score,
            is_correct: result.score > 0,
            grading_status: 'GRADED',
          }
          if (result.feedback) {
            updateData.ai_feedback = result.feedback
          }

          const { error: updateErr } = await adminClient
            .from('attempt_items')
            .update(updateData)
            .eq('attempt_id', attempt.id)
            .eq('question_id', item.question_id)

          if (updateErr) {
            console.error(`[AI-GRADE] Update error:`, updateErr)
            totalFailed++
          } else {
            console.log(`[AI-GRADE] question_id=${item.question_id}: AI scored ${result.score}/${question.points}`)
            totalGraded++
          }
        } else {
          console.error(`[AI-GRADE] AI returned null for question_id=${item.question_id}`)
          totalFailed++
        }

        // rate limit 대비 딜레이
        await delay(500)
      }

      // 모든 주관식 채점 완료 확인
      const { data: afterItems } = await adminClient
        .from('attempt_items')
        .select('question_id, grading_status')
        .eq('attempt_id', attempt.id)

      const stillUngraded = afterItems?.filter((item) => {
        const q = questionsMap.get(item.question_id)
        if (!q || q.question_type === 'CHOICE') return false
        return item.grading_status !== 'GRADED' && item.grading_status !== 'AUTO'
      })

      const allDone = !stillUngraded || stillUngraded.length === 0
      console.log(`[AI-GRADE] Attempt ${attempt.id}: all done = ${allDone}`)

      if (allDone) {
        // 전체 점수 재계산
        const { data: finalItems } = await adminClient
          .from('attempt_items')
          .select('question_id, awarded_points, is_correct')
          .eq('attempt_id', attempt.id)

        let totalPointsEarned = 0
        let totalCorrect = 0
        finalItems?.forEach((fi) => {
          totalPointsEarned += fi.awarded_points || 0
          if (fi.is_correct) totalCorrect++
        })

        console.log(`[AI-GRADE] Attempt ${attempt.id}: totalScore=${totalPointsEarned}, totalCorrect=${totalCorrect}`)

        // attempts 업데이트
        await adminClient
          .from('attempts')
          .update({
            total_score: totalPointsEarned,
            total_correct: totalCorrect,
            grading_status: 'COMPLETED',
          })
          .eq('id', attempt.id)

        // subject_scores 재계산
        const { data: attemptQuestions } = await adminClient
          .from('attempt_questions')
          .select('question_id, questions(subject_id, points)')
          .eq('attempt_id', attempt.id)

        const itemsMap = new Map<number, any>()
        finalItems?.forEach((fi) => itemsMap.set(fi.question_id, fi))

        const subjectStats = new Map<number, { correct: number; total: number; pointsEarned: number }>()
        for (const aq of (attemptQuestions || []) as any[]) {
          const subjectId = aq.questions?.subject_id
          if (!subjectId) continue

          if (!subjectStats.has(subjectId)) {
            subjectStats.set(subjectId, { correct: 0, total: 0, pointsEarned: 0 })
          }
          const stats = subjectStats.get(subjectId)!
          stats.total++

          const fi = itemsMap.get(aq.question_id)
          if (fi) {
            stats.pointsEarned += fi.awarded_points || 0
            if (fi.is_correct) stats.correct++
          }
        }

        // 기존 subject_scores 삭제 후 재생성
        await adminClient
          .from('subject_scores')
          .delete()
          .eq('attempt_id', attempt.id)

        for (const [subjectId, stats] of subjectStats.entries()) {
          await adminClient.from('subject_scores').insert({
            attempt_id: attempt.id,
            subject_id: subjectId,
            subject_questions: stats.total,
            subject_correct: stats.correct,
            subject_score: stats.pointsEarned,
          })
        }

        studentsGraded++
      }
    }

    console.log(`[AI-GRADE] Done: graded=${totalGraded}, failed=${totalFailed}, students=${studentsGraded}`)

    return NextResponse.json({
      success: true,
      totalGraded,
      totalFailed,
      studentsGraded,
      totalAttempts: attempts.length,
    })
  } catch (error) {
    console.error('[AI-GRADE] Unexpected error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
