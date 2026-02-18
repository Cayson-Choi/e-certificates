import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// 중복 문제 조회
export async function GET() {
  try {
    const supabase = await createClient()

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

    // 모든 문제 조회
    const { data: questions, error } = await supabase
      .from('questions')
      .select('id, question_code, exam_id, subject_id, question_text, choice_1, choice_2, choice_3, choice_4, answer, created_at')
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: '문제 조회 실패' }, { status: 500 })
    }

    // 시험+과목+문제텍스트+선택지+정답 모두 동일한 경우만 중복
    const groupMap = new Map<string, typeof questions>()
    for (const q of questions || []) {
      const key = `${q.exam_id}:${q.subject_id}:${q.question_text}:${q.choice_1}:${q.choice_2}:${q.choice_3}:${q.choice_4}:${q.answer}`
      if (!groupMap.has(key)) {
        groupMap.set(key, [])
      }
      groupMap.get(key)!.push(q)
    }

    // 2개 이상인 그룹만 추출 (첫 번째는 원본, 나머지는 중복)
    const duplicateGroups: {
      original: { id: number; question_code: string; created_at: string }
      duplicates: { id: number; question_code: string; created_at: string }[]
    }[] = []

    for (const group of groupMap.values()) {
      if (group.length > 1) {
        const [original, ...dupes] = group
        duplicateGroups.push({
          original: { id: original.id, question_code: original.question_code, created_at: original.created_at },
          duplicates: dupes.map((d) => ({ id: d.id, question_code: d.question_code, created_at: d.created_at })),
        })
      }
    }

    const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.duplicates.length, 0)

    return NextResponse.json({
      groups: duplicateGroups.length,
      total_duplicates: totalDuplicates,
      duplicateGroups,
    })
  } catch (error) {
    console.error('Duplicates GET error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// 중복 문제 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

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

    const { ids } = await request.json() as { ids: number[] }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '삭제할 문제 ID가 필요합니다' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // 응시에 사용된 문제인지 확인
    const { data: usedQuestions } = await adminSupabase
      .from('attempt_questions')
      .select('question_id')
      .in('question_id', ids)

    const usedIds = new Set((usedQuestions || []).map((q) => q.question_id))
    const safeIds = ids.filter((id) => !usedIds.has(id))
    const skippedCount = ids.length - safeIds.length

    let deletedCount = 0
    if (safeIds.length > 0) {
      const { error: deleteError } = await adminSupabase
        .from('questions')
        .delete()
        .in('id', safeIds)

      if (deleteError) {
        return NextResponse.json({ error: `삭제 실패: ${deleteError.message}` }, { status: 500 })
      }
      deletedCount = safeIds.length
    }

    return NextResponse.json({
      deleted: deletedCount,
      skipped: skippedCount,
      message: skippedCount > 0
        ? `${deletedCount}개 삭제, ${skippedCount}개는 응시에 사용되어 건너뜀`
        : `${deletedCount}개 중복 문제가 삭제되었습니다`,
    })
  } catch (error) {
    console.error('Duplicates DELETE error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
