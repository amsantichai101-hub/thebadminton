export type Player = {
  id: string;
  name: string;
  skill: number;
  timestamp?: string;
  type?: string;
  playCount?: number;
};

export type MatchHistory = {
  matchId?: string;
  courtId?: string;
  sessionId?: string;
  t1: string[];         // player ids
  t2: string[];         // player ids
  playedAt: string;     // ISO string
};

export type MatchEngineOptions = {
  /**
   * วันที่อ้างอิงในการเช็ค log
   * ปกติไม่ต้องส่ง ปล่อยเป็น new Date() ได้
   */
  targetDate?: Date;

  /**
   * ใช้แยก session / รอบการเล่น
   * ถ้าส่งมา ระบบจะใช้เฉพาะ log ของ session นี้
   */
  sessionId?: string;

  /**
   * ใช้เฉพาะ log ของวันเดียวกันเท่านั้น
   * default = true
   */
  sameDayOnly?: boolean;

  /**
   * ใช้เฉพาะกี่แมตช์ล่าสุดใน session/day นี้
   * default = 8
   */
  recentMatchLimit?: number;

  /**
   * จำนวนแมตช์ล่าสุดที่ "ห้ามซ้ำทีมเดิมเด็ดขาด"
   * default = 1
   */
  hardBlockRecentTeamMatches?: number;

  /**
   * จำนวนแมตช์ล่าสุดที่ "ห้ามซ้ำทั้งแมตช์เด็ดขาด"
   * default = 2
   */
  hardBlockRecentExactMatches?: number;

  /**
   * ใช้ window กว้างเท่าไรตอนวนหาผู้เล่นจาก queue
   * default = 6
   */
  searchWindow?: number;
};

export type EvaluatedMatch = {
  players: Player[];
  teams: [[Player, Player], [Player, Player]];
  diff: number;
  indices: number[];
  score: number;
  penalty: number;
};

const DEFAULT_OPTIONS: Required<MatchEngineOptions> = {
  targetDate: new Date(),
  sessionId: "",
  sameDayOnly: true,
  recentMatchLimit: 8,
  hardBlockRecentTeamMatches: 1,
  hardBlockRecentExactMatches: 2,
  searchWindow: 6
};

/* =========================================================
 * Utility
 * ========================================================= */

function mergeOptions(options?: MatchEngineOptions): Required<MatchEngineOptions> {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    targetDate: options?.targetDate ?? new Date()
  };
}

function normalizeTeamIds(team: string[]): string[] {
  return [...team].sort();
}

function isSameTeam(teamA: string[], teamB: string[]): boolean {
  if (teamA.length !== teamB.length) return false;
  const a = normalizeTeamIds(teamA);
  const b = normalizeTeamIds(teamB);
  return a.every((id, idx) => id === b[idx]);
}

function isSameMatch(
  h1: { t1: string[]; t2: string[] },
  h2: { t1: string[]; t2: string[] }
): boolean {
  return (
    (isSameTeam(h1.t1, h2.t1) && isSameTeam(h1.t2, h2.t2)) ||
    (isSameTeam(h1.t1, h2.t2) && isSameTeam(h1.t2, h2.t1))
  );
}

/**
 * เช็ควันแบบ local runtime
 * ถ้ารันฝั่ง browser / server ใน timezone เดียวกับระบบใช้งาน จะใช้ได้ตรงที่สุด
 */
function isSameLocalDay(dateStr: string, targetDate: Date): boolean {
  const d = new Date(dateStr);
  return (
    d.getFullYear() === targetDate.getFullYear() &&
    d.getMonth() === targetDate.getMonth() &&
    d.getDate() === targetDate.getDate()
  );
}

/**
 * filter log ตาม:
 * - same day
 * - sessionId
 * - เรียงล่าสุดก่อน
 * - จำกัด recentMatchLimit
 */
