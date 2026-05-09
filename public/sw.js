// public/sw.js

self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon.png', // เปลี่ยนเป็น path ไอคอนแอปคุณ
      badge: '/icon.png',
      vibrate: data.vibrate || [500, 200, 500],
      data: { url: data.url || '/?tab=home' }
    };
    
    // สั่งปลุกหน้าจอและโชว์แจ้งเตือน
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = event.notification.data.url;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // ถ้าเปิดแอปอยู่แล้ว ให้ focus แล้วส่ง message ไปบอกให้เปลี่ยน Tab
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.postMessage({ action: 'navigate', url: targetUrl });
          return client.focus();
        }
      }
      // ถ้าปิดแอปอยู่ ให้เปิดแอปใหม่
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});