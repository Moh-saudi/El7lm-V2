'use client';

import SendMessageButton from '@/components/messaging/SendMessageButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
    Eye,
    Filter,
    Flag,
    MapPin,
    Maximize2,
    Minimize2,
    RefreshCw,
    Search,
    Smartphone,
    Sword,
    Trophy,
    User,
    Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

// Simple debounce hook
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
  age?: number;
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
  onPlayersPerPageChange: (playersPerPage: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  playersPerPage,
  totalPlayers,
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
          <SelectTrigger className="w-20 bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100">
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
          className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 disabled:bg-gray-50 disabled:text-gray-400"
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
                className={`min-w-[40px] ${
                  currentPage === page
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                }`}
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
          className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 disabled:bg-gray-50 disabled:text-gray-400"
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

export default function PlayersSearchPage({ accountType }: PlayersSearchPageProps) {
  const { user, userData } = useAuth();
  const router = useRouter();

  // State management
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [playersPerPage, setPlayersPerPage] = useState(12);

  // Filters
  const [filterPosition, setFilterPosition] = useState('all');
  const [filterNationality, setFilterNationality] = useState('all');
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterAccountType, setFilterAccountType] = useState('all');
  const [filterPhone, setFilterPhone] = useState('');

  // UI State
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  // Memoized callbacks
  const handlePlayersPerPageChange = useCallback((newPlayersPerPage: number) => {
    setPlayersPerPage(newPlayersPerPage);
    setCurrentPage(1);
  }, []);

  const getPlayerAccountType = useCallback((player: any) => {
    if (player.trainer_id || player.trainerId) return 'trainer';
    if (player.club_id || player.clubId) return 'club';
    if (player.agent_id || player.agentId) return 'agent';
    if (player.academy_id || player.academyId) return 'academy';
    return 'independent';
  }, []);

  // Simplified load players function
  const loadPlayers = useCallback(async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      console.log('🔄 Loading players...');

      // Load players from 'players' collection
      const playersSnapshot = await getDocs(collection(db, 'players'));
      const playersData: Player[] = [];

      playersSnapshot.forEach((doc) => {
        const playerData = { id: doc.id, ...doc.data() } as Player;
        if (!playerData.isDeleted) {
          playersData.push(playerData);
        }
      });

      // Load independent players from 'users' collection
      const usersQuery = query(
        collection(db, 'users'),
        where('accountType', '==', 'player')
      );
      const usersSnapshot = await getDocs(usersQuery);

      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        if (!userData.isDeleted) {
          playersData.push({
            id: doc.id,
            ...userData,
            accountType: 'independent'
          } as Player);
        }
      });

      setPlayers(playersData);
      console.log(`✅ Loaded ${playersData.length} players successfully`);

    } catch (error) {
      console.error('❌ Error loading players:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // Load data on mount
  useEffect(() => {
    if (user?.uid) {
      loadPlayers();
    }
  }, [user?.uid, loadPlayers]);

  // Optimized filtering
  const filteredPlayers = useMemo(() => {
    const hasFilters = debouncedSearchTerm ||
      filterPosition !== 'all' ||
      filterNationality !== 'all' ||
      filterCountry !== 'all' ||
      filterAccountType !== 'all' ||
      filterPhone !== '';

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

      // Phone filter
      if (filterPhone && filterPhone.trim() !== '') {
        const phoneSearch = filterPhone.trim().replace(/\D/g, '');
        const playerPhone = (player.phone || player.whatsapp || '').toString().replace(/\D/g, '');
        if (!playerPhone.includes(phoneSearch)) {
          return false;
        }
      }

      return true;
    });
  }, [players, debouncedSearchTerm, filterPosition, filterNationality, filterCountry,
      filterAccountType, filterPhone, getPlayerAccountType]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterPosition, filterNationality, filterCountry, filterAccountType, filterPhone]);

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

  // Reset filters function
  const resetFilters = () => {
    setFilterPosition('all');
    setFilterNationality('all');
    setFilterCountry('all');
    setFilterAccountType('all');
    setFilterPhone('');
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
              className="flex items-center gap-2 bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
            >
              <Filter className="h-4 w-4" />
              الفلاتر
              {isFiltersExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={resetFilters}
                size="sm"
                className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
              >
                إعادة تعيين
              </Button>
              <Button
                variant="outline"
                onClick={() => loadPlayers()}
                size="sm"
                className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              >
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

              {/* Phone Filter */}
              <div>
                <Label htmlFor="phone-filter">رقم الهاتف</Label>
                <div className="relative">
                  <Smartphone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="phone-filter"
                    type="text"
                    placeholder="ابحث برقم الهاتف..."
                    value={filterPhone}
                    onChange={(e) => setFilterPhone(e.target.value)}
                    className="pr-10"
                  />
                </div>
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
                <Card key={player.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                  <div className="relative w-full shrink-0">
                    {imageUrl ? (
                      <div className="w-full h-64 sm:h-72 md:h-80 lg:h-96 bg-gray-100 overflow-hidden">
                        <img
                          src={imageUrl}
                          alt={player.full_name || player.name || 'لاعب'}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-64 sm:h-72 md:h-80 lg:h-96 bg-gray-200 flex items-center justify-center">
                        <User className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 text-gray-400" />
                      </div>
                    )}

                    <div className="absolute top-2 right-2">
                      <Badge className={getOrganizationBadgeStyle(playerAccountType)}>
                        {getOrganizationLabel(playerAccountType)}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col">
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
                        className="flex-1 bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100"
                        onClick={async () => {
                          // إرسال رسالة واتساب للاعب
                          try {
                            const playerDoc = await getDocs(query(collection(db, 'players'), where('__name__', '==', player.id)));
                            if (!playerDoc.empty) {
                              const playerData = playerDoc.docs[0].data();
                              let playerPhone = playerData.whatsapp || playerData.phone;

                              if (playerPhone) {
                                // تنسيق رقم الهاتف (إضافة كود الدولة إذا لزم الأمر)
                                playerPhone = String(playerPhone).replace(/\D/g, ''); // إزالة أي أحرف غير رقمية

                                // إضافة كود مصر (20) إذا كان الرقم مصري بدون كود
                                if (playerPhone.length === 11 && playerPhone.startsWith('01')) {
                                  playerPhone = '20' + playerPhone.substring(1);
                                } else if (playerPhone.length === 10 && playerPhone.startsWith('1')) {
                                  playerPhone = '20' + playerPhone;
                                }
                                // إضافة كود السعودية (966) إذا كان الرقم سعودي بدون كود
                                else if (playerPhone.length === 10 && playerPhone.startsWith('05')) {
                                  playerPhone = '966' + playerPhone.substring(1);
                                } else if (playerPhone.length === 9 && playerPhone.startsWith('5')) {
                                  playerPhone = '966' + playerPhone;
                                }

                                // جلب اسم النادي/الجهة المشاهدة من userData
                                const clubName = userData?.name || userData?.full_name || user?.displayName || 'نادي مهتم';

                                // تحديد نوع الحساب مع الإيموجي المناسب
                                let accountTypeText = '';
                                let accountEmoji = '';
                                const accountType = userData?.accountType || userData?.type;

                                if (accountType === 'club') {
                                  accountTypeText = 'نادي';
                                  accountEmoji = '🏟️';
                                } else if (accountType === 'academy') {
                                  accountTypeText = 'أكاديمية';
                                  accountEmoji = '🎓';
                                } else if (accountType === 'trainer') {
                                  accountTypeText = 'مدرب';
                                  accountEmoji = '👨‍🏫';
                                } else if (accountType === 'agent') {
                                  accountTypeText = 'وكيل';
                                  accountEmoji = '💼';
                                } else if (accountType === 'marketer') {
                                  accountTypeText = 'مسوق';
                                  accountEmoji = '📢';
                                } else if (accountType === 'player') {
                                  accountTypeText = 'لاعب';
                                  accountEmoji = '⚽';
                                } else {
                                  accountTypeText = 'جهة مهتمة';
                                  accountEmoji = '⭐';
                                }

                                const message = `🌟 *━━━━━━━━━━━━━━━━━━━*
🎯 *تنبيه مهم من منصة الحلم!*
🌟 *━━━━━━━━━━━━━━━━━━━*

مرحباً *${playerData.full_name || 'اللاعب'}* 👋⚽

✨ *خبر سار جداً!* 🎉
تم مشاهدة ملفك الشخصي من قِبل:
${accountEmoji} *${accountTypeText}:* ${clubName} 🏆

🔥 *هذه فرصتك الذهبية!* 💎

📋 *الخطوات التالية:*
1️⃣ افتح حسابك على المنصة فوراً 🚀
2️⃣ تأكد من تحديث جميع بياناتك ✅
3️⃣ استعد للتواصل معهم! 📞💬

⚡ *لا تفوّت هذه الفرصة الذهبية!* ⭐

🌐 *رابط حسابك المباشر:*
https://el7lm.com/dashboard/player

━━━━━━━━━━━━━━━━━━━
⚽ *منصة الحلم* ⚽
من شركة ميسك القطرية 🇶🇦
أول متجر إلكتروني لتسويق وبيع لاعبين كرة القدم 🌍✨

💫 *حيث تتحقق الأحلام الرياضية* 🏆
━━━━━━━━━━━━━━━━━━━`;

                                // إرسال الرسالة
                                const response = await fetch('/api/whatsapp/babaservice', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    action: 'send_text',
                                    phoneNumber: playerPhone,
                                    message: message,
                                    instance_id: '68F243B3A8D8D'
                                  })
                                });

                                if (response.ok) {
                                  console.log('✅ تم إرسال إشعار واتساب للاعب:', playerData.full_name, 'على رقم:', playerPhone);
                                } else {
                                  console.error('❌ فشل إرسال واتساب:', response.status, response.statusText);
                                }
                              }
                            }
                          } catch (error) {
                            console.error('❌ خطأ في إرسال إشعار واتساب:', error);
                          }

                          // الانتقال لملف اللاعب
                          router.push(`/dashboard/shared/player-profile/${player.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        عرض الملف
                      </Button>

                      <SendMessageButton
                        user={user}
                        userData={user}
                        getUserDisplayName={() => user?.displayName || user?.email || 'مستخدم'}
                        targetUserId={player.id}
                        targetUserName={player.full_name || player.name || 'لاعب'}
                        targetUserType="player"
                        buttonSize="sm"
                        className="flex-1 bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100"
                        buttonText="رسالة"
                        redirectToMessages={true}
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
            onPlayersPerPageChange={handlePlayersPerPageChange}
          />
        )}
      </div>
    </div>
  );
}