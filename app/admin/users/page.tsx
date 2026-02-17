'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [affiliationFilter, setAffiliationFilter] = useState<string>('all')
  const [adminFilter, setAdminFilter] = useState<string>('all')
  const [todayStats, setTodayStats] = useState<any[]>([])

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

  const toggleAdmin = async (userId: string, currentStatus: boolean) => {
    if (!confirm(`${currentStatus ? '관리자 권한을 해제' : '관리자 권한을 부여'}하시겠습니까?`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_admin: !currentStatus }),
      })

      if (res.ok) {
        alert('권한이 변경되었습니다')
        loadUsers()
      } else {
        const data = await res.json()
        alert(data.error || '권한 변경 실패')
      }
    } catch (err) {
      console.error('Toggle admin error:', err)
      alert('오류가 발생했습니다')
    }
  }

  const deleteUser = async (userId: string, userName: string) => {
    if (
      !confirm(
        `정말로 "${userName}" 회원을 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없으며, 해당 회원의 모든 데이터가 삭제됩니다.`
      )
    ) {
      return
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        alert('회원이 삭제되었습니다')
        loadUsers()
      } else {
        const data = await res.json()
        alert(data.error || '회원 삭제 실패')
      }
    } catch (err) {
      console.error('Delete user error:', err)
      alert('오류가 발생했습니다')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            👥 회원 관리
          </h1>
          <p className="text-gray-600">회원 목록 및 권한 관리</p>
        </div>

        {/* 소속별 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600 mb-1">전체 회원</div>
            <div className="text-2xl font-bold text-purple-600 flex items-center gap-2">
              <span>{users.length}명</span>
              <div className="flex items-center gap-1">
                {totalSignupsToday > 0 && (
                  <span className="text-red-600 text-lg">▲{totalSignupsToday}</span>
                )}
                {totalDeletionsToday > 0 && (
                  <span className="text-blue-600 text-lg">▼{totalDeletionsToday}</span>
                )}
              </div>
            </div>
          </div>
          {Object.entries(affiliationStats)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([affiliation, count]) => {
              const stats = getAffiliationStats(affiliation)
              return (
                <div key={affiliation} className="bg-white rounded-lg shadow-sm p-4">
                  <div className="text-sm text-gray-600 mb-1">{affiliation}</div>
                  <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
                    <span>{count}명</span>
                    <div className="flex items-center gap-1">
                      {stats.signups > 0 && (
                        <span className="text-red-600 text-lg">▲{stats.signups}</span>
                      )}
                      {stats.deletions > 0 && (
                        <span className="text-blue-600 text-lg">▼{stats.deletions}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 space-y-4">
          {/* 소속 필터 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold min-w-[80px]">소속 필터:</span>
            <button
              onClick={() => setAffiliationFilter('all')}
              className={`px-4 py-2 rounded ${
                affiliationFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              전체
            </button>
            {uniqueAffiliations.map((affiliation) => (
              <button
                key={affiliation}
                onClick={() => setAffiliationFilter(affiliation)}
                className={`px-4 py-2 rounded ${
                  affiliationFilter === affiliation
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {affiliation}
              </button>
            ))}
          </div>

          {/* 관리자 필터 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold min-w-[80px]">권한 필터:</span>
            <button
              onClick={() => setAdminFilter('all')}
              className={`px-4 py-2 rounded ${
                adminFilter === 'all'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setAdminFilter('admin')}
              className={`px-4 py-2 rounded ${
                adminFilter === 'admin'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              관리자만
            </button>
            <button
              onClick={() => setAdminFilter('user')}
              className={`px-4 py-2 rounded ${
                adminFilter === 'user'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              일반 회원만
            </button>
          </div>

          {/* 검색창 */}
          <div className="flex items-center gap-2">
            <span className="font-semibold min-w-[80px]">검색:</span>
            <div className="flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름, 이메일, 전화번호, 소속으로 검색..."
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                초기화
              </button>
            )}
          </div>
        </div>

        {/* 회원 목록 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">
              회원 목록 ({filteredUsers.length}명
              {filteredUsers.length !== users.length &&
                ` / 전체 ${users.length}명`}
              )
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    소속
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    이메일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    전화번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    응시 횟수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    관리자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    가입일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    권한 관리
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    계정 관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.affiliation}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.phone || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.attempt_count}회
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {user.is_admin ? (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                          관리자
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                          일반
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => toggleAdmin(user.id, user.is_admin)}
                        className={`px-3 py-1 rounded text-xs font-medium ${
                          user.is_admin
                            ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {user.is_admin ? '권한 해제' : '관리자 부여'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => deleteUser(user.id, user.name)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 하단 버튼 */}
        <Link
          href="/admin"
          className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          ← 관리자 페이지
        </Link>
      </div>
    </div>
  )
}
