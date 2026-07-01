export type Player = {
  id: string;
  name: string;
  skill: number;
  timestamp?: string;
  type?: string;
  playCount?: number;
};

export type MatchHistory = {
  t1: string[];
  t2: string[];
  playedAt?: string; // ต้องมีเพื่อ filter log ของวันปัจจุบัน
};

function normalizeIds(ids: string[]) {
  return [...ids].sort();
}

function isSameTeam(teamA: string[], teamB: string[]) {
  if (teamA.length !== teamB.length) return false;
  const a = normalizeIds(teamA);
  const b = normalizeIds(teamB);
  return a[0] === b[0] && a[1] === b[1];
}

// เช็คว่า 2 คนนี้เคยอยู่ใน match เดียวกันไหม (ไม่ว่าจะทีมเดียวกันหรือฝั่งตรงข้าม)
function playedTogether(id1: string, id2: string, historyMatch: MatchHistory) {
  const allPlayers = [...historyMatch.t1, ...historyMatch.t2];
  return allPlayers.includes(id1) && allPlayers.includes(id2);
}

// เช็คว่าเป็นวันเดียวกับวันที่รันอยู่หรือไม่
function isSameLocalDay(dateStr: string, targetDate = new Date()) {
  const d = new Date(dateStr);
  return (
    d.getFullYear() === targetDate.getFullYear() &&
    d.getMonth() === targetDate.getMonth() &&
    d.getDate() === targetDate.getDate()
  );
}

// ใช้เฉพาะ log ของ "วันนี้" และ 15 แมตช์ล่าสุด
function getTodayRecentHistory(
  history: MatchHistory[],
  targetDate = new Date(),
  limit = 15
) {
  return [...history]
    .filter((h) => !!h.playedAt && isSameLocalDay(h.playedAt, targetDate))
    .sort((a, b) => {
      const ta = new Date(a.playedAt || "").getTime();
      const tb = new Date(b.playedAt || "").getTime();
      return tb - ta; // ล่าสุดก่อน
    })
    .slice(0, limit);
}

// เช็ค exact match ว่า 2 ทีมนี้ตรงกับ match เก่าหรือไม่ (สลับฝั่งได้)
function isExactSameMatch(t1Ids: string[], t2Ids: string[], h: MatchHistory) {
  return (
    (isSameTeam(h.t1, t1Ids) && isSameTeam(h.t2, t2Ids)) ||
    (isSameTeam(h.t1, t2Ids) && isSameTeam(h.t2, t1Ids))
  );
}

// เช็คว่าเป็น "4 คนชุดเดิม" หรือไม่ แม้จะสลับทีม
function isSameFourPlayers(t1Ids: string[], t2Ids: string[], h: MatchHistory) {
  const current = normalizeIds([...t1Ids, ...t2Ids]);
  const oldMatch = normalizeIds([...h.t1, ...h.t2]);

  return current.length === oldMatch.length && current.every((id, idx) => id === oldMatch[idx]);
}

/**
 * HARD BLOCK:
 * - ถ้าทีมเดิมซ้ำ -> block
 * - ถ้า exact match เดิม -> block
 * - ถ้า 4 คนเดิมทั้งชุด -> block
 *
 * ใช้เฉพาะ log ของวันปัจจุบัน
 */
function isBlockedByHistory(
  t1: Player[],
  t2: Player[],
  history: MatchHistory[],
  targetDate = new Date()
) {
  const todayHistory = getTodayRecentHistory(history, targetDate, 15);
  if (todayHistory.length === 0) return false;

  const t1Ids = [t1[0].id, t1[1].id];
  const t2Ids = [t2[0].id, t2[1].id];

  for (const h of todayHistory) {
    const team1Duplicate = isSameTeam(h.t1, t1Ids) || isSameTeam(h.t2, t1Ids);
    const team2Duplicate = isSameTeam(h.t1, t2Ids) || isSameTeam(h.t2, t2Ids);
    const exactSameMatch = isExactSameMatch(t1Ids, t2Ids, h);
    const sameFourPlayers = isSameFourPlayers(t1Ids, t2Ids, h);

    if (team1Duplicate || team2Duplicate || exactSameMatch || sameFourPlayers) {
      return true;
    }
  }

  return false;
}

/**
 * คำนวณค่า Penalty ของคู่เล่น
 * ยิ่ง Penalty สูง ยิ่งไม่ควรเลือก (เพราะเคยเจอกันบ่อยแล้ว)
 */
