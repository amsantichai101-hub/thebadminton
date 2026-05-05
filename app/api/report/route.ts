import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    // รองรับทั้งการส่ง startDate/endDate และแบบ date (ของเดิม)
    const dateParam = url.searchParams.get('date')
    const startDate = url.searchParams.get('startDate') || dateParam
    const endDate = url.searchParams.get('endDate') || dateParam

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Missing date parameters' }, { status: 400 })
    }

    // กำหนดเวลาครอบคลุมตั้งแต่ 00:00:00 ของวันเริ่ม จนถึง 23:59:59 ของวันสิ้นสุด
    const startTs = `${startDate}T00:00:00.000Z`
    const endTs = `${endDate}T23:59:59.999Z`

    const { data: logs, error } = await supabaseAdmin
      .from('match_logs')
      .select('*')
      .gte('ts', startTs)
      .lte('ts', endTs)
      .order('ts', { ascending: false })

    if (error) {
      console.error("Supabase Error:", error);
      throw error;
    }

    const validLogs = logs || []

    // 1. แปลงข้อมูลสำหรับแสดงในตารางหน้าเว็บ
    const tableData = validLogs.map(l => ({
      date: new Date(l.ts).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: new Date(l.ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      name: l.player_name || l.match_group || '-',
      action: l.action || '-',
      court: l.court || '-'
    }))

    // 2. สร้างข้อมูลสำหรับ Export เป็น CSV (ฟังก์ชันเดิมที่หายไป)
    let csv = '\uFEFFDate,Time,Name,Action,Court\n' // \uFEFF ช่วยให้เปิดใน Excel ภาษาไทยไม่เพี้ยน
    tableData.forEach(r => {
      csv += `"${r.date}","${r.time}","${r.name}","${r.action}","${r.court}"\n`
    })

    // 3. ส่วนคำนวณ Analytics สถิติ
    const matchesEnded = validLogs.filter(l => l.action?.toLowerCase().includes('end'))
    const totalMatches = matchesEnded.length

    const playerIds = new Set(validLogs.map(l => l.player_id).filter(Boolean))
    const totalPlayers = playerIds.size

    const playerCounts: Record<string, {name: string, count: number}> = {}
    validLogs.forEach(l => {
      // นับเฉพาะตอนเข้าคิว หรือเริ่มเกม (ไม่นับตอนจบเกมซ้ำ)
      if (l.player_id && l.player_name && !l.action?.toLowerCase().includes('end')) {
        if (!playerCounts[l.player_id]) playerCounts[l.player_id] = { name: l.player_name, count: 0 }
        playerCounts[l.player_id].count++
      }
    })
    
    // จัดอันดับคนที่ตีบ่อยสุด 3 อันดับ
    const topPlayers = Object.values(playerCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    // ส่งทุกอย่างกลับไปให้หน้าเว็บ
    return NextResponse.json({
      totalMatches,
      totalPlayers,
      topPlayers,
      tableData,
      csv
    })

  } catch (error: any) {
    console.error('API Report Error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}