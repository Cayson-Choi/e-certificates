import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Leaderboard from '@/components/Leaderboard'

export default async function Home() {
  const supabase = await createClient()

  // 시험 목록 조회
  const { data: exams } = await supabase
    .from('exams')
    .select('*')
    .order('id')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            전기 자격시험 CBT
          </h1>
          <p className="text-lg text-gray-600">
            온라인 모의고사로 시험을 준비하세요
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
          {exams?.map((exam) => (
            <Link
              key={exam.id}
              href={`/exam/${exam.id}`}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-8 text-center"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {exam.name}
              </h2>
              <p className="text-gray-600 mb-4">모의고사</p>
              <div className="text-blue-600 font-medium">시험 시작 →</div>
            </Link>
          ))}
        </div>

        {/* 랭킹 섹션 */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            📊 실시간 랭킹
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {exams?.map((exam) => (
              <Leaderboard key={exam.id} examId={exam.id} examName={exam.name} />
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            주요 기능
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-bold text-lg mb-2">🎯 실전 모의고사</h3>
              <p className="text-gray-600">
                실제 시험과 동일한 환경에서 60분 제한 시험
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-bold text-lg mb-2">📊 실시간 랭킹</h3>
              <p className="text-gray-600">
                오늘/어제 Top5 랭킹과 내 순위 확인
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-bold text-lg mb-2">💯 자동 채점</h3>
              <p className="text-gray-600">
                제출 즉시 점수와 과목별 성적 확인
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-bold text-lg mb-2">📝 학습 기록</h3>
              <p className="text-gray-600">
                마이페이지에서 응시 기록과 통계 관리
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
