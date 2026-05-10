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

    // ส่วนบันทึกข้อมูล Token
    if (body.action === 'subscribe') {
      const { error } = await supabaseAdmin.from('push_subscriptions').upsert({
        user_id: body.userId,
        subscription: body.subscription
      }, { onConflict: 'user_id' });
      
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // ส่วนส่งแจ้งเตือน
    if (body.action === 'send') {
      const { data, error } = await supabaseAdmin
         .from('push_subscriptions')
         .select('subscription')
         .eq('user_id', body.userId)
         .single();
         
      if (error || !data) return NextResponse.json({ error: 'User not subscribed' }, { status: 404 });

      const payload = JSON.stringify({
        title: body.title,
        body: body.message,
        url: body.url || '/?tab=home'
      });

      await webpush.sendNotification(data.subscription, payload, {
        urgency: 'high', // 🌟 สำคัญมาก! ทะลวงโหมดประหยัดแบตเตอรี่ Android
        TTL: 60 * 60 // 🌟 ให้ค้างข้อความไว้ 1 ชม. เผื่อมือถือเน็ตหลุดชั่วคราว
      });
      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
