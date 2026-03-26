export type Player = { 
  id: string; 
  name: string; 
  skill: number; 
  timestamp?: string; 
  type?: string; 
  playCount?: number 
}

export function balanceTeams(players: Player[]) {
  const combos = [ 
    { t1: [0,1], t2:[2,3] }, 
    { t1: [0,2], t2:[1,3] }, 
    { t1: [0,3], t2:[1,2] } 
  ]
  
  let bestDiff = Number.POSITIVE_INFINITY
  let bestOrder = players
  
  for (const c of combos) {
    const s1 = Number(players[c.t1[0]].skill) + Number(players[c.t1[1]].skill)
    const s2 = Number(players[c.t2[0]].skill) + Number(players[c.t2[1]].skill)
    const diff = Math.abs(s1 - s2)
    
    if (diff < bestDiff) { 
      bestDiff = diff; 
      bestOrder = [players[c.t1[0]], players[c.t1[1]], players[c.t2[0]], players[c.t2[1]]] 
    }
  }
  
  return { diff: bestDiff, teams: bestOrder }
}