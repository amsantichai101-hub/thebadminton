import { User, CheckCircle2, Play, Clock, Swords, Check, Eye } from 'lucide-react'
import React from "react";

type PreCourtPreviewProps = {
  globalPreview: boolean;
  state: any;
  allPreviews: any[];                 // (คงไว้ได้)
  activeWaiting: any[];               // ✅ เพิ่ม
  pausedIds?: string[];               // ✅ เพิ่ม (optional)
  myProfile: { id: string; name: string } | null;
  myWaitIndex: number;
  estWaitMins: number;
  getSkillColor: (skill: number | undefined) => string;
};

function buildQueueSimPreviews(queue: any[], slotCount: number) {
  const previews: any[] = [];
  for (let i = 0; i < slotCount; i++) {
    const group = queue.slice(i * 4, i * 4 + 4);
    if (group.length < 4) {
      previews.push(null); // slot นี้ยังไม่พอ 4 คน
      continue;
    }
    previews.push({
      isManual: false,
      matchNumber: i + 1,
      // FIFO teams: 2 คนแรก vs 2 คนหลัง
      teams: [
        [group[0], group[1]],
        [group[2], group[3]],
      ],
      diff: undefined,
    });
  }
  return previews;
}

export function PreCourtPreview({
  globalPreview,
  state,
  allPreviews,
  activeWaiting,
  pausedIds = [],
  myProfile,
  myWaitIndex,
  estWaitMins,
  getSkillColor,
}: PreCourtPreviewProps) {
  if (!globalPreview) return null;

  const courtNames: string[] = state?.courtNames?.length ? state.courtNames : ["Court 1"];
  const slotCount = courtNames.length; // ✅ A: เท่าจำนวนคอร์ททั้งหมด

  // ✅ คิวที่ใช้จำลอง = คนที่รอจริง (ตัดพัก/paused)
  const queueForPreview = (activeWaiting || []).filter(p => !pausedIds.includes(p.id));

  // ✅ สร้าง Previews จากคิว FIFO เสมอ (ไม่พึ่ง matchmaking / ไม่พึ่งคอร์ทว่าง)
  const queueSimPreviews = buildQueueSimPreviews(queueForPreview, slotCount);

  // ✅ ถ้าคุณอยากให้ “manualPreviews มาก่อน” สามารถ merge ได้ในอนาคต
  // ตอนนี้เน้น "จำลองจากคิวทั้งหมด" ตาม requirement

  const myQueueNo = myWaitIndex >= 0 ? myWaitIndex + 1 : 0;

  const isMeInAnyPreview = queueSimPreviews
    .filter(Boolean)
    .some((m: any) =>
      (m?.teams || [])
        .flat()
        .some((p: any) => p?.id && myProfile?.id && p.id === myProfile.id)
    );

  return (
    <section className="mt-4">
      <div className="flex items-end justify-between gap-3 mb-2">
        <div className="flex flex-col">
          <div className="text-[10px] font-black tracking-widest uppercase text-slate-500 dark:text-slate-400">
            PREVIEW MODE
          </div>
          <div className="text-sm font-black text-slate-800 dark:text-white">
            🟦 คอร์ทคิวสำรอง 
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">
            Queue used: <b>{queueForPreview.length}</b> คน • Slots: <b>{slotCount}</b>
            {allPreviews?.length === 0 ? (
              <span className="ml-2 text-amber-600 dark:text-amber-400 font-black">
                (Matchmaking preview ว่าง → ใช้ FIFO แทน)
              </span>
            ) : null}
          </div>
        </div>

        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
          Slots: <span className="text-slate-800 dark:text-slate-200 font-black">{slotCount}</span>
        </div>
      </div>

      {/* YOUR POSITION */}
      <div className="mb-3">
        {myProfile && myQueueNo > 0 ? (
          <div className="flex items-center justify-between gap-3 bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-sm">
            <div className="min-w-0">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">
                Your Position
              </div>
              <div className="font-black text-slate-800 dark:text-white truncate">
                {myProfile.name}{" "}
                <span className="text-slate-500 dark:text-slate-400 font-bold">
                  (#{myQueueNo})
                </span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                ประมาณอีก <b>{estWaitMins}</b> นาที
                {!isMeInAnyPreview && (
                  <span className="ml-2 text-amber-600 dark:text-amber-400 font-black">
                    • ยังไม่อยู่ในสล็อตคิวสำรองด้านล่าง
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0">
              <span className="px-3 py-2 rounded-xl bg-amber-400 text-black text-[11px] font-black shadow">
                YOU
              </span>
            </div>
          </div>
        ) : (
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3">
            ℹ️ เพื่อให้ระบบไฮไลท์ YOU กรุณา Check-in ก่อน
          </div>
        )}
      </div>

      {/* PRE COURTS */}
      <div className="grid gap-3">
        {courtNames.map((court, idx) => {
          const m = queueSimPreviews[idx];

          return (
            <div
              key={`${court}-${idx}`}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="font-black text-slate-800 dark:text-white">
                  🧩 Pre Court #{idx + 1}
                
                </div>
                <div className="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400">
                  NEXT
                </div>
              </div>

              {!m ? (
                <div className="px-4 py-5 text-center text-[11px] text-slate-500 dark:text-slate-400">
                  คิวไม่พอสำหรับสล็อตนี้ (ต้องมี 4 คนต่อ 1 Pre Court)
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {m.teams?.[0]?.map((p: any) => (
                      <PlayerChip
                        key={p.id}
                        p={p}
                        isMe={!!myProfile?.id && p.id === myProfile.id}
                        getSkillColor={getSkillColor}
                      />
                    ))}
                  </div>

                  <div className="text-center text-[10px] font-black text-slate-400">VS</div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {m.teams?.[1]?.map((p: any) => (
                      <PlayerChip
                        key={p.id}
                        p={p}
                        isMe={!!myProfile?.id && p.id === myProfile.id}
                        getSkillColor={getSkillColor}
                      />
                    ))}
                  </div>

                  <div className="pt-2 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Strategy: <b>FIFO Queue</b></span>
                    <span>Queue range: <b>{idx * 4 + 1}-{idx * 4 + 4}</b></span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

const PlayerChip = ({
  p,
  isMe,
  getSkillColor,
}: {
  p: any;
  isMe: boolean;
  getSkillColor: (skill: number | undefined) => string;
}) => {
  return (
    <div
      className={[
        "flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border shadow-sm",
        getSkillColor(p?.skill),
        isMe ? "ring-2 ring-amber-300 border-amber-300" : "border-white/30",
      ].join(" ")}
      title={isMe ? "YOU" : ""}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-black text-[12px] truncate">{p?.name}</span>
          {isMe && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-black shadow">
              YOU
            </span>
          )}
        </div>
        <div className="text-[10px] opacity-80 font-mono truncate">{p?.id}</div>
      </div>
      <div className="shrink-0 text-[10px] font-black px-2 py-1 rounded-lg bg-black/15">
        Lv {p?.skill ?? "-"}
      </div>
    </div>
  );
};

const MiniPlayer = ({
  p,
  isMe,
  getSkillColor,
}: {
  p: any;
  isMe: boolean;
  getSkillColor: (skill: number | undefined) => string;
}) => (
  <div
    className={[
      "flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl border shadow-sm",
      getSkillColor(p?.skill),
      isMe ? "ring-2 ring-amber-300 border-amber-300" : "border-white/25",
    ].join(" ")}
  >
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="font-black text-[11px] truncate">{p?.name}</span>
        {isMe && (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-400 text-black">
            YOU
          </span>
        )}
      </div>
    </div>
    <div className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-lg bg-black/15">
      Lv {p?.skill ?? "-"}
    </div>
  </div>
);

export function PreviewQueueStrip({
  globalPreview,
  previewQueue,
  myProfile,
  getSkillColor,
}: {
  globalPreview: boolean;
  previewQueue: any[];
  myProfile: { id: string; name: string } | null;
  getSkillColor: (skill: number | undefined) => string;
}) {
  if (!globalPreview) return null;

  const list = (previewQueue || []).slice(0, 20); // โชว์ 20 รายการแรกพอ (ปรับได้)

  return (
    <section className="mt-4">
      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="text-[10px] font-black tracking-widest uppercase text-slate-500 dark:text-slate-400">
            PREVIEW MODE
          </div>
          <div className="text-sm font-black text-slate-800 dark:text-white">
            🧩 คิวถัดไปที่จะลงสนาม (FIFO)
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
            Manual ก่อน → Auto ต่อท้าย • แสดง {list.length} รายการ
          </div>
        </div>

        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
          Total: <span className="font-black text-slate-800 dark:text-slate-200">{previewQueue?.length ?? 0}</span>
        </div>
      </div>

      {/* Horizontal scroll */}
      <div className="overflow-x-auto">
        <div className="flex gap-3 pb-2 pr-2 snap-x snap-mandatory">
          {list.length === 0 ? (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3">
              ยังไม่มีคู่ในคิวจำลอง (คิวไม่พอ/โหมด manual ล้วน)
            </div>
          ) : null}

          {list.map((m: any, idx: number) => {
            const isManual = !!m?.isManual;
            const t1 = m?.teams?.[0] || [];
            const t2 = m?.teams?.[1] || [];

            const meId = myProfile?.id;
            const hasMe =
              !!meId &&
              [...t1, ...t2].some((p: any) => p?.id === meId);

            return (
              <div
                key={`${m.matchNumber ?? idx}-${idx}`}
                className={[
                  "min-w-[260px] max-w-[260px] snap-start",
                  "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden",
                  hasMe ? "ring-2 ring-amber-300" : ""
                ].join(" ")}
              >
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="font-black text-[12px] text-slate-800 dark:text-white">
                    Next #{idx + 1}
                  </div>
                  <div className={`text-[9px] font-black px-2 py-1 rounded-full ${isManual ? "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400" : "bg-blue-600/10 text-blue-600 dark:text-blue-400"}`}>
                    {isManual ? "MANUAL" : "AUTO"}
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  <div className="grid grid-cols-1 gap-1.5">
                    {t1.map((p: any) => (
                      <MiniPlayer key={p.id} p={p} isMe={!!meId && p.id === meId} getSkillColor={getSkillColor} />
                    ))}
                  </div>

                  <div className="text-center text-[10px] font-black text-slate-400">VS</div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {t2.map((p: any) => (
                      <MiniPlayer key={p.id} p={p} isMe={!!meId && p.id === meId} getSkillColor={getSkillColor} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
        * เมื่อคอร์ทว่างและเปิด Auto ระบบจะหยิบ <b>Next #1</b> ลงคอร์ททันที แล้วคิวจะเลื่อนอัตโนมัติ
      </div>
    </section>
  );
}


export default function HomeTab(props: any) {
  const {
    activeTab, myProfile, openCheckIn, amIPlaying, getSkillColor, getMySkillLevel, getSkillName,
    myPending, myWaitIndex, estWaitMins, state, loadingCourts, allPreviews, availableCourts,globalPreview,activeWaiting,
    avgMatchDuration, admin, finish, confirmSpecificMatch, setManualPreviews, executeAutoMatch, fetchProfileHistory,previewQueue
  } = props;

  return (
        <div className={activeTab === 'home' ? 'block animate-in fade-in slide-in-from-bottom-4 duration-300 pt-4' : 'hidden'}>
          
          {!myProfile ? (
            <div className="mb-6 p-6 rounded-3xl shadow-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 bg-blue-50 dark:bg-slate-700 rounded-full flex items-center justify-center text-blue-500 mb-2 shadow-inner"><User className="w-8 h-8" /></div>
              <div><h3 className="font-black text-lg text-slate-800 dark:text-white">ยินดีต้อนรับสู่ระบบคิว</h3><p className="text-xs text-slate-500 mt-1">กรุณา Check In เพื่อรับคิวลงสนาม หรือกู้คืนโปรไฟล์</p><p>และยืนยันตัวต้นกับแอดมิน</p></div>
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
                      <div className="text-xl font-black leading-none text-emerald-700 dark:text-emerald-400">คิวที่ {myWaitIndex + 1}</div>
                      <div className="text-[10px] font-bold bg-emerald-200/50 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full shadow-sm">รอประมาณ {estWaitMins} นาที</div>
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

<PreviewQueueStrip
  globalPreview={globalPreview}
  previewQueue={previewQueue}
  myProfile={myProfile}
  getSkillColor={getSkillColor}
/>

        </div>
  )
}
