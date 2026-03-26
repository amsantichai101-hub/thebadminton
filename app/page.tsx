'use client'
import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import type { AppState } from '@/lib/types'

export default function Home() {
  const [state, setState] = useState<AppState | null>(null)
  const [admin, setAdmin] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [fullscreen, setFullscreen] = useState(false)
  const [theme, setTheme] = useState<'light'|'dark'>('light')
  
  // For saving user profile on this specific device
  const [myProfile, setMyProfile] = useState<{id: string, name: string} | null>(null)

  const refresh = async () => { 
    try {
      const res = await fetch('/api/state', { cache: 'no-store' }); 
      const d = await res.json(); 
      setState(d) 
    } catch(e) {}
  }

  useEffect(() => { 
    const isAdmin = typeof window !== 'undefined' && localStorage.getItem('adminAuth') === 'true'; 
    setAdmin(!!isAdmin); 
    
    // Theme setup
    const savedTheme = localStorage.getItem('theme') as 'light'|'dark' || 'light';
    setTheme(savedTheme);
    if(savedTheme === 'dark') document.documentElement.classList.add('dark');

    // Load saved profile
    const savedProfile = localStorage.getItem('myProfile');
    if(savedProfile) setMyProfile(JSON.parse(savedProfile));

    refresh(); 
    const t = setInterval(refresh, Number(process.env.NEXT_PUBLIC_AUTO_REFRESH_MS || 5000)); 
    return () => clearInterval(t);
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if(newTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }

  const runApi = async (url: string, body?: any) => {
    const res = await fetch(url, { method: body ? 'POST' : 'GET', headers: body ? {'content-type':'application/json'} : undefined, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json(); refresh(); return data;
  }

  // --- Modals (SweetAlert2) ---
  const openCheckIn = () => {
    Swal.fire({
      title: '📋 Register Player',
      html: `
        <div class="flex flex-col gap-3 text-left">
          <label class="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-100 p-2 rounded cursor-pointer hover:bg-slate-200 transition">
            <input type="checkbox" id="swGuest" class="w-4 h-4"> <span>New Player / Guest</span>
          </label>
          <div>
              <label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Member ID</label>
              <div class="flex gap-2">
                  <input id="swID" class="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="8-Digit ID" value="${myProfile?.id && !myProfile.id.startsWith('G') ? myProfile.id : ''}">
                  <button id="swSearchBtn" type="button" class="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 rounded border border-blue-200 text-xs font-bold transition">🔍 Search</button>
              </div>
              <div id="swFoundText" class="text-[10px] text-green-600 font-bold mt-1.5 hidden">✓ Player Found</div>
          </div>
          <div>
              <label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Display Name</label>
              <input id="swName" class="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Name" value="${myProfile?.name || ''}">
          </div>
          <div>
              <label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Skill Level</label>
              <select id="swSkill" class="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="1">Level 1 (Beginner)</option>
                <option value="2" selected>Level 2 (Amateur)</option>
                <option value="3">Level 3 (Intermediate)</option>
                <option value="4">Level 4 (Pro)</option>
              </select>
          </div>
        </div>
      `,
      didOpen: () => {
        const swID = document.getElementById('swID') as HTMLInputElement;
        const swName = document.getElementById('swName') as HTMLInputElement;
        const swSkill = document.getElementById('swSkill') as HTMLSelectElement;
        const swGuest = document.getElementById('swGuest') as HTMLInputElement;
        const swSearchBtn = document.getElementById('swSearchBtn') as HTMLButtonElement;
        const swFoundText = document.getElementById('swFoundText') as HTMLDivElement;

        swGuest.addEventListener('change', (e) => {
           const isGuest = (e.target as HTMLInputElement).checked;
           swID.disabled = isGuest; swSearchBtn.disabled = isGuest;
           if(isGuest) { swID.value = ''; swID.classList.add('bg-slate-100', 'cursor-not-allowed'); swFoundText.classList.add('hidden'); } 
           else { swID.classList.remove('bg-slate-100', 'cursor-not-allowed'); }
        });

        const searchPlayer = async () => {
           if(!swID.value || swGuest.checked) return;
           swSearchBtn.innerText = '⏳...';
           try {
               const res = await fetch(`/api/player?id=${swID.value}`);
               const data = await res.json();
               swFoundText.classList.remove('hidden');
               if(data.found) {
                   swName.value = data.name; swSkill.value = data.skill.toString();
                   swFoundText.className = 'text-[10px] text-green-600 font-bold mt-1.5';
                   swFoundText.innerText = `✓ History: Played ${data.totalVisits} times (Last: ${new Date(data.lastSeen).toLocaleDateString()})`;
               } else {
                   swFoundText.className = 'text-[10px] text-amber-500 font-bold mt-1.5';
                   swFoundText.innerText = `⚠ No history found. Register as new.`;
               }
           } catch(e) {}
           swSearchBtn.innerText = '🔍 Search';
        };

        swSearchBtn.addEventListener('click', searchPlayer);
        swID.addEventListener('blur', searchPlayer);
      },
      showCancelButton: true,
      confirmButtonText: 'Check In',
      confirmButtonColor: '#22c55e',
      preConfirm: () => {
        const isGuest = (document.getElementById('swGuest') as HTMLInputElement).checked;
        const idVal = (document.getElementById('swID') as HTMLInputElement).value;
        const nameVal = (document.getElementById('swName') as HTMLInputElement).value;
        if(!isGuest && !idVal) { Swal.showValidationMessage('Please enter Member ID or select Guest'); return false; }
        if(!nameVal) { Swal.showValidationMessage('Please enter Display Name'); return false; }
        return { id: isGuest ? undefined : idVal, name: nameVal, skill: Number((document.getElementById('swSkill') as HTMLSelectElement).value), isGuest }
      }
    }).then(async (r) => {
      if(r.isConfirmed) {
        const res = await runApi('/api/checkin', r.value);
        if(res.ok || res.status === 'success') {
          const newProfile = { id: r.value.id || res.generatedId || 'Guest', name: r.value.name };
          localStorage.setItem('myProfile', JSON.stringify(newProfile));
          setMyProfile(newProfile);
          Swal.fire({ icon: 'success', title: 'Registration Successful!', text: 'Please present yourself to the Admin to confirm your queue.', confirmButtonColor: '#22c55e' });
        } else { Swal.fire('Error', res.message, 'error'); }
      }
    });
  }

  const showReport = async () => {
    try {
      const res = await fetch('/api/report'); const data = await res.json();
      const blob = new Blob(['\uFEFF' + data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      Swal.fire({
          title: '📊 Daily Report',
          html: `
              <div class="grid grid-cols-2 gap-4 my-4">
                  <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                      <div class="text-3xl font-black text-blue-600">${data.totalMatches || data.matches || 0}</div>
                      <div class="text-[10px] font-bold text-slate-500 uppercase mt-1">Total Matches</div>
                  </div>
                  <div class="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm">
                      <div class="text-3xl font-black text-green-600">${data.totalPlayers || data.players || 0}</div>
                      <div class="text-[10px] font-bold text-slate-500 uppercase mt-1">Unique Players</div>
                  </div>
              </div>
              <a href="${url}" download="badminton_report_${new Date().toISOString().split('T')[0]}.csv" class="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg text-sm font-bold shadow-md transition">
                  📥 Download CSV (Pivot Ready)
              </a>
          `,
          showConfirmButton: false, showCloseButton: true
      });
    } catch(e) { Swal.fire('Error', 'Could not load report.', 'error'); }
  }

  const auth = async () => {
    const pin = prompt('Enter Admin PIN:'); if(!pin) return;
    const res = await fetch('/api/config', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ action:'auth', pin })});
    const d = await res.json();
    if(d.ok) { localStorage.setItem('adminAuth','true'); setAdmin(true); Swal.fire({icon:'success', title:'Welcome Admin', toast:true, position:'top-end', timer:1500, showConfirmButton:false}); } 
    else Swal.fire('Incorrect PIN');
  }

  const logout = () => { localStorage.removeItem('adminAuth'); setAdmin(false); }
  const finish = (court: string) => { Swal.fire({title: `Finish Match at ${court}?`, showCancelButton: true}).then(async r => { if(r.isConfirmed) { await runApi('/api/finish', { court }); Swal.fire({icon: 'success', title: 'Finished', timer: 1000, showConfirmButton: false}); } }) }

  const SkillDot = ({ skill }: { skill: number }) => {
    const colors = ['bg-gray-400', 'bg-green-500', 'bg-blue-500', 'bg-red-500'];
    return <span className={`inline-block w-2.5 h-2.5 rounded-full border border-black/10 ${colors[skill-1] || 'bg-gray-400'}`}></span>
  }

  if (!state) return <div className="min-h-screen flex items-center justify-center dark:bg-slate-900 dark:text-white">Loading...</div>

  // --- Logic for Personal Notification ---
  const myWaitIndex = state?.waiting.findIndex(p => p.id === myProfile?.id);
  const myPending = state?.pending.find(p => p.id === myProfile?.id);
  const amIPlaying = state?.playing.some(c => c.p1Id === myProfile?.id || c.p2Id === myProfile?.id || c.p3Id === myProfile?.id || c.p4Id === myProfile?.id);

  // --- Focus Mode (Fullscreen) ---
  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[100] overflow-y-auto p-4 flex flex-col">
        <div className="flex justify-between items-center mb-6 pt-2 pb-4 border-b border-slate-800">
            <h1 className="text-2xl font-black text-white">FOCUS MODE</h1>
            <button onClick={()=>setFullscreen(false)} className="bg-slate-800 border border-slate-700 text-slate-400 px-4 py-2 rounded font-bold hover:bg-slate-700 hover:text-white">EXIT</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-1">
          {state.courtNames.map(cn => {
            const m = state.playing.find(p => p.court === cn);
            if(!m) return (
              <div key={cn} className="bg-slate-900 border-2 border-dashed border-slate-800 rounded-3xl flex items-center justify-center p-8 relative overflow-hidden min-h-[300px]">
                <span className="absolute inset-0 flex items-center justify-center text-[10rem] font-black text-white/5 pointer-events-none">{cn.replace(/court/i,'')}</span>
                <div className="z-10 bg-slate-800/80 px-8 py-4 rounded-2xl backdrop-blur-sm"><h3 className="text-4xl font-bold text-slate-400">{cn}</h3></div>
              </div>
            )
            const min = Math.floor((Date.now()-new Date(m.startTime).getTime())/60000);
            const isLate = min >= 12;
            return (
              <div key={cn} className={`bg-slate-900 border ${isLate ? 'border-red-500 animate-pulse ring-4 ring-red-500/50' : 'border-slate-800'} rounded-3xl flex flex-col min-h-[300px] relative overflow-hidden`}>
                <span className="absolute inset-0 flex items-center justify-end pr-8 text-[12rem] font-black text-white/5 pointer-events-none">{cn.replace(/court/i,'')}</span>
                <div className="absolute top-4 left-4 z-20"><div className={`text-white px-4 py-2 rounded-xl text-xl font-bold ${isLate?'bg-red-600':'bg-slate-800'}`}>⏱ {min}m</div></div>
                <div className="flex-1 flex flex-col justify-end gap-6 p-6 pb-8 z-10 mt-16">
                  <div className="bg-blue-900/40 border border-blue-700/50 rounded-2xl p-5 flex justify-between items-center backdrop-blur shadow-lg border-l-4 border-l-blue-500">
                    <div className="text-white text-xl font-bold truncate w-[45%]">{m.p1Name} <SkillDot skill={m.p1Skill}/></div>
                    <div className="text-blue-400 font-black text-2xl">&</div>
                    <div className="text-white text-xl font-bold truncate w-[45%] text-right">{m.p2Name} <SkillDot skill={m.p2Skill}/></div>
                  </div>
                  <div className="flex justify-center -my-7 z-20"><span className="bg-slate-950 border border-slate-700 text-slate-400 px-6 py-2 rounded-full font-black tracking-widest text-sm">VS</span></div>
                  <div className="bg-red-900/40 border border-red-700/50 rounded-2xl p-5 flex justify-between items-center backdrop-blur shadow-lg border-l-4 border-l-red-500">
                    <div className="text-white text-xl font-bold truncate w-[45%]">{m.p3Name} <SkillDot skill={m.p3Skill}/></div>
                    <div className="text-red-400 font-black text-2xl">&</div>
                    <div className="text-white text-xl font-bold truncate w-[45%] text-right">{m.p4Name} <SkillDot skill={m.p4Skill}/></div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // --- Main Layout ---
  return (
    <div className={`min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans pb-10`}>
      {/* Announcement Bar */}
      <div className="bg-slate-900 text-white text-xs py-2 px-4 text-center font-medium shadow-md flex justify-between items-center sticky top-0 z-50">
          <span className="flex-1 truncate mx-auto">{state.announcement || 'System Ready'}</span>
          {admin && <button onClick={async() => { const txt = prompt('Edit Announcement', state.announcement); if(txt!==null) runApi('/api/config', {action:'set', key:'Announcement', value:txt}); }} className="ml-4 text-slate-400 hover:text-white p-1">✏️</button>}
      </div>

      {/* Navbar */}
      <nav className="bg-white/90 dark:bg-slate-900/90 border-b border-gray-200 dark:border-slate-800 px-4 py-3 backdrop-blur-lg sticky top-[32px] z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow">B</div>
                <div>
                    <h1 className="font-bold text-sm leading-tight dark:text-white">Badminton ERP</h1>
                    <p className="text-[10px] text-slate-500 font-medium uppercase">Queue System</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={toggleTheme} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border dark:border-slate-700">🌓</button>
                <button onClick={()=>setFullscreen(true)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border dark:border-slate-700">🖥️</button>
            </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
        
        {/* Left Col (Operations & Courts) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Mobile-Friendly Personal Notification Banner */}
          {myProfile && (
            <div className={`p-4 rounded-xl shadow-sm border flex items-center justify-between transition-all duration-500
              ${amIPlaying ? 'bg-blue-600 text-white border-blue-700 shadow-blue-500/50' 
              : myPending ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' 
              : (myWaitIndex !== undefined && myWaitIndex !== -1 && myWaitIndex < 4) ? 'bg-green-400 text-slate-900 border-green-500 animate-pulse' 
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'}`}>
              <div>
                <div className="text-[10px] font-bold uppercase opacity-80 mb-0.5">Your Status: {myProfile.name}</div>
                {amIPlaying ? ( <div className="text-lg font-black flex items-center gap-2">🏸 Currently Playing!</div>
                ) : myPending ? ( <div className="font-bold">Waiting for Admin Approval...</div>
                ) : myWaitIndex !== -1 && myWaitIndex !== undefined ? (
                   <div className="font-bold flex items-center gap-2">
                      Queue Position: <span className="text-2xl font-black bg-white/20 px-2 rounded">{myWaitIndex + 1}</span>
                      {myWaitIndex < 4 && <span className="text-sm bg-black/10 px-2 py-1 rounded">🔥 Standby!</span>}
                   </div>
                ) : ( <div className="font-bold text-sm">Not in queue. (Click Register below)</div> )}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 flex gap-3 shadow-sm border dark:border-slate-700">
              <button onClick={openCheckIn} className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 rounded-lg text-sm shadow">
                + Register
              </button>
              <button onClick={async()=>{ const id = prompt('Enter Member ID to Sign Out'); if(id) runApi('/api/checkout', { id }); }} className="flex-1 bg-white dark:bg-transparent border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                Sign Out
              </button>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3 px-1">
                <h2 className="font-bold text-lg dark:text-white">Active Courts</h2>
                <span className="text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">{state.playing.length}/{state.courtCount}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {state.courtNames.map(cn => {
                const m = state.playing.find(p=>p.court === cn);
                if(!m) return (
                  <div key={cn} className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 p-4 flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden">
                    <span className="absolute inset-0 flex items-center justify-center text-[6rem] font-black text-slate-200 dark:text-slate-700/30 pointer-events-none">{cn.replace(/court/i,'')}</span>
                    <div className="z-10 text-center"><h3 className="font-bold text-sm text-slate-500">{cn}</h3><div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Available</div></div>
                  </div>
                )
                const min = Math.floor((Date.now()-new Date(m.startTime).getTime())/60000);
                const isLate = min >= 12;
                return (
                  <div key={cn} className={`bg-white dark:bg-slate-800 rounded-xl border ${isLate ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-200 dark:border-slate-700'} p-3 shadow-sm relative overflow-hidden`}>
                    <span className="absolute inset-0 flex items-center justify-end pr-4 text-[5rem] font-black text-slate-100 dark:text-slate-700/20 pointer-events-none">{m.court.replace(/court/i,'')}</span>
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex justify-between items-center mb-2">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isLate ? 'bg-red-100 text-red-600' : 'bg-slate-100 dark:bg-slate-700 dark:text-slate-200'}`}>{min}m</span>
                          <span className="text-[10px] font-bold text-slate-400">{m.court}</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center px-2 py-1.5 rounded bg-blue-50/50 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/50">
                          <div className="font-bold text-xs truncate w-[45%] dark:text-slate-200">{m.p1Name} <SkillDot skill={m.p1Skill}/></div>
                          <div className="text-[9px] text-blue-500 font-black">&</div>
                          <div className="font-bold text-xs truncate w-[45%] text-right dark:text-slate-200">{m.p2Name} <SkillDot skill={m.p2Skill}/></div>
                        </div>
                        <div className="flex justify-center -my-1.5"><span className="bg-white dark:bg-slate-800 text-slate-400 px-1 text-[8px] font-bold uppercase relative z-20">VS</span></div>
                        <div className="flex justify-between items-center px-2 py-1.5 rounded bg-red-50/50 border border-red-100 dark:bg-red-900/20 dark:border-red-800/50">
                          <div className="font-bold text-xs truncate w-[45%] dark:text-slate-200">{m.p3Name} <SkillDot skill={m.p3Skill}/></div>
                          <div className="text-[9px] text-red-500 font-black">&</div>
                          <div className="font-bold text-xs truncate w-[45%] text-right dark:text-slate-200">{m.p4Name} <SkillDot skill={m.p4Skill}/></div>
                        </div>
                      </div>
                      {admin && <button onClick={()=>finish(m.court)} className="mt-3 w-full py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 text-[10px] font-bold rounded uppercase transition">Finish Match</button>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Col (Admin & Queue) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            {!admin ? (
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2">ADMIN ACCESS</h3>
                <button onClick={auth} className="w-full bg-slate-800 text-white text-xs py-2 rounded font-bold hover:bg-slate-700">Login Admin</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="font-bold text-xs text-slate-700 dark:text-slate-300">ADMIN CONSOLE</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <span className="text-[10px] text-slate-500">Auto</span>
                      <input type="checkbox" checked={state.autoMatch} onChange={(e)=>runApi('/api/config', {action:'set', key:'AutoMatch', value:e.target.checked.toString()})} className="rounded text-blue-500"/>
                    </label>
                    <button onClick={logout} className="text-[10px] text-red-500 hover:underline">Logout</button>
                  </div>
                </div>

                {/* Pending Area */}
                {state.pending.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2">
                    <div className="text-[10px] font-bold text-yellow-700 dark:text-yellow-500 mb-2 px-1">Pending Approvals ({state.pending.length})</div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {state.pending.map(p => (
                        <div key={p.id} className="bg-white dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600 flex justify-between items-center">
                          <div className="text-xs font-bold dark:text-white">{p.name} <SkillDot skill={p.skill}/></div>
                          <div className="flex gap-1">
                            <button onClick={()=>runApi('/api/approve', { id: p.id })} className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-700 rounded text-xs font-bold">✓</button>
                            <button onClick={()=>runApi('/api/reject', { id: p.id })} className="w-6 h-6 flex items-center justify-center bg-red-100 text-red-700 rounded text-xs font-bold">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={()=>runApi('/api/match', { mode:'smart' })} className="col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded shadow">⚡ Auto Match Now</button>
                  <button onClick={async()=>{ if(selected.length!==4) return Swal.fire('Select exactly 4 players'); await runApi('/api/manual-match', { ids: selected }); setSelected([]); }} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-[10px] py-2 rounded font-medium dark:text-slate-200">Match Selected</button>
                  <button onClick={async()=>{ const c = prompt('Configure Courts (comma separated)', state.courtNames.join(', ')); if(c) runApi('/api/config', {action:'set', key:'Courts', value: c}); }} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-[10px] py-2 rounded font-medium dark:text-slate-200">Setup Courts</button>
                  <button onClick={showReport} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-[10px] py-2 rounded font-medium dark:text-slate-200">Daily Report (CSV)</button>
                  <button onClick={async()=>{ if(confirm('Are you sure you want to reset the entire day?')) runApi('/api/reset-day'); }} className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900 text-red-500 text-[10px] py-2 rounded font-bold">Reset Day</button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col h-[500px] shadow-sm">
            <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800 rounded-t-xl">
              <h3 className="font-bold text-sm dark:text-white">⏳ Queue ({state.waiting.length})</h3>
              <button onClick={refresh} className="text-[10px] text-blue-500 hover:underline">Refresh</button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/30 p-2 space-y-1.5">
              {state.waiting.length === 0 ? <div className="text-center py-8 text-slate-400 text-xs italic">Queue Empty</div> : state.waiting.map((p, i) => {
                const isSel = selected.includes(p.id);
                // Highlight row if it's the current user's profile
                const isMe = p.id === myProfile?.id;
                
                return (
                  <div key={p.id} className={`p-2 bg-white dark:bg-slate-800 rounded border ${isSel ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : isMe ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'border-slate-200 dark:border-slate-700'} flex items-center justify-between transition`}>
                    <div className="flex items-center gap-3">
                      {admin ? (
                        <input type="checkbox" checked={isSel} onChange={() => setSelected(prev => prev.includes(p.id) ? prev.filter(x=>x!==p.id) : (prev.length>=4?prev:[...prev, p.id]))} className="cursor-pointer rounded border-slate-300 text-blue-500"/>
                      ) : <span className="text-[10px] font-mono text-slate-400 w-4 font-bold">{i+1}.</span>}
                      <div className="cursor-pointer" onClick={() => Swal.fire({title: p.name, html: `ID: ${p.id}<br>Skill Level: ${p.skill}<br>Played Today: ${p.playCount}`, showConfirmButton: false})}>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          {p.name}
                          {p.playCount > 0 && <span className="bg-slate-100 dark:bg-slate-700 text-[9px] px-1 rounded text-slate-500 dark:text-slate-300 font-mono">{p.playCount}P</span>}
                          {isMe && <span className="text-[8px] bg-amber-200 text-amber-800 px-1 rounded uppercase">You</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <SkillDot skill={p.skill} />
                          <span className="text-[9px] text-slate-400 font-mono tracking-wider">ID: {p.id}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {admin ? (
                        <button onClick={()=>runApi('/api/checkout', { id: p.id })} className="text-[9px] text-red-500 hover:underline">Remove</button>
                      ) : (
                        <span className="text-[9px] text-slate-400 font-mono">{new Date(p.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}