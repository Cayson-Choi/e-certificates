'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ThemeToggle from './ThemeToggle'

interface MobileNavProps {
  user: { name: string; isAdmin: boolean } | null
}

export default function MobileNav({ user }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    await new Promise(resolve => setTimeout(resolve, 0))
    await fetch('/api/auth/logout', { method: 'POST' })
    setOpen(false)
    router.push('/')
    router.refresh()
  }

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <button
          onClick={() => setOpen(!open)}
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
            {user ? (
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
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  마이페이지
                </Link>
                {user.isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    관리자
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="px-3 py-2.5 text-sm text-left text-red-600 dark:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  {loggingOut ? '로그아웃 중...' : '로그아웃'}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 text-sm text-blue-600 dark:text-blue-400 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
