import { createClient } from '@/lib/supabase/server'
import Leaderboard from '@/components/Leaderboard'
import ExamCards from '@/components/ExamCards'
import HeroSection from '@/components/HeroSection'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  const { data: exams } = await supabase.from('exams').select('id, name, exam_mode, duration_minutes, created_at, is_published, sort_order').order('sort_order')

  const practiceExams = exams?.filter(e => e.exam_mode !== 'OFFICIAL') || []
  const visibleExams = exams?.filter(e => e.exam_mode !== 'OFFICIAL' || e.is_published) || []

  return (
    <div>
      {/* Hero + Ranking */}
      <section>
        <HeroSection>
          <Leaderboard exams={practiceExams} />
        </HeroSection>
      </section>

      {/* Exam cards */}
      <section
        id="exams"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative z-10 pb-10"
      >
        <ExamCards initialExams={visibleExams} />
      </section>

      {/* Features */}
      <section className="bg-white dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              주요 기능
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              효율적인 시험 준비를 위한 핵심 기능들
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 max-w-5xl mx-auto">
            <div className="text-center p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1.5">
                CBT 모의고사
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                제한 시간 내
                <br />
                객관식 문제 풀이
              </p>
            </div>

            <div className="text-center p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-purple-600 dark:text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1.5">
                실시간 랭킹
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                오늘/어제 Top5와
                <br />내 순위 확인
              </p>
            </div>

            <div className="text-center p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1.5">
                자동 채점
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                제출 즉시 점수와
                <br />
                과목별 성적 확인
              </p>
            </div>

            <div className="text-center p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-orange-600 dark:text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1.5">
                오답 노트
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                틀린 문제와 해설로
                <br />
                약점 집중 학습
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
