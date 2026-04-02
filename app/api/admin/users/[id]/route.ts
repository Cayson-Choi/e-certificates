import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// 회원 관리자 권한 토글
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

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

    // 자기 자신의 권한은 변경 불가
    if (user.id === id) {
      return NextResponse.json(
        { error: '자신의 권한은 변경할 수 없습니다' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { is_admin } = body

    // 관리자 클라이언트로 권한 업데이트
    const adminSupabase = createAdminClient()

    // profiles + app_metadata 동시 업데이트
    const [profileResult, metadataResult] = await Promise.all([
      adminSupabase
        .from('profiles')
        .update({ is_admin })
        .eq('id', id)
        .select()
        .single(),
      adminSupabase.auth.admin.updateUserById(id, {
        app_metadata: { is_admin },
      }),
    ])

    if (profileResult.error) {
      console.error('User update error:', profileResult.error)
      return NextResponse.json({ error: '권한 변경 실패' }, { status: 500 })
    }

    if (metadataResult.error) {
      console.error('Metadata update error:', metadataResult.error)
    }

    return NextResponse.json({ user: profileResult.data })
  } catch (error) {
    console.error('Admin user PATCH error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// 회원 삭제
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

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

    // 자기 자신은 삭제 불가
    if (user.id === id) {
      return NextResponse.json(
        { error: '자신의 계정은 삭제할 수 없습니다' },
        { status: 400 }
      )
    }

    // 관리자 클라이언트로 사용자 삭제
    const adminSupabase = createAdminClient()

    // profiles 삭제 (CASCADE로 관련 데이터도 삭제됨)
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .delete()
      .eq('id', id)

    if (profileError) {
      console.error('Profile delete error:', profileError)
      return NextResponse.json({ error: 'Profile 삭제 실패' }, { status: 500 })
    }

    // auth.users에서도 삭제
    const { error: authError } = await adminSupabase.auth.admin.deleteUser(id)

    if (authError) {
      console.error('Auth user delete error:', authError)
      // auth 삭제 실패해도 계속 진행 (이미 profile은 삭제됨)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin user DELETE error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
