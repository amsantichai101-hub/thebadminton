'use client'

import { useEffect, useState, useRef } from 'react'
import Swal from 'sweetalert2'
import type { AppState } from '@/lib/types'
import { balanceTeams, extractBestMatch } from '@/utils/matchmaking'

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer)
    toast.addEventListener('mouseleave', Swal.resumeTimer)
  }
});

export default function Home() {
  const [state, setState] = useState<AppState | null>(null)
  const [admin, setAdmin] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [fullscreen, setFullscreen] = useState(false)
  const [theme, setTheme] = useState<'light'|'dark'>('light')
  const [isLoading, setIsLoading] = useState(true) 
  
  const [myProfile, setMyProfile] = useState<{id: string, name: string} | null>(null)
  const [searchPending, setSearchPending] = useState('')
  const [searchQueue, setSearchQueue] = useState('')
  const [selectedPending, setSelectedPending] = useState<string[]>([])
  
  const [matchMode, setMatchMode] = useState<'smart'|'balanced'|'random'|'skill-gap'|'similar-skill'|'manual'>('smart');

  const [globalPreview, setGlobalPreview] = useState(true);
  const [playStartTime, setPlayStartTime] = useState('20:00');
  const [playEndTime, setPlayEndTime] = useState('22:30');

  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      console.log('Wake lock failed', err);
    }
  };

  const refresh = async (showLoader = false) => { 
    if(showLoader) setIsLoading(true);
    try {
      const res = await fetch('/api/state', { cache: 'no-store' }); 
      const d = await res.json(); 
      setState(d)
      
      if (d.globalShowPreview !== undefined) setGlobalPreview(d.globalShowPreview);
      if (d.playStartTime) setPlayStartTime(d.playStartTime);
      if (d.playEndTime) setPlayEndTime(d.playEndTime);
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

    requestWakeLock();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    });

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

  const clearBrowserData = () => {
    Swal.fire({
      title: '🧹 Clear Browser Data',
      html: `
        <div class="text-left text-sm text-slate-600 space-y-2">
          <p><strong>This will clear:</strong></p>
          <ul class="list-disc list-inside text-xs text-slate-500 ml-2">
            <li>Your saved profile (name, ID)</li>
            <li>Admin login session</li>
            <li>Theme preference</li>
          </ul>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Clear All Data',
      confirmButtonColor: '#ef4444',
      preConfirm: () => {
        localStorage.clear();
        sessionStorage.clear();
        setMyProfile(null);
        setAdmin(false);
        setSelected([]);
        setTheme('light');
        document.documentElement.classList.remove('dark');
        Toast.fire({ icon: 'success', title: 'Data cleared! Reloading...' });
        setTimeout(() => window.location.reload(), 1500);
      }
    });
  }

  const toggleGlobalPreviewState = async (checked: boolean) => {
    setGlobalPreview(checked); 
    if (admin) {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', key: 'GlobalShowPreview', value: checked.toString() })
      });
    }
  }

  const savePlayTime = async () => {
    Toast.fire({ icon: 'info', title: 'Saving Time...' });
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set', key: 'PlayStartTime', value: playStartTime })
    });
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set', key: 'PlayEndTime', value: playEndTime })
    });
    Toast.fire({ icon: 'success', title: 'Play Time Saved' });
  }

  const runApi = async (url: string, body?: any, showLoader = true) => {
    if (showLoader) {
      Swal.fire({ title: 'Processing...', toast: true, position: 'top-end', showConfirmButton: false, didOpen: () => Swal.showLoading() });
    }
    try {
      const res = await fetch(url, { method: body ? 'POST' : 'GET', headers: body ? {'content-type':'application/json'} : undefined, body: body ? JSON.stringify(body) : undefined });
      const data = await res.json(); 
      await refresh(false); 
      if (showLoader) Swal.close();
      return data;
    } catch (e) {
      if (showLoader) Swal.close();
      Toast.fire({ icon: 'error', title: 'Network Error' });
      return null;
    }
  }

  const executeAutoMatch = async () => {
    if (!state?.waiting || state.waiting.length < 4) {
      Toast.fire({ icon: 'warning', title: 'Need at least 4 players in queue' });
      return;
    }

    const availableCourtsCount = state?.courtNames.filter(cn => !state.playing.find(p => p.court === cn)).length || 0;
    const matchTarget = Math.max(1, availableCourtsCount); 
    const matches = getAutoNextMatches(state.waiting, matchTarget, matchMode);

    if (matches.length === 0) {
      Toast.fire({ icon: 'warning', title: 'Cannot find suitable match right now' });
      return;
    }

    Toast.fire({ icon: 'info', title: `Starting ${matches.length} match(es)...` });

    for (const m of matches) {
      const ids = [m.teams[0][0].id, m.teams[0][1].id, m.teams[1][0].id, m.teams[1][1].id];
      await fetch('/api/manual-match', {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify({ ids })
      });
    }
    refresh(false);
    Toast.fire({ icon: 'success', title: 'Matches Started!' });
  }

  const confirmSpecificMatch = async (matchData: any) => {
    Toast.fire({ icon: 'info', title: `Confirming Match...` });
    const ids = [
      matchData.teams[0][0].id, matchData.teams[0][1].id, 
      matchData.teams[1][0].id, matchData.teams[1][1].id
    ];
    await fetch('/api/manual-match', {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({ ids })
    });
    refresh(false);
    Toast.fire({ icon: 'success', title: 'Match Started!' });
  }

  const openCheckIn = () => {
    Swal.fire({
      title: '📝 Check In',
      html: `
        <style>
          .swal2-container .swal2-popup, .swal2-container .swal2-html-container {
            overflow: visible !important; 
          }
        </style>
        <div class="flex flex-col gap-3 text-left w-full relative">
          <label class="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-100 p-2 rounded cursor-pointer hover:bg-slate-200 transition shadow-sm">
            <input type="checkbox" id="swGuest" class="w-4 h-4"> <span>Guest (ไม่มี ID พนักงาน)</span>
          </label>
          
          <div class="relative w-full">
              <label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Search Player (พนักงานที่มีข้อมูลแล้ว)</label>
              <div class="flex gap-2 relative">
                <input id="swSearch" class="w-full p-2 border border-blue-300 rounded shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400" placeholder="พิมพ์ชื่อ หรือรหัสพนักงาน..." autocomplete="off">
                <button id="swClearBtn" type="button" class="bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold px-3 rounded shadow-sm hidden transition">✕</button>
              </div>
              <div id="swTableContainer" class="w-full bg-white border border-slate-200 shadow-sm rounded-lg hidden max-h-48 overflow-y-auto mt-2"></div>
              <p id="swMasterNotice" class="text-[10px] text-green-600 font-bold hidden mt-1">✓ ล็อคข้อมูลจากฐานข้อมูลหลักแล้ว</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
              <div>
                  <label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Employee No.</label>
                  <input id="swID" class="w-full p-2 border border-slate-300 rounded shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors" placeholder="e.g. 12345" value="${myProfile?.id && !myProfile.id.startsWith('G') ? myProfile.id : ''}">
              </div>
              <div>
                  <label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Display Name</label>
                  <input id="swName" class="w-full p-2 border border-slate-300 rounded shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors" placeholder="Name" value="${myProfile?.name || ''}">
              </div>
          </div>
          <div>
              <label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Level (1-5)</label>
              <select id="swSkill" class="w-full p-2 border border-slate-300 rounded shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors">
                <option value="1">1 (Beginner)</option>
                <option value="2" selected>2 (Novice)</option>
                <option value="3">3 (Intermediate)</option>
                <option value="4">4 (Advanced)</option>
                <option value="5">5 (Professional)</option>
              </select>
          </div>
        </div>
      `,
      didOpen: () => {
        const swSearch = document.getElementById('swSearch') as HTMLInputElement;
        const swTableContainer = document.getElementById('swTableContainer') as HTMLDivElement;
        const swID = document.getElementById('swID') as HTMLInputElement;
        const swName = document.getElementById('swName') as HTMLInputElement;
        const swSkill = document.getElementById('swSkill') as HTMLSelectElement;
        const swGuest = document.getElementById('swGuest') as HTMLInputElement;
        const swMasterNotice = document.getElementById('swMasterNotice') as HTMLParagraphElement;
        const swClearBtn = document.getElementById('swClearBtn') as HTMLButtonElement;

        const lockFields = (p: any) => {
           swID.value = p.id; swName.value = p.name; swSkill.value = p.skill.toString(); swSearch.value = p.name;
           
           swID.readOnly = true; swID.classList.add('bg-slate-100', 'cursor-not-allowed');
           swName.readOnly = true; swName.classList.add('bg-slate-100', 'cursor-not-allowed');
           swSkill.disabled = true; swSkill.classList.add('bg-slate-100', 'cursor-not-allowed');
           swSearch.readOnly = true; swSearch.classList.add('bg-slate-100', 'cursor-not-allowed');
           
           swTableContainer.classList.add('hidden');
           swMasterNotice.classList.remove('hidden');
           swClearBtn.classList.remove('hidden');
        };

        const unlockFields = () => {
           swID.value = ''; swID.readOnly = false; swID.classList.remove('bg-slate-100', 'cursor-not-allowed');
           swName.value = ''; swName.readOnly = false; swName.classList.remove('bg-slate-100', 'cursor-not-allowed');
           swSkill.value = '2'; swSkill.disabled = false; swSkill.classList.remove('bg-slate-100', 'cursor-not-allowed');
           swSearch.value = ''; swSearch.readOnly = false; swSearch.classList.remove('bg-slate-100', 'cursor-not-allowed');
           
           swMasterNotice.classList.add('hidden');
           swClearBtn.classList.add('hidden');
           swTableContainer.innerHTML = '';
           swSearch.focus();
        };

        swClearBtn.addEventListener('click', unlockFields);

        swGuest.addEventListener('change', (e) => {
           const isGuest = (e.target as HTMLInputElement).checked;
           swSearch.disabled = isGuest; swID.disabled = isGuest; 
           if(isGuest) { 
             unlockFields();
             swSearch.classList.add('bg-slate-100', 'cursor-not-allowed'); 
             swID.classList.add('bg-slate-100', 'cursor-not-allowed');
           } else { 
             swSearch.classList.remove('bg-slate-100', 'cursor-not-allowed'); 
             swID.classList.remove('bg-slate-100', 'cursor-not-allowed');
           }
        });

        let timeout: any;
        swSearch.addEventListener('input', () => {
          clearTimeout(timeout);
          swTableContainer.innerHTML = '';
          
          if(swSearch.value.length < 2) { 
            swTableContainer.classList.add('hidden'); return;
          }
          
          timeout = setTimeout(async () => {
            try {
              const res = await fetch(`/api/player?q=${swSearch.value}`);
              const data = await res.json();
              
              // ทำให้รองรับข้อมูลทุกรูปแบบ (Object เดี่ยว หรือ Array)
              let playerList = [];
              if (Array.isArray(data)) playerList = data;
              else if (data.list && Array.isArray(data.list)) playerList = data.list;
              else if (data.data && Array.isArray(data.data)) playerList = data.data;
              else if (data.found && data.id) playerList = [data]; // <-- รองรับ Object เดี่ยวตามในรูป

              swTableContainer.classList.remove('hidden');

              if(playerList.length > 0) {
                const table = document.createElement('table');
                table.className = 'w-full text-left text-xs';
                table.innerHTML = '<thead class="bg-slate-100 sticky top-0"><tr><th class="p-2">ID</th><th class="p-2">Name</th><th class="p-2 text-center">Lv</th><th class="p-2 text-center">Action</th></tr></thead>';
                const tbody = document.createElement('tbody');
                
                playerList.forEach((p: any) => {
                  const tr = document.createElement('tr');
                  tr.className = 'border-b border-slate-100 hover:bg-blue-50 transition-colors';
                  
                  const tdId = document.createElement('td'); tdId.className = 'p-2 font-bold text-blue-600'; tdId.textContent = p.id;
                  const tdName = document.createElement('td'); tdName.className = 'p-2 font-medium'; tdName.textContent = p.name;
                  const tdLv = document.createElement('td'); tdLv.className = 'p-2 text-center'; tdLv.innerHTML = `<span class="bg-slate-200 px-1.5 py-0.5 rounded shadow-inner font-bold">${p.skill}</span>`;
                  const tdAction = document.createElement('td'); tdAction.className = 'p-2 text-center';
                  
                  const btn = document.createElement('button');
                  btn.className = 'bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded shadow-sm font-bold active:scale-95 transition-transform';
                  btn.textContent = 'Select';
                  btn.onclick = (e) => {
                    e.preventDefault();
                    lockFields(p);
                  };
                  
                  tdAction.appendChild(btn);
                  tr.append(tdId, tdName, tdLv, tdAction);
                  tbody.appendChild(tr);
                });
                table.appendChild(tbody);
                swTableContainer.appendChild(table);
              } else {
                swTableContainer.innerHTML = '<div class="p-4 text-center text-slate-400 text-xs">ไม่พบข้อมูลผู้เล่น (กรอกข้อมูลใหม่ด้านล่างได้เลย)</div>';
              }
            } catch (e) {}
          }, 300);
        });
      },
      showCancelButton: true, confirmButtonText: 'Check In', confirmButtonColor: '#2563eb',
      preConfirm: async () => {
        const swGuest = document.getElementById('swGuest') as HTMLInputElement;
        const swID = document.getElementById('swID') as HTMLInputElement;
        const swName = document.getElementById('swName') as HTMLInputElement;
        const swSkill = document.getElementById('swSkill') as HTMLSelectElement;
        const swMasterNotice = document.getElementById('swMasterNotice') as HTMLParagraphElement;

        const isGuest = swGuest.checked;
        const idVal = swID.value.trim();
        const nameVal = swName.value.trim();
        const isLocked = !swMasterNotice.classList.contains('hidden');

        if(!isGuest && !idVal) { Swal.showValidationMessage('Please enter Employee No.'); return false; }
        if(!nameVal) { Swal.showValidationMessage('Please enter Display Name'); return false; }

        if (!isGuest && !isLocked) {
           try {
             const res = await fetch(`/api/player?q=${nameVal}`);
             const data = await res.json();
             
             let playerList: any[] = [];
             if (Array.isArray(data)) playerList = data;
             else if (data.list && Array.isArray(data.list)) playerList = data.list;
             else if (data.data && Array.isArray(data.data)) playerList = data.data;
             else if (data.found && data.id) playerList = [data];

             const isDup = playerList.some(p => 
                (p.name && p.name.toLowerCase() === nameVal.toLowerCase()) || 
                (p.id && p.id.toString() === idVal.toString())
             );
             if (isDup) {
               Swal.showValidationMessage('ชื่อหรือรหัสนี้ซ้ำในระบบ กรุณาใช้รายชื่อจากตารางค้นหา หรือติดต่อ Admin');
               return false;
             }
           } catch(e) {}
        }

        return { id: isGuest ? undefined : idVal, name: nameVal, skill: Number(swSkill.value), isGuest }
      }
    }).then(async (r) => {
      if(r.isConfirmed) {
        const res = await runApi('/api/checkin', r.value, false);
        if(res && (res.ok || res.status === 'success')) {
          const newProfile = { id: r.value.id || res.generatedId || 'Guest', name: r.value.name };
          localStorage.setItem('myProfile', JSON.stringify(newProfile)); setMyProfile(newProfile);
          Toast.fire({ icon: 'success', title: 'Checked in! Wait for approval.' });
        } else { Toast.fire({ icon: 'error', title: res?.message || 'Error checking in' }); }
      }
    });
  }

  const openSignOut = () => {
    Swal.fire({
      title: '👋 Sign Out',
      html: `
        <div class="text-left text-sm mb-2 text-slate-500 font-bold uppercase tracking-widest">Search your name or ID:</div>
        <input id="soSearch" class="w-full p-2 border border-slate-300 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="Name or ID" value="${myProfile?.id && !myProfile.id.startsWith('G') ? myProfile.id : myProfile?.name || ''}">
      `,
      showCancelButton: true, confirmButtonText: 'Sign Out', confirmButtonColor: '#ef4444',
      preConfirm: async () => {
        const val = (document.getElementById('soSearch') as HTMLInputElement).value;
        if(!val) return Swal.showValidationMessage('Please enter Name or ID');
        return { id: val } 
      }
    }).then(async (r) => {
      if(r.isConfirmed) {
        Toast.fire({ icon: 'info', title: 'Signing out...' });
        fetch('/api/checkout', {
          method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(r.value)
        }).then(() => refresh(false));
        localStorage.removeItem('myProfile'); setMyProfile(null);
        Toast.fire({ icon: 'success', title: 'Signed Out Successfully' });
      }
    })
  }

  const openAddMember = () => {
    Swal.fire({
      title: '➕ Add Member (Direct to Queue)',
      html: `
        <div class="flex flex-col gap-3 text-left">
          <div><label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Employee No.</label><input id="amID" class="w-full p-2 border border-slate-300 rounded shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="12345"></div>
          <div><label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Display Name</label><input id="amName" class="w-full p-2 border border-slate-300 rounded shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Name"></div>
          <div><label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Skill Level</label>
            <select id="amSkill" class="w-full p-2 border border-slate-300 rounded shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="1">1 (Beginner)</option>
              <option value="2" selected>2 (Amateur)</option>
              <option value="3">3 (Intermediate)</option>
              <option value="4">4 (Advanced)</option>
              <option value="5">5 (Pro)</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true, confirmButtonText: 'Add to Queue', confirmButtonColor: '#2563eb',
      preConfirm: () => {
        const id = (document.getElementById('amID') as HTMLInputElement).value;
        const name = (document.getElementById('amName') as HTMLInputElement).value;
        if(!id.trim()) { Swal.showValidationMessage('Enter Employee No.'); return false; }
        if(!name.trim()) { Swal.showValidationMessage('Enter Name'); return false; }
        return { id: id.trim(), name: name.trim(), skill: Number((document.getElementById('amSkill') as HTMLSelectElement).value), isGuest: false }
      }
    }).then(async (r) => {
      if(r.isConfirmed) {
        const res = await runApi('/api/checkin', r.value, false);
        if(res && (res.ok || res.status === 'success')) {
          await runApi('/api/approve', { id: r.value.id }, false);
          Toast.fire({ icon: 'success', title: 'Member added directly to Queue!' });
        } else Toast.fire({ icon: 'error', title: res?.message || 'Error' });
      }
    });
  }

  const openAdminEdit = (p: any) => {
    Swal.fire({
      title: '✏️ Edit Player',
      html: `
        <div class="flex flex-col gap-3 text-left">
          <input type="hidden" id="editOldId" value="${p.id}">
          <div><label class="text-[10px] font-bold text-slate-500">Employee No.</label><input id="editId" value="${p.id}" class="w-full p-2 border rounded text-sm"></div>
          <div><label class="text-[10px] font-bold text-slate-500">Display Name</label><input id="editName" value="${p.name}" class="w-full p-2 border rounded text-sm"></div>
          <div><label class="text-[10px] font-bold text-slate-500">Skill</label>
            <select id="editSkill" class="w-full p-2 border rounded text-sm">
              <option value="1" ${p.skill===1?'selected':''}>1</option>
              <option value="2" ${p.skill===2?'selected':''}>2</option>
              <option value="3" ${p.skill===3?'selected':''}>3</option>
              <option value="4" ${p.skill===4?'selected':''}>4</option>
              <option value="5" ${p.skill===5?'selected':''}>5</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true, confirmButtonText: 'Save',
      preConfirm: () => ({ oldId: p.id, newId: (document.getElementById('editId') as HTMLInputElement).value, name: (document.getElementById('editName') as HTMLInputElement).value, skill: Number((document.getElementById('editSkill') as HTMLSelectElement).value) })
    }).then(async r => { if(r.isConfirmed) { await runApi('/api/update-player', r.value, false); Toast.fire({ icon: 'success', title: 'Changes Saved' }); } })
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
    Swal.fire({ title: 'Reset Entire Day?', text: "This will clear all active courts and queues.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Yes, Reset!' })
    .then(async r => { if(r.isConfirmed) { await runApi('/api/reset-day', {}); Toast.fire({ icon: 'success', title: 'System Reset Complete' }); } })
  }

  const auth = async () => {
    const pin = prompt('Enter Admin PIN:'); if(!pin) return;
    const res = await fetch('/api/config', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ action:'auth', pin })});
    const d = await res.json();
    if(d.ok) { localStorage.setItem('adminAuth','true'); setAdmin(true); Toast.fire({ icon: 'success', title: 'Welcome Admin' }); } 
    else Toast.fire({ icon: 'error', title: 'Incorrect PIN' });
  }

  const logout = () => { localStorage.removeItem('adminAuth'); setAdmin(false); Toast.fire({ icon: 'info', title: 'Logged Out' }); }
  
  const finish = (court: string) => { 
    Swal.fire({title: `Finish Match at ${court}?`, showCancelButton: true}).then(async r => { 
      if(r.isConfirmed) { 
        setState(prev => prev ? { ...prev, playing: (prev.playing || []).filter(c => c.court !== court) } : prev); 
        Toast.fire({ icon: 'success', title: 'Match Finished' });
        fetch('/api/finish', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ court }) }).then(() => refresh(false));
      } 
    }) 
  }

  const SkillDot = ({ skill }: { skill: number }) => {
    const colors = ['bg-gray-400', 'bg-green-500', 'bg-blue-500', 'bg-red-500', 'bg-purple-500'];
    return <span className={`inline-block w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${colors[skill-1] || 'bg-gray-400'}`}></span>
  }

  const myWaitIndex = state?.waiting?.findIndex(p => p.id === myProfile?.id) ?? -1;
  const myPending = state?.pending?.find(p => p.id === myProfile?.id);
  const amIPlaying = state?.playing?.some(c => c.p1Id === myProfile?.id || c.p2Id === myProfile?.id || c.p3Id === myProfile?.id || c.p4Id === myProfile?.id) ?? false;
  
  const courtsCount = state?.courtCount && state.courtCount > 0 ? state.courtCount : 1;
  const avgMatchDuration = state?.avgMatchDuration && state.avgMatchDuration > 0 ? state.avgMatchDuration : 15;

  const estWaitMins = (() => {
    if (myWaitIndex === -1) return 0;
    const teamIndex = Math.floor(myWaitIndex / 4); 
    const groupsToCollect = teamIndex + 1;

    const courtRemaining = (state?.playing || []).map(c => {
      const elapsed = (Date.now() - new Date(c.startTime).getTime()) / 60000;
      return Math.max(avgMatchDuration - elapsed, 0);
    });

    while (courtRemaining.length < courtsCount) courtRemaining.push(0);

    const timeline = courtRemaining.sort((a,b) => a - b);
    let estimatedFinish = 0;

    for (let i = 0; i < groupsToCollect; i++) {
      const nextAvailable = timeline.shift() ?? 0;
      const finishTime = nextAvailable + avgMatchDuration;
      timeline.push(finishTime);
      timeline.sort((a,b) => a - b);
      if (i === groupsToCollect - 1) estimatedFinish = finishTime;
    }
    return Math.max(1, Math.ceil(estimatedFinish));
  })();

  function isSimilarSkillGroup(players: any[]): boolean {
    if (players.length !== 4) return false;
    const skills = players.map(p => Number(p.skill));
    return Math.max(...skills) - Math.min(...skills) <= 1; 
  }

  function getAutoNextMatches(players: any[], availableSlots = 3, mode = matchMode): any[] {
    const matches = [];
    let currentPlayers = [...players];

    for (let i = 0; i < availableSlots; i++) {
      if (currentPlayers.length < 4) break;

      if (mode === 'smart') {
        const match = extractBestMatch(currentPlayers);
        if (!match) break;
        matches.push({ matchNumber: i + 1, teams: match.teams, diff: match.diff });
        currentPlayers = currentPlayers.filter((_, index) => !match.indices.includes(index));
      } else {
        const group = currentPlayers.slice(0, 4);
        if (mode === 'similar-skill' && !isSimilarSkillGroup(group)) {
            currentPlayers = currentPlayers.slice(4);
            continue;
        }
        const balanced = balanceTeams(group.map(p => ({ id: p.id, name: p.name, skill: Number(p.skill) })));
        matches.push({
          matchNumber: i + 1,
          teams: [ [balanced.teams[0], balanced.teams[1]], [balanced.teams[2], balanced.teams[3]] ],
          diff: balanced.diff
        });
        currentPlayers = currentPlayers.slice(4);
      }
    }
    return matches;
  }
  
  const availableCourts = (state?.courtNames || []).filter(cn => !(state?.playing || []).find(p => p.court === cn));
  const autoMatches = (globalPreview && (state?.waiting?.length || 0) >= 4) ? getAutoNextMatches(state?.waiting || [], availableCourts.length, matchMode) : [];

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[100] overflow-y-auto p-3 sm:p-6 flex flex-col">
        <div className="flex justify-between items-center mb-6 pt-2 pb-4 border-b border-slate-800">
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-3xl font-black text-white tracking-widest">LIVE FOCUS</h1>
              <span className="text-xs sm:text-sm text-slate-400 font-medium">Play Time: {playStartTime} - {playEndTime}</span>
            </div>
            <button onClick={()=>setFullscreen(false)} className="bg-slate-800 border border-slate-700 text-slate-400 px-4 sm:px-6 py-2 rounded-lg font-bold hover:bg-slate-700 hover:text-white transition shadow-lg text-sm sm:text-base">EXIT</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 flex-1 pb-10">
          {(state?.courtNames || []).map(cn => {
            const m = (state?.playing || []).find(p => p.court === cn);
            if (m) {
              const min = Math.floor((Date.now()-new Date(m.startTime).getTime())/60000);
              const isLate = min >= avgMatchDuration;
              return (
                <div key={cn} className={`bg-slate-900 border ${isLate ? 'border-red-500 animate-pulse ring-4 ring-red-500/50' : 'border-slate-800'} rounded-3xl flex flex-col min-h-[250px] sm:min-h-[300px] relative overflow-hidden shadow-2xl`}>
                  <span className="absolute inset-0 flex items-center justify-end pr-8 text-[10rem] sm:text-[12rem] font-black text-white/5 pointer-events-none">{cn.replace(/court/i,'')}</span>
                  <div className="absolute top-4 left-4 z-20"><div className={`text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-lg sm:text-xl font-black shadow-lg ${isLate?'bg-red-600':'bg-slate-800'}`}>⏱ {min}m</div></div>
                  <div className="flex-1 flex flex-col justify-end gap-5 sm:gap-6 p-4 sm:p-6 pb-6 sm:pb-8 z-10 mt-16">
                    <div className="bg-gradient-to-r from-blue-900/40 to-blue-800/10 border border-blue-700/50 rounded-2xl p-4 sm:p-5 flex justify-between items-center backdrop-blur shadow-xl border-l-4 border-l-blue-500">
                      <div className="text-white text-lg sm:text-xl font-bold truncate w-[45%]">{m.p1Name}</div>
                      <div className="text-blue-400 font-black text-xl sm:text-2xl">&</div>
                      <div className="text-white text-lg sm:text-xl font-bold truncate w-[45%] text-right">{m.p2Name}</div>
                    </div>
                    <div className="flex justify-center -my-6 sm:-my-7 z-20"><span className="bg-slate-950 border border-slate-700 text-slate-400 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-black tracking-widest text-xs sm:text-sm shadow-lg">VS</span></div>
                    <div className="bg-gradient-to-r from-red-900/40 to-red-800/10 border border-red-700/50 rounded-2xl p-4 sm:p-5 flex justify-between items-center backdrop-blur shadow-xl border-l-4 border-l-red-500">
                      <div className="text-white text-lg sm:text-xl font-bold truncate w-[45%]">{m.p3Name}</div>
                      <div className="text-red-400 font-black text-xl sm:text-2xl">&</div>
                      <div className="text-white text-lg sm:text-xl font-bold truncate w-[45%] text-right">{m.p4Name}</div>
                    </div>
                  </div>
                  {admin && (
                    <button onClick={() => finish(m.court)} className="mx-4 sm:mx-6 mb-4 sm:mb-6 mt-[-10px] z-20 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-base sm:text-lg font-black uppercase shadow-lg transition active:scale-95">
                      End Match
                    </button>
                  )}
                </div>
              )
            } else {
              const availIndex = availableCourts.indexOf(cn);
              const prepMatch = autoMatches[availIndex];
              
              if (prepMatch) {
                return (
                  <div key={cn} className="bg-slate-900 border-2 border-dashed border-emerald-500/50 rounded-3xl flex flex-col min-h-[250px] sm:min-h-[300px] relative overflow-hidden shadow-2xl opacity-90">
                    <span className="absolute inset-0 flex items-center justify-end pr-8 text-[10rem] sm:text-[12rem] font-black text-white/5 pointer-events-none">{cn.replace(/court/i,'')}</span>
                    <div className="absolute top-4 left-4 z-20"><div className="text-emerald-900 bg-emerald-400 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-sm sm:text-base font-black shadow-lg uppercase tracking-widest animate-pulse">UP NEXT</div></div>
                    <div className="flex-1 flex flex-col justify-end gap-5 sm:gap-6 p-4 sm:p-6 pb-6 sm:pb-8 z-10 mt-16">
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 sm:p-5 flex justify-between items-center backdrop-blur shadow-xl border-l-4 border-l-slate-500">
                        <div className="text-slate-300 text-lg sm:text-xl font-bold truncate w-[45%]">{prepMatch.teams[0][0].name}</div>
                        <div className="text-slate-500 font-black text-xl sm:text-2xl">&</div>
                        <div className="text-slate-300 text-lg sm:text-xl font-bold truncate w-[45%] text-right">{prepMatch.teams[0][1].name}</div>
                      </div>
                      <div className="flex justify-center -my-6 sm:-my-7 z-20"><span className="bg-slate-950 border border-slate-700 text-slate-500 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-black tracking-widest text-xs sm:text-sm shadow-lg">VS</span></div>
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 sm:p-5 flex justify-between items-center backdrop-blur shadow-xl border-l-4 border-l-slate-500">
                        <div className="text-slate-300 text-lg sm:text-xl font-bold truncate w-[45%]">{prepMatch.teams[1][0].name}</div>
                        <div className="text-slate-500 font-black text-xl sm:text-2xl">&</div>
                        <div className="text-slate-300 text-lg sm:text-xl font-bold truncate w-[45%] text-right">{prepMatch.teams[1][1].name}</div>
                      </div>
                    </div>
                    {admin && (
                      <button onClick={() => confirmSpecificMatch(prepMatch)} className="mx-4 sm:mx-6 mb-4 sm:mb-6 mt-[-10px] z-20 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-base sm:text-lg font-black uppercase shadow-lg transition active:scale-95 flex items-center justify-center gap-2">
                        <span className="text-xl">✅</span> Confirm Match
                      </button>
                    )}
                  </div>
                )
              } else {
                return (
                  <div key={cn} className="bg-slate-900 border-2 border-dashed border-slate-800 rounded-3xl flex items-center justify-center p-8 relative overflow-hidden min-h-[250px] sm:min-h-[300px]">
                    <span className="absolute inset-0 flex items-center justify-center text-[8rem] sm:text-[10rem] font-black text-white/5 pointer-events-none">{cn.replace(/court/i,'')}</span>
                    <div className="z-10 bg-slate-800/80 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl backdrop-blur-sm"><h3 className="text-2xl sm:text-4xl font-black text-slate-400">{cn}</h3></div>
                  </div>
                )
              }
            }
          })}
        </div>
      </div>
    )
  }

  if (isLoading && !state) return (
    <div className="min-h-screen flex flex-col items-center justify-center dark:bg-slate-950 gap-4">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <div className="text-slate-500 font-bold animate-pulse">Loading Badminton Club...</div>
    </div>
  )

  return (
    <div className={`min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans pb-10 ${isLoading ? 'opacity-80 pointer-events-none' : 'transition-opacity duration-300'}`}>
      
      {state?.announcement && (
        <div className="bg-blue-600 text-white text-xs py-2 px-4 shadow-md flex items-center relative overflow-hidden">
            <span className="mr-2 z-10 bg-blue-600 pr-2 font-bold shadow-[10px_0_10px_#2563eb]">📢 ALERT:</span>
            <div className="flex-1 overflow-hidden">
                <div className="animate-marquee font-medium tracking-wide">{state.announcement}</div>
            </div>
            {admin && <button onClick={async() => { const txt = prompt('Edit Announcement (Leave blank to clear)', state.announcement); if(txt!==null){ await fetch('/api/config', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({action:'set', key:'Announcement', value:txt})}); refresh(false); Toast.fire({icon:'success', title:'Announcement Updated'}); } }} className="ml-4 z-10 bg-blue-600 pl-2 text-blue-200 hover:text-white">✏️</button>}
        </div>
      )}

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
                <button onClick={toggleTheme} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 shadow-inner flex items-center justify-center border dark:border-slate-700 hover:bg-slate-200 transition" title="Toggle theme">🌓</button>
                <button onClick={()=>setFullscreen(true)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 shadow-inner flex items-center justify-center border dark:border-slate-700 hover:bg-slate-200 transition" title="Fullscreen mode">🖥️</button>
                <button onClick={clearBrowserData} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 shadow-inner flex items-center justify-center border dark:border-slate-700 hover:bg-slate-200 transition" title="Clear browser data">🧹</button>
            </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
        
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 flex gap-3 shadow-lg border border-slate-100 dark:border-slate-700">
              <button onClick={openCheckIn} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition transform active:scale-95">
                Check In
              </button>
              <button onClick={openSignOut} className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold py-3.5 rounded-xl text-sm shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition transform active:scale-95">
                Sign Out
              </button>
          </div>

          {myProfile && (
            <div className={`p-5 rounded-2xl shadow-lg border flex items-center justify-between transition-all duration-500
              ${amIPlaying ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-700 shadow-blue-500/30'
                            : myPending ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/20 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                            : (myWaitIndex !== -1) ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-slate-900 border-green-500 shadow-green-500/40'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'}`}>
              <div className="w-full">
                <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Your Status: {myProfile.name}</div>
                {amIPlaying ? ( <div className="text-xl font-black flex items-center gap-2">🏸 Currently Playing!</div>
                ) : myPending ? ( <div className="font-bold text-sm">Waiting for Admin Approval...</div>
                ) : myWaitIndex !== -1 ? (
                   <div className="font-bold flex items-center gap-3 flex-wrap mt-1 w-full">
                      <div className="flex items-center gap-2">
                        Queue Position: <span className="text-3xl font-black bg-white/30 px-3 py-1 rounded-xl shadow-inner">{myWaitIndex + 1}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 bg-black/10 px-3 py-1.5 rounded-lg shadow-sm text-sm">
                        <span>⏱️ Est. Wait: <span className="text-base font-black text-white">~{estWaitMins}</span> mins</span>
                        <span className="text-[10px] opacity-80 sm:ml-1 font-mono">(Avg {avgMatchDuration}m/match)</span>
                      </div>
                      {myWaitIndex < 4 && <span className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg shadow-sm">🔥 Standby!</span>}
                   </div>
                ) : ( <div className="font-bold text-sm">Not in queue. (Click Register below)</div> )}
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-4 px-1">
                <h2 className="font-black text-xl text-slate-800 dark:text-white">Active Courts</h2>
                <span className="text-xs font-bold bg-slate-200 dark:bg-slate-700 shadow-inner text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full">{(state?.playing || []).length}/{(state?.courtCount || 0)}</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {(state?.courtNames || []).map(cn => {
                const m = (state?.playing || []).find(p=>p.court === cn);
                if (m) {
                  const min = Math.floor((Date.now()-new Date(m.startTime).getTime())/60000);
                  const isLate = min >= avgMatchDuration; 
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
                } else {
                  const availIndex = availableCourts.indexOf(cn);
                  const prepMatch = autoMatches[availIndex];

                  if (prepMatch) {
                     return (
                      <div key={cn} className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl border-2 border-dashed border-emerald-400/50 p-4 shadow-md relative overflow-hidden transition-all">
                        <span className="absolute inset-0 flex items-center justify-end pr-6 text-[6rem] font-black text-emerald-900/5 dark:text-emerald-100/5 pointer-events-none">{cn.replace(/court/i,'')}</span>
                        <div className="relative z-10 flex flex-col h-full">
                          <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-black px-2 py-1 rounded bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200 uppercase tracking-widest animate-pulse">Up Next</span>
                              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{cn}</span>
                          </div>
                          <div className="flex flex-col gap-2 opacity-80">
                            <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                              <div className="font-bold text-sm truncate w-[45%] dark:text-slate-200">{prepMatch.teams[0][0].name} <span className="text-[10px] font-normal text-slate-400">Lv {prepMatch.teams[0][0].skill}</span></div>
                              <div className="text-[10px] text-slate-400 font-black">&</div>
                              <div className="font-bold text-sm truncate w-[45%] text-right dark:text-slate-200">{prepMatch.teams[0][1].name} <span className="text-[10px] font-normal text-slate-400">Lv {prepMatch.teams[0][1].skill}</span></div>
                            </div>
                            <div className="flex justify-center -my-2.5"><span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 px-2 text-[9px] font-black uppercase relative z-20 shadow-sm rounded-full">VS</span></div>
                            <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                              <div className="font-bold text-sm truncate w-[45%] dark:text-slate-200">{prepMatch.teams[1][0].name} <span className="text-[10px] font-normal text-slate-400">Lv {prepMatch.teams[1][0].skill}</span></div>
                              <div className="text-[10px] text-slate-400 font-black">&</div>
                              <div className="font-bold text-sm truncate w-[45%] text-right dark:text-slate-200">{prepMatch.teams[1][1].name} <span className="text-[10px] font-normal text-slate-400">Lv {prepMatch.teams[1][1].skill}</span></div>
                            </div>
                          </div>
                          {admin && <button onClick={()=>confirmSpecificMatch(prepMatch)} className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg uppercase shadow-md transition transform active:scale-95 flex items-center justify-center gap-2">✅ Confirm Match</button>}
                        </div>
                      </div>
                     )
                  } else {
                     return (
                      <div key={cn} className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 p-4 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
                        <span className="absolute inset-0 flex items-center justify-center text-[7rem] font-black text-slate-200 dark:text-slate-700/20 pointer-events-none">{cn.replace(/court/i,'')}</span>
                        <div className="z-10 text-center"><h3 className="font-black text-base text-slate-400">{cn}</h3><div className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase mt-2 shadow-sm">Available</div></div>
                      </div>
                     )
                  }
                }
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6">
            {!admin ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-2xl">🔐</span>
                </div>
                <h3 className="text-sm font-black text-slate-600 dark:text-slate-300 uppercase mb-4 tracking-widest">Admin Access Required</h3>
                <button onClick={auth} className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white text-sm py-3 rounded-xl font-bold shadow-lg transition transform active:scale-95">🔓 Login as Admin</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 mb-4 shadow-inner border border-slate-300 dark:border-slate-600">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                        <span className="text-white font-black text-sm">⚙️</span>
                      </div>
                      <span className="font-black text-lg text-slate-800 dark:text-slate-200 uppercase tracking-wide">Admin Console</span>
                    </div>
                    <button onClick={logout} className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-md transition transform active:scale-95">🚪 Logout</button>
                  </div>
                  
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Play Time:</span>
                      <input type="time" value={playStartTime} onChange={(e) => setPlayStartTime(e.target.value)} className="text-xs font-bold bg-transparent outline-none dark:text-white w-20" />
                      <span className="text-xs text-slate-400">-</span>
                      <input type="time" value={playEndTime} onChange={(e) => setPlayEndTime(e.target.value)} className="text-xs font-bold bg-transparent outline-none dark:text-white w-20" />
                    </div>
                    <button onClick={savePlayTime} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded shadow-sm">Save</button>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={state?.autoMatch || false} onChange={async(e)=>{ await fetch('/api/config', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({action:'set', key:'AutoMatch', value:e.target.checked.toString()})}); Toast.fire({ icon: 'success', title: 'Auto Match Settings Saved' }); refresh(false); }} className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"/>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Auto Match</span>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={globalPreview} onChange={(e) => toggleGlobalPreviewState(e.target.checked)} className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Show Pre-Match on Courts</span>
                      </label>
                    </div>
                  </div>
                </div>

                {(state?.pending || []).length > 0 && (
                  <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 dark:from-yellow-900/20 dark:via-orange-900/10 dark:to-amber-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl p-4 shadow-lg">
                    <div className="text-sm font-black text-yellow-800 dark:text-yellow-300 mb-4 uppercase tracking-wider flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">⏳</span>
                        Pending ({(state?.pending || []).length})
                      </span>
                      {selectedPending.length > 0 && (
                        <button 
                          onClick={async() => {
                            const ids = [...selectedPending];
                            setSelectedPending([]); 
                            Toast.fire({ icon: 'info', title: `Approving ${ids.length} players...` });
                            for (const id of ids) { await fetch('/api/approve', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({id})}); }
                            refresh(false);
                            Toast.fire({ icon: 'success', title: `Approved ${ids.length} players!` });
                          }}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-md transition transform active:scale-95"
                        >
                          ✓ Approve Selected
                        </button>
                      )}
                    </div>
                    <input 
                      type="text" 
                      placeholder="🔍 Search name or ID..." 
                      value={searchPending}
                      onChange={(e) => setSearchPending(e.target.value)}
                      className="w-full p-2 border border-yellow-300 rounded-lg text-xs mb-2 focus:ring-2 focus:ring-yellow-500 outline-none bg-white dark:bg-slate-700 dark:text-white dark:border-yellow-700"
                    />
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {(state?.pending || []).filter(p => p.name.toLowerCase().includes(searchPending.toLowerCase()) || p.id.includes(searchPending)).map(p => (
                        <div key={p.id} className={`p-3 rounded-lg border-2 ${selectedPending.includes(p.id) ? 'border-green-400 bg-green-50 dark:bg-green-900/30 shadow-md' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'} flex justify-between items-center shadow-sm transition-all`}>
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox" 
                              checked={selectedPending.includes(p.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedPending(prev => [...prev, p.id]);
                                else setSelectedPending(prev => prev.filter(id => id !== p.id));
                              }}
                              className="w-5 h-5 text-green-600 focus:ring-green-500 rounded border-slate-300"
                            />
                            <div className="text-sm font-bold dark:text-white flex items-center gap-2">{p.name} <SkillDot skill={p.skill}/></div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={async()=>{ Toast.fire({icon:'info', title:'Approving...'}); await fetch('/api/approve', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({id: p.id})}); setSelectedPending(prev => prev.filter(id => id !== p.id)); refresh(false); Toast.fire({ icon: 'success', title: 'Approved!' }); }} className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-md transition transform active:scale-95">✓</button>
                            <button onClick={async()=>{ Toast.fire({icon:'info', title:'Removing...'}); await fetch('/api/checkout', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({id: p.id})}); setSelectedPending(prev => prev.filter(id => id !== p.id)); refresh(false); Toast.fire({ icon: 'info', title: 'Rejected' }); }} className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition transform active:scale-95">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">Quick Actions</h4>
                  <div className="space-y-3">
                    <div className="mb-2">
                      <label className="text-xs font-bold mb-1 block">Match Mode</label>
                      <select value={matchMode} onChange={e => setMatchMode(e.target.value as any)} className="w-full p-2 border rounded-lg text-xs bg-white dark:bg-slate-700 outline-none">
                        <option value="smart">Smart (ในทีมห่าง≤3, ระหว่างทีมห่าง≤1)</option>
                        <option value="balanced">Balanced (สมดุล/ใกล้เคียงที่สุด)</option>
                        <option value="random">Random (สุ่ม)</option>
                        <option value="skill-gap">Skill Gap (คู่ฝีมือใกล้เคียง)</option>
                        <option value="similar-skill">Similar Skill (ฝีมือเดียวกัน/ใกล้กัน)</option>
                      </select>
                    </div>
                    <button onClick={executeAutoMatch} className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-800 text-white text-lg font-black uppercase tracking-wider py-4 rounded-xl shadow-xl transition transform active:scale-95 hover:shadow-indigo-500/50">
                      ⚡ Instant Auto Match
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">Management Tools</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={openAddMember} className="col-span-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-xs font-bold uppercase tracking-wide py-3 rounded-lg shadow-md transition transform active:scale-95">➕ Add Member</button>
                    <button onClick={async()=>{ if(selected.length!==4) return Toast.fire({ icon: 'warning', title: 'Select exactly 4 players' }); Toast.fire({icon:'info', title:'Matching...'}); await fetch('/api/manual-match', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ids: selected})}); setSelected([]); refresh(false); Toast.fire({ icon: 'success', title: 'Matched Selected' }); }} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold py-3 rounded-lg shadow-sm hover:bg-slate-50 transition active:scale-95">Match Selected</button>
                    <button onClick={async()=>{ const c = prompt('Courts (comma separated)', (state?.courtNames || []).join(', ')); if(c){ await fetch('/api/config', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({action:'set', key:'Courts', value: c})}); Toast.fire({ icon: 'success', title: 'Courts updated' }); refresh(false); } }} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold py-3 rounded-lg shadow-sm hover:bg-slate-50 transition active:scale-95">Setup Courts</button>
                    <button onClick={showReport} className="col-span-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-wide py-3 rounded-lg shadow-sm transition active:scale-95">📊 Report</button>
                    <button onClick={resetDay} className="col-span-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 text-xs font-bold uppercase tracking-wide py-3 rounded-lg shadow-sm hover:bg-red-100 transition active:scale-95">⚠️ Reset</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col h-[520px] shadow-lg overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800 backdrop-blur-md flex-col gap-2">
              <div className="flex justify-between items-center w-full">
                <h3 className="font-black text-sm dark:text-white flex items-center gap-2">⏳ Queue <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px]">{(state?.waiting || []).length}</span></h3>
                <button onClick={()=>refresh(true)} className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded hover:bg-slate-300 transition shadow-sm active:scale-95">Refresh</button>
              </div>
              <input 
                type="text" 
                placeholder="🔍 Search name or ID..." 
                value={searchQueue}
                onChange={(e) => setSearchQueue(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-slate-900/20 p-3 space-y-2">
              {(state?.waiting || []).length === 0 ? <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-widest opacity-50">Queue Empty</div> 
              : (state?.waiting || []).filter(p => p.name.toLowerCase().includes(searchQueue.toLowerCase()) || p.id.includes(searchQueue)).length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-widest opacity-50">No Results Found</div>
              ) : (state?.waiting || []).filter(p => p.name.toLowerCase().includes(searchQueue.toLowerCase()) || p.id.includes(searchQueue)).map((p, i) => {
                const isSel = selected.includes(p.id);
                const isMe = p.id === myProfile?.id;
                
                return (
                  <div key={p.id} className={`p-3 rounded-xl border-2 ${isSel ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md' : isMe ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 shadow-sm' : 'border-transparent bg-white dark:bg-slate-800 shadow-sm'} flex items-center justify-between transition-all group`}>
                    <div className="flex items-center gap-3">
                      {admin ? (
                        <input type="checkbox" checked={isSel} onChange={() => setSelected(prev => prev.includes(p.id) ? prev.filter(x=>x!==p.id) : (prev.length>=4?prev:[...prev, p.id]))} className="w-4 h-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                      ) : <span className="text-[11px] font-black text-slate-400 w-5 text-center">{i+1}.</span>}
                      <div>
                        <div className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          {p.name}
                          {p.playCount !== undefined && p.playCount > 0 && <span className="bg-slate-200 dark:bg-slate-700 text-[9px] px-1.5 py-0.5 rounded-md text-slate-600 dark:text-slate-300 font-mono shadow-inner">{p.playCount}P</span>}
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
                        <button onClick={()=>openAdminEdit(p)} className="w-7 h-7 flex items-center justify-center text-[12px] bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md shadow-sm transition active:scale-95" title="Edit">✏️</button>
                      )}
                      {admin ? (
                        <button onClick={async()=>{ Toast.fire({icon:'info', title:'Removing...'}); await fetch('/api/checkout', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({id: p.id})}); Toast.fire({ icon: 'info', title: 'Player Removed' }); refresh(false); }} className="w-7 h-7 flex items-center justify-center text-[12px] bg-red-50 hover:bg-red-100 text-red-600 rounded-md shadow-sm transition active:scale-95" title="Remove">🗑️</button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono font-bold bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded shadow-inner">
                          {p.timestamp ? new Date(p.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : ''}
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