'use client'

import jsPDF from 'jspdf'

interface ExamPaperData {
  examName: string
  studentName: string
  studentId: string
  affiliation: string
  totalScore: number
  totalCorrect: number
  totalQuestions: number
  violationCount: number
  submittedAt: string
  questions: {
    seq: number
    question_text: string
    choice_1: string
    choice_2: string
    choice_3: string
    choice_4: string
    correct_answer: number
    student_answer: number | null
    is_correct: boolean
    subject_name: string
  }[]
}

// 한글 텍스트를 안전하게 출력하기 위한 유틸리티
// jsPDF 기본 폰트는 한글을 지원하지 않으므로 간단한 방식으로 처리
function stripHtml(text: string): string {
  if (!text) return ''
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\$[^$]*\$/g, '[수식]') // KaTeX 수식을 [수식]으로 대체
}

export async function downloadExamPaperPdf(data: ExamPaperData) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // 한글 폰트 문제로 HTML 기반 PDF 생성 방식 사용
  // jsPDF의 html() 메서드 대신 window.print() 스타일 접근
  // 하지만 기본적인 정보는 영문/숫자로 표시 가능

  // 헤더
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Exam Result', pageWidth / 2, y, { align: 'center' })
  y += 10

  // 시험 정보 (영문/숫자)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  if (data.studentId) {
    doc.text(`Student ID: ${data.studentId}`, margin, y)
    y += 6
  }
  if (data.studentName) {
    doc.text(`Name: ${data.studentName}`, margin, y)
    y += 6
  }
  if (data.affiliation) {
    doc.text(`Affiliation: ${data.affiliation}`, margin, y)
    y += 6
  }

  doc.text(`Score: ${data.totalScore} / 100`, margin, y)
  doc.text(`Correct: ${data.totalCorrect} / ${data.totalQuestions}`, margin + 60, y)
  y += 6

  if (data.violationCount > 0) {
    doc.text(`Violations: ${data.violationCount}`, margin, y)
    y += 6
  }

  doc.text(`Submitted: ${new Date(data.submittedAt).toLocaleString('ko-KR')}`, margin, y)
  y += 10

  // 구분선
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // 문제별 결과 요약표
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Answer Summary', margin, y)
  y += 8

  // 표 헤더
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  const colWidths = [12, 25, 25, 25, 15]
  const headers = ['No.', 'Student', 'Correct', 'Subject', 'Result']
  let x = margin
  headers.forEach((h, i) => {
    doc.text(h, x, y)
    x += colWidths[i]
  })
  y += 5
  doc.setLineWidth(0.2)
  doc.line(margin, y, margin + colWidths.reduce((a, b) => a + b, 0), y)
  y += 4

  // 문제별 데이터
  doc.setFont('helvetica', 'normal')
  for (const q of data.questions) {
    if (y > 280) {
      doc.addPage()
      y = margin
    }

    x = margin
    doc.text(String(q.seq), x, y)
    x += colWidths[0]
    doc.text(q.student_answer ? String(q.student_answer) : '-', x, y)
    x += colWidths[1]
    doc.text(String(q.correct_answer), x, y)
    x += colWidths[2]

    // 과목명은 한글이므로 가능한 범위에서 표시
    const subjectText = q.subject_name || ''
    doc.text(subjectText.substring(0, 8), x, y)
    x += colWidths[3]

    const resultMark = q.is_correct ? 'O' : 'X'
    if (!q.is_correct) {
      doc.setTextColor(255, 0, 0)
    } else {
      doc.setTextColor(0, 128, 0)
    }
    doc.text(resultMark, x, y)
    doc.setTextColor(0, 0, 0)

    y += 5
  }

  // 파일 다운로드
  const filename = data.studentId
    ? `exam_${data.studentId}_${data.totalScore}.pdf`
    : `exam_result_${data.totalScore}.pdf`
  doc.save(filename)
}

// 전체 결과 요약 PDF (관리자용)
export async function downloadResultsSummaryPdf(
  examName: string,
  results: {
    student_id: string
    name: string
    affiliation: string
    total_score: number
    total_correct: number
    total_questions: number
    violation_count: number
    submitted_at: string
  }[]
) {
  const doc = new jsPDF('l', 'mm', 'a4') // 가로 모드
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  let y = margin

  // 헤더
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Exam Results Summary', pageWidth / 2, y, { align: 'center' })
  y += 10

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total Students: ${results.length}`, margin, y)
  y += 6

  const avgScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.total_score, 0) / results.length)
    : 0
  doc.text(`Average Score: ${avgScore}`, margin, y)
  y += 10

  // 구분선
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 6

  // 표 헤더
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  const colWidths = [10, 30, 30, 30, 20, 25, 25, 30]
  const headers = ['#', 'Student ID', 'Name', 'Affiliation', 'Score', 'Correct', 'Violations', 'Submitted']
  let x = margin
  headers.forEach((h, i) => {
    doc.text(h, x, y)
    x += colWidths[i]
  })
  y += 5
  doc.setLineWidth(0.2)
  doc.line(margin, y, margin + colWidths.reduce((a, b) => a + b, 0), y)
  y += 4

  // 데이터 행
  doc.setFont('helvetica', 'normal')
  results.forEach((r, idx) => {
    if (y > 190) {
      doc.addPage()
      y = margin
    }

    x = margin
    doc.text(String(idx + 1), x, y)
    x += colWidths[0]
    doc.text(r.student_id || '-', x, y)
    x += colWidths[1]
    doc.text(r.name || '-', x, y)
    x += colWidths[2]
    doc.text(r.affiliation || '-', x, y)
    x += colWidths[3]
    doc.text(String(r.total_score), x, y)
    x += colWidths[4]
    doc.text(`${r.total_correct}/${r.total_questions}`, x, y)
    x += colWidths[5]

    if (r.violation_count > 0) {
      doc.setTextColor(255, 165, 0)
      doc.text(String(r.violation_count), x, y)
      doc.setTextColor(0, 0, 0)
    } else {
      doc.text('0', x, y)
    }
    x += colWidths[6]

    doc.text(new Date(r.submitted_at).toLocaleString('ko-KR'), x, y)
    y += 5
  })

  doc.save(`results_summary.pdf`)
}
