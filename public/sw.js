self.addEventListener('push', function(event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'คุณมีคิวลงสนาม',
      icon: '/icon.png', // 🌟 ต้องมั่นใจว่ามีรูปนี้ในโฟลเดอร์ public จริงๆ ไม่งั้น Android บางรุ่นจะตีตก
      badge: '/icon.png',
      vibrate: data.vibrate || [500, 200, 500, 200, 1000],
      data: { url: data.url || '/?tab=home' },
      requireInteraction: true, // 🌟 สำคัญมากสำหรับ Android! บังคับให้อยู่บนจอจนกว่าจะปัดทิ้ง
    };
    
    // สั่งแสดงแจ้งเตือน (พร้อมส่ง Promise กลับไปให้ระบบรู้ว่าทำงานเสร็จแล้ว)
    event.waitUntil(
      self.registration.showNotification(data.title || 'Badminton Club', options)
    );
  } catch (error) {
    console.error('Push handling error:', error);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = event.notification.data.url;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          // ถ้าแอปเปิดค้างไว้อยู่ในเบื้องหลัง ให้ดึงขึ้นมา (Focus)
          return client.focus();
        }
      }
      // ถ้าแอปโดนปิดไปแล้ว (Kill) ให้เปิดแอปขึ้นมาใหม่
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});