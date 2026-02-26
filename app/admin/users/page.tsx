'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ConfirmDialog from '@/components/ConfirmDialog'

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [affiliationFilter, setAffiliationFilter] = useState<string>('all')
  const [adminFilter, setAdminFilter] = useState<string>('all')
  const [todayStats, setTodayStats] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    loadUsers()
  }, [])

  // 필터링 및 검색
  useEffect(() => {
    let filtered = [...users]

    // 소속 필터
    if (affiliationFilter !== 'all') {
      filtered = filtered.filter((u) => u.affiliation === affiliationFilter)
    }

    // 관리자 필터
    if (adminFilter === 'admin') {
      filtered = filtered.filter((u) => u.is_admin)
    } else if (adminFilter === 'user') {
      filtered = filtered.filter((u) => !u.is_admin)
    }

    // 검색
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (u) =>
          u.name?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query) ||
          u.phone?.toLowerCase().includes(query) ||
          u.affiliation?.toLowerCase().includes(query)
      )
    }

    // 관리자를 맨 위로 정렬
    filtered.sort((a, b) => {
      if (a.is_admin && !b.is_admin) return -1
      if (!a.is_admin && b.is_admin) return 1
      return 0
    })

    setFilteredUsers(filtered)
    setCurrentPage(1)
    setSelectedIds(new Set())
  }, [users, searchQuery, affiliationFilter, adminFilter])

  // 소속별 통계 계산
  const affiliationStats = users.reduce((acc, user) => {
    const affiliation = user.affiliation || '미지정'
    acc[affiliation] = (acc[affiliation] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const uniqueAffiliations = Array.from(
    new Set(users.map((u) => u.affiliation).filter(Boolean))
  )

  // 오늘의 통계 합계 계산 (전체)
  const totalSignupsToday = todayStats.reduce((sum, stat) => sum + (stat.signups_count || 0), 0)
  const totalDeletionsToday = todayStats.reduce((sum, stat) => sum + (stat.deletions_count || 0), 0)

  // 소속별 오늘 통계 가져오기 함수
  const getAffiliationStats = (affiliation: string) => {
    const stat = todayStats.find((s) => s.affiliation === affiliation)
    return {
      signups: stat?.signups_count || 0,
      deletions: stat?.deletions_count || 0,
    }
  }

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.status === 401) {
        router.push('/login?redirect=/admin/users')
        return
      }
      if (res.status === 403) {
        router.push('/')
        return
      }

      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
        setTodayStats(data.todayStats || [])
      }
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }

  const [pendingToggle, setPendingToggle] = useState<{ userId: string; currentStatus: boolean } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ userId: string; userName: string } | null>(null)

  const toggleAdmin = (userId: string, currentStatus: boolean) => {
    setPendingToggle({ userId, currentStatus })
  }

  const confirmToggleAdmin = async () => {
    if (!pendingToggle) return
    const { userId, currentStatus } = pendingToggle
    setPendingToggle(null)

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_admin: !currentStatus }),
      })

      if (res.ok) {
        loadUsers()
      } else {
        const data = await res.json()
        console.error('Toggle admin failed:', data.error || '권한 변경 실패')
      }
    } catch (err) {
      console.error('Toggle admin error:', err)
    }
  }

  const deleteUser = (userId: string, userName: string) => {
    setPendingDelete({ userId, userName })
  }

  const confirmDeleteUser = async () => {
    if (!pendingDelete) return
    const { userId } = pendingDelete
    setPendingDelete(null)

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        loadUsers()
      } else {
        const data = await res.json()
        console.error('Delete user failed:', data.error || '회원 삭제 실패')
      }
    } catch (err) {
      console.error('Delete user error:', err)
    }
  }

  const toggleSelect = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const toggleSelectAll = (pageUserIds: string[]) => {
    const allSelected = pageUserIds.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        pageUserIds.forEach((id) => next.delete(id))
      } else {
        pageUserIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const confirmBulkDelete = async () => {
    setPendingBulkDelete(false)
    const ids = Array.from(selectedIds)
    for (const id of ids) {
      try {
        await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      } catch (err) {
        console.error('Bulk delete error:', err)
      }
    }
    setSelectedIds(new Set())
    loadUsers()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg dark:text-white">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            👥 회원 관리
          </h1>
          <p className="text-gray-600 dark:text-gray-400">회원 목록 및 권한 관리</p>
        </div>

        {/* 소속별 통계 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6 border dark:border-gray-700">
          <div className="flex items-center gap-3 flex-wrap">
            {/* 전체 */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">전체</span>
              <span className="text-sm font-bold text-purple-700 dark:text-purple-300">{users.length}</span>
              {totalSignupsToday > 0 && (
                <span className="text-xs font-medium text-red-500 dark:text-red-400">+{totalSignupsToday}</span>
              )}
              {totalDeletionsToday > 0 && (
                <span className="text-xs font-medium text-blue-500 dark:text-blue-400">-{totalDeletionsToday}</span>
              )}
            </div>

            <span className="text-gray-300 dark:text-gray-600">|</span>

            {/* 소속별 */}
            {Object.entries(affiliationStats)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([affiliation, count]) => {
                const stats = getAffiliationStats(affiliation)
                return (
                  <div key={affiliation} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{affiliation}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{count as number}</span>
                    {stats.signups > 0 && (
                      <span className="text-xs font-medium text-red-500 dark:text-red-400">+{stats.signups}</span>
                    )}
                    {stats.deletions > 0 && (
                      <span className="text-xs font-medium text-blue-500 dark:text-blue-400">-{stats.deletions}</span>
                    )}
                  </div>
                )
              })}
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6 border dark:border-gray-700">
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={affiliationFilter}
              onChange={(e) => setAffiliationFilter(e.target.value)}
              className="px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">전체 소속</option>
              {uniqueAffiliations.map((affiliation) => (
                <option key={affiliation} value={affiliation}>
                  {affiliation}
                </option>
              ))}
            </select>

            <select
              value={adminFilter}
              onChange={(e) => setAdminFilter(e.target.value)}
              className="px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">전체 권한</option>
              <option value="admin">관리자만</option>
              <option value="user">일반 회원만</option>
            </select>

            <div className="flex-1 min-w-[200px] max-w-md relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름, 이메일, 전화번호, 소속 검색..."
                className="w-full px-3 py-2 pr-8 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 회원 목록 */}
        {(() => {
          const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage))
          const safePage = Math.min(currentPage, totalPages)
          const startIndex = (safePage - 1) * itemsPerPage
          const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage)

          const renderPagination = () => {
            if (totalPages <= 1) return null

            const pages: (number | string)[] = []
            if (totalPages <= 7) {
              for (let i = 1; i <= totalPages; i++) pages.push(i)
            } else {
              pages.push(1)
              if (safePage > 3) pages.push('...')
              for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
                pages.push(i)
              }
              if (safePage < totalPages - 2) pages.push('...')
              pages.push(totalPages)
            }

            return (
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => setCurrentPage(safePage - 1)}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 rounded text-sm border dark:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
                >
                  ‹ 이전
                </button>
                {pages.map((p, i) =>
                  typeof p === 'string' ? (
                    <span key={`dot-${i}`} className="px-2 text-gray-400">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`px-3 py-1.5 rounded text-sm ${
                        p === safePage
                          ? 'bg-blue-600 dark:bg-blue-500 text-white'
                          : 'border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => setCurrentPage(safePage + 1)}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 rounded text-sm border dark:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
                >
                  다음 ›
                </button>
              </div>
            )
          }

          return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-8 border dark:border-gray-700">
              <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold dark:text-white">
                    회원 목록 ({filteredUsers.length}명
                    {filteredUsers.length !== users.length &&
                      ` / 전체 ${users.length}명`}
                    )
                  </h2>
                  {selectedIds.size > 0 && (
                    <button
                      onClick={() => setPendingBulkDelete(true)}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                      선택 삭제 ({selectedIds.size}명)
                    </button>
                  )}
                </div>
                {totalPages > 1 && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredUsers.length)}번째
                  </span>
                )}
              </div>

              {/* 상단 페이지네이션 */}
              {renderPagination() && <div className="px-6 pb-4">{renderPagination()}</div>}

              <div className="overflow-x-auto">
                <table className="w-full text-xs lg:text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-2 py-2 lg:py-3 text-center">
                        <input
                          type="checkbox"
                          checked={paginatedUsers.length > 0 && paginatedUsers.filter(u => !u.is_admin).every(u => selectedIds.has(u.id))}
                          onChange={() => toggleSelectAll(paginatedUsers.filter(u => !u.is_admin).map(u => u.id))}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                      </th>
                      <th className="px-2 lg:px-4 py-2 lg:py-3 font-medium text-gray-500 dark:text-gray-300 text-center mobile-vertical">이름</th>
                      <th className="px-2 lg:px-4 py-2 lg:py-3 font-medium text-gray-500 dark:text-gray-300 text-center mobile-vertical">소속</th>
                      <th className="px-2 lg:px-4 py-2 lg:py-3 font-medium text-gray-500 dark:text-gray-300 text-center mobile-vertical">이메일</th>
                      <th className="px-2 lg:px-4 py-2 lg:py-3 font-medium text-gray-500 dark:text-gray-300 text-center mobile-vertical">전화번호</th>
                      <th className="px-2 lg:px-4 py-2 lg:py-3 font-medium text-gray-500 dark:text-gray-300 text-center mobile-vertical">응시횟수</th>
                      <th className="px-2 lg:px-4 py-2 lg:py-3 font-medium text-gray-500 dark:text-gray-300 text-center mobile-vertical">구분</th>
                      <th className="px-2 lg:px-4 py-2 lg:py-3 font-medium text-gray-500 dark:text-gray-300 text-center mobile-vertical">가입일</th>
                      <th className="px-2 lg:px-4 py-2 lg:py-3 font-medium text-gray-500 dark:text-gray-300 text-center mobile-vertical">권한관리</th>
                      <th className="px-2 lg:px-4 py-2 lg:py-3 font-medium text-gray-500 dark:text-gray-300 text-center mobile-vertical">계정관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {paginatedUsers.map((user) => (
                      <tr key={user.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedIds.has(user.id) ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                        <td className="px-2 py-3 text-center">
                          {user.is_admin ? (
                            <span className="w-4 h-4 inline-block" />
                          ) : (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(user.id)}
                              onChange={() => toggleSelect(user.id)}
                              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 cursor-pointer"
                            />
                          )}
                        </td>
                        <td className="px-2 lg:px-4 py-3 text-gray-900 dark:text-gray-100 text-center font-medium mobile-vertical">
                          {user.name}
                        </td>
                        <td className="px-2 lg:px-4 py-3 text-gray-600 dark:text-gray-400 text-center mobile-vertical">
                          {user.affiliation}
                        </td>
                        <td className="px-2 lg:px-4 py-3 text-gray-900 dark:text-gray-100">
                          <span className="hidden lg:inline">{user.email}</span>
                          <span className="lg:hidden">
                            <div>{user.email.split('@')[0]}</div>
                            <div className="text-gray-500 dark:text-gray-400" style={{ fontSize: '10px' }}>@{user.email.split('@')[1]}</div>
                          </span>
                        </td>
                        <td className="px-2 lg:px-4 py-3 text-gray-600 dark:text-gray-400 text-center">
                          {user.phone ? (() => {
                            const parts = user.phone.replace(/[^0-9]/g, '')
                            if (parts.length === 11) {
                              return (
                                <>
                                  <span className="hidden lg:inline">{parts.slice(0, 3)}-{parts.slice(3, 7)}-{parts.slice(7)}</span>
                                  <span className="lg:hidden">
                                    <div>{parts.slice(0, 3)}</div>
                                    <div>-{parts.slice(3, 7)}</div>
                                    <div>-{parts.slice(7)}</div>
                                  </span>
                                </>
                              )
                            }
                            return user.phone
                          })() : '-'}
                        </td>
                        <td className="px-2 lg:px-4 py-3 text-gray-600 dark:text-gray-400 text-center">
                          {user.attempt_count}회
                        </td>
                        <td className="px-2 lg:px-4 py-3 text-center">
                          {user.is_admin ? (
                            <span className="inline-block bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 px-1.5 lg:px-2 py-1 rounded font-medium leading-tight mobile-vertical">
                              관리자
                            </span>
                          ) : (
                            <span className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1.5 lg:px-2 py-1 rounded font-medium leading-tight mobile-vertical">
                              일반
                            </span>
                          )}
                        </td>
                        <td className="px-2 lg:px-4 py-3 text-gray-600 dark:text-gray-400 text-center whitespace-nowrap">
                          {(() => {
                            const d = new Date(user.created_at)
                            return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
                          })()}
                        </td>
                        <td className="px-2 lg:px-4 py-3 text-center">
                          <button
                            onClick={() => toggleAdmin(user.id, user.is_admin)}
                            className={`px-1 lg:px-3 py-1.5 rounded font-medium leading-tight mobile-vertical ${
                              user.is_admin
                                ? 'bg-yellow-600 dark:bg-yellow-500 text-white hover:bg-yellow-700 dark:hover:bg-yellow-600'
                                : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                            }`}
                          >
                            {user.is_admin ? '권한해제' : '관리자부여'}
                          </button>
                        </td>
                        <td className="px-2 lg:px-4 py-3 text-center">
                          <button
                            onClick={() => deleteUser(user.id, user.name)}
                            className="px-1 lg:px-3 py-1.5 bg-red-600 dark:bg-red-500 text-white rounded font-medium hover:bg-red-700 dark:hover:bg-red-600 leading-tight mobile-vertical"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 하단 페이지네이션 */}
              {renderPagination() && <div className="px-6 py-4">{renderPagination()}</div>}
            </div>
          )
        })()}

        {/* 하단 버튼 */}
        <Link
          href="/admin"
          className="inline-block px-6 py-3 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600"
        >
          ← 관리자 페이지
        </Link>

        <ConfirmDialog
          open={!!pendingToggle}
          title="권한 변경"
          message={`${pendingToggle?.currentStatus ? '관리자 권한을 해제' : '관리자 권한을 부여'}하시겠습니까?`}
          confirmText="변경"
          confirmColor="blue"
          onConfirm={confirmToggleAdmin}
          onCancel={() => setPendingToggle(null)}
        />

        <ConfirmDialog
          open={!!pendingDelete}
          title="회원 삭제"
          message={`정말로 "${pendingDelete?.userName}" 회원을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 해당 회원의 모든 데이터가 삭제됩니다.`}
          confirmText="삭제"
          confirmColor="red"
          onConfirm={confirmDeleteUser}
          onCancel={() => setPendingDelete(null)}
        />

        <ConfirmDialog
          open={pendingBulkDelete}
          title="선택 회원 일괄 삭제"
          message={`선택한 ${selectedIds.size}명의 회원을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 해당 회원들의 모든 데이터가 삭제됩니다.`}
          confirmText="일괄 삭제"
          confirmColor="red"
          onConfirm={confirmBulkDelete}
          onCancel={() => setPendingBulkDelete(false)}
        />
      </div>
    </div>
  )
}
