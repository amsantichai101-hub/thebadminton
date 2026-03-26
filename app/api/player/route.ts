import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function GET(request: Request) {
  // 1. รับค่า ID ที่ส่งมาจาก URL เช่น /api/player?id=12345678
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ found: false })

  // 2. ไปค้นหาใน Table 'player_registry' ที่เราเก็บประวัติไว้
  const { data, error } = await supabaseAdmin
    .from('player_registry')
    .select('name, latest_skill, last_seen, total_visits')
    .eq('id', id)
    .single()

  // 3. ถ้าเจอข้อมูล ให้ส่งกลับไปหาหน้าเว็บ
  if (data) {
    return NextResponse.json({
      found: true,
      name: data.name,
      skill: data.latest_skill,
      lastSeen: data.last_seen,
      totalVisits: data.total_visits
    })
  }

  // 4. ถ้าไม่เจอแปลว่าเป็นผู้เล่นใหม่
  return NextResponse.json({ found: false })
}