import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { draggedId, targetId } = await request.json();
    if (!draggedId || !targetId) {
      return NextResponse.json({ error: 'Missing IDs' }, { status: 400 });
    }

    const { data: dData } = await supabaseAdmin.from('player_queue').select('timestamp').eq('id', draggedId).single();
    const { data: tData } = await supabaseAdmin.from('player_queue').select('timestamp').eq('id', targetId).single();

    if (dData && tData) {
        await supabaseAdmin.from('player_queue').update({ timestamp: tData.timestamp }).eq('id', draggedId);
        await supabaseAdmin.from('player_queue').update({ timestamp: dData.timestamp }).eq('id', targetId);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
