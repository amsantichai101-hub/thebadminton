
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  const { id, name, skill, isGuest } = await req.json()
  const s = supabaseAdmin
  let finalId = id
  let type = 'Emp'
  if (isGuest) {
    const { data: cnt } = await s.rpc('guest_counter')
    const next = (cnt||0)+1
    finalId = `G${String(next).padStart(3,'0')}`
    await s.from('system_config').upsert({ key: 'GUEST_COUNTER_LAST', value: String(next) })
    type = 'Guest'
  } else {
    if (!/^\d{8}$/.test(String(finalId||''))) return NextResponse.json({ status:'error', message:'รหัส 8 หลัก' })
  }
  const allIds = new Set<string>()
  ;(await s.from('player_queue').select('id')).data?.forEach((r:any)=>allIds.add(String(r.id)))
  ;(await s.from('pending_queue').select('id')).data?.forEach((r:any)=>allIds.add(String(r.id)))
  ;(await s.from('active_courts').select('p1_id,p2_id,p3_id,p4_id')).data?.forEach((r:any)=>{ ['p1_id','p2_id','p3_id','p4_id'].forEach((k)=>allIds.add(String(r[k]))) })
  if (finalId && allIds.has(String(finalId))) return NextResponse.json({ status:'warning', message:`ID ${finalId} อยู่ในระบบแล้ว` })
  await s.from('player_registry').upsert({ id: String(finalId), name, latest_skill: Number(skill), last_seen: new Date().toISOString(), total_visits: 1 }, { onConflict: 'id', ignoreDuplicates: false })
  await s.from('pending_queue').insert({ id: String(finalId), name, skill: Number(skill), ts: new Date().toISOString(), type, play_count: 0 })
  return NextResponse.json({ status: 'success', message: `รออนุมัติ (${finalId})` })
}
