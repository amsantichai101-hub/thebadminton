import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  const s = supabaseAdmin;
  
  const { data: courtsConf } = await s.from('system_config').select('value').eq('key', 'Courts').single();
  const allCourts = courtsConf ? String(courtsConf.value).split(',').map(x=>x.trim()) : ['Court 1'];
  const { data: playing } = await s.from('active_courts').select('court');
  const playingNames = playing?.map(p => p.court) || [];
  const availableCourts = allCourts.filter(c => !playingNames.includes(c));

  if (availableCourts.length === 0) return NextResponse.json({ message: 'No courts available' });

  // 🟢 ดึงข้อมูลผู้เล่น โดยเรียงตามลำดับเวลาการเข้าคิว (ts) เป็นหลัก
  const { data: queueRaw } = await s.from('player_queue').select('*').order('ts', { ascending: true });
  let queue = queueRaw || [];
  
  let matchesCreated = 0;

  for (const court of availableCourts) {
    if (queue.length < 4) break;

    let selected = queue.splice(0, 4);
    selected.sort((a, b) => Number(b.skill) - Number(a.skill)); 
    
    let team1 = [selected[0], selected[3]];
    let team2 = [selected[1], selected[2]];

    if (selected[0].play_count > 0 && selected[0].play_count === selected[1].play_count) {
       team1 = [selected[0], selected[2]];
       team2 = [selected[1], selected[3]];
    }

    const p = [...team1, ...team2];
    await s.from('active_courts').insert({ court, p1_id: p[0].id, p1_name: p[0].name, p1_skill: p[0].skill, p2_id: p[1].id, p2_name: p[1].name, p2_skill: p[1].skill, p3_id: p[2].id, p3_name: p[2].name, p3_skill: p[2].skill, p4_id: p[3].id, p4_name: p[3].name, p4_skill: p[3].skill });
    await s.from('player_queue').delete().in('id', p.map(x=>x.id));
    matchesCreated++;
  }

  return NextResponse.json({ status: 'success', message: `Started ${matchesCreated} matches` });
}