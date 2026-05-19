import { Users, UserPlus, Search, CheckCircle2, UserCheck, Play, Pause, Edit3, X, Check } from 'lucide-react'

export default function QueueTab(props: any) {
  const {
    activeTab, showNav, state, queueSubTab, setQueueSubTab, searchQueue, setSearchQueue,
    searchPending, setSearchPending, admin, selected, handleMatchSelected, selectedPending, setSelectedPending,
    handleBulkApprove, getSkillColor, myProfile, manualPreviews, autoMatches, toggleSelect,
    togglePause, openAdminEditPlayer, refresh, handleApproveProcess, handleRejectPlayer, runApi
  } = props;

  return (
        <div className={activeTab === 'queue' ? 'block animate-in fade-in slide-in-from-bottom-4 duration-300' : 'hidden'}>
          <div className={`sticky ${showNav && !state?.announcement ? 'top-[56px]' : state?.announcement && showNav ? 'top-[92px]' : state?.announcement && !showNav ? 'top-[36px]' : 'top-0'} bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-md pt-3 pb-2 z-40 transition-all duration-300 border-b border-slate-200/50 dark:border-slate-800/50`}>
             
             {/* 🌟 Tab สลับ คิวรอ / รออนุมัติ */}
             <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl mb-3 gap-1 shadow-inner max-w-sm mx-auto">
                <button onClick={()=>setQueueSubTab('waiting')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${queueSubTab==='waiting' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Users className="w-4 h-4"/> คิวรอเล่น ({(state?.waiting||[]).length})</button>
                <button onClick={()=>setQueueSubTab('pending')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all relative flex items-center justify-center gap-1.5 ${queueSubTab==='pending' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <UserPlus className="w-4 h-4"/> รออนุมัติ 
                  {(state?.pending||[]).length > 0 && <span className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full ml-1 animate-pulse shadow-sm">{(state?.pending||[]).length}</span>}
                </button>
             </div>

             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="ค้นหาชื่อ..." value={queueSubTab === 'waiting' ? searchQueue : searchPending} onChange={(e) => queueSubTab === 'waiting' ? setSearchQueue(e.target.value) : setSearchPending(e.target.value)} className="w-full pl-9 pr-3 py-3 border border-slate-300 dark:border-slate-700 rounded-xl text-sm shadow-sm outline-none bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"/>
             </div>
             
             {admin && selected.length > 0 && queueSubTab === 'waiting' && (
                <button onClick={handleMatchSelected} className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold py-3 rounded-xl shadow-md active:scale-95 transition flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
                  <Users className="w-4 h-4"/> จัดทีมลงสนาม ({selected.length}/4)
                </button>
             )}

             {admin && selectedPending.length > 0 && queueSubTab === 'pending' && (
                <button onClick={handleBulkApprove} className="w-full mt-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-bold py-3 rounded-xl shadow-md active:scale-95 transition flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
                  <CheckCircle2 className="w-4 h-4"/> อนุมัติที่เลือก ({selectedPending.length} รายการ)
                </button>
             )}
          </div>

          <div className="space-y-2 pb-10 pt-2">
            {queueSubTab === 'waiting' ? (
              (state?.waiting || []).length === 0 ? <div className="text-center py-10 text-slate-400 font-bold text-sm flex flex-col items-center gap-2"><Users className="w-10 h-10 opacity-30"/> ไม่มีคิวรอ</div> 
              : (state?.waiting || []).filter((p: any) => p.name.toLowerCase().includes(searchQueue.toLowerCase())).map((p: any, i: number) => {
                const isSel = selected.includes(p.id); const isMe = p.id === myProfile?.id; const isPaused = p.name.includes('(พัก)'); const selIndex = selected.indexOf(p.id); const teamBadge = selIndex !== -1 ? (selIndex < 2 ? <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm">Team A</span> : <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm">Team B</span>) : null;
                
                const isManualPrev = manualPreviews.flatMap((m: any) => m.teams.flat().map((ap: any) => ap.id)).includes(p.id);
                const isAutoPrev = autoMatches.flatMap((m: any) => m.teams.flat().map((ap: any) => ap.id)).includes(p.id);
                const inPreviewStatus = isManualPrev ? 'MANUAL' : isAutoPrev ? 'UP NEXT' : null;

                return (
                  <div key={p.id} onClick={() => toggleSelect(p.id)} className={`cursor-pointer p-3.5 rounded-2xl border ${isSel ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md ring-1 ring-blue-400/50' : isPaused ? 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 opacity-60' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm'} flex items-center justify-between transition-all hover:shadow-md`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shadow-md ${getSkillColor(p.skill)}`}>{p.name.charAt(0)}</div>
                      <div>
                        <div className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                          <span className={isPaused ? 'line-through' : ''}>{p.name}</span>
                          {teamBadge}
                          {p.playCount > 0 && <span className="bg-slate-200 dark:bg-slate-700 text-[9px] px-1.5 py-0.5 rounded-md text-slate-600 dark:text-slate-300 font-mono shadow-inner">{p.playCount}P</span>}
                          {isMe && <span className="text-[9px] bg-amber-400 text-white font-bold px-1.5 py-0.5 rounded shadow-sm">YOU</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono font-bold">คิวที่ {i+1} • Lv {p.skill}</span>
                          {inPreviewStatus && <span className={`text-[9px] px-1.5 py-0.5 rounded shadow-sm font-bold ${inPreviewStatus === 'MANUAL' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'}`}>{inPreviewStatus}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2" onClick={e=>e.stopPropagation()}>
                      {(isMe || admin) && <button onClick={()=>togglePause(p)} className="w-8 h-8 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center text-xs active:scale-90 transition shadow-sm border border-amber-100 dark:border-amber-800">{isPaused ? <Play className="w-4 h-4"/> : <Pause className="w-4 h-4"/>}</button>}
                      {admin && <button onClick={()=>openAdminEditPlayer(p)} className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center text-xs active:scale-90 transition shadow-sm border border-blue-100 dark:border-blue-800"><Edit3 className="w-4 h-4"/></button>}
                      {admin && <button onClick={async()=>{ await fetch('/api/checkout',{method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({id:p.id})}); refresh(false); }} className="w-8 h-8 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center text-xs active:scale-90 transition shadow-sm border border-red-100 dark:border-red-800"><X className="w-4 h-4"/></button>}
                    </div>
                  </div>
                )
              })
            ) : (
              (state?.pending || []).length === 0 ? <div className="text-center py-10 text-slate-400 font-bold text-sm flex flex-col items-center gap-2"><UserCheck className="w-10 h-10 opacity-30"/> ไม่มีรายการรออนุมัติ</div> 
              : (state?.pending || []).filter((p: any) => p.name.toLowerCase().includes(searchPending.toLowerCase())).map((p: any) => (
                  <div key={p.id} className={`p-3.5 rounded-2xl border ${selectedPending.includes(p.id) ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'} shadow-sm flex items-center justify-between transition-all animate-in slide-in-from-right-4 mb-2`}>
                    <div className="flex items-center gap-3">
                      {admin && (
                         <input type="checkbox" checked={selectedPending.includes(p.id)} onChange={(e) => {
                           if(e.target.checked) setSelectedPending((prev: any) => [...prev, p.id]);
                           else setSelectedPending((prev: any) => prev.filter((id: any) => id !== p.id));
                         }} className="w-5 h-5 rounded text-green-600" />
                      )}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shadow-md ${getSkillColor(p.skill)}`}>{p.name.charAt(0)}</div>
                      <div>
                        <div className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">{p.name} {(!p.playCount || p.playCount === 0 || String(p.id).startsWith('G')) && <span className="bg-amber-100 text-amber-600 text-[8px] px-1 rounded uppercase font-bold shadow-sm">New</span>}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 font-bold">Lv {p.skill} • ID: {p.id}</div>
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
