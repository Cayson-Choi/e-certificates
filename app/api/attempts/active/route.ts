import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // 진행 중인 시험 조회
    const { data: activeAttempt } = await supabase
      .from('attempts')
      .select('id, exam_id, started_at, expires_at, exams(name)')
      .eq('user_id', user.id)
      .eq('status', 'IN_PROGRESS')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    if (!activeAttempt) {
      return NextResponse.json({ active: null })
    }

    const now = new Date()
    const expiresAt = new Date(activeAttempt.expires_at)

    // 이미 만료됐으면 EXPIRED 처리
    if (now >= expiresAt) {
      await supabase
        .from('attempts')
        .update({ status: 'EXPIRED' })
        .eq('id', activeAttempt.id)

      await supabase.from('attempt_items').delete().eq('attempt_id', activeAttempt.id)
      await supabase.from('subject_scores').delete().eq('attempt_id', activeAttempt.id)

      return NextResponse.json({ active: null })
    }

    const timeLeftSeconds = Math.floor((expiresAt.getTime() - now.getTime()) / 1000)

    return NextResponse.json({
      active: {
        attempt_id: activeAttempt.id,
        exam_id: activeAttempt.exam_id,
        exam_name: (activeAttempt.exams as any)?.name || '',
        expires_at: activeAttempt.expires_at,
        time_left_seconds: timeLeftSeconds,
      },
    })
  } catch (error) {
    console.error('Active attempt check error:', error)
    return NextResponse.json({ active: null })
  }
}
