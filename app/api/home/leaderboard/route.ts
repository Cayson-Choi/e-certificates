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
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user ?? null

    // 오늘/어제 날짜 (KST)
    const now = new Date()
    const kstOffset = 9 * 60
    const kstNow = new Date(now.getTime() + kstOffset * 60 * 1000)
    const todayKst = kstNow.toISOString().split('T')[0]
    const yesterdayKst = new Date(kstNow.getTime() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    // ★ 오늘 Top5 + 어제 Top5 동시 조회 (병렬)
    const [todayResult, yesterdayResult] = await Promise.all([
      supabase
        .from('daily_best_scores')
        .select('user_id, best_score, best_submitted_at')
        .eq('kst_date', todayKst)
        .eq('exam_id', examId)
        .order('best_score', { ascending: false })
        .order('best_submitted_at', { ascending: true })
        .limit(3),
      supabase
        .from('daily_leaderboard_snapshots')
        .select('rank, user_id, user_name_display, score, submitted_at')
        .eq('kst_date', yesterdayKst)
        .eq('exam_id', examId)
        .order('rank')
        .limit(3),
    ])

    const todayTop5Raw = todayResult.data
    const yesterdayTop5Raw = yesterdayResult.data

    // ★ 프로필 조회 + 어제 fallback + 내 점수 병렬
    const adminSupabase = createAdminClient()
    const todayUserIds = todayTop5Raw?.map((item) => item.user_id) || []

    const needYesterdayFallback = !yesterdayTop5Raw || yesterdayTop5Raw.length === 0

    const parallelQueries: any[] = [
      // 오늘 Top5 프로필
      todayUserIds.length > 0
        ? adminSupabase.from('profiles').select('id, name, affiliation').in('id', todayUserIds)
        : Promise.resolve({ data: [] }),
    ]

    if (needYesterdayFallback) {
      parallelQueries.push(
        supabase
          .from('daily_best_scores')
          .select('user_id, best_score, best_submitted_at')
          .eq('kst_date', yesterdayKst)
          .eq('exam_id', examId)
          .order('best_score', { ascending: false })
          .order('best_submitted_at', { ascending: true })
          .limit(3)
      )
    }

    if (user) {
      parallelQueries.push(
        supabase
          .from('daily_best_scores')
          .select('best_score, best_submitted_at')
          .eq('kst_date', todayKst)
          .eq('exam_id', examId)
          .eq('user_id', user.id)
          .single()
      )
    }

    const parallelResults = await Promise.all(parallelQueries)

    // 오늘 Top5 조립
    const profileMap = new Map<string, any>(parallelResults[0].data?.map((p: any) => [p.id, p]) || [])
    const todayTop5 = (todayTop5Raw || []).map((item, i) => {
      const profile = profileMap.get(item.user_id)
      return {
        rank: i + 1,
        user_id: item.user_id,
        name: profile?.name || '알 수 없음',
        affiliation: profile?.affiliation || '',
        score: item.best_score,
        submitted_at: item.best_submitted_at,
      }
    })

    // 어제 Top5 조립
    let yesterdayTop5: Array<{ rank: number; user_id: string; name: string; score: number; submitted_at: string }> = []

    if (!needYesterdayFallback && yesterdayTop5Raw) {
      yesterdayTop5 = yesterdayTop5Raw.map((item: any) => ({
        rank: item.rank,
        user_id: item.user_id,
        name: item.user_name_display,
        score: item.score,
        submitted_at: item.submitted_at,
      }))
    } else if (needYesterdayFallback) {
      const fallbackRaw = parallelResults[1].data
      if (fallbackRaw && fallbackRaw.length > 0) {
        const fallbackUserIds = fallbackRaw.map((item: any) => item.user_id)
        const { data: fallbackProfiles } = await adminSupabase
          .from('profiles')
          .select('id, name')
          .in('id', fallbackUserIds)
        const fallbackProfileMap = new Map(fallbackProfiles?.map((p: any) => [p.id, p]) || [])

        yesterdayTop5 = fallbackRaw.map((item: any, i: number) => ({
          rank: i + 1,
          user_id: item.user_id,
          name: fallbackProfileMap.get(item.user_id)?.name || '알 수 없음',
          score: item.best_score,
          submitted_at: item.best_submitted_at,
        }))
      }
    }

    // NEW/▲▼ 계산
    const yesterdayUserIds = new Set(yesterdayTop5.map((u) => u.user_id))
    const yesterdayRankMap = new Map(yesterdayTop5.map((u) => [u.user_id, u.rank]))

    const todayTop5WithStatus = todayTop5.map((u) => {
      if (!yesterdayUserIds.has(u.user_id)) {
        return { ...u, status: 'NEW', rank_change: null }
      }
      const yesterdayRank = yesterdayRankMap.get(u.user_id)
      if (!yesterdayRank) return { ...u, status: null, rank_change: null }
      const rankChange = yesterdayRank - u.rank
      return {
        ...u,
        status: rankChange > 0 ? '▲' : rankChange < 0 ? '▼' : '=',
        rank_change: rankChange,
      }
    })

    // 내 순위
    let myRank = null
    let myScore = null

    if (user) {
      const myResultIndex = needYesterdayFallback ? 2 : 1
      const myBestResult = parallelResults[myResultIndex]
      const myBest = myBestResult?.data

      if (myBest && !myBestResult.error) {
        myScore = myBest.best_score
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

    const response = NextResponse.json({
      exam_id: parseInt(examId),
      today_top5: todayTop5WithStatus,
      yesterday_top5: yesterdayTop5,
      my_rank: myRank,
      my_score: myScore,
    })

    return response
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
