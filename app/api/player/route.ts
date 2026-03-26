import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query) return NextResponse.json({ found: false })

  // ค้นหาแบบ Or (ID ตรงเป๊ะ หรือ ชื่อคล้ายกัน)
  const { data } = await supabaseAdmin
    .from('player_registry')
    .select('id, name, latest_skill, last_seen, total_visits')
    .or(`id.eq.${query},name.ilike.%${query}%`)
    .order('last_seen', { ascending: false })
    .limit(1)

  if (data && data.length > 0) {
    const p = data[0];
    return NextResponse.json({ found: true, id: p.id, name: p.name, skill: p.latest_skill, lastSeen: p.last_seen, totalVisits: p.total_visits })
  }

  // ไม่เจอประวัติ
  return NextResponse.json({ found: false })
}