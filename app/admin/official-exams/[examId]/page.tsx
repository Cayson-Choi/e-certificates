'use client'

import { useEffect, useState, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import QuestionSplitEditor from '@/components/QuestionSplitEditor'

// 브라우저 인쇄 기반 시험지 출력 (한글 완벽 지원)
function printExamPaper(data: any) {
  const w = window.open('', '_blank')
  if (!w) {
    alert('팝업이 차단되었습니다. 팝업을 허용해주세요.')
    return
  }

  const questionsHtml = data.questions.map((q: any, idx: number) => {
    const questionType = q.question_type || 'CHOICE'
    const isSubjective = questionType !== 'CHOICE'
    const pointsLabel = q.points && q.points > 1 ? ` (${q.points}점)` : ''
    const typeLabel = isSubjective ? ` <span style="color:#7c3aed; font-size:12px;">[${questionType === 'SHORT_ANSWER' ? '단답형' : '서술형'}]</span>` : ''

    if (isSubjective) {
      const gradingText = q.grading_status === 'GRADED'
        ? `<span style="color:#2563eb; font-weight:600;">${q.awarded_points}/${q.points}점</span>`
        : `<span style="color:#ca8a04; font-weight:600;">채점 대기</span>`
      return `
        <div style="margin-bottom:16px; page-break-inside:avoid;">
          <div style="font-weight:600; margin-bottom:6px;">
            ${idx + 1}. ${escapeHtml(q.question_text)}${pointsLabel}${typeLabel}
          </div>
          ${q.image_url ? `<img src="${escapeHtml(q.image_url)}" style="max-width:300px; max-height:200px; margin:4px 0 8px 20px;" />` : ''}
          <div style="margin-left:20px; padding:8px; border:1px solid #bfdbfe; border-radius:6px; background:#eff6ff;">
            <div style="font-size:12px; font-weight:600; color:#1d4ed8; margin-bottom:4px;">학생 답안:</div>
            <div style="white-space:pre-wrap;">${escapeHtml(q.student_answer_text || '(미작성)')}</div>
          </div>
          <div style="font-size:12px; color:#666; margin-top:4px; margin-left:20px;">
            ${gradingText}
          </div>
        </div>`
    }

    const choices = [q.choice_1, q.choice_2, q.choice_3, q.choice_4]
    return `
      <div style="margin-bottom:16px; page-break-inside:avoid;">
        <div style="font-weight:600; margin-bottom:6px;">
          ${idx + 1}. ${escapeHtml(q.question_text)}${pointsLabel}
        </div>
        ${q.image_url ? `<img src="${escapeHtml(q.image_url)}" style="max-width:300px; max-height:200px; margin:4px 0 8px 20px;" />` : ''}
        <div style="margin-left:20px;">
          ${choices.map((c: string, ci: number) => {
            const num = ci + 1
            const isStudent = q.student_answer === num
            const isCorrect = q.correct_answer === num
            let style = ''
            if (isStudent && isCorrect) style = 'color:#16a34a; font-weight:700;'
            else if (isStudent && !isCorrect) style = 'color:#dc2626; font-weight:700; text-decoration:line-through;'
            else if (isCorrect) style = 'color:#16a34a; font-weight:600;'
            const marker = isStudent ? (isCorrect ? ' [O]' : ' [X]') : (isCorrect ? ' [정답]' : '')
            return `<div style="margin:2px 0; ${style}">${num}. ${escapeHtml(c)}${marker}</div>`
          }).join('')}
        </div>
        <div style="font-size:12px; color:#666; margin-top:4px; margin-left:20px;">
          내 답: ${q.student_answer || '미응답'} / 정답: ${q.correct_answer} /
          <span style="color:${q.is_correct ? '#16a34a' : '#dc2626'}; font-weight:600;">${q.is_correct ? '정답' : '오답'}</span>
        </div>
      </div>`
  }).join('')

  w.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>시험지 - ${escapeHtml(data.student.name)}</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif; font-size: 13px; line-height: 1.6; color: #111; }
  .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { font-size: 20px; margin: 0 0 8px; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .info-table td { padding: 6px 12px; border: 1px solid #ccc; font-size: 13px; }
  .info-table td:first-child { background: #f5f5f5; font-weight: 600; width: 80px; }
  .score-box { text-align: center; padding: 12px; background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 8px; margin-bottom: 16px; }
  .score-box .score { font-size: 28px; font-weight: 700; color: ${data.total_score >= 60 ? '#16a34a' : '#dc2626'}; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>
<div class="header">
  <h1>${escapeHtml(data.exam_name)}</h1>
  <div style="font-size:12px; color:#666;">시험 결과지</div>
</div>
<table class="info-table">
  <tr><td>이름</td><td>${escapeHtml(data.student.name)}</td><td>학번</td><td>${escapeHtml(data.student.student_id || '-')}</td></tr>
  <tr><td>소속</td><td>${escapeHtml(data.student.affiliation || '-')}</td><td>시험 날짜</td><td>${new Date(data.started_at).toLocaleDateString('ko-KR')}</td></tr>
</table>
<div class="score-box">
  <div>총점</div>
  <div class="score">${data.total_score}점</div>
  <div style="font-size:13px; color:#666;">${data.total_score} / ${data.questions.reduce((s: number, q: any) => s + (q.points || 1), 0)}점</div>
</div>
<h2 style="font-size:16px; border-bottom:1px solid #ccc; padding-bottom:6px;">문제 및 답안</h2>
${questionsHtml}
<script>window.onload=function(){window.print();};window.onafterprint=function(){window.close();};</script>
</body></html>`)
  w.document.close()
}

function escapeHtml(text: string): string {
  if (!text) return ''
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// 전체 결과 요약 인쇄
function printResultsSummary(examName: string, results: any[]) {
  const w = window.open('', '_blank')
  if (!w) { alert('팝업이 차단되었습니다.'); return }

  const gradedOnly = results.filter((r: any) => r.grading_status !== 'PENDING_MANUAL')
  const pendingOnly = results.filter((r: any) => r.grading_status === 'PENDING_MANUAL')
  const avgScore = gradedOnly.length > 0
    ? Math.round(gradedOnly.reduce((sum: number, r: any) => sum + r.total_score, 0) / gradedOnly.length)
    : 0
  const passCount = gradedOnly.filter((r: any) => r.total_score >= 60).length
  const failCount = gradedOnly.filter((r: any) => r.total_score < 60).length

  const rows = results.map((r: any, idx: number) => {
    const isPending = r.grading_status === 'PENDING_MANUAL'
    const scoreColor = isPending ? '#ca8a04' : r.total_score >= 60 ? '#16a34a' : '#dc2626'
    const scoreText = isPending ? `${r.total_score}점 (대기)` : `${r.total_score}점`
    return `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(r.student_id || '-')}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.affiliation || '-')}</td>
      <td style="font-weight:700; color:${scoreColor};">${scoreText}</td>
      <td>${r.total_correct}/${r.total_questions}</td>
      <td>${r.violation_count > 0 ? r.violation_count + '회' : '0'}</td>
      <td>${r.started_at ? new Date(r.started_at).toLocaleDateString('ko-KR') : new Date(r.submitted_at).toLocaleString('ko-KR')}</td>
    </tr>`
  }).join('')

  w.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>전체 결과 - ${escapeHtml(examName)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; font-size: 12px; color: #111; }
  h1 { text-align: center; font-size: 18px; }
  .stats { display: flex; justify-content: center; gap: 24px; margin: 12px 0; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { padding: 6px 8px; border: 1px solid #ccc; text-align: center; }
  th { background: #f5f5f5; font-weight: 600; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>
<h1>${escapeHtml(examName)} - 전체 결과</h1>
<div class="stats">
  <span>응시자: ${results.length}명</span>
  <span>평균: ${avgScore}점</span>
  <span>합격: ${passCount}명</span>
  <span>불합격: ${failCount}명</span>
  ${pendingOnly.length > 0 ? `<span>채점 대기: ${pendingOnly.length}명</span>` : ''}
</div>
<table>
  <thead><tr><th>순위</th><th>학번</th><th>이름</th><th>소속</th><th>점수</th><th>정답</th><th>이탈</th><th>시험 날짜</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<script>window.onload=function(){window.print();};window.onafterprint=function(){window.close();};</script>
</body></html>`)
  w.document.close()
}

export default function OfficialExamDetailPage({
  params,
}: {
  params: Promise<{ examId: string }>
}) {
  const router = useRouter()
  const { examId } = use(params)

  const [activeTab, setActiveTab] = useState<'questions' | 'results'>('questions')

  // 공통 상태
  const [exam, setExam] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 결과 탭 상태
  const [results, setResults] = useState<any[]>([])
  const [printingAttemptId, setPrintingAttemptId] = useState<number | null>(null)

  // 문제 관리 탭 상태
  const [questions, setQuestions] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [questionsLoaded, setQuestionsLoaded] = useState(false)
  const [filterSubjectId, setFilterSubjectId] = useState<number | null>(null)
  const [searchText, setSearchText] = useState('')
  const [editorQuestion, setEditorQuestion] = useState<any | undefined>(undefined)
  const [showEditor, setShowEditor] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // AI 채점 상태
  const [gradingMode, setGradingMode] = useState<'manual' | 'ai'>('manual')
  const [aiGrading, setAiGrading] = useState(false)
  const [aiProgress, setAiProgress] = useState<{ current: number; total: number; currentName: string } | null>(null)
  const [aiResult, setAiResult] = useState<{ totalGraded: number; studentsGraded: number; totalFailed: number } | null>(null)

  // 시험 설정 수정 상태
  const [editingSettings, setEditingSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState({ password: '', duration_minutes: 60 })
  const [savingSettings, setSavingSettings] = useState(false)

  // AI 채점 중 페이지 이탈 경고
  useEffect(() => {
    if (!aiGrading) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [aiGrading])

  // 시험 정보 + 결과 동시 로드
  useEffect(() => {
    loadAll()
  }, [examId])

  // 탭 전환 시 문제 로드
  useEffect(() => {
    if (activeTab === 'questions' && !questionsLoaded) {
      loadQuestions()
    }
  }, [activeTab])

  const loadAll = async () => {
    try {
      // 시험 정보 (목록 API) + 결과 동시 로드
      const [listRes, resultsRes] = await Promise.all([
        fetch('/api/admin/official-exams'),
        fetch(`/api/admin/official-exams/${examId}/results`),
      ])

      if (listRes.status === 403) {
        router.push('/')
        return
      }

      // 시험 정보
      if (listRes.ok) {
        const allExams = await listRes.json()
        const found = allExams.find((e: any) => e.id === parseInt(examId))
        if (!found) {
          setError('시험을 찾을 수 없습니다')
          setLoading(false)
          return
        }
        setExam(found)
      } else {
        setError('시험 정보를 불러올 수 없습니다')
        setLoading(false)
        return
      }

      // 결과
      if (resultsRes.ok) {
        const data = await resultsRes.json()
        setResults(data.results || [])
      }

      setLoading(false)

      // 문제 탭이 기본이므로 문제도 로드
      loadQuestions()
    } catch {
      setError('오류가 발생했습니다')
      setLoading(false)
    }
  }

  const loadResults = async () => {
    try {
      const res = await fetch(`/api/admin/official-exams/${examId}/results`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results || [])
      }
    } catch {
      console.error('결과 로드 실패')
    }
  }

  const loadQuestions = async () => {
    try {
      const [questionsRes, subjectsRes] = await Promise.all([
        fetch(`/api/admin/questions?exam_id=${examId}`),
        fetch(`/api/exams/${examId}/subjects`),
      ])

      if (questionsRes.ok) {
        const data = await questionsRes.json()
        setQuestions(data.questions || [])
      }
      if (subjectsRes.ok) {
        const data = await subjectsRes.json()
        setSubjects(data || [])
      }
      setQuestionsLoaded(true)
    } catch {
      console.error('문제 로드 실패')
    }
  }

  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm('이 문제를 삭제하시겠습니까?')) return

    setDeletingId(questionId)
    try {
      const res = await fetch(`/api/admin/questions/${questionId}`, { method: 'DELETE' })
      if (res.ok) {
        setQuestions((prev) => prev.filter((q) => q.id !== questionId))
      } else {
        const data = await res.json()
        alert(data.error || '삭제 실패')
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다')
    } finally {
      setDeletingId(null)
    }
  }

  const handlePrintExamPaper = async (attemptId: number) => {
    setPrintingAttemptId(attemptId)
    try {
      const res = await fetch(`/api/admin/official-exams/${examId}/attempts/${attemptId}`)
      if (!res.ok) {
        alert('시험지 데이터를 불러올 수 없습니다')
        return
      }
      const data = await res.json()
      printExamPaper(data)
    } catch {
      alert('오류가 발생했습니다')
    } finally {
      setPrintingAttemptId(null)
    }
  }

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      const res = await fetch('/api/admin/official-exams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: parseInt(examId),
          password: settingsForm.password,
          duration_minutes: settingsForm.duration_minutes,
        }),
      })
      if (res.ok) {
        setExam((prev: any) => ({
          ...prev,
          password: settingsForm.password,
          duration_minutes: settingsForm.duration_minutes,
        }))
        setEditingSettings(false)
      } else {
        const data = await res.json()
        alert(data.error || '저장 실패')
      }
    } catch {
      alert('오류가 발생했습니다')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleAiGrade = async () => {
    const pendingResults = results.filter((r) => r.grading_status === 'PENDING_MANUAL')
    if (pendingResults.length === 0) {
      alert('채점 대기 중인 시험이 없습니다')
      return
    }
    if (!confirm(`AI 자동 채점을 시작하시겠습니까?\n대상: ${pendingResults.length}명\n\n* AI 채점은 참고용이며, 이후 수동으로 수정할 수 있습니다.`)) {
      return
    }

    setAiGrading(true)
    setAiResult(null)
    setAiProgress(null)

    let totalGraded = 0
    let totalFailed = 0
    let studentsGraded = 0

    for (let i = 0; i < pendingResults.length; i++) {
      const r = pendingResults[i]
      setAiProgress({ current: i + 1, total: pendingResults.length, currentName: r.name || '' })

      try {
        const res = await fetch(`/api/admin/official-exams/${examId}/ai-grade?attempt_id=${r.attempt_id}`, {
          method: 'POST',
        })
        const data = await res.json()
        if (res.ok && data.success) {
          totalGraded += data.totalGraded
          totalFailed += data.totalFailed
          studentsGraded += data.studentsGraded
        } else {
          totalFailed++
          console.error(`AI grade failed for attempt ${r.attempt_id}:`, data.error)
        }
      } catch {
        totalFailed++
        console.error(`AI grade error for attempt ${r.attempt_id}`)
      }
    }

    setAiResult({ totalGraded, studentsGraded, totalFailed })
    setAiProgress(null)
    setAiGrading(false)
    loadResults()
  }

  const handleEditorClose = () => {
    setShowEditor(false)
    setEditorQuestion(undefined)
  }

  const handleEditorSuccess = () => {
    setShowEditor(false)
    setEditorQuestion(undefined)
    loadQuestions()
  }

  // 필터링된 문제 목록
  const filteredQuestions = questions.filter((q) => {
    if (filterSubjectId && q.subject_id !== filterSubjectId) return false
    if (searchText) {
      const s = searchText.toLowerCase()
      return (
        q.question_text?.toLowerCase().includes(s) ||
        q.question_code?.toLowerCase().includes(s)
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg dark:text-white">로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border dark:border-gray-700">
          <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
          <Link href="/admin/official-exams" className="text-blue-600 dark:text-blue-400 hover:underline">
            돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const pendingResults = results.filter((r) => r.grading_status === 'PENDING_MANUAL')
  const gradedResults = results.filter((r) => r.grading_status !== 'PENDING_MANUAL')
  const avgScore = gradedResults.length > 0
    ? Math.round(gradedResults.reduce((sum, r) => sum + r.total_score, 0) / gradedResults.length)
    : 0
  const passCount = gradedResults.filter((r) => r.total_score >= 60).length
  const failCount = gradedResults.filter((r) => r.total_score < 60).length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {exam?.name}
              </h1>
              <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-1 rounded-full font-semibold">
                공식 시험
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
              <span>시험 시간: {exam?.duration_minutes}분</span>
              <span>비밀번호: <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{exam?.password}</span></span>
              <button
                onClick={() => {
                  setSettingsForm({
                    password: exam?.password || '',
                    duration_minutes: exam?.duration_minutes || 60,
                  })
                  setEditingSettings(true)
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium"
              >
                설정 변경
              </button>
            </div>
          </div>
          <Link
            href="/admin/official-exams"
            className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 text-sm shrink-0"
          >
            목록으로
          </Link>
        </div>

        {/* 설정 변경 폼 */}
        {editingSettings && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 border dark:border-gray-700">
            <h2 className="text-lg font-bold mb-4 dark:text-white">시험 설정 변경</h2>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-200">비밀번호</label>
                <input
                  type="text"
                  value={settingsForm.password}
                  onChange={(e) => setSettingsForm({ ...settingsForm, password: e.target.value })}
                  className="px-3 py-2 border dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm w-full sm:w-48"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-200">시험 시간(분)</label>
                <input
                  type="number"
                  value={settingsForm.duration_minutes}
                  onChange={(e) => setSettingsForm({ ...settingsForm, duration_minutes: parseInt(e.target.value) || 60 })}
                  min={1}
                  max={300}
                  className="px-3 py-2 border dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm w-24"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {savingSettings ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={() => setEditingSettings(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 탭 */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('questions')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'questions'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            문제 관리 ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'results'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            결과 보기 ({results.length})
          </button>
        </div>

        {/* 문제 관리 탭 */}
        {activeTab === 'questions' && (
          <div>
            {/* 필터 + 추가 버튼 */}
            <div className="flex flex-wrap gap-3 items-center mb-4">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="문제 검색 (코드, 내용)"
                className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm w-64"
              />
              {subjects.length > 1 && (
                <select
                  value={filterSubjectId || ''}
                  onChange={(e) => setFilterSubjectId(e.target.value ? parseInt(e.target.value) : null)}
                  className="px-3 py-2 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="">전체 과목</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
              <div className="flex-1" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {filteredQuestions.length}개 문제
                {filteredQuestions.some((q: any) => q.points > 1) && (
                  <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                    (총 {filteredQuestions.reduce((sum: number, q: any) => sum + (q.points || 1), 0)}점)
                  </span>
                )}
              </span>
              <button
                onClick={() => {
                  setEditorQuestion(undefined)
                  setShowEditor(true)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                문제 추가
              </button>
            </div>

            {/* 문제 목록 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
              {filteredQuestions.length === 0 ? (
                <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                  {questions.length === 0
                    ? '등록된 문제가 없습니다. "문제 추가" 버튼으로 문제를 추가해보세요.'
                    : '검색 결과가 없습니다.'}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredQuestions.map((q, idx) => {
                    const subjectName = subjects.find((s) => s.id === q.subject_id)?.name || '-'
                    return (
                      <div
                        key={q.id}
                        className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <div className="text-sm text-gray-400 dark:text-gray-500 w-8 pt-0.5 text-right shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                              {q.question_code}
                            </span>
                            <span className="text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                              {subjectName}
                            </span>
                            {(!q.question_type || q.question_type === 'CHOICE') ? (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                정답: {q.answer}번
                              </span>
                            ) : (
                              <span className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-medium">
                                {q.question_type === 'SHORT_ANSWER' ? '단답형' : '서술형'}
                              </span>
                            )}
                            {q.points > 1 && (
                              <span className="text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
                                {q.points}점
                              </span>
                            )}
                            {q.image_url && (
                              <span className="text-xs text-purple-600 dark:text-purple-400">
                                [이미지]
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                            {q.question_text}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setEditorQuestion(q)
                              setShowEditor(true)
                            }}
                            className="px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 font-medium"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            disabled={deletingId === q.id}
                            className="px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/50 font-medium disabled:opacity-50"
                          >
                            {deletingId === q.id ? '삭제 중...' : '삭제'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 결과 보기 탭 */}
        {activeTab === 'results' && (
          <div>
            {/* 버튼 */}
            <div className="flex justify-end gap-3 mb-4 flex-wrap">
              <button
                onClick={() => loadResults()}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
              >
                새로고침
              </button>
              <button
                onClick={() => printResultsSummary(exam?.name || '', results)}
                disabled={results.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                전체 결과 출력
              </button>
            </div>

            {/* AI 채점 영역 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4 border dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">채점 방식:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="gradingMode"
                    value="manual"
                    checked={gradingMode === 'manual'}
                    onChange={() => setGradingMode('manual')}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">수동 채점</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="gradingMode"
                    value="ai"
                    checked={gradingMode === 'ai'}
                    onChange={() => setGradingMode('ai')}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">AI 자동 채점</span>
                </label>
              </div>
              {gradingMode === 'ai' && (
                <div className="flex items-center gap-3 flex-wrap">
                  {(() => {
                    const pendingCount = results.filter((r) => r.grading_status === 'PENDING_MANUAL').length
                    return (
                      <button
                        onClick={handleAiGrade}
                        disabled={aiGrading || pendingCount === 0}
                        className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 text-sm font-medium"
                      >
                        {aiGrading
                          ? 'AI 채점 중...'
                          : pendingCount > 0
                            ? `AI 채점 시작 (대기 ${pendingCount}건)`
                            : 'AI 채점 대기 건 없음'}
                      </button>
                    )
                  })()}
                  {aiGrading && aiProgress && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
                      채점 중... {aiProgress.current}/{aiProgress.total}명 ({aiProgress.currentName})
                    </span>
                  )}
                  {aiResult && !aiGrading && (
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                      AI 채점 완료! {aiResult.totalGraded}건 채점, {aiResult.studentsGraded}명
                      {aiResult.totalFailed > 0 && (
                        <span className="text-red-500 ml-2">({aiResult.totalFailed}건 실패)</span>
                      )}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 통계 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4 border dark:border-gray-700">
              <div className="flex items-center gap-4 flex-wrap text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 dark:text-gray-400">응시자</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{results.length}명</span>
                </div>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 dark:text-gray-400">평균</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">{avgScore}점</span>
                </div>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 dark:text-gray-400">합격</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{passCount}명</span>
                </div>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 dark:text-gray-400">불합격</span>
                  <span className="font-bold text-red-600 dark:text-red-400">{failCount}명</span>
                </div>
                {pendingResults.length > 0 && (
                  <>
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500 dark:text-gray-400">채점 대기</span>
                      <span className="font-bold text-yellow-600 dark:text-yellow-400">{pendingResults.length}명</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 결과 테이블 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        순위
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        학번
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        이름
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        소속
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        점수
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        정답
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        이탈
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        시험 날짜
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {results.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          아직 제출된 답안이 없습니다
                        </td>
                      </tr>
                    )}
                    {results.map((r, idx) => (
                      <tr
                        key={r.attempt_id}
                        className={
                          r.violation_count > 0
                            ? 'bg-yellow-50 dark:bg-yellow-900/20'
                            : ''
                        }
                      >
                        <td className="px-4 py-3 text-sm dark:text-gray-200">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm font-mono dark:text-gray-200">
                          {r.student_id || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium dark:text-white">
                          {r.name}
                        </td>
                        <td className="px-4 py-3 text-sm dark:text-gray-200">
                          {r.affiliation || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <div>
                            <span
                              className={`font-bold ${
                                r.grading_status === 'PENDING_MANUAL'
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : r.total_score >= 60
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {r.total_score}점
                            </span>
                            {r.grading_status === 'PENDING_MANUAL' && (
                              <div className="text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-1 py-0.5 rounded font-medium mt-1 text-center">
                                채점대기
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm dark:text-gray-200">
                          {r.total_correct}/{r.total_questions}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {r.violation_count > 0 ? (
                            <span className="text-yellow-600 dark:text-yellow-400 font-semibold">
                              {r.violation_count}회
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm dark:text-gray-200">
                          {r.started_at ? new Date(r.started_at).toLocaleDateString('ko-KR') : new Date(r.submitted_at).toLocaleString('ko-KR')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-1.5">
                            <Link
                              href={`/admin/official-exams/${examId}/attempts/${r.attempt_id}`}
                              className={`px-3 py-1.5 text-xs rounded font-medium ${
                                r.grading_status === 'PENDING_MANUAL'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                                  : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                              }`}
                            >
                              {r.grading_status === 'PENDING_MANUAL' ? '채점' : '상세'}
                            </Link>
                            <button
                              onClick={() => handlePrintExamPaper(r.attempt_id)}
                              disabled={printingAttemptId === r.attempt_id}
                              className="px-3 py-1.5 text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 font-medium disabled:opacity-50"
                            >
                              {printingAttemptId === r.attempt_id ? '...' : '출력'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QuestionSplitEditor 오버레이 */}
      {showEditor && exam && (
        <QuestionSplitEditor
          question={editorQuestion}
          onClose={handleEditorClose}
          onSuccess={handleEditorSuccess}
          lockedExam={{ id: parseInt(examId), name: exam.name }}
        />
      )}
    </div>
  )
}
