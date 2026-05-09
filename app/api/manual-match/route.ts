import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'
import webpush from 'web-push'

// ตั้งค่า VAPID สำหรับ Web Push ตรงนี้เลย
webpush.setVapidDetails(
  'mailto:admin@badminton.com', // ใส่อีเมลอะไรก็ได้
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

export async function POST(req: Request) {
  try {
    const { ids, court } = await req.json()
    if (!ids || ids.length !== 4) return NextResponse.json({ status: 'error', message: 'ต้องเลือก 4 คน' })

    const { data: players } = await supabaseAdmin.from('player_queue').select('*').in('id', ids)
    if (!players || players.length !== 4) return NextResponse.json({ status: 'error', message: 'ดึงข้อมูลผู้เล่นไม่ครบ' })

    const sortedPlayers = ids.map((id: string) => players.find((p: any) => p.id === id)).filter(Boolean) as any[]
    let targetCourt = court;
    
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

    // ========================================================
    // 🌟 ระบบยิง Web Push Notification โดยตรงจากไฟล์นี้
    // ========================================================
    for (let i = 0; i < 4; i++) {
      const isTeamA = i < 2;
      const mate = isTeamA ? sortedPlayers[1 - i] : sortedPlayers[5 - i];
      const opp1 = isTeamA ? sortedPlayers[2] : sortedPlayers[0];
      const opp2 = isTeamA ? sortedPlayers[3] : sortedPlayers[1];
      
      const message = `คุณ ${sortedPlayers[i].name} & ${mate.name} vs ${opp1.name} & ${opp2.name} ลุยเลยที่คอร์ท ${targetCourt}!`;

      try {
        // 1. ดึง Token ของผู้เล่นคนนี้จากฐานข้อมูล
        const { data: subData } = await supabaseAdmin
            .from('push_subscriptions')
            .select('subscription')
            .eq('user_id', sortedPlayers[i].id)
            .single();

        if (subData && subData.subscription) {
            // 2. สั่งยิง Push ตรงไปที่มือถือผู้เล่นทันที (ทะลุ Doze Mode)
            await webpush.sendNotification(
                subData.subscription, 
                JSON.stringify({
                    title: '🏸 ถึงคิวคุณแล้ว!',
                    body: message,
                    url: '/?tab=home'
                }),
                { urgency: 'high', TTL: 60 * 60 } // บังคับให้มือถือตื่นทันที
            );
            console.log(`✅ Push sent to ${sortedPlayers[i].name}`);
        } else {
            console.log(`⚠️ No subscription found for ${sortedPlayers[i].name}`);
        }
      } catch (err) {
        console.error(`❌ Push failed for ${sortedPlayers[i].name}:`, err);
      }
    }
    // ========================================================

    return NextResponse.json({ status: 'success' })
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message })
  }
}
