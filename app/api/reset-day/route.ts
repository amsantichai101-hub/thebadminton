import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function POST() {
  const s = supabaseAdmin;
  
  // ล้างข้อมูลคอร์ทที่เล่นอยู่
  await s.from('active_courts').delete().neq('court', 'DUMMY_NEVER_MATCH');
  
  // ล้างคิวที่รอ
  await s.from('player_queue').delete().neq('id', 'DUMMY_NEVER_MATCH');
  
  // ล้างคิวรออนุมัติ
  await s.from('pending_queue').delete().neq('id', 'DUMMY_NEVER_MATCH');

  // รีเซ็ตเลข Guest
  await s.from('system_config').update({ value: '0' }).eq('key', 'GUEST_COUNTER_LAST');

  return NextResponse.json({ status: 'success', message: 'System Reset for the new day' })
}