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
    
    const diff = Math.abs((Number(team1[0].skill) + Number(team1[1].skill)) - (Number(team2[0].skill) + Number(team2[1].skill)));
    const penalty = checkHistoryPenalty(team1, team2, history);
    const totalScore = diff + penalty;

    if (totalScore < bestScore) {
      bestScore = totalScore;
      bestDiff = diff;
      // บังคับให้โครงสร้างเป็น 4 คนเรียงเป๊ะๆ
      bestOrder = [team1[0], team1[1], team2[0], team2[1]]; 
    }
  }
  return { diff: bestDiff, teams: bestOrder };
}

export function extractBestMatch(queue: Player[], history: MatchHistory[] = []) {
  if (queue.length < 4) return null;
  let bestFallback: any = null;
  let bestFallbackScore = Infinity;

  for (let i = 0; i < queue.length - 3; i++) {
    for (let j = i + 1; j < Math.min(queue.length - 2, i + 6); j++) {
      for (let k = j + 1; k < Math.min(queue.length - 1, j + 6); k++) {
        for (let l = k + 1; l < Math.min(queue.length, k + 6); l++) {
          const p1 = queue[i], p2 = queue[j], p3 = queue[k], p4 = queue[l];
          const combos = [ [[p1, p2], [p3, p4]], [[p1, p3], [p2, p4]], [[p1, p4], [p2, p3]] ];

          for (const [t1, t2] of combos) {
            const diff1 = Math.abs(Number(t1[0].skill) - Number(t1[1].skill));
            const diff2 = Math.abs(Number(t2[0].skill) - Number(t2[1].skill));
            const matchDiff = Math.abs((Number(t1[0].skill) + Number(t1[1].skill)) - (Number(t2[0].skill) + Number(t2[1].skill)));
            const penalty = checkHistoryPenalty(t1, t2, history);

            if (diff1 <= 3 && diff2 <= 3 && matchDiff <= 1 && penalty === 0) {
              return { players: [p1, p2, p3, p4], teams: [t1, t2], diff: matchDiff, indices: [i, j, k, l] };
            }

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