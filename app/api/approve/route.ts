import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  const { id } = await req.json()
  const s = supabaseAdmin
  
  const { data } = await s.from('pending_queue').select('*').eq('id', id).single()
  if (!data) return NextResponse.json({ status: 'error', message: 'ไม่พบข้อมูล' })
  
  // 🟢 ใส่ ts: new Date().toISOString() เพื่อให้ไปต่อท้ายคิวหลัก
  await s.from('player_queue').insert({ 
      id: data.id, 
      name: data.name, 
      skill: data.skill, 
      ts: new Date().toISOString(), 
      type: data.type, 
      play_count: data.play_count 
  })
  
  await s.from('pending_queue').delete().eq('id', id)
  
  return NextResponse.json({ status: 'success' })
}