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
  startAfter,
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
  UserPlus, 
  UserCheck,
  Building,
  Briefcase,
  Eye,
  Mail,
  Phone,
  Globe,
  Award,
  Target,
  Trophy,
  CheckCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  User,
  Users,
  Plus,
  Check,
  Calendar
} from 'lucide-react';
import SendMessageButton from '@/components/messaging/SendMessageButton';
import { toast } from 'sonner';
// تم إلغاء LanguageSwitcher مؤقتاً

// أنواع البيانات
interface SearchEntity {
  id: string;
  name: string;
  type: 'club' | 'agent' | 'scout' | 'academy' | 'sponsor' | 'trainer';
  email: string;
  phone?: string;
  website?: string;
  profileImage?: string;
  coverImage?: string;
  location: {
    country: string;
    city: string;
    address?: string;
  };
  description: string;
  specialization?: string;
  verified: boolean;
  rating: number;
  reviewsCount: number;
  followersCount: number;
  connectionsCount: number;
  achievements?: string[];
  services?: string[];
  opportunities?: string[];
  established?: string;
  languages?: string[];
  createdAt: any;
  lastActive: any;
  isPremium: boolean;
  subscriptionType?: string;
  contactInfo: {
    email: string;
    phone: string;
    whatsapp?: string;
  };
  stats?: {
    successfulDeals: number;
    playersRepresented: number;
    activeContracts: number;
  };
  // حالة العلاقة مع المستخدم الحالي
  isFollowing?: boolean;
  isConnected?: boolean;
  hasPendingRequest?: boolean;
}

interface FilterOptions {
  searchQuery: string;
  type: 'all' | 'club' | 'agent' | 'scout' | 'academy' | 'sponsor' | 'trainer';
  country: string;
  opportunity: string;
  sortBy: 'relevance' | 'followers' | 'recent' | 'alphabetical';
}

