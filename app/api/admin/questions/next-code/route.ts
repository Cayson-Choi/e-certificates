import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  generateQuestionCode,
  getNextQuestionCode,
} from '@/lib/question-code-mapping'

export async function GET(request: Request) {
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

    // URL에서 exam_id, subject_id 가져오기
    const { searchParams } = new URL(request.url)
    const examId = searchParams.get('exam_id')
    const subjectId = searchParams.get('subject_id')

    if (!examId || !subjectId) {
      return NextResponse.json({ error: '시험과 과목을 선택해주세요' }, { status: 400 })
    }

    // 시험 정보 가져오기
    const { data: exam } = await supabase
      .from('exams')
      .select('name')
      .eq('id', examId)
      .single()

    if (!exam) {
      return NextResponse.json({ error: '시험을 찾을 수 없습니다' }, { status: 404 })
    }

    // 과목 정보 가져오기
    const { data: subject } = await supabase
      .from('subjects')
      .select('name')
      .eq('id', subjectId)
      .single()

    if (!subject) {
      return NextResponse.json({ error: '과목을 찾을 수 없습니다' }, { status: 404 })
    }

    // 해당 시험-과목의 마지막 문제 코드 찾기
    const { data: lastQuestion } = await supabase
      .from('questions')
      .select('question_code')
      .eq('exam_id', examId)
      .eq('subject_id', subjectId)
      .order('question_code', { ascending: false })
      .limit(1)
      .single()

    let nextCode: string

    if (lastQuestion?.question_code) {
      // 마지막 코드에서 다음 코드 생성
      const generated = getNextQuestionCode(lastQuestion.question_code)
      if (generated) {
        nextCode = generated
      } else {
        // 파싱 실패 시 새로 생성
        nextCode = generateQuestionCode(exam.name, subject.name, 1)
      }
    } else {
      // 첫 번째 문제
      nextCode = generateQuestionCode(exam.name, subject.name, 1)
    }

    return NextResponse.json({
      code: nextCode,
      lastCode: lastQuestion?.question_code || null,
    })
  } catch (error) {
    console.error('Next code generation error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
