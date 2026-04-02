'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [formData, setFormData] = useState({
    phone: '',
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/account/profile')
      if (res.status === 401) {
        router.push('/login?redirect=/my/profile')
        return
      }

      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile)
        setFormData({
          phone: data.profile?.phone || '',
        })
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveSuccess(false)

    try {
      // 1. 프로필 정보 수정
      const profileRes = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!profileRes.ok) {
        const data = await profileRes.json()
        alert(data.error || '프로필 수정 실패')
        return
      }

      // 성공 피드백 (UI 블로킹 없음)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      console.error('Save error:', err)
      alert('오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
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
      <div className="max-w-2xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">👤 프로필 수정</h1>
          <p className="text-gray-600 dark:text-gray-400">전화번호를 수정할 수 있습니다</p>
        </div>

        {/* 프로필 수정 폼 (통합) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8 border dark:border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이름 (수정 불가) */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">이름</label>
              <input
                type="text"
                value={profile?.name || ''}
                disabled
                className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">이름은 수정할 수 없습니다</p>
            </div>

            {/* 이메일 (수정 불가) */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">이메일</label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full px-3 py-2 border dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">이메일은 수정할 수 없습니다</p>
            </div>

            {/* 전화번호 (수정 가능) */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">전화번호 *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-3 py-2 border dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="010-1234-5678"
                required
              />
            </div>

            {/* 버튼 */}
            <div className="flex gap-4 pt-4">
              <Link
                href="/my"
                className="flex-1 px-6 py-3 bg-gray-600 dark:bg-gray-700 text-white text-center rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600"
              >
                취소
              </Link>
              <button
                type="submit"
                disabled={saving}
                className={`flex-1 px-6 py-3 text-white rounded-lg ${
                  saveSuccess
                    ? 'bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600'
                    : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-blue-400 dark:disabled:bg-blue-600'
                }`}
              >
                {saving ? '저장 중...' : saveSuccess ? '✓ 저장 완료' : '저장'}
              </button>
            </div>
          </form>
        </div>

        {/* 회원 탈퇴 링크 */}
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">회원 탈퇴</h3>
          <p className="text-sm text-red-800 dark:text-red-300 mb-3">
            탈퇴 시 모든 개인정보와 응시 기록이 삭제됩니다.
          </p>
          <Link
            href="/my/withdraw"
            className="inline-block px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 text-sm"
          >
            회원 탈퇴하기
          </Link>
        </div>
      </div>
    </div>
  )
}
