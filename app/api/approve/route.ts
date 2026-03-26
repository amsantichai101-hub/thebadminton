
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'
export async function POST(req: Request) { const { id } = await req.json(); const s = supabaseAdmin; const { data } = await s.from('pending_queue').select('*').eq('id', id).maybeSingle(); if(!data) return NextResponse.json({ status:'error', message:'Not found' }); await s.from('player_queue').insert({ id: data.id, name: data.name, skill: data.skill, ts: new Date().toISOString(), type: data.type, play_count: data.play_count||0 }); await s.from('pending_queue').delete().eq('id', id); return NextResponse.json({ status:'success', message:'Approved' }) }
