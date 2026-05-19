'use client'

import { useEffect, useState, useRef } from 'react'
import Swal from 'sweetalert2'
import type { AppState, WaitingPlayer as Player } from '@/lib/types'
import { balanceTeams, extractBestMatch, MatchHistory } from '@/utils/matchmaking'
import { Home as HomeIcon, Users, Bell, User, Sun, Moon, Maximize, AlertCircle, Monitor, DownloadCloud, X, Settings, MapPin, Plus, Trash2 } from 'lucide-react'

import HomeTab from '@/components/tabs/HomeTab'
import QueueTab from '@/components/tabs/QueueTab'
import AlertsTab from '@/components/tabs/AlertsTab'
import ProfileTab from '@/components/tabs/ProfileTab'
import FocusMode from '@/components/tabs/FocusMode'

const APP_VERSION = "2.5.0";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
  return outputArray;
};

const Toast = Swal.mixin({
  toast: true, position: 'top', showConfirmButton: false, timer: 2500, timerProgressBar: true,
  customClass: { popup: '!bg-slate-800/90 dark:!bg-white/90 !backdrop-blur-md !border-0 !shadow-lg !rounded-full !px-4 !py-2 !w-auto !min-w-0 !mt-4', title: '!text-[12px] !font-bold !text-white dark:!text-slate-900 !m-0 !p-0', icon: '!hidden' }
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
  const [enableSound, setEnableSound] = useState(true); 
  const [playStartTime, setPlayStartTime] = useState('18:00');
  const [playEndTime, setPlayEndTime] = useState('23:00');
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [manualPreviews, setManualPreviews] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'home' | 'queue' | 'notifications' | 'profile'>('home');
  const [queueSubTab, setQueueSubTab] = useState<'waiting' | 'pending'>('waiting'); 
  const [showNav, setShowNav] = useState(true);
  const lastScrollY = useRef(0);
  const [notifyHistory, setNotifyHistory] = useState<{id: number, title: string, body: string, time: string, isRead: boolean}[]>([]);
  const [myPlayHistory, setMyPlayHistory] = useState<any[]>([]);

  const [capsuleAlert, setCapsuleAlert] = useState<{title: string, body: string, visible: boolean, onClick?: () => void}>({title: '', body: '', visible: false});
  const capsuleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isCourtManagerOpen, setIsCourtManagerOpen] = useState(false);
  const [newCourtName, setNewCourtName] = useState('');

  const wakeLockRef = useRef<any>(null);
  const [isAwake, setIsAwake] = useState(false);
  const [notifyPerm, setNotifyPerm] = useState<string>('default');

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const activeWaiting = (state?.waiting || []).filter(p => !p.name.includes('(พัก)'));
  const myWaitIndex = activeWaiting.findIndex(p => p.id === myProfile?.id);
  const myPending = state?.pending?.find(p => p.id === myProfile?.id);
  const myQueueData = state?.waiting?.find(p => p.id === myProfile?.id);
  const myActiveCourt = state?.playing?.find(c => c.p1Id === myProfile?.id || c.p2Id === myProfile?.id || c.p3Id === myProfile?.id || c.p4Id === myProfile?.id);
  const amIPlaying = !!myActiveCourt;
  const courtsCount = state?.courtCount && state.courtCount > 0 ? state.courtCount : 1;
  const avgMatchDuration = state?.avgMatchDuration && state.avgMatchDuration > 0 ? state.avgMatchDuration : 15;
  const [pausedIds, setPausedIds] = useState<string[]>([]);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);

  // Computed Values
  const estWaitMins = (() => {
    if (myWaitIndex === -1 || !myProfile || pausedIds.includes(myProfile.id)) return 0;
    const realActiveWaiting = (state?.waiting || []).filter(p => !pausedIds.includes(p.id));
    const realWaitIndex = realActiveWaiting.findIndex(p => p.id === myProfile?.id);
    if (realWaitIndex === -1) return 0;
    const teamIndex = Math.floor(realWaitIndex / 4);
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
      timeline.push(finishTime); timeline.sort((a,b) => a - b);
      if (i === groupsToCollect - 1) estimatedFinish = finishTime;
    }
    return Math.max(1, Math.ceil(estimatedFinish));
  })();

  const myStartLogs = myPlayHistory.filter((h:any) => h.action.toLowerCase().includes('start') || h.action.includes('ลงสนาม'));
  const realPlayCount = myStartLogs.length;
  const realPlayTime = realPlayCount * avgMatchDuration;

  // PWA Prompt (โชว์เต็มจอ)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => { e.preventDefault(); setDeferredPrompt(e); setShowInstallBanner(true); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShowInstallBanner(false);
      setDeferredPrompt(null);
    }
  };

  const getSkillColor = (skill: number | undefined) => { switch(skill) { case 1: return 'bg-slate-400 text-white border-slate-500'; case 2: return 'bg-green-500 text-white border-green-600'; case 3: return 'bg-blue-500 text-white border-blue-600'; case 4: return 'bg-red-500 text-white border-red-600'; case 5: return 'bg-purple-600 text-white border-purple-700'; default: return 'bg-slate-300 text-slate-700 border-slate-400'; } }
  const getMySkillLevel = () => { if (myQueueData) return myQueueData.skill; if (myPending) return myPending.skill; if (myActiveCourt) { if (myActiveCourt.p1Id === myProfile?.id) return myActiveCourt.p1Skill; if (myActiveCourt.p2Id === myProfile?.id) return myActiveCourt.p2Skill; if (myActiveCourt.p3Id === myProfile?.id) return myActiveCourt.p3Skill; if (myActiveCourt.p4Id === myProfile?.id) return myActiveCourt.p4Skill; } const stored = localStorage.getItem('myProfileSkill'); if (stored) return Number(stored); return 0; }
  const getSkillName = (s: number) => ['มือใหม่แกะกล่อง', 'มือใหม่เริ่มมีทรง', 'มือกลางมีพื้นฐาน', 'มือตึงสายคุมเกมส์', 'มือปีศาจ'][s-1] || 'ไม่ระบุ';

  function isSimilarSkillGroup(players: any[]): boolean { if (players.length !== 4) return false; const skills = players.map(p => Number(p.skill)); return Math.max(...skills) - Math.min(...skills) <= 1; }

  function getAutoNextMatches(players: any[], availableSlots = 6, mode = matchMode, history = matchHistory): any[] {
    const matches = []; let currentPlayers = [...players];
    for (let i = 0; i < availableSlots; i++) {
      if (currentPlayers.length < 4) break;
      if (mode === 'smart') {
        const match = extractBestMatch(currentPlayers, history); 
        if (!match) break;
        matches.push({ id: `auto-${Date.now()}-${i}`, isManual: false, teams: match.teams, diff: match.diff });
        currentPlayers = currentPlayers.filter((_, index) => !match.indices.includes(index));
      } else {
        const group = currentPlayers.slice(0, 4);
        if (mode === 'similar-skill' && !isSimilarSkillGroup(group)) { currentPlayers = currentPlayers.slice(4); continue; }
        const balanced = balanceTeams(group.map(p => ({ id: p.id, name: p.name, skill: Number(p.skill) })), history);
        matches.push({ id: `auto-${Date.now()}-${i}`, isManual: false, teams: [ [balanced.teams[0], balanced.teams[1]], [balanced.teams[2], balanced.teams[3]] ], diff: balanced.diff });
        currentPlayers = currentPlayers.slice(4);
      }
    }
    return matches;
  }

  const availableCourts = (state?.courtNames || []).filter(cn => !(state?.playing || []).find(p => p.court === cn));
  const manualIdsList = manualPreviews.flatMap(m => m.teams.flat().map((p: any) => p.id));
  const availableWaitingView = activeWaiting.filter(p => !manualIdsList.includes(p.id) && !pausedIds.includes(p.id)); 
  const remainingSlotsForAuto = Math.max(0, 6 + (state?.courtCount || 0) - manualPreviews.length);
  const autoMatches = (globalPreview && availableWaitingView.length >= 4 && remainingSlotsForAuto > 0 && matchMode !== 'manual') ? getAutoNextMatches(availableWaitingView, remainingSlotsForAuto, matchMode, matchHistory) : [];
  const allPreviews = [...manualPreviews, ...autoMatches];
  const upNextPreviews = allPreviews.slice(availableCourts.length); 

  // 🌟 ฟังก์ชันเลื่อน Scroll Header
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < 20) { setShowNav(true); } 
      else if (window.scrollY > lastScrollY.current && window.scrollY > 60) { setShowNav(false); } 
      else if (window.scrollY < lastScrollY.current) { setShowNav(true); }
      lastScrollY.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const localVer = localStorage.getItem('appVersion');
    if (localVer !== APP_VERSION) {
      const adminAuth = localStorage.getItem('adminAuth'); const soundSett = localStorage.getItem('enableSound');
      localStorage.clear(); sessionStorage.clear();
      if (adminAuth) localStorage.setItem('adminAuth', adminAuth); if (soundSett) localStorage.setItem('enableSound', soundSett);
      localStorage.setItem('appVersion', APP_VERSION); window.location.reload();
    }
    setAdmin(localStorage.getItem('adminAuth') === 'true'); 
    const savedSel = localStorage.getItem('adminSelectedItems'); if(savedSel) setSelected(JSON.parse(savedSel));
    const savedTheme = localStorage.getItem('theme') as 'light'|'dark' || 'light'; setTheme(savedTheme);
    if(savedTheme === 'dark') document.documentElement.classList.add('dark');
    const savedProfile = localStorage.getItem('myProfile'); if(savedProfile) { setMyProfile(JSON.parse(savedProfile)); }
    const savedHistory = localStorage.getItem('localMatchHistory'); if (savedHistory) setMatchHistory(JSON.parse(savedHistory));
    refresh(true); const t = setInterval(() => refresh(false), 5000); return () => clearInterval(t);
  }, []);

  useEffect(() => { localStorage.setItem('adminSelectedItems', JSON.stringify(selected)); }, [selected]);

  const refresh = async (showLoader = false) => { 
    if(showLoader) setIsLoading(true);
    try {
      const res = await fetch('/api/state', { cache: 'no-store' }); const d = await res.json(); setState(d);
      if (d.globalShowPreview !== undefined) setGlobalPreview(d.globalShowPreview);
    } catch(e) {} finally { setIsLoading(false); }
  }

  const runApi = async (url: string, body?: any, showLoader = true) => {
    if (showLoader) Swal.fire({ title: 'กำลังประมวลผล...', toast: true, position: 'top', showConfirmButton: false, didOpen: () => Swal.showLoading() });
    try { const res = await fetch(url, { method: body ? 'POST' : 'GET', headers: body ? {'content-type':'application/json'} : undefined, body: body ? JSON.stringify(body) : undefined }); const data = await res.json(); await refresh(true); if (showLoader) Swal.close(); return data; } 
    catch (e) { if (showLoader) Swal.close(); Toast.fire({ title: '❌ Network Error' }); return null; }
  }

  const requestNotify = async () => {
    if (!myProfile) return Toast.fire({ title: '⚠️ กรุณา Check in ก่อนเปิดแจ้งเตือน' });
    const perm = await Notification.requestPermission(); setNotifyPerm(perm);
    if (perm === 'granted') { try { 
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!) });
        await fetch('/api/webpush', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'subscribe', subscription, userId: myProfile.id }) });
        Toast.fire({ title: '✅ เปิดระบบอนุญาตแจ้งเตือนสมบูรณ์!' }); refresh(false); 
    } catch (error) { Toast.fire({ title: '⚠️ ไม่สามารถบันทึก Token ได้' }); } } 
  };

  const triggerNotification = async (title: string, body: string, vibratePattern: number[], targetTab?: 'home' | 'queue', skipOSPushIfGranted: boolean = false) => {
    if (enableSound) try { new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock_2.ogg').play().catch(()=>{}); } catch(e){}
    setNotifyHistory(prev => [{ id: Date.now(), title, body, time: new Date().toLocaleTimeString('th-TH'), isRead: false }, ...prev].slice(0, 50));
    if (capsuleTimeoutRef.current) clearTimeout(capsuleTimeoutRef.current);
    setCapsuleAlert({ title, body, visible: true, onClick: () => targetTab && handleTabClick(targetTab) });
    capsuleTimeoutRef.current = setTimeout(() => setCapsuleAlert(prev => ({...prev, visible: false})), 6000);
  };

  // 🌟 ฟังก์ชัน Wake Lock
  const toggleWakeLock = async () => {
    if (isAwake) {
      if (wakeLockRef.current) { try { await wakeLockRef.current.release(); } catch(e){} wakeLockRef.current = null; }
      setIsAwake(false); Toast.fire({ title: '🌙 ปิดโหมดห้ามจอดับ' });
    } else {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          setIsAwake(true); Toast.fire({ title: '☀️ เปิดโหมดห้ามหน้าจอดับแล้ว' });
          wakeLockRef.current.addEventListener('release', () => setIsAwake(false));
        } else { Toast.fire({ title: '⚠️ Browser ไม่รองรับ (ลองใช้ใน Chrome)' }); }
      } catch (err: any) { Toast.fire({ title: `❌ ปฏิเสธการล็อคจอ: ${err.message}` }); }
    }
  };

  // == Handlers ==
  const handleTabClick = (tab: any) => { setActiveTab(tab); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const toggleSelect = (pId: string) => { if(!admin) return; setSelected(prev => prev.includes(pId) ? prev.filter(x => x !== pId) : (prev.length >= 4 ? prev : [...prev, pId])); };
  const togglePause = async (p: any) => { const isPaused = p.name.includes('(พัก)'); const newName = isPaused ? p.name.replace(' (พัก)', '') : p.name + ' (พัก)'; await fetch('/api/update-player', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ oldId: p.id, newId: p.id, name: newName, skill: p.skill }) }); refresh(true); }
  
  // 🌟 ฟังก์ชันเลื่อนคิวด้วยปุ่ม ขึ้น-ลง
  const handleMoveQueue = async (id: string, direction: 'up' | 'down') => {
    const waitList = [...(state?.waiting || [])];
    const idx = waitList.findIndex(p => p.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === waitList.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const targetId = waitList[targetIdx].id;

    const temp = waitList[idx]; waitList[idx] = waitList[targetIdx]; waitList[targetIdx] = temp;
    setState(prev => prev ? { ...prev, waiting: waitList } : prev);

    try { await fetch('/api/reorder', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ draggedId: id, targetId: targetId }) }); } catch(e){}
  };

  const handleMatchSelected = async () => {
    if (selected.length !== 4) return Toast.fire({ title: '⚠️ เลือก 4 คนให้พอดีเป๊ะครับ' }); 
    const selectedPlayers = (selected.map(id => state?.waiting?.find(p => p.id === id)).filter(Boolean) as Player[]) || [];
    if (selectedPlayers.length !== 4) return Toast.fire({ title: '⚠️ ดึงข้อมูลผู้เล่นไม่ครบ' });

    let matchData;
    if (matchMode === 'manual') {
      matchData = { id: `manual-${Date.now()}`, isManual: true, teams: [ [selectedPlayers[0], selectedPlayers[1]], [selectedPlayers[2], selectedPlayers[3]] ], diff: 0 };
    } else {
      const balanced = balanceTeams(selectedPlayers, matchHistory);
      matchData = { id: `manual-${Date.now()}`, isManual: true, teams: [ [balanced.teams[0], balanced.teams[1]], [balanced.teams[2], balanced.teams[3]] ], diff: balanced.diff };
    }
    // 🌟 แก้ไข: ต่อท้ายคิว Manual เรื่อยๆ (FIFO) แทนการแทรกไว้หน้าสุด
    setManualPreviews(prev => [...prev, matchData]); 
    setSelected([]); 
    Toast.fire({ title: '✅ จัดทีมต่อคิวสำเร็จ (Up Next)!' });
  }

  const rejectPreviewMatch = (matchData: any) => {
    if (matchData.isManual) { setManualPreviews(prev => prev.filter(m => m.id !== matchData.id)); Toast.fire({ title: '↩️ ยกเลิกคิวนี้ กลับเข้าคิวรอปกติ' }); } 
    else { Toast.fire({ title: '⚠️ ออโต้แมตช์ ไม่สามารถกดยกเลิกแบบ manual ได้' }); }
  }

  const confirmSpecificMatch = async (matchData: any, targetCourtName?: string) => {
    const courtToLoad = targetCourtName || availableCourts[0];
    if (!courtToLoad) return Toast.fire({ title: '⚠️ ไม่มีคอร์ทว่างให้ลงสนามตอนนี้' });

    setLoadingCourts(prev => [...prev, courtToLoad]); 
    const ids = [matchData.teams[0][0].id, matchData.teams[0][1].id, matchData.teams[1][0].id, matchData.teams[1][1].id];
    
    const newRecord = { t1: [ids[0], ids[1]], t2: [ids[2], ids[3]] };
    setMatchHistory(prev => { const updated = [newRecord, ...prev].slice(0, 100); localStorage.setItem('localMatchHistory', JSON.stringify(updated)); return updated; });
    
    await fetch('/api/manual-match', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ ids, court: courtToLoad }) });
    
    if (matchData.isManual) setManualPreviews(prev => prev.filter(m => m.id !== matchData.id));
    await refresh(true); setLoadingCourts(prev => prev.filter(c => c !== courtToLoad)); Toast.fire({ title: `✅ ลงสนาม ${courtToLoad} เรียบร้อย!` });
  }

  const tabProps = {
     state, admin, myProfile, queueSubTab, setQueueSubTab, searchQueue, setSearchQueue, searchPending, setSearchPending, selected, toggleSelect,
     selectedPending, setSelectedPending, handleApproveProcess: async(p:any)=>{ if (String(p.id).startsWith('G')) { await runApi('/api/approve', { id: p.id }, true); } else { /* logic for player edit */ } },
     handleBulkApprove: async()=>{}, handleMatchSelected, handleRejectPlayer: async(id:string)=>{}, togglePause, openAdminEditPlayer: (p:any)=>{}, handleDragStart: ()=>{}, handleDrop: ()=>{}, handleMoveQueue, draggedPlayerId, getSkillColor,
     loadingCourts, setLoadingCourts, allPreviews, availableCourts, upNextPreviews, manualPreviews, autoMatches, avgMatchDuration, 
     confirmSpecificMatch, rejectPreviewMatch, finish: async(c:string)=>{ await fetch('/api/finish', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({court:c})}); refresh(true); },
     myWaitIndex, amIPlaying, myPending, getMySkillLevel, getSkillName, estWaitMins, showNav,
     notifyHistory, setNotifyHistory, notifyPerm, requestNotify, triggerNotification,
     realPlayCount, realPlayTime, openSignOut: ()=>{}, myPlayHistory, auth: async()=>{}, logout: ()=>{}, refresh,
     globalPreview, setGlobalPreview, enableSound, setEnableSound, playStartTime, setPlayStartTime, playEndTime, setPlayEndTime, savePlayTime: async()=>{},
     matchMode, setMatchMode, executeAutoMatch: async()=>{}, openBroadcastModal: ()=>{}, openAddMember: ()=>{}, openCourtManager: ()=>{}, setFullscreen,
     exportRegisteredToday: ()=>{}, showAnalyticsMenu: ()=>{}, showDailyReportMenu: ()=>{}, resetDay: ()=>{}, clearBrowserData: ()=>{}, APP_VERSION, openCheckIn: ()=>{}
  };

  if (isLoading && !state) return (<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>)

  // 🌟 Render Focus Mode
  if (fullscreen) return <FocusMode {...tabProps} />

  return (
    <div className={`min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans pb-24 transition-all duration-300 pt-16`}>
      
      {/* 🌟 บังคับ PWA เต็มจอ */}
      {showInstallBanner && (
        <div className="fixed inset-0 z-[100] bg-blue-600 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
           <DownloadCloud className="w-20 h-20 text-white mb-6 animate-bounce" />
           <h2 className="text-3xl font-black text-white mb-2 tracking-tight">ติดตั้งแอป Badminton</h2>
           <p className="text-blue-100 mb-8 text-sm max-w-xs leading-relaxed">เพื่อให้ระบบแจ้งเตือนทำงานได้สมบูรณ์และใช้งานได้ลื่นไหลเหมือนแอปพลิเคชันปกติ กรุณาติดตั้งแอปลงบนหน้าจอโฮมของคุณ</p>
           
           <button onClick={handleInstallPWA} className="w-full max-w-xs bg-white text-blue-700 font-black py-4 rounded-2xl text-lg shadow-2xl active:scale-95 transition mb-4">
              ✅ ติดตั้งแอปเดี๋ยวนี้
           </button>
           
           <button onClick={()=>setShowInstallBanner(false)} className="text-blue-200 text-xs font-bold underline hover:text-white transition p-2">
              ข้ามไปก่อน (ใช้งานผ่านเบราว์เซอร์)
           </button>
        </div>
      )}

      {/* 🌟 Header ยืดหด */}
      <nav className={`fixed top-0 w-full bg-white/90 dark:bg-slate-900/90 border-b border-gray-200 dark:border-slate-800 px-4 py-3 backdrop-blur-lg z-50 shadow-sm transition-transform duration-300 ${showNav ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3"><img src="/icon.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-sm bg-white" /><h1 className="font-black text-sm dark:text-white tracking-tight">Badminton Club</h1></div>
            <div className="flex items-center gap-3">
                <button onClick={()=>setFullscreen(true)} className="text-slate-400 hover:text-blue-500 transition"><Monitor className="w-5 h-5"/></button>
                <button onClick={toggleWakeLock} className={isAwake ? 'text-amber-500' : 'text-slate-400'}>{isAwake ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}</button>
            </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 w-full h-full relative">
        {activeTab === 'home' && <HomeTab {...tabProps} />}
        {activeTab === 'queue' && <QueueTab {...tabProps} />}
        {activeTab === 'notifications' && <AlertsTab {...tabProps} />}
        {activeTab === 'profile' && <ProfileTab {...tabProps} />}
      </div>

      {/* 🌟 เมนูด้านล่าง ยืดหด */}
      <div className={`fixed bottom-0 w-full bg-white/95 dark:bg-slate-900/95 border-t border-gray-200 dark:border-slate-800 px-6 py-3 backdrop-blur-xl z-50 transition-transform duration-300 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.05)] ${showNav ? 'translate-y-0' : 'translate-y-full'}`}>
         <div className="max-w-md mx-auto flex justify-between items-center relative">
            <button onClick={()=>handleTabClick('home')} className={`flex flex-col items-center gap-1 transition-all ${activeTab==='home'?'text-blue-600 scale-110':'text-slate-400'}`}><HomeIcon className="w-5 h-5" /><span className="text-[9px] font-black uppercase tracking-wider">Home</span></button>
            <button onClick={()=>handleTabClick('queue')} className={`flex flex-col items-center gap-1 transition-all relative ${activeTab==='queue'?'text-blue-600 scale-110':'text-slate-400'}`}><Users className="w-5 h-5" /><span className="text-[9px] font-black uppercase tracking-wider">Queue</span></button>
            <button onClick={()=>handleTabClick('notifications')} className={`flex flex-col items-center gap-1 transition-all relative ${activeTab==='notifications'?'text-blue-600 scale-110':'text-slate-400'}`}><Bell className="w-5 h-5" /><span className="text-[9px] font-black uppercase tracking-wider">Alerts</span></button>
            <button onClick={()=>handleTabClick('profile')} className={`flex flex-col items-center gap-1 transition-all ${activeTab==='profile'?'text-blue-600 scale-110':'text-slate-400'}`}><User className="w-5 h-5" /><span className="text-[9px] font-black uppercase tracking-wider">Profile</span></button>
         </div>
      </div>
    </div>
  )
}
