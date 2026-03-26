import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  const { id } = await req.json(); // รับค่าที่พิมพ์มา (อาจจะเป็นชื่อ หรือ ID)
  const s = supabaseAdmin;

  if (!id) return NextResponse.json({ status: 'error', message: 'Missing ID or Name' });
  const searchTerm = String(id).trim();

  // 1. ค้นหา ID ที่แท้จริงจากฐานข้อมูลประวัติก่อน (รองรับการพิมพ์ชื่อ)
  const { data: player } = await s.from('player_registry')
    .select('id')
    .or(`id.eq.${searchTerm},name.ilike.${searchTerm}`)
    .limit(1);

  // ถ้าเจอให้ใช้ ID นั้น ถ้าไม่เจอให้ใช้คำที่พิมพ์มาตรงๆ
  const targetId = (player && player.length > 0) ? player[0].id : searchTerm;

  // 2. พยายามลบออกจากคิวเล่น (player_queue)
  const delQ = await s.from('player_queue').delete().eq('id', targetId).select();
  
  let removed = false;
  if (delQ.data && delQ.data.length > 0) {
    removed = true;
  } else {
    // 3. ถ้าไม่มีในคิวเล่น ให้ลองลบออกจากคิวรออนุมัติ (pending_queue)
    const delP = await s.from('pending_queue').delete().eq('id', targetId).select();
    if (delP.data && delP.data.length > 0) removed = true;
  }

  // 4. ส่งสถานะกลับไปให้หน้าเว็บ
  if (removed) {
    return NextResponse.json({ status: 'success', message: 'Signed out successfully' });
  } else {
    return NextResponse.json({ status: 'error', message: 'Player not found in queue' });
  }
}