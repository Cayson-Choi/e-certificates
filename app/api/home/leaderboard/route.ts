import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const examId = searchParams.get('exam_id')

    if (!examId) {
      return NextResponse.json({ error: 'exam_id가 필요합니다' }, { status: 400 })
    }

    // 현재 로그인한 사용자 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // 오늘 날짜 (KST)
    const now = new Date()
    const kstOffset = 9 * 60 // KST는 UTC+9
    const kstNow = new Date(now.getTime() + kstOffset * 60 * 1000)
    const todayKst = kstNow.toISOString().split('T')[0] // YYYY-MM-DD

    // 어제 날짜 (KST)
    const yesterdayKst = new Date(kstNow.getTime() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    // 1. 오늘 Top5 조회 (daily_best_scores - RLS: 누구나 조회 가능)
    const { data: todayTop5Raw, error: todayError } = await supabase
      .from('daily_best_scores')
      .select('user_id, best_score, best_submitted_at')
      .eq('kst_date', todayKst)
      .eq('exam_id', examId)
      .order('best_score', { ascending: false })
      .order('best_submitted_at', { ascending: true })
      .limit(5)

    if (todayError) {
      console.error('Today Top5 query error:', todayError)
    }

    // 2. 프로필 정보 일괄 조회 (profiles RLS는 본인만 허용이므로 admin 클라이언트 필요)
    const todayTop5 = []
    if (todayTop5Raw && todayTop5Raw.length > 0) {
      const userIds = todayTop5Raw.map((item) => item.user_id)
      const adminSupabase = createAdminClient()
      const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('id, name, affiliation')
        .in('id', userIds)

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])

      for (let i = 0; i < todayTop5Raw.length; i++) {
        const item = todayTop5Raw[i]
        const profile = profileMap.get(item.user_id)
        todayTop5.push({
          rank: i + 1,
          user_id: item.user_id,
          name: profile?.name || '알 수 없음',
          affiliation: profile?.affiliation || '',
          score: item.best_score,
          submitted_at: item.best_submitted_at,
        })
      }
    }

    // 3. 어제 Top5 조회 (daily_leaderboard_snapshots - RLS: 누구나 조회 가능)
    const { data: yesterdayTop5Raw, error: yesterdayError } = await supabase
      .from('daily_leaderboard_snapshots')
      .select('rank, user_id, user_name_display, score, submitted_at')
      .eq('kst_date', yesterdayKst)
      .eq('exam_id', examId)
      .order('rank')
      .limit(5)

    if (yesterdayError) {
      console.error('Yesterday Top5 query error:', yesterdayError)
    }

    const yesterdayTop5 = yesterdayTop5Raw?.map((item: any) => ({
      rank: item.rank,
      user_id: item.user_id,
      name: item.user_name_display,
      score: item.score,
      submitted_at: item.submitted_at,
    })) || []

    // 4. 오늘 Top5 각 사용자에게 NEW/▲▼ 계산
    const yesterdayUserIds = new Set(yesterdayTop5.map((u) => u.user_id))
    const yesterdayRankMap = new Map(yesterdayTop5.map((u) => [u.user_id, u.rank]))

    const todayTop5WithStatus = todayTop5.map((user) => {
      let status = null
      let rankChange = null

      if (!yesterdayUserIds.has(user.user_id)) {
        // 어제 Top5에 없었으면 NEW
        status = 'NEW'
      } else {
        // 어제 순위와 비교
        const yesterdayRank = yesterdayRankMap.get(user.user_id)
        if (yesterdayRank) {
          rankChange = yesterdayRank - user.rank // 양수면 상승, 음수면 하락

          if (rankChange > 0) {
            status = '▲' // 상승
          } else if (rankChange < 0) {
            status = '▼' // 하락
          } else {
            status = '=' // 유지
          }
        }
      }

      return {
        ...user,
        status,
        rank_change: rankChange,
      }
    })

    // 5. 로그인한 사용자의 오늘 순위 조회
    let myRank = null
    let myScore = null

    if (user) {
      // 오늘 내 점수
      const { data: myBest, error: myBestError } = await supabase
        .from('daily_best_scores')
        .select('best_score, best_submitted_at')
        .eq('kst_date', todayKst)
        .eq('exam_id', examId)
        .eq('user_id', user.id)
        .single()

      if (myBestError) {
        console.error('My best score query error:', myBestError)
      }

      if (myBest) {
        myScore = myBest.best_score

        // 내 순위 계산 (내 점수보다 높은 사람 수 + 1)
        const { count } = await supabase
          .from('daily_best_scores')
          .select('*', { count: 'exact', head: true })
          .eq('kst_date', todayKst)
          .eq('exam_id', examId)
          .or(
            `best_score.gt.${myScore},and(best_score.eq.${myScore},best_submitted_at.lt.${myBest.best_submitted_at})`
          )

        myRank = (count || 0) + 1
      }
    }

    return NextResponse.json({
      exam_id: parseInt(examId),
      today_top5: todayTop5WithStatus,
      yesterday_top5: yesterdayTop5,
      my_rank: myRank,
      my_score: myScore,
    })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
