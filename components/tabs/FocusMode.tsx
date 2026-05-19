import { Monitor, Maximize, Clock, Swords, Check, CheckCircle2, X } from 'lucide-react'

export default function FocusMode(props: any) {
  const { 
    state, playStartTime, playEndTime, setFullscreen, loadingCourts, 
    avgMatchDuration, finish, availableCourts, allPreviews, 
    confirmSpecificMatch, rejectPreviewMatch, admin 
  } = props;

  return (
    <div className="fixed inset-0 bg-slate-100 dark:bg-slate-950 z-[100] overflow-y-auto p-3 sm:p-6 flex flex-col">
      <div className="flex justify-between items-center mb-6 pt-2 pb-4 border-b border-slate-300 dark:border-slate-800">
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-widest flex items-center gap-3">
              <Monitor className="w-8 h-8 text-blue-600" /> LIVE FOCUS
            </h1>
            <span className="text-xs sm:text-sm text-slate-500 font-medium">Play Time: {playStartTime} - {playEndTime}</span>
          </div>
          <button onClick={()=>setFullscreen(false)} className="bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 px-4 sm:px-6 py-2 rounded-lg font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition shadow-md text-sm sm:text-base flex items-center gap-2">
            <Maximize className="w-4 h-4" /> EXIT
          </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 flex-1 pb-10">
        {(state?.courtNames || []).map((cn: any) => {
        const m = (state?.playing || []).find((p:any) => p.court === cn);
        const availIndex = availableCourts.indexOf(cn); 
        const prepMatch = availIndex !== -1 ? allPreviews[availIndex] : null;

        if (loadingCourts.includes(cn)) return <div key={cn} className="bg-slate-900 border border-slate-700 rounded-2xl flex flex-col items-center justify-center min-h-[140px] sm:min-h-[180px] animate-pulse"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div><span className="text-xs font-bold text-slate-400 tracking-widest uppercase">กำลังเตรียมคอร์ท...</span></div>;
        
        if (m) {
            const min = Math.floor((Date.now()-new Date(m.startTime).getTime())/60000); const isLate = min >= avgMatchDuration;
            return (
              <div key={cn} className={`bg-white dark:bg-slate-900 border ${isLate ? 'border-red-400 ring-2 ring-red-400/30' : 'border-slate-200 dark:border-slate-800'} rounded-2xl flex flex-col min-h-[140px] sm:min-h-[180px] relative overflow-hidden shadow-xl transition-all`}>
                <div className="absolute top-2 right-2 z-20"><div className="bg-slate-100/90 dark:bg-slate-950/80 backdrop-blur border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg text-xs font-black shadow-sm uppercase tracking-widest">{cn}</div></div>
                <div className="absolute top-2 left-2 z-20"><div className={`px-2.5 py-1 rounded-lg text-xs font-black shadow-sm flex items-center gap-1 ${isLate?'bg-red-600 text-white animate-pulse':'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}><Clock className="w-3.5 h-3.5"/> {min}m</div></div>
                <div className="flex-1 flex flex-col justify-center gap-1.5 p-3 pt-12 z-10">
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-700/50 rounded-xl p-2.5 flex justify-between items-center border-l-4 border-l-blue-500">
                    <div className="text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold truncate w-[45%]">{m.p1Name}</div><div className="text-blue-500 dark:text-blue-400 font-black text-[10px]">&</div><div className="text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold truncate w-[45%] text-right">{m.p2Name}</div>
                  </div>
                  <div className="flex justify-center -my-3 z-20"><span className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-400 px-2 py-1 rounded-full font-black text-[9px] shadow-sm flex items-center gap-1"><Swords className="w-3.5 h-3.5"/></span></div>
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-700/50 rounded-xl p-2.5 flex justify-between items-center border-l-4 border-l-red-500">
                    <div className="text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold truncate w-[45%]">{m.p3Name}</div><div className="text-red-500 dark:text-red-400 font-black text-[10px]">&</div><div className="text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold truncate w-[45%] text-right">{m.p4Name}</div>
                  </div>
                </div>
                {admin && <button onClick={() => finish(m.court)} className="mx-3 mb-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-black transition active:scale-95 shadow-md flex items-center justify-center gap-2"><Check className="w-4 h-4"/> Finish Match</button>}
              </div>
            )
          } else if (prepMatch) {
            return (
              <div key={cn} className="bg-emerald-50 dark:bg-slate-900 border border-dashed border-emerald-400 dark:border-emerald-500/50 rounded-2xl flex flex-col min-h-[140px] sm:min-h-[180px] relative overflow-hidden shadow-xl transition-all">
                <div className="absolute top-2 right-2 z-20"><div className="bg-white/90 dark:bg-slate-950/80 backdrop-blur border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg text-xs font-black shadow-sm uppercase tracking-widest">{cn}</div></div>
                <div className="absolute top-2 left-2 z-20"><div className={`px-2.5 py-1 rounded-lg text-[10px] font-black shadow-sm uppercase tracking-widest ${prepMatch.isManual ? 'bg-blue-200 text-blue-800 dark:bg-blue-400 dark:text-blue-900' : 'bg-emerald-200 text-emerald-800 dark:bg-emerald-400 dark:text-emerald-900 animate-pulse'}`}>{prepMatch.isManual ? 'MANUAL' : 'UP NEXT'}</div></div>
                <div className="flex-1 flex flex-col justify-center gap-1.5 p-3 pt-12 z-10">
                  <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-2.5 flex justify-between items-center border-l-4 border-l-slate-400 dark:border-l-slate-500 shadow-sm"><div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold truncate w-[45%]">{prepMatch.teams[0][0].name}</div><div className="text-slate-400 dark:text-slate-500 font-black text-[10px]">&</div><div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold truncate w-[45%] text-right">{prepMatch.teams[0][1].name}</div></div>
                  <div className="flex justify-center -my-3 z-20"><span className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-400 px-2 py-1 rounded-full font-black text-[9px] shadow-sm flex items-center gap-1"><Swords className="w-3.5 h-3.5"/></span></div>
                  <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-2.5 flex justify-between items-center border-l-4 border-l-slate-400 dark:border-l-slate-500 shadow-sm"><div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold truncate w-[45%]">{prepMatch.teams[1][0].name}</div><div className="text-slate-400 dark:text-slate-500 font-black text-[10px]">&</div><div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold truncate w-[45%] text-right">{prepMatch.teams[1][1].name}</div></div>
                </div>
                {admin && <div className="flex gap-2 mx-3 mb-3 z-20 mt-4"><button onClick={()=>confirmSpecificMatch(prepMatch, cn)} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg shadow-sm active:scale-95 transition flex items-center justify-center gap-1.5"><CheckCircle2 className="w-4 h-4"/> Confirm</button><button onClick={() => rejectPreviewMatch(prepMatch)} className="px-3 py-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-200 rounded-lg text-xs font-black transition active:scale-95 shadow-md">✕</button></div>}
              </div>
            )
          } else {
            return <div key={cn} className="bg-slate-100 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-4 relative overflow-hidden min-h-[140px] sm:min-h-[180px]"><div className="z-10 bg-white/80 dark:bg-slate-800/80 px-4 py-2 rounded-xl backdrop-blur-sm shadow-sm border border-slate-200 dark:border-slate-700"><h3 className="text-sm sm:text-base font-black text-slate-500 dark:text-slate-400 tracking-widest">{cn}</h3></div></div>
          }
        })}
      </div>
    </div>
  )
}
