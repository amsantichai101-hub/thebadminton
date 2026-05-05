import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  try {
    const { id } = await req.json()

    const { data: playerInfo } = await supabaseAdmin.from('player_registry').select('name, latest_skill').eq('id', id).single()

    // ลบออกจากคิว
    await supabaseAdmin.from('pending_queue').delete().eq('id', id)
    await supabaseAdmin.from('player_queue').delete().eq('id', id)

    // 📝 เก็บ Log การ Sign Out
    if (playerInfo) {
       await supabaseAdmin.from('match_logs').insert({
         player_id: id,
         player_name: playerInfo.name,
         skill: playerInfo.latest_skill || 2,
         action: 'Sign Out / Leave Queue',
         duration: 0
       })
    }

    return NextResponse.json({ status: 'success' })
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message })
  }
}