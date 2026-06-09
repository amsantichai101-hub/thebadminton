import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  const { id, name, skill, isGuest } = await req.json()
  const s = supabaseAdmin
  
  let finalId = id
  let type = 'Emp'

  if (isGuest) {
    let isUnique = false;
    
    // วนลูปเพื่อสุ่มเลขและตรวจสอบว่าไม่ซ้ำกับข้อมูลที่มีอยู่แล้วในระบบทั้งหมด
    while (!isUnique) {
      // สุ่มเลข 8 หลัก (00000000 - 99999999) และเติม 0 ด้านหน้าหากไม่ครบ
      const randomPart = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
      
      // นำเลข 9 มาต่อข้างหน้า เพื่อให้เป็น 9xxxxxxxx (รวม 9 หลัก)
      finalId = `9${randomPart}`;

      // ตรวจสอบกับฐานข้อมูลหลัก (Registry) ว่าเคยมีเลขนี้ถูกใช้งานไปหรือยัง
      const { data: existingUser } = await s.from('player_registry').select('id').eq('id', finalId).single();
      
      if (!existingUser) {
        isUnique = true; // ถ้าไม่มีข้อมูลแสดงว่าเลขนี้ไม่ซ้ำ ใช้งานได้
      }
    }
    type = 'Guest'
  } else {
    // บังคับว่าถ้าไม่ใช่ Guest ต้องกรอกตัวเลข 3 หลักขึ้นไป
    if (!finalId || !/^\d{3,}$/.test(String(finalId).trim())) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'กรุณากรอกรหัสพนักงาน (Employee ID) เป็นตัวเลข ไม่ต่ำกว่า 3 หลัก' 
      })
    }
    finalId = String(finalId).trim()
  }

  // ตรวจสอบว่ามีผู้เล่นนี้ค้างอยู่ในคิวหรือกำลังเล่นอยู่แล้วหรือไม่ (ตรวจสอบสถานะปัจจุบัน)
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