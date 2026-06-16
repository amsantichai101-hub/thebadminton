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
    
    let query = supabaseAdmin.from('manual_previews').delete();
    if (id) {
       query = query.eq('id', id); // ลบด้วย UUID
    } else if (court_name) {
       query = query.eq('court_name', court_name); // ลบด้วยชื่อคอร์ท
    }
    
    const { error } = await query;
    if (error) throw error;
    
    return NextResponse.json({ status: 'success' })
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message })
  }
}