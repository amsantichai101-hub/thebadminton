import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export const revalidate = 5; // Cache 5 วินาที ช่วยลดโหลด DB ได้มหาศาล

// ฝั่งดึงข้อมูล: นับจำนวนคนที่ Active ใน 5 นาทีล่าสุด
export async function GET() {
  try {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    // นับจำนวนจากตาราง player_registry ที่มี last_seen ล่าสุดไม่เกิน 5 นาที
    const { count } = await supabaseAdmin
      .from('player_registry')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen', fiveMinsAgo);

    return NextResponse.json({ online: count || 1 });
  } catch (error) {
    return NextResponse.json({ online: 1 }); // ถ้า Error ให้แสดงอย่างน้อย 1 คน (ตัวเอง)
  }
}

// ฝั่งอัปเดต: รับสัญญาณ Heartbeat จากผู้ใช้
export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (id) {
      await supabaseAdmin
        .from('player_registry')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', id);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false });
  }
}