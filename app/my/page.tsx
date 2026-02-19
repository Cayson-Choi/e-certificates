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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg dark:text-white">로딩 중...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border dark:border-gray-700">
          <div className="text-red-600 dark:text-red-400 mb-4">데이터를 불러올 수 없습니다</div>
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">마이페이지</h1>
          <p className="text-gray-600 dark:text-gray-400">내 응시 기록과 통계를 확인하세요</p>
        </div>

        {/* 전체 통계 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6 border dark:border-gray-700">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">총 응시</span>
              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{data.stats.total_attempts}회</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">평균</span>
              <span className="text-sm font-bold text-green-700 dark:text-green-300">{data.stats.avg_score}점</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">최고</span>
              <span className="text-sm font-bold text-purple-700 dark:text-purple-300">{data.stats.max_score}점</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">합격</span>
              <span className="text-sm font-bold text-orange-700 dark:text-orange-300">{data.stats.pass_count}회</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">합격률</span>
              <span className="text-sm font-bold text-red-700 dark:text-red-300">{data.stats.pass_rate}%</span>
            </div>
          </div>
        </div>

        {/* 시험별 통계 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8 border dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 dark:text-white">📊 시험별 성적</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {data.exam_stats.map((exam: any) => (
              <div key={exam.exam_id} className="border dark:border-gray-600 rounded-lg p-4">
                <div className="font-semibold text-lg mb-2 dark:text-white">{exam.exam_name}</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">응시 횟수:</span>
                    <span className="font-medium dark:text-gray-200">{exam.attempt_count}회</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">평균 점수:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {exam.avg_score}점
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">최고 점수:</span>
                    <span className="font-medium text-purple-600 dark:text-purple-400">
                      {exam.max_score}점
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 응시 기록 필터 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8 border dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold dark:text-white">📝 응시 기록</h2>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded text-sm ${
                  filter === 'all'
                    ? 'bg-blue-600 dark:bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                전체
              </button>
              {data.exam_stats.map((exam: any) => (
                <button
                  key={exam.exam_id}
                  onClick={() => setFilter(exam.exam_id)}
                  className={`px-4 py-2 rounded text-sm ${
                    filter === exam.exam_id
                      ? 'bg-blue-600 dark:bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
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
                  className="border dark:border-gray-600 rounded-lg p-4 hover:shadow-md dark:hover:shadow-gray-700 transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold text-lg dark:text-white">
                        {attempt.exam_name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(attempt.submitted_at).toLocaleString('ko-KR')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-3xl font-bold ${
                          attempt.grading_status === 'PENDING_MANUAL'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : attempt.total_score >= 60
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {attempt.grading_status === 'PENDING_MANUAL' ? `${attempt.total_score}점` : `${attempt.total_score}점`}
                      </div>
                      <div
                        className={`text-sm font-semibold ${
                          attempt.grading_status === 'PENDING_MANUAL'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : attempt.total_score >= 60
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {attempt.grading_status === 'PENDING_MANUAL' ? '채점 대기' : attempt.total_score >= 60 ? '합격' : '불합격'}
                      </div>
                    </div>
                  </div>

                  {/* 과목별 점수 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-3">
                    {attempt.subject_scores.map((subject: any) => (
                      <div
                        key={subject.subject_id}
                        className="bg-gray-50 dark:bg-gray-700 rounded p-2"
                      >
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {subject.subjects?.name}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {subject.subject_score}점
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
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
                      className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white text-center rounded hover:bg-blue-700 dark:hover:bg-blue-600"
                    >
                      상세 결과 보기
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              응시 기록이 없습니다
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-2">
          <Link
            href="/"
            className="flex-1 px-3 py-2.5 bg-gray-600 dark:bg-gray-700 text-white text-center rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 text-sm"
          >
            홈으로
          </Link>
          <Link
            href="/my/profile"
            className="flex-1 px-3 py-2.5 bg-blue-600 dark:bg-blue-500 text-white text-center rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 text-sm"
          >
            프로필 수정
          </Link>
          <Link
            href="/my/wrong-answers"
            className="flex-1 px-3 py-2.5 bg-red-600 dark:bg-red-500 text-white text-center rounded-lg hover:bg-red-700 dark:hover:bg-red-600 text-sm"
          >
            오답노트
          </Link>
        </div>
      </div>
    </div>
  )
}
