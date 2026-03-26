import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

// --- ฟังก์ชันหาความสมดุลของ 4 คน ---
function balanceFourPlayers(players: any[]) {
  // 1. เรียงฝีมือจากเก่งสุดไปอ่อนสุด
  let sortedPlayers = [...players].sort((a, b) => Number(b.skill) - Number(a.skill));
  
  // 2. รูปแบบการจัดทีมที่เป็นไปได้ทั้งหมด 3 รูปแบบ
  const combos = [
    { t1: [0, 1], t2: [2, 3] }, // ทีม (อันดับ 1+2) VS (อันดับ 3+4)
    { t1: [0, 2], t2: [1, 3] }, // ทีม (อันดับ 1+3) VS (อันดับ 2+4)
    { t1: [0, 3], t2: [1, 2] }  // ทีม (เก่งสุด+อ่อนสุด) VS (กลาง+กลาง) -> รูปแบบนี้มักจะทำให้ diff ใกล้ 0 ที่สุด
  ];

  let bestDiff = Number.POSITIVE_INFINITY;
  let bestCombos: any[][] = [];

  // 3. คำนวณหาความห่าง (Diff)
  for (const c of combos) {
    const sumTeam1 = Number(sortedPlayers[c.t1[0]].skill) + Number(sortedPlayers[c.t1[1]].skill);
    const sumTeam2 = Number(sortedPlayers[c.t2[0]].skill) + Number(sortedPlayers[c.t2[1]].skill);
    const diff = Math.abs(sumTeam1 - sumTeam2);

    const currentOrder = [sortedPlayers[c.t1[0]], sortedPlayers[c.t1[1]], sortedPlayers[c.t2[0]], sortedPlayers[c.t2[1]]];

    // เก็บรูปแบบที่ผลรวมสองทีมใกล้เคียงกันที่สุด
    if (diff < bestDiff) {
      bestDiff = diff;
      bestCombos = [currentOrder];
    } else if (diff === bestDiff) {
      bestCombos.push(currentOrder); // ถ้าบาลานซ์เท่ากัน เก็บเป็นตัวเลือกไว้สุ่ม
    }
  }

  // 4. สุ่มเลือก 1 รูปแบบที่สมดุลที่สุด เพื่อให้เจอคู่แข่งไม่ซ้ำหน้า
  const randomIndex = Math.floor(Math.random() * bestCombos.length);
  return { teams: bestCombos[randomIndex], diff: bestDiff };
}

export async function POST(req: Request) {
  const s = supabaseAdmin;

  const { data: courtsConf } = await s.from('system_config').select('value').eq('key', 'Courts').single();
  const allCourts = courtsConf ? String(courtsConf.value).split(',').map(x => x.trim()) : ['Court 1'];
  const { data: playing } = await s.from('active_courts').select('court');
  const playingNames = playing?.map(p => p.court) || [];
  const availableCourts = allCourts.filter(c => !playingNames.includes(c));

  if (availableCourts.length === 0) return NextResponse.json({ status: 'warning', message: 'No courts available' });

  // ดึงคิวทั้งหมด เรียงตามเวลาเข้าคิว (มาก่อนได้ก่อน)
  const { data: queueRaw } = await s.from('player_queue').select('*').order('ts', { ascending: true });
  let queue = queueRaw || [];

  let matchesCreated = 0;

  for (const court of availableCourts) {
    if (queue.length < 4) break;

    let selectedGroup: any[] | null = null;
    let bestTeams: any[] = [];
    let groupIndices: number[] = [];

    // --- 🌟 Smart Matchmaking Logic 🌟 ---
    // ดึง 4 คนแรกมาเช็คก่อน
    let tempGroup = [queue[0], queue[1], queue[2], queue[3]];
    let balanced = balanceFourPlayers(tempGroup);
    
    // กฎเหล็ก: ผลรวมฝีมือของ 2 ทีม ต้องห่างกันไม่เกิน 1
    if (balanced.diff <= 1) {
       selectedGroup = tempGroup;
       bestTeams = balanced.teams;
       groupIndices = [0, 1, 2, 3];
    } else {
       // ถ้า 4 คนแรกฝีมือห่างกันเกินไป เราจะมองหาคนที่ 5, 6, 7 ในคิวมาสลับ (ยอมข้ามคิวชั่วคราวเพื่อให้เกมสนุก)
       let foundBetter = false;
       const searchDepth = Math.min(queue.length, 7); // ค้นหาลึกลงไปในคิวไม่เกินคนที่ 7
       
       for(let i=0; i<4; i++) { 
         if(foundBetter) break;
         for(let j=4; j<searchDepth; j++) {
            let testGroup = [...tempGroup];
            testGroup[i] = queue[j]; // ลองถอดคนที่ i ออก แล้วเอาคนที่ j มาเสียบแทน
            let testBalanced = balanceFourPlayers(testGroup);
            
            // ถ้าสลับแล้วได้ Diff <= 1 ถือว่าเจอทีมที่เพอร์เฟค!
            if (testBalanced.diff <= 1) {
               selectedGroup = testGroup;
               bestTeams = testBalanced.teams;
               groupIndices = [0, 1, 2, 3].filter(idx => idx !== i).concat(j);
               foundBetter = true;
               break;
            }
         }
       }
       
       // ถ้ายอมล้วงคิวลึกแล้วก็ยังหาคู่ความต่าง <= 1 ไม่ได้ (เช่น ในคิวมีแต่คนฝีมือ Level 4 ล้วนๆ) 
       // ก็จำใจต้องปล่อย 4 คนแรกไปเล่นตามคิวปกติ เพื่อไม่ให้คิวตาย
       if (!selectedGroup) {
          selectedGroup = tempGroup;
          bestTeams = balanced.teams;
          groupIndices = [0, 1, 2, 3];
       }
    }

    // เอาคนที่ถูกเลือกทั้ง 4 คนออกจาก Array ของ Queue
    // ต้องเรียงลำดับ Index จากมากไปน้อยก่อนลบ (เช่น ลบคนที่ 5 ก่อนค่อยลบคนที่ 1) เพื่อไม่ให้ตำแหน่งใน Array เลื่อน
    groupIndices.sort((a,b) => b - a).forEach(idx => {
       queue.splice(idx, 1);
    });

    // บันทึกคนทั้ง 4 เข้าสู่คอร์ทสนาม
    await s.from('active_courts').insert({
      court,
      p1_id: bestTeams[0].id, p1_name: bestTeams[0].name, p1_skill: bestTeams[0].skill,
      p2_id: bestTeams[1].id, p2_name: bestTeams[1].name, p2_skill: bestTeams[1].skill,
      p3_id: bestTeams[2].id, p3_name: bestTeams[2].name, p3_skill: bestTeams[2].skill,
      p4_id: bestTeams[3].id, p4_name: bestTeams[3].name, p4_skill: bestTeams[3].skill,
      start_time: new Date().toISOString()
    });

    // ลบคนที่ลงสนามแล้วออกจากฐานข้อมูลคิวรอ
    await s.from('player_queue').delete().in('id', selectedGroup.map(x => x.id));
    matchesCreated++;
  }

  return NextResponse.json({ status: 'success', message: `Started ${matchesCreated} matches` });
}