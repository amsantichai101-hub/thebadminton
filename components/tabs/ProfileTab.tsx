import { User, CheckCircle2, Play, Clock, LogOut, Activity, MapPin, Settings, Megaphone, Plus, Monitor, Download, PieChart, BarChart2, CalendarX, Trash2, RefreshCw } from 'lucide-react'
import Swal from 'sweetalert2'

export default function ProfileTab(props: any) {
  const {
    activeTab, myProfile, openCheckIn, getSkillColor, getMySkillLevel, getSkillName,
    realPlayCount, realPlayTime, openSignOut, myPlayHistory, admin, auth, logout,
    state, refresh, globalPreview, setGlobalPreview, playStartTime, setPlayStartTime,
    playEndTime, setPlayEndTime, savePlayTime, matchMode, setMatchMode, executeAutoMatch,
    openBroadcastModal, openAddMember, openCourtManager, setFullscreen, exportRegisteredToday,
    showAnalyticsMenu, showDailyReportMenu, resetDay, clearBrowserData, APP_VERSION, toggleGlobalPreviewState,
    requestNotify,
    notifyPerm,
    resetNotifySubscription} = props;

  return (
        <div className={activeTab === 'profile' ? 'block animate-in fade-in slide-in-from-bottom-4 duration-300 pt-4' : 'hidden'}>
           <h2 className="font-black text-lg text-slate-800 dark:text-white mb-4">โปรไฟล์ส่วนตัว</h2>
           
           {!myProfile ? (
             <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center shadow-sm mb-6 flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-2 shadow-inner"><User className="w-8 h-8"/></div>
                <h3 className="font-bold text-slate-700 dark:text-slate-200">คุณยังไม่ได้เข้าสู่ระบบคิว</h3>
                <button onClick={openCheckIn} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl active:scale-95 transition shadow-md flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5"/> Check In เพื่อเข้าคิว</button>
             </div>
           ) : (
             <>

               {/* Notifications */}
               {/* <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm mb-4">
                 <div className="flex items-start justify-between gap-3">
                   <div className="min-w-0">
                     <div className="text-[10px] font-black tracking-widest uppercase text-slate-500 dark:text-slate-400">Notifications</div>
                     <div className="font-black text-slate-800 dark:text-white">การแจ้งเตือน (Push)</div>
                     <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">สถานะสิทธิ: <b>{notifyPerm}</b></div>
                     <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">กดอัปเดตเพื่อบันทึก/อัปเดต Token บนระบบ</div>
                   </div>
                   <div className="flex flex-col gap-2 shrink-0">
                     <button
                       onClick={requestNotify}
                       className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-black shadow active:scale-95 transition"
                     >
                       อัปเดตสิทธิ/Token
                     </button>
                     <button
                       onClick={resetNotifySubscription}
                       className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-black shadow active:scale-95 transition"
                     >
                       รีเซ็ต Token
                     </button>
                   </div>
                 </div>
               </div> */}

               <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm mb-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                  <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black shadow-lg ${getSkillColor(getMySkillLevel())}`}>{myProfile.name.charAt(0)}</div>
                    <div>
                      <h3 className="font-black text-xl text-slate-800 dark:text-white">{myProfile.name}</h3>
                      <div className="text-xs font-mono text-slate-500 mt-0.5">ID: {myProfile.id}</div>
                      <div className="mt-1.5"><span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full border border-blue-200 dark:border-blue-800 shadow-sm">{getSkillName(getMySkillLevel())}</span></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl text-center shadow-sm"><div className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-center gap-1 mb-1 tracking-widest"><Play className="w-3 h-3"/> เล่นไปแล้ว</div><div className="text-2xl font-black text-blue-600 dark:text-blue-400">{realPlayCount} <span className="text-sm font-bold opacity-70">เกม</span></div></div>
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl text-center shadow-sm"><div className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-center gap-1 mb-1 tracking-widest"><Clock className="w-3 h-3"/> เวลาโดยประมาณ</div><div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">~{realPlayTime} <span className="text-sm font-bold opacity-70">นาที</span></div></div>
                  </div>
                  
                  <button onClick={openSignOut} className="w-full bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold py-3 rounded-xl transition active:scale-95 border border-red-100 dark:border-red-800/50 shadow-sm flex items-center justify-center gap-2"><LogOut className="w-4 h-4"/> Sign Out ออกจากระบบ</button>
               </div>

               <div className="mb-6">
                 <h3 className="font-black text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2"><Activity className="w-4 h-4"/> ประวัติการลงสนามวันนี้</h3>
                 <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
                   {myPlayHistory.length === 0 ? <div className="text-center text-xs text-slate-400 py-4">ยังไม่มีประวัติการลงสนามในวันนี้</div>
                   : (
                     <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                       {myPlayHistory.filter((h: any) => h.action.includes('Start') || h.action.includes('Finish')).reverse().map((h: any, i: number) => (
                         <div key={i} className="flex gap-3 text-sm items-start animate-in slide-in-from-top-1">
                           <div className="text-[10px] font-bold text-slate-400 mt-1.5 w-10 text-right">{h.time}</div>
                           <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-inner">
                             <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1"><MapPin className="w-3 h-3 text-blue-500"/> {h.court || 'Court'}</div>
                             <div className="text-[10px] text-slate-500 mt-0.5">{h.action}</div>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               </div>
             </>
           )}

           <div className="bg-slate-800 dark:bg-slate-900 text-slate-200 rounded-2xl p-5 shadow-lg mb-10 pb-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4"><h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2"><Settings className="w-5 h-5"/> Admin Console</h3>{!admin ? <button onClick={auth} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow-sm transition">Login</button> : <button onClick={logout} className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow-sm transition">Logout</button>}</div>
              {admin && (
                <div className="space-y-4">
                   <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 shadow-inner space-y-4">
                     
                     <div className="flex justify-between items-center">
                        <div className="flex flex-col"><span className="text-xs font-bold text-white">Auto Match (ปล่อยคิวอัตโนมัติ)</span><span className="text-[9px] text-slate-400">ระบบจะจับคู่ให้อัตโนมัติเมื่อคอร์ทว่างและเปิดโหมดโชว์คิวถัดไป</span></div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={state?.autoMatch||false} onChange={async(e)=>{await fetch('/api/config',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'set',key:'AutoMatch',value:e.target.checked.toString()})}); Swal.fire({ title: '✅ อัปเดตการตั้งค่าแล้ว', toast: true, position: 'top', showConfirmButton: false, timer: 1500 }); refresh(false);}} />
                          <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                        </label>
                     </div>
                     
                     <div className="flex justify-between items-center">
                        <div className="flex flex-col"><span className="text-xs font-bold text-white">Show Pre-Match (โหมดโชว์คิวถัดไป)</span><span className="text-[9px] text-slate-400">แสดงผลคิวเตรียมลงคอร์ทในหน้าแรกให้ทุกคนเห็น</span></div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={globalPreview} onChange={(e) => toggleGlobalPreviewState(e.target.checked)} />
                          <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                     </div>

                   </div>

                   <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold tracking-widest uppercase text-slate-300">Play Time:</span>
                      <div className="flex items-center gap-2">
                        <input type="time" value={playStartTime} onChange={e=>setPlayStartTime(e.target.value)} className="bg-slate-800 text-white text-xs p-1.5 rounded-lg border border-slate-600 w-24 outline-none focus:ring-1 focus:ring-blue-500"/>
                        <span className="text-slate-500">-</span>
                        <input type="time" value={playEndTime} onChange={e=>setPlayEndTime(e.target.value)} className="bg-slate-800 text-white text-xs p-1.5 rounded-lg border border-slate-600 w-24 outline-none focus:ring-1 focus:ring-blue-500"/>
                        <button onClick={savePlayTime} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg shadow-sm font-bold active:scale-95 transition">Save</button>
                      </div>
                   </div>

                   <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 shadow-inner">
                      <label className="text-xs font-bold mb-2 block tracking-widest uppercase text-slate-300">Match Mode (ระบบจัดคิว)</label>
                      <select value={matchMode} onChange={e => { setMatchMode(e.target.value as any); refresh(false); }} className="w-full p-2.5 border border-slate-600 rounded-lg text-xs bg-slate-800 text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                        <option value="smart">Smart (ในทีมห่าง≤3, ระหว่างทีมห่าง≤1)</option>
                        <option value="balanced">Balanced (สมดุล/ใกล้เคียงที่สุด)</option>
                        <option value="random">Random (สุ่ม)</option>
                        <option value="skill-gap">Skill Gap (คู่ฝีมือใกล้เคียง)</option>
                        <option value="similar-skill">Similar Skill (ฝีมือเดียวกัน/ใกล้กัน)</option>
                        <option value="manual">Manual (เฉพาะเวลาไม่ใช้ Auto Match)</option>
                      </select>
                   </div>

                   <div className="grid grid-cols-2 gap-2 mt-2">
                     <button onClick={executeAutoMatch} className="col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold py-3.5 rounded-xl active:scale-95 flex items-center justify-center gap-2 shadow-md"><Play className="w-4 h-4"/> ปล่อยคิวอัตโนมัติทันที</button>
                     
                     <button onClick={openBroadcastModal} className="col-span-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-[11px] font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md transition mt-1"><Megaphone className="w-4 h-4"/> ส่งการแจ้งเตือนกลุ่ม (Broadcast)</button>

                     <button onClick={openAddMember} className="bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition mt-1"><Plus className="w-4 h-4"/> เพิ่มสมาชิก</button>
                     <button onClick={openCourtManager} className="bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition mt-1"><Settings className="w-4 h-4"/> จัดการคอร์ท</button>
                     <button onClick={()=>setFullscreen(true)} className="col-span-2 bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition mt-1"><Monitor className="w-4 h-4"/> เข้าสู่โหมด Live Focus</button>
                     
                     <button onClick={exportRegisteredToday} className="col-span-2 bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition mt-1"><Download className="w-4 h-4"/> รายงานผู้ลงทะเบียนวันนี้</button>

                     <button onClick={showAnalyticsMenu} className="bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition mt-1"><PieChart className="w-4 h-4"/> Analytics</button>
                     <button onClick={showDailyReportMenu} className="bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition mt-1"><BarChart2 className="w-4 h-4"/> Daily Report</button>
                     <button onClick={resetDay} className="col-span-2 bg-red-900/50 text-red-400 border border-red-800 text-xs font-bold py-3 rounded-xl mt-2 active:scale-95 flex items-center justify-center gap-1.5 shadow-sm hover:bg-red-900/80 transition"><CalendarX className="w-4 h-4"/> รีเซ็ตระบบรายวัน</button>
                   </div>
                </div>
              )}
           </div>
           
           <div className="text-center pb-8 flex flex-col items-center gap-3">
             <div className="flex gap-2 w-full max-w-[200px] mx-auto">
               <button onClick={clearBrowserData} className="flex-1 bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-[10px] font-bold py-2 rounded-lg transition shadow-sm border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1.5"><Trash2 className="w-3 h-3"/> ล้างแคช</button>
               <button onClick={() => window.location.reload()} className="flex-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 text-[10px] font-bold py-2 rounded-lg transition shadow-sm border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-1.5"><RefreshCw className="w-3 h-3"/> รีเฟรชแอป</button>
             </div>
             <span className="text-[9px] text-slate-300 font-mono tracking-widest mt-2">v {APP_VERSION}</span>
           </div>
        </div>
  )
}
