
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'
import { balanceTeams } from '@/utils/matchmaking'
export async function POST(req: Request) {
  const { mode } = await req.json(); const s = supabaseAdmin
  const { data: conf } = await s.from('system_config').select('*')
  let courtNames: string[] = ['Court 1']; conf?.forEach((row:any)=>{ if(row.key==='Courts') courtNames = String(row.value).split(',').map((x)=>x.trim()).filter(Boolean) })
  const playing = await s.from('active_courts').select('court'); const used = new Set(playing.data?.map((r:any)=>r.court)||[]); const available = courtNames.filter(c=>!used.has(c))
  const { data: waitingRaw } = await s.from('player_queue').select('*').order('play_count',{ascending:true}).order('ts',{ascending:true})
  let queue = waitingRaw || []; let matches = 0
  for (const court of available) {
    if (queue.length < 4) break
    let selected: any[] = []; let finalTeams: any[] = []
    if (mode==='smart') { const p1 = queue.shift()!; const candidates = queue.slice(0,11); if (candidates.length<3) { selected = [p1, ...queue.slice(0,3)]; finalTeams = balanceTeams(selected.map(x=>({ id:String(x.id), name:x.name, skill:Number(x.skill) }))).teams as any[] } else { let bestCombo: any[]|null=null; let minDiff=Number.POSITIVE_INFINITY; let bestTeams:any[]|null=null; for(let i=0;i<candidates.length;i++){ for(let j=i+1;j<candidates.length;j++){ for(let k=j+1;k<candidates.length;k++){ const group=[p1,candidates[i],candidates[j],candidates[k]].map(x=>({ id:String(x.id), name:x.name, skill:Number(x.skill) })); const b = balanceTeams(group); if(b.diff<minDiff){ minDiff=b.diff; bestCombo=group as any[]; bestTeams=b.teams as any[] } if(minDiff===0) break } if(minDiff===0) break } if(minDiff===0) break } selected = (bestCombo||[p1, ...queue.slice(0,3)]) as any[]; finalTeams = (bestTeams||balanceTeams(selected as any).teams) as any[] } }
    else { selected = queue.splice(0,4); finalTeams = balanceTeams(selected.map(x=>({ id:String(x.id), name:x.name, skill:Number(x.skill) }))).teams as any[] }
    const ids = new Set(selected.map(x=>String(x.id))); queue = queue.filter(x=>!ids.has(String(x.id)))
    await s.from('player_queue').delete().in('id', Array.from(ids))
    const p = finalTeams as any[]; await s.from('active_courts').insert({ court, p1_id:p[0].id, p1_name:p[0].name, p1_skill:p[0].skill, p2_id:p[1].id, p2_name:p[1].name, p2_skill:p[1].skill, p3_id:p[2].id, p3_name:p[2].name, p3_skill:p[2].skill, p4_id:p[3].id, p4_name:p[3].name, p4_skill:p[3].skill, start_time: new Date().toISOString() })
    matches++
  }
  if (matches>0) return NextResponse.json({ status:'success', message:`Started ${matches} matches` })
  if ((waitingRaw||[]).length<4) return NextResponse.json({ status:'warning', message:'Not enough players' })
  return NextResponse.json({ status:'warning', message:'No courts available' })
}
