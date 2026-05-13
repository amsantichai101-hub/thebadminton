'use client'

import { useEffect, useState, useRef } from 'react'
import Swal from 'sweetalert2'
import type { AppState, WaitingPlayer as Player } from '@/lib/types'
import { balanceTeams, extractBestMatch, MatchHistory } from '@/utils/matchmaking'
import { Home as HomeIcon, Users, Bell, User, Sun, Moon, Maximize, AlertCircle, Monitor, DownloadCloud, X } from 'lucide-react'

import HomeTab from '@/components/tabs/HomeTab'
import QueueTab from '@/components/tabs/QueueTab'
import AlertsTab from '@/components/tabs/AlertsTab'
import ProfileTab from '@/components/tabs/ProfileTab'

const APP_VERSION = "2.4.5";

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

  // 🌟 PWA Setup
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

  // 🌟 Logic & Computations
  const getSkillColor = (skill: number | undefined) => { switch(skill) { case 1: return 'bg-slate-400 text-white border-slate-500'; case 2: return 'bg-green-500 text-white border-green-600'; case 3: return 'bg-blue-500 text-white border-blue-600'; case 4: return 'bg-red-500 text-white border-red-600'; case 5: return 'bg-purple-600 text-white border-purple-700'; default: return 'bg-slate-300 text-slate-700 border-slate-400'; } }
  const getMySkillLevel = () => { if (myQueueData) return myQueueData.skill; if (myPending) return myPending.skill; if (myActiveCourt) { if (myActiveCourt.p1Id === myProfile?.id) return myActiveCourt.p1Skill; if (myActiveCourt.p2Id === myProfile?.id) return myActiveCourt.p2Skill; if (myActiveCourt.p3Id === myProfile?.id) return myActiveCourt.p3Skill; if (myActiveCourt.p4Id === myProfile?.id) return myActiveCourt.p4Skill; } const stored = localStorage.getItem('myProfileSkill'); if (stored) return Number(stored); return 0; }
  const getSkillName = (s: number) => ['มือใหม่แกะกล่อง', 'มือใหม่เริ่มมีทรง', 'มือกลางมีพื้นฐาน', 'มือตึงสายคุมเกมส์', 'มือปีศาจ'][s-1] || 'ไม่ระบุ';

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
  
  const PREVIEW_SLOTS = 6 + (state?.courtCount || 0); 
  const remainingSlotsForAuto = Math.max(0, PREVIEW_SLOTS - manualPreviews.length);
  
  const autoMatches = (globalPreview && availableWaitingView.length >= 4 && remainingSlotsForAuto > 0 && matchMode !== 'manual') ? getAutoNextMatches(availableWaitingView, remainingSlotsForAuto, matchMode, matchHistory) : [];
  
  const allPreviews = [...manualPreviews, ...autoMatches];
  const upNextPreviews = allPreviews.slice(availableCourts.length); 

  // 🌟 Initialization
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

  // 🌟 Notifications & Sounds
  const playAlertSound = () => { try { const audio = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock_2.ogg'); audio.play().catch(() => {}); } catch(e) {} };
  const addNotification = (title: string, body: string) => { setNotifyHistory(prev => [{ id: Date.now(), title, body, time: new Date().toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'}), isRead: false }, ...prev].slice(0, 50)); };

  useEffect(() => { if ('Notification' in window) setNotifyPerm(Notification.permission); }, []);

  const doPushSubscription = async (userId: string) => {
    if (!('Notification' in window)) return;
    try {
      const perm = Notification.permission;
      if (perm === 'granted') {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!) });
        await fetch('/api/webpush', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'subscribe', subscription, userId }) });
      }
    } catch(e) { console.error("Push Error", e); }
  }

  const requestNotify = async () => {
    if (!myProfile) return Toast.fire({ title: '⚠️ กรุณา Check in ก่อนเปิดแจ้งเตือน' });
    if (!('Notification' in window)) return Toast.fire({ title: '❌ เบราว์เซอร์ไม่รองรับแจ้งเตือน' });
    const perm = await Notification.requestPermission(); setNotifyPerm(perm);
    if (perm === 'granted') { try { await doPushSubscription(myProfile.id); Toast.fire({ title: '✅ เปิดระบบอนุญาตแจ้งเตือนสมบูรณ์!' }); refresh(false); } catch (error) { Toast.fire({ title: '⚠️ ไม่สามารถบันทึก Token ได้' }); } } 
    else { Toast.fire({ title: '⚠️ คุณปฏิเสธการแจ้งเตือน' }); }
  };

  const triggerNotification = async (title: string, body: string, vibratePattern: number[], targetTab?: 'home' | 'queue', skipOSPushIfGranted: boolean = false) => {
    if (enableSound) playAlertSound(); addNotification(title, body);
    try { if ('vibrate' in navigator && enableSound) navigator.vibrate(vibratePattern); } catch (e) {}
    if (!skipOSPushIfGranted && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(title, { body: body, icon: '/icon.png', badge: '/icon.png' });
        n.onclick = () => { window.focus(); if (targetTab) handleTabClick(targetTab); };
        setTimeout(() => n.close(), 8000); 
      } catch(e) { try { if ('serviceWorker' in navigator) { const reg = await navigator.serviceWorker.ready; reg.showNotification(title, { body, icon: '/icon.png', vibrate: vibratePattern, badge: '/icon.png' } as any); } } catch(swErr) {} }
    }
    if (capsuleTimeoutRef.current) clearTimeout(capsuleTimeoutRef.current);
    setCapsuleAlert({ title, body, visible: true, onClick: () => targetTab && handleTabClick(targetTab) });
    capsuleTimeoutRef.current = setTimeout(() => setCapsuleAlert(prev => ({...prev, visible: false})), 6000);
  };

  const notifiedStandby = useRef(false); const notifiedPlay = useRef(false);
  useEffect(() => { if (myWaitIndex === -1 || myWaitIndex >= 4) { notifiedStandby.current = false; } if (!amIPlaying) { notifiedPlay.current = false; } }, [myWaitIndex, amIPlaying]);

  useEffect(() => {
    if (!myProfile) return;
    if (myWaitIndex >= 0 && myWaitIndex < 4) {
      if (!notifiedStandby.current) { triggerNotification('🔥 เตรียมตัววอร์ม!', `คุณ ${myProfile.name} ใกล้ถึงคิวของคุณแล้ว (คิวที่ ${myWaitIndex + 1})`, [500, 200, 500], 'queue', false); notifiedStandby.current = true; }
    }
    if (amIPlaying && myActiveCourt) {
      if (!notifiedPlay.current) {
        let mate = '', opp1 = '', opp2 = '';
        if (myActiveCourt.p1Id === myProfile.id) { mate = myActiveCourt.p2Name; opp1 = myActiveCourt.p3Name; opp2 = myActiveCourt.p4Name; } else if (myActiveCourt.p2Id === myProfile.id) { mate = myActiveCourt.p1Name; opp1 = myActiveCourt.p3Name; opp2 = myActiveCourt.p4Name; } else if (myActiveCourt.p3Id === myProfile.id) { mate = myActiveCourt.p4Name; opp1 = myActiveCourt.p1Name; opp2 = myActiveCourt.p2Name; } else if (myActiveCourt.p4Id === myProfile.id) { mate = myActiveCourt.p3Name; opp1 = myActiveCourt.p1Name; opp2 = myActiveCourt.p2Name; }
        const msg = `คุณ ${myProfile.name} & ${mate} vs ${opp1} & ${opp2} ไปลุยกันเลยที่คอร์ท ${myActiveCourt.court} นะจร๊ะ`;
        triggerNotification('🏸 ถึงคิวคุณแล้ว!', msg, [500, 200, 500, 200, 1000, 200, 1000], 'home', false);
        notifiedPlay.current = true;
      }
    }
  }, [state, myProfile, amIPlaying, myActiveCourt, myWaitIndex]);

  // 🌟 Action Handlers
  const handleTabClick = (tab: any) => { setActiveTab(tab); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const toggleSelect = (pId: string) => { if(!admin) return; setSelected(prev => prev.includes(pId) ? prev.filter(x => x !== pId) : (prev.length >= 4 ? prev : [...prev, pId])); };
  const handleRejectPlayer = async (id: string) => { Swal.fire({ title: 'ปฏิเสธคำขอ?', text: "คำขอนี้จะถูกลบ", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' }).then(async r => { if(r.isConfirmed) { await fetch('/api/reject', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ id }) }); refresh(true); Toast.fire({ title: '🗑️ ปฏิเสธคำขอแล้ว' }); } }); }
  const togglePause = async (p: any) => { const isPaused = p.name.includes('(พัก)'); const newName = isPaused ? p.name.replace(' (พัก)', '') : p.name + ' (พัก)'; Swal.fire({title: 'กำลังอัปเดต...', toast: true, position: 'top', showConfirmButton: false, didOpen: () => Swal.showLoading()}); await fetch('/api/update-player', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ oldId: p.id, newId: p.id, name: newName, skill: p.skill }) }); await refresh(true); Swal.close(); Toast.fire({ title: isPaused ? '✅ กลับเข้าคิวปกติแล้ว' : '⏸️ พักคิวแล้ว' }); }
  
  const handleDragStart = (e: any, id: string) => { setDraggedPlayerId(id); e.dataTransfer.effectAllowed = 'move'; };
  const handleDrop = async (e: any, targetId: string) => {
    e.preventDefault(); if (!draggedPlayerId || draggedPlayerId === targetId) return;
    const waitList = [...(state?.waiting || [])]; const draggedIdx = waitList.findIndex(p => p.id === draggedPlayerId); const targetIdx = waitList.findIndex(p => p.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;
    const newWaitList = [...waitList]; const [movedItem] = newWaitList.splice(draggedIdx, 1); newWaitList.splice(targetIdx, 0, movedItem);
    setState(prev => prev ? {...prev, waiting: newWaitList} : prev);
    Swal.fire({title: 'กำลังสลับคิว...', toast: true, position: 'top', showConfirmButton: false});
    try { await fetch('/api/reorder', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ draggedId: draggedPlayerId, targetId }) }); await refresh(true); Toast.fire({ title: '✅ เลื่อนลำดับคิวสำเร็จ' }); } 
    catch(err) { Toast.fire({ title: '❌ เลื่อนคิวไม่สำเร็จ' }); } setDraggedPlayerId(null);
  };

  const handleApproveProcess = async (p: any) => {
    if (String(p.id).startsWith('G')) { await runApi('/api/approve', { id: p.id }, true); Toast.fire({ title: '✅ อนุมัติ Guest ลงคิวเรียบร้อย' }); return; }
    Swal.fire({title: 'กำลังตรวจสอบข้อมูล...', toast: true, position: 'top', showConfirmButton: false, didOpen: () => Swal.showLoading()});
    let isNewPlayer = !p.playCount || p.playCount === 0 || !p.timestamp;
    try { const res = await fetch(`/api/player?q=${p.id}`); const data = await res.json(); let playerList: any[] = []; if (Array.isArray(data)) playerList = data; else if (data.list && Array.isArray(data.list)) playerList = data.list; else if (data.data && Array.isArray(data.data)) playerList = data.data; else if (data.found && data.id) playerList = [data]; isNewPlayer = playerList.length === 0; } catch (e) {}
    Swal.close();
    if (isNewPlayer) {
      Swal.fire({
        title: 'ตรวจสอบโปรไฟล์สมาชิกใหม่',
        html: `<div class="flex flex-col gap-3 text-left mt-2"><div><label class="text-[10px] font-bold text-slate-500">Employee ID</label><input id="apId" value="${p.id}" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"></div><div><label class="text-[10px] font-bold text-slate-500">Display Name</label><input id="apName" value="${p.name}" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"></div><div><label class="text-[10px] font-bold text-slate-500">Skill Level</label><select id="apSkill" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"><option value="1" ${p.skill===1?'selected':''}>1 (มือใหม่)</option><option value="2" ${p.skill===2?'selected':''}>2 (เริ่มมีทรง)</option><option value="3" ${p.skill===3?'selected':''}>3 (พื้นฐาน)</option><option value="4" ${p.skill===4?'selected':''}>4 (สายคุม)</option><option value="5" ${p.skill===5?'selected':''}>5 (ปีศาจ)</option></select></div></div>`,
        showCancelButton: true, confirmButtonText: 'บันทึกและอนุมัติ', confirmButtonColor: '#2563eb',
        preConfirm: () => ({ oldId: p.id, newId: (document.getElementById('apId') as HTMLInputElement).value, name: (document.getElementById('apName') as HTMLInputElement).value, skill: Number((document.getElementById('apSkill') as HTMLSelectElement).value) })
      }).then(async r => { if(r.isConfirmed) { await fetch('/api/update-player', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(r.value) }); await runApi('/api/approve', { id: r.value.newId }, true); Toast.fire({ title: '✅ อนุมัติและเพิ่มเข้าคิวแล้ว' }); } });
    } else { await runApi('/api/approve', { id: p.id }, true); Toast.fire({ title: '✅ อนุมัติลงคิวเรียบร้อย' }); }
  }

  const handleBulkApprove = async () => {
    if(selectedPending.length === 0) return;
    Swal.fire({title: 'กำลังอนุมัติ...', toast: true, position: 'top', showConfirmButton: false, didOpen: () => Swal.showLoading()});
    await Promise.all(selectedPending.map(id => fetch('/api/approve', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ id }) })));
    setSelectedPending([]); refresh(true); Swal.close(); Toast.fire({ title: '✅ อนุมัติผู้เล่นทั้งหมดแล้ว' });
  }

  const openAdminEditPlayer = (p: any) => {
    Swal.fire({
      title: '✏️ แก้ไขข้อมูลผู้เล่น',
      html: `<div class="flex flex-col gap-3 text-left"><input type="hidden" id="editOldId" value="${p.id}"><div><label class="text-[10px] font-bold text-slate-500">Employee No.</label><input id="editId" value="${p.id}" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"></div><div><label class="text-[10px] font-bold text-slate-500">Display Name</label><input id="editName" value="${p.name}" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"></div><div><label class="text-[10px] font-bold text-slate-500">Skill</label><select id="editSkill" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"><option value="1" ${p.skill===1?'selected':''}>1</option><option value="2" ${p.skill===2?'selected':''}>2</option><option value="3" ${p.skill===3?'selected':''}>3</option><option value="4" ${p.skill===4?'selected':''}>4</option><option value="5" ${p.skill===5?'selected':''}>5</option></select></div></div>`,
      showCancelButton: true, confirmButtonText: 'Save',
      preConfirm: () => ({ oldId: p.id, newId: (document.getElementById('editId') as HTMLInputElement).value, name: (document.getElementById('editName') as HTMLInputElement).value, skill: Number((document.getElementById('editSkill') as HTMLSelectElement).value) })
    }).then(async r => { if(r.isConfirmed) { await fetch('/api/update-player', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(r.value) }); await refresh(true); Toast.fire({ title: '✅ บันทึกการแก้ไขแล้ว' }); } })
  }

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
    setManualPreviews(prev => [matchData, ...prev]); 
    setSelected([]); 
    Toast.fire({ title: '✅ จัดทีมแทรกเข้าคิวรอแล้ว (Up Next)!' });
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

  // == Modal Actions ==
  const openCheckIn = () => {
    Swal.fire({
      title: '📝 Check In',
      html: `<style>.swal2-container .swal2-popup { overflow: visible !important; padding-bottom: 2rem; }</style><div class="flex flex-col gap-4 text-left w-full relative"><input type="hidden" id="currentMode" value="search"><input type="hidden" id="hidId"><input type="hidden" id="hidName"><input type="hidden" id="hidSkill"><div class="flex p-1 bg-slate-100 rounded-lg shadow-inner gap-1"><button type="button" id="tabSearch" class="flex-1 py-2 text-[11px] font-bold rounded-md shadow-sm bg-white text-blue-600 transition-all">🔍 เข้าคิว (เคยมีข้อมูล)</button><button type="button" id="tabNew" class="flex-1 py-2 text-[11px] font-bold rounded-md text-slate-500 hover:text-slate-700 transition-all">✨ เข้าคิว (มาครั้งแรก)</button><button type="button" id="tabSync" class="flex-1 py-2 text-[11px] font-bold rounded-md text-red-500 hover:text-red-700 transition-all">🔄 กู้คืนโปรไฟล์</button></div><div id="secSearch" class="flex flex-col gap-2 min-h-[180px]"><label class="text-[10px] font-bold text-slate-500 block uppercase">ค้นหาด้วยชื่อ หรือ รหัสพนักงาน</label><div class="flex gap-2 relative"><input id="swSearch" class="w-full p-3 border border-blue-300 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400" placeholder="พิมพ์ชื่อ หรือรหัส..." autocomplete="off"><button id="swClearBtn" type="button" class="bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold px-3 rounded-lg shadow-sm hidden transition">✕</button></div><div id="swTableContainer" class="w-full bg-white border border-slate-200 shadow-sm rounded-lg hidden max-h-48 overflow-y-auto mt-1"></div><div id="searchSelectedPreview" class="hidden mt-2 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm text-sm"><div class="text-[10px] text-blue-500 font-black mb-2 tracking-widest uppercase">✅ เลือกผู้เล่นนี้แล้ว</div><div class="flex justify-between items-center bg-white p-2 rounded-lg shadow-sm"><div class="flex flex-col"><span id="previewName" class="font-bold text-slate-700 text-base"></span><span id="previewId" class="text-[10px] font-mono text-slate-400"></span></div><span id="previewSkill" class="bg-blue-600 text-white text-[10px] px-2.5 py-1 rounded-md font-bold shadow-sm"></span></div><p class="text-[10px] text-slate-500 mt-3 text-center">กดปุ่ม Check In ด้านล่างเพื่อเข้าคิวได้เลย</p></div></div><div id="secNew" class="hidden flex-col gap-3 min-h-[180px]"><label class="flex items-center gap-2 text-sm font-bold text-slate-600 bg-amber-50 border border-amber-200 p-3 rounded-lg cursor-pointer hover:bg-amber-100 transition shadow-sm"><input type="checkbox" id="swGuest" class="w-4 h-4 text-amber-600"> <span class="flex flex-col">Guest <span class="text-[10px] font-normal text-slate-500">ไม่มี ID พนักงาน ระบบจะสุ่มให้</span></span></label><div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1"><div><label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Employee No.</label><input id="swID" class="w-full p-2.5 border border-slate-300 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors" placeholder="e.g. 12345" value="${myProfile?.id && !myProfile.id.startsWith('G') ? myProfile.id : ''}"></div><div><label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Display Name</label><input id="swName" class="w-full p-2.5 border border-slate-300 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors" placeholder="Name" value="${myProfile?.name || ''}"></div></div><div class="mt-1"><label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Level (เลือกระดับฝีมือ)</label><select id="swSkill" class="w-full p-2.5 border border-slate-300 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors"><option value="1">1 (มือใหม่แกะกล่อง)</option><option value="2" selected>2 (มือใหม่เริ่มมีทรง)</option><option value="3">3 (มือกลาง มีพื้นฐาน)</option><option value="4">4 (มือตึง สายคุมเกมส์)</option><option value="5">5 (มือปีศาจ)</option></select></div></div><div id="secSync" class="hidden flex-col gap-2 min-h-[180px]"><div class="bg-red-50 border border-red-200 p-3 rounded-lg mb-2"><p class="text-xs text-red-600 font-bold mb-1">⚠️ ใช้กรณีไหน?</p><p class="text-[10px] text-red-500 leading-tight">ใช้เมื่อ <b>"มีชื่ออยู่ในคิวแล้ว"</b> แต่เผลอเคลียร์แคช หรือหน้าจอเปลี่ยนมือถือ ทำให้ระบบไม่จำหน้าโปรไฟล์คุณ (ไม่ต้องกดเข้าคิวใหม่ให้ซ้ำซ้อน)</p></div><div class="flex gap-2 relative"><input id="syncSearchInput" class="w-full p-3 border border-red-300 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-red-500 outline-none placeholder-slate-400" placeholder="🔍 ค้นหาชื่อเพื่อดึงโปรไฟล์กลับมา..." autocomplete="off"></div><div id="syncTableContainer" class="w-full bg-white border border-slate-200 shadow-sm rounded-lg hidden max-h-48 overflow-y-auto mt-1"></div></div></div>`,
      didOpen: () => {
        const currentMode = document.getElementById('currentMode') as HTMLInputElement;
        const tabSearch = document.getElementById('tabSearch') as HTMLButtonElement; const tabNew = document.getElementById('tabNew') as HTMLButtonElement; const tabSync = document.getElementById('tabSync') as HTMLButtonElement;
        const secSearch = document.getElementById('secSearch') as HTMLDivElement; const secNew = document.getElementById('secNew') as HTMLDivElement; const secSync = document.getElementById('secSync') as HTMLDivElement;

        const switchTab = (mode: string) => {
          currentMode.value = mode;
          tabSearch.className = mode === 'search' ? 'flex-1 py-2 text-[11px] font-bold rounded-md shadow-sm bg-white text-blue-600 transition-all' : 'flex-1 py-2 text-[11px] font-bold rounded-md text-slate-500 hover:text-slate-700 transition-all bg-transparent shadow-none';
          tabNew.className = mode === 'new' ? 'flex-1 py-2 text-[11px] font-bold rounded-md shadow-sm bg-white text-blue-600 transition-all' : 'flex-1 py-2 text-[11px] font-bold rounded-md text-slate-500 hover:text-slate-700 transition-all bg-transparent shadow-none';
          tabSync.className = mode === 'sync' ? 'flex-1 py-2 text-[11px] font-bold rounded-md shadow-sm bg-red-500 text-white transition-all' : 'flex-1 py-2 text-[11px] font-bold rounded-md text-red-500 hover:text-red-700 transition-all bg-transparent shadow-none';
          secSearch.classList.toggle('hidden', mode !== 'search'); secSearch.classList.toggle('flex', mode === 'search');
          secNew.classList.toggle('hidden', mode !== 'new'); secNew.classList.toggle('flex', mode === 'new');
          secSync.classList.toggle('hidden', mode !== 'sync'); secSync.classList.toggle('flex', mode === 'sync');
        };
        tabSearch.onclick = () => switchTab('search'); tabNew.onclick = () => switchTab('new'); tabSync.onclick = () => switchTab('sync');

        const swSearch = document.getElementById('swSearch') as HTMLInputElement; const swTableContainer = document.getElementById('swTableContainer') as HTMLDivElement; const swClearBtn = document.getElementById('swClearBtn') as HTMLButtonElement; const searchSelectedPreview = document.getElementById('searchSelectedPreview') as HTMLDivElement;
        const hidId = document.getElementById('hidId') as HTMLInputElement; const hidName = document.getElementById('hidName') as HTMLInputElement; const hidSkill = document.getElementById('hidSkill') as HTMLInputElement;

        const lockFields = (p: any) => {
           hidId.value = p.id; hidName.value = p.name; hidSkill.value = p.skill;
           document.getElementById('previewId')!.textContent = 'ID: ' + p.id; document.getElementById('previewName')!.textContent = p.name; document.getElementById('previewSkill')!.textContent = 'Lv ' + p.skill;
           searchSelectedPreview.classList.remove('hidden'); swSearch.classList.add('hidden'); swTableContainer.classList.add('hidden'); swClearBtn.classList.remove('hidden');
        };
        const unlockFields = () => {
           hidId.value = ''; hidName.value = ''; hidSkill.value = '';
           searchSelectedPreview.classList.add('hidden'); swSearch.classList.remove('hidden'); swSearch.value = ''; swClearBtn.classList.add('hidden'); swTableContainer.innerHTML = ''; swSearch.focus();
        };
        swClearBtn.addEventListener('click', unlockFields);

        let timeout: any;
        swSearch.addEventListener('input', () => {
          clearTimeout(timeout); swTableContainer.innerHTML = '';
          if(swSearch.value.length < 2) { swTableContainer.classList.add('hidden'); return; }
          timeout = setTimeout(async () => {
            try {
              const res = await fetch(`/api/player?q=${swSearch.value}`); const data = await res.json();
              let playerList = []; if (Array.isArray(data)) playerList = data; else if (data.list) playerList = data.list; else if (data.data) playerList = data.data; else if (data.found) playerList = [data];
              const seen = new Set(); const uniquePlayers: any[] = [];
              playerList.forEach((p: any) => { if (p.id && !seen.has(p.id)) { seen.add(p.id); uniquePlayers.push(p); } }); playerList = uniquePlayers;
              swTableContainer.classList.remove('hidden');
              if(playerList.length > 0) {
                const table = document.createElement('table'); table.className = 'w-full text-left text-xs';
                table.innerHTML = '<thead class="bg-slate-100 sticky top-0"><tr><th class="p-2">ID</th><th class="p-2">Name</th><th class="p-2 text-center">Lv</th><th class="p-2 text-center">Action</th></tr></thead>';
                const tbody = document.createElement('tbody');
                playerList.forEach((p: any) => {
                  const tr = document.createElement('tr'); tr.className = 'border-b border-slate-100 hover:bg-blue-50 transition-colors cursor-pointer'; tr.onmousedown = (e) => { e.preventDefault(); lockFields(p); };
                  const tdId = document.createElement('td'); tdId.className = 'p-2 font-bold text-blue-600'; tdId.textContent = p.id;
                  const tdName = document.createElement('td'); tdName.className = 'p-2 font-medium'; tdName.textContent = p.name;
                  const tdLv = document.createElement('td'); tdLv.className = 'p-2 text-center'; tdLv.innerHTML = `<span class="bg-slate-200 px-1.5 py-0.5 rounded shadow-inner font-bold">${p.skill}</span>`;
                  const tdAction = document.createElement('td'); tdAction.className = 'p-2 text-center';
                  const btn = document.createElement('button'); btn.className = 'bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded shadow-sm font-bold transition-transform'; btn.textContent = 'Select';
                  tdAction.appendChild(btn); tr.append(tdId, tdName, tdLv, tdAction); tbody.appendChild(tr);
                });
                table.appendChild(tbody); swTableContainer.appendChild(table);
              } else { swTableContainer.innerHTML = '<div class="p-4 text-center text-slate-400 text-xs">ไม่พบข้อมูลผู้เล่น</div>'; }
            } catch (e) {}
          }, 300);
        });

        const swGuest = document.getElementById('swGuest') as HTMLInputElement; const swID = document.getElementById('swID') as HTMLInputElement;
        swGuest.addEventListener('change', (e) => { const isGuest = (e.target as HTMLInputElement).checked; swID.disabled = isGuest; if(isGuest) { swID.classList.add('bg-slate-100', 'cursor-not-allowed', 'opacity-50'); swID.value = ''; } else { swID.classList.remove('bg-slate-100', 'cursor-not-allowed', 'opacity-50'); } });

        const syncSearchInput = document.getElementById('syncSearchInput') as HTMLInputElement; const syncTableContainer = document.getElementById('syncTableContainer') as HTMLDivElement;
        let syncTimeout: any;
        syncSearchInput.addEventListener('input', () => {
          clearTimeout(syncTimeout); syncTableContainer.innerHTML = '';
          if(syncSearchInput.value.length < 2) { syncTableContainer.classList.add('hidden'); return; }
          syncTimeout = setTimeout(async () => {
            try {
              const res = await fetch(`/api/player?q=${syncSearchInput.value}`); const data = await res.json();
              let playerList = []; if (Array.isArray(data)) playerList = data; else if (data.list) playerList = data.list; else if (data.data) playerList = data.data; else if (data.found) playerList = [data];
              const seen = new Set(); const uniquePlayers: any[] = [];
              playerList.forEach((p: any) => { if (p.id && !seen.has(p.id)) { seen.add(p.id); uniquePlayers.push(p); } }); playerList = uniquePlayers;
              syncTableContainer.classList.remove('hidden');
              if(playerList.length > 0) {
                const table = document.createElement('table'); table.className = 'w-full text-left text-xs';
                table.innerHTML = '<thead class="bg-red-100 sticky top-0 text-red-800"><tr><th class="p-2">Name</th><th class="p-2 text-center">Action</th></tr></thead>';
                const tbody = document.createElement('tbody');
                playerList.forEach((p: any) => {
                  const tr = document.createElement('tr'); tr.className = 'border-b border-slate-100 hover:bg-red-50 transition-colors';
                  const tdName = document.createElement('td'); tdName.className = 'p-2 font-bold text-slate-700'; tdName.textContent = p.name;
                  const tdAction = document.createElement('td'); tdAction.className = 'p-2 text-center';
                  const btn = document.createElement('button'); btn.className = 'bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow-sm font-bold transition-transform'; btn.textContent = 'Sync Device';
                  btn.onclick = async (e) => {
                    e.preventDefault(); const profileData = { id: p.id, name: p.name };
                    localStorage.setItem('myProfile', JSON.stringify(profileData)); localStorage.setItem('myProfileSkill', p.skill.toString()); setMyProfile(profileData);
                    if ('Notification' in window && Notification.permission === 'default') { const perm = await Notification.requestPermission(); setNotifyPerm(perm); if(perm === 'granted') await doPushSubscription(profileData.id); } else if ('Notification' in window && Notification.permission === 'granted') { await doPushSubscription(profileData.id); }
                    Swal.close(); Toast.fire({ title: '✅ กู้คืนโปรไฟล์สำเร็จ!' }); setTimeout(() => window.location.reload(), 1000);
                  };
                  tdAction.appendChild(btn); tr.append(tdName, tdAction); tbody.appendChild(tr);
                });
                table.appendChild(tbody); syncTableContainer.appendChild(table);
              } else { syncTableContainer.innerHTML = '<div class="p-4 text-center text-slate-400 text-xs">ไม่พบข้อมูล</div>'; }
            } catch (e) {}
          }, 300);
        });
      },
      showCancelButton: true, confirmButtonText: 'Check In', confirmButtonColor: '#2563eb',
      preConfirm: async () => {
        const mode = (document.getElementById('currentMode') as HTMLInputElement).value;
        if (mode === 'sync') { Swal.showValidationMessage('กรุณากดปุ่ม Sync Device ที่รายชื่อของคุณ'); return false; } 
        else if (mode === 'search') {
            const id = (document.getElementById('hidId') as HTMLInputElement).value; const name = (document.getElementById('hidName') as HTMLInputElement).value; const skill = (document.getElementById('hidSkill') as HTMLInputElement).value;
            if (!id) { Swal.showValidationMessage('กรุณาเลือกรายชื่อผู้เล่นก่อน'); return false; } return { id, name, skill: Number(skill), isGuest: false };
        } else {
            const swGuest = document.getElementById('swGuest') as HTMLInputElement; let idVal = (document.getElementById('swID') as HTMLInputElement).value.trim(); const nameVal = (document.getElementById('swName') as HTMLInputElement).value.trim(); const swSkill = document.getElementById('swSkill') as HTMLSelectElement; const isGuest = swGuest.checked;
            if(!isGuest && !idVal) { Swal.showValidationMessage('กรุณากรอกรหัสพนักงาน หรือเลือกเป็น Guest'); return false; } if(!nameVal) { Swal.showValidationMessage('กรุณากรอกชื่อเล่นที่ต้องการแสดง'); return false; }
            return { id: isGuest ? undefined : idVal, name: nameVal, skill: Number(swSkill.value), isGuest }
        }
      }
    }).then(async (r) => {
      if(r.isConfirmed && r.value) {
        const res = await runApi('/api/checkin', r.value, false);
        if(res && (res.ok || res.status === 'success')) {
          const newProfile = { id: r.value.id || res.generatedId || 'Guest', name: r.value.name };
          localStorage.setItem('myProfile', JSON.stringify(newProfile)); localStorage.setItem('myProfileSkill', r.value.skill.toString()); setMyProfile(newProfile);
          if ('Notification' in window && Notification.permission === 'default') { const perm = await Notification.requestPermission(); setNotifyPerm(perm); if (perm === 'granted') await doPushSubscription(newProfile.id); } else if ('Notification' in window && Notification.permission === 'granted') { await doPushSubscription(newProfile.id); }
          setActiveTab('home'); Toast.fire({ title: '✅ Checked in! Wait for approval.' }); setTimeout(() => window.location.reload(), 1500);
        } else { Toast.fire({ title: `❌ ${res?.message || 'Error checking in'}` }); }
      }
    });
  }

  const openSignOut = () => { Swal.fire({ title: '👋 Sign Out', html: `<div class="text-left text-sm mb-2 text-slate-500 font-bold uppercase tracking-widest">Search your name or ID:</div><input id="soSearch" class="w-full p-2 border border-slate-300 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-red-500 outline-none" placeholder="Name or ID" value="${myProfile?.id && !myProfile.id.startsWith('G') ? myProfile.id : myProfile?.name || ''}">`, showCancelButton: true, confirmButtonText: 'Sign Out', confirmButtonColor: '#ef4444', preConfirm: async () => { const val = (document.getElementById('soSearch') as HTMLInputElement).value; if(!val) return Swal.showValidationMessage('Please enter Name or ID'); return { id: val } } }).then(async (r) => { if(r.isConfirmed) { Toast.fire({ title: 'ℹ️ Signing out...' }); fetch('/api/checkout', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(r.value) }).then(() => refresh(false)); localStorage.removeItem('myProfile'); setMyProfile(null); Toast.fire({ title: '✅ Signed Out Successfully' }); setTimeout(() => window.location.reload(), 1500); } }) }
  const openAddMember = () => { Swal.fire({ title: '➕ เพิ่มสมาชิกเข้าคิวทันที', html: `<div class="flex flex-col gap-3 text-left"><div><label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Employee No.</label><input id="amID" class="w-full p-2.5 border border-slate-300 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="12345"></div><div><label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Display Name</label><input id="amName" class="w-full p-2.5 border border-slate-300 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Name"></div><div><label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Skill Level</label><select id="amSkill" class="w-full p-2.5 border border-slate-300 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none"><option value="1">1 (มือใหม่แกะกล่อง)</option><option value="2" selected>2 (มือใหม่เริ่มมีทรง)</option><option value="3">3 (มือกลาง มีพื้นฐาน)</option><option value="4">4 (มือตึง สายคุมเกมส์)</option><option value="5">5 (มือปีศาจ "ยอดมนุษย์ดาวแบด")</option></select></div></div>`, showCancelButton: true, confirmButtonText: 'Add to Queue', confirmButtonColor: '#2563eb', preConfirm: () => { let id = (document.getElementById('amID') as HTMLInputElement).value.trim(); const name = (document.getElementById('amName') as HTMLInputElement).value.trim(); if(!id) { Swal.showValidationMessage('Enter Employee No.'); return false; } if(!name) { Swal.showValidationMessage('Enter Name'); return false; } return { id, name, skill: Number((document.getElementById('amSkill') as HTMLSelectElement).value), isGuest: false } } }).then(async (r) => { if(r.isConfirmed) { const res = await runApi('/api/checkin', r.value, false); if(res && (res.ok || res.status === 'success')) { await runApi('/api/approve', { id: r.value.id }, false); Toast.fire({ title: '✅ เพิ่มสมาชิกและอนุมัติลงคิวแล้ว!' }); } else Toast.fire({ title: `❌ ${res?.message || 'Error'}` }); } }); }
  const openBroadcastModal = () => { const defaultDate = new Date(); defaultDate.setMonth(defaultDate.getMonth() - 1); Swal.fire({ title: '📢 ส่งแจ้งเตือนกลุ่ม (Broadcast)', html: `<div class="flex flex-col gap-3 text-left"><div><label class="text-[10px] font-bold text-slate-500 uppercase">วันที่เริ่มดึงข้อมูล</label><input type="date" id="bcDate" value="${defaultDate.toISOString().split('T')[0]}" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"></div><div><label class="text-[10px] font-bold text-slate-500 uppercase">หัวข้อการแจ้งเตือน</label><input type="text" id="bcTitle" placeholder="เช่น ประกาศสำคัญจากคลับ" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"></div><div><label class="text-[10px] font-bold text-slate-500 uppercase">เนื้อหาการแจ้งเตือน</label><textarea id="bcMessage" rows="3" placeholder="พิมพ์ข้อความที่ต้องการส่ง..." class="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"></textarea></div></div>`, showCancelButton: true, confirmButtonText: 'ส่งการแจ้งเตือน', confirmButtonColor: '#2563eb', preConfirm: () => { const date = (document.getElementById('bcDate') as HTMLInputElement).value; const title = (document.getElementById('bcTitle') as HTMLInputElement).value.trim(); const message = (document.getElementById('bcMessage') as HTMLTextAreaElement).value.trim(); if (!title) { Swal.showValidationMessage('กรุณาใส่หัวข้อ'); return false; } if (!message) { Swal.showValidationMessage('กรุณาใส่เนื้อหา'); return false; } return { date, title, message }; } }).then(async (r) => { if (r.isConfirmed) { Swal.fire({ title: 'กำลังสั่งรัน Broadcast...', allowOutsideClick: false, didOpen: () => Swal.showLoading() }); try { const res = await fetch('/api/webpush', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'broadcast', date: r.value.date, title: r.value.title, message: r.value.message }) }); const data = await res.json(); if (!res.ok) Swal.fire('ไม่พบข้อมูล', data.error || 'ไม่พบผู้ลงทะเบียนในช่วงเวลานี้', 'info'); else { Swal.close(); Toast.fire({ title: `✅ ยิงแจ้งเตือนถึงอุปกรณ์ ${data.count} จากทั้งหมด ${data.total} เครื่อง` }); } } catch (e: any) { Swal.fire('❌ ผิดพลาด', e.message, 'error'); } } }); }
  const showDailyReportMenu = () => { const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 10); Swal.fire({ title: '📊 Daily Report', html: `<div class="mb-4 text-left"><label class="text-xs font-bold text-slate-500 block mb-1">Select Date:</label><input type="date" id="reportDate" value="${today}" class="w-full p-2.5 border border-slate-300 rounded-lg shadow-inner text-sm outline-none focus:ring-2 focus:ring-blue-500"></div><div id="reportContent" class="text-center py-4 text-slate-400">Loading...</div>`, showConfirmButton: false, showCloseButton: true, didOpen: async () => { const fetchReport = async (date: string) => { document.getElementById('reportContent')!.innerHTML = '<div class="py-5 text-blue-500 font-bold animate-pulse">⏳ Fetching data...</div>'; try { const res = await fetch(`/api/report?date=${date}`); if (!res.ok) throw new Error('API failed'); const data = await res.json(); if (data.error) throw new Error(data.error); let csvData = '\uFEFFTime,ID,Name,Action\n'; (data.tableData || []).forEach((row: any) => { csvData += `"${row.time}","${row.id || '-'}","${row.name}","${row.action}"\n`; }); const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); let tableHtml = `<div class="max-h-48 overflow-y-auto text-xs mt-4 border rounded-xl shadow-inner"><table class="w-full text-left"><thead class="bg-slate-100 sticky top-0 shadow-sm text-slate-600"><tr><th class="p-3">Time</th><th class="p-3">ID</th><th class="p-3">Name</th><th class="p-3">Action</th></tr></thead><tbody>`; (data.tableData || []).forEach((row: any) => { tableHtml += `<tr class="border-t border-slate-100 hover:bg-slate-50"><td class="p-2.5 text-slate-500">${row.time}</td><td class="p-2.5 font-mono text-slate-400">${row.id||'-'}</td><td class="p-2.5 font-bold text-slate-700">${row.name}</td><td class="p-2.5 text-blue-600">${row.action}</td></tr>`; }); tableHtml += `</tbody></table></div>`; document.getElementById('reportContent')!.innerHTML = `<div class="grid grid-cols-2 gap-4"><div class="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm"><div class="text-3xl font-black text-blue-600">${data.totalMatches || 0}</div><div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Matches</div></div><div class="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm"><div class="text-3xl font-black text-green-600">${data.totalPlayers || 0}</div><div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Players</div></div></div>${tableHtml}<a href="${url}" download="badminton_report_${date}.csv" class="w-full mt-4 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-sm font-bold shadow-md transition active:scale-95"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Download CSV</a>`; } catch (e) { document.getElementById('reportContent')!.innerHTML = '<div class="py-5 text-red-500 font-bold">❌ Error loading report</div>'; } }; const dateInput = document.getElementById('reportDate') as HTMLInputElement; dateInput.addEventListener('change', (e) => fetchReport((e.target as HTMLInputElement).value)); await fetchReport(today); } }); }
  const exportRegisteredToday = () => { const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 10); Swal.fire({ title: '📋 ผู้ลงทะเบียนรายวัน', html: `<div class="mb-4 text-left"><label class="text-xs font-bold text-slate-500 block mb-1">เลือกวันที่:</label><input type="date" id="regDate" value="${today}" class="w-full p-2.5 border border-slate-300 rounded-lg shadow-inner text-sm outline-none focus:ring-2 focus:ring-blue-500"></div><div id="regContent" class="text-center py-4 text-slate-400">Loading...</div>`, showConfirmButton: false, showCloseButton: true, didOpen: async () => { const fetchRegReport = async (date: string) => { document.getElementById('regContent')!.innerHTML = '<div class="py-5 text-blue-500 font-bold animate-pulse">⏳ Fetching data...</div>'; try { const res = await fetch('/api/player'); const data = await res.json(); const list = Array.isArray(data) ? data : (data.list || data.data || []); const targetList = list.filter((p: any) => p.timestamp && p.timestamp.startsWith(date)); let csv = '\uFEFFEmployee ID,Name,Skill,Type,Timestamp\n'; let tableHtml = `<div class="max-h-48 overflow-y-auto text-xs mt-4 border rounded-xl shadow-inner"><table class="w-full text-left"><thead class="bg-slate-100 sticky top-0 shadow-sm text-slate-600"><tr><th class="p-3">ID</th><th class="p-3">Name</th><th class="p-3 text-center">Lv</th><th class="p-3">Time</th></tr></thead><tbody>`; targetList.forEach((p: any) => { const timeStr = new Date(p.timestamp).toLocaleTimeString('th-TH'); csv += `"${p.id}","${p.name}","${p.skill}","${p.type || 'Emp'}","${timeStr}"\n`; tableHtml += `<tr class="border-t border-slate-100 hover:bg-slate-50"><td class="p-2.5 font-mono text-slate-500">${p.id}</td><td class="p-2.5 font-bold text-slate-700">${p.name}</td><td class="p-2.5 text-center"><span class="bg-slate-200 px-2 py-0.5 rounded-md font-bold">${p.skill}</span></td><td class="p-2.5 text-slate-500">${timeStr}</td></tr>`; }); tableHtml += `</tbody></table></div>`; const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); document.getElementById('regContent')!.innerHTML = `<div class="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 shadow-sm mb-3 text-left flex justify-between items-center"><div><div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registered Players</div><div class="text-3xl font-black text-indigo-600 leading-none mt-1">${targetList.length} <span class="text-sm">คน</span></div></div></div>${tableHtml}<a href="${url}" download="registered_players_${date}.csv" class="w-full mt-4 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-sm font-bold shadow-md transition active:scale-95"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Download CSV</a>`; } catch(e) { document.getElementById('regContent')!.innerHTML = '<div class="py-5 text-red-500 font-bold">❌ Error loading report</div>'; } }; const dateInput = document.getElementById('regDate') as HTMLInputElement; dateInput.addEventListener('change', (e) => fetchRegReport((e.target as HTMLInputElement).value)); await fetchRegReport(today); } }); }
  const showAnalyticsMenu = () => window.open('/analytics', '_blank');
  const auth = async () => { const pin = prompt('Enter Admin PIN:'); if(!pin) return; const res = await fetch('/api/config', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ action:'auth', pin })}); const d = await res.json(); if(d.ok) { localStorage.setItem('adminAuth','true'); setAdmin(true); Toast.fire({ title: '✅ Welcome Admin' }); } else Toast.fire({ title: '❌ Incorrect PIN' }); }
  const logout = () => { localStorage.removeItem('adminAuth'); setAdmin(false); Toast.fire({ title: 'ℹ️ Logged Out' }); setTimeout(() => window.location.reload(), 1500); }
  const openCourtManager = () => setIsCourtManagerOpen(true);
  const handleAddCourt = async () => { if (!newCourtName.trim()) return; const currentCourts = [...(state?.courtNames || []), newCourtName.trim()]; await fetch('/api/config', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({action:'set', key:'Courts', value:currentCourts.join(',')}) }); setNewCourtName(''); refresh(false); Toast.fire({ title: '✅ เพิ่มคอร์ทแล้ว' }); }
  const handleRemoveCourt = async (courtToRemove: string) => { const currentCourts = (state?.courtNames || []).filter((c:any) => c !== courtToRemove); await fetch('/api/config', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({action:'set', key:'Courts', value:currentCourts.join(',')}) }); refresh(false); Toast.fire({ title: '🗑️ ลบคอร์ทแล้ว' }); }
  const resetDay = () => { Swal.fire({ title: 'Reset Entire Day?', text: "This will clear all active courts, queues, and memory.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Yes, Reset!' }).then(async r => { if(r.isConfirmed) { localStorage.removeItem('localMatchHistory'); setMatchHistory([]); await runApi('/api/reset-day', {}); Toast.fire({ title: '✅ System Reset Complete' }); } }) }
  const savePlayTime = async () => { Toast.fire({ title: 'ℹ️ Saving Time...' }); await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set', key: 'PlayStartTime', value: playStartTime }) }); await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set', key: 'PlayEndTime', value: playEndTime }) }); Toast.fire({ title: '✅ Play Time Saved' }); refresh(false); }
  const clearBrowserData = () => { Swal.fire({ title: '🧹 ล้างข้อมูลเบราว์เซอร์?', text: 'จะลบโปรไฟล์ ประวัติ และการตั้งค่าทั้งหมดบนเครื่องนี้', icon: 'warning', showCancelButton: true, confirmButtonText: 'ใช่, ล้างข้อมูล!', confirmButtonColor: '#ef4444', preConfirm: () => { const adminAuth = localStorage.getItem('adminAuth'); const soundSett = localStorage.getItem('enableSound'); localStorage.clear(); sessionStorage.clear(); if (adminAuth) localStorage.setItem('adminAuth', adminAuth); if (soundSett) localStorage.setItem('enableSound', soundSett); setMyProfile(null); setSelected([]); setTheme('light'); setMatchHistory([]); setManualPreviews([]); document.documentElement.classList.remove('dark'); Toast.fire({ title: '✅ ล้างข้อมูลสำเร็จ เริ่มต้นใหม่...' }); setTimeout(() => window.location.reload(), 1500); } }); }

  // =====================================
  // 🌟 รวม PROPS ให้ถูกต้อง 100% 
  // =====================================
  const tabProps = {
     state, admin, myProfile, queueSubTab, setQueueSubTab, searchQueue, setSearchQueue, searchPending, setSearchPending, selected, toggleSelect,
     selectedPending, setSelectedPending, handleApproveProcess, handleBulkApprove, handleMatchSelected, handleRejectPlayer, togglePause, openAdminEditPlayer, handleDragStart, handleDrop, draggedPlayerId, getSkillColor,
     loadingCourts, setLoadingCourts, allPreviews, availableCourts, upNextPreviews, manualPreviews, autoMatches, avgMatchDuration, confirmSpecificMatch, rejectPreviewMatch, finish: async(c:string)=>{ setLoadingCourts([...loadingCourts, c]); await fetch('/api/finish', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({court:c})}); refresh(true); setLoadingCourts(prev=>prev.filter(court=>court!==c)); },
     myWaitIndex, amIPlaying, myPending, getMySkillLevel, getSkillName, estWaitMins, showNav,
     notifyHistory, setNotifyHistory, notifyPerm, requestNotify, triggerNotification,
     realPlayCount, realPlayTime, openSignOut, myPlayHistory, auth, logout, refresh,
     globalPreview, setGlobalPreview, enableSound, setEnableSound, playStartTime, setPlayStartTime, playEndTime, setPlayEndTime, savePlayTime,
     matchMode, setMatchMode, executeAutoMatch: async()=>{}, openBroadcastModal, openAddMember, openCourtManager, setFullscreen,
     exportRegisteredToday, showAnalyticsMenu, showDailyReportMenu, resetDay, clearBrowserData, APP_VERSION, openCheckIn
  };

  if (isLoading && !state) return (<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950"><div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>)

  return (
    <div className={`min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans pb-24 transition-all duration-300 pt-16`}>
      {showInstallBanner && (
        <div className="fixed top-20 left-4 right-4 z-[90] bg-blue-600 text-white p-4 rounded-2xl shadow-2xl flex flex-col items-start gap-2 animate-in slide-in-from-top-4">
           <div className="flex justify-between w-full"><h4 className="font-black flex items-center gap-2"><DownloadCloud className="w-5 h-5"/> ติดตั้งแอป Badminton Club</h4><button onClick={()=>setShowInstallBanner(false)} className="text-blue-200 hover:text-white"><X className="w-5 h-5"/></button></div>
           <button onClick={handleInstallPWA} className="w-full mt-2 bg-white text-blue-700 font-bold py-2 rounded-xl text-sm shadow-md active:scale-95 transition">Add to Home Screen</button>
        </div>
      )}

      <nav className={`fixed top-0 w-full bg-white/90 dark:bg-slate-900/90 border-b border-gray-200 dark:border-slate-800 px-4 py-3 backdrop-blur-lg z-50 shadow-sm transition-transform duration-300 ${showNav ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3"><img src="/icon.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-sm bg-white" /><h1 className="font-black text-sm dark:text-white tracking-tight">Badminton Club</h1></div>
            <div className="flex items-center gap-3"><button onClick={()=>setFullscreen(true)} className="text-slate-400 hover:text-blue-500 transition"><Monitor className="w-5 h-5"/></button></div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 w-full h-full relative">
        {activeTab === 'home' && <HomeTab {...tabProps} />}
        {activeTab === 'queue' && <QueueTab {...tabProps} />}
        {activeTab === 'notifications' && <AlertsTab {...tabProps} />}
        {activeTab === 'profile' && <ProfileTab {...tabProps} />}
      </div>

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