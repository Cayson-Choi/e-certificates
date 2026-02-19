'use client'

import { useEffect, useState } from 'react'

interface Exam {
  id: number
  name: string
}

interface LeaderboardEntry {
  rank: number
  user_id: string
  name: string
  affiliation: string
  score: number
  submitted_at: string
  status?: string | null
  rank_change?: number | null
}

interface LeaderboardData {
  exam_id: number
  today_top5: LeaderboardEntry[]
  yesterday_top5: LeaderboardEntry[]
  my_rank: number | null
  my_score: number | null
}

interface LeaderboardProps {
  exams: Exam[]
}

export default function Leaderboard({ exams }: LeaderboardProps) {
  const [activeExamId, setActiveExamId] = useState(exams[0]?.id || 0)
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeExamId) return

    const fetchLeaderboard = (showLoading: boolean) => {
      if (showLoading) setLoading(true)
      fetch(`/api/home/leaderboard?exam_id=${activeExamId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((d) => setData(d))
        .catch(() => setData(null))
        .finally(() => { if (showLoading) setLoading(false) })
    }

    fetchLeaderboard(true)
    const interval = setInterval(() => fetchLeaderboard(false), 10000)
    return () => clearInterval(interval)
  }, [activeExamId])

  if (exams.length === 0) return null

  const topScore = data?.today_top5?.[0]?.score ?? 0
  const gapToFirst =
    data?.my_score != null && topScore > 0 ? topScore - data.my_score : null

  const getRankBadge = (rank: number) => {
    if (rank === 1)
      return 'bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 text-yellow-950 shadow-md shadow-amber-500/30'
    if (rank === 2)
      return 'bg-gradient-to-br from-slate-100 via-slate-300 to-slate-400 text-slate-700 shadow-md shadow-slate-300/30'
    if (rank === 3)
      return 'bg-gradient-to-br from-amber-600 via-amber-700 to-orange-800 text-amber-100 shadow-md shadow-amber-700/30'
    return 'bg-gray-700/90 text-gray-400'
  }

  const getStatusBadge = (
    status: string | null | undefined,
    rankChange: number | null | undefined
  ) => {
    if (!status) return null

    if (status === 'NEW') {
      return (
        <span className="text-xs font-bold text-orange-400 bg-orange-500/20 px-2 py-0.5 rounded-full border border-orange-500/30">
          NEW
        </span>
      )
    }
    if (status === '▲') {
      return (
        <span className="text-green-400 font-bold text-sm flex items-center gap-0.5">
          <svg
            className="w-3.5 h-3.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          {rankChange}
        </span>
      )
    }
    if (status === '▼') {
      return (
        <span className="text-red-400 font-bold text-sm flex items-center gap-0.5">
          <svg
            className="w-3.5 h-3.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          {Math.abs(rankChange || 0)}
        </span>
      )
    }
    if (status === '=') {
      return <span className="text-gray-500 text-sm">-</span>
    }
    return null
  }

  const first = data?.today_top5?.[0]
  const rest = data?.today_top5?.slice(1) || []

  const [restIndex, setRestIndex] = useState(0)
  const [yesterdayIndex, setYesterdayIndex] = useState(0)
  const yesterday = data?.yesterday_top5 || []

  useEffect(() => {
    if (rest.length <= 1) return
    const timer = setInterval(() => {
      setRestIndex((prev) => (prev + 1) % rest.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [rest.length])

  useEffect(() => {
    if (yesterday.length <= 1) return
    const timer = setInterval(() => {
      setYesterdayIndex((prev) => (prev + 1) % yesterday.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [yesterday.length])

  return (
    <>
      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-8">
        {exams.map((exam) => (
          <button
            key={exam.id}
            onClick={() => setActiveExamId(exam.id)}
            className={`px-5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              activeExamId === exam.id
                ? 'bg-gray-900 text-white border-gray-600 shadow-lg'
                : 'bg-gray-900/90 text-gray-400 hover:text-white hover:bg-gray-800 border-gray-700 shadow-lg'
            }`}
          >
            {exam.name}
          </button>
        ))}
      </div>

      {/* Ranking header */}
      <div className="text-center mb-6 -mt-4 lg:mt-0">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-900/90 border border-yellow-500/30 rounded-full mb-4 shadow-lg">
          <svg
            className="w-4 h-4 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          <span className="text-yellow-300 text-sm font-semibold">
            실시간 순위
          </span>
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </div>
        <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-2 mt-10 lg:mt-6 hero-text-stroke">
          오늘의 <span className="text-yellow-400 rank-pulse mx-2" style={{ fontFamily: "'Nanum Brush Script', cursive", fontSize: '1.8em' }}>1등</span>은 누구?
        </h2>
        <p className="text-white hero-subtext-stroke">지금 도전해서 이름을 올리세요</p>
      </div>

      <div className="mb-12 lg:mb-[5.5rem]" />
      {/* Content */}
      {loading ? (
        <div className="text-center text-gray-400 py-16">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-yellow-400 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">랭킹 불러오는 중...</p>
        </div>
      ) : !data ? (
        <div className="text-center text-gray-400 py-16">
          <p>데이터를 불러올 수 없습니다</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-5 max-w-6xl mx-auto items-start">
          {/* Left: Today Top 5 (3 cols) */}
          <div className="lg:col-span-3">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-xl">
              {first ? (
                <>
                  {/* 1st place highlight */}
                  <div className="bg-gradient-to-r from-yellow-900 via-gray-900 to-yellow-900 rounded-t-2xl p-3 lg:p-5 gold-glow relative">
                    <div className="absolute -top-6 -left-3 lg:-top-8 lg:-left-4">
                      <span className="crown-bounce inline-block text-4xl lg:text-6xl">
                        &#x1F451;
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 lg:gap-4">
                        <div className="w-11 h-11 lg:w-14 lg:h-14 bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/40 pulse-gold">
                          <span className="text-yellow-900 text-lg lg:text-xl font-black">
                            1
                          </span>
                        </div>
                        <div>
                          <div className="text-lg lg:text-xl font-bold text-white">
                            {first.name}
                          </div>
                          <div className="text-xs lg:text-sm text-yellow-300/70">
                            {first.affiliation}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 lg:gap-3">
                        {getStatusBadge(first.status, first.rank_change)}
                        <div className="text-2xl lg:text-3xl font-black text-yellow-400">
                          {first.score}
                          <span className="text-sm lg:text-lg text-yellow-400/70">점</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2nd~5th rotating */}
                  {rest.length > 0 && (() => {
                    const user = rest[restIndex % rest.length]
                    return (
                      <div key={user.rank} className="px-3 pb-1.5 pt-1 lg:px-4 lg:pb-3 lg:pt-2 board-flip-wrap">
                        <div className="board-flip rounded-xl p-1.5 lg:p-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2.5 lg:gap-3">
                            <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl flex items-center justify-center ${getRankBadge(user.rank)}`}>
                              <span className="text-xs lg:text-sm font-black">{user.rank}</span>
                            </div>
                            <div>
                              <div className={`text-base font-bold ${user.rank <= 3 ? 'text-white' : 'text-gray-300'}`}>{user.name}</div>
                              <div className={`text-xs ${user.rank <= 3 ? 'text-gray-400' : 'text-gray-500'}`}>{user.affiliation}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 lg:gap-3">
                            {getStatusBadge(user.status, user.rank_change)}
                            <span className={`text-lg lg:text-xl font-bold ${user.rank <= 3 ? 'text-white' : 'text-gray-300'}`}>
                              {user.score}<span className={`text-xs lg:text-sm ${user.rank <= 3 ? 'text-gray-400' : 'text-gray-500'}`}>점</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </>
              ) : (
                <div className="p-5 text-center">
                  <svg
                    className="w-10 h-10 mx-auto mb-2 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-gray-500">아직 오늘 기록이 없습니다</p>
                  <p className="text-gray-600 text-sm mt-1">
                    첫 번째 도전자가 되어보세요!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: My rank + Yesterday Top 5 (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* My rank card */}
            {data.my_rank != null && data.my_score != null ? (
              <div className="bg-gradient-to-br from-blue-900 to-gray-900 border border-blue-500/40 rounded-2xl p-3 lg:p-4 shadow-xl">
                <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
                  내 순위
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 lg:w-10 lg:h-10 bg-blue-500/20 border-2 border-blue-400/50 rounded-lg flex items-center justify-center">
                      <span className="text-blue-400 text-sm font-black">
                        {data.my_rank}
                      </span>
                    </div>
                    <div className="text-sm lg:text-base font-bold text-white">
                      {data.my_rank}위
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-blue-400">
                      {data.my_score}
                      <span className="text-xs text-blue-400/60">점</span>
                    </div>
                    {gapToFirst != null && gapToFirst > 0 && (
                      <div className="text-xs text-blue-300/50 mt-0.5">
                        1등까지 {gapToFirst}점!
                      </div>
                    )}
                    {gapToFirst === 0 && (
                      <div className="text-xs text-yellow-400/70 mt-0.5">
                        현재 1등!
                      </div>
                    )}
                  </div>
                </div>
                <a
                  href="#exams"
                  className="mt-2 lg:mt-3 w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-all"
                >
                  다시 도전하기
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </a>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-blue-900 to-gray-900 border border-blue-500/40 rounded-2xl p-3 lg:p-4 shadow-xl">
                <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
                  내 순위
                </div>
                <p className="text-gray-400 text-xs mb-2">
                  아직 오늘 응시 기록이 없습니다
                </p>
                <a
                  href="#exams"
                  className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition-all"
                >
                  도전하기
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </a>
              </div>
            )}

            {/* Yesterday Top 5 */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-2.5 lg:p-3 shadow-xl">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                어제 Top 5
              </div>
              {yesterday.length > 0 ? (() => {
                const user = yesterday[yesterdayIndex % yesterday.length]
                return (
                  <div key={user.rank} className="board-flip-wrap">
                    <div className="board-flip flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center ${user.rank === 1 ? 'bg-amber-400/20' : user.rank === 2 ? 'bg-slate-300/20' : user.rank === 3 ? 'bg-amber-700/20' : 'bg-white/5'}`}>
                        <span className={`text-xs font-bold ${user.rank === 1 ? 'text-amber-400' : user.rank === 2 ? 'text-slate-300' : user.rank === 3 ? 'text-amber-600' : 'text-gray-500'}`}>{user.rank}</span>
                      </div>
                      <span className={`text-sm ${user.rank <= 3 ? 'text-gray-300' : 'text-gray-400'}`}>{user.name}</span>
                    </div>
                    <span className={`text-sm font-semibold ${user.rank <= 3 ? 'text-gray-400' : 'text-gray-500'}`}>{user.score}점</span>
                    </div>
                  </div>
                )
              })() : (
                <p className="text-gray-500 text-sm text-center py-4">
                  기록이 없습니다
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
