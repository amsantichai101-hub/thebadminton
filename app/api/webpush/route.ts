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

    // ==========================================
    // 1. ส่วนบันทึกข้อมูล Token (Subscribe)
    // ==========================================
    if (body.action === 'subscribe') {
      const { error } = await supabaseAdmin.from('push_subscriptions').upsert({
        user_id: body.userId,
        subscription: body.subscription
      }, { onConflict: 'user_id' });
      
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // ==========================================
    // 2. ส่วนส่งแจ้งเตือนแบบรายบุคคล (Send)
    // ==========================================
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

    // ==========================================
    // 3. ส่วนส่งแจ้งเตือนกลุ่มให้ทุกคน (Broadcast)
    // ==========================================
    if (body.action === 'broadcast') {
      // ค้นหาผู้ที่อนุญาตแจ้งเตือนและมี Token ในระบบ ตั้งแต่วันที่แอดมินเลือกเป็นต้นมา
      const targetDate = new Date(body.date);
      targetDate.setHours(0, 0, 0, 0);

      const { data: subs, error } = await supabaseAdmin
        .from('push_subscriptions')
        .select('*')
        .gte('created_at', targetDate.toISOString());

      if (error || !subs || subs.length === 0) {
         return NextResponse.json({ error: 'ไม่พบผู้ใช้งานที่ลงทะเบียนรับแจ้งเตือนในช่วงเวลานี้' }, { status: 404 });
      }

      const payload = JSON.stringify({
        title: body.title,
        body: body.message,
        url: '/?tab=home',
        vibrate: [500, 200, 500, 200, 1000]
      });

      // วนลูปยิง Push ให้ทุกคนแบบ High Urgency
      let successCount = 0;
      for (const sub of subs) {
        try {
          await webpush.sendNotification(sub.subscription, payload, {
            urgency: 'high',
            TTL: 86400 // เก็บรอไว้ 24 ชม. เผื่อคนนั้นปิดเครื่อง
          });
          successCount++;
        } catch (err) {
          console.error(`Broadcast failed for user ${sub.user_id}:`, err);
        }
      }

      return NextResponse.json({ success: true, total: subs.length, count: successCount });
    }

    // ถ้าส่ง action อื่นมาที่ไม่ตรงเงื่อนไข
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}