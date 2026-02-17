import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// 회원 탈퇴
export async function POST() {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // 1. 본인 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const userId = user.id

    // 2. daily_best_scores에서 오늘 레코드 삭제 (오늘 랭킹에서 즉시 제외)
    const now = new Date()
    const kstOffset = 9 * 60 // KST는 UTC+9
    const kstDate = new Date(now.getTime() + kstOffset * 60 * 1000)
    const todayKST = kstDate.toISOString().split('T')[0] // YYYY-MM-DD

    const { error: deleteBestScoresError } = await supabase
      .from('daily_best_scores')
      .delete()
      .eq('user_id', userId)
      .eq('kst_date', todayKST)

    if (deleteBestScoresError) {
      console.error('Delete daily_best_scores error:', deleteBestScoresError)
    }

    // 3. daily_leaderboard_snapshots 익명 처리 (어제 스냅샷)
    const { error: anonymizeSnapshotsError } = await supabase
      .from('daily_leaderboard_snapshots')
      .update({
        user_id: null,
        user_name_display: '(탈퇴한 사용자)',
      })
      .eq('user_id', userId)

    if (anonymizeSnapshotsError) {
      console.error('Anonymize snapshots error:', anonymizeSnapshotsError)
    }

    // 4. 개인 응시 데이터 삭제 (개인정보 보호)
    // 먼저 사용자의 모든 attempt ID 조회
    const { data: userAttempts } = await supabase
      .from('attempts')
      .select('id')
      .eq('user_id', userId)

    const attemptIds = userAttempts?.map((a) => a.id) || []

    if (attemptIds.length > 0) {
      // attempt_items 삭제
      const { error: deleteItemsError } = await supabase
        .from('attempt_items')
        .delete()
        .in('attempt_id', attemptIds)

      if (deleteItemsError) {
        console.error('Delete attempt_items error:', deleteItemsError)
      }

      // subject_scores 삭제
      const { error: deleteScoresError } = await supabase
        .from('subject_scores')
        .delete()
        .in('attempt_id', attemptIds)

      if (deleteScoresError) {
        console.error('Delete subject_scores error:', deleteScoresError)
      }

      // attempt_questions 삭제
      const { error: deleteQuestionsError } = await supabase
        .from('attempt_questions')
        .delete()
        .in('attempt_id', attemptIds)

      if (deleteQuestionsError) {
        console.error('Delete attempt_questions error:', deleteQuestionsError)
      }

      // attempts 삭제
      const { error: deleteAttemptsError } = await supabase
        .from('attempts')
        .delete()
        .eq('user_id', userId)

      if (deleteAttemptsError) {
        console.error('Delete attempts error:', deleteAttemptsError)
      }
    }

    // 5. profiles 삭제
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (deleteProfileError) {
      console.error('Delete profile error:', deleteProfileError)
      return NextResponse.json({ error: '프로필 삭제 실패' }, { status: 500 })
    }

    // 6. auth.users 삭제 (관리자 클라이언트 사용)
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId)

    if (deleteUserError) {
      console.error('Delete auth user error:', deleteUserError)
      return NextResponse.json({ error: '사용자 삭제 실패' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '회원 탈퇴가 완료되었습니다',
    })
  } catch (error) {
    console.error('Withdraw error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