export function getScopedHistory(
  history: MatchHistory[],
  options?: MatchEngineOptions
): MatchHistory[] {
  const opt = mergeOptions(options);

  let scoped = [...history];

  if (opt.sameDayOnly) {
    scoped = scoped.filter((h) => isSameLocalDay(h.playedAt, opt.targetDate));
  }

  if (opt.sessionId) {
    scoped = scoped.filter((h) => h.sessionId === opt.sessionId);
  }

  scoped.sort((a, b) => {
    const ta = new Date(a.playedAt).getTime();
    const tb = new Date(b.playedAt).getTime();
    return tb - ta; // ล่าสุดก่อน
  });

  return scoped.slice(0, opt.recentMatchLimit);
}

function getRecencyWeight(index: number): number {
  // ยิ่งล่าสุด ยิ่งหนัก
  if (index === 0) return 1.0;
  if (index === 1) return 0.85;
  if (index === 2) return 0.7;
  if (index === 3) return 0.55;
  return 0.4;
}

function teamIds(team: [Player, Player] | Player[]): string[] {
  return [team[0].id, team[1].id];
}

/* =========================================================
 * History / Penalty Engine
 * ========================================================= */

type PenaltyResult = {
  penalty: number;
  hardBlocked: boolean;
};

function checkHistoryPenalty(
  t1: [Player, Player],
  t2: [Player, Player],
  history: MatchHistory[],
  options?: MatchEngineOptions,
  hardBlockEnabled: boolean = true
): PenaltyResult {
  const opt = mergeOptions(options);
  const scopedHistory = getScopedHistory(history, opt);

  if (scopedHistory.length === 0) {
    return { penalty: 0, hardBlocked: false };
  }

  const t1Ids = teamIds(t1);
  const t2Ids = teamIds(t2);

  let penalty = 0;

  for (let i = 0; i < scopedHistory.length; i++) {
    const h = scopedHistory[i];
    const weight = getRecencyWeight(i);

    const t1Duplicate = isSameTeam(h.t1, t1Ids) || isSameTeam(h.t2, t1Ids);
    const t2Duplicate = isSameTeam(h.t1, t2Ids) || isSameTeam(h.t2, t2Ids);

    const exactSameMatch = isSameMatch(
      { t1: h.t1, t2: h.t2 },
      { t1: t1Ids, t2: t2Ids }
    );

    // Hard block: กันแบบเด็ดขาดในแมตช์ล่าสุดตามจำนวนที่กำหนด
    if (hardBlockEnabled) {
      const inRecentTeamBlockWindow = i < opt.hardBlockRecentTeamMatches;
      const inRecentExactBlockWindow = i < opt.hardBlockRecentExactMatches;

      if (inRecentTeamBlockWindow && (t1Duplicate || t2Duplicate)) {
        return { penalty: Number.POSITIVE_INFINITY, hardBlocked: true };
      }

      if (inRecentExactBlockWindow && exactSameMatch) {
        return { penalty: Number.POSITIVE_INFINITY, hardBlocked: true };
      }
    }

    // Soft penalty
    if (t1Duplicate) penalty += Math.round(50 * weight);
    if (t2Duplicate) penalty += Math.round(50 * weight);
    if (exactSameMatch) penalty += Math.round(200 * weight);
  }

  return { penalty, hardBlocked: false };
}

/* =========================================================
 * Team Balancer (สำหรับผู้เล่น 4 คน)
 * ========================================================= */

