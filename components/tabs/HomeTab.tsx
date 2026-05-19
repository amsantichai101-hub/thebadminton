import { User, CheckCircle2, Play, Clock, Swords, Check, Eye } from 'lucide-react'

export default function HomeTab(props: any) {
  const {
    activeTab, myProfile, openCheckIn, amIPlaying, getSkillColor, getMySkillLevel, getSkillName,
    myPending, myWaitIndex, estWaitMins, state, loadingCourts, allPreviews, availableCourts,
    avgMatchDuration, admin, finish, confirmSpecificMatch, setManualPreviews, executeAutoMatch, fetchProfileHistory
  } = props;

  return (
        <div className={activeTab === 'home' ? 'block animate-in fade-in slide-in-from-bottom-4 duration-300 pt-4' : 'hidden'}>
          
          {!myProfile ? (
            <div className="mb-6 p-6 rounded-3xl shadow-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 bg-blue-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-blue-500 mb-2 shadow-inner"><User className="w-8 h-8" /></div>
              <div><h3 className="font-black text-lg text-slate-800 dark:text-white">ยินดีต้อนรับสู่ระบบคิว</h3><p className="text-xs text-slate-500 mt-1">กรุณา Check In เพื่อรับคิวลงสนาม หรือกู้คืนโปรไฟล์</p></div>
              <button onClick={openCheckIn} className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl active:scale-95 transition shadow-lg flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5" /> Check In เข้าคิว</button>
            </div>
          ) : (
            <div className={`mb-6 p-4 rounded-2xl shadow-sm border flex items-center justify-between transition-all ${amIPlaying ? 'bg-blue-600 text-white border-blue-700' : myPending ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-yellow-900/30 dark:border-yellow-700/50 dark:text-yellow-200' : (myWaitIndex !== -1) ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700/50 dark:text-emerald-200' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-white border-slate-200 dark:border-slate-700'}`}>
              <div className="flex items-center gap-3">
                 <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black shadow-lg ${getSkillColor(getMySkillLevel())}`}>{myProfile.name.charAt(0)}</div>
                 <div>
                    <div className="font-black text-base leading-tight">{myProfile.name}</div>
                    <div className="text-[10px] font-bold opacity-70 uppercase tracking-wide mt-0.5 flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${getSkillColor(getMySkillLevel()).split(' ')[0]}`}></span>
                      Lv {getMySkillLevel()} • {getSkillName(getMySkillLevel())}
                    </div>
                 </div>
              </div>
              <div className="text-right">
                {amIPlaying ? ( <div className="text-sm font-black bg-black/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-inner"><Play className="w-4 h-4"/> Playing!</div>) 
                : myPending ? ( <div className="font-bold text-xs bg-black/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-inner"><Clock className="w-3.5 h-3.5"/> Pending...</div>) 
                : myWaitIndex !== -1 ? (
                   <div className="flex flex-col items-end gap-1">
                      <div className="text-xl font-black leading-none text-emerald-700 dark:text-emerald-400">คิว {myWaitIndex + 1}</div>
                      <div className="text-[10px] font-bold bg-emerald-200/50 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full shadow-sm">รอ ~{estWaitMins} นาที</div>
                   </div>
                ) : ( <div className="font-bold text-xs bg-black/5 px-3 py-1.5 rounded-lg opacity-50 shadow-inner">ว่าง</div> )}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-4"><h2 className="font-black text-lg text-slate-800 dark:text-white">Active Courts</h2><span className="text-xs font-bold bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-600 dark:text-slate-400 shadow-sm">{(state?.playing || []).length}/{state?.courtCount}</span></div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-10">
            {(state?.courtNames || []).map((cn: any) => {
              const isLoadingCourt = loadingCourts.includes(cn);
              const m = (state?.playing || []).find((p: any) => p.court === cn);
              const prepMatch = allPreviews.find((p: any) => allPreviews.indexOf(p) === availableCourts.indexOf(cn));

              if (isLoadingCourt) {
                return (
                  <div key={cn} className="bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm relative flex flex-col items-center justify-center min-h-[160px] animate-pulse">
                     <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                     <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">กำลังเตรียมคอร์ท...</span>
                  </div>
                )
              }

              if (m) {
                const min = Math.floor((Date.now()-new Date(m.startTime).getTime())/60000);
                const isLate = min >= avgMatchDuration; 
                return (
                  <div key={cn} className={`bg-white dark:bg-slate-800 rounded-2xl border ${isLate ? 'border-red-400 ring-2 ring-red-400/30' : 'border-slate-200 dark:border-slate-700'} p-4 shadow-sm relative`}>
                    <div className="flex justify-between items-center mb-3">
                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm ${isLate ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}><Clock className="w-3 h-3"/> {min}m</span>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{m.court}</span>
                    </div>
                    <div className="space-y-1.5 text-sm font-bold">
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg p-2.5 flex justify-between items-center shadow-sm"><span className="text-slate-700 dark:text-slate-200">{m.p1Name}</span><span className="text-slate-700 dark:text-slate-200">{m.p2Name}</span></div>
                      <div className="flex justify-center -my-3 z-10 relative"><span className="bg-white dark:bg-slate-800 text-[9px] px-1.5 rounded-full text-slate-400 border border-slate-100 dark:border-slate-700 flex items-center gap-1 shadow-sm"><Swords className="w-3.5 h-3.5"/></span></div>
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-lg p-2.5 flex justify-between items-center shadow-sm"><span className="text-slate-700 dark:text-slate-200">{m.p3Name}</span><span className="text-slate-700 dark:text-slate-200">{m.p4Name}</span></div>
                    </div>
                    {admin && <button onClick={async() => { finish(m.court); }} className="mt-4 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded-lg active:scale-95 transition flex items-center justify-center gap-1.5 shadow-md"><Check className="w-4 h-4"/> Finish Match</button>}
                  </div>
                )
              } else if (prepMatch) {
                return (
                  <div key={cn} className="bg-emerald-50 dark:bg-emerald-900/10 border-2 border-dashed border-emerald-400 dark:border-emerald-700/50 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-200 dark:bg-emerald-800/30 blur-2xl rounded-full -mr-4 -mt-4 z-0"></div>
                    <div className="flex justify-between items-center mb-3 relative z-10">
                        <span className="text-[10px] font-black tracking-widest uppercase bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded shadow-sm flex items-center gap-1"><Eye className="w-3 h-3"/> {prepMatch.isManual?'MANUAL FIFO':'UP NEXT'}</span>
                        <span className="text-xs font-black text-slate-400">{cn}</span>
                    </div>
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300 space-y-1.5 relative z-10">
                      <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg flex justify-between shadow-sm border border-slate-100 dark:border-slate-700"><span>{prepMatch.teams[0][0].name}</span><span>{prepMatch.teams[0][1].name}</span></div>
                      <div className="flex justify-center -my-3 z-10 relative"><span className="bg-emerald-50 dark:bg-slate-900 text-[9px] px-1.5 rounded-full text-slate-400 flex items-center gap-1"><Swords className="w-3.5 h-3.5"/></span></div>
                      <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg flex justify-between shadow-sm border border-slate-100 dark:border-slate-700"><span>{prepMatch.teams[1][0].name}</span><span>{prepMatch.teams[1][1].name}</span></div>
                    </div>
                    {admin && (
                      <div className="flex gap-2 relative z-10 mt-4">
                        <button onClick={()=>confirmSpecificMatch(prepMatch, cn)} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg shadow-sm active:scale-95 transition flex items-center justify-center gap-1.5"><CheckCircle2 className="w-4 h-4"/> Confirm Court</button>
                        {prepMatch.isManual && (
                          <button onClick={() => setManualPreviews((prev: any) => prev.filter((m: any) => m !== prepMatch))} className="px-3 py-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-200 rounded-lg text-xs font-black transition active:scale-95 shadow-md">✕</button>
                        )}
                      </div>
                    )}
                  </div>
                )
              } else {
                return <div key={cn} className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-4 flex flex-col items-center justify-center min-h-[160px]"><span className="text-xs font-bold text-slate-400">{cn}</span><span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full mt-1 font-bold shadow-inner">ว่าง</span></div>
              }
            })}
          </div>
        </div>
  )
}
