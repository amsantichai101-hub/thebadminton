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
    swapSource, setSwapSource, executePlayerSwap 
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

  const activeCourtsCount = (state?.playing || []).length;
  const myQueueIndex = (state?.waiting || []).findIndex((p: any) => p.id === myProfile?.id);
  const myQueueNumber = myQueueIndex !== -1 ? myQueueIndex + 1 : null;
  const playTime = state?.playTime || '20.00 - 22.30'; 

  return (
    <div className="space-y-4 pt-2 pb-20 px-2 sm:px-0">

      {/* 🌟 Header 🌟 */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 rounded-[1.25rem] p-3 shadow-sm flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-200 tracking-tight">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            {playTime}
          </div>
          <div className="flex items-center gap-1.5">
             <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
               <Swords className="w-3 h-3" /> {activeCourtsCount} คอร์ท
             </span>
          </div>
        </div>

        <div className="flex items-center justify-end text-right">
          {myProfile ? (
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5 tracking-tight">
                   <span className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-inner ${getSkillColor(Math.floor(getMySkillLevel()))}`}></span>
                   {myProfile.name}
                </span>
                {myQueueNumber ? (
                  <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 mt-0.5 tracking-tight">
                    คิวที่ #{myQueueNumber}
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-slate-400 mt-0.5 tracking-tight">
                    อยู่ระหว่างเล่น/ไม่อยู่ในคิว
                  </span>
                )}
              </div>
              <button 
                onClick={openSignOut}
                className="bg-red-50 hover:bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-1.5 rounded-lg transition-all active:scale-95 shadow-sm border border-red-100 dark:border-red-900/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={openCheckIn}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span>👋</span> Check In
            </button>
          )}
        </div>
      </div>

      {/* แบนเนอร์การแจ้งเตือน */}
      {enableNotify && (
        <div className="space-y-2 mt-2">
          {!isStandalone && (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200/60 dark:border-amber-700/50 rounded-xl p-3 shadow-sm flex items-start gap-2">
              <Share className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-amber-900 dark:text-amber-300">ติดตั้งแอปเพื่อรับการแจ้งเตือน</p>
                <p className="text-[10px] text-amber-800/80 dark:text-amber-400/80 mt-0.5">กด Share แล้วเลือก <b>Add to Home Screen</b></p>
              </div>
            </div>
          )}

          {isStandalone && notifyPerm === 'default' && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200/60 dark:border-blue-700/50 rounded-xl p-3 shadow-sm flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs font-black text-blue-900 dark:text-blue-300">เปิดรับการแจ้งเตือน</p>
                  <p className="text-[10px] text-blue-700/80 dark:text-blue-400/80">ระบบจะแจ้งเมื่อถึงคิว</p>
                </div>
              </div>
              <button 
                onClick={requestNotify}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow active:scale-95 shrink-0"
              >
                เปิดใช้งาน
              </button>
            </div>
          )}
        </div>
      )}

      {/* 1. Active Courts */}
      <section className="animate-in slide-in-from-bottom-6 duration-700 ease-out">
        <h2 className="font-black text-lg text-slate-800 dark:text-white mb-3 flex items-center gap-2 tracking-tight">
          <Play className="w-5 h-5 text-indigo-500" /> สนามที่เล่นอยู่ ({activeCourtsCount})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(state?.courtNames || []).map((cn: string) => {
            const m = (state?.playing || []).find((p: any) => p.court === cn);
            const min = m ? Math.floor((Date.now() - new Date(m.startTime).getTime()) / 60000) : 0;
            const started = m ? ((Date.now() - new Date(m.startTime).getTime()) / 60000 > 1) : false;

            return (
              <div key={cn} className={`relative overflow-hidden rounded-[1.25rem] border shadow-sm transition-all ${m ? 'border-indigo-100 dark:border-indigo-900/30 bg-white dark:bg-slate-800' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50'}`}>
                
                {/* Status Header */}
                <div className={`relative px-3 py-2 flex justify-between items-center border-b ${m ? 'border-slate-50 dark:border-slate-700/50' : 'border-slate-200 dark:border-slate-800'}`}>
                  <span className="font-black text-[13px] text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 px-3 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <MapPin className="w-3.5 h-3.5" /> {cn}
                  </span>
                  {m && (
                    <div className="flex items-center gap-1 text-slate-400 font-bold text-[11px]">
                      <Clock className="w-3.5 h-3.5" /> <span>{min} min</span>
                    </div>
                  )}
                </div>

                <div className="p-2 sm:p-2.5">
                  {m ? (
                    <div className="space-y-0.5 relative"> 
                      
                      <div className="flex flex-col gap-1.5 relative">
                        {/* 🌟 1. ป้าย VS คั่นกลาง */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                          <div className="bg-slate-800 dark:bg-slate-700 text-white text-[10px] font-black italic px-2.5 py-0.5 rounded-full shadow-md border-[2px] border-white dark:border-slate-800">
                            VS
                          </div>
                        </div>

                        {/* ทีม A */}
                        <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-xl bg-blue-50/60 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
                          <div className="bg-white dark:bg-slate-800 px-2 py-3 rounded-lg flex items-center justify-center gap-1.5 shadow-sm border border-slate-100 dark:border-slate-700 relative">
                            {/* 🌟 2. ไฮไลท์ตัวเอง (เอาพื้นหลังออกเหลือแต่เส้นกรอบ) */}
                            {m.p1Id === myProfile?.id && <div className="absolute inset-0 ring-[2px] ring-yellow-400 rounded-lg z-10 animate-pulse pointer-events-none shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>}
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getSkillColor(Math.floor(m.p1Skill))}`}></span>
                            <span className="text-base font-black truncate text-slate-800 dark:text-slate-100">{m.p1Name}</span>
                          </div>
                          <div className="bg-white dark:bg-slate-800 px-2 py-3 rounded-lg flex items-center justify-center gap-1.5 shadow-sm border border-slate-100 dark:border-slate-700 relative">
                            {m.p2Id === myProfile?.id && <div className="absolute inset-0 ring-[2px] ring-yellow-400 rounded-lg z-10 animate-pulse pointer-events-none shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>}
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getSkillColor(Math.floor(m.p2Skill))}`}></span>
                            <span className="text-base font-black truncate text-slate-800 dark:text-slate-100">{m.p2Name}</span>
                          </div>
                        </div>

                        {/* ทีม B */}
                        <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-xl bg-red-50/60 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30">
                          <div className="bg-white dark:bg-slate-800 px-2 py-3 rounded-lg flex items-center justify-center gap-1.5 shadow-sm border border-slate-100 dark:border-slate-700 relative">
                            {m.p3Id === myProfile?.id && <div className="absolute inset-0 ring-[2px] ring-yellow-400 rounded-lg z-10 animate-pulse pointer-events-none shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>}
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getSkillColor(Math.floor(m.p3Skill))}`}></span>
                            <span className="text-base font-black truncate text-slate-800 dark:text-slate-100">{m.p3Name}</span>
                          </div>
                          <div className="bg-white dark:bg-slate-800 px-2 py-3 rounded-lg flex items-center justify-center gap-1.5 shadow-sm border border-slate-100 dark:border-slate-700 relative">
                            {m.p4Id === myProfile?.id && <div className="absolute inset-0 ring-[2px] ring-yellow-400 rounded-lg z-10 animate-pulse pointer-events-none shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>}
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getSkillColor(Math.floor(m.p4Skill))}`}></span>
                            <span className="text-base font-black truncate text-slate-800 dark:text-slate-100">{m.p4Name}</span>
                          </div>
                        </div>
                      </div>

                      {admin && (
                        <div className="flex gap-2 pt-2">
                          {!started && (
                            <button 
                              onClick={() => handleAction(`start-${cn}`, async () => await startGame(cn))} 
                              disabled={loadingId === `start-${cn}`}
                              className={`flex-1 py-2 text-white text-[11px] font-black rounded-lg shadow-sm ${loadingId === `start-${cn}` ? 'bg-indigo-400 opacity-75' : 'bg-indigo-600 active:scale-95'}`}
                            >
                              {loadingId === `start-${cn}` ? 'รอ...' : 'เริ่มจับเวลา'}
                            </button>
                          )}
                          <button 
                            onClick={() => finish(cn)} 
                            className="flex-[0.4] py-2 bg-slate-800 text-white text-[11px] font-black rounded-lg shadow-sm active:scale-95 flex justify-center items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> จบ
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 flex flex-col items-center justify-center text-slate-400 text-[11px] font-bold">
                      สนามว่าง
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Preview Courts */}
      {globalPreview && previewQueue && previewQueue.length > 0 && (
        <section className="animate-in slide-in-from-bottom-4 duration-500 ease-out mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
              <Bell className="w-5 h-5 text-blue-500" /> คิวถัดไป ({previewQueue.length})
            </h2>
            {swapSource && (
               <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full animate-pulse border border-amber-200">
                 แตะเพื่อสลับ
               </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {previewQueue.map((m: any, idx: number) => (
              <div key={m.matchId || idx} className={`relative overflow-hidden rounded-[1.25rem] border shadow-sm ${m.isManual ? 'border-emerald-200 bg-emerald-50/30' : 'border-blue-200 bg-blue-50/30'}`}>
                
                <div className={`px-3 py-2 flex justify-between items-center border-b ${m.isManual ? 'border-emerald-100 bg-emerald-100/50' : 'border-blue-100 bg-blue-100/50'}`}>
                  <span className={`text-[10px] font-black uppercase ${m.isManual ? 'text-emerald-700' : 'text-blue-700'} flex items-center gap-1`}>
                    {m.isManual ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />} 
                    {m.isManual ? "ยืนยันแล้ว" : "รอการยืนยัน"}
                  </span>
                  <span className="text-[10px] font-black text-slate-500 bg-white/60 px-2 py-0.5 rounded shadow-sm">
                    Q #{idx + 1}
                  </span>
                </div>

                <div className="p-2 sm:p-2.5">
                  <div className="space-y-0.5 relative">
                    
                    <div className="flex flex-col gap-1.5 relative">
                      {/* 🌟 ป้าย VS คั่นกลาง */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <div className="bg-slate-800 dark:bg-slate-700 text-white text-[10px] font-black italic px-2.5 py-0.5 rounded-full shadow-md border-[2px] border-white dark:border-slate-800">
                          VS
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-xl bg-white/50 border border-slate-100">
                        {m.teams[0]?.map((p: any) => (
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
                              relative px-2 py-2.5 rounded-lg text-sm font-black text-center shadow-sm cursor-pointer active:scale-95 transition-all
                              ${getSkillColor(Math.floor(p.skill))}
                              ${p.id === myProfile?.id ? 'ring-[2.5px] ring-yellow-400 animate-pulse scale-105 z-10 shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'border border-black/5'} 
                              ${swapSource?.playerId === p.id ? 'ring-2 ring-emerald-500 animate-bounce scale-105 z-20' : ''} 
                            `}
                          >
                            <span className="line-clamp-1">{p.name}</span>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-xl bg-white/50 border border-slate-100">
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
                              relative px-2 py-2.5 rounded-lg text-sm font-black text-center shadow-sm cursor-pointer active:scale-95 transition-all
                              ${getSkillColor(Math.floor(p.skill))}
                              ${p.id === myProfile?.id ? 'ring-[2.5px] ring-yellow-400 animate-pulse scale-105 z-10 shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'border border-black/5'} 
                              ${swapSource?.playerId === p.id ? 'ring-2 ring-emerald-500 animate-bounce scale-105 z-20' : ''} 
                            `}
                          >
                            <span className="line-clamp-1">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {admin && (
                    <div className="flex gap-2 pt-2">
                      {!m.isManual ? (
                        <button 
                          onClick={() => handleAction(`lock-${m.matchId}`, async () => await lockQueue(m))} 
                          disabled={loadingId === `lock-${m.matchId}`}
                          className={`flex-1 py-2 text-white text-[11px] font-black rounded-lg shadow-sm ${loadingId === `lock-${m.matchId}` ? 'bg-blue-400 opacity-75' : 'bg-blue-600 active:scale-95'}`}
                        >
                          ยืนยันผล
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleAction(`send-${m.matchId}`, async () => await confirmSpecificMatch(m, m.courtName))} 
                            disabled={loadingId === `send-${m.matchId}`}
                            className={`flex-1 py-2 text-white text-[11px] font-black rounded-lg shadow-sm ${loadingId === `send-${m.matchId}` ? 'bg-emerald-400 opacity-75' : 'bg-emerald-600 active:scale-95'}`}
                          >
                            ส่งลงสนาม
                          </button>
                          <button 
                            onClick={() => handleAction(`cancel-${m.matchId}`, async () => await cancelManualMatch(m))} 
                            disabled={loadingId === `cancel-${m.matchId}`}
                            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg shadow-sm active:scale-95"
                          >
                            <X className="w-3.5 h-3.5" />
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

      {/* 3. Admin Settings */}
      {admin && (
        <section className="mt-8 mb-4">
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <h3 className="font-black text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-slate-500" /> Admin Controls
            </h3>
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100">
              <div>
                <div className="text-[11px] font-bold text-slate-800">ระบบการแจ้งเตือน</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={enableNotify} onChange={(e) => toggleEnableNotify(e.target.checked)} />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}