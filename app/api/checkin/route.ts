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

  // 🌟 [ส่วนที่แก้ไข] ดึงข้อมูลเดิมจาก Registry เพื่อดูว่าเคยมีประวัติไหม
  const { data: existingPlayer } = await s.from('player_registry').select('latest_skill, name').eq('id', String(finalId)).single();

  // กำหนดค่า skill ที่จะใช้ โดยถ้ามีประวัติแล้ว ให้ใช้ค่าจาก DB เสมอ (เพื่อรักษาค่าทศนิยมของ Admin)
  const finalSkill = existingPlayer ? existingPlayer.latest_skill : Number(skill);
  // (Optional) ใช้ชื่อเดิมจาก DB ด้วย เพื่อป้องกันคนเปลี่ยนชื่อเองตอน Check-in
  const finalName = existingPlayer ? existingPlayer.name : name;

  if (existingPlayer) {
    // 🌟 ถ้ามีประวัติแล้ว อัปเดตแค่เวลาใช้งานล่าสุด (ไม่แตะต้อง latest_skill)
    await s.from('player_registry').update({ 
      last_seen: new Date().toISOString() 
    }).eq('id', String(finalId));
  } else {
    // 🌟 ถ้ายังไม่มีประวัติ (คนใหม่) ให้ insert ใหม่ทั้งหมด
    await s.from('player_registry').insert({ 
      id: String(finalId), 
      name: finalName, 
      latest_skill: finalSkill, 
      last_seen: new Date().toISOString()
    });
  }

  // นำผู้เล่นเข้าสู่คิวรออนุมัติ (Pending Queue) โดยใช้ finalSkill ที่ถูกต้อง
  await s.from('pending_queue').insert({ 
    id: String(finalId), 
    name: finalName, 
    skill: finalSkill, 
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