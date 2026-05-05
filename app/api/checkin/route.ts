import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  const { id, name, skill, isGuest } = await req.json()
  const s = supabaseAdmin
  
  let finalId = id
  let type = 'Emp'

  if (isGuest) {
    // ใช้การดึงค่าจาก system_config โดยตรง ป้องกัน Error กรณีไม่ได้สร้าง RPC ไว้ใน Supabase
    const { data: conf } = await s.from('system_config').select('value').eq('key', 'GUEST_COUNTER_LAST').single()
    const currentCnt = conf && conf.value ? parseInt(conf.value, 10) : 0
    const next = currentCnt + 1
    
    // รันเลข G001, G002...
    finalId = `G${String(next).padStart(3, '0')}`
    await s.from('system_config').upsert({ key: 'GUEST_COUNTER_LAST', value: String(next) })
    type = 'Guest'
  } else {
    // บังคับว่าถ้าไม่ใช่ Guest ต้องกรอกตัวเลข 3 หลักขึ้นไป (ใช้ {3,} แทน {3})
    if (!finalId || !/^\d{3,}$/.test(String(finalId).trim())) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'กรุณากรอกรหัสพนักงาน (Employee ID) เป็นตัวเลข ไม่ต่ำกว่า 3 หลัก' 
      })
    }
    finalId = String(finalId).trim()
  }

  // ตรวจสอบว่ามีผู้เล่นนี้ค้างอยู่ในคิวหรือกำลังเล่นอยู่แล้วหรือไม่
  const allIds = new Set<string>()
  const [qData, pData, aData] = await Promise.all([
    s.from('player_queue').select('id'),
    s.from('pending_queue').select('id'),
    s.from('active_courts').select('p1_id,p2_id,p3_id,p4_id')
  ])
  
  qData.data?.forEach((r: any) => allIds.add(String(r.id)))
  pData.data?.forEach((r: any) => allIds.add(String(r.id)))
  aData.data?.forEach((r: any) => { 
    ['p1_id', 'p2_id', 'p3_id', 'p4_id'].forEach((k) => {
      if (r[k]) allIds.add(String(r[k]))
    }) 
  })

  if (allIds.has(String(finalId))) {
    return NextResponse.json({ 
        status: 'error', 
        message: `รหัส ${finalId} อยู่ในคิวหรือกำลังอยู่ในสนามแล้ว` 
    })
  }

  // อัปเดตข้อมูลผู้เล่นในฐานข้อมูลหลัก (Registry)
  await s.from('player_registry').upsert({ 
    id: String(finalId), 
    name, 
    latest_skill: Number(skill), 
    last_seen: new Date().toISOString()
  }, { onConflict: 'id', ignoreDuplicates: false })

  // นำผู้เล่นเข้าสู่คิวรออนุมัติ (Pending Queue)
  await s.from('pending_queue').insert({ 
    id: String(finalId), 
    name, 
    skill: Number(skill), 
    ts: new Date().toISOString(), 
    type, 
    play_count: 0 
  })

  // ส่งข้อมูลกลับไปให้หน้าบ้าน (Frontend)
  return NextResponse.json({ 
      status: 'success', 
      message: `รอแอดมินยืนยัน (${finalId})`,
      generatedId: isGuest ? finalId : undefined 
  })
}