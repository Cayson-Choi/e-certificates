import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // 시험 정보 조회
    const { data: exam } = await adminClient
      .from('exams')
      .select('id, name, exam_mode, duration_minutes')
      .eq('id', examId)
      .single()

    if (!exam) {
      return NextResponse.json({ error: '시험을 찾을 수 없습니다' }, { status: 404 })
    }

    // 해당 시험의 제출된 attempts 조회 (profiles JOIN 없이)
    const { data: attempts, error } = await adminClient
      .from('attempts')
      .select(`
        id,
        user_id,
        status,
        started_at,
        submitted_at,
        total_questions,
        total_correct,
        total_score,
        grading_status
      `)
      .eq('exam_id', examId)
      .eq('status', 'SUBMITTED')
      .order('total_score', { ascending: false })

    if (error) {
      console.error('Results fetch error:', error)
      return NextResponse.json({ error: '결과 조회 실패' }, { status: 500 })
    }

    // user_id 목록으로 profiles 별도 조회
    const userIds = (attempts || []).map((a: any) => a.user_id)
    let profilesMap: Record<string, any> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, name, student_id, affiliation')
        .in('id', userIds)

      if (profiles) {
        for (const p of profiles) {
          profilesMap[p.id] = p
        }
      }
    }

    const results = (attempts || []).map((a: any) => {
      const p = profilesMap[a.user_id]
      return {
        attempt_id: a.id,
        user_id: a.user_id,
        student_id: p?.student_id || '',
        name: p?.name || '',
        affiliation: p?.affiliation || '',
        total_questions: a.total_questions,
        total_correct: a.total_correct,
        total_score: a.total_score,
        grading_status: a.grading_status || 'COMPLETED',
        started_at: a.started_at,
        submitted_at: a.submitted_at,
      }
    })

    return NextResponse.json({
      exam,
      results,
    })
  } catch (error) {
    console.error('Official exam results error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
