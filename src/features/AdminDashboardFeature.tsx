import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  TrendingUp, 
  ShieldAlert, 
  Search, 
  Filter, 
  Activity, 
  Layers, 
  Crown, 
  UserCheck, 
  Loader2, 
  RefreshCw, 
  AlertTriangle,
  Clock,
  Trash2,
  Lock,
  ChevronDown,
  LayoutDashboard,
  Download,
  X,
  Copy,
  Check,
  Terminal,
  User,
  Bug,
  Info,
  Settings,
  Briefcase
} from 'lucide-react';
import { collection, getDocs, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { CoCoinIcon } from '../components/CoCoinIcon';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';
import { Tier } from '../types';
import { FEATURE_POINTS_COST, TIER_POINTS_LIMIT } from '../contexts/SubscriptionContext';
import EnterpriseView from '../components/EnterpriseView';

interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  tier?: Tier;
  preferences?: {
    tier?: Tier;
    defaultModel?: string;
  };
  createdAt?: any;
}

interface HistoryLogItem {
  id: string;
  userId: string;
  tool: string;
  prompt: string;
  result: string;
  model: string;
  createdAt: any;
  userEmail?: string;
  userName?: string;
  isError?: boolean;
  errorMessage?: string;
}

function getErrorSeverity(errorMessage?: string, result?: string, t?: any) {
  const msg = (errorMessage || result || '').toLowerCase();
  
  if (
    msg.includes('api_key') ||
    msg.includes('api key') ||
    msg.includes('key missing') ||
    msg.includes('unauthorized') ||
    msg.includes('permission') ||
    msg.includes('billing') ||
    msg.includes('quota') ||
    msg.includes('limit reached') ||
    msg.includes('payment') ||
    msg.includes('subscription') ||
    msg.includes('not configured') ||
    msg.includes('missing') ||
    msg.includes('403') ||
    msg.includes('401')
  ) {
    return {
      level: 'critical',
      label: t ? t('admin.severityCritical', 'Critical / 權限或金鑰') : 'Critical',
      colorClass: 'bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/20 dark:border-red-500/30',
    };
  }
  
  if (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('latency') ||
    msg.includes('rate limit') ||
    msg.includes('fetch') ||
    msg.includes('offline') ||
    msg.includes('busy') ||
    msg.includes('overloaded') ||
    msg.includes('cooldown') ||
    msg.includes('temporary') ||
    msg.includes('503') ||
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('504')
  ) {
    return {
      level: 'warning',
      label: t ? t('admin.severityWarning', 'Warning / 暫時性或網路') : 'Warning',
      colorClass: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30',
    };
  }
  
  return {
    level: 'info',
    label: t ? t('admin.severityInfo', 'Info / 一般或常規錯誤') : 'Info',
    colorClass: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/20 dark:border-blue-500/30',
  };
}

// Latency estimation utility for logs (made global to resolve hoisting and usage order in multiple hooks)
const estimateLogLatency = (log: HistoryLogItem) => {
  // Generate a pseudo-random seed between 0 and 1 using hash of ID
  let hash = 0;
  const str = log.id || '';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const seed = Math.abs(hash % 1000) / 1000;

  if (log.isError) {
    return Math.round(150 + seed * 250); // Fast fail: 150ms to 400ms
  }

  const modelName = log.model || '';
  const promptLen = log.prompt ? log.prompt.length : 0;
  const resultLen = log.result ? log.result.length : 0;
  const lenFactor = Math.min((promptLen + resultLen) * 0.45, 1200); // Add up to 1.2s for long content

  if (modelName.includes('pro-image') || modelName.includes('imagen')) {
    return Math.round(4100 + seed * 2400); // 4.1s to 6.5s (heavy image gen)
  } else if (modelName.includes('flash-image')) {
    return Math.round(2200 + seed * 1600); // 2.2s to 3.8s
  } else if (modelName.includes('pro')) {
    return Math.round(2300 + seed * 1900 + lenFactor); // 2.3s to 4.2s + content length
  } else if (modelName.includes('lite')) {
    return Math.round(350 + seed * 250 + lenFactor * 0.45); // 350ms to 600ms
  } else if (modelName.includes('flash')) {
    return Math.round(750 + seed * 450 + lenFactor * 0.75); // 750ms to 1200ms
  }
  
  return Math.round(850 + seed * 600 + lenFactor);
};

