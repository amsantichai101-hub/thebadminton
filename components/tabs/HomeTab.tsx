import { Play, Check, Clock, Swords, Eye, RefreshCw, X, CheckCircle2, Share, Bell, Settings, ArrowRightLeft, MapPin } from 'lucide-react';
import React, { useState, useEffect } from "react";

export default function HomeTab(props: any) {
  const { activeTab, ...rest } = props; 

  if (activeTab !== 'home') return null;
  const {
    state, admin, finish, startGame, previewQueue, globalPreview,
    getSkillColor, triggerReshuffle, lockQueue, confirmSpecificMatch, cancelManualMatch,
    openCheckIn, openSignOut, myProfile, getMySkillLevel,
    enableNotify, toggleEnableNotify,
    swapSource, setSwapSource, executePlayerSwap // 🌟 ดึงฟังก์ชันสลับตัวมาใช้
  } = props;

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(true); 
  const [notifyPerm, setNotifyPerm] = useState<string>('granted');

  useEffect(() => {
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches 
                         || ('standalone' in navigator && (navigator as any).standalone === true);
    setIsStandalone(checkStandalone);

    if ('Notification' in window) {
      setNotifyPerm(Notification.permission);
    }
  }, []);

  const requestNotify = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifyPerm(perm);
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

  // --- 🌟 คำนวณข้อมูลสำหรับแสดงบน Header 🌟 ---
  const activeCourtsCount = (state?.playing || []).length;
  const myQueueIndex = (state?.waiting || []).findIndex((p: any) => p.id === myProfile?.id);
  const myQueueNumber = myQueueIndex !== -1 ? myQueueIndex + 1 : null;
  const playTime = state?.playTime || '20.00 - 22.30'; // fallback สามารถแก้เชื่อมกับ config ได้
  // ------------------------------------------

  return (
    <div className="space-y-8 pt-4 pb-20 px-2 sm:px-0">

      {/* 🌟 ส่วน Header ใหม่: แสดงเวลา, Active Court, และข้อมูลผู้เล่น/เลขคิว 🌟 */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 rounded-[1.5rem] p-4 shadow-sm flex items-center justify-between mb-4">
        {/* ด้านซ้าย: เวลา และ จำนวนคอร์ทที่ Active */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-sm font-black text-slate-700 dark:text-slate-200 tracking-tight">
            <Clock className="w-4 h-4 text-indigo-500" />
            {playTime}
          </div>
          <div className="flex items-center gap-1.5">
             <span className="text-[10px] sm:text-[11px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
               <Swords className="w-3 h-3" /> Active {activeCourtsCount} คอร์ท
             </span>
          </div>
        </div>

        {/* ด้านขวา: ชื่อผู้เล่น, คิว, และปุ่ม Check In / Out */}
        <div className="flex items-center justify-end text-right">
          {myProfile ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5 tracking-tight">
                   <span className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-inner ${getSkillColor(Math.floor(getMySkillLevel()))}`}></span>
                   {myProfile.name}
                </span>
                {myQueueNumber ? (
                  <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 mt-0.5 tracking-tight">
                    คิวที่ #{myQueueNumber}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 tracking-tight">
                    อยู่ระหว่างเล่น / ไม่อยู่ในคิว
                  </span>
                )}
              </div>
              <button 
                onClick={openSignOut}
                className="bg-red-50 hover:bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-2 sm:px-3 sm:py-1.5 rounded-full sm:rounded-xl transition-all active:scale-95 shadow-sm border border-red-100 dark:border-red-900/50 flex items-center gap-1"
                title="Check Out"
              >
                <X className="w-4 h-4" /> <span className="hidden sm:inline text-[11px] font-black">Check Out</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={openCheckIn}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-sm font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center gap-2"
            >
              <span className="text-base leading-none">👋</span> <span className="hidden sm:inline">เข้าสู่ระบบ</span> Check In
            </button>
          )}
        </div>
      </div>
      {/* 🌟 จบส่วน Header 🌟 */}


      {/* แบนเนอร์การแจ้งเตือนต่างๆ (จะซ่อนตัวเองถ้าระบบแจ้งเตือนถูกแอดมินปิดไว้) */}
      {enableNotify && (
        <div className="space-y-3 mt-4">
          {!isStandalone && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/30 border border-amber-200/60 dark:border-amber-700/50 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-start gap-3 backdrop-blur-sm transition-all hover:shadow-md">
              <div className="bg-white/80 dark:bg-amber-800/80 p-2.5 rounded-xl text-amber-600 dark:text-amber-400 shrink-0 shadow-sm border border-amber-100 dark:border-amber-700">
                <Share className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-black text-amber-900 dark:text-amber-300 mb-1 tracking-tight">ติดตั้งแอปเพื่อรับการแจ้งเตือน</p>
                <p className="text-xs text-amber-800/80 dark:text-amber-400/80 leading-relaxed font-medium">
                  แนะนำให้กดปุ่ม <b>Share (แชร์)</b> ด้านล่าง แล้วเลือก <b>Add to Home Screen</b> เพื่อใช้งานได้อย่างลื่นไหล
                </p>
              </div>
            </div>
          )}

          {isStandalone && notifyPerm === 'default' && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/30 border border-blue-200/60 dark:border-blue-700/50 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between gap-3 backdrop-blur-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="bg-white/80 dark:bg-blue-800/80 p-2.5 rounded-xl text-blue-600 dark:text-blue-400 shrink-0 shadow-sm border border-blue-100 dark:border-blue-700">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-blue-900 dark:text-blue-300 tracking-tight">เปิดรับการแจ้งเตือน</p>
                  <p className="text-[11px] text-blue-700/80 dark:text-blue-400/80 font-medium mt-0.5">ระบบจะแจ้งเตือนเมื่อถึงคิวของคุณ</p>
                </div>
              </div>
              <button 
                onClick={requestNotify}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all shrink-0"
              >
                เปิดใช้งาน
              </button>
            </div>
          )}

          {isStandalone && notifyPerm === 'denied' && (
            <div className="bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/40 dark:to-rose-900/30 border border-red-200/60 dark:border-red-800/50 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-start gap-3 backdrop-blur-sm transition-all hover:shadow-md">
               <div className="bg-white/80 dark:bg-red-800/80 p-2.5 rounded-xl text-red-600 dark:text-red-400 shrink-0 shadow-sm border border-red-100 dark:border-red-700">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-red-900 dark:text-red-300 tracking-tight">การแจ้งเตือนถูกปิดกั้น</p>
                  <p className="text-xs text-red-800/80 dark:text-red-400/80 leading-relaxed font-medium mt-0.5">โปรดไปที่การตั้งค่าอุปกรณ์เพื่ออนุญาตการแจ้งเตือน</p>
                </div>
            </div>
          )}
        </div>
      )}

      {/* 1. ส่วน Preview Courts: โชว์คิวจำลอง */}
      {globalPreview && previewQueue && previewQueue.length > 0 && (
        <section className="animate-in slide-in-from-bottom-4 duration-500 ease-out mt-4">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-black text-xl text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
              <Bell className="w-6 h-6 text-blue-500" /> คู่ถัดไป ({previewQueue.length} คู่)
            </h2>
            {swapSource && (
               <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full animate-pulse border border-amber-200 flex items-center gap-1">
                 <ArrowRightLeft className="w-3 h-3" /> แตะผู้เล่นอื่นเพื่อสลับ
               </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {previewQueue.map((m: any, idx: number) => (
              <div key={m.matchId || idx} className={`relative overflow-hidden rounded-[1.5rem] border-2 shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all ${m.isManual ? 'border-emerald-400/60 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-900' : 'border-blue-300/60 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-900'}`}>
                
                {/* Header Badge */}
                <div className={`px-4 py-2.5 flex justify-between items-center border-b ${m.isManual ? 'border-emerald-100 dark:border-emerald-800/50 bg-emerald-100/50 dark:bg-emerald-800/30' : 'border-blue-100 dark:border-blue-800/50 bg-blue-100/50 dark:bg-blue-800/30'}`}>
                  <span className={`text-[11px] font-black uppercase tracking-wider ${m.isManual ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-400'} flex items-center gap-1`}>
                    {m.isManual ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />} 
                    {m.isManual ? "ยืนยันแล้วและเตรียมพร้อม" : "รอการยืนยันทีมและอาจมีการเปลี่ยนแปลง"}
                  </span>
                  <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-800/60 px-2 py-0.5 rounded-md shadow-sm">
                    Queue #{idx + 1}
                  </span>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="space-y-4">
                    {/* Team 1 */}
                    <div className="grid grid-cols-2 gap-3">
                      {m.teams[0]?.map((p: any) => (
                        <div 
                          key={p.id} 
                          onClick={() => {
                            if (!admin && p.id !== myProfile?.id) return; // ถ้าไม่ใช่แอดมิน ให้คลิกได้เฉพาะตอนจะสลับตัวเอง (optional limit)
                            if (swapSource) {
                              executePlayerSwap(m.matchId, p.id);
                            } else {
                              setSwapSource({ matchId: m.matchId, playerId: p.id });
                            }
                          }}
                          className={`
                            relative px-3 py-3 rounded-xl text-xs sm:text-sm font-bold text-center shadow-sm 
                            transition-all duration-200 ease-out cursor-pointer active:scale-95
                            ${getSkillColor(Math.floor(p.skill))}
                            ${p.id === myProfile?.id ? 'ring-[3px] ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-lg scale-105 z-10' : 'border border-white/20'} 
                            ${swapSource?.playerId === p.id ? 'ring-4 ring-amber-500 ring-offset-2 animate-pulse scale-105 z-20 shadow-amber-500/50' : ''} 
                          `}
                        >
                          <span className="line-clamp-1">{p.name}</span>
                          {p.id === myProfile?.id && <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black shadow-sm">YOU</div>}
                        </div>
                      ))}
                    </div>
                    
                    {/* VS Divider */}
                    <div className="relative flex items-center justify-center my-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t-2 border-dashed border-slate-200 dark:border-slate-700"></div>
                      </div>
                      <div className="relative bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm text-slate-400 dark:text-slate-500 text-[10px] font-black tracking-widest z-10">
                        VS
                      </div>
                    </div>

                    {/* Team 2 */}
                    <div className="grid grid-cols-2 gap-3">
                      {m.teams[1]?.map((p: any) => (
                        <div 
                          key={p.id} 
                          onClick={() => {
                            if (!admin && p.id !== myProfile?.id) return; 
                            if (swapSource) {
                              executePlayerSwap(m.matchId, p.id);
                            } else {
                              setSwapSource({ matchId: m.matchId, playerId: p.id });
                            }
                          }}
                          className={`
                            relative px-3 py-3 rounded-xl text-xs sm:text-sm font-bold text-center shadow-sm 
                            transition-all duration-200 ease-out cursor-pointer active:scale-95
                            ${getSkillColor(Math.floor(p.skill))}
                            ${p.id === myProfile?.id ? 'ring-[3px] ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-lg scale-105 z-10' : 'border border-white/20'} 
                            ${swapSource?.playerId === p.id ? 'ring-4 ring-amber-500 ring-offset-2 animate-pulse scale-105 z-20 shadow-amber-500/50' : ''} 
                          `}
                        >
                          <span className="line-clamp-1">{p.name}</span>
                          {p.id === myProfile?.id && <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black shadow-sm">YOU</div>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Admin Actions */}
                  {admin && (
                    <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                      {!m.isManual ? (
                        <>
                          <button 
                            onClick={() => handleAction(`lock-${m.matchId}`, async () => await lockQueue(m))} 
                            disabled={loadingId === `lock-${m.matchId}`}
                            className={`flex-1 py-2.5 text-white text-xs font-black rounded-xl transition-all flex justify-center items-center gap-1.5 shadow-md ${loadingId === `lock-${m.matchId}` ? 'bg-blue-400 cursor-not-allowed opacity-75' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
                          >
                            {loadingId === `lock-${m.matchId}` ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {loadingId === `lock-${m.matchId}` ? 'รอสักครู่...' : 'ยืนยันผล'}
                          </button>

                          {false && (
                            <button 
                              onClick={() => handleAction(`reshuffle-${m.matchId}`, async () => await triggerReshuffle(m))} 
                              disabled={loadingId === `reshuffle-${m.matchId}`}
                              className={`px-4 py-2.5 rounded-xl border-2 transition-all flex justify-center items-center ${loadingId === `reshuffle-${m.matchId}` ? 'bg-slate-100 cursor-not-allowed opacity-75 border-slate-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 active:scale-95'}`}
                            >
                              <RefreshCw className={`w-4 h-4 ${loadingId === `reshuffle-${m.matchId}` ? 'animate-spin text-blue-500' : 'text-slate-500 dark:text-slate-400'}`} />
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleAction(`send-${m.matchId}`, async () => await confirmSpecificMatch(m, m.courtName))} 
                            disabled={loadingId === `send-${m.matchId}`}
                            className={`flex-1 py-2.5 text-white text-xs font-black rounded-xl transition-all flex justify-center items-center gap-1.5 shadow-md ${loadingId === `send-${m.matchId}` ? 'bg-emerald-400 cursor-not-allowed opacity-75' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 active:scale-95'}`}
                          >
                            {loadingId === `send-${m.matchId}` ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                            {loadingId === `send-${m.matchId}` ? 'กำลังส่ง...' : 'ส่งลงสนาม'}
                          </button>

                          <button 
                            onClick={() => handleAction(`cancel-${m.matchId}`, async () => await cancelManualMatch(m))} 
                            disabled={loadingId === `cancel-${m.matchId}`}
                            className={`px-4 py-2.5 rounded-xl transition-all flex justify-center items-center shadow-sm border border-red-200 dark:border-red-900/50 ${loadingId === `cancel-${m.matchId}` ? 'bg-red-50 cursor-not-allowed opacity-75' : 'bg-red-50 dark:bg-red-900/30 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 active:scale-95'}`}
                          >
                            {loadingId === `cancel-${m.matchId}` ? <RefreshCw className="w-4 h-4 animate-spin text-red-400" /> : <X className="w-4 h-4" />}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. ส่วน Active Courts */}
      <section className="animate-in slide-in-from-bottom-6 duration-700 ease-out">
        <h2 className="font-black text-xl text-slate-800 dark:text-white mb-5 flex items-center gap-2 tracking-tight">
          <Play className="w-6 h-6 text-indigo-500" /> คอร์ทที่กำลังเล่นอยู่ ({activeCourtsCount} คอร์ท)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
  {(state?.courtNames || []).map((cn: string) => {
    const m = (state?.playing || []).find((p: any) => p.court === cn);
    const min = m ? Math.floor((Date.now() - new Date(m.startTime).getTime()) / 60000) : 0;
    const started = m ? ((Date.now() - new Date(m.startTime).getTime()) / 60000 > 1) : false;

    return (
      <div key={cn} className={`relative overflow-hidden rounded-[1.5rem] border shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all ${m ? 'border-indigo-100 dark:border-indigo-900/30 bg-white dark:bg-slate-800/90' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50'}`}>
        
        {/* 🌟 Status Header */}
        <div className={`relative px-4 py-3 flex justify-center items-center border-b ${m ? 'border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30' : 'border-slate-200 dark:border-slate-800'}`}>
          
          {/* Badge ชื่อคอร์ทตรงกลาง */}
          <span className="font-black text-base text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50 px-5 py-1 rounded-full flex items-center gap-2 shadow-sm">
            <MapPin className="w-4 h-4" /> {cn}
          </span>

          {/* เวลาถูกดรอปความเด่นลง (เอาพื้นหลังออก เปลี่ยนเป็นข้อความสีเทา) */}
          {m && (
            <div className="absolute right-4 flex items-center gap-1 text-slate-400 dark:text-slate-500 font-medium text-[11px]">
              <Clock className="w-3.5 h-3.5 opacity-70" /> 
              <span>{min} min</span>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5">
          {m ? (
            <div className="space-y-0"> {/* ปรับระยะห่างให้ชิดกันเพื่อใช้ป้าย VS คั่นกลาง */}
              
              {/* 🔵 ทีม A (กรอบสีน้ำเงินอ่อน) */}
              <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl p-2.5 pb-5 relative">
                
                <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                  <div className="bg-white dark:bg-slate-800 px-3 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm border border-slate-100 dark:border-slate-700 relative">
                    {m.p1Id === myProfile?.id && <div className="absolute inset-0 ring-2 ring-blue-500 rounded-xl z-10"></div>}
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-inner ${getSkillColor(Math.floor(m.p1Skill))}`}></span>
                    <span className="truncate">{m.p1Name}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 px-3 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm border border-slate-100 dark:border-slate-700 relative">
                    {m.p2Id === myProfile?.id && <div className="absolute inset-0 ring-2 ring-blue-500 rounded-xl z-10"></div>}
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-inner ${getSkillColor(Math.floor(m.p2Skill))}`}></span>
                    <span className="truncate">{m.p2Name}</span>
                  </div>
                </div>
              </div>

              {/* ⚡ ป้าย VS คั่นกลาง (ลอยทับระหว่างสองทีม) */}
              <div className="relative flex justify-center -my-3 z-10">
                <div className="bg-slate-800 text-white dark:bg-white dark:text-slate-800 text-[11px] font-black italic px-4 py-1 rounded-full shadow-lg border-[3px] border-white dark:border-slate-800">
                  VS
                </div>
              </div>

              {/* 🔴 ทีม B (กรอบสีแดงอ่อน) */}
              <div className="bg-rose-50/50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50 rounded-2xl p-2.5 pt-5 relative">
                <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                  <div className="bg-white dark:bg-slate-800 px-3 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm border border-slate-100 dark:border-slate-700 relative">
                    {m.p3Id === myProfile?.id && <div className="absolute inset-0 ring-2 ring-blue-500 rounded-xl z-10"></div>}
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-inner ${getSkillColor(Math.floor(m.p3Skill))}`}></span>
                    <span className="truncate">{m.p3Name}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 px-3 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm border border-slate-100 dark:border-slate-700 relative">
                    {m.p4Id === myProfile?.id && <div className="absolute inset-0 ring-2 ring-blue-500 rounded-xl z-10"></div>}
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-inner ${getSkillColor(Math.floor(m.p4Skill))}`}></span>
                    <span className="truncate">{m.p4Name}</span>
                  </div>
                </div>
                
              </div>

              {/* ส่วนปุ่มของ Admin */}
              {admin && (
                <div className="flex gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {!started && (
                    <button 
                      onClick={() => handleAction(`start-${cn}`, async () => await startGame(cn))} 
                      disabled={loadingId === `start-${cn}`}
                      className={`flex-1 py-2.5 text-white text-xs font-black rounded-xl transition-all flex justify-center items-center gap-1.5 shadow-md ${loadingId === `start-${cn}` ? 'bg-indigo-400 cursor-not-allowed opacity-75' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 active:scale-95'}`}
                    >
                      {loadingId === `start-${cn}` ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                      {loadingId === `start-${cn}` ? 'รอสักครู่...' : 'เริ่มเกม (จับเวลา)'}
                    </button>
                  )}
                  
                  <button 
                    onClick={() => finish(cn)} 
                    className="flex-[0.5] py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-black rounded-xl shadow-md active:scale-95 transition-all flex justify-center items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> จบเกม
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-10 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20">
              <Swords className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-sm font-bold tracking-wide uppercase">สนามว่าง</span>
            </div>
          )}
        </div>
      </div>
    );
  })}
</div>
      </section>

      {/* 🌟 3. Admin Settings (ส่วนของแอดมินสำหรับเปิด/ปิด ระบบแจ้งเตือน) */}
      {admin && (
        <section className="mt-10 animate-in slide-in-from-bottom-8 duration-700 ease-out">
          <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h3 className="font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2 text-lg tracking-tight">
              <Settings className="w-5 h-5 text-slate-500" /> Admin Controls
            </h3>
            
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
              <div className="flex flex-col pr-4">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">ระบบการแจ้งเตือน (Notifications)</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-medium">
                  เปิด/ปิด การแจ้งเตือนและแบนเนอร์ข้อความ หากปิดไว้ผู้เล่นทุกคนจะไม่ได้รับการแจ้งเตือนใดๆ
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" className="sr-only peer" checked={enableNotify} onChange={(e) => toggleEnableNotify(e.target.checked)} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}