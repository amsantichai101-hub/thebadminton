
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'
import { balanceTeams } from '@/utils/matchmaking'
export async function POST(req: Request) {
  const { ids } = await req.json(); const s = supabaseAdmin
  const { data: conf } = await s.from('system_config').select('*')
  let courtNames: string[] = ['Court 1']; conf?.forEach((row:any)=>{ if(row.key==='Courts') courtNames = String(row.value).split(',').map((x)=>x.trim()).filter(Boolean) })
  const playing = await s.from('active_courts').select('court'); const used = new Set(playing.data?.map((r:any)=>r.court)||[]); const available = courtNames.filter(c=>!used.has(c))
  if (available.length===0) return NextResponse.json({ status:'warning', message:'คอร์ทไม่ว่าง' })
  const { data: sel } = await s.from('player_queue').select('*').in('id', ids)
  if (!sel || sel.length!==4) return NextResponse.json({ status:'error', message:'เลือก 4 คน' })
  await s.from('player_queue').delete().in('id', ids)
  const ordered = balanceTeams(sel.map((x:any)=>({ id:String(x.id), name:x.name, skill:Number(x.skill) }))).teams as any[]
  await s.from('active_courts').insert({ court: available[0], p1_id:ordered[0].id, p1_name:ordered[0].name, p1_skill:ordered[0].skill, p2_id:ordered[1].id, p2_name:ordered[1].name, p2_skill:ordered[1].skill, p3_id:ordered[2].id, p3_name:ordered[2].name, p3_skill:ordered[2].skill, p4_id:ordered[3].id, p4_name:ordered[3].name, p4_skill:ordered[3].skill, start_time: new Date().toISOString() })
  return NextResponse.json({ status:'success', message:'Manual Match Started' })
}
