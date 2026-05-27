import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  try {
    const { court } = await req.json()
    // อัปเดตเวลาเริ่มเล่นเป็นเวลาปัจจุบัน
    const { error } = await supabaseAdmin
      .from('active_courts')
      .update({ start_time: new Date().toISOString() })
      .eq('court', court)

    if (error) throw error;
    return NextResponse.json({ status: 'success' })
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message })
  }
}