export type Player = {
  id: string;
  name: string;
  skill: number;
  timestamp?: string;
  type?: string;
  playCount?: number;
}

// 1. ฟังก์ชันจับคู่แบบดั้งเดิม (Balanced)
export function balanceTeams(players: Player[]) {
  const combos = [
    { t1: [0,1], t2:[2,3] },
    { t1: [0,2], t2:[1,3] },
    { t1: [0,3], t2:[1,2] }
  ];
  let bestDiff = Number.POSITIVE_INFINITY;
  let bestOrder = players;
  for (const c of combos) {
    const s1 = Number(players[c.t1[0]].skill) + Number(players[c.t1[1]].skill);
    const s2 = Number(players[c.t2[0]].skill) + Number(players[c.t2[1]].skill);
    const diff = Math.abs(s1 - s2);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestOrder = [players[c.t1[0]], players[c.t1[1]], players[c.t2[0]], players[c.t2[1]]];
    }
  }
  return { diff: bestDiff, teams: bestOrder };
}

// 2. ฟังก์ชันจับคู่แบบ Smart (เงื่อนไขในทีมห่างไม่เกิน 3, ทีมชนทีมห่างไม่เกิน 1, รักษาระบบคิว FIFO)
export function extractBestMatch(queue: Player[]) {
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

            if (diff1 <= 3 && diff2 <= 3 && matchDiff <= 1) {
              return { players: [p1, p2, p3, p4], teams: [t1, t2], diff: matchDiff, indices: [i, j, k, l] };
            }

            const fallbackScore = matchDiff + (diff1 > 3 ? 5 : 0) + (diff2 > 3 ? 5 : 0) + (i + j + k + l);
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