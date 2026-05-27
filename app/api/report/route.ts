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

    // 🌟 บังคับ Timezone เป็นโซนเวลาของไทย (+07:00) แล้วแปลงกลับเป็น UTC (ISO) เพื่อคุยกับ Supabase
    const startTs = new Date(`${startDate}T00:00:00+07:00`).toISOString()
    const endTs = new Date(`${endDate}T23:59:59.999+07:00`).toISOString()

    const { data: logs, error } = await supabaseAdmin
      .from('match_logs')
      .select('*')
      .gte('ts', startTs)
      .lte('ts', endTs)
      .order('ts', { ascending: true })

    if (error) throw error;

    const validLogs = logs || []

    // ตารางรายงานการกระทำ
    const tableData = validLogs.map(l => ({
      ts: l.ts,
      time: new Date(l.ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      name: l.player_name || l.match_group || '-',
      action: l.action || '-',
      court: l.court || '-'
    }))

    // สร้างข้อมูลสำหรับ Export เป็น CSV
    let csv = '\uFEFFTime,Name,Action,Court\n' 
    tableData.forEach(r => {
      csv += `"${r.time}","${r.name}","${r.action}","${r.court}"\n`
    })

    // ส่วนคำนวณ Analytics สถิติ
    const matchesEnded = validLogs.filter(l => l.action?.toLowerCase().includes('end'))
    const uniqueMatches = new Set(matchesEnded.map(l => `${l.court}_${l.ts}`))
    const totalMatches = uniqueMatches.size

    const playerIds = new Set(validLogs.map(l => l.player_id).filter(Boolean))
    const totalPlayers = playerIds.size

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