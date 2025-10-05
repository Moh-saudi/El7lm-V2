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
import { secureConsole } from '@/lib/utils/secure-console';
import { ensurePlayerProfileData } from '@/lib/utils/player-data-migration';
import { supabase, STORAGE_BUCKETS } from '@/lib/supabase/config';

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

  return [debouncedValue];
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
  isDeleted?: boolean; // Added isDeleted field
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
  const pages = [];
  const maxVisiblePages = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  
  return (
    <div className="flex flex-col items-center gap-4 mt-8">
      {/* معلومات التصفح واختيار عدد الكروت */}
      <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-gray-600 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            عرض {currentPagePlayers} من {totalPlayers} لاعب
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            الصفحة {currentPage} من {totalPages}
          </span>
        </div>
        
        {/* اختيار عدد الكروت في الصفحة */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            عدد الكروت:
          </span>
          <Select value={playersPerPage.toString()} onValueChange={(value) => onPlayersPerPageChange(parseInt(value))}>
            <SelectTrigger className="w-20 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">6</SelectItem>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="18">18</SelectItem>
              <SelectItem value="24">24</SelectItem>
              <SelectItem value="36">36</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* أزرار التصفح */}
      <div className="flex justify-center items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-md transition-all duration-200"
      >
          ← السابق
      </Button>
      
      {pages.map((page) => (
        <Button
          key={page}
          variant={currentPage === page ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(page)}
            className={`px-4 py-2 font-bold transition-all duration-200 ${
              currentPage === page 
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg scale-105' 
                : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300 hover:from-gray-200 hover:to-gray-300 hover:shadow-md'
            }`}
        >
          {page}
        </Button>
      ))}
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-md transition-all duration-200"
      >
          التالي →
      </Button>
      </div>
    </div>
  );
};

