import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

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
    
    // ถ้ามีการระบุคอร์ท ให้ลบของคอร์ทเดิมก่อน
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
    
    // 🌟 ป้องกันการล้างกระดาน: ถ้าไม่ได้ระบุ ID หรือชื่อคอร์ทมา ห้ามลบเด็ดขาด
    if (!id && !court_name) {
      return NextResponse.json({ status: 'error', message: 'Missing deletion criteria' })
    }
    
    let query = supabaseAdmin.from('manual_previews').delete();
    
    // 🌟 ตรวจสอบว่า id เป็น UUID หรือไม่ ถ้าไม่ใช่ให้ถือว่าเป็น court_name ป้องกัน Database Error
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (id && isUUID) {
       query = query.eq('id', id); 
    } else if (court_name || id) {
       query = query.eq('court_name', court_name || id); 
    }
    
    const { error } = await query;
    if (error) throw error;
    
    return NextResponse.json({ status: 'success' })
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message })
  }
}