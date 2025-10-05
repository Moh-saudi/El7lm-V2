'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Clock, 
  Flag, 
  CheckCircle, 
  Target, 
  Minimize2, 
  Maximize2,
  Eye,
  User,
  MapPin,
  Sword,
  Trophy,
  Users
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit, doc, getDoc, where, startAfter } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/firebase/auth-provider';
import SendMessageButton from '@/components/messaging/SendMessageButton';
import { ensurePlayerProfileData } from '@/lib/utils/player-data-migration';
import { supabase, STORAGE_BUCKETS } from '@/lib/supabase/config';

// Simple debounce hook - محسن
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

interface Player {
  id: string;
  full_name?: string;
  name?: string;
  displayName?: string;
  primary_position?: string;
  position?: string;
  nationality?: string;
  current_club?: string;
  club_name?: string;
  country?: string;
  city?: string;
  profile_image?: string;
  profile_image_url?: string;
  avatar?: string;
  accountType?: string;
  club_id?: string;
  clubId?: string;
  academy_id?: string;
  academyId?: string;
  trainer_id?: string;
  trainerId?: string;
  agent_id?: string;
  agentId?: string;
  convertedToAccount?: boolean;
  firebaseUid?: string;
  organizationInfo?: string;
  age?: number;
  dependency?: string;
  status?: string;
  skill_level?: string;
  objectives?: string[];
  isDeleted?: boolean;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  playersPerPage: number;
  totalPlayers: number;
  currentPagePlayers: number;
  onPlayersPerPageChange: (playersPerPage: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  playersPerPage, 
  totalPlayers, 
  currentPagePlayers,
  onPlayersPerPageChange 
}) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push('...');
        }
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>عرض</span>
        <Select value={playersPerPage.toString()} onValueChange={(value) => onPlayersPerPageChange(parseInt(value))}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">6</SelectItem>
            <SelectItem value="12">12</SelectItem>
            <SelectItem value="24">24</SelectItem>
            <SelectItem value="48">48</SelectItem>
          </SelectContent>
        </Select>
        <span>لاعب في الصفحة</span>
      </div>
      
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>
          عرض {((currentPage - 1) * playersPerPage) + 1} إلى {Math.min(currentPage * playersPerPage, totalPlayers)} من {totalPlayers} لاعب
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          السابق
        </Button>
        
        {getPageNumbers().map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="px-2 py-1 text-gray-500">...</span>
            ) : (
              <Button
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page as number)}
                className="min-w-[40px]"
              >
                {page}
              </Button>
            )}
          </React.Fragment>
        ))}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          التالي
        </Button>
      </div>
    </div>
  );
};

interface PlayersSearchPageProps {
  accountType?: string;
}

