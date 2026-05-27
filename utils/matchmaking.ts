export type Player = { id: string; name: string; skill: number; timestamp?: string; type?: string; playCount?: number; }
export type MatchHistory = { t1: string[]; t2: string[]; }

function isSameTeam(teamA: string[], teamB: string[]) {
  return (teamA.includes(teamB[0]) && teamA.includes(teamB[1]));
}

function checkHistoryPenalty(t1: Player[], t2: Player[], history: MatchHistory[]): number {
  if (!history || history.length === 0) return 0;
  let penalty = 0;
  const t1Ids = [t1[0].id, t1[1].id];
  const t2Ids = [t2[0].id, t2[1].id];
  for (const h of history) {
    if (isSameTeam(h.t1, t1Ids) || isSameTeam(h.t2, t1Ids)) penalty += 50; 
    if (isSameTeam(h.t1, t2Ids) || isSameTeam(h.t2, t2Ids)) penalty += 50; 
    if ((isSameTeam(h.t1, t1Ids) && isSameTeam(h.t2, t2Ids)) || 
        (isSameTeam(h.t1, t2Ids) && isSameTeam(h.t2, t1Ids))) {
      penalty += 200; 
    }
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
    const totalScore = diff + penalty;
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
            const d1 = Math.abs(t1[0].skill - t1[1].skill), d2 = Math.abs(t2[0].skill - t2[1].skill);
            const matchDiff = Math.abs((t1[0].skill + t1[1].skill) - (t2[0].skill + t2[1].skill));
            const penalty = checkHistoryPenalty(t1, t2, history);
            if (d1 <= 3 && d2 <= 3 && matchDiff <= 1 && penalty === 0) {
              return { players: p, teams: [t1, t2], diff: matchDiff, indices: [i, j, k, l] };
            }
            const score = matchDiff + (d1 > 3 ? 5 : 0) + (d2 > 3 ? 5 : 0) + (i + j + k + l) + penalty;
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