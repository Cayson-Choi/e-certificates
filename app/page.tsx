import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Leaderboard from '@/components/Leaderboard'

export const revalidate = 60

function getStaticSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const examCardStyles = [
  'from-blue-300 to-blue-500',
  'from-rose-300 to-rose-500',
  'from-emerald-300 to-emerald-500',
  'from-purple-300 to-purple-500',
  'from-amber-300 to-amber-500',
  'from-teal-300 to-teal-500',
  'from-pink-300 to-pink-500',
  'from-indigo-300 to-indigo-500',
  'from-orange-300 to-orange-500',
  'from-cyan-300 to-cyan-500',
]

const examCardDescriptions = [
  '기초부터 탄탄하게',
  '한 단계 더 깊이있게',
  '전문가 수준 도전',
  '안전의 첫걸음',
  '실무 역량 강화',
]

const floatClasses = [
  'float-animation',
  'float-animation-delay',
  'float-animation-delay2',
]

export default async function Home() {
  const supabase = getStaticSupabase()
  const { data: exams } = await supabase.from('exams').select('id, name, exam_mode, duration_minutes, created_at, creator_name, creator_title').order('id')

  const practiceExams = exams?.filter(e => e.exam_mode !== 'OFFICIAL') || []

  return (
    <div>
      {/* Hero + Ranking */}
      <section className="relative overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-bg.png')" }}
        />
        {/* Light overlay */}
        <div className="absolute inset-0" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 lg:pt-14 pb-16 lg:pb-20">
          {/* Compact hero text */}
          <div className="text-center mb-10">
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white mb-3 leading-tight tracking-tight hero-text-stroke">
              화성폴리텍대학{' '}
              <span className="text-sky-300 font-black">
                스마트 전기과
              </span>
            </h1>
            <p className="text-base text-white leading-relaxed hero-subtext-stroke">
              모의고사를 풀고, 즉시 채점하고, 랭킹으로 경쟁하세요.
            </p>
          </div>

          {/* Leaderboard */}
          <Leaderboard exams={practiceExams} />
        </div>
      </section>

      {/* Exam cards */}
      <section
        id="exams"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 pb-16"
      >
        <div
          className={`grid gap-4 max-w-5xl mx-auto ${
            (exams?.length || 0) <= 3
              ? 'md:grid-cols-3'
              : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
          }`}
        >
          {exams?.map((exam, index) => (
            <Link
              key={exam.id}
              href={`/exam/${exam.id}`}
              className={`bg-gradient-to-br ${examCardStyles[index % examCardStyles.length]} rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 ${floatClasses[index % floatClasses.length]} group`}
            >
              <div className="flex items-center justify-end gap-2 mb-3">
                {exam.exam_mode === 'OFFICIAL' && (
                  <span className="text-xs bg-red-500/80 px-2 py-0.5 rounded-full font-semibold">
                    공식 시험
                  </span>
                )}
                <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                  {exam.duration_minutes || 60}분
                </span>
              </div>
              <h3 className="text-lg font-bold mb-1">{exam.name}</h3>
              <p className="text-xs text-white/70 mb-3">
                {exam.exam_mode === 'OFFICIAL' && exam.creator_name
                  ? `${exam.creator_name}${exam.creator_title ? `(${exam.creator_title})` : ''}`
                  : examCardDescriptions[index % examCardDescriptions.length]}
              </p>
              <div className="flex items-center text-xs font-medium text-white/90 group-hover:text-white transition-colors">
                시험 응시하기
                <svg
                  className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-white dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              주요 기능
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              효율적인 시험 준비를 위한 핵심 기능들
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center p-6 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
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
                60분 제한 시간 내
                <br />
                객관식 문제 풀이
              </p>
            </div>

            <div className="text-center p-6 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
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

            <div className="text-center p-6 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
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

            <div className="text-center p-6 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
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