function evaluateBalancedTeams(
  players: Player[],
  history: MatchHistory[],
  options?: MatchEngineOptions,
  hardBlockEnabled: boolean = true
): { diff: number; teams: Player[]; score: number; penalty: number } | null {
  if (players.length !== 4) return null;

  const combos = [
    { t1: [0, 1] as const, t2: [2, 3] as const },
    { t1: [0, 2] as const, t2: [1, 3] as const },
    { t1: [0, 3] as const, t2: [1, 2] as const }
  ];

  let bestScore = Number.POSITIVE_INFINITY;
  let bestOrder: Player[] | null = null;
  let bestDiff = Number.POSITIVE_INFINITY;
  let bestPenalty = Number.POSITIVE_INFINITY;

  for (const c of combos) {
    const team1: [Player, Player] = [players[c.t1[0]], players[c.t1[1]]];
    const team2: [Player, Player] = [players[c.t2[0]], players[c.t2[1]]];

    const diff = Math.abs(
      (Number(team1[0].skill) + Number(team1[1].skill)) -
      (Number(team2[0].skill) + Number(team2[1].skill))
    );

    const { penalty } = checkHistoryPenalty(team1, team2, history, options, hardBlockEnabled);
    if (!Number.isFinite(penalty)) continue;

    const totalScore = diff + penalty;

    if (totalScore < bestScore) {
      bestScore = totalScore;
      bestDiff = diff;
      bestPenalty = penalty;
      bestOrder = [team1[0], team1[1], team2[0], team2[1]];
    }
  }

  if (!bestOrder) return null;

  return {
    diff: bestDiff,
    teams: bestOrder,
    score: bestScore,
    penalty: bestPenalty
  };
}

/**
 * public function: จัด 4 คนให้ balance โดยอิง session/day/recent log
 * ถ้ากฎ strict ทำไม่ได้ จะ fallback ไปแบบผ่อนกฎ
 */
export function balanceTeams(
  players: Player[],
  history: MatchHistory[] = [],
  options?: MatchEngineOptions
) {
  const strictResult = evaluateBalancedTeams(players, history, options, true);
  if (strictResult) {
    return strictResult;
  }

  // fallback: ถ้าทางเลือก strict ไม่มีเลย ค่อยผ่อน hard block
  const relaxedResult = evaluateBalancedTeams(players, history, options, false);
  if (relaxedResult) {
    return relaxedResult;
  }

  // กรณีผิดเงื่อนไขจริง ๆ
  return {
    diff: 0,
    teams: players,
    score: Number.POSITIVE_INFINITY,
    penalty: Number.POSITIVE_INFINITY
  };
}

/* =========================================================
 * Queue Match Extractor
 * ========================================================= */

