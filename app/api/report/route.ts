import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. ดึงประวัติคนที่มาเล่นวันนี้ (ลงทะเบียน)
  const { data: registry } = await supabaseAdmin
    .from('player_registry')
    .select('id, name, last_seen')
    .gte('last_seen', today.toISOString())

  // 2. ดึงประวัติแมตช์ที่เล่นจบไปแล้ว
  const { data: logs } = await supabaseAdmin
    .from('match_logs')
    .select('*')
    .gte('ts', today.toISOString())
    .eq('action', 'MATCH_FINISH')

  // สร้าง Header สำหรับ CSV ให้รองรับ Pivot
  let csvContent = "\uFEFFDate,Time,PlayerID,PlayerName,Action,Court,Duration_Min\n";
  let tableData: any[] = [];

  // ใส่ข้อมูลคนลงทะเบียน (Action = REGISTER)
  registry?.forEach(p => {
    const d = new Date(p.last_seen);
    csvContent += `"${d.toLocaleDateString()}","${d.toLocaleTimeString()}","${p.id}","${p.name}","REGISTER","-","0"\n`;
    tableData.push({ time: d.toLocaleTimeString(), id: p.id, name: p.name, action: 'ลงทะเบียน', court: '-' });
  });

  // ใส่ข้อมูลการลงเล่น (แตกข้อมูลจาก 1 แมตช์ เป็นรายบุคคล)
  logs?.forEach(log => {
     const d = new Date(log.ts);
     try {
       // แตก JSON ของกลุ่มคนที่ลงเล่นในแมตช์นั้น
       const players = JSON.parse(log.match_group || '[]');
       players.forEach((pid: string) => {
         // หาชื่อจาก registry มาประกอบ
         const pName = registry?.find(r => r.id === pid)?.name || 'Unknown';
         csvContent += `"${d.toLocaleDateString()}","${d.toLocaleTimeString()}","${pid}","${pName}","PLAYED","${log.court}","${log.duration}"\n`;
         tableData.push({ time: d.toLocaleTimeString(), id: pid, name: pName, action: 'ลงเล่น', court: log.court });
       });
     } catch(e) {}
  });

  // เรียงข้อมูลตามเวลา
  tableData.sort((a,b) => a.time.localeCompare(b.time));

  return NextResponse.json({ 
    totalMatches: logs?.length || 0,
    totalPlayers: registry?.length || 0,
    tableData, 
    csv: csvContent 
  })
}