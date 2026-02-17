'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function WrongAnswersPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | number>('all')

  useEffect(() => {
    loadWrongAnswers()
  }, [])

  const loadWrongAnswers = async () => {
    try {
      const res = await fetch('/api/my/wrong-answers')
      if (res.status === 401) {
        router.push('/login?redirect=/my/wrong-answers')
        return
      }

      if (!res.ok) {
        throw new Error('Failed to load wrong answers')
      }

      const data = await res.json()
      setData(data)
    } catch (err) {
      console.error('Failed to load wrong answers:', err)
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
          <Link href="/my" className="text-blue-600 hover:underline">
            마이페이지로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const filteredAnswers =
    filter === 'all'
      ? data.wrong_answers
      : data.wrong_answers.filter((a: any) => a.subject_id === filter)

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">❌ 오답노트</h1>
          <p className="text-gray-600">
            틀린 문제를 복습하고 약점을 보완하세요
          </p>
        </div>

        {/* 통계 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">📊 오답 통계</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">총 오답 문제</div>
              <div className="text-3xl font-bold text-red-600">
                {data.total_count}문제
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-2">과목별 오답</div>
              <div className="space-y-1">
                {data.subject_stats.map((stat: any) => (
                  <div key={stat.subject_id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{stat.subject_name}</span>
                    <span className="font-semibold text-red-600">
                      {stat.count}문제
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 과목 필터 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">과목 필터:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              전체 ({data.total_count})
            </button>
            {data.subject_stats.map((stat: any) => (
              <button
                key={stat.subject_id}
                onClick={() => setFilter(stat.subject_id)}
                className={`px-4 py-2 rounded ${
                  filter === stat.subject_id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {stat.subject_name} ({stat.count})
              </button>
            ))}
          </div>
        </div>

        {/* 오답 문제 목록 */}
        {filteredAnswers.length > 0 ? (
          <div className="space-y-6">
            {filteredAnswers.map((item: any, index: number) => (
              <div
                key={`${item.attempt_id}-${item.question_id}`}
                className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {item.exam_name}
                      </span>
                      <span className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded">
                        {item.subject_name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {item.question_code}
                      </span>
                      <span className="text-sm text-gray-400">
                        {new Date(item.attempt_date).toLocaleDateString('ko-KR')}
                      </span>
                    </div>

                    <div className="text-lg font-medium mb-4">
                      {item.question_text}
                    </div>

                    <div className="space-y-2 mb-4">
                      {[1, 2, 3, 4].map((choice) => {
                        const isCorrect = choice === item.correct_answer
                        const isSelected = choice === item.student_answer

                        return (
                          <div
                            key={choice}
                            className={`p-3 border-2 rounded-lg ${
                              isCorrect
                                ? 'border-green-500 bg-green-50'
                                : isSelected
                                ? 'border-red-500 bg-red-50'
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isCorrect && (
                                <span className="text-green-600 font-bold">✓</span>
                              )}
                              {isSelected && !isCorrect && (
                                <span className="text-red-600 font-bold">✗</span>
                              )}
                              <span>
                                {choice}. {item[`choice_${choice}`]}
                              </span>
                              {isCorrect && (
                                <span className="ml-auto text-sm font-semibold text-green-600">
                                  정답
                                </span>
                              )}
                              {isSelected && !isCorrect && (
                                <span className="ml-auto text-sm font-semibold text-red-600">
                                  선택한 답
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="font-semibold text-blue-900 mb-1">해설</div>
                      <div className="text-blue-800">{item.explanation}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-gray-500 text-lg mb-2">
              {filter === 'all' ? '오답이 없습니다! 🎉' : '이 과목에는 오답이 없습니다!'}
            </div>
            <div className="text-gray-400 text-sm">
              {filter === 'all'
                ? '모든 문제를 맞혔거나 아직 시험을 보지 않았습니다.'
                : '다른 과목을 선택해보세요.'}
            </div>
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="mt-8 flex gap-4">
          <Link
            href="/my"
            className="flex-1 px-6 py-3 bg-gray-600 text-white text-center rounded-lg hover:bg-gray-700"
          >
            마이페이지로
          </Link>
          <Link
            href="/"
            className="flex-1 px-6 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  )
}
