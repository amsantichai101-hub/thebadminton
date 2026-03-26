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
  const [isLoading, setIsLoading] = useState(true) // Skeleton Loader State
  
  const [myProfile, setMyProfile] = useState<{id: string, name: string} | null>(null)

  const refresh = async (showLoader = false) => { 
    if(showLoader) setIsLoading(true);
    try {
      const res = await fetch('/api/state', { cache: 'no-store' }); 
      const d = await res.json(); 
      setState(d) 
    } catch(e) {}
    finally { setIsLoading(false); }
  }

  useEffect(() => { 
    setAdmin(localStorage.getItem('adminAuth') === 'true'); 
    const savedTheme = localStorage.getItem('theme') as 'light'|'dark' || 'light';
    setTheme(savedTheme);
    if(savedTheme === 'dark') document.documentElement.classList.add('dark');

    const savedProfile = localStorage.getItem('myProfile');
    if(savedProfile) setMyProfile(JSON.parse(savedProfile));

    refresh(true); 
    const t = setInterval(() => refresh(false), Number(process.env.NEXT_PUBLIC_AUTO_REFRESH_MS || 5000)); 
    return () => clearInterval(t);
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme); localStorage.setItem('theme', newTheme);
    if(newTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }

  const runApi = async (url: string, body?: any) => {
    setIsLoading(true);
    const res = await fetch(url, { method: body ? 'POST' : 'GET', headers: body ? {'content-type':'application/json'} : undefined, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json(); 
    await refresh(false); 
    return data;
  }

// --- Modals ---
  const openCheckIn = () => {
    Swal.fire({
      title: '📋 Register Player',
      html: `
        <div class="flex flex-col gap-3 text-left">
          <label class="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-100 p-2 rounded cursor-pointer hover:bg-slate-200 transition shadow-sm">
            <input type="checkbox" id="swGuest" class="w-4 h-4"> <span>Guest (Auto ID)</span>
          </label>
          <div>
              <label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Search Player (History)</label>
              <div class="flex gap-2">
                  <input id="swSearch" class="w-full p-2 border border-slate-300 rounded shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Search by Name or ID" value="${myProfile?.id && !myProfile.id.startsWith('G') ? myProfile.id : myProfile?.name || ''}">
                  <button id="swSearchBtn" type="button" class="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded shadow-md text-xs font-bold transition">🔍 Find</button>
              </div>
              <div id="swFoundText" class="text-[10px] text-green-600 font-bold mt-1.5 hidden">✓ Player Found</div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <div>
                  <label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Employee ID (8 Digits)</label>
                  <input id="swID" class="w-full p-2 border border-slate-300 rounded shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 00055555" value="${myProfile?.id && !myProfile.id.startsWith('G') ? myProfile.id : ''}">
              </div>
              <div>
                  <label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Display Name</label>
                  <input id="swName" class="w-full p-2 border border-slate-300 rounded shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Name" value="${myProfile?.name || ''}">
              </div>
          </div>
          <div>
              <label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Skill Level</label>
              <select id="swSkill" class="w-full p-2 border border-slate-300 rounded shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="1">Level 1 (Beginner)</option>
                <option value="2" selected>Level 2 (Amateur)</option>
                <option value="3">Level 3 (Intermediate)</option>
                <option value="4">Level 4 (Pro)</option>
              </select>
          </div>
        </div>
      `,
      didOpen: () => {
        const swSearch = document.getElementById('swSearch') as HTMLInputElement;
        const swID = document.getElementById('swID') as HTMLInputElement;
        const swName = document.getElementById('swName') as HTMLInputElement;
        const swSkill = document.getElementById('swSkill') as HTMLSelectElement;
        const swGuest = document.getElementById('swGuest') as HTMLInputElement;
        const swSearchBtn = document.getElementById('swSearchBtn') as HTMLButtonElement;
        const swFoundText = document.getElementById('swFoundText') as HTMLDivElement;

        // ควบคุมช่องกรอกข้อมูลเมื่อติ๊ก Guest
        swGuest.addEventListener('change', (e) => {
           const isGuest = (e.target as HTMLInputElement).checked;
           swSearch.disabled = isGuest; 
           swSearchBtn.disabled = isGuest;
           swID.disabled = isGuest; // ปิดการพิมพ์ ID เฉพาะตอนเป็น Guest
           
           if(isGuest) { 
             swSearch.value = ''; 
             swID.value = ''; 
             swSearch.classList.add('bg-slate-100'); 
             swID.classList.add('bg-slate-100');
             swFoundText.classList.add('hidden'); 
           } else { 
             swSearch.classList.remove('bg-slate-100'); 
             swID.classList.remove('bg-slate-100');
           }
        });

        // ฟังก์ชันค้นหาข้อมูลผู้เล่น
        const searchPlayer = async () => {
           if(!swSearch.value || swGuest.checked) return;
           swSearchBtn.innerText = '⏳';
           try {
               const res = await fetch(`/api/player?q=${swSearch.value}`);
               const data = await res.json();
               swFoundText.classList.remove('hidden');
               if(data.found) {
                   swID.value = data.id; 
                   swName.value = data.name; 
                   swSkill.value = data.skill.toString();
                   swFoundText.className = 'text-[10px] text-green-600 font-bold mt-1.5';
                   swFoundText.innerText = `✓ Found: ${data.name} (Played ${data.totalVisits} times)`;
               } else {
                   // ถ้าหาไม่เจอ ให้เอาคำที่พิมพ์มาใส่ช่อง ID หรือ Name ไว้รอกรอกต่อ
                   if (/^\d+$/.test(swSearch.value)) {
                       swID.value = swSearch.value;
                       swName.value = '';
                   } else {
                       swName.value = swSearch.value;
                       swID.value = '';
                   }
                   swFoundText.className = 'text-[10px] text-amber-500 font-bold mt-1.5';
                   swFoundText.innerText = `⚠ Not found. Please enter details to register.`;
               }
           } catch(e) {}
           swSearchBtn.innerText = '🔍 Find';
        };

        swSearchBtn.addEventListener('click', searchPlayer);
      },
      showCancelButton: true, confirmButtonText: 'Check In', confirmButtonColor: '#2563eb',
      preConfirm: () => {
        const isGuest = (document.getElementById('swGuest') as HTMLInputElement).checked;
        const idVal = (document.getElementById('swID') as HTMLInputElement).value;
        const nameVal = (document.getElementById('swName') as HTMLInputElement).value;
        
        // ตรวจสอบความถูกต้องก่อนส่ง
        if(!isGuest && !idVal) { Swal.showValidationMessage('Please enter 8-Digit Employee ID'); return false; }
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
          Swal.fire({ icon: 'success', title: 'Success!', text: 'Please wait for Admin approval.', confirmButtonColor: '#22c55e' });
        } else { 
          // แสดง Error เป็นภาษาอังกฤษจาก Backend หรือที่ตอบกลับมา
          Swal.fire('Error', res.message, 'error'); 
        }
      }
    });
  }

  const openSignOut = () => {
    Swal.fire({
      title: '👋 Sign Out',
      html: `
        <div class="text-left text-sm mb-2 text-slate-500">Search your name or ID to sign out:</div>
        <input id="soSearch" class="w-full p-2 border border-slate-300 rounded shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Name or ID" value="${myProfile?.name || myProfile?.id || ''}">
      `,
      showCancelButton: true, confirmButtonText: 'Sign Out', confirmButtonColor: '#ef4444',
      preConfirm: async () => {
        const val = (document.getElementById('soSearch') as HTMLInputElement).value;
        if(!val) return Swal.showValidationMessage('Please enter Name or ID');
        // We will pass the search value to checkout, the API will try to match and remove
        return { id: val } 
      }
    }).then(async (r) => {
      if(r.isConfirmed) {
        const res = await runApi('/api/checkout', r.value);
        if(res.status === 'success') Swal.fire({ icon: 'success', title: 'Signed Out', timer: 1500, showConfirmButton: false });
        else Swal.fire('Error', 'Player not found in queue', 'error');
      }
    })
  }

  const openAdminEdit = (p: any) => {
    Swal.fire({
      title: '✏️ Edit Player',
      html: `
        <div class="flex flex-col gap-3 text-left">
          <input type="hidden" id="editOldId" value="${p.id}">
          <div><label class="text-[10px] font-bold text-slate-500">ID</label><input id="editId" value="${p.id}" class="w-full p-2 border rounded text-sm"></div>
          <div><label class="text-[10px] font-bold text-slate-500">Name</label><input id="editName" value="${p.name}" class="w-full p-2 border rounded text-sm"></div>
          <div><label class="text-[10px] font-bold text-slate-500">Skill</label><select id="editSkill" class="w-full p-2 border rounded text-sm"><option value="1" ${p.skill===1?'selected':''}>1</option><option value="2" ${p.skill===2?'selected':''}>2</option><option value="3" ${p.skill===3?'selected':''}>3</option><option value="4" ${p.skill===4?'selected':''}>4</option></select></div>
        </div>
      `,
      showCancelButton: true, confirmButtonText: 'Save Changes',
      preConfirm: () => ({ oldId: p.id, newId: (document.getElementById('editId') as HTMLInputElement).value, name: (document.getElementById('editName') as HTMLInputElement).value, skill: Number((document.getElementById('editSkill') as HTMLSelectElement).value) })
    }).then(async r => { if(r.isConfirmed) { await runApi('/api/update-player', r.value); Swal.fire('Saved', '', 'success'); } })
  }

  const showReport = () => {
    let selectedDate = new Date().toISOString().split('T')[0];
    Swal.fire({
      title: '📊 Daily Report',
      html: `
        <div class="mb-4 text-left">
           <label class="text-xs font-bold text-slate-500 block mb-1">Select Date:</label>
           <input type="date" id="reportDate" value="${selectedDate}" class="w-full p-2 border rounded shadow-sm text-sm">
        </div>
        <div id="reportContent" class="text-center py-4 text-slate-400">Loading...</div>
      `,
      showConfirmButton: false, showCloseButton: true,
      didOpen: async () => {
        const fetchReport = async (date: string) => {
          document.getElementById('reportContent')!.innerHTML = '⏳ Fetching data...';
          const res = await fetch(`/api/report?date=${date}`); const data = await res.json();
          const blob = new Blob(['\uFEFF' + data.csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          
          let tableHtml = `<div class="max-h-48 overflow-y-auto text-xs mt-4 border rounded shadow-inner"><table class="w-full text-left"><thead class="bg-slate-100 sticky top-0"><tr><th class="p-2">Time</th><th class="p-2">Name</th><th class="p-2">Action</th></tr></thead><tbody>`;
          data.tableData.forEach((row: any) => { tableHtml += `<tr class="border-t"><td class="p-2">${row.time}</td><td class="p-2 font-bold">${row.name}</td><td class="p-2 text-blue-600">${row.action}</td></tr>`; });
          tableHtml += `</tbody></table></div>`;

          document.getElementById('reportContent')!.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-blue-50 p-3 rounded-xl border border-blue-100 shadow-sm"><div class="text-2xl font-black text-blue-600">${data.totalMatches}</div><div class="text-[10px] font-bold text-slate-500 uppercase">Matches</div></div>
                <div class="bg-green-50 p-3 rounded-xl border border-green-100 shadow-sm"><div class="text-2xl font-black text-green-600">${data.totalPlayers}</div><div class="text-[10px] font-bold text-slate-500 uppercase">Players</div></div>
            </div>
            ${tableHtml}
            <a href="${url}" download="badminton_report_${date}.csv" class="w-full mt-4 block text-center bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-bold shadow-md transition">📥 Download CSV</a>
          `;
        };
        const dateInput = document.getElementById('reportDate') as HTMLInputElement;
        dateInput.addEventListener('change', (e) => fetchReport((e.target as HTMLInputElement).value));
        await fetchReport(selectedDate);
      }
    });
  }

  const resetDay = () => {
    Swal.fire({ title: 'Reset Entire Day?', text: "This will clear all active courts and queues. Operations should be done daily.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Yes, Reset!' })
    .then(async r => { if(r.isConfirmed) { await runApi('/api/reset-day', {}); Swal.fire('Reset Complete', 'System ready for a new day.', 'success'); } })
  }

  const auth = async () => {
    const pin = prompt('Enter Admin PIN:'); if(!pin) return;
    const res = await fetch('/api/config', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ action:'auth', pin })});
    const d = await res.json();
    if(d.ok) { localStorage.setItem('adminAuth','true'); setAdmin(true); Swal.fire({icon:'success', title:'Welcome Admin', toast:true, position:'top-end', timer:1500, showConfirmButton:false}); } 
    else Swal.fire('Incorrect PIN');
  }

  const logout = () => { localStorage.removeItem('adminAuth'); setAdmin(false); }
  const finish = (court: string) => { Swal.fire({title: `Finish Match at ${court}?`, text: state?.autoMatch ? "Next match will auto-start." : "", showCancelButton: true}).then(async r => { if(r.isConfirmed) { await runApi('/api/finish', { court }); Swal.fire({icon: 'success', title: 'Finished', timer: 1000, showConfirmButton: false}); } }) }

  const SkillDot = ({ skill }: { skill: number }) => {
    const colors = ['bg-gray-400', 'bg-green-500', 'bg-blue-500', 'bg-red-500'];
    return <span className={`inline-block w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${colors[skill-1] || 'bg-gray-400'}`}></span>
  }
  const myWaitIndex = state?.waiting.findIndex(p => p.id === myProfile?.id);
  const myPending = state?.pending.find(p => p.id === myProfile?.id);
  const amIPlaying = state?.playing.some(c => c.p1Id === myProfile?.id || c.p2Id === myProfile?.id || c.p3Id === myProfile?.id || c.p4Id === myProfile?.id);
  if (isLoading && !state) return (
    <div className="min-h-screen flex flex-col items-center justify-center dark:bg-slate-950 gap-4">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <div className="text-slate-500 font-bold animate-pulse">Loading Badminton Club...</div>
    </div>
  )
// --- Focus Mode (Fullscreen) ---
  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[100] overflow-y-auto p-4 flex flex-col">
        <div className="flex justify-between items-center mb-6 pt-2 pb-4 border-b border-slate-800">
            <h1 className="text-2xl font-black text-white tracking-widest">FOCUS MODE</h1>
            <button onClick={()=>setFullscreen(false)} className="bg-slate-800 border border-slate-700 text-slate-400 px-5 py-2 rounded-lg font-bold hover:bg-slate-700 hover:text-white transition shadow-lg">EXIT</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-1">
          {state?.courtNames.map(cn => {
            const m = state.playing.find(p => p.court === cn);
            if(!m) return (
              <div key={cn} className="bg-slate-900 border-2 border-dashed border-slate-800 rounded-3xl flex items-center justify-center p-8 relative overflow-hidden min-h-[300px]">
                <span className="absolute inset-0 flex items-center justify-center text-[10rem] font-black text-white/5 pointer-events-none">{cn.replace(/court/i,'')}</span>
                <div className="z-10 bg-slate-800/80 px-8 py-4 rounded-2xl backdrop-blur-sm"><h3 className="text-4xl font-black text-slate-400">{cn}</h3></div>
              </div>
            )
            const min = Math.floor((Date.now()-new Date(m.startTime).getTime())/60000);
            const isLate = min >= 12;
            return (
              <div key={cn} className={`bg-slate-900 border ${isLate ? 'border-red-500 animate-pulse ring-4 ring-red-500/50' : 'border-slate-800'} rounded-3xl flex flex-col min-h-[300px] relative overflow-hidden shadow-2xl`}>
                <span className="absolute inset-0 flex items-center justify-end pr-8 text-[12rem] font-black text-white/5 pointer-events-none">{cn.replace(/court/i,'')}</span>
                <div className="absolute top-4 left-4 z-20"><div className={`text-white px-4 py-2 rounded-xl text-xl font-black shadow-lg ${isLate?'bg-red-600':'bg-slate-800'}`}>⏱ {min}m</div></div>
                <div className="flex-1 flex flex-col justify-end gap-6 p-6 pb-8 z-10 mt-16">
                  <div className="bg-gradient-to-r from-blue-900/40 to-blue-800/10 border border-blue-700/50 rounded-2xl p-5 flex justify-between items-center backdrop-blur shadow-xl border-l-4 border-l-blue-500">
                    <div className="text-white text-xl font-bold truncate w-[45%]">{m.p1Name} <SkillDot skill={m.p1Skill}/></div>
                    <div className="text-blue-400 font-black text-2xl">&</div>
                    <div className="text-white text-xl font-bold truncate w-[45%] text-right">{m.p2Name} <SkillDot skill={m.p2Skill}/></div>
                  </div>
                  <div className="flex justify-center -my-7 z-20"><span className="bg-slate-950 border border-slate-700 text-slate-400 px-6 py-2 rounded-full font-black tracking-widest text-sm shadow-lg">VS</span></div>
                  <div className="bg-gradient-to-r from-red-900/40 to-red-800/10 border border-red-700/50 rounded-2xl p-5 flex justify-between items-center backdrop-blur shadow-xl border-l-4 border-l-red-500">
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
    <div className={`min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans pb-10 ${isLoading ? 'opacity-80 pointer-events-none' : 'transition-opacity duration-300'}`}>
      
      {/* Scrollable Announcement */}
      {state?.announcement && (
        <div className="bg-blue-600 text-white text-xs py-2 px-4 shadow-md flex items-center relative overflow-hidden">
            <span className="mr-2 z-10 bg-blue-600 pr-2 font-bold shadow-[10px_0_10px_#2563eb]">📢 ALERT:</span>
            <div className="flex-1 overflow-hidden">
                <div className="animate-marquee font-medium tracking-wide">{state.announcement}</div>
            </div>
            {admin && <button onClick={async() => { const txt = prompt('Edit Announcement (Leave blank to remove)', state.announcement); if(txt!==null) runApi('/api/config', {action:'set', key:'Announcement', value:txt}); }} className="ml-4 z-10 bg-blue-600 pl-2 text-blue-200 hover:text-white">✏️</button>}
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-white/90 dark:bg-slate-900/90 border-b border-gray-200 dark:border-slate-800 px-4 py-3 backdrop-blur-lg sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-black text-lg shadow-lg">B</div>
                <div>
                    <h1 className="font-black text-base leading-tight dark:text-white tracking-tight">Badminton Club</h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Queue System</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={toggleTheme} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 shadow-inner flex items-center justify-center border dark:border-slate-700 hover:bg-slate-200 transition">🌓</button>
                <button onClick={()=>setFullscreen(true)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 shadow-inner flex items-center justify-center border dark:border-slate-700 hover:bg-slate-200 transition">🖥️</button>
            </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
        
        {/* Left Col */}
        <div className="lg:col-span-8 space-y-6">
          {/* Mobile-Friendly Personal Notification Banner */}
          {myProfile && (
            <div className={`p-5 rounded-2xl shadow-lg border flex items-center justify-between transition-all duration-500
              ${amIPlaying ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-700 shadow-blue-500/30' 
              : myPending ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/20 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' 
              : (myWaitIndex !== undefined && myWaitIndex !== -1 && myWaitIndex < 4) ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-slate-900 border-green-500 animate-pulse shadow-green-500/40' 
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'}`}>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Your Status: {myProfile.name}</div>
                {amIPlaying ? ( <div className="text-xl font-black flex items-center gap-2">🏸 Currently Playing!</div>
                ) : myPending ? ( <div className="font-bold text-sm">Waiting for Admin Approval...</div>
                ) : myWaitIndex !== -1 && myWaitIndex !== undefined ? (
                   <div className="font-bold flex items-center gap-3">
                      Queue Position: <span className="text-3xl font-black bg-white/30 px-3 py-1 rounded-xl shadow-inner">{myWaitIndex + 1}</span>
                      {myWaitIndex < 4 && <span className="text-sm bg-black/10 px-3 py-1.5 rounded-lg shadow-sm">🔥 Standby!</span>}
                   </div>
                ) : ( <div className="font-bold text-sm">Not in queue. (Click Register below)</div> )}
              </div>
            </div>
          )}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 flex gap-3 shadow-lg border border-slate-100 dark:border-slate-700">
              <button onClick={openCheckIn} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition transform active:scale-95">
                + Register / Check In
              </button>
              <button onClick={openSignOut} className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold py-3.5 rounded-xl text-sm shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition transform active:scale-95">
                Sign Out
              </button>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4 px-1">
                <h2 className="font-black text-xl text-slate-800 dark:text-white">Active Courts</h2>
                <span className="text-xs font-bold bg-slate-200 dark:bg-slate-700 shadow-inner text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full">{state?.playing.length || 0}/{state?.courtCount || 0}</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Skeleton State for Courts */}
              {isLoading && !state?.playing && [1,2].map(i => <div key={i} className="h-[180px] bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse shadow-md"></div>)}
              
              {state?.courtNames.map(cn => {
                const m = state.playing.find(p=>p.court === cn);
                if(!m) return (
                  <div key={cn} className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 p-4 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
                    <span className="absolute inset-0 flex items-center justify-center text-[7rem] font-black text-slate-200 dark:text-slate-700/20 pointer-events-none">{cn.replace(/court/i,'')}</span>
                    <div className="z-10 text-center"><h3 className="font-black text-base text-slate-400">{cn}</h3><div className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase mt-2 shadow-sm">Available</div></div>
                  </div>
                )
                const min = Math.floor((Date.now()-new Date(m.startTime).getTime())/60000);
                const isLate = min >= 12;
                return (
                  <div key={cn} className={`bg-white dark:bg-slate-800 rounded-2xl border ${isLate ? 'border-red-400 ring-2 ring-red-400/50' : 'border-slate-200 dark:border-slate-700'} p-4 shadow-xl relative overflow-hidden transition-all`}>
                    <span className="absolute inset-0 flex items-center justify-end pr-6 text-[6rem] font-black text-slate-100 dark:text-slate-700/20 pointer-events-none">{m.court.replace(/court/i,'')}</span>
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex justify-between items-center mb-3">
                          <span className={`text-[11px] font-black px-2 py-1 rounded-lg shadow-sm ${isLate ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-700 dark:text-slate-200'}`}>⏱ {min}m</span>
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{m.court}</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 dark:border-blue-800/50 shadow-sm">
                          <div className="font-bold text-sm truncate w-[45%] dark:text-slate-200">{m.p1Name} <SkillDot skill={m.p1Skill}/></div>
                          <div className="text-[10px] text-blue-500 font-black">&</div>
                          <div className="font-bold text-sm truncate w-[45%] text-right dark:text-slate-200">{m.p2Name} <SkillDot skill={m.p2Skill}/></div>
                        </div>
                        <div className="flex justify-center -my-2.5"><span className="bg-white dark:bg-slate-800 text-slate-400 px-2 text-[9px] font-black uppercase relative z-20 shadow-sm rounded-full border border-slate-100 dark:border-slate-700">VS</span></div>
                        <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-gradient-to-r from-red-50 to-red-100/50 border border-red-100 dark:from-red-900/20 dark:to-red-800/10 dark:border-red-800/50 shadow-sm">
                          <div className="font-bold text-sm truncate w-[45%] dark:text-slate-200">{m.p3Name} <SkillDot skill={m.p3Skill}/></div>
                          <div className="text-[10px] text-red-500 font-black">&</div>
                          <div className="font-bold text-sm truncate w-[45%] text-right dark:text-slate-200">{m.p4Name} <SkillDot skill={m.p4Skill}/></div>
                        </div>
                      </div>
                      {admin && <button onClick={()=>finish(m.court)} className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg uppercase shadow-md transition transform active:scale-95">Finish Match</button>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Col */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-5">
            {!admin ? (
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">ADMIN ACCESS</h3>
                <button onClick={auth} className="w-full bg-slate-800 text-white text-sm py-2.5 rounded-xl font-bold hover:bg-slate-700 shadow-md transition">Login as Admin</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                  <span className="font-black text-sm text-slate-700 dark:text-slate-200 uppercase tracking-wide">⚙️ Console</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg shadow-inner">
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">Auto Match</span>
                      <input type="checkbox" checked={state?.autoMatch} onChange={(e)=>runApi('/api/config', {action:'set', key:'AutoMatch', value:e.target.checked.toString()})} className="rounded text-blue-600 focus:ring-blue-500"/>
                    </label>
                    <button onClick={logout} className="text-[10px] font-bold text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-lg">Exit</button>
                  </div>
                </div>

                {state?.pending && state.pending.length > 0 && (
                  <div className="bg-gradient-to-b from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 shadow-inner">
                    <div className="text-[10px] font-black text-yellow-700 dark:text-yellow-500 mb-2 uppercase tracking-wider">Pending Approvals ({state.pending.length})</div>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {state.pending.map(p => (
                        <div key={p.id} className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm">
                          <div className="text-xs font-bold dark:text-white flex items-center gap-1.5">{p.name} <SkillDot skill={p.skill}/></div>
                          <div className="flex gap-1.5">
                            <button onClick={()=>runApi('/api/approve', { id: p.id })} className="w-7 h-7 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white shadow-md rounded-md text-sm font-bold transition">✓</button>
                            <button onClick={()=>runApi('/api/reject', { id: p.id })} className="w-7 h-7 flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-600 shadow-sm rounded-md text-sm font-bold transition">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <button onClick={()=>runApi('/api/match', { mode:'smart' })} className="col-span-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black uppercase tracking-wider py-3 rounded-xl shadow-lg transition transform active:scale-95">⚡ Auto Match Now</button>
                  <button onClick={async()=>{ if(selected.length!==4) return Swal.fire('Select exactly 4 players'); await runApi('/api/manual-match', { ids: selected }); setSelected([]); }} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-bold py-2.5 rounded-lg shadow-sm hover:bg-slate-50 transition">Match Selected</button>
                  <button onClick={async()=>{ const c = prompt('Courts (comma separated)', state?.courtNames.join(', ')); if(c) runApi('/api/config', {action:'set', key:'Courts', value: c}); }} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-bold py-2.5 rounded-lg shadow-sm hover:bg-slate-50 transition">Setup Courts</button>
                  <button onClick={showReport} className="col-span-2 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider py-2.5 rounded-lg shadow-md transition">📊 Daily Reports</button>
                  <button onClick={resetDay} className="col-span-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 text-[11px] font-black uppercase tracking-wider py-2.5 rounded-lg shadow-sm hover:bg-red-100 transition">⚠️ Reset Day</button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col h-[520px] shadow-lg overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-md">
              <h3 className="font-black text-sm dark:text-white flex items-center gap-2">⏳ Queue <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px]">{state?.waiting.length || 0}</span></h3>
              <button onClick={()=>refresh(true)} className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded hover:bg-slate-300 transition shadow-sm">Refresh</button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/20 p-3 space-y-2">
              {isLoading && !state?.waiting && [1,2,3].map(i => <div key={i} className="h-14 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>)}
              
              {state?.waiting.length === 0 ? <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-widest opacity-50">Queue Empty</div> 
              : state?.waiting.map((p, i) => {
                const isSel = selected.includes(p.id);
                const isMe = p.id === myProfile?.id;
                
                return (
                  <div key={p.id} className={`p-3 rounded-xl border-2 ${isSel ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md' : isMe ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 shadow-sm' : 'border-transparent bg-white dark:bg-slate-800 shadow-sm'} flex items-center justify-between transition-all group`}>
                    <div className="flex items-center gap-3">
                      {admin ? (
                        <input type="checkbox" checked={isSel} onChange={() => setSelected(prev => prev.includes(p.id) ? prev.filter(x=>x!==p.id) : (prev.length>=4?prev:[...prev, p.id]))} className="w-4 h-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                      ) : <span className="text-[11px] font-black text-slate-400 w-5 text-center">{i+1}.</span>}
                      <div className="cursor-pointer" onClick={() => admin ? openAdminEdit(p) : null}>
                        <div className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          {p.name}
                          {p.playCount > 0 && <span className="bg-slate-200 dark:bg-slate-700 text-[9px] px-1.5 py-0.5 rounded-md text-slate-600 dark:text-slate-300 font-mono shadow-inner">{p.playCount}P</span>}
                          {isMe && <span className="text-[9px] bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold px-1.5 py-0.5 rounded-md shadow-sm uppercase tracking-wider">You</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <SkillDot skill={p.skill} />
                          <span className="text-[9px] text-slate-400 font-mono tracking-wider opacity-70">ID: {p.id}</span>
                        </div>
                      </div>
                    </div>
                   <div className="text-right flex items-center gap-2">
                      {admin && (
                        <button onClick={()=>openAdminEdit(p)} className="w-7 h-7 flex items-center justify-center text-[12px] bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md shadow-sm transition active:scale-95" title="Edit">
                          ✏️
                        </button>
                      )}
                      {admin ? (
                        <button onClick={()=>runApi('/api/checkout', { id: p.id })} className="w-7 h-7 flex items-center justify-center text-[12px] bg-red-50 hover:bg-red-100 text-red-600 rounded-md shadow-sm transition active:scale-95" title="Remove">
                          🗑️
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono font-bold bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded shadow-inner">
                          {new Date(p.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                        </span>
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