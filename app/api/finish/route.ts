import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  try {
    const { court } = await req.json()

    // 1. ดึงข้อมูลคอร์ทที่กำลังเล่น เพื่อเอาข้อมูลผู้เล่นมาประมวลผล
    const { data: courtData } = await supabaseAdmin.from('active_courts').select('*').eq('court', court).single()

    if (!courtData) {
      return NextResponse.json({ status: 'error', message: 'Court not found' })
    }

    // คำนวณเวลาที่ใช้ไปในการตี (นาที)
    const startTime = new Date(courtData.start_time).getTime()
    const endTime = new Date().getTime()
    const duration = Math.max(1, Math.floor((endTime - startTime) / 60000)) // อย่างน้อย 1 นาที

    const players = [
      { id: courtData.p1_id, name: courtData.p1_name, skill: courtData.p1_skill },
      { id: courtData.p2_id, name: courtData.p2_name, skill: courtData.p2_skill },
      { id: courtData.p3_id, name: courtData.p3_name, skill: courtData.p3_skill },
      { id: courtData.p4_id, name: courtData.p4_name, skill: courtData.p4_skill }
    ].filter(p => p.id); // กรองเอาเฉพาะที่มีข้อมูลจริง

    // 2. 📝 บันทึก Log การเล่นให้ Analytics
    const logs = players.map(p => ({
      player_id: p.id,
      player_name: p.name,
      skill: p.skill,
      court: court,
      action: 'End Match',
      duration: duration
    }))
    await supabaseAdmin.from('match_logs').insert(logs)

    // 3. 🔄 ระบบ Re-queue: นำผู้เล่นกลับเข้าคิว
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const requeueData = [];
    
    for (const p of players) {
       // นับจำนวนรอบที่เล่นจบไปแล้วในวันนี้ (เพื่อโชว์ใน PlayCount P)
       const { count } = await supabaseAdmin
          .from('match_logs')
          .select('*', { count: 'exact', head: true })
          .eq('player_id', p.id)
          .eq('action', 'End Match')
          .gte('ts', todayStr);

       requeueData.push({
          id: p.id,
          name: p.name,
          skill: p.skill,
          ts: new Date().toISOString(), // ⏰ อัปเดตเวลาปัจจุบัน เพื่อให้หล่นไปอยู่ "ท้ายคิว"
          type: p.id.startsWith('9') ? 'Guest' : 'Emp', // ✅ เปลี่ยนเงื่อนไขตรวจจับ Guest เป็นขึ้นต้นด้วย 9
          play_count: (count || 0) + 1 // รอบเดิม + รอบที่เพิ่งตีจบ
       });

       // อัปเดตสถิติ Total Visits ทั้งหมดให้ในฐานข้อมูลหลักด้วย
       const { data: reg } = await supabaseAdmin.from('player_registry').select('total_visits').eq('id', p.id).single()
       await supabaseAdmin.from('player_registry').update({ total_visits: (reg?.total_visits || 0) + 1 }).eq('id', p.id)
    }

    // 4. พาผู้เล่นทั้ง 4 คน กลับลงไปในคิวรอ (upsert เพื่อความปลอดภัย)
    await supabaseAdmin.from('player_queue').upsert(requeueData)

    // 5. เคลียร์คอร์ทให้ว่าง
    await supabaseAdmin.from('active_courts').delete().eq('court', court)
    
    // ========================================================
    // 🌟 ระบบยิง Push ทะลุจอ แจ้งเตือน 4 คนแรกให้เตรียมวอร์ม เมื่อจบแมตช์
    // ========================================================
    try {
      // 1. ดึงข้อมูล 4 คนแรกที่รออยู่ในคิว (และข้ามคนที่กำลัง "พัก" อยู่)
      const { data: waitingPlayers } = await supabaseAdmin
        .from('player_queue')
        .select('id, name')
        .not('name', 'like', '%(พัก)%')
        .order('id', { ascending: true }) 
        .limit(4);

      if (waitingPlayers && waitingPlayers.length > 0) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        
        // 2. วนลูปยิง Push ไปบอกให้ทั้ง 4 คนเตรียมตัว
        for (const p of waitingPlayers) {
          fetch(`${baseUrl}/api/webpush`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'send',
              userId: p.id,
              title: '🔥 เตรียมตัววอร์ม!',
              message: `มีคอร์ทเพิ่งจบแมตช์! คุณ ${p.name} อยู่ใน 4 คิวแรก ลุกขึ้นยืดเส้นได้เลย`,
              url: '/?tab=queue',
              vibrate: [200, 100, 200] 
            })
          }).catch(err => console.error('Push prepare error:', err));
        }
      }
    } catch (e) {
      console.error('Error sending prepare push:', e);
    }
    // ========================================================

    return NextResponse.json({ status: 'success' })
  } catch (error: any) {
    console.error('Finish Match Error:', error)
    return NextResponse.json({ status: 'error', message: error.message })
  }
}