import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'
import type { AppState } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const s = supabaseAdmin
  
  const { data: conf, error: err1 } = await s.from('system_config').select('*')
  const { data: waitingRaw, error: err2 } = await s.from('player_queue').select('*')
  const { data: pendingRaw, error: err3 } = await s.from('pending_queue').select('*')
  const { data: playingRaw, error: err4 } = await s.from('active_courts').select('*')

  if (err1 || err2 || err3 || err4) {
    console.error('🔴 Supabase Fetch Error:', { config: err1, queue: err2, pending: err3, courts: err4 })
  }

  let courtNames = ['Court 1']
  let announcement = ''
  let autoMatch = false
  let matchMode = 'balanced'
  conf?.forEach((row:any)=>{
    if(row.key==='Courts') courtNames = String(row.value).split(',').map((x)=>x.trim()).filter(Boolean);
    if(row.key==='Announcement') announcement=String(row.value);
    if(row.key==='AutoMatch') autoMatch = String(row.value).toLowerCase()==='true';
    if(row.key==='MatchMode') matchMode = String(row.value).trim().toLowerCase() || 'balanced';
  })
  
  // 🟢 เรียงคิวตามเวลาที่เข้า (ts) อย่างเดียว ใครเข้าก่อนอยู่บนสุด
  const waiting = (waitingRaw||[]).map((r:any)=>({ id: String(r.id), name: r.name, skill: Number(r.skill), timestamp: new Date(r.ts).toISOString(), type: r.type, playCount: Number(r.play_count||0) })).sort((a:any,b:any)=> new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  
  const pending = (pendingRaw||[]).map((r:any)=>({ id: String(r.id), name: r.name, skill: Number(r.skill), timestamp: new Date(r.ts).toISOString(), type: r.type, playCount: Number(r.play_count||0) })).sort((a:any,b:any)=> new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  
  const playing = (playingRaw||[]).map((r:any)=>({ court: r.court, p1Id: String(r.p1_id), p1Name: r.p1_name, p1Skill: Number(r.p1_skill), p2Id: String(r.p2_id), p2Name: r.p2_name, p2Skill: Number(r.p2_skill), p3Id: String(r.p3_id), p3Name: r.p3_name, p3Skill: Number(r.p3_skill), p4Id: String(r.p4_id), p4Name: r.p4_name, p4Skill: Number(r.p4_skill), startTime: new Date(r.start_time).toISOString() }))
  
  const today = new Date(); today.setHours(0,0,0,0);
  const { data: recentLogs } = await s.from('match_logs').select('duration').gte('ts', today.toISOString())
  const durations = (recentLogs||[]).map((r:any)=>Number(r.duration)||0).filter((d:number)=>d>0)
  const avgMatchDuration = durations.length ? Math.round(durations.reduce((s:number,n:number)=>s+n,0)/durations.length) : 15

  const res: AppState = { courtNames, announcement, autoMatch, waiting, pending, playing, courtCount: courtNames.length, avgMatchDuration, matchMode }
  return NextResponse.json(res)
}