import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  try {
    const { id, name, skill } = await req.json()

    // 1. ตรวจสอบในตารางอนุมัติแล้ว
    const { data: reg } = await supabaseAdmin.from('player_registry').select('id').eq('id', id).single()
    
    if (reg) {
      await supabaseAdmin.from('player_registry').update({ name, latest_skill: skill }).eq('id', id)
    }

    // 2. ตรวจสอบและอัปเดตในตารางรออนุมัติ (Pending)
    const { data: pending } = await supabaseAdmin.from('pending_queue').select('id').eq('id', id).single()
    
    if (pending) {
      const { error: updateError } = await supabaseAdmin
        .from('pending_queue')
        .update({ name, skill })
        .eq('id', id)
      
      if (updateError) throw updateError
    }

    // 3. อัปเดตในคิวปัจจุบัน (ถ้ามี)
    await supabaseAdmin.from('player_queue').update({ name, skill }).eq('id', id)

    return NextResponse.json({ status: 'success', message: 'อัปเดตข้อมูลเรียบร้อยแล้ว' })
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
  }
}