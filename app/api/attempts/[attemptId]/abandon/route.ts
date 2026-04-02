import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const supabase = await createClient()
    const { attemptId } = await params

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const id = parseInt(attemptId)

    // 본인의 IN_PROGRESS 시험만 삭제 가능
    const { data: attempt } = await supabase
      .from('attempts')
      .select('id, user_id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('status', 'IN_PROGRESS')
      .single()

    if (!attempt) {
      return NextResponse.json({ error: '삭제할 시험이 없습니다' }, { status: 404 })
    }

    // 관련 데이터 모두 삭제
    await supabase.from('attempt_items').delete().eq('attempt_id', id)
    await supabase.from('subject_scores').delete().eq('attempt_id', id)
    await supabase.from('attempt_questions').delete().eq('attempt_id', id)
    await supabase.from('attempts').delete().eq('id', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Abandon attempt error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
