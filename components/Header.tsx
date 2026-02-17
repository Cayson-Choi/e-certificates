import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import LogoutButton from './LogoutButton'
import ThemeToggle from './ThemeToggle'

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
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
            전기 자격시험 CBT
          </Link>

          <nav className="flex items-center gap-4">
            <ThemeToggle />
            {user && profile ? (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {profile.name}님 ({profile.affiliation})
                  {profile.is_admin && (
                    <span className="ml-2 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded">
                      관리자
                    </span>
                  )}
                </span>
                <Link
                  href="/my"
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  마이페이지
                </Link>
                {profile.is_admin && (
                  <Link
                    href="/admin"
                    className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
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
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="text-sm bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 dark:hover:bg-blue-600"
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
