'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    // 1. ตรวจสอบว่าแอปถูกติดตั้งไปแล้วหรือยัง
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
      return;
    }

    // 2. ตรวจสอบว่าเป็น iOS (Safari) หรือไม่
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // iOS ไม่รองรับ auto prompt ต้องโชว์คำแนะนำแบบ Manual
      setShowPopup(true);
    }

    // 3. ดักจับ Event สำหรับเบราว์เซอร์ที่รองรับ (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // ป้องกันไม่ให้เบราว์เซอร์โชว์ prompt เริ่มต้น
      setDeferredPrompt(e); // เก็บ event ไว้ใช้ตอนผู้ใช้กดปุ่ม
      setShowPopup(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPopup(false);
      }
      setDeferredPrompt(null);
    }
  };

  // ถ้าติดตั้งแล้ว หรือยังไม่ถึงเวลาโชว์ป๊อปอัป ให้ซ่อนไว้
  if (isStandalone || !showPopup) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-2xl z-50 border border-slate-200 dark:border-slate-700">
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">📲 ติดตั้งแอปเพื่อการแจ้งเตือน</h3>
        
        {isIOS ? (
          <div className="text-sm text-slate-600 dark:text-slate-300">
            <p className="mb-2 text-red-500 font-semibold">⚠️ Safari (iOS) ไม่รองรับการติดตั้งอัตโนมัติ</p>
            <p>แนะนำให้กดปุ่ม <strong>Share (แชร์)</strong> ด้านล่าง แล้วเลือก <strong>Add to Home Screen (เพิ่มไปยังหน้าจอโฮม)</strong> เพื่อใช้งานได้อย่างลื่นไหล</p>
          </div>
        ) : deferredPrompt ? (
          <div className="text-sm text-slate-600 dark:text-slate-300">
            <p className="mb-3 text-green-600 font-semibold">✅ เบราว์เซอร์นี้รองรับการติดตั้งอัตโนมัติ</p>
            <Button onClick={handleInstallClick} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2">
              คลิกเพื่อติดตั้งแอปลงเครื่อง
            </Button>
          </div>
        ) : (
          <div className="text-sm text-slate-600 dark:text-slate-300">
            <p className="mb-2 text-orange-500 font-semibold">⚠️ เบราว์เซอร์นี้ไม่รองรับการติดตั้งอัตโนมัติ</p>
            <p>หากคุณเปิดผ่าน LINE หรือ Facebook กรุณากดเมนูมุมขวาบน เลือก <strong>"เปิดในเบราว์เซอร์เริ่มต้น" (Chrome/Safari)</strong> เพื่อติดตั้งแอป</p>
          </div>
        )}
        
        <button 
          onClick={() => setShowPopup(false)}
          className="text-xs text-slate-400 hover:text-slate-600 text-center mt-2 underline"
        >
          ซ่อนไว้ก่อน
        </button>
      </div>
    </div>
  );
}