export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabaseClient';
import crypto from 'crypto';

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

webpush.setVapidDetails(
  'mailto:admin@badminton.com',
  requireEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY'),
  requireEnv('VAPID_PRIVATE_KEY')
);

function makeDeviceKey(endpoint: string) {
  return crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 16);
}

function isExpiredSubscriptionError(err: any) {
  const statusCode = err?.statusCode || err?.status || err?.code;
  return statusCode === 410 || statusCode === 404;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 🌟 1. ดึงค่าเช็คสถานะการแจ้งเตือนจาก Database (ทำเฉพาะตอนที่จะสั่งส่งแจ้งเตือนเท่านั้น)
    if (body.action === 'send' || body.action === 'broadcast') {
      const { data: notifyConfig } = await supabaseAdmin
        .from('system_config')
        .select('value')
        .eq('key', 'EnableNotify')
        .single();

      // 🌟 2. ถ้าแอดมินสั่งปิดแจ้งเตือนไว้ (ค่าเป็น 'false') ให้เบรกการทำงาน ไม่ต้องส่ง Push ออกไปเลย
      if (notifyConfig && notifyConfig.value === 'false') {
        return NextResponse.json({ success: true, message: 'Notifications are globally disabled.' });
      }
    }

    // =========================
    // 1) Subscribe (Update/Add)
    // =========================
    if (body.action === 'subscribe') {
      const userId = body.userId;
      const subscription = body.subscription;

      if (!userId || !subscription?.endpoint) {
        return NextResponse.json({ error: 'Missing userId or subscription.endpoint' }, { status: 400 });
      }

      const deviceKey = makeDeviceKey(subscription.endpoint);
      const userIdDevice = `${userId}::${deviceKey}`;

      const { error } = await supabaseAdmin
        .from('push_subscriptions')
        .upsert(
          { user_id: userIdDevice, subscription },
          { onConflict: 'user_id' }
        );

      if (error) throw error;
      return NextResponse.json({ success: true, user_id: userIdDevice });
    }

    // =========================
    // 2) Send (รายบุคคล)
    // =========================
    if (body.action === 'send') {
      const userId = body.userId;
      if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

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
          if (isExpiredSubscriptionError(err)) {
            await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', sub.user_id);
            deletedCount++;
          } else {
            console.error(`Send failed for user_id ${sub.user_id}:`, err);
          }
        }
      }

      return NextResponse.json({ success: true, total: subs.length, successCount, failCount, deletedCount });
    }

    // =========================
    // 3) Broadcast
    // =========================
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

      return NextResponse.json({ success: true, total: subs.length, count: successCount, failCount, deletedCount });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}