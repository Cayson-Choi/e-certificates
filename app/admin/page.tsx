import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = await createClient()

  // 로그인 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/admin')
  }

  // 관리자 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/')
  }

  // 통계 데이터 조회
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const { count: totalQuestions } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })

  const { count: totalAttempts } = await supabase
    .from('attempts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'SUBMITTED')

  const { data: exams } = await supabase
    .from('exams')
    .select('id, name')
    .order('id')

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            👨‍💼 관리자 페이지
          </h1>
          <p className="text-gray-600">시스템 관리 및 설정</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">전체 회원</div>
            <div className="text-3xl font-bold text-blue-600">
              {totalUsers || 0}명
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">전체 문제</div>
            <div className="text-3xl font-bold text-green-600">
              {totalQuestions || 0}개
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-600 mb-1">총 응시</div>
            <div className="text-3xl font-bold text-purple-600">
              {totalAttempts || 0}회
            </div>
          </div>
        </div>

        {/* 시험별 문제 수 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">📚 시험별 문제 현황</h2>
          <div className="space-y-3">
            {exams?.map((exam) => (
              <ExamQuestionCount key={exam.id} examId={exam.id} examName={exam.name} />
            ))}
          </div>
        </div>

        {/* 관리 메뉴 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Link
            href="/admin/questions"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📝</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">문제 관리</h3>
                <p className="text-sm text-gray-600">
                  문제 추가, 수정, 삭제
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/users"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">회원 관리</h3>
                <p className="text-sm text-gray-600">
                  회원 목록, 권한 관리
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* 하단 버튼 */}
        <div>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  )
}

async function ExamQuestionCount({ examId, examName }: { examId: number; examName: string }) {
  const supabase = await createClient()

  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('exam_id', examId)

  return (
    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
      <span className="font-medium">{examName}</span>
      <span className="text-blue-600 font-semibold">{count || 0}개</span>
    </div>
  )
}
