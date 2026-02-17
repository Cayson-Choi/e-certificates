import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// 문제 목록 조회
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

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url)
    const examId = searchParams.get('exam_id')
    const subjectId = searchParams.get('subject_id')

    // 문제 조회 쿼리
    let query = supabase
      .from('questions')
      .select(
        `
        id,
        question_code,
        exam_id,
        subject_id,
        question_text,
        choice_1,
        choice_2,
        choice_3,
        choice_4,
        answer,
        explanation,
        image_url,
        exams (name),
        subjects (name)
      `
      )
      .order('exam_id')
      .order('subject_id')
      .order('question_code')

    if (examId) {
      query = query.eq('exam_id', examId)
    }

    if (subjectId) {
      query = query.eq('subject_id', subjectId)
    }

    const { data: questions, error } = await query

    if (error) {
      console.error('Questions query error:', error)
      return NextResponse.json({ error: '문제 조회 실패' }, { status: 500 })
    }

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Admin questions GET error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// 문제 추가
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

    const body = await request.json()
    const {
      question_code,
      exam_id,
      subject_id,
      question_text,
      choice_1,
      choice_2,
      choice_3,
      choice_4,
      answer,
      explanation,
      image_url,
    } = body

    // 유효성 검사
    if (!question_code || !exam_id || !subject_id || !question_text) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다' }, { status: 400 })
    }

    if (!choice_1 || !choice_2 || !choice_3 || !choice_4) {
      return NextResponse.json({ error: '모든 선택지를 입력해주세요' }, { status: 400 })
    }

    if (!answer || answer < 1 || answer > 4) {
      return NextResponse.json({ error: '정답은 1~4 중 하나여야 합니다' }, { status: 400 })
    }

    // 문제 코드 중복 확인
    const { data: existing } = await supabase
      .from('questions')
      .select('id')
      .eq('question_code', question_code)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: '이미 존재하는 문제 코드입니다' },
        { status: 400 }
      )
    }

    // 문제 추가
    const { data: newQuestion, error: insertError } = await supabase
      .from('questions')
      .insert({
        question_code,
        exam_id,
        subject_id,
        question_text,
        choice_1,
        choice_2,
        choice_3,
        choice_4,
        answer,
        explanation: explanation || '',
        image_url: image_url || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Question insert error:', insertError)
      return NextResponse.json({ error: '문제 추가 실패' }, { status: 500 })
    }

    return NextResponse.json({ question: newQuestion })
  } catch (error) {
    console.error('Admin questions POST error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
