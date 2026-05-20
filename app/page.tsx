'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import Swal from 'sweetalert2'
import type { AppState, WaitingPlayer as Player } from '@/lib/types'
import { balanceTeams, extractBestMatch, MatchHistory } from '@/utils/matchmaking'
import {
  Home as HomeIcon,
  Users,
  Bell,
  User,
  Sun,
  Moon,
  Monitor,
  Trash2,
  Settings,
  Edit3,
  X,
  Plus,
  Download,
  MapPin,
  AlertCircle,
} from 'lucide-react'

import HomeTab from '@/components/tabs/HomeTab'
import QueueTab from '@/components/tabs/QueueTab'
import AlertsTab from '@/components/tabs/AlertsTab'
import ProfileTab from '@/components/tabs/ProfileTab'
import FocusMode from '@/components/tabs/FocusMode'

const APP_VERSION = "2.3.4";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
};

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
  }
});

export default function Home() {
  const [state, setState] = useState<AppState | null>(null)
  const [admin, setAdmin] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [fullscreen, setFullscreen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [isLoading, setIsLoading] = useState(true)
  const [loadingCourts, setLoadingCourts] = useState<string[]>([])

  const [myProfile, setMyProfile] = useState<{ id: string, name: string } | null>(null)
  const [searchPending, setSearchPending] = useState('')
  const [searchQueue, setSearchQueue] = useState('')
  const [selectedPending, setSelectedPending] = useState<string[]>([])
  const [matchMode, setMatchMode] = useState<'smart' | 'balanced' | 'random' | 'skill-gap' | 'similar-skill' | 'manual'>('smart');
  const [globalPreview, setGlobalPreview] = useState(true);
  const [playStartTime, setPlayStartTime] = useState('20:00');
  const [playEndTime, setPlayEndTime] = useState('22:30');
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [manualPreviews, setManualPreviews] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'home' | 'queue' | 'notifications' | 'profile'>('home');
  const [queueSubTab, setQueueSubTab] = useState<'waiting' | 'pending'>('waiting');
  const [showNav, setShowNav] = useState(true);
  const lastScrollY = useRef(0);
  const [notifyHistory, setNotifyHistory] = useState<{ id: number, title: string, body: string, time: string, isRead: boolean }[]>([]);
  const [myPlayHistory, setMyPlayHistory] = useState<any[]>([]);

  const [capsuleAlert, setCapsuleAlert] = useState<{ title: string, body: string, visible: boolean, onClick?: () => void }>({ title: '', body: '', visible: false });

  const [isCourtManagerOpen, setIsCourtManagerOpen] = useState(false);
  const [newCourtName, setNewCourtName] = useState('');

  const wakeLockRef = useRef<any>(null);
  const [isAwake, setIsAwake] = useState(false);
  const [notifyPerm, setNotifyPerm] = useState<string>('default');

  const activeWaiting = (state?.waiting || []).filter(p => !p.name.includes('(พัก)'));
  const myWaitIndex = activeWaiting.findIndex(p => p.id === myProfile?.id);
  const myPending = state?.pending?.find(p => p.id === myProfile?.id);
  const myQueueData = state?.waiting?.find(p => p.id === myProfile?.id);

  const myActiveCourt = state?.playing?.find(c =>
    c.p1Id === myProfile?.id ||
    c.p2Id === myProfile?.id ||
    c.p3Id === myProfile?.id ||
    c.p4Id === myProfile?.id
  );
  const amIPlaying = !!myActiveCourt;
  const playDurationMs = myActiveCourt ? Date.now() - new Date(myActiveCourt.startTime).getTime() : 0;

  const courtsCount = state?.courtCount && state.courtCount > 0 ? state.courtCount : 1;
  const avgMatchDuration = state?.avgMatchDuration && state.avgMatchDuration > 0 ? state.avgMatchDuration : 15;
  const [pausedIds, setPausedIds] = useState<string[]>([]);

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

    const timeline = courtRemaining.sort((a, b) => a - b);
    let estimatedFinish = 0;

    for (let i = 0; i < groupsToCollect; i++) {
      const nextAvailable = timeline.shift() ?? 0;
      const finishTime = nextAvailable + avgMatchDuration;
      timeline.push(finishTime);
      timeline.sort((a, b) => a - b);
      if (i === groupsToCollect - 1) estimatedFinish = finishTime;
    }
    return Math.max(1, Math.ceil(estimatedFinish));
  })();

  const getSkillColor = (skill: number | undefined) => {
    switch (skill) {
      case 1: return 'bg-slate-400 text-white border-slate-500';
      case 2: return 'bg-green-500 text-white border-green-600';
      case 3: return 'bg-blue-500 text-white border-blue-600';
      case 4: return 'bg-red-500 text-white border-red-600';
      case 5: return 'bg-purple-600 text-white border-purple-700';
      default: return 'bg-slate-300 text-slate-700 border-slate-400';
    }
  }

  const getMySkillLevel = () => {
    if (myQueueData) return myQueueData.skill;
    if (myPending) return myPending.skill;
    if (myActiveCourt) {
      if (myActiveCourt.p1Id === myProfile?.id) return myActiveCourt.p1Skill;
      if (myActiveCourt.p2Id === myProfile?.id) return myActiveCourt.p2Skill;
      if (myActiveCourt.p3Id === myProfile?.id) return myActiveCourt.p3Skill;
      if (myActiveCourt.p4Id === myProfile?.id) return myActiveCourt.p4Skill;
    }
    const stored = localStorage.getItem('myProfileSkill');
    if (stored) return Number(stored);
    return 0;
  }

  const getSkillName = (s: number) => ['มือใหม่แกะกล่อง', 'มือใหม่เริ่มมีทรง', 'มือกลางมีพื้นฐาน', 'มือตึงสายคุมเกมส์', 'มือปีศาจ'][s - 1] || 'ไม่ระบุ';

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
          teams: [[balanced.teams[0], balanced.teams[1]], [balanced.teams[2], balanced.teams[3]]],
          diff: balanced.diff
        });
        currentPlayers = currentPlayers.slice(4);
      }
    }
    return matches;
  }

  const availableCourts = (state?.courtNames || []).filter(cn => !(state?.playing || []).find(p => p.court === cn));
  const manualIdsList = manualPreviews.flatMap(m => m.teams.flat().map((p: any) => p.id));
  const availableWaitingView = activeWaiting.filter(p => !manualIdsList.includes(p.id) && !pausedIds.includes(p.id));
  const remainingSlots = availableCourts.length - manualPreviews.length;

  const autoMatches = (globalPreview && availableWaitingView.length >= 4 && remainingSlots > 0 && matchMode !== 'manual')
    ? (extractBestMatch(availableWaitingView, matchHistory) ? getAutoNextMatches(availableWaitingView, remainingSlots, matchMode, matchHistory) : [])
    : [];

  const allPreviews = [...manualPreviews, ...autoMatches];

  // จำนวนรายการคิวที่จะโชว์ (ปรับได้)
const PREVIEW_QUEUE_SIZE = 20;

// helper: flatten ids จาก match
const getMatchIds = (m: any) => (m?.teams || []).flat().map((p: any) => p?.id).filter(Boolean);

