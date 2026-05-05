import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  try {
    const { ids } = await req.json()
    if (!ids || ids.length !== 4) return NextResponse.json({ status: 'error', message: 'ต้องเลือก 4 คน' })

    // 1. ดึงข้อมูลผู้เล่นจากคิว
    const { data: players } = await supabaseAdmin.from('player_queue').select('*').in('id', ids)
    if (!players || players.length !== 4) return NextResponse.json({ status: 'error', message: 'ดึงข้อมูลผู้เล่นจากคิวไม่ครบ' })

    // 💡 แก้ไข Type Error: ใส่ (id: string) และ (p: any) ให้ชัดเจน
    const sortedPlayers = ids.map((id: string) => players.find((p: any) => p.id === id)).filter(Boolean) as any[]

    // 2. หาคอร์ทที่ว่าง
    const { data: config } = await supabaseAdmin.from('system_config').select('value').eq('key', 'Courts').single()
    const allCourts = (config?.value || 'Court 1, Court 2').split(',').map((s: string) => s.trim())
    
    const { data: activeCourts } = await supabaseAdmin.from('active_courts').select('court')
    // 💡 แก้ไข Type Error: ใส่ (c: any) และ (c: string) ให้ชัดเจน
    const activeCourtNames = activeCourts?.map((c: any) => c.court) || []
    const availableCourt = allCourts.find((c: string) => !activeCourtNames.includes(c))

    if (!availableCourt) return NextResponse.json({ status: 'error', message: 'ไม่มีคอร์ทว่างแล้ว' })

    // 3. เพิ่มลง active_courts
    await supabaseAdmin.from('active_courts').insert({
      court: availableCourt,
      p1_id: sortedPlayers[0].id, p1_name: sortedPlayers[0].name, p1_skill: sortedPlayers[0].skill,
      p2_id: sortedPlayers[1].id, p2_name: sortedPlayers[1].name, p2_skill: sortedPlayers[1].skill,
      p3_id: sortedPlayers[2].id, p3_name: sortedPlayers[2].name, p3_skill: sortedPlayers[2].skill,
      p4_id: sortedPlayers[3].id, p4_name: sortedPlayers[3].name, p4_skill: sortedPlayers[3].skill,
      start_time: new Date().toISOString()
    })

    // 4. ลบออกจากคิว
    await supabaseAdmin.from('player_queue').delete().in('id', ids)

    // 5. 📝 เก็บ LOG การเริ่มต้นเล่น (Start Match) ให้ Analytics
    // 💡 แก้ไข Type Error: ใส่ (p: any)
    const logs = sortedPlayers.map((p: any) => ({
      player_id: p.id,
      player_name: p.name,
      skill: p.skill,
      court: availableCourt,
      action: 'Start Match',
      duration: 0
    }))
    await supabaseAdmin.from('match_logs').insert(logs)

    return NextResponse.json({ status: 'success' })
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message })
  }
}