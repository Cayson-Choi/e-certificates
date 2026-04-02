import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

// 관리자 권한 확인 헬퍼
async function checkAdmin(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return null
  return user
}

// GET: 공식 시험 목록 조회
export async function GET() {
  try {
    const supabase = await createClient()
    const user = await checkAdmin(supabase)
    if (!user) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { data: exams, error } = await supabase
      .from('exams')
      .select(`
        id, name, exam_mode, password, duration_minutes, created_at,
        is_published,
        subjects (id, name, order_no)
      `)
      .eq('exam_mode', 'OFFICIAL')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Official exams fetch error:', error)
      return NextResponse.json({ error: '조회 실패' }, { status: 500 })
    }

    // 각 시험의 문제 수와 응시자 수 추가
    const examsWithStats = await Promise.all(
      (exams || []).map(async (exam) => {
        const { count: questionCount } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('exam_id', exam.id)
          .eq('is_active', true)

        const { count: attemptCount } = await supabase
          .from('attempts')
          .select('*', { count: 'exact', head: true })
          .eq('exam_id', exam.id)
          .eq('status', 'SUBMITTED')

        return {
          ...exam,
          question_count: questionCount || 0,
          attempt_count: attemptCount || 0,
        }
      })
    )

    return NextResponse.json(examsWithStats)
  } catch (error) {
    console.error('Official exams error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// POST: 새 공식 시험 생성
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const user = await checkAdmin(supabase)
    if (!user) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { name, password, duration_minutes } = await request.json()

    if (!name || !password) {
      return NextResponse.json(
        { error: '시험 이름과 비밀번호가 필요합니다' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // 1. exams 테이블에 삽입
    const { data: newExam, error: examError } = await adminClient
      .from('exams')
      .insert({
        name,
        exam_mode: 'OFFICIAL',
        password,
        duration_minutes: duration_minutes || 60,
      })
      .select('id')
      .single()

    if (examError || !newExam) {
      console.error('Exam creation error:', examError)
      return NextResponse.json({ error: '시험 생성 실패: ' + examError?.message }, { status: 500 })
    }

    // 2. 과목 1개 자동 생성 (시험명과 동일)
    const { error: subjectError } = await adminClient
      .from('subjects')
      .insert({
        exam_id: newExam.id,
        name,
        questions_per_attempt: 1,
        order_no: 1,
      })

    if (subjectError) {
      console.error('Subject creation error:', subjectError)
      await adminClient.from('exams').delete().eq('id', newExam.id)
      return NextResponse.json({ error: '과목 생성 실패: ' + subjectError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      exam_id: newExam.id,
      message: '공식 시험이 생성되었습니다',
    })
  } catch (error) {
    console.error('Create official exam error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// PUT: 공식 시험 수정
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const user = await checkAdmin(supabase)
    if (!user) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { exam_id, name, password, duration_minutes, is_published } = await request.json()

    if (!exam_id) {
      return NextResponse.json({ error: 'exam_id가 필요합니다' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (password !== undefined) updateData.password = password
    if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes
    if (is_published !== undefined) updateData.is_published = is_published

    const { error } = await adminClient
      .from('exams')
      .update(updateData)
      .eq('id', exam_id)
      .eq('exam_mode', 'OFFICIAL')

    if (error) {
      console.error('Exam update error:', error)
      return NextResponse.json({ error: '수정 실패: ' + error.message }, { status: 500 })
    }

    if (is_published !== undefined) {
      revalidatePath('/')
    }

    return NextResponse.json({ success: true, message: '수정되었습니다' })
  } catch (error) {
    console.error('Update official exam error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// DELETE: 공식 시험 삭제
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const user = await checkAdmin(supabase)
    if (!user) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { exam_id } = await request.json()

    if (!exam_id) {
      return NextResponse.json({ error: 'exam_id가 필요합니다' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 응시 기록이 있는지 확인
    const { count: attemptCount } = await adminClient
      .from('attempts')
      .select('*', { count: 'exact', head: true })
      .eq('exam_id', exam_id)

    if (attemptCount && attemptCount > 0) {
      return NextResponse.json(
        { error: `이미 ${attemptCount}명이 응시한 시험은 삭제할 수 없습니다` },
        { status: 400 }
      )
    }

    // 문제 삭제
    await adminClient.from('questions').delete().eq('exam_id', exam_id)

    // 과목 삭제
    await adminClient.from('subjects').delete().eq('exam_id', exam_id)

    // 시험 삭제
    const { error } = await adminClient
      .from('exams')
      .delete()
      .eq('id', exam_id)
      .eq('exam_mode', 'OFFICIAL')

    if (error) {
      console.error('Exam delete error:', error)
      return NextResponse.json({ error: '삭제 실패: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: '삭제되었습니다' })
  } catch (error) {
    console.error('Delete official exam error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
