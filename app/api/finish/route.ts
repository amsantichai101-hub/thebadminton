
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'
export async function POST(req: Request) {
  const { court } = await req.json(); const s = supabaseAdmin
  const { data: row } = await s.from('active_courts').select('*').eq('court', court).maybeSingle()
  if (!row) return NextResponse.json({ status:'error', message:'Not Found' })
  const start = new Date(row.start_time).getTime(); const duration = Math.round((Date.now()-start)/60000)
  await s.from('active_courts').delete().eq('court', court)
  const { data: qRows } = await s.from('player_queue').select('play_count')
  const maxPC = (qRows||[]).reduce((acc:any,cur:any)=> Math.max(acc, Number(cur.play_count||0)), 0)
  const players = [ { id: row.p1_id, name: row.p1_name, skill: row.p1_skill }, { id: row.p2_id, name: row.p2_name, skill: row.p2_skill }, { id: row.p3_id, name: row.p3_name, skill: row.p3_skill }, { id: row.p4_id, name: row.p4_name, skill: row.p4_skill } ]
  for (const p of players) { const type = String(p.id).startsWith('G') ? 'Guest' : 'Emp'; await s.from('player_queue').insert({ id: String(p.id), name: p.name, skill: Number(p.skill), ts: new Date().toISOString(), type, play_count: maxPC+1 }) }
  await s.from('match_logs').insert({ ts: new Date().toISOString(), action:'MATCH_FINISH', court, duration, match_group: JSON.stringify(players.map(p=>p.id)) })
  const { data: conf } = await s.from('system_config').select('*')
  let autoMatch = false; conf?.forEach((row:any)=>{ if(row.key==='AutoMatch') autoMatch = String(row.value).toLowerCase()==='true' })
  if (autoMatch) return NextResponse.json({ status:'success', message:`Finish ${court} & Auto Matching Next...`, auto:true })
  return NextResponse.json({ status:'success', message:`Finish ${court}` })
}
