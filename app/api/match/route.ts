import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

// --- ฟังก์ชันจัดทีมให้สูสีที่สุด (Balance Teams) ---
function balanceFourPlayers(players: any[]) {
  // รูปแบบการจับคู่ที่เป็นไปได้ทั้งหมด 3 แบบสำหรับ 4 คน
  const combos = [
    { t1: [0, 1], t2: [2, 3] }, // แบบที่ 1: คนที่ 1,2 VS 3,4
    { t1: [0, 2], t2: [1, 3] }, // แบบที่ 2: คนที่ 1,3 VS 2,4
    { t1: [0, 3], t2: [1, 2] }  // แบบที่ 3: คนที่ 1,4 VS 2,3
  ];

  let bestDiff = Number.POSITIVE_INFINITY;
  let bestCombos: any[][] = []; // เก็บรูปแบบที่ดีที่สุดไว้ (เผื่อมีค่า Diff เท่ากัน)

  for (const c of combos) {
    const s1 = Number(players[c.t1[0]].skill) + Number(players[c.t1[1]].skill);
    const s2 = Number(players[c.t2[0]].skill) + Number(players[c.t2[1]].skill);
    const diff = Math.abs(s1 - s2); // หาความห่างของฝีมือทั้งสองทีม

    const currentOrder = [players[c.t1[0]], players[c.t1[1]], players[c.t2[0]], players[c.t2[1]]];

    if (diff < bestDiff) {
      bestDiff = diff;
      bestCombos = [currentOrder]; // เจอแบบที่สูสีกว่า ให้ล้างของเก่าทิ้งแล้วจำแบบใหม่
    } else if (diff === bestDiff) {
      bestCombos.push(currentOrder); // ถ้าสูสีเท่ากัน ให้เก็บไว้เป็นตัวเลือก
    }
  }

  // 🌟 ไฮไลท์: ถ้ามีรูปแบบที่สูสีเท่ากันหลายแบบ ให้ "สุ่ม" เลือก
  // จะช่วยแก้ปัญหา 4 คนเดิมเล่นจบ กลับมาต่อคิวใหม่ แล้วได้คู่เดิมซ้ำๆ ครับ
  const randomIndex = Math.floor(Math.random() * bestCombos.length);
  return bestCombos[randomIndex];
}

export async function POST(req: Request) {
  const s = supabaseAdmin;

  // 1. เช็คคอร์ทที่ว่าง
  const { data: courtsConf } = await s.from('system_config').select('value').eq('key', 'Courts').single();
  const allCourts = courtsConf ? String(courtsConf.value).split(',').map(x => x.trim()) : ['Court 1'];
  const { data: playing } = await s.from('active_courts').select('court');
  const playingNames = playing?.map(p => p.court) || [];
  const availableCourts = allCourts.filter(c => !playingNames.includes(c));

  if (availableCourts.length === 0) return NextResponse.json({ status: 'warning', message: 'No courts available' });

  // 2. ดึงคิวแบบ "เข้าก่อนได้ก่อน (FIFO)" อย่างเคร่งครัด
  const { data: queueRaw } = await s.from('player_queue').select('*').order('ts', { ascending: true });
  let queue = queueRaw || [];

  if (queue.length < 4) return NextResponse.json({ status: 'warning', message: 'Not enough players in queue (Need at least 4)' });

  let matchesCreated = 0;

  for (const court of availableCourts) {
    if (queue.length < 4) break;

    // 3. ดึง 4 คนแรกออกมาจากแถว
    let selected = queue.splice(0, 4);

    // 4. โยน 4 คนนี้เข้าฟังก์ชันชั่งน้ำหนักให้ทีมออกมาสูสีที่สุด
    const finalTeams = balanceFourPlayers(selected);

    // 5. บันทึกเข้าสนาม
    await s.from('active_courts').insert({
      court,
      p1_id: finalTeams[0].id, p1_name: finalTeams[0].name, p1_skill: finalTeams[0].skill,
      p2_id: finalTeams[1].id, p2_name: finalTeams[1].name, p2_skill: finalTeams[1].skill,
      p3_id: finalTeams[2].id, p3_name: finalTeams[2].name, p3_skill: finalTeams[2].skill,
      p4_id: finalTeams[3].id, p4_name: finalTeams[3].name, p4_skill: finalTeams[3].skill,
      start_time: new Date().toISOString()
    });

    // 6. ลบ 4 คนนี้ออกจากคิวรอ
    await s.from('player_queue').delete().in('id', selected.map(x => x.id));
    matchesCreated++;
  }

  return NextResponse.json({ status: 'success', message: `Started ${matchesCreated} matches successfully!` });
}