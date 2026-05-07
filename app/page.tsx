'use client'

import { useEffect, useState, useRef } from 'react'
import Swal from 'sweetalert2'
import type { AppState } from '@/lib/types'
import { balanceTeams, extractBestMatch, MatchHistory } from '@/utils/matchmaking'
import { Home as HomeIcon, Users, Bell, User, Sun, Moon, Maximize, Trash2, BellOff, Search, Play, Pause, CheckCircle2, AlertCircle, BarChart2, PieChart, Settings, Edit3, X, Check, Monitor, Plus, CalendarX, LogOut, Clock, Activity, MapPin, Swords, Smartphone } from 'lucide-react'

const Toast = Swal.mixin({
  toast: true,
  position: 'top',
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
  customClass: {
    popup: '!bg-slate-800/90 dark:!bg-white/90 !backdrop-blur-md !border-0 !shadow-lg !rounded-full !px-4 !py-2 !w-auto !min-w-0 !mt-4',
    title: '!text-[12px] !font-bold !text-white dark:!text-slate-900 !m-0 !p-0',
    icon: '!hidden', 
  },
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
  const [loadingCourts, setLoadingCourts] = useState<string[]>([]) 
  
  const [myProfile, setMyProfile] = useState<{id: string, name: string} | null>(null)
  const [searchPending, setSearchPending] = useState('')
  const [searchQueue, setSearchQueue] = useState('')
  const [selectedPending, setSelectedPending] = useState<string[]>([])
  
  const [matchMode, setMatchMode] = useState<'smart'|'balanced'|'random'|'skill-gap'|'similar-skill'|'manual'>('smart');

  const [globalPreview, setGlobalPreview] = useState(true);
  const [playStartTime, setPlayStartTime] = useState('20:00');
  const [playEndTime, setPlayEndTime] = useState('22:30');

  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [manualPreviews, setManualPreviews] = useState<any[]>([]);

  // 🌟 Tab, Nav & History State
  const [activeTab, setActiveTab] = useState<'home' | 'queue' | 'notifications' | 'profile'>('home');
  const [showNav, setShowNav] = useState(true);
  const lastScrollY = useRef(0);
  const [notifyHistory, setNotifyHistory] = useState<{id: number, title: string, body: string, time: string, isRead: boolean}[]>([]);
  const [myPlayHistory, setMyPlayHistory] = useState<any[]>([]);

  // 🌟 Modal State for Court Manager
  const [isCourtManagerOpen, setIsCourtManagerOpen] = useState(false);
  const [newCourtName, setNewCourtName] = useState('');

  const wakeLockRef = useRef<any>(null);
  const [isAwake, setIsAwake] = useState(false);
  
  const [notifyPerm, setNotifyPerm] = useState<string>('default');

  const activeWaiting = (state?.waiting || []).filter(p => !p.name.includes('(พัก)'));
  const myWaitIndex = activeWaiting.findIndex(p => p.id === myProfile?.id);
  const myPending = state?.pending?.find(p => p.id === myProfile?.id);
  const myQueueData = state?.waiting?.find(p => p.id === myProfile?.id);
  
  const myActiveCourt = state?.playing?.find(c => c.p1Id === myProfile?.id || c.p2Id === myProfile?.id || c.p3Id === myProfile?.id || c.p4Id === myProfile?.id);
  const amIPlaying = !!myActiveCourt;
  const playDurationMs = myActiveCourt ? Date.now() - new Date(myActiveCourt.startTime).getTime() : 0;
  
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

  const notifiedStandby = useRef(false);
  const notifiedPlay = useRef(false);

  // 🌟 Color Badge by Skill Level
  const getSkillColor = (skill: number | undefined) => {
    switch(skill) {
      case 1: return 'bg-slate-400 text-white border-slate-500';
      case 2: return 'bg-green-500 text-white border-green-600';
      case 3: return 'bg-blue-500 text-white border-blue-600';
      case 4: return 'bg-red-500 text-white border-red-600';
      case 5: return 'bg-purple-600 text-white border-purple-700';
      default: return 'bg-slate-300 text-slate-700 border-slate-400';
    }
  }

  // 🌟 Hide/Show Header on Scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > lastScrollY.current && window.scrollY > 60) setShowNav(false);
      else setShowNav(true);
      lastScrollY.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 🌟 Register Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW Reg Failed', err));
    }
  }, []);

  const playAlertSound = () => {
    try { const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg'); audio.play().catch(() => {}); } catch(e) {}
  };

  const addNotification = (title: string, body: string) => {
    setNotifyHistory(prev => [{ id: Date.now(), title, body, time: new Date().toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'}), isRead: false }, ...prev].slice(0, 50));
  };

  useEffect(() => {
    if ('Notification' in window) {
      setNotifyPerm(Notification.permission);
    }
  }, []);

  const requestNotify = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifyPerm(perm);
      if (perm === 'granted') {
        Toast.fire({ title: '✅ เปิดระบบแจ้งเตือนสำเร็จ!' });
      } else {
        Toast.fire({ title: '⚠️ คุณปฏิเสธการแจ้งเตือน' });
      }
    } else {
      Toast.fire({ title: '❌ เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน' });
    }
  };

  // 🌟 Reset Notification flags based on state
  useEffect(() => {
    if (myWaitIndex === -1 || myWaitIndex >= 4) {
      notifiedStandby.current = false;
    }
    if (!amIPlaying) {
      notifiedPlay.current = false;
    }
  }, [myWaitIndex, amIPlaying]);

  useEffect(() => {
    if (!myProfile) return;

    const fireNotification = async (title: string, body: string, vibratePattern: number[]) => {
      playAlertSound(); 
      addNotification(title, body);
      if ('vibrate' in navigator) navigator.vibrate(vibratePattern);
      
      // Native Push Notification (แก้ Error TypeScript ตรงนี้ด้วย as any)
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification(title, { body, icon: '/icon.png', vibrate: vibratePattern, badge: '/icon.png' } as any);
          } else {
            const n = new Notification(title, { body, icon: '/icon.png' }); 
            setTimeout(() => n.close(), 6000); 
          }
        } catch(e) {}
      }
      
      // UI Capsule Toast
      Swal.fire({
        title: title,
        text: body,
        position: 'top',
        toast: true,
        showConfirmButton: false,
        timer: 6000,
        customClass: { popup: '!bg-slate-900/90 !backdrop-blur-md !text-white !rounded-2xl !mt-4' }
      });
    };

    if (myWaitIndex >= 0 && myWaitIndex < 4 && !notifiedStandby.current) {
      fireNotification('🔥 เตรียมตัววอร์ม!', 'ใกล้ถึงคิวของคุณแล้ว (อยู่ใน 4 คิวแรก)', [200, 100, 200]);
      notifiedStandby.current = true;
    }

    if (amIPlaying && playDurationMs < 120000 && !notifiedPlay.current) {
      fireNotification('🏸 ถึงคิวคุณแล้ว!', `เชิญลงสนาม ${myActiveCourt?.court} ได้เลย ขอให้สนุกครับ!`, [500, 200, 500, 200, 500]);
      notifiedPlay.current = true;
    }
  }, [myWaitIndex, amIPlaying, myProfile, playDurationMs, myActiveCourt]);

  const toggleWakeLock = async () => {
    if (isAwake) {
      if (wakeLockRef.current) {
        try { await wakeLockRef.current.release(); } catch(e){}
        wakeLockRef.current = null;
      }
      setIsAwake(false);
      Toast.fire({ title: '🌙 ปิดโหมดห้ามจอดับ' });
    } else {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          setIsAwake(true);
          Toast.fire({ title: '☀️ เปิดโหมดห้ามหน้าจอดับ' });
          
          wakeLockRef.current.addEventListener('release', () => {
            setIsAwake(false);
          });
        } else {
          Toast.fire({ title: '⚠️ Browser ไม่รองรับระบบนี้' });
        }
      } catch (err: any) {
        Toast.fire({ title: `❌ ล็อคหน้าจอไม่ได้: ${err.message}` });
      }
    }
  };

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isAwake && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch(e) {}
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAwake]);

  // 🌟 API Fetching
  const refresh = async (showLoader = false, forceClearCache = false) => { 
    if(showLoader) setIsLoading(true);
    try {
      const headers: HeadersInit | undefined = forceClearCache 
        ? { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' } 
        : undefined;
      const res = await fetch('/api/state', { cache: 'no-store', headers }); 
      const d = await res.json(); 
      setState(d)
      if (d.globalShowPreview !== undefined) setGlobalPreview(d.globalShowPreview);
      if (d.playStartTime) setPlayStartTime(d.playStartTime);
      if (d.playEndTime) setPlayEndTime(d.playEndTime);
    } catch(e) {}
    finally { setIsLoading(false); }
  }

  // 🌟 Fetch Profile History
  const fetchProfileHistory = async () => {
    if (!myProfile) return;
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 10);
    try {
      const res = await fetch(`/api/report?date=${today}`);
      if (res.ok) {
        const data = await res.json();
        const myLogs = (data.tableData || []).filter((row: any) => row.name.includes(myProfile.name));
        setMyPlayHistory(myLogs);
      }
    } catch (e) {}
  };

  const handleTabClick = (tab: any) => {
    if (tab === 'home' && activeTab === 'home') {
      refresh(true, true); 
      Toast.fire({ title: '🔄 อัปเดตข้อมูลล่าสุดแล้ว' });
    }
    if (tab === 'profile') fetchProfileHistory();
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => { 
    setAdmin(localStorage.getItem('adminAuth') === 'true'); 
    const savedTheme = localStorage.getItem('theme') as 'light'|'dark' || 'light';
    setTheme(savedTheme);
    if(savedTheme === 'dark') document.documentElement.classList.add('dark');

    const savedProfile = localStorage.getItem('myProfile');
    if(savedProfile) {
      setMyProfile(JSON.parse(savedProfile));
      if (activeTab === 'profile') fetchProfileHistory();
    }

    const savedHistory = localStorage.getItem('localMatchHistory');
    if (savedHistory) setMatchHistory(JSON.parse(savedHistory));

    refresh(true); 
    const t = setInterval(() => refresh(false), Number(process.env.NEXT_PUBLIC_AUTO_REFRESH_MS || 5000)); 
    return () => clearInterval(t);
  }, [])

  // ⚡ AUTO END MATCH (7 นาที)
  useEffect(() => {
    if (!admin || !state?.playing || !avgMatchDuration) return;
    const interval = setInterval(() => {
      const now = Date.now();
      state.playing.forEach(async (m) => {
        const elapsedMins = (now - new Date(m.startTime).getTime()) / 60000;
        if (elapsedMins >= avgMatchDuration + 7) { 
          if (!loadingCourts.includes(m.court)) {
            setLoadingCourts(prev => [...prev, m.court]);
            await fetch('/api/finish', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ court: m.court }) });
            refresh(false);
            setLoadingCourts(prev => prev.filter(c => c !== m.court));
            addNotification(`ระบบจบแมตช์อัตโนมัติ`, `คอร์ท ${m.court} ใช้เวลาเกินค่าเฉลี่ย`);
            if (state?.autoMatch) executeAutoMatch();
          }
        }
      });
    }, 15000); 
    return () => clearInterval(interval);
  }, [admin, state?.playing, avgMatchDuration, loadingCourts, state?.autoMatch]);

  const recordMatchToHistory = (ids: string[]) => {
    if (ids.length !== 4) return;
    const newRecord = { t1: [ids[0], ids[1]], t2: [ids[2], ids[3]] };
    setMatchHistory(prev => {
      const updated = [newRecord, ...prev].slice(0, 100); 
      localStorage.setItem('localMatchHistory', JSON.stringify(updated));
      return updated;
    });
  }

  const safeSetLocalStorage = (key: string, value: string) => {
    try { localStorage.setItem(key, value); } 
    catch (e) { Swal.fire({ icon: 'error', title: '⚠️ หน่วยความจำเต็ม', text: 'กรุณากดล้างแคชที่หน้าโปรไฟล์ครับ' }); }
  };

  const clearBrowserData = () => {
    Swal.fire({
      title: '🧹 ล้างข้อมูลเบราว์เซอร์?',
      text: 'จะลบโปรไฟล์ ประวัติ และการตั้งค่าทั้งหมดบนเครื่องนี้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ล้างข้อมูล!',
      confirmButtonColor: '#ef4444',
      preConfirm: () => {
        localStorage.clear();
        sessionStorage.clear();
        setMyProfile(null);
        setAdmin(false);
        setSelected([]);
        setTheme('light');
        setMatchHistory([]);
        setManualPreviews([]);
        document.documentElement.classList.remove('dark');
        Toast.fire({ title: '✅ Data cleared! Reloading...' });
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
    Toast.fire({ title: 'ℹ️ Saving Time...' });
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
    Toast.fire({ title: '✅ Play Time Saved' });
  }

  const runApi = async (url: string, body?: any, showLoader = true) => {
    if (showLoader) {
      Swal.fire({ title: 'กำลังประมวลผล...', toast: true, position: 'top', showConfirmButton: false, didOpen: () => Swal.showLoading() });
    }
    try {
      const res = await fetch(url, { method: body ? 'POST' : 'GET', headers: body ? {'content-type':'application/json'} : undefined, body: body ? JSON.stringify(body) : undefined });
      const data = await res.json(); 
      await refresh(false); 
      if (showLoader) Swal.close();
      return data;
    } catch (e) {
      if (showLoader) Swal.close();
      Toast.fire({ title: '❌ Network Error' });
      return null;
    }
  }

  // 🌟 Court Manager Action Handlers (แก้ปัญหา is not defined)
  const openCourtManager = () => {
    setIsCourtManagerOpen(true);
  }

  const handleAddCourt = async () => {
    if (!newCourtName.trim()) return;
    const currentCourts = [...(state?.courtNames || []), newCourtName.trim()];
    await fetch('/api/config', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({action:'set', key:'Courts', value:currentCourts.join(',')}) });
    setNewCourtName(''); refresh(false); Toast.fire({ title: '✅ เพิ่มคอร์ทแล้ว' });
  }
  
  const handleRemoveCourt = async (courtToRemove: string) => {
    const currentCourts = (state?.courtNames || []).filter(c => c !== courtToRemove);
    await fetch('/api/config', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({action:'set', key:'Courts', value:currentCourts.join(',')}) });
    refresh(false); Toast.fire({ title: '🗑️ ลบคอร์ทแล้ว' });
  }

  const togglePause = async (p: any) => {
    const isPaused = p.name.includes('(พัก)');
    const newName = isPaused ? p.name.replace(' (พัก)', '') : p.name + ' (พัก)';
    Swal.fire({title: 'กำลังอัปเดต...', toast: true, position: 'top', showConfirmButton: false, didOpen: () => Swal.showLoading()});
    await fetch('/api/update-player', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ oldId: p.id, newId: p.id, name: newName, skill: p.skill }) });
    await refresh(false); Swal.close(); Toast.fire({ title: isPaused ? '✅ กลับเข้าคิวปกติแล้ว' : '⏸️ พักคิวแล้ว' });
  }

  const executeAutoMatch = async () => {
    const availableWaiters = activeWaiting.filter(p => !manualPreviews.flatMap(m => m.teams.flat().map((x:any) => x.id)).includes(p.id));
    if (availableWaiters.length < 4) {
      Toast.fire({ title: '⚠️ คิวพร้อมเล่นไม่ถึง 4 คน' });
      return;
    }

    const availableCourtsCount = state?.courtNames.filter(cn => !state.playing.find(p => p.court === cn)).length || 0;
    const matchTarget = Math.max(1, availableCourtsCount); 

    const matches = getAutoNextMatches(availableWaiters, matchTarget, matchMode, matchHistory);

    if (matches.length === 0) {
      Toast.fire({ title: '⚠️ ระบบหาคู่ที่เหมาะสมไม่ได้' });
      return;
    }

    Toast.fire({ title: `⏳ กำลังปล่อยคิว...` });

    for (const m of matches) {
      const ids = [m.teams[0][0].id, m.teams[0][1].id, m.teams[1][0].id, m.teams[1][1].id];
      recordMatchToHistory(ids); 
      await fetch('/api/manual-match', {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify({ ids })
      });
    }
    refresh(false);
    Toast.fire({ title: '✅ ปล่อยคิวสำเร็จ!' });
  }

  const confirmSpecificMatch = async (matchData: any, targetCourtName?: string) => {
    const courtToLoad = targetCourtName || matchData.court || '';
    if (courtToLoad) setLoadingCourts(prev => [...prev, courtToLoad]); 
    const ids = [
      matchData.teams[0][0].id, matchData.teams[0][1].id, 
      matchData.teams[1][0].id, matchData.teams[1][1].id
    ];
    recordMatchToHistory(ids); 
    await fetch('/api/manual-match', {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({ ids, court: targetCourtName })
    });
    
    setManualPreviews(prev => prev.filter(m => m !== matchData));
    await refresh(false);
    if (courtToLoad) setLoadingCourts(prev => prev.filter(c => c !== courtToLoad));
    Toast.fire({ title: '✅ ลงสนามเรียบร้อย!' });
  }

  const toggleSelect = (pId: string) => {
    if(!admin) return;
    if (matchMode !== 'manual') setMatchMode('manual');
    setSelected(prev => prev.includes(pId) ? prev.filter(x=>x!==pId) : (prev.length>=4?prev:[...prev, pId]));
  };

  const handleMatchSelected = async () => {
    if (selected.length !== 4) return Toast.fire({ title: '⚠️ เลือก 4 คนให้พอดีเป๊ะครับ' }); 
    const selectedPlayers = state?.waiting?.filter(p => selected.includes(p.id)) || [];
    
    let matchData;
    if (matchMode === 'manual') {
      matchData = { isManual: true, matchNumber: Date.now(), teams: [ [selectedPlayers[0], selectedPlayers[1]], [selectedPlayers[2], selectedPlayers[3]] ], diff: 0 };
    } else {
      const balanced = balanceTeams(selectedPlayers, matchHistory);
      matchData = { isManual: true, matchNumber: Date.now(), teams: [ [balanced.teams[0], balanced.teams[1]], [balanced.teams[2], balanced.teams[3]] ], diff: balanced.diff };
    }
    
    if (state?.autoMatch) {
        const cn = availableCourts[0];
        if (cn) confirmSpecificMatch(matchData, cn); else Toast.fire({ title: '⚠️ ไม่มีคอร์ทว่าง' });
        setSelected([]); 
    } else {
        setManualPreviews(prev => [matchData, ...prev]); setSelected([]); Toast.fire({ title: '✅ จัดทีมแทรกคิวสำเร็จ!' });
    }
  }

  const openCheckIn = () => {
    Swal.fire({
      title: '📝 Check In',
      html: `
        <style>
          .swal2-container .swal2-popup { overflow: visible !important; padding-bottom: 2rem; }
        </style>
        <div class="flex flex-col gap-4 text-left w-full relative">
          
          <input type="hidden" id="currentMode" value="search">
          <input type="hidden" id="hidId">
          <input type="hidden" id="hidName">
          <input type="hidden" id="hidSkill">

          <div class="flex p-1 bg-slate-100 rounded-lg shadow-inner gap-1">
            <button type="button" id="tabSearch" class="flex-1 py-2 text-[11px] font-bold rounded-md shadow-sm bg-white text-blue-600 transition-all">🔍 เข้าคิว (เคยมีข้อมูล)</button>
            <button type="button" id="tabNew" class="flex-1 py-2 text-[11px] font-bold rounded-md text-slate-500 hover:text-slate-700 transition-all">✨ เข้าคิว (มาครั้งแรก)</button>
            <button type="button" id="tabSync" class="flex-1 py-2 text-[11px] font-bold rounded-md text-red-500 hover:text-red-700 transition-all">🔄 กู้คืนโปรไฟล์</button>
          </div>

          <div id="secSearch" class="flex flex-col gap-2 min-h-[180px]">
             <label class="text-[10px] font-bold text-slate-500 block uppercase">ค้นหาด้วยชื่อ หรือ รหัสพนักงาน</label>
             <div class="flex gap-2 relative">
                <input id="swSearch" class="w-full p-3 border border-blue-300 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400" placeholder="พิมพ์ชื่อ หรือรหัส..." autocomplete="off">
                <button id="swClearBtn" type="button" class="bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold px-3 rounded-lg shadow-sm hidden transition">✕</button>
             </div>
             
             <div id="swTableContainer" class="w-full bg-white border border-slate-200 shadow-sm rounded-lg hidden max-h-48 overflow-y-auto mt-1"></div>
             
             <div id="searchSelectedPreview" class="hidden mt-2 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm text-sm">
                <div class="text-[10px] text-blue-500 font-black mb-2 tracking-widest uppercase">✅ เลือกผู้เล่นนี้แล้ว</div>
                <div class="flex justify-between items-center bg-white p-2 rounded-lg shadow-sm">
                  <div class="flex flex-col">
                    <span id="previewName" class="font-bold text-slate-700 text-base"></span>
                    <span id="previewId" class="text-[10px] font-mono text-slate-400"></span>
                  </div>
                  <span id="previewSkill" class="bg-blue-600 text-white text-[10px] px-2.5 py-1 rounded-md font-bold shadow-sm"></span>
                </div>
                <p class="text-[10px] text-slate-500 mt-3 text-center">กดปุ่ม Check In ด้านล่างเพื่อเข้าคิวได้เลย</p>
             </div>
          </div>

          <div id="secNew" class="hidden flex-col gap-3 min-h-[180px]">
              <label class="flex items-center gap-2 text-sm font-bold text-slate-600 bg-amber-50 border border-amber-200 p-3 rounded-lg cursor-pointer hover:bg-amber-100 transition shadow-sm">
                <input type="checkbox" id="swGuest" class="w-4 h-4 text-amber-600"> <span class="flex flex-col">Guest <span class="text-[10px] font-normal text-slate-500">ไม่มี ID พนักงาน ระบบจะสุ่มให้</span></span>
              </label>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                  <div>
                      <label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Employee No. (รหัสพนักงาน)</label>
                      <input id="swID" class="w-full p-2.5 border border-slate-300 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors" placeholder="e.g. 12345" value="${myProfile?.id && !myProfile.id.startsWith('G') ? myProfile.id : ''}">
                  </div>
                  <div>
                      <label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Display Name (ชื่อเล่น)</label>
                      <input id="swName" class="w-full p-2.5 border border-slate-300 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors" placeholder="Name" value="${myProfile?.name || ''}">
                  </div>
              </div>
              
              <div class="mt-1">
                  <label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Level (เลือกระดับฝีมือตามจริง)</label>
                  <select id="swSkill" class="w-full p-2.5 border border-slate-300 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors">
                    <option value="1">1 (มือใหม่แกะกล่อง)</option>
                    <option value="2" selected>2 (มือใหม่เริ่มมีทรง)</option>
                    <option value="3">3 (มือกลาง มีพื้นฐาน)</option>
                    <option value="4">4 (มือตึง สายคุมเกมส์)</option>
                    <option value="5">5 (มือปีศาจ "ยอดมนุษย์ดาวแบด")</option>
                  </select>
              </div>
          </div>

          <div id="secSync" class="hidden flex-col gap-2 min-h-[180px]">
             <div class="bg-red-50 border border-red-200 p-3 rounded-lg mb-2">
                <p class="text-xs text-red-600 font-bold mb-1">⚠️ ใช้กรณีไหน?</p>
                <p class="text-[10px] text-red-500 leading-tight">ใช้เมื่อคุณ <b>"มีชื่ออยู่ในคิวแล้ว"</b> แต่เผลอเคลียร์แคช หรือหน้าจอเปลี่ยนมือถือ ทำให้ระบบไม่จำหน้าโปรไฟล์คุณ (ไม่ต้องกดเข้าคิวใหม่ให้ซ้ำซ้อน)</p>
             </div>
             
             <div class="flex gap-2 relative">
                <input id="syncSearchInput" class="w-full p-3 border border-red-300 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-red-500 outline-none placeholder-slate-400" placeholder="🔍 ค้นหาชื่อเพื่อดึงโปรไฟล์กลับมา..." autocomplete="off">
             </div>
             
             <div id="syncTableContainer" class="w-full bg-white border border-slate-200 shadow-sm rounded-lg hidden max-h-48 overflow-y-auto mt-1"></div>
          </div>

        </div>
      `,
      didOpen: () => {
        const currentMode = document.getElementById('currentMode') as HTMLInputElement;
        const tabSearch = document.getElementById('tabSearch') as HTMLButtonElement;
        const tabNew = document.getElementById('tabNew') as HTMLButtonElement;
        const tabSync = document.getElementById('tabSync') as HTMLButtonElement;
        
        const secSearch = document.getElementById('secSearch') as HTMLDivElement;
        const secNew = document.getElementById('secNew') as HTMLDivElement;
        const secSync = document.getElementById('secSync') as HTMLDivElement;

        const switchTab = (mode: string) => {
          currentMode.value = mode;
          
          tabSearch.className = mode === 'search' ? 'flex-1 py-2 text-[11px] font-bold rounded-md shadow-sm bg-white text-blue-600 transition-all' : 'flex-1 py-2 text-[11px] font-bold rounded-md text-slate-500 hover:text-slate-700 transition-all bg-transparent shadow-none';
          tabNew.className = mode === 'new' ? 'flex-1 py-2 text-[11px] font-bold rounded-md shadow-sm bg-white text-blue-600 transition-all' : 'flex-1 py-2 text-[11px] font-bold rounded-md text-slate-500 hover:text-slate-700 transition-all bg-transparent shadow-none';
          tabSync.className = mode === 'sync' ? 'flex-1 py-2 text-[11px] font-bold rounded-md shadow-sm bg-red-500 text-white transition-all' : 'flex-1 py-2 text-[11px] font-bold rounded-md text-red-500 hover:text-red-700 transition-all bg-transparent shadow-none';

          secSearch.classList.toggle('hidden', mode !== 'search');
          secSearch.classList.toggle('flex', mode === 'search');
          
          secNew.classList.toggle('hidden', mode !== 'new');
          secNew.classList.toggle('flex', mode === 'new');

          secSync.classList.toggle('hidden', mode !== 'sync');
          secSync.classList.toggle('flex', mode === 'sync');
        };

        tabSearch.onclick = () => switchTab('search');
        tabNew.onclick = () => switchTab('new');
        tabSync.onclick = () => switchTab('sync');

        const swSearch = document.getElementById('swSearch') as HTMLInputElement;
        const swTableContainer = document.getElementById('swTableContainer') as HTMLDivElement;
        const swClearBtn = document.getElementById('swClearBtn') as HTMLButtonElement;
        const searchSelectedPreview = document.getElementById('searchSelectedPreview') as HTMLDivElement;
        
        const hidId = document.getElementById('hidId') as HTMLInputElement;
        const hidName = document.getElementById('hidName') as HTMLInputElement;
        const hidSkill = document.getElementById('hidSkill') as HTMLInputElement;

        const lockFields = (p: any) => {
           hidId.value = p.id; hidName.value = p.name; hidSkill.value = p.skill;
           
           document.getElementById('previewId')!.textContent = 'ID: ' + p.id;
           document.getElementById('previewName')!.textContent = p.name;
           document.getElementById('previewSkill')!.textContent = 'Lv ' + p.skill;
           
           searchSelectedPreview.classList.remove('hidden');
           swSearch.classList.add('hidden');
           swTableContainer.classList.add('hidden');
           swClearBtn.classList.remove('hidden');
        };

        const unlockFields = () => {
           hidId.value = ''; hidName.value = ''; hidSkill.value = '';
           searchSelectedPreview.classList.add('hidden');
           swSearch.classList.remove('hidden');
           swSearch.value = '';
           swClearBtn.classList.add('hidden');
           swTableContainer.innerHTML = '';
           swSearch.focus();
        };

        swClearBtn.addEventListener('click', unlockFields);

        let timeout: any;
        swSearch.addEventListener('input', () => {
          clearTimeout(timeout);
          swTableContainer.innerHTML = '';
          if(swSearch.value.length < 2) { swTableContainer.classList.add('hidden'); return; }
          
          timeout = setTimeout(async () => {
            try {
              const res = await fetch(`/api/player?q=${swSearch.value}`);
              const data = await res.json();
              
              let playerList = [];
              if (Array.isArray(data)) playerList = data;
              else if (data.list && Array.isArray(data.list)) playerList = data.list;
              else if (data.data && Array.isArray(data.data)) playerList = data.data;
              else if (data.found && data.id) playerList = [data];

              swTableContainer.classList.remove('hidden');

              if(playerList.length > 0) {
                const table = document.createElement('table');
                table.className = 'w-full text-left text-xs';
                table.innerHTML = '<thead class="bg-slate-100 sticky top-0"><tr><th class="p-2">ID</th><th class="p-2">Name</th><th class="p-2 text-center">Lv</th><th class="p-2 text-center">Action</th></tr></thead>';
                const tbody = document.createElement('tbody');
                
                playerList.forEach((p: any) => {
                  const tr = document.createElement('tr');
                  tr.className = 'border-b border-slate-100 hover:bg-blue-50 transition-colors cursor-pointer';
                  tr.onmousedown = (e) => { e.preventDefault(); lockFields(p); };
                  
                  const tdId = document.createElement('td'); tdId.className = 'p-2 font-bold text-blue-600'; tdId.textContent = p.id;
                  const tdName = document.createElement('td'); tdName.className = 'p-2 font-medium'; tdName.textContent = p.name;
                  const tdLv = document.createElement('td'); tdLv.className = 'p-2 text-center'; tdLv.innerHTML = `<span class="bg-slate-200 px-1.5 py-0.5 rounded shadow-inner font-bold">${p.skill}</span>`;
                  const tdAction = document.createElement('td'); tdAction.className = 'p-2 text-center';
                  
                  const btn = document.createElement('button');
                  btn.className = 'bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded shadow-sm font-bold transition-transform';
                  btn.textContent = 'Select';
                  
                  tdAction.appendChild(btn);
                  tr.append(tdId, tdName, tdLv, tdAction);
                  tbody.appendChild(tr);
                });
                table.appendChild(tbody);
                swTableContainer.appendChild(table);
              } else {
                swTableContainer.innerHTML = '<div class="p-4 text-center text-slate-400 text-xs">ไม่พบข้อมูลผู้เล่น <br/>(กดแท็บ "มาครั้งแรก" ด้านบนเพื่อลงทะเบียน)</div>';
              }
            } catch (e) {}
          }, 300);
        });

        const swGuest = document.getElementById('swGuest') as HTMLInputElement;
        const swID = document.getElementById('swID') as HTMLInputElement;
        
        swGuest.addEventListener('change', (e) => {
           const isGuest = (e.target as HTMLInputElement).checked;
           swID.disabled = isGuest; 
           if(isGuest) { 
             swID.classList.add('bg-slate-100', 'cursor-not-allowed', 'opacity-50');
             swID.value = '';
           } else { 
             swID.classList.remove('bg-slate-100', 'cursor-not-allowed', 'opacity-50');
           }
        });

        const syncSearchInput = document.getElementById('syncSearchInput') as HTMLInputElement;
        const syncTableContainer = document.getElementById('syncTableContainer') as HTMLDivElement;
        
        let syncTimeout: any;
        syncSearchInput.addEventListener('input', () => {
          clearTimeout(syncTimeout);
          syncTableContainer.innerHTML = '';
          if(syncSearchInput.value.length < 2) { syncTableContainer.classList.add('hidden'); return; }
          
          syncTimeout = setTimeout(async () => {
            try {
              const res = await fetch(`/api/player?q=${syncSearchInput.value}`);
              const data = await res.json();
              
              let playerList = [];
              if (Array.isArray(data)) playerList = data;
              else if (data.list && Array.isArray(data.list)) playerList = data.list;
              else if (data.data && Array.isArray(data.data)) playerList = data.data;
              else if (data.found && data.id) playerList = [data];

              syncTableContainer.classList.remove('hidden');

              if(playerList.length > 0) {
                const table = document.createElement('table');
                table.className = 'w-full text-left text-xs';
                table.innerHTML = '<thead class="bg-red-100 sticky top-0 text-red-800"><tr><th class="p-2">Name</th><th class="p-2 text-center">Action</th></tr></thead>';
                const tbody = document.createElement('tbody');
                
                playerList.forEach((p: any) => {
                  const tr = document.createElement('tr');
                  tr.className = 'border-b border-slate-100 hover:bg-red-50 transition-colors';
                  
                  const tdName = document.createElement('td'); tdName.className = 'p-2 font-bold text-slate-700'; tdName.textContent = p.name;
                  const tdAction = document.createElement('td'); tdAction.className = 'p-2 text-center';
                  
                  const btn = document.createElement('button');
                  btn.className = 'bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow-sm font-bold transition-transform';
                  btn.textContent = 'Sync Device';
                  btn.onclick = (e) => {
                    e.preventDefault();
                    const profileData = { id: p.id, name: p.name };
                    localStorage.setItem('myProfile', JSON.stringify(profileData));
                    setMyProfile(profileData);
                    Swal.close();
                    Toast.fire({ title: '✅ กู้คืนโปรไฟล์สำเร็จ!' });
                  };
                  
                  tdAction.appendChild(btn);
                  tr.append(tdName, tdAction);
                  tbody.appendChild(tr);
                });
                table.appendChild(tbody);
                syncTableContainer.appendChild(table);
              } else {
                syncTableContainer.innerHTML = '<div class="p-4 text-center text-slate-400 text-xs">ไม่พบข้อมูล</div>';
              }
            } catch (e) {}
          }, 300);
        });

      },
      showCancelButton: true, confirmButtonText: 'Check In', confirmButtonColor: '#2563eb',
      preConfirm: async () => {
        const mode = (document.getElementById('currentMode') as HTMLInputElement).value;

        if (mode === 'sync') {
            Swal.showValidationMessage('กรุณากดปุ่ม Sync Device ที่รายชื่อของคุณ');
            return false;
        } else if (mode === 'search') {
            const id = (document.getElementById('hidId') as HTMLInputElement).value;
            const name = (document.getElementById('hidName') as HTMLInputElement).value;
            const skill = (document.getElementById('hidSkill') as HTMLInputElement).value;
            
            if (!id) {
              Swal.showValidationMessage('กรุณาค้นหาและเลือกรายชื่อผู้เล่นก่อน หรือไปที่แท็บลงทะเบียนใหม่');
              return false;
            }
            return { id, name, skill: Number(skill), isGuest: false };
        } else {
            const swGuest = document.getElementById('swGuest') as HTMLInputElement;
            const swID = document.getElementById('swID') as HTMLInputElement;
            const swName = document.getElementById('swName') as HTMLInputElement;
            const swSkill = document.getElementById('swSkill') as HTMLSelectElement;

            const isGuest = swGuest.checked;
            const idVal = swID.value.trim();
            const nameVal = swName.value.trim();

            if(!isGuest && !idVal) { Swal.showValidationMessage('กรุณากรอกรหัสพนักงาน หรือเลือกเป็น Guest'); return false; }
            if(!nameVal) { Swal.showValidationMessage('กรุณากรอกชื่อเล่นที่ต้องการแสดง'); return false; }

            if (!isGuest) {
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
                   Swal.showValidationMessage('ชื่อหรือรหัสนี้ซ้ำในระบบ กรุณากดแท็บค้นหารายชื่อแทน');
                   return false;
                 }
               } catch(e) {}
            }

            return { id: isGuest ? undefined : idVal, name: nameVal, skill: Number(swSkill.value), isGuest }
        }
      }
    }).then(async (r) => {
      if(r.isConfirmed) {
        const res = await runApi('/api/checkin', r.value, false);
        if(res && (res.ok || res.status === 'success')) {
          const newProfile = { id: r.value.id || res.generatedId || 'Guest', name: r.value.name };
          localStorage.setItem('myProfile', JSON.stringify(newProfile)); setMyProfile(newProfile);
          
          if ('Notification' in window && Notification.permission === 'default') {
            const perm = await Notification.requestPermission();
            setNotifyPerm(perm);
          }

          setActiveTab('home');
          Toast.fire({ title: '✅ Checked in! Wait for approval.' });
        } else { Toast.fire({ title: `❌ ${res?.message || 'Error checking in'}` }); }
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
        Toast.fire({ title: 'ℹ️ Signing out...' });
        fetch('/api/checkout', {
          method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(r.value)
        }).then(() => refresh(false));
        localStorage.removeItem('myProfile'); setMyProfile(null);
        Toast.fire({ title: '✅ Signed Out Successfully' });
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
              <option value="1">1 (มือใหม่แกะกล่อง)</option>
              <option value="2" selected>2 (มือใหม่เริ่มมีทรง)</option>
              <option value="3">3 (มือกลาง มีพื้นฐาน)</option>
              <option value="4">4 (มือตึง สายคุมเกมส์)</option>
              <option value="5">5 (มือปีศาจ "ยอดมนุษย์ดาวแบด")</option>
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
          Toast.fire({ title: '✅ Member added directly to Queue!' });
        } else Toast.fire({ title: `❌ ${res?.message || 'Error'}` });
      }
    });
  }

  const openAdminEdit = (p: any) => {
    Swal.fire({
      title: '✏️ Edit Player',
      html: `
        <div class="flex flex-col gap-3 text-left">
          <input type="hidden" id="editOldId" value="${p.id}">
          <div><label class="text-[10px] font-bold text-slate-500">Employee No.</label><input id="editId" value="${p.id}" class="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"></div>
          <div><label class="text-[10px] font-bold text-slate-500">Display Name</label><input id="editName" value="${p.name}" class="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"></div>
          <div><label class="text-[10px] font-bold text-slate-500">Skill</label>
            <select id="editSkill" class="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="1" ${p.skill===1?'selected':''}>1 (มือใหม่แกะกล่อง)</option>
              <option value="2" ${p.skill===2?'selected':''}>2 (มือใหม่เริ่มมีทรง)</option>
              <option value="3" ${p.skill===3?'selected':''}>3 (มือกลาง มีพื้นฐาน)</option>
              <option value="4" ${p.skill===4?'selected':''}>4 (มือตึง สายคุมเกมส์)</option>
              <option value="5" ${p.skill===5?'selected':''}>5 (มือปีศาจ "ยอดมนุษย์ดาวแบด")</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true, confirmButtonText: 'Save',
      preConfirm: () => ({ oldId: p.id, newId: (document.getElementById('editId') as HTMLInputElement).value, name: (document.getElementById('editName') as HTMLInputElement).value, skill: Number((document.getElementById('editSkill') as HTMLSelectElement).value) })
    }).then(async r => { if(r.isConfirmed) { await runApi('/api/update-player', r.value, false); Toast.fire({ title: '✅ Changes Saved' }); } })
  }

  const showDailyReport = () => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 10);
    Swal.fire({
      title: '📊 Daily Report',
      html: `
        <div class="mb-4 text-left">
           <label class="text-xs font-bold text-slate-500 block mb-1">Select Date:</label>
           <input type="date" id="reportDate" value="${today}" class="w-full p-2 border rounded shadow-sm text-sm outline-none focus:border-blue-400">
        </div>
        <div id="reportContent" class="text-center py-4 text-slate-400">Loading...</div>
      `,
      showConfirmButton: false, showCloseButton: true,
      didOpen: async () => {
        const fetchReport = async (date: string) => {
          document.getElementById('reportContent')!.innerHTML = '<div class="py-5 text-blue-500 font-bold animate-pulse">⏳ Fetching data...</div>';
          try {
            const res = await fetch(`/api/report?date=${date}`); 
            if (!res.ok) throw new Error('API failed');
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            const blob = new Blob(['\uFEFF' + data.csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            let tableHtml = `<div class="max-h-48 overflow-y-auto text-xs mt-4 border rounded shadow-inner"><table class="w-full text-left"><thead class="bg-slate-100 sticky top-0"><tr><th class="p-2">Time</th><th class="p-2">Name</th><th class="p-2">Action</th></tr></thead><tbody>`;
            (data.tableData || []).forEach((row: any) => { tableHtml += `<tr class="border-t"><td class="p-2">${row.time}</td><td class="p-2 font-bold">${row.name}</td><td class="p-2 text-blue-600">${row.action}</td></tr>`; });
            tableHtml += `</tbody></table></div>`;

            document.getElementById('reportContent')!.innerHTML = `
              <div class="grid grid-cols-2 gap-4">
                  <div class="bg-blue-50 p-3 rounded-xl border border-blue-100 shadow-sm"><div class="text-2xl font-black text-blue-600">${data.totalMatches || 0}</div><div class="text-[10px] font-bold text-slate-500 uppercase">Matches</div></div>
                  <div class="bg-green-50 p-3 rounded-xl border border-green-100 shadow-sm"><div class="text-2xl font-black text-green-600">${data.totalPlayers || 0}</div><div class="text-[10px] font-bold text-slate-500 uppercase">Players</div></div>
              </div>
              ${tableHtml}
              <a href="${url}" download="badminton_report_${date}.csv" class="w-full mt-4 block text-center bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-bold shadow-md transition">📥 Download CSV</a>
            `;
          } catch (e) {
            document.getElementById('reportContent')!.innerHTML = '<div class="py-5 text-red-500 font-bold">❌ Error loading report</div>';
          }
        };
        const dateInput = document.getElementById('reportDate') as HTMLInputElement;
        dateInput.addEventListener('change', (e) => fetchReport((e.target as HTMLInputElement).value));
        await fetchReport(today);
      }
    });
  }

  const showAnalytics = () => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 10);
    
    Swal.fire({
      title: '📈 Analytics & Report',
      width: '600px',
      html: `
        <div class="flex gap-3 mb-4 text-left">
           <div class="flex-1">
             <label class="text-xs font-bold text-slate-500 block mb-1 uppercase tracking-wider">Start Date:</label>
             <input type="date" id="reportStart" value="${today}" class="w-full p-2 border border-slate-200 rounded-lg shadow-sm text-sm outline-none focus:border-blue-400">
           </div>
           <div class="flex-1">
             <label class="text-xs font-bold text-slate-500 block mb-1 uppercase tracking-wider">End Date:</label>
             <input type="date" id="reportEnd" value="${today}" class="w-full p-2 border border-slate-200 rounded-lg shadow-sm text-sm outline-none focus:border-blue-400">
           </div>
        </div>
        <div id="reportContent" class="text-center py-4 text-slate-400">Loading...</div>
      `,
      showConfirmButton: false, 
      showCloseButton: true,
      didOpen: async () => {
        const fetchReport = async (sDate: string, eDate: string) => {
          document.getElementById('reportContent')!.innerHTML = '<div class="py-10 text-blue-500 font-bold animate-pulse">⏳ Fetching analytics...</div>';
          try {
            const res = await fetch(`/api/report?startDate=${sDate}&endDate=${eDate}`); 
            if (!res.ok) throw new Error('API failed');
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            
            const blob = new Blob(['\uFEFF' + data.csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            let topPlayersHtml = (data.topPlayers || []).map((p:any, i:number) => `<div class="text-xs truncate py-0.5 border-b border-amber-100 last:border-0"><span class="font-bold text-amber-600">#${i+1}</span> ${p.name} <span class="text-[9px] text-slate-400">(${p.count})</span></div>`).join('') || '<div class="text-xs text-slate-400">No data</div>';

            let tableHtml = `<div class="max-h-56 overflow-y-auto text-xs mt-4 border border-slate-200 rounded-xl shadow-inner"><table class="w-full text-left"><thead class="bg-slate-100 sticky top-0 shadow-sm text-slate-600 uppercase tracking-widest text-[9px]"><tr><th class="p-3">Date</th><th class="p-3">Time</th><th class="p-3">Name/Group</th><th class="p-3">Action</th></tr></thead><tbody>`;
            (data.tableData || []).forEach((row: any) => { tableHtml += `<tr class="border-t border-slate-100 hover:bg-slate-50"><td class="p-3">${row.date}</td><td class="p-3">${row.time}</td><td class="p-3 font-bold truncate max-w-[150px] text-slate-700">${row.name}</td><td class="p-3 text-blue-600 font-medium">${row.action}</td></tr>`; });
            tableHtml += `</tbody></table></div>`;

            document.getElementById('reportContent')!.innerHTML = `
              <div class="grid grid-cols-3 gap-3">
                  <div class="bg-blue-50 p-3 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-center transition hover:shadow-md">
                    <div class="text-2xl font-black text-blue-600">${data.totalMatches || 0}</div>
                    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Matches</div>
                  </div>
                  <div class="bg-green-50 p-3 rounded-xl border border-green-100 shadow-sm flex flex-col justify-center transition hover:shadow-md">
                    <div class="text-2xl font-black text-green-600">${data.totalPlayers || 0}</div>
                    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Unique Players</div>
                  </div>
                  <div class="bg-amber-50 p-3 rounded-xl border border-amber-100 shadow-sm flex flex-col justify-center text-left transition hover:shadow-md">
                    <div class="text-[10px] font-black text-amber-800 uppercase mb-2 tracking-widest">Top Players</div>
                    ${topPlayersHtml}
                  </div>
              </div>
              ${tableHtml}
              <a href="${url}" download="badminton_analytics_${sDate}_to_${eDate}.csv" class="w-full mt-4 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-sm font-bold shadow-md transition active:scale-95">📥 Download CSV Report</a>
            `;
          } catch (e) {
            console.error(e);
            document.getElementById('reportContent')!.innerHTML = '<div class="py-10 text-red-500 font-bold">❌ Error loading report</div>';
          }
        };

        const startInput = document.getElementById('reportStart') as HTMLInputElement;
        const endInput = document.getElementById('reportEnd') as HTMLInputElement;
        
        startInput.addEventListener('change', (e) => fetchReport((e.target as HTMLInputElement).value, endInput.value));
        endInput.addEventListener('change', (e) => fetchReport(startInput.value, (e.target as HTMLInputElement).value));
        
        await fetchReport(today, today);
      }
    });
  }

  const resetDay = () => {
    Swal.fire({ title: 'Reset Entire Day?', text: "This will clear all active courts, queues, and memory.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Yes, Reset!' })
    .then(async r => { 
      if(r.isConfirmed) { 
        localStorage.removeItem('localMatchHistory');
        setMatchHistory([]);
        await runApi('/api/reset-day', {}); 
        Toast.fire({ title: '✅ System Reset Complete' }); 
      } 
    })
  }

  const auth = async () => {
    const pin = prompt('Enter Admin PIN:'); if(!pin) return;
    const res = await fetch('/api/config', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ action:'auth', pin })});
    const d = await res.json();
    if(d.ok) { localStorage.setItem('adminAuth','true'); setAdmin(true); Toast.fire({ title: '✅ Welcome Admin' }); } 
    else Toast.fire({ title: '❌ Incorrect PIN' });
  }

  const logout = () => { localStorage.removeItem('adminAuth'); setAdmin(false); Toast.fire({ title: 'ℹ️ Logged Out' }); }
  
  const finish = (court: string) => { 
    Swal.fire({title: `Finish Match at ${court}?`, showCancelButton: true}).then(async r => { 
      if(r.isConfirmed) { 
        setState(prev => prev ? { ...prev, playing: (prev.playing || []).filter(c => c.court !== court) } : prev); 
        Toast.fire({ title: '✅ Match Finished' });
        fetch('/api/finish', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ court }) }).then(() => refresh(false));
      } 
    }) 
  }

  const SkillDot = ({ skill }: { skill: number }) => {
    const colors = ['bg-slate-400', 'bg-green-500', 'bg-blue-500', 'bg-red-500', 'bg-purple-600'];
    return <span className={`inline-block w-2.5 h-2.5 rounded-full border border-black/10 shadow-sm ${colors[skill-1] || 'bg-slate-400'}`}></span>
  }
  
  const getSkillName = (s: number) => ['มือใหม่แกะกล่อง', 'มือใหม่เริ่มมีทรง', 'มือกลางมีพื้นฐาน', 'มือตึงสายคุมเกมส์', 'มือปีศาจ'][s-1] || 'ไม่ระบุ';

  function isSimilarSkillGroup(players: any[]): boolean {
    if (players.length !== 4) return false;
    const skills = players.map(p => Number(p.skill));
    return Math.max(...skills) - Math.min(...skills) <= 1; 
  }

  function getAutoNextMatches(players: any[], availableSlots = 3, mode = matchMode, history = matchHistory): any[] {
    const matches = [];
    let currentPlayers = [...players];

    for (let i = 0; i < availableSlots; i++) {
      if (currentPlayers.length < 4) break;

      if (mode === 'smart') {
        const match = extractBestMatch(currentPlayers, history); 
        if (!match) break;
        matches.push({ matchNumber: i + 1, teams: match.teams, diff: match.diff });
        currentPlayers = currentPlayers.filter((_, index) => !match.indices.includes(index));
      } else {
        const group = currentPlayers.slice(0, 4);
        if (mode === 'similar-skill' && !isSimilarSkillGroup(group)) {
            currentPlayers = currentPlayers.slice(4);
            continue;
        }
        const balanced = balanceTeams(group.map(p => ({ id: p.id, name: p.name, skill: Number(p.skill) })), history);
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
  
  const manualIds = manualPreviews.flatMap(m => m.teams.flat().map((p: any) => p.id));
  const availableWaiting = (state?.waiting || []).filter(p => !manualIds.includes(p.id));
  
  const remainingSlots = availableCourts.length - manualPreviews.length;
  const autoMatches = (globalPreview && availableWaiting.length >= 4 && remainingSlots > 0) 
    ? getAutoNextMatches(availableWaiting, remainingSlots, matchMode, matchHistory) 
    : [];
    
  const allPreviews = [...manualPreviews, ...autoMatches];

  // ==========================================
  // 🌟 FULLSCREEN FOCUS MODE (Adaptive Theme)
  // ==========================================
  if (fullscreen) {
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
          {(state?.courtNames || []).map(cn => {
            const m = (state?.playing || []).find(p => p.court === cn);
            if (m) {
              const min = Math.floor((Date.now()-new Date(m.startTime).getTime())/60000);
              const isLate = min >= avgMatchDuration;
              return (
                <div key={cn} className={`bg-white dark:bg-slate-900 border ${isLate ? 'border-red-400 ring-2 ring-red-400/30' : 'border-slate-200 dark:border-slate-800'} rounded-2xl flex flex-col min-h-[140px] sm:min-h-[180px] relative overflow-hidden shadow-xl transition-all`}>
                  
                  <div className="absolute top-2 right-2 z-20">
                     <div className="bg-slate-100/90 dark:bg-slate-950/80 backdrop-blur border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg text-xs font-black shadow-sm uppercase tracking-widest">
                        {cn}
                     </div>
                  </div>
                  
                  <div className="absolute top-2 left-2 z-20">
                     <div className={`px-2.5 py-1 rounded-lg text-xs font-black shadow-sm flex items-center gap-1 ${isLate?'bg-red-600 text-white animate-pulse':'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        <Clock className="w-3.5 h-3.5"/> {min}m
                     </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center gap-1.5 p-3 pt-12 z-10">
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-700/50 rounded-xl p-2.5 flex justify-between items-center border-l-4 border-l-blue-500">
                      <div className="text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold truncate w-[45%]">{m.p1Name}</div>
                      <div className="text-blue-500 dark:text-blue-400 font-black text-[10px]">&</div>
                      <div className="text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold truncate w-[45%] text-right">{m.p2Name}</div>
                    </div>
                    <div className="flex justify-center -my-3 z-20">
                      <span className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-400 px-2 py-1 rounded-full font-black text-[9px] shadow-sm flex items-center gap-1"><Swords className="w-3.5 h-3.5"/></span>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-700/50 rounded-xl p-2.5 flex justify-between items-center border-l-4 border-l-red-500">
                      <div className="text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold truncate w-[45%]">{m.p3Name}</div>
                      <div className="text-red-500 dark:text-red-400 font-black text-[10px]">&</div>
                      <div className="text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold truncate w-[45%] text-right">{m.p4Name}</div>
                    </div>
                  </div>
                  {admin && (
                    <button onClick={() => finish(m.court)} className="mx-3 mb-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-black transition active:scale-95 shadow-md flex items-center justify-center gap-2">
                      <Check className="w-4 h-4"/> Finish Match
                    </button>
                  )}
                </div>
              )
            } else {
              const availIndex = availableCourts.indexOf(cn);
              const prepMatch = allPreviews[availIndex];
              
              if (prepMatch) {
                return (
                  <div key={cn} className="bg-emerald-50 dark:bg-slate-900 border border-dashed border-emerald-400 dark:border-emerald-500/50 rounded-2xl flex flex-col min-h-[140px] sm:min-h-[180px] relative overflow-hidden shadow-xl transition-all">
                    
                    <div className="absolute top-2 right-2 z-20">
                       <div className="bg-white/90 dark:bg-slate-950/80 backdrop-blur border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg text-xs font-black shadow-sm uppercase tracking-widest">
                          {cn}
                       </div>
                    </div>

                    <div className="absolute top-2 left-2 z-20">
                       <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black shadow-sm uppercase tracking-widest ${prepMatch.isManual ? 'bg-blue-200 text-blue-800 dark:bg-blue-400 dark:text-blue-900' : 'bg-emerald-200 text-emerald-800 dark:bg-emerald-400 dark:text-emerald-900 animate-pulse'}`}>
                          {prepMatch.isManual ? 'MANUAL' : 'UP NEXT'}
                       </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center gap-1.5 p-3 pt-12 z-10">
                      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-2.5 flex justify-between items-center border-l-4 border-l-slate-400 dark:border-l-slate-500 shadow-sm">
                        <div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold truncate w-[45%]">{prepMatch.teams[0][0].name}</div>
                        <div className="text-slate-400 dark:text-slate-500 font-black text-[10px]">&</div>
                        <div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold truncate w-[45%] text-right">{prepMatch.teams[0][1].name}</div>
                      </div>
                      <div className="flex justify-center -my-3 z-20">
                        <span className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-400 px-2 py-1 rounded-full font-black text-[9px] shadow-sm flex items-center gap-1"><Swords className="w-3.5 h-3.5"/></span>
                      </div>
                      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-2.5 flex justify-between items-center border-l-4 border-l-slate-400 dark:border-l-slate-500 shadow-sm">
                        <div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold truncate w-[45%]">{prepMatch.teams[1][0].name}</div>
                        <div className="text-slate-400 dark:text-slate-500 font-black text-[10px]">&</div>
                        <div className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold truncate w-[45%] text-right">{prepMatch.teams[1][1].name}</div>
                      </div>
                    </div>
                    {admin && (
                      <div className="flex gap-2 mx-3 mb-3 z-20">
                        <button onClick={() => confirmSpecificMatch(prepMatch, cn)} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase transition active:scale-95 flex items-center justify-center gap-1.5 shadow-md">
                          <CheckCircle2 className="w-4 h-4" /> Confirm
                        </button>
                        {prepMatch.isManual && (
                          <button onClick={() => setManualPreviews(prev => prev.filter(m => m !== prepMatch))} className="px-3 py-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-200 rounded-lg text-xs font-black transition active:scale-95 shadow-md">
                            ✕
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              } else {
                return (
                  <div key={cn} className="bg-slate-100 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-4 relative overflow-hidden min-h-[140px] sm:min-h-[180px]">
                    <div className="z-10 bg-white/80 dark:bg-slate-800/80 px-4 py-2 rounded-xl backdrop-blur-sm shadow-sm border border-slate-200 dark:border-slate-700">
                       <h3 className="text-sm sm:text-base font-black text-slate-500 dark:text-slate-400 tracking-widest">{cn}</h3>
                    </div>
                  </div>
                )
              }
            }
          })}
        </div>
      </div>
    )
  }

  // Loading State
  if (isLoading && !state) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="text-slate-500 font-bold animate-pulse text-sm tracking-widest">LOADING BADMINTON CLUB...</div>
      </div>
    </div>
  )

  // ==========================================
  // 🌟 MAIN RENDER 
  // ==========================================
  return (
    <div className={`min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans pb-24 transition-all duration-300 ${state?.announcement ? 'pt-24' : 'pt-16'}`}>
      
      {/* 🌟 Global Announcement Bar */}
      {state?.announcement && (
        <div className="fixed top-0 w-full bg-blue-600 text-white text-xs py-2.5 px-4 shadow-md flex items-center z-[60]">
            <AlertCircle className="w-4 h-4 mr-2 text-white" />
            <div className="flex-1 font-medium tracking-wide truncate">{state.announcement}</div>
            {admin && <button onClick={async() => { const txt = prompt('Edit Announcement', state.announcement); if(txt!==null){ await fetch('/api/config', {method:'POST', headers: {'content-type':'application/json'}, body:JSON.stringify({action:'set', key:'Announcement', value:txt})}); refresh(false); Toast.fire({ title: '✅ Announcement Updated' }); } }} className="ml-4 pl-2 border-l border-blue-400 text-blue-100 hover:text-white"><Edit3 className="w-3.5 h-3.5"/></button>}
        </div>
      )}

      {/* 🌟 Header */}
      <nav className={`fixed ${state?.announcement ? 'top-10' : 'top-0'} w-full bg-white/90 dark:bg-slate-900/90 border-b border-gray-200 dark:border-slate-800 px-4 py-3 backdrop-blur-lg z-50 shadow-sm transition-transform duration-300 ${showNav ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
                <img src="/icon.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-sm bg-white" />
                <h1 className="font-black text-sm dark:text-white tracking-tight">Badminton Club</h1>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={()=>setFullscreen(true)} className="text-slate-400 hover:text-blue-500 transition" title="Live Focus"><Monitor className="w-5 h-5"/></button>
                <button onClick={toggleWakeLock} className={isAwake ? 'text-amber-500' : 'text-slate-400'} title="ป้องกันจอดับ">{isAwake ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}</button>
            </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 w-full h-full relative">
        
        {/* ===================== TAB 1: HOME ===================== */}
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
                 <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black shadow-inner ${getSkillColor(myQueueData?.skill)}`}>{myProfile.name.charAt(0)}</div>
                 <div><div className="font-black text-base leading-tight">{myProfile.name}</div><div className="text-[10px] font-bold opacity-70 uppercase tracking-wide mt-0.5">Status</div></div>
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
            {(state?.courtNames || []).map(cn => {
              const isLoadingCourt = loadingCourts.includes(cn);
              const m = (state?.playing || []).find(p=>p.court === cn);
              const prepMatch = allPreviews[availableCourts.indexOf(cn)];

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
                    {admin && <button onClick={async() => { setLoadingCourts([...loadingCourts, m.court]); await fetch('/api/finish', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({court:m.court})}); refresh(false); setLoadingCourts(prev=>prev.filter(c=>c!==m.court)); if(state?.autoMatch) executeAutoMatch(); }} className="mt-4 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded-lg active:scale-95 transition flex items-center justify-center gap-1.5 shadow-md"><Check className="w-4 h-4"/> Finish Match</button>}
                  </div>
                )
              } else if (prepMatch) {
                return (
                  <div key={cn} className="bg-emerald-50 dark:bg-emerald-900/10 border-2 border-dashed border-emerald-300 dark:border-emerald-700/50 rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-3"><span className="text-[10px] font-bold bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded shadow-sm">{prepMatch.isManual?'Manual':'Up Next'}</span><span className="text-xs font-black text-slate-400">{cn}</span></div>
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300 space-y-1.5 opacity-80">
                      <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg flex justify-between shadow-sm border border-slate-100 dark:border-slate-700"><span>{prepMatch.teams[0][0].name}</span><span>{prepMatch.teams[0][1].name}</span></div>
                      <div className="flex justify-center -my-3 z-10 relative"><span className="bg-emerald-50 dark:bg-emerald-900/10 text-[9px] px-1.5 rounded-full text-slate-400 flex items-center gap-1"><Swords className="w-3.5 h-3.5"/></span></div>
                      <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg flex justify-between shadow-sm border border-slate-100 dark:border-slate-700"><span>{prepMatch.teams[1][0].name}</span><span>{prepMatch.teams[1][1].name}</span></div>
                    </div>
                    {admin && <button onClick={()=>confirmSpecificMatch(prepMatch, cn)} className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg shadow-sm active:scale-95 transition flex items-center justify-center gap-1.5"><CheckCircle2 className="w-4 h-4"/> Confirm</button>}
                  </div>
                )
              } else {
                return <div key={cn} className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-4 flex flex-col items-center justify-center min-h-[160px]"><span className="text-xs font-bold text-slate-400">{cn}</span><span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full mt-1 font-bold">ว่าง</span></div>
              }
            })}
          </div>
        </div>

        {/* ===================== TAB 2: QUEUE ===================== */}
        <div className={activeTab === 'queue' ? 'block animate-in fade-in slide-in-from-bottom-4 duration-300' : 'hidden'}>
          {/* 🌟 Sticky Header */}
          <div className={`sticky ${showNav && !state?.announcement ? 'top-[56px]' : state?.announcement && showNav ? 'top-[92px]' : state?.announcement && !showNav ? 'top-[36px]' : 'top-0'} bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-md pt-3 pb-2 z-40 transition-all duration-300 border-b border-slate-200/50 dark:border-slate-800/50`}>
             <div className="flex justify-between items-center mb-2 px-1">
                <h2 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">คิวรอเล่น <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[10px] shadow-sm">{(state?.waiting || []).length}</span></h2>
             </div>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="ค้นหาชื่อ..." value={searchQueue} onChange={(e) => setSearchQueue(e.target.value)} className="w-full pl-9 pr-3 py-3 border border-slate-300 dark:border-slate-700 rounded-xl text-sm shadow-sm outline-none bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all"/>
             </div>
             
             {admin && selected.length > 0 && (
                <button onClick={handleMatchSelected} className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold py-3 rounded-xl shadow-md active:scale-95 transition flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
                  <Users className="w-4 h-4"/> จัดทีมลงสนาม ({selected.length}/4)
                </button>
             )}
          </div>

          <div className="space-y-2 pb-10 pt-2">
            {(state?.waiting || []).length === 0 ? <div className="text-center py-10 text-slate-400 font-bold text-sm flex flex-col items-center gap-2"><Users className="w-10 h-10 opacity-30"/> ไม่มีคิวรอ</div> 
            : (state?.waiting || []).filter(p => p.name.toLowerCase().includes(searchQueue.toLowerCase())).map((p, i) => {
              const isSel = selected.includes(p.id);
              const isMe = p.id === myProfile?.id;
              const isPaused = p.name.includes('(พัก)');
              const selIndex = selected.indexOf(p.id);
              const teamBadge = selIndex !== -1 ? (selIndex < 2 ? <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm">Team A</span> : <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm">Team B</span>) : null;

              return (
                <div key={p.id} onClick={() => toggleSelect(p.id)} className={`cursor-pointer p-3.5 rounded-2xl border ${isSel ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md ring-1 ring-blue-400/50' : isPaused ? 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 opacity-60' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm'} flex items-center justify-between transition-all hover:shadow-md`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-400 w-5 text-center">{i+1}.</span>
                    <div>
                      <div className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <span className={isPaused ? 'line-through' : ''}>{p.name}</span>
                        {teamBadge}
                        {p.playCount !== undefined && p.playCount > 0 && <span className="bg-slate-200 dark:bg-slate-700 text-[9px] px-1.5 py-0.5 rounded-md text-slate-600 dark:text-slate-300 font-mono shadow-inner">{p.playCount}P</span>}
                        {isMe && <span className="text-[9px] bg-amber-400 text-white font-bold px-1.5 py-0.5 rounded shadow-sm">YOU</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full shadow-sm ${getSkillColor(p.skill)}`}></span>
                        <span className="text-[10px] text-slate-400 font-mono opacity-80">Lv {p.skill}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={e=>e.stopPropagation()}>
                    {(isMe || admin) && <button onClick={()=>togglePause(p)} className="w-8 h-8 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center text-xs active:scale-90 transition shadow-sm border border-amber-100 dark:border-amber-800">{isPaused ? <Play className="w-4 h-4"/> : <Pause className="w-4 h-4"/>}</button>}
                    {admin && <button onClick={()=>openAdminEdit(p)} className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center text-xs active:scale-90 transition shadow-sm border border-blue-100 dark:border-blue-800"><Edit3 className="w-4 h-4"/></button>}
                    {admin && <button onClick={async()=>{ await fetch('/api/checkout',{method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({id:p.id})}); refresh(false); }} className="w-8 h-8 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center text-xs active:scale-90 transition shadow-sm border border-red-100 dark:border-red-800"><X className="w-4 h-4"/></button>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ===================== TAB 3: NOTIFICATIONS ===================== */}
        <div className={activeTab === 'notifications' ? 'block animate-in fade-in slide-in-from-bottom-4 duration-300 pt-4' : 'hidden'}>
           <div className="flex justify-between items-center mb-4"><h2 className="font-black text-lg text-slate-800 dark:text-white">การแจ้งเตือน</h2>{notifyHistory.length > 0 && <button onClick={()=>setNotifyHistory([])} className="text-xs text-slate-500 font-bold bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm hover:bg-slate-300 transition">Clear All</button>}</div>
           
           <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                 <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-inner ${notifyPerm === 'granted' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}><Bell className="w-6 h-6"/></div>
                 <div>
                    <h4 className="font-black text-sm text-slate-800 dark:text-white">การแจ้งเตือนแอป</h4>
                    <p className="text-[10px] text-slate-500 font-bold">แจ้งให้ทราบเมื่อถึงคิวลงสนาม</p>
                 </div>
              </div>
              {notifyPerm !== 'granted' ? (
                 <button onClick={requestNotify} className="w-full sm:w-auto text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl shadow-md transition active:scale-95">เปิดการแจ้งเตือน</button>
              ) : (
                 <span className="w-full sm:w-auto text-center text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-4 py-2.5 rounded-xl border border-emerald-100 dark:border-emerald-800/50">เปิดแล้ว</span>
              )}
           </div>

           {notifyPerm !== 'granted' && (
             <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/50 p-4 rounded-2xl mb-5 shadow-sm">
                <h4 className="font-black text-blue-800 dark:text-blue-300 text-xs flex items-center gap-1.5 mb-1.5"><Smartphone className="w-4 h-4"/> แนะนำเพิ่มเติมเพื่อความเสถียร</h4>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-relaxed">กรุณากดเมนู <b>Share (แชร์)</b> ในเบราว์เซอร์แล้วเลือก <b>"Add to Home Screen"</b> เพื่อให้ระบบแจ้งเตือนทำงานได้ดีแม้ปิดหน้าจอ</p>
             </div>
           )}

           <div className="space-y-3 pb-10">
              {notifyHistory.length === 0 ? <div className="text-center py-10 text-slate-400 font-bold text-sm flex flex-col items-center gap-2"><BellOff className="w-10 h-10 opacity-30"/> ไม่มีประวัติการแจ้งเตือน</div> 
              : notifyHistory.map((n, i) => (
                <div key={n.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex gap-3 relative overflow-hidden">
                  <div className="w-1.5 bg-blue-500 absolute left-0 top-0 bottom-0"></div>
                  <div className="flex-1 pl-2">
                    <div className="flex justify-between items-start mb-1"><h4 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-1.5"><Bell className="w-3.5 h-3.5 text-blue-500"/> {n.title}</h4><span className="text-[10px] font-bold text-slate-400">{n.time}</span></div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{n.body}</p>
                  </div>
                </div>
              ))}
           </div>
        </div>

        {/* ===================== TAB 4: PROFILE & ADMIN ===================== */}
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
               <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm mb-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                  <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black shadow-lg ${getSkillColor(myQueueData?.skill)}`}>{myProfile.name.charAt(0)}</div>
                    <div>
                      <h3 className="font-black text-xl text-slate-800 dark:text-white">{myProfile.name}</h3>
                      <div className="text-xs font-mono text-slate-500 mt-0.5">ID: {myProfile.id}</div>
                      <div className="mt-1.5"><span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full border border-blue-200 dark:border-blue-800 shadow-sm">{myQueueData ? getSkillName(myQueueData.skill) : 'ไม่ระบุระดับ'}</span></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl text-center shadow-sm"><div className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-center gap-1 mb-1 tracking-widest"><Play className="w-3 h-3"/> เล่นไปแล้ว</div><div className="text-2xl font-black text-blue-600 dark:text-blue-400">{myQueueData?.playCount || 0} <span className="text-sm font-bold opacity-70">เกม</span></div></div>
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl text-center shadow-sm"><div className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-center gap-1 mb-1 tracking-widest"><Clock className="w-3 h-3"/> เวลาโดยประมาณ</div><div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">~{((myQueueData?.playCount || 0) * avgMatchDuration)} <span className="text-sm font-bold opacity-70">นาที</span></div></div>
                  </div>
                  
                  <button onClick={openSignOut} className="w-full bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold py-3 rounded-xl transition active:scale-95 border border-red-100 dark:border-red-800/50 shadow-sm flex items-center justify-center gap-2"><LogOut className="w-4 h-4"/> Sign Out ออกจากระบบ</button>
               </div>

               {/* Profile History Section */}
               <div className="mb-6">
                 <h3 className="font-black text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2"><Activity className="w-4 h-4"/> ประวัติการลงสนามวันนี้</h3>
                 <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
                   {myPlayHistory.length === 0 ? <div className="text-center text-xs text-slate-400 py-4">ยังไม่มีประวัติการลงสนามในวันนี้</div>
                   : (
                     <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                       {myPlayHistory.filter(h => h.action.includes('Start') || h.action.includes('Finish')).reverse().map((h, i) => (
                         <div key={i} className="flex gap-3 text-sm items-start">
                           <div className="text-[10px] font-bold text-slate-400 mt-1.5 w-10 text-right">{h.time}</div>
                           <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
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

           {/* ADMIN SECTION IN PROFILE */}
           <div className="bg-slate-800 dark:bg-slate-900 text-slate-200 rounded-2xl p-5 shadow-lg mb-10 pb-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4"><h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2"><Settings className="w-5 h-5"/> Admin Console</h3>{!admin ? <button onClick={auth} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow-sm transition">Login</button> : <button onClick={logout} className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow-sm transition">Logout</button>}</div>
              {admin && (
                <div className="space-y-4">
                   <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 shadow-inner space-y-3">
                     <div className="flex justify-between items-center"><span className="text-xs font-bold">Auto Match</span><input type="checkbox" checked={state?.autoMatch||false} onChange={async(e)=>{await fetch('/api/config',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'set',key:'AutoMatch',value:e.target.checked.toString()})}); refresh(false);}} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"/></div>
                     <div className="flex justify-between items-center"><span className="text-xs font-bold">Show Pre-Match (Global)</span><input type="checkbox" checked={globalPreview} onChange={async(e)=>{setGlobalPreview(e.target.checked); await fetch('/api/config',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'set',key:'GlobalShowPreview',value:e.target.checked.toString()})});}} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"/></div>
                   </div>

                   <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold tracking-widest uppercase">Play Time:</span>
                      <div className="flex items-center gap-2">
                        <input type="time" value={playStartTime} onChange={e=>setPlayStartTime(e.target.value)} className="bg-slate-800 text-white text-xs p-1.5 rounded-lg border border-slate-600 w-24 outline-none focus:ring-1 focus:ring-blue-500"/>
                        <span className="text-slate-500">-</span>
                        <input type="time" value={playEndTime} onChange={e=>setPlayEndTime(e.target.value)} className="bg-slate-800 text-white text-xs p-1.5 rounded-lg border border-slate-600 w-24 outline-none focus:ring-1 focus:ring-blue-500"/>
                        <button onClick={savePlayTime} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg shadow-sm font-bold active:scale-95 transition">Save</button>
                      </div>
                   </div>

                   <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 shadow-inner">
                      <label className="text-xs font-bold mb-2 block tracking-widest uppercase">Match Mode</label>
                      <select value={matchMode} onChange={e => setMatchMode(e.target.value as any)} className="w-full p-2.5 border border-slate-600 rounded-lg text-xs bg-slate-800 text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                        <option value="smart">Smart (ในทีมห่าง≤3, ระหว่างทีมห่าง≤1)</option>
                        <option value="balanced">Balanced (สมดุล/ใกล้เคียงที่สุด)</option>
                        <option value="random">Random (สุ่ม)</option>
                        <option value="skill-gap">Skill Gap (คู่ฝีมือใกล้เคียง)</option>
                        <option value="similar-skill">Similar Skill (ฝีมือเดียวกัน/ใกล้กัน)</option>
                        <option value="manual">Manual (ตามลำดับที่เลือกไว้เป๊ะๆ)</option>
                      </select>
                   </div>

                   <div className="grid grid-cols-2 gap-2 mt-2">
                     <button onClick={executeAutoMatch} className="col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold py-3.5 rounded-xl active:scale-95 flex items-center justify-center gap-2 shadow-md"><Play className="w-4 h-4"/> ปล่อยคิวอัตโนมัติทันที</button>
                     <button onClick={openAddMember} className="bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition"><Plus className="w-4 h-4"/> เพิ่มสมาชิก</button>
                     <button onClick={openCourtManager} className="bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition"><Settings className="w-4 h-4"/> จัดการคอร์ท</button>
                     <button onClick={()=>setFullscreen(true)} className="col-span-2 bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition mt-1"><Monitor className="w-4 h-4"/> เข้าสู่โหมด Live Focus</button>
                     <button onClick={showAnalytics} className="bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition mt-1"><PieChart className="w-4 h-4"/> Analytics</button>
                     <button onClick={showDailyReport} className="bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition mt-1"><BarChart2 className="w-4 h-4"/> Daily Report</button>
                     <button onClick={resetDay} className="col-span-2 bg-red-900/50 text-red-400 border border-red-800 text-xs font-bold py-3 rounded-xl mt-2 active:scale-95 flex items-center justify-center gap-1.5 shadow-sm hover:bg-red-900/80 transition"><CalendarX className="w-4 h-4"/> รีเซ็ตระบบรายวัน</button>
                   </div>
                </div>
              )}
           </div>
           
           <div className="text-center pb-8"><button onClick={clearBrowserData} className="text-[10px] text-slate-400 hover:text-slate-600 underline uppercase flex items-center justify-center gap-1 w-full"><Trash2 className="w-3 h-3"/> ล้างข้อมูลและตั้งค่าแอปทั้งหมดบนเครื่องนี้</button></div>
        </div>

      </div>

      {/* 🌟 Custom Court Manager Modal */}
      {isCourtManagerOpen && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
               <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                 <h3 className="font-black text-base text-slate-800 dark:text-white flex items-center gap-2"><Settings className="w-5 h-5 text-blue-500"/> จัดการคอร์ท</h3>
                 <button onClick={()=>setIsCourtManagerOpen(false)} className="bg-slate-200 dark:bg-slate-800 p-1.5 rounded-full text-slate-500 hover:text-slate-700 transition active:scale-90"><X className="w-4 h-4"/></button>
               </div>
               <div className="p-4">
                 <div className="flex gap-2 mb-4">
                    <input type="text" value={newCourtName} onChange={e=>setNewCourtName(e.target.value)} placeholder="ชื่อคอร์ท (เช่น B1)" className="flex-1 p-3 border border-slate-300 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white"/>
                    <button onClick={handleAddCourt} className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl font-bold text-sm shadow-md active:scale-95 transition flex items-center gap-1"><Plus className="w-4 h-4"/> เพิ่ม</button>
                 </div>
                 <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {(state?.courtNames || []).length === 0 ? <div className="text-center text-xs text-slate-400 py-4">ไม่มีคอร์ทในระบบ</div> : null}
                    {(state?.courtNames || []).map(c => (
                      <div key={c} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                         <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-500"/> {c}</span>
                         <button onClick={()=>handleRemoveCourt(c)} className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-2 rounded-lg hover:bg-red-200 transition active:scale-90"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    ))}
                 </div>
               </div>
            </div>
         </div>
      )}

      {/* 🌟 Bottom Navigation (Modern Facebook Style) */}
      <div className={`fixed bottom-0 w-full bg-white/95 dark:bg-slate-900/95 border-t border-gray-200 dark:border-slate-800 px-6 py-3 backdrop-blur-xl z-50 transition-transform duration-300 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.05)] ${showNav ? 'translate-y-0' : 'translate-y-full'}`}>
         <div className="max-w-md mx-auto flex justify-between items-center relative">
            <button onClick={()=>handleTabClick('home')} className={`flex flex-col items-center gap-1 transition-all ${activeTab==='home'?'text-blue-600 scale-110':'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}>
               <HomeIcon className={activeTab==='home'?'w-6 h-6':'w-5 h-5'} strokeWidth={activeTab==='home'?2.5:2} /><span className="text-[9px] font-black uppercase tracking-wider">Home</span>
            </button>
            <button onClick={()=>handleTabClick('queue')} className={`flex flex-col items-center gap-1 transition-all relative ${activeTab==='queue'?'text-blue-600 scale-110':'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}>
               <Users className={activeTab==='queue'?'w-6 h-6':'w-5 h-5'} strokeWidth={activeTab==='queue'?2.5:2} /><span className="text-[9px] font-black uppercase tracking-wider">Queue</span>
               {(state?.waiting||[]).length>0 && <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-slate-900 shadow-sm">{(state?.waiting||[]).length}</span>}
            </button>
            <button onClick={()=>handleTabClick('notifications')} className={`flex flex-col items-center gap-1 transition-all relative ${activeTab==='notifications'?'text-blue-600 scale-110':'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}>
               <Bell className={activeTab==='notifications'?'w-6 h-6':'w-5 h-5'} strokeWidth={activeTab==='notifications'?2.5:2} /><span className="text-[9px] font-black uppercase tracking-wider">Alerts</span>
               {notifyHistory.filter(n=>!n.isRead).length>0 && <span className="absolute top-0 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"></span>}
            </button>
            <button onClick={()=>handleTabClick('profile')} className={`flex flex-col items-center gap-1 transition-all ${activeTab==='profile'?'text-blue-600 scale-110':'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}>
               <User className={activeTab==='profile'?'w-6 h-6':'w-5 h-5'} strokeWidth={activeTab==='profile'?2.5:2} /><span className="text-[9px] font-black uppercase tracking-wider">Profile</span>
            </button>
         </div>
      </div>
    </div>
  )
}