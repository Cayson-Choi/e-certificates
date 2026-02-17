'use client'

import { useEffect, useState, useCallback, use, memo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import MathText from '@/components/MathText'
import ConfirmDialog from '@/components/ConfirmDialog'

// --- ExamTimer: isolated timer component so ticks don't re-render the question list ---
function ExamTimer({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
    return diff
  })

  useEffect(() => {
    const target = new Date(expiresAt).getTime()

    const update = () => {
      const diff = Math.max(0, Math.floor((target - Date.now()) / 1000))
      setTimeLeft(diff)
      if (diff === 0) onExpire()
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, onExpire])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div className="text-right">
      <div
        className={`text-2xl font-bold ${
          timeLeft < 300 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
        }`}
      >
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">남은 시간</div>
    </div>
  )
}

// --- QuestionCard: memoized so only the card whose answer changed re-renders ---
const QuestionCard = memo(function QuestionCard({
  question,
  index,
  selectedAnswer,
  onAnswer,
}: {
  question: any
  index: number
  selectedAnswer: number | undefined
  onAnswer: (questionId: number, choice: number) => void
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border dark:border-gray-700">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center font-bold text-blue-700 dark:text-blue-300">
          {index + 1}
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{question.subject_name}</div>
          <MathText
            text={question.question_text}
            className="text-lg font-medium mb-4 block dark:text-white"
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

          <div className="space-y-3">
            {[1, 2, 3, 4].map((choice) => (
              <label
                key={choice}
                className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedAnswer === choice
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${question.question_id}`}
                  checked={selectedAnswer === choice}
                  onChange={() => onAnswer(question.question_id, choice)}
                  className="mt-1"
                />
                <span className="flex-1 dark:text-gray-200">
                  {choice}.{' '}
                  <MathText text={question[`choice_${choice}`]} />
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})

// --- Main page component ---
export default function ExamAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  const router = useRouter()
  const { attemptId } = use(params)

  const [paper, setPaper] = useState<any>(null)
  const [answers, setAnswers] = useState<Map<number, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [timeExpired, setTimeExpired] = useState(false)

  // 확인 대화상자 상태
  const [confirmType, setConfirmType] = useState<
    null | 'quit' | 'submit-unanswered' | 'submit'
  >(null)

  useEffect(() => {
    loadPaper()
  }, [attemptId])

  const loadPaper = async () => {
    try {
      const res = await fetch(`/api/attempts/${attemptId}/paper`)
      if (!res.ok) {
        setError('시험지를 불러올 수 없습니다')
        setLoading(false)
        return
      }

      const data = await res.json()
      setPaper(data)

      // 기존 답안 로드
      const newAnswers = new Map<number, number>()
      data.questions.forEach((q: any) => {
        if (q.selected) {
          newAnswers.set(q.question_id, q.selected)
        }
      })
      setAnswers(newAnswers)

      setLoading(false)
    } catch (err) {
      setError('오류가 발생했습니다')
      setLoading(false)
    }
  }

  const handleAnswer = useCallback(async (questionId: number, choice: number) => {
    // UI 업데이트
    setAnswers((prev) => {
      const next = new Map(prev)
      next.set(questionId, choice)
      return next
    })

    // 서버에 저장
    try {
      await fetch(`/api/attempts/${attemptId}/answer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: questionId, selected: choice }),
      })
    } catch (err) {
      console.error('답안 저장 실패:', err)
    }
  }, [attemptId])

  const handleExpire = useCallback(() => {
    setTimeExpired(true)
  }, [])

  const handleSubmitClick = () => {
    const answeredCount = answers.size
    const totalCount = paper?.questions.length || 0

    if (answeredCount < totalCount) {
      setConfirmType('submit-unanswered')
    } else {
      setConfirmType('submit')
    }
  }

  const doSubmit = async () => {
    setConfirmType(null)
    setSubmitting(true)

    try {
      const res = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || '제출에 실패했습니다')
        setSubmitting(false)
        return
      }

      // 결과 페이지로 이동
      router.push(`/exam/result/${attemptId}`)
    } catch (err) {
      setError('오류가 발생했습니다')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg dark:text-white">시험지를 불러오는 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border dark:border-gray-700">
          <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const answeredCount = answers.size
  const totalCount = paper?.questions.length || 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 상단 고정 바 */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg font-bold dark:text-white">{paper.exam_name}</h1>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                답안: {answeredCount} / {totalCount}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ExamTimer expiresAt={paper.expires_at} onExpire={handleExpire} />
              <button
                onClick={() => setConfirmType('quit')}
                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                중단하고 나가기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 문제 */}
      <div className="max-w-5xl mx-auto px-4 py-8 pt-24">
        <div className="space-y-8">
          {paper.questions.map((question: any, index: number) => (
            <QuestionCard
              key={question.question_id}
              question={question}
              index={index}
              selectedAnswer={answers.get(question.question_id)}
              onAnswer={handleAnswer}
            />
          ))}
        </div>

        {/* 제출 버튼 */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="text-gray-600 dark:text-gray-400">
              {answeredCount === totalCount
                ? '모든 문제를 풀었습니다'
                : `${totalCount - answeredCount}문제가 남았습니다`}
            </div>
            <button
              onClick={handleSubmitClick}
              disabled={submitting}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? '제출 중...' : '시험 제출'}
            </button>
          </div>
        </div>
      </div>

      {/* 시간 만료 안내 */}
      <ConfirmDialog
        open={timeExpired}
        title="시험 시간 종료"
        message="시험 시간이 종료되었습니다."
        confirmText="확인"
        cancelText="확인"
        onConfirm={() => router.push('/')}
        onCancel={() => router.push('/')}
      />

      {/* 중단 확인 */}
      <ConfirmDialog
        open={confirmType === 'quit'}
        title="시험 중단"
        message="시험을 중단하시겠습니까?\n작성한 답안은 저장되지 않습니다."
        confirmText="중단하기"
        confirmColor="red"
        onConfirm={() => {
          setConfirmType(null)
          router.push('/')
        }}
        onCancel={() => setConfirmType(null)}
      />

      {/* 미답 문제 제출 확인 */}
      <ConfirmDialog
        open={confirmType === 'submit-unanswered'}
        title="미완료 문제 있음"
        message={`${totalCount - answeredCount}문제를 풀지 않았습니다.\n정말 제출하시겠습니까?`}
        confirmText="제출하기"
        confirmColor="green"
        onConfirm={() => setConfirmType('submit')}
        onCancel={() => setConfirmType(null)}
      />

      {/* 최종 제출 확인 */}
      <ConfirmDialog
        open={confirmType === 'submit'}
        title="시험 제출"
        message="시험을 제출하시겠습니까?\n제출 후에는 수정할 수 없습니다."
        confirmText="제출"
        confirmColor="green"
        onConfirm={doSubmit}
        onCancel={() => setConfirmType(null)}
      />
    </div>
  )
}
