import { Play, Check, Clock, Swords, Eye, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import React from "react";

export default function HomeTab(props: any) {
  const { activeTab, ...rest } = props; // รับ activeTab มาด้วย

  // หากไม่อยู่ในหน้า home ให้คืนค่า null หรือซ่อนไปเลย
  if (activeTab !== 'home') return null;
  const {
    state, admin, finish, startGame, previewQueue, globalPreview,
    getSkillColor, triggerReshuffle, lockQueue, confirmSpecificMatch, cancelManualMatch
  } = props;

  return (
    <div className="space-y-6 pt-4 pb-20">

      {/* 1. ส่วน Preview Courts: โชว์คิวจำลอง */}
      {globalPreview && previewQueue && previewQueue.length > 0 && (
        <section>
          <h2 className="font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" /> Preview Mode
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {previewQueue.map((m: any, idx: number) => (
              <div key={m.matchId || idx} className={`border-2 rounded-2xl p-4 shadow-sm ${m.isManual ? 'border-emerald-500 bg-emerald-50' : 'border-blue-300 bg-blue-50'}`}>
                <div className="flex justify-between items-center mb-3 text-[10px] font-black uppercase text-slate-500">
                  <span>{m.isManual ? "✅ ยืนยันแล้ว" : "⏳ UP NEXT"}</span>
                  <span>Queue #{idx + 1}</span>
                </div>

                {/* รายชื่อผู้เล่น */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {m.teams.flat().map((p: any) => (
                    <div key={p.id} className={`p-2 rounded-lg text-[10px] font-bold text-center border ${getSkillColor(p.skill)}`}>
                      {p.name}
                    </div>
                  ))}
                </div>

                {admin && (
                  <div className="flex gap-2">
                    {!m.isManual ? (
                      <>
                        <button onClick={() => lockQueue(m)} className="flex-1 py-2 bg-blue-600 text-white text-[10px] font-bold rounded-lg active:scale-95 transition">ยืนยันผล</button>
                        <button onClick={() => triggerReshuffle(m)} className="px-3 py-2 bg-white rounded-lg border"><RefreshCw className="w-4 h-4" /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => confirmSpecificMatch(m, m.courtName)} className="flex-1 py-2 bg-emerald-600 text-white text-[10px] font-bold rounded-lg active:scale-95 transition">ส่งลงสนาม</button>
                        <button onClick={() => cancelManualMatch(m)} className="px-3 py-2 bg-red-100 text-red-600 rounded-lg"><X className="w-4 h-4" /></button>
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
            <div key={cn} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="font-black text-slate-800 dark:text-white">{cn}</span>
                {m && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3 inline" /> {min}m</span>}
              </div>

              {m ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
                    <div className="bg-blue-50 p-2 rounded">{m.p1Name}</div>
                    <div className="bg-blue-50 p-2 rounded">{m.p2Name}</div>
                  </div>                  
                  <div className="text-center font-black text-slate-300 text-[10px]">VS</div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">

                    <div className="bg-emerald-50 p-2 rounded">{m.p3Name}</div>
                    <div className="bg-emerald-50 p-2 rounded">{m.p4Name}</div>
                  </div>

                  {admin && (
                    <div className="flex gap-2">
                      {!started && <button onClick={() => startGame(cn)} className="flex-1 py-2 bg-indigo-600 text-white text-[10px] font-bold rounded-lg">เริ่มเกม</button>}
                      <button onClick={() => finish(cn)} className="flex-1 py-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg">จบแมทช์</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs font-medium italic border-2 border-dashed border-slate-100 rounded-xl">สนามว่าง</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}