export default function PlayersSearchPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  
  // Debug: Confirm new code is loaded
  secureConsole.log('🔧 [COMPONENT] PlayersSearchPage component loaded with new debugging code');

  
  // State variables
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [playersPerPage, setPlayersPerPage] = useState(12);
  
  // Filter states
  const [filterPosition, setFilterPosition] = useState('all');
  const [filterNationality, setFilterNationality] = useState('all');
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterAccountType, setFilterAccountType] = useState('all');
  const [filterAge, setFilterAge] = useState('all');
  const [filterDependency, setFilterDependency] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSkillLevel, setFilterSkillLevel] = useState('all');
  const [filterObjective, setFilterObjective] = useState('all');
  
  // UI states
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Handle players per page change
  const handlePlayersPerPageChange = useCallback((newPlayersPerPage: number) => {
    setPlayersPerPage(newPlayersPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  }, []);

  // Setup current user info
  const setupCurrentUserInfo = useCallback(() => {
    secureConsole.log('🔍 setupCurrentUserInfo: إعداد معلومات المستخدم');
    
    if (user?.uid) {
      secureConsole.log('🔒 [SENSITIVE] 👤 User UID:', user.uid);
      secureConsole.log('🔒 [SENSITIVE] 📧 User Email:', user.email);
    }
    
    if (userData) {
      secureConsole.log('🎯 Account Type Required: trainer');
      secureConsole.log('🔒 [SENSITIVE] 💾 UserData:', userData);
      
      if (userData.accountType !== 'trainer') {
        secureConsole.warn(' ⚠️ عدم تطابق نوع الحساب: المطلوب trainer، الموجود ' + userData.accountType + ' - لكن سيتم السماح بالوصول');
      }
    }
  }, [user, userData]);

  // Function to handle missing player profile data
  const handleMissingPlayerData = useCallback(async (playerId: string) => {
    try {
      secureConsole.log(`🔧 محاولة إصلاح بيانات اللاعب المفقودة: ${playerId}`);
      const success = await ensurePlayerProfileData(playerId);
      if (success) {
        secureConsole.log(`✅ تم إصلاح بيانات اللاعب: ${playerId}`);
        // Refresh the data after migration
        setTimeout(() => {
          loadPlayers();
        }, 1000);
      } else {
        secureConsole.warn(`❌ فشل في إصلاح بيانات اللاعب: ${playerId}`);
      }
    } catch (error) {
      secureConsole.error(`❌ خطأ في إصلاح بيانات اللاعب ${playerId}:`, error);
    }
  }, []);

  // دالة لتحديد نوع الحساب من بيانات اللاعب
  const getPlayerAccountType = useCallback((player: any) => {
    if (player.trainer_id || player.trainerId) {
      return 'trainer';
    }
    if (player.club_id || player.clubId) {
      return 'club';
    }
    if (player.agent_id || player.agentId) {
      return 'agent';
    }
    if (player.academy_id || player.academyId) {
      return 'academy';
    }
    return 'independent'; // اللاعبين المستقلين
  }, []);

  // دالة للتحقق من وجود الصورة في بوكتات Supabase
  const checkSupabaseImage = useCallback(async (playerId: string, player?: any) => {
    try {
      // تحديد البوكت المناسب أولاً بناءً على نوع الحساب
      let primaryBucket = 'avatars'; // افتراضي للاعبين المستقلين
      
      if (player) {
        const accountType = getPlayerAccountType(player);
        switch (accountType) {
          case 'trainer':
            primaryBucket = 'playertrainer';
            break;
          case 'club':
            primaryBucket = 'playerclub';
            break;
          case 'agent':
            primaryBucket = 'playeragent';
            break;
          case 'academy':
            primaryBucket = 'playeracademy';
            break;
          case 'independent':
          default:
            primaryBucket = 'avatars';
            break;
        }
      }

      // قائمة البوكتات - البوكت المناسب أولاً، ثم باقي البوكتات
      const buckets = [
        primaryBucket,
        'avatars',        // للاعبين المستقلين
        'playerclub',     // للاعبين التابعين للنادي
        'playeracademy',  // للاعبين التابعين للأكاديمية
        'playertrainer',  // للاعبين التابعين للمدرب
        'playeragent'     // للاعبين التابعين للوكيل
      ].filter((bucket, index, array) => array.indexOf(bucket) === index); // إزالة التكرار

      // امتدادات الملفات المحتملة
      const extensions = ['jpg', 'png', 'jpeg', 'webp'];

      secureConsole.log(`🔍 [checkSupabaseImage] البحث عن صورة اللاعب ${playerId} في البوكتات:`, buckets);

      // التحقق من كل بوكت وكل امتداد
      for (const bucket of buckets) {
        for (const ext of extensions) {
          const path = `${playerId}.${ext}`;
          
          try {
            const { data } = await supabase.storage
              .from(bucket)
              .getPublicUrl(path);
            
            if (data?.publicUrl) {
              // التحقق من أن الصورة موجودة فعلاً
              const response = await fetch(data.publicUrl, { method: 'HEAD' });
              if (response.ok) {
                secureConsole.log(`✅ [checkSupabaseImage] وجدت صورة في بوكت ${bucket}:`, data.publicUrl);
                return data.publicUrl;
              }
            }
          } catch (bucketError) {
            // تجاهل الأخطاء وتابع البحث
            continue;
          }
        }
      }

      secureConsole.log(`❌ [checkSupabaseImage] لم توجد صورة للاعب ${playerId} في أي بوكت`);
      return null;
    } catch (error) {
      secureConsole.warn('خطأ في التحقق من صورة Supabase:', error);
      return null;
    }
  }, [getPlayerAccountType]);

  // دالة لاستخراج الصورة من جميع الحقول المحتملة - محسنة مثل صفحة الملف الشخصي
  const getPlayerImage = useCallback((player: any) => {
    // نفس منطق صفحة الملف الشخصي
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
    
    // تسجيل تفاصيل اللاعب للتشخيص
    if (player.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92') {
      secureConsole.log('🔍 [getPlayerImage] تحليل بيانات اللاعب المحدد:', {
        playerId: player.id,
        playerName: player.full_name || player.name,
        allImageFields: {
          profile_image_url: player.profile_image_url,
          profile_image: player.profile_image,
          avatar: player.avatar,
          photoURL: player.photoURL,
          profilePicture: player.profilePicture,
          image: player.image,
          photo: player.photo,
          picture: player.picture,
          profile_picture: player.profile_picture,
          profilePhoto: player.profilePhoto
        }
      });
      
      // تشخيص مفصل لكل حقل صورة
      secureConsole.log('🔍 [getPlayerImage] تشخيص مفصل للحقول:', {
        profile_image_url: player.profile_image_url,
        profile_image: player.profile_image,
        avatar: player.avatar,
        photoURL: player.photoURL,
        profilePicture: player.profilePicture,
        image: player.image,
        photo: player.photo,
        picture: player.picture,
        profile_picture: player.profile_picture,
        profilePhoto: player.profilePhoto
      });
      
      // تشخيص أكثر تفصيلاً - طباعة كل حقل منفصل
      secureConsole.log('🔍 [getPlayerImage] تفاصيل كل حقل:');
      secureConsole.log('  - profile_image_url:', player.profile_image_url);
      secureConsole.log('  - profile_image:', player.profile_image);
      secureConsole.log('  - avatar:', player.avatar);
      secureConsole.log('  - photoURL:', player.photoURL);
      secureConsole.log('  - profilePicture:', player.profilePicture);
      secureConsole.log('  - image:', player.image);
      secureConsole.log('  - photo:', player.photo);
      secureConsole.log('  - picture:', player.picture);
      secureConsole.log('  - profile_picture:', player.profile_picture);
      secureConsole.log('  - profilePhoto:', player.profilePhoto);
      
      // التحقق من البوكتات
      secureConsole.log('🔍 [getPlayerImage] التحقق من بوكتات Supabase للاعب المحدد...');
      checkSupabaseImage(player.id, player).then((supabaseImageUrl) => {
        if (supabaseImageUrl) {
          secureConsole.log('✅ [getPlayerImage] وجدت صورة في بوكتات Supabase:', supabaseImageUrl);
          // إذا وجدت الصورة في Supabase، أضيفها للاعب
          if (!player.profile_image_url) {
            player.profile_image_url = supabaseImageUrl;
            secureConsole.log('✅ [getPlayerImage] تم إضافة الصورة من Supabase للاعب:', supabaseImageUrl);
            return supabaseImageUrl;
          }
        } else {
          secureConsole.log('❌ [getPlayerImage] لم توجد صورة في بوكتات Supabase');
        }
      });
      
      // تشخيص مفصل مثل صفحة الملف الشخصي
      secureConsole.log('🔍 [getPlayerImage] تشخيص مفصل مثل صفحة الملف الشخصي:');
      const imageFields = [
        player.profile_image_url,
        player.profile_image,
        player.avatar,
        player.photoURL,
        player.profilePicture,
        player.image
      ];
      
      for (const field of imageFields) {
        if (field) {
          if (typeof field === 'string' && field.trim() !== '') {
            secureConsole.log('✅ [getPlayerImage] وجدت صورة في حقل string:', field);
            return field;
          }
          if (typeof field === 'object' && field !== null && field.url) {
            secureConsole.log('✅ [getPlayerImage] وجدت صورة في حقل object:', field.url);
            return field.url;
          }
        }
      }
      
      secureConsole.log('⚠️ [getPlayerImage] لم يتم العثور على صورة في أي حقل');
    }
    
    // تسجيل تفاصيل اللاعب الثاني للتشخيص
    if (player.id === 'RF46N9BxiQRLVKB5s36LMzdWKYn2') {
      secureConsole.log('🔍 [getPlayerImage] تحليل بيانات اللاعب الثاني:', {
        playerId: player.id,
        playerName: player.full_name || player.name,
        allImageFields: {
          profile_image_url: player.profile_image_url,
          profile_image: player.profile_image,
          avatar: player.avatar,
          photoURL: player.photoURL,
          profilePicture: player.profilePicture,
          image: player.image,
          photo: player.photo,
          picture: player.picture,
          profile_picture: player.profile_picture,
          profilePhoto: player.profilePhoto
        },
        allPlayerFields: Object.keys(player).reduce((acc, key) => {
          acc[key] = player[key];
          return acc;
        }, {} as any)
      });
      
      // تشخيص مفصل لكل حقل صورة للاعب الثاني
      secureConsole.log('🔍 [getPlayerImage] تشخيص مفصل للحقول - اللاعب الثاني:', {
        profile_image_url: player.profile_image_url,
        profile_image: player.profile_image,
        avatar: player.avatar,
        photoURL: player.photoURL,
        profilePicture: player.profilePicture,
        image: player.image,
        photo: player.photo,
        picture: player.picture,
        profile_picture: player.profile_picture,
        profilePhoto: player.profilePhoto
      });
      
      // تشخيص أكثر تفصيلاً للاعب الثاني - طباعة كل حقل منفصل
      secureConsole.log('🔍 [getPlayerImage] تفاصيل كل حقل - اللاعب الثاني:');
      secureConsole.log('  - profile_image_url:', player.profile_image_url);
      secureConsole.log('  - profile_image:', player.profile_image);
      secureConsole.log('  - avatar:', player.avatar);
      secureConsole.log('  - photoURL:', player.photoURL);
      secureConsole.log('  - profilePicture:', player.profilePicture);
      secureConsole.log('  - image:', player.image);
      secureConsole.log('  - photo:', player.photo);
      secureConsole.log('  - picture:', player.picture);
      secureConsole.log('  - profile_picture:', player.profile_picture);
      secureConsole.log('  - profilePhoto:', player.profilePhoto);
      
      // التحقق من البوكتات للاعب الثاني
      secureConsole.log('🔍 [getPlayerImage] التحقق من بوكتات Supabase للاعب الثاني...');
      checkSupabaseImage(player.id).then((supabaseImageUrl) => {
        if (supabaseImageUrl) {
          secureConsole.log('✅ [getPlayerImage] وجدت صورة في بوكتات Supabase للاعب الثاني:', supabaseImageUrl);
          // إذا وجدت الصورة في Supabase، أضيفها للاعب
          if (!player.profile_image_url) {
            player.profile_image_url = supabaseImageUrl;
            secureConsole.log('✅ [getPlayerImage] تم إضافة الصورة من Supabase للاعب:', supabaseImageUrl);
            return supabaseImageUrl;
          }
        } else {
          secureConsole.log('❌ [getPlayerImage] لم توجد صورة في بوكتات Supabase للاعب الثاني');
        }
      });
      
      // تشخيص مفصل مثل صفحة الملف الشخصي للاعب الثاني
      secureConsole.log('🔍 [getPlayerImage] تشخيص مفصل مثل صفحة الملف الشخصي للاعب الثاني:');
      const imageFields = [
        player.profile_image_url,
        player.profile_image,
        player.avatar,
        player.photoURL,
        player.profilePicture,
        player.image
      ];
      
      for (const field of imageFields) {
        if (field) {
          if (typeof field === 'string' && field.trim() !== '') {
            secureConsole.log('✅ [getPlayerImage] وجدت صورة في حقل string للاعب الثاني:', field);
            return field;
          }
          if (typeof field === 'object' && field !== null && field.url) {
            secureConsole.log('✅ [getPlayerImage] وجدت صورة في حقل object للاعب الثاني:', field.url);
            return field.url;
          }
        }
      }
      
      secureConsole.log('⚠️ [getPlayerImage] لم يتم العثور على صورة في أي حقل للاعب الثاني');
    }
    
    // نفس منطق صفحة الملف الشخصي
    for (const field of imageFields) {
      if (field) {
        // إذا كان string، استخدمه مباشرة
        if (typeof field === 'string' && field.trim() !== '') {
          // تحقق من أن الصورة ليست فارغة أو خاطئة
          if (field !== 'undefined' && field !== 'null' && field !== '[object Object]') {
            if (player.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92') {
              secureConsole.log(`✅ [getPlayerImage] وجدت صورة في حقل string:`, field);
            }
            if (player.id === 'RF46N9BxiQRLVKB5s36LMzdWKYn2') {
              secureConsole.log(`✅ [getPlayerImage] وجدت صورة للاعب الثاني في حقل string:`, field);
            }
            return field;
          }
        }
        // إذا كان object مع url، استخدم الـ url
        if (typeof field === 'object' && field !== null && field.url) {
          if (field.url && typeof field.url === 'string' && field.url.trim() !== '') {
            if (player.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92') {
              secureConsole.log(`✅ [getPlayerImage] وجدت صورة في حقل object:`, field.url);
            }
            if (player.id === 'RF46N9BxiQRLVKB5s36LMzdWKYn2') {
              secureConsole.log(`✅ [getPlayerImage] وجدت صورة للاعب الثاني في حقل object:`, field.url);
            }
            return field.url;
          }
        }
      }
    }
    
    if (player.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92') {
      secureConsole.warn('❌ [getPlayerImage] لم يتم العثور على صورة للاعب المحدد');
    }
    
    if (player.id === 'RF46N9BxiQRLVKB5s36LMzdWKYn2') {
      secureConsole.warn('❌ [getPlayerImage] لم يتم العثور على صورة للاعب الثاني');
    }
    
    return null;
  }, []);

  // دالة تشخيص شاملة لجميع الصور
  const diagnoseAllPlayerImages = useCallback((players: Player[]) => {
    secureConsole.log('🔍 [Image Diagnosis] بدء تشخيص جميع صور اللاعبين...');
    
    let playersWithImages = 0;
    let playersWithoutImages = 0;
    const imageFieldStats = {
      profile_image_url: 0,
      profile_image: 0,
      avatar: 0,
      photoURL: 0,
      profilePicture: 0,
      image: 0,
      photo: 0,
      picture: 0,
      profile_picture: 0,
      profilePhoto: 0
    };
    
    const samplePlayersWithoutImages: any[] = [];
    const samplePlayersWithImages: any[] = [];
    
    players.forEach((player, index) => {
      const foundImage = getPlayerImage(player);
      if (foundImage) {
        playersWithImages++;
        if (samplePlayersWithImages.length < 3) {
          samplePlayersWithImages.push({
            id: player.id,
            name: player.full_name || player.name,
            imageUrl: foundImage,
            allImageFields: {
              profile_image_url: player.profile_image_url,
              profile_image: player.profile_image,
              avatar: player.avatar,
              photoURL: (player as any).photoURL,
              profilePicture: (player as any).profilePicture,
              image: (player as any).image,
              photo: (player as any).photo,
              picture: (player as any).picture,
              profile_picture: (player as any).profile_picture,
              profilePhoto: (player as any).profilePhoto
            }
          });
        }
      } else {
        playersWithoutImages++;
        if (samplePlayersWithoutImages.length < 3) {
          samplePlayersWithoutImages.push({
            id: player.id,
            name: player.full_name || player.name,
            accountType: player.accountType,
            allImageFields: {
              profile_image_url: player.profile_image_url,
              profile_image: player.profile_image,
              avatar: player.avatar,
              photoURL: (player as any).photoURL,
              profilePicture: (player as any).profilePicture,
              image: (player as any).image,
              photo: (player as any).photo,
              picture: (player as any).picture,
              profile_picture: (player as any).profile_picture,
              profilePhoto: (player as any).profilePhoto
            }
          });
        }
      }
      
      // إحصائيات الحقول
      Object.keys(imageFieldStats).forEach(field => {
        const value = (player as any)[field];
        if (value && typeof value === 'string' && value.trim() !== '' && 
            value !== 'undefined' && value !== 'null' && value !== '[object Object]') {
          imageFieldStats[field as keyof typeof imageFieldStats]++;
        }
      });
    });
    
    secureConsole.log('📊 [Image Diagnosis] إحصائيات الصور:', {
      totalPlayers: players.length,
      playersWithImages,
      playersWithoutImages,
      percentageWithImages: Math.round((playersWithImages / players.length) * 100),
      imageFieldStats,
      samplePlayersWithImages,
      samplePlayersWithoutImages
    });
    
    // تشخيص خاص للاعب المحدد
    const targetPlayer = players.find(p => p.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92');
    if (targetPlayer) {
      secureConsole.log('🎯 [Image Diagnosis] تشخيص اللاعب المحدد:', {
        id: targetPlayer.id,
        name: targetPlayer.full_name || targetPlayer.name,
        foundImage: getPlayerImage(targetPlayer),
        allImageFields: {
          profile_image_url: targetPlayer.profile_image_url,
          profile_image: targetPlayer.profile_image,
          avatar: targetPlayer.avatar,
          photoURL: (targetPlayer as any).photoURL,
          profilePicture: (targetPlayer as any).profilePicture,
          image: (targetPlayer as any).image,
          photo: (targetPlayer as any).photo,
          picture: (targetPlayer as any).picture,
          profile_picture: (targetPlayer as any).profile_picture,
          profilePhoto: (targetPlayer as any).profilePhoto
        }
      });
    }
  }, [getPlayerImage]);

  // Load players data
  const loadPlayers = useCallback(async () => {
    if (!user?.uid) return;
    
      setIsLoading(true);
    try {
      secureConsole.log('🔧 [DEBUG] تم تحميل الكود الجديد - بدء التشخيص المتقدم');
      const allPlayers: Player[] = [];

      // Fetch dependent players then filter locally to avoid composite index and include docs without isDeleted
      // استخدام pagination لجلب جميع اللاعبين
      let dependentPlayers: Player[] = [];
      let lastDoc1 = null;
      let hasMore1 = true;
      
      while (hasMore1) {
        let playersQuery;
        if (lastDoc1) {
          playersQuery = query(
            collection(db, 'players'),
            orderBy('createdAt', 'desc'),
            startAfter(lastDoc1),
            limit(500)
          );
        } else {
          playersQuery = query(
            collection(db, 'players'),
            orderBy('createdAt', 'desc'),
            limit(500)
          );
        }
        
        const playersSnapshot = await getDocs(playersQuery);
        const batchPlayers = playersSnapshot.docs
          .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
          .filter((p: any) => p.isDeleted !== true) as Player[];
        
        // تسجيل تفاصيل اللاعب المحدد للتشخيص
        const targetPlayer = batchPlayers.find(p => p.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92');
        if (targetPlayer) {
          secureConsole.log('🔍 [fetchPlayers] وجدت اللاعب المحدد في مجموعة players:', {
            playerId: targetPlayer.id,
            playerName: targetPlayer.full_name || targetPlayer.name,
            hasProfileImage: !!(targetPlayer.profile_image || targetPlayer.profile_image_url || targetPlayer.avatar),
            profileImageUrl: targetPlayer.profile_image_url,
            profileImage: targetPlayer.profile_image,
            avatar: targetPlayer.avatar,
            allFields: Object.keys(targetPlayer)
          });
        }
        
        dependentPlayers.push(...batchPlayers);
        
        if (playersSnapshot.docs.length < 500) {
          hasMore1 = false;
        } else {
          lastDoc1 = playersSnapshot.docs[playersSnapshot.docs.length - 1];
        }
      }
      
      secureConsole.log('📊 تم جلب', dependentPlayers.length, 'لاعب تابع من مجموعة players');
      
          // Log specific player data for debugging
          const targetPlayer = dependentPlayers.find(p => p.id === '9Kdp3IhbyKPAozGUKdPLxEEtkME3');
          const targetPlayer2 = dependentPlayers.find(p => p.id === 'RF46N9BxiQRLVKB5s36LMzdWKYn2');
          if (targetPlayer) {
            secureConsole.log('🎯 بيانات اللاعب المحدد في صفحة البحث:', {
              id: targetPlayer.id,
              name: targetPlayer.full_name || targetPlayer.name,
              profile_image: targetPlayer.profile_image,
              profile_image_url: targetPlayer.profile_image_url,
              avatar: targetPlayer.avatar,
              hasImage: !!(targetPlayer.profile_image || targetPlayer.profile_image_url || targetPlayer.avatar),
              // إضافة جميع الحقول المحتملة للصور
              foundImage: getPlayerImage(targetPlayer),
              allImageFields: {
                profile_image: targetPlayer.profile_image,
                profile_image_url: targetPlayer.profile_image_url,
                avatar: targetPlayer.avatar,
                photoURL: (targetPlayer as any).photoURL,
                profilePicture: (targetPlayer as any).profilePicture,
                image: (targetPlayer as any).image,
                photo: (targetPlayer as any).photo,
                picture: (targetPlayer as any).picture,
                profile_picture: (targetPlayer as any).profile_picture,
                profilePhoto: (targetPlayer as any).profilePhoto
              },
              // إضافة معلومات إضافية
              accountType: targetPlayer.accountType,
              isDeleted: targetPlayer.isDeleted,
              createdAt: (targetPlayer as any).createdAt
            });
          } else {
            secureConsole.log('❌ اللاعب المحدد غير موجود في مجموعة players');
          }
          
          if (targetPlayer2) {
            secureConsole.log('🎯 بيانات اللاعب الثاني المحدد في صفحة البحث:', {
              id: targetPlayer2.id,
              name: targetPlayer2.full_name || targetPlayer2.name,
              profile_image: targetPlayer2.profile_image,
              profile_image_url: targetPlayer2.profile_image_url,
              avatar: targetPlayer2.avatar,
              hasImage: !!(targetPlayer2.profile_image || targetPlayer2.profile_image_url || targetPlayer2.avatar),
              // إضافة جميع الحقول المحتملة للصور
              foundImage: getPlayerImage(targetPlayer2),
              allImageFields: {
                profile_image: targetPlayer2.profile_image,
                profile_image_url: targetPlayer2.profile_image_url,
                avatar: targetPlayer2.avatar,
                image: (targetPlayer2 as any).image,
                photo: (targetPlayer2 as any).photo,
                picture: (targetPlayer2 as any).picture,
                profile_picture: (targetPlayer2 as any).profile_picture,
                profilePhoto: (targetPlayer2 as any).profilePhoto,
                profilePicture: (targetPlayer2 as any).profilePicture
              },
              // إضافة معلومات إضافية
              accountType: targetPlayer2.accountType,
              isDeleted: targetPlayer2.isDeleted,
              createdAt: (targetPlayer2 as any).createdAt
            });
          } else {
            secureConsole.log('❌ اللاعب الثاني المحدد غير موجود في مجموعة players');
          }
      
      allPlayers.push(...dependentPlayers);
      
      // Fetch players from player collection first
      // استخدام pagination لجلب جميع اللاعبين
      let playerCollectionPlayers: Player[] = [];
      let lastDoc3 = null;
      let hasMore3 = true;
      
      while (hasMore3) {
        let playerCollectionQuery;
        if (lastDoc3) {
          playerCollectionQuery = query(
            collection(db, 'player'),
            orderBy('createdAt', 'desc'),
            startAfter(lastDoc3),
            limit(500)
          );
        } else {
          playerCollectionQuery = query(
            collection(db, 'player'),
            orderBy('createdAt', 'desc'),
            limit(500)
          );
        }
        
        const playerCollectionSnapshot = await getDocs(playerCollectionQuery);
        const batchPlayers = playerCollectionSnapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as any)
        })) as Player[];
        
        playerCollectionPlayers.push(...batchPlayers);
        
        if (playerCollectionSnapshot.docs.length < 500) {
          hasMore3 = false;
        } else {
          lastDoc3 = playerCollectionSnapshot.docs[playerCollectionSnapshot.docs.length - 1];
        }
      }
      
      secureConsole.log('📊 تم جلب', playerCollectionPlayers.length, 'لاعب من مجموعة player');
      
      // Fetch independent players from users collection (no composite index), then filter locally
      // استخدام pagination لجلب جميع اللاعبين
      let usersIndependentPlayers: Player[] = [];
      let lastDoc2 = null;
      let hasMore2 = true;
      
      while (hasMore2) {
        let usersQuery;
        if (lastDoc2) {
          usersQuery = query(
            collection(db, 'users'),
            where('accountType', '==', 'player'),
            startAfter(lastDoc2),
            limit(500)
          );
        } else {
          usersQuery = query(
            collection(db, 'users'),
            where('accountType', '==', 'player'),
            limit(500)
          );
        }
        
        const usersSnapshot = await getDocs(usersQuery);
        const batchPlayers = usersSnapshot.docs
          .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
          .filter((player: any) => player.accountType === 'player' && player.isDeleted !== true) as Player[];
        
        // تسجيل تفاصيل اللاعب المحدد في مجموعة users للتشخيص
        const targetUser = batchPlayers.find(p => p.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92');
        if (targetUser) {
          secureConsole.log('🔍 [fetchPlayers] وجدت اللاعب المحدد في مجموعة users:', {
            playerId: targetUser.id,
            playerName: targetUser.full_name || targetUser.name,
            hasProfileImage: !!(targetUser.profile_image || targetUser.profile_image_url || targetUser.avatar),
            profileImageUrl: targetUser.profile_image_url,
            profileImage: targetUser.profile_image,
            avatar: targetUser.avatar,
            allFields: Object.keys(targetUser)
          });
        }
        
        usersIndependentPlayers.push(...batchPlayers);
        
        if (usersSnapshot.docs.length < 500) {
          hasMore2 = false;
        } else {
          lastDoc2 = usersSnapshot.docs[usersSnapshot.docs.length - 1];
        }
      }
      
      secureConsole.log('📊 تم جلب', usersIndependentPlayers.length, 'لاعب من مجموعة users');
      
          // Log specific player data for debugging in users collection
          const targetPlayerInUsers = usersIndependentPlayers.find(p => p.id === '9Kdp3IhbyKPAozGUKdPLxEEtkME3');
          const targetPlayer2InUsers = usersIndependentPlayers.find(p => p.id === 'RF46N9BxiQRLVKB5s36LMzdWKYn2');
          if (targetPlayerInUsers) {
            secureConsole.log('🎯 بيانات اللاعب المحدد في مجموعة users:', {
              id: targetPlayerInUsers.id,
              name: targetPlayerInUsers.full_name || targetPlayerInUsers.name,
              foundImage: getPlayerImage(targetPlayerInUsers),      
              allImageFields: {
                profile_image: targetPlayerInUsers.profile_image,   
                profile_image_url: targetPlayerInUsers.profile_image_url,
                avatar: targetPlayerInUsers.avatar,
                image: (targetPlayerInUsers as any).image,
                photo: (targetPlayerInUsers as any).photo,
                picture: (targetPlayerInUsers as any).picture       
              },
              hasImage: !!getPlayerImage(targetPlayerInUsers)       
            });
          }
          
          if (targetPlayer2InUsers) {
            secureConsole.log('🎯 بيانات اللاعب الثاني المحدد في مجموعة users:', {
              id: targetPlayer2InUsers.id,
              name: targetPlayer2InUsers.full_name || targetPlayer2InUsers.name,
              foundImage: getPlayerImage(targetPlayer2InUsers),     
              allImageFields: {
                profile_image: targetPlayer2InUsers.profile_image,  
                profile_image_url: targetPlayer2InUsers.profile_image_url,
                avatar: targetPlayer2InUsers.avatar,
                photoURL: (targetPlayer2InUsers as any).photoURL,   
                profilePicture: (targetPlayer2InUsers as any).profilePicture,
                image: (targetPlayer2InUsers as any).image,
                photo: (targetPlayer2InUsers as any).photo,
                picture: (targetPlayer2InUsers as any).picture      
              },
              hasImage: !!getPlayerImage(targetPlayer2InUsers),     
              // إضافة جميع البيانات للفحص
              fullData: targetPlayer2InUsers
            });
          } else {
            secureConsole.log('❌ اللاعب الثاني المحدد غير موجود في مجموعة users');
          }
      
      // Move the enrichedUsersPlayers mapping after all data fetching is complete
      
          // Log specific player data for debugging in player collection
          const targetPlayerInPlayerCollection = playerCollectionPlayers.find(p => p.id === '9Kdp3IhbyKPAozGUKdPLxEEtkME3');
          const targetPlayer2InPlayerCollection = playerCollectionPlayers.find(p => p.id === 'RF46N9BxiQRLVKB5s36LMzdWKYn2');
          if (targetPlayerInPlayerCollection) {
            secureConsole.log('🎯 بيانات اللاعب المحدد في مجموعة player:', {
              id: targetPlayerInPlayerCollection.id,
              name: targetPlayerInPlayerCollection.full_name || targetPlayerInPlayerCollection.name,
              foundImage: getPlayerImage(targetPlayerInPlayerCollection),
              allImageFields: {
                profile_image: targetPlayerInPlayerCollection.profile_image,
                profile_image_url: targetPlayerInPlayerCollection.profile_image_url,
                avatar: targetPlayerInPlayerCollection.avatar,
                photoURL: (targetPlayerInPlayerCollection as any).photoURL,
                profilePicture: (targetPlayerInPlayerCollection as any).profilePicture,
                image: (targetPlayerInPlayerCollection as any).image,
                photo: (targetPlayerInPlayerCollection as any).photo,
                picture: (targetPlayerInPlayerCollection as any).picture
              },
              hasImage: !!getPlayerImage(targetPlayerInPlayerCollection)
            });
          }
          
          if (targetPlayer2InPlayerCollection) {
            secureConsole.log('🎯 بيانات اللاعب الثاني المحدد في مجموعة player:', {
              id: targetPlayer2InPlayerCollection.id,
              name: targetPlayer2InPlayerCollection.full_name || targetPlayer2InPlayerCollection.name,
              foundImage: getPlayerImage(targetPlayer2InPlayerCollection),
              allImageFields: {
                profile_image: targetPlayer2InPlayerCollection.profile_image,
                profile_image_url: targetPlayer2InPlayerCollection.profile_image_url,
                avatar: targetPlayer2InPlayerCollection.avatar,
                image: (targetPlayer2InPlayerCollection as any).image,
                photo: (targetPlayer2InPlayerCollection as any).photo,
                picture: (targetPlayer2InPlayerCollection as any).picture
              },
              hasImage: !!getPlayerImage(targetPlayer2InPlayerCollection)
            });
          } else {
            secureConsole.log('❌ اللاعب الثاني المحدد غير موجود في مجموعة player');
          }
      
      // دمج بيانات الصور من مجموعة player مع بيانات اللاعبين من مجموعة users
      const enrichedPlayerCollectionPlayers = playerCollectionPlayers.map(playerCollectionPlayer => {
        // البحث عن البيانات المقابلة في مجموعة users
        const matchingUser = usersIndependentPlayers.find(u => u.id === playerCollectionPlayer.id);
        if (matchingUser) {
          return {
            ...playerCollectionPlayer,
            // إضافة البيانات من مجموعة users
            email: (matchingUser as any).email,
            phone: (matchingUser as any).phone,
            accountType: (matchingUser as any).accountType,
            // الاحتفاظ ببيانات الصور من مجموعة player
            profile_image: playerCollectionPlayer.profile_image,
            profile_image_url: playerCollectionPlayer.profile_image_url,
            avatar: playerCollectionPlayer.avatar
          };
        }
        return playerCollectionPlayer;
      });
      
      allPlayers.push(...enrichedPlayerCollectionPlayers);
      
      // دمج بيانات الصور من جميع المجموعات مع بيانات اللاعبين من مجموعة users
      const enrichedUsersPlayers = usersIndependentPlayers.map(userPlayer => {
        // البحث عن الصورة في مجموعة players أولاً
        let matchingPlayer = dependentPlayers.find(p => p.id === userPlayer.id);
        
        // إذا لم توجد في players، ابحث في playerCollectionPlayers
        if (!matchingPlayer) {
          matchingPlayer = playerCollectionPlayers.find(p => p.id === userPlayer.id);
        }
        
        if (matchingPlayer) {
          return {
            ...userPlayer,
            profile_image: matchingPlayer.profile_image,
            profile_image_url: matchingPlayer.profile_image_url,
            avatar: matchingPlayer.avatar,
            // إضافة أي حقول صور أخرى
            photoURL: (matchingPlayer as any).photoURL,
            profilePicture: (matchingPlayer as any).profilePicture,
            image: (matchingPlayer as any).image,
            photo: (matchingPlayer as any).photo,
            picture: (matchingPlayer as any).picture
          };
        }
        return userPlayer;
      });
      
      allPlayers.push(...enrichedUsersPlayers);
      
      // Remove duplicates based on id - محسن بدون nested loops
      const uniquePlayersMap = new Map();
      allPlayers.forEach(player => {
        if (!uniquePlayersMap.has(player.id)) {
          uniquePlayersMap.set(player.id, player);
        } else {
          // إذا كان اللاعب موجود بالفعل، دمج البيانات مع إعطاء الأولوية للصور
          const existingPlayer = uniquePlayersMap.get(player.id);
          const mergedPlayer = {
            ...existingPlayer,
            ...player,
            // إعطاء الأولوية للصور من أي مصدر
            profile_image: player.profile_image || existingPlayer.profile_image,
            profile_image_url: player.profile_image_url || existingPlayer.profile_image_url,
            avatar: player.avatar || existingPlayer.avatar,
            photoURL: (player as any).photoURL || (existingPlayer as any).photoURL,
            profilePicture: (player as any).profilePicture || (existingPlayer as any).profilePicture,
            image: (player as any).image || (existingPlayer as any).image,
            photo: (player as any).photo || (existingPlayer as any).photo,
            picture: (player as any).picture || (existingPlayer as any).picture
          };
          uniquePlayersMap.set(player.id, mergedPlayer);
        }
      });
      const uniquePlayers = Array.from(uniquePlayersMap.values());
      
      // إضافة تحسين إضافي لضمان ظهور الصور
      const finalPlayers = uniquePlayers.map(player => {
        // إذا لم توجد صورة في الحقول الأساسية، ابحث في جميع الحقول المحتملة
        if (!player.profile_image && !player.profile_image_url && !player.avatar) {
          const allImageFields = [
            (player as any).photoURL,
            (player as any).profilePicture,
            (player as any).image,
            (player as any).photo,
            (player as any).picture,
            (player as any).profile_picture,
            (player as any).profilePhoto
          ];
          
          const foundImage = allImageFields.find(img => img && typeof img === 'string' && img.trim() !== '');
          if (foundImage) {
            return {
              ...player,
              profile_image: foundImage
            };
          }
        }
        return player;
      });
      
          // Log final player data after deduplication
          const finalTargetPlayer = finalPlayers.find(p => p.id === '9Kdp3IhbyKPAozGUKdPLxEEtkME3');
          const finalTargetPlayer2 = finalPlayers.find(p => p.id === 'RF46N9BxiQRLVKB5s36LMzdWKYn2');
          if (finalTargetPlayer) {
            secureConsole.log('🎯 بيانات اللاعب النهائية بعد إزالة التكرارات:', {
              id: finalTargetPlayer.id,
              name: finalTargetPlayer.full_name || finalTargetPlayer.name,
              foundImage: getPlayerImage(finalTargetPlayer),
              allImageFields: {
                profile_image: finalTargetPlayer.profile_image,
                profile_image_url: finalTargetPlayer.profile_image_url,
                avatar: finalTargetPlayer.avatar,
                photoURL: (finalTargetPlayer as any).photoURL,
                profilePicture: (finalTargetPlayer as any).profilePicture,
                image: (finalTargetPlayer as any).image,
                photo: (finalTargetPlayer as any).photo,
                picture: (finalTargetPlayer as any).picture
              },
              hasImage: !!getPlayerImage(finalTargetPlayer),
              totalPlayers: uniquePlayers.length
            });
          } else {
            secureConsole.log('❌ اللاعب المحدد غير موجود في النتيجة النهائية');
          }
          
          if (finalTargetPlayer2) {
            secureConsole.log('🎯 بيانات اللاعب الثاني النهائية بعد إزالة التكرارات:', {
              id: finalTargetPlayer2.id,
              name: finalTargetPlayer2.full_name || finalTargetPlayer2.name,
              foundImage: getPlayerImage(finalTargetPlayer2),
              allImageFields: {
                profile_image: finalTargetPlayer2.profile_image,
                profile_image_url: finalTargetPlayer2.profile_image_url,
                avatar: finalTargetPlayer2.avatar,
                photoURL: (finalTargetPlayer2 as any).photoURL,
                profilePicture: (finalTargetPlayer2 as any).profilePicture,
                image: (finalTargetPlayer2 as any).image,
                photo: (finalTargetPlayer2 as any).photo,
                picture: (finalTargetPlayer2 as any).picture
              },
              hasImage: !!getPlayerImage(finalTargetPlayer2),
              totalPlayers: uniquePlayers.length
            });
          } else {
            secureConsole.log('❌ اللاعب الثاني المحدد غير موجود في النتيجة النهائية');
          }

      secureConsole.log('📊 إجمالي اللاعبين الفريدين (مستقلين + تابعين):', finalPlayers.length);
      
      // Check if the problematic player is in finalPlayers
      const problematicPlayerInFinal = finalPlayers.find(p => p.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92');
      if (problematicPlayerInFinal) {
        secureConsole.log('🔍 [Migration Debug] Problematic player found in finalPlayers:', {
          id: problematicPlayerInFinal.id,
          name: problematicPlayerInFinal.full_name || problematicPlayerInFinal.name,
          accountType: problematicPlayerInFinal.accountType,
          hasImage: !!(problematicPlayerInFinal.profile_image || problematicPlayerInFinal.profile_image_url || problematicPlayerInFinal.avatar),
          hasPosition: !!(problematicPlayerInFinal.primary_position || problematicPlayerInFinal.position),
          hasNationality: !!problematicPlayerInFinal.nationality
        });
      } else {
        secureConsole.warn('❌ [Migration Debug] Problematic player NOT found in finalPlayers array!');
      }
      
      // Check for players that need profile data migration
      secureConsole.log('🔍 [Migration Debug] Starting migration check for all players...');
      secureConsole.log('🔍 [Migration Debug] Total finalPlayers:', finalPlayers.length);
      
      const playersNeedingMigration = finalPlayers.filter(player => {
        // Check if player exists in users but missing from players collection
        const hasUserData = player.accountType === 'player';
        const hasProfileData = !!(player.profile_image || player.profile_image_url || player.avatar || 
                                 player.primary_position || player.position || player.nationality);
        
        // Debug specific player
        if (player.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92') {
          secureConsole.log(`🔍 [Migration Check] Player ${player.id}:`, {
            accountType: player.accountType,
            hasUserData,
            profile_image: player.profile_image,
            profile_image_url: player.profile_image_url,
            avatar: player.avatar,
            primary_position: player.primary_position,
            position: player.position,
            nationality: player.nationality,
            hasProfileData,
            needsMigration: hasUserData && !hasProfileData
          });
        }
        
        const needsMigration = hasUserData && !hasProfileData;
        
        // Log all players with accountType 'player' for debugging
        if (player.accountType === 'player') {
          secureConsole.log(`🔍 [Migration Debug] Player ${player.id} (${player.full_name || player.name}):`, {
            hasUserData,
            hasProfileData,
            needsMigration,
            imageFields: {
              profile_image: player.profile_image,
              profile_image_url: player.profile_image_url,
              avatar: player.avatar
            },
            positionFields: {
              primary_position: player.primary_position,
              position: player.position
            },
            nationality: player.nationality
          });
        }
        
        return needsMigration;
      });
      
      secureConsole.log('🔍 [Migration Debug] playersNeedingMigration array length:', playersNeedingMigration.length);
      secureConsole.log('🔍 [Migration Debug] playersNeedingMigration array:', playersNeedingMigration.map(p => ({ id: p.id, name: p.full_name || p.name })));
      
      // Debug: Show all players with accountType 'player'
      const allPlayerAccounts = finalPlayers.filter(p => p.accountType === 'player');
      secureConsole.log(`🔍 [Migration Debug] Total players with accountType 'player': ${allPlayerAccounts.length}`, 
        allPlayerAccounts.map(p => ({ 
          id: p.id, 
          name: p.full_name || p.name,
          hasImage: !!(p.profile_image || p.profile_image_url || p.avatar),
          hasPosition: !!(p.primary_position || p.position),
          hasNationality: !!p.nationality
        })));

      if (playersNeedingMigration.length > 0) {
        secureConsole.log(`🔧 وجد ${playersNeedingMigration.length} لاعب يحتاج إلى إصلاح البيانات:`, 
          playersNeedingMigration.map(p => ({ id: p.id, name: p.full_name || p.name })));
        
        // Trigger migration for the first few players (to avoid overwhelming the system)
        const playersToMigrate = playersNeedingMigration.slice(0, 3);
        playersToMigrate.forEach(player => {
          handleMissingPlayerData(player.id);
        });
      } else {
        secureConsole.log('ℹ️ [Migration Debug] لا يوجد لاعبين يحتاجون إلى إصلاح البيانات');
      }
      
      // تشخيص إضافي للاعب المحدد
      const problematicPlayer = finalPlayers.find(p => p.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92');
      if (problematicPlayer) {
        secureConsole.log('🔍 [FINAL] بيانات اللاعب المحدد في النتيجة النهائية:', {
          id: problematicPlayer.id,
          name: problematicPlayer.full_name || problematicPlayer.name,
          position: problematicPlayer.primary_position || problematicPlayer.position,
          nationality: problematicPlayer.nationality,
          accountType: problematicPlayer.accountType,
          hasImage: !!getPlayerImage(problematicPlayer),
          imageUrl: getPlayerImage(problematicPlayer),
          allImageFields: {
            profile_image: problematicPlayer.profile_image,
            profile_image_url: problematicPlayer.profile_image_url,
            avatar: problematicPlayer.avatar,
            photoURL: (problematicPlayer as any).photoURL,
            profilePicture: (problematicPlayer as any).profilePicture,
            image: (problematicPlayer as any).image,
            photo: (problematicPlayer as any).photo,
            picture: (problematicPlayer as any).picture
          },
          allFields: Object.keys(problematicPlayer)
        });
      } else {
        secureConsole.warn('❌ [FINAL] اللاعب المحدد غير موجود في النتيجة النهائية');
      }
      
      // تشخيص الصور - محسن بدون loops متعددة
      let playersWithImagesCount = 0;
      let playersWithoutImagesCount = 0;
      let sampleWithImage = null;
      let sampleWithoutImage = null;
      
      finalPlayers.forEach(player => {
            const hasImage = getPlayerImage(player);
        if (hasImage) {
          playersWithImagesCount++;
          if (!sampleWithImage) {
            sampleWithImage = {
              name: player.full_name || player.name,
              foundImage: getPlayerImage(player),
              allImageFields: {
                profile_image: player.profile_image,
                profile_image_url: player.profile_image_url,
                avatar: player.avatar,
                photoURL: (player as any).photoURL,
                profilePicture: (player as any).profilePicture,
                image: (player as any).image,
                photo: (player as any).photo,
                picture: (player as any).picture
              }
            };
          }
          
              // Log specific player with image for debugging
              if (player.id === '9Kdp3IhbyKPAozGUKdPLxEEtkME3') {
                secureConsole.log('🖼️ اللاعب المحدد له صورة:', {
                  id: player.id,
                  name: player.full_name || player.name,
                  foundImage: getPlayerImage(player),
                  allImageFields: {
                    profile_image: player.profile_image,
                    profile_image_url: player.profile_image_url,
                    avatar: player.avatar,
                    image: (player as any).image,
                    photo: (player as any).photo,
                    picture: (player as any).picture
                  },
                  hasImage: true
                });
              }
              
              if (player.id === 'RF46N9BxiQRLVKB5s36LMzdWKYn2') {
                secureConsole.log('🖼️ اللاعب الثاني المحدد له صورة:', {
                  id: player.id,
                  name: player.full_name || player.name,
                  foundImage: getPlayerImage(player),
                  allImageFields: {
                    profile_image: player.profile_image,
                    profile_image_url: player.profile_image_url,
                    avatar: player.avatar,
                    image: (player as any).image,
                    photo: (player as any).photo,
                    picture: (player as any).picture
                  },
                  hasImage: true
                });
          }
        } else {
          playersWithoutImagesCount++;
          
              // Log specific player without image for debugging
              if (player.id === '9Kdp3IhbyKPAozGUKdPLxEEtkME3') {
                secureConsole.log('❌ اللاعب المحدد ليس له صورة:', {
                  id: player.id,
                  name: player.full_name || player.name,
                  foundImage: getPlayerImage(player),
                  allImageFields: {
                    profile_image: player.profile_image,
                    profile_image_url: player.profile_image_url,
                    avatar: player.avatar,
                    image: (player as any).image,
                    photo: (player as any).photo,
                    picture: (player as any).picture
                  },
                  hasImage: false
                });
              }
              
              if (player.id === 'RF46N9BxiQRLVKB5s36LMzdWKYn2') {
                secureConsole.log('❌ اللاعب الثاني المحدد ليس له صورة:', {
                  id: player.id,
                  name: player.full_name || player.name,
                  foundImage: getPlayerImage(player),
                  allImageFields: {
                    profile_image: player.profile_image,
                    profile_image_url: player.profile_image_url,
                    avatar: player.avatar,
                    image: (player as any).image,
                    photo: (player as any).photo,
                    picture: (player as any).picture
                  },
                  hasImage: false
                });
              }
          if (!sampleWithoutImage) {
            sampleWithoutImage = {
              name: player.full_name || player.name,
              foundImage: getPlayerImage(player),
              allImageFields: {
                profile_image: player.profile_image,
                profile_image_url: player.profile_image_url,
                avatar: player.avatar,
                photoURL: (player as any).photoURL,
                profilePicture: (player as any).profilePicture,
                image: (player as any).image,
                photo: (player as any).photo,
                picture: (player as any).picture
              }
            };
          }
        }
      });
      
      secureConsole.log('🖼️ تشخيص الصور:', {
        totalPlayers: uniquePlayers.length,
        playersWithImages: playersWithImagesCount,
        playersWithoutImages: playersWithoutImagesCount,
        sampleWithImage: sampleWithImage,
        sampleWithoutImage: sampleWithoutImage,
        targetPlayerFound: !!finalTargetPlayer,
        targetPlayerHasImage: finalTargetPlayer ? !!getPlayerImage(finalTargetPlayer) : false,
        targetPlayer2Found: !!finalTargetPlayer2,
        targetPlayer2HasImage: finalTargetPlayer2 ? !!getPlayerImage(finalTargetPlayer2) : false
      });
      
      secureConsole.log('📊 تفاصيل اللاعبين النهائيين:', uniquePlayers);
      
      // Categorize players - محسن بدون loops متعددة
      let independentPlayersCount = 0;
      let dependentPlayersCount = 0;
      let clubDependentsCount = 0;
      let academyDependentsCount = 0;
      let trainerDependentsCount = 0;
      let agentDependentsCount = 0;
      
      finalPlayers.forEach(player => {
        if (player.accountType === 'player') {
          independentPlayersCount++;
        } else {
          dependentPlayersCount++;
          if (player.club_id || player.clubId) clubDependentsCount++;
          if (player.academy_id || player.academyId) academyDependentsCount++;
          if (player.trainer_id || player.trainerId) trainerDependentsCount++;
          if (player.agent_id || player.agentId) agentDependentsCount++;
        }
      });
      
      secureConsole.log('📊 اللاعبين المستقلين:', independentPlayersCount);
      secureConsole.log('📊 اللاعبين التابعين:', dependentPlayersCount);
      secureConsole.log('📊 - تابعين لأندية:', clubDependentsCount);
      secureConsole.log('📊 - تابعين لأكاديميات:', academyDependentsCount);
      secureConsole.log('📊 - تابعين لمدربين:', trainerDependentsCount);
      secureConsole.log('📊 - تابعين لوكلاء:', agentDependentsCount);
      
      setPlayers(finalPlayers);
      
      // تشخيص شامل لجميع الصور
      diagnoseAllPlayerImages(finalPlayers);
      
    } catch (error) {
      secureConsole.error('❌ خطأ في جلب اللاعبين:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, diagnoseAllPlayerImages]);

  // Load data on mount
  useEffect(() => {
      setupCurrentUserInfo();
    loadPlayers();
  }, [setupCurrentUserInfo, loadPlayers]);

  // Filter players based on search and filters - محسن بدون loops غير ضرورية
  const filteredPlayers = useMemo(() => {
    // إذا لم تكن هناك فلاتر، أرجع اللاعبين كما هم
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
      // تشخيص للاعب المحدد في حالة عدم وجود فلاتر
      const problematicPlayer = players.find(p => p.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92');
      if (problematicPlayer) {
        secureConsole.log('🔍 [FILTER] اللاعب المحدد موجود في القائمة بدون فلاتر:', {
          id: problematicPlayer.id,
          name: problematicPlayer.full_name || problematicPlayer.name,
          position: problematicPlayer.primary_position || problematicPlayer.position,
          nationality: problematicPlayer.nationality,
          accountType: problematicPlayer.accountType
        });
      } else {
        secureConsole.warn('❌ [FILTER] اللاعب المحدد غير موجود في القائمة بدون فلاتر');
      }
      return players;
    }
    
    return players.filter(player => {
      // تشخيص للاعب المحدد في عملية الفلترة
      if (player.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92') {
        secureConsole.log('🔍 [FILTER] بدء فلترة اللاعب المحدد:', {
          id: player.id,
          name: player.full_name || player.name,
          position: player.primary_position || player.position,
          nationality: player.nationality,
          accountType: player.accountType,
          hasFilters: hasFilters,
          searchTerm: debouncedSearchTerm,
          filterPosition: filterPosition,
          filterNationality: filterNationality,
          filterAccountType: filterAccountType
        });
      }
      
      // Search filter - محسن
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
          if (player.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92') {
            secureConsole.warn('❌ [FILTER] اللاعب المحدد تم استبعاده بسبب البحث:', {
              searchTerm: searchTerm,
              searchFields: searchFields
            });
          }
          if (player.id === 'RF46N9BxiQRLVKB5s36LMzdWKYn2') {
            secureConsole.warn('❌ [FILTER] اللاعب الثاني تم استبعاده بسبب البحث:', {
              searchTerm: searchTerm,
              searchFields: searchFields,
              playerName: player.full_name || player.name,
              nationality: player.nationality,
              country: player.country
            });
          }
          return false;
        }
      }
      
      // Position filter
      if (filterPosition !== 'all' && 
          player.primary_position !== filterPosition && 
          player.position !== filterPosition) {
        if (player.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92') {
          secureConsole.warn('❌ [FILTER] اللاعب المحدد تم استبعاده بسبب فلتر المركز:', {
            filterPosition: filterPosition,
            playerPrimaryPosition: player.primary_position,
            playerPosition: player.position
          });
        }
        return false;
      }
      
      // Nationality filter
      if (filterNationality !== 'all' && player.nationality !== filterNationality) {
        if (player.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92') {
          secureConsole.warn('❌ [FILTER] اللاعب المحدد تم استبعاده بسبب فلتر الجنسية:', {
            filterNationality: filterNationality,
            playerNationality: player.nationality
          });
        }
        return false;
      }
      
      // Country filter
      if (filterCountry !== 'all' && player.country !== filterCountry) {
        return false;
      }
      
      // Account type filter
      if (filterAccountType !== 'all') {
        if (filterAccountType === 'independent' && player.accountType !== 'player') {
          if (player.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92') {
            secureConsole.warn('❌ [FILTER] اللاعب المحدد تم استبعاده بسبب فلتر نوع الحساب (مستقل):', {
              filterAccountType: filterAccountType,
              playerAccountType: player.accountType
            });
          }
          return false;
        }
        if (filterAccountType === 'dependent' && player.accountType === 'player') {
          if (player.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92') {
            secureConsole.warn('❌ [FILTER] اللاعب المحدد تم استبعاده بسبب فلتر نوع الحساب (تابع):', {
              filterAccountType: filterAccountType,
              playerAccountType: player.accountType
            });
          }
          return false;
        }
      }
      
      // Age filter
      if (filterAge !== 'all' && player.age) {
        if (filterAge === 'under16' && player.age >= 16) return false;
        if (filterAge === 'under18' && (player.age < 16 || player.age >= 18)) return false;
        if (filterAge === 'under21' && (player.age < 18 || player.age >= 21)) return false;
        if (filterAge === 'senior' && player.age < 21) return false;
      }
      
      // Dependency filter
      if (filterDependency !== 'all') {
        if (filterDependency === 'independent' && player.accountType !== 'player') {
          return false;
        }
        if (filterDependency === 'dependent' && player.accountType === 'player') {
          return false;
        }
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
      if (filterObjective !== 'all' && 
          (!player.objectives || !player.objectives.includes(filterObjective))) {
        return false;
      }
      
      // تشخيص نهائي للاعب المحدد
      if (player.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92') {
        secureConsole.log('✅ [FILTER] اللاعب المحدد نجح في جميع الفلاتر:', {
          id: player.id,
          name: player.full_name || player.name,
          position: player.primary_position || player.position,
          nationality: player.nationality,
          accountType: player.accountType
        });
      }
      
      // تشخيص نجاح اللاعب في الفلترة
      if (player.id === 'RF46N9BxiQRLVKB5s36LMzdWKYn2') {
        secureConsole.log('✅ [FILTER] اللاعب الثاني نجح في جميع الفلاتر:', {
          playerId: player.id,
          playerName: player.full_name || player.name,
          searchTerm: debouncedSearchTerm,
          filterPosition: filterPosition,
          filterNationality: filterNationality,
          filterCountry: filterCountry,
          filterAccountType: filterAccountType,
          filterAge: filterAge,
          filterDependency: filterDependency,
          filterStatus: filterStatus,
          filterSkillLevel: filterSkillLevel
        });
      }
      
      return true;
    });
  }, [players, debouncedSearchTerm, filterPosition, filterNationality, filterCountry, 
      filterAccountType, filterAge, filterDependency, filterStatus, filterSkillLevel, filterObjective]);

  // إعادة تعيين الصفحة عند تغيير الفلاتر
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterPosition, filterNationality, filterCountry, 
      filterAccountType, filterAge, filterDependency, filterStatus, filterSkillLevel, filterObjective]);

  // Pagination
  const totalPages = Math.ceil(filteredPlayers.length / playersPerPage);
  const startIndex = (currentPage - 1) * playersPerPage;
  const endIndex = startIndex + playersPerPage;
  const pagedPlayers = filteredPlayers.slice(startIndex, endIndex);
  
  // تشخيص للاعب المحدد في عملية الصفحات
  const problematicPlayerInPaged = pagedPlayers.find(p => p.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92');
  if (problematicPlayerInPaged) {
    secureConsole.log('🔍 [PAGINATION] اللاعب المحدد موجود في الصفحة الحالية:', {
      id: problematicPlayerInPaged.id,
      name: problematicPlayerInPaged.full_name || problematicPlayerInPaged.name,
      position: problematicPlayerInPaged.primary_position || problematicPlayerInPaged.position,
      nationality: problematicPlayerInPaged.nationality,
      accountType: problematicPlayerInPaged.accountType,
      currentPage: currentPage,
      startIndex: startIndex,
      endIndex: endIndex,
      totalPages: totalPages,
      filteredPlayersLength: filteredPlayers.length,
      pagedPlayersLength: pagedPlayers.length
    });
  } else {
    secureConsole.warn('❌ [PAGINATION] اللاعب المحدد غير موجود في الصفحة الحالية:', {
      currentPage: currentPage,
      startIndex: startIndex,
      endIndex: endIndex,
      totalPages: totalPages,
      filteredPlayersLength: filteredPlayers.length,
      pagedPlayersLength: pagedPlayers.length
    });
  }

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
    setCurrentPage(1); // إعادة تعيين الصفحة عند إعادة تعيين الفلاتر
  };

  // Utility functions - محسنة بدون loops
  const getPositionColor = useCallback((position: string) => {
    const colors: { [key: string]: string } = {
      'مهاجم': 'from-red-500 to-red-600',
      'لاعب وسط': 'from-blue-500 to-blue-600',
      'مدافع': 'from-green-500 to-green-600',
      'حارس مرمى': 'from-yellow-500 to-yellow-600',
      'مهاجم وسط': 'from-purple-500 to-purple-600',
      'مدافع وسط': 'from-indigo-500 to-indigo-600'
    };
    return colors[position] || 'from-gray-500 to-gray-600';
  }, []);

  const getPositionEmoji = useCallback((position: string) => {
    const emojis: { [key: string]: string } = {
      'مهاجم': '⚽',
      'لاعب وسط': '🎯',
      'مدافع': '🛡️',
      'حارس مرمى': '🥅',
      'مهاجم وسط': '⚡',
      'مدافع وسط': '🛡️'
    };
    return emojis[position] || '👤';
  }, []);

  const getOrganizationBadgeStyle = useCallback((accountType: string) => {
    const styles: { [key: string]: string } = {
      'club': 'from-blue-400 to-blue-500',
      'academy': 'from-green-400 to-green-500',
      'trainer': 'from-purple-400 to-purple-500',
      'agent': 'from-orange-400 to-orange-500',
      'parent': 'from-pink-400 to-pink-500',
      'marketer': 'from-indigo-400 to-indigo-500'
    };
    return styles[accountType] || 'from-gray-400 to-gray-500';
  }, []);

  const getOrganizationLabel = useCallback((accountType: string) => {
    const labels: { [key: string]: string } = {
      'club': '🏢 نادي',
      'academy': '🎓 أكاديمية',
      'trainer': '👨‍🏫 مدرب',
      'agent': '🤝 وكيل',
      'parent': '👨‍👩‍👧‍👦 ولي أمر',
      'marketer': '📢 مسوق'
    };
    return labels[accountType] || '🏢 منظمة';
  }, []);



  const getValidImageUrl = useCallback((url: any) => {
    if (!url || typeof url !== 'string') {
      secureConsole.warn('❌ [getValidImageUrl] رابط صورة غير صالح:', { url, type: typeof url });
      return '/images/default-avatar.png';
    }
    
    const cleanUrl = url.trim();
    
    // فحص الروابط الفارغة أو الخاطئة
    if (cleanUrl === '' || cleanUrl === 'undefined' || cleanUrl === 'null' || cleanUrl === '[object Object]') {
      secureConsole.warn('❌ [getValidImageUrl] رابط صورة فارغ أو خاطئ:', cleanUrl);
      return '/images/default-avatar.png';
    }
    
    // إذا كان الرابط يبدأ بـ http أو https، استخدمه كما هو
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      secureConsole.log('✅ [getValidImageUrl] رابط صورة صالح (http/https):', cleanUrl);
      return cleanUrl;
    }
    
    // إذا كان الرابط يبدأ بـ /، استخدمه كما هو
    if (cleanUrl.startsWith('/')) {
      secureConsole.log('✅ [getValidImageUrl] رابط صورة صالح (مسار محلي):', cleanUrl);
      return cleanUrl;
    }
    
    // إذا كان الرابط يبدأ بـ data: (base64)، استخدمه كما هو
    if (cleanUrl.startsWith('data:')) {
      secureConsole.log('✅ [getValidImageUrl] رابط صورة صالح (base64):', cleanUrl.substring(0, 50) + '...');
      return cleanUrl;
    }
    
    // إذا كان الرابط يبدأ بـ blob:، استخدمه كما هو
    if (cleanUrl.startsWith('blob:')) {
      secureConsole.log('✅ [getValidImageUrl] رابط صورة صالح (blob):', cleanUrl);
      return cleanUrl;
    }
    
    // إذا كان الرابط يبدو كرابط Supabase
    if (cleanUrl.includes('supabase') || cleanUrl.includes('storage')) {
      secureConsole.log('✅ [getValidImageUrl] رابط صورة صالح (Supabase):', cleanUrl);
      return cleanUrl;
    }
    
    // إذا كان الرابط يحتوي على مسار Supabase بدون https
    if (cleanUrl.includes('supabase.co') && !cleanUrl.startsWith('http')) {
      const httpsUrl = `https://${cleanUrl}`;
      secureConsole.log('✅ [getValidImageUrl] إضافة https لرابط Supabase:', httpsUrl);
      return httpsUrl;
    }
    
    // إذا كان الرابط يحتوي على مسار Supabase مع storage
    if (cleanUrl.includes('storage') && cleanUrl.includes('supabase') && !cleanUrl.startsWith('http')) {
      const httpsUrl = `https://${cleanUrl}`;
      secureConsole.log('✅ [getValidImageUrl] إضافة https لرابط Supabase storage:', httpsUrl);
      return httpsUrl;
    }
    
    // إذا كان الرابط لا يحتوي على مسار، أضف /images/
    if (!cleanUrl.includes('/')) {
      const localUrl = `/images/${cleanUrl}`;
      secureConsole.log('✅ [getValidImageUrl] إضافة مسار محلي:', localUrl);
      return localUrl;
    }
    
    // في جميع الحالات الأخرى، استخدم الرابط كما هو
    secureConsole.log('✅ [getValidImageUrl] استخدام الرابط كما هو:', cleanUrl);
    return cleanUrl;
  }, []);

  // Add simple getUserDisplayName function
  const getUserDisplayName = useCallback(() => {
    if (!userData) return 'مستخدم';
    return userData.full_name || userData.name || userData.email || 'مستخدم';
  }, [userData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" dir="rtl">
      {/* شريط البحث المدمج */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            {/* أيقونة البحث */}
            <div className="flex-shrink-0">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Search className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            
            {/* شريط البحث المدمج */}
            <div className="flex-1 relative">
              <Input
          type="text"
                placeholder="ابحث عن لاعبين..."
          value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/60 border-gray-200 rounded-xl pr-10"
        />
              {searchTerm && searchTerm !== debouncedSearchTerm && (
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
      </div>
              )}
            </div>
            
            {/* زر توسيع البحث */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              className="flex-shrink-0"
            >
              {isSearchExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            
            {/* زر توسيع الفلاتر */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="flex-shrink-0"
            >
              <Filter className="w-4 h-4" />
            </Button>
            
            {/* إحصائيات سريعة */}
            <div className="flex-shrink-0 text-sm text-gray-600">
              {filteredPlayers.length} لاعب
    </div>
    </div>
        </div>
      </div>

      {/* البحث الموسع */}
      {isSearchExpanded && (
        <div className="bg-white/60 backdrop-blur-sm border-b border-gray-200">
          <div className="container mx-auto px-4 py-4">
            <div className="max-w-2xl mx-auto">
              <div className="relative">
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <Search className="w-5 h-5 text-gray-400" />
              </div>
              <Input
                type="text"
                  placeholder="ابحث باسم اللاعب، المركز، الجنسية، النادي..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-6 pr-12 py-3 text-lg bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm rounded-xl"
                />
                {/* نتائج البحث السريعة */}
                {debouncedSearchTerm && filteredPlayers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 z-50 max-h-64 overflow-y-auto">
                    <div className="p-2">
                      <div className="text-xs text-gray-500 mb-2 px-2">
                        {filteredPlayers.length} نتيجة للبحث عن "{debouncedSearchTerm}"
            </div>
                      {filteredPlayers.slice(0, 5).map((player) => (
                        <div 
                          key={player.id}
                          className="flex items-center gap-3 p-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                          onClick={() => {
                            setSearchTerm('');
                            setIsSearchExpanded(false);
                          }}
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                            {getPlayerImage(player) ? (
                              <Image
                                src={getValidImageUrl(getPlayerImage(player))}
                                alt={player.full_name || player.name || 'لاعب'}
                                width={32}
                                height={32}
                                className="object-cover w-full h-full"
                                loading={currentPage === 1 ? "eager" : "lazy"}
                                priority={currentPage === 1}
                              onError={(e) => {
                                if (!e.currentTarget.dataset.errorHandled) {
                                  e.currentTarget.dataset.errorHandled = 'true';
                                  e.currentTarget.style.display = 'none';
                                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (nextElement) {
                                    nextElement.style.display = 'flex';
                                  }
                                  secureConsole.warn('❌ خطأ في تحميل صورة اللاعب في البحث:', {
                                    playerName: player.full_name || player.name,
                                    imageSrc: getValidImageUrl(getPlayerImage(player)),
                                    foundImage: getPlayerImage(player)
                                  });
                                }
                              }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center ${player.profile_image || player.profile_image_url || player.avatar ? 'hidden' : 'flex'}`}>
                              {(player.full_name || player.name || 'ل').charAt(0)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-gray-800 truncate">
                              {player.full_name || player.name || 'لاعب مجهول'}
        </div>
                            <div className="text-xs text-gray-500 truncate">
                              {player.primary_position || player.position} • {player.nationality || 'غير محدد'}
      </div>
                            {/* تشخيص للاعب المحدد */}
                            {player.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92' && (
                              <div className="text-xs text-red-500 truncate">
                                🔍 Debug: {player.full_name || player.name} - {player.primary_position || player.position}
                              </div>
                            )}
              </div>
                  </div>
                      ))}
                      {filteredPlayers.length > 5 && (
                        <div className="text-center text-xs text-blue-600 py-2 border-t border-gray-100">
                          عرض جميع النتائج ({filteredPlayers.length})
                </div>
              )}
            </div>
          </div>
                )}
        </div>
      </div>
          </div>
        </div>
      )}

      {/* الفلاتر المتقدمة */}
      {isFiltersExpanded && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" />
                الفلاتر المتقدمة
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                إعادة تعيين
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
              {/* المركز */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <Sword className="w-3 h-3 text-blue-500" />
                  المركز
                </Label>
                <Select value={filterPosition} onValueChange={setFilterPosition}>
                  <SelectTrigger className="h-8 text-xs border-blue-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المراكز</SelectItem>
                    <SelectItem value="مهاجم">مهاجم</SelectItem>
                    <SelectItem value="لاعب وسط">لاعب وسط</SelectItem>
                    <SelectItem value="مدافع">مدافع</SelectItem>
                    <SelectItem value="حارس مرمى">حارس مرمى</SelectItem>
                  </SelectContent>
                </Select>
          </div>
          
              {/* الجنسية */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <Flag className="w-3 h-3 text-green-500" />
                  الجنسية
                </Label>
                <Select value={filterNationality} onValueChange={setFilterNationality}>
                  <SelectTrigger className="h-8 text-xs border-green-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الجنسيات</SelectItem>
                    <SelectItem value="مصري">مصري</SelectItem>
                    <SelectItem value="قطري">قطري</SelectItem>
                    <SelectItem value="سعودي">سعودي</SelectItem>
                    <SelectItem value="إماراتي">إماراتي</SelectItem>
                  </SelectContent>
                </Select>
            </div>

              {/* الدولة */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-purple-500" />
                  الدولة
                </Label>
                <Select value={filterCountry} onValueChange={setFilterCountry}>
                  <SelectTrigger className="h-8 text-xs border-purple-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الدول</SelectItem>
                    <SelectItem value="مصر">مصر</SelectItem>
                    <SelectItem value="قطر">قطر</SelectItem>
                    <SelectItem value="السعودية">السعودية</SelectItem>
                    <SelectItem value="الإمارات">الإمارات</SelectItem>
                  </SelectContent>
                </Select>
            </div>

              {/* نوع الحساب */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <User className="w-3 h-3 text-orange-500" />
                  نوع الحساب
                </Label>
                <Select value={filterAccountType} onValueChange={setFilterAccountType}>
                  <SelectTrigger className="h-8 text-xs border-orange-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنواع</SelectItem>
                    <SelectItem value="independent">لاعب مستقل</SelectItem>
                    <SelectItem value="dependent">لاعب تابع</SelectItem>
                  </SelectContent>
                </Select>
            </div>

              {/* الفئة العمرية */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-pink-500" />
                  الفئة العمرية
                </Label>
                <Select value={filterAge} onValueChange={setFilterAge}>
                  <SelectTrigger className="h-8 text-xs border-pink-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأعمار</SelectItem>
                    <SelectItem value="under16">تحت 16 سنة</SelectItem>
                    <SelectItem value="under18">تحت 18 سنة</SelectItem>
                    <SelectItem value="under21">تحت 21 سنة</SelectItem>
                    <SelectItem value="senior">كبار</SelectItem>
                  </SelectContent>
                </Select>
            </div>

              {/* التبعية */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <Users className="w-3 h-3 text-teal-500" />
                  التبعية
                </Label>
                <Select value={filterDependency} onValueChange={setFilterDependency}>
                  <SelectTrigger className="h-8 text-xs border-teal-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع التبعيات</SelectItem>
                    <SelectItem value="independent">مستقل</SelectItem>
                    <SelectItem value="dependent">تابع</SelectItem>
                  </SelectContent>
                </Select>
            </div>
          </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* الحالة */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  الحالة
                </Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-xs border-emerald-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="active">مفعل</SelectItem>
                    <SelectItem value="inactive">معلق</SelectItem>
                  </SelectContent>
                </Select>
        </div>

              {/* مستوى المهارة */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-yellow-500" />
                  مستوى المهارة
                </Label>
                <Select value={filterSkillLevel} onValueChange={setFilterSkillLevel}>
                  <SelectTrigger className="h-8 text-xs border-yellow-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المستويات</SelectItem>
                    <SelectItem value="beginner">مبتدئ</SelectItem>
                    <SelectItem value="intermediate">متوسط</SelectItem>
                    <SelectItem value="advanced">متقدم</SelectItem>
                    <SelectItem value="professional">محترف</SelectItem>
                  </SelectContent>
                </Select>
                </div>

              {/* الأهداف */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <Target className="w-3 h-3 text-red-500" />
                  الأهداف
                </Label>
                <Select value={filterObjective} onValueChange={setFilterObjective}>
                  <SelectTrigger className="h-8 text-xs border-red-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأهداف</SelectItem>
                    <SelectItem value="professional">احترافي</SelectItem>
                    <SelectItem value="academic">أكاديمي</SelectItem>
                    <SelectItem value="recreational">ترفيهي</SelectItem>
                  </SelectContent>
                </Select>
                  </div>
                  </div>
                </div>
        </div>
      )}

      {/* المحتوى الرئيسي */}
      <div className="container mx-auto px-4 py-8">
        {/* إحصائيات سريعة */}
        <div className="mb-6 p-4 bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-white/30">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              عرض {pagedPlayers.length} من {filteredPlayers.length} لاعب
            </span>
            <span className="text-gray-600">
              الصفحة {currentPage} من {totalPages}
            </span>
          </div>
        </div>

        {/* قائمة اللاعبين */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="h-80 bg-white/60 backdrop-blur-sm border-white/30 shadow-lg animate-pulse">
                <div className="h-full bg-gray-200 rounded-xl"></div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {pagedPlayers.map((player) => {
              const playerPosition = player.primary_position || player.position || '';
              const positionColor = getPositionColor(playerPosition);
              const positionEmoji = getPositionEmoji(playerPosition);
              
              return (
                <div key={player.id} className="group relative h-80 cursor-pointer">
                  {/* البطاقة الرئيسية */}
                  <div className="relative w-full h-full rounded-xl overflow-hidden shadow-lg transition-all duration-500 ease-out group-hover:scale-[1.02]">
                    {/* صورة اللاعب */}
                    <div className="absolute inset-0">
                          {(() => {
                            const foundImage = getPlayerImage(player);
                            const validImageUrl = foundImage ? getValidImageUrl(foundImage) : null;
                            
                            // تشخيص مفصل للاعب المحدد
                            if (player.id === 'RF46N9BxiQRLVKB5s36LMzdWKYn2') {
                              secureConsole.log('🔍 [CARD RENDER] تشخيص اللاعب في الكارت:', {
                                playerId: player.id,
                                playerName: player.full_name || player.name,
                                foundImage: foundImage,
                                validImageUrl: validImageUrl,
                                willRenderImage: !!foundImage,
                                allImageFields: {
                                  profile_image: player.profile_image,
                                  profile_image_url: player.profile_image_url,
                                  avatar: player.avatar,
                                  photoURL: (player as any).photoURL,
                                  profilePicture: (player as any).profilePicture,
                                  image: (player as any).image,
                                  photo: (player as any).photo,
                                  picture: (player as any).picture
                                }
                              });
                            }
                            
                            return foundImage ? (
                              <Image
                                src={validImageUrl}
                                alt={player.full_name || player.name || player.displayName || 'لاعب'}
                                fill
                                className="object-cover"
                                loading={currentPage === 1 ? "eager" : "lazy"}
                                priority={currentPage === 1}
                                unoptimized={true}
                                onLoad={() => {
                                  secureConsole.log('✅ تم تحميل صورة اللاعب بنجاح:', {
                                    playerId: player.id,
                                    playerName: player.full_name || player.name,
                                    imageSrc: validImageUrl
                                  });
                                }}
                                onError={(e) => {
                                  if (!e.currentTarget.dataset.errorHandled) {
                                    const originalSrc = e.currentTarget.src;
                                    secureConsole.warn('❌ خطأ في تحميل صورة اللاعب في الكروت الرئيسية:', {
                                      playerId: player.id,
                                      playerName: player.full_name || player.name,
                                      originalSrc: originalSrc,
                                      foundImage: foundImage,
                                      validImageUrl: validImageUrl,
                                      allImageFields: {
                                        profile_image: player.profile_image,
                                        profile_image_url: player.profile_image_url,
                                        avatar: player.avatar,
                                        photoURL: (player as any).photoURL,
                                        profilePicture: (player as any).profilePicture,
                                        image: (player as any).image,
                                        photo: (player as any).photo,
                                        picture: (player as any).picture
                                      },
                                      errorType: 'Image load error',
                                      timestamp: new Date().toISOString()
                                    });
                                    e.currentTarget.dataset.errorHandled = 'true';
                                    e.currentTarget.src = '/images/default-avatar.png';
                                  }
                                }}
                              />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${positionColor} flex items-center justify-center text-6xl text-white font-bold`}>
                                {positionEmoji}
                              </div>
                            );
                          })()}
                        </div>
                        
                    {/* التدرج اللوني في الأسفل */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent opacity-90" />
                    
                    {/* المحتوى في الأسفل */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="font-bold text-lg mb-2 line-clamp-2 leading-tight">
                        {player.full_name || player.name || player.displayName || 'لاعب مجهول'}
                      </h3>

                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={`bg-gradient-to-r ${positionColor} text-white border-0 shadow-md px-2 py-1 rounded-lg text-xs font-bold`}>
                          {playerPosition || 'غير محدد'}
                        </Badge>
                        <Badge variant="outline" className="border border-white/30 text-white bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-semibold">
                          {player.nationality || 'غير محدد'}
                        </Badge>
                      </div>

                      {/* تشخيص للاعب المحدد */}
                      {player.id === 'Std8PhwLi5RY8lNc4fjnVpVljl92' && (
                        <div className="text-xs text-yellow-300 mb-2">
                          🔍 Debug: {player.full_name || player.name} - {player.primary_position || player.position}
                          <br />
                          🖼️ Image: {getPlayerImage(player) ? 'Found' : 'Not Found'}
                          <br />
                          📊 All Fields: {Object.keys(player).join(', ')}
                          <br />
                          🎯 Account Type: {player.accountType}
                          <br />
                          📍 Position: {player.primary_position || player.position || 'None'}
                          <br />
                          🌍 Nationality: {player.nationality || 'None'}
                          <br />
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-2 text-xs bg-red-500 text-white border-red-500 hover:bg-red-600"
                            onClick={() => handleMissingPlayerData(player.id)}
                          >
                            🔧 إصلاح البيانات
                          </Button>
                        </div>
                      )}

                      {/* مؤشر نوع اللاعب */}
                      <div className="flex justify-start">
                        <Badge 
                          variant={player.accountType === 'player' ? 'default' : 'secondary'} 
                          className={`${player.accountType === 'player' 
                            ? 'bg-gradient-to-r from-green-400 to-green-500 text-white border-0' 
                            : getOrganizationBadgeStyle(player.accountType)
                          } px-2 py-1 rounded-lg text-xs font-bold shadow-md`}
                        >
                          {player.accountType === 'player' ? '🎯 مستقل' : getOrganizationLabel(player.accountType)}
                        </Badge>
                      </div>
                    </div>

                    {/* مؤشر التمرير */}
                    <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                    
                    {/* طبقة التفاعل */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-500" />
                  </div>
                  
                  {/* أزرار الإجراءات تظهر في الأسفل عند التمرير */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-b-xl opacity-0 group-hover:opacity-100 transition-all duration-500 p-4">
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg rounded-lg py-2 text-xs font-bold transition-all duration-500 ease-out hover:shadow-xl"
                        onClick={async () => {
                          console.group('🔍 [PlayersSearchPage] بدء عملية عرض الملف');
                          console.log('بيانات اللاعب المحدد:', {
                            playerId: player.id,
                            playerName: player.full_name || player.name,
                            playerAccountType: player.accountType
                          });
                          console.log('بيانات المستخدم الحالي:', {
                            userId: user?.uid,
                            userAccountType: userData?.accountType,
                            userName: getUserDisplayName(),
                            hasUserData: !!userData
                          });
                          
                          // التحقق من نوع اللاعب قبل إرسال الإشعار
                          const hasOrganizationAffiliation = !!(
                            player.club_id || player.clubId ||
                            player.academy_id || player.academyId ||
                            player.trainer_id || player.trainerId ||
                            player.agent_id || player.agentId
                          );
                          
                          const isIndependentPlayer = 
                            player.accountType === 'player' ||
                            (!hasOrganizationAffiliation && !player.accountType?.startsWith('dependent'));
                          
                          const hasLoginAccount = player.convertedToAccount || player.firebaseUid;
                          const canReceiveNotifications = isIndependentPlayer || hasLoginAccount;
                          
                          console.log('🎯 فحص نوع اللاعب المحدث:', {
                            playerAccountType: player.accountType,
                            hasOrganizationAffiliation,
                            organizationIds: {
                              club_id: player.club_id || player.clubId,
                              academy_id: player.academy_id || player.academyId,
                              trainer_id: player.trainer_id || player.trainerId,
                              agent_id: player.agent_id || player.agentId
                            },
                            isIndependent: isIndependentPlayer,
                            hasLoginAccount: hasLoginAccount,
                            canReceiveNotifications: canReceiveNotifications,
                            organizationInfo: player.organizationInfo || 'غير محدد',
                            source: player.accountType === 'player' ? 'users collection' : 'players/player collection'
                          });
                          
                          // إرسال إشعار مشاهدة الملف الشخصي للاعبين الذين يستطيعون تلقي الإشعارات
                          if (player.id && user && userData && canReceiveNotifications) {
                            const notificationData = {
                              type: 'profile_view',
                              profileOwnerId: player.id,
                              viewerId: user.uid,
                              viewerName: getUserDisplayName(),
                              viewerType: userData.accountType,
                              viewerAccountType: userData.accountType,
                              profileType: 'player'
                            };
                            
                            console.log('📢 بيانات الإشعار المرسلة:', notificationData);
                            console.log('📢 تفاصيل إضافية:', {
                              isViewingSelf: player.id === user.uid,
                              playerFirebaseId: player.id,
                              viewerFirebaseId: user.uid,
                              playerType: isIndependentPlayer ? 'مستقل' : 'تابع محول',
                              hasLoginAccount: hasLoginAccount
                            });
                            
                                                          try {
                                console.log('🚀 إرسال طلب API للاعب...');
                              const response = await fetch('/api/notifications/interaction', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(notificationData),
                              });

                              console.log('📨 استجابة API:', {
                                status: response.status,
                                statusText: response.statusText,
                                ok: response.ok
                              });

                              if (response.ok) {
                                const result = await response.json();
                                console.log('✅ تم إرسال إشعار مشاهدة الملف الشخصي بنجاح:', result);
                                console.log('📧 معرف الإشعار المرسل:', result.notificationId);
                              } else {
                                const errorText = await response.text();
                                console.error('❌ خطأ في إرسال إشعار مشاهدة الملف الشخصي:', {
                                  status: response.status,
                                  statusText: response.statusText,
                                  error: errorText
                                });
                              }
                            } catch (error) {
                              console.error('❌ خطأ في إرسال الإشعار:', error);
                            }
                          } else if (player.id && user && userData && !canReceiveNotifications) {
                            console.log('🚫 تم تخطي إرسال الإشعار - اللاعب لا يستطيع تلقي الإشعارات:', {
                              playerName: player.full_name || player.name,
                              playerAccountType: player.accountType,
                              organizationInfo: player.organizationInfo,
                              isIndependent: isIndependentPlayer,
                              hasLoginAccount: hasLoginAccount,
                              reason: 'اللاعب التابع يحتاج حساب تسجيل دخول أو التحويل لحساب مستقل'
                            });
                          } else {
                            console.warn('⚠️ لا يمكن إرسال الإشعار - بيانات غير مكتملة:', {
                              hasPlayerId: !!player.id,
                              hasUser: !!user,
                              hasUserData: !!userData,
                              playerId: player.id,
                              userId: user?.uid,
                              userAccountType: userData?.accountType,
                              playerAccountType: player.accountType,
                              isIndependent: isIndependentPlayer
                            });
                          }
                          
                                                     console.log('🌐 الانتقال إلى صفحة الملف الشخصي المشتركة:', `/dashboard/shared/player-profile/${player.id}`);
                          console.groupEnd();
                          
                           router.push(`/dashboard/shared/player-profile/${player.id}`);
                        }}
                      >
                        <Eye className="w-3 h-3 ml-1" />
                        عرض الملف
                      </Button>
                      
                      {player.id && user && userData && (
                        <SendMessageButton
                          user={user}
                          userData={userData}
                          getUserDisplayName={getUserDisplayName}
                          targetUserId={player.id}
                          targetUserName={player.full_name || 'لاعب'}
                          targetUserType="player"
                          buttonText="مراسلة"
                          buttonVariant="outline"
                          buttonSize="sm"
                          className="flex-1 border border-white/30 text-white hover:bg-white/20 hover:border-white/50 rounded-lg py-2 text-xs font-bold transition-all duration-300 bg-white/10 backdrop-blur-sm"
                          redirectToMessages={true}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredPlayers.length === 0 && !isLoading && (
          <div className="col-span-full">
            <Card className="bg-white/60 backdrop-blur-sm border-white/30 shadow-lg p-12 text-center rounded-xl">
              <div className="text-6xl mb-4 opacity-50">🔍</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">لا توجد نتائج</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                لم نعثر على لاعبين يطابقون معايير البحث. جرب تعديل الفلاتر أو كلمات البحث.
              </p>
            </Card>
          </div>
        )}

        {/* أضف مكون الصفحات أسفل القائمة */}
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          playersPerPage={playersPerPage}
          totalPlayers={filteredPlayers.length}
          currentPagePlayers={pagedPlayers.length}
          onPlayersPerPageChange={handlePlayersPerPageChange}
        />
      </div>
    </div>
  );
} 
