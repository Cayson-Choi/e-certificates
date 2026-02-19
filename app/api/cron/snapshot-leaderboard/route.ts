import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Vercel Cron 인증 확인
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    // 어제 날짜 (KST)
    const now = new Date()
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const yesterdayKst = new Date(kstNow.getTime() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const examIds = [1, 2, 3]
    let totalInserted = 0

    for (const examId of examIds) {
      // 어제의 Top5 조회
      const { data: top5, error: selectError } = await supabase
        .from('daily_best_scores')
        .select('user_id, best_score, best_submitted_at')
        .eq('kst_date', yesterdayKst)
        .eq('exam_id', examId)
        .order('best_score', { ascending: false })
        .order('best_submitted_at', { ascending: true })
        .limit(3)

      if (selectError) {
        console.error(`Top5 query error for exam ${examId}:`, selectError)
        continue
      }

      if (!top5 || top5.length === 0) continue

      // 프로필 일괄 조회
      const userIds = top5.map((item) => item.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds)

      const profileMap = new Map(profiles?.map((p) => [p.id, p.name]) || [])

      // 기존 스냅샷 삭제 (중복 방지)
      await supabase
        .from('daily_leaderboard_snapshots')
        .delete()
        .eq('kst_date', yesterdayKst)
        .eq('exam_id', examId)

      // 스냅샷 삽입
      const rows = top5.map((item, index) => ({
        kst_date: yesterdayKst,
        exam_id: examId,
        rank: index + 1,
        user_id: item.user_id,
        user_name_display: profileMap.get(item.user_id) || '알 수 없음',
        score: item.best_score,
        submitted_at: item.best_submitted_at,
      }))

      const { error: insertError } = await supabase
        .from('daily_leaderboard_snapshots')
        .insert(rows)

      if (insertError) {
        console.error(`Snapshot insert error for exam ${examId}:`, insertError)
      } else {
        totalInserted += rows.length
      }
    }

    return NextResponse.json({
      success: true,
      date: yesterdayKst,
      inserted: totalInserted,
    })
  } catch (error) {
    console.error('Snapshot cron error:', error)
    return NextResponse.json({ error: '스냅샷 생성 실패' }, { status: 500 })
  }
}
