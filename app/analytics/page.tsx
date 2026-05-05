'use client'

import { useEffect, useState } from 'react'

export default function AnalyticsDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading Analytics...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">📊 Analytics Dashboard</h1>
            <p className="text-sm text-slate-500">Overview of today's activities</p>
          </div>
          <a href="/" className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            ⬅ Back to Home
          </a>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center">
            <span className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Total Matches Today</span>
            <span className="text-4xl font-black text-purple-600">{data?.totalMatches || 0}</span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center">
            <span className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Unique Players</span>
            <span className="text-4xl font-black text-blue-600">{data?.uniquePlayers || 0}</span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center">
            <span className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Top Player (Visits)</span>
            <span className="text-2xl font-black text-amber-500 truncate max-w-full">
              {data?.topPlayers?.[0]?.name || 'N/A'}
            </span>
          </div>
        </div>

        {/* Top Players Table */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">🏆 All-Time Top Players</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50">
                  <th className="p-3 rounded-tl-lg">ID</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Level</th>
                  <th className="p-3 rounded-tr-lg">Total Visits</th>
                </tr>
              </thead>
              <tbody>
                {data?.topPlayers?.map((p: any, i: number) => (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                    <td className="p-3 font-mono text-xs">{p.id}</td>
                    <td className="p-3 font-bold">{p.name}</td>
                    <td className="p-3">Lv {p.latest_skill}</td>
                    <td className="p-3 font-bold text-blue-600 dark:text-blue-400">{p.total_visits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}