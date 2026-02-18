'use client'

import { useEffect, useState, useCallback } from 'react'
import MathText from '@/components/MathText'

// Base64 data URL → Blob 변환
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png'
  const binary = atob(base64)
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i)
  }
  return new Blob([array], { type: mime })
}

// PDF에서 추출한 텍스트의 불필요한 줄바꿈을 정리
// 단독 \n → 공백, \n\n (빈 줄) → 유지
function normalizeLineBreaks(text: string): string {
  if (!text) return text
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{2,}/g, '___PARA___')   // 빈 줄(문단 구분)은 보존
    .replace(/\n/g, ' ')                 // 단독 줄바꿈 → 공백
    .replace(/___PARA___/g, '\n\n')      // 문단 구분 복원
    .replace(/ {2,}/g, ' ')              // 연속 공백 정리
}

interface BulkUploadSplitEditorProps {
  onClose: () => void
  onSuccess: () => void
}

export default function BulkUploadSplitEditor({
  onClose,
  onSuccess,
}: BulkUploadSplitEditorProps) {
  const [uploadType, setUploadType] = useState<'json' | 'csv'>('json')
  const [textInput, setTextInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [previewQuestions, setPreviewQuestions] = useState<any[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit')
  const [hasUploaded, setHasUploaded] = useState(false)
  const [saveFlash, setSaveFlash] = useState(false)

  // Dark mode detection
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }
    checkDarkMode()
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  // Body scroll lock
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  // Keyboard shortcuts
  const handleClose = useCallback(() => {
    if (previewQuestions.length > 0 && !hasUploaded) {
      if (!confirm('업로드하지 않은 문제가 있습니다. 나가시겠습니까?')) {
        return
      }
    }
    if (hasUploaded) {
      onSuccess()
    } else {
      onClose()
    }
  }, [previewQuestions, hasUploaded, onClose, onSuccess])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClose])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileName = file.name.toLowerCase()
    const isJson = fileName.endsWith('.json')
    const isCsv = fileName.endsWith('.csv')

    if (!isJson && !isCsv) {
      alert('JSON 또는 CSV 파일만 업로드 가능합니다')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다')
      return
    }

    try {
      const text = await file.text()
      setTextInput(text)
      setSelectedFileName(file.name)

      if (isJson) setUploadType('json')
      else if (isCsv) setUploadType('csv')

      e.target.value = ''
    } catch (err) {
      console.error('File read error:', err)
      alert('파일을 읽는 중 오류가 발생했습니다')
    }
  }

  // AI 생성 인용 마커([cite_start], [cite: ...]) 제거
  const stripCitationMarkers = (text: string): string => {
    // JSON 구조를 깨뜨리는 [cite_start] 제거
    let cleaned = text.replace(/\[cite_start\]/g, '')
    // 문자열 내부의 [cite: 숫자, ...] 제거
    cleaned = cleaned.replace(/\s*\[cite:\s*[\d,\s]+\]/g, '')
    return cleaned
  }

  // JSON 문자열 내부의 LaTeX 백슬래시를 자동 이스케이프
  // 문자 단위로 파싱하여 문자열 안의 백슬래시만 정확히 처리
  const fixJsonBackslashesInStrings = (text: string): string => {
    const result: string[] = []
    let i = 0
    let inString = false

    while (i < text.length) {
      const ch = text[i]

      if (!inString) {
        result.push(ch)
        if (ch === '"') inString = true
        i++
      } else {
        if (ch === '\\') {
          const next = text[i + 1]
          if (next === undefined) {
            result.push('\\\\')
            i++
          } else if (next === '"' || next === '\\' || next === '/') {
            // 이미 유효한 JSON 이스케이프 → 유지
            result.push(ch, next)
            i += 2
          } else if (next === 'u' && /^[0-9a-fA-F]{4}/.test(text.substring(i + 2, i + 6))) {
            // 유니코드 이스케이프 \uXXXX → 유지
            result.push(text.substring(i, i + 6))
            i += 6
          } else {
            // 나머지 (\frac, \times, \alpha, \n, \t 등) → LaTeX로 취급, 이중 이스케이프
            result.push('\\\\')
            i++
          }
        } else if (ch === '"') {
          result.push(ch)
          inString = false
          i++
        } else {
          result.push(ch)
          i++
        }
      }
    }

    return result.join('')
  }

  const parseQuestions = (text: string, type: 'json' | 'csv'): any[] | null => {
    if (type === 'json') {
      // 인용 마커 제거 후 파싱 시도
      const cleaned = stripCitationMarkers(text)
      try {
        const parsed = JSON.parse(cleaned)
        return Array.isArray(parsed) ? parsed : [parsed]
      } catch {
        // JSON 문자열 내부 백슬래시 자동 수정 후 재시도
        try {
          const fixed = fixJsonBackslashesInStrings(cleaned)
          const parsed = JSON.parse(fixed)
          return Array.isArray(parsed) ? parsed : [parsed]
        } catch (e: any) {
          const msg = e?.message || ''
          const posMatch = msg.match(/position\s+(\d+)/)
          if (posMatch) {
            const pos = parseInt(posMatch[1])
            const around = cleaned.substring(Math.max(0, pos - 30), pos + 30)
            alert(`JSON 파싱 오류 (위치 ${pos} 부근):\n"...${around}..."\n\n오류: ${msg}`)
          } else {
            alert(`잘못된 JSON 형식입니다\n\n${msg}`)
          }
          return null
        }
      }
    } else {
      const lines = text.trim().split('\n')
      if (lines.length < 2) {
        alert('CSV 데이터에 헤더와 최소 1행의 데이터가 필요합니다')
        return null
      }
      const headers = lines[0].split(',').map((h) => h.trim())
      const questions: any[] = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim())
        const question: any = {}
        headers.forEach((header, index) => {
          const value = values[index]
          if (header === 'answer' && value) {
            question[header] = parseInt(value)
          } else {
            question[header] = value || ''
          }
        })
        questions.push(question)
      }
      return questions
    }
  }

  const handlePreview = () => {
    if (!textInput.trim()) {
      alert('입력 내용이 없습니다')
      return
    }
    const questions = parseQuestions(textInput, uploadType)
    if (questions) {
      setPreviewQuestions(questions)
      setPreviewMode(true)
    }
  }

  const handleRemoveQuestion = (index: number) => {
    setPreviewQuestions((prev) => prev.filter((_, i) => i !== index))
    if (editingIndex === index) setEditingIndex(null)
    else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1)
    }
  }

  const handleUpload = async () => {
    if (!textInput.trim() && previewQuestions.length === 0) {
      alert('입력 내용이 없습니다')
      return
    }

    try {
      setUploading(true)

      let questions: any[]
      if (previewMode && previewQuestions.length > 0) {
        questions = previewQuestions
      } else {
        const parsed = parseQuestions(textInput, uploadType)
        if (!parsed) return
        questions = parsed
      }

      // img_data (Base64) → Storage 업로드 → image_url 변환
      const processedQuestions = questions.map((q) => ({ ...q }))
      const imgUploadTargets = processedQuestions
        .map((q, i) => ({ q, i }))
        .filter(({ q }) => q.img_data && q.img_data.startsWith('data:image/'))

      if (imgUploadTargets.length > 0) {
        let uploaded = 0
        for (const { q, i } of imgUploadTargets) {
          try {
            const blob = dataUrlToBlob(q.img_data)
            const file = new File([blob], `bulk-${Date.now()}-${i}.png`, { type: blob.type || 'image/png' })
            const fd = new FormData()
            fd.append('file', file)

            const imgRes = await fetch('/api/upload/image', {
              method: 'POST',
              body: fd,
            })

            if (imgRes.ok) {
              const imgData = await imgRes.json()
              processedQuestions[i].image_url = imgData.url
              uploaded++
            }
          } catch (err) {
            console.error(`Image upload failed for question ${i + 1}:`, err)
          }
          delete processedQuestions[i].img_data
        }
      }

      const res = await fetch('/api/admin/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: processedQuestions }),
      })

      if (res.ok) {
        const result = await res.json()
        let message = `업로드 완료!\n성공: ${result.success}개\n실패: ${result.failed}개`

        if (result.errors && result.errors.length > 0) {
          message += '\n\n실패 상세:'
          result.errors.slice(0, 5).forEach((err: any) => {
            message += `\n- ${err.index}번째: ${err.error}`
          })
          if (result.errors.length > 5) {
            message += `\n... 외 ${result.errors.length - 5}개`
          }
        }

        alert(message)
        if (result.success > 0) {
          setHasUploaded(true)
          setSaveFlash(true)
          setTimeout(() => setSaveFlash(false), 2000)
        }
      } else {
        const error = await res.json()
        alert(`업로드 실패: ${error.error || '알 수 없는 오류'}`)
      }
    } catch (err) {
      console.error('Bulk upload error:', err)
      alert('업로드 중 오류가 발생했습니다')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      className="animate-slide-in-right"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: isDark ? '#111827' : '#ffffff',
        color: isDark ? '#f3f4f6' : '#111827',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          backgroundColor: isDark ? '#1f2937' : '#f9fafb',
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: isDark ? '#374151' : '#e5e7eb',
            color: isDark ? '#d1d5db' : '#374151',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ← 목록으로
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: isDark ? '#f9fafb' : '#111827',
            }}
          >
            문제 일괄 업로드
          </h1>
          {saveFlash && (
            <span
              style={{
                fontSize: '13px',
                color: '#16a34a',
                fontWeight: 600,
              }}
            >
              업로드 완료
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {!previewMode ? (
            <button
              onClick={handlePreview}
              disabled={!textInput.trim()}
              style={{
                padding: '8px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: !textInput.trim() ? (isDark ? '#374151' : '#d1d5db') : '#2563eb',
                color: !textInput.trim() ? (isDark ? '#6b7280' : '#9ca3af') : '#ffffff',
                cursor: !textInput.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              미리보기
            </button>
          ) : (
            <button
              onClick={handleUpload}
              disabled={uploading || previewQuestions.length === 0}
              style={{
                padding: '8px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: uploading || previewQuestions.length === 0
                  ? (isDark ? '#14532d' : '#86efac')
                  : '#16a34a',
                color: '#ffffff',
                cursor: uploading || previewQuestions.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {uploading ? '업로드 중...' : `${previewQuestions.length}개 문제 업로드`}
            </button>
          )}
        </div>
      </div>

      {/* Mobile tab switcher */}
      <div
        style={{
          display: 'none',
          borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          backgroundColor: isDark ? '#1f2937' : '#f9fafb',
          flexShrink: 0,
        }}
        className="lg:!hidden max-lg:!flex"
      >
        <button
          onClick={() => setMobileTab('edit')}
          style={{
            flex: 1,
            padding: '10px',
            border: 'none',
            borderBottom: mobileTab === 'edit' ? '3px solid #2563eb' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: mobileTab === 'edit' ? '#2563eb' : isDark ? '#9ca3af' : '#6b7280',
            fontWeight: mobileTab === 'edit' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          {previewMode ? '문제 목록' : '입력'}
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          style={{
            flex: 1,
            padding: '10px',
            border: 'none',
            borderBottom: mobileTab === 'preview' ? '3px solid #2563eb' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: mobileTab === 'preview' ? '#2563eb' : isDark ? '#9ca3af' : '#6b7280',
            fontWeight: mobileTab === 'preview' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          미리보기
        </button>
      </div>

      {/* Split panels */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel */}
        <div
          className={`bulk-split-panel lg:!block ${mobileTab === 'edit' ? 'max-lg:!block' : 'max-lg:!hidden'}`}
          style={{
            width: '50%',
            overflowY: 'auto',
            padding: '24px',
            borderRight: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          }}
        >
          {!previewMode ? (
            <InputPanel
              uploadType={uploadType}
              setUploadType={setUploadType}
              textInput={textInput}
              setTextInput={setTextInput}
              selectedFileName={selectedFileName}
              setSelectedFileName={setSelectedFileName}
              handleFileSelect={handleFileSelect}
              handlePreview={handlePreview}
              isDark={isDark}
            />
          ) : (
            <EditListPanel
              previewQuestions={previewQuestions}
              setPreviewQuestions={setPreviewQuestions}
              editingIndex={editingIndex}
              setEditingIndex={setEditingIndex}
              handleRemoveQuestion={handleRemoveQuestion}
              onBackToInput={() => {
                setPreviewMode(false)
                setEditingIndex(null)
              }}
              isDark={isDark}
            />
          )}
        </div>

        {/* Right Panel - Preview */}
        <div
          className={`bulk-split-panel lg:!block ${mobileTab === 'preview' ? 'max-lg:!block' : 'max-lg:!hidden'}`}
          style={{
            width: '50%',
            overflowY: 'auto',
            padding: '24px',
            backgroundColor: isDark ? '#0f172a' : '#f3f4f6',
          }}
        >
          <BulkPreviewPanel
            previewQuestions={previewQuestions}
            previewMode={previewMode}
            editingIndex={editingIndex}
            isDark={isDark}
            onRemove={handleRemoveQuestion}
          />
        </div>
      </div>

      {/* Mobile responsive */}
      <style>{`
        @media (max-width: 1023px) {
          .bulk-split-panel {
            width: 100% !important;
            border-right: none !important;
          }
        }
      `}</style>
    </div>
  )
}

/* ─── Input Panel (before parsing) ─── */
function InputPanel({
  uploadType,
  setUploadType,
  textInput,
  setTextInput,
  selectedFileName,
  setSelectedFileName,
  handleFileSelect,
  handlePreview,
  isDark,
}: {
  uploadType: 'json' | 'csv'
  setUploadType: (t: 'json' | 'csv') => void
  textInput: string
  setTextInput: (s: string) => void
  selectedFileName: string | null
  setSelectedFileName: (s: string | null) => void
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  handlePreview: () => void
  isDark: boolean
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: `1px solid ${isDark ? '#4b5563' : '#d1d5db'}`,
    backgroundColor: isDark ? '#374151' : '#ffffff',
    color: isDark ? '#f3f4f6' : '#111827',
    fontSize: '14px',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '6px',
    color: isDark ? '#d1d5db' : '#374151',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Upload type toggle */}
      <div>
        <label style={labelStyle}>데이터 형식</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['json', 'csv'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setUploadType(type)}
              style={{
                padding: '6px 20px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: uploadType === type
                  ? '#2563eb'
                  : isDark ? '#374151' : '#e5e7eb',
                color: uploadType === type
                  ? '#ffffff'
                  : isDark ? '#d1d5db' : '#374151',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: uploadType === type ? 600 : 400,
              }}
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Format guide */}
      <div
        style={{
          padding: '14px',
          borderRadius: '8px',
          backgroundColor: isDark ? 'rgba(37, 99, 235, 0.1)' : '#eff6ff',
          border: `1px solid ${isDark ? '#1e3a5f' : '#bfdbfe'}`,
          fontSize: '13px',
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: '8px', color: isDark ? '#93c5fd' : '#1d4ed8' }}>
          {uploadType === 'json' ? 'JSON 형식' : 'CSV 형식'}
        </p>
        <pre
          style={{
            fontSize: '11px',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            color: isDark ? '#d1d5db' : '#374151',
            margin: 0,
          }}
        >
          {uploadType === 'json'
            ? `[
  {
    "exam": "전기기능사",
    "subject": "전기이론",
    "question_text": "옴의 법칙에서 전압은?",
    "choice_1": "V = I × R",
    "choice_2": "V = I / R",
    "choice_3": "V = R / I",
    "choice_4": "V = I + R",
    "answer": 1,
    "explanation": "옴의 법칙: V = I × R",
    "image_url": "",
    "img_data": "data:image/png;base64,..."
  }
]`
            : `exam,subject,question_text,choice_1,choice_2,choice_3,choice_4,answer,explanation,image_url
전기기능사,전기이론,옴의 법칙에서 전압은?,V=I×R,V=I/R,V=R/I,V=I+R,1,옴의 법칙: V=I×R,`}
        </pre>
        <p style={{ marginTop: '8px', fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280', lineHeight: '1.6' }}>
          * exam: "전기기능사" / "전기산업기사" / "전기기사"<br />
          * subject: 과목명 (전기이론, 전기기기 등)<br />
          * answer: 1~4 중 정답 번호<br />
          * question_code는 자동 생성됩니다<br />
          * img_data: Base64 이미지 (업로드 시 자동으로 Storage에 저장)
        </p>
      </div>

      {/* File upload */}
      <div>
        <label style={labelStyle}>파일 업로드 (선택사항)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <label
            htmlFor="bulk-split-file-upload"
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            파일 선택
          </label>
          <input
            id="bulk-split-file-upload"
            type="file"
            accept=".json,.csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          {selectedFileName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: isDark ? '#9ca3af' : '#6b7280' }}>
                {selectedFileName}
              </span>
              <button
                onClick={() => {
                  setSelectedFileName(null)
                  setTextInput('')
                }}
                style={{
                  fontSize: '12px',
                  color: '#ef4444',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                제거
              </button>
            </div>
          )}
        </div>
        <p style={{ fontSize: '11px', color: isDark ? '#6b7280' : '#9ca3af', marginTop: '6px' }}>
          JSON 또는 CSV 파일 (최대 10MB)
        </p>
      </div>

      {/* Text input */}
      <div>
        <label style={labelStyle}>
          {uploadType === 'json' ? 'JSON' : 'CSV'} 데이터 입력
        </label>
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          style={{
            ...inputStyle,
            fontFamily: 'monospace',
            fontSize: '12px',
            resize: 'vertical',
            minHeight: '200px',
          }}
          rows={14}
          placeholder={
            uploadType === 'json'
              ? 'JSON 배열을 입력하거나 위에서 파일을 선택하세요...'
              : 'CSV 데이터를 입력하거나 위에서 파일을 선택하세요 (첫 줄은 헤더)...'
          }
        />
      </div>

      {/* Parse button (shown on mobile too since header button might not be visible) */}
      <button
        onClick={handlePreview}
        disabled={!textInput.trim()}
        className="lg:!hidden"
        style={{
          padding: '12px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: !textInput.trim() ? (isDark ? '#374151' : '#d1d5db') : '#2563eb',
          color: !textInput.trim() ? (isDark ? '#6b7280' : '#9ca3af') : '#ffffff',
          cursor: !textInput.trim() ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        미리보기
      </button>
    </div>
  )
}

/* ─── Edit List Panel (after parsing) ─── */
function EditListPanel({
  previewQuestions,
  setPreviewQuestions,
  editingIndex,
  setEditingIndex,
  handleRemoveQuestion,
  onBackToInput,
  isDark,
}: {
  previewQuestions: any[]
  setPreviewQuestions: (q: any[]) => void
  editingIndex: number | null
  setEditingIndex: (i: number | null) => void
  handleRemoveQuestion: (i: number) => void
  onBackToInput: () => void
  isDark: boolean
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 10px',
    borderRadius: '4px',
    border: `1px solid ${isDark ? '#4b5563' : '#d1d5db'}`,
    backgroundColor: isDark ? '#374151' : '#ffffff',
    color: isDark ? '#f3f4f6' : '#111827',
    fontSize: '13px',
    outline: 'none',
  }

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...previewQuestions]
    updated[index] = { ...updated[index], [field]: value }
    setPreviewQuestions(updated)
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: isDark ? '#f3f4f6' : '#111827',
          }}
        >
          {previewQuestions.length}개 문제
        </h3>
        <button
          onClick={onBackToInput}
          style={{
            fontSize: '13px',
            color: '#2563eb',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          ← 입력 화면으로
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {previewQuestions.map((q, index) => (
          <div
            key={index}
            style={{
              borderRadius: '8px',
              border: `1px solid ${
                editingIndex === index
                  ? '#eab308'
                  : isDark ? '#374151' : '#e5e7eb'
              }`,
              backgroundColor: isDark ? '#1f2937' : '#ffffff',
              overflow: 'hidden',
            }}
          >
            {/* Question header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: isDark ? '#111827' : '#f9fafb',
                borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#dbeafe',
                    color: isDark ? '#93c5fd' : '#1d4ed8',
                  }}
                >
                  {index + 1}
                </span>
                <span style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>
                  {q.exam} / {q.subject}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {editingIndex === index ? (
                  <button
                    onClick={() => setEditingIndex(null)}
                    style={{
                      fontSize: '12px',
                      padding: '3px 10px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    완료
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setEditingIndex(index)}
                      style={{
                        fontSize: '12px',
                        padding: '3px 10px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: isDark ? '#854d0e' : '#eab308',
                        color: '#ffffff',
                        cursor: 'pointer',
                      }}
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleRemoveQuestion(index)}
                      style={{
                        fontSize: '12px',
                        padding: '3px 10px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        cursor: 'pointer',
                      }}
                    >
                      삭제
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Question body */}
            <div style={{ padding: '12px 14px' }}>
              {editingIndex === index ? (
                /* Expanded edit form */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#d1d5db' : '#374151', display: 'block', marginBottom: '3px' }}>
                      문제 내용 *
                    </label>
                    <textarea
                      value={q.question_text}
                      onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                      style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
                      rows={3}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#d1d5db' : '#374151', display: 'block', marginBottom: '3px' }}>
                      이미지 URL
                    </label>
                    <input
                      type="text"
                      value={q.image_url || ''}
                      onChange={(e) => updateQuestion(index, 'image_url', e.target.value)}
                      style={inputStyle}
                      placeholder="이미지 URL (선택사항)"
                    />
                  </div>

                  {[1, 2, 3, 4].map((choice) => (
                    <div key={choice}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#d1d5db' : '#374151', display: 'block', marginBottom: '3px' }}>
                        선택지 {choice} *
                      </label>
                      <input
                        type="text"
                        value={q[`choice_${choice}`] || ''}
                        onChange={(e) => updateQuestion(index, `choice_${choice}`, e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  ))}

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#d1d5db' : '#374151', display: 'block', marginBottom: '3px' }}>
                      정답 *
                    </label>
                    <select
                      value={q.answer}
                      onChange={(e) => updateQuestion(index, 'answer', parseInt(e.target.value))}
                      style={inputStyle}
                    >
                      <option value={1}>1번</option>
                      <option value={2}>2번</option>
                      <option value={3}>3번</option>
                      <option value={4}>4번</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: isDark ? '#d1d5db' : '#374151', display: 'block', marginBottom: '3px' }}>
                      해설
                    </label>
                    <textarea
                      value={q.explanation || ''}
                      onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
                      style={{ ...inputStyle, resize: 'vertical', minHeight: '40px' }}
                      rows={2}
                      placeholder="해설 (선택사항)"
                    />
                  </div>
                </div>
              ) : (
                /* Collapsed summary */
                <div
                  style={{
                    fontSize: '13px',
                    color: isDark ? '#d1d5db' : '#374151',
                    lineHeight: '1.5',
                  }}
                >
                  <div style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: '4px',
                    fontWeight: 500,
                  }}>
                    <MathText text={q.question_text || '(내용 없음)'} />
                  </div>
                  <div style={{ fontSize: '12px', color: isDark ? '#6b7280' : '#9ca3af' }}>
                    정답: {q.answer}번 | 선택지: {[q.choice_1, q.choice_2, q.choice_3, q.choice_4].filter(Boolean).length}개
                    {q.explanation ? ' | 해설 있음' : ''}
                    {q.image_url ? ' | 이미지 있음' : q.img_data ? ' | 이미지(Base64)' : ''}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Preview Panel (right side) ─── */
function BulkPreviewPanel({
  previewQuestions,
  previewMode,
  editingIndex,
  isDark,
  onRemove,
}: {
  previewQuestions: any[]
  previewMode: boolean
  editingIndex: number | null
  isDark: boolean
  onRemove: (index: number) => void
}) {
  if (!previewMode || previewQuestions.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: isDark ? '#6b7280' : '#9ca3af',
          gap: '12px',
        }}
      >
        <div style={{ fontSize: '48px', opacity: 0.5 }}>&#128196;</div>
        <p style={{ fontSize: '15px' }}>데이터를 입력하고 미리보기를 누르면</p>
        <p style={{ fontSize: '15px' }}>학생에게 보이는 화면이 표시됩니다</p>
      </div>
    )
  }

  return (
    <div>
      <p
        style={{
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '16px',
          color: isDark ? '#9ca3af' : '#6b7280',
          textAlign: 'center',
        }}
      >
        학생에게 보이는 실제 시험 화면 ({previewQuestions.length}개)
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {previewQuestions.map((q, index) => (
          <div
            key={index}
            id={`preview-q-${index}`}
            style={{
              borderRadius: '12px',
              border: `2px solid ${
                editingIndex === index
                  ? '#eab308'
                  : isDark ? '#374151' : '#e5e7eb'
              }`,
              backgroundColor: isDark ? '#111827' : '#f9fafb',
              padding: '8px',
              transition: 'border-color 0.2s',
            }}
          >
            <div
              style={{
                borderRadius: '8px',
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                position: 'relative',
              }}
            >
              {/* Delete button */}
              <button
                onClick={() => {
                  if (confirm(`문제 ${index + 1}번을 삭제하시겠습니까?`)) {
                    onRemove(index)
                  }
                }}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
                  color: isDark ? '#f87171' : '#dc2626',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)'
                }}
              >
                삭제
              </button>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                {/* Number badge */}
                <div
                  style={{
                    flexShrink: 0,
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '16px',
                    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#dbeafe',
                    color: isDark ? '#93c5fd' : '#1d4ed8',
                  }}
                >
                  {index + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Badges */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    {q.exam && (
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#dbeafe',
                          color: isDark ? '#93c5fd' : '#1d4ed8',
                        }}
                      >
                        {q.exam}
                      </span>
                    )}
                    {q.subject && (
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7',
                          color: isDark ? '#86efac' : '#166534',
                        }}
                      >
                        {q.subject}
                      </span>
                    )}
                  </div>

                  {/* Subject */}
                  <div style={{ fontSize: '12px', marginBottom: '6px', color: isDark ? '#9ca3af' : '#6b7280' }}>
                    {q.subject}
                  </div>

                  {/* Question text */}
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 500,
                      marginBottom: '14px',
                      color: isDark ? '#f3f4f6' : '#111827',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    <MathText text={normalizeLineBreaks(q.question_text || '')} />
                  </div>

                  {/* Image */}
                  {(q.image_url || q.img_data) && (
                    <div style={{ marginBottom: '14px' }}>
                      <img
                        src={q.image_url || q.img_data}
                        alt="문제 이미지"
                        style={{
                          maxWidth: '100%',
                          height: 'auto',
                          borderRadius: '8px',
                          border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  )}

                  {/* Choices */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[1, 2, 3, 4].map((choice) => {
                      const choiceText = q[`choice_${choice}`]
                      if (!choiceText) return null
                      const isCorrect = q.answer === choice
                      return (
                        <div
                          key={choice}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '12px',
                            borderRadius: '8px',
                            border: `2px solid ${
                              isCorrect
                                ? isDark ? '#22c55e' : '#16a34a'
                                : isDark ? '#374151' : '#e5e7eb'
                            }`,
                            backgroundColor: isCorrect
                              ? isDark ? 'rgba(34, 197, 94, 0.1)' : '#f0fdf4'
                              : isDark ? 'rgba(55, 65, 81, 0.3)' : '#ffffff',
                          }}
                        >
                          <input
                            type="radio"
                            checked={isCorrect}
                            readOnly
                            style={{ marginTop: '2px', accentColor: '#22c55e' }}
                          />
                          <span style={{ flex: 1, fontSize: '14px', color: isDark ? '#e5e7eb' : '#111827', wordBreak: 'break-word' }}>
                            {choice}. <MathText text={normalizeLineBreaks(choiceText)} />
                            {isCorrect && (
                              <span
                                style={{
                                  marginLeft: '8px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: isDark ? '#4ade80' : '#16a34a',
                                }}
                              >
                                (정답)
                              </span>
                            )}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Explanation */}
                  {q.explanation && (
                    <div
                      style={{
                        marginTop: '14px',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${isDark ? '#1e3a5f' : '#bfdbfe'}`,
                        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.1)' : '#eff6ff',
                      }}
                    >
                      <p
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          marginBottom: '4px',
                          color: isDark ? '#93c5fd' : '#1d4ed8',
                        }}
                      >
                        해설
                      </p>
                      <div
                        style={{
                          fontSize: '13px',
                          lineHeight: '1.6',
                          color: isDark ? '#d1d5db' : '#374151',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        <MathText text={normalizeLineBreaks(q.explanation)} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
