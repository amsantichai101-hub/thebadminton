import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  try {
    const { id } = await req.json()

    const { data: pendingPlayer } = await supabaseAdmin.from('pending_queue').select('*').eq('id', id).single()

    if (!pendingPlayer) {
      return NextResponse.json({ status: 'error', message: 'ไม่พบผู้เล่นใน Pending Queue' })
    }

    // ย้ายไป player_queue
    await supabaseAdmin.from('player_queue').insert({
      id: pendingPlayer.id,
      name: pendingPlayer.name,
      skill: pendingPlayer.skill,
      ts: new Date().toISOString(),
      type: pendingPlayer.type,
      play_count: pendingPlayer.play_count || 0
    })

    // ลบออกจาก pending_queue
    await supabaseAdmin.from('pending_queue').delete().eq('id', id)

    // 📝 เก็บ Log การอนุมัติเข้าคิว
    await supabaseAdmin.from('match_logs').insert({
      player_id: pendingPlayer.id,
      player_name: pendingPlayer.name,
      skill: pendingPlayer.skill,
      action: 'Join Queue',
      duration: 0
    })

    return NextResponse.json({ status: 'success' })
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message })
  }
}