import { Users, UserPlus, Search, ChevronUp, ChevronDown, Play, Pause, Edit3, X, Check, CheckCircle2 } from 'lucide-react';

export default function QueueTab(props: any) {
   const {
      state, admin, myProfile, queueSubTab, setQueueSubTab,
      searchQueue, setSearchQueue, searchPending, setSearchPending,
      selected, toggleSelect, handleMatchSelected,
      selectedPending, setSelectedPending, handleBulkApprove,
      handleApproveProcess, handleRejectPlayer, togglePause, openAdminEditPlayer,
      handleMoveQueue, getSkillColor,
      manualPreviews = [], autoMatches = [], showNav
   } = props;

   return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className={`sticky ${showNav && !state?.announcement ? 'top-[52px]' : state?.announcement && showNav ? 'top-[88px]' : state?.announcement && !showNav ? 'top-[36px]' : 'top-0'} bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-md pt-4 pb-3 z-40 transition-all duration-300 border-b border-slate-200/50 dark:border-slate-800/50 -mx-4 px-4`}>
         <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl mb-3 gap-1 shadow-inner max-w-sm mx-auto">
            <button onClick={()=>setQueueSubTab('waiting')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${queueSubTab==='waiting' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Users className="w-4 h-4"/> คิวรอเล่น ({(state?.waiting||[]).length})</button>
            <button onClick={()=>setQueueSubTab('pending')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all relative flex items-center justify-center gap-1.5 ${queueSubTab==='pending' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <UserPlus className="w-4 h-4"/> รออนุมัติ {(state?.pending||[]).length > 0 && <span className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full ml-1 animate-pulse shadow-sm">{(state?.pending||[]).length}</span>}
            </button>
         </div>

         <div className="relative max-w-3xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="ค้นหาชื่อ..." value={queueSubTab === 'waiting' ? searchQueue : searchPending} onChange={(e) => queueSubTab === 'waiting' ? setSearchQueue(e.target.value) : setSearchPending(e.target.value)} className="w-full pl-9 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm shadow-sm outline-none bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"/>
         </div>

         {admin && selected.length > 0 && queueSubTab === 'waiting' && (
            <button onClick={handleMatchSelected} className="w-full mt-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold py-3 rounded-xl shadow-md active:scale-95 transition flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
              <Users className="w-4 h-4"/> จัดทีมลงคิวแทรก ({selected.length}/4)
            </button>
         )}

         {admin && selectedPending.length > 0 && queueSubTab === 'pending' && (
            <button onClick={handleBulkApprove} className="w-full mt-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-bold py-3 rounded-xl shadow-md active:scale-95 transition flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4"/> อนุมัติที่เลือก ({selectedPending.length} รายการ)
            </button>
         )}
      </div>

      <div className="space-y-2 pb-10 pt-4">
        {queueSubTab === 'waiting' ? (
          (state?.waiting || []).length === 0 ? <div className="text-center py-10 text-slate-400 font-bold text-sm">ไม่มีคิวรอ</div> 
          : (state?.waiting || []).filter((p:any) => p.name.toLowerCase().includes(searchQueue.toLowerCase())).map((p:any, i:number) => {
            const selIndex = selected.indexOf(p.id);
            const isSel = selIndex !== -1;
            const isPaused = p.name.includes('(พัก)'); 
            const isMe = p.id === myProfile?.id;
            
            const teamBadge = isSel ? (selIndex < 2 ? <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm ml-2">Team A</span> : <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm ml-2">Team B</span>) : null;

            const isManualPrev = manualPreviews.flatMap((m:any) => m.teams.flat().map((ap: any) => ap.id)).includes(p.id);
            const isAutoPrev = autoMatches.flatMap((m:any) => m.teams.flat().map((ap: any) => ap.id)).includes(p.id);
            const inPreviewStatus = isManualPrev ? 'MANUAL' : isAutoPrev ? 'UP NEXT' : null;

            const isFirst = i === 0;
            const isLast = i === (state?.waiting || []).length - 1;

            return (
              <div key={p.id} className={`p-3.5 rounded-2xl border ${isSel ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md ring-1 ring-blue-400/50' : isPaused ? 'opacity-60 bg-slate-100 dark:bg-slate-800' : 'bg-white dark:bg-slate-800 shadow-sm'} flex items-center justify-between transition-all`}>
                <div className="flex items-center gap-3 w-full cursor-pointer" onClick={() => toggleSelect(p.id)}>
                  
                  {/* 🌟 ปุ่มเลื่อนคิวขึ้น-ลง สำหรับมือถือ */}
                  {admin && !isPaused && (
                    <div className="flex flex-col items-center mr-1 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600" onClick={e=>e.stopPropagation()}>
                       <button disabled={isFirst} onClick={() => handleMoveQueue(p.id, 'up')} className={`p-1 transition ${isFirst ? 'opacity-30' : 'hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-90'} text-slate-500 dark:text-slate-300`}><ChevronUp className="w-4 h-4"/></button>
                       <div className="w-full h-[1px] bg-slate-200 dark:bg-slate-600"></div>
                       <button disabled={isLast} onClick={() => handleMoveQueue(p.id, 'down')} className={`p-1 transition ${isLast ? 'opacity-30' : 'hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-90'} text-slate-500 dark:text-slate-300`}><ChevronDown className="w-4 h-4"/></button>
                    </div>
                  )}

                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shadow-md shrink-0 ${getSkillColor(p.skill)}`}>{p.name.charAt(0)}</div>
                  
                  <div>
                    <div className="text-sm font-black flex items-center gap-2 dark:text-white">
                       <span className={isPaused ? 'line-through text-slate-400' : ''}>{p.name}</span>
                       {teamBadge}
                       {isMe && <span className="text-[9px] bg-amber-400 text-white font-bold px-1.5 py-0.5 rounded shadow-sm ml-1">YOU</span>}
                       {p.playCount > 0 && <span className="bg-slate-200 dark:bg-slate-700 text-[9px] px-1.5 py-0.5 rounded-md text-slate-600 dark:text-slate-300 font-mono shadow-inner ml-1">{p.playCount}P</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                       <span className="text-[10px] text-slate-400 font-mono font-bold">คิวที่ {i+1} • Lv {p.skill}</span>
                       {inPreviewStatus && <span className={`text-[9px] px-1.5 py-0.5 rounded shadow-sm font-bold ${inPreviewStatus === 'MANUAL' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{inPreviewStatus}</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                   {(isMe || admin) && <button onClick={(e)=>{ e.stopPropagation(); togglePause(p); }} className="w-8 h-8 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center text-xs active:scale-90 transition shadow-sm border border-amber-100 dark:border-amber-800">{isPaused ? <Play className="w-4 h-4"/> : <Pause className="w-4 h-4"/>}</button>}
                   {admin && <button onClick={(e)=>{ e.stopPropagation(); openAdminEditPlayer(p); }} className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center text-xs active:scale-90 transition shadow-sm border border-blue-100 dark:border-blue-800"><Edit3 className="w-4 h-4"/></button>}
                   {admin && <button onClick={(e)=>{ e.stopPropagation(); handleRejectPlayer(p.id); }} className="w-8 h-8 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center text-xs active:scale-90 transition shadow-sm border border-red-100 dark:border-red-800"><X className="w-4 h-4"/></button>}
                </div>
              </div>
            )
          })
        ) : (
          (state?.pending || []).filter((p:any) => p.name.toLowerCase().includes(searchPending.toLowerCase())).map((p:any) => (
              <div key={p.id} className={`p-3.5 rounded-2xl border ${selectedPending.includes(p.id) ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'} flex items-center justify-between mb-2 shadow-sm animate-in slide-in-from-right-4`}>
                <div className="flex items-center gap-3">
                  {admin && (
                     <input type="checkbox" checked={selectedPending.includes(p.id)} onChange={(e) => {
                       if(e.target.checked) setSelectedPending((prev:any) => [...prev, p.id]);
                       else setSelectedPending((prev:any) => prev.filter((id:any) => id !== p.id));
                     }} className="w-5 h-5 rounded text-green-600" />
                  )}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shadow-md shrink-0 ${getSkillColor(p.skill)}`}>{p.name.charAt(0)}</div>
                  <div>
                    <div className="text-sm font-black dark:text-white flex items-center gap-2">{p.name} {(!p.playCount || p.playCount === 0 || String(p.id).startsWith('G')) && <span className="bg-amber-100 text-amber-600 text-[8px] px-1 rounded uppercase font-bold shadow-sm">New</span>}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {p.id}</div>
                  </div>
                </div>
                {admin && (
                  <div className="flex gap-2">
                    <button onClick={()=>handleApproveProcess(p)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md active:scale-95 transition flex items-center gap-1"><Check className="w-3.5 h-3.5"/> Approve</button>
                    <button onClick={()=>handleRejectPlayer(p.id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition shadow-sm border border-red-100"><X className="w-3.5 h-3.5"/></button>
                  </div>
                )}
              </div>
          ))
        )}
      </div>
    </div>
   )
}
