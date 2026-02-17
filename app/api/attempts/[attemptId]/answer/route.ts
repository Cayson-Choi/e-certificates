import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const supabase = await createClient()
    const { attemptId } = await params

    // 1. 로그인 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // 2. 요청 데이터
    const { question_id, selected } = await request.json()

    if (!question_id || selected === undefined) {
      return NextResponse.json(
        { error: 'question_id와 selected가 필요합니다' },
        { status: 400 }
      )
    }

    // 3. attempt 확인
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('user_id, status, expires_at')
      .eq('id', attemptId)
      .single()

    if (attemptError || !attempt) {
      return NextResponse.json({ error: '시험을 찾을 수 없습니다' }, { status: 404 })
    }

    // 본인의 시험인지 확인
    if (attempt.user_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }

    // IN_PROGRESS 상태인지 확인
    if (attempt.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: '진행 중인 시험이 아닙니다' }, { status: 400 })
    }

    // 만료 확인
    const now = new Date()
    const expiresAt = new Date(attempt.expires_at)
    if (now >= expiresAt) {
      return NextResponse.json({ error: '시험 시간이 만료되었습니다' }, { status: 400 })
    }

    // 4. 답안 저장 (upsert)
    const { error: saveError } = await supabase.from('attempt_items').upsert(
      {
        attempt_id: attemptId,
        question_id: question_id,
        selected: selected,
      },
      {
        onConflict: 'attempt_id,question_id',
      }
    )

    if (saveError) {
      console.error('Save answer error:', saveError)
      return NextResponse.json({ error: '답안 저장에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save answer error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
