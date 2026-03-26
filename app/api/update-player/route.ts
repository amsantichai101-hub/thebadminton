
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'
export async function POST(req: Request) { const { id, name, skill } = await req.json(); const s = supabaseAdmin; await s.from('player_queue').update({ name, skill }).eq('id', id); await s.from('pending_queue').update({ name, skill }).eq('id', id); await s.from('player_registry').upsert({ id, name, latest_skill: skill, last_seen: new Date().toISOString() }); return NextResponse.json({ status:'success', message:'Updated' }) }
