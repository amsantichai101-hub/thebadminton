import { Bell, CheckCircle2, Search, Smartphone, BellOff } from 'lucide-react'

export default function AlertsTab(props: any) {
  const {
    activeTab, notifyHistory, setNotifyHistory, notifyPerm, requestNotify, myProfile,
    getSkillName, getMySkillLevel, myWaitIndex, amIPlaying, triggerNotification
  } = props;

  return (
        <div className={activeTab === 'notifications' ? 'block animate-in fade-in slide-in-from-bottom-4 duration-300 pt-4' : 'hidden'}>
           <div className="flex justify-between items-center mb-4"><h2 className="font-black text-lg text-slate-800 dark:text-white">การแจ้งเตือน</h2>{notifyHistory.length > 0 && <button onClick={()=>setNotifyHistory([])} className="text-xs text-slate-500 font-bold bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm hover:bg-slate-300 transition">Clear All</button>}</div>
           
           <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                 <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-inner ${notifyPerm === 'granted' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}><Bell className="w-6 h-6"/></div>
                 <div>
                    <h4 className="font-black text-sm text-slate-800 dark:text-white">การแจ้งเตือนแอป</h4>
                    <p className="text-[10px] text-slate-500 font-bold">แจ้งเตือนจะทำงานได้ครบถ้วนเมื่อ เปิดตั้งค่า และอนุญาตการแจ้งเตือน</p>
                 </div>
              </div>
              
              {notifyPerm !== 'granted' ? (
                 <button onClick={requestNotify} className="w-full sm:w-auto text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2"><Bell className="w-4 h-4"/> เปิดตั้งค่าการแจ้งเตือน</button>
              ) : (
                 <button onClick={requestNotify} className="w-full sm:w-auto text-xs font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-4 py-2.5 rounded-xl border border-emerald-100 dark:border-emerald-800/50 shadow-inner transition active:scale-95 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4"/> อัปเดตสิทธิ์บนอุปกรณ์
                 </button>
              )}
           </div>

           <button onClick={async () => {
              try {
                  const res = await fetch('/api/webpush', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                          action: 'send', 
                          userId: myProfile?.id, 
                          title: 'Test Debug', 
                          message: 'กำลังทดสอบยิงจาก Backend' 
                      })
                  });
                  const data = await res.json();
                  if (!res.ok) {
                      alert('❌ Backend Error: ' + JSON.stringify(data));
                  } else {
                      alert('✅ Backend ยิงสำเร็จ! (ถ้ามือถือยังไม่เด้ง แปลว่าใบอนุญาตในมือถือหลุดให้กดอัปเดตสิทธิ์ใหม่)');
                  }
              } catch (e: any) {
                  alert('❌ Network Error: ' + e.message);
              }
           }} className="w-full mb-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl font-bold shadow-sm active:scale-95 transition flex items-center justify-center gap-2 text-xs">
              <Search className="w-4 h-4"/> ปุ่มเช็ค Error ระบบ Push (Debug BE)
           </button>

           {/* Test Noti Button */}
           <button onClick={() => {
              let msg = `คุณ ${myProfile?.name || 'ไม่ทราบ'} ระดับมือ: ${getSkillName(getMySkillLevel())}`;
              if (myWaitIndex !== -1) msg += ` และอยู่คิวที่: ${myWaitIndex + 1}`;
              else if (amIPlaying) msg += ` และกำลังลงสนามอยู่`;
              else msg += ` และยังไม่ได้เข้าคิว`;
              
              triggerNotification('🧪 ทดสอบการแจ้งเตือน (FE)', msg, [200, 100, 200], 'home', false);
           }} className="w-full mb-5 text-xs font-bold bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-3 rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2">
             <Bell className="w-4 h-4"/> ทดสอบระบบแจ้งเตือนภายในเครื่อง
           </button>

           {notifyPerm !== 'granted' && (
             <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/50 p-4 rounded-2xl mb-5 shadow-sm">
                <h4 className="font-black text-blue-800 dark:text-blue-300 text-xs flex items-center gap-1.5 mb-1.5"><Smartphone className="w-4 h-4"/> แนะนำเพิ่มเติมเพื่อความเสถียร</h4>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-relaxed">กรุณากดเมนู <b>Share (แชร์)</b> ในเบราว์เซอร์แล้วเลือก <b>"Add to Home Screen"</b> เพื่อให้ระบบแจ้งเตือนทำงานได้ดีแม้ปิดหน้าจอ</p>
             </div>
           )}

           <div className="space-y-3 pb-10">
              {notifyHistory.length === 0 ? <div className="text-center py-10 text-slate-400 font-bold text-sm flex flex-col items-center gap-2"><BellOff className="w-10 h-10 opacity-30"/> ไม่มีประวัติการแจ้งเตือน</div> 
              : notifyHistory.map((n: any) => (
                <div key={n.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex gap-3 relative overflow-hidden">
                  <div className="w-1.5 bg-blue-500 absolute left-0 top-0 bottom-0"></div>
                  <div className="flex-1 pl-2">
                    <div className="flex justify-between items-start mb-1"><h4 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-1.5"><Bell className="w-3.5 h-3.5 text-blue-500"/> {n.title}</h4><span className="text-[10px] font-bold text-slate-400">{n.time}</span></div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{n.body}</p>
                  </div>
                </div>
              ))}
           </div>
        </div>
  )
}
