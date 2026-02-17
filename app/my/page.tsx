'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function MyPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | number>('all')

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/my/history')
      if (res.status === 401) {
        router.push('/login?redirect=/my')
        return
      }

      if (!res.ok) {
        throw new Error('Failed to load history')
      }

      const data = await res.json()
      setData(data)
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-red-600 mb-4">데이터를 불러올 수 없습니다</div>
          <Link href="/" className="text-blue-600 hover:underline">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const filteredAttempts =
    filter === 'all'
      ? data.attempts
      : data.attempts.filter((a: any) => a.exam_id === filter)

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">마이페이지</h1>
          <p className="text-gray-600">내 응시 기록과 통계를 확인하세요</p>
        </div>

        {/* 전체 통계 */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">총 응시</div>
            <div className="text-3xl font-bold text-blue-600">
              {data.stats.total_attempts}회
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">평균 점수</div>
            <div className="text-3xl font-bold text-green-600">
              {data.stats.avg_score}점
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">최고 점수</div>
            <div className="text-3xl font-bold text-purple-600">
              {data.stats.max_score}점
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">합격 횟수</div>
            <div className="text-3xl font-bold text-orange-600">
              {data.stats.pass_count}회
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">합격률</div>
            <div className="text-3xl font-bold text-red-600">
              {data.stats.pass_rate}%
            </div>
          </div>
        </div>

        {/* 시험별 통계 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">📊 시험별 성적</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {data.exam_stats.map((exam: any) => (
              <div key={exam.exam_id} className="border rounded-lg p-4">
                <div className="font-semibold text-lg mb-2">{exam.exam_name}</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">응시 횟수:</span>
                    <span className="font-medium">{exam.attempt_count}회</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">평균 점수:</span>
                    <span className="font-medium text-green-600">
                      {exam.avg_score}점
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">최고 점수:</span>
                    <span className="font-medium text-purple-600">
                      {exam.max_score}점
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 응시 기록 필터 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">📝 응시 기록</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                전체
              </button>
              {data.exam_stats.map((exam: any) => (
                <button
                  key={exam.exam_id}
                  onClick={() => setFilter(exam.exam_id)}
                  className={`px-4 py-2 rounded ${
                    filter === exam.exam_id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {exam.exam_name}
                </button>
              ))}
            </div>
          </div>

          {/* 응시 기록 목록 */}
          {filteredAttempts.length > 0 ? (
            <div className="space-y-4">
              {filteredAttempts.map((attempt: any) => (
                <div
                  key={attempt.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold text-lg">
                        {attempt.exam_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(attempt.submitted_at).toLocaleString('ko-KR')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-3xl font-bold ${
                          attempt.total_score >= 60
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {attempt.total_score}점
                      </div>
                      <div
                        className={`text-sm font-semibold ${
                          attempt.total_score >= 60
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {attempt.total_score >= 60 ? '합격' : '불합격'}
                      </div>
                    </div>
                  </div>

                  {/* 과목별 점수 */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-3">
                    {attempt.subject_scores.map((subject: any) => (
                      <div
                        key={subject.subject_id}
                        className="bg-gray-50 rounded p-2"
                      >
                        <div className="text-xs text-gray-600 mb-1">
                          {subject.subjects?.name}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-blue-600">
                            {subject.subject_score}점
                          </span>
                          <span className="text-xs text-gray-500">
                            {subject.subject_correct}/{subject.subject_questions}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 버튼 */}
                  <div className="flex gap-2">
                    <Link
                      href={`/exam/result/${attempt.id}`}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded hover:bg-blue-700"
                    >
                      상세 결과 보기
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              응시 기록이 없습니다
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-4">
          <Link
            href="/"
            className="flex-1 px-6 py-3 bg-gray-600 text-white text-center rounded-lg hover:bg-gray-700"
          >
            홈으로
          </Link>
          <Link
            href="/my/wrong-answers"
            className="flex-1 px-6 py-3 bg-red-600 text-white text-center rounded-lg hover:bg-red-700"
          >
            ❌ 오답노트 보기
          </Link>
        </div>
      </div>
    </div>
  )
}