export default function PlayersSearchPageUltraOptimized({ accountType }: PlayersSearchPageProps) {
  const { user } = useAuth();
  const router = useRouter();
  
  // State management - محسن
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [playersPerPage, setPlayersPerPage] = useState(12);
  
  // Filters - محسن
  const [filterPosition, setFilterPosition] = useState('all');
  const [filterNationality, setFilterNationality] = useState('all');
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterAccountType, setFilterAccountType] = useState('all');
  const [filterAge, setFilterAge] = useState('all');
  const [filterDependency, setFilterDependency] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSkillLevel, setFilterSkillLevel] = useState('all');
  const [filterObjective, setFilterObjective] = useState('all');
  
  // UI State
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Image cache to avoid repeated Supabase calls
  const [imageCache, setImageCache] = useState<Map<string, string | null>>(new Map());

  // Memoized callbacks - محسن
  const handlePlayersPerPageChange = useCallback((newPlayersPerPage: number) => {
    setPlayersPerPage(newPlayersPerPage);
    setCurrentPage(1);
  }, []);

  const setupCurrentUserInfo = useCallback(() => {
    if (!user?.uid) return;
    
    // Basic user info setup without excessive logging
  }, [user?.uid]);

  const getPlayerAccountType = useCallback((player: any) => {
    if (player.trainer_id || player.trainerId) return 'trainer';
    if (player.club_id || player.clubId) return 'club';
    if (player.agent_id || player.agentId) return 'agent';
    if (player.academy_id || player.academyId) return 'academy';
    return 'independent';
  }, []);

  // ULTRA OPTIMIZED: Check only the most likely bucket first
  const checkSupabaseImageUltraOptimized = useCallback(async (playerId: string, player?: any) => {
    // Check cache first
    if (imageCache.has(playerId)) {
      return imageCache.get(playerId);
    }

    try {
      const accountType = player ? getPlayerAccountType(player) : 'independent';
      
      // Only check the most likely bucket first
      const primaryBucket = accountType === 'trainer' ? 'playertrainer' : 
                           accountType === 'club' ? 'playerclub' : 
                           accountType === 'agent' ? 'playeragent' : 
                           accountType === 'academy' ? 'playeracademy' : 'avatars';
      
      const extensions = ['jpg', 'jpeg', 'png', 'webp'];
      
      // Try primary bucket first
      for (const ext of extensions) {
        const fileName = `${playerId}.${ext}`;
        try {
          const { data } = await supabase.storage
            .from(primaryBucket)
            .getPublicUrl(fileName);
          
          if (data?.publicUrl) {
            // Cache the result directly without HEAD request check
            setImageCache(prev => new Map(prev).set(playerId, data.publicUrl));
            return data.publicUrl;
          }
        } catch (error) {
          continue;
        }
      }
      
      // If not found in primary bucket, try avatars as fallback
      if (primaryBucket !== 'avatars') {
        for (const ext of extensions) {
          const fileName = `${playerId}.${ext}`;
          try {
            const { data } = await supabase.storage
              .from('avatars')
              .getPublicUrl(fileName);
            
            if (data?.publicUrl) {
              // Cache the result directly without HEAD request check
              setImageCache(prev => new Map(prev).set(playerId, data.publicUrl));
              return data.publicUrl;
            }
          } catch (error) {
            continue;
          }
        }
      }
      
      // Cache null result to avoid repeated checks
      setImageCache(prev => new Map(prev).set(playerId, null));
      return null;
    } catch (error) {
      // Cache null result
      setImageCache(prev => new Map(prev).set(playerId, null));
      return null;
    }
  }, [getPlayerAccountType, imageCache]);

  // ULTRA OPTIMIZED: Get player image with minimal Supabase calls
  const getPlayerImageUltraOptimized = useCallback(async (player: any) => {
    if (!player) return null;

    // Check existing image fields first (no Supabase calls needed)
    const imageFields = [
      player.profile_image_url,
      player.profile_image,
      player.avatar,
      player.photoURL,
      player.profilePicture,
      player.image,
      player.photo,
      player.picture,
      player.profile_picture,
      player.profilePhoto
    ];

    for (const field of imageFields) {
      if (field && typeof field === 'string' && field.trim()) {
        return field;
      }
      if (field && typeof field === 'object' && field.url) {
        return field.url;
      }
    }

    // Only check Supabase if no existing image found
    const supabaseImageUrl = await checkSupabaseImageUltraOptimized(player.id, player);
    return supabaseImageUrl;
  }, [checkSupabaseImageUltraOptimized]);

  // ULTRA OPTIMIZED: Load players with minimal Supabase calls
  const loadPlayersUltraOptimized = useCallback(async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      const allPlayers: Player[] = [];
      const seenIds = new Set<string>();

      // Load dependent players
      const dependentPlayersSnapshot = await getDocs(collection(db, 'players'));
      const dependentPlayers: Player[] = [];
      
      dependentPlayersSnapshot.forEach((doc) => {
        const playerData = { id: doc.id, ...doc.data() } as Player;
        if (!playerData.isDeleted && !seenIds.has(playerData.id)) {
          dependentPlayers.push(playerData);
          seenIds.add(playerData.id);
        }
      });

      // Load independent players from users collection
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersIndependentPlayers: Player[] = [];
      
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.accountType === 'player' && !userData.isDeleted && !seenIds.has(doc.id)) {
          usersIndependentPlayers.push({
            id: doc.id,
            ...userData,
            accountType: 'independent'
          } as Player);
          seenIds.add(doc.id);
        }
      });

      // Combine and deduplicate
      const finalPlayers = [...dependentPlayers, ...usersIndependentPlayers];
      
      // ULTRA OPTIMIZATION: Process images in smaller batches to avoid overwhelming Supabase
      const BATCH_SIZE = 5; // Process only 5 players at a time
      const playersWithImages: Player[] = [];
      
      for (let i = 0; i < finalPlayers.length; i += BATCH_SIZE) {
        const batch = finalPlayers.slice(i, i + BATCH_SIZE);
        
        const batchWithImages = await Promise.all(
          batch.map(async (player) => {
            const imageUrl = await getPlayerImageUltraOptimized(player);
            return { ...player, profile_image_url: imageUrl };
          })
        );
        
        playersWithImages.push(...batchWithImages);
        
        // Small delay between batches to avoid overwhelming Supabase
        if (i + BATCH_SIZE < finalPlayers.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setPlayers(playersWithImages);
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, getPlayerImageUltraOptimized]);

  // Load data on mount
  useEffect(() => {
    setupCurrentUserInfo();
    loadPlayersUltraOptimized();
  }, [setupCurrentUserInfo, loadPlayersUltraOptimized]);

  // Optimized filtering - محسن بدون console logs
  const filteredPlayers = useMemo(() => {
    const hasFilters = debouncedSearchTerm || 
      filterPosition !== 'all' || 
      filterNationality !== 'all' || 
      filterCountry !== 'all' || 
      filterAccountType !== 'all' || 
      filterAge !== 'all' || 
      filterDependency !== 'all' || 
      filterStatus !== 'all' || 
      filterSkillLevel !== 'all' || 
      filterObjective !== 'all';
    
    if (!hasFilters) {
      return players;
    }
    
    return players.filter(player => {
      // Search filter
      if (debouncedSearchTerm) {
        const searchTerm = debouncedSearchTerm.toLowerCase();
        const searchFields = [
          player.full_name,
          player.name,
          player.displayName,
          player.primary_position,
          player.position,
          player.nationality,
          player.current_club,
          player.club_name,
          player.country,
          player.city
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchFields.includes(searchTerm)) {
          return false;
        }
      }
      
      // Position filter
      if (filterPosition !== 'all' && 
          player.primary_position !== filterPosition && 
          player.position !== filterPosition) {
        return false;
      }
      
      // Nationality filter
      if (filterNationality !== 'all' && player.nationality !== filterNationality) {
        return false;
      }
      
      // Country filter
      if (filterCountry !== 'all' && player.country !== filterCountry) {
        return false;
      }
      
      // Account type filter
      if (filterAccountType !== 'all') {
        const playerAccountType = getPlayerAccountType(player);
        if (playerAccountType !== filterAccountType) {
          return false;
        }
      }
      
      // Age filter
      if (filterAge !== 'all' && player.age) {
        const age = player.age;
        if (filterAge === 'under-18' && age >= 18) return false;
        if (filterAge === '18-25' && (age < 18 || age > 25)) return false;
        if (filterAge === '26-35' && (age < 26 || age > 35)) return false;
        if (filterAge === 'over-35' && age <= 35) return false;
      }
      
      // Dependency filter
      if (filterDependency !== 'all') {
        const playerAccountType = getPlayerAccountType(player);
        if (filterDependency === 'independent' && playerAccountType !== 'independent') return false;
        if (filterDependency === 'dependent' && playerAccountType === 'independent') return false;
      }
      
      // Status filter
      if (filterStatus !== 'all' && player.status !== filterStatus) {
        return false;
      }
      
      // Skill level filter
      if (filterSkillLevel !== 'all' && player.skill_level !== filterSkillLevel) {
        return false;
      }
      
      // Objective filter
      if (filterObjective !== 'all' && player.objectives && !player.objectives.includes(filterObjective)) {
        return false;
      }
      
      return true;
    });
  }, [players, debouncedSearchTerm, filterPosition, filterNationality, filterCountry, 
      filterAccountType, filterAge, filterDependency, filterStatus, filterSkillLevel, filterObjective, getPlayerAccountType]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterPosition, filterNationality, filterCountry, 
      filterAccountType, filterAge, filterDependency, filterStatus, filterSkillLevel, filterObjective]);

  // Pagination
  const totalPages = Math.ceil(filteredPlayers.length / playersPerPage);
  const startIndex = (currentPage - 1) * playersPerPage;
  const endIndex = startIndex + playersPerPage;
  const pagedPlayers = filteredPlayers.slice(startIndex, endIndex);

  // Memoized utility functions
  const getPositionColor = useCallback((position: string) => {
    const colors: { [key: string]: string } = {
      'حارس مرمى': 'bg-red-100 text-red-800',
      'مدافع': 'bg-blue-100 text-blue-800',
      'وسط': 'bg-green-100 text-green-800',
      'مهاجم': 'bg-yellow-100 text-yellow-800',
      'لاعب وسط': 'bg-purple-100 text-purple-800',
      'جناح': 'bg-pink-100 text-pink-800'
    };
    return colors[position] || 'bg-gray-100 text-gray-800';
  }, []);

  const getPositionEmoji = useCallback((position: string) => {
    const emojis: { [key: string]: string } = {
      'حارس مرمى': '🥅',
      'مدافع': '🛡️',
      'وسط': '⚽',
      'مهاجم': '🎯',
      'لاعب وسط': '⚡',
      'جناح': '🏃'
    };
    return emojis[position] || '⚽';
  }, []);

  const getOrganizationBadgeStyle = useCallback((accountType: string) => {
    const styles: { [key: string]: string } = {
      'independent': 'bg-gray-100 text-gray-800',
      'trainer': 'bg-blue-100 text-blue-800',
      'club': 'bg-green-100 text-green-800',
      'agent': 'bg-purple-100 text-purple-800',
      'academy': 'bg-orange-100 text-orange-800'
    };
    return styles[accountType] || 'bg-gray-100 text-gray-800';
  }, []);

  const getOrganizationLabel = useCallback((accountType: string) => {
    const labels: { [key: string]: string } = {
      'independent': 'مستقل',
      'trainer': 'مدرب',
      'club': 'نادي',
      'agent': 'وكيل',
      'academy': 'أكاديمية'
    };
    return labels[accountType] || 'غير محدد';
  }, []);

  const getValidImageUrl = useCallback((url: any) => {
    if (!url) return null;
    if (typeof url === 'string') return url;
    if (typeof url === 'object' && url.url) return url.url;
    return null;
  }, []);

  const getUserDisplayName = useCallback(() => {
    if (!user) return 'مستخدم';
    return user.displayName || user.email?.split('@')[0] || 'مستخدم';
  }, [user]);

  // Reset filters function
  const resetFilters = () => {
    setFilterPosition('all');
    setFilterNationality('all');
    setFilterCountry('all');
    setFilterAccountType('all');
    setFilterAge('all');
    setFilterDependency('all');
    setFilterStatus('all');
    setFilterSkillLevel('all');
    setFilterObjective('all');
    setSearchTerm('');
  };

  // Get unique values for filter options
  const uniquePositions = useMemo(() => {
    const positions = new Set<string>();
    players.forEach(player => {
      if (player.primary_position) positions.add(player.primary_position);
      if (player.position) positions.add(player.position);
    });
    return Array.from(positions).sort();
  }, [players]);

  const uniqueNationalities = useMemo(() => {
    const nationalities = new Set<string>();
    players.forEach(player => {
      if (player.nationality) nationalities.add(player.nationality);
    });
    return Array.from(nationalities).sort();
  }, [players]);

  const uniqueCountries = useMemo(() => {
    const countries = new Set<string>();
    players.forEach(player => {
      if (player.country) countries.add(player.country);
    });
    return Array.from(countries).sort();
  }, [players]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">جاري تحميل اللاعبين...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            البحث عن اللاعبين
          </h1>
          <p className="text-gray-600">
            اكتشف اللاعبين الموهوبين من جميع أنحاء العالم
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="ابحث عن اللاعبين بالاسم، المركز، الجنسية، أو النادي..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full"
              />
            </div>
          </div>

          {/* Filters Toggle */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              الفلاتر
              {isFiltersExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={resetFilters} size="sm">
                إعادة تعيين
              </Button>
              <Button variant="outline" onClick={() => loadPlayersUltraOptimized()} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                تحديث
              </Button>
            </div>
          </div>

          {/* Filters */}
          {isFiltersExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Position Filter */}
              <div>
                <Label htmlFor="position-filter">المركز</Label>
                <Select value={filterPosition} onValueChange={setFilterPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المركز" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المراكز</SelectItem>
                    {uniquePositions.map(position => (
                      <SelectItem key={position} value={position}>
                        {getPositionEmoji(position)} {position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Nationality Filter */}
              <div>
                <Label htmlFor="nationality-filter">الجنسية</Label>
                <Select value={filterNationality} onValueChange={setFilterNationality}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الجنسية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الجنسيات</SelectItem>
                    {uniqueNationalities.map(nationality => (
                      <SelectItem key={nationality} value={nationality}>
                        <Flag className="h-4 w-4 mr-2" />
                        {nationality}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Country Filter */}
              <div>
                <Label htmlFor="country-filter">البلد</Label>
                <Select value={filterCountry} onValueChange={setFilterCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر البلد" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع البلدان</SelectItem>
                    {uniqueCountries.map(country => (
                      <SelectItem key={country} value={country}>
                        <MapPin className="h-4 w-4 mr-2" />
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Account Type Filter */}
              <div>
                <Label htmlFor="account-type-filter">نوع الحساب</Label>
                <Select value={filterAccountType} onValueChange={setFilterAccountType}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الحساب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنواع</SelectItem>
                    <SelectItem value="independent">مستقل</SelectItem>
                    <SelectItem value="trainer">مدرب</SelectItem>
                    <SelectItem value="club">نادي</SelectItem>
                    <SelectItem value="agent">وكيل</SelectItem>
                    <SelectItem value="academy">أكاديمية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Age Filter */}
              <div>
                <Label htmlFor="age-filter">العمر</Label>
                <Select value={filterAge} onValueChange={setFilterAge}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العمر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأعمار</SelectItem>
                    <SelectItem value="under-18">أقل من 18</SelectItem>
                    <SelectItem value="18-25">18 - 25</SelectItem>
                    <SelectItem value="26-35">26 - 35</SelectItem>
                    <SelectItem value="over-35">أكثر من 35</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dependency Filter */}
              <div>
                <Label htmlFor="dependency-filter">التبعية</Label>
                <Select value={filterDependency} onValueChange={setFilterDependency}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر التبعية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنواع</SelectItem>
                    <SelectItem value="independent">مستقل</SelectItem>
                    <SelectItem value="dependent">تابع</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              عرض {filteredPlayers.length} لاعب من أصل {players.length} لاعب
            </div>
            <div className="text-sm text-gray-600">
              الصفحة {currentPage} من {totalPages}
            </div>
          </div>
        </div>

        {/* Players Grid */}
        {pagedPlayers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد نتائج</h3>
            <p className="text-gray-600">جرب تغيير معايير البحث أو الفلاتر</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {pagedPlayers.map((player) => {
              const playerAccountType = getPlayerAccountType(player);
              const imageUrl = getValidImageUrl(player.profile_image_url);
              
              return (
                <Card key={player.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative">
                    {imageUrl ? (
                      <div className="aspect-square relative">
                        <Image
                          src={imageUrl}
                          alt={player.full_name || player.name || 'لاعب'}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="aspect-square bg-gray-200 flex items-center justify-center">
                        <User className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="absolute top-2 right-2">
                      <Badge className={getOrganizationBadgeStyle(playerAccountType)}>
                        {getOrganizationLabel(playerAccountType)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                      {player.full_name || player.name || 'لاعب غير محدد'}
                    </h3>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      {(player.primary_position || player.position) && (
                        <div className="flex items-center gap-2">
                          <Sword className="h-4 w-4" />
                          <Badge className={getPositionColor(player.primary_position || player.position || '')}>
                            {getPositionEmoji(player.primary_position || player.position || '')} {player.primary_position || player.position}
                          </Badge>
                        </div>
                      )}
                      
                      {player.nationality && (
                        <div className="flex items-center gap-2">
                          <Flag className="h-4 w-4" />
                          <span>{player.nationality}</span>
                        </div>
                      )}
                      
                      {player.country && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{player.country}</span>
                        </div>
                      )}
                      
                      {player.current_club && (
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4" />
                          <span className="line-clamp-1">{player.current_club}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => router.push(`/dashboard/shared/player-profile/${player.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        عرض الملف
                      </Button>
                      
                      <SendMessageButton
                        recipientId={player.id}
                        recipientName={player.full_name || player.name || 'لاعب'}
                        recipientType="player"
                        size="sm"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            playersPerPage={playersPerPage}
            totalPlayers={filteredPlayers.length}
            currentPagePlayers={pagedPlayers.length}
            onPlayersPerPageChange={handlePlayersPerPageChange}
          />
        )}
      </div>
    </div>
  );
}
