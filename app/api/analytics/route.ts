import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function GET() {
  try {
    // กำหนดเวลาเริ่มต้นของวันนี้ (Midnight)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString()

    // 1. ดึง Log แมตช์เฉพาะของวันนี้
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('match_logs')
      .select('*')
      .gte('ts', todayStr)

    // 2. ดึงข้อมูลพนักงานที่มาบ่อยที่สุด 10 อันดับแรก (All-time)
    const { data: activePlayers, error: playersError } = await supabaseAdmin
      .from('player_registry')
      .select('*')
      .order('total_visits', { ascending: false })
      .limit(10)

    if (logsError || playersError) {
      throw new Error('Supabase Query Error')
    }

    // คำนวณ Stats ต่างๆ
    // จำนวนแมตช์ (ดูจาก Event 'End Match' จะแม่นยำที่สุด)
    const matchesEnded = logs?.filter(l => l.action.toLowerCase().includes('end')) || []
    const totalMatches = matchesEnded.length

    // จำนวนผู้เล่น Unique ของวันนี้ (ดูจากใครเช็คอิน หรือใครลงเล่น)
    const uniquePlayers = new Set(logs?.map(l => l.player_id).filter(Boolean)).size

    return NextResponse.json({
      totalMatches,
      uniquePlayers,
      topPlayers: activePlayers || [],
      recentLogs: logs?.slice(0, 20) || []
    })

  } catch (e) {
    return NextResponse.json({ error: 'Failed to load analytics data' }, { status: 500 })
  }
}