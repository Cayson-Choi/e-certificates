import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 관리자 권한 확인
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

    const body = await request.json()
    const { scope, exam_id, user_id } = body as {
      scope: 'all' | 'exam' | 'user'
      exam_id?: number
      user_id?: string
    }

    if (!scope || !['all', 'exam', 'user'].includes(scope)) {
      return NextResponse.json({ error: '유효하지 않은 scope입니다' }, { status: 400 })
    }

    if (scope === 'exam' && !exam_id) {
      return NextResponse.json({ error: 'exam_id가 필요합니다' }, { status: 400 })
    }

    if (scope === 'user' && !user_id) {
      return NextResponse.json({ error: 'user_id가 필요합니다' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    if (scope === 'all') {
      // 전체 초기화: FK 순서대로 DELETE (각 테이블의 실제 컬럼 사용)
      await adminSupabase.from('daily_leaderboard_snapshots').delete().gte('rank', 0)
      await adminSupabase.from('daily_best_scores').delete().gte('best_score', 0)
      await adminSupabase.from('subject_scores').delete().gte('attempt_id', 0)
      await adminSupabase.from('attempt_items').delete().gte('attempt_id', 0)
      await adminSupabase.from('attempt_questions').delete().gte('attempt_id', 0)
      await adminSupabase.from('attempts').delete().gte('id', 0)

      return NextResponse.json({
        message: '전체 응시 기록이 초기화되었습니다',
        scope: 'all',
      })
    }

    // exam 또는 user scope: attempt_id 목록 조회 후 관련 데이터 삭제
    let attemptQuery = adminSupabase.from('attempts').select('id')

    if (scope === 'exam') {
      attemptQuery = attemptQuery.eq('exam_id', exam_id!)
    } else {
      attemptQuery = attemptQuery.eq('user_id', user_id!)
      // user scope에서 특정 시험만 삭제
      if (exam_id) {
        attemptQuery = attemptQuery.eq('exam_id', exam_id)
      }
    }

    const { data: attempts, error: attemptError } = await attemptQuery

    if (attemptError) {
      console.error('Attempts query error:', attemptError)
      return NextResponse.json({ error: '응시 기록 조회 실패' }, { status: 500 })
    }

    const attemptIds = (attempts || []).map((a) => a.id)

    if (attemptIds.length === 0) {
      return NextResponse.json({
        message: '삭제할 응시 기록이 없습니다',
        scope,
        deleted_count: 0,
      })
    }

    // FK 순서대로 삭제
    // 1. daily_leaderboard_snapshots (user_id + exam_id 기반)
    if (scope === 'user') {
      let snapshotQuery = adminSupabase
        .from('daily_leaderboard_snapshots')
        .delete()
        .eq('user_id', user_id!)
      if (exam_id) snapshotQuery = snapshotQuery.eq('exam_id', exam_id)
      await snapshotQuery
    } else if (scope === 'exam') {
      await adminSupabase
        .from('daily_leaderboard_snapshots')
        .delete()
        .eq('exam_id', exam_id!)
    }

    // 2. daily_best_scores (user_id + exam_id 기반)
    if (scope === 'user') {
      let bestQuery = adminSupabase
        .from('daily_best_scores')
        .delete()
        .eq('user_id', user_id!)
      if (exam_id) bestQuery = bestQuery.eq('exam_id', exam_id)
      await bestQuery
    } else if (scope === 'exam') {
      await adminSupabase
        .from('daily_best_scores')
        .delete()
        .eq('exam_id', exam_id!)
    }

    // 3. subject_scores (attempt_id 기반)
    await adminSupabase
      .from('subject_scores')
      .delete()
      .in('attempt_id', attemptIds)

    // 4. attempt_items (attempt_id 기반)
    await adminSupabase
      .from('attempt_items')
      .delete()
      .in('attempt_id', attemptIds)

    // 5. attempt_questions (attempt_id 기반)
    await adminSupabase
      .from('attempt_questions')
      .delete()
      .in('attempt_id', attemptIds)

    // 6. attempts
    await adminSupabase
      .from('attempts')
      .delete()
      .in('id', attemptIds)

    const label = scope === 'exam' ? '시험별' : (exam_id ? '사용자+시험별' : '사용자별')

    return NextResponse.json({
      message: `${label} 응시 기록이 초기화되었습니다 (${attemptIds.length}건)`,
      scope,
      deleted_count: attemptIds.length,
    })
  } catch (error) {
    console.error('Reset attempts error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
