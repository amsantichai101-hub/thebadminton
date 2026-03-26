
export type WaitingPlayer = { id: string; name: string; skill: number; timestamp: string; type: 'Emp'|'Guest'; playCount: number }
export type PlayingMatch = { court: string; p1Id: string; p1Name: string; p1Skill: number; p2Id: string; p2Name: string; p2Skill: number; p3Id: string; p3Name: string; p3Skill: number; p4Id: string; p4Name: string; p4Skill: number; startTime: string }
export type AppState = { courtNames: string[]; announcement: string; autoMatch: boolean; waiting: WaitingPlayer[]; pending: WaitingPlayer[]; playing: PlayingMatch[]; courtCount: number; avgMatchDuration?: number }
