import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

// 🌟 บังคับไม่ให้ Vercel จำแคชข้อมูลในหน้านี้ (ดึงสดใหม่ 100% ทุกครั้ง)
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('manual_previews').select('*').order('created_at', { ascending: true })
    if (error) throw error;
    return NextResponse.json({ status: 'success', data })
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message })
  }
}

export async function POST(req: Request) {
  try {
    const { court_name, p1_id, p2_id, p3_id, p4_id } = await req.json()
    
    // เคลียร์ชื่อคอร์ทซ้ำ (ถ้ามี)
    if (court_name && !court_name.startsWith('M-')) {
       await supabaseAdmin.from('manual_previews').delete().eq('court_name', court_name)
    }
    
    const { error } = await supabaseAdmin.from('manual_previews').insert([{
        court_name, p1_id, p2_id, p3_id, p4_id
    }])

    if (error) throw error;
    return NextResponse.json({ status: 'success' })
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message })
  }
}

export async function DELETE(req: Request) {
  try {
    const { court_name, id } = await req.json()
    
    // 🌟 ป้องกันการล้างกระดาน: ถ้าไม่ได้ระบุ ID ห้ามลบเด็ดขาด
    if (!id && !court_name) {
      return NextResponse.json({ status: 'error', message: 'Missing deletion criteria' })
    }
    
    let query = supabaseAdmin.from('manual_previews').delete();
    
    // 🌟 ลบให้ตรงตัวเป๊ะๆ 1 แถวเท่านั้น ป้องกันการลบโดนคิวอื่น
    if (id) {
       query = query.eq('id', id); 
    } else {
       query = query.eq('court_name', court_name); 
    }
    
    const { error } = await query;
    if (error) throw error;
    
    return NextResponse.json({ status: 'success' })
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message })
  }
}