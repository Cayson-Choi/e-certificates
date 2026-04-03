'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import { createClient } from '@/lib/supabase/client'

interface HeaderUser {
  name: string
  isAdmin: boolean
}

export default function Header() {
  const router = useRouter()
  const [user, setUser] = useState<HeaderUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const fetchProfile = useCallback(async () => {
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        setUser(null)
        setLoading(false)
        return
      }

      // is_admin은 app_metadata에서 바로 확인 (DB 쿼리 불필요)
      const isAdmin = !!session.user.app_metadata?.is_admin

      // 프로필에서 이름만 가져오기
      const { data } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', session.user.id)
        .single()

      if (data) {
        setUser({ name: data.name, isAdmin })
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()

    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchProfile()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const handleLogout = async () => {
    setLoggingOut(true)
    setMobileOpen(false)
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setLoggingOut(false)
    router.push('/')
    router.refresh()
  }

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
              <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight leading-tight whitespace-nowrap">전기짱</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <DesktopUserNav user={user} loading={loading} loggingOut={loggingOut} onLogout={handleLogout} />
          </nav>

          {/* Mobile nav */}
          <MobileNav
            user={user}
            loading={loading}
            loggingOut={loggingOut}
            open={mobileOpen}
            onToggle={() => setMobileOpen(!mobileOpen)}
            onClose={() => setMobileOpen(false)}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </header>
  )
}

/* ── Desktop user navigation ── */

function DesktopUserNav({
  user,
  loading,
  loggingOut,
  onLogout,
}: {
  user: HeaderUser | null
  loading: boolean
  loggingOut: boolean
  onLogout: () => void
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    )
  }

  if (user) {
    return (
      <>
        <Link
          href="/my"
          className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          마이페이지
        </Link>
        {user.isAdmin && (
          <Link
            href="/admin"
            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            관리자
          </Link>
        )}
        <span className="text-sm text-gray-500 dark:text-gray-400 pl-2 border-l border-gray-200 dark:border-gray-700">
          {user.name}님
          {user.isAdmin && (
            <span className="ml-1.5 text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded">
              관리자
            </span>
          )}
        </span>
        <button
          onClick={onLogout}
          disabled={loggingOut}
          className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {loggingOut ? '로그아웃 중...' : '로그아웃'}
        </button>
      </>
    )
  }

  return (
    <Link
      href="/login"
      className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
    >
      로그인
    </Link>
  )
}

/* ── Mobile navigation ── */

function MobileNav({
  user,
  loading,
  loggingOut,
  open,
  onToggle,
  onClose,
  onLogout,
}: {
  user: HeaderUser | null
  loading: boolean
  loggingOut: boolean
  open: boolean
  onToggle: () => void
  onClose: () => void
  onLogout: () => void
}) {
  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <button
          onClick={onToggle}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="메뉴"
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Dropdown menu */}
      {open && (
        <div className="absolute top-16 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-lg z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
            {loading ? (
              <div className="px-3 py-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ) : user ? (
              <>
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 mb-1">
                  {user.name}님
                  {user.isAdmin && (
                    <span className="ml-1.5 text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded">
                      관리자
                    </span>
                  )}
                </div>
                <Link
                  href="/my"
                  onClick={onClose}
                  className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  마이페이지
                </Link>
                {user.isAdmin && (
                  <Link
                    href="/admin"
                    onClick={onClose}
                    className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    관리자
                  </Link>
                )}
                <button
                  onClick={onLogout}
                  disabled={loggingOut}
                  className="px-3 py-2.5 text-sm text-left text-red-600 dark:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  {loggingOut ? '로그아웃 중...' : '로그아웃'}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={onClose}
                className="px-3 py-2.5 text-sm text-blue-600 dark:text-blue-400 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
