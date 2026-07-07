import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const dateParam = url.searchParams.get('date')
    const startDate = url.searchParams.get('startDate') || dateParam
    const endDate = url.searchParams.get('endDate') || dateParam

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Missing date parameters' }, { status: 400 })
    }

    // 🌟 1. เอาการแปลง Timezone +07:00 ออก (ใช้เวลา Local ส่งไปตรงๆ)
    const startTs = `${startDate} 00:00:00`
    const endTs = `${endDate} 23:59:59.999`

    const { data: logs, error } = await supabaseAdmin
      .from('match_logs')
      .select('*')
      .gte('ts', startTs)
      .lte('ts', endTs)
      .order('ts', { ascending: true })

    if (error) throw error;

    const validLogs = logs || []

    // ตารางรายงานการกระทำ (เติม : any ให้กับ l)
    const tableData = validLogs.map((l: any) => ({
      ts: l.ts,
      time: new Date(l.ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      empno: l.player_id || '-', 
      name: l.player_name || l.match_group || '-',
      action: l.action || '-',
      court: l.court || '-'
    }))

    // สร้างข้อมูลสำหรับ Export เป็น CSV (รวม EmpNo ไว้แล้ว)
    let csv = '\uFEFFTime,EmpNo,Name,Action,Court\n' 
    // 🌟 แก้ไขตรงนี้ เติม (r: any)
    tableData.forEach((r: any) => {
      csv += `"${r.time}","${r.empno}","${r.name}","${r.action}","${r.court}"\n`
    })

    // 🌟 2. ส่วนคำนวณ Analytics สถิติที่ถูกต้อง

    // นับจำนวนแมทช์ตามจริง (ยึดจากการกด Start/ลงสนาม) และ Group ด้วยเวลา "ระดับนาที" 
    // l.ts.substring(0, 16) = "YYYY-MM-DD HH:mm" เพื่อให้คนที่ลงสนามพร้อมกันนับเป็นแค่ 1 แมทช์
    const matchesStarted = validLogs.filter((l: any) => l.action?.toLowerCase().includes('start') || l.action?.includes('ลงสนาม'));
    const uniqueMatches = new Set(matchesStarted.map((l: any) => `${l.court}_${l.ts.substring(0, 16)}`)); 
    const totalMatches = uniqueMatches.size;

    // นับจำนวนคนที่เข้ามาในระบบทั้งหมด (ทุกการกระทำ ไม่ใช่แค่คนเล่น)
    // ดึงรหัสพนักงาน หรือ ชื่อ มาหาค่า Unique เพื่อดูยอดคนที่มาที่คอร์ทจริงๆ ในวันนี้
    const allPlayers = validLogs.map((l: any) => (l.player_id || l.player_name)?.trim()).filter(Boolean);
    const uniquePlayers = new Set(allPlayers);
    const totalPlayers = uniquePlayers.size;

    return NextResponse.json({
      totalMatches,
      totalPlayers,
      tableData,
      csv
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}