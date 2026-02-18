import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ResetAttemptsSection from '@/components/ResetAttemptsSection'
import DuplicateQuestionsSection from '@/components/DuplicateQuestionsSection'

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            👨‍💼 관리자 페이지
          </h1>
          <p className="text-gray-600 dark:text-gray-400">시스템 관리 및 설정</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">전체 회원</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {totalUsers || 0}명
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">전체 문제</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {totalQuestions || 0}개
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">총 응시</div>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {totalAttempts || 0}회
            </div>
          </div>
        </div>

        {/* 시험별 문제 수 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8 border dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 dark:text-white">📚 시험별 문제 현황</h2>
          <div className="space-y-3">
            {exams?.map((exam) => (
              <ExamQuestionCount key={exam.id} examId={exam.id} examName={exam.name} />
            ))}
          </div>
        </div>

        {/* 중복 문제 관리 */}
        <DuplicateQuestionsSection />

        {/* 응시 기록 초기화 */}
        <ResetAttemptsSection exams={exams || []} />

        {/* 관리 메뉴 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Link
            href="/admin/questions"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border dark:border-gray-700"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📝</span>
              </div>
              <div>
                <h3 className="font-bold text-lg dark:text-white">문제 관리</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  문제 추가, 수정, 삭제
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/users"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border dark:border-gray-700"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <h3 className="font-bold text-lg dark:text-white">회원 관리</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
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
            className="inline-block px-6 py-3 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600"
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

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name')
    .eq('exam_id', examId)
    .order('order_no')

  const subjectCounts = await Promise.all(
    (subjects || []).map(async (s) => {
      const { count: cnt } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('exam_id', examId)
        .eq('subject_id', s.id)
      return { name: s.name, count: cnt || 0 }
    })
  )

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div className="flex justify-between items-center">
        <span className="font-medium dark:text-gray-200">{examName}</span>
        <span className="text-blue-600 dark:text-blue-400 font-semibold">{count || 0}개</span>
      </div>
      {subjectCounts.length > 0 && (
        <div className="mt-2 ml-4 space-y-1">
          {subjectCounts.map((sc) => (
            <div key={sc.name} className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
              <span>{sc.name}</span>
              <span>{sc.count}개</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
