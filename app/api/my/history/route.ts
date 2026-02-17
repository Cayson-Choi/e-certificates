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

    // 1. 사용자의 모든 응시 기록 조회 (제출된 것만)
    const { data: attempts, error: attemptsError } = await supabase
      .from('attempts')
      .select(
        `
        id,
        exam_id,
        started_at,
        submitted_at,
        total_score,
        exams (
          name
        )
      `
      )
      .eq('user_id', user.id)
      .eq('status', 'SUBMITTED')
      .order('submitted_at', { ascending: false })

    if (attemptsError) {
      console.error('Attempts query error:', attemptsError)
      return NextResponse.json({ error: '데이터 조회 실패' }, { status: 500 })
    }

    // 2. 각 응시의 과목별 점수 조회
    const attemptsWithSubjects = await Promise.all(
      (attempts || []).map(async (attempt) => {
        const { data: subjectScores } = await supabase
          .from('attempt_subject_scores')
          .select(
            `
            subject_id,
            subject_score,
            subject_correct,
            subject_questions,
            subjects (
              name
            )
          `
          )
          .eq('attempt_id', attempt.id)
          .order('subject_id')

        return {
          ...attempt,
          exam_name: (attempt.exams as any)?.name || '알 수 없음',
          subject_scores: subjectScores || [],
        }
      })
    )

    // 3. 통계 계산
    const totalAttempts = attempts?.length || 0
    const scores = attempts?.map((a) => a.total_score).filter((s) => s !== null) || []
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0
    const passCount = scores.filter((s) => s >= 60).length

    // 4. 시험별 통계
    const examStats = (attempts || []).reduce((acc: any, attempt) => {
      const examId = attempt.exam_id
      const examName = (attempt.exams as any)?.name || '알 수 없음'

      if (!acc[examId]) {
        acc[examId] = {
          exam_id: examId,
          exam_name: examName,
          count: 0,
          scores: [],
        }
      }

      acc[examId].count++
      if (attempt.total_score !== null) {
        acc[examId].scores.push(attempt.total_score)
      }

      return acc
    }, {})

    const examStatsArray = Object.values(examStats).map((stat: any) => ({
      exam_id: stat.exam_id,
      exam_name: stat.exam_name,
      attempt_count: stat.count,
      avg_score: stat.scores.length > 0
        ? Math.round(stat.scores.reduce((a: number, b: number) => a + b, 0) / stat.scores.length)
        : 0,
      max_score: stat.scores.length > 0 ? Math.max(...stat.scores) : 0,
    }))

    return NextResponse.json({
      attempts: attemptsWithSubjects,
      stats: {
        total_attempts: totalAttempts,
        avg_score: avgScore,
        max_score: maxScore,
        pass_count: passCount,
        pass_rate: totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 0,
      },
      exam_stats: examStatsArray,
    })
  } catch (error) {
    console.error('My history error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
