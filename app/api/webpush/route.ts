import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabaseClient';

webpush.setVapidDetails(
  'mailto:admin@badminton.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. รับ Token จากมือถือมาบันทึกลงฐานข้อมูล
    if (body.action === 'subscribe') {
      const { error } = await supabaseAdmin.from('push_subscriptions').upsert({
        user_id: body.userId,
        subscription: body.subscription
      }, { onConflict: 'user_id' });
      
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Saved to Database' });
    }

    // 2. ดึง Token จากฐานข้อมูลมายิง Push
    if (body.action === 'send') {
      const { data, error } = await supabaseAdmin
         .from('push_subscriptions')
         .select('subscription')
         .eq('user_id', body.userId)
         .single();
         
      // ถ้ายิงแล้ว Error ตรงนี้แปลว่าไม่มีข้อมูลใน Database จริงๆ
      if (error || !data) {
          return NextResponse.json({ error: 'User not subscribed (No data in Supabase)' }, { status: 404 });
      }

      const payload = JSON.stringify({
        title: body.title,
        body: body.message,
        url: body.url || '/?tab=home'
      });

      // ยิงออกแบบด่วนที่สุด
      await webpush.sendNotification(data.subscription, payload, { urgency: 'high', TTL: 60 });
      return NextResponse.json({ success: true, message: 'Push sent!' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
