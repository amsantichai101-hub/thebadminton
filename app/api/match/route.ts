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

function getTeamStructure(players: any[]) {
  const sorted = [...players].sort((a,b)=>Number(b.skill)-Number(a.skill));
  const minSkill = sorted[3]?.skill ?? 0;
  const maxSkill = sorted[0]?.skill ?? 0;
  const total = sorted.reduce((sum:any,p:any)=>sum + Number(p.skill), 0);
  const diff = maxSkill - minSkill;
  const avg = total / (sorted.length||1);
  return { sorted, minSkill, maxSkill, diff, avg };
}

function modeCheck(group: any[], mode: string) {
  const stats = getTeamStructure(group);
  const balanced = balanceFourPlayers(group);
  const team1 = [balanced.teams[0], balanced.teams[1]];
  const team2 = [balanced.teams[2], balanced.teams[3]];
  const team1Sum = Number(team1[0].skill) + Number(team1[1].skill);
  const team2Sum = Number(team2[0].skill) + Number(team2[1].skill);
  const teamDiff = Math.abs(team1Sum - team2Sum);

  const sameLevel = stats.minSkill === stats.maxSkill;
  const pairDiff = Math.max(...stats.sorted.map((p:any)=>p.skill)) - Math.min(...stats.sorted.map((p:any)=>p.skill));

  switch(mode) {
    case 'strict':
      return { ok: sameLevel, reason: 'same level required' };
    case 'balanced':
      return { ok: teamDiff <= 1 && stats.diff <= 1, reason: 'balanced <=1' };
    case 'flex':
      return { ok: teamDiff <= 1 && stats.diff <= 2, reason: 'flex 2' };
    case 'remix':
      return { ok: teamDiff <= 3, reason: 'remix loose' };
    case 'teach':
      // ฝึกโหมด: สนับสนุน 1 (แข็ง) + 4 (อ่อน) vs 2+3 เพื่อฝึกช่วยกัน
      const highest = stats.sorted[0];
      const lowest = stats.sorted[3];
      const isTeaching = [balanced.teams[0], balanced.teams[1]].some((p:any)=>p.id===highest.id) && [balanced.teams[0], balanced.teams[1]].some((p:any)=>p.id===lowest.id);
      return { ok: isTeaching && teamDiff <= 2, reason: 'teach mode' };
    case 'fun':
      return { ok: true, reason: 'fun mode no strict rules' };
    default:
      return { ok: teamDiff <= 1, reason: 'default balanced' };
  }
}

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
  const body = await req.json().catch(() => ({}));
  const forceMatches = typeof body.forceMatches === 'number' && body.forceMatches > 0 ? body.forceMatches : undefined;
  const requestedMode = typeof body.mode === 'string' ? String(body.mode).trim().toLowerCase() : undefined;

  const { data: courtsConf } = await s.from('system_config').select('value').eq('key', 'Courts').single();
  const { data: matchModeConf } = await s.from('system_config').select('value').eq('key', 'MatchMode').single();
  const matchMode = requestedMode || (matchModeConf ? String(matchModeConf.value).trim().toLowerCase() : 'balanced');

  const allCourts = courtsConf ? String(courtsConf.value).split(',').map(x => x.trim()) : ['Court 1'];
  const { data: playing } = await s.from('active_courts').select('court');
  const playingNames = playing?.map(p => p.court) || [];
  const availableCourts = allCourts.filter(c => !playingNames.includes(c));

  if (availableCourts.length === 0) return NextResponse.json({ status: 'warning', message: 'No courts available' });
  if (forceMatches && availableCourts.length < forceMatches) return NextResponse.json({ status: 'warning', message: `Need at least ${forceMatches} empty court(s)` });

  const courtPool = forceMatches ? availableCourts.slice(0, forceMatches) : availableCourts;

  // ดึงคิวทั้งหมด เรียงตามเวลาเข้าคิว (มาก่อนได้ก่อน)
  const { data: queueRaw } = await s.from('player_queue').select('*').order('ts', { ascending: true });
  let queue = queueRaw || [];

  let matchesCreated = 0;

  for (const court of courtPool) {
    if (queue.length < 4) break;

    let selectedGroup: any[] | null = null;
    let bestTeams: any[] = [];
    let groupIndices: number[] = [];

    const evaluateGroup = (indices: number[]) => {
      const candidate = indices.map(i => queue[i]);
      const modeResult = modeCheck(candidate, matchMode);
      const balancedResult = balanceFourPlayers(candidate);
      return {
        indices,
        candidate,
        teams: balancedResult.teams,
        diff: balancedResult.diff,
        modeOk: modeResult.ok,
        reason: modeResult.reason,
      };
    };

    const tryUseGroup = (evaluation: any) => {
      selectedGroup = evaluation.candidate;
      bestTeams = evaluation.teams;
      groupIndices = evaluation.indices;
    };

    // --- 🌟 Smart Matchmaking Logic 🌟 ---
    const first = evaluateGroup([0,1,2,3]);

    if (first.modeOk) {
      tryUseGroup(first);
    } else {
      // ค้นหาใน range ลึกขึ้นเพื่อให้เข้าสู่โหมดที่กำหนด
      let found = false;
      const searchDepth = Math.min(queue.length, 10);

      for (let i = 0; i < 4 && !found; i++) {
        for (let j = 4; j < searchDepth && !found; j++) {
          const candidateIndices = [0,1,2,3].map(k => (k===i ? j : k));
          const ev = evaluateGroup(candidateIndices);
          if (ev.modeOk) {
            tryUseGroup(ev);
            found = true;
          }
        }
      }

      // ถ้ายังไม่พอใจ mode ที่ “เข้มที่สุด” ให้ fallback เป็น balanced
      if (!found) {
        const fallback = evaluateGroup([0,1,2,3]);
        if (matchMode === 'strict' || matchMode === 'balanced') {
          if (!fallback.modeOk) {
            // บังคับให้ output ยังสำเร็จโดยใช้ balanced network
            const relaxed = modeCheck(fallback.candidate, 'balanced');
            if (relaxed.ok) {
              tryUseGroup(fallback);
              found = true;
            }
          }
        }
      }

      if (!found) {
        // สุดท้ายให้ใช้กลุ่มแรกเสมอเพื่อไม่ให้คิวติด
        tryUseGroup(first);
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