function checkHistoryPenalty(
  t1: Player[],
  t2: Player[],
  history: MatchHistory[],
  targetDate = new Date()
): number {
  const recentHistory = getTodayRecentHistory(history, targetDate, 30); // เพิ่ม history เป็น 30 แมตช์
  if (recentHistory.length === 0) return 0;

  let penalty = 0;
  const currentMatchPlayers = [...t1, ...t2];

  // เก็บ ID ของผู้เล่นในปัจจุบัน
  const currentIds = currentMatchPlayers.map(p => p.id);

  for (const h of recentHistory) {
    const historyPlayers = [...h.t1, ...h.t2];
    
    // นับจำนวนคนที่เคยเจอกันมาก่อนในแมตช์นี้
    let meetCount = 0;
    for (const pid of currentIds) {
      if (historyPlayers.includes(pid)) {
        meetCount++;
      }
    }

    // 🔥 LOGIC ใหม่: 
    // ถ้าในแมตช์นี้ มีคนจากแมตช์เก่ามาเจอกันเยอะ Penalty จะยิ่งสูง
    // ถ้าเคยเจอกัน 2 คนในแมตช์เก่า = +100
    // ถ้าเคยเจอกัน 3 คนในแมตช์เก่า = +300
    // ถ้าเคยเจอกัน 4 คน (ครบชุดเดิม) = +1000 (Block หนัก)
    if (meetCount >= 2) {
      if (meetCount === 2) penalty += 150;
      if (meetCount === 3) penalty += 400;
      if (meetCount === 4) penalty += 1200;
    }

    // Penalty พิเศษ: ทีมเดิม (ถ้าเคยอยู่ทีมเดียวกันเป๊ะๆ)
    const isSameTeam1 = isSameTeam(h.t1, [t1[0].id, t1[1].id]) || isSameTeam(h.t2, [t1[0].id, t1[1].id]);
    const isSameTeam2 = isSameTeam(h.t1, [t2[0].id, t2[1].id]) || isSameTeam(h.t2, [t2[0].id, t2[1].id]);
    
    if (isSameTeam1 || isSameTeam2) {
      penalty += 200; 
    }
  }

  return penalty;
}

export function balanceTeams(
  players: Player[],
  history: MatchHistory[] = [],
  targetDate = new Date()
) {
  const combos = [
    { t1: [0, 1], t2: [2, 3] },
    { t1: [0, 2], t2: [1, 3] },
    { t1: [0, 3], t2: [1, 2] }
  ];

  let bestScore = Number.POSITIVE_INFINITY;
  let bestOrder = players;
  let bestDiff = 0;

  for (const c of combos) {
    const team1 = [players[c.t1[0]], players[c.t1[1]]];
    const team2 = [players[c.t2[0]], players[c.t2[1]]];

    // ✅ ถ้าซ้ำตามกติกา -> ทิ้ง candidate ทันที
    if (isBlockedByHistory(team1, team2, history, targetDate)) {
      continue;
    }

    const diff = Math.abs(
      (Number(team1[0].skill) + Number(team1[1].skill)) -
      (Number(team2[0].skill) + Number(team2[1].skill))
    );

    const penalty = checkHistoryPenalty(team1, team2, history, targetDate);
    const totalScore = diff * 10000 + penalty;

    if (totalScore < bestScore) {
      bestScore = totalScore;
      bestDiff = diff;
      bestOrder = [team1[0], team1[1], team2[0], team2[1]];
    }
  }

  // ถ้าโดน block หมดทุก combo -> fallback กลับไปใช้แบบเดิม (เพื่อไม่ให้ตัน)
  if (bestScore === Number.POSITIVE_INFINITY) {
    for (const c of combos) {
      const team1 = [players[c.t1[0]], players[c.t1[1]]];
      const team2 = [players[c.t2[0]], players[c.t2[1]]];

      const diff = Math.abs(
        (Number(team1[0].skill) + Number(team1[1].skill)) -
        (Number(team2[0].skill) + Number(team2[1].skill))
      );

      const penalty = checkHistoryPenalty(team1, team2, history, targetDate);
      const totalScore = diff * 10000 + penalty;

      if (totalScore < bestScore) {
        bestScore = totalScore;
        bestDiff = diff;
        bestOrder = [team1[0], team1[1], team2[0], team2[1]];
      }
    }
  }

  return { diff: bestDiff, teams: bestOrder };
}

