import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// 비밀번호 변경
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { currentPassword, newPassword, confirmPassword } = await request.json()

    // 유효성 검사
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: '모든 필드를 입력해주세요' }, { status: 400 })
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: '새 비밀번호가 일치하지 않습니다' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 최소 6자 이상이어야 합니다' },
        { status: 400 }
      )
    }

    // 현재 비밀번호 확인 (재로그인 시도)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    })

    if (signInError) {
      return NextResponse.json(
        { error: '현재 비밀번호가 일치하지 않습니다' },
        { status: 401 }
      )
    }

    // 새 비밀번호로 변경
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json({ error: '비밀번호 변경 실패' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '비밀번호가 변경되었습니다',
    })
  } catch (error) {
    console.error('Password change error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