function evaluateCandidate(
  queue: Player[],
  indices: [number, number, number, number],
  history: MatchHistory[],
  options?: MatchEngineOptions,
  hardBlockEnabled: boolean = true
): EvaluatedMatch | null {
  const [i, j, k, l] = indices;
  const p = [queue[i], queue[j], queue[k], queue[l]];

  const combos: Array<[[Player, Player], [Player, Player]]> = [
    [[p[0], p[1]], [p[2], p[3]]],
    [[p[0], p[2]], [p[1], p[3]]],
    [[p[0], p[3]], [p[1], p[2]]]
  ];

  let best: EvaluatedMatch | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const [t1, t2] of combos) {
    const d1 = Math.abs(Number(t1[0].skill) - Number(t1[1].skill));
    const d2 = Math.abs(Number(t2[0].skill) - Number(t2[1].skill));
    const matchDiff = Math.abs(
      (Number(t1[0].skill) + Number(t1[1].skill)) -
      (Number(t2[0].skill) + Number(t2[1].skill))
    );

    const { penalty } = checkHistoryPenalty(t1, t2, history, options, hardBlockEnabled);
    if (!Number.isFinite(penalty)) continue;

    // score หลัก
    const score =
      matchDiff +                  // balance ระหว่างทีม
      (d1 > 3 ? 5 : 0) +           // ถ้าสองคนในทีม skill ต่างกันมากเกินไป
      (d2 > 3 ? 5 : 0) +
      (i + j + k + l) +            // คนที่อยู่หน้าคิวได้ priority มากกว่า
      penalty;                     // กันคู่ซ้ำจาก log scope ปัจจุบัน

    const candidate: EvaluatedMatch = {
      players: p,
      teams: [t1, t2],
      diff: matchDiff,
      indices: [i, j, k, l],
      score,
      penalty
    };

    // ถ้าเจอแมตช์ที่ balance ดี และไม่มี penalty เลย => ใช้ทันที
    if (d1 <= 3 && d2 <= 3 && matchDiff <= 1 && penalty === 0) {
      return candidate;
    }

    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

/**
 * ดึง match ที่ดีที่สุดจาก queue โดยดูจาก:
 * - queue order
 * - skill balance
 * - session/day scoped log
 * - recent match history only
 */
export function extractBestMatch(
  queue: Player[],
  history: MatchHistory[] = [],
  options?: MatchEngineOptions
): EvaluatedMatch | null {
  if (queue.length < 4) return null;

  const opt = mergeOptions(options);
  let bestFallback: EvaluatedMatch | null = null;
  let bestFallbackScore = Number.POSITIVE_INFINITY;

  // strict pass
  for (let i = 0; i < queue.length - 3; i++) {
    for (let j = i + 1; j < Math.min(queue.length - 2, i + opt.searchWindow); j++) {
      for (let k = j + 1; k < Math.min(queue.length - 1, j + opt.searchWindow); k++) {
        for (let l = k + 1; l < Math.min(queue.length, k + opt.searchWindow); l++) {
          const candidate = evaluateCandidate(queue, [i, j, k, l], history, opt, true);
          if (!candidate) continue;

          // perfect candidate
          const [t1, t2] = candidate.teams;
          const d1 = Math.abs(Number(t1[0].skill) - Number(t1[1].skill));
          const d2 = Math.abs(Number(t2[0].skill) - Number(t2[1].skill));
          if (d1 <= 3 && d2 <= 3 && candidate.diff <= 1 && candidate.penalty === 0) {
            return candidate;
          }

          if (candidate.score < bestFallbackScore) {
            bestFallbackScore = candidate.score;
            bestFallback = candidate;
          }
        }
      }
    }
  }

  if (bestFallback) return bestFallback;

  // relaxed pass: ถ้า strict ไม่ได้เลย ค่อยผ่อน hard block
  bestFallback = null;
  bestFallbackScore = Number.POSITIVE_INFINITY;

  for (let i = 0; i < queue.length - 3; i++) {
    for (let j = i + 1; j < Math.min(queue.length - 2, i + opt.searchWindow); j++) {
      for (let k = j + 1; k < Math.min(queue.length - 1, j + opt.searchWindow); k++) {
        for (let l = k + 1; l < Math.min(queue.length, k + opt.searchWindow); l++) {
          const candidate = evaluateCandidate(queue, [i, j, k, l], history, opt, false);
          if (!candidate) continue;

          if (candidate.score < bestFallbackScore) {
            bestFallbackScore = candidate.score;
            bestFallback = candidate;
          }
        }
      }
    }
  }

  return bestFallback;
}

/**
 * preview แมตช์ถัดไปทั้งหมดจากคิวที่เหลือ
 * โดยยังใช้งาน session/day/recent log scope เดิม
 */
export function predictNextMatches(
  queue: Player[],
  history: MatchHistory[] = [],
  options?: MatchEngineOptions
): EvaluatedMatch[] {
  let tempQueue = [...queue];
  const predicted: EvaluatedMatch[] = [];

  while (tempQueue.length >= 4) {
    const match = extractBestMatch(tempQueue, history, options);
    if (!match) break;

    predicted.push(match);

    tempQueue = tempQueue.filter((_, idx) => !match.indices.includes(idx));
  }

  return predicted;
}

/* =========================================================
 * Helper สำหรับบันทึก log หลังจบแมตช์
 * ========================================================= */

export function createMatchHistoryEntry(params: {
  teams: [[Player, Player], [Player, Player]];
  sessionId?: string;
  courtId?: string;
  playedAt?: string;
  matchId?: string;
}): MatchHistory {
  const playedAt = params.playedAt ?? new Date().toISOString();

  return {
    matchId: params.matchId,
    courtId: params.courtId,
    sessionId: params.sessionId,
    playedAt,
    t1: [params.teams[0][0].id, params.teams[0][1].id],
    t2: [params.teams[1][0].id, params.teams[1][1].id]
  };
}
