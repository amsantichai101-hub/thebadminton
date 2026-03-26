import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  const { court } = await req.json();
  const s = supabaseAdmin;

  const { data: active } = await s.from('active_courts').select('*').eq('court', court).single();
  if (!active) return NextResponse.json({ error: 'Not found' });

  await s.from('active_courts').delete().eq('court', court);

  const players = [
    { id: active.p1_id, name: active.p1_name, skill: active.p1_skill },
    { id: active.p2_id, name: active.p2_name, skill: active.p2_skill },
    { id: active.p3_id, name: active.p3_name, skill: active.p3_skill },
    { id: active.p4_id, name: active.p4_name, skill: active.p4_skill }
  ];

  // ค้นหาจำนวนรอบที่เล่นไปแล้วของวันนี้เพื่อเอาไปโชว์ Badge เฉยๆ
  const today = new Date(); today.setHours(0,0,0,0);
  const { data: logs } = await s.from('match_logs').select('match_group').gte('ts', today.toISOString());
  const getPlayCount = (pid: string) => { let count = 0; logs?.forEach(l => { try { if(JSON.parse(l.match_group||'[]').includes(pid)) count++; } catch(e){} }); return count; }

  // 🟢 ส่งผู้เล่นกลับเข้าคิว โดยอัปเดตเวลา (ts) เป็นเวลาปัจจุบัน เพื่อให้ไปต่อท้ายแถวเสมอ
  for (const p of players) {
    const type = String(p.id).startsWith('G') ? 'Guest' : 'Emp';
    await s.from('player_queue').insert({ 
        id: p.id, 
        name: p.name, 
        skill: p.skill, 
        type, 
        play_count: getPlayCount(p.id) + 1,
        ts: new Date().toISOString() 
    });
  }

  const duration = Math.round((Date.now() - new Date(active.start_time).getTime()) / 60000);
  await s.from('match_logs').insert({ action: 'MATCH_FINISH', court, match_group: JSON.stringify(players.map(p=>p.id)), duration });

  const { data: conf } = await s.from('system_config').select('value').eq('key', 'AutoMatch').single();
  if (conf?.value === 'true') {
     const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
     fetch(`${baseUrl}/api/match`, { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ mode: 'smart' }) }).catch(()=>{});
  }

  return NextResponse.json({ status: 'success' });
}