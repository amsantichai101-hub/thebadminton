import React, { useState, useEffect } from 'react';
import { X, Clock, MapPin, Swords, Play, Check, RefreshCw } from 'lucide-react';

export default function FocusMode(props: any) {
  const { state, setFullscreen, getSkillColor, myProfile, admin, finish, startGame } = props;
  
  // ใช้สำหรับอัปเดตเวลาให้เดินแบบ Real-time บนหน้าจอ
  const [now, setNow] = useState(Date.now());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000); // อัปเดตทุก 1 นาที
    return () => clearInterval(timer);
  }, []);

  const handleAction = async (id: string, actionFunc: () => Promise<void> | void) => {
    if (loadingId) return; 
    setLoadingId(id);
    try {
      await actionFunc();
    } finally {
      setLoadingId(null);
    }
  };

const PlayerMagnet = ({ name, skill, isYou }: { name: string, skill: number, isYou: boolean }) => {
    // ปรับ Logic การแสดงผลให้ฟอนต์ใหญ่ขึ้น
    // ถ้าชื่อสั้น (<= 6) ใช้ text-base (16px) 
    // ถ้าชื่อยาวขึ้น ระบบจะค่อยๆ ลดขนาดลงตามความเหมาะสม
    const len = name.length;
    let textClass = "text-[13px] md:text-[14px]"; 
    if (len <= 6) {
      textClass = "text-[16px] md:text-[18px] font-black"; // ใหญ่พิเศษสำหรับชื่อสั้น
    } else if (len <= 10) {
      textClass = "text-[12px] md:text-[14px]";
    }

    return (
      <div className="flex flex-col items-center shrink-0">
        <div className={`
          relative w-16 h-16 md:w-20 md:h-20 rounded-full flex flex-col items-center justify-center p-1
          bg-gradient-to-b from-white to-slate-100 border border-slate-300
          shadow-[0_4px_12px_rgba(0,0,0,0.08)]
          transition-transform duration-300 hover:scale-105
          ${isYou ? 'ring-2 ring-blue-500 ring-offset-2 shadow-blue-500/30' : ''}
        `}>
          {/* จุดสีบอกระดับฝีมือ */}
          <div className={`
            absolute top-2 md:top-2.5 left-1/2 -translate-x-1/2 w-3 h-3 md:w-3.5 md:h-3.5 rounded-full shadow-sm border border-black/10
            ${getSkillColor(skill)}
          `}></div>
          
          {/* ชื่อผู้เล่น: ปรับให้ใหญ่และกว้างขึ้น */}
          <span 
            className={`text-slate-800 font-bold text-center px-1 w-full tracking-tight mt-3 md:mt-4 ${textClass}`}
            style={{ 
              display: '-webkit-box', 
              WebkitLineClamp: 2, 
              WebkitBoxOrient: 'vertical', 
              overflow: 'hidden',
              wordBreak: 'break-word',
              lineHeight: '1.1' 
            }}
          >
            {name}
          </span>

          {/* ป้าย YOU */}
          {isYou && (
            <div className="absolute -bottom-1.5 md:-bottom-2 bg-blue-500 text-white text-[8px] md:text-[9px] px-2 py-0.5 rounded-full font-black shadow-md z-10 border border-white">
              YOU
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-50 text-slate-800 overflow-y-auto overflow-x-hidden font-sans pb-10">
      
      {/* 🌟 Background Effects (Light Mode) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <div className="sticky top-0 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 flex justify-between items-center z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black text-slate-800 tracking-tight leading-none">Live Courts</h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">Focus Mode</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex text-slate-600 text-sm font-bold bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 shadow-inner">
            {new Date(now).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button 
            onClick={() => setFullscreen(false)} 
            className="bg-white hover:bg-slate-100 text-slate-600 p-2 md:p-2.5 rounded-xl transition-all active:scale-95 border border-slate-200 shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 pt-4 sm:pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
          {(state?.courtNames || []).map((cn: string) => {
            const m = (state?.playing || []).find((p: any) => p.court === cn);
            const elapsedMin = m ? Math.floor((now - new Date(m.startTime).getTime()) / 60000) : 0;
            const started = elapsedMin >= 1; // เริ่มจับเวลาแล้ว

            // 🌟 Logic การคำนวณแถบ Progress (อิงฐานที่ 20 นาที)
            const maxTime = 20;
            const progressPercent = Math.min(100, (elapsedMin / maxTime) * 100);
            
            // เปลี่ยนสีตามเวลา (เขียว -> ส้ม -> แดง)
            let progressColor = 'bg-emerald-500';
            let timeBadgeColor = 'text-emerald-600 bg-emerald-100 border-emerald-200';
            
            if (elapsedMin >= 18) {
               progressColor = 'bg-red-500';
               timeBadgeColor = 'text-red-600 bg-red-100 border-red-200 animate-pulse';
            } else if (elapsedMin >= 15) {
               progressColor = 'bg-orange-500';
               timeBadgeColor = 'text-orange-600 bg-orange-100 border-orange-200';
            }

            return (
              <div key={cn} className="relative group">
                <div className={`
                  h-full rounded-[1.5rem] border overflow-hidden bg-white shadow-[0_4px_15px_rgba(0,0,0,0.03)] transition-all flex flex-col
                  ${m ? 'border-indigo-100' : 'border-slate-200 border-dashed bg-slate-50/50'}
                `}>
                  
                  {/* Court Header */}
                  <div className={`px-4 py-2.5 flex justify-between items-center ${m ? 'border-b border-indigo-50 bg-indigo-50/30' : 'border-slate-100 bg-slate-100/50'}`}>
                    <span className="font-black text-base text-slate-800 flex items-center gap-1.5">
                      <MapPin className={`w-4 h-4 ${m ? 'text-indigo-500' : 'text-slate-400'}`} /> {cn}
                    </span>
                    {m && (
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm border ${timeBadgeColor}`}>
                        <Clock className="w-3.5 h-3.5" /> <span>{elapsedMin} <span className="text-[9px] uppercase tracking-wider opacity-80">min</span></span>
                      </span>
                    )}
                  </div>

                  {/* 🌟 Progress Bar */}
                  {m && (
                    <div className="w-full h-[3px] bg-slate-100">
                      <div 
                        className={`h-[3px] transition-all duration-1000 ease-linear ${progressColor}`} 
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  )}

                  {/* Court Body */}
                  <div className="p-3 sm:p-5 flex flex-col justify-between flex-1 min-h-[160px] md:min-h-[180px]">
                    {m ? (
                      <>
                        <div className="relative flex flex-row items-center justify-between gap-2 sm:gap-3 flex-1 mt-2">
                          {/* Team 1 */}
                          <div className="flex gap-2 sm:gap-3 w-[45%] justify-end">
                            <PlayerMagnet name={m.p1Name} skill={m.p1Skill} isYou={m.p1Id === myProfile?.id} />
                            <PlayerMagnet name={m.p2Name} skill={m.p2Skill} isYou={m.p2Id === myProfile?.id} />
                          </div>

                          {/* VS Divider */}
                          <div className="flex flex-col items-center justify-center shrink-0 w-[10%] relative">
                            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center justify-center -z-10">
                               <div className="h-[120%] w-px border-l border-dashed border-slate-300"></div>
                            </div>
                            <div className="bg-slate-100 text-slate-500 border border-slate-200 font-black text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full tracking-widest shadow-sm z-10">
                              VS
                            </div>
                          </div>

                          {/* Team 2 */}
                          <div className="flex gap-2 sm:gap-3 w-[45%] justify-start">
                            <PlayerMagnet name={m.p3Name} skill={m.p3Skill} isYou={m.p3Id === myProfile?.id} />
                            <PlayerMagnet name={m.p4Name} skill={m.p4Skill} isYou={m.p4Id === myProfile?.id} />
                          </div>
                        </div>

                        {/* 🌟 Admin Actions (เริ่มเกม / จบแมตช์) */}
                        {admin && (
                          <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100 w-full">
                            {!started && (
                              <button 
                                onClick={() => handleAction(`start-${cn}`, async () => await startGame(cn))} 
                                disabled={loadingId === `start-${cn}`}
                                className={`flex-1 py-2.5 text-white text-[10px] md:text-xs font-bold rounded-xl transition-all flex justify-center items-center gap-1.5 shadow-sm ${loadingId === `start-${cn}` ? 'bg-indigo-400 cursor-not-allowed opacity-75' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
                              >
                                {loadingId === `start-${cn}` ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                                {loadingId === `start-${cn}` ? 'รอสักครู่...' : 'เริ่มเกม (จับเวลา)'}
                              </button>
                            )}
                            
                            <button 
                              onClick={() => finish(cn)} 
                              className="flex-[0.6] py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-[10px] md:text-xs font-bold rounded-xl shadow-sm active:scale-95 transition-all flex justify-center items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" /> จบแมตช์
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 h-full py-4">
                        <Swords className="w-8 h-8 mb-2 opacity-30 stroke-[1.5px]" />
                        <span className="text-xs font-bold tracking-widest uppercase">สนามว่าง</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}