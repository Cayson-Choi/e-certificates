import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// 프로필 조회
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, name, affiliation, phone, student_id, created_at')
      .eq('id', user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: '프로필 조회 실패' }, { status: 500 })
    }

    // email은 auth.users에서 가져오기
    return NextResponse.json({
      profile: {
        ...profile,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// 프로필 수정 (이름 제외)
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { phone } = await request.json()

    // 유효성 검사
    if (!phone) {
      return NextResponse.json({ error: '전화번호를 입력해주세요' }, { status: 400 })
    }

    // 프로필 업데이트 (이름과 이메일은 수정 불가)
    const updateData: any = { phone }

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Profile update error:', error)
      return NextResponse.json({ error: '프로필 수정 실패' }, { status: 500 })
    }

    return NextResponse.json({ profile: updatedProfile })
  } catch (error) {
    console.error('Profile PUT error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