// ✅ previewQueue = manualQueue (admin) + autoQueue (system)
const previewQueue = useMemo(() => {
  // 1) manualQueue (คงลำดับที่ admin กดเลือก)
  const manualQueue = [...(manualPreviews || [])];

  // 2) กันคนซ้ำ: เอา ids ที่ถูกใช้ใน manual ออกก่อน
  const usedIds = new Set<string>(manualQueue.flatMap(getMatchIds));

  // 3) base queue: คนรอจริงตามลำดับ FIFO (activeWaiting ของคุณจัดไว้แล้ว)
  const candidates = activeWaiting
    .filter(p => !pausedIds.includes(p.id))
    .filter(p => !usedIds.has(p.id));

  // 4) autoQueue: ใช้ระบบจับคู่เดิมของคุณ (smart/balanced/ฯลฯ)
  //    สร้างให้ได้หลายชุดพอสำหรับโชว์ ไม่ผูกกับคอร์ทว่าง
  const autoQueue = (matchMode === 'manual')
    ? []
    : getAutoNextMatches(candidates, PREVIEW_QUEUE_SIZE, matchMode, matchHistory)
        .map((m: any, idx: number) => ({
          ...m,
          isManual: false,
          // normalize shape ให้เหมือน manualPreviews ที่ render ง่าย
          teams: m.teams,
          matchNumber: m.matchNumber ?? (idx + 1),
        }));

  // 5) รวมเป็นคิวเดียว FIFO
  return [...manualQueue, ...autoQueue];
}, [
  manualPreviews,
  activeWaiting,
  pausedIds,
  matchMode,
  matchHistory,
  getAutoNextMatches,
]);


  const myStartLogs = myPlayHistory.filter(h => h.action.toLowerCase().includes('start') || h.action.includes('ลงสนาม'));
  const realPlayCount = myStartLogs.length;
  const realPlayTime = realPlayCount * avgMatchDuration;

  const notifiedStandby = useRef(false);
  const notifiedPlay = useRef(false);

  // ✅ NEW: Guard กันการปล่อยลงคอร์ทซ้อนกัน (Auto Fill)
  const autoFillingRef = useRef(false);

  

  

  const playAlertSound = () => {
    try {
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock_2.ogg');
      audio.play().catch(() => { });
    } catch (e) { }
  };

  const addNotification = (title: string, body: string) => {
    setNotifyHistory(prev => [{ id: Date.now(), title, body, time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }), isRead: false }, ...prev].slice(0, 50));
  };

  

  




// ✅ ensure SW registered (กัน serviceWorker.ready ค้าง)
const withTimeout = async <T,>(p: Promise<T>, ms: number, label: string): Promise<T> => {
  let t: any;
  const timeout = new Promise<T>((_, reject) => {
    t = setTimeout(() => reject(new Error(`Timeout: ${label} (${ms}ms)`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(t);
  }
};

const fetchWithTimeout = async (url: string, options: RequestInit, ms: number) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
};

const requestNotify = async () => {
  Swal.fire({
    title: 'กำลังอัปเดตการแจ้งเตือน...',
    toast: true,
    position: 'top',
    showConfirmButton: false,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    if (!myProfile) return Toast.fire({ title: '⚠️ กรุณา Check in ก่อนเปิดแจ้งเตือน' });
    if (!('Notification' in window)) return Toast.fire({ title: '❌ เบราว์เซอร์ไม่รองรับแจ้งเตือน' });
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return Toast.fire({ title: '❌ ไม่รองรับ Push (ต้อง https + Service Worker)' });
    }

    let perm = Notification.permission;
    if (perm === 'default') perm = await withTimeout(Notification.requestPermission(), 15000, 'Notification.requestPermission');
    setNotifyPerm(perm);
    if (perm !== 'granted') return Toast.fire({ title: '⚠️ ยังไม่ได้รับอนุญาตแจ้งเตือน' });

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) return Toast.fire({ title: '⚠️ ลืมตั้งค่า VAPID Key ใน .env' });

    // ✅ รอ SW ready แบบมี timeout
    const reg = await withTimeout(navigator.serviceWorker.ready, 15000, 'serviceWorker.ready');

    let sub = await withTimeout(reg.pushManager.getSubscription(), 10000, 'pushManager.getSubscription');
    if (!sub) {
      sub = await withTimeout(
        reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        }),
        20000,
        'pushManager.subscribe'
      );
    }

    // ✅ ส่ง update ไป backend ทุกครั้ง (ไม่เงียบ)
    const res = await fetchWithTimeout(
      '/api/webpush',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'subscribe', subscription: sub, userId: myProfile.id })
      },
      15000
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) return Toast.fire({ title: `❌ อัปเดตไม่สำเร็จ: ${data?.error || res.status}` });

    Toast.fire({ title: '✅ อัปเดต/แอดเพิ่ม Token แจ้งเตือนเรียบร้อย!' });
  } catch (e: any) {
    Toast.fire({ title: `❌ ทำรายการไม่สำเร็จ: ${e?.message || 'Unknown error'}` });
  } finally {
    Swal.close();
  }
};

