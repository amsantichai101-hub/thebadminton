// app/api/webpush/route.ts
import { NextResponse } from 'next/server';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

// ในระบบจริง ควรเก็บ Subscriptions นี้ลง Database (เช่น SQL Server/Supabase) ผูกกับ userId
// โค้ดนี้ใช้ Memory เพื่อเป็นตัวอย่าง 100% Working
let subscriptions: { userId: string, sub: any }[] = [];

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. รับการลงทะเบียนจากมือถือ
    if (body.action === 'subscribe') {
      const existing = subscriptions.find(s => s.userId === body.userId);
      if (existing) {
        existing.sub = body.subscription; // อัปเดตเครื่องใหม่
      } else {
        subscriptions.push({ userId: body.userId, sub: body.subscription });
      }
      return NextResponse.json({ success: true, message: 'Subscribed completely' });
    }

    // 2. ส่ง Push ไปยังอุปกรณ์ (คุณสามารถเรียก API นี้จาก /api/manual-match ได้เลย)
    if (body.action === 'send') {
      const targetSub = subscriptions.find(s => s.userId === body.userId);
      if (!targetSub) return NextResponse.json({ error: 'User not subscribed' }, { status: 404 });

      const payload = JSON.stringify({
        title: body.title,
        body: body.message,
        vibrate: body.vibrate || [200, 100, 200],
        url: body.url || '/?tab=home'
      });

      await webpush.sendNotification(targetSub.sub, payload);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('WebPush Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}