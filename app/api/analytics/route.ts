import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');

    let query = supabaseAdmin.from('match_logs').select('*');

    // บังคับ Timezone ไทย (+07:00) 
    if (start && end) {
      const startTs = new Date(`${start}T00:00:00+07:00`).toISOString();
      const endTs = new Date(`${end}T23:59:59.999+07:00`).toISOString();
      query = query.gte('ts', startTs).lte('ts', endTs);
    } else {
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 10);
      const startTs = new Date(`${today}T00:00:00+07:00`).toISOString();
      query = query.gte('ts', startTs);
    }

    const { data: logs, error: logsError } = await query;
    const { data: activePlayers, error: playersError } = await supabaseAdmin
      .from('player_registry')
      .select('*')
      .order('total_visits', { ascending: false })
      .limit(10);

    if (logsError || playersError) throw new Error('Query Error');

    const matchesEnded = logs?.filter(l => l.action.toLowerCase().includes('end')) || [];
    const uniqueMatches = new Set(matchesEnded.map(l => `${l.court}_${l.ts}`)).size;
    const uniquePlayers = new Set(logs?.map(l => l.player_id).filter(Boolean)).size;

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