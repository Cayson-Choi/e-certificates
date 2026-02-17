import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, password, name, affiliation, phone } = await request.json()

  const supabase = await createClient()

  // 1. 회원가입
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        affiliation,
        phone,
      },
    },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // 2. 프로필 생성
  if (authData.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      name,
      affiliation,
      phone,
      is_admin: false,
    })

    if (profileError) {
      return NextResponse.json(
        { error: '프로필 생성 실패' },
        { status: 400 }
      )
    }

    // 3. 오늘 날짜 통계 업데이트 (KST 기준)
    try {
      const adminSupabase = createAdminClient()
      const now = new Date()
      const nowKST = new Date(now.getTime() + 9 * 60 * 60 * 1000)
      const todayDateStr = nowKST.toISOString().split('T')[0]
      const userAffiliation = affiliation || '미지정'

      // 해당 날짜/소속의 기존 통계 조회
      const { data: existingStats } = await adminSupabase
        .from('daily_user_stats')
        .select('*')
        .eq('date', todayDateStr)
        .eq('affiliation', userAffiliation)
        .single()

      if (existingStats) {
        // 기존 통계가 있으면 UPDATE
        await adminSupabase
          .from('daily_user_stats')
          .update({
            signups_count: existingStats.signups_count + 1,
          })
          .eq('date', todayDateStr)
          .eq('affiliation', userAffiliation)
      } else {
        // 기존 통계가 없으면 INSERT
        await adminSupabase.from('daily_user_stats').insert({
          date: todayDateStr,
          affiliation: userAffiliation,
          signups_count: 1,
          deletions_count: 0,
        })
      }
    } catch (statsErr) {
      console.log('Stats update error (non-critical):', statsErr)
    }
  }

  return NextResponse.json({ success: true })
}
