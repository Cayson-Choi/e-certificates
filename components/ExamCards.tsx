'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Exam {
  id: number
  name: string
  exam_mode: string
  duration_minutes: number
  creator_name: string | null
  creator_title: string | null
  is_published: boolean
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

export default function ExamCards({ initialExams }: { initialExams: Exam[] }) {
  const [exams, setExams] = useState(initialExams)

  useEffect(() => {
    const supabase = createClient()

    const fetchExams = () => {
      supabase
        .from('exams')
        .select('id, name, exam_mode, duration_minutes, creator_name, creator_title, is_published, sort_order')
        .order('sort_order')
        .then(({ data }) => {
          if (data) {
            setExams(data.filter(e => e.exam_mode !== 'OFFICIAL' || e.is_published))
          }
        })
    }

    const interval = setInterval(fetchExams, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className={`grid gap-4 max-w-5xl mx-auto ${
        exams.length <= 3
          ? 'grid-cols-2 md:grid-cols-3'
          : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      }`}
    >
      {exams.map((exam, index) => (
        <Link
          key={exam.id}
          href={`/exam/${exam.id}`}
          className={`bg-gradient-to-br ${examCardStyles[index % examCardStyles.length]} rounded-lg lg:rounded-xl p-1.5 lg:p-4 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 ${floatClasses[index % floatClasses.length]} group`}
        >
          <div className="flex items-center justify-end gap-1 mb-0.5 lg:mb-2">
            {exam.exam_mode === 'OFFICIAL' && (
              <span className="text-[10px] lg:text-xs bg-red-500/80 px-1.5 lg:px-2 py-0.5 rounded-full font-semibold">
                공식 시험
              </span>
            )}
            <span className="text-[10px] lg:text-xs bg-white/20 px-1.5 lg:px-2.5 py-0.5 rounded-full backdrop-blur-sm">
              {exam.duration_minutes || 60}분
            </span>
          </div>
          <h3 className="text-sm lg:text-base font-bold mb-0.5 lg:mb-1 whitespace-nowrap">
            {exam.name.startsWith('전기') ? (
              <>전기<br className="lg:hidden" />{exam.name.slice(2)}</>
            ) : exam.name}
          </h3>
          <p className="text-[10px] lg:text-xs text-white/70 mb-0.5 lg:mb-2">
            {exam.exam_mode === 'OFFICIAL' && exam.creator_name
              ? `${exam.creator_name}${exam.creator_title ? `(${exam.creator_title})` : ''}`
              : examCardDescriptions[index % examCardDescriptions.length]}
          </p>
          <div className="flex items-center text-[10px] lg:text-xs font-medium text-white/90 group-hover:text-white transition-colors">
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
  )
}
