import { NextResponse } from 'next/server';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

let globalSubscriptions: { userId: string, sub: any }[] = [];

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === 'subscribe') {
      const existing = globalSubscriptions.find(s => s.userId === body.userId);
      if (existing) {
        existing.sub = body.subscription;
      } else {
        globalSubscriptions.push({ userId: body.userId, sub: body.subscription });
      }
      return NextResponse.json({ success: true });
    }

    if (body.action === 'send') {
      const targetSub = globalSubscriptions.find(s => s.userId === body.userId);
      if (!targetSub) return NextResponse.json({ error: 'User not subscribed' }, { status: 404 });

      const payload = JSON.stringify({
        title: body.title,
        body: body.message,
        url: body.url || '/?tab=home',
        vibrate: body.vibrate || [500, 200, 500]
      });

      // 🌟 เพิ่ม Options ตรงนี้ เพื่อแก้ปัญหา Samsung ดีเลย์ และบังคับปลุก iOS!
      const pushOptions = {
        urgency: 'high' as const, // บังคับทะลวง Doze Mode ของ Android
        TTL: 60 * 60 // อายุข้อความ (วินาที) ถ้าเครื่องออฟไลน์ให้รอส่งภายใน 1 ชั่วโมง
      };

      await webpush.sendNotification(targetSub.sub, payload, pushOptions);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}