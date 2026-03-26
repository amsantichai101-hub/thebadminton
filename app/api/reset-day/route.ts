
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'
export async function POST() { const s = supabaseAdmin; await s.from('player_queue').delete().neq('id',''); await s.from('pending_queue').delete().neq('id',''); await s.from('active_courts').delete().neq('court',''); await s.from('match_logs').insert({ ts: new Date().toISOString(), action:'DAILY_RESET', details:'Reset all.' }); await s.from('system_config').upsert({ key:'GUEST_COUNTER_LAST', value: '0' }); return NextResponse.json({ status:'success', message:'Daily Reset Complete.' }) }
