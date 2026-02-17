import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Leaderboard from '@/components/Leaderboard'

export const dynamic = 'force-dynamic'

const examCardStyles = [
  'from-blue-500 to-blue-700',
  'from-purple-500 to-purple-700',
  'from-amber-500 to-amber-700',
  'from-emerald-500 to-emerald-700',
  'from-rose-500 to-rose-700',
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

function ExamIcon({ index }: { index: number }) {
  const icons = [
    // Lightning
    <path
      key="a"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />,
    // Lightbulb
    <path
      key="b"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    />,
    // Flask
    <path
      key="c"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
    />,
    // Fire
    <path
      key="d"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
    />,
    // Gear
    <>
      <path
        key="e1"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        key="e2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </>,
  ]

  return (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {icons[index % icons.length]}
    </svg>
  )
}

export default async function Home() {
  const supabase = await createClient()
  const { data: exams } = await supabase.from('exams').select('*').order('id')

  return (
    <div>
      {/* Hero + Ranking (always dark) */}
      <section className="hero-ranking-gradient relative overflow-hidden">
        <div className="hero-glow bg-yellow-500 opacity-[0.15] top-20 left-1/4" />
        <div className="hero-glow bg-blue-500 opacity-[0.15] bottom-20 right-1/4" />
        <div className="hero-glow bg-purple-500 opacity-[0.1] top-1/2 left-1/2 -translate-x-1/2" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 lg:pt-14 pb-16 lg:pb-20">
          {/* Compact hero text */}
          <div className="text-center mb-10">
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white mb-3 leading-tight tracking-tight">
              화성폴리텍대학{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                스마트 전기과 CBT
              </span>
            </h1>
            <p className="text-base text-gray-400 leading-relaxed">
              모의고사를 풀고, 즉시 채점하고, 랭킹으로 경쟁하세요.
            </p>
          </div>

          {/* Leaderboard */}
          <Leaderboard exams={exams || []} />
        </div>
      </section>

      {/* Exam cards */}
      <section
        id="exams"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 pb-16"
      >
        <div
          className={`grid gap-5 max-w-4xl mx-auto ${
            (exams?.length || 0) <= 3
              ? 'md:grid-cols-3'
              : 'md:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {exams?.map((exam, index) => (
            <Link
              key={exam.id}
              href={`/exam/${exam.id}`}
              className={`bg-gradient-to-br ${examCardStyles[index % examCardStyles.length]} rounded-2xl p-7 text-white shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 ${floatClasses[index % floatClasses.length]} group`}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <ExamIcon index={index} />
                </div>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                  60분
                </span>
              </div>
              <h3 className="text-xl font-bold mb-1">{exam.name}</h3>
              <p className="text-sm text-white/70 mb-5">
                {examCardDescriptions[index % examCardDescriptions.length]}
              </p>
              <div className="flex items-center text-sm font-medium text-white/90 group-hover:text-white transition-colors">
                시험 응시하기
                <svg
                  className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
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
