import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const supabase = await createClient()
    const { examId } = await params

    // 전체 활성 문제 수
    const { count, error } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('exam_id', examId)
      .eq('is_active', true)

    if (error) {
      return NextResponse.json({ error: '조회 실패' }, { status: 500 })
    }

    // 과목별 문제 수
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id')
      .eq('exam_id', examId)
      .order('order_no')

    const bySubject: Record<number, number> = {}
    if (subjects) {
      for (const s of subjects) {
        const { count: sCount } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('exam_id', examId)
          .eq('subject_id', s.id)
          .eq('is_active', true)
        bySubject[s.id] = sCount || 0
      }
    }

    return NextResponse.json({ count: count || 0, bySubject })
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
