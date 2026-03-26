
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'
export async function POST(req: Request) { const { id } = await req.json(); const s = supabaseAdmin; const delQ = await s.from('player_queue').delete().eq('id', id); if ((delQ.data?.length||0)===0) await s.from('pending_queue').delete().eq('id', id); return NextResponse.json({ status:'success', message:'Removed' }) }
