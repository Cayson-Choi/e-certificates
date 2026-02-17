'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phone, setPhone] = useState('')

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
    let formatted = digits
    if (digits.length > 3 && digits.length <= 7) {
      formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`
    } else if (digits.length > 7) {
      formatted = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    }
    setPhone(formatted)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      name: formData.get('name') as string,
      affiliation: formData.get('affiliation') as string,
      phone: formData.get('phone') as string,
    }

    // 필수 항목 검증
    if (!data.name.trim() || !data.email.trim() || !data.password || !data.affiliation || !data.phone.trim()) {
      setError('모든 항목을 입력해주세요')
      setLoading(false)
      return
    }

    // 비밀번호 확인
    const passwordConfirm = formData.get('passwordConfirm') as string
    if (data.password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다')
      setLoading(false)
      return
    }

    // 전화번호 형식 검증
    const phoneRegex = /^010-\d{4}-\d{4}$/
    if (!phoneRegex.test(data.phone.trim())) {
      setError('전화번호는 010-xxxx-xxxx 형식으로 입력해주세요')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || '회원가입에 실패했습니다')
        return
      }

      // 회원가입 성공 → 바로 로그인 페이지로 이동
      router.push('/login?signup=success')
    } catch (err) {
      setError('오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border dark:border-gray-700">
      <h1 className="text-2xl font-bold text-center mb-6 dark:text-white">회원가입</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1 dark:text-gray-200">
            이름
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1 dark:text-gray-200">
            이메일
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1 dark:text-gray-200">
            비밀번호
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required
            minLength={6}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="passwordConfirm"
            className="block text-sm font-medium mb-1 dark:text-gray-200"
          >
            비밀번호 확인
          </label>
          <input
            type="password"
            id="passwordConfirm"
            name="passwordConfirm"
            required
            minLength={6}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="affiliation"
            className="block text-sm font-medium mb-1 dark:text-gray-200"
          >
            소속
          </label>
          <select
            id="affiliation"
            name="affiliation"
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">선택하세요</option>
            <option value="교수">교수</option>
            <option value="전기반">전기반</option>
            <option value="소방반">소방반</option>
            <option value="신중년">신중년</option>
          </select>
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1 dark:text-gray-200">
            전화번호
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            required
            placeholder="010-1234-5678"
            value={phone}
            onChange={handlePhoneChange}
            maxLength={13}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 dark:bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '처리 중...' : '가입하기'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
          로그인
        </Link>
      </p>
    </div>
  )
}
