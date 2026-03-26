import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseClient'

export async function POST(req: Request) {
    const { oldId, newId, name, skill } = await req.json();
    const s = supabaseAdmin;

    // อัปเดตในทุกๆ คิวที่ผู้เล่นคนนี้อยู่
    await s.from('player_queue').update({ id: newId, name, skill }).eq('id', oldId);
    await s.from('pending_queue').update({ id: newId, name, skill }).eq('id', oldId);
    
    // อัปเดตฐานข้อมูลหลัก
    const { data: exists } = await s.from('player_registry').select('id').eq('id', oldId).single();
    if(exists) await s.from('player_registry').update({ id: newId, name, latest_skill: skill }).eq('id', oldId);

    return NextResponse.json({ status: 'success' });
}