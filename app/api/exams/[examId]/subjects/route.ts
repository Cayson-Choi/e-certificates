import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const supabase = await createClient()
    const { examId } = await params

    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('exam_id', examId)
      .order('order_no')

    if (error) {
      return NextResponse.json({ error: '과목을 불러올 수 없습니다' }, { status: 500 })
    }

    return NextResponse.json(subjects || [])
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
