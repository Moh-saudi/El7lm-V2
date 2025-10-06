'use client';

import UserDetailsModal from '@/components/admin/UserDetailsModal';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tabs,
    TabsList,
    TabsTrigger
} from '@/components/ui/tabs';
import { COUNTRIES_DATA } from '@/lib/cities-data';
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { sanitizeForFirestore as deepSanitize, isEmptyObject } from '@/lib/firebase/sanitize';
import '@/styles/admin-dashboard.css';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, collectionGroup, doc, getDoc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import {
    AlertCircle,
    ArrowUpDown,
    BarChart3,
    Briefcase,
    Building2,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Clock,
    Download,
    Eye,
    Filter,
    Globe,
    KeyRound,
    Mail,
    MapPin,
    RefreshCcw,
    Search,
    Shield,
    Trash2,
    User,
    UserCheck,
    UserPlus,
    Users,
    XCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

// Types
interface UserBase {
  id: string;
  name: string;
  email: string;
  phone?: string;
  accountType: 'player' | 'academy' | 'agent' | 'trainer' | 'club';
  isActive: boolean;
  createdAt: Date | null;
  lastLogin?: Date | null;
  parentAccountId?: string;
  parentAccountType?: string;
  parentAccountName?: string;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  sourceCollection?: string;
  subscription?: {
    status: 'active' | 'expired' | 'cancelled' | 'trial';
    plan: string;
    expiresAt: Date;
  };
  location?: {
    countryId: string;
    countryName: string;
    cityId: string;
    cityName: string;
  };
  managedBy?: {
    employeeId: string;
    employeeName: string;
  };
}

interface Player extends UserBase {
  accountType: 'player';
  position?: string;
  dateOfBirth?: Date;
  nationality?: string;
  height?: number;
  weight?: number;
  preferredFoot?: 'right' | 'left' | 'both';
  marketValue?: number;
}

interface Entity extends UserBase {
  accountType: 'academy' | 'agent' | 'trainer' | 'club';
  license?: {
    number: string;
    expiryDate: Date;
    isVerified: boolean;
  };
  rating?: number;
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

export default function UsersManagement() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const VISITOR_DETAILS_STORAGE_KEY = 'admin_users_showVisitorDetails';

  // Add detailed logging
  console.log('👥 Users Management Page - Component loaded:', {
    hasUser: !!user,
    hasUserData: !!userData,
    userEmail: user?.email,
    accountType: userData?.accountType,
    timestamp: new Date().toISOString()
  });

  // States
  const [users, setUsers] = useState<(Player | Entity)[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [parentFilter, setParentFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<{
    countryId: string;
    cityId: string;
  }>({ countryId: '', cityId: '' });
  const [availableRegions, setAvailableRegions] = useState<{
    countries: typeof COUNTRIES_DATA;
    userRegions: { countryId: string; cityId: string; }[];
  }>({
    countries: COUNTRIES_DATA || [],
    userRegions: []
  });
  const hasLoadedOnceRef = useRef(false);

  // Helper: map country name to id from COUNTRIES_DATA (supports Arabic/English names)
  const mapCountryNameToId = (name?: string): { id: string; displayName: string } => {
    if (!name) return { id: '', displayName: '' };
    const normalized = name.toString().trim().toLowerCase();
    const found = (COUNTRIES_DATA || []).find(c => {
      const ar = (c.name || '').toString().trim().toLowerCase();
      const en = (c.nameEn || '').toString().trim().toLowerCase();
      return ar === normalized || en === normalized;
    });
    if (found) return { id: found.id, displayName: found.name };
    return { id: '', displayName: name };
  };

  // Debounce search term for smoother filtering
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    players: 0,
    academies: 0,
    agents: 0,
    trainers: 0,
    clubs: 0,
    independent: 0,
    affiliated: 0
  });

  // Add new filter states
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all');
  // Visitor details collapse state
  const [showVisitorDetails, setShowVisitorDetails] = useState<boolean>(false);

  // Restore persisted collapse state
  useEffect(() => {
    try {
      const v = localStorage.getItem(VISITOR_DETAILS_STORAGE_KEY);
      if (v !== null) setShowVisitorDetails(v === 'true');
    } catch {}
  }, []);

  // Persist collapse state on change
  useEffect(() => {
    try {
      localStorage.setItem(VISITOR_DETAILS_STORAGE_KEY, showVisitorDetails ? 'true' : 'false');
    } catch {}
  }, [showVisitorDetails]);
  // State for date range filter
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Bulk actions
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Modal state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string, name: string } | null>(null);

  // Helper: deep sanitize to avoid Firestore 400 errors
  const sanitizeUpdate = (obj: Record<string, any>) => {
    const cleaned = deepSanitize(obj) as Record<string, any> | undefined;
    if (!cleaned) return {};
    return cleaned;
  };

  // -------- Analytics (visitors, daily registrations, profile completeness) --------
  interface AnalyticsResponse {
    users: { total: number; byType: Record<string, number>; dailyRegistrations: { date: string; count: number }[] };
    visitors: { totalVisits: number; uniqueSessions: number; dailyVisitors: { date: string; count: number }[]; topRoutes?: { route: string; count: number }[]; byCountry?: { country: string; count: number }[]; recent?: { createdAt?: string | null; route?: string | null; ip?: string | null; userAgent?: string | null; geo?: { country?: string | null; region?: string | null; city?: string | null } }[] };
    profiles: { avgCompleteness: number; completedOver80: number; completenessBuckets: Record<string, number>; sampleSize: number };
    generatedAt: string;
    since: string;
  }

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(true);
  const [analyticsError, setAnalyticsError] = useState<string>('');

  // Helper to persist a simple session id
  const ensureSessionId = (): string => {
    try {
      const key = 'el7lm_session_id';
      let id = localStorage.getItem(key);
      if (!id) {
        id = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(key, id);
      }
      return id;
    } catch {
      return 'anonymous';
    }
  };

  useEffect(() => {
    // Fire and forget: record a visit
    const sid = ensureSessionId();
    try {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'visit', route: '/dashboard/admin/users', sessionId: sid })
      }).catch(() => {});
    } catch {}

    // Fetch analytics snapshot
    (async () => {
      try {
        setAnalyticsLoading(true);
        setAnalyticsError('');
        const res = await fetch('/api/analytics');
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'فشل جلب الإحصائيات');
        setAnalytics(json as AnalyticsResponse);
      } catch (e: any) {
        setAnalyticsError(e?.message || 'فشل جلب الإحصائيات');
      } finally {
        setAnalyticsLoading(false);
      }
    })();
  }, []);

  // Resolve orderBy field per collection (best-effort)
  const resolveOrderFieldForCollection = (collectionName: string, field: string): string | null => {
    const f = field.trim();
    // Common aliases per collection
    const createdAtCandidates = ['createdAt', 'created_at', 'created_at_ts'];
    const nameCandidates = ['name', 'full_name', 'displayName'];
    const lastLoginCandidates = ['lastLogin', 'last_login', 'lastSeen', 'last_seen'];
    const accountTypeCandidates = ['accountType'];
    const isActiveCandidates = ['isActive', 'active'];

    const pick = (cands: string[]) => cands[0]; // Prefer first; individual orderBy doesn't need composite index

    switch (f) {
      case 'createdAt':
        return pick(createdAtCandidates);
      case 'name':
        return pick(nameCandidates);
      case 'lastLogin':
        return pick(lastLoginCandidates);
      case 'accountType':
        return pick(accountTypeCandidates);
      case 'isActive':
        return pick(isActiveCandidates);
      default:
        return null;
    }
  };

  const last7DailyRegs = useMemo(() => {
    const rows = analytics?.users?.dailyRegistrations || [];
    return rows.slice(-7);
  }, [analytics]);

  const last7DailyVisitors = useMemo(() => {
    const rows = analytics?.visitors?.dailyVisitors || [];
    return rows.slice(-7);
  }, [analytics]);

  const topCountries = useMemo(() => (analytics?.visitors?.byCountry || []).slice(0, 5), [analytics]);
  const topRoutes = useMemo(() => (analytics?.visitors?.topRoutes || []).slice(0, 5), [analytics]);
  const recentVisits = useMemo(() => (analytics?.visitors?.recent || []).slice(0, 10), [analytics]);

  const maskIp = (ip?: string | null) => {
    if (!ip) return '—';
    if (ip.includes(':')) {
      const parts = ip.split(':');
      return parts.slice(0, 3).join(':') + ':*';
    }
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
    return ip;
  };

  // Load users
  useEffect(() => {
    console.log('🔄 useEffect triggered - reloading users:', {
      startDate,
      endDate,
      accountTypeFilter,
      statusFilter,
      sortBy,
      sortOrder
    });
    loadUsers();
  }, [startDate, endDate, accountTypeFilter, statusFilter, sortBy, sortOrder]); // Re-fetch when any filter changes

  const loadUsers = async () => {
    setLoading(true);
    try {
      const collectionsToFetch = [
        'users',
        'players',
        'academies', 'academy',
        'clubs', 'club',
        'trainers', 'trainer',
        'agents', 'agent',
        'marketers', 'marketer',
        'parents', 'parent'
      ];
      const allDocsPromises = collectionsToFetch.map(col => {
        const colRef = collection(db, col);
        const orderField = resolveOrderFieldForCollection(col, sortBy);
        try {
          if (orderField) {
            return getDocs(query(colRef, orderBy(orderField as any, sortOrder)));
          }
        } catch (e) {
          // Fallback without order if Firestore rejects ordering for this collection
          console.warn(`orderBy(${orderField}) failed for ${col}, falling back to client sort`, e);
        }
        return getDocs(colRef);
      });
      const allDocsSnapshots = await Promise.all(allDocsPromises);

      // Attempt to include affiliated players from subcollections using collection group
      let playersGroupSnapshot: any = null;
      try {
        const orderField = resolveOrderFieldForCollection('players', sortBy);
        if (orderField) {
          playersGroupSnapshot = await getDocs(query(collectionGroup(db, 'players'), orderBy(orderField as any, sortOrder)));
        } else {
          playersGroupSnapshot = await getDocs(collectionGroup(db, 'players'));
        }
      } catch (err) {
        console.warn('collectionGroup(players) not available or failed:', err);
      }

      // First pass: create a map of all potential parent entities (academies, clubs, etc.)
      const parentEntities = new Map<string, string>();
      allDocsSnapshots.forEach((snapshot, index) => {
          const collectionName = collectionsToFetch[index];
          const isParentCollection = ['academies','academy','clubs','club'].includes(collectionName);
          if (isParentCollection) {
              snapshot.docs.forEach(doc => {
                  parentEntities.set(doc.id, doc.data().name || doc.data().full_name || 'جهة غير مسماة');
              });
          }
      });

      // Second pass: process all users and link players to their parents
      const allUsersMap = new Map<string, Player | Entity>();
       allDocsSnapshots.forEach((snapshot, index) => {
        const collectionName = collectionsToFetch[index];
        snapshot.docs.forEach(doc => {
          const data = doc.data() as any;
          const id = doc.id;

          let parentInfo: { parentAccountId?: string; parentAccountType?: string; parentAccountName?: string } = {};
          if (data.parentAccountId) {
              parentInfo.parentAccountId = data.parentAccountId;
              parentInfo.parentAccountName = parentEntities.get(data.parentAccountId);
              // You might need a way to determine the parent's type here
          }


          const baseData = {
            id,
            name: data.name || data.full_name || 'N/A',
            email: data.email || '',
            phone: data.phone || data.phoneNumber || data.whatsapp || '',
            whatsapp: data.whatsapp || '',
            isActive: data.isActive !== false,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.created_at?.toDate ? data.created_at.toDate() : new Date()),
            isDeleted: data.isDeleted || false,
            deletedAt: data.deletedAt?.toDate() || null,
            deletedBy: data.deletedBy || null,
            sourceCollection: collectionName,
            // ... other common fields
            ...parentInfo,
          };

          let userEntry: Player | Entity;

          // Determine account type reliably
          const collectionToTypeMap: Record<string, string> = {
            users: data.accountType || '',
            players: 'player',
            academies: 'academy', academy: 'academy',
            clubs: 'club', club: 'club',
            trainers: 'trainer', trainer: 'trainer',
            agents: 'agent', agent: 'agent',
            marketers: 'marketer', marketer: 'marketer',
            parents: 'parent', parent: 'parent'
          };

          const resolvedAccountType = (collectionToTypeMap[collectionName] || data.accountType || '').trim();

          if (collectionName === 'players' || resolvedAccountType === 'player') {
            userEntry = {
              ...baseData,
              accountType: 'player',
              parentAccountId: data.club_id || data.academy_id,
              // ... other player-specific fields
            };
          } else {
             userEntry = {
              ...baseData,
              accountType: (resolvedAccountType || collectionName) as any,
              // ... other entity-specific fields
            };
          }

          // If a user exists in multiple collections, 'users' collection takes precedence
          if (!allUsersMap.has(id) || collectionName === 'users') {
             allUsersMap.set(id, userEntry);
          }
        });
      });

      // Include players from collection group (affiliated under academies/clubs)
      if (playersGroupSnapshot) {
        playersGroupSnapshot.docs.forEach((docSnap: any) => {
          const data = docSnap.data() as any;
          const id = docSnap.id;

          // Infer parent info from the subcollection path
          const parentRef = docSnap.ref.parent?.parent as any;
          const parentId = parentRef?.id as string | undefined;
          const parentCollection = parentRef?.parent?.id as string | undefined; // e.g., 'academies' or 'clubs'

          const parentAccountType = parentCollection && parentCollection.endsWith('s')
            ? parentCollection.slice(0, -1)
            : parentCollection || undefined;

          const baseData = {
            id,
            name: data.name || data.full_name || 'N/A',
            email: data.email || '',
            phone: data.phone || data.phoneNumber || data.whatsapp || '',
            whatsapp: data.whatsapp || '',
            isActive: data.isActive !== false,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.created_at?.toDate ? data.created_at.toDate() : new Date()),
            isDeleted: data.isDeleted || false,
            deletedAt: data.deletedAt?.toDate() || null,
            deletedBy: data.deletedBy || null,
            sourceCollection: 'players_group',
            parentAccountId: parentId,
            parentAccountType,
            parentAccountName: parentId ? (parentEntities.get(parentId) || '') : undefined,
          } as any;

          const userEntry: Player = {
            ...baseData,
            accountType: 'player',
          };

          if (!allUsersMap.has(id)) {
            allUsersMap.set(id, userEntry);
          }
        });
      }

      let combinedUsers = Array.from(allUsersMap.values());

      // Ensure special debug user is visible for validation
      combinedUsers = combinedUsers.map(u => {
        if (u.email === 'user_20_20123456789_1756900824759_x2xgid@el7lm.com') {
          return { ...u, isDeleted: false, isActive: true } as typeof u;
        }
        return u;
      });

      // Final global sort (ensures cross-collection ordering)
      combinedUsers.sort((a: any, b: any) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];

        // Normalize dates
        const norm = (v: any) => {
          if (v instanceof Date) return v.getTime();
          if (v && typeof v.toDate === 'function') return v.toDate().getTime();
          if (typeof v === 'string' && (sortBy === 'createdAt' || sortBy === 'lastLogin')) {
            const t = Date.parse(v);
            return isNaN(t) ? 0 : t;
          }
          return v ?? 0;
        };

        const av = norm(aVal);
        const bv = norm(bVal);
        if (av < bv) return sortOrder === 'asc' ? -1 : 1;
        if (av > bv) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      setUsers(combinedUsers);
      updateStats(combinedUsers);

    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('حدث خطأ أثناء تحميل المستخدمين.');
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (usersData: (Player | Entity)[]) => {
    const activeUsers = usersData.filter(u => !u.isDeleted);
    const stats = {
      total: activeUsers.length,
      active: activeUsers.filter(u => u.isActive).length,
      players: activeUsers.filter(u => u.accountType === 'player').length,
      academies: activeUsers.filter(u => u.accountType === 'academy').length,
      agents: activeUsers.filter(u => u.accountType === 'agent').length,
      trainers: activeUsers.filter(u => u.accountType === 'trainer').length,
      clubs: activeUsers.filter(u => u.accountType === 'club').length,
      independent: activeUsers.filter(u => !u.parentAccountId).length,
      affiliated: activeUsers.filter(u => u.parentAccountId).length
    };
    setStats(stats);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Correctly filter based on the 'deleted' tab first
      if (statusFilter === 'deleted') {
        return user.isDeleted;
      }
      // For all other tabs, only show non-deleted users
      if (user.isDeleted) {
        return false;
      }

      // Apply other filters
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && user.isActive) ||
        (statusFilter === 'inactive' && !user.isActive);

      const userName = (user.name || '') as string;
      const userEmail = (user.email || '') as string;
      const userPhone = (user as any).phone ? String((user as any).phone) : '';
      const userWhatsapp = (user as any).whatsapp ? String((user as any).whatsapp) : '';
      const userId = (user.id || '') as string;

      const term = (debouncedSearchTerm || '').toString().trim().toLowerCase();
      const digits = term.replace(/\D/g, '');

      const normalize = (v: string) => (v || '').toString().trim().toLowerCase();
      const onlyDigits = (v: string) => (v || '').toString().replace(/\D/g, '');

      const matchesSearch =
        normalize(userName).includes(term) ||
        normalize(userEmail).includes(term) ||
        normalize(userPhone).includes(term) ||
        normalize(userWhatsapp).includes(term) ||
        normalize(userId).includes(term) ||
        (digits && (onlyDigits(userPhone).includes(digits) || onlyDigits(userWhatsapp).includes(digits)));

      const matchesType = accountTypeFilter === 'all' || user.accountType === accountTypeFilter;

      const matchesParent = parentFilter === 'all' ||
        (parentFilter === 'independent' && !user.parentAccountId) ||
        (parentFilter === 'affiliated' && user.parentAccountId);

      const matchesRegion =
        (!regionFilter.countryId || regionFilter.countryId === 'all' || user.location?.countryId === regionFilter.countryId) &&
        (!regionFilter.cityId || regionFilter.cityId === 'all' || user.location?.cityId === regionFilter.cityId);

      const matchesSubscription = subscriptionFilter === 'all' ||
        user.subscription?.status === subscriptionFilter;

      // فلتر التاريخ الجديد - Date Range
      const matchesDate = (() => {
        if (!startDate && !endDate) return true; // لا يوجد فلتر تاريخ

        const userCreatedAt = user.createdAt;
        if (!userCreatedAt) return false;

        const userDate = userCreatedAt instanceof Date ? userCreatedAt : new Date(userCreatedAt);

        // Normalize bounds to full day range
        const startBound = startDate ? new Date(startDate) : null;
        if (startBound) {
          startBound.setHours(0, 0, 0, 0);
        }
        const endBound = endDate ? new Date(endDate) : null;
        if (endBound) {
          endBound.setHours(23, 59, 59, 999);
        }

        // Debug: مراقبة التواريخ للمستخدم المحدد
        if (user.email === 'user_20_20123456789_1756900824759_x2xgid@el7lm.com') {
          console.log('🔍 Debug user date filtering:', {
            userEmail: user.email,
            userCreatedAt: userCreatedAt,
            userDate: userDate,
            startDate: startDate,
            endDate: endDate,
            isDateInstance: userCreatedAt instanceof Date,
            userDateType: typeof userCreatedAt
          });
        }

        if (startBound && endBound) {
          // نطاق تاريخ كامل
          const result = userDate >= startBound && userDate <= endBound;
          if (user.email === 'user_20_20123456789_1756900824759_x2xgid@el7lm.com') {
            console.log('📅 Full date range check:', { result, userDate, startDate, endDate });
          }
          return result;
        } else if (startBound) {
          // من تاريخ محدد
          const result = userDate >= startBound;
          if (user.email === 'user_20_20123456789_1756900824759_x2xgid@el7lm.com') {
            console.log('📅 From date check:', { result, userDate, startDate });
          }
          return result;
        } else if (endBound) {
          // إلى تاريخ محدد
          const result = userDate <= endBound;
          if (user.email === 'user_20_20123456789_1756900824759_x2xgid@el7lm.com') {
            console.log('📅 To date check:', { result, userDate, endDate });
          }
          return result;
        }

        return true;
      })();

      return matchesSearch && matchesType && matchesStatus && matchesParent && matchesRegion && matchesSubscription && matchesDate;
    });
  }, [users, statusFilter, searchTerm, accountTypeFilter, parentFilter, regionFilter, subscriptionFilter, debouncedSearchTerm, startDate, endDate]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, accountTypeFilter, statusFilter, parentFilter, regionFilter, subscriptionFilter, startDate, endDate, sortBy, sortOrder]);

  const totalItems = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Toggle user status
  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const found = users.find(u => u.id === userId) as any;

      if (found?.sourceCollection === 'players') {
        // Update in players collection only
        {
          const payload = sanitizeUpdate({
            isActive: !currentStatus,
            updatedAt: new Date(),
            statusChangedBy: userData?.uid,
            statusChangedAt: new Date()
          });
          if (!isEmptyObject(payload)) {
            await updateDoc(doc(db, 'players', userId), payload);
          }
        }
      } else {
        // Update in main users collection
        {
          const payload = sanitizeUpdate({
            isActive: !currentStatus,
            updatedAt: new Date(),
            statusChangedBy: userData?.uid,
            statusChangedAt: new Date()
          });
          if (!isEmptyObject(payload)) {
            await updateDoc(doc(db, 'users', userId), payload);
          }
        }

        // Also update in role-specific collection if document exists
        const user = users.find(u => u.id === userId);
        if (user) {
          const roleCollection = user.accountType + 's';
          try {
            const roleDocRef = doc(db, roleCollection, userId);
            const roleDoc = await getDoc(roleDocRef);
            if (roleDoc.exists()) {
              {
                const rolePayload = sanitizeUpdate({
                  isActive: !currentStatus,
                  updatedAt: new Date()
                });
                if (!isEmptyObject(rolePayload)) {
                  await updateDoc(roleDocRef, rolePayload);
                }
              }
            }
          } catch (roleError) {
            console.warn(`Failed to update role-specific document: ${roleError}`);
          }
        }
      }

      toast.success(`تم ${!currentStatus ? 'تفعيل' : 'إلغاء تفعيل'} المستخدم بنجاح`);
      // Update UI instantly instead of full reload
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === userId ? { ...u, isActive: !currentStatus } : u
        )
      );
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة المستخدم');
    }
  };

  // Reset user password
  const resetUserPassword = async (userEmail: string, userName: string) => {
    try {
      // Import Firebase Auth functions
      const { auth } = await import('@/lib/firebase/config');

      await sendPasswordResetEmail(auth, userEmail);

      toast.success(`تم إرسال رابط إعادة تعيين كلمة المرور إلى ${userName}`);
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast.error('حدث خطأ أثناء إرسال رابط إعادة تعيين كلمة المرور');
    }
  };

  // Delete user account
  const deleteUserAccount = async (userId: string, userName: string) => {
    if (!userToDelete) return;

    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const deletePayload = {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userData?.uid,
        isActive: false // Ensure account is inactive upon deletion
      };

      const sourceCollection = (user as any).sourceCollection || (user.accountType ? `${user.accountType}s` : 'users');

      // We primarily update the source collection.
      // A more robust system might use a cloud function to sync deletions across related collections.
      await updateDoc(doc(db, sourceCollection, userId), deletePayload);


      toast.success(`تم تعطيل حساب ${userName} ونقله للأرشيف بنجاح`);
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('حدث خطأ أثناء تعطيل المستخدم');
    } finally {
        setUserToDelete(null);
        setShowDeleteConfirm(false);
    }
  };

  // Bulk actions
  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => Array.from(new Set([...prev, ...paginatedUsers.map(u => u.id)])));
    } else {
      // Unselect only current page items
      const pageIds = new Set(paginatedUsers.map(u => u.id));
      setSelectedUsers(prev => prev.filter(id => !pageIds.has(id)));
    }
  };

  const bulkActivateUsers = async () => {
    try {
      const promises = selectedUsers.map(async (userId) => {
        const target = users.find(u => u.id === userId) as any | undefined;
        const common = { isActive: true, updatedAt: new Date(), statusChangedBy: userData?.uid, statusChangedAt: new Date() };
        const payload = sanitizeUpdate(common);

        if (isEmptyObject(payload)) return;

        if (target?.sourceCollection === 'players') {
          // Update only players collection for dependent players
          try { await updateDoc(doc(db, 'players', userId), payload); } catch {}
        } else {
          // Update main users collection
          try { await updateDoc(doc(db, 'users', userId), payload); } catch {}

          // Update role-specific collection if exists
          const roleCollection = target?.accountType ? `${target.accountType}s` : null;
          if (roleCollection && roleCollection !== 'admins') {
            try {
              const roleRef = doc(db, roleCollection, userId);
              const roleSnap = await getDoc(roleRef);
              if (roleSnap.exists()) {
                await updateDoc(roleRef, payload);
              }
            } catch {}
          }
        }
      });

      await Promise.all(promises);
      toast.success(`تم تفعيل ${selectedUsers.length} مستخدم بنجاح`);
      setSelectedUsers([]);
      loadUsers();
    } catch (error) {
      console.error('Error bulk activating users:', error);
      toast.error('حدث خطأ أثناء تفعيل المستخدمين');
    }
  };

  const bulkDeactivateUsers = async () => {
    try {
      const promises = selectedUsers.map(async (userId) => {
        const target = users.find(u => u.id === userId) as any | undefined;
        const common = { isActive: false, updatedAt: new Date(), statusChangedBy: userData?.uid, statusChangedAt: new Date() };
        const payload = sanitizeUpdate(common);

        if (isEmptyObject(payload)) return;

        if (target?.sourceCollection === 'players') {
          // Update only players collection for dependent players
          try { await updateDoc(doc(db, 'players', userId), payload); } catch {}
        } else {
          // Update main users collection
          try { await updateDoc(doc(db, 'users', userId), payload); } catch {}

          // Update role-specific collection if exists
          const roleCollection = target?.accountType ? `${target.accountType}s` : null;
          if (roleCollection && roleCollection !== 'admins') {
            try {
              const roleRef = doc(db, roleCollection, userId);
              const roleSnap = await getDoc(roleRef);
              if (roleSnap.exists()) {
                await updateDoc(roleRef, payload);
              }
            } catch {}
          }
        }
      });

      await Promise.all(promises);
      toast.success(`تم إلغاء تفعيل ${selectedUsers.length} مستخدم بنجاح`);
      setSelectedUsers([]);
      loadUsers();
    } catch (error) {
      console.error('Error bulk deactivating users:', error);
      toast.error('حدث خطأ أثناء إلغاء تفعيل المستخدمين');
    }
  };

  // Update useEffect to show bulk actions when users are selected
  useEffect(() => {
    setShowBulkActions(selectedUsers.length > 0);
  }, [selectedUsers]);

  // Handle user details modal
  const handleViewUser = (userId: string) => {
    setSelectedUserId(userId);
    setShowUserModal(true);
  };

  const handleCloseUserModal = () => {
    setSelectedUserId(null);
    setShowUserModal(false);
  };

  const handleUserUpdated = () => {
    loadUsers(); // Refresh the users list
  };

  // Get account type badge
  const getAccountTypeBadge = (type: string) => {
    switch (type) {
      case 'player':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600">لاعب</Badge>;
      case 'academy':
        return <Badge variant="outline" className="bg-purple-50 text-purple-600">أكاديمية</Badge>;
      case 'agent':
        return <Badge variant="outline" className="bg-amber-50 text-amber-600">وكيل</Badge>;
      case 'trainer':
        return <Badge variant="outline" className="bg-green-50 text-green-600">مدرب</Badge>;
      case 'club':
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-600">نادي</Badge>;
      default:
        return <Badge variant="outline">غير محدد</Badge>;
    }
  };

  // Get subscription status badge
  const getSubscriptionBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-50 text-green-600">نشط</Badge>;
      case 'expired':
        return <Badge className="bg-red-50 text-red-600">منتهي</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-50 text-gray-600">ملغي</Badge>;
      case 'trial':
        return <Badge className="bg-blue-50 text-blue-600">تجريبي</Badge>;
      default:
        return <Badge variant="outline">غير مشترك</Badge>;
    }
  };

  // Add function to check if user has access to region
  const hasRegionAccess = (userLocation?: { countryId: string; cityId: string }) => {
    if (!userLocation) return true; // If no location specified, allow access
    if (userData?.role === 'admin') return true; // Admin has access to all regions

    // For sales employees, check if they have access to this region
    if (userData?.role === 'sales') {
      return userData.permissions?.allowedRegions?.some(
        region => region.countryId === userLocation.countryId &&
                 region.cityId === userLocation.cityId
      );
    }

    return true; // Other roles have full access for now
  };

  // Add RegionFilter component
  const RegionFilter = () => {
    // Add safety checks to prevent undefined errors
    const countries = availableRegions?.countries || [];
    const selectedCountry = countries.find(c => c.id === regionFilter.countryId);

    return (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>الدولة</Label>
          <Select
            value={regionFilter.countryId || 'all'}
            onValueChange={(value) => setRegionFilter(prev => ({
              ...prev,
              countryId: value === 'all' ? '' : value,
              cityId: ''
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="جميع الدول" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الدول</SelectItem>
              {countries.map(country => (
                <SelectItem key={country.id} value={country.id}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{country.flag}</span>
                    <span>{country.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>المدينة</Label>
          <Select
            value={regionFilter.cityId || 'all'}
            onValueChange={(value) => setRegionFilter(prev => ({
              ...prev,
              cityId: value === 'all' ? '' : value
            }))}
            disabled={!regionFilter.countryId}
          >
            <SelectTrigger>
              <SelectValue placeholder="جميع المدن" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المدن</SelectItem>
              {selectedCountry?.cities?.map(city => (
                <SelectItem key={city.id} value={city.id}>
                  {city.name}
                </SelectItem>
              )) || []}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  // Add sorting function
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    loadUsers();
  };

  // Add export function
  const exportUsers = () => {
    const data = filteredUsers.map(user => ({
      'الاسم': user.name,
      'البريد الإلكتروني': user.email,
      'الهاتف': user.phone || '',
      'نوع الحساب': getAccountTypeText(user.accountType),
      'الحالة': user.isActive ? 'نشط' : 'غير نشط',
      'تاريخ التسجيل': (user.createdAt && user.createdAt instanceof Date)
        ? user.createdAt.toLocaleDateString('ar-EG')
        : 'غير محدد',
      'آخر دخول': (user.lastLogin && user.lastLogin instanceof Date)
        ? user.lastLogin.toLocaleDateString('ar-EG')
        : 'لم يسجل دخول',
      'الدولة': user.location?.countryName || '',
      'المدينة': user.location?.cityName || '',
      'حالة الاشتراك': user.subscription?.status || 'غير مشترك'
    }));

    const csv = convertToCSV(data);
    downloadCSV(csv, 'users-export.csv');
  };

  // Helper function to get account type text
  const getAccountTypeText = (type: string) => {
    switch (type) {
      case 'player': return 'لاعب';
      case 'academy': return 'أكاديمية';
      case 'agent': return 'وكيل';
      case 'trainer': return 'مدرب';
      case 'club': return 'نادي';
      default: return 'غير محدد';
    }
  };

  // Helper function to convert data to CSV
  const convertToCSV = (data: any[]) => {
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => headers.map(header => obj[header]));
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  // Helper function to download CSV
  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  // Restore user account
  const restoreUserAccount = async (userId: string, userName: string) => {
      if (!confirm(`هل أنت متأكد من استعادة حساب ${userName}؟ سيتم إعادة تفعيله.`)) {
          return;
      }
      try {
          const user = users.find(u => u.id === userId);
          if (!user) return;

          const restorePayload = {
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
              isActive: true // Re-activate account upon restoration
          };

          const sourceCollection = (user as any).sourceCollection || (user.accountType ? `${user.accountType}s` : 'users');
          await updateDoc(doc(db, sourceCollection, userId), restorePayload);

          toast.success(`تم استعادة حساب ${userName} بنجاح.`);
          loadUsers();
      } catch (error) {
          console.error('Error restoring user:', error);
          toast.error('حدث خطأ أثناء استعادة المستخدم.');
      }
  };

  if (loading) {
    return (
      <div className="bg-gray-50">
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">جاري تحميل بيانات المستخدمين...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-gray-50">

      <main className="flex-1 container mx-auto px-6 py-8">
        {/* Analytics Overview */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          {/* Users and Visitors KPIs */}
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-600"/> لمحة عامة</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsError && (
                <div className="text-sm text-red-600 mb-2">{analyticsError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-blue-50">
                  <div className="text-xs text-blue-700">إجمالي المستخدمين</div>
                  <div className="text-xl font-bold text-blue-900">{analytics?.users?.total ?? '—'}</div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50">
                  <div className="text-xs text-emerald-700">زيارات آخر 30 يوماً</div>
                  <div className="text-xl font-bold text-emerald-900">{analytics?.visitors?.totalVisits ?? '—'}</div>
                </div>
                <div className="p-3 rounded-lg bg-violet-50">
                  <div className="text-xs text-violet-700">جلسات فريدة</div>
                  <div className="text-xl font-bold text-violet-900">{analytics?.visitors?.uniqueSessions ?? '—'}</div>
                </div>
                <div className="p-3 rounded-lg bg-amber-50">
                  <div className="text-xs text-amber-700">متوسط اكتمال الملفات</div>
                  <div className="text-xl font-bold text-amber-900">{analytics?.profiles?.avgCompleteness ?? '—'}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily registrations (last 7 days) */}
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle>التسجيلات اليومية (آخر 7 أيام)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {last7DailyRegs.length === 0 && <div className="text-sm text-gray-500">لا توجد بيانات</div>}
                {last7DailyRegs.map((day) => (
                  <div key={day.date} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-gray-600">
                      {new Date(day.date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-5 relative">
                      <div
                        className="chart-bar chart-bar-blue"
                        style={{
                          width: `${Math.min(100, (day.count / Math.max(1, Math.max(...last7DailyRegs.map(r => r.count)))) * 100)}%`
                        }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] text-white font-medium">{day.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Daily visitors (last 7 days) */}
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle>الزوار اليوميون (آخر 7 أيام)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {last7DailyVisitors.length === 0 && <div className="text-sm text-gray-500">لا توجد بيانات</div>}
                {last7DailyVisitors.map((day) => (
                  <div key={day.date} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-gray-600">
                      {new Date(day.date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-5 relative">
                      <div
                        className="chart-bar chart-bar-emerald"
                        style={{
                          width: `${Math.min(100, (day.count / Math.max(1, Math.max(...last7DailyVisitors.map(r => r.count)))) * 100)}%`
                        }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] text-white font-medium">{day.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">إدارة المستخدمين</h1>
            <p className="text-gray-600">إدارة جميع أنواع الحسابات في النظام</p>
          </div>
          <div className="flex gap-2">
              <Button variant="outline" onClick={loadUsers}>
              <RefreshCcw className="w-4 h-4 ml-2" />
              تحديث
            </Button>
            <Button variant="outline" onClick={exportUsers} className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700">
              <Download className="w-4 h-4 ml-2" />
              تصدير النتائج
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                console.log('📧 Email Migration Button Clicked:', {
                  userEmail: user?.email,
                  accountType: userData?.accountType,
                  redirectingTo: '/dashboard/admin/email-migration',
                  timestamp: new Date().toISOString()
                });
                router.push('/dashboard/admin/email-migration');
              }}
              className="text-orange-600 border-orange-600 hover:bg-orange-50 hover:text-orange-700"
            >
              <Mail className="w-4 h-4 ml-2" />
              تحديث الإيميلات
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/admin/test-access')}
              className="text-purple-600 border-purple-600 hover:bg-purple-50 hover:text-purple-700"
            >
              <Shield className="w-4 h-4 ml-2" />
              اختبار الصلاحيات
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <UserPlus className="w-4 h-4 ml-2" />
              إضافة مستخدم
            </Button>
          </div>
        </div>

        {/* Stats are calculated based on non-deleted users */}
        {statusFilter !== 'deleted' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي المستخدمين</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-green-50 text-green-600">
                  {stats.active} نشط
                </Badge>
                <Badge variant="outline" className="bg-red-50 text-red-600">
                  {stats.total - stats.active} غير نشط
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">اللاعبين</p>
                  <p className="text-2xl font-bold">{stats.players}</p>
                </div>
                <User className="w-8 h-8 text-indigo-500" />
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-blue-50 text-blue-600">
                  {stats.independent} مستقل
                </Badge>
                <Badge variant="outline" className="bg-purple-50 text-purple-600">
                  {stats.affiliated} تابع
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">المؤسسات</p>
                  <p className="text-2xl font-bold">
                    {stats.academies + stats.clubs}
                  </p>
                </div>
                <Building2 className="w-8 h-8 text-amber-500" />
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-amber-50 text-amber-600">
                  {stats.academies} أكاديمية
                </Badge>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-600">
                  {stats.clubs} نادي
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">الوكلاء والمدربين</p>
                  <p className="text-2xl font-bold">
                    {stats.agents + stats.trainers}
                  </p>
                </div>
                <Briefcase className="w-8 h-8 text-green-500" />
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-green-50 text-green-600">
                  {stats.agents} وكيل
                </Badge>
                <Badge variant="outline" className="bg-purple-50 text-purple-600">
                  {stats.trainers} مدرب
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">كل الحسابات</TabsTrigger>
              <TabsTrigger value="active">الحسابات النشطة</TabsTrigger>
              <TabsTrigger value="inactive">الحسابات غير النشطة</TabsTrigger>
              <TabsTrigger value="deleted" className="text-red-600">الحسابات المحذوفة</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div>
              <Label>البحث</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث بالاسم، البريد، الهاتف..."
                  className="pr-10"
                />
              </div>
            </div>

            <div>
              <Label>نوع الحساب</Label>
              <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الأنواع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="player">لاعب</SelectItem>
                  <SelectItem value="academy">أكاديمية</SelectItem>
                  <SelectItem value="agent">وكيل</SelectItem>
                  <SelectItem value="trainer">مدرب</SelectItem>
                  <SelectItem value="club">نادي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>الحالة</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                  <SelectItem value="deleted">محذوف</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>التبعية</Label>
              <Select value={parentFilter} onValueChange={setParentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الحسابات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحسابات</SelectItem>
                  <SelectItem value="independent">مستقل</SelectItem>
                  <SelectItem value="affiliated">تابع</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>حالة الاشتراك</Label>
              <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الاشتراكات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الاشتراكات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="expired">منتهي</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                  <SelectItem value="trial">تجريبي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>تاريخ التسجيل</Label>
              <div className="flex gap-2 items-center">
                <div className="flex flex-col gap-1">
                  <label htmlFor="filter-start-date" className="text-sm font-medium text-gray-700">من تاريخ</label>
                  <input
                    id="filter-start-date"
                    type="date"
                    value={startDate ? startDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="من تاريخ"
                    title="من تاريخ"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="filter-end-date" className="text-sm font-medium text-gray-700">إلى تاريخ</label>
                  <input
                    id="filter-end-date"
                    type="date"
                    value={endDate ? endDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="إلى تاريخ"
                    title="إلى تاريخ"
                  />
                </div>
                <Button
                  onClick={() => { setStartDate(null); setEndDate(null); }}
                  variant="outline"
                  size="sm"
                  className="mt-6"
                >
                  مسح التاريخ
                </Button>
              </div>
            </div>

            {/* Sort by */}
            <div>
              <Label>الترتيب حسب</Label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحقل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">تاريخ التسجيل</SelectItem>
                  <SelectItem value="name">الاسم</SelectItem>
                  <SelectItem value="accountType">نوع الحساب</SelectItem>
                  <SelectItem value="lastLogin">آخر دخول</SelectItem>
                  <SelectItem value="isActive">الحالة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort order */}
            <div>
              <Label>اتجاه الترتيب</Label>
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الاتجاه" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">تنازلي (الأحدث/الأكبر أولاً)</SelectItem>
                  <SelectItem value="asc">تصاعدي (الأقدم/الأصغر أولاً)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="xl:col-span-2">
              <Label>المنطقة</Label>
              <RegionFilter />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">
                {filteredUsers.length} من {users.filter(u => !u.isDeleted).length} مستخدم
              </p>
              {userData?.role === 'sales' && (
                <Badge variant="outline" className="bg-blue-50 text-blue-600">
                  {availableRegions?.userRegions?.length || 0} منطقة مخصصة
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                setSearchTerm('');
                setAccountTypeFilter('all');
                setStatusFilter('all');
                setParentFilter('all');
                setSubscriptionFilter('all');
                setStartDate(null); setEndDate(null);
                setRegionFilter({ countryId: '', cityId: '' });
              }}>
                <Filter className="w-4 h-4 ml-2" />
                إعادة تعيين الفلاتر
              </Button>
              <Button variant="outline" size="sm" onClick={exportUsers}>
                <Download className="w-4 h-4 ml-2" />
                تصدير النتائج
              </Button>
            </div>
          </div>
        </div>

        {/* Visitors Details */}
        <div className="grid grid-cols-1 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-600" />
                تفاصيل الزوار (آخر 30 يوماً)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Countries */}
                <div>
                  <h4 className="font-medium mb-3">الدول الأكثر زيارة</h4>
                  {topCountries.length === 0 && (
                    <div className="text-sm text-gray-500">لا توجد بيانات</div>
                  )}
                  <div className="space-y-2">
                    {topCountries.map((row) => (
                      <div key={row.country} className="flex items-center justify-between text-sm p-2 rounded-md bg-gray-50">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span>{row.country || 'غير معروف'}</span>
                        </div>
                        <span className="text-gray-700">{row.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Routes */}
                <div>
                  <h4 className="font-medium mb-3">أكثر المسارات زيارة</h4>
                  {topRoutes.length === 0 && (
                    <div className="text-sm text-gray-500">لا توجد بيانات</div>
                  )}
                  <div className="space-y-2">
                    {topRoutes.map((row) => (
                      <div key={row.route} className="flex items-center justify-between text-sm p-2 rounded-md bg-gray-50">
                        <div className="truncate max-w-[220px]" title={row.route}>{row.route}</div>
                        <span className="text-gray-700">{row.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent */}
                <div>
                  <h4 className="font-medium mb-3">آخر الزيارات</h4>
                  {(recentVisits || []).length === 0 && (
                    <div className="text-sm text-gray-500">لا توجد بيانات</div>
                  )}
                  <div className="space-y-2">
                    {recentVisits.map((v, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm p-2 rounded-md bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="truncate" title={v.createdAt || ''}>
                              {v.createdAt ? new Date(v.createdAt).toLocaleString('ar-EG') : '—'}
                            </span>
                          </div>
                          <div className="text-gray-600 truncate" title={v.route || ''}>{v.route || '/'}</div>
                          <div className="text-gray-500 truncate" title={`${v.geo?.city || ''} ${v.geo?.country || ''}`.trim()}>
                            {(v.geo?.city || v.geo?.country) ? `${v.geo?.city || ''}${v.geo?.city && v.geo?.country ? ', ' : ''}${v.geo?.country || ''}` : 'غير معروف'}
                          </div>
                        </div>
                        <div className="ml-4 text-gray-700">{maskIp(v.ip)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Actions/Table Header */}
        <div className="bg-white rounded-t-xl border border-gray-200 border-b-0 p-4 min-h-[68px] flex items-center">
            {selectedUsers.length > 0 ? (
                // Actions View (single or bulk)
                <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <p className="text-sm font-medium text-blue-900">
                  تم تحديد {selectedUsers.length} مستخدم
                </p>
                        {selectedUsers.length > 1 ? (
                            // Bulk Actions
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={bulkActivateUsers} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 ml-1" />
                                    تفعيل المحدد
                  </Button>
                  <Button size="sm" variant="outline" onClick={bulkDeactivateUsers}>
                    <XCircle className="w-4 h-4 ml-1" />
                                    إلغاء تفعيل المحدد
                  </Button>
                </div>
                        ) : (
                            // Single User Actions
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewUser(selectedUsers[0])}
                                >
                                    <Eye className="w-4 h-4 ml-1" />
                                    عرض التفاصيل
                                </Button>
                                {statusFilter !== 'deleted' && (
                                  <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const user = users.find(u => u.id === selectedUsers[0]);
                                            if (user) resetUserPassword(user.email, user.name);
                                        }}
                                    >
                                        <KeyRound className="w-4 h-4 ml-1" />
                                        إعادة تعيين كلمة المرور
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                            const user = users.find(u => u.id === selectedUsers[0]);
                                            if (user) {
                                                setUserToDelete({ id: user.id, name: user.name });
                                                setShowDeleteConfirm(true);
                                            }
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4 ml-1" />
                                        حذف
                                    </Button>
                                  </>
                                )}
                                {statusFilter === 'deleted' && (
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            const user = users.find(u => u.id === selectedUsers[0]);
                                            if(user) restoreUserAccount(user.id, user.name);
                                        }}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <RefreshCcw className="w-4 h-4 ml-2" />
                                        استعادة الحساب
                                    </Button>
                                )}
                            </div>
                        )}
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedUsers([])}>
                إلغاء التحديد
                    </Button>
                </div>
            ) : (
                // Default View
                <div className="flex items-center justify-between w-full">
                    <p className="text-sm text-gray-600">
                        {filteredUsers.length} من {users.filter(u => !u.isDeleted).length} مستخدم
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                            setSearchTerm('');
                            setAccountTypeFilter('all');
                            setStatusFilter('all');
                            setParentFilter('all');
                            setSubscriptionFilter('all');
                            setStartDate(null); setEndDate(null);
                            setRegionFilter({ countryId: '', cityId: '' });
                        }}>
                            <Filter className="w-4 h-4 ml-2" />
                            إعادة تعيين الفلاتر
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportUsers}>
                            <Download className="w-4 h-4 ml-2" />
                            تصدير النتائج
              </Button>
            </div>
          </div>
        )}
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 border-t-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={paginatedUsers.length > 0 && paginatedUsers.every(u => selectedUsers.includes(u.id))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300"
                    title="تحديد الكل"
                    aria-label="تحديد الكل"
                  />
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="flex items-center gap-1"
                    onClick={() => handleSort('name')}
                    title="ترتيب حسب الاسم"
                  >
                    المستخدم
                    {sortBy === 'name' ? (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="flex items-center gap-1"
                    onClick={() => handleSort('accountType')}
                    title="ترتيب حسب النوع"
                  >
                    نوع الحساب
                    {sortBy === 'accountType' ? (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                  </button>
                </TableHead>
                <TableHead>التبعية</TableHead>
                <TableHead>الاشتراك</TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="flex items-center gap-1"
                    onClick={() => handleSort('lastLogin')}
                    title="ترتيب حسب آخر دخول"
                  >
                    آخر دخول
                    {sortBy === 'lastLogin' ? (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    className="flex items-center gap-1"
                    onClick={() => handleSort('isActive')}
                    title="ترتيب حسب الحالة"
                  >
                    الحالة
                    {sortBy === 'isActive' ? (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                  </button>
                </TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                      className="rounded border-gray-300"
                      title={`تحديد المستخدم ${user.name || ''}`}
                      aria-label={`تحديد المستخدم ${user.name || ''}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.phone && (
                          <div className="text-xs text-gray-400">{user.phone}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getAccountTypeBadge(user.accountType)}
                  </TableCell>
                  <TableCell>
                    {user.parentAccountId ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Shield className="w-4 h-4 text-purple-500" />
                        <span>تابع لـ {user.parentAccountName || user.parentAccountType}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-sm">
                        <UserCheck className="w-4 h-4 text-green-500" />
                        <span>مستقل</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {getSubscriptionBadge(user.subscription?.status)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-600">
                      {user.lastLogin && user.lastLogin instanceof Date ? (
                        user.lastLogin.toLocaleDateString('ar-EG')
                      ) : (
                        'لم يسجل دخول'
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={user.isActive}
                        onCheckedChange={() => toggleUserStatus(user.id, user.isActive)}
                        disabled={loading}
                        title={user.isActive ? 'تعطيل المستخدم' : 'تفعيل المستخدم'}
                        aria-label={user.isActive ? 'تعطيل المستخدم' : 'تفعيل المستخدم'}
                        className={`data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300`}
                      />
                      <span className={`text-xs ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {user.isActive ? 'نشط' : 'معطل'}
                      </span>
                      {user.isActive ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* View Details Button - Redesigned */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewUser(user.id)}
                        className="bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border-indigo-200 hover:border-indigo-300 text-indigo-700 hover:text-indigo-800 transition-all duration-300 transform hover:scale-105"
                      >
                        <Eye className="w-4 h-4 ml-1" />
                        عرض التفاصيل
                      </Button>

                      {/* Reset Password Button */}
                      {statusFilter !== 'deleted' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resetUserPassword(user.email, user.name)}
                          className="bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border-amber-200 hover:border-amber-300 text-amber-700 hover:text-amber-800 transition-all duration-300 transform hover:scale-105"
                          title="إعادة تعيين كلمة المرور"
                        >
                          <KeyRound className="w-4 h-4 ml-1" />
                        </Button>
                      )}

                      {/* Delete/Restore Button */}
                      {statusFilter !== 'deleted' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUserToDelete({ id: user.id, name: user.name });
                            setShowDeleteConfirm(true);
                          }}
                          className="bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 border-red-200 hover:border-red-300 text-red-700 hover:text-red-800 transition-all duration-300 transform hover:scale-105"
                          title="حذف المستخدم"
                        >
                          <Trash2 className="w-4 h-4 ml-1" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => restoreUserAccount(user.id, user.name)}
                          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 transition-all duration-300 transform hover:scale-105"
                          title="استعادة الحساب"
                        >
                          <RefreshCcw className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد نتائج</h3>
              <p className="text-gray-500">لم يتم العثور على مستخدمين مطابقين للفلاتر المحددة</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {filteredUsers.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              عرض {(currentPage - 1) * pageSize + 1}
              ـ{Math.min(currentPage * pageSize, totalItems)} من {totalItems}
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-gray-600">حجم الصفحة</Label>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                  الأولى
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  السابقة
                </Button>
                <span className="text-sm text-gray-700">صفحة {currentPage} من {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  التالية
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                  الأخيرة
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>


      {/* User Details Modal */}
      <UserDetailsModal
        userId={selectedUserId}
        isOpen={showUserModal}
        onClose={handleCloseUserModal}
        onUserUpdated={handleUserUpdated}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد تماماً؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم تعطيل حساب <span className="font-bold">{userToDelete?.name}</span> ونقله إلى الأرشيف. يمكنك استعادة الحساب لاحقاً من تبويب "الحسابات المحذوفة".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUserAccount(userToDelete.id, userToDelete.name)}
              className="bg-red-600 hover:bg-red-700"
            >
              نعم، قم بالتعطيل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