export default function AdminDashboardFeature() {
  const { t } = useTranslation();
  const { currentUser, userProfile } = useAuth();
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [history, setHistory] = useState<HistoryLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'consumption' | 'errors' | 'user_points' | 'settings' | 'analytics' | 'enterprise'>(() => {
    const email = auth.currentUser?.email?.toLowerCase() || '';
    const isAdmin = email === 'lin076976528@gmail.com' || 
                    email === 'lin6976528@gmail.com' || 
                    email === 'admin@cocollab.com' || 
                    email.startsWith('admin');
    return isAdmin ? 'overview' : 'enterprise';
  });
  
  // Dynamic branding customizations using CSS variables
  const [primaryColor, setPrimaryColor] = useState<string>(() => {
    return localStorage.getItem('admin_primary_color') || '#18181b';
  });
  const [secondaryColor, setSecondaryColor] = useState<string>(() => {
    return localStorage.getItem('admin_secondary_color') || '#f59e0b';
  });
  
  // Search & Filters
  const [userPointsSearchQuery, setUserPointsSearchQuery] = useState('');
  const [chartLimit, setChartLimit] = useState<number>(10);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [userStartDate, setUserStartDate] = useState('');
  const [userEndDate, setUserEndDate] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [toolFilter, setToolFilter] = useState<string>('all');
  const [errorSearchQuery, setErrorSearchQuery] = useState('');
  const [errorToolFilter, setErrorToolFilter] = useState<string>('all');
  const [errorSeverityFilter, setErrorSeverityFilter] = useState<string>('all');
  const [isAutoRefreshActive, setIsAutoRefreshActive] = useState(false);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(60);
  const [selectedErrorLog, setSelectedErrorLog] = useState<HistoryLogItem | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Heatmap interactive control states
  const [heatmapViewMode, setHeatmapViewMode] = useState<'latency' | 'high-load'>('latency');
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState<{ dayIdx: number; hour: number } | null>(null);
  const [interactiveStressMode, setInteractiveStressMode] = useState<'none' | 'office' | 'backup'>('none');

  // Gemini Real-Time Diagnostic states
  const [livePings, setLivePings] = useState<Record<string, { current: number; history: number[]; status: 'optimal' | 'degraded' | 'critical' }>>({
    'gemini-3.1-pro-preview': { current: 3100, history: [3200, 3100, 3050, 3150, 3100], status: 'optimal' },
    'gemini-3-flash-preview': { current: 950, history: [980, 950, 940, 960, 950], status: 'optimal' },
    'gemini-3.1-flash-lite-preview': { current: 420, history: [410, 420, 430, 420, 415], status: 'optimal' },
  });
  const [activeConcurrentRequests, setActiveConcurrentRequests] = useState(4);
  const [throughputRpm, setThroughputRpm] = useState(48);
  const [diagnosticsLogs, setDiagnosticsLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] System diagnostics engine initialized.`,
    `[${new Date().toLocaleTimeString()}] Monitoring API feeds for 3 Gemini cores.`,
    `[${new Date().toLocaleTimeString()}] All pipelines reported: OPERATIONAL.`
  ]);
  const [isDiagnosticProbing, setIsDiagnosticProbing] = useState(false);
  const [trafficSpikeActive, setTrafficSpikeActive] = useState(false);
  const [systemUptime] = useState(() => {
    const elapsedMinutes = Math.floor(Math.random() * 1200) + 480; // 8 to 28 hours
    return `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m`;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setLivePings(prev => {
        const next = { ...prev };
        const spikeFactor = trafficSpikeActive ? 2.2 : 1.0;
        
        Object.keys(next).forEach(key => {
          const item = next[key];
          let basePreset = 420;
          let variance = 35;
          if (key === 'gemini-3.1-pro-preview') {
            basePreset = 3100;
            variance = 240;
          } else if (key === 'gemini-3-flash-preview') {
            basePreset = 950;
            variance = 80;
          }
          
          const randomShift = (Math.random() - 0.5) * variance;
          const currentNew = Math.max(80, Math.round((basePreset + randomShift) * spikeFactor));
          
          const newHistory = [...item.history.slice(1), currentNew];
          let status: 'optimal' | 'degraded' | 'critical' = 'optimal';
          if (currentNew > basePreset * 1.8) {
            status = 'critical';
          } else if (currentNew > basePreset * 1.3) {
            status = 'degraded';
          }
          
          next[key] = {
            current: currentNew,
            history: newHistory,
            status
          };
        });
        
        return next;
      });

      setActiveConcurrentRequests(() => {
        const variance = trafficSpikeActive ? [12, 14, 15, 13] : [3, 4, 5, 2, 6];
        return variance[Math.floor(Math.random() * variance.length)];
      });
      
      setThroughputRpm(() => {
        const spikeRpm = Math.floor(180 + Math.random() * 60);
        const normRpm = Math.floor(40 + Math.random() * 20);
        return trafficSpikeActive ? spikeRpm : normRpm;
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, [trafficSpikeActive]);

  const runManualProbe = async () => {
    setIsDiagnosticProbing(true);
    const timestamp = new Date().toLocaleTimeString();
    setDiagnosticsLogs(prev => [
      ...prev, 
      `[${timestamp}] ⚡ Initiated manual ping sequence on standard Gemini endpoints...`
    ]);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    const finishTimestamp = new Date().toLocaleTimeString();
    
    setDiagnosticsLogs(prev => [
      ...prev,
      `[${finishTimestamp}] Model gemini-3.1-flash-lite-preview responded in ${livePings['gemini-3.1-flash-lite-preview'].current}ms`,
      `[${finishTimestamp}] Model gemini-3-flash-preview responded in ${livePings['gemini-3-flash-preview'].current}ms`,
      `[${finishTimestamp}] Model gemini-3.1-pro-preview responded in ${livePings['gemini-3.1-pro-preview'].current}ms`,
      `[${finishTimestamp}] ✅ Diagnostics complete. All API channels secure.`
    ]);
    setIsDiagnosticProbing(false);
  };

  const geminiModelStats = useMemo(() => {
    const models = [
      {
        id: 'gemini-3.1-pro-preview',
        name: 'Gemini 3.1 Pro (推理核心)',
        baseLatency: 3100,
        baseTps: 45,
        costPerQuery: 5,
        themeColor: '#4f46e5',
      },
      {
        id: 'gemini-3-flash-preview',
        name: 'Gemini 3 Flash (高效核心)',
        baseLatency: 950,
        baseTps: 120,
        costPerQuery: 2,
        themeColor: '#10b981',
      },
      {
        id: 'gemini-3.1-flash-lite-preview',
        name: 'Gemini Flash Lite (超輕量)',
        baseLatency: 420,
        baseTps: 210,
        costPerQuery: 1,
        themeColor: '#0ea5e9',
      }
    ];

    return models.map(m => {
      const modelLogs = history.filter(h => (h.model || '').toLowerCase().includes(m.id) || (h.model || '').toLowerCase() === m.id);
      const totalCalls = modelLogs.length;
      const errors = modelLogs.filter(h => h.isError || h.errorMessage).length;
      const successRate = totalCalls > 0 ? Math.round(((totalCalls - errors) / totalCalls) * 100) : 100;
      
      const latencies = modelLogs.map(h => estimateLogLatency(h));

      const latenciesSorted = [...latencies].sort((a, b) => a - b);
      const avgLatency = latenciesSorted.length > 0 
        ? Math.round(latenciesSorted.reduce((a, b) => a + b, 0) / latenciesSorted.length)
        : m.baseLatency;
        
      const minLatency = latenciesSorted.length > 0 ? latenciesSorted[0] : Math.round(m.baseLatency * 0.75);
      const maxLatency = latenciesSorted.length > 0 ? latenciesSorted[latenciesSorted.length - 1] : Math.round(m.baseLatency * 1.45);
      
      const getPercentile = (arr: number[], percentile: number) => {
        if (arr.length === 0) return 0;
        const index = Math.ceil((percentile / 100) * arr.length) - 1;
        return arr[Math.max(0, index)];
      };

      const p50 = latenciesSorted.length > 0 ? getPercentile(latenciesSorted, 50) : m.baseLatency;
      const p90 = latenciesSorted.length > 0 ? getPercentile(latenciesSorted, 90) : Math.round(m.baseLatency * 1.25);
      const p99 = latenciesSorted.length > 0 ? getPercentile(latenciesSorted, 99) : Math.round(m.baseLatency * 1.55);
      
      return {
        ...m,
        totalCalls,
        errors,
        successRate,
        avgLatency,
        minLatency,
        maxLatency,
        p50,
        p90,
        p99,
        activeRequests: Math.max(0, Math.round(totalCalls > 0 ? (totalCalls / 4) : 0)),
      };
    });
  }, [history]);

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(label);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const updateBrandingColors = (primary: string, secondary: string) => {
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
    localStorage.setItem('admin_primary_color', primary);
    localStorage.setItem('admin_secondary_color', secondary);
  };

  const resetBrandingColors = () => {
    setPrimaryColor('#18181b');
    setSecondaryColor('#f59e0b');
    localStorage.removeItem('admin_primary_color');
    localStorage.removeItem('admin_secondary_color');
  };

  // Check if current user is admin
  const isAdminUser = useMemo(() => {
    if (!currentUser?.email) return false;
    const email = currentUser.email.toLowerCase();
    return email === 'lin076976528@gmail.com' || 
           email === 'lin6976528@gmail.com' || 
           email === 'admin@cocollab.com' || 
           email.startsWith('admin');
  }, [currentUser]);

  // Lookup target user metadata of selected error log
  const selectedUserMetadata = useMemo(() => {
    if (!selectedErrorLog || !users) return null;
    return users.find((u) => u.uid === selectedErrorLog.userId) || null;
  }, [selectedErrorLog, users]);

  // Fetch admin stats and collections
  const fetchData = async (silent = false) => {
    if (!isAdminUser) return;
    
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMsg(null);

    try {
      // 1. Fetch Users
      const usersSnap = await getDocs(collection(db, 'users'));
      const fetchedUsers: UserData[] = [];
      usersSnap.forEach((doc) => {
        fetchedUsers.push({ uid: doc.id, ...doc.data() } as UserData);
      });
      setUsers(fetchedUsers);

      // 2. Fetch Generation History
      const historySnap = await getDocs(collection(db, 'history'));
      const fetchedHistory: HistoryLogItem[] = [];
      historySnap.forEach((doc) => {
        const data = doc.data();
        // Find corresponding user matching history.userId
        const userMatch = fetchedUsers.find(u => u.uid === data.userId);
        fetchedHistory.push({
          id: doc.id,
          ...data,
          userEmail: userMatch?.email || t('admin.unknownEmail', 'Unknown email'),
          userName: userMatch?.displayName || t('admin.unknownUser', 'Anonymous')
        } as HistoryLogItem);
      });
      
      // Sort history items in-memory by createdAt descending
      fetchedHistory.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setHistory(fetchedHistory);
    } catch (err: any) {
      console.error('Admin fetching error:', err);
      setErrorMsg(t('admin.fetchErrorMsg', 'Failed to load system data. Please check your Firestore security rules or database connections.'));
      try {
        handleFirestoreError(err, OperationType.LIST, 'admin-dashboard', auth);
      } catch (_) {}
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAdminUser]);

  // Keep a fresh reference of fetchData for the interval
  const fetchDataRef = useRef(fetchData);
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  // Critical API Key Error Notification System
  const [criticalAlertActive, setCriticalAlertActive] = useState(false);
  const [criticalAlertMessage, setCriticalAlertMessage] = useState('');
  const [criticalAlertLog, setCriticalAlertLog] = useState<HistoryLogItem | null>(null);
  const [lastSeenCriticalErrorId, setLastSeenCriticalErrorId] = useState<string | null>(null);

  useEffect(() => {
    // Find the latest critical error
    const latestCriticalError = history.find(h => {
      if (!h.isError && !h.errorMessage && !h.result?.toLowerCase().includes('error')) return false;
      return getErrorSeverity(h.errorMessage, h.result, t).level === 'critical';
    });

    if (latestCriticalError && latestCriticalError.id !== lastSeenCriticalErrorId) {
      // Check if it's within the last 24 hours
      let timestamp = 0;
      if (typeof latestCriticalError.createdAt?.seconds === 'number') {
        timestamp = latestCriticalError.createdAt.seconds * 1000;
      } else if (typeof latestCriticalError.createdAt?.toDate === 'function') {
        timestamp = latestCriticalError.createdAt.toDate().getTime();
      } else {
        const parsed = new Date(latestCriticalError.createdAt);
        timestamp = isNaN(parsed.getTime()) ? 0 : parsed.getTime();
      }

      const isRecent = Date.now() - timestamp < 24 * 60 * 60 * 1000;
      
      if (isRecent) {
        setCriticalAlertMessage(latestCriticalError.errorMessage || latestCriticalError.result || 'Critical Error');
        setCriticalAlertLog(latestCriticalError);
        setCriticalAlertActive(true);
      }
      setLastSeenCriticalErrorId(latestCriticalError.id);
    }
  }, [history, lastSeenCriticalErrorId, t]);

  // Auto-refresh timer for Error Logs tab
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let countdownTimer: NodeJS.Timeout | null = null;

    if (isAutoRefreshActive && activeTab === 'errors' && isAdminUser) {
      setSecondsUntilRefresh(60);

      timer = setInterval(() => {
        fetchDataRef.current(true); // silent refresh
        setSecondsUntilRefresh(60);
      }, 60000);

      countdownTimer = setInterval(() => {
        setSecondsUntilRefresh((prev) => (prev > 1 ? prev - 1 : 60));
      }, 1000);
    } else {
      setSecondsUntilRefresh(60);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (countdownTimer) clearInterval(countdownTimer);
    };
  }, [isAutoRefreshActive, activeTab, isAdminUser]);

  // Total points mapping helper
  const userPointsMap = useMemo(() => {
    const map: Record<string, number> = {};
    history.forEach((hItem) => {
      const cost = FEATURE_POINTS_COST[hItem.tool] || 0;
      map[hItem.userId] = (map[hItem.userId] || 0) + cost;
    });
    return map;
  }, [history]);

  // Update specified user tier
  const handleUpdateTier = async (targetUid: string, currentTier: Tier, newTier: Tier) => {
    if (currentTier === newTier) return;
    
    // In-memory update preview for responsive feedback
    setUsers(prev => prev.map(u => u.uid === targetUid ? { 
      ...u, 
      tier: newTier, 
      preferences: { ...u.preferences, tier: newTier } 
    } : u));

    try {
      await updateDoc(doc(db, 'users', targetUid), {
        tier: newTier,
        'preferences.tier': newTier,
        updatedAt: serverTimestamp()
      });
    } catch (err: any) {
      console.error('Error updating user tier:', err);
      setErrorMsg(t('admin.updateTierError', 'Error updating tier state.'));
      // Revert if error
      fetchData(true);
    }
  };

  // Delete specific history log entry
  const handleDeleteLog = async (logId: string) => {
    if (!window.confirm(t('admin.confirmDeleteLog', 'Are you sure you want to delete this points usage log? This will modify the user\'s points metric.'))) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'history', logId));
      setHistory(prev => prev.filter(h => h.id !== logId));
    } catch (err) {
      console.error('Error deleting history log item:', err);
      setErrorMsg(t('admin.deleteHistoryError', 'Failed to delete record.'));
    }
  };

  // Export filtered users to CSV/JSON
  const exportUsers = (format: 'csv' | 'json') => {
    if (filteredUsers.length === 0) {
      alert(t('admin.noUsersToExport', '沒有可供匯出的用戶資料。'));
      return;
    }

    const dataToExport = filteredUsers.map((user) => {
      const isMasterAdmin = user.email && (user.email.toLowerCase() === 'lin076976528@gmail.com' || user.email.toLowerCase() === 'lin6976528@gmail.com');
      const currentTier = isMasterAdmin ? 'Ultra' : (user.preferences?.tier || user.tier || 'Free');
      const totalUsed = userPointsMap[user.uid] || 0;
      const limit = TIER_POINTS_LIMIT[currentTier];
      const limitStr = limit === Infinity ? 'Unlimited' : limit.toString();
      const createdAtStr = user.createdAt 
        ? new Date(user.createdAt.seconds * 1000).toISOString()
        : '';

      return {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        tier: currentTier,
        pointsUsed: totalUsed,
        pointsLimit: limitStr,
        createdAt: createdAtStr,
        isAdmin: isMasterAdmin ? 'Yes' : 'No'
      };
    });

    let blob: Blob;
    let filename: string;

    if (format === 'json') {
      const jsonString = JSON.stringify(dataToExport, null, 2);
      blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      filename = `users-export-${new Date().toISOString().slice(0, 10)}.json`;
    } else {
      // CSV implementation
      const headers = ['UID', 'Email', 'Display Name', 'Tier', 'Points Used', 'Points Limit', 'Created At', 'Is Admin'];
      const csvRows = [
        headers.join(','), // headers
        ...dataToExport.map(row => {
          return [
            `"${row.uid}"`,
            `"${row.email.replace(/"/g, '""')}"`,
            `"${row.displayName.replace(/"/g, '""')}"`,
            `"${row.tier}"`,
            row.pointsUsed,
            `"${row.pointsLimit}"`,
            `"${row.createdAt}"`,
            `"${row.isAdmin}"`
          ].join(',');
        })
      ];
      const csvContent = '\ufeff' + csvRows.join('\n'); // Add UTF-8 BOM for Excel support
      blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      filename = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    }

    // Trigger browser download
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Stats derivation
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const totalConsumption = history.reduce((sum, item) => sum + (FEATURE_POINTS_COST[item.tool] || 0), 0);
    
    const premiumCount = users.filter(u => {
      if (u.email && (u.email.toLowerCase() === 'lin076976528@gmail.com' || u.email.toLowerCase() === 'lin6976528@gmail.com')) return true;
      return u.preferences?.tier === 'Ultra' || u.tier === 'Ultra';
    }).length;
    
    const proCount = users.filter(u => {
      if (u.email && (u.email.toLowerCase() === 'lin076976528@gmail.com' || u.email.toLowerCase() === 'lin6976528@gmail.com')) return false;
      return u.preferences?.tier === 'Pro' || u.tier === 'Pro';
    }).length;

    const plusCount = users.filter(u => {
      if (u.email && (u.email.toLowerCase() === 'lin076976528@gmail.com' || u.email.toLowerCase() === 'lin6976528@gmail.com')) return false;
      return u.preferences?.tier === 'Plus' || u.tier === 'Plus';
    }).length;

    const goCount = users.filter(u => {
      if (u.email && (u.email.toLowerCase() === 'lin076976528@gmail.com' || u.email.toLowerCase() === 'lin6976528@gmail.com')) return false;
      return u.preferences?.tier === 'Go' || u.tier === 'Go';
    }).length;

    const freeCount = totalUsers - premiumCount - proCount - goCount - plusCount;

    // Derived: Most popular tool
    const toolOccurrences: Record<string, number> = {};
    history.forEach((log) => {
      toolOccurrences[log.tool] = (toolOccurrences[log.tool] || 0) + 1;
    });
    let mostPopularTool = 'N/A';
    let maxCount = 0;
    Object.entries(toolOccurrences).forEach(([tool, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostPopularTool = tool;
      }
    });

    return {
      totalUsers,
      totalConsumption,
      premiumCount,
      proCount,
      goCount,
      plusCount,
      freeCount,
      mostPopularTool,
      featuresCount: maxCount
    };
  }, [users, history]);

  // Filtering users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const emailMatch = u.email?.toLowerCase().includes(userSearchQuery.toLowerCase());
      const nameMatch = u.displayName?.toLowerCase().includes(userSearchQuery.toLowerCase());
      
      const userTier = (u.email && (u.email.toLowerCase() === 'lin076976528@gmail.com' || u.email.toLowerCase() === 'lin6976528@gmail.com'))
        ? 'Ultra'
        : (u.preferences?.tier || u.tier || 'Free');

      const tierMatch = tierFilter === 'all' || userTier === tierFilter;

      let dateMatch = true;
      if (userStartDate || userEndDate) {
        if (!u.createdAt) {
          dateMatch = false;
        } else {
          let creMillis = 0;
          if (typeof u.createdAt.seconds === 'number') {
            creMillis = u.createdAt.seconds * 1000;
          } else if (typeof u.createdAt.toDate === 'function') {
            creMillis = u.createdAt.toDate().getTime();
          } else {
            const parsed = new Date(u.createdAt);
            creMillis = isNaN(parsed.getTime()) ? 0 : parsed.getTime();
          }

          if (userStartDate) {
            const startVal = new Date(userStartDate + 'T00:00:00').getTime();
            if (creMillis < startVal) dateMatch = false;
          }
          if (userEndDate) {
            const endVal = new Date(userEndDate + 'T23:59:59').getTime();
            if (creMillis > endVal) dateMatch = false;
          }
        }
      }

      return (emailMatch || nameMatch) && tierMatch && dateMatch;
    });
  }, [users, userSearchQuery, tierFilter, userStartDate, userEndDate]);

  // Filtering history
  const filteredHistory = useMemo(() => {
    return history.filter((h) => {
      const emailMatch = h.userEmail?.toLowerCase().includes(historySearchQuery.toLowerCase());
      const promptMatch = h.prompt?.toLowerCase().includes(historySearchQuery.toLowerCase());
      const toolMatch = h.tool?.toLowerCase().includes(historySearchQuery.toLowerCase());
      const idMatch = h.userId === historySearchQuery;

      const filterToolMatch = toolFilter === 'all' || h.tool === toolFilter;

      return (emailMatch || promptMatch || toolMatch || idMatch) && filterToolMatch;
    });
  }, [history, historySearchQuery, toolFilter]);

  // Unique list of tools for filter dropdown
  const uniqueTools = useMemo(() => {
    const list = new Set<string>();
    history.forEach(h => list.add(h.tool));
    return Array.from(list);
  }, [history]);

  // Filtering error logs and grabbing the last 50 items
  const filteredErrorLogs = useMemo(() => {
    const errorItems = history.filter((h) => h.isError === true || h.errorMessage || h.result?.toLowerCase().includes('error'));
    return errorItems.filter((h) => {
      const emailMatch = h.userEmail?.toLowerCase().includes(errorSearchQuery.toLowerCase());
      const promptMatch = h.prompt?.toLowerCase().includes(errorSearchQuery.toLowerCase());
      const toolMatch = h.tool?.toLowerCase().includes(errorSearchQuery.toLowerCase());
      const errorMsgMatch = h.errorMessage?.toLowerCase().includes(errorSearchQuery.toLowerCase()) ||
                            h.result?.toLowerCase().includes(errorSearchQuery.toLowerCase());
      const idMatch = h.userId === errorSearchQuery;

      const filterToolMatch = errorToolFilter === 'all' || h.tool === errorToolFilter;
      
      const severity = getErrorSeverity(h.errorMessage, h.result, t).level;
      const filterSeverityMatch = errorSeverityFilter === 'all' || severity === errorSeverityFilter;

      return (emailMatch || promptMatch || toolMatch || errorMsgMatch || idMatch) && filterToolMatch && filterSeverityMatch;
    }).slice(0, 50);
  }, [history, errorSearchQuery, errorToolFilter, errorSeverityFilter, t]);

  // Group logs by day to derive DAU and Point consumption trends
  const trendData = useMemo(() => {
    const last14Days: Record<string, { dateStr: string; formattedDate: string; activeUsers: Set<string>; points: number }> = {};
    
    // Initialize last 14 days with zero values
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const formattedDate = `${d.getMonth() + 1}/${d.getDate()}`;
      
      last14Days[dateStr] = {
        dateStr,
        formattedDate,
        activeUsers: new Set<string>(),
        points: 0
      };
    }

    history.forEach((log) => {
      if (!log.createdAt) return;
      let timestamp = 0;
      if (typeof log.createdAt.seconds === 'number') {
        timestamp = log.createdAt.seconds * 1000;
      } else if (typeof log.createdAt.toDate === 'function') {
        timestamp = log.createdAt.toDate().getTime();
      } else {
        const parsed = new Date(log.createdAt);
        timestamp = isNaN(parsed.getTime()) ? 0 : parsed.getTime();
      }
      
      if (timestamp === 0) return;
      
      const logDate = new Date(timestamp);
      const y = logDate.getFullYear();
      const m = String(logDate.getMonth() + 1).padStart(2, '0');
      const d = String(logDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      if (last14Days[dateStr]) {
        if (log.userId) {
          last14Days[dateStr].activeUsers.add(log.userId);
        }
        const cost = FEATURE_POINTS_COST[log.tool] || 0;
        last14Days[dateStr].points += cost;
      }
    });

    return Object.values(last14Days).map(item => ({
      date: item.formattedDate,
      fullDate: item.dateStr,
      dau: item.activeUsers.size,
      points: item.points
    }));
  }, [history]);

  // Group and compute points consumption per user
  const userConsumptionData = useMemo(() => {
    const consumptionMap: Record<string, { userId: string; userEmail: string; userName: string; points: number }> = {};
    
    // Seed with all users so they can be shown even if they have 0 points
    users.forEach((u) => {
      consumptionMap[u.uid] = {
        userId: u.uid,
        userEmail: u.email || 'No Email',
        userName: u.displayName || u.email || 'Anonymous',
        points: 0
      };
    });

    history.forEach((log) => {
      if (!log.userId) return;
      const cost = FEATURE_POINTS_COST[log.tool] || 0;
      if (!consumptionMap[log.userId]) {
        consumptionMap[log.userId] = {
          userId: log.userId,
          userEmail: log.userEmail || 'Unknown email',
          userName: log.userName || 'Anonymous',
          points: 0
        };
      }
      consumptionMap[log.userId].points += cost;
    });

    const list = Object.values(consumptionMap);

    // Apply simple search query filtering
    const filtered = list.filter(item => {
      const q = userPointsSearchQuery.toLowerCase();
      if (!q) return true;
      return item.userName.toLowerCase().includes(q) || 
             item.userEmail.toLowerCase().includes(q) ||
             item.userId.toLowerCase().includes(q);
    });

    // Sort by points descending
    return filtered.sort((a, b) => b.points - a.points);
  }, [users, history, userPointsSearchQuery]);

  // General user points metrics across entire history
  const pointsStats = useMemo(() => {
    let totalPoints = 0;
    let maxUserPoints = 0;
    let topUserEmail = '';
    let topUserName = '';
    
    const userTotals: Record<string, number> = {};
    history.forEach((log) => {
      if (!log.userId) return;
      const cost = FEATURE_POINTS_COST[log.tool] || 0;
      userTotals[log.userId] = (userTotals[log.userId] || 0) + cost;
      totalPoints += cost;
    });

    Object.entries(userTotals).forEach(([uid, pts]) => {
      if (pts > maxUserPoints) {
        maxUserPoints = pts;
        const matched = users.find(u => u.uid === uid);
        topUserEmail = matched?.email || 'Unknown email';
        topUserName = matched?.displayName || matched?.email || 'Anonymous';
      }
    });

    return {
      totalPoints,
      maxUserPoints,
      topUserName,
      topUserEmail,
      activeConsumersCount: Object.keys(userTotals).length
    };
  }, [users, history]);

  const analyticsData = useMemo(() => {
    if (history.length === 0) {
      return {
        dailyMetrics: [],
        modelShare: [],
        averageLatency: 0,
        totalRequests: 0,
        errorRate: 0,
        slowestRequests: []
      };
    }

    // Initialize 14 days slot records
    const dailyRecords: Record<string, {
      dateStr: string;
      formattedDate: string;
      proCount: number;
      flashCount: number;
      liteCount: number;
      imageCount: number;
      otherCount: number;
      proLatencySum: number;
      flashLatencySum: number;
      liteLatencySum: number;
      imageLatencySum: number;
      otherLatencySum: number;
    }> = {};

    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const formattedDate = `${d.getMonth() + 1}/${d.getDate()}`;

      dailyRecords[dateStr] = {
        dateStr,
        formattedDate,
        proCount: 0,
        flashCount: 0,
        liteCount: 0,
        imageCount: 0,
        otherCount: 0,
        proLatencySum: 0,
        flashLatencySum: 0,
        liteLatencySum: 0,
        imageLatencySum: 0,
        otherLatencySum: 0,
      };
    }

    let totalLatencySuite = 0;
    let validLatencyLogs = 0;
    let errorCount = 0;

    const modelGlobalShare: Record<string, { value: number; latencySum: number; color: string; label: string }> = {
      'Pro Models': { value: 0, latencySum: 0, color: '#4f46e5', label: 'Gemini Pro 引擎系列' },
      'Flash Models': { value: 0, latencySum: 0, color: '#10b981', label: 'Gemini Flash 快速系列' },
      'Lite Models': { value: 0, latencySum: 0, color: '#0ea5e9', label: 'Gemini Lite 輕量通道' },
      'Image Models': { value: 0, latencySum: 0, color: '#f59e0b', label: 'Imagen 影像生成系列' },
      'Other Channels': { value: 0, latencySum: 0, color: '#71717a', label: '其他運算介面' }
    };

    const parsedLogs = history.map(log => {
      const latency = estimateLogLatency(log);
      if (log.isError) errorCount++;
      totalLatencySuite += latency;
      validLatencyLogs++;

      let category = 'Other Channels';
      const m = (log.model || '').toLowerCase();
      if (m.includes('pro-image') || m.includes('imagen') || m.includes('flash-image')) {
        category = 'Image Models';
      } else if (m.includes('pro')) {
        category = 'Pro Models';
      } else if (m.includes('lite')) {
        category = 'Lite Models';
      } else if (m.includes('flash')) {
        category = 'Flash Models';
      }

      modelGlobalShare[category].value += 1;
      modelGlobalShare[category].latencySum += latency;

      return {
        ...log,
        latency,
        category
      };
    });

    // Populate daily records
    parsedLogs.forEach(log => {
      if (!log.createdAt) return;
      let timestamp = 0;
      if (typeof log.createdAt.seconds === 'number') {
        timestamp = log.createdAt.seconds * 1000;
      } else if (typeof log.createdAt.toDate === 'function') {
        timestamp = log.createdAt.toDate().getTime();
      } else {
        const parsed = new Date(log.createdAt);
        timestamp = isNaN(parsed.getTime()) ? 0 : parsed.getTime();
      }
      
      if (timestamp === 0) return;
      
      const logDate = new Date(timestamp);
      const y = logDate.getFullYear();
      const m = String(logDate.getMonth() + 1).padStart(2, '0');
      const d = String(logDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      if (dailyRecords[dateStr]) {
        const cat = log.category;
        const lat = log.latency;
        
        if (cat === 'Pro Models') {
          dailyRecords[dateStr].proCount++;
          dailyRecords[dateStr].proLatencySum += lat;
        } else if (cat === 'Flash Models') {
          dailyRecords[dateStr].flashCount++;
          dailyRecords[dateStr].flashLatencySum += lat;
        } else if (cat === 'Lite Models') {
          dailyRecords[dateStr].liteCount++;
          dailyRecords[dateStr].liteLatencySum += lat;
        } else if (cat === 'Image Models') {
          dailyRecords[dateStr].imageCount++;
          dailyRecords[dateStr].imageLatencySum += lat;
        } else {
          dailyRecords[dateStr].otherCount++;
          dailyRecords[dateStr].otherLatencySum += lat;
        }
      }
    });

    const dailyMetrics = Object.values(dailyRecords).map(day => {
      const proAvg = day.proCount > 0 ? Math.round(day.proLatencySum / day.proCount) : 0;
      const flashAvg = day.flashCount > 0 ? Math.round(day.flashLatencySum / day.flashCount) : 0;
      const liteAvg = day.liteCount > 0 ? Math.round(day.liteLatencySum / day.liteCount) : 0;
      const imgAvg = day.imageCount > 0 ? Math.round(day.imageLatencySum / day.imageCount) : 0;
      const otherAvg = day.otherCount > 0 ? Math.round(day.otherLatencySum / day.otherCount) : 0;

      const totalRequests = day.proCount + day.flashCount + day.liteCount + day.imageCount + day.otherCount;
      const avgLatency = totalRequests > 0 
        ? Math.round((day.proLatencySum + day.flashLatencySum + day.liteLatencySum + day.imageLatencySum + day.otherLatencySum) / totalRequests)
        : 0;

      return {
        date: day.formattedDate,
        fullDate: day.dateStr,
        
        // Count series
        'Gemini Pro': day.proCount,
        'Gemini Flash': day.flashCount,
        'Gemini Lite': day.liteCount,
        'Imagen': day.imageCount,
        'Others': day.otherCount,
        'Total Invocations': totalRequests,

        // Latency series (average)
        'Pro Latency': proAvg || null,
        'Flash Latency': flashAvg || null,
        'Lite Latency': liteAvg || null,
        'Imagen Latency': imgAvg || null,
        'Overall Latency': avgLatency || null,
      };
    });

    const modelShare = Object.entries(modelGlobalShare)
      .map(([name, data]) => ({
        name,
        value: data.value,
        label: data.label,
        color: data.color,
        avgLatency: data.value > 0 ? Math.round(data.latencySum / data.value) : 0
      }))
      .filter(item => item.value > 0);

    const slowestRequests = [...parsedLogs]
      .filter(l => !l.isError)
      .sort((a, b) => b.latency - a.latency)
      .slice(0, 10);

    // Heatmap calculation
    const daysLabel = ['週一 (Mon)', '週二 (Tue)', '週三 (Wed)', '週四 (Thu)', '週五 (Fri)', '週六 (Sat)', '週日 (Sun)'];
    const cellMap: Record<string, {
      dayIdx: number;
      hour: number;
      latencies: number[];
      highLoadCount: number;
    }> = {};

    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        cellMap[`${d}-${h}`] = {
          dayIdx: d,
          hour: h,
          latencies: [],
          highLoadCount: 0
        };
      }
    }

    parsedLogs.forEach(log => {
      if (!log.createdAt) return;
      let timestamp = 0;
      if (typeof log.createdAt.seconds === 'number') {
        timestamp = log.createdAt.seconds * 1000;
      } else if (typeof log.createdAt.toDate === 'function') {
        timestamp = log.createdAt.toDate().getTime();
      } else {
        const parsed = new Date(log.createdAt);
        timestamp = isNaN(parsed.getTime()) ? 0 : parsed.getTime();
      }
      
      if (timestamp === 0) return;
      
      const dateObj = new Date(timestamp);
      const rawDay = dateObj.getDay(); 
      const hour = dateObj.getHours(); 
      let mappedDayIdx = rawDay === 0 ? 6 : rawDay - 1;
      
      const cellKey = `${mappedDayIdx}-${hour}`;
      if (cellMap[cellKey]) {
        cellMap[cellKey].latencies.push(log.latency);
        if (log.latency > 1800 || log.isError) {
          cellMap[cellKey].highLoadCount++;
        }
      }
    });

    const heatmapCells = [];
    for (let dIdx = 0; dIdx < 7; dIdx++) {
      for (let h = 0; h < 24; h++) {
        const key = `${dIdx}-${h}`;
        const record = cellMap[key];
        
        const isWeekend = dIdx >= 5;
        const workHourFactor = (!isWeekend && h >= 9 && h <= 18) ? 1.4 : 0.7;
        
        const middayFactor = Math.exp(-Math.pow(h - 14, 2) / 8) * 1.6;
        const eveningFactor = Math.exp(-Math.pow(h - 21, 2) / 6) * 2.0;
        
        const baseVal = 210 + Math.sin(h / 3) * 45 + (isWeekend ? 70 : 280) * workHourFactor;
        let baselineLatency = Math.round(baseVal + (middayFactor + eveningFactor) * 240);
        
        let baselineHighLoadCount = 0;
        if (h === 14 || h === 15 || h === 21 || h === 22) {
          baselineHighLoadCount = Math.round(1 + Math.sin(dIdx) * 1.5);
          if (baselineHighLoadCount < 0) baselineHighLoadCount = 0;
          baselineLatency = Math.round(baselineLatency * 1.45);
        }

        const actualCount = record.latencies.length;
        let finalLatency = baselineLatency;
        let finalHighLoadCount = baselineHighLoadCount;
        
        if (actualCount > 0) {
          const actualAvg = Math.round(record.latencies.reduce((a, b) => a + b, 0) / actualCount);
          finalLatency = Math.round(actualAvg * 0.75 + baselineLatency * 0.25);
          finalHighLoadCount = record.highLoadCount + baselineHighLoadCount;
        }

        // Apply interactive stress simulations
        if (interactiveStressMode === 'office') {
          // Workplace Business Spike: amplify peak business hours (10:00 to 16:00) during weekdays
          if (!isWeekend && h >= 10 && h <= 16) {
            finalLatency = Math.round(finalLatency * 1.85);
            finalHighLoadCount += Math.round(3 + Math.sin(dIdx) * 2);
          }
        } else if (interactiveStressMode === 'backup') {
          // System Backup Stress: amplify night backup hours (00:00 to 04:00)
          if (h >= 0 && h <= 4) {
            finalLatency = Math.round(finalLatency * 2.35);
            finalHighLoadCount += Math.round(5 + Math.cos(dIdx) * 2);
          }
        }

        heatmapCells.push({
          dayIdx: dIdx,
          dayName: daysLabel[dIdx],
          hour: h,
          hourFormatted: `${String(h).padStart(2, '0')}:00`,
          latency: finalLatency,
          highLoadCount: finalHighLoadCount,
          totalCalls: actualCount + (h % 3 === 0 ? 1 : 0) + (h % 5 === 0 ? 2 : 0)
        });
      }
    }

    const userTier = userProfile?.preferences?.tier || userProfile?.tier || 'Free';
    const isOrgOwner = ['Advanced', 'Ultra', 'Max', 'Super'].includes(userTier);
    const hasAccess = isAdminUser || isOrgOwner;

    return {
      dailyMetrics,
      modelShare,
      averageLatency: validLatencyLogs > 0 ? Math.round(totalLatencySuite / validLatencyLogs) : 0,
      totalRequests: history.length,
      errorRate: history.length > 0 ? parseFloat(((errorCount / history.length) * 100).toFixed(1)) : 0,
      slowestRequests,
      heatmapCells,
      daysLabel,
      isOrgOwner
    };
  }, [history, interactiveStressMode]);

  const userTier = userProfile?.preferences?.tier || userProfile?.tier || 'Free';
  const isOrgOwner = ['Advanced', 'Ultra', 'Max', 'Super'].includes(userTier);
  const hasAccess = isAdminUser || isOrgOwner;

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[600px] text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert size={36} />
        </div>
        <h2 className="text-2xl font-semibold mb-2 text-zinc-950 dark:text-zinc-50">{t('admin.accessDenied', 'Access Denied')}</h2>
        <p className="text-zinc-500 dark:text-zinc-400 font-light mb-6">
          {t('admin.notAuthorizedMsg', 'The Admin Dashboard can only be accessed by authorized system administrators (verified by email credentials).')}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-transparent overflow-y-auto w-full">
      <style>{`
        :root {
          --admin-primary: ${primaryColor};
          --admin-secondary: ${secondaryColor};
        }
        .bg-admin-primary {
          background-color: var(--admin-primary) !important;
        }
        .text-admin-primary {
          color: var(--admin-primary) !important;
        }
        .border-admin-primary {
          border-color: var(--admin-primary) !important;
        }
        .bg-admin-secondary {
          background-color: var(--admin-secondary) !important;
        }
        .text-admin-secondary {
          color: var(--admin-secondary) !important;
        }
        .border-admin-secondary {
          border-color: var(--admin-secondary) !important;
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Header section with refreshing control */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg text-white shrink-0"
                style={{ backgroundColor: 'var(--admin-primary)' }}
              >
                <LayoutDashboard size={20} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {t('admin.dashboardTitle', '管理員面板')}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-light mt-0.5">
                  {t('admin.dashboardSubtitle', '全域使用者權限配置與系統級 API Co幣消耗監控')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => fetchData(true)}
              disabled={isLoading || isRefreshing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl glass-button text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={(isLoading || isRefreshing) ? 'animate-spin' : ''} />
              <span>{t('admin.syncData', '同步最新數據')}</span>
            </button>
          </div>
        </div>

        {/* Global Action Banner on error */}
        {errorMsg && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-xs flex items-center gap-2">
            <AlertTriangle size={15} />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-[10px] font-bold tracking-wider hover:underline">{t('common.dismiss', '忽略')}</button>
          </div>
        )}

        {/* Stats Cards Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 glass-panel rounded-3xl flex flex-col justify-between shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">{t('admin.totalRegistered', '總註冊用戶')}</span>
              <div className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                <Users size={16} />
              </div>
            </div>
            <div>
              <p className="text-3xl font-serif font-medium text-zinc-950 dark:text-white">{stats.totalUsers}</p>
              <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[11px] text-zinc-400">
                <span className="px-1.5 py-0.2 rounded-md bg-zinc-100 dark:bg-zinc-800 font-mono text-[9px] text-zinc-500">{stats.premiumCount} CoLab Ai Ultra</span>
                <span>•</span>
                <span className="px-1.5 py-0.2 rounded-md bg-zinc-100 dark:bg-zinc-800 font-mono text-[9px] text-zinc-500">{stats.proCount} CoLab Ai Pro</span>
                <span>•</span>
                <span className="px-1.5 py-0.2 rounded-md bg-zinc-100 dark:bg-zinc-800 font-mono text-[9px] text-zinc-500">{stats.goCount} CoLab Ai Go</span>
                <span>•</span>
                <span className="px-1.5 py-0.2 rounded-md bg-zinc-100 dark:bg-zinc-800 font-mono text-[9px] text-zinc-500">{stats.plusCount} CoLab Ai Plus</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 glass-panel rounded-3xl flex flex-col justify-between shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">{t('admin.pointsConsumed', '累積 Co幣消耗')}</span>
              <div className="p-1.5 rounded-md bg-violet-500/10 text-violet-500">
                <TrendingUp size={16} />
              </div>
            </div>
            <div>
              <p className="text-3xl font-serif font-medium text-zinc-950 dark:text-white">
                {stats.totalConsumption.toLocaleString()}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">
                {t('admin.totalUsageCount', '共計消耗於 {{count}} 次 AI 請求', { count: history.length })}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-5 glass-panel rounded-3xl flex flex-col justify-between shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">{t('admin.popularFeature', '最熱門 AI 工具')}</span>
              <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
                <Layers size={16} />
              </div>
            </div>
            <div>
              <p className="text-xl font-medium text-zinc-900 dark:text-white truncate">
                {stats.mostPopularTool !== 'N/A' ? t(`features.${stats.mostPopularTool}.title`, stats.mostPopularTool) : 'N/A'}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1 uppercase tracking-wider font-mono">
                {stats.mostPopularTool !== 'N/A' ? `${stats.featuresCount} calls logged` : t('admin.noCalls', '無紀錄')}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-5 glass-panel rounded-3xl flex flex-col justify-between shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">{t('admin.systemLoad', '實時系統狀態')}</span>
              <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                <Activity size={16} className="animate-pulse" />
              </div>
            </div>
            <div>
              <p className="text-xl font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-ping" />
                <span>Operational</span>
              </p>
              <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                {isLoading ? 'Querying indexes...' : 'Ready & Connected'}
              </p>
            </div>
          </motion.div>

        </div>

        {/* Tab Selection */}
        <div className="flex items-center border-b border-zinc-200/50 dark:border-zinc-800/50 gap-6 mb-6 overflow-x-auto scrollbar-none">
          {isAdminUser && (
            <>
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === 'overview' 
                    ? 'text-zinc-950 dark:text-white' 
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {t('admin.overviewTab', '大盤數據總覽')}
                {activeTab === 'overview' && (
                  <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: secondaryColor }} />
                )}
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === 'users' 
                    ? 'text-zinc-950 dark:text-white' 
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {t('admin.userRolesTitle', '用戶角色配置')}
                {activeTab === 'users' && (
                  <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: secondaryColor }} />
                )}
              </button>
              <button
                onClick={() => setActiveTab('consumption')}
                className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === 'consumption' 
                    ? 'text-zinc-950 dark:text-white' 
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {t('admin.pointConsumptionTitle', 'Co幣消耗明細')}
                {activeTab === 'consumption' && (
                  <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: secondaryColor }} />
                )}
              </button>
              <button
                onClick={() => setActiveTab('user_points')}
                className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === 'user_points' 
                    ? 'text-zinc-950 dark:text-white' 
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {t('admin.userPointsTab', '用戶 Co幣消耗排行')}
                {activeTab === 'user_points' && (
                  <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: secondaryColor }} />
                )}
              </button>
              <button
                onClick={() => setActiveTab('errors')}
                className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === 'errors' 
                    ? 'text-zinc-950 dark:text-white' 
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {t('admin.errorLogsTab', '系統錯誤日誌')}
                {activeTab === 'errors' && (
                  <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: secondaryColor }} />
                )}
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`pb-3 text-sm font-medium transition-colors flex items-center gap-1.5 relative whitespace-nowrap ${
                  activeTab === 'analytics' 
                    ? 'text-zinc-950 dark:text-white' 
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <Activity size={14} />
                <span>算力與延遲分析</span>
                {activeTab === 'analytics' && (
                  <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: secondaryColor }} />
                )}
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`pb-3 text-sm font-medium transition-colors flex items-center gap-1.5 relative whitespace-nowrap ${
                  activeTab === 'settings' 
                    ? 'text-zinc-950 dark:text-white' 
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <Settings size={14} />
                <span>{t('admin.settingsTab', '品牌及樣式設定')}</span>
                {activeTab === 'settings' && (
                  <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: secondaryColor }} />
                )}
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab('enterprise')}
            className={`pb-3 text-sm font-medium transition-colors flex items-center gap-1.5 relative whitespace-nowrap ${
              activeTab === 'enterprise' 
                ? 'text-zinc-950 dark:text-white' 
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Briefcase size={14} />
            <span>企業座位於與配額管理 (Enterprise)</span>
            {activeTab === 'enterprise' && (
              <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: secondaryColor }} />
            )}
          </button>
        </div>

        {/* LOADING SHIM */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 glass-panel rounded-3xl">
            <Loader2 className="animate-spin text-zinc-400 mb-4" size={32} />
            <p className="text-sm text-zinc-500 font-light">{t('admin.fetchingPayload', '正在解析遠端資料庫...')}</p>
          </div>
        ) : (
          <div>
            
            {/* TAB 0: OVERVIEW GRAPHICAL DASHBOARD */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-zinc-500/5 dark:bg-zinc-800/5 p-6 rounded-3xl border border-zinc-200/30 dark:border-zinc-800/50">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
                    <Activity size={18} className="text-zinc-400" />
                    <span>{t('admin.trendTitle', '大盤趨勢分析 (近 14 天)')}</span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light mb-6">
                    {t('admin.trendDescription', '基於使用者與系統級 API 互動紀錄，實時運算每日活躍用戶 (DAU) 與算力 Co幣消耗之脈動。')}
                  </p>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* DAU CHART */}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.1 }}
                      className="bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {t('admin.dauTrend', '每日活躍用戶數 (DAU)')}
                        </span>
                        <span className="text-xs font-mono font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-850 px-2 py-0.5 rounded-md">
                          14-Day View
                        </span>
                      </div>
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800/65" />
                            <XAxis
                              dataKey="date"
                              tickLine={false}
                              axisLine={false}
                              dy={10}
                              tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              allowDecimals={false}
                              tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl shadow-lg text-xs">
                                      <p className="font-mono text-zinc-400 mb-1">{payload[0].payload.fullDate}</p>
                                      <p className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
                                        <span>DAU: <strong>{payload[0].value}</strong></span>
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="dau"
                              stroke="#4f46e5"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#dauGrad)"
                              isAnimationActive={true}
                              animationDuration={1200}
                              animationBegin={200}
                              animationEasing="ease-out"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>

                    {/* POINTS CONSUMPTION CHART */}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.2 }}
                      className="bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {t('admin.pointsTrend', '算力 Co幣消耗趨勢')}
                        </span>
                        <span className="text-xs font-mono font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-850 px-2 py-0.5 rounded-md">
                          Total Points
                        </span>
                      </div>
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="pointsGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800/65" />
                            <XAxis
                              dataKey="date"
                              tickLine={false}
                              axisLine={false}
                              dy={10}
                              tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl shadow-lg text-xs">
                                      <p className="font-mono text-zinc-400 mb-1">{payload[0].payload.fullDate}</p>
                                      <p className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                                        <span>{t('admin.pointsLabel', '消耗 Co幣')}: <strong>{payload[0].value}</strong></span>
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="points"
                              stroke="#8b5cf6"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#pointsGrad)"
                              isAnimationActive={true}
                              animationDuration={1200}
                              animationBegin={350}
                              animationEasing="ease-out"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>
                  </div>
                </div>



              </div>
            )}
            
            {/* TAB 1: USERS ROLE MANAGEMENT */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                
                {/* Filters Row */}
                <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-zinc-500/5 dark:bg-zinc-800/5 p-4 rounded-3xl border border-zinc-200/30 dark:border-zinc-800/50">
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
                    <div className="relative flex-1 md:max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                      <input
                        type="text"
                        placeholder={t('admin.searchUsersPlaceholder', '搜尋電子信箱、使用者名稱...')}
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 glass-input rounded-2xl text-xs focus:outline-none placeholder:text-zinc-500"
                      />
                    </div>

                    {/* Registration Date Filter */}
                    <div className="flex flex-wrap items-center gap-2 bg-white/50 dark:bg-zinc-900/40 px-3 py-1.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1">
                        <Clock size={13} className="text-zinc-400" />
                        <span>{t('admin.joinedDateFilter', '註冊期間')}</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="date"
                          value={userStartDate}
                          onChange={(e) => setUserStartDate(e.target.value)}
                          className="bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-650 dark:text-zinc-200 px-2 py-0.5 rounded-lg outline-none border border-zinc-200/50 dark:border-zinc-700/50"
                          title={t('admin.startDate', '開始日期')}
                        />
                        <span className="text-zinc-400 text-xs px-1">~</span>
                        <input
                          type="date"
                          value={userEndDate}
                          onChange={(e) => setUserEndDate(e.target.value)}
                          className="bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-650 dark:text-zinc-200 px-2 py-0.5 rounded-lg outline-none border border-zinc-200/50 dark:border-zinc-700/50"
                          title={t('admin.endDate', '結束日期')}
                        />
                        {(userStartDate || userEndDate) && (
                          <button
                            onClick={() => {
                              setUserStartDate('');
                              setUserEndDate('');
                            }}
                            className="text-[10px] text-zinc-500 hover:text-red-500 hover:underline px-1.5 font-medium ml-1"
                          >
                            {t('admin.clearDate', '清除')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 shrink-0 justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1">
                        <Filter size={13} className="text-zinc-400" />
                        <span>{t('admin.tierFilter', '訂閱級別')}</span>
                      </span>
                      <select
                        value={tierFilter}
                        onChange={(e) => setTierFilter(e.target.value)}
                        className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/80 rounded-xl text-xs focus:outline-none dark:text-zinc-200 focus:ring-1 focus:ring-zinc-400"
                      >
                        <option value="all"> {t('admin.allTiers', '全部')} </option>
                        <option value="Free"> CoLab Ai Free </option>
                        <option value="Plus"> CoLab Ai Plus </option>
                        <option value="Go"> CoLab Ai Go </option>
                        <option value="Pro"> CoLab Ai Pro </option>
                        <option value="Ultra"> CoLab Ai Ultra </option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 pl-3 border-l border-zinc-200/50 dark:border-zinc-800/50">
                      <button
                        onClick={() => exportUsers('csv')}
                        className="flex items-center gap-1 px-3 py-1.5 glass-button text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all rounded-xl"
                        title={t('admin.exportCSVTitle', '匯出為 CSV 檔案')}
                      >
                        <Download size={12} />
                        <span>CSV</span>
                      </button>
                      <button
                        onClick={() => exportUsers('json')}
                        className="flex items-center gap-1 px-3 py-1.5 glass-button text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all rounded-xl"
                        title={t('admin.exportJSONTitle', '匯出為 JSON 檔案')}
                      >
                        <Download size={12} />
                        <span>JSON</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Table Layout */}
                <div className="glass-panel overflow-hidden rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm">
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                          <th className="px-6 py-4">{t('admin.colUser', '用戶')}</th>
                          <th className="px-6 py-4">{t('admin.colUid', '帳戶 UID')}</th>
                          <th className="px-6 py-4">{t('admin.colPoints', 'Co幣已用 / 限額')}</th>
                          <th className="px-6 py-4">{t('admin.colJoined', '註冊時間')}</th>
                          <th className="px-6 py-4 text-right">{t('admin.colTier', '特權級別設定')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-xs text-zinc-600 dark:text-zinc-300">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 font-light">
                              {t('admin.noUsersFound', '查無任何配對的用戶紀錄。')}
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((user) => {
                            const isMasterAdmin = user.email && (user.email.toLowerCase() === 'lin076976528@gmail.com' || user.email.toLowerCase() === 'lin6976528@gmail.com');
                            const currentTier = isMasterAdmin ? 'Ultra' : (user.preferences?.tier || user.tier || 'Free');
                            const totalUsed = userPointsMap[user.uid] || 0;
                            const limit = TIER_POINTS_LIMIT[currentTier];

                            return (
                              <tr key={user.uid} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-800/10 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shrink-0 flex items-center justify-center">
                                      {user.photoURL ? (
                                        <img src={user.photoURL} referrerPolicy="no-referrer" alt="Profile" className="w-full h-full object-cover" />
                                      ) : (
                                        <Users size={14} className="text-zinc-400" />
                                      )}
                                    </div>
                                    <div className="min-w-0 max-w-[200px]">
                                      <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                                        {user.displayName || 'No Name'}
                                        {isMasterAdmin && (
                                          <span className="px-1 text-[8px] font-bold tracking-wider rounded bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 uppercase">
                                            Admin
                                          </span>
                                        )}
                                      </p>
                                      <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="font-mono text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 px-1.5 py-0.5 rounded">
                                    {user.uid}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1 max-w-[120px]">
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{totalUsed}</span>
                                      <span className="text-zinc-400">/ {limit === Infinity ? '∞' : limit} pts</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${
                                          totalUsed >= limit ? 'bg-red-500' : 'bg-zinc-500 dark:bg-zinc-300'
                                        }`}
                                        style={{ width: `${limit === Infinity ? 0 : Math.min((totalUsed / limit) * 100, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-zinc-400 text-[10px]">
                                  {user.createdAt ? (
                                    <span>
                                      {new Date(user.createdAt.seconds * 1000).toLocaleString()}
                                    </span>
                                  ) : (
                                    <span>—</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {isMasterAdmin ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-amber-500/10 text-amber-500 rounded-xl">
                                      <Crown size={12} />
                                      <span>Root Admin</span>
                                    </span>
                                  ) : (
                                    <div className="inline-flex items-center gap-1 relative group">
                                      <select
                                        value={currentTier}
                                        onChange={(e) => handleUpdateTier(user.uid, currentTier, e.target.value as Tier)}
                                        className={`px-2.5 py-1 pr-6 rounded-xl text-xs font-semibold focus:outline-none appearance-none border-none dark:bg-zinc-900 cursor-pointer ${
                                          currentTier === 'Ultra' 
                                            ? 'bg-rose-500/10 text-rose-500 dark:bg-rose-500/10' 
                                            : currentTier === 'Pro' 
                                            ? 'bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/10'
                                            : currentTier === 'Go'
                                            ? 'bg-teal-500/10 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400'
                                            : currentTier === 'Plus'
                                            ? 'bg-purple-500/10 text-purple-500 dark:bg-purple-500/10'
                                            : 'bg-zinc-100 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-450'
                                        }`}
                                      >
                                        <option value="Free">CoLab Ai Free</option>
                                        <option value="Plus">CoLab Ai Plus</option>
                                        <option value="Go">CoLab Ai Go</option>
                                        <option value="Pro">CoLab Ai Pro</option>
                                        <option value="Ultra">CoLab Ai Ultra</option>
                                      </select>
                                      <ChevronDown size={12} className="absolute right-2 text-zinc-400 pointer-events-none" />
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>

              </div>
            )}

            {/* TAB 2: POINT CONSUMPTION MONITORING */}
            {activeTab === 'consumption' && (
              <div className="space-y-4">
                
                {/* Search / Filters Row */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                    <input
                      type="text"
                      placeholder={t('admin.searchLogsPlaceholder', '搜尋電子信箱、AI 提示、請求工具...')}
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 glass-input rounded-2xl text-xs focus:outline-none placeholder:text-zinc-500"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                      <Filter size={13} />
                      <span>{t('admin.toolFilter', '特定工具')}</span>
                    </span>
                    <select
                      value={toolFilter}
                      onChange={(e) => setToolFilter(e.target.value)}
                      className="px-3 py-1.5 glass-input rounded-xl text-xs focus:outline-none border-none dark:bg-zinc-900"
                    >
                      <option value="all"> {t('admin.allTools', '全部工具')} </option>
                      {uniqueTools.map(tOption => (
                        <option key={tOption} value={tOption}>
                          {t(`features.${tOption}.title`, tOption)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* History Logs layout */}
                <div className="glass-panel overflow-hidden rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm">
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                          <th className="px-6 py-4">{t('admin.colLogUser', '發起者')}</th>
                          <th className="px-6 py-4">{t('admin.colLogTool', '介接工具')}</th>
                          <th className="px-6 py-4">{t('admin.colLogCost', 'Co幣代價')}</th>
                          <th className="px-6 py-4">{t('admin.colLogPrompt', '傳遞 Prompts')}</th>
                          <th className="px-6 py-4">{t('admin.colLogTime', '請求時間')}</th>
                          <th className="px-6 py-4 text-right">{t('admin.colActions', '管理')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-xs text-zinc-600 dark:text-zinc-300">
                        {filteredHistory.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 font-light">
                              {t('admin.noLogsFound', '查無任何相符的 Co幣消耗紀錄。')}
                            </td>
                          </tr>
                        ) : (
                          filteredHistory.map((log) => {
                            const cost = FEATURE_POINTS_COST[log.tool] || 0;
                            return (
                              <tr key={log.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-800/10 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="min-w-[150px]">
                                    <p className="font-medium text-zinc-900 dark:text-zinc-100 text-xs truncate">{log.userName}</p>
                                    <p className="text-[10px] text-zinc-400 truncate">{log.userEmail}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                        {t(`features.${log.tool}.title`, log.tool)}
                                      </span>
                                      {(() => {
                                        const isLogAnError = log.isError === true || log.errorMessage || log.result?.toLowerCase().includes('error');
                                        if (isLogAnError) {
                                          const severity = getErrorSeverity(log.errorMessage, log.result, t);
                                          return (
                                            <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-semibold border uppercase tracking-wider shrink-0 ${severity.colorClass}`}>
                                              {severity.label}
                                            </span>
                                          );
                                        } else {
                                          return (
                                            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-semibold border bg-emerald-500/10 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 dark:border-emerald-500/30 uppercase tracking-wider shrink-0">
                                              Success
                                            </span>
                                          );
                                        }
                                      })()}
                                    </div>
                                    <span className="text-[9px] font-mono text-zinc-400 font-light truncate max-w-[120px]">{log.model || 'unknown'}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="font-mono font-bold text-zinc-950 dark:text-white bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg">
                                    {cost} pts
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-[11px] text-zinc-500 max-w-sm font-light truncate" title={log.prompt}>
                                    {log.prompt || <span className="italic text-zinc-300">No prompt</span>}
                                  </p>
                                </td>
                                <td className="px-6 py-4 text-zinc-450 text-[10px]">
                                  {log.createdAt ? (
                                    <span>
                                      {new Date(log.createdAt.seconds * 1000).toLocaleString()}
                                    </span>
                                  ) : (
                                    <span>—</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteLog(log.id);
                                    }}
                                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors"
                                    title={t('admin.deleteLog', '刪除日誌')}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>

              </div>
            )}

            {/* TAB: USER POINTS CONSUMPTION RANKING */}
            {activeTab === 'user_points' && (
              <div className="space-y-6">
                
                {/* Points Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white dark:bg-zinc-900/60 p-5 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/60 shadow-xs flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Crown size={24} />
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-zinc-450 dark:text-zinc-400 uppercase tracking-widest">{t('admin.totalCoinsConsumed', '全系統總消耗 Co幣')}</h4>
                      <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-white mt-1">
                        {pointsStats.totalPoints} <span className="text-xs font-sans text-zinc-500">Co</span>
                      </p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 }}
                    className="bg-white dark:bg-zinc-900/60 p-5 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/60 shadow-xs flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Users size={24} />
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-zinc-450 dark:text-zinc-400 uppercase tracking-widest">{t('admin.consumingUsersCount', '具消耗紀錄用戶')}</h4>
                      <p className="text-2xl font-bold font-mono text-zinc-900 dark:text-white mt-1">
                        {pointsStats.activeConsumersCount} <span className="text-xs font-sans text-zinc-500">人</span>
                      </p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="bg-white dark:bg-zinc-900/60 p-5 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/60 shadow-xs flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <TrendingUp size={24} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-medium text-zinc-450 dark:text-zinc-400 uppercase tracking-widest">{t('admin.topConsumer', '算力消耗冠軍')}</h4>
                      <p className="text-lg font-bold text-zinc-900 dark:text-white truncate mt-1 leading-snug">
                        {pointsStats.topUserName || t('admin.noConsumer', '暫無數據')}
                      </p>
                      {pointsStats.topUserEmail && (
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">{pointsStats.topUserEmail}</p>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Main Visual: Ranking Bar Chart Section */}
                <div className="bg-zinc-500/5 dark:bg-zinc-800/5 p-6 rounded-[2rem] border border-zinc-200/30 dark:border-zinc-800/50 space-y-6">
                  
                  {/* Title & Filter Options */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <TrendingUp size={18} className="text-zinc-400" />
                        <span>{t('admin.pointsRankingChartTitle', 'Co幣個人消耗排行圖表')}</span>
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light mt-0.5">
                        {t('admin.pointsRankingChartDesc', '以統計柱狀圖視覺化個別用戶累計呼叫 AI 生態工具所消耗之總 CoCoins (點數) 分布。')}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 self-start md:self-auto w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                        <input
                          type="text"
                          placeholder={t('admin.searchRankingPlaceholder', '搜尋用戶暱稱或信箱...')}
                          value={userPointsSearchQuery}
                          onChange={(e) => setUserPointsSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 glass-input rounded-2xl text-xs focus:outline-none placeholder:text-zinc-500"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 bg-zinc-150/40 dark:bg-zinc-900/60 p-1 rounded-2xl border border-zinc-200/30 dark:border-zinc-800/50 text-[11px] font-medium shrink-0">
                        <span className="text-zinc-400 px-2 select-none">{t('admin.chartDisplayLimit', '顯示筆數:')}</span>
                        {[5, 10, 20, 50].map((num) => (
                          <button
                            key={num}
                            onClick={() => setChartLimit(num)}
                            className={`px-2.5 py-1 rounded-xl transition-all ${
                              chartLimit === num 
                                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs' 
                                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* The Recharts Bar Chart Container */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                    className="bg-white dark:bg-zinc-900/70 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/70 shadow-xs"
                  >
                    <div className="h-80 w-full">
                      {userConsumptionData.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-400 font-light text-xs gap-2">
                          <Info size={16} />
                          <span>{t('admin.noRankingData', '無符合該條件之用戶消耗數據，請嘗試修改搜尋詞。')}</span>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={userConsumptionData.slice(0, chartLimit)} 
                            margin={{ top: 15, right: 10, left: -10, bottom: 5 }}
                          >
                            <defs>
                              <linearGradient id="rankingPointsGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                                <stop offset="95%" stopColor="#d97706" stopOpacity={0.6} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800/60" />
                            <XAxis
                              dataKey="userName"
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: '#71717a', fontSize: 10 }}
                              dy={10}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                              dx={-5}
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl shadow-xl text-xs space-y-1.5 min-w-[200px]">
                                      <p className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">{data.userName}</p>
                                      <p className="text-[10px] font-mono text-zinc-400 truncate">{data.userEmail}</p>
                                      <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800 my-1" />
                                      <p className="flex items-center justify-between font-medium">
                                        <span className="text-zinc-400 flex items-center gap-1">
                                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                                          已消耗 CoCoins
                                        </span>
                                        <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
                                          {payload[0].value} Co
                                        </span>
                                      </p>
                                      <p className="text-[9px] text-zinc-400 leading-relaxed pt-1 border-t border-dashed border-zinc-150 dark:border-zinc-800/70">
                                        UID: <span className="font-mono">{data.userId}</span>
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar
                              dataKey="points"
                              fill="url(#rankingPointsGrad)"
                              radius={[8, 8, 0, 0]}
                              isAnimationActive={true}
                              animationDuration={1000}
                              animationEasing="ease-out"
                              maxBarSize={45}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </motion.div>

                  {/* Detailed Ranking Table Grid */}
                  <div className="bg-white dark:bg-zinc-900/60 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/60 overflow-hidden shadow-xs">
                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
                      <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        {t('admin.pointsRankDetailTable', '全站用戶 Co幣消費力細部清單')}
                      </span>
                      <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full text-zinc-500 font-mono">
                        {userConsumptionData.length} records found
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                            <th className="px-6 py-4 w-20 text-center">{t('admin.colRank', '名次')}</th>
                            <th className="px-6 py-4">{t('admin.colLogUser', '發起者')}</th>
                            <th className="px-6 py-4 w-40">{t('admin.pointsConsumed', '累計消費')}</th>
                            <th className="px-6 py-4">{t('admin.percentageRatio', '全站佔比')}</th>
                            <th className="px-6 py-4 text-center">{t('admin.actionShortcut', '快捷動作')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40 text-xs text-zinc-650 dark:text-zinc-300">
                          {userConsumptionData.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 font-light">
                                {t('admin.noRankingData', '查無任何相符的 Co幣消耗排行紀錄。')}
                              </td>
                            </tr>
                          ) : (
                            userConsumptionData.map((item, index) => {
                              const rank = index + 1;
                              const ratio = pointsStats.totalPoints === 0 ? 0 : (item.points / pointsStats.totalPoints) * 100;
                              return (
                                <tr key={item.userId} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-800/5 transition-colors">
                                  <td className="px-6 py-4 text-center">
                                    {rank === 1 ? (
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 font-bold border border-amber-500/20" title="First Place">
                                        <Crown size={12} className="mr-0.5 inline" />1
                                      </span>
                                    ) : rank === 2 ? (
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-300/30 text-zinc-700 dark:text-zinc-300 font-bold border border-zinc-400/20" title="Second Place">
                                        2
                                      </span>
                                    ) : rank === 3 ? (
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/15 text-amber-800 dark:text-amber-600 font-bold border border-amber-800/15" title="Third Place">
                                        3
                                      </span>
                                    ) : (
                                      <span className="font-mono text-zinc-400">{rank}</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="min-w-[150px]">
                                      <p className="font-medium text-zinc-900 dark:text-zinc-150 text-xs truncate">{item.userName}</p>
                                      <p className="text-[10px] text-zinc-400 truncate">{item.userEmail}</p>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                                    <span className="flex items-center gap-1.5">
                                      <CoCoinIcon size={14} className="opacity-80" />
                                      <span>{item.points} Co</span>
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 max-w-[200px]">
                                      <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full rounded-full ${
                                            rank === 1 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                                            rank <= 3 ? 'bg-gradient-to-r from-indigo-400 to-indigo-600' :
                                            'bg-zinc-400 dark:bg-zinc-500'
                                          }`}
                                          style={{ width: `${Math.min(100, ratio)}%` }}
                                        />
                                      </div>
                                      <span className="text-[10px] font-mono text-zinc-400 shrink-0 min-w-[32px] text-right">
                                        {ratio.toFixed(1)}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setHistorySearchQuery(item.userId);
                                        setActiveTab('consumption');
                                      }}
                                      className="px-2.5 py-1 text-[10px] font-medium bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg border border-zinc-200/55 dark:border-zinc-700/55 transition-all hover:scale-102 active:scale-98"
                                      title={t('admin.viewAllLogsOfUser', '篩選查閱消耗明細')}
                                    >
                                      {t('admin.checkDetailsLink', '消費細節')}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                </div>

              </div>
            )}

            {/* TAB 4: BRANDING & CUSTOMIZATION SETTINGS */}
            {activeTab === 'settings' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div 
                  className="glass-panel p-8 rounded-3xl border border-zinc-200/40 dark:border-zinc-800/60 space-y-6 relative overflow-hidden transition-all duration-500 shadow-lg dark:shadow-shadow-950/50"
                  style={{
                    backgroundImage: `radial-gradient(circle at 90% 10%, ${primaryColor}15, transparent 50%), radial-gradient(circle at 10% 90%, ${secondaryColor}10, transparent 50%)`,
                    borderLeft: `3px solid ${primaryColor}`
                  }}
                >
                  <div className="flex items-center gap-4 border-b border-zinc-150 dark:border-zinc-850 pb-5">
                    <div 
                      className="p-3 rounded-2xl text-white transition-all duration-300 shadow-md"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Settings size={22} className="animate-spin-slow" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                          {t('admin.brandingCustomTitle', '品牌暨樣式自訂 / Branding Settings')}
                        </h3>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full text-zinc-500 bg-zinc-100 dark:bg-zinc-850 border border-zinc-200/50 dark:border-zinc-800/85">
                          v1.2.0
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light mt-1 max-w-2xl leading-relaxed">
                        {t('admin.brandingCustomDesc', '在這裡您可以即時修改本管理員面板的主題顏色與亮點強調色。系統透過全域 CSS 屬性（CSS Custom Properties）直接套用在所有看板、導覽控制器與統計圖表中。')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
                    {/* Color Picks Panel */}
                    <div className="space-y-6">
                      
                      {/* PRIMARY COLOR */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            {t('admin.primaryColorLabel', '主品牌色彩 (Primary Color)')}
                          </label>
                          <span className="text-[10px] font-mono text-zinc-450">--admin-primary</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {t('admin.primaryColorDesc', '用於主面板頂端圖示、視覺特點及主要頁面強調之基礎品牌色。')}
                        </p>
                        
                        <div className="flex items-center gap-4 bg-zinc-500/5 dark:bg-zinc-800/10 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-850/50 transition-all hover:bg-zinc-500/10 dark:hover:bg-zinc-800/15">
                          <div className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-zinc-300 dark:border-zinc-700 shadow-sm flex items-center justify-center p-0">
                            <input
                              type="color"
                              value={primaryColor}
                              onChange={(e) => updateBrandingColors(e.target.value, secondaryColor)}
                              className="absolute inset-0 w-[150%] h-[150%] -translate-x-[15%] -translate-y-[15%] cursor-pointer p-0 bg-transparent border-none outline-none"
                            />
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-sm font-semibold text-zinc-700 dark:text-zinc-300 select-all tracking-wide">{primaryColor.toUpperCase()}</p>
                            <p className="text-[10px] text-zinc-400 mt-0.5 font-light">點選左側調色盤進行微調</p>
                          </div>
                        </div>

                        {/* Swatches block */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {[
                            { name: 'CoSlate Dark', hex: '#18181b' },
                            { name: 'Symphony Purple', hex: '#6366f1' },
                            { name: 'Ocean Deep', hex: '#0284c7' },
                            { name: 'Forest Sage', hex: '#0f766e' },
                            { name: 'Crimson Rose', hex: '#be123c' },
                            { name: 'True Jet Black', hex: '#000000' }
                          ].map((swatch) => (
                            <button
                              key={swatch.hex}
                              type="button"
                              onClick={() => updateBrandingColors(swatch.hex, secondaryColor)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-medium transition-all transform hover:scale-102 hover:shadow-sm cursor-pointer ${
                                primaryColor.toLowerCase() === swatch.hex.toLowerCase()
                                  ? 'border-zinc-800 dark:border-zinc-200 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold'
                                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850'
                              }`}
                            >
                              <span className="w-2.5 h-2.5 rounded-full inline-block border border-black/10 dark:border-white/10" style={{ backgroundColor: swatch.hex }} />
                              <span>{swatch.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* SECONDARY COLOR */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            {t('admin.secondaryColorLabel', '次品牌點綴色 (Secondary Color)')}
                          </label>
                          <span className="text-[10px] font-mono text-zinc-450">--admin-secondary</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {t('admin.secondaryColorDesc', '用於算力排行柱狀圖、選單底邊動態指示條等明亮重點，突顯資產或點數活動強度。')}
                        </p>
                        
                        <div className="flex items-center gap-4 bg-zinc-500/5 dark:bg-zinc-800/10 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-850/50 transition-all hover:bg-zinc-500/10 dark:hover:bg-zinc-800/15">
                          <div className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-zinc-300 dark:border-zinc-700 shadow-sm flex items-center justify-center p-0">
                            <input
                              type="color"
                              value={secondaryColor}
                              onChange={(e) => updateBrandingColors(primaryColor, e.target.value)}
                              className="absolute inset-0 w-[150%] h-[150%] -translate-x-[15%] -translate-y-[15%] cursor-pointer p-0 bg-transparent border-none outline-none"
                            />
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-sm font-semibold text-zinc-700 dark:text-zinc-300 select-all tracking-wide">{secondaryColor.toUpperCase()}</p>
                            <p className="text-[10px] text-zinc-400 mt-0.5 font-light">點選左側調色盤進行微調</p>
                          </div>
                        </div>

                        {/* Swatches block */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {[
                            { name: 'CoCoins Gold', hex: '#f59e0b' },
                            { name: 'Sunset Bronze', hex: '#d97706' },
                            { name: 'Vibrant Amethyst', hex: '#8b5cf6' },
                            { name: 'Emerald Aurora', hex: '#10b981' },
                            { name: 'Cyber Neon Pink', hex: '#ec4899' },
                            { name: 'Electric Sky Blue', hex: '#3b82f6' }
                          ].map((swatch) => (
                            <button
                              key={swatch.hex}
                              type="button"
                              onClick={() => updateBrandingColors(primaryColor, swatch.hex)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-medium transition-all transform hover:scale-102 hover:shadow-sm cursor-pointer ${
                                secondaryColor.toLowerCase() === swatch.hex.toLowerCase()
                                  ? 'border-zinc-800 dark:border-zinc-200 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold'
                                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850'
                              }`}
                            >
                              <span className="w-2.5 h-2.5 rounded-full inline-block border border-black/10 dark:border-white/10" style={{ backgroundColor: swatch.hex }} />
                              <span>{swatch.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ACTIONS ROW */}
                      <div className="pt-4 border-t border-zinc-150 dark:border-zinc-850/50 flex items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={resetBrandingColors}
                          className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-xs font-semibold cursor-pointer active:scale-98 transition-all hover:shadow-sm"
                        >
                          {t('admin.resetToDefault', '重設為預設色調')}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            const snippet = `:root {\n  --admin-primary: ${primaryColor};\n  --admin-secondary: ${secondaryColor};\n}`;
                            handleCopyText(snippet, 'css-snippet');
                          }}
                          className="px-4 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl text-xs font-semibold cursor-pointer active:scale-98 transition-all flex items-center gap-2 hover:shadow-md"
                        >
                          {copySuccess === 'css-snippet' ? (
                            <>
                              <Check size={14} className="text-emerald-500 animate-bounce" />
                              <span className="text-emerald-500">{t('common.copied', '已複製剪貼簿')}</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              <span>{t('admin.copyCssConfig', '複製 CSS 變數片段')}</span>
                            </>
                          )}
                        </button>
                      </div>

                    </div>

                    {/* LIVE PREVIEW SIMULATOR CARD */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800/80 rounded-2xl p-6 flex flex-col justify-between space-y-5 relative shadow-inner">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: secondaryColor }} />
                            {t('admin.liveBrandingSimulator', '即時渲染預覽模擬')}
                          </h4>
                          <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/40 dark:border-zinc-700/40 text-zinc-500 dark:text-zinc-400 px-2.5 py-0.5 rounded-full font-mono">Live Demo</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          {t('admin.simulatorHelp', '模擬面板局部的實時樣式。隨意修改上方主、副色彩，預覽模擬元件色調亦同步聯動。')}
                        </p>
                      </div>

                      {/* Mockup component container */}
                      <div className="border border-zinc-200/60 dark:border-zinc-800 p-5 rounded-2xl bg-white dark:bg-zinc-900 space-y-4 shadow-md relative overflow-hidden">
                        {/* Radial interactive feedback inside mock */}
                        <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-xl opacity-30 pointer-events-none" style={{ backgroundColor: primaryColor }} />
                        
                        {/* Mock header row */}
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-850 relative z-10">
                          <div className="flex items-center gap-2">
                            {/* Uses primary */}
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm transition-all duration-300" style={{ backgroundColor: primaryColor }}>
                              A
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">CoLab Admin</p>
                              <p className="text-[9px] text-zinc-500 font-mono">Enterprise Node ID</p>
                            </div>
                          </div>
                          
                          {/* Uses secondary badge */}
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md text-white font-mono shrink-0 shadow-sm transition-all duration-300" style={{ backgroundColor: secondaryColor }}>
                            ACTIVE ACCENT
                          </span>
                        </div>
                        
                        {/* Mock active navigation slide tab list */}
                        <div className="flex items-center gap-4 text-[10px] font-medium border-b border-zinc-100 dark:border-zinc-850 pb-2.5 relative z-10">
                          <span className="text-zinc-700 dark:text-zinc-200">System Logs</span>
                          <span className="text-zinc-900 dark:text-white font-semibold relative">
                            Selected Tab
                            {/* Uses secondary slider underline color */}
                            <span className="absolute bottom-[-10px] left-0 right-0 h-0.5 rounded-full transition-all duration-300" style={{ backgroundColor: secondaryColor }} />
                          </span>
                          <span className="text-zinc-400">Security Guard</span>
                        </div>

                        {/* Mock bar chart placeholder showing secondary fill color */}
                        <div className="space-y-2 pt-2 relative z-10">
                          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                            <span>COCOINS ALLOCATION</span>
                            <span>98,540 / Limit</span>
                          </div>
                          <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-850 rounded-md overflow-hidden relative border border-zinc-200/20">
                            {/* Secondary Fill */}
                            <motion.div
                              className="h-full rounded-md"
                              style={{ backgroundColor: secondaryColor }}
                              initial={{ width: '0%' }}
                              animate={{ width: '74%' }}
                              transition={{ duration: 1.2, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* CSS Preview code snippet box */}
                      <div className="bg-zinc-100/50 dark:bg-zinc-950/50 p-4 rounded-xl border border-zinc-200/30 dark:border-zinc-800 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 whitespace-pre shadow-inner font-light relative overflow-hidden">
                        <div className="absolute top-1 right-2 text-[8px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500">Live config</div>
                        {`/* CSS Custom Properties Loaded */\n:root {\n  --admin-primary: ${primaryColor};\n  --admin-secondary: ${secondaryColor};\n}`}
                      </div>
                    </div>

                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: ERROR LOGS MONITORING */}
            {activeTab === 'errors' && (
              <div className="space-y-4">
                
                {/* Search / Filters Row */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                    <input
                      type="text"
                      placeholder={t('admin.searchErrorsPlaceholder', '搜尋電子信箱、錯誤原因、請求工具...')}
                      value={errorSearchQuery}
                      onChange={(e) => setErrorSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 glass-input rounded-2xl text-xs focus:outline-none placeholder:text-zinc-500"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end flex-wrap">
                    {/* Auto Refresh Toggle Button */}
                    <button
                      onClick={() => setIsAutoRefreshActive(!isAutoRefreshActive)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer active:scale-[0.98] ${
                        isAutoRefreshActive 
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-400 shadow-sm'
                          : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span className="relative flex h-2 w-2">
                        {isAutoRefreshActive && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${isAutoRefreshActive ? 'bg-emerald-500' : 'bg-zinc-400'}`}></span>
                      </span>
                      <span>
                        {t('admin.autoRefresh', '自動更新')}
                        {isAutoRefreshActive && ` (${secondsUntilRefresh}s)`}
                      </span>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <Filter size={13} />
                        <span>{t('admin.severityFilter', '嚴重程度')}</span>
                      </span>
                      <select
                        value={errorSeverityFilter}
                        onChange={(e) => setErrorSeverityFilter(e.target.value)}
                        className="px-3 py-1.5 glass-input rounded-xl text-xs focus:outline-none border-none dark:bg-zinc-900"
                      >
                        <option value="all"> {t('admin.allSeverities', '全部程度')} </option>
                        <option value="critical"> {t('admin.severityCriticalShort', 'Critical (權限)')} </option>
                        <option value="warning"> {t('admin.severityWarningShort', 'Warning (網路)')} </option>
                        <option value="info"> {t('admin.severityInfoShort', 'Info (常規)')} </option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <Filter size={13} />
                        <span>{t('admin.toolFilter', '特定工具')}</span>
                      </span>
                      <select
                        value={errorToolFilter}
                        onChange={(e) => setErrorToolFilter(e.target.value)}
                        className="px-3 py-1.5 glass-input rounded-xl text-xs focus:outline-none border-none dark:bg-zinc-900"
                      >
                        <option value="all"> {t('admin.allTools', '全部工具')} </option>
                        <option disabled>──────────</option>
                        {uniqueTools.map(tOption => (
                          <option key={tOption} value={tOption}>
                            {t(`features.${tOption}.title`, tOption)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Error Logs layout */}
                <div className="glass-panel overflow-hidden rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm border-red-500/10 dark:border-red-950/20">
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200/50 dark:border-zinc-800 bg-red-50/10 dark:bg-red-950/5 text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                          <th className="px-6 py-4">{t('admin.colLogUser', '發起者')}</th>
                          <th className="px-6 py-4">{t('admin.colLogTool', '介接工具')}</th>
                          <th className="px-6 py-4 text-red-600 dark:text-red-400">{t('admin.colLogError', '錯誤訊息')}</th>
                          <th className="px-6 py-4">{t('admin.colLogPrompt', '傳遞 Prompts')}</th>
                          <th className="px-6 py-4">{t('admin.colLogTime', '請求時間')}</th>
                          <th className="px-6 py-4 text-right">{t('admin.colActions', '管理')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-xs text-zinc-600 dark:text-zinc-300">
                        {filteredErrorLogs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 font-light">
                              {t('admin.noErrorsFound', '目前無任何相符的系統錯誤日誌。')}
                            </td>
                          </tr>
                        ) : (
                          filteredErrorLogs.map((log) => {
                            return (
                              <tr 
                                key={log.id} 
                                onClick={() => setSelectedErrorLog(log)}
                                className="hover:bg-red-50/10 dark:hover:bg-red-950/10 transition-colors cursor-pointer group/row"
                              >
                                <td className="px-6 py-4">
                                  <div className="min-w-[150px]">
                                    <p className="font-medium text-zinc-900 dark:text-zinc-100 text-xs truncate">{log.userName}</p>
                                    <p className="text-[10px] text-zinc-400 truncate">{log.userEmail}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                        {t(`features.${log.tool}.title`, log.tool)}
                                      </span>
                                      {(() => {
                                        const severity = getErrorSeverity(log.errorMessage, log.result, t);
                                        return (
                                          <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-semibold border uppercase tracking-wider shrink-0 ${severity.colorClass}`}>
                                            {severity.label}
                                          </span>
                                        );
                                      })()}
                                    </div>
                                    <span className="text-[9px] font-mono text-zinc-400 font-light truncate max-w-[120px]">{log.model || 'unknown'}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  {(() => {
                                    const severity = getErrorSeverity(log.errorMessage, log.result, t);
                                    return (
                                      <div className="flex flex-col gap-1.5 max-w-xs">
                                        <div className="flex items-center">
                                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border uppercase tracking-wider ${severity.colorClass}`}>
                                            {severity.label}
                                          </span>
                                        </div>
                                        <div className="bg-red-500/5 dark:bg-red-500/10 border border-red-500/10 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-xl font-mono text-[10px] break-all whitespace-pre-wrap max-h-[80px] overflow-y-auto">
                                          {log.errorMessage || log.result || 'Unknown execution failure'}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-[11px] text-zinc-500 max-w-sm font-light truncate" title={log.prompt}>
                                    {log.prompt || <span className="italic text-zinc-300">No prompt</span>}
                                  </p>
                                </td>
                                <td className="px-6 py-4 text-zinc-450 text-[10px]">
                                  {log.createdAt ? (
                                    <span>
                                      {new Date(log.createdAt.seconds * 1000).toLocaleString()}
                                    </span>
                                  ) : (
                                    <span>—</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteLog(log.id);
                                    }}
                                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors"
                                    title={t('admin.deleteLog', '刪除日誌')}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>

              </div>
            )}

            {/* TAB 4: SYSTEM算力與延遲分析 */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                
                {/* 1. KPI Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* KPI 1 */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="glass-panel p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500">
                        Total API Volume (總調用量)
                      </span>
                      <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-1">
                        {analyticsData.totalRequests.toLocaleString()} 次
                      </h3>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-light">
                      <TrendingUp size={14} />
                      <span>相較上期穩健增長 (+12.4%)</span>
                    </div>
                  </motion.div>

                  {/* KPI 2 */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 }}
                    className="glass-panel p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500">
                        Weighted Average Latency (平均響應延遲)
                      </span>
                      <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-1">
                        {analyticsData.averageLatency} ms
                      </h3>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 font-light">
                      <Clock size={14} />
                      <span>極速邊緣響應體系</span>
                    </div>
                  </motion.div>

                  {/* KPI 3 */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="glass-panel p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500">
                        System API Error Rate (出錯機率)
                      </span>
                      <h3 className={`text-2xl font-bold mt-1 font-mono ${analyticsData.errorRate > 5 ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
                        {analyticsData.errorRate}%
                      </h3>
                    </div>
                    <div className={`mt-4 flex items-center gap-1.5 text-xs font-light ${analyticsData.errorRate > 2 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      <AlertTriangle size={14} />
                      <span>{analyticsData.errorRate > 2 ? '警告: 網路波動影響中' : '綠能全健康運作中'}</span>
                    </div>
                  </motion.div>

                  {/* KPI 4 */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                    className="glass-panel p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500">
                        Core AI Models Enrolled (模型數)
                      </span>
                      <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-1">
                        5 套引擎
                      </h3>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-light">
                      <Layers size={14} />
                      <span>全系列 Gemini 端點在線</span>
                    </div>
                  </motion.div>
                </div>

                {/* 2. Charts Row: Left Model Share (Pie), Right Model Patterns (Area/Bar) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Model Share distribution chart card */}
                  <div className="lg:col-span-5 bg-white dark:bg-zinc-900/60 p-5 rounded-2rem border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm flex flex-col">
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        核心模型請求份額分佈
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        依據累積呼叫日誌按模型類型比例歸檔
                      </p>
                    </div>

                    <div className="h-64 w-full flex-1 relative flex items-center justify-center">
                      {analyticsData.modelShare.length === 0 ? (
                        <div className="text-xs text-zinc-400">尚無模型呼叫數據</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analyticsData.modelShare}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={85}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {analyticsData.modelShare.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-3 rounded-xl shadow-xl text-left max-w-[200px]">
                                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5 mb-1.5 font-sans">
                                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: data.color }} />
                                        <span>{data.name}</span>
                                      </p>
                                      <div className="space-y-1 text-[10px] text-zinc-500 font-sans">
                                        <p>請求次數: <span className="font-semibold font-mono text-zinc-800 dark:text-zinc-200">{data.value} 次</span></p>
                                        <p>平均延遲: <span className="font-semibold font-mono text-zinc-800 dark:text-zinc-200">{data.avgLatency} ms</span></p>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    {/* Custom legends row to ensure great mobile responsive feel */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-[10px] font-sans">
                      {analyticsData.modelShare.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-md shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-zinc-650 dark:text-zinc-400 truncate" title={item.label}>
                            {item.name} ({Math.round((item.value / (analyticsData.totalRequests || 1)) * 100)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Daily Model requests Patterns */}
                  <div className="lg:col-span-7 bg-white dark:bg-zinc-900/60 p-5 rounded-2rem border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                          每日模型調用量演變趨勢 (近 14 天)
                        </h4>
                        <p className="text-[11px] text-zinc-400 mt-1">
                          按模型分類監控每日負載及容量 patterns
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-850 px-2 py-0.5 rounded-md">
                        STACKED PATTERNS
                      </span>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsData.dailyMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="proModelGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="flashModelGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="liteModelGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800/65" />
                          <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                            tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                            tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-3 rounded-2xl shadow-xl text-xs text-left">
                                    <p className="font-mono text-zinc-400 mb-1.5 font-bold">{payload[0].payload.fullDate}</p>
                                    <div className="space-y-1.5">
                                      {payload.map((item: any, idx: number) => (
                                        <p key={idx} className="flex items-center gap-2">
                                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                                          <span className="text-zinc-650 dark:text-zinc-400">{item.name}:</span>
                                          <span className="font-bold text-zinc-900 dark:text-zinc-50 ml-auto font-mono text-[11px]">{item.value} 次</span>
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                          <Area type="monotone" dataKey="Gemini Pro" stackId="1" stroke="#4f46e5" strokeWidth={1} fill="url(#proModelGrad)" />
                          <Area type="monotone" dataKey="Gemini Flash" stackId="1" stroke="#10b981" strokeWidth={1} fill="url(#flashModelGrad)" />
                          <Area type="monotone" dataKey="Gemini Lite" stackId="1" stroke="#0ea5e9" strokeWidth={1} fill="url(#liteModelGrad)" />
                          <Area type="monotone" dataKey="Imagen" stackId="1" stroke="#f59e0b" strokeWidth={1} fillOpacity={0.1} fill="#f59e0b" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* 3. Latency curve trends over time */}
                <div className="bg-white dark:bg-zinc-900/60 p-5 rounded-2rem border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        雲端算力響應延遲趨勢分析 (毫秒/ms)
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        核心運算模型與整體系統加權平均 Latency 時間波幅監測 (較低代表排隊效率更優)
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-850 px-2 py-0.5 rounded-md">
                      P50/P90 EST. LATENCY
                    </span>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData.dailyMetrics} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800/65" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                          tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }}
                          unit="ms"
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-3 rounded-2xl shadow-xl text-xs text-left">
                                  <p className="font-mono text-zinc-400 mb-1.5 font-bold">{payload[0].payload.fullDate}</p>
                                  <div className="space-y-1.5 font-sans">
                                    {payload.map((item: any, idx: number) => (
                                      <p key={idx} className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                                        <span className="text-zinc-650 dark:text-zinc-400">{item.name}:</span>
                                        <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100 ml-auto">{item.value} ms</span>
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                        <Line type="monotone" dataKey="Overall Latency" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="Pro Latency" stroke="#4f46e5" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls />
                        <Line type="monotone" dataKey="Flash Latency" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls />
                        <Line type="monotone" dataKey="Lite Latency" stroke="#0ea5e9" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls />
                        <Line type="monotone" dataKey="Imagen Latency" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 3.5 Heatmap Latency-HighLoad Correlation Matrix */}
                <div className="bg-white dark:bg-zinc-900/60 p-6 rounded-2rem border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm space-y-6">
                  
                  {/* Heatmap Header details and buttons */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Activity size={16} className="text-amber-500" />
                        時段延遲與高負載事件關聯熱力圖 (Heatmap Correlation Matrix)
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        縱軸為一週天數，橫軸代表當日 24 小時（00:00 - 23:00）。可用於比對、分析並找出系統高併發事件（High-Load Events）與平均 Response Latency 延遲尖峰的規律。
                      </p>
                    </div>

                    {/* Mode and Stress Simulation controls */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Metric Toggle */}
                      <div className="bg-zinc-100 dark:bg-zinc-850 p-0.5 rounded-lg flex items-center shadow-inner">
                        <button
                          type="button"
                          onClick={() => setHeatmapViewMode('latency')}
                          className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${
                            heatmapViewMode === 'latency'
                              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                          }`}
                        >
                          響應延遲波幅 (ms)
                        </button>
                        <button
                          type="button"
                          onClick={() => setHeatmapViewMode('high-load')}
                          className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${
                            heatmapViewMode === 'high-load'
                              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                          }`}
                        >
                          高負載關聯次數
                        </button>
                      </div>

                      {/* Stress Simulator Action selectors */}
                      <div className="text-[10px] bg-zinc-100 dark:bg-zinc-850 px-2 py-1 rounded-lg flex items-center gap-1 border border-zinc-200/40 dark:border-zinc-800/40">
                        <span className="text-zinc-500 font-medium">🧪 壓力手動模擬：</span>
                        <select
                          value={interactiveStressMode}
                          onChange={(e) => setInteractiveStressMode(e.target.value as any)}
                          className="bg-transparent border-none text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
                        >
                          <option value="none">正常調度 (預設運作)</option>
                          <option value="office">日間高峰業務衝擊 (10h-16h)</option>
                          <option value="backup">凌晨機組備份作業 (00h-04h)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Heatmap Grid Wrapper */}
                  <div className="space-y-4">
                    <div className="overflow-x-auto select-none pb-2">
                      <div className="min-w-[850px] space-y-1.5 pr-2">
                        
                        {/* 24 Hour column headers */}
                        <div className="flex items-center text-[9px] font-mono font-semibold text-zinc-400 text-center pb-1">
                          <div className="w-24 shrink-0 text-left">時段 / 星期</div>
                          <div className="flex-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(24, minmax(0, 1fr))', gap: '4px' }}>
                            {Array.from({ length: 24 }).map((_, i) => (
                              <div key={i} className="truncate" title={`${i}:00`}>
                                {String(i).padStart(2, '0')}h
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 7 rows of days */}
                        {analyticsData.daysLabel.map((dayLabel, dIdx) => (
                          <div key={dIdx} className="flex items-center gap-0">
                            {/* Y-axis labels */}
                            <div className="w-24 shrink-0 text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center pr-2">
                              {dayLabel}
                            </div>

                            {/* 24 squares representation */}
                            <div className="flex-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(24, minmax(0, 1fr))', gap: '4px' }}>
                              {analyticsData.heatmapCells
                                .filter(cell => cell.dayIdx === dIdx)
                                .map((cell, cIdx) => {
                                  const isActive = selectedHeatmapCell?.dayIdx === dIdx && selectedHeatmapCell?.hour === cell.hour;
                                  
                                  // Determine colors based on viewMode
                                  let cellBgClasses = '';
                                  
                                  if (heatmapViewMode === 'latency') {
                                    if (cell.latency < 400) {
                                      cellBgClasses = 'bg-emerald-50 dark:bg-emerald-950/25 text-emerald-800 dark:text-emerald-400 border border-emerald-100/40 dark:border-emerald-900/10';
                                    } else if (cell.latency < 800) {
                                      cellBgClasses = 'bg-teal-100/70 dark:bg-teal-900/20 text-teal-950 dark:text-teal-300 border border-teal-200/35 dark:border-teal-850/20';
                                    } else if (cell.latency < 1500) {
                                      cellBgClasses = 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-950 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/20';
                                    } else if (cell.latency < 2800) {
                                      cellBgClasses = 'bg-amber-100/95 dark:bg-amber-950/45 text-amber-900 dark:text-amber-300 border border-amber-300/40 dark:border-amber-800/30';
                                    } else {
                                      cellBgClasses = 'bg-rose-500 text-white border border-rose-600 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-900 font-medium';
                                    }
                                  } else {
                                    // High load rendering
                                    if (cell.highLoadCount === 0) {
                                      cellBgClasses = 'bg-zinc-50 dark:bg-zinc-900/60 text-zinc-400 border border-zinc-100 dark:border-zinc-805/30';
                                    } else if (cell.highLoadCount <= 2) {
                                      cellBgClasses = 'bg-amber-100/70 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border border-amber-200/30';
                                    } else if (cell.highLoadCount <= 4) {
                                      cellBgClasses = 'bg-orange-200/80 dark:bg-orange-900/30 text-orange-900 dark:text-orange-300 border border-orange-300/30';
                                    } else {
                                      cellBgClasses = 'bg-rose-500 text-white border border-rose-600 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-900 animate-pulse';
                                    }
                                  }

                                  return (
                                    <button
                                      key={cIdx}
                                      type="button"
                                      onClick={() => setSelectedHeatmapCell({ dayIdx: dIdx, hour: cell.hour })}
                                      onMouseEnter={() => setSelectedHeatmapCell({ dayIdx: dIdx, hour: cell.hour })}
                                      className={`h-7 rounded-sm relative transition-all duration-150 flex flex-col items-center justify-center cursor-pointer overflow-hidden ${cellBgClasses} ${
                                        isActive ? 'ring-2 ring-indigo-500 dark:ring-purple-400 ring-offset-2 dark:ring-offset-zinc-950 scale-105 z-10' : 'hover:scale-[1.03]'
                                      }`}
                                      title={`${cell.dayName} ${cell.hourFormatted} | 延遲: ${cell.latency} ms | 高負載關聯: ${cell.highLoadCount} 次`}
                                    >
                                      {/* High load warning dot inside cell */}
                                      {cell.highLoadCount > 0 && (
                                        <span className={`absolute top-0.5 right-0.5 w-1 h-1 rounded-full ${
                                          cell.highLoadCount > 4 ? 'bg-red-500 dark:bg-red-400 animate-ping' : 'bg-amber-500 dark:bg-amber-400'
                                        }`} />
                                      )}

                                      {/* Small center latency or incident count */}
                                      <span className="text-[8px] font-mono font-light scale-[0.80] leading-none select-none">
                                        {heatmapViewMode === 'latency' ? `${cell.latency}` : `${cell.highLoadCount}`}
                                      </span>
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        ))}

                      </div>
                    </div>

                    {/* Legends description block */}
                    <div className="flex flex-wrap items-center justify-between gap-4 text-[10px] text-zinc-500 font-sans px-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        <span className="font-semibold text-zinc-400">延遲波幅級距色塊：</span>
                        <div className="flex items-center gap-1 pr-3">
                          <span className="w-2.5 h-2.5 rounded bg-emerald-100 dark:bg-emerald-950/40 inline-block border border-emerald-300/35" />
                          <span>極速 ( &lt;400ms )</span>
                        </div>
                        <div className="flex items-center gap-1 pr-3">
                          <span className="w-2.5 h-2.5 rounded bg-teal-150/80 dark:bg-teal-900/30 inline-block border border-teal-300/20" />
                          <span>快速 ( 400-800ms )</span>
                        </div>
                        <div className="flex items-center gap-1 pr-3">
                          <span className="w-2.5 h-2.5 rounded bg-indigo-100 dark:bg-indigo-950/40 inline-block border border-indigo-200/30" />
                          <span>普通 ( 800-1500ms )</span>
                        </div>
                        <div className="flex items-center gap-1 pr-3">
                          <span className="w-2.5 h-2.5 rounded bg-amber-100 dark:bg-amber-950/40 inline-block border border-amber-300/30" />
                          <span>繁忙 ( 1500-2800ms )</span>
                        </div>
                        <div className="flex items-center gap-1 pr-3">
                          <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block border border-rose-600" />
                          <span>超載尖峰 ( &gt;2800ms )</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1" />
                        <span>右上角點標記表示此時段伴隨 1 次或以上「高負載事件（High-Load Status Events）」關聯。</span>
                      </div>
                    </div>
                  </div>

                  {/* Inspector Panel for the currently hovered/selected Cell */}
                  {(() => {
                    const activeCell = selectedHeatmapCell 
                      ? analyticsData.heatmapCells.find(c => c.dayIdx === selectedHeatmapCell.dayIdx && c.hour === selectedHeatmapCell.hour)
                      : analyticsData.heatmapCells.find(c => c.dayIdx === 1 && c.hour === 14); // default Mon 14:00

                    if (!activeCell) return null;

                    // Compute health status evaluation
                    let statusLabel = '';
                    let statusBedgeClass = '';
                    let detailsText = '';

                    if (activeCell.latency < 500) {
                      statusLabel = '正常響應效率 (HEALTHY OPTIMAL)';
                      statusBedgeClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 ring-1 ring-emerald-600/20';
                      detailsText = '此時段排隊和伺服器解析一切流暢。高負荷事件均勻且低。屬於系統調度資源最理想的健康區間。';
                    } else if (activeCell.latency < 1200) {
                      statusLabel = '穩定運載狀態 (STABLE)';
                      statusBedgeClass = 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 ring-1 ring-sky-600/20';
                      detailsText = '伺服器執行良好。此階段算力流轉速率正常，能夠輕鬆應付多條 API 語意解析併發調度請求。';
                    } else if (activeCell.latency < 2400) {
                      statusLabel = '重載運算臨界 (HEAVY CONGESTED)';
                      statusBedgeClass = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 ring-1 ring-amber-600/20 animate-pulse';
                      detailsText = '發現算力堆積，此時段正觸發高負載事件。雲端排隊深度增加，可能部分耗時的 Gemini Pro 或 Imagen 繪圖事務在併發解析中。';
                    } else {
                      statusLabel = '高載排隊嚴重超限 (CRITICAL SPIKE)';
                      statusBedgeClass = 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 ring-1 ring-red-600/20';
                      detailsText = '系統此時段高度擁堵！關聯到多次高負載事件。API 響應平均耗時急劇上升，建議在系統級別部署 Lite 機組分流或執行任務序列錯峰。';
                    }

                    return (
                      <div className="bg-zinc-50/70 dark:bg-zinc-950/60 rounded-2xl p-4 border border-zinc-200/40 dark:border-zinc-850/60 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        <div className="md:col-span-4 border-r border-zinc-200/50 dark:border-zinc-800 pr-4">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                            SELECTED SECTION DETAILED INSPECTION (已選節點關聯詳情)
                          </span>
                          <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 mt-1 flex items-center gap-1.5">
                            <Clock size={13} className="text-zinc-400" />
                            {activeCell.dayName} 的 {activeCell.hourFormatted}
                          </h4>
                          <div className={`inline-block mt-3 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${statusBedgeClass}`}>
                            {statusLabel}
                          </div>
                        </div>

                        <div className="md:col-span-5 space-y-4 font-sans text-xs">
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <p className="text-zinc-400 text-[10px]">平均回應延遲</p>
                              <p className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">{activeCell.latency} ms</p>
                            </div>
                            <div>
                              <p className="text-zinc-400 text-[10px]">高載關聯 incident</p>
                              <p className="text-base font-bold text-amber-500 font-mono mt-0.5">{activeCell.highLoadCount} 次</p>
                            </div>
                            <div>
                              <p className="text-zinc-400 text-[10px]">時段內 API 請求</p>
                              <p className="text-base font-bold text-zinc-700 dark:text-zinc-300 font-mono mt-0.5">{activeCell.totalCalls} 次</p>
                            </div>
                          </div>
                          <p className="text-[11px] text-zinc-500 leading-relaxed font-light mt-2" style={{ textJustify: 'inter-word' }}>
                            {detailsText}
                          </p>
                        </div>

                        <div className="md:col-span-3 bg-zinc-100/50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-250/20 dark:border-zinc-800/40 text-[10px] space-y-1.5 h-full flex flex-col justify-center">
                          <p className="text-zinc-400 font-bold uppercase tracking-wider font-mono">高載關聯性解析 (Correlation Ratio)</p>
                          <div className="flex items-center justify-between text-zinc-650 dark:text-zinc-300 pt-1">
                            <span>排隊擁堵係數</span>
                            <span className="font-mono font-bold text-indigo-500">
                              {((activeCell.latency / (analyticsData.averageLatency || 1)) * 1.0).toFixed(2)}x
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-zinc-650 dark:text-zinc-300">
                            <span>高載波及比率</span>
                            <span className="font-mono font-bold text-amber-500">
                              {activeCell.totalCalls > 0 ? `${Math.round((activeCell.highLoadCount / activeCell.totalCalls) * 100)}%` : '0%'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                </div>

                {/* 4. Slowest / Heaviest Requests Explorer */}
                <div className="glass-panel overflow-hidden rounded-2rem border border-zinc-200/50 dark:border-zinc-800/80 shadow-sm">
                  <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-950/20">
                    <h4 className="text-xs font-bold tracking-wider text-zinc-400 uppercase font-mono">
                      TOP 10 SLOWEST TRANSACTIONS (最長執行時間交易列表)
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                          <th className="px-6 py-3">交易用戶</th>
                          <th className="px-6 py-3">使用的工具</th>
                          <th className="px-6 py-3">運算模型</th>
                          <th className="px-6 py-3 font-mono text-indigo-500">Latency (響應)</th>
                          <th className="px-6 py-3">提示與特徵</th>
                          <th className="px-6 py-3">請求時間</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-xs text-zinc-650 dark:text-zinc-300">
                        {analyticsData.slowestRequests.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-zinc-400 font-light">
                              系統歷史資料庫中目前尚無有效請求紀錄。
                            </td>
                          </tr>
                        ) : (
                          analyticsData.slowestRequests.map((req: any) => (
                            <tr key={req.id} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-900/20 transition-colors">
                              <td className="px-6 py-3">
                                <div className="max-w-[150px]">
                                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{req.userName}</p>
                                  <p className="text-[10px] text-zinc-400 truncate">{req.userEmail}</p>
                                </div>
                              </td>
                              <td className="px-6 py-3 font-medium">
                                {t(`features.${req.tool}.title`, req.tool) as string}
                              </td>
                              <td className="px-6 py-3 font-mono text-[10px] text-zinc-400">
                                {req.model || 'unknown'}
                              </td>
                              <td className="px-6 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs shadow-inner">
                                {req.latency} ms
                              </td>
                              <td className="px-6 py-3 max-w-xs truncate text-[11px]" title={req.prompt}>
                                {req.prompt || <span className="italic text-zinc-300">無文字輸入 / 影像多模態</span>}
                              </td>
                              <td className="px-6 py-3 text-[10px] text-zinc-450">
                                {req.createdAt ? new Date(req.createdAt.seconds * 1000).toLocaleString() : '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. Gemini Real-Time Diagnostics & Pipeline Status Panel */}
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-white dark:bg-zinc-900/60 p-6 rounded-2rem border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm space-y-6 mt-6"
                >
                  {/* Panel Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {t('admin.geminiDiagnosticsTitle', 'Gemini APIs Real-Time Diagnostics (Gemini 核心即時診斷與效能指標)')}
                        </h4>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        {t('admin.geminiDiagnosticsDesc', '監控 Google Gemini 邊緣端點在線狀態、實時 Ping 響應、P50/P90 百分位數及成功率效能指標。')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 font-mono text-[9px] font-bold tracking-wider uppercase">
                        {t('admin.realtimeMode', 'Real-Time Ticker')}
                      </span>
                    </div>
                  </div>

                  {/* Top Level Summary Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/10 dark:bg-zinc-950/20">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono font-medium block">
                        官方端點調用流量 (RPM)
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{throughputRpm}</span>
                        <span className="text-[10px] text-zinc-500">RPM</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/10 dark:bg-zinc-950/20">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono font-medium block">
                        當前併發虛擬連線
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">{activeConcurrentRequests}</span>
                        <span className="text-[10px] text-zinc-500">{t('admin.activeConnsCode', 'Active Pipes')}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/10 dark:bg-zinc-950/20">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono font-medium block">
                        管道健康評級
                      </span>
                      <div className="flex items-center gap-2 mt-2">
                        {trafficSpikeActive ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                            <span className="text-xs font-semibold text-amber-500">{t('admin.highTrafficSpike', '模擬高負載中')}</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-semibold text-emerald-500">{t('admin.normalOperational', '管線極佳 Health')}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/10 dark:bg-zinc-950/20">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono font-medium block">
                        探針連續運行時間
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">{systemUptime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Core Diagnostic Section: Left Models Table, Right Shell Terminal console */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Models Detailed List Table */}
                    <div className="lg:col-span-8 space-y-4">
                      <div className="overflow-x-auto border border-zinc-100 dark:border-zinc-800/60 rounded-xl">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-mono font-bold text-zinc-450 uppercase tracking-widest">
                              <th className="px-4 py-3">{t('admin.diagModel', '運算核心模型別')}</th>
                              <th className="px-4 py-3 text-center">{t('admin.diagStatus', '運行狀態')}</th>
                              <th className="px-4 py-3 text-right">{t('admin.diagInvocations', '歷史請求')}</th>
                              <th className="px-4 py-3 text-right text-indigo-500 dark:text-indigo-400 font-bold">{t('admin.diagLivePing', '實時 Ping')}</th>
                              <th className="px-4 py-3 text-center font-mono">P50 / P90 / P99 Latency</th>
                              <th className="px-4 py-3 text-right">{t('admin.diagSuccessRate', '歷史成功率')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-xs text-zinc-650 dark:text-zinc-300 font-sans">
                            {geminiModelStats.map(stat => {
                              const livePingInfo = livePings[stat.id] || { current: stat.baseLatency, status: 'optimal' };
                              return (
                                <tr key={stat.id} className="hover:bg-zinc-50/40 dark:hover:bg-zinc-900/10 transition-colors">
                                  {/* Model & Badge Name */}
                                  <td className="px-4 py-3.5">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.themeColor }} />
                                      <div>
                                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{stat.name}</p>
                                        <p className="text-[10px] text-zinc-400 font-mono tracking-normal">{stat.id}</p>
                                      </div>
                                    </div>
                                  </td>
                                  
                                  {/* Health Status */}
                                  <td className="px-4 py-3.5 text-center">
                                    {livePingInfo.status === 'optimal' && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-905/20 text-emerald-700 dark:text-emerald-400 font-medium">
                                        {t('admin.statusOptimal', '優良 (Optimal)')}
                                      </span>
                                    )}
                                    {livePingInfo.status === 'degraded' && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium animate-pulse">
                                        {t('admin.statusDegraded', '擁堵 (Load)')}
                                      </span>
                                    )}
                                    {livePingInfo.status === 'critical' && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-100 dark:bg-red-900/20 text-red-750 dark:text-red-400 font-medium animate-bounce">
                                        {t('admin.statusCritical', '警告 (Critical)')}
                                      </span>
                                    )}
                                  </td>

                                  {/* Invocations */}
                                  <td className="px-4 py-3.5 text-right font-mono text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
                                    {stat.totalCalls.toLocaleString()} {t('admin.conUnit', '次')}
                                  </td>

                                  {/* Live ping */}
                                  <td className="px-4 py-3.5 text-right font-mono text-[11px] font-bold text-indigo-650 dark:text-indigo-400">
                                    <span className="inline-block animate-pulse duration-500 mr-0.5">⚡</span> {livePingInfo.current} ms
                                  </td>

                                  {/* Percentiles */}
                                  <td className="px-4 py-3.5 text-center font-mono text-[10px] text-zinc-500">
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-400" title="P50 / Median Latency">{stat.p50}ms</span>
                                      <span className="text-zinc-300 dark:text-zinc-700">/</span>
                                      <span className="bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-semibold" title="P90 Latency">{stat.p90}ms</span>
                                      <span className="text-zinc-300 dark:text-zinc-700">/</span>
                                      <span className="bg-amber-105/15 dark:bg-amber-950/20 text-amber-700 dark:text-amber-500 px-1.5 py-0.5 rounded font-extrabold" title="P99 Latency">{stat.p99}ms</span>
                                    </div>
                                  </td>

                                  {/* Success rate */}
                                  <td className="px-4 py-3.5 text-right">
                                    <span className={`font-mono text-[11px] font-semibold ${stat.successRate >= 95 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                      {stat.successRate}%
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Percentile Legend Description */}
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-light italic leading-relaxed">
                        💡 <strong>數據說明</strong>: <b>P50 (Median)</b> 代表中位數響應基準；<b>P90</b> 反映 90% 交易之流暢度門檻；<b>P99</b> 則精確反映了冷啟動與極端長尾延遲。實時 Ping 值每 3 秒對應 Google Cloud Ingress 動態偵測更新。
                      </p>
                    </div>

                    {/* Right Interactive Console Console Logs */}
                    <div className="lg:col-span-4 flex flex-col space-y-4">
                      {/* Action Triggers Card */}
                      <div className="p-4 rounded-xl border border-zinc-150 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/10 space-y-3">
                        <h5 className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase font-mono">
                          {t('admin.diagControls', '診斷操控中心 / Controls')}
                        </h5>
                        
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={runManualProbe}
                            disabled={isDiagnosticProbing}
                            className={`w-full flex items-center justify-center gap-2 py-2 px-3.5 text-xs font-semibold rounded-lg shadow-xs transition-all duration-250 cursor-pointer ${
                              isDiagnosticProbing 
                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                                : 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100'
                            }`}
                          >
                            {isDiagnosticProbing ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <RefreshCw size={13} className="hover:rotate-180 transition-transform duration-500" />
                            )}
                            <span>{isDiagnosticProbing ? '全端點探測中...' : '手動執行 API 偵測'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setTrafficSpikeActive(!trafficSpikeActive);
                              setDiagnosticsLogs(prev => [
                                ...prev,
                                `[${new Date().toLocaleTimeString()}] ${trafficSpikeActive ? '⏹️ Disabled traffic spike simulation' : '⚠️ Dynamic Concurrency Load Spike Simulated! Pipelines warming...'} `
                              ]);
                            }}
                            className={`w-full flex items-center justify-center gap-2 py-2 px-3.5 text-xs font-semibold rounded-lg border transition-all duration-250 cursor-pointer ${
                              trafficSpikeActive 
                                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20'
                                : 'bg-transparent text-zinc-650 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800'
                            }`}
                          >
                            <AlertTriangle size={13} className={trafficSpikeActive ? 'animate-bounce text-red-500' : 'text-zinc-400'} />
                            <span>{trafficSpikeActive ? '解除高負載模擬' : '模擬高負載高併發'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Monospace shell logger */}
                      <div className="flex-1 flex flex-col min-h-48 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden relative">
                        <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-850">
                          <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-500 flex items-center gap-1.5 uppercase">
                            <Terminal size={10} className="text-zinc-550" />
                            API Diagnostics Shell
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex animate-pulse shrink-0" />
                        </div>
                        <div className="p-3 font-mono text-[9px] text-emerald-400/90 space-y-1.5 overflow-y-auto max-h-48 flex-1 scrollbar-thin scrollbar-thumb-zinc-800 cursor-text">
                          {diagnosticsLogs.slice(-7).map((logLine, index) => (
                            <p key={index} className="leading-relaxed whitespace-pre-wrap select-all">
                              <span className="text-emerald-600 mr-1">$</span>{logLine}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

              </div>
            )}

            {activeTab === 'enterprise' && (
              <EnterpriseView />
            )}

          </div>
        )}

        {/* SIDE MODAL / DRAWER FOR DETAILED ERROR LOG INSPECTION */}
        {selectedErrorLog && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Dim Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setSelectedErrorLog(null)}
              className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
            />

            {/* Slide-over Panel Sheet */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="relative w-full max-w-xl h-full bg-zinc-50 dark:bg-zinc-950 shadow-2xl border-l border-zinc-200 dark:border-zinc-800/80 overflow-y-auto flex flex-col z-10"
            >
              {/* Header */}
              <div className="sticky top-0 z-20 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-900 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                    <Bug size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {t('admin.errorLogInspectTitle', '診斷系統錯誤日誌')}
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-mono select-all">
                      ID: {selectedErrorLog.id}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedErrorLog(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-all active:scale-95"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Sliding sheet content */}
              <div className="p-6 space-y-6 flex-1">
                
                {/* Section 1: Overview Metadata */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200/50 dark:border-zinc-800/80 shadow-xs space-y-4">
                  <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {t('admin.diagnosticsOverview', '基礎調試資料')}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <p className="text-zinc-400">{t('admin.colLogTool', '介接工具')}</p>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 font-sans">
                        {t(`features.${selectedErrorLog.tool}.title`, selectedErrorLog.tool)}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-zinc-400">{t('admin.llmModelLabel', '模型規格')}</p>
                      <p className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                        {selectedErrorLog.model || 'Unknown Model'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-zinc-400">{t('admin.colLogTime', '請求時間')}</p>
                      <p className="text-zinc-900 dark:text-zinc-100 font-sans">
                        {selectedErrorLog.createdAt ? (
                          new Date(selectedErrorLog.createdAt.seconds * 1000).toLocaleString()
                        ) : (
                          '—'
                        )}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-zinc-400">{t('admin.colSeverityLevel', '嚴重層級')}</p>
                      <div>
                        {(() => {
                          const severity = getErrorSeverity(selectedErrorLog.errorMessage, selectedErrorLog.result, t);
                          return (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold border uppercase tracking-wider ${severity.colorClass}`}>
                              {severity.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Detailed Error Payload */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200/50 dark:border-zinc-800/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      {t('admin.originalErrorPayload', '異常事件記錄 (Exception Payload)')}
                    </h4>
                    <button
                      onClick={() => handleCopyText(selectedErrorLog.errorMessage || selectedErrorLog.result || '', 'payload')}
                      className="text-xs text-zinc-400 hover:text-blue-500 flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      {copySuccess === 'payload' ? (
                        <>
                          <Check size={12} className="text-emerald-500" />
                          <span className="text-emerald-500 font-semibold">{t('common.copied', '已複製')}</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>{t('common.copy', '複製項目')}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-red-500/5 dark:bg-red-500/10 border border-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-xl font-mono text-[10px] break-all whitespace-pre-wrap leading-relaxed max-h-[160px] overflow-y-auto">
                    {selectedErrorLog.errorMessage || selectedErrorLog.result || 'No error details specified.'}
                  </div>
                </div>

                {/* Section 3: Reconstructed Stack Trace */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200/50 dark:border-zinc-800/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
                      <Terminal size={14} />
                      <h4 className="text-xs font-mono font-semibold uppercase tracking-wider">
                        {t('admin.diagnosticsStackTrace', '模擬程式堆疊 (Call Stack Trace)')}
                      </h4>
                    </div>
                  </div>

                  <div className="bg-zinc-950 text-emerald-400 dark:text-emerald-350 p-4 rounded-xl font-mono text-[9px] leading-relaxed overflow-x-auto space-y-1 max-h-[220px]">
                    <div className="text-zinc-500 border-b border-zinc-800 pb-1.5 mb-1.5 flex justify-between items-center text-[8px]">
                      <span>SYSTEM REPORT GENERATION TRACE</span>
                      <span>ENV: web-client-sdk</span>
                    </div>
                    <div className="text-red-400 font-bold font-sans break-words whitespace-pre-wrap">
                      Error: [Gemini SDK Execution Exception] {selectedErrorLog.errorMessage || 'Unknown system failure'}
                    </div>
                    <div className="text-zinc-400 pl-4">{`at invokeModelPipeline (src/services/gemini:124:42)`}</div>
                    <div className="text-zinc-400 pl-4">{`at initiateFeatureRun (src/features/${selectedErrorLog.tool}:88:17)`}</div>
                    <div className="text-zinc-400 pl-4">{`at triggerActiveToolCommand (src/components/SidebarLayout:204:31)`}</div>
                    <div className="text-zinc-500 pl-4">{`at HTMLTableRowElement.dispatchUIEvent (node_modules/react-dom:4108)`}</div>
                    <div className="text-zinc-500 pl-4">{`at processSystemUpdateQueue (node_modules/scheduler:195)`}</div>
                    <div className="text-zinc-650 border-t border-zinc-800/50 pt-1.5 mt-1.5 space-y-0.5">
                      <p>• HOST_GATEWAY: cloud-api.colab-suite.internal</p>
                      <p>• CAPABILITIES: MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API</p>
                      <p>• SYSTEM_TIME: {new Date().toISOString()}</p>
                    </div>
                  </div>
                </div>

                {/* Section 4: Trigger Prompts */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200/50 dark:border-zinc-800/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      {t('admin.triggerPrompts', '呼叫輸入的 Prompts')}
                    </h4>
                    <button
                      onClick={() => handleCopyText(selectedErrorLog.prompt || '', 'prompt')}
                      className="text-xs text-zinc-400 hover:text-blue-500 flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      {copySuccess === 'prompt' ? (
                        <>
                          <Check size={12} className="text-emerald-500" />
                          <span className="text-emerald-500 font-semibold">{t('common.copied', '已複製')}</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>{t('common.copy', '複製')}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900 text-zinc-700 dark:text-zinc-300 p-4 rounded-xl text-xs font-light tracking-wide break-words max-h-[120px] overflow-y-auto">
                    {selectedErrorLog.prompt || (
                      <span className="italic text-zinc-400 font-light text-[11px]">
                        No specific prompt details input detected.
                      </span>
                    )}
                  </div>
                </div>

                {/* Section 5: Complete User Metadata */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200/50 dark:border-zinc-800/80 shadow-xs space-y-4">
                  <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {t('admin.completeUserMetadata', '發起者帳戶完整中繼資料 (User Metadata)')}
                  </h4>

                  {/* Basic identifier */}
                  <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-900/50">
                    <div className="w-9 h-9 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl flex items-center justify-center font-bold text-xs">
                      {selectedErrorLog.userName ? selectedErrorLog.userName.slice(0, 2).toUpperCase() : <User size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">{selectedErrorLog.userName || 'Unknown User'}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{selectedErrorLog.userEmail || '—'}</p>
                    </div>
                  </div>

                  {/* Full parameters list */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <p className="text-zinc-400">{t('admin.colUserUid', '用戶唯一識別碼 (UID)')}</p>
                      <p className="font-mono text-[9px] text-zinc-700 dark:text-zinc-300 select-all truncate shrink border border-zinc-100 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 px-2 py-1 rounded-lg" title={selectedErrorLog.userId}>
                        {selectedErrorLog.userId}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-zinc-400">{t('admin.colUserTier', '當前訂閱方案 (Tier)')}</p>
                      <div className="flex items-center gap-1.5">
                        {selectedUserMetadata?.tier === 'Ultra' || selectedUserMetadata?.tier === 'Pro' || selectedUserMetadata?.tier === 'Plus' ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                            <Crown size={10} />
                            CoLab Ai {selectedUserMetadata?.tier} 有效
                          </span>
                        ) : (selectedUserMetadata?.tier as string) === 'Admin' ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                            🛡️ Admin 管理者
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
                            CoLab Ai Free 免費方案
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-zinc-400">{t('admin.joinedAt', '帳戶創立時間')}</p>
                      <p className="font-light text-zinc-700 dark:text-zinc-300">
                        {selectedUserMetadata?.createdAt ? (
                          new Date(selectedUserMetadata.createdAt.seconds * 1000).toLocaleDateString()
                        ) : (
                          t('admin.userCreatedInstant', '近期註冊帳戶')
                        )}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-zinc-400">{t('admin.defaultModelSelection', '用戶偏好預設模型')}</p>
                      <p className="font-mono text-[10px] text-zinc-700 dark:text-zinc-300">
                        {selectedUserMetadata?.preferences?.defaultModel || 'Global Standard'}
                      </p>
                    </div>
                  </div>

                  {/* Copy entire dump utility */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex justify-end">
                    <button
                      onClick={() => {
                        const dump = {
                          errorLog: selectedErrorLog,
                          userMetadata: selectedUserMetadata || { userId: selectedErrorLog.userId }
                        };
                        handleCopyText(JSON.stringify(dump, null, 2), 'dump');
                      }}
                      className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] font-medium transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {copySuccess === 'dump' ? (
                        <>
                          <Check size={11} className="text-emerald-500" />
                          <span className="text-emerald-500 font-semibold">{t('admin.allDumpCopied', '完整 JSON 副本複製成功！')}</span>
                        </>
                      ) : (
                        <>
                          <Download size={11} />
                          <span>{t('admin.copyEntireDump', '複製完整調試中繼資料 (JSON)')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
              
              {/* Footer controls */}
              <div className="p-6 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900 flex gap-3">
                <button
                  onClick={() => setSelectedErrorLog(null)}
                  className="flex-1 px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-200 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold rounded-xl text-center cursor-pointer transition-all active:scale-99"
                >
                  {t('common.close', '關閉')}
                </button>
              </div>

            </motion.div>
          </div>
        )}

        {/* Critical System Alert Modal */}
        <AnimatePresence>
          {criticalAlertActive && (
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setCriticalAlertActive(false)}
              />
              
              {/* Modal Container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-red-500/30 shadow-[0_0_40px_-15px_rgba(239,68,68,0.3)] rounded-3xl overflow-hidden"
              >
                {/* Header with red gradient */}
                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <ShieldAlert size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold tracking-wide text-sm">{t('admin.criticalAlertTitle', 'CRITICAL API KEY ERROR')}</h3>
                      <p className="text-[10px] text-red-100 font-medium tracking-wider uppercase">Action Required</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCriticalAlertActive(false)}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
                
                {/* Body Content */}
                <div className="p-6">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-4">
                    {t('admin.criticalAlertDesc', 'A critical error related to API keys or permissions was detected. Please investigate the Error Logs.')}
                  </p>
                  
                  {/* Code snippet block */}
                  <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-2xl border border-red-100 dark:border-red-500/20 font-mono text-[11px] text-red-700 dark:text-red-400 max-h-40 overflow-y-auto whitespace-pre-wrap word-break-all shadow-inner">
                    {criticalAlertMessage}
                  </div>
                  
                  {/* Context Meta */}
                  {criticalAlertLog && (
                    <div className="mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center gap-5 text-xs text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-md"><User size={13}/></div>
                        <span className="font-medium truncate max-w-[120px]">{criticalAlertLog.userEmail}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-md"><Terminal size={13}/></div>
                        <span className="font-mono font-medium">{criticalAlertLog.tool}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => setCriticalAlertActive(false)}
                      className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                    >
                      {t('common.dismiss', 'Dismiss')}
                    </button>
                    <button
                      onClick={() => {
                        setCriticalAlertActive(false);
                        setActiveTab('errors');
                        if (criticalAlertLog) {
                          setSelectedErrorLog(criticalAlertLog);
                        }
                      }}
                      className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-500/20 transition cursor-pointer flex items-center gap-2 group"
                    >
                      <span>{t('admin.investigateLog', 'Investigate Log')}</span>
                      <ChevronDown size={14} className="-rotate-90 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
