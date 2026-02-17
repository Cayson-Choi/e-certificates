import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import LogoutButton from './LogoutButton'

export default async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('name, affiliation, is_admin')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-gray-900">
            전기 자격시험 CBT
          </Link>

          <nav className="flex items-center gap-4">
            {user && profile ? (
              <>
                <span className="text-sm text-gray-600">
                  {profile.name}님 ({profile.affiliation})
                  {profile.is_admin && (
                    <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                      관리자
                    </span>
                  )}
                </span>
                <Link
                  href="/my"
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  마이페이지
                </Link>
                {profile.is_admin && (
                  <Link
                    href="/admin"
                    className="text-sm text-gray-700 hover:text-gray-900"
                  >
                    관리자
                  </Link>
                )}
                <LogoutButton />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  회원가입
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
