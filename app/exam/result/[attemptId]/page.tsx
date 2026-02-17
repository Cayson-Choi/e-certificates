'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import MathText from '@/components/MathText'

export default function ExamResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  const router = useRouter()
  const { attemptId } = use(params)

  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showExplanations, setShowExplanations] = useState(false)

  useEffect(() => {
    loadResult()
  }, [attemptId])

  const loadResult = async () => {
    try {
      const res = await fetch(`/api/attempts/${attemptId}/result`)
      if (!res.ok) {
        setError('결과를 불러올 수 없습니다')
        setLoading(false)
        return
      }

      const data = await res.json()
      setResult(data)
      setLoading(false)
    } catch (err) {
      setError('오류가 발생했습니다')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">결과를 불러오는 중...</div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-red-600 mb-4">{error}</div>
          <Link href="/" className="text-blue-600 hover:underline">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const passed = result.total_score >= 60

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* 총점 */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8 text-center">
          <h1 className="text-2xl font-bold mb-4">{result.exam_name} 결과</h1>

          <div className="mb-6">
            <div
              className={`text-6xl font-bold mb-2 ${
                passed ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {result.total_score}점
            </div>
            <div className="text-gray-600">
              {result.total_correct} / {result.total_questions} 문제 정답
            </div>
          </div>

          <div
            className={`inline-block px-6 py-3 rounded-full text-xl font-bold ${
              passed
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {passed ? '✓ 합격' : '✗ 불합격'}
          </div>

          <div className="mt-6 text-sm text-gray-600">
            제출 시간: {new Date(result.submitted_at).toLocaleString('ko-KR')}
          </div>
        </div>

        {/* 과목별 점수 */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-xl font-bold mb-6">📊 과목별 성적</h2>
          <div className="space-y-4">
            {result.subject_scores.map((subject: any) => (
              <div key={subject.subject_id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">{subject.subjects?.name}</span>
                  <span className="text-lg font-bold text-blue-600">
                    {subject.subject_score}점
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-blue-600 h-4 rounded-full transition-all"
                      style={{ width: `${subject.subject_score}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">
                    {subject.subject_correct} / {subject.subject_questions}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 정답/오답 토글 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">📝 문제별 해설</h2>
            <button
              onClick={() => setShowExplanations(!showExplanations)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {showExplanations ? '해설 숨기기' : '해설 보기'}
            </button>
          </div>
        </div>

        {/* 문제 목록 */}
        {showExplanations && (
          <div className="space-y-6">
            {result.questions.map((question: any, index: number) => (
              <div
                key={question.question_id}
                className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                  question.is_correct ? 'border-green-500' : 'border-red-500'
                }`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                      question.is_correct
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-gray-600">
                        {question.subject_name}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          question.is_correct ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {question.is_correct ? '정답' : '오답'}
                      </span>
                    </div>

                    <MathText
                      text={question.question_text}
                      className="text-lg font-medium mb-4 block"
                    />

                    {question.image_url && (
                      <div className="mb-4 relative w-full max-w-lg">
                        <Image
                          src={question.image_url}
                          alt="문제 이미지"
                          width={600}
                          height={400}
                          className="w-full h-auto rounded"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="space-y-2 mb-4">
                      {[1, 2, 3, 4].map((choice) => {
                        const isCorrect = choice === question.correct_answer
                        const isSelected = choice === question.student_answer

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
                                {choice}.{' '}
                                <MathText text={question[`choice_${choice}`]} />
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="font-semibold text-blue-900 mb-1">해설</div>
                      <MathText
                        text={question.explanation}
                        className="text-blue-800"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="mt-8 flex gap-4">
          <Link
            href="/"
            className="flex-1 px-6 py-3 bg-gray-600 text-white text-center rounded-lg hover:bg-gray-700"
          >
            홈으로
          </Link>
          <Link
            href="/my"
            className="flex-1 px-6 py-3 bg-purple-600 text-white text-center rounded-lg hover:bg-purple-700"
          >
            마이페이지
          </Link>
          <Link
            href={`/exam/${result.exam_id}`}
            className="flex-1 px-6 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700"
          >
            다시 응시
          </Link>
        </div>
      </div>
    </div>
  )
}
