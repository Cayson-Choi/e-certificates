import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  EXAM_TO_CODE,
  SUBJECT_TO_CODE,
  generateQuestionCode,
  getNextQuestionCode,
} from '@/lib/question-code-mapping'

// 시험명 → exam_id 매핑 (정확한 이름만 허용)
// 추후 DB에 시험이 추가되면 여기도 업데이트 필요
const EXAM_NAME_TO_ID: Record<string, number> = {
  // 전기 계열
  '전기기능사': 1,
  '전기산업기사': 2,
  '전기기사': 3,

  // 추후 추가 시 exam_id 확인 후 매핑
  // '전기공사기능사': 4,
  // '전자기능사': 5,
  // '소방설비산업기사(전기)': 6,
  // '소방설비산업기사(전기) 과정평가형': 7,
}

// 일괄 문제 추가
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 관리자 권한 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { questions } = await request.json()

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: '문제 배열이 필요합니다' },
        { status: 400 }
      )
    }

    // 과목 목록 조회 (이름 → ID 매핑용)
    const { data: allSubjects } = await supabase
      .from('subjects')
      .select('id, name, exam_id')

    if (!allSubjects) {
      return NextResponse.json(
        { error: '과목 정보를 불러올 수 없습니다' },
        { status: 500 }
      )
    }

    const results = []
    const errors = []

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]

      try {
        // 1. 시험명 → exam_id 변환
        const examId = EXAM_NAME_TO_ID[q.exam]
        if (!examId) {
          errors.push({
            index: i + 1,
            error: `잘못된 시험명: "${q.exam}" ("전기기능사", "전기산업기사", "전기기사" 중 하나여야 함 - 정확히 입력)`,
          })
          continue
        }

        // 2. 과목명 → subject_id 변환
        const subject = allSubjects.find(
          (s) => s.name === q.subject && s.exam_id === examId
        )
        if (!subject) {
          errors.push({
            index: i + 1,
            error: `잘못된 과목명: "${q.subject}" (해당 시험에 존재하지 않는 과목)`,
          })
          continue
        }
        const subjectId = subject.id

        // 3. question_code 자동 생성
        let questionCode = q.question_code || ''

        if (!questionCode) {
          // 해당 시험/과목의 마지막 문제 코드 조회
          const { data: lastQuestion } = await supabase
            .from('questions')
            .select('question_code')
            .eq('exam_id', examId)
            .eq('subject_id', subjectId)
            .order('question_code', { ascending: false })
            .limit(1)
            .single()

          if (lastQuestion && lastQuestion.question_code) {
            // 마지막 코드에서 다음 코드 생성
            const nextCode = getNextQuestionCode(lastQuestion.question_code)
            if (nextCode) {
              questionCode = nextCode
            } else {
              // 파싱 실패 시 새로 생성
              questionCode = generateQuestionCode(q.exam, q.subject, 1)
            }
          } else {
            // 첫 번째 문제
            questionCode = generateQuestionCode(q.exam, q.subject, 1)
          }
        }

        // 4. 중복 확인 (문제 코드)
        const { data: existingCode } = await supabase
          .from('questions')
          .select('id')
          .eq('question_code', questionCode)
          .single()

        if (existingCode) {
          errors.push({
            index: i + 1,
            error: `중복된 문제 코드: "${questionCode}"`,
          })
          continue
        }

        // 4-1. 내용 중복 확인 (시험+과목+문제텍스트+선택지+정답 모두 동일)
        const { data: existingContent } = await supabase
          .from('questions')
          .select('id, question_code')
          .eq('exam_id', examId)
          .eq('subject_id', subjectId)
          .eq('question_text', q.question_text)
          .eq('choice_1', q.choice_1)
          .eq('choice_2', q.choice_2)
          .eq('choice_3', q.choice_3)
          .eq('choice_4', q.choice_4)
          .eq('answer', q.answer)
          .limit(1)
          .single()

        if (existingContent) {
          errors.push({
            index: i + 1,
            error: `동일한 문제가 이미 존재합니다 (코드: ${existingContent.question_code})`,
          })
          continue
        }

        // 5. 유효성 검사
        if (!q.question_text || !q.choice_1 || !q.choice_2 || !q.choice_3 || !q.choice_4) {
          errors.push({
            index: i + 1,
            error: '문제 내용과 모든 선택지가 필요합니다',
          })
          continue
        }

        if (!q.answer || q.answer < 1 || q.answer > 4) {
          errors.push({
            index: i + 1,
            error: '정답은 1~4 중 하나여야 합니다',
          })
          continue
        }

        // 6. 문제 추가
        const { data: newQuestion, error: insertError } = await supabase
          .from('questions')
          .insert({
            question_code: questionCode,
            exam_id: examId,
            subject_id: subjectId,
            question_text: q.question_text,
            choice_1: q.choice_1,
            choice_2: q.choice_2,
            choice_3: q.choice_3,
            choice_4: q.choice_4,
            answer: q.answer,
            explanation: q.explanation || '',
            image_url: q.image_url || null,
          })
          .select()
          .single()

        if (insertError) {
          errors.push({
            index: i + 1,
            error: `DB 삽입 실패: ${insertError.message}`,
          })
          continue
        }

        results.push({
          index: i + 1,
          question_code: questionCode,
          success: true,
        })
      } catch (err: any) {
        errors.push({
          index: i + 1,
          error: err.message || '알 수 없는 오류',
        })
      }
    }

    return NextResponse.json({
      success: results.length,
      failed: errors.length,
      results,
      errors,
    })
  } catch (error) {
    console.error('Bulk questions POST error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
