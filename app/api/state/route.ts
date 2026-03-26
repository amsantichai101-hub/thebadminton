export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'
import type { AppState } from '@/lib/types'

export async function GET() {
  const s = supabaseAdmin
  
  // 1. เพิ่มตัวแปร error เข้ามารับค่า
  const { data: conf, error: err1 } = await s.from('system_config').select('*')
  const { data: waitingRaw, error: err2 } = await s.from('player_queue').select('*')
  const { data: pendingRaw, error: err3 } = await s.from('pending_queue').select('*')
  const { data: playingRaw, error: err4 } = await s.from('active_courts').select('*')

  // 2. เช็คว่ามี Error ไหม ถ้ามีให้แสดงใน Terminal
  if (err1 || err2 || err3 || err4) {
    console.error('🔴 Supabase Fetch Error:', { 
      config: err1, 
      queue: err2, 
      pending: err3, 
      courts: err4 
    })
  }

  let courtNames = ['Court 1']
  let announcement = ''
  let autoMatch = false
  conf?.forEach((row:any)=>{ if(row.key==='Courts') courtNames = String(row.value).split(',').map((x)=>x.trim()).filter(Boolean); if(row.key==='Announcement') announcement=String(row.value); if(row.key==='AutoMatch') autoMatch = String(row.value).toLowerCase()==='true' })
  
  const waiting = (waitingRaw||[]).map((r:any)=>({ id: String(r.id), name: r.name, skill: Number(r.skill), timestamp: new Date(r.ts).toISOString(), type: r.type, playCount: Number(r.play_count||0) })).sort((a:any,b:any)=> a.playCount!==b.playCount? a.playCount-b.playCount : new Date(a.timestamp).getTime()-new Date(b.timestamp).getTime())
  const pending = (pendingRaw||[]).map((r:any)=>({ id: String(r.id), name: r.name, skill: Number(r.skill), timestamp: new Date(r.ts).toISOString(), type: r.type, playCount: Number(r.play_count||0) }))
  const playing = (playingRaw||[]).map((r:any)=>({ court: r.court, p1Id: String(r.p1_id), p1Name: r.p1_name, p1Skill: Number(r.p1_skill), p2Id: String(r.p2_id), p2Name: r.p2_name, p2Skill: Number(r.p2_skill), p3Id: String(r.p3_id), p3Name: r.p3_name, p3Skill: Number(r.p3_skill), p4Id: String(r.p4_id), p4Name: r.p4_name, p4Skill: Number(r.p4_skill), startTime: new Date(r.start_time).toISOString() }))
  
  const res: AppState = { courtNames, announcement, autoMatch, waiting, pending, playing, courtCount: courtNames.length }
  return NextResponse.json(res)
}