'use client';

import SendMessageButton from '@/components/messaging/SendMessageButton';
import { dispatchNotification } from '@/lib/notifications/notification-dispatcher';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/lib/supabase/config';
import { getPlayerAvatarUrl } from '@/lib/supabase/image-utils';
import {
  Calendar,
  Eye,
  Filter,
  Flag,
  MapPin,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  Smartphone,
  Star,
  Sword,
  Trophy,
  User,
  Users,
  Zap
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type PlayersSearchCopy = {
  show: string;
  playersPerPage: string;
  range: string;
  previous: string;
  next: string;
  loading: string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  filters: string;
  reset: string;
  refresh: string;
  basicInfo: string;
  position: string;
  choosePosition: string;
  allPositions: string;
  country: string;
  chooseCountry: string;
  allCountries: string;
  nationality: string;
  chooseNationality: string;
  allNationalities: string;
  ageAndBirth: string;
  minAge: string;
  maxAge: string;
  example18: string;
  example30: string;
  birthYear: string;
  chooseBirthYear: string;
  allYears: string;
  additionalInfo: string;
  skillLevel: string;
  chooseSkillLevel: string;
  allLevels: string;
  phone: string;
  phonePlaceholder: string;
  importantNote: string;
  filtersNoteStart: string;
  filtersNoteStrong: string;
  filtersNoteEnd: string;
  resultsSummary: string;
  pageSummary: string;
  noResults: string;
  noResultsDesc: string;
  defaultPlayer: string;
  unknownPlayer: string;
  defaultUser: string;
  viewProfile: string;
  message: string;
  orgLabels: Record<string, string>;
};

const PLAYERS_SEARCH_COPY: Record<string, PlayersSearchCopy> = {
  ar: {
    show: 'عرض',
    playersPerPage: 'لاعب في الصفحة',
    range: 'عرض {{from}} إلى {{to}} من {{total}} لاعب',
    previous: 'السابق',
    next: 'التالي',
    loading: 'جاري تحميل اللاعبين...',
    title: 'البحث عن اللاعبين',
    subtitle: 'اكتشف اللاعبين الموهوبين من جميع أنحاء العالم',
    searchPlaceholder: 'ابحث عن اللاعبين بالاسم، المركز، الجنسية، أو النادي...',
    filters: 'الفلاتر',
    reset: 'إعادة تعيين',
    refresh: 'تحديث',
    basicInfo: 'معلومات أساسية',
    position: 'المركز',
    choosePosition: 'اختر المركز',
    allPositions: '🌍 جميع المراكز',
    country: 'البلد',
    chooseCountry: 'اختر البلد',
    allCountries: '🌍 جميع البلدان',
    nationality: 'الجنسية',
    chooseNationality: 'اختر الجنسية',
    allNationalities: '🌍 جميع الجنسيات',
    ageAndBirth: 'العمر وتاريخ الميلاد',
    minAge: 'الحد الأدنى للعمر',
    maxAge: 'الحد الأقصى للعمر',
    example18: 'مثال: 18',
    example30: 'مثال: 30',
    birthYear: 'عام الميلاد',
    chooseBirthYear: 'اختر عام الميلاد',
    allYears: '📅 جميع الأعوام',
    additionalInfo: 'معلومات إضافية',
    skillLevel: 'مستوى المهارة',
    chooseSkillLevel: 'اختر مستوى المهارة',
    allLevels: '⭐ جميع المستويات',
    phone: 'رقم الهاتف',
    phonePlaceholder: 'ابحث برقم الهاتف...',
    importantNote: 'ملاحظة مهمة',
    filtersNoteStart: 'جميع الفلاتر تعمل معاً - يمكنك اختيار لاعب من دولة معينة مع عمر محدد في نفس الوقت. النتائج ستظهر فقط اللاعبين الذين يطابقون ',
    filtersNoteStrong: 'جميع',
    filtersNoteEnd: ' الفلاتر المختارة.',
    resultsSummary: 'عرض {{filtered}} لاعب من أصل {{total}} لاعب',
    pageSummary: 'الصفحة {{current}} من {{total}}',
    noResults: 'لا توجد نتائج',
    noResultsDesc: 'جرب تغيير معايير البحث أو الفلاتر',
    defaultPlayer: 'لاعب',
    unknownPlayer: 'لاعب غير محدد',
    defaultUser: 'مستخدم',
    viewProfile: 'عرض الملف',
    message: 'رسالة',
    orgLabels: { independent: 'مستقل', trainer: 'مدرب', club: 'نادي', agent: 'وكيل', academy: 'أكاديمية', unknown: 'غير محدد' },
  },
  en: {
    show: 'Show',
    playersPerPage: 'players per page',
    range: 'Showing {{from}} to {{to}} of {{total}} players',
    previous: 'Previous',
    next: 'Next',
    loading: 'Loading players...',
    title: 'Search players',
    subtitle: 'Discover talented players from around the world',
    searchPlaceholder: 'Search by name, position, nationality, or club...',
    filters: 'Filters',
    reset: 'Reset',
    refresh: 'Refresh',
    basicInfo: 'Basic information',
    position: 'Position',
    choosePosition: 'Choose position',
    allPositions: '🌍 All positions',
    country: 'Country',
    chooseCountry: 'Choose country',
    allCountries: '🌍 All countries',
    nationality: 'Nationality',
    chooseNationality: 'Choose nationality',
    allNationalities: '🌍 All nationalities',
    ageAndBirth: 'Age and birth date',
    minAge: 'Minimum age',
    maxAge: 'Maximum age',
    example18: 'Example: 18',
    example30: 'Example: 30',
    birthYear: 'Birth year',
    chooseBirthYear: 'Choose birth year',
    allYears: '📅 All years',
    additionalInfo: 'Additional information',
    skillLevel: 'Skill level',
    chooseSkillLevel: 'Choose skill level',
    allLevels: '⭐ All levels',
    phone: 'Phone number',
    phonePlaceholder: 'Search by phone number...',
    importantNote: 'Important note',
    filtersNoteStart: 'All filters work together — you can choose a player from a specific country with a specific age at the same time. Results will only show players matching ',
    filtersNoteStrong: 'all',
    filtersNoteEnd: ' selected filters.',
    resultsSummary: 'Showing {{filtered}} of {{total}} players',
    pageSummary: 'Page {{current}} of {{total}}',
    noResults: 'No results',
    noResultsDesc: 'Try changing the search criteria or filters',
    defaultPlayer: 'Player',
    unknownPlayer: 'Unknown player',
    defaultUser: 'User',
    viewProfile: 'View profile',
    message: 'Message',
    orgLabels: { independent: 'Independent', trainer: 'Trainer', club: 'Club', agent: 'Agent', academy: 'Academy', unknown: 'Unknown' },
  },
  es: {
    show: 'Mostrar',
    playersPerPage: 'jugadores por página',
    range: 'Mostrando {{from}} a {{to}} de {{total}} jugadores',
    previous: 'Anterior',
    next: 'Siguiente',
    loading: 'Cargando jugadores...',
    title: 'Buscar jugadores',
    subtitle: 'Descubre jugadores talentosos de todo el mundo',
    searchPlaceholder: 'Buscar por nombre, posición, nacionalidad o club...',
    filters: 'Filtros',
    reset: 'Restablecer',
    refresh: 'Actualizar',
    basicInfo: 'Información básica',
    position: 'Posición',
    choosePosition: 'Elige posición',
    allPositions: '🌍 Todas las posiciones',
    country: 'País',
    chooseCountry: 'Elige país',
    allCountries: '🌍 Todos los países',
    nationality: 'Nacionalidad',
    chooseNationality: 'Elige nacionalidad',
    allNationalities: '🌍 Todas las nacionalidades',
    ageAndBirth: 'Edad y fecha de nacimiento',
    minAge: 'Edad mínima',
    maxAge: 'Edad máxima',
    example18: 'Ejemplo: 18',
    example30: 'Ejemplo: 30',
    birthYear: 'Año de nacimiento',
    chooseBirthYear: 'Elige año de nacimiento',
    allYears: '📅 Todos los años',
    additionalInfo: 'Información adicional',
    skillLevel: 'Nivel de habilidad',
    chooseSkillLevel: 'Elige nivel de habilidad',
    allLevels: '⭐ Todos los niveles',
    phone: 'Teléfono',
    phonePlaceholder: 'Buscar por teléfono...',
    importantNote: 'Nota importante',
    filtersNoteStart: 'Todos los filtros funcionan juntos: puedes elegir un jugador de un país específico con una edad concreta al mismo tiempo. Los resultados solo mostrarán jugadores que coincidan con ',
    filtersNoteStrong: 'todos',
    filtersNoteEnd: ' los filtros seleccionados.',
    resultsSummary: 'Mostrando {{filtered}} de {{total}} jugadores',
    pageSummary: 'Página {{current}} de {{total}}',
    noResults: 'Sin resultados',
    noResultsDesc: 'Prueba a cambiar los criterios de búsqueda o filtros',
    defaultPlayer: 'Jugador',
    unknownPlayer: 'Jugador no definido',
    defaultUser: 'Usuario',
    viewProfile: 'Ver perfil',
    message: 'Mensaje',
    orgLabels: { independent: 'Independiente', trainer: 'Entrenador', club: 'Club', agent: 'Agente', academy: 'Academia', unknown: 'No definido' },
  },
  pt: {
    show: 'Mostrar',
    playersPerPage: 'jogadores por página',
    range: 'Mostrando {{from}} a {{to}} de {{total}} jogadores',
    previous: 'Anterior',
    next: 'Próximo',
    loading: 'Carregando jogadores...',
    title: 'Pesquisar jogadores',
    subtitle: 'Descubra jogadores talentosos de todo o mundo',
    searchPlaceholder: 'Pesquisar por nome, posição, nacionalidade ou clube...',
    filters: 'Filtros',
    reset: 'Redefinir',
    refresh: 'Atualizar',
    basicInfo: 'Informações básicas',
    position: 'Posição',
    choosePosition: 'Escolha a posição',
    allPositions: '🌍 Todas as posições',
    country: 'País',
    chooseCountry: 'Escolha o país',
    allCountries: '🌍 Todos os países',
    nationality: 'Nacionalidade',
    chooseNationality: 'Escolha a nacionalidade',
    allNationalities: '🌍 Todas as nacionalidades',
    ageAndBirth: 'Idade e data de nascimento',
    minAge: 'Idade mínima',
    maxAge: 'Idade máxima',
    example18: 'Exemplo: 18',
    example30: 'Exemplo: 30',
    birthYear: 'Ano de nascimento',
    chooseBirthYear: 'Escolha o ano de nascimento',
    allYears: '📅 Todos os anos',
    additionalInfo: 'Informações adicionais',
    skillLevel: 'Nível de habilidade',
    chooseSkillLevel: 'Escolha o nível de habilidade',
    allLevels: '⭐ Todos os níveis',
    phone: 'Telefone',
    phonePlaceholder: 'Pesquisar por telefone...',
    importantNote: 'Nota importante',
    filtersNoteStart: 'Todos os filtros funcionam juntos — você pode escolher um jogador de um país específico com uma idade específica ao mesmo tempo. Os resultados mostrarão apenas jogadores que correspondem a ',
    filtersNoteStrong: 'todos',
    filtersNoteEnd: ' os filtros selecionados.',
    resultsSummary: 'Mostrando {{filtered}} de {{total}} jogadores',
    pageSummary: 'Página {{current}} de {{total}}',
    noResults: 'Sem resultados',
    noResultsDesc: 'Tente alterar os critérios de busca ou filtros',
    defaultPlayer: 'Jogador',
    unknownPlayer: 'Jogador não definido',
    defaultUser: 'Usuário',
    viewProfile: 'Ver perfil',
    message: 'Mensagem',
    orgLabels: { independent: 'Independente', trainer: 'Treinador', club: 'Clube', agent: 'Agente', academy: 'Academia', unknown: 'Não definido' },
  },
};

function getPlayersSearchCopy(locale: string): PlayersSearchCopy {
  return PLAYERS_SEARCH_COPY[locale] || PLAYERS_SEARCH_COPY.en;
}

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

// دالة للحصول على علم الدولة
const getCountryFlag = (countryName: string): string => {
  const flagMap: Record<string, string> = {
    'السعودية': '🇸🇦',
    'الإمارات': '🇦🇪',
    'الكويت': '🇰🇼',
    'قطر': '🇶🇦',
    'البحرين': '🇧🇭',
    'عمان': '🇴🇲',
    'مصر': '🇪🇬',
    'الأردن': '🇯🇴',
    'لبنان': '🇱🇧',
    'العراق': '🇮🇶',
    'سوريا': '🇸🇾',
    'المغرب': '🇲🇦',
    'الجزائر': '🇩🇿',
    'تونس': '🇹🇳',
    'ليبيا': '🇱🇾',
    'السودان': '🇸🇩',
    'اليمن': '🇾🇪',
    'إسبانيا': '🇪🇸',
    'فرنسا': '🇫🇷',
    'إنجلترا': '🇬🇧',
    'البرتغال': '🇵🇹',
    'إيطاليا': '🇮🇹',
    'اليونان': '🇬🇷',
    'قبرص': '🇨🇾',
    'تركيا': '🇹🇷',
    'تايلاند': '🇹🇭',
    'السنغال': '🇸🇳',
    'ساحل العاج': '🇨🇮',
    'جيبوتي': '🇩🇯',
    'الولايات المتحدة': '🇺🇸',
    'بريطانيا': '🇬🇧',
    'ألمانيا': '🇩🇪',
  };
  return flagMap[countryName] || '🏳️';
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
  birth_date?: any;
  birthDate?: any;
  dateOfBirth?: any;
  status?: string;
  skill_level?: string;
  skillLevel?: string;
  objectives?: string[];
  isDeleted?: boolean;
  isActive?: boolean;
  createdAt?: any;
  created_at?: any;
  phone?: string;
  whatsapp?: string;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  playersPerPage: number;
  totalPlayers: number;
  onPlayersPerPageChange: (playersPerPage: number) => void;
  copy: PlayersSearchCopy;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  playersPerPage,
  totalPlayers,
  onPlayersPerPageChange,
  copy
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
        <span>{copy.show}</span>
        <Select value={playersPerPage.toString()} onValueChange={(value) => onPlayersPerPageChange(parseInt(value))}>
          <SelectTrigger className="w-20 bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">6</SelectItem>
            <SelectItem value="12">12</SelectItem>
            <SelectItem value="24">24</SelectItem>
            <SelectItem value="48">48</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="200">200</SelectItem>
            <SelectItem value="500">500</SelectItem>
          </SelectContent>
        </Select>
        <span>{copy.playersPerPage}</span>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>
          {copy.range
            .replace('{{from}}', String(((currentPage - 1) * playersPerPage) + 1))
            .replace('{{to}}', String(Math.min(currentPage * playersPerPage, totalPlayers)))
            .replace('{{total}}', String(totalPlayers))}
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
          {copy.previous}
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
                className={`min-w-[40px] ${currentPage === page
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
          {copy.next}
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
  const { locale, isRTL } = useTranslation();
  const copy = useMemo(() => getPlayersSearchCopy(locale), [locale]);
  const router = useRouter();
  const searchParams = useSearchParams();

  // State management
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Pagination - استعادة رقم الصفحة من URL
  const getInitialPage = () => {
    if (typeof window === 'undefined') return 1;
    const pageParam = new URLSearchParams(window.location.search).get('page');
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    return isNaN(page) || page < 1 ? 1 : page;
  };

  const [currentPage, setCurrentPage] = useState(() => getInitialPage());
  const [playersPerPage, setPlayersPerPage] = useState(12);
  const isUpdatingFromUser = React.useRef(false);
  const hasInitializedFilters = useRef(false);
  const filtersSignatureRef = useRef<string>('');

  // استعادة رقم الصفحة من URL عند تغيير searchParams (مثل العودة من صفحة أخرى)
  useEffect(() => {
    // تجاهل التحديثات التي تأتي من المستخدم
    if (isUpdatingFromUser.current) {
      return;
    }

    // قراءة رقم الصفحة من URL مباشرة
    const pageParam = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('page')
      : searchParams.get('page');
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const validPage = isNaN(page) || page < 1 ? 1 : page;

    console.log('📄 استعادة رقم الصفحة من URL:', { pageParam, validPage, currentPage, searchParamsString: searchParams.toString() });
    setCurrentPage(validPage);
  }, [searchParams]); // استمع لتغييرات searchParams فقط

  // Filters - مرتبة بشكل منطقي
  const [filterPosition, setFilterPosition] = useState('all');
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterNationality, setFilterNationality] = useState('all');
  const [filterAgeMin, setFilterAgeMin] = useState('');
  const [filterAgeMax, setFilterAgeMax] = useState('');
  const [filterBirthYear, setFilterBirthYear] = useState('all');
  const [filterSkillLevel, setFilterSkillLevel] = useState('all');
  const [filterPhone, setFilterPhone] = useState('');

  // UI State
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    basic: false,
    age: false,
    additional: false
  });

  // تحديث URL عند تغيير الصفحة
  const updatePageInURL = useCallback((page: number) => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (page > 1) {
      params.set('page', page.toString());
    } else {
      params.delete('page');
    }
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;

    // إعادة تعيين isUpdatingFromUser بعد تحديث URL
    setTimeout(() => {
      isUpdatingFromUser.current = false;
    }, 100);

    router.replace(newUrl, { scroll: false });
  }, [router]);

  // Memoized callbacks
  const handlePlayersPerPageChange = useCallback((newPlayersPerPage: number) => {
    setPlayersPerPage(newPlayersPerPage);
    setCurrentPage(1);
    updatePageInURL(1);
  }, [updatePageInURL]);

  const getPlayerAccountType = useCallback((player: any) => {
    if (player.trainer_id || player.trainerId) return 'trainer';
    if (player.club_id || player.clubId) return 'club';
    if (player.agent_id || player.agentId) return 'agent';
    if (player.academy_id || player.academyId) return 'academy';
    return 'independent';
  }, []);

  // Simplified load players function
  const loadPlayers = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      console.log('🔄 Loading players...');

      // Load players from 'players' table
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*');

      if (playersError) throw playersError;

      const playersMap = new Map<string, Player>();

      (playersData || []).forEach((playerData: Player) => {
        if (!playerData.isDeleted) {
          // استخدام Map لإزالة التكرارات بناءً على id
          playersMap.set(playerData.id, playerData);
        }
      });

      // Load independent players from 'users' table
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('accountType', 'player');

      if (usersError) throw usersError;

      (usersData || []).forEach((userData: any) => {
        if (!userData.isDeleted) {
          // إضافة فقط إذا لم يكن موجوداً في players table
          if (!playersMap.has(userData.id)) {
            playersMap.set(userData.id, {
              ...userData,
              accountType: 'independent'
            } as Player);
          }
        }
      });

      // تحويل Map إلى Array
      const allPlayers = Array.from(playersMap.values());
      setPlayers(allPlayers);
      console.log(`✅ Loaded ${allPlayers.length} unique players successfully`);

    } catch (error) {
      console.error('❌ Error loading players:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Load data on mount
  useEffect(() => {
    if (user?.id) {
      loadPlayers();
    }
  }, [user?.id, loadPlayers]);

  // Helper function to calculate player age
  const calculatePlayerAge = useCallback((player: Player): number | null => {
    if (player.age && typeof player.age === 'number') {
      return player.age;
    }

    let birthDate: Date | null = null;
    const currentYear = new Date().getFullYear();

    // محاولة استخراج تاريخ الميلاد من مختلف الحقول
    if (player.birth_date) {
      try {
        if (player.birth_date.toDate) {
          birthDate = player.birth_date.toDate();
        } else if (player.birth_date.seconds) {
          birthDate = new Date(player.birth_date.seconds * 1000);
        } else if (typeof player.birth_date === 'string') {
          birthDate = new Date(player.birth_date);
        }
      } catch (e) {
        // تجاهل الأخطاء
      }
    } else if (player.birthDate) {
      try {
        if (player.birthDate.toDate) {
          birthDate = player.birthDate.toDate();
        } else if (player.birthDate.seconds) {
          birthDate = new Date(player.birthDate.seconds * 1000);
        } else if (typeof player.birthDate === 'string') {
          birthDate = new Date(player.birthDate);
        }
      } catch (e) {
        // تجاهل الأخطاء
      }
    } else if (player.dateOfBirth) {
      try {
        if (player.dateOfBirth.toDate) {
          birthDate = player.dateOfBirth.toDate();
        } else if (player.dateOfBirth.seconds) {
          birthDate = new Date(player.dateOfBirth.seconds * 1000);
        } else if (typeof player.dateOfBirth === 'string') {
          birthDate = new Date(player.dateOfBirth);
        }
      } catch (e) {
        // تجاهل الأخطاء
      }
    }

    if (birthDate && !isNaN(birthDate.getTime())) {
      const age = currentYear - birthDate.getFullYear();
      const monthDiff = new Date().getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && new Date().getDate() < birthDate.getDate())) {
        return age - 1;
      }
      return age;
    }

    return null;
  }, []);

  // Helper function to get birth year
  const getBirthYear = useCallback((player: Player): number | null => {
    const age = calculatePlayerAge(player);
    if (age !== null) {
      return new Date().getFullYear() - age;
    }

    let birthDate: Date | null = null;
    if (player.birth_date) {
      try {
        if (player.birth_date.toDate) {
          birthDate = player.birth_date.toDate();
        } else if (player.birth_date.seconds) {
          birthDate = new Date(player.birth_date.seconds * 1000);
        } else if (typeof player.birth_date === 'string') {
          birthDate = new Date(player.birth_date);
        }
      } catch (e) { }
    } else if (player.birthDate) {
      try {
        if (player.birthDate.toDate) {
          birthDate = player.birthDate.toDate();
        } else if (player.birthDate.seconds) {
          birthDate = new Date(player.birthDate.seconds * 1000);
        } else if (typeof player.birthDate === 'string') {
          birthDate = new Date(player.birthDate);
        }
      } catch (e) { }
    } else if (player.dateOfBirth) {
      try {
        if (player.dateOfBirth.toDate) {
          birthDate = player.dateOfBirth.toDate();
        } else if (player.dateOfBirth.seconds) {
          birthDate = new Date(player.dateOfBirth.seconds * 1000);
        } else if (typeof player.dateOfBirth === 'string') {
          birthDate = new Date(player.dateOfBirth);
        }
      } catch (e) { }
    }

    if (birthDate && !isNaN(birthDate.getTime())) {
      return birthDate.getFullYear();
    }

    return null;
  }, [calculatePlayerAge]);

  // Optimized filtering - جميع الفلاتر تعمل معاً (AND logic)
  const filteredPlayers = useMemo(() => {
    const hasFilters = debouncedSearchTerm ||
      filterPosition !== 'all' ||
      filterCountry !== 'all' ||
      filterNationality !== 'all' ||
      filterAgeMin !== '' ||
      filterAgeMax !== '' ||
      filterBirthYear !== 'all' ||
      filterSkillLevel !== 'all' ||
      filterPhone !== '';

    if (!hasFilters) {
      return players;
    }

    return players.filter(player => {
      // 1. Search filter - البحث النصي
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

      // 2. Position filter - فلتر المركز
      if (filterPosition !== 'all') {
        const playerPosition = player.primary_position || player.position;
        if (playerPosition !== filterPosition) {
          return false;
        }
      }

      // 3. Country filter - فلتر البلد
      if (filterCountry !== 'all' && player.country !== filterCountry) {
        return false;
      }

      // 4. Nationality filter - فلتر الجنسية
      if (filterNationality !== 'all' && player.nationality !== filterNationality) {
        return false;
      }

      // 5. Age range filter - فلتر العمر (الحد الأدنى والأقصى)
      const playerAge = calculatePlayerAge(player);
      if (playerAge !== null) {
        if (filterAgeMin !== '' && playerAge < parseInt(filterAgeMin)) {
          return false;
        }
        if (filterAgeMax !== '' && playerAge > parseInt(filterAgeMax)) {
          return false;
        }
      } else {
        // إذا لم يكن العمر متاحاً وكان هناك فلتر للعمر، استبعد اللاعب
        if (filterAgeMin !== '' || filterAgeMax !== '') {
          return false;
        }
      }

      // 6. Birth year filter - فلتر عام الميلاد
      if (filterBirthYear !== 'all') {
        const birthYear = getBirthYear(player);
        if (birthYear === null || birthYear !== parseInt(filterBirthYear)) {
          return false;
        }
      }

      // 7. Skill level filter - فلتر مستوى المهارة
      if (filterSkillLevel !== 'all') {
        const skillLevel = player.skill_level || player.skillLevel;
        if (skillLevel !== filterSkillLevel) {
          return false;
        }
      }

      // 8. Phone filter - فلتر رقم الهاتف
      if (filterPhone && filterPhone.trim() !== '') {
        const phoneSearch = filterPhone.trim().replace(/\D/g, '');
        const playerPhone = (player.phone || player.whatsapp || '').toString().replace(/\D/g, '');
        if (!playerPhone.includes(phoneSearch)) {
          return false;
        }
      }

      // جميع الفلاتر تم تطبيقها بنجاح
      return true;
    });
  }, [players, debouncedSearchTerm, filterPosition, filterCountry,
    filterNationality, filterAgeMin, filterAgeMax, filterBirthYear,
    filterSkillLevel, filterPhone, calculatePlayerAge, getBirthYear]);

  const filtersSignature = useMemo(() => JSON.stringify({
    debouncedSearchTerm,
    filterPosition,
    filterCountry,
    filterNationality,
    filterAgeMin,
    filterAgeMax,
    filterBirthYear,
    filterSkillLevel,
    filterPhone
  }), [debouncedSearchTerm, filterPosition, filterCountry, filterNationality,
    filterAgeMin, filterAgeMax, filterBirthYear, filterSkillLevel, filterPhone]);

  // Reset page when filters change
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
    setCurrentPage(1);
    updatePageInURL(1);
  }, [filtersSignature, updatePageInURL]);

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
    return copy.orgLabels[accountType] || copy.orgLabels.unknown;
  }, [copy.orgLabels]);

  const getValidImageUrl = useCallback((url: any) => {
    if (!url) return null;
    if (typeof url === 'string') return url;
    if (typeof url === 'object' && url.url) return url.url;
    return null;
  }, []);

  // Reset filters function
  const resetFilters = () => {
    setFilterPosition('all');
    setFilterCountry('all');
    setFilterNationality('all');
    setFilterAgeMin('');
    setFilterAgeMax('');
    setFilterBirthYear('all');
    setFilterSkillLevel('all');
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

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    players.forEach(player => {
      if (player.city) cities.add(player.city);
    });
    return Array.from(cities).sort();
  }, [players]);

  const uniqueBirthYears = useMemo(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();

    players.forEach(player => {
      let birthYear: number | null = null;

      // محاولة استخراج عام الميلاد من مختلف الحقول
      if (player.birth_date) {
        try {
          if (player.birth_date.toDate) {
            birthYear = player.birth_date.toDate().getFullYear();
          } else if (player.birth_date.seconds) {
            birthYear = new Date(player.birth_date.seconds * 1000).getFullYear();
          } else if (typeof player.birth_date === 'string') {
            birthYear = new Date(player.birth_date).getFullYear();
          }
        } catch (e) {
          // تجاهل الأخطاء
        }
      } else if (player.birthDate) {
        try {
          if (player.birthDate.toDate) {
            birthYear = player.birthDate.toDate().getFullYear();
          } else if (player.birthDate.seconds) {
            birthYear = new Date(player.birthDate.seconds * 1000).getFullYear();
          } else if (typeof player.birthDate === 'string') {
            birthYear = new Date(player.birthDate).getFullYear();
          }
        } catch (e) {
          // تجاهل الأخطاء
        }
      } else if (player.dateOfBirth) {
        try {
          if (player.dateOfBirth.toDate) {
            birthYear = player.dateOfBirth.toDate().getFullYear();
          } else if (player.dateOfBirth.seconds) {
            birthYear = new Date(player.dateOfBirth.seconds * 1000).getFullYear();
          } else if (typeof player.dateOfBirth === 'string') {
            birthYear = new Date(player.dateOfBirth).getFullYear();
          }
        } catch (e) {
          // تجاهل الأخطاء
        }
      } else if (player.age) {
        // حساب عام الميلاد من العمر
        birthYear = currentYear - player.age;
      }

      if (birthYear && birthYear > 1950 && birthYear <= currentYear) {
        years.add(birthYear);
      }
    });

    return Array.from(years).sort((a, b) => b - a); // ترتيب تنازلي
  }, [players]);

  const uniqueSkillLevels = useMemo(() => {
    const levels = new Set<string>();
    players.forEach(player => {
      if (player.skill_level) levels.add(player.skill_level);
      if (player.skillLevel) levels.add(player.skillLevel);
    });
    return Array.from(levels).sort();
  }, [players]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">{copy.loading}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {copy.title}
          </h1>
          <p className="text-gray-600">
            {copy.subtitle}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-md border border-gray-200 p-4 mb-4">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-md blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 h-4 w-4 z-10 pointer-events-none" />
              <Input
                type="text"
                placeholder={copy.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-3 py-2 w-full border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 rounded-md transition-all duration-200 bg-white text-sm relative z-20"
              />
            </div>
          </div>

          {/* Filters Toggle */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white border-0 shadow-md hover:shadow-lg hover:from-orange-600 hover:to-pink-600 transition-all duration-300 rounded-md px-4 py-2 text-sm"
            >
              <Filter className="h-3.5 w-3.5" />
              <span className="font-medium">{copy.filters}</span>
              {isFiltersExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={resetFilters}
                size="sm"
                className="bg-gradient-to-r from-red-500 to-rose-500 text-white border-0 shadow-md hover:shadow-lg hover:from-red-600 hover:to-rose-600 transition-all duration-300 rounded-md px-3 py-1.5 text-xs"
              >
                {copy.reset}
              </Button>
              <Button
                variant="outline"
                onClick={() => loadPlayers()}
                size="sm"
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-md hover:shadow-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 rounded-md px-3 py-1.5 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                {copy.refresh}
              </Button>
            </div>
          </div>

          {/* Filters - مرتبة بشكل منطقي */}
          {isFiltersExpanded && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
              {/* Section 1: معلومات أساسية */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100 shadow-sm">
                <button
                  onClick={() => setExpandedSections(prev => ({ ...prev, basic: !prev.basic }))}
                  className="flex items-center justify-between w-full mb-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md shadow-sm">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-800">{copy.basicInfo}</h3>
                  </div>
                  {expandedSections.basic ? <Minimize2 className="h-4 w-4 text-gray-600" /> : <Maximize2 className="h-4 w-4 text-gray-600" />}
                </button>
                {expandedSections.basic && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                    {/* Position Filter */}
                    <div className="group">
                      <Label htmlFor="position-filter" className="flex items-center gap-1.5 mb-1.5 text-xs font-medium text-gray-700">
                        <div className="p-1 bg-gradient-to-br from-purple-400 to-pink-400 rounded shadow-sm">
                          <Sword className="h-3 w-3 text-white" />
                        </div>
                        {copy.position}
                      </Label>
                      <Select value={filterPosition} onValueChange={setFilterPosition}>
                        <SelectTrigger className="bg-white border border-gray-200 hover:border-purple-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-200 rounded-md transition-all duration-200 shadow-sm hover:shadow text-sm h-9">
                          <SelectValue placeholder={copy.choosePosition} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="all" className="pl-2">{copy.allPositions}</SelectItem>
                          {uniquePositions.map(position => (
                            <SelectItem key={position} value={position} className="flex items-center gap-2 pl-2">
                              <span className="text-base flex-shrink-0">{getPositionEmoji(position)}</span>
                              <span className="flex-1">{position}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Country Filter */}
                    <div className="group">
                      <Label htmlFor="country-filter" className="flex items-center gap-1.5 mb-1.5 text-xs font-medium text-gray-700">
                        <div className="p-1 bg-gradient-to-br from-green-400 to-emerald-400 rounded shadow-sm">
                          <MapPin className="h-3 w-3 text-white" />
                        </div>
                        {copy.country}
                      </Label>
                      <Select value={filterCountry} onValueChange={setFilterCountry}>
                        <SelectTrigger className="bg-white border border-gray-200 hover:border-green-400 focus:border-green-500 focus:ring-1 focus:ring-green-200 rounded-md transition-all duration-200 shadow-sm hover:shadow text-sm h-9">
                          <SelectValue placeholder={copy.chooseCountry}>
                            {filterCountry !== 'all' && (
                              <span className="flex items-center gap-2">
                                <span className="text-lg">{getCountryFlag(filterCountry)}</span>
                                <span>{filterCountry}</span>
                              </span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="all" className="pl-2">{copy.allCountries}</SelectItem>
                          {uniqueCountries.map(country => (
                            <SelectItem key={country} value={country} className="flex items-center gap-2 py-2 pl-2">
                              <span className="text-xl flex-shrink-0">{getCountryFlag(country)}</span>
                              <span className="flex-1">{country}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Nationality Filter */}
                    <div className="group">
                      <Label htmlFor="nationality-filter" className="flex items-center gap-1.5 mb-1.5 text-xs font-medium text-gray-700">
                        <div className="p-1 bg-gradient-to-br from-orange-400 to-red-400 rounded shadow-sm">
                          <Flag className="h-3 w-3 text-white" />
                        </div>
                        {copy.nationality}
                      </Label>
                      <Select value={filterNationality} onValueChange={setFilterNationality}>
                        <SelectTrigger className="bg-white border border-gray-200 hover:border-orange-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 rounded-md transition-all duration-200 shadow-sm hover:shadow text-sm h-9">
                          <SelectValue placeholder={copy.chooseNationality}>
                            {filterNationality !== 'all' && (
                              <span className="flex items-center gap-2">
                                <span className="text-lg">{getCountryFlag(filterNationality)}</span>
                                <span>{filterNationality}</span>
                              </span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="all" className="pl-2">{copy.allNationalities}</SelectItem>
                          {uniqueNationalities.map(nationality => (
                            <SelectItem key={nationality} value={nationality} className="flex items-center gap-2 py-2 pl-2">
                              <span className="text-xl flex-shrink-0">{getCountryFlag(nationality)}</span>
                              <span className="flex-1">{nationality}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: العمر وتاريخ الميلاد */}
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-3 border border-amber-100 shadow-sm">
                <button
                  onClick={() => setExpandedSections(prev => ({ ...prev, age: !prev.age }))}
                  className="flex items-center justify-between w-full mb-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-md shadow-sm">
                      <Calendar className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-800">{copy.ageAndBirth}</h3>
                  </div>
                  {expandedSections.age ? <Minimize2 className="h-4 w-4 text-gray-600" /> : <Maximize2 className="h-4 w-4 text-gray-600" />}
                </button>
                {expandedSections.age && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                    {/* Age Range Filters */}
                    <div className="group">
                      <Label htmlFor="age-min-filter" className="flex items-center gap-1.5 mb-1.5 text-xs font-medium text-gray-700">
                        <div className="p-1 bg-gradient-to-br from-blue-400 to-cyan-400 rounded shadow-sm">
                          <User className="h-3 w-3 text-white" />
                        </div>
                        {copy.minAge}
                      </Label>
                      <Input
                        id="age-min-filter"
                        type="number"
                        placeholder={copy.example18}
                        min="0"
                        max="100"
                        value={filterAgeMin}
                        onChange={(e) => setFilterAgeMin(e.target.value)}
                        className="bg-white border border-gray-200 hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 rounded-md transition-all duration-200 shadow-sm hover:shadow text-sm h-9"
                      />
                    </div>

                    <div className="group">
                      <Label htmlFor="age-max-filter" className="flex items-center gap-1.5 mb-1.5 text-xs font-medium text-gray-700">
                        <div className="p-1 bg-gradient-to-br from-purple-400 to-pink-400 rounded shadow-sm">
                          <User className="h-3 w-3 text-white" />
                        </div>
                        {copy.maxAge}
                      </Label>
                      <Input
                        id="age-max-filter"
                        type="number"
                        placeholder={copy.example30}
                        min="0"
                        max="100"
                        value={filterAgeMax}
                        onChange={(e) => setFilterAgeMax(e.target.value)}
                        className="bg-white border border-gray-200 hover:border-purple-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-200 rounded-md transition-all duration-200 shadow-sm hover:shadow text-sm h-9"
                      />
                    </div>

                    {/* Birth Year Filter */}
                    <div className="group">
                      <Label htmlFor="birth-year-filter" className="flex items-center gap-1.5 mb-1.5 text-xs font-medium text-gray-700">
                        <div className="p-1 bg-gradient-to-br from-indigo-400 to-purple-400 rounded shadow-sm">
                          <Calendar className="h-3 w-3 text-white" />
                        </div>
                        {copy.birthYear}
                      </Label>
                      <Select value={filterBirthYear} onValueChange={setFilterBirthYear}>
                        <SelectTrigger className="bg-white border border-gray-200 hover:border-indigo-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 rounded-md transition-all duration-200 shadow-sm hover:shadow text-sm h-9">
                          <SelectValue placeholder={copy.chooseBirthYear} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="all" className="pl-2">{copy.allYears}</SelectItem>
                          {uniqueBirthYears.map(year => (
                            <SelectItem key={year} value={year.toString()} className="flex items-center gap-2 pl-2">
                              <span className="text-base flex-shrink-0">📆</span>
                              <span className="flex-1">{year}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: معلومات إضافية */}
              <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg p-3 border border-pink-100 shadow-sm">
                <button
                  onClick={() => setExpandedSections(prev => ({ ...prev, additional: !prev.additional }))}
                  className="flex items-center justify-between w-full mb-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-br from-pink-500 to-rose-600 rounded-md shadow-sm">
                      <Star className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-800">{copy.additionalInfo}</h3>
                  </div>
                  {expandedSections.additional ? <Minimize2 className="h-4 w-4 text-gray-600" /> : <Maximize2 className="h-4 w-4 text-gray-600" />}
                </button>
                {expandedSections.additional && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {/* Skill Level Filter */}
                    {uniqueSkillLevels.length > 0 && (
                      <div className="group">
                        <Label htmlFor="skill-level-filter" className="flex items-center gap-1.5 mb-1.5 text-xs font-medium text-gray-700">
                          <div className="p-1 bg-gradient-to-br from-yellow-400 to-orange-400 rounded shadow-sm">
                            <Star className="h-3 w-3 text-white" />
                          </div>
                          {copy.skillLevel}
                        </Label>
                        <Select value={filterSkillLevel} onValueChange={setFilterSkillLevel}>
                          <SelectTrigger className="bg-white border border-gray-200 hover:border-yellow-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-200 rounded-md transition-all duration-200 shadow-sm hover:shadow text-sm h-9">
                            <SelectValue placeholder={copy.chooseSkillLevel} />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            <SelectItem value="all" className="pl-2">{copy.allLevels}</SelectItem>
                            {uniqueSkillLevels.map(level => (
                              <SelectItem key={level} value={level} className="flex items-center gap-2 pl-2">
                                <span className="text-base flex-shrink-0">⭐</span>
                                <span className="flex-1">{level}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Phone Filter */}
                    <div className="group">
                      <Label htmlFor="phone-filter" className="flex items-center gap-1.5 mb-1.5 text-xs font-medium text-gray-700">
                        <div className="p-1 bg-gradient-to-br from-teal-400 to-cyan-400 rounded shadow-sm">
                          <Smartphone className="h-3 w-3 text-white" />
                        </div>
                        {copy.phone}
                      </Label>
                      <div className="relative">
                        <Smartphone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-teal-500 h-3.5 w-3.5 z-10" />
                        <Input
                          id="phone-filter"
                          type="text"
                          placeholder={copy.phonePlaceholder}
                          value={filterPhone}
                          onChange={(e) => setFilterPhone(e.target.value)}
                          className="pr-10 bg-white border border-gray-200 hover:border-teal-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-200 rounded-md transition-all duration-200 shadow-sm hover:shadow text-sm h-9"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-lg p-3 shadow-md border border-blue-300">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-md shadow-sm">
                      <Search className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold text-white mb-1 flex items-center gap-1.5">
                      <span className="text-base">💡</span>
                      {copy.importantNote}
                    </h4>
                    <p className="text-xs text-blue-50 leading-relaxed">
                      {copy.filtersNoteStart}<strong className="text-white font-semibold">{copy.filtersNoteStrong}</strong>{copy.filtersNoteEnd}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {copy.resultsSummary.replace('{{filtered}}', String(filteredPlayers.length)).replace('{{total}}', String(players.length))}
            </div>
            <div className="text-sm text-gray-600">
              {copy.pageSummary.replace('{{current}}', String(currentPage)).replace('{{total}}', String(totalPages))}
            </div>
          </div>
        </div>

        {/* Players Grid */}
        {pagedPlayers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{copy.noResults}</h3>
            <p className="text-gray-600">{copy.noResultsDesc}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {pagedPlayers.map((player) => {
              const playerAccountType = getPlayerAccountType(player);
              const imageUrl = getPlayerAvatarUrl(player);

              return (
                <Card key={player.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                  <div className="relative w-full shrink-0">
                    {imageUrl ? (
                      <div className="w-full h-64 sm:h-72 md:h-80 lg:h-96 bg-gray-100 overflow-hidden">
                        <img
                          src={imageUrl}
                          alt={player.full_name || player.name || copy.defaultPlayer}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/default-player-avatar.png'; // Fallback to professional 3D avatar
                            // target.style.display = 'none'; // Old behavior was to hide
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-64 sm:h-72 md:h-80 lg:h-96 bg-gray-100 flex items-center justify-center overflow-hidden">
                        <img
                          src="/default-player-avatar.png"
                          alt="placeholder"
                          className="w-full h-full object-contain opacity-80"
                        />
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
                      {player.full_name || player.name || copy.unknownPlayer}
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
                          // Dispatch in-app + ChatAman notification for profile view
                          if (user && user.id !== player.id) {
                            const viewerName = userData?.full_name || userData?.name || user.user_metadata?.full_name || copy.defaultUser;
                            const viewerType = userData?.accountType || userData?.type || 'user';
                            dispatchNotification({
                              eventType: 'profile_view',
                              targetUserId: player.id,
                              actorId: user.id,
                              actorName: viewerName,
                              actorAccountType: viewerType,
                            });
                          }

                          // الانتقال لملف اللاعب مع حفظ رقم الصفحة الحالي
                          const params = new URLSearchParams(window.location.search);
                          if (currentPage > 1) {
                            params.set('page', currentPage.toString());
                          } else {
                            params.delete('page');
                          }
                          const returnUrl = params.toString() ? `?${params.toString()}` : '';
                          const fullReturnPath = window.location.pathname + returnUrl;
                          console.log('🔗 حفظ المسار للعودة:', { currentPage, returnPath: fullReturnPath });
                          router.push(`/dashboard/shared/player-profile/${player.id}?returnPath=${encodeURIComponent(fullReturnPath)}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {copy.viewProfile}
                      </Button>

                      <SendMessageButton
                        user={user}
                        userData={user}
                        getUserDisplayName={() => user?.user_metadata?.full_name || user?.email || copy.defaultUser}
                        targetUserId={player.id}
                        targetUserName={player.full_name || player.name || copy.defaultPlayer}
                        targetUserType="player"
                        buttonSize="sm"
                        className="flex-1 bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100"
                        buttonText={copy.message}
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
            onPageChange={(page) => {
              isUpdatingFromUser.current = true;
              setCurrentPage(page);
              updatePageInURL(page);
            }}
            playersPerPage={playersPerPage}
            totalPlayers={filteredPlayers.length}
            onPlayersPerPageChange={handlePlayersPerPageChange}
            copy={copy}
          />
        )}
      </div>
    </div>
  );
}
