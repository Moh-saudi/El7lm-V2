'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  DocumentSnapshot,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Filter,
  MapPin,
  Star,
  MessageSquare,
  Building,
  Briefcase,
  Eye,
  Award,
  Trophy,
  CheckCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  User,
  Plus,
  Check,
  Zap,
  ChevronLeft,
  ChevronRight,
  Heart,
  ShieldCheck,
  LayoutGrid,
  ListFilter
} from 'lucide-react';
import SendMessageButton from '@/components/messaging/SendMessageButton';
import { toast, Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fixReceiptUrl } from '@/lib/utils/cloudflare-r2-utils';

// --- Types ---
interface SearchEntity {
  id: string;
  name: string;
  type: 'club' | 'agent' | 'scout' | 'academy' | 'sponsor' | 'trainer';
  email: string;
  profileImage?: string;
  coverImage?: string;
  location: { country: string; city: string; };
  description: string;
  specialization?: string;
  verified: boolean;
  rating: number;
  reviewsCount: number;
  followersCount: number;
  isPremium: boolean;
  isFollowing?: boolean;
  createdAt: any;
  opportunities?: string[];
}

interface FilterOptions {
  searchQuery: string;
  type: 'all' | 'club' | 'agent' | 'academy' | 'trainer';
  country: string;
  city: string;
  sortBy: 'relevance' | 'followers' | 'recent';
  verifiedOnly: boolean;
}