export default function SearchPage() {
  const t = (key: string) => key;
  const locale = 'ar';
  const isRTL = true;
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const searchParams = useSearchParams();
  const getInitialPage = () => {
    const pageParam = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('page')
      : searchParams.get('page');
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    return isNaN(page) || page < 1 ? 1 : page;
  };
  const isUpdatingFromUser = useRef(false);
  const hasInitializedFilters = useRef(false);
  const filtersSignatureRef = useRef<string>('');
  const [userData, setUserData] = useState<any>(null);
  
  // حالة البحث والتصفية
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    type: 'all',
    country: '',
    opportunity: '',
    sortBy: 'relevance'
  });

  // حالة النتائج والتحميل
  const [entities, setEntities] = useState<SearchEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableOpportunities, setAvailableOpportunities] = useState<string[]>([]);
  
  // حالة التنقل بين الصفحات
  const [currentPage, setCurrentPage] = useState(() => getInitialPage());
  const [itemsPerPage] = useState(6); // 3 صفوف × 2 كروت
  const totalPages = useMemo(() => Math.max(1, Math.ceil(entities.length / itemsPerPage)), [entities.length, itemsPerPage]);
  const filtersSignature = useMemo(() => JSON.stringify(filters), [filters]);
  const updatePageInURL = useCallback((page: number) => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (page > 1) {
      params.set('page', page.toString());
    } else {
      params.delete('page');
    }
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;

    setTimeout(() => {
      isUpdatingFromUser.current = false;
    }, 100);

    router.replace(newUrl, { scroll: false });
  }, [router]);
  const handlePageChange = useCallback((page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    isUpdatingFromUser.current = true;
    setCurrentPage(nextPage);
    updatePageInURL(nextPage);
  }, [totalPages, updatePageInURL]);

  // حالة الواجهة
  const [showFilters, setShowFilters] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // تعريف أنواع الكيانات مع الترجمة
  const ENTITY_TYPES = {
    club: { label: 'الأندية', icon: Building, color: 'bg-blue-500' },
    agent: { label: 'الوكلاء', icon: Briefcase, color: 'bg-purple-500' },
    scout: { label: 'الكشافين', icon: Eye, color: 'bg-green-500' },
    academy: { label: 'الأكاديميات', icon: Trophy, color: 'bg-orange-500' },
    sponsor: { label: 'الرعاة', icon: Award, color: 'bg-red-500' },
    trainer: { label: 'المدربين', icon: User, color: 'bg-cyan-500' }
  };

  // جلب البيانات من Firestore
  const fetchEntities = useCallback(async (reset = false) => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // جلب البيانات الحقيقية من collections مختلفة
      const allEntities: SearchEntity[] = [];
      
      // جلب الأندية من clubs collection
      if (filters.type === 'all' || filters.type === 'club') {
        try {
          let clubsQuery = query(collection(db, 'clubs'));
          
          // تصفية حسب الدولة
          if (filters.country) {
            clubsQuery = query(clubsQuery, where('country', '==', filters.country));
          }
          
          // ترتيب حسب اسم النادي
          clubsQuery = query(clubsQuery, orderBy('name', 'asc'), limit(10));
          
          const clubsSnapshot = await getDocs(clubsQuery);
          
          clubsSnapshot.docs.forEach(doc => {
            const clubData = doc.data();
            
            // فحص البحث النصي
            if (filters.searchQuery) {
              const searchLower = filters.searchQuery.toLowerCase();
              const clubName = clubData.name || '';
              const clubDescription = clubData.description || '';
              const clubType = clubData.type || '';
              
              const matchesSearch = 
                clubName.toLowerCase().includes(searchLower) ||
                clubDescription.toLowerCase().includes(searchLower) ||
                clubType.toLowerCase().includes(searchLower);
              
              if (!matchesSearch) return;
            }
            
            // تحويل بيانات النادي إلى تنسيق SearchEntity
            const entity: SearchEntity = {
              id: doc.id,
               name: clubData.name || 'نادي رياضي',
              type: 'club',
              email: clubData.email || '',
              phone: clubData.phone || '',
              website: clubData.website || '',
              profileImage: clubData.logo || '/images/club-avatar.png',
              coverImage: clubData.coverImage || '/images/hero-1.jpg',
              location: {
                country: clubData.country || '',
                city: clubData.city || '',
                address: clubData.address || ''
              },
               description: clubData.description || 'نادي رياضي محترف',
               specialization: clubData.type || 'كرة القدم',
              verified: true, // جميع الأندية المسجلة محققة
              rating: 4.5, // تقييم افتراضي
              reviewsCount: clubData.reviewsCount ?? 0,
              followersCount: (Array.isArray(clubData.followers) ? clubData.followers.length : clubData.followersCount) ?? 1000,
              connectionsCount: clubData.stats?.contracts || 0,
              achievements: clubData.trophies?.map((t: any) => `${t.name} (${t.year})`) || [],
               services: ['تدريب اللاعبين', 'برامج الشباب', 'المنافسات الرسمية'],
              established: clubData.founded || '',
               languages: ['العربية'],
              createdAt: new Date(),
              lastActive: new Date(),
              isPremium: true,
              subscriptionType: 'premium',
              contactInfo: {
                email: clubData.email || '',
                phone: clubData.phone || '',
                whatsapp: clubData.phone || ''
              },
              stats: {
                successfulDeals: clubData.stats?.contracts || 0,
                playersRepresented: clubData.stats?.players || 0,
                activeContracts: clubData.stats?.contracts || 0
              },
              isFollowing: Array.isArray(clubData.followers) ? clubData.followers.includes(user.uid) : false,
              isConnected: false,
              hasPendingRequest: false,
              opportunities: Array.isArray(clubData.opportunities) ? clubData.opportunities : []
            };
            
            allEntities.push(entity);
          });
        } catch (error) {
          console.error('خطأ في جلب بيانات الأندية:', error);
        }
      }
      
      // جلب الوكلاء من agents collection
      if (filters.type === 'all' || filters.type === 'agent') {
        try {
          let agentsQuery = query(collection(db, 'agents'));
          
          // تطبيق مرشح الدولة حسب الجنسية
          if (filters.country) {
            agentsQuery = query(agentsQuery, where('nationality', '==', filters.country));
          }
          
          agentsQuery = query(agentsQuery, limit(10));
          const agentsSnapshot = await getDocs(agentsQuery);
          
          agentsSnapshot.docs.forEach(doc => {
            const agentData = doc.data();
            
            // فحص البحث النصي
            if (filters.searchQuery) {
              const searchLower = filters.searchQuery.toLowerCase();
              const agentFullName = agentData.full_name || '';
              const agentSpecialization = agentData.specialization || '';
              const agentCurrentLocation = agentData.current_location || '';
              const agentNationality = agentData.nationality || '';
              const agentNotableDeals = agentData.notable_deals || '';
              
              const matchesSearch = 
                agentFullName.toLowerCase().includes(searchLower) ||
                agentSpecialization.toLowerCase().includes(searchLower) ||
                agentCurrentLocation.toLowerCase().includes(searchLower) ||
                agentNationality.toLowerCase().includes(searchLower) ||
                agentNotableDeals.toLowerCase().includes(searchLower);
              
              if (!matchesSearch) return;
            }
            
            const entity: SearchEntity = {
              id: doc.id,
              name: agentData.full_name || 'dashboard.player.search.defaultNames.agent',
              type: 'agent',
              email: agentData.email || '',
              phone: agentData.phone || '',
              website: agentData.website || '',
              profileImage: agentData.profile_photo || '/images/agent-avatar.png',
              coverImage: agentData.coverImage || '/images/hero-1.jpg',
              location: {
                country: agentData.nationality || '',
                city: agentData.current_location?.split(' - ')[1] || agentData.current_location || '',
                address: agentData.office_address || ''
              },
              description: agentData.specialization || 'وكيل رياضي محترف',
              specialization: agentData.specialization || 'وكيل رياضي',
              verified: agentData.is_fifa_licensed || false,
              rating: 4.5,
              reviewsCount: agentData.reviewsCount ?? 0,
              followersCount: (Array.isArray(agentData.followers) ? agentData.followers.length : agentData.followersCount) ?? 500,
              connectionsCount: agentData.stats?.contracts || 0,
              achievements: agentData.is_fifa_licensed ? ['مرخص من الفيفا'] : [],
              services: ['تمثيل اللاعبين', 'تفاوض العقود'],
              established: agentData.established || '',
              languages: agentData.spoken_languages || ['العربية'],
              createdAt: new Date(),
              lastActive: new Date(),
              isPremium: true,
              subscriptionType: 'premium',
              contactInfo: {
                email: agentData.email || '',
                phone: agentData.phone || '',
                whatsapp: agentData.phone || ''
              },
              stats: {
                successfulDeals: agentData.stats?.contracts || 0,
                playersRepresented: agentData.stats?.players || 0,
                activeContracts: agentData.stats?.contracts || 0
              },
              isFollowing: Array.isArray(agentData.followers) ? agentData.followers.includes(user.uid) : false,
              isConnected: false,
              hasPendingRequest: false,
              opportunities: Array.isArray(agentData.opportunities) ? agentData.opportunities : []
            };
            
            allEntities.push(entity);
          });
        } catch (error) {
          console.error('خطأ في جلب بيانات الوكلاء:', error);
        }
      }

      // جلب الأكاديميات من academies collection
      if (filters.type === 'all' || filters.type === 'academy') {
        try {
          let academiesQuery = query(collection(db, 'academies'));
          
          if (filters.country) {
            academiesQuery = query(academiesQuery, where('country', '==', filters.country));
          }
          
          academiesQuery = query(academiesQuery, orderBy('name', 'asc'), limit(10));
          const academiesSnapshot = await getDocs(academiesQuery);
          
          academiesSnapshot.docs.forEach(doc => {
            const academyData = doc.data();
            
            // فحص البحث النصي
            if (filters.searchQuery) {
              const searchLower = filters.searchQuery.toLowerCase();
              const matchesSearch = 
                academyData.name?.toLowerCase().includes(searchLower) ||
                academyData.description?.toLowerCase().includes(searchLower) ||
                (Array.isArray(academyData.programs) && academyData.programs.some((p: string) => p.toLowerCase().includes(searchLower)));
              
              if (!matchesSearch) return;
            }
            
            const entity: SearchEntity = {
              id: doc.id,
              name: academyData.name || 'أكاديمية رياضية',
              type: 'academy',
              email: academyData.email || '',
              phone: academyData.phone || '',
              website: academyData.website || '',
              profileImage: academyData.logo || '/images/club-avatar.png',
              coverImage: academyData.coverImage || '/images/hero-1.jpg',
              location: {
                country: academyData.country || '',
                city: academyData.city || '',
                address: academyData.address || ''
              },
              description: academyData.description || 'أكاديمية تدريب متخصصة',
              specialization: Array.isArray(academyData.programs) ? academyData.programs.join(', ') : 'تدريب رياضي',
              verified: true,
              rating: 4.6,
              reviewsCount: academyData.reviewsCount ?? 0,
              followersCount: (Array.isArray(academyData.followers) ? academyData.followers.length : academyData.followersCount) ?? 300,
              connectionsCount: academyData.stats?.graduates || 0,
              achievements: ['معتمدة', 'برامج متقدمة'],
              services: ['تدريب اللاعبين', 'برامج متقدمة', 'تطوير المواهب'],
              established: academyData.established || '',
              languages: ['العربية'],
              createdAt: new Date(),
              lastActive: new Date(),
              isPremium: true,
              contactInfo: {
                email: academyData.email || '',
                phone: academyData.phone || '',
                whatsapp: academyData.phone || ''
              },
              stats: {
                successfulDeals: academyData.stats?.programs || 0,
                playersRepresented: academyData.stats?.students || 0,
                activeContracts: academyData.stats?.graduates || 0
              },
              isFollowing: Array.isArray(academyData.followers) ? academyData.followers.includes(user.uid) : false,
              isConnected: false,
              hasPendingRequest: false,
              opportunities: Array.isArray(academyData.opportunities) ? academyData.opportunities : []
            };
            
            allEntities.push(entity);
          });
        } catch (error) {
          console.error('خطأ في جلب بيانات الأكاديميات:', error);
        }
      }

      // جلب المدربين من trainers collection
      if (filters.type === 'all' || filters.type === 'trainer') {
        try {
          let trainersQuery = query(collection(db, 'trainers'));
          
          // تطبيق مرشح الدولة حسب الجنسية
          if (filters.country) {
            trainersQuery = query(trainersQuery, where('nationality', '==', filters.country));
          }
          
          trainersQuery = query(trainersQuery, limit(10));
          const trainersSnapshot = await getDocs(trainersQuery);
          
          trainersSnapshot.docs.forEach(doc => {
            const trainerData = doc.data();
            
            // فحص البحث النصي
            if (filters.searchQuery) {
              const searchLower = filters.searchQuery.toLowerCase();
              const matchesSearch = 
                trainerData.full_name?.toLowerCase().includes(searchLower) ||
                trainerData.specialization?.toLowerCase().includes(searchLower) ||
                trainerData.current_location?.toLowerCase().includes(searchLower) ||
                trainerData.nationality?.toLowerCase().includes(searchLower) ||
                trainerData.coaching_level?.toLowerCase().includes(searchLower) ||
                trainerData.description?.toLowerCase().includes(searchLower);
              
              if (!matchesSearch) return;
            }
            
            const entity: SearchEntity = {
              id: doc.id,
              name: trainerData.full_name || 'مدرب رياضي',
              type: 'trainer',
              email: trainerData.email || '',
              phone: trainerData.phone || '',
              website: '',
              profileImage: trainerData.profile_photo || '/images/user-avatar.svg',
              coverImage: trainerData.coverImage || '/images/hero-1.jpg',
              location: {
                country: trainerData.nationality || '',
                city: trainerData.current_location?.split(' - ')[1] || trainerData.current_location || '',
                address: ''
              },
              description: trainerData.specialization || 'مدرب رياضي محترف',
              specialization: trainerData.specialization || 'تدريب بدني',
              verified: trainerData.is_certified || false,
              rating: 4.4,
              reviewsCount: trainerData.reviewsCount ?? 0,
              followersCount: (Array.isArray(trainerData.followers) ? trainerData.followers.length : trainerData.followersCount) ?? 200,
              connectionsCount: trainerData.stats?.training_sessions || 0,
              achievements: trainerData.is_certified ? ['معتمد', 'خبرة متقدمة'] : ['محلي', 'خبرة متقدمة'],
              services: ['تدريب شخصي', 'برامج إعداد', 'استشارات رياضية'],
              established: trainerData.established || '',
              languages: trainerData.spoken_languages || ['العربية'],
              createdAt: new Date(),
              lastActive: new Date(),
              isPremium: true,
              contactInfo: {
                email: trainerData.email || '',
                phone: trainerData.phone || '',
                whatsapp: trainerData.phone || ''
              },
              stats: {
                successfulDeals: trainerData.stats?.training_sessions || 0,
                playersRepresented: trainerData.stats?.players || 0,
                activeContracts: trainerData.stats?.success_rate || 0
              },
              isFollowing: Array.isArray(trainerData.followers) ? trainerData.followers.includes(user.uid) : false,
              isConnected: false,
              hasPendingRequest: false,
              opportunities: Array.isArray(trainerData.opportunities) ? trainerData.opportunities : []
            };
            
            allEntities.push(entity);
          });
        } catch (error) {
          console.error('خطأ في جلب بيانات المدربين:', error);
        }
      }
      
      // إذا لم يتم العثور على نتائج من Firestore، استخدم البيانات الوهمية
      if (allEntities.length === 0) {
        console.log('لم يتم العثور على نتائج من Firestore، استخدام البيانات الوهمية');
        const mockEntities: SearchEntity[] = [
          {
            id: '1',
            name: 'النادي الأهلي',
            type: 'club',
            email: 'info@alahly.com',
            phone: '+20223456789',
            website: 'www.alahly.com',
            profileImage: '/images/club-avatar.png',
            coverImage: '/images/hero-1.jpg',
            location: { country: 'مصر', city: 'القاهرة' },
            description: 'أحد أكبر الأندية الرياضية في مصر والعالم العربي',
            verified: true,
            rating: 4.9,
            reviewsCount: 1200,
            followersCount: 5480000,
            connectionsCount: 1200,
            achievements: ['كأس الأمم الأفريقية', 'الدوري المصري'],
            createdAt: new Date(),
            lastActive: new Date(),
            isPremium: true,
            contactInfo: { email: 'info@alahly.com', phone: '+20223456789' },
            stats: { successfulDeals: 150, playersRepresented: 300, activeContracts: 45 },
            isFollowing: false,
            isConnected: false,
            hasPendingRequest: false,
            opportunities: []
          },
          {
            id: '2',
            name: 'وكالة النجوم الرياضية',
            type: 'agent',
            email: 'contact@stars-agency.com',
            phone: '+97145678901',
            website: 'www.stars-agency.com',
            profileImage: '/images/agent-avatar.png',
            coverImage: '/images/hero-1.jpg',
            location: { country: 'الإمارات', city: 'دبي' },
            description: 'وكالة تمثيل رياضي محترفة',
            specialization: 'تمثيل اللاعبين',
            verified: true,
            rating: 4.8,
            reviewsCount: 340,
            followersCount: 89000,
            connectionsCount: 450,
            achievements: ['مرخص من الفيفا'],
            services: ['تفاوض العقود', 'استشارات قانونية'],
            createdAt: new Date(),
            lastActive: new Date(),
            isPremium: true,
            contactInfo: { email: 'contact@stars-agency.com', phone: '+97145678901' },
            stats: { successfulDeals: 85, playersRepresented: 120, activeContracts: 35 },
            isFollowing: false,
            isConnected: false,
            hasPendingRequest: false,
            opportunities: []
          },
          {
            id: '3',
            name: 'أكاديمية فيصل الرياضية',
            type: 'academy',
            email: 'info@faisal-academy.com',
            phone: '+97123456789',
            website: 'www.faisal-academy.com',
            profileImage: '/images/club-avatar.png',
            coverImage: '/images/hero-1.jpg',
            location: { country: 'الإمارات', city: 'أبو ظبي' },
            description: 'أكاديمية تدريب متخصصة في تطوير المواهب',
            specialization: 'تدريب رياضي',
            verified: true,
            rating: 4.7,
            reviewsCount: 280,
            followersCount: 45000,
            connectionsCount: 320,
            achievements: ['أفضل أكاديمية', 'معتمدة'],
            services: ['برامج الشباب', 'تطوير المواهب', 'معسكرات التدريب'],
            createdAt: new Date(),
            lastActive: new Date(),
            isPremium: true,
            contactInfo: { email: 'info@faisal-academy.com', phone: '+97123456789' },
            stats: { successfulDeals: 65, playersRepresented: 200, activeContracts: 25 },
            isFollowing: false,
            isConnected: false,
            hasPendingRequest: false
          },
          {
            id: '4',
            name: 'أحمد خبير التدريب',
            type: 'trainer',
            email: 'ahmed.expert@email.com',
            phone: '+20345678901',
            website: '',
            profileImage: '/images/user-avatar.svg',
            coverImage: '/images/hero-1.jpg',
            location: { country: 'مصر', city: 'الإسكندرية' },
            description: 'مدرب رياضي محترف مع خبرة دولية',
            specialization: 'تدريب بدني',
            verified: true,
            rating: 4.4,
            reviewsCount: 59,
            followersCount: 1200,
            connectionsCount: 85,
            achievements: ['معتمد', 'شهادة دولية'],
            services: ['تدريب شخصي', 'برامج إعداد', 'استشارات رياضية'],
            createdAt: new Date(),
            lastActive: new Date(),
            isPremium: true,
            contactInfo: { email: 'ahmed.expert@email.com', phone: '+20345678901' },
            stats: { successfulDeals: 45, playersRepresented: 80, activeContracts: 15 },
            isFollowing: false,
            isConnected: false,
            hasPendingRequest: false
          },
          {
            id: '5',
            name: 'نادي الزمالك',
            type: 'club',
            email: 'info@zamalek.com',
            phone: '+20234567890',
            website: 'www.zamalek.com',
            profileImage: '/images/club-avatar.png',
            coverImage: '/images/hero-1.jpg',
            location: { country: 'مصر', city: 'القاهرة' },
            description: 'أحد أكبر الأندية الرياضية في مصر والعالم العربي',
            verified: true,
            rating: 4.8,
            reviewsCount: 980,
            followersCount: 3200000,
            connectionsCount: 950,
            achievements: ['كأس الأمم الأفريقية', 'الدوري المصري'],
            createdAt: new Date(),
            lastActive: new Date(),
            isPremium: true,
            contactInfo: { email: 'info@zamalek.com', phone: '+20234567890' },
            stats: { successfulDeals: 120, playersRepresented: 250, activeContracts: 40 },
            isFollowing: false,
            isConnected: false,
            hasPendingRequest: false
          }
        ];
        
        // تطبيق المرشحات على البيانات الوهمية
        let filteredMockEntities = mockEntities;
        
        if (filters.searchQuery) {
          const searchLower = filters.searchQuery.toLowerCase();
          filteredMockEntities = mockEntities.filter(entity => 
            entity.name.toLowerCase().includes(searchLower) ||
            entity.description.toLowerCase().includes(searchLower) ||
            entity.specialization?.toLowerCase().includes(searchLower)
          );
        }
        
        if (filters.type !== 'all') {
          filteredMockEntities = filteredMockEntities.filter(entity => entity.type === filters.type);
        }
        
        if (filters.country) {
          filteredMockEntities = filteredMockEntities.filter(entity => 
            entity.location.country.toLowerCase().includes(filters.country.toLowerCase())
          );
        }
        
        allEntities.push(...filteredMockEntities);
      }
      
      // تطبيق الفلاتر على النتائج
      let filteredEntities = allEntities.filter(entity => {
        // فلتر البحث النصي
        if (filters.searchQuery) {
          const searchLower = filters.searchQuery.toLowerCase();
          const matchesSearch = 
            entity.name.toLowerCase().includes(searchLower) ||
            entity.description.toLowerCase().includes(searchLower) ||
            entity.specialization?.toLowerCase().includes(searchLower);
          
          if (!matchesSearch) return false;
        }
        
        // فلتر الفرص
        if (filters.opportunity) {
          const opportunities = Array.isArray(entity.opportunities) ? entity.opportunities : [];
          const matchesOpportunity = opportunities.some(opportunity => 
            opportunity && opportunity.toLowerCase() === filters.opportunity.toLowerCase()
          );
          if (!matchesOpportunity) {
            return false;
          }
        }
        
        // فلتر الدول
        if (filters.country) {
          const country = entity.location?.country || '';
          if (!country.toLowerCase().includes(filters.country.toLowerCase())) {
            return false;
          }
        }
        
        // فلتر نوع الكيان
        if (filters.type !== 'all' && entity.type !== filters.type) {
          return false;
        }
        
        return true;
      });
      
      // ترتيب النتائج
      switch (filters.sortBy) {
        case 'followers':
          filteredEntities.sort((a, b) => b.followersCount - a.followersCount);
          break;
        case 'recent':
          filteredEntities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case 'alphabetical':
          filteredEntities.sort((a, b) => a.name.localeCompare(b.name));
          break;
        default: // relevance
          filteredEntities.sort((a, b) => a.name.localeCompare(b.name));
      }
      
      // استبعاد أي كيانات من نوع admin (وقائي)
      const safeEntities = filteredEntities.filter((e) => (e as any).type !== 'admin');

      const uniqueCountries = Array.from(
        new Set(
          safeEntities
            .map((entity) => entity.location?.country)
            .filter((country): country is string => Boolean(country))
        )
      ).sort((a, b) => a.localeCompare(b));

      const uniqueOpportunities = Array.from(
        new Set(
          safeEntities.flatMap((entity) =>
            Array.isArray(entity.opportunities) ? entity.opportunities : []
          )
        )
      ).filter((opportunity): opportunity is string => Boolean(opportunity));

      setAvailableCountries(uniqueCountries);
      setAvailableOpportunities(uniqueOpportunities);

      setEntities(safeEntities);
      setTotalResults(filteredEntities.length);
      
      setHasMore(false); // إيقاف التحميل الإضافي مؤقتاً
      
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
      // إنشاء بيانات وهمية للعرض التوضيحي في حالة الفشل
      const mockEntities: SearchEntity[] = [
        {
          id: '1',
          name: 'النادي الأهلي',
          type: 'club',
          email: 'info@alahly.com',
          phone: '+20223456789',
          website: 'www.alahly.com',
          profileImage: '/images/club-avatar.png',
          coverImage: '/images/hero-1.jpg',
          location: { country: 'مصر', city: 'القاهرة' },
          description: 'أحد أكبر الأندية الرياضية في مصر والعالم العربي',
          verified: true,
          rating: 4.9,
          reviewsCount: 1200,
          followersCount: 5480000,
          connectionsCount: 1200,
          achievements: ['كأس الأمم الأفريقية', 'الدوري المصري'],
          createdAt: new Date(),
          lastActive: new Date(),
          isPremium: true,
          contactInfo: { email: 'info@alahly.com', phone: '+20223456789' },
          stats: { successfulDeals: 150, playersRepresented: 300, activeContracts: 45 },
          isFollowing: false,
          isConnected: false,
          hasPendingRequest: false,
          opportunities: []
        },
        {
          id: '2',
          name: 'وكالة النجوم الرياضية',
          type: 'agent',
          email: 'contact@stars-agency.com',
          phone: '+97145678901',
          website: 'www.stars-agency.com',
          profileImage: '/images/agent-avatar.png',
          coverImage: '/images/hero-1.jpg',
          location: { country: 'الإمارات', city: 'دبي' },
          description: 'وكالة تمثيل رياضي محترفة',
          specialization: 'تمثيل اللاعبين',
          verified: true,
          rating: 4.8,
          reviewsCount: 340,
          followersCount: 89000,
          connectionsCount: 450,
          achievements: ['مرخص من الفيفا'],
          services: ['تفاوض العقود', 'استشارات قانونية'],
          createdAt: new Date(),
          lastActive: new Date(),
          isPremium: true,
          contactInfo: { email: 'contact@stars-agency.com', phone: '+97145678901' },
          stats: { successfulDeals: 85, playersRepresented: 120, activeContracts: 35 },
          isFollowing: false,
          isConnected: false,
          hasPendingRequest: false,
          opportunities: []
        },
        {
          id: '3',
          name: 'أكاديمية فيصل الرياضية',
          type: 'academy',
          email: 'info@faisal-academy.com',
          phone: '+97123456789',
          website: 'www.faisal-academy.com',
          profileImage: '/images/club-avatar.png',
          coverImage: '/images/hero-1.jpg',
          location: { country: 'الإمارات', city: 'أبو ظبي' },
          description: 'أكاديمية تدريب متخصصة في تطوير المواهب',
          specialization: 'تدريب رياضي',
          verified: true,
          rating: 4.7,
          reviewsCount: 280,
          followersCount: 45000,
          connectionsCount: 320,
          achievements: ['أفضل أكاديمية', 'معتمدة'],
          services: ['برامج الشباب', 'تطوير المواهب', 'معسكرات التدريب'],
          createdAt: new Date(),
          lastActive: new Date(),
          isPremium: true,
          contactInfo: { email: 'info@faisal-academy.com', phone: '+97123456789' },
          stats: { successfulDeals: 65, playersRepresented: 200, activeContracts: 25 },
          isFollowing: false,
          isConnected: false,
          hasPendingRequest: false,
          opportunities: []
        },
        {
          id: '4',
          name: 'أحمد خبير التدريب',
          type: 'trainer',
          email: 'ahmed.expert@email.com',
          phone: '+20345678901',
          website: '',
          profileImage: '/images/user-avatar.svg',
          coverImage: '/images/hero-1.jpg',
          location: { country: 'مصر', city: 'الإسكندرية' },
          description: 'مدرب رياضي محترف مع خبرة دولية',
          specialization: 'تدريب بدني',
          verified: true,
          rating: 4.4,
          reviewsCount: 59,
          followersCount: 1200,
          connectionsCount: 85,
          achievements: ['معتمد', 'شهادة دولية'],
          services: ['تدريب شخصي', 'برامج إعداد', 'استشارات رياضية'],
          createdAt: new Date(),
          lastActive: new Date(),
          isPremium: true,
          contactInfo: { email: 'ahmed.expert@email.com', phone: '+20345678901' },
          stats: { successfulDeals: 45, playersRepresented: 80, activeContracts: 15 },
          isFollowing: false,
          isConnected: false,
          hasPendingRequest: false,
          opportunities: []
        },
        {
          id: '5',
          name: 'نادي الزمالك',
          type: 'club',
          email: 'info@zamalek.com',
          phone: '+20234567890',
          website: 'www.zamalek.com',
          profileImage: '/images/club-avatar.png',
          coverImage: '/images/hero-1.jpg',
          location: { country: 'مصر', city: 'القاهرة' },
          description: 'أحد أكبر الأندية الرياضية في مصر والعالم العربي',
          verified: true,
          rating: 4.8,
          reviewsCount: 980,
          followersCount: 3200000,
          connectionsCount: 950,
          achievements: ['كأس الأمم الأفريقية', 'الدوري المصري'],
          createdAt: new Date(),
          lastActive: new Date(),
          isPremium: true,
          contactInfo: { email: 'info@zamalek.com', phone: '+20234567890' },
          stats: { successfulDeals: 120, playersRepresented: 250, activeContracts: 40 },
          isFollowing: false,
          isConnected: false,
          hasPendingRequest: false,
          opportunities: []
        }
      ];
      setEntities(mockEntities);
      setTotalResults(mockEntities.length);
      setAvailableCountries(
        Array.from(
          new Set(
            mockEntities
              .map((entity) => entity.location?.country)
              .filter((country): country is string => Boolean(country))
          )
        )
      );
      setAvailableOpportunities(
        Array.from(
          new Set(
            mockEntities.flatMap((entity) =>
              Array.isArray(entity.opportunities) ? entity.opportunities : []
            )
          )
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [user, filters]);

  // تأثير لجلب البيانات
  useEffect(() => {
    if (user) {
      fetchEntities(true);
    }
  }, [user, fetchEntities]);

  useEffect(() => {
    if (isUpdatingFromUser.current) {
      return;
    }

    const pageParam = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('page')
      : searchParams.get('page');
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const validPage = isNaN(page) || page < 1 ? 1 : page;
    const safePage = Math.min(validPage, totalPages || 1);

    if (safePage !== currentPage) {
      setCurrentPage(safePage);
    }
  }, [searchParams, totalPages, currentPage]);

  // تأثير لتشغيل البحث عند تغيير المرشحات
  useEffect(() => {
    if (user) {
      const timeoutId = setTimeout(() => {
        fetchEntities(true);
      }, 300); // تقليل التأخير لتحسين الاستجابة

      return () => clearTimeout(timeoutId);
    }
  }, [filters, user]);

  useEffect(() => {
    if (!hasInitializedFilters.current) {
      hasInitializedFilters.current = true;
      filtersSignatureRef.current = filtersSignature;
      return;
    }

    if (filtersSignatureRef.current === filtersSignature) {
      return;
    }

    filtersSignatureRef.current = filtersSignature;
    isUpdatingFromUser.current = true;
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    updatePageInURL(1);
  }, [filtersSignature, currentPage, updatePageInURL]);

  // معالج البحث المباشر
  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, searchQuery: value }));
  };

  // معالج تغيير المرشحات
  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // معالج إعادة تعيين المرشحات
  const handleResetFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      type: 'all',
      country: '',
      opportunity: '',
      sortBy: 'relevance'
    });
  }, []);

  // Fetch user data when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        // First get the user's basic info to determine account type
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          console.error('User document not found');
          return;
        }

        const basicUserData = userDoc.data();
        const accountType = basicUserData.accountType;

        // Get detailed user data from the appropriate collection
        let detailedUserDoc;
        switch (accountType) {
          case 'player':
            detailedUserDoc = await getDoc(doc(db, 'players', user.uid));
            break;
          case 'club':
            detailedUserDoc = await getDoc(doc(db, 'clubs', user.uid));
            break;
          case 'agent':
            detailedUserDoc = await getDoc(doc(db, 'agents', user.uid));
            break;
          case 'academy':
            detailedUserDoc = await getDoc(doc(db, 'academies', user.uid));
            break;
          case 'trainer':
            detailedUserDoc = await getDoc(doc(db, 'trainers', user.uid));
            break;
          case 'admin':
            detailedUserDoc = await getDoc(doc(db, 'admins', user.uid));
            break;
          default:
            console.error('Unknown account type:', accountType);
            return;
        }

        if (detailedUserDoc?.exists()) {
          // Combine basic and detailed user data
          setUserData({
            ...basicUserData,
            ...detailedUserDoc.data(),
            accountType // Ensure accountType is included
          });
        } else {
          // If no detailed doc exists, use basic user data
          setUserData(basicUserData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user]);

  // متابعة كيان
  const handleFollow = async (entityId: string) => {
    if (!user || actionLoading) return;
    
    setActionLoading(`follow-${entityId}`);
    
    // حفظ الحالة الأصلية
    let originalFollowingState: boolean;
    let newFollowingState: boolean;
    
    try {
      const entity = entities.find(e => e.id === entityId);
      if (!entity) throw new Error('لم يتم العثور على الكيان');

      // حفظ الحالة الأصلية
      originalFollowingState = entity.isFollowing;
      newFollowingState = !entity.isFollowing;

      // تحديث الحالة المحلية أولاً للحصول على استجابة فورية
      setEntities(prev => prev.map(e => 
        e.id === entityId 
          ? { 
              ...e, 
              isFollowing: newFollowingState
            }
          : e
      ));

      // تحديد مجموعة Firestore الصحيحة حسب نوع الكيان
      const collectionName =
        entity.type === 'club' ? 'clubs' :
        entity.type === 'agent' ? 'agents' :
        entity.type === 'academy' ? 'academies' :
        entity.type === 'trainer' ? 'trainers' : 'entities';

      const entityRef = doc(db, collectionName, entityId);

      // التحقق من وجود المستند أولاً
      const entityDoc = await getDoc(entityRef);

      if (entityDoc.exists()) {
        // المستند موجود، تحديث البيانات
        if (originalFollowingState) {
          // كان يتابع، الآن إلغاء المتابعة
        await updateDoc(entityRef, {
            followers: arrayRemove(user.uid)
        });
      } else {
          // لم يكن يتابع، الآن متابعة
        await updateDoc(entityRef, {
            followers: arrayUnion(user.uid)
        });
      }
      } else {
        // المستند غير موجود، إنشاء جديد
        const initialData = {
          id: entityId,
          followers: newFollowingState ? [user.uid] : [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await setDoc(entityRef, initialData);
      }
      
      // إظهار حالة النجاح
      setActionSuccess(`follow-${entityId}`);
      setTimeout(() => setActionSuccess(null), 2000);
      
      // إضافة تأثير بصري إضافي
      const button = document.querySelector(`[data-entity-id="${entityId}"]`) as HTMLElement;
      if (button) {
        button.style.transform = 'scale(1.05)';
        button.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
        setTimeout(() => {
          button.style.transform = 'scale(1)';
          button.style.boxShadow = '';
        }, 200);
      }
      
    } catch (error) {
      console.error('خطأ في المتابعة:', error);
      // إعادة الحالة المحلية في حالة الخطأ
      setEntities(prev => prev.map(e => 
        e.id === entityId 
          ? { 
              ...e, 
              isFollowing: originalFollowingState
            }
          : e
      ));
      toast.error('حدث خطأ في المتابعة');
    } finally {
      setActionLoading(null);
    }
  };

  // إرسال رسالة
  const handleMessage = async (entityId: string) => {
    if (!user || actionLoading) return;
    
    setActionLoading(`message-${entityId}`);
    try {
      // إضافة تأخير صغير لمحاكاة التحميل
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // إظهار حالة النجاح
      setActionSuccess(`message-${entityId}`);
      setTimeout(() => setActionSuccess(null), 2000);
      
      // إضافة تأثير بصري إضافي
      const button = document.querySelector(`[data-entity-id="${entityId}"]`) as HTMLElement;
      if (button) {
        button.style.transform = 'scale(1.05)';
        button.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
        setTimeout(() => {
          button.style.transform = 'scale(1)';
          button.style.boxShadow = '';
        }, 200);
      }
      
      // لا نقوم بالتوجيه التلقائي - المستخدم سيستخدم مودييل الرسالة
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // إرسال إشعار مشاهدة الملف الشخصي
  const sendProfileViewNotification = async (entityId: string, entityType: string) => {
    if (!user || !userData) return;
    
    // لا نرسل إشعار إذا كان المستخدم يشاهد ملفه الشخصي
    if (user.uid === entityId) {
      console.log('🚫 لا يتم إرسال إشعار - المستخدم يشاهد ملفه الشخصي');
      return;
    }

    try {
      console.log('📢 إرسال إشعار مشاهدة الملف الشخصي:', {
        profileOwnerId: entityId,
        viewerId: user.uid,
        viewerName: userData.full_name || userData.displayName || userData.name || 'مستخدم',
        viewerType: userData.accountType || 'player'
      });

      const response = await fetch('/api/notifications/smart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'profile_view',
          profileOwnerId: entityId,
          viewerId: user.uid,
          viewerName: userData.full_name || userData.displayName || userData.name || 'مستخدم',
          viewerType: userData.accountType || 'player'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ تم إرسال إشعار مشاهدة الملف بنجاح:', result);
      } else {
        console.error('❌ فشل في إرسال إشعار مشاهدة الملف:', response.status);
      }
    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار مشاهدة الملف:', error);
    }
  };

  // عرض الملف التفصيلي
  const handleViewProfile = async (entity: SearchEntity) => {
    if (!user) return;
    
    // إرسال إشعار مشاهدة الملف الشخصي
    if (user && userData) {
      try {
        const response = await fetch('/api/notifications/interaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'profile_view',
            profileOwnerId: entity.id,
            viewerId: user.uid,
            viewerName: userData.fullName || userData.name || 'مستخدم',
            viewerType: userData.accountType,
            viewerAccountType: userData.accountType,
            profileType: entity.type
          }),
        });

        if (response.ok) {
          console.log('✅ تم إرسال إشعار مشاهدة الملف الشخصي لـ:', entity.name);
        } else {
          console.error('❌ خطأ في إرسال إشعار مشاهدة الملف الشخصي');
        }
      } catch (error) {
        console.error('❌ خطأ في إرسال الإشعار:', error);
      }
    }
    
    // توجيه إلى صفحة عرض الملف الشخصي للكيان
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const returnUrl = params.toString() ? `?${params.toString()}` : '';
      const fullReturnPath = `${window.location.pathname}${returnUrl}`;
      router.push(`/dashboard/player/search/profile?type=${entity.type}&id=${entity.id}&returnPath=${encodeURIComponent(fullReturnPath)}`);
    } else {
      router.push(`/dashboard/player/search/profile?type=${entity.type}&id=${entity.id}`);
    }
  };

  // تنسيق الأرقام
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // مكون البحث المتقدم
  const searchFilters = useMemo(() => (
    <Card className="p-4 md:p-6 mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">نوع الكيان</label>
          <Select
            value={filters.type}
            onValueChange={(value) => setFilters(prev => ({ ...prev, type: value as any }))}
          >
            <SelectTrigger className="w-full border-gray-300 bg-white">
              <SelectValue placeholder="اختر نوع الكيان" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              {Object.entries(ENTITY_TYPES).map(([key, value]) => (
                <SelectItem key={key} value={key}>{value.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">الدولة</label>
          <Select
            value={filters.country || "all"}
            onValueChange={(value) => setFilters(prev => ({ ...prev, country: value === "all" ? "" : value }))}
          >
            <SelectTrigger className="w-full border-gray-300 bg-white">
              <SelectValue placeholder="جميع الدول" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الدول</SelectItem>
              {availableCountries.map((country) => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {availableCountries.length === 0 && (
            <p className="mt-2 text-xs text-gray-500">سيتم تحديث قائمة الدول تلقائياً بعد توفر بيانات.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">الفرص</label>
          {availableOpportunities.length > 0 ? (
            <Select
              value={filters.opportunity || "all"}
              onValueChange={(value) => setFilters(prev => ({ ...prev, opportunity: value === "all" ? "" : value }))}
            >
              <SelectTrigger className="w-full border-gray-300 bg-white">
                <SelectValue placeholder="جميع الفرص" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفرص</SelectItem>
                {availableOpportunities.map((opportunity) => (
                  <SelectItem key={opportunity} value={opportunity}>{opportunity}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 bg-white">
              لا توجد فرص مضافة حالياً، سيتم إتاحتها من قبل الإدارة قريباً.
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 items-center">
        <div className="text-sm text-gray-600">
          اختر نوع الكيان، الدولة، أو الفرص المتاحة لتصفية النتائج.
        </div>
        <Button variant="outline" onClick={handleResetFilters} className="ml-auto flex items-center gap-2">
          <Filter className="w-4 h-4" />
          إعادة تعيين
        </Button>
      </div>
    </Card>
  ), [filters, availableCountries, availableOpportunities, handleResetFilters]);

  // مكون عرض الكيان
  const EntityCard = ({ entity }: { entity: SearchEntity }) => {
    const entityType = ENTITY_TYPES[entity.type];
    const EntityIcon = entityType.icon;

    return (
      <Card className="group hover:shadow-xl transition-all duration-500 ease-out overflow-hidden h-full flex flex-col min-h-[420px] md:min-h-[500px] border border-gray-200 hover:border-blue-300">
        {/* الصورة الغلاف */}
        {entity.coverImage && (
          <div className="h-32 md:h-40 bg-gradient-to-r from-blue-400 to-purple-500 relative overflow-hidden">
            <img 
              src={entity.coverImage} 
              alt={entity.name}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-10 transition-opacity duration-500"></div>
          </div>
        )}

        <div className="p-4 md:p-6 flex-1 flex flex-col bg-white group-hover:bg-gray-50 transition-colors duration-500">
                      {/* الرأس */}
          <div className="flex items-start gap-3 md:gap-4 mb-4 md:mb-6">
            {/* الصورة الشخصية */}
            <div className="relative flex-shrink-0">
              {entity.profileImage ? (
                <img 
                  src={entity.profileImage} 
                  alt={entity.name}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-4 border-white shadow-lg transition-shadow duration-500 group-hover:shadow-xl"
                />
              ) : (
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full ${entityType.color} flex items-center justify-center shadow-lg transition-shadow duration-500 group-hover:shadow-xl`}>
                  <EntityIcon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
              )}
              
              {/* شارات الحالة */}
              <div className="absolute -top-2 -right-2 flex flex-col gap-1">
                {entity.verified && (
                  <div className="bg-blue-500 rounded-full p-1.5 transition-colors duration-500 group-hover:bg-blue-600">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}
                {entity.isPremium && (
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-1.5 transition-all duration-500 group-hover:from-yellow-500 group-hover:to-orange-600">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* معلومات أساسية */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-base md:text-lg text-gray-900 transition-colors duration-500 group-hover:text-blue-600 break-words">{entity.name}</h3>
                <Badge variant="secondary" className={`${entityType.color} text-white flex-shrink-0`}>
                  {entityType.label}
                </Badge>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-600 mb-2 md:mb-3">
                <div className="flex items-center gap-1 transition-colors duration-500 group-hover:text-blue-600">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{entity.location.city}, {entity.location.country}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 transition-colors duration-500 group-hover:text-yellow-600">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span>{entity.rating.toFixed(1)} ({entity.reviewsCount})</span>
                </div>
              </div>

              {entity.specialization && (
                <div className="flex items-center gap-1 text-xs md:text-sm text-gray-600 mb-2 transition-colors duration-500 group-hover:text-purple-600">
                  <Target className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{entity.specialization}</span>
                </div>
              )}

              {/* معلومات إضافية */}
              {entity.established && (
                <div className="flex items-center gap-1 text-xs md:text-sm text-gray-500 transition-colors duration-500 group-hover:text-green-600">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>تأسس في: {entity.established}</span>
                </div>
              )}
            </div>
          </div>

          {/* الوصف */}
          <div className="mb-4 md:mb-6 flex-1">
            <p className="text-gray-600 text-xs md:text-sm leading-relaxed line-clamp-3 transition-colors duration-500 group-hover:text-gray-700">{entity.description}</p>
          </div>

          {/* الخدمات */}
          {entity.services && entity.services.length > 0 && (
            <div className="mb-3 md:mb-4">
              <h4 className="font-semibold text-xs md:text-sm text-gray-700 mb-2 transition-colors duration-500 group-hover:text-gray-800">الخدمات المقدمة</h4>
              <div className="flex flex-wrap gap-1.5">
                              {entity.services.slice(0, 3).map((service, index) => {
                // تحويل مفاتيح الترجمة إلى نصوص عربية
                const serviceText = service.includes('dashboard.player.search.services.') 
                  ? service.replace('dashboard.player.search.services.', '')
                    .replace('playerTraining', 'تدريب اللاعبين')
                    .replace('youthPrograms', 'برامج الشباب')
                    .replace('officialCompetitions', 'المنافسات الرسمية')
                    .replace('playerRepresentation', 'تمثيل اللاعبين')
                    .replace('contractNegotiation', 'تفاوض العقود')
                    .replace('advancedPrograms', 'البرامج المتقدمة')
                    .replace('talentDevelopment', 'تطوير المواهب')
                    .replace('personalTraining', 'التدريب الشخصي')
                    .replace('preparationPrograms', 'برامج الإعداد')
                    .replace('sportsConsultations', 'الاستشارات الرياضية')
                    .replace('legalConsultation', 'الاستشارات القانونية')
                    .replace('trainingCamps', 'معسكرات التدريب')
                  : service;
                
                return (
                    <Badge key={index} variant="outline" className="text-[10px] md:text-xs">
                    {serviceText}
                  </Badge>
                );
              })}
                {entity.services.length > 3 && (
                  <Badge variant="outline" className="text-[10px] md:text-xs">
                    +{entity.services.length - 3} المزيد
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* الأزرار */}
          <div className="flex flex-col gap-2.5 md:gap-3 mt-auto">
            <Button
              onClick={() => handleViewProfile(entity)}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 transition-all duration-500 ease-out shadow-md hover:shadow-lg"
              disabled={actionLoading === entity.id}
            >
              {actionLoading === entity.id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              عرض الملف الشخصي
            </Button>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFollow(entity.id)}
                disabled={actionLoading === `follow-${entity.id}`}
                data-entity-id={entity.id}
                className={`w-full sm:flex-1 border-0 transition-all duration-500 ease-out shadow-md hover:shadow-lg ${
                  actionLoading === `follow-${entity.id}`
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 animate-pulse text-white'
                    : actionSuccess === `follow-${entity.id}`
                    ? 'bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 animate-pulse text-white'
                    : entity.isFollowing
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                    : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                }`}
              >
                {actionLoading === `follow-${entity.id}` ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    جاري المعالجة...
                  </>
                ) : actionSuccess === `follow-${entity.id}` ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {entity.isFollowing ? 'متابع' : 'متابعة'}
                  </>
                ) : entity.isFollowing ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    متابع
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    متابعة
                  </>
                )}
              </Button>
              
              <SendMessageButton
                user={user}
                userData={userData}
                getUserDisplayName={() => userData?.full_name || userData?.displayName || userData?.name || 'مستخدم'}
                targetUserId={entity.id}
                targetUserName={entity.name}
                targetUserType={entity.type}
                organizationName={entity?.specialization}
                buttonText={'رسالة'}
                buttonVariant="outline"
                buttonSize="sm"
                className={`w-full sm:flex-1 border-0 transition-all duration-500 ease-out shadow-md hover:shadow-lg ${
                  actionLoading === `message-${entity.id}`
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 animate-pulse text-white'
                    : actionSuccess === `message-${entity.id}`
                    ? 'bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 animate-pulse text-white'
                    : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white'
                }`}
                data-entity-id={entity.id}
              />
            </div>
          </div>
        </div>
      </Card>
    );
  };

  // التحقق من تسجيل الدخول
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full px-6 py-8">
        {/* العنوان والبحث */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <div></div>
                            {/* تم إلغاء مبدل اللغة مؤقتاً */}
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            البحث عن الفرص والأندية والأكاديميات
          </h1>
          <p className="text-gray-600 text-lg mb-8">
            اكتشف أفضل الفرص للانضمام للأندية والأكاديميات والعمل مع الوكلاء المحترفين
          </p>

          {/* شريط البحث */}
          <div className="max-w-3xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="البحث عن أندية، أكاديميات، وكلاء، مدربين..."
                value={filters.searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 pr-4 py-3 text-lg border-2 border-gray-200 focus:border-blue-500 rounded-xl shadow-lg"
              />
            </div>
          </div>

          {/* أزرار المرشحات السريعة */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <Button
              variant={filters.type === 'all' ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange({ type: 'all' })}
              className={`rounded-full ${filters.type === 'all' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              جميع الأنواع
            </Button>
            {Object.entries(ENTITY_TYPES).map(([key, value]) => (
              <Button
                key={key}
                variant={filters.type === key ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange({ type: key as any })}
                className={`rounded-full ${filters.type === key ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {value.label}
              </Button>
            ))}
          </div>
        </div>

        {/* أزرار التحكم */}
        <div className="flex flex-wrap gap-4 justify-between items-center mb-8">
          <div className="flex gap-2">
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 transition-all duration-300 ${
                showFilters 
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg' 
                  : 'bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 text-purple-700 border-purple-300 hover:border-purple-400'
              }`}
            >
              <Filter className="w-4 h-4" />
              المرشحات المتقدمة
            </Button>
          </div>

          {/* عدد النتائج */}
          <div className="text-sm text-gray-600">
            {totalResults > 0 && `تم العثور على ${totalResults} نتيجة`}
          </div>
        </div>

        {/* المرشحات المتقدمة */}
        {showFilters && searchFilters}

        {/* النتائج */}
        {isLoading && entities.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(10)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 rounded mb-2"></div>
                      <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                    </div>
                  </div>
                  <div className="h-3 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-5/6"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : entities.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <Search size={64} className="text-gray-300" />
                          <h3 className="text-2xl font-bold text-gray-900">لم يتم العثور على نتائج</h3>
              <p className="text-gray-500 max-w-md">
              جرب تغيير معايير البحث أو استخدام كلمات مفتاحية مختلفة
              </p>
              <Button
                onClick={handleResetFilters}
                className="mt-4"
              >
              إعادة تعيين المرشحات
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 w-full max-w-[1100px] mx-auto">
              {entities
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((entity, index) => (
                <EntityCard key={`${entity.id}-${index}`} entity={entity} />
              ))}
            </div>

            {/* التنقل بين الصفحات */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                >
                  السابق
                </Button>
                
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Button
                      key={i + 1}
                      variant={currentPage === i + 1 ? "default" : "outline"}
                      onClick={() => handlePageChange(i + 1)}
                      className={`w-10 h-10 p-0 ${
                        currentPage === i + 1 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                      }`}
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                >
                  التالي
                </Button>
              </div>
            )}

            {/* تحميل المزيد */}
            {hasMore && (
              <div className="text-center mt-8">
                <Button
                  onClick={() => fetchEntities(false)}
                  disabled={isLoading}
                  className="px-8 py-3"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      جاري التحميل...
                    </>
                  ) : (
                    <>
                      تحميل المزيد
                      <ArrowRight className="w-4 h-4 mr-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 
