import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2, Play, Check, Clock, Users, Monitor, RefreshCw, MapPin, Eye, EyeOff } from 'lucide-react';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top',
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
  customClass: {
    container: '!z-[10000]', // 🌟 ดัน Toast แจ้งเตือนขึ้นมาหน้าสุด (เหนือ Focus Mode)
    popup: '!bg-slate-800/90 dark:!bg-white/90 !backdrop-blur-md !border-0 !shadow-lg !rounded-full !px-4 !py-2 !w-auto !min-w-0 !mt-4',
    title: '!text-[12px] !font-bold !text-white dark:!text-slate-900 !m-0 !p-0',
    icon: '!hidden',
  }
});

export default function FocusMode(props: any) {
  const {
    state, admin, setFullscreen, getSkillColor, startGame, loadingCourts, refresh, fetchProfileHistory, globalPreview, previewQueue,
    avgMatchDuration = 15 
  } = props;

  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [localClearing, setLocalClearing] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSmoothFinish = (court: string) => {
    Swal.fire({
      title: 'จบการแข่งขัน?',
      html: `ต้องการจบแมทช์ที่ <b class="text-blue-600">${court}</b> ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#ef4444',
      confirmButtonText: '✅ ใช่, จบแมทช์',
      cancelButtonText: '❌ ยกเลิก',
      reverseButtons: true,
      customClass: {
        container: '!z-[10000]', // 🌟 ดัน Popup คอนเฟิร์มขึ้นมาหน้าสุด (เหนือ Focus Mode)
        popup: '!rounded-[2rem] !shadow-2xl border border-slate-100',
        title: 'text-2xl font-black text-slate-800',
        confirmButton: 'font-bold rounded-xl px-6 py-3 shadow-lg hover:shadow-blue-500/50 transition-all active:scale-95',
        cancelButton: 'font-bold rounded-xl px-6 py-3 shadow-lg hover:shadow-red-500/50 transition-all active:scale-95'
      }
    }).then(async r => {
      if (!r.isConfirmed) return;
      
      setLocalClearing(prev => [...prev, court]);
      try {
        await fetch('/api/finish', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ court }) });
        await refresh(false);
        if (fetchProfileHistory) fetchProfileHistory();
        Toast.fire({ icon: 'success', title: `เคลียร์สนาม ${court} เรียบร้อย!` });
      } catch (e) {
        Toast.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการจบแมทช์' });
      } finally {
        setLocalClearing(prev => prev.filter(c => c !== court));
      }
    });
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
  
  const isSidebarVisible = globalPreview && previewQueue?.length > 0 && showSidebar;

  // คอมโพเนนต์ "แม่เหล็ก" สำหรับใส่ชื่อผู้เล่น (ทรงกลม/แคปซูล)
  const PlayerMagnet = ({ name, skill }: { name: string, skill: number }) => (
    <div className="flex items-center gap-2 px-2.5 py-1.5 sm:py-2 bg-white dark:bg-slate-800 rounded-full shadow-md border border-slate-200 dark:border-slate-700 w-full overflow-hidden">
      <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full shrink-0 shadow-sm ${getSkillColor(Math.ceil(skill))}`}></div>
      <div className="text-[11px] sm:text-xs xl:text-sm font-black leading-tight line-clamp-2 break-words text-slate-800 dark:text-slate-100 flex-1 text-left">
        {name}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden text-slate-800 dark:text-slate-200">
       
       {/* 🌟 Top Header (Compact) */}
       <div className="bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 p-2 sm:p-3 flex justify-between items-center shadow-sm">
         <div className="flex items-center gap-3 pl-2">
            <Monitor className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
            <div>
               <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-none">LIVE BOARD</h1>
            </div>
         </div>
         <div className="flex items-center gap-3 sm:gap-5 pr-2">
            <div className="text-right hidden sm:block">
              <div className="text-2xl font-black tabular-nums tracking-tighter text-slate-800 dark:text-white leading-none">
                {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                รอคิว: <span className="text-blue-600 dark:text-blue-400">{(state?.waiting || []).length} คน</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              {globalPreview && previewQueue?.length > 0 && (
                <button 
                  onClick={() => setShowSidebar(!showSidebar)} 
                  className={`p-2.5 sm:p-3 rounded-xl transition active:scale-95 flex items-center justify-center gap-2 font-bold text-sm
                    ${showSidebar ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
                  title="แสดง/ซ่อนคิวถัดไป"
                >
                  {showSidebar ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              )}
              
              <button 
                onClick={() => setFullscreen(false)} 
                className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 p-2.5 sm:p-3 rounded-xl transition active:scale-95 text-slate-600 dark:text-slate-400"
                title="ย่อหน้าจอ"
              >
                <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
         </div>
       </div>

       {/* 🌟 Main Content Grid */}
       <div className={`flex-1 p-3 sm:p-4 grid grid-cols-1 gap-3 sm:gap-4 overflow-hidden ${isSidebarVisible ? 'lg:grid-cols-4 2xl:grid-cols-5' : ''}`}>
          
          {/* 🌟 Active Courts (รองรับ 8 คอร์ทด้วย Grid ที่อัดแน่นขึ้น) */}
          <div className={`overflow-y-auto pr-1 ${isSidebarVisible ? 'lg:col-span-3 2xl:col-span-4' : 'col-span-full'}`}>
            <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 ${!isSidebarVisible ? '2xl:grid-cols-4' : '2xl:grid-cols-4'} gap-3 sm:gap-4`}>
              {(state?.courtNames || []).map((cn: string) => {
                const m = (state?.playing || []).find((p: any) => p.court === cn);
                const min = m ? Math.ceil((Date.now() - new Date(m.startTime).getTime()) / 60000) : 0;
                const started = m ? ((Date.now() - new Date(m.startTime).getTime()) / 60000 > 1) : false;

                const isClearing = localClearing.includes(cn);
                const isIncoming = (loadingCourts || []).includes(cn);
                const isLoadingState = isClearing || isIncoming;

                const progressPercent = Math.min((min / avgMatchDuration) * 100, 100);
                const isOvertime = min >= avgMatchDuration;

                return (
                  <div key={cn} className={`relative flex flex-col rounded-2xl border-2 shadow-sm transition-all overflow-hidden ${m && !isLoadingState ? 'border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50'}`}>
                    
                    {/* Court Header (Compact) */}
                    <div className={`relative px-3 sm:px-4 py-2 flex justify-between items-center ${m && !isLoadingState ? 'bg-indigo-100/50 dark:bg-slate-800/80' : 'bg-slate-50 dark:bg-slate-900'}`}>
                       <span className="font-black text-sm sm:text-base text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                         <MapPin className="w-4 h-4 sm:w-5 sm:h-5" /> {cn}
                       </span>
                       {m && !isLoadingState && (
                          <div className={`flex items-center gap-1.5 font-black text-xs sm:text-sm px-2.5 py-0.5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 ${isOvertime ? 'text-red-500 animate-pulse' : 'text-slate-600 dark:text-slate-300'}`}>
                            <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isOvertime ? 'text-red-500' : 'text-indigo-500'}`} /> {min} m
                          </div>
                       )}
                       
                       {/* Progress Bar ติดขอบล่าง Header */}
                       {m && !isLoadingState && (
                         <div className="absolute bottom-0 left-0 w-full h-[3px] bg-slate-200 dark:bg-slate-700 overflow-hidden">
                           <div className={`h-full transition-all duration-1000 ${isOvertime ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${progressPercent}%` }}></div>
                         </div>
                       )}
                    </div>

                    {/* Court Body (กระดานแม่เหล็ก) */}
                    <div className="flex-1 p-2 sm:p-3 flex flex-col justify-center relative min-h-[160px] sm:min-h-[180px]">
                       
                       {/* 1. SKELETON STATE */}
                       {isLoadingState ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 animate-pulse bg-white/60 dark:bg-slate-800/60 backdrop-blur-[2px] z-10">
                            <span className="text-xs sm:text-sm font-black text-indigo-600 bg-indigo-100 dark:bg-indigo-900/60 px-4 py-2 rounded-full flex items-center gap-2 border border-indigo-200 dark:border-indigo-700 shadow-sm mb-3">
                              <RefreshCw className="w-4 h-4 animate-spin" /> 
                              {isClearing ? 'กำลังเคลียร์สนาม...' : 'กำลังจัดเตรียม...'}
                            </span>
                            <div className="w-full grid grid-cols-2 gap-2">
                               <div className="h-8 sm:h-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                               <div className="h-8 sm:h-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                               <div className="h-8 sm:h-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                               <div className="h-8 sm:h-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                            </div>
                          </div>
                       ) 
                       /* 2. PLAYING STATE */
                       : m ? (
                          <div className="flex flex-col h-full justify-between gap-2">
                             <div className="flex flex-col gap-1.5 relative">
                                
                                {/* ป้าย VS กลางกระดาน */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                  <div className="bg-slate-800 dark:bg-slate-700 text-white text-[10px] font-black italic px-2.5 py-0.5 rounded-full shadow-md border-[2px] border-white dark:border-slate-800">
                                    VS
                                  </div>
                                </div>

                                {/* แม่เหล็ก Team A */}
                                <div className="grid grid-cols-2 gap-2 bg-blue-50/50 dark:bg-blue-900/10 p-1.5 rounded-2xl border border-blue-100 dark:border-slate-700">
                                  <PlayerMagnet name={m.p1Name} skill={m.p1Skill} />
                                  <PlayerMagnet name={m.p2Name} skill={m.p2Skill} />
                                </div>

                                {/* แม่เหล็ก Team B */}
                                <div className="grid grid-cols-2 gap-2 bg-red-50/50 dark:bg-red-900/10 p-1.5 rounded-2xl border border-red-100 dark:border-slate-700">
                                  <PlayerMagnet name={m.p3Name} skill={m.p3Skill} />
                                  <PlayerMagnet name={m.p4Name} skill={m.p4Skill} />
                                </div>
                             </div>
                             
                             {/* Admin Controls (Compact) */}
                             {admin && (
                               <div className="flex gap-2 mt-auto pt-1">
                                 {!started && (
                                  <button 
                                    onClick={() => handleAction(`start-${cn}`, async () => await startGame(cn))}
                                    disabled={loadingId === `start-${cn}`}
                                    className={`flex-1 py-1.5 sm:py-2 text-white text-xs font-black rounded-xl shadow-sm ${loadingId === `start-${cn}` ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
                                  >
                                    {loadingId === `start-${cn}` ? 'รอ...' : 'เริ่มเวลา'}
                                  </button>
                                 )}
                                 <button 
                                  onClick={() => handleSmoothFinish(cn)}
                                  className="flex-[0.4] py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-xl shadow-sm active:scale-95 flex items-center justify-center gap-1"
                                 >
                                  <Check className="w-3.5 h-3.5" /> จบ
                                 </button>
                               </div>
                             )}
                          </div>
                       ) 
                       /* 3. EMPTY STATE */
                       : (
                          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                            <Users className="w-10 h-10 sm:w-12 sm:h-12 mb-2 opacity-50" />
                            <span className="text-lg sm:text-xl font-black tracking-widest opacity-50">ว่าง</span>
                          </div>
                       )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 🌟 Sidebar Preview Queue (สไตล์กระดานแม่เหล็ก) */}
          {isSidebarVisible && (
            <div className="bg-slate-200/50 dark:bg-slate-900 rounded-3xl p-3 sm:p-4 flex flex-col border-[2px] border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner lg:col-span-1 2xl:col-span-1">
               <h2 className="text-lg font-black mb-3 flex items-center justify-between text-slate-800 dark:text-white tracking-tight px-1">
                 <div className="flex items-center gap-2">
                   คิวถัดไป <span className="bg-blue-600 text-white px-2 py-0.5 rounded-lg text-xs">{previewQueue.length}</span>
                 </div>
               </h2>
               <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                 {previewQueue.map((m: any, idx: number) => (
                    <div key={m.matchId || idx} className={`p-2.5 sm:p-3 rounded-2xl border-2 shadow-sm ${m.isManual ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-900/50'}`}>
                       <div className="flex justify-between items-center mb-2 px-1">
                         <span className="text-xs font-black text-slate-500 dark:text-slate-400">Q #{idx + 1}</span>
                         <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide ${m.isManual ? 'bg-emerald-200 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                           {m.isManual ? 'ยืนยันแล้ว' : 'รออัตโนมัติ'}
                         </span>
                       </div>
                       <div className="flex flex-col gap-1.5 relative">
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <span className="bg-slate-700 text-white text-[9px] font-black italic px-2 py-0.5 rounded-full border border-white dark:border-slate-700 shadow-sm">VS</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {m.teams[0]?.map((p: any) => (
                              <div key={p.id} className={`px-2 py-1.5 rounded-full text-[10px] xl:text-xs font-black text-center line-clamp-2 break-words leading-tight shadow-sm border border-slate-200 dark:border-slate-700 ${getSkillColor(Math.ceil(p.skill))}`}>{p.name}</div>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {m.teams[1]?.map((p: any) => (
                              <div key={p.id} className={`px-2 py-1.5 rounded-full text-[10px] xl:text-xs font-black text-center line-clamp-2 break-words leading-tight shadow-sm border border-slate-200 dark:border-slate-700 ${getSkillColor(Math.ceil(p.skill))}`}>{p.name}</div>
                            ))}
                          </div>
                       </div>
                    </div>
                 ))}
               </div>
            </div>
          )}

       </div>
    </div>
  );
}