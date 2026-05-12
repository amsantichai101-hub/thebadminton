'use client'
import { useEffect, useState } from 'react'

export default function AnalyticsDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 10),
    end: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 10)
  })

  const fetchData = () => {
    setLoading(true)
    fetch(`/api/analytics?startDate=${dateRange.start}&endDate=${dateRange.end}`)
      .then(res => res.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
  }

  useEffect(() => { fetchData() }, [dateRange])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">📊 Analytics & Reports</h1>
            <p className="text-sm text-slate-500">Real-time stats from match logs</p>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              className="p-2 rounded border" 
              value={dateRange.start} 
              onChange={e => setDateRange({...dateRange, start: e.target.value})}
            />
            <span className="font-bold text-slate-500">to</span>
            <input 
              type="date" 
              className="p-2 rounded border" 
              value={dateRange.end} 
              onChange={e => setDateRange({...dateRange, end: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 shadow-sm text-center">
            <span className="text-sm text-slate-500 font-bold uppercase">Total Matches</span>
            <div className="text-4xl font-black text-purple-600">{data?.totalMatches || 0}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 shadow-sm text-center">
            <span className="text-sm text-slate-500 font-bold uppercase">Unique Players</span>
            <div className="text-4xl font-black text-blue-600">{data?.uniquePlayers || 0}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 shadow-sm text-center">
            <span className="text-sm text-slate-500 font-bold uppercase">Top Player</span>
            <div className="text-xl font-bold text-amber-500">{data?.topPlayers?.[0]?.name || '-'}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold mb-4">🏆 All-Time Player Rankings</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700">
                <th className="p-3">Name</th>
                <th className="p-3">Skill</th>
                <th className="p-3">Total Visits</th>
              </tr>
            </thead>
            <tbody>
              {data?.topPlayers?.map((p: any) => (
                <tr key={p.id} className="border-b dark:border-slate-700 hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-700">{p.name}</td>
                  <td className="p-3 text-slate-500">Lv {p.latest_skill}</td>
                  <td className="p-3 font-bold text-blue-600">{p.total_visits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}