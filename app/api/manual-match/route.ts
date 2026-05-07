import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  try {
    const { ids, court } = await req.json()
    if (!ids || ids.length !== 4) return NextResponse.json({ status: 'error', message: 'ต้องเลือก 4 คน' })

    const { data: players } = await supabaseAdmin.from('player_queue').select('*').in('id', ids)
    if (!players || players.length !== 4) return NextResponse.json({ status: 'error', message: 'ดึงข้อมูลผู้เล่นไม่ครบ' })

    // บังคับเรียงตามลำดับ ids ที่ส่งมาจากหน้าบ้านเป๊ะๆ เพื่อรักษา Team A และ Team B ไว้
    const sortedPlayers = ids.map((id: string) => players.find((p: any) => p.id === id)).filter(Boolean) as any[]

    let targetCourt = court;
    
    // ถ้าไม่ได้ระบุ Court มา หรือระบุมาแต่ Court นั้นไม่ว่าง ให้หา Court ว่างแทน
    const { data: config } = await supabaseAdmin.from('system_config').select('value').eq('key', 'Courts').single()
    const allCourts = (config?.value || 'Court 1, Court 2').split(',').map((s: string) => s.trim())
    const { data: activeCourts } = await supabaseAdmin.from('active_courts').select('court')
    const activeCourtNames = activeCourts?.map((c: any) => c.court) || []

    if (!targetCourt || activeCourtNames.includes(targetCourt)) {
        targetCourt = allCourts.find((c: string) => !activeCourtNames.includes(c));
    }

    if (!targetCourt) return NextResponse.json({ status: 'error', message: 'ไม่มีคอร์ทว่างแล้ว' })

    await supabaseAdmin.from('active_courts').insert({
      court: targetCourt,
      p1_id: sortedPlayers[0].id, p1_name: sortedPlayers[0].name, p1_skill: sortedPlayers[0].skill,
      p2_id: sortedPlayers[1].id, p2_name: sortedPlayers[1].name, p2_skill: sortedPlayers[1].skill,
      p3_id: sortedPlayers[2].id, p3_name: sortedPlayers[2].name, p3_skill: sortedPlayers[2].skill,
      p4_id: sortedPlayers[3].id, p4_name: sortedPlayers[3].name, p4_skill: sortedPlayers[3].skill,
      start_time: new Date().toISOString()
    })

    await supabaseAdmin.from('player_queue').delete().in('id', ids)

    const logs = sortedPlayers.map((p: any) => ({
      player_id: p.id, player_name: p.name, skill: p.skill,
      court: targetCourt, action: 'Start Match', duration: 0
    }))
    await supabaseAdmin.from('match_logs').insert(logs)

    return NextResponse.json({ status: 'success' })
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message })
  }
}