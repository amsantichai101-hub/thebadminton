import { Play, Check, Clock, Swords, Eye, RefreshCw, X, CheckCircle2, Share, Bell } from 'lucide-react';
import React, { useState, useEffect } from "react";

export default function HomeTab(props: any) {
  const { activeTab, ...rest } = props; 

  // หากไม่อยู่ในหน้า home ให้คืนค่า null หรือซ่อนไปเลย
  if (activeTab !== 'home') return null;
  const {
    state, admin, finish, startGame, previewQueue, globalPreview,
    getSkillColor, triggerReshuffle, lockQueue, confirmSpecificMatch, cancelManualMatch,
    openCheckIn, openSignOut, myProfile, getMySkillLevel 
  } = props;

  const [loadingId, setLoadingId] = useState<string | null>(null);

  // 🌟 State สำหรับจัดการ PWA และ การแจ้งเตือน
  const [isStandalone, setIsStandalone] = useState<boolean>(true); // ค่าเริ่มต้นเป็น true เพื่อกันแบนเนอร์กระพริบตอนโหลด
  const [notifyPerm, setNotifyPerm] = useState<string>('granted');

  useEffect(() => {
    // 1. เช็คว่าเป็น PWA (ติดตั้ง Add to Home Screen แล้วหรือยัง)
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches 
                         || ('standalone' in navigator && (navigator as any).standalone === true);
    setIsStandalone(checkStandalone);

    // 2. เช็คสถานะการขออนุญาตแจ้งเตือน
    if ('Notification' in window) {
      setNotifyPerm(Notification.permission);
    }
  }, []);

  const requestNotify = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifyPerm(perm);
      if (perm === 'granted') {
        // หากใน props มีฟังก์ชัน subscribe webpush สามารถนำมาเรียกตรงนี้ได้
      }
    }
  };

  const handleAction = async (id: string, actionFunc: () => Promise<void> | void) => {
    if (loadingId) return; 
    setLoadingId(id);
    try {
      await actionFunc();
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 pt-4 pb-20">

      {/* 🌟 1. Banner แนะนำให้ Add to Home Screen (โชว์เฉพาะตอนใช้บน Browser ปกติ) */}
      {!isStandalone && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-3 shadow-sm flex items-start gap-3 mx-1">
          <div className="bg-amber-100 dark:bg-amber-800/50 p-2 rounded-lg text-amber-600 dark:text-amber-400 shrink-0">
            <Share className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">ติดตั้งแอปเพื่อรับการแจ้งเตือน</p>
            <p className="text-[10px] text-amber-700 dark:text-amber-400/80 leading-relaxed">
              คุณกำลังใช้งานผ่านเบราว์เซอร์ แนะนำให้กดปุ่ม <b>Share (แชร์)</b> ด้านล่าง แล้วเลือก <b>Add to Home Screen (เพิ่มไปยังหน้าจอหลัก)</b> เพื่อใช้งานได้อย่างลื่นไหล
            </p>
          </div>
        </div>
      )}

      {/* 🌟 2. Banner ขออนุญาตแจ้งเตือน (โชว์เฉพาะติดตั้งแอปแล้ว แต่ยังไม่เปิดแจ้งเตือน) */}
      {isStandalone && notifyPerm === 'default' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl p-3 shadow-sm flex items-center justify-between gap-3 mx-1">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-800/50 p-2 rounded-lg text-blue-600 dark:text-blue-400 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-800 dark:text-blue-300">เปิดรับการแจ้งเตือน</p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400/80">ระบบจะแจ้งเตือนเมื่อถึงคิวของคุณ</p>
            </div>
          </div>
          <button 
            onClick={requestNotify}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-[10px] font-bold shadow-sm active:scale-95 transition-all shrink-0"
          >
            เปิดใช้งาน
          </button>
        </div>
      )}

      {/* 🌟 3. Banner แจ้งเตือนถูกบล็อก */}
      {isStandalone && notifyPerm === 'denied' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-3 shadow-sm flex items-start gap-3 mx-1">
           <div className="bg-red-100 dark:bg-red-800/50 p-2 rounded-lg text-red-600 dark:text-red-400 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-800 dark:text-red-300">การแจ้งเตือนถูกปิดกั้น</p>
              <p className="text-[10px] text-red-600 dark:text-red-400/80">โปรดไปที่การตั้งค่าอุปกรณ์เพื่ออนุญาตการแจ้งเตือน</p>
            </div>
        </div>
      )}

      {/* ส่วนเช็คสถานะ Check In / Check Out */}
      <div className="flex justify-end px-1 mt-2">
        {myProfile ? (
          <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full shadow-sm text-xs">
            <span className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 ${getSkillColor(getMySkillLevel())}`}></span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{myProfile.name}</span>
            <button 
              onClick={openSignOut}
              className="ml-1 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 px-2.5 py-0.5 rounded-full text-[10px] font-black transition-all active:scale-95"
            >
              Check Out
            </button>
          </div>
        ) : (
          <button 
            onClick={openCheckIn}
            className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span className="text-[10px]">📝</span> Check In
          </button>
        )}
      </div>

      {/* 1. ส่วน Preview Courts: โชว์คิวจำลอง */}
      {globalPreview && previewQueue && previewQueue.length > 0 && (
        <section>
          <h2 className="font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" /> Preview Mode
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {previewQueue.map((m: any, idx: number) => (
              <div key={m.matchId || idx} className={`border-2 rounded-2xl p-4 shadow-sm ${m.isManual ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-700' : 'border-blue-300 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800'}`}>
                <div className="flex justify-between items-center mb-3 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                  <span>{m.isManual ? "✅ ยืนยันแล้ว" : "⏳ UP NEXT"}</span>
                  <span>Queue #{idx + 1}</span>
                </div>

                <div className="space-y-2 mb-4">
                  {/* คู่ทีมที่ 1 */}
                  <div className="grid grid-cols-2 gap-2">
                    {m.teams[0]?.map((p: any) => (
                      <div key={p.id} className={`p-2 rounded-lg text-[10px] font-bold text-center border shadow-sm ${getSkillColor(p.skill)}`}>
                        {p.name}
                      </div>
                    ))}
                  </div>
                  
                  {/* เส้นคั่นกลาง VS */}
                  <div className="text-center font-black text-slate-400 dark:text-slate-500 text-[10px] flex items-center justify-center gap-2 my-1">
                    <div className="h-[1px] bg-slate-200 dark:bg-slate-700/60 flex-1"></div>
                    <span className="tracking-widest">VS</span>
                    <div className="h-[1px] bg-slate-200 dark:bg-slate-700/60 flex-1"></div>
                  </div>

                  {/* คู่ทีมที่ 2 */}
                  <div className="grid grid-cols-2 gap-2">
                    {m.teams[1]?.map((p: any) => (
                      <div key={p.id} className={`p-2 rounded-lg text-[10px] font-bold text-center border shadow-sm ${getSkillColor(p.skill)}`}>
                        {p.name}
                      </div>
                    ))}
                  </div>
                </div>

                {admin && (
                  <div className="flex gap-2">
                    {!m.isManual ? (
                      <>
                        <button 
                          onClick={() => handleAction(`lock-${m.matchId}`, async () => await lockQueue(m))} 
                          disabled={loadingId === `lock-${m.matchId}`}
                          className={`flex-1 py-2 text-white text-[10px] font-bold rounded-lg transition flex justify-center items-center gap-1 ${loadingId === `lock-${m.matchId}` ? 'bg-blue-400 cursor-not-allowed opacity-75' : 'bg-blue-600 active:scale-95'}`}
                        >
                          {loadingId === `lock-${m.matchId}` ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                          {loadingId === `lock-${m.matchId}` ? 'รอสักครู่...' : 'ยืนยันผล'}
                        </button>

                        <button 
                          onClick={() => handleAction(`reshuffle-${m.matchId}`, async () => await triggerReshuffle(m))} 
                          disabled={loadingId === `reshuffle-${m.matchId}`}
                          className={`px-3 py-2 rounded-lg border transition flex justify-center items-center ${loadingId === `reshuffle-${m.matchId}` ? 'bg-slate-100 cursor-not-allowed opacity-75' : 'bg-white dark:bg-slate-800 dark:border-slate-600 active:scale-95'}`}
                        >
                          <RefreshCw className={`w-4 h-4 ${loadingId === `reshuffle-${m.matchId}` ? 'animate-spin text-blue-500' : 'dark:text-slate-300'}`} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleAction(`send-${m.matchId}`, async () => await confirmSpecificMatch(m, m.courtName))} 
                          disabled={loadingId === `send-${m.matchId}`}
                          className={`flex-1 py-2 text-white text-[10px] font-bold rounded-lg transition flex justify-center items-center gap-1 ${loadingId === `send-${m.matchId}` ? 'bg-emerald-400 cursor-not-allowed opacity-75' : 'bg-emerald-600 active:scale-95'}`}
                        >
                          {loadingId === `send-${m.matchId}` ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                          {loadingId === `send-${m.matchId}` ? 'กำลังส่ง...' : 'ส่งลงสนาม'}
                        </button>

                        <button 
                          onClick={() => handleAction(`cancel-${m.matchId}`, async () => await cancelManualMatch(m))} 
                          disabled={loadingId === `cancel-${m.matchId}`}
                          className={`px-3 py-2 rounded-lg transition flex justify-center items-center ${loadingId === `cancel-${m.matchId}` ? 'bg-red-50 cursor-not-allowed opacity-75' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 active:scale-95'}`}
                        >
                          {loadingId === `cancel-${m.matchId}` ? <RefreshCw className="w-4 h-4 animate-spin text-red-400" /> : <X className="w-4 h-4" />}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. ส่วน Active Courts: สนามจริง (แสดงเวลา, ชื่อทีม, VS) */}
      <h2 className="font-black text-slate-800 dark:text-white mb-4">Active Courts</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(state?.courtNames || []).map((cn: string) => {
          const m = (state?.playing || []).find((p: any) => p.court === cn);
          const min = m ? Math.floor((Date.now() - new Date(m.startTime).getTime()) / 60000) : 0;
          const started = m ? ((Date.now() - new Date(m.startTime).getTime()) / 60000 > 1) : false;

          return (
            <div key={cn} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="font-black text-slate-800 dark:text-white">{cn}</span>
                {m && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3 inline" /> {min}m</span>}
              </div>

              {m ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded flex items-center justify-center gap-1.5 shadow-inner">
                      <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${getSkillColor(m.p1Skill)}`}></span>
                      <span className="truncate">{m.p1Name}</span>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded flex items-center justify-center gap-1.5 shadow-inner">
                      <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${getSkillColor(m.p2Skill)}`}></span>
                      <span className="truncate">{m.p2Name}</span>
                    </div>
                  </div>                  
                  <div className="text-center font-black text-slate-300 dark:text-slate-600 text-[10px]">VS</div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded flex items-center justify-center gap-1.5 shadow-inner">
                      <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${getSkillColor(m.p3Skill)}`}></span>
                      <span className="truncate">{m.p3Name}</span>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded flex items-center justify-center gap-1.5 shadow-inner">
                      <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${getSkillColor(m.p4Skill)}`}></span>
                      <span className="truncate">{m.p4Name}</span>
                    </div>
                  </div>

                  {admin && (
                    <div className="flex gap-2 mt-3">
                      {!started && (
                        <button 
                          onClick={() => handleAction(`start-${cn}`, async () => await startGame(cn))} 
                          disabled={loadingId === `start-${cn}`}
                          className={`flex-1 py-2 text-white text-[10px] font-bold rounded-lg transition flex justify-center items-center gap-1 ${loadingId === `start-${cn}` ? 'bg-indigo-400 cursor-not-allowed opacity-75' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
                        >
                          {loadingId === `start-${cn}` ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                          {loadingId === `start-${cn}` ? 'รอสักครู่...' : 'เริ่มเกม'}
                        </button>
                      )}
                      
                      <button 
                        onClick={() => finish(cn)} 
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-[10px] font-bold rounded-lg active:scale-95 transition"
                      >
                        จบแมทช์
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs font-medium italic border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-xl">สนามว่าง</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}