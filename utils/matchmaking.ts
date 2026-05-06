export type Player = {
  id: string;
  name: string;
  skill: number;
  timestamp?: string;
  type?: string;
  playCount?: number;
}

export type MatchHistory = {
  t1: string[]; // [id1, id2]
  t2: string[]; // [id3, id4]
}

// ตรวจสอบว่าเคยอยู่ทีมเดียวกันไหม
function isSameTeam(teamA: string[], teamB: string[]) {
  return (teamA.includes(teamB[0]) && teamA.includes(teamB[1]));
}

// คำนวณค่าปรับ (Penalty) ยิ่งค่าปรับเยอะ ยิ่งไม่อยากจับคู่ให้
function checkHistoryPenalty(t1: Player[], t2: Player[], history: MatchHistory[]): number {
  if (!history || history.length === 0) return 0;
  
  let penalty = 0;
  const t1Ids = [t1[0].id, t1[1].id];
  const t2Ids = [t2[0].id, t2[1].id];

  for (const h of history) {
    const sameT1 = isSameTeam(h.t1, t1Ids) || isSameTeam(h.t2, t1Ids);
    const sameT2 = isSameTeam(h.t1, t2Ids) || isSameTeam(h.t2, t2Ids);
    
    // โดนปรับ 50 คะแนน ถ้าคู่ใดคู่หนึ่งดันเป็นคู่เดิม
    if (sameT1) penalty += 50; 
    if (sameT2) penalty += 50; 
    
    // โดนปรับ 200 คะแนน (หนักสุด) ถ้าแมตช์นี้คือคู่เดิมเป๊ะๆ มาเจอกันอีกรอบ
    if ((isSameTeam(h.t1, t1Ids) && isSameTeam(h.t2, t2Ids)) || 
        (isSameTeam(h.t1, t2Ids) && isSameTeam(h.t2, t1Ids))) {
      penalty += 200; 
    }
  }
  return penalty;
}

// 1. ฟังก์ชันจับคู่แบบ Balanced (เน้นฝีมือใกล้เคียง + ไม่ซ้ำคู่เดิม)
export function balanceTeams(players: Player[], history: MatchHistory[] = []) {
  const combos = [
    { t1: [0,1], t2:[2,3] },
    { t1: [0,2], t2:[1,3] },
    { t1: [0,3], t2:[1,2] }
  ];
  
  let bestScore = Number.POSITIVE_INFINITY;
  let bestOrder = players;
  let bestDiff = 0;

  for (const c of combos) {
    const team1 = [players[c.t1[0]], players[c.t1[1]]];
    const team2 = [players[c.t2[0]], players[c.t2[1]]];
    
    const s1 = Number(team1[0].skill) + Number(team1[1].skill);
    const s2 = Number(team2[0].skill) + Number(team2[1].skill);
    
    const diff = Math.abs(s1 - s2);
    const penalty = checkHistoryPenalty(team1, team2, history);
    
    const totalScore = diff + penalty; // เอาความห่างฝีมือ + ค่าปรับเล่นซ้ำ

    if (totalScore < bestScore) {
      bestScore = totalScore;
      bestDiff = diff;
      bestOrder = [team1[0], team1[1], team2[0], team2[1]];
    }
  }
  return { diff: bestDiff, teams: bestOrder };
}

// 2. ฟังก์ชันจับคู่แบบ Smart (เงื่อนไขในทีมห่างไม่เกิน 3, ทีมชนทีมห่างไม่เกิน 1 + ไม่ซ้ำคู่เดิม)
export function extractBestMatch(queue: Player[], history: MatchHistory[] = []) {
  if (queue.length < 4) return null;
  let bestFallback: any = null;
  let bestFallbackScore = Infinity;

  for (let i = 0; i < queue.length - 3; i++) {
    for (let j = i + 1; j < Math.min(queue.length - 2, i + 6); j++) {
      for (let k = j + 1; k < Math.min(queue.length - 1, j + 6); k++) {
        for (let l = k + 1; l < Math.min(queue.length, k + 6); l++) {
          const p1 = queue[i], p2 = queue[j], p3 = queue[k], p4 = queue[l];
          const combos = [
            [[p1, p2], [p3, p4]],
            [[p1, p3], [p2, p4]],
            [[p1, p4], [p2, p3]]
          ];

          for (const [t1, t2] of combos) {
            const diff1 = Math.abs(Number(t1[0].skill) - Number(t1[1].skill));
            const diff2 = Math.abs(Number(t2[0].skill) - Number(t2[1].skill));
            const sum1 = Number(t1[0].skill) + Number(t1[1].skill);
            const sum2 = Number(t2[0].skill) + Number(t2[1].skill);
            const matchDiff = Math.abs(sum1 - sum2);

            const penalty = checkHistoryPenalty(t1, t2, history);

            // แมตช์สมบูรณ์แบบ (ฝีมือใกล้ และ ไม่เคยเล่นคู่กันเลย penalty = 0)
            if (diff1 <= 3 && diff2 <= 3 && matchDiff <= 1 && penalty === 0) {
              return { players: [p1, p2, p3, p4], teams: [t1, t2], diff: matchDiff, indices: [i, j, k, l] };
            }

            // ถ้าหาเพอร์เฟคไม่ได้ ให้จัดลำดับความเหมาะสม (โดนปรับน้อยสุดขึ้นก่อน)
            const fallbackScore = matchDiff + (diff1 > 3 ? 5 : 0) + (diff2 > 3 ? 5 : 0) + (i + j + k + l) + penalty;
            if (fallbackScore < bestFallbackScore) {
              bestFallbackScore = fallbackScore;
              bestFallback = { players: [p1, p2, p3, p4], teams: [t1, t2], diff: matchDiff, indices: [i, j, k, l] };
            }
          }
        }
      }
    }
  }
  return bestFallback;
}