'use client'

import { useEffect, useState } from 'react'

interface LeaderboardProps {
  examId: number
  examName: string
}

export default function Leaderboard({ examId, examName }: LeaderboardProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()
  }, [examId])

  const loadLeaderboard = async () => {
    try {
      const res = await fetch(`/api/home/leaderboard?exam_id=${examId}`)
      if (res.ok) {
        const data = await res.json()
        setData(data)
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-bold text-lg mb-4">{examName} 랭킹</h3>
        <div className="text-center text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) return null

    if (status === 'NEW') {
      return (
        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-bold">
          NEW
        </span>
      )
    } else if (status === '▲') {
      return <span className="text-green-600 font-bold">▲</span>
    } else if (status === '▼') {
      return <span className="text-red-600 font-bold">▼</span>
    } else if (status === '=') {
      return <span className="text-gray-400">-</span>
    }
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="font-bold text-lg mb-4">{examName} 랭킹</h3>

      {/* 내 순위 */}
      {data.my_rank && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-blue-900 font-medium">내 순위</span>
            <div className="text-right">
              <div className="text-xl font-bold text-blue-600">{data.my_rank}위</div>
              <div className="text-sm text-blue-700">{data.my_score}점</div>
            </div>
          </div>
        </div>
      )}

      {/* 오늘 Top5 */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">오늘 Top 5</h4>
        {data.today_top5.length > 0 ? (
          <div className="space-y-2">
            {data.today_top5.map((user: any) => (
              <div
                key={user.rank}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                      user.rank === 1
                        ? 'bg-yellow-400 text-yellow-900'
                        : user.rank === 2
                        ? 'bg-gray-300 text-gray-700'
                        : user.rank === 3
                        ? 'bg-orange-400 text-orange-900'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {user.rank}
                  </div>
                  <div>
                    <div className="font-medium text-sm">
                      {user.name} ({user.affiliation})
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(user.status)}
                  <div className="text-right">
                    <div className="font-bold text-blue-600">{user.score}점</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">아직 기록이 없습니다</div>
        )}
      </div>

      {/* 어제 Top5 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">어제 Top 5</h4>
        {data.yesterday_top5.length > 0 ? (
          <div className="space-y-2">
            {data.yesterday_top5.map((user: any) => (
              <div
                key={user.rank}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold text-sm">
                    {user.rank}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{user.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-600">{user.score}점</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">기록이 없습니다</div>
        )}
      </div>
    </div>
  )
}
