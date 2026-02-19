'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import MathText from '@/components/MathText'
import { printExamPaperFromResult } from '@/components/ExamPaperPrint'

export default function AdminAttemptDetailPage({
  params,
}: {
  params: Promise<{ examId: string; attemptId: string }>
}) {
  const router = useRouter()
  const { examId, attemptId } = use(params)

  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [printing, setPrinting] = useState(false)
  const [gradeInputs, setGradeInputs] = useState<Record<number, string>>({})
  const [grading, setGrading] = useState(false)

  useEffect(() => {
    loadResult()
  }, [examId, attemptId])

  const loadResult = async () => {
    try {
      const res = await fetch(
        `/api/admin/official-exams/${examId}/attempts/${attemptId}`
      )
      if (res.status === 403) {
        router.push('/')
        return
      }
      if (!res.ok) {
        setError('시험지를 불러올 수 없습니다')
        setLoading(false)
        return
      }

      const data = await res.json()
      setResult(data)
      setLoading(false)
    } catch {
      setError('오류가 발생했습니다')
      setLoading(false)
    }
  }

  const handleGradeSubmit = async () => {
    if (!result) return

    const subjectiveQuestions = result.questions.filter(
      (q: any) => q.question_type !== 'CHOICE' && q.grading_status !== 'AUTO'
    )

    const grades = subjectiveQuestions.map((q: any) => ({
      question_id: q.question_id,
      awarded_points: parseFloat(gradeInputs[q.question_id] ?? '0') || 0,
    }))

    if (grades.length === 0) return

    setGrading(true)
    try {
      const res = await fetch(
        `/api/admin/official-exams/${examId}/attempts/${attemptId}/grade`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grades }),
        }
      )

      if (res.ok) {
        const data = await res.json()
        if (data.all_graded) {
          alert(`채점 완료! 총점: ${data.total_score}점`)
        } else {
          alert(`채점 저장됨 (미채점: ${data.pending_count}개)`)
        }
        loadResult()
      } else {
        const data = await res.json()
        alert(data.error || '채점 실패')
      }
    } catch {
      alert('오류가 발생했습니다')
    } finally {
      setGrading(false)
    }
  }

  const handlePrint = () => {
    if (!result) return
    setPrinting(true)
    try {
      printExamPaperFromResult(result)
    } catch (err) {
      console.error('출력 실패:', err)
    } finally {
      setPrinting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg dark:text-white">로딩 중...</div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border dark:border-gray-700">
          <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
          <Link
            href={`/admin/official-exams/${examId}`}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const passed = result.total_score >= 60

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* 학생 정보 헤더 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8 border dark:border-gray-700">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold dark:text-white mb-2">
                {result.exam_name} - {result.student.name}
              </h1>
              <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                {result.student.student_id && (
                  <span>학번: {result.student.student_id}</span>
                )}
                {result.student.affiliation && (
                  <span>소속: {result.student.affiliation}</span>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/admin/official-exams/${examId}`}
                className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 text-sm"
              >
                결과 목록
              </Link>
              <button
                onClick={handlePrint}
                disabled={printing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                {printing ? '준비 중...' : '출력'}
              </button>
            </div>
          </div>

          {/* 점수 */}
          <div className="flex items-center gap-6">
            <div
              className={`text-4xl font-bold ${
                passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {result.total_score}점
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              {result.total_score} / {result.questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0)}점
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm font-bold ${
                passed
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
              }`}
            >
              {passed ? '합격' : '불합격'}
            </div>
            {result.violation_count > 0 && (
              <div className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded-full text-sm font-semibold">
                이탈 {result.violation_count}회
              </div>
            )}
            {result.grading_status === 'PENDING_MANUAL' && (
              <div className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded-full text-sm font-semibold">
                주관식 채점 대기
              </div>
            )}
          </div>

          {result.grading_status === 'PENDING_MANUAL' && (
            <div className="mt-3 text-sm text-yellow-600 dark:text-yellow-400">
              주관식 문항이 포함되어 있습니다. 아래에서 수동 채점 후 총점이 재계산됩니다.
            </div>
          )}

          <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            제출 시간: {new Date(result.submitted_at).toLocaleString('ko-KR')}
          </div>
        </div>

        {/* 과목별 점수 */}
        {result.subject_scores?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8 border dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 dark:text-white">과목별 성적</h2>
            <div className="space-y-3">
              {result.subject_scores.map((subject: any) => (
                <div key={subject.subject_id} className="border dark:border-gray-600 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold dark:text-white text-sm">
                      {subject.subjects?.name}
                    </span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {subject.subject_score}점 ({subject.subject_correct}/{subject.subject_questions})
                    </span>
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full"
                      style={{ width: `${subject.subject_score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 수동 채점 버튼 */}
        {result.questions.some((q: any) => q.question_type !== 'CHOICE' && q.grading_status !== 'AUTO') && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 border dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold dark:text-white">주관식 채점</h2>
              <button
                onClick={handleGradeSubmit}
                disabled={grading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {grading ? '채점 중...' : '채점 완료'}
              </button>
            </div>
          </div>
        )}

        {/* 문제별 상세 */}
        <div className="space-y-6">
          {result.questions.map((question: any, index: number) => {
            const questionType = question.question_type || 'CHOICE'
            const isSubjective = questionType !== 'CHOICE'
            const borderColor = isSubjective
              ? question.grading_status === 'GRADED'
                ? question.is_correct ? 'border-l-green-500' : 'border-l-red-500'
                : 'border-l-yellow-500'
              : question.is_correct ? 'border-l-green-500' : 'border-l-red-500'
            const badgeBg = isSubjective
              ? question.grading_status === 'GRADED'
                ? question.is_correct
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
              : question.is_correct
                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'

            return (
              <div
                key={question.question_id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 border dark:border-gray-700 ${borderColor}`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${badgeBg}`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {question.subject_name}
                      </span>
                      {isSubjective && (
                        <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-medium">
                          {questionType === 'SHORT_ANSWER' ? '단답형' : '서술형'}
                        </span>
                      )}
                      {isSubjective ? (
                        question.grading_status === 'GRADED' ? (
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                            {question.awarded_points}/{question.points}점
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                            미채점
                          </span>
                        )
                      ) : (
                        <>
                          <span
                            className={`text-xs font-semibold ${
                              question.is_correct
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {question.is_correct ? '정답' : '오답'}
                          </span>
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                            {question.awarded_points ?? (question.is_correct ? question.points : 0)}/{question.points}점
                          </span>
                        </>
                      )}
                    </div>

                    <MathText
                      text={question.question_text}
                      className="text-base font-medium mb-3 block dark:text-white"
                    />

                    {question.image_url && (
                      <div className="mb-3 relative w-full max-w-lg">
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

                    {/* 객관식 보기 */}
                    {!isSubjective && (
                      <div className="space-y-2 mb-3">
                        {[1, 2, 3, 4].map((choice) => {
                          const isCorrect = choice === question.correct_answer
                          const isSelected = choice === question.student_answer

                          return (
                            <div
                              key={choice}
                              className={`p-2.5 border-2 rounded-lg text-sm ${
                                isCorrect
                                  ? 'border-green-500 bg-green-50 dark:bg-green-900/30 dark:border-green-400'
                                  : isSelected
                                  ? 'border-red-500 bg-red-50 dark:bg-red-900/30 dark:border-red-400'
                                  : 'border-gray-200 dark:border-gray-600'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isCorrect && (
                                  <span className="text-green-600 dark:text-green-400 font-bold">O</span>
                                )}
                                {isSelected && !isCorrect && (
                                  <span className="text-red-600 dark:text-red-400 font-bold">X</span>
                                )}
                                <span className="dark:text-gray-200">
                                  {choice}.{' '}
                                  <MathText text={question[`choice_${choice}`]} />
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* 주관식 답안 + 채점 */}
                    {isSubjective && (
                      <div className="space-y-3 mb-3">
                        {/* 학생 답안 */}
                        <div className="p-3 border-2 border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                          <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">학생 답안</div>
                          <div className="text-sm dark:text-gray-200 whitespace-pre-wrap">
                            {question.student_answer_text || '(미작성)'}
                          </div>
                        </div>

                        {/* 참고 정답 */}
                        {question.answer_text && (
                          <div className="p-3 border-2 border-green-300 dark:border-green-600 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <div className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">참고 정답</div>
                            <div className="text-sm dark:text-gray-200 whitespace-pre-wrap">
                              {question.answer_text}
                            </div>
                          </div>
                        )}

                        {/* 배점 입력 */}
                        <div className="flex items-center gap-3 p-3 border-2 border-yellow-300 dark:border-yellow-600 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                          <label className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                            점수:
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={question.points}
                            step="any"
                            value={gradeInputs[question.question_id] ?? (question.awarded_points ?? '')}
                            onChange={(e) =>
                              setGradeInputs((prev) => ({
                                ...prev,
                                [question.question_id]: e.target.value,
                              }))
                            }
                            className="w-20 px-2 py-1 border dark:border-gray-600 rounded text-sm text-center dark:bg-gray-700 dark:text-white"
                          />
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            / {question.points}점
                          </span>
                        </div>

                        {/* AI 채점 이유 */}
                        {question.ai_feedback && (
                          <div className="p-3 border-2 border-orange-300 dark:border-orange-600 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                            <div className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-1">AI 채점 이유</div>
                            <div className="text-sm dark:text-gray-200 whitespace-pre-wrap">
                              {question.ai_feedback}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {question.explanation && (
                      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 text-sm">
                        <div className="font-semibold text-blue-900 dark:text-blue-300 mb-1">해설</div>
                        <MathText
                          text={question.explanation}
                          className="text-blue-800 dark:text-blue-200"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
