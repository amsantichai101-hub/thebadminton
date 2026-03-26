import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];
  
  const startDate = new Date(dateParam);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);

  const { data: registry } = await supabaseAdmin.from('player_registry').select('id, name, last_seen').gte('last_seen', startDate.toISOString()).lt('last_seen', endDate.toISOString());
  const { data: logs } = await supabaseAdmin.from('match_logs').select('*').gte('ts', startDate.toISOString()).lt('ts', endDate.toISOString()).eq('action', 'MATCH_FINISH');

  let csvContent = "\uFEFFDate,Time,PlayerID,PlayerName,Action,Court,Duration_Min\n";
  let tableData: any[] = [];

  registry?.forEach(p => {
    const d = new Date(p.last_seen);
    csvContent += `"${d.toLocaleDateString()}","${d.toLocaleTimeString()}","${p.id}","${p.name}","REGISTER","-","0"\n`;
  });

  logs?.forEach(log => {
     const d = new Date(log.ts);
     try {
       const players = JSON.parse(log.match_group || '[]');
       players.forEach((pid: string) => {
         const pName = registry?.find(r => r.id === pid)?.name || 'Unknown';
         csvContent += `"${d.toLocaleDateString()}","${d.toLocaleTimeString()}","${pid}","${pName}","PLAYED","${log.court}","${log.duration}"\n`;
         tableData.push({ time: d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), id: pid, name: pName, action: 'PLAYED', court: log.court });
       });
     } catch(e) {}
  });

  tableData.sort((a,b) => a.time.localeCompare(b.time));

  return NextResponse.json({ totalMatches: logs?.length || 0, totalPlayers: registry?.length || 0, tableData, csv: csvContent })
}