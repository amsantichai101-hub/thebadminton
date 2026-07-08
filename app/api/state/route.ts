import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

// 🌟 ปิดระบบ Cache บน Vercel 100% บังคับดึงข้อมูลใหม่เสมอ
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const [configRes, waitingRes, pendingRes, playingRes, logsRes] = await Promise.all([
      supabaseAdmin.from('system_config').select('*'),
      supabaseAdmin.from('player_queue').select('*').order('ts', { ascending: true }),
      supabaseAdmin.from('pending_queue').select('*').order('ts', { ascending: true }),
      supabaseAdmin.from('active_courts').select('*').order('start_time', { ascending: true }),
      supabaseAdmin.from('match_logs').select('duration').gte('ts', todayStr).not('duration', 'is', null).gt('duration', 0)
    ]);

    const configs = configRes.data || [];
    const getConfig = (key: string) => configs.find((c: any) => c.key === key)?.value;
    const courtNames = (getConfig('Courts') || 'Court 1, Court 2').split(',').map((s: string) => s.trim());
    
    let avgMatchDuration = 15;
    const durations = logsRes.data?.map((l: any) => Number(l.duration)) || [];
    if (durations.length > 0) {
      const sum = durations.reduce((a: number, b: number) => a + b, 0);
      avgMatchDuration = Math.round(sum / durations.length);
      avgMatchDuration = Math.max(5, Math.min(avgMatchDuration, 45)); 
    }

    const playing = playingRes.data?.map((c: any) => ({
      court: c.court,
      p1Id: c.p1_id, p1Name: c.p1_name, p1Skill: c.p1_skill,
      p2Id: c.p2_id, p2Name: c.p2_name, p2Skill: c.p2_skill,
      p3Id: c.p3_id, p3Name: c.p3_name, p3Skill: c.p3_skill,
      p4Id: c.p4_id, p4Name: c.p4_name, p4Skill: c.p4_skill,
      startTime: c.start_time
    })) || [];

    return NextResponse.json({
      courtNames,
      announcement: getConfig('Announcement') || '',
      autoMatch: getConfig('AutoMatch') === 'true',
      globalShowPreview: getConfig('GlobalShowPreview') !== 'false', 
      enableNotify: getConfig('EnableNotify') !== 'false',
      playStartTime: getConfig('PlayStartTime') || '20:00',
      playEndTime: getConfig('PlayEndTime') || '22:30',
      courtCount: courtNames.length,
      avgMatchDuration,
      waiting: waitingRes.data || [],
      pending: pendingRes.data || [],
      playing
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch state' }, { status: 500 });
  }
}