const ENTITY_TYPES = {
  club: { label: 'الأندية', icon: Building, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', gradient: 'from-blue-500 to-blue-600' },
  agent: { label: 'الوكلاء', icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', gradient: 'from-indigo-500 to-indigo-600' },
  academy: { label: 'الأكاديميات', icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', gradient: 'from-amber-500 to-amber-600' },
  trainer: { label: 'المدربين', icon: User, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100', gradient: 'from-cyan-500 to-cyan-600' }
};

// --- Helper Components (Defined as const to ensure static presence) ---
const PageButton = ({ page, currentPage, setCurrentPage }: { page: number, currentPage: number, setCurrentPage: (p: number) => void }) => {
  return (
    <button
      onClick={() => setCurrentPage(page)}
      className={cn(
        "w-12 h-12 rounded-2xl font-black text-sm transition-all",
        currentPage === page
          ? "bg-blue-600 text-white shadow-xl shadow-blue-200 scale-110"
          : "bg-white border border-slate-100 text-slate-400 hover:border-blue-200 hover:text-blue-600"
      )}
    >
      {page}
    </button>
  );
};

const EntityCard = ({ entity, onFollow, isLoading, currentUserId, userData }: any) => {
  const router = useRouter();
  const cfg = ENTITY_TYPES[entity.type as keyof typeof ENTITY_TYPES] || ENTITY_TYPES.club;
  const displayName = entity.name || 'كيان رياضي';

  return (
    <motion.div layout whileHover={{ y: -8 }} className="group">
      <Card className="rounded-[2.5rem] border-slate-100 overflow-hidden shadow-sm hover:shadow-[0_40px_80px_rgba(0,0,0,0.06)] transition-all duration-500 h-full flex flex-col bg-white">

        {/* Lighter Banner */}
        <div className="h-32 relative bg-slate-100 overflow-hidden">
          <img
            src={entity.coverImage || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200'}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
            alt={displayName}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/20 to-transparent"></div>

          <div className="absolute top-4 right-4">
            <button
              onClick={(e) => { e.stopPropagation(); onFollow(); }}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-90",
                entity.isFollowing ? "bg-rose-500 text-white" : "bg-white/80 backdrop-blur text-slate-400 hover:text-rose-500"
              )}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className={cn("w-4 h-4", entity.isFollowing && "fill-current")} />}
            </button>
          </div>
        </div>

        <div className="px-8 pb-8 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex gap-4 -mt-10 relative mb-6">
              <div className="w-20 h-20 rounded-[1.8rem] bg-white p-1 shadow-xl shadow-slate-100">
                <img src={entity.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`} className="w-full h-full object-cover rounded-[1.5rem]" alt={displayName} />
              </div>
              <div className="pt-10">
                <div className="flex items-center gap-1.5 mb-1">
                  <h3 className="text-lg font-black text-slate-900 truncate max-w-[140px]">{displayName}</h3>
                  {entity.verified && <ShieldCheck className="w-4 h-4 text-blue-500" />}
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {entity.location.city || 'غير محدد'}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-50 text-slate-500 text-[10px] font-black uppercase mb-4 border border-slate-100">
              <cfg.icon className={cn("w-3 h-3", cfg.color)} /> {cfg.label}
            </div>

            <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-2 mb-6">
              {entity.description}
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="text-center">
                <p className="text-lg font-black text-slate-900">{(entity.followersCount || 0).toLocaleString()}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">متابع</p>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  <span className="text-lg font-black text-slate-900">{entity.rating}</span>
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">تقييم</p>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="text-center">
                <p className="text-lg font-black text-slate-900">{entity.verified ? 'موثق' : 'نشط'}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">الحالة</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => router.push(`/dashboard/player/search/profile?type=${entity.type}&id=${entity.id}`)}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg shadow-blue-100 transition-all"
              >
                عرض الملف
              </Button>
              <SendMessageButton
                user={{ uid: currentUserId }}
                userData={userData}
                getUserDisplayName={() => userData?.fullName || userData?.full_name || 'مستخدم'}
                targetUserId={entity.id}
                targetUserName={displayName}
                targetUserType={entity.type}
                buttonText=""
                buttonVariant="ghost"
                buttonSize="icon"
                className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 border border-slate-100"
              />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// --- Main Page Component ---
export default function SearchPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userData, setUserData] = useState<any>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    type: 'all',
    country: '',
    city: '',
    sortBy: 'relevance',
    verifiedOnly: false
  });

  const [allData, setAllData] = useState<SearchEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [showFilters, setShowFilters] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  const fetchEntities = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const typesToFetch = filters.type === 'all'
        ? ['club', 'agent', 'academy', 'trainer']
        : [filters.type];

      const fetchPromises = typesToFetch.map(async (type) => {
        try {
          let q = query(collection(db, 'users'), where('accountType', '==', type));
          if (filters.country) {
            q = query(q, where('country', '==', filters.country));
          }
          // Add limit to prevent fetching entire users collection and improve performance
          q = query(q, limit(50));

          const snapshot = await getDocs(q);

          return snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              name: data.fullName || data.full_name || data.display_name || data.name || 'كيان رياضي',
              type: type as any,
              email: data.email || '',
              profileImage: fixReceiptUrl(
                data.profile_image || data.logo || data.profile_photo || data.profileImage ||
                data.photoURL || data.avatar || data.image || data.profile_image_url ||
                data.profile_picture || data.brand_logo || data.business_logo
              ),
              coverImage: fixReceiptUrl(data.coverImage || data.backCover || data.header_image || data.banner),
              location: { country: data.country || data.nationality || '', city: data.city || data.current_location || '', },
              description: data.description || data.bio || data.about || data.specialization || 'وصف غير متاح',
              verified: data.verified || data.is_fifa_licensed || data.is_certified || false,
              rating: data.rating || 4.5,
              reviewsCount: data.reviewsCount || 0,
              followersCount: Array.isArray(data.followers) ? data.followers.length : (data.followersCount || 0),
              isPremium: data.isPremium || false,
              isFollowing: Array.isArray(data.followers) ? data.followers.includes(user.uid) : false,
              createdAt: data.createdAt?.toDate() || new Date(),
            };
          });
        } catch (error) {
          console.warn(`Failed to fetch entities for type ${type}:`, error);
          return [];
        }
      });

      const results = await Promise.all(fetchPromises);
      const allFetched = results.flat();

      // Deduplicate by ID
      const uniqueEntities = Array.from(new Map(allFetched.map(item => [item.id, item])).values());

      setAllData(uniqueEntities);

    } catch (e) {
      console.error("Error fetching entities:", e);
      setAllData([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, filters.type]);

  // Dynamic Metadata based on existing data
  const availableCountries = useMemo(() => {
    return Array.from(new Set(allData.map(e => e.location.country)))
      .filter(c => !!c && c.trim() !== "")
      .sort() as string[];
  }, [allData]);

  const availableCities = useMemo(() => {
    return Array.from(new Set(
      allData
        .filter(e => !filters.country || e.location.country === filters.country)
        .map(e => e.location.city)
    ))
      .filter(c => !!c && c.trim() !== "")
      .sort() as string[];
  }, [allData, filters.country]);

  const filteredEntities = useMemo(() => {
    let result = [...allData];

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
      );
    }

    if (filters.country) {
      result = result.filter(e => e.location.country === filters.country);
    }

    if (filters.city) {
      result = result.filter(e => e.location.city === filters.city);
    }

    if (filters.verifiedOnly) {
      result = result.filter(e => e.verified);
    }

    if (filters.sortBy === 'followers') {
      result.sort((a, b) => b.followersCount - a.followersCount);
    } else if (filters.sortBy === 'recent') {
      result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else if (filters.sortBy === 'relevance') {
      // Logic for deterministic pseudo-random or relevance
      // Keeping random if no search, otherwise relevance could be match score
      if (!filters.searchQuery) result.sort(() => 0.5 - Math.random());
    }

    return result;
  }, [allData, filters.searchQuery, filters.city, filters.verifiedOnly, filters.sortBy]);

  useEffect(() => {
    setTotalResults(filteredEntities.length);
  }, [filteredEntities]);

  useEffect(() => {
    if (user && !loading) fetchEntities();
  }, [user, loading, filters.type]); // Now only depends on type

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) setUserData(userDoc.data());
      }
    };
    fetchUserData();
  }, [user]);

  const totalPages = Math.ceil(filteredEntities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEntities = filteredEntities.slice(startIndex, startIndex + itemsPerPage);

  const handleFollow = async (entity: SearchEntity) => {
    if (!user || isActionLoading) return;
    setIsActionLoading(`follow-${entity.id}`);
    try {
      const col = entity.type === 'club' ? 'clubs' : entity.type === 'agent' ? 'agents' : entity.type === 'trainer' ? 'trainers' : 'academies';
      const ref = doc(db, col, entity.id);
      if (entity.isFollowing) await updateDoc(ref, { followers: arrayRemove(user.uid) });
      else await updateDoc(ref, { followers: arrayUnion(user.uid) });
      setAllData(prev => prev.map(e => e.id === entity.id ? { ...e, isFollowing: !e.isFollowing, followersCount: e.isFollowing ? e.followersCount - 1 : e.followersCount + 1 } : e));
    } catch (e) {
      toast.error('خطأ في العملية');
    } finally {
      setIsActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20" dir="rtl">
      <Toaster />

      {/* Light Hero Section */}
      <div className="bg-white border-b border-slate-100 pt-16 pb-20 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-50/50 blur-[120px] rounded-full -mr-20 -mt-20"></div>
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-6">
            <Zap className="w-3.5 h-3.5 fill-current" /> شبكة الحلم العالمية
          </motion.div>

          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-6 tracking-tight">ابحث عن <span className="text-blue-600">الفرص والأندية</span> ⚽</h1>
          <p className="text-slate-500 font-medium max-w-xl mx-auto mb-10">تواصل مباشرة مع الأندية والوكلاء المحترفين في أكبر شبكة رياضية عربية.</p>

          <div className="max-w-2xl mx-auto relative">
            <div className="flex items-center bg-white rounded-3xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100">
              <div className="flex-1 flex items-center px-4">
                <Search className="w-5 h-5 text-slate-300" />
                <Input
                  value={filters.searchQuery}
                  onChange={(e) => { setFilters(prev => ({ ...prev, searchQuery: e.target.value })); setCurrentPage(1); }}
                  placeholder="ابحث بالاسم أو التخصص..."
                  className="border-none shadow-none focus-visible:ring-0 font-bold bg-transparent text-slate-800"
                />
              </div>
              <Button onClick={() => setShowFilters(!showFilters)} variant="ghost" className="rounded-2xl h-12 px-5 text-slate-400 font-black hover:bg-slate-50">
                <Filter className="w-4 h-4 ml-2" /> خيارات
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 mt-8">

        {/* Filters Panel */}
        <AnimatePresence mode="wait">
          {showFilters && (
            <motion.div
              key="filters-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-slate-400 uppercase mr-1">تصفية حسب النوع</p>
                  <Select value={filters.type} onValueChange={(v) => { setFilters(prev => ({ ...prev, type: v as any })); setCurrentPage(1); }}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      {Object.entries(ENTITY_TYPES).map(([k, v]) => <SelectItem key={`type-opt-${k}`} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-slate-400 uppercase mr-1">الدولة</p>
                  <Select value={filters.country || 'all'} onValueChange={(v) => { setFilters(prev => ({ ...prev, country: v === 'all' ? '' : v })); setCurrentPage(1); }}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 font-bold">
                      <SelectValue placeholder="جميع الدول" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الدول</SelectItem>
                      {availableCountries.map(c => {
                        const val = c.trim() || 'unknown';
                        return <SelectItem key={`country-opt-${val}`} value={val}>{c}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-slate-400 uppercase mr-1">الترتيب</p>
                  <Select value={filters.sortBy} onValueChange={(v) => setFilters(prev => ({ ...prev, sortBy: v as any }))}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">الأكثر صلة</SelectItem>
                      <SelectItem value="followers">الأكثر متابعة</SelectItem>
                      <SelectItem value="recent">الأحدث</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-black text-slate-400 uppercase mr-1">المدينة</p>
                  <Select value={filters.city || 'all'} onValueChange={(v) => { setFilters(prev => ({ ...prev, city: v === 'all' ? '' : v })); setCurrentPage(1); }}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 font-bold">
                      <SelectValue placeholder="جميع المدن" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المدن</SelectItem>
                      {availableCities.map(c => <SelectItem key={`city-opt-${c}`} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between h-12 px-4 rounded-2xl bg-slate-50/50 border border-slate-100 mt-5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-black text-slate-600">الحسابات الموثقة فقط</span>
                  </div>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, verifiedOnly: !prev.verifiedOnly }))}
                    className={cn(
                      "w-10 h-6 rounded-full transition-all relative p-1",
                      filters.verifiedOnly ? "bg-blue-600" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                      filters.verifiedOnly ? "translate-x-4" : "translate-x-0"
                    )} />
                  </button>
                </div>

                <div className="md:col-span-3 flex justify-end mt-4 border-t border-slate-50 pt-6">
                  <Button
                    onClick={() => {
                      setFilters({ searchQuery: '', type: 'all', country: '', city: '', sortBy: 'relevance', verifiedOnly: false });
                      setCurrentPage(1);
                    }}
                    variant="ghost"
                    className="text-slate-400 font-black hover:text-rose-500 gap-2"
                  >
                    <Plus className="w-4 h-4 rotate-45" /> إعادة ضبط كافة المرشحات
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Counter */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4 px-2">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-blue-500" /> النتائج
            </h2>
            <p className="text-xs font-bold text-slate-400">
              عرض <span className="text-blue-600">{Math.min(startIndex + 1, totalResults)}</span> - <span className="text-blue-600">{Math.min(startIndex + itemsPerPage, totalResults)}</span> من أصل {totalResults} نتيجة
            </p>
          </div>
          <div className="flex gap-2 bg-white p-1 rounded-2xl border border-slate-100">
            {(['all', 'club', 'agent', 'academy', 'trainer'] as const).map(t => (
              <button
                key={`tab-btn-${t}`}
                onClick={() => { setFilters(prev => ({ ...prev, type: t })); setCurrentPage(1); }}
                className={cn("px-4 py-2 rounded-xl text-[11px] font-black transition-all", filters.type === t ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-slate-400 hover:text-slate-600")}
              >
                {t === 'all' ? 'الكل' : (ENTITY_TYPES as any)[t].label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="min-h-[400px]">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={`skeleton-card-${i}`} className="h-96 bg-white rounded-[2.5rem] animate-pulse shadow-sm"></div>)}
            </div>
          ) : filteredEntities.length === 0 ? (
            <div className="py-24 text-center bg-white rounded-[3rem] border border-slate-100">
              <Search className="w-16 h-16 text-slate-200 mx-auto mb-6" />
              <h3 className="text-xl font-black text-slate-900">لا يوجد نتائج تطابق بحثك</h3>
              <Button onClick={() => setFilters({ searchQuery: '', type: 'all', country: '', city: '', sortBy: 'relevance', verifiedOnly: false })} variant="link" className="text-blue-600 font-bold mt-2">إعادة تعيين المرشحات</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence>
                {currentEntities.map((entity, idx) => (
                  <EntityCard
                    key={`entity-item-${entity.id}`}
                    entity={entity}
                    onFollow={() => handleFollow(entity)}
                    isLoading={isActionLoading === `follow-${entity.id}`}
                    currentUserId={user?.uid}
                    userData={userData}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Pagination Counter & Controls */}
        {totalPages > 1 && (
          <div className="mt-16 flex flex-col items-center gap-6">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-12 h-12 rounded-2xl border-slate-100 hover:bg-white hover:text-blue-600 font-black shadow-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>

              <div className="flex gap-2">
                {totalPages <= 5 ? (
                  Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <PageButton key={`page-num-${page}`} page={page} currentPage={currentPage} setCurrentPage={setCurrentPage} />
                  ))
                ) : (
                  <>
                    <PageButton key="page-num-first" page={1} currentPage={currentPage} setCurrentPage={setCurrentPage} />
                    {currentPage > 3 && <span key="dots-start-span" className="flex items-end px-2 text-slate-400 font-bold">...</span>}

                    {Array.from({ length: 3 }, (_, i) => {
                      const p = currentPage - 1 + i;
                      if (p > 1 && p < totalPages) return <PageButton key={`page-num-mid-${p}`} page={p} currentPage={currentPage} setCurrentPage={setCurrentPage} />;
                      return null;
                    })}

                    {currentPage < totalPages - 2 && <span key="dots-end-span" className="flex items-end px-2 text-slate-400 font-bold">...</span>}
                    <PageButton key="page-num-last" page={totalPages} currentPage={currentPage} setCurrentPage={setCurrentPage} />
                  </>
                )}
              </div>

              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-12 h-12 rounded-2xl border-slate-100 hover:bg-white hover:text-blue-600 font-black shadow-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </div>

            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-white px-6 py-2 rounded-full border border-slate-100 shadow-sm">
              صفحة {currentPage} من أصل {totalPages}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
