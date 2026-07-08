import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');

    let query = supabaseAdmin.from('match_logs').select('*');

    // 🌟 เอาการแปลง Timezone ออก และส่งรูปแบบ YYYY-MM-DD HH:mm:ss ไปให้ Database ตรงๆ
    if (start && end) {
      const startTs = `${start} 00:00:00`;
      const endTs = `${end} 23:59:59.999`;
      query = query.gte('ts', startTs).lte('ts', endTs);
    } else {
      // ดึงวันที่ปัจจุบันแบบ Local
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 10);
      const startTs = `${today} 00:00:00`;
      query = query.gte('ts', startTs);
    }

    const { data: logs, error: logsError } = await query;
    const { data: activePlayers, error: playersError } = await supabaseAdmin
      .from('player_registry')
      .select('*')
      .order('total_visits', { ascending: false })
      .limit(10);

    if (logsError || playersError) throw new Error('Query Error');

    // 🌟 1. นับจำนวนแมทช์ทั้งหมด (Total Matches)
    // เพิ่ม (l: any) เพื่อแก้ไข Error ตอน Build
    const matchesStarted = logs?.filter((l: any) => l.action?.toLowerCase().includes('start') || l.action?.includes('ลงสนาม')) || [];
    const uniqueMatches = new Set(matchesStarted.map((l: any) => `${l.court}_${l.ts.substring(0, 16)}`)).size;

    // 🌟 2. นับคนที่เข้ามาทั้งหมดในวันนี้ (Unique Players)
    // เพิ่ม (l: any) เพื่อแก้ไข Error ตอน Build
    const uniquePlayers = new Set(logs?.map((l: any) => l.player_id || l.player_name).filter(Boolean)).size;

    return NextResponse.json({
      totalMatches: uniqueMatches,
      uniquePlayers,
      topPlayers: activePlayers || [],
      recentLogs: logs?.slice(0, 50) || []
    });
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}