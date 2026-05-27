import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // ✅ 1. บังคับ Type ให้ชัดเจน ป้องกัน Error 'unknown is not assignable to string'
    const ids: string[] = body.ids || [];
    const court: string = body.court || '';
    
    // ✅ ระบุ Type ให้ Set เป็น <string>
    const uniqueIds = Array.from(new Set<string>(ids));
    if (!uniqueIds || uniqueIds.length !== 4) return NextResponse.json({ status: 'error', message: 'กรุณาเลือกผู้เล่น 4 คนที่ไม่ซ้ำกัน' })

    const { data: activePlayers } = await supabaseAdmin.from('active_courts').select('*');
    const playingIds: string[] = activePlayers?.flatMap((c: any) => [c.p1_id, c.p2_id, c.p3_id, c.p4_id]) || [];
    
    // ✅ ใช้ Type ได้อย่างปลอดภัยแล้ว
    const hasPlaying = uniqueIds.some((id: string) => playingIds.includes(id));
    if (hasPlaying) return NextResponse.json({ status: 'error', message: 'มีผู้เล่นบางคนกำลังเล่นอยู่บนคอร์ทแล้ว โปรดรีเฟรชหน้าจอ' });

    const { data: players } = await supabaseAdmin.from('player_queue').select('*').in('id', uniqueIds)
    if (!players || players.length !== 4) return NextResponse.json({ status: 'error', message: 'ดึงข้อมูลผู้เล่นไม่ครบ (อาจถูกดึงลงคอร์ทไปแล้ว)' })

    const sortedPlayers = uniqueIds.map((id: string) => players.find((p: any) => p.id === id)).filter(Boolean) as any[]

    let targetCourt = court;
    
    const { data: config } = await supabaseAdmin.from('system_config').select('value').eq('key', 'Courts').single()
    const allCourts = (config?.value || 'Court 1, Court 2').split(',').map((s: string) => s.trim())
    const { data: activeCourts } = await supabaseAdmin.from('active_courts').select('court')
    const activeCourtNames = activeCourts?.map((c: any) => c.court) || []

    if (!targetCourt || activeCourtNames.includes(targetCourt)) {
        targetCourt = allCourts.find((c: string) => !activeCourtNames.includes(c)) || '';
    }

    if (!targetCourt) return NextResponse.json({ status: 'error', message: 'ไม่มีคอร์ทว่างแล้ว' })

    // ส่งคนลงคอร์ท
    await supabaseAdmin.from('active_courts').insert({
      court: targetCourt,
      p1_id: sortedPlayers[0].id, p1_name: sortedPlayers[0].name, p1_skill: sortedPlayers[0].skill,
      p2_id: sortedPlayers[1].id, p2_name: sortedPlayers[1].name, p2_skill: sortedPlayers[1].skill,
      p3_id: sortedPlayers[2].id, p3_name: sortedPlayers[2].name, p3_skill: sortedPlayers[2].skill,
      p4_id: sortedPlayers[3].id, p4_name: sortedPlayers[3].name, p4_skill: sortedPlayers[3].skill,
      start_time: new Date().toISOString()
    })

    // ลบคนออกจากคิวปกติ
    await supabaseAdmin.from('player_queue').delete().in('id', uniqueIds)
    
    // ✅ ลบคิวออกจาก manual_previews ด้วย (เพราะลงสนามไปแล้ว)
    await supabaseAdmin.from('manual_previews').delete().eq('court_name', targetCourt)

    // บันทึก Log
    const logs = sortedPlayers.map((p: any) => ({
      player_id: p.id, player_name: p.name, skill: p.skill,
      court: targetCourt, action: 'Start Match', duration: 0
    }))
    await supabaseAdmin.from('match_logs').insert(logs)

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    for (let i = 0; i < 4; i++) {
      const isTeamA = i < 2;
      const mate = isTeamA ? sortedPlayers[1 - i] : sortedPlayers[5 - i];
      const opp1 = isTeamA ? sortedPlayers[2] : sortedPlayers[0];
      const opp2 = isTeamA ? sortedPlayers[3] : sortedPlayers[1];

      fetch(`${baseUrl}/api/webpush`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send', userId: sortedPlayers[i].id, title: '🏸 ถึงคิวคุณแล้ว!',
          message: `คุณ ${sortedPlayers[i].name} & ${mate.name} vs ${opp1.name} & ${opp2.name} ไปลุยกันเลยที่คอร์ท ${targetCourt}`,
          url: '/?tab=home'
        })
      }).catch(e => console.error(e));
    }

    const { data: nextQueue } = await supabaseAdmin.from('player_queue').select('id, name').not('name', 'ilike', '%(พัก)%').order('timestamp', { ascending: true }).limit(4); 
    if (nextQueue) {
      for (let i = 0; i < nextQueue.length; i++) {
        fetch(`${baseUrl}/api/webpush`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'send', userId: nextQueue[i].id, title: '🔥 เตรียมตัววอร์ม!', message: `คุณ ${nextQueue[i].name} ใกล้ถึงคิวของคุณแล้ว (คิวที่ ${i + 1})`, url: '/?tab=queue' })
        }).catch(e => console.error(e));
      }
    }

    return NextResponse.json({ status: 'success' })
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message })
  }
}