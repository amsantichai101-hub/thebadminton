import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabaseClient';

// ✅ Node crypto ใช้ได้ใน Next.js route handler
import crypto from 'crypto';

webpush.setVapidDetails(
  'mailto:admin@badminton.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

function makeDeviceKey(endpoint: string) {
  // เอา hash สั้น ๆ พอ (กันชนกันยากมากในงานนี้)
  return crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 16);
}

function isExpiredSubscriptionError(err: any) {
  const statusCode = err?.statusCode || err?.status || err?.code;
  return statusCode === 410 || statusCode === 404;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ==========================================
    // 1) Subscribe / Update / Add ใหม่ (ไม่ต้องแก้ schema)
    // ==========================================
    if (body.action === 'subscribe') {
      const userId = body.userId;
      const subscription = body.subscription;

      if (!userId || !subscription?.endpoint) {
        return NextResponse.json({ error: 'Missing userId or subscription.endpoint' }, { status: 400 });
      }

      const deviceKey = makeDeviceKey(subscription.endpoint);
      const userIdDevice = `${userId}::${deviceKey}`;

      // ✅ upsert เฉพาะ device นี้ (ทำให้แอดเพิ่มได้หลายอุปกรณ์)
      const { error } = await supabaseAdmin
        .from('push_subscriptions')
        .upsert(
          {
            user_id: userIdDevice,
            subscription,
            // created_at มีอยู่แล้ว ไม่แตะก็ได้
            // ถ้ามี updated_at ใน table ก็ใส่ได้ แต่คุณบอกไม่อยากแก้ schema จึงไม่บังคับ
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      // (Optional) เพื่อรองรับของเก่าที่เคยเก็บเป็น user_id ตรง ๆ
      // ถ้าอยาก “ย้าย/อัปเดต” record เดิมให้เป็น device-based ก็ทำได้ แต่ไม่จำเป็น

      return NextResponse.json({
        success: true,
        mode: 'upsert_by_user_device',
        user_id: userIdDevice,
      });
    }

    // ==========================================
    // 2) Send รายบุคคล (ส่งทุก device ของ user)
    // ==========================================
    if (body.action === 'send') {
      const userId = body.userId;
      if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

      // ✅ ดึงทั้งแบบใหม่ (userId::%) และแบบเก่า (userId ตรง ๆ)
      const { data: subs, error } = await supabaseAdmin
        .from('push_subscriptions')
        .select('user_id, subscription')
        .or(`user_id.eq.${userId},user_id.like.${userId}::%`);

      if (error) throw error;
      if (!subs || subs.length === 0) {
        return NextResponse.json({ error: 'User not subscribed' }, { status: 404 });
      }

      const payload = JSON.stringify({
        title: body.title,
        body: body.message,
        url: body.url || '/?tab=home'
      });

      let successCount = 0;
      let failCount = 0;
      let deletedCount = 0;

      for (const sub of subs) {
        try {
          await webpush.sendNotification(sub.subscription, payload, {
            urgency: 'high',
            TTL: 60 * 60
          });
          successCount++;
        } catch (err: any) {
          failCount++;

          // ✅ ถ้า subscription หมดอายุ/โดน revoke → ลบทิ้ง ไม่ให้ค้าง
          if (isExpiredSubscriptionError(err)) {
            await supabaseAdmin
              .from('push_subscriptions')
              .delete()
              .eq('user_id', sub.user_id);
            deletedCount++;
          } else {
            console.error(`Send failed for user_id ${sub.user_id}:`, err);
          }
        }
      }

      return NextResponse.json({
        success: true,
        total: subs.length,
        successCount,
        failCount,
        deletedCount
      });
    }

    // ==========================================
    // 3) Broadcast (เหมือนเดิม + ลบตัวหมดอายุให้ด้วย)
    // ==========================================
    if (body.action === 'broadcast') {
      const targetDate = new Date(body.date);
      targetDate.setHours(0, 0, 0, 0);

      const { data: subs, error } = await supabaseAdmin
        .from('push_subscriptions')
        .select('user_id, subscription, created_at')
        .gte('created_at', targetDate.toISOString());

      if (error) throw error;
      if (!subs || subs.length === 0) {
        return NextResponse.json({ error: 'ไม่พบผู้ใช้งานที่ลงทะเบียนรับแจ้งเตือนในช่วงเวลานี้' }, { status: 404 });
      }

      const payload = JSON.stringify({
        title: body.title,
        body: body.message,
        url: '/?tab=home',
        vibrate: [500, 200, 500, 200, 1000]
      });

      let successCount = 0;
      let failCount = 0;
      let deletedCount = 0;

      for (const sub of subs) {
        try {
          await webpush.sendNotification(sub.subscription, payload, {
            urgency: 'high',
            TTL: 86400
          });
          successCount++;
        } catch (err: any) {
          failCount++;

          if (isExpiredSubscriptionError(err)) {
            await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', sub.user_id);
            deletedCount++;
          } else {
            console.error(`Broadcast failed for user_id ${sub.user_id}:`, err);
          }
        }
      }

      return NextResponse.json({
        success: true,
        total: subs.length,
        count: successCount,
        failCount,
        deletedCount
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
