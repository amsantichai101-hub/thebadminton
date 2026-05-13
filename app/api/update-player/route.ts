import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const targetId = body.oldId || body.id;
    const newId = body.newId || body.id;
    const { name, skill } = body;

    if (!targetId) throw new Error('Missing ID');

    const { data: reg } = await supabaseAdmin.from('player_registry').select('id').eq('id', targetId).single()
    if (reg) {
      await supabaseAdmin.from('player_registry').update({ id: newId, name, latest_skill: skill }).eq('id', targetId)
    }

    const { data: pending } = await supabaseAdmin.from('pending_queue').select('id').eq('id', targetId).single()
    if (pending) {
      await supabaseAdmin.from('pending_queue').update({ id: newId, name, skill }).eq('id', targetId)
    }

    const { data: pq } = await supabaseAdmin.from('player_queue').select('id').eq('id', targetId).single()
    if (pq) {
      await supabaseAdmin.from('player_queue').update({ id: newId, name, skill }).eq('id', targetId)
    }

    return NextResponse.json({ status: 'success', message: 'อัปเดตข้อมูลเรียบร้อยแล้ว' })
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
  }
}
