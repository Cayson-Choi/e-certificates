import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// 문제 수정
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

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
    if (!question_text || !choice_1 || !choice_2 || !choice_3 || !choice_4) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다' }, { status: 400 })
    }

    if (!answer || answer < 1 || answer > 4) {
      return NextResponse.json({ error: '정답은 1~4 중 하나여야 합니다' }, { status: 400 })
    }

    // 문제 코드 중복 체크 (변경된 경우)
    if (question_code) {
      const { data: existing } = await supabase
        .from('questions')
        .select('id')
        .eq('question_code', question_code)
        .neq('id', id)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: '이미 존재하는 문제 코드입니다' },
          { status: 400 }
        )
      }
    }

    // 문제 수정 (모든 필드 업데이트 가능)
    const updateData: any = {
      question_text,
      choice_1,
      choice_2,
      choice_3,
      choice_4,
      answer,
      explanation: explanation || '',
      image_url: image_url || null,
    }

    // 문제 코드, 시험, 과목도 변경 가능
    if (question_code) updateData.question_code = question_code
    if (exam_id) updateData.exam_id = exam_id
    if (subject_id) updateData.subject_id = subject_id

    const { data: updatedQuestion, error: updateError } = await supabase
      .from('questions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Question update error:', updateError)
      return NextResponse.json({ error: '문제 수정 실패' }, { status: 500 })
    }

    return NextResponse.json({ question: updatedQuestion })
  } catch (error) {
    console.error('Admin question PUT error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// 문제 삭제
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

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

    // 문제가 시험에 사용 중인지 확인
    const { count } = await supabase
      .from('attempt_questions')
      .select('*', { count: 'exact', head: true })
      .eq('question_id', id)

    if (count && count > 0) {
      return NextResponse.json(
        { error: '이미 시험에 사용된 문제는 삭제할 수 없습니다' },
        { status: 400 }
      )
    }

    // 문제 삭제
    const { error: deleteError } = await supabase
      .from('questions')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Question delete error:', deleteError)
      return NextResponse.json({ error: '문제 삭제 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin question DELETE error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
