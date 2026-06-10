export type Player = { id: string; name: string; skill: number; timestamp?: string; type?: string; playCount?: number; }
export type MatchHistory = { t1: string[]; t2: string[]; }

function isSameTeam(teamA: string[], teamB: string[]) {
  return (teamA.includes(teamB[0]) && teamA.includes(teamB[1]));
}

// ฟังก์ชันช่วยเช็คว่า 2 คนนี้เคยเจอกันในแมทช์เดียวกันไหม (ไม่ว่าจะทีมเดียวกันหรือฝั่งตรงข้าม)
function playedTogether(id1: string, id2: string, historyMatch: MatchHistory) {
  const allPlayers = [...historyMatch.t1, ...historyMatch.t2];
  return allPlayers.includes(id1) && allPlayers.includes(id2);
}

function checkHistoryPenalty(t1: Player[], t2: Player[], history: MatchHistory[]): number {
  if (!history || history.length === 0) return 0;
  let penalty = 0;
  const t1Ids = [t1[0].id, t1[1].id];
  const t2Ids = [t2[0].id, t2[1].id];
  
  // ให้เช็คย้อนหลังแค่ประมาณ 15 แมทช์ล่าสุด
  const recentHistory = history.slice(0, 15); 

  for (const h of recentHistory) {
    // 1. ซ้ำทีมเดิม (คู่เดิมที่เคยเล่นด้วยกัน) -> หักคะแนน
    if (isSameTeam(h.t1, t1Ids) || isSameTeam(h.t2, t1Ids)) penalty += 100; 
    if (isSameTeam(h.t1, t2Ids) || isSameTeam(h.t2, t2Ids)) penalty += 100; 
    
    // 2. ซ้ำแมทช์เดิมเป๊ะ (4 คนนี้เพิ่งเจอกันมาในคอร์ท) -> หักคะแนนหนัก
    if ((isSameTeam(h.t1, t1Ids) && isSameTeam(h.t2, t2Ids)) || 
        (isSameTeam(h.t1, t2Ids) && isSameTeam(h.t2, t1Ids))) {
      penalty += 500; 
    }

    // 3. หักคะแนนยิบย่อยถ้าเคยลงคอร์ทพร้อมกัน
    const currentMatchPlayers = [...t1Ids, ...t2Ids];
    let togetherCount = 0;
    for (let i = 0; i < currentMatchPlayers.length; i++) {
       for (let j = i + 1; j < currentMatchPlayers.length; j++) {
          if (playedTogether(currentMatchPlayers[i], currentMatchPlayers[j], h)) {
             togetherCount++;
          }
       }
    }
    penalty += (togetherCount * 15);
  }
  return penalty;
}

export function balanceTeams(players: Player[], history: MatchHistory[] = []) {
  const combos = [{ t1: [0,1], t2:[2,3] }, { t1: [0,2], t2:[1,3] }, { t1: [0,3], t2:[1,2] }];
  let bestScore = Number.POSITIVE_INFINITY;
  let bestOrder = players;
  let bestDiff = 0;
  for (const c of combos) {
    const team1 = [players[c.t1[0]], players[c.t1[1]]];
    const team2 = [players[c.t2[0]], players[c.t2[1]]];
    const diff = Math.abs((Number(team1[0].skill) + Number(team1[1].skill)) - (Number(team2[0].skill) + Number(team2[1].skill)));
    const penalty = checkHistoryPenalty(team1, team2, history);
    
    // 🌟 1. ปรับค่าน้ำหนัก: บังคับให้ความสมดุล (diff) เป็นเรื่องคอขาดบาดตายอันดับ 1
    // โดยการคูณ 10000 เข้าไป ส่วน Penalty หลักร้อยจะใช้ตอนที่ความสมดุลเท่ากันเท่านั้น
    const totalScore = (diff * 10000) + penalty;
    
    if (totalScore < bestScore) {
      bestScore = totalScore;
      bestDiff = diff;
      bestOrder = [team1[0], team1[1], team2[0], team2[1]]; 
    }
  }
  return { diff: bestDiff, teams: bestOrder };
}

// ฟังก์ชันใหม่สำหรับ Preview คิวที่เหลือทั้งหมด
export function predictNextMatches(queue: Player[], history: MatchHistory[] = []) {
  let tempQueue = [...queue];
  const predicted = [];
  while (tempQueue.length >= 4) {
    const match = extractBestMatch(tempQueue, history);
    if (!match) break;
    predicted.push(match);
    tempQueue = tempQueue.filter((_, idx) => !match.indices.includes(idx));
  }
  return predicted;
}

export function extractBestMatch(queue: Player[], history: MatchHistory[] = []) {
  if (queue.length < 4) return null;
  let bestFallback: any = null;
  let bestFallbackScore = Infinity;
  
  for (let i = 0; i < queue.length - 3; i++) {
    for (let j = i + 1; j < Math.min(queue.length - 2, i + 6); j++) {
      for (let k = j + 1; k < Math.min(queue.length - 1, j + 6); k++) {
        for (let l = k + 1; l < Math.min(queue.length, k + 6); l++) {
          const p = [queue[i], queue[j], queue[k], queue[l]];
          const combos = [ [[p[0], p[1]], [p[2], p[3]]], [[p[0], p[2]], [p[1], p[3]]], [[p[0], p[3]], [p[1], p[2]]] ];
          
          for (const [t1, t2] of combos) {
            const d1 = Math.abs(t1[0].skill - t1[1].skill);
            const d2 = Math.abs(t2[0].skill - t2[1].skill);
            const matchDiff = Math.abs((t1[0].skill + t1[1].skill) - (t2[0].skill + t2[1].skill));
            const penalty = checkHistoryPenalty(t1, t2, history);
            
            // เงื่อนไข Perfect Match: ห่างในทีม <= 2, ห่างระหว่างทีม <= 1 และไม่เคยเจอกันเลย
            if (d1 <= 2 && d2 <= 2 && matchDiff <= 1 && penalty === 0) {
              return { players: p, teams: [t1, t2], diff: matchDiff, indices: [i, j, k, l] };
            }
            
            // 🌟 2. ปรับค่าน้ำหนัก Fallback: 
            // - คูณ matchDiff ด้วย 10000 เพื่อไม่ให้ทีม 2 ฝั่งฝีมือห่างเกิน 1
            // - บวกคะแนน 2000 ถ้าคนในทีมเดียวกันฝีมือห่างเกิน 2
            // - Penalty หลักร้อยจะถูกพิจารณาทีหลังสุดเพื่อหาคนที่เล่นไม่ซ้ำกัน
            const score = (matchDiff * 10000) + (d1 > 2 ? 2000 : 0) + (d2 > 2 ? 2000 : 0) + penalty + (i + j + k + l);
            
            if (score < bestFallbackScore) {
              bestFallbackScore = score;
              bestFallback = { players: p, teams: [t1, t2], diff: matchDiff, indices: [i, j, k, l] };
            }
          }
        }
      }
    }
  }
  return bestFallback;
}