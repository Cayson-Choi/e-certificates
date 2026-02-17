import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
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

    // URL에서 question_code 가져오기
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json({ error: '문제 코드를 입력해주세요' }, { status: 400 })
    }

    // 중복 체크
    const { data: existing } = await supabase
      .from('questions')
      .select('id')
      .eq('question_code', code)
      .single()

    return NextResponse.json({
      exists: !!existing,
      available: !existing,
    })
  } catch (error) {
    console.error('Code check error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
