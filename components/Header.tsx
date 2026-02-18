import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import LogoutButton from './LogoutButton'
import ThemeToggle from './ThemeToggle'
import MobileNav from './MobileNav'

export default async function Header() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user ?? null

  let profile: { name: string; affiliation: string | null; is_admin: boolean } | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('name, affiliation')
      .eq('id', user.id)
      .single()
    if (data) {
      profile = {
        ...data,
        is_admin: !!user.app_metadata?.is_admin,
      }
    }
  }

  const mobileUser = profile ? { name: profile.name, isAdmin: profile.is_admin } : null

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight leading-tight whitespace-nowrap">스마트 전기과</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">화성폴리텍대학</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            {user && profile ? (
              <>
                <Link
                  href="/my"
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  마이페이지
                </Link>
                {profile.is_admin && (
                  <Link
                    href="/admin"
                    className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    관리자
                  </Link>
                )}
                <ThemeToggle />
                <span className="text-sm text-gray-500 dark:text-gray-400 pl-2 border-l border-gray-200 dark:border-gray-700">
                  {profile.name}님
                  {profile.is_admin && (
                    <span className="ml-1.5 text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded">
                      관리자
                    </span>
                  )}
                </span>
                <LogoutButton />
              </>
            ) : (
              <>
                <ThemeToggle />
                <Link
                  href="/login"
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  회원가입
                </Link>
              </>
            )}
          </nav>

          {/* Mobile nav */}
          <MobileNav user={mobileUser} />
        </div>
      </div>
    </header>
  )
}
