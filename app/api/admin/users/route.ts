import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// 회원 목록 조회
export async function GET() {
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

    // 관리자 클라이언트로 모든 회원 조회
    const adminSupabase = createAdminClient()

    const { data: profiles, error } = await adminSupabase
      .from('profiles')
      .select('id, name, affiliation, phone, is_admin, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Users query error:', error)
      return NextResponse.json({ error: '회원 조회 실패' }, { status: 500 })
    }

    // auth.users에서 email 가져오기
    const usersWithEmail = await Promise.all(
      (profiles || []).map(async (p) => {
        const { data: authUser } = await adminSupabase.auth.admin.getUserById(p.id)
        return {
          ...p,
          email: authUser?.user?.email || '',
        }
      })
    )

    // 각 회원의 응시 통계
    const usersWithStats = await Promise.all(
      usersWithEmail.map(async (u) => {
        const { count } = await supabase
          .from('attempts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', u.id)
          .eq('status', 'SUBMITTED')

        return {
          ...u,
          attempt_count: count || 0,
        }
      })
    )

    return NextResponse.json({
      users: usersWithStats,
    })
  } catch (error) {
    console.error('Admin users GET error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