export function extractBestMatch(
  queue: Player[],
  history: MatchHistory[] = [],
  targetDate = new Date()
) {
  if (queue.length < 4) return null;

  let bestFallback: any = null;
  let bestFallbackScore = Infinity;

  // PASS 1: Strict mode -> ห้ามซ้ำจริง
  for (let i = 0; i < queue.length - 3; i++) {
    for (let j = i + 1; j < Math.min(queue.length - 2, i + 6); j++) {
      for (let k = j + 1; k < Math.min(queue.length - 1, j + 6); k++) {
        for (let l = k + 1; l < Math.min(queue.length, k + 6); l++) {
          const p = [queue[i], queue[j], queue[k], queue[l]];

          const combos = [
            [[p[0], p[1]], [p[2], p[3]]],
            [[p[0], p[2]], [p[1], p[3]]],
            [[p[0], p[3]], [p[1], p[2]]]
          ];

          for (const [t1, t2] of combos) {
            // ✅ ถ้าซ้ำ -> ข้ามทันที
            if (isBlockedByHistory(t1, t2, history, targetDate)) {
              continue;
            }

            const d1 = Math.abs(t1[0].skill - t1[1].skill);
            const d2 = Math.abs(t2[0].skill - t2[1].skill);
            const matchDiff = Math.abs(
              (t1[0].skill + t1[1].skill) - (t2[0].skill + t2[1].skill)
            );
            const penalty = checkHistoryPenalty(t1, t2, history, targetDate);

            if (d1 <= 2 && d2 <= 2 && matchDiff <= 1 && penalty === 0) {
              return {
                players: p,
                teams: [t1, t2],
                diff: matchDiff,
                indices: [i, j, k, l]
              };
            }

            const score =
              matchDiff * 10000 +
              (d1 > 2 ? 2000 : 0) +
              (d2 > 2 ? 2000 : 0) +
              penalty +
              (i + j + k + l);

            if (score < bestFallbackScore) {
              bestFallbackScore = score;
              bestFallback = {
                players: p,
                teams: [t1, t2],
                diff: matchDiff,
                indices: [i, j, k, l]
              };
            }
          }
        }
      }
    }
  }

  if (bestFallback) return bestFallback;

  // PASS 2: Relaxed mode -> ถ้า strict ไม่มีทางจัดได้ ค่อยยอมซ้ำ
  bestFallback = null;
  bestFallbackScore = Infinity;

  for (let i = 0; i < queue.length - 3; i++) {
    for (let j = i + 1; j < Math.min(queue.length - 2, i + 6); j++) {
      for (let k = j + 1; k < Math.min(queue.length - 1, j + 6); k++) {
        for (let l = k + 1; l < Math.min(queue.length, k + 6); l++) {
          const p = [queue[i], queue[j], queue[k], queue[l]];

          const combos = [
            [[p[0], p[1]], [p[2], p[3]]],
            [[p[0], p[2]], [p[1], p[3]]],
            [[p[0], p[3]], [p[1], p[2]]]
          ];

          for (const [t1, t2] of combos) {
            const d1 = Math.abs(t1[0].skill - t1[1].skill);
            const d2 = Math.abs(t2[0].skill - t2[1].skill);
            const matchDiff = Math.abs(
              (t1[0].skill + t1[1].skill) - (t2[0].skill + t2[1].skill)
            );
            const penalty = checkHistoryPenalty(t1, t2, history, targetDate);

            const score =
              matchDiff * 10000 +
              (d1 > 2 ? 2000 : 0) +
              (d2 > 2 ? 2000 : 0) +
              penalty +
              (i + j + k + l);

            if (score < bestFallbackScore) {
              bestFallbackScore = score;
              bestFallback = {
                players: p,
                teams: [t1, t2],
                diff: matchDiff,
                indices: [i, j, k, l]
              };
            }
          }
        }
      }
    }
  }

  return bestFallback;
}

// ✅ สำคัญ: preview หลายแมตช์ต้อง append log ชั่วคราว
export function predictNextMatches(
  queue: Player[],
  history: MatchHistory[] = [],
  targetDate = new Date()
) {
  let tempQueue = [...queue];
  let tempHistory = [...history];
  const predicted = [];

  while (tempQueue.length >= 4) {
    const match = extractBestMatch(tempQueue, tempHistory, targetDate);
    if (!match) break;

    predicted.push(match);

    // เพิ่ม match ที่เพิ่งจัดเข้า temp history ด้วย
    tempHistory = [
      {
        t1: [match.teams[0][0].id, match.teams[0][1].id],
        t2: [match.teams[1][0].id, match.teams[1][1].id],
        playedAt: new Date().toISOString()
      },
      ...tempHistory
    ];

    tempQueue = tempQueue.filter((_, idx) => !match.indices.includes(idx));
  }

  return predicted;
}

export function createMatchHistoryEntry(
  t1: string[],
  t2: string[],
  playedAt = new Date().toISOString()
): MatchHistory {
  return {
    t1,
    t2,
    playedAt
  };
}