const resetNotifySubscription = async () => {
  try {
    const reg = await withTimeout(navigator.serviceWorker.ready, 15000, 'serviceWorker.ready');
    const sub = await withTimeout(reg.pushManager.getSubscription(), 10000, 'getSubscription');
    if (sub) await sub.unsubscribe();
    Toast.fire({ title: '✅ รีเซ็ตแล้ว กดอัปเดตการแจ้งเตือนอีกครั้ง' });
  } catch (e: any) {
    Toast.fire({ title: `❌ รีเซ็ตไม่สำเร็จ: ${e?.message || 'Unknown error'}` });
  }
};


  const triggerNotification = async (title: string, body: string, vibratePattern: number[], targetTab?: 'home' | 'queue') => {
    playAlertSound();
    addNotification(title, body);

    try {
      if ('vibrate' in navigator) navigator.vibrate(vibratePattern);
    } catch (e) { }

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(title, { body: body, icon: '/icon.png', badge: '/icon.png' });
        n.onclick = () => { window.focus(); if (targetTab) handleTabClick(targetTab); };
        setTimeout(() => n.close(), 8000);
      } catch (e) { }
    }

    setCapsuleAlert({ title, body, visible: true, onClick: () => targetTab && handleTabClick(targetTab) });
    setTimeout(() => setCapsuleAlert(prev => ({ ...prev, visible: false })), 6000);
  };

  const toggleWakeLock = async () => {
    if (isAwake) {
      if (wakeLockRef.current) {
        try { await wakeLockRef.current.release(); } catch (e) { }
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
          wakeLockRef.current.addEventListener('release', () => setIsAwake(false));
        }
      } catch (err: any) { Toast.fire({ title: `❌ ล็อคหน้าจอไม่ได้: ${err.message}` }); }
    }
  };

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
    } catch (e) { }
  };

  const refresh = async (showLoader = false, forceClearCache = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const headers: HeadersInit | undefined = forceClearCache ? { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' } : undefined;
      const res = await fetch('/api/state', { cache: 'no-store', headers });
      const d = await res.json();
      setState(d)
      if (d.globalShowPreview !== undefined) setGlobalPreview(d.globalShowPreview);
      if (d.playStartTime) setPlayStartTime(d.playStartTime);
      if (d.playEndTime) setPlayEndTime(d.playEndTime);
      if (myProfile) { fetchProfileHistory(); }
    } catch (e) { }
    finally { setIsLoading(false); }
  }

  const handleTabClick = (tab: any) => {
    refresh(true, true);
    if (tab === 'profile') fetchProfileHistory();
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    setAdmin(localStorage.getItem('adminAuth') === 'true');
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') document.documentElement.classList.add('dark');

    const savedProfile = localStorage.getItem('myProfile');
    if (savedProfile) {
      setMyProfile(JSON.parse(savedProfile));
      if (activeTab === 'profile') fetchProfileHistory();
    }

    const savedHistory = localStorage.getItem('localMatchHistory');
    if (savedHistory) setMatchHistory(JSON.parse(savedHistory));

    refresh(true);
    const t = setInterval(() => refresh(false), Number(process.env.NEXT_PUBLIC_AUTO_REFRESH_MS || 5000));
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ======================================================================
  // ✅ NEW FEATURE: AUTO FILL COURT (ไม่ใช่ auto finish)
  // - เมื่อเปิดโหมด state.autoMatch
  // - ถ้ามีคอร์ทว่าง => นำคู่ลงคอร์ททันที ไม่ต้องคอนเฟิร์ม
  // - priority: manualPreviews ก่อน แล้วค่อย autoMatches
  // ======================================================================

  const recordMatchToHistory = (ids: string[]) => {
    if (ids.length !== 4) return;
    const newRecord = { t1: [ids[0], ids[1]], t2: [ids[2], ids[3]] };
    setMatchHistory(prev => {
      const updated = [newRecord, ...prev].slice(0, 100);
      localStorage.setItem('localMatchHistory', JSON.stringify(updated));
      return updated;
    });
  }

  const clearBrowserData = () => {
    Swal.fire({
      title: '🧹 ล้างข้อมูลเบราว์เซอร์?',
      text: 'จะลบโปรไฟล์ ประวัติ และการตั้งค่าทั้งหมดบนเครื่องนี้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ล้างข้อมูล!',
      confirmButtonColor: '#ef4444',
      preConfirm: () => {
        const adminAuth = localStorage.getItem('adminAuth');
        localStorage.clear();
        sessionStorage.clear();
        if (adminAuth) localStorage.setItem('adminAuth', adminAuth);
        setMyProfile(null);
        setSelected([]);
        setTheme('light');
        setMatchHistory([]);
        setManualPreviews([]);
        document.documentElement.classList.remove('dark');
        Toast.fire({ title: '✅ ล้างข้อมูลสำเร็จ เริ่มต้นใหม่...' });
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
      Toast.fire({ title: '✅ อัปเดตการตั้งค่าโชว์คิวถัดไปแล้ว' });
      refresh(false);
    }
  }

  const savePlayTime = async () => {
    Toast.fire({ title: 'ℹ️ Saving Time...' });
    await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set', key: 'PlayStartTime', value: playStartTime }) });
    await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set', key: 'PlayEndTime', value: playEndTime }) });
    Toast.fire({ title: '✅ Play Time Saved' });
    refresh(false);
  }

  const runApi = async (url: string, body?: any, showLoader = true) => {
    if (showLoader) Swal.fire({ title: 'กำลังประมวลผล...', toast: true, position: 'top', showConfirmButton: false, didOpen: () => Swal.showLoading() });
    try {
      const res = await fetch(url, { method: body ? 'POST' : 'GET', headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
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

  const openCourtManager = () => {
    setIsCourtManagerOpen(true);
  }

  const handleAddCourt = async () => {
    if (!newCourtName.trim()) return;
    const currentCourts = [...(state?.courtNames || []), newCourtName.trim()];
    await fetch('/api/config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'set', key: 'Courts', value: currentCourts.join(',') }) });
    setNewCourtName(''); refresh(false); Toast.fire({ title: '✅ เพิ่มคอร์ทแล้ว' });
  }

  const handleRemoveCourt = async (courtToRemove: string) => {
    const currentCourts = (state?.courtNames || []).filter(c => c !== courtToRemove);
    await fetch('/api/config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'set', key: 'Courts', value: currentCourts.join(',') }) });
    refresh(false); Toast.fire({ title: '🗑️ ลบคอร์ทแล้ว' });
  }

  const handleApproveProcess = async (p: any) => {
    Swal.fire({
      title: '✏️ ตรวจสอบก่อนอนุมัติ',
      html: `
        <div class="flex flex-col gap-3 text-left mt-2">
          <div><label class="text-[10px] font-bold text-slate-500">Employee ID / Guest ID</label><input id="apId" value="${p.id}" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"></div>
          <div><label class="text-[10px] font-bold text-slate-500">Display Name</label><input id="apName" value="${p.name}" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"></div>
          <div><label class="text-[10px] font-bold text-slate-500">Skill Level</label>
            <select id="apSkill" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="1" ${p.skill === 1 ? 'selected' : ''}>1 (มือใหม่)</option>
              <option value="2" ${p.skill === 2 ? 'selected' : ''}>2 (เริ่มมีทรง)</option>
              <option value="3" ${p.skill === 3 ? 'selected' : ''}>3 (พื้นฐาน)</option>
              <option value="4" ${p.skill === 4 ? 'selected' : ''}>4 (สายคุม)</option>
              <option value="5" ${p.skill === 5 ? 'selected' : ''}>5 (ปีศาจ)</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true, confirmButtonText: 'บันทึกและอนุมัติ', confirmButtonColor: '#2563eb',
      preConfirm: () => ({
        oldId: p.id,
        newId: (document.getElementById('apId') as HTMLInputElement).value,
        name: (document.getElementById('apName') as HTMLInputElement).value,
        skill: Number((document.getElementById('apSkill') as HTMLSelectElement).value)
      })
    }).then(async r => {
      if (r.isConfirmed) {
        Swal.fire({ title: 'กำลังตรวจสอบข้อมูล...', toast: true, position: 'top', showConfirmButton: false, didOpen: () => Swal.showLoading() });
        await fetch('/api/update-player', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(r.value) });
        await runApi('/api/approve', { id: r.value.newId }, true);
        Toast.fire({ title: '✅ อนุมัติลงคิวเรียบร้อย' });
      }
    });
  }

  const handleBulkApprove = async () => {
    if (selectedPending.length === 0) return;
    Swal.fire({ title: 'กำลังอนุมัติ...', toast: true, position: 'top', showConfirmButton: false, didOpen: () => Swal.showLoading() });
    for (const id of selectedPending) {
      await fetch('/api/approve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    }
    setSelectedPending([]);
    refresh(false);
    Swal.close();
    Toast.fire({ title: '✅ อนุมัติผู้เล่นทั้งหมดแล้ว' });
  }

  const handleRejectPlayer = async (id: string) => {
    Swal.fire({ title: 'ปฏิเสธคำขอ?', text: "คำขอนี้จะถูกลบ", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' })
      .then(async r => {
        if (r.isConfirmed) {
          await fetch('/api/reject', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
          refresh(false); Toast.fire({ title: '🗑️ ปฏิเสธคำขอแล้ว' });
        }
      });
  }

  const togglePause = async (p: any) => {
    const isPaused = p.name.includes('(พัก)');
    const newName = isPaused ? p.name.replace(' (พัก)', '') : p.name + ' (พัก)';
    Swal.fire({ title: 'กำลังอัปเดต...', toast: true, position: 'top', showConfirmButton: false, didOpen: () => Swal.showLoading() });
    await fetch('/api/update-player', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ oldId: p.id, newId: p.id, name: newName, skill: p.skill }) });
    await refresh(false); Swal.close(); Toast.fire({ title: isPaused ? '✅ กลับเข้าคิวปกติแล้ว' : '⏸️ พักคิวแล้ว' });
  }

  const executeAutoMatch = async () => {
    const availableWaiters = activeWaiting.filter(p => !manualPreviews.flatMap(m => m.teams.flat().map((x: any) => x.id)).includes(p.id));
    if (availableWaiters.length < 4) { Toast.fire({ title: '⚠️ คิวพร้อมเล่นไม่ถึง 4 คน' }); return; }

    const availableCourtsCount = state?.courtNames.filter(cn => !state.playing.find(p => p.court === cn)).length || 0;
    const matchTarget = Math.max(1, availableCourtsCount);
    const matches = getAutoNextMatches(availableWaiters, matchTarget, matchMode, matchHistory);

    if (matches.length === 0) { Toast.fire({ title: '⚠️ ระบบหาคู่ที่เหมาะสมไม่ได้' }); return; }
    Toast.fire({ title: `⏳ กำลังปล่อยคิว...` });

    for (const m of matches) {
      const ids = [m.teams[0][0].id, m.teams[0][1].id, m.teams[1][0].id, m.teams[1][1].id];
      recordMatchToHistory(ids);
      await fetch('/api/manual-match', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids }) });
    }
    refresh(false); Toast.fire({ title: '✅ ปล่อยคิวสำเร็จ!' });
  }

const confirmSpecificMatch = async (matchData: any, targetCourtName?: string) => {
  const courtToLoad = targetCourtName || matchData.court || '';
  if (courtToLoad) setLoadingCourts(prev => [...prev, courtToLoad]);

  const ids = [
    matchData.teams[0][0].id,
    matchData.teams[0][1].id,
    matchData.teams[1][0].id,
    matchData.teams[1][1].id
  ];

  recordMatchToHistory(ids);

  let ok = false;
  try {
    const res = await fetch('/api/manual-match', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids, court: targetCourtName })
    });

    ok = res.ok;
    if (!ok) {
      const err = await res.json().catch(() => null);
      Toast.fire({ title: `❌ ลงสนามไม่สำเร็จ: ${err?.message || res.status}` });
      return;
    }

    // ✅ สำเร็จแล้วค่อยลบ manual ออก (เฉพาะ manual เท่านั้น)
    if (matchData?.isManual && matchData?.matchId) {
      setManualPreviews(prev => prev.filter(m => m.matchId !== matchData.matchId));
    }

    await refresh(false);
    Toast.fire({ title: '✅ ลงสนามเรียบร้อย!' });
  } catch (e) {
    Toast.fire({ title: '❌ Network error ระหว่างลงสนาม' });
  } finally {
    if (courtToLoad) setLoadingCourts(prev => prev.filter(c => c !== courtToLoad));
  }
};


  // ✅ NEW: ปล่อยคู่ลงคอร์ทแบบอัตโนมัติ “ทันที” เมื่อคอร์ทว่างและเปิดโหมด autoMatch

  const autoFillCourts = useCallback(async () => {
  if (!state?.autoMatch) return;
  if (autoFillingRef.current) return;

  const freeCourts = (state?.courtNames || []).filter(
    cn => !(state?.playing || []).some(p => p.court === cn)
  );
  if (freeCourts.length === 0) return;

  // ✅ snapshot กันคิวเปลี่ยนระหว่างรัน
  const queueSnapshot = [...(previewQueue || [])];
  if (queueSnapshot.length === 0) return;

  autoFillingRef.current = true;
  try {
    for (const court of freeCourts) {
      if (loadingCourts.includes(court)) continue;

      const next = queueSnapshot.shift();
      if (!next) break;

      // ✅ ลงคอร์ท FIFO
      await confirmSpecificMatch(next, court);
    }
  } finally {
    autoFillingRef.current = false;
  }
}, [state?.autoMatch, state?.courtNames, state?.playing, previewQueue, loadingCourts, confirmSpecificMatch]);

  // ✅ Trigger: เมื่อ state เปลี่ยนแล้ว “คอร์ทว่าง” ให้ปล่อยคิวทันที (ไม่ต้อง confirm)

  useEffect(() => {
  if (!state?.autoMatch) return;

  const freeCourts = (state?.courtNames || []).filter(
    cn => !(state?.playing || []).some(p => p.court === cn)
  );

  if (freeCourts.length === 0) return;

  autoFillCourts();
}, [state?.autoMatch, state?.playing, state?.waiting, manualPreviews, previewQueue, state?.courtNames]);

  const toggleSelect = (pId: string) => {
    if (!admin) return;
    setSelected(prev => {
      if (prev.includes(pId)) {
        const newSel = prev.filter(x => x !== pId);
        if (newSel.length === 0) refresh(true);
        return newSel;
      } else {
        if (prev.length >= 4) return prev;
        return [...prev, pId];
      }
    });
  };

const handleMatchSelected = async () => {
  if (selected.length !== 4) return Toast.fire({ title: '⚠️ เลือก 4 คนให้พอดีเป๊ะครับ' });

  const selectedPlayers = (selected.map(id => state?.waiting?.find(p => p.id === id)).filter(Boolean) as Player[]) || [];
  if (selectedPlayers.length !== 4) return Toast.fire({ title: '⚠️ ดึงข้อมูลผู้เล่นไม่ครบ' });

  const matchId = `M-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const matchData = {
    matchId,
    isManual: true,
    matchNumber: Date.now(),
    teams: [[selectedPlayers[0], selectedPlayers[1]], [selectedPlayers[2], selectedPlayers[3]]],
    diff: 0
  };

  setManualPreviews(prev => [...prev, matchData]); // FIFO
  setSelected([]);
  Toast.fire({ title: '✅ จัดทีมแทรกคิวถัดไปสำเร็จ (FIFO)!' });
};

  const openCheckIn = () => {
    // *** โค้ด openCheckIn ของคุณยาวมาก ผมคงไว้ครบตามเดิม ***
    // NOTE: ผมไม่ตัดทอน logic เดิมออก (คัดลอกจากที่คุณส่งมา)
    Swal.fire({
      title: '📝 Check In',
      html: `
        <style> .swal2-container .swal2-popup { overflow: visible !important; padding-bottom: 2rem; } </style>
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
                <input type="checkbox" id="swGuest" class="w-4 h-4 text-amber-600"> <span class="flex flex-col">Guest <span class="text-[10px] font-normal text-slate-500">ไม่มี ID พนักงาน ระบบจะสุ่มให้ (ตัวเลขล้วน)</span></span>
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

          secSearch.classList.toggle('hidden', mode !== 'search'); secSearch.classList.toggle('flex', mode === 'search');
          secNew.classList.toggle('hidden', mode !== 'new'); secNew.classList.toggle('flex', mode === 'new');
          secSync.classList.toggle('hidden', mode !== 'sync'); secSync.classList.toggle('flex', mode === 'sync');
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
          searchSelectedPreview.classList.remove('hidden'); swSearch.classList.add('hidden'); swTableContainer.classList.add('hidden'); swClearBtn.classList.remove('hidden');
        };

        const unlockFields = () => {
          hidId.value = ''; hidName.value = ''; hidSkill.value = '';
          searchSelectedPreview.classList.add('hidden'); swSearch.classList.remove('hidden'); swSearch.value = '';
          swClearBtn.classList.add('hidden'); swTableContainer.innerHTML = ''; swSearch.focus();
        };

        swClearBtn.addEventListener('click', unlockFields);

        let timeout: any;
        swSearch.addEventListener('input', () => {
          clearTimeout(timeout);
          swTableContainer.innerHTML = '';
          if (swSearch.value.length < 2) { swTableContainer.classList.add('hidden'); return; }
          timeout = setTimeout(async () => {
            try {
              const res = await fetch(`/api/player?q=${swSearch.value}`);
              const data = await res.json();
              let playerList = Array.isArray(data) ? data : (data.list || data.data || (data.found ? [data] : []));
              swTableContainer.classList.remove('hidden');
              if (playerList.length > 0) {
                const table = document.createElement('table'); table.className = 'w-full text-left text-xs';
                table.innerHTML = '<thead class="bg-slate-100 sticky top-0"><tr><th class="p-2">ID</th><th class="p-2">Name</th><th class="p-2 text-center">Lv</th><th class="p-2 text-center">Action</th></tr></thead>';
                const tbody = document.createElement('tbody');
                playerList.forEach((p: any) => {
                  const tr = document.createElement('tr'); tr.className = 'border-b border-slate-100 hover:bg-blue-50 transition-colors cursor-pointer';
                  tr.onmousedown = (e) => { e.preventDefault(); lockFields(p); };
                  const tdId = document.createElement('td'); tdId.className = 'p-2 font-bold text-blue-600'; tdId.textContent = p.id;
                  const tdName = document.createElement('td'); tdName.className = 'p-2 font-medium'; tdName.textContent = p.name;
                  const tdLv = document.createElement('td'); tdLv.className = 'p-2 text-center'; tdLv.innerHTML = `<span class="bg-slate-200 px-1.5 py-0.5 rounded shadow-inner font-bold">${p.skill}</span>`;
                  const tdAction = document.createElement('td'); tdAction.className = 'p-2 text-center';
                  const btn = document.createElement('button'); btn.className = 'bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded shadow-sm font-bold transition-transform'; btn.textContent = 'Select';
                  tdAction.appendChild(btn); tr.append(tdId, tdName, tdLv, tdAction); tbody.appendChild(tr);
                });
                table.appendChild(tbody); swTableContainer.appendChild(table);
              } else {
                swTableContainer.innerHTML = '<div class="p-4 text-center text-slate-400 text-xs">ไม่พบข้อมูลผู้เล่น <br/>(กดแท็บ "มาครั้งแรก" ด้านบนเพื่อลงทะเบียน)</div>';
              }
            } catch (e) { }
          }, 300);
        });

        const swGuest = document.getElementById('swGuest') as HTMLInputElement;
        const swID = document.getElementById('swID') as HTMLInputElement;

        swGuest.addEventListener('change', (e) => {
          const isGuest = (e.target as HTMLInputElement).checked;
          swID.disabled = isGuest;
          if (isGuest) { swID.classList.add('bg-slate-100', 'cursor-not-allowed', 'opacity-50'); swID.value = ''; }
          else { swID.classList.remove('bg-slate-100', 'cursor-not-allowed', 'opacity-50'); }
        });

        const syncSearchInput = document.getElementById('syncSearchInput') as HTMLInputElement;
        const syncTableContainer = document.getElementById('syncTableContainer') as HTMLDivElement;

        let syncTimeout: any;
        syncSearchInput.addEventListener('input', () => {
          clearTimeout(syncTimeout);
          syncTableContainer.innerHTML = '';
          if (syncSearchInput.value.length < 2) { syncTableContainer.classList.add('hidden'); return; }
          syncTimeout = setTimeout(async () => {
            try {
              const res = await fetch(`/api/player?q=${syncSearchInput.value}`);
              const data = await res.json();
              let playerList = Array.isArray(data) ? data : (data.list || data.data || (data.found ? [data] : []));
              syncTableContainer.classList.remove('hidden');
              if (playerList.length > 0) {
                const table = document.createElement('table'); table.className = 'w-full text-left text-xs';
                table.innerHTML = '<thead class="bg-red-100 sticky top-0 text-red-800"><tr><th class="p-2">Name</th><th class="p-2 text-center">Action</th></tr></thead>';
                const tbody = document.createElement('tbody');
                playerList.forEach((p: any) => {
                  const tr = document.createElement('tr'); tr.className = 'border-b border-slate-100 hover:bg-red-50 transition-colors';
                  const tdName = document.createElement('td'); tdName.className = 'p-2 font-bold text-slate-700'; tdName.textContent = p.name;
                  const tdAction = document.createElement('td'); tdAction.className = 'p-2 text-center';
                  const btn = document.createElement('button'); btn.className = 'bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow-sm font-bold transition-transform'; btn.textContent = 'Sync Device';
                  btn.onclick = (e) => {
                    e.preventDefault();
                    const profileData = { id: p.id, name: p.name };
                    localStorage.setItem('myProfile', JSON.stringify(profileData));
                    localStorage.setItem('myProfileSkill', p.skill.toString());
                    setMyProfile(profileData);
                    Swal.close(); Toast.fire({ title: '✅ กู้คืนโปรไฟล์สำเร็จ!' }); setTimeout(() => window.location.reload(), 1000);
                  };
                  tdAction.appendChild(btn); tr.append(tdName, tdAction); tbody.appendChild(tr);
                });
                table.appendChild(tbody); syncTableContainer.appendChild(table);
              } else {
                syncTableContainer.innerHTML = '<div class="p-4 text-center text-slate-400 text-xs">ไม่พบข้อมูล</div>';
              }
            } catch (e) { }
          }, 300);
        });
      },
      showCancelButton: true, confirmButtonText: 'Check In', confirmButtonColor: '#2563eb',
      preConfirm: async () => {
        const mode = (document.getElementById('currentMode') as HTMLInputElement).value;
        if (mode === 'sync') { Swal.showValidationMessage('กรุณากดปุ่ม Sync Device ที่รายชื่อของคุณ'); return false; }
        else if (mode === 'search') {
          const id = (document.getElementById('hidId') as HTMLInputElement).value;
          const name = (document.getElementById('hidName') as HTMLInputElement).value;
          const skill = (document.getElementById('hidSkill') as HTMLInputElement).value;
          if (!id) { Swal.showValidationMessage('กรุณาค้นหาและเลือกรายชื่อผู้เล่นก่อน หรือไปที่แท็บลงทะเบียนใหม่'); return false; }
          return { id, name, skill: Number(skill), isGuest: false };
        } else {
          const swGuest = document.getElementById('swGuest') as HTMLInputElement;
          let idVal = (document.getElementById('swID') as HTMLInputElement).value.trim().replace(/^0+/, '');
          const nameVal = (document.getElementById('swName') as HTMLInputElement).value.trim();
          const swSkill = document.getElementById('swSkill') as HTMLSelectElement;
          const isGuest = swGuest.checked;

          // Random Number 6 digits for guest
          const finalId = isGuest ? Math.floor(100000 + Math.random() * 900000).toString() : idVal;

          if (!isGuest && !idVal) { Swal.showValidationMessage('กรุณากรอกรหัสพนักงาน หรือเลือกเป็น Guest'); return false; }
          if (!nameVal) { Swal.showValidationMessage('กรุณากรอกชื่อเล่นที่ต้องการแสดง'); return false; }

          if (!isGuest) {
            try {
              const res = await fetch(`/api/player?q=${nameVal}`);
              const data = await res.json();
              let playerList = Array.isArray(data) ? data : (data.list || data.data || (data.found ? [data] : []));
              const isDup = playerList.some((p: any) => p.name && p.name.toLowerCase() === nameVal.toLowerCase());
              if (isDup) { Swal.showValidationMessage('ชื่อนี้มีอยู่แล้ว กรุณาเปลี่ยนชื่อใหม่ที่ระบุตัวตนคุณได้'); return false; }
            } catch (e) { }
          }
          return { id: finalId, name: nameVal, skill: Number(swSkill.value), isGuest }
        }
      }
    }).then(async (r) => {
      if (r.isConfirmed && r.value) {
        const currentWaiters = state?.waiting || []; const currentPending = state?.pending || []; const currentPlaying = state?.playing || [];
        const isAlreadyActive = currentWaiters.some(p => p.id === r.value.id) || currentPending.some(p => p.id === r.value.id) || currentPlaying.some(c => c.p1Id === r.value.id || c.p2Id === r.value.id || c.p3Id === r.value.id || c.p4Id === r.value.id);

        if (isAlreadyActive) {
          const newProfile = { id: r.value.id, name: r.value.name };
          localStorage.setItem('myProfile', JSON.stringify(newProfile));
          localStorage.setItem('myProfileSkill', r.value.skill.toString());
          setMyProfile(newProfile);
          if ('Notification' in window && Notification.permission === 'default') { const perm = await Notification.requestPermission(); setNotifyPerm(perm); }
          setActiveTab('home'); Swal.fire({ title: '✅ ซิงค์ข้อมูลสำเร็จ', text: 'คุณมีคิวอยู่ในระบบแล้ว ซิงค์โปรไฟล์ให้เรียบร้อยโดยไม่ต้องต่อคิวใหม่', icon: 'success' });
          setTimeout(() => window.location.reload(), 1500); return;
        }

        const res = await runApi('/api/checkin', r.value, false);
        if (res && (res.ok || res.status === 'success')) {
          const newProfile = { id: r.value.id, name: r.value.name };
          localStorage.setItem('myProfile', JSON.stringify(newProfile));
          localStorage.setItem('myProfileSkill', r.value.skill.toString());
          setMyProfile(newProfile);
          if ('Notification' in window && Notification.permission === 'default') { const perm = await Notification.requestPermission(); setNotifyPerm(perm); }
          setActiveTab('home'); Toast.fire({ title: '✅ Checked in! Wait for approval.' });
          setTimeout(() => window.location.reload(), 1500);
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
        if (!val) return Swal.showValidationMessage('Please enter Name or ID');
        return { id: val }
      }
    }).then(async (r) => {
      if (r.isConfirmed) {
        Toast.fire({ title: 'ℹ️ Signing out...' });
        fetch('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(r.value) }).then(() => refresh(false));
        localStorage.removeItem('myProfile'); setMyProfile(null);
        Toast.fire({ title: '✅ Signed Out Successfully' }); setTimeout(() => window.location.reload(), 1500);
      }
    })
  }

  const openAddMember = () => {
    Swal.fire({
      title: '➕ เพิ่มสมาชิกเข้าคิวทันที',
      html: `
        <div class="flex flex-col gap-3 text-left">
          <div><label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Employee No.</label><input id="amID" class="w-full p-2.5 border border-slate-300 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="12345 (ทิ้งว่างเพื่อสุ่มตัวเลข Guest)"></div>
          <div><label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Display Name</label><input id="amName" class="w-full p-2.5 border border-slate-300 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Name"></div>
          <div><label class="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Skill Level</label>
            <select id="amSkill" class="w-full p-2.5 border border-slate-300 rounded-lg shadow-inner text-sm focus:ring-2 focus:ring-blue-500 outline-none">
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
        let id = (document.getElementById('amID') as HTMLInputElement).value.trim().replace(/^0+/, '');
        const name = (document.getElementById('amName') as HTMLInputElement).value.trim();
        if (!name) { Swal.showValidationMessage('Enter Name'); return false; }
        const finalId = id ? id : Math.floor(100000 + Math.random() * 900000).toString();
        return { id: finalId, name, skill: Number((document.getElementById('amSkill') as HTMLSelectElement).value), isGuest: !id }
      }
    }).then(async (r) => {
      if (r.isConfirmed) {
        const res = await runApi('/api/checkin', r.value, false);
        if (res && (res.ok || res.status === 'success')) {
          await runApi('/api/approve', { id: r.value.id }, false);
          Toast.fire({ title: '✅ เพิ่มสมาชิกและอนุมัติลงคิวแล้ว!' });
        } else Toast.fire({ title: `❌ ${res?.message || 'Error'}` });
      }
    });
  }

  const auth = async () => {
    const pin = prompt('Enter Admin PIN:');
    if (!pin) return;
    const res = await fetch('/api/config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'auth', pin }) });
    const d = await res.json();
    if (d.ok) { localStorage.setItem('adminAuth', 'true'); setAdmin(true); Toast.fire({ title: '✅ Welcome Admin' }); }
    else Toast.fire({ title: '❌ Incorrect PIN' });
  }

  const logout = () => {
    localStorage.removeItem('adminAuth');
    setAdmin(false);
    Toast.fire({ title: 'ℹ️ Logged Out' });
    setTimeout(() => window.location.reload(), 1500);
  }


  const finish = (court: string) => {
  Swal.fire({title: `Finish Match at ${court}?`, showCancelButton: true}).then(async r => {
    if(!r.isConfirmed) return;

    Toast.fire({ title: '✅ Match Finished' });
    await fetch('/api/finish', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ court }) });

    await refresh(false);
    fetchProfileHistory();

    // ❌ ไม่ต้องเรียก autoFillCourts ที่นี่
    // ให้ useEffect จัดการเมื่อเห็นคอร์ทว่าง
  });
}

  const openAdminEditPlayer = (p: any) => {
    Swal.fire({
      title: '✏️ แก้ไขข้อมูลผู้เล่น',
      html: `
        <div class="flex flex-col gap-3 text-left">
          <input type="hidden" id="editOldId" value="${p.id}">
          <div><label class="text-[10px] font-bold text-slate-500">Employee No.</label><input id="editId" value="${p.id}" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"></div>
          <div><label class="text-[10px] font-bold text-slate-500">Display Name</label><input id="editName" value="${p.name}" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"></div>
          <div><label class="text-[10px] font-bold text-slate-500">Skill</label>
            <select id="editSkill" class="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="1" ${p.skill === 1 ? 'selected' : ''}>1</option>
              <option value="2" ${p.skill === 2 ? 'selected' : ''}>2</option>
              <option value="3" ${p.skill === 3 ? 'selected' : ''}>3</option>
              <option value="4" ${p.skill === 4 ? 'selected' : ''}>4</option>
              <option value="5" ${p.skill === 5 ? 'selected' : ''}>5</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true, confirmButtonText: 'Save',
      preConfirm: () => ({
        oldId: p.id,
        newId: (document.getElementById('editId') as HTMLInputElement).value,
        name: (document.getElementById('editName') as HTMLInputElement).value,
        skill: Number((document.getElementById('editSkill') as HTMLSelectElement).value)
      })
    }).then(async r => { if (r.isConfirmed) { await runApi('/api/update-player', r.value, false); Toast.fire({ title: '✅ บันทึกการแก้ไขแล้ว' }); } })
  }

  const openBroadcastModal = () => {
    const oneMonthAgo = new Date(); oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1); const defaultDate = oneMonthAgo.toISOString().split('T')[0];
    Swal.fire({
      title: '📢 ส่งแจ้งเตือนกลุ่ม (Broadcast)',
      html: `
        <div class="flex flex-col gap-3 text-left">
          <div><label class="text-[10px] font-bold text-slate-500 uppercase">วันที่เริ่มดึงข้อมูล (วันที่เปิดสิทธิ์แจ้งเตือน)</label><input type="date" id="bcDate" value="${defaultDate}" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"></div>
          <div><label class="text-[10px] font-bold text-slate-500 uppercase">หัวข้อการแจ้งเตือน</label><input type="text" id="bcTitle" placeholder="เช่น ประกาศสำคัญจากคลับ" class="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"></div>
          <div><label class="text-[10px] font-bold text-slate-500 uppercase">เนื้อหาการแจ้งเตือน</label><textarea id="bcMessage" rows="3" placeholder="พิมพ์ข้อความที่ต้องการส่ง..." class="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"></textarea></div>
        </div>
      `,
      showCancelButton: true, confirmButtonText: 'ส่งการแจ้งเตือน', confirmButtonColor: '#2563eb',
      preConfirm: () => {
        const date = (document.getElementById('bcDate') as HTMLInputElement).value;
        const title = (document.getElementById('bcTitle') as HTMLInputElement).value.trim();
        const message = (document.getElementById('bcMessage') as HTMLTextAreaElement).value.trim();
        if (!title) { Swal.showValidationMessage('กรุณาใส่หัวข้อ'); return false; }
        if (!message) { Swal.showValidationMessage('กรุณาใส่เนื้อหา'); return false; }
        return { date, title, message };
      }
    }).then(async (r) => {
      if (r.isConfirmed) {
        Swal.fire({ title: 'กำลังสั่งรัน Broadcast...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
          const res = await fetch('/api/webpush', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'broadcast', date: r.value.date, title: r.value.title, message: r.value.message }) });
          const data = await res.json();
          if (!res.ok) Swal.fire('ไม่พบข้อมูล', data.error || 'ไม่พบผู้ลงทะเบียนในช่วงเวลานี้', 'info');
          else Swal.fire('✅ ส่งสำเร็จ', `ยิงแจ้งเตือนถึงอุปกรณ์ที่พร้อมรับ ${data.count} จากทั้งหมด ${data.total} เครื่อง`, 'success');
        } catch (e: any) { Swal.fire('❌ ผิดพลาด', e.message, 'error'); }
      }
    });
  }

  const showDailyReportMenu = () => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 10);
    Swal.fire({
      title: '📊 Daily Report',
      html: `
        <div class="mb-4 text-left">
           <label class="text-xs font-bold text-slate-500 block mb-1">Select Date:</label>
           <input type="date" id="reportDate" value="${today}" class="w-full p-2.5 border border-slate-300 rounded-lg shadow-inner text-sm outline-none focus:ring-2 focus:ring-blue-500">
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

            let tableHtml = `<div class="max-h-48 overflow-y-auto text-xs mt-4 border rounded-xl shadow-inner"><table class="w-full text-left"><thead class="bg-slate-100 sticky top-0 shadow-sm text-slate-600"><tr><th class="p-3">Time</th><th class="p-3">Name</th><th class="p-3">Action</th></tr></thead><tbody>`;
            (data.tableData || []).forEach((row: any) => { tableHtml += `<tr class="border-t border-slate-100 hover:bg-slate-50"><td class="p-2.5 text-slate-500">${row.time}</td><td class="p-2.5 font-bold text-slate-700">${row.name}</td><td class="p-2.5 text-blue-600">${row.action}</td></tr>`; });
            tableHtml += `</tbody></table></div>`;

            document.getElementById('reportContent')!.innerHTML = `
              <div class="grid grid-cols-2 gap-4">
                  <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm"><div class="text-3xl font-black text-blue-600">${data.totalMatches || 0}</div><div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Matches</div></div>
                  <div class="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm"><div class="text-3xl font-black text-green-600">${data.totalPlayers || 0}</div><div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Players</div></div>
              </div>
              ${tableHtml}
              <a href="${url}" download="badminton_report_${date}.csv" class="w-full mt-4 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-sm font-bold shadow-md transition active:scale-95">
                Download CSV
              </a>
            `;
          } catch (e) { document.getElementById('reportContent')!.innerHTML = '<div class="py-5 text-red-500 font-bold">❌ Error loading report</div>'; }
        };
        const dateInput = document.getElementById('reportDate') as HTMLInputElement;
        dateInput.addEventListener('change', (e) => fetchReport((e.target as HTMLInputElement).value));
        await fetchReport(today);
      }
    });
  }

  const showAnalyticsMenu = () => window.open('/analytics', '_blank');

  const exportRegisteredToday = () => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }).slice(0, 10);
    Swal.fire({
      title: '📋 ผู้ลงทะเบียนรายวัน',
      html: `
        <div class="mb-4 text-left">
           <label class="text-xs font-bold text-slate-500 block mb-1">เลือกวันที่:</label>
           <input type="date" id="regDate" value="${today}" class="w-full p-2.5 border border-slate-300 rounded-lg shadow-inner text-sm outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        <div id="regContent" class="text-center py-4 text-slate-400">Loading...</div>
      `,
      showConfirmButton: false, showCloseButton: true,
      didOpen: async () => {
        const fetchRegReport = async (date: string) => {
          document.getElementById('regContent')!.innerHTML = '<div class="py-5 text-blue-500 font-bold animate-pulse">⏳ Fetching data...</div>';
          try {
            const res = await fetch('/api/player');
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.list || data.data || []);
            const targetList = list.filter((p: any) => p.timestamp && p.timestamp.startsWith(date));

            let csv = '\uFEFFEmployee ID,Name,Skill,Type,Timestamp\n';
            let tableHtml = `<div class="max-h-48 overflow-y-auto text-xs mt-4 border rounded-xl shadow-inner"><table class="w-full text-left"><thead class="bg-slate-100 sticky top-0 shadow-sm text-slate-600"><tr><th class="p-3">ID</th><th class="p-3">Name</th><th class="p-3 text-center">Lv</th><th class="p-3">Time</th></tr></thead><tbody>`;

            targetList.forEach((p: any) => {
              const timeStr = new Date(p.timestamp).toLocaleTimeString('th-TH');
              csv += `"${p.id}","${p.name}","${p.skill}","${p.type || 'Emp'}","${timeStr}"\n`;
              tableHtml += `<tr class="border-t border-slate-100 hover:bg-slate-50"><td class="p-2.5 font-mono text-slate-500">${p.id}</td><td class="p-2.5 font-bold text-slate-700">${p.name}</td><td class="p-2.5 text-center"><span class="bg-slate-200 px-2 py-0.5 rounded-md font-bold">${p.skill}</span></td><td class="p-2.5 text-slate-500">${timeStr}</td></tr>`;
            });
            tableHtml += `</tbody></table></div>`;

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            document.getElementById('regContent')!.innerHTML = `
              <div class="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 shadow-sm mb-3 text-left flex justify-between items-center">
                 <div>
                   <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registered Players</div>
                   <div class="text-3xl font-black text-indigo-600 leading-none mt-1">${targetList.length} <span class="text-sm">คน</span></div>
                 </div>
              </div>
              ${tableHtml}
              <a href="${url}" download="registered_players_${date}.csv" class="w-full mt-4 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-sm font-bold shadow-md transition active:scale-95">
                Download CSV
              </a>
            `;
          } catch (e) { document.getElementById('regContent')!.innerHTML = '<div class="py-5 text-red-500 font-bold">❌ Error loading report</div>'; }
        }
        const dateInput = document.getElementById('regDate') as HTMLInputElement;
        dateInput.addEventListener('change', (e) => fetchRegReport((e.target as HTMLInputElement).value));
        await fetchRegReport(today);
      }
    });
  }

  const resetDay = () => {
    Swal.fire({ title: 'Reset Entire Day?', text: "This will clear all active courts, queues, and memory.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Yes, Reset!' })
      .then(async r => {
        if (r.isConfirmed) {
          localStorage.removeItem('localMatchHistory');
          setMatchHistory([]);
          await runApi('/api/reset-day', {});
          Toast.fire({ title: '✅ System Reset Complete' });
        }
      })
  }

  const tabProps = {
    state, setState, admin, setAdmin, selected, setSelected, fullscreen, setFullscreen, theme, setTheme,
    isLoading, setIsLoading, loadingCourts, setLoadingCourts, myProfile, setMyProfile,
    searchPending, setSearchPending, searchQueue, setSearchQueue, selectedPending, setSelectedPending,
    matchMode, setMatchMode, globalPreview, setGlobalPreview, playStartTime, setPlayStartTime, playEndTime, setPlayEndTime,
    matchHistory, setMatchHistory, manualPreviews, setManualPreviews, activeTab, setActiveTab, queueSubTab, setQueueSubTab,
    showNav, setShowNav, notifyHistory, setNotifyHistory, myPlayHistory, setMyPlayHistory,
    capsuleAlert, setCapsuleAlert, isCourtManagerOpen, setIsCourtManagerOpen, newCourtName, setNewCourtName,
    isAwake, setIsAwake, notifyPerm, setNotifyPerm, activeWaiting, myWaitIndex, myPending, myQueueData,
    myActiveCourt, amIPlaying, playDurationMs, courtsCount, avgMatchDuration, pausedIds, setPausedIds,
    estWaitMins, getSkillColor, getMySkillLevel, getSkillName, isSimilarSkillGroup, getAutoNextMatches,
    availableCourts, manualIdsList, availableWaitingView, remainingSlots, autoMatches, allPreviews,
    myStartLogs, realPlayCount, realPlayTime, playAlertSound, addNotification, requestNotify, triggerNotification,
    toggleWakeLock, fetchProfileHistory, refresh, handleTabClick, recordMatchToHistory, clearBrowserData,
    toggleGlobalPreviewState, savePlayTime, runApi, openCourtManager, handleAddCourt, handleRemoveCourt,
    handleApproveProcess, handleBulkApprove, handleRejectPlayer, togglePause, executeAutoMatch, confirmSpecificMatch,
    toggleSelect, handleMatchSelected, openCheckIn, openSignOut, openAddMember, auth, logout, finish,
    openAdminEditPlayer, openBroadcastModal, showDailyReportMenu, showAnalyticsMenu, exportRegisteredToday, resetDay, previewQueue,APP_VERSION
  };

  if (fullscreen) return <FocusMode {...tabProps} />

  if (isLoading && !state) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <div className="text-slate-500 font-bold animate-pulse text-sm tracking-widest uppercase">LOADING BADMINTON CLUB...</div>
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans pb-24 transition-all duration-300 ${state?.announcement ? 'pt-24' : 'pt-16'}`}>

      <div
        className={`fixed top-14 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 cursor-pointer ${capsuleAlert.visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-10 scale-95 pointer-events-none'}`}
        onClick={() => { if (capsuleAlert.onClick) capsuleAlert.onClick(); setCapsuleAlert(prev => ({ ...prev, visible: false })); }}
      >
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl rounded-full px-5 py-3 flex items-center gap-3 w-max max-w-[90vw]">
          <div className="bg-blue-500/20 text-blue-400 p-2 rounded-full"><Bell className="w-5 h-5 animate-pulse" /></div>
          <div className="flex flex-col">
            <span className="text-white text-sm font-black tracking-wide leading-tight">{capsuleAlert.title}</span>
            <span className="text-slate-300 text-xs font-medium leading-tight">{capsuleAlert.body}</span>
          </div>
        </div>
      </div>

      {state?.announcement && (
        <div className="fixed top-0 w-full bg-blue-600 text-white text-xs py-2.5 px-4 shadow-md flex items-center z-[60]">
          <AlertCircle className="w-4 h-4 mr-2 text-white" />
          <div className="flex-1 font-medium tracking-wide truncate">{state.announcement}</div>
          {admin && (
            <button
              onClick={async () => {
                const txt = prompt('Edit Announcement', state.announcement);
                if (txt !== null) {
                  await fetch('/api/config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'set', key: 'Announcement', value: txt }) });
                  refresh(false);
                  Swal.fire({ title: '✅ Announcement Updated', toast: true, position: 'top', showConfirmButton: false, timer: 1500 });
                }
              }}
              className="ml-4 pl-2 border-l border-blue-400 text-blue-100 hover:text-white"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <nav className={`fixed ${state?.announcement ? 'top-10' : 'top-0'} w-full bg-white/90 dark:bg-slate-900/90 border-b border-gray-200 dark:border-slate-800 px-4 py-3 backdrop-blur-lg z-50 shadow-sm transition-transform duration-300 ${showNav ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-sm bg-white" />
            <h1 className="font-black text-sm dark:text-white tracking-tight">Badminton Club</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setFullscreen(true)} className="text-slate-400 hover:text-blue-500 transition" title="Live Focus"><Monitor className="w-5 h-5" /></button>
            <button onClick={toggleWakeLock} className={isAwake ? 'text-amber-500' : 'text-slate-400'} title="ป้องกันจอดับ">{isAwake ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 w-full h-full relative">
        <HomeTab {...tabProps} />
        <QueueTab {...tabProps} />
        <AlertsTab {...tabProps} />
        <ProfileTab {...tabProps} />
      </div>

      {isCourtManagerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <h3 className="font-black text-base text-slate-800 dark:text-white flex items-center gap-2"><Settings className="w-5 h-5 text-blue-500" /> จัดการคอร์ท</h3>
              <button onClick={() => setIsCourtManagerOpen(false)} className="bg-slate-200 dark:bg-slate-800 p-1.5 rounded-full text-slate-500 hover:text-slate-700 transition active:scale-90"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4">
              <div className="flex gap-2 mb-4">
                <input type="text" value={newCourtName} onChange={e => setNewCourtName(e.target.value)} placeholder="ชื่อคอร์ท (เช่น B1)" className="flex-1 p-3 border border-slate-300 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white" />
                <button onClick={handleAddCourt} className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl font-bold text-sm shadow-md active:scale-95 transition flex items-center gap-1"><Plus className="w-4 h-4" /> เพิ่ม</button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {(state?.courtNames || []).length === 0 ? <div className="text-center text-xs text-slate-400 py-4">ไม่มีคอร์ทในระบบ</div> : null}
                {(state?.courtNames || []).map((c: any) => (
                  <div key={c} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-500" /> {c}</span>
                    <button onClick={() => handleRemoveCourt(c)} className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-2 rounded-lg hover:bg-red-200 transition active:scale-90"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed bottom-0 w-full bg-white/95 dark:bg-slate-900/95 border-t border-gray-200 dark:border-slate-800 px-6 py-3 backdrop-blur-xl z-50 transition-transform duration-300 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.05)] ${showNav ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-md mx-auto flex justify-between items-center relative">
          <button onClick={() => handleTabClick('home')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}>
            <HomeIcon className={activeTab === 'home' ? 'w-6 h-6' : 'w-5 h-5'} strokeWidth={activeTab === 'home' ? 2.5 : 2} /><span className="text-[9px] font-black uppercase tracking-wider">Home</span>
          </button>

          <button onClick={() => handleTabClick('queue')} className={`flex flex-col items-center gap-1 transition-all relative ${activeTab === 'queue' ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}>
            <Users className={activeTab === 'queue' ? 'w-6 h-6' : 'w-5 h-5'} strokeWidth={activeTab === 'queue' ? 2.5 : 2} /><span className="text-[9px] font-black uppercase tracking-wider">Queue</span>
            {(state?.pending || []).length > 0 && <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-slate-900 shadow-sm animate-pulse">{(state?.pending || []).length}</span>}
          </button>

          <button onClick={() => handleTabClick('notifications')} className={`flex flex-col items-center gap-1 transition-all relative ${activeTab === 'notifications' ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}>
            <Bell className={activeTab === 'notifications' ? 'w-6 h-6' : 'w-5 h-5'} strokeWidth={activeTab === 'notifications' ? 2.5 : 2} /><span className="text-[9px] font-black uppercase tracking-wider">Alerts</span>
            {notifyHistory.filter((n: any) => !n.isRead).length > 0 && <span className="absolute top-0 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"></span>}
          </button>

          <button onClick={() => handleTabClick('profile')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}>
            <User className={activeTab === 'profile' ? 'w-6 h-6' : 'w-5 h-5'} strokeWidth={activeTab === 'profile' ? 2.5 : 2} /><span className="text-[9px] font-black uppercase tracking-wider">Profile</span>
          </button>
        </div>
      </div>
    </div>
  )
}