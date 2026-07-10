'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
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
  ListFilter,
  Target,
  Calendar,
  X,
  Users,
  Bookmark,
  BookmarkCheck,
  Share2,
  Copy,
} from 'lucide-react';
import SendMessageButton from '@/components/messaging/SendMessageButton';
import { toast, Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fixReceiptUrl } from '@/lib/utils/cloudflare-r2-utils';
import { getExploreOpportunities, applyToOpportunity, incrementViewCount, getPlayerApplications } from '@/lib/firebase/opportunities';
import { notifyNewApplication } from '@/lib/opportunities/notifications';
import { OPPORTUNITY_TYPES } from '@/lib/opportunities/config';
import { Opportunity, OpportunityType } from '@/types/opportunities';
import { getSupabaseImageUrl } from '@/lib/supabase/image-utils';
import { useTranslation } from '@/lib/i18n';

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
  club: { label: 'الأندية', labelKey: 'oppsExplorer.entityTypes.club', icon: Building, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', gradient: 'from-blue-500 to-blue-600' },
  agent: { label: 'الوكلاء', labelKey: 'oppsExplorer.entityTypes.agent', icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', gradient: 'from-indigo-500 to-indigo-600' },
  academy: { label: 'الأكاديميات', labelKey: 'oppsExplorer.entityTypes.academy', icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', gradient: 'from-amber-500 to-amber-600' },
  trainer: { label: 'المدربين', labelKey: 'oppsExplorer.entityTypes.trainer', icon: User, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100', gradient: 'from-cyan-500 to-cyan-600' }
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
  const { t, isRTL } = useTranslation();
  const cfg = ENTITY_TYPES[entity.type as keyof typeof ENTITY_TYPES] || ENTITY_TYPES.club;
  const displayName = entity.name || t('oppsExplorer.entityTypes.all') || 'كيان رياضي';

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
                  <MapPin className="w-3 h-3" /> {entity.location.city || t('billing.unknown') || 'غير محدد'}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-50 text-slate-500 text-[10px] font-black uppercase mb-4 border border-slate-100">
              <cfg.icon className={cn("w-3 h-3", cfg.color)} /> {t(cfg.labelKey) || cfg.label}
            </div>

            <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-2 mb-6">
              {entity.description}
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="text-center">
                <p className="text-lg font-black text-slate-900">{(entity.followersCount || 0).toLocaleString()}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{isRTL ? 'متابع' : 'Followers'}</p>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  <span className="text-lg font-black text-slate-900">{entity.rating}</span>
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{isRTL ? 'تقييم' : 'Rating'}</p>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="text-center">
                <p className="text-lg font-black text-slate-900">{entity.verified ? (isRTL ? 'موثق' : 'Verified') : (isRTL ? 'نشط' : 'Active')}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{t('myApplications.colStatus') || 'الحالة'}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => router.push(`/dashboard/player/search/profile?type=${entity.type}&id=${entity.id}`)}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg shadow-blue-100 transition-all"
              >
                {t('oppsExplorer.viewProfileBtn') || 'عرض الملف'}
              </Button>
              <SendMessageButton
                user={{ uid: currentUserId }}
                userData={userData}
                getUserDisplayName={() => userData?.fullName || userData?.full_name || (isRTL ? 'مستخدم' : 'User')}
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
  const { t, isRTL, locale } = useTranslation();
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userData, setUserData] = useState<any>(null);

  const [activeSection, setActiveSection] = useState<'entities' | 'opportunities'>('opportunities');

  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    type: 'all',
    country: '',
    city: '',
    sortBy: 'relevance',
    verifiedOnly: false
  });

  const [allData, setAllData] = useState<SearchEntity[]>([]);

  // Opportunities state
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [oppLoading, setOppLoading] = useState(true);
  const [oppTypeFilter, setOppTypeFilter] = useState<OpportunityType | 'all'>('all');
  const [oppSearch, setOppSearch] = useState('');
  const [applyModalOpp, setApplyModalOpp] = useState<Opportunity | null>(null);
  const [detailOpp, setDetailOpp] = useState<Opportunity | null>(null);
  const [applyMessage, setApplyMessage] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccessOpp, setApplySuccessOpp] = useState<Opportunity | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [myApplications, setMyApplications] = useState<Record<string, { status: string; reviewNote?: string }>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [filterForMe, setFilterForMe] = useState(false);

  useEffect(() => {
    getExploreOpportunities()
      .then(list => setOpportunities(list))
      .catch(() => {})
      .finally(() => setOppLoading(false));
  }, []);

  // جلب طلبات اللاعب مع حالتها
  useEffect(() => {
    if (!user?.id) return;
    getPlayerApplications(user.id).then(apps => {
      setAppliedIds(new Set(apps.map(a => a.opportunityId)));
      const map: Record<string, { status: string; reviewNote?: string }> = {};
      apps.forEach(a => { map[a.opportunityId] = { status: a.status, reviewNote: a.reviewNote }; });
      setMyApplications(map);
    }).catch(() => {});
  }, [user?.id]);

  // تحميل الفرص المحفوظة من localStorage
  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = localStorage.getItem(`opp_saved_${user.id}`);
      if (raw) setSavedIds(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
  }, [user?.id]);

  const toggleSave = (oppId: string) => {
    if (!user?.id) return;
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(oppId)) next.delete(oppId);
      else next.add(oppId);
      try {
        localStorage.setItem(`opp_saved_${user.id}`, JSON.stringify([...next]));
      } catch { /* ignore */ }
      return next;
    });
  };
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
          let sbQuery = supabase.from('users').select('*').eq('accountType', type).limit(50);
          if (filters.country) {
            sbQuery = sbQuery.eq('country', filters.country);
          }
          const { data: rows } = await sbQuery;

          return (rows || []).map(data => ({
              id: data.id,
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
              isFollowing: Array.isArray(data.followers) ? data.followers.includes(user!.id) : false,
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          }));
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
        const { data } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
        if (data) setUserData(data);
      }
    };
    fetchUserData();
  }, [user]);

  const totalPages = Math.ceil(filteredEntities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEntities = filteredEntities.slice(startIndex, startIndex + itemsPerPage);

  const filteredOpportunities = opportunities.filter(opp => {
    const matchType = oppTypeFilter === 'all' || opp.opportunityType === oppTypeFilter;
    const matchSearch = !oppSearch || opp.title.includes(oppSearch) || opp.organizerName.includes(oppSearch);
    if (!matchType || !matchSearch) return false;
    if (filterForMe) {
      const playerPos = userData?.position || userData?.playing_position || '';
      const playerAge = userData?.age ? Number(userData.age) : undefined;
      const posMatch = !opp.targetPositions?.length || (playerPos && opp.targetPositions.includes(playerPos));
      const ageMatch = !playerAge || (
        (!opp.ageMin || playerAge >= opp.ageMin) &&
        (!opp.ageMax || playerAge <= opp.ageMax)
      );
      return !!(posMatch && ageMatch);
    }
    return true;
  });

  const handleApply = async () => {
    if (!user || !applyModalOpp) return;
    setIsApplying(true);
    try {
      const { data: playerRow } = await supabase.from('players').select('*').eq('id', user!.id).maybeSingle();
      const pd = playerRow || {};
      const avatarPath = pd.profile_image || pd.profileImage || pd.avatar || '';
      const avatarUrl = avatarPath ? (getSupabaseImageUrl(avatarPath) || avatarPath) : '';

      const playerName = userData?.full_name || userData?.fullName || user!.user_metadata?.full_name || 'لاعب';
      await applyToOpportunity(applyModalOpp.id, user!.id, {
        opportunityTitle: applyModalOpp.title,
        organizerName: applyModalOpp.organizerName,
        organizerType: applyModalOpp.organizerType,
        playerName,
        playerPhone: userData?.phone || '',
        playerPosition: pd.position || pd.playing_position || '',
        playerCountry: pd.country || pd.nationality || '',
        playerAge: pd.age ? Number(pd.age) : undefined,
        playerHeight: pd.height ? Number(pd.height) : undefined,
        playerWeight: pd.weight ? Number(pd.weight) : undefined,
        playerFoot: pd.preferred_foot || pd.foot || '',
        playerCurrentClub: pd.current_club || pd.club || '',
        playerContractStatus: pd.contract_status || '',
        playerAvatarUrl: avatarUrl,
        playerStats: pd.stats || {},
        message: applyMessage,
      });
      await notifyNewApplication(applyModalOpp.organizerId, applyModalOpp.organizerType, playerName, applyModalOpp.title, applyModalOpp.id);
      await incrementViewCount(applyModalOpp.id);
      toast.success('تم إرسال طلب التقديم بنجاح');
      setAppliedIds(prev => new Set(prev).add(applyModalOpp.id));
      setApplySuccessOpp(applyModalOpp);
      setApplyModalOpp(null);
      setApplyMessage('');
    } catch {
      toast.error('فشل إرسال الطلب');
    } finally {
      setIsApplying(false);
    }
  };

  const handleFollow = async (entity: SearchEntity) => {
    if (!user || isActionLoading) return;
    setIsActionLoading(`follow-${entity.id}`);
    try {
      const col = entity.type === 'club' ? 'clubs' : entity.type === 'agent' ? 'agents' : entity.type === 'trainer' ? 'trainers' : 'academies';
      const { data: current } = await supabase.from(col).select('followers').eq('id', entity.id).maybeSingle();
      const currentFollowers: string[] = Array.isArray(current?.followers) ? current.followers : [];
      const updatedFollowers = entity.isFollowing
        ? currentFollowers.filter(f => f !== user.id)
        : [...currentFollowers, user.id];
      await supabase.from(col).update({ followers: updatedFollowers }).eq('id', entity.id);
      setAllData(prev => prev.map(e => e.id === entity.id ? { ...e, isFollowing: !e.isFollowing, followersCount: e.isFollowing ? e.followersCount - 1 : e.followersCount + 1 } : e));
    } catch (e) {
      toast.error('خطأ في العملية');
    } finally {
      setIsActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20" dir={isRTL ? "rtl" : "ltr"}>
      <Toaster />

      {/* Light Hero Section */}
      <div className="bg-white border-b border-slate-100 pt-16 pb-20 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-50/50 blur-[120px] rounded-full -mr-20 -mt-20"></div>
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-6">
            <Zap className="w-3.5 h-3.5 fill-current" /> {isRTL ? 'شبكة الحلم العالمية' : 'Dream Global Network'}
          </motion.div>

          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-6 tracking-tight">{t('oppsExplorer.title')} ⚽</h1>
          <p className="text-slate-500 font-medium max-w-xl mx-auto mb-10">{t('oppsExplorer.subtitle')}</p>

          <div className="max-w-2xl mx-auto relative">
            <div className="flex items-center bg-white rounded-3xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100">
              <div className="flex-1 flex items-center px-4">
                <Search className="w-5 h-5 text-slate-300" />
                <Input
                  value={filters.searchQuery}
                  onChange={(e) => { setFilters(prev => ({ ...prev, searchQuery: e.target.value })); setCurrentPage(1); }}
                  placeholder={t('oppsExplorer.searchPlaceholder')}
                  className="border-none shadow-none focus-visible:ring-0 font-bold bg-transparent text-slate-800"
                />
              </div>
              <Button onClick={() => setShowFilters(!showFilters)} variant="ghost" className="rounded-2xl h-12 px-5 text-slate-400 font-black hover:bg-slate-50">
                <Filter className="w-4 h-4 ml-2" /> {t('oppsExplorer.filterBtn')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 mt-8">

        {/* Section Switcher */}
        <div className="flex gap-2 mb-8 bg-white rounded-2xl p-1.5 border border-slate-100 shadow-sm max-w-sm mx-auto">
          <button
            onClick={() => setActiveSection('opportunities')}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all',
              activeSection === 'opportunities' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            🎯 {t('oppsExplorer.opportunitiesTab')}
          </button>
          <button
            onClick={() => setActiveSection('entities')}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all',
              activeSection === 'entities' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            🏟️ {t('oppsExplorer.entitiesTab')}
          </button>
        </div>

        {/* Opportunities Section */}
        {activeSection === 'opportunities' && (
          <div>
            {/* Opportunities search + type filter */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="flex items-center bg-white rounded-2xl px-4 h-12 border border-slate-100 shadow-sm flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-300 ml-2" />
                <input
                  value={oppSearch}
                  onChange={e => setOppSearch(e.target.value)}
                  placeholder={t('oppsExplorer.searchPlaceholder')}
                  className="flex-1 text-sm font-medium bg-transparent outline-none text-slate-800"
                />
              </div>
              <button
                onClick={() => setFilterForMe(prev => !prev)}
                className={cn(
                  'h-12 px-4 rounded-2xl text-sm font-bold border transition-all flex items-center gap-2',
                  filterForMe
                    ? 'bg-green-500 text-white border-green-500 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-100 hover:border-green-300'
                )}
              >
                <Target className="w-4 h-4" />
                {t('oppsExplorer.recommendedOnly')}
              </button>
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setOppTypeFilter('all')}
                  className={cn('px-3 py-1.5 rounded-xl text-xs font-bold transition-all', oppTypeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-100 text-slate-500')}
                >
                  {t('oppsExplorer.entityTypes.all')}
                </button>
                {Object.entries(OPPORTUNITY_TYPES).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setOppTypeFilter(key as OpportunityType)}
                    className={cn('px-3 py-1.5 rounded-xl text-xs font-bold transition-all', oppTypeFilter === key ? 'bg-blue-600 text-white' : 'bg-white border border-slate-100 text-slate-500')}
                  >
                    {cfg.emoji} {isRTL ? cfg.label : cfg.labelEn || cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {oppLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
            ) : filteredOpportunities.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">{t('oppsExplorer.noOpportunities')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOpportunities.map(opp => {
                  const cfg = OPPORTUNITY_TYPES[opp.opportunityType] ?? { label: opp.opportunityType, labelEn: opp.opportunityType, emoji: '📌', color: '#6B7280' };
                  return (
                    <div key={opp.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      <div className="h-1 w-full" style={{ backgroundColor: cfg.color }} />
                      {opp.coverImage ? (
                        <div className="h-44 overflow-hidden bg-slate-100">
                          <img src={opp.coverImage} alt={opp.title} className="h-full w-full object-cover" />
                        </div>
                      ) : opp.promoVideo ? (
                        <div className="h-44 overflow-hidden bg-black">
                          <video src={opp.promoVideo} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                        </div>
                      ) : null}
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <span
                             className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white"
                             style={{ backgroundColor: cfg.color }}
                           >
                            {cfg.emoji} {isRTL ? cfg.label : cfg.labelEn || cfg.label}
                          </span>
                          {opp.isFeatured && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {isRTL ? 'مميزة' : 'Featured'}
                            </span>
                          )}
                          {opp.applicationDeadline && (
                            <span className="text-xs text-slate-400 flex items-center gap-1 mr-auto">
                              <Calendar className="w-3 h-3" />
                              {new Date(opp.applicationDeadline).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          <button
                            onClick={() => toggleSave(opp.id)}
                            className="p-1 rounded-lg hover:bg-slate-50 transition-colors"
                            title={savedIds.has(opp.id) ? (isRTL ? 'إلغاء الحفظ' : 'Unsave') : (isRTL ? 'حفظ الفرصة' : 'Save opportunity')}
                          >
                            {savedIds.has(opp.id)
                              ? <BookmarkCheck className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                              : <Bookmark className="w-4 h-4 text-slate-400" />
                            }
                          </button>
                        </div>
                        <h3 className="font-bold text-slate-900 mb-1 line-clamp-2">{opp.title}</h3>
                        <p className="text-sm text-slate-500 mb-3">{opp.organizerName}</p>
                        {opp.description && (
                          <p className="text-xs text-slate-400 line-clamp-2 mb-4">{opp.description}</p>
                        )}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => setDetailOpp(opp)}
                            className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" /> {isRTL ? 'عرض كامل تفاصيل الفرصة' : 'View Full Details'}
                          </button>
                          <div className="flex gap-2">
                            {appliedIds.has(opp.id) ? (
                              <div className="flex-1 py-2.5 bg-green-50 text-green-600 border border-green-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5" /> {isRTL ? 'تم التقديم' : 'Applied'}
                              </div>
                            ) : (
                              <button
                                onClick={() => { setApplyModalOpp(opp); setApplyMessage(''); }}
                                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Target className="w-3.5 h-3.5" /> {t('oppsExplorer.applyBtn')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Details Modal */}
        {detailOpp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetailOpp(null)}>
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden max-h-[93vh] flex flex-col" onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full text-white"
                      style={{ backgroundColor: OPPORTUNITY_TYPES[detailOpp.opportunityType]?.color ?? '#6B7280' }}>
                      {OPPORTUNITY_TYPES[detailOpp.opportunityType]?.emoji} {isRTL ? OPPORTUNITY_TYPES[detailOpp.opportunityType]?.label : OPPORTUNITY_TYPES[detailOpp.opportunityType]?.labelEn || detailOpp.opportunityType}
                    </span>
                    {detailOpp.isFeatured && (
                      <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">{isRTL ? 'مميزة' : 'Featured'}</span>
                    )}
                  </div>
                  <h2 className="font-black text-gray-900 text-base leading-snug">{detailOpp.title}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{detailOpp.organizerName}</p>
                </div>
                <button onClick={() => setDetailOpp(null)} className="text-gray-400 hover:text-gray-600 shrink-0 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
                {detailOpp.coverImage ? (
                  <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
                    <img src={detailOpp.coverImage} alt={detailOpp.title} className="h-56 w-full object-cover" />
                  </div>
                ) : detailOpp.promoVideo ? (
                  <div className="overflow-hidden rounded-2xl border border-gray-100 bg-black">
                    <video src={detailOpp.promoVideo} controls className="h-56 w-full object-cover" />
                  </div>
                ) : null}

                {/* حالة طلب التقديم */}
                {myApplications[detailOpp.id] && (() => {
                  const app = myApplications[detailOpp.id];
                  const statusMap: Record<string, { label: string; color: string }> = {
                    pending:  { label: t('myApplications.tabPending') || 'قيد المراجعة',  color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
                    accepted: { label: t('myApplications.tabAccepted') || 'تم القبول ✓',   color: 'bg-green-50 text-green-700 border-green-200'  },
                    rejected: { label: t('myApplications.tabRejected') || 'لم يتم القبول', color: 'bg-red-50 text-red-600 border-red-200'        },
                  };
                  const s = statusMap[app.status] ?? statusMap.pending;
                  return (
                    <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${s.color}`}>
                      {isRTL ? 'حالة طلبك: ' : 'Your application status: '}{s.label}
                      {app.reviewNote && <p className="font-normal mt-1 text-xs opacity-80">{app.reviewNote}</p>}
                    </div>
                  );
                })()}

                {/* الوصف */}
                {detailOpp.description && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isRTL ? 'نبذة عن الفرصة' : 'About the opportunity'}</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{detailOpp.description}</p>
                  </div>
                )}

                {/* المراكز المطلوبة */}
                {detailOpp.targetPositions && detailOpp.targetPositions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{t('oppsExplorer.opportunityCard.positions') || 'المراكز المطلوبة'}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detailOpp.targetPositions.map(pos => (
                        <span key={pos} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold">{pos}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* التفاصيل الأساسية */}
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{isRTL ? 'التفاصيل' : 'Details'}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {detailOpp.applicationDeadline && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                        <p className="text-[10px] text-amber-500 font-bold mb-0.5">{t('oppsExplorer.opportunityCard.deadline') || 'آخر موعد للتقديم'}</p>
                        <p className="text-sm font-bold text-amber-800">{new Date(detailOpp.applicationDeadline).toLocaleDateString(locale === 'ar' ? 'ar-SA' : locale)}</p>
                      </div>
                    )}
                    {detailOpp.startDate && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-bold mb-0.5">{isRTL ? 'تاريخ البداية' : 'Start Date'}</p>
                        <p className="text-sm font-bold text-slate-700">{new Date(detailOpp.startDate).toLocaleDateString(locale === 'ar' ? 'ar-SA' : locale)}</p>
                      </div>
                    )}
                    {detailOpp.endDate && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-bold mb-0.5">{isRTL ? 'تاريخ الانتهاء' : 'End Date'}</p>
                        <p className="text-sm font-bold text-slate-700">{new Date(detailOpp.endDate).toLocaleDateString(locale === 'ar' ? 'ar-SA' : locale)}</p>
                      </div>
                    )}
                    {detailOpp.durationDays > 0 && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-bold mb-0.5">{isRTL ? 'المدة' : 'Duration'}</p>
                        <p className="text-sm font-bold text-slate-700">{detailOpp.durationDays} {isRTL ? 'يوم' : 'Days'}</p>
                      </div>
                    )}
                    {(detailOpp.country || detailOpp.city) && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-bold mb-0.5">{isRTL ? 'الموقع' : 'Location'}</p>
                        <p className="text-sm font-bold text-slate-700">{[detailOpp.city, detailOpp.country].filter(Boolean).join(' — ')}</p>
                      </div>
                    )}
                    {detailOpp.location && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-bold mb-0.5">{isRTL ? 'العنوان' : 'Address'}</p>
                        <p className="text-sm font-bold text-slate-700">{detailOpp.location}</p>
                      </div>
                    )}
                    {(detailOpp.ageMin || detailOpp.ageMax) && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-bold mb-0.5">{isRTL ? 'الفئة العمرية' : 'Age group'}</p>
                        <p className="text-sm font-bold text-slate-700">
                          {detailOpp.ageMin && detailOpp.ageMax ? `${detailOpp.ageMin} – ${detailOpp.ageMax} ${isRTL ? 'سنة' : 'Years'}`
                            : detailOpp.ageMin ? `${isRTL ? 'من' : 'From'} ${detailOpp.ageMin} ${isRTL ? 'سنة' : 'Years'}`
                            : `${isRTL ? 'حتى' : 'Up to'} ${detailOpp.ageMax} ${isRTL ? 'سنة' : 'Years'}`}
                        </p>
                      </div>
                    )}
                    {detailOpp.gender && detailOpp.gender !== 'both' && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-bold mb-0.5">{isRTL ? 'الجنس' : 'Gender'}</p>
                        <p className="text-sm font-bold text-slate-700">{detailOpp.gender === 'male' ? (isRTL ? 'ذكور' : 'Male') : (isRTL ? 'إناث' : 'Female')}</p>
                      </div>
                    )}
                    {detailOpp.nationality && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-bold mb-0.5">{isRTL ? 'الجنسية المطلوبة' : 'Required Nationality'}</p>
                        <p className="text-sm font-bold text-slate-700">{detailOpp.nationality}</p>
                      </div>
                    )}
                    {detailOpp.maxApplicants > 0 && (
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-400 font-bold mb-0.5">{isRTL ? 'أماكن متاحة' : 'Available slots'}</p>
                        <p className="text-sm font-bold text-slate-700">
                          {detailOpp.maxApplicants - (detailOpp.currentApplicants || 0)} {isRTL ? 'من' : 'of'} {detailOpp.maxApplicants}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* الرسوم والتعويض */}
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{isRTL ? 'الرسوم والتعويض' : 'Fees & Compensation'}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded-xl p-3 ${detailOpp.isPaid ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
                      <p className="text-[10px] font-bold mb-0.5 text-gray-500">{isRTL ? 'رسوم التسجيل' : 'Registration fee'}</p>
                      {detailOpp.isPaid && detailOpp.fee
                        ? <p className="text-sm font-bold text-red-700">{detailOpp.fee} {detailOpp.currency ?? ''}</p>
                        : <p className="text-sm font-bold text-green-700">{isRTL ? 'مجاني' : 'Free'}</p>
                      }
                    </div>
                    {detailOpp.compensation && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                        <p className="text-[10px] font-bold mb-0.5 text-gray-500">{isRTL ? 'التعويض / المكافأة' : 'Compensation'}</p>
                        <p className="text-sm font-bold text-blue-700">{detailOpp.compensation}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* المزايا المقدمة */}
                {(detailOpp.providesAccommodation || detailOpp.providesMeals || detailOpp.providesTransport) && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{isRTL ? 'المزايا المقدمة' : 'Benefits provided'}</p>
                    <div className="flex flex-wrap gap-2">
                      {detailOpp.providesAccommodation && <span className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-100 rounded-xl text-xs font-semibold">{isRTL ? 'إقامة مُوفّرة' : 'Accommodation'}</span>}
                      {detailOpp.providesMeals && <span className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-100 rounded-xl text-xs font-semibold">{isRTL ? 'وجبات مُوفّرة' : 'Meals'}</span>}
                      {detailOpp.providesTransport && <span className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-100 rounded-xl text-xs font-semibold">{isRTL ? 'مواصلات مُوفّرة' : 'Transport'}</span>}
                    </div>
                  </div>
                )}

                {/* المتطلبات */}
                {detailOpp.requirements && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{isRTL ? 'المتطلبات والشروط' : 'Requirements & Conditions'}</p>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800 leading-relaxed">
                      {detailOpp.requirements}
                    </div>
                  </div>
                )}

                {/* مشاركة */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/dashboard/opportunities?id=${detailOpp.id}`;
                      navigator.clipboard.writeText(link).then(() => toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied')).catch(() => {});
                    }}
                    className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" /> {isRTL ? 'نسخ الرابط' : 'Copy link'}
                  </button>
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/dashboard/opportunities?id=${detailOpp.id}`;
                      const text = `${detailOpp.title} — ${detailOpp.organizerName}\n${link}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="flex-1 py-2 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" /> {t('oppsExplorer.shareWhatsapp')}
                  </button>
                </div>
              </div>

              {/* Footer — أزرار الإجراءات */}
              <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                {!appliedIds.has(detailOpp.id) ? (
                  <button
                    onClick={() => { setDetailOpp(null); setApplyModalOpp(detailOpp); setApplyMessage(''); }}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Target className="w-4 h-4" /> {t('oppsExplorer.applyBtn')}
                  </button>
                ) : (
                  <div className="flex-1 py-3 bg-green-50 text-green-600 border border-green-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> {t('oppsExplorer.appliedLabel')}
                  </div>
                )}
                <SendMessageButton
                  user={user}
                  userData={userData}
                  getUserDisplayName={() => userData?.fullName || userData?.full_name || (isRTL ? 'لاعب' : 'Player')}
                  targetUserId={detailOpp.organizerId}
                  targetUserName={detailOpp.organizerName}
                  targetUserType={detailOpp.organizerType}
                  redirectToMessages={true}
                  buttonText={t('oppsExplorer.messageBtn')}
                  buttonVariant="outline"
                />
              </div>
            </div>
          </div>
        )}

        {/* Apply Modal */}
        {applyModalOpp && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setApplyModalOpp(null)}>
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h2 className="font-bold text-gray-900 text-base">{t('oppsExplorer.applyModalTitle')}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{t('oppsExplorer.applyModalSubtitle')}</p>
                </div>
                <button onClick={() => setApplyModalOpp(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

                {/* بيانات الفرصة */}
                <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t('oppsExplorer.formLabelOpportunity')}</p>
                  <h3 className="font-bold text-gray-900 text-sm leading-snug">{applyModalOpp.title}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-blue-700 font-semibold bg-blue-100 px-2 py-0.5 rounded-full">
                      {isRTL ? OPPORTUNITY_TYPES[applyModalOpp.opportunityType]?.label : OPPORTUNITY_TYPES[applyModalOpp.opportunityType]?.labelEn || applyModalOpp.opportunityType}
                    </span>
                    <span className="text-xs text-gray-500">{applyModalOpp.organizerName}</span>
                    {applyModalOpp.country && <span className="text-xs text-gray-400">{applyModalOpp.country}</span>}
                  </div>
                  {applyModalOpp.applicationDeadline && (
                    <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {isRTL ? 'آخر موعد: ' : 'Deadline: '}{new Date(applyModalOpp.applicationDeadline).toLocaleDateString(locale === 'ar' ? 'ar-SA' : locale)}
                    </p>
                  )}
                </div>

                {/* بيانات اللاعب التي ستُرسل */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('oppsExplorer.formLabelUserData')}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                      <span className="text-gray-400">{t('oppsExplorer.formLabelName')}:</span>
                      <span className="font-semibold truncate">{userData?.full_name || userData?.fullName || '—'}</span>
                    </div>
                    {(userData?.position || userData?.playing_position) && (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                        <span className="text-gray-400">{t('oppsExplorer.formLabelPosition')}:</span>
                        <span className="font-semibold">{userData.position || userData.playing_position}</span>
                      </div>
                    )}
                    {userData?.country && (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                        <span className="text-gray-400">{t('oppsExplorer.formLabelCountry')}:</span>
                        <span className="font-semibold">{userData.country}</span>
                      </div>
                    )}
                    {userData?.phone && (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
                        <span className="text-gray-400">{t('oppsExplorer.formLabelPhone')}:</span>
                        <span className="font-semibold">{userData.phone}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{t('oppsExplorer.formAutoAttachNote')}</p>
                </div>

                {/* رسالة / استفسار */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                    {t('oppsExplorer.formLabelMessage')}
                    <span className="text-gray-400 font-normal">{t('oppsExplorer.formOptional')}</span>
                  </label>
                  <textarea
                    value={applyMessage}
                    onChange={e => setApplyMessage(e.target.value)}
                    placeholder={t('oppsExplorer.formMessagePlaceholder')}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => setApplyModalOpp(null)}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  {t('oppsExplorer.formCancelBtn')}
                </button>
                <button
                  onClick={handleApply}
                  disabled={isApplying}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                  {t('oppsExplorer.formSubmitBtn')}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Apply Success Modal */}
        {applySuccessOpp && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-9 h-9 text-green-500" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">{t('oppsExplorer.successModalTitle')}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {isRTL ? 'تقدّمت على ' : 'Applied to '}<span className="font-semibold text-gray-700">{applySuccessOpp.title}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {isRTL ? `سيتم التواصل معك من قِبل ${applySuccessOpp.organizerName}` : `You will be contacted by ${applySuccessOpp.organizerName}`}
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <SendMessageButton
                  user={user}
                  userData={userData}
                  getUserDisplayName={() => userData?.fullName || userData?.full_name || (isRTL ? 'لاعب' : 'Player')}
                  targetUserId={applySuccessOpp.organizerId}
                  targetUserName={applySuccessOpp.organizerName}
                  targetUserType={applySuccessOpp.organizerType}
                  redirectToMessages={true}
                  buttonText={t('oppsExplorer.successModalChatBtn')}
                  buttonVariant="default"
                  className="w-full"
                />
                <button
                  onClick={() => setApplySuccessOpp(null)}
                  className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  {t('oppsExplorer.successModalCloseBtn')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Entities Section */}
        {activeSection === 'entities' && (<>
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
                  <p className="text-[11px] font-black text-slate-400 uppercase mr-1">{isRTL ? 'تصفية حسب النوع' : 'Filter by type'}</p>
                  <Select value={filters.type} onValueChange={(v) => { setFilters(prev => ({ ...prev, type: v as any })); setCurrentPage(1); }}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('oppsExplorer.entityTypes.all')}</SelectItem>
                      {Object.entries(ENTITY_TYPES).map(([k, v]) => <SelectItem key={`type-opt-${k}`} value={k}>{t(v.labelKey) || v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-slate-400 uppercase mr-1">{t('oppsExplorer.filterCountry')}</p>
                  <Select value={filters.country || 'all'} onValueChange={(v) => { setFilters(prev => ({ ...prev, country: v === 'all' ? '' : v })); setCurrentPage(1); }}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 font-bold">
                      <SelectValue placeholder={isRTL ? 'جميع الدول' : 'All countries'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRTL ? 'جميع الدول' : 'All countries'}</SelectItem>
                      {availableCountries.map(c => {
                        const val = c.trim() || 'unknown';
                        return <SelectItem key={`country-opt-${val}`} value={val}>{c}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-slate-400 uppercase mr-1">{isRTL ? 'الترتيب' : 'Sort by'}</p>
                  <Select value={filters.sortBy} onValueChange={(v) => setFilters(prev => ({ ...prev, sortBy: v as any }))}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">{t('oppsExplorer.sortBy.relevance')}</SelectItem>
                      <SelectItem value="followers">{t('oppsExplorer.sortBy.followers')}</SelectItem>
                      <SelectItem value="recent">{t('oppsExplorer.sortBy.recent')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-black text-slate-400 uppercase mr-1">{t('oppsExplorer.filterCity')}</p>
                  <Select value={filters.city || 'all'} onValueChange={(v) => { setFilters(prev => ({ ...prev, city: v === 'all' ? '' : v })); setCurrentPage(1); }}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50/50 border-slate-100 font-bold">
                      <SelectValue placeholder={isRTL ? 'جميع المدن' : 'All cities'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRTL ? 'جميع المدن' : 'All cities'}</SelectItem>
                      {availableCities.map(c => <SelectItem key={`city-opt-${c}`} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between h-12 px-4 rounded-2xl bg-slate-50/50 border border-slate-100 mt-5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-black text-slate-600">{t('oppsExplorer.verifiedOnly')}</span>
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
                    <Plus className="w-4 h-4 rotate-45" /> {isRTL ? 'إعادة ضبط كافة المرشحات' : 'Reset all filters'}
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
              <LayoutGrid className="w-5 h-5 text-blue-500" /> {isRTL ? 'النتائج' : 'Results'}
            </h2>
            <p className="text-xs font-bold text-slate-400">
              {isRTL ? (
                <>عرض <span className="text-blue-600">{Math.min(startIndex + 1, totalResults)}</span> - <span className="text-blue-600">{Math.min(startIndex + itemsPerPage, totalResults)}</span> من أصل {totalResults} نتيجة</>
              ) : (
                <>Showing <span className="text-blue-600">{Math.min(startIndex + 1, totalResults)}</span> - <span className="text-blue-600">{Math.min(startIndex + itemsPerPage, totalResults)}</span> of {totalResults} results</>
              )}
            </p>
          </div>
          <div className="flex gap-2 bg-white p-1 rounded-2xl border border-slate-100">
            {(['all', 'club', 'agent', 'academy', 'trainer'] as const).map(tOpt => (
              <button
                key={`tab-btn-${tOpt}`}
                onClick={() => { setFilters(prev => ({ ...prev, type: tOpt })); setCurrentPage(1); }}
                className={cn("px-4 py-2 rounded-xl text-[11px] font-black transition-all", filters.type === tOpt ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-slate-400 hover:text-slate-600")}
              >
                {tOpt === 'all' ? t('oppsExplorer.entityTypes.all') : t((ENTITY_TYPES as any)[tOpt].labelKey) || (ENTITY_TYPES as any)[tOpt].label}
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
              <h3 className="text-xl font-black text-slate-900">{t('oppsExplorer.noEntities')}</h3>
              <Button onClick={() => setFilters({ searchQuery: '', type: 'all', country: '', city: '', sortBy: 'relevance', verifiedOnly: false })} variant="link" className="text-blue-600 font-bold mt-2">{isRTL ? 'إعادة تعيين المرشحات' : 'Reset filters'}</Button>
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
                    currentUserId={user?.id}
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
                {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
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
                {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </Button>
            </div>

            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-white px-6 py-2 rounded-full border border-slate-100 shadow-sm">
              {isRTL ? `صفحة ${currentPage} من أصل ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
            </p>
          </div>
        )}
        </>)}
      </div>
    </div>
  );
}
