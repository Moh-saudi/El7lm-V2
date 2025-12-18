'use client';

import UnifiedMediaModal from '@/components/admin/media/UnifiedMediaModal';
import StatusBadge from '@/components/admin/videos/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { actionLogService } from '@/lib/admin/action-logs';
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { performanceTemplateCategories } from '@/lib/messages/performance-templates';
import { STORAGE_BUCKETS, supabase } from '@/lib/supabase/config';
import { cleanPhoneNumber } from '@/lib/utils/whatsapp-share';
import { collection, doc, getDoc, getDocs, onSnapshot, updateDoc } from 'firebase/firestore';
import { CheckCircle, CheckSquare, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Clock, Grid3X3, Image as ImageIcon, List, Phone, Play, Search, Trash2, User, Video, XCircle } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// Interfaces
interface ImageData {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnailUrl?: string;
  uploadDate: any;
  userId: string;
  userEmail: string;
  userName: string;
  accountType: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  views: number;
  likes: number;
  comments: number;
  phone?: string;
  sourceType?: 'supabase' | 'firebase' | 'external';
  imageType?: 'profile' | 'cover' | 'additional' | 'avatar' | 'unknown';
}

interface VideoData {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  uploadDate: any;
  userId: string;
  userEmail: string;
  userName: string;
  accountType: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  views: number;
  likes: number;
  comments: number;
  phone?: string;
  sourceType?: 'youtube' | 'supabase' | 'external' | 'firebase';
}

type MediaType = 'videos' | 'images';
type MediaData = VideoData | ImageData;

const truncateText = (text: string, maxLength: number = 30) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export default function MediaAdminPage() {
  const { user, userData } = useAuth();

  // Media Type State
  const [activeTab, setActiveTab] = useState<MediaType>('videos');
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [videosTotalBytes, setVideosTotalBytes] = useState<number>(0);
  const [imagesTotalBytes, setImagesTotalBytes] = useState<number>(0);
  const [disabledUserIds, setDisabledUserIds] = useState<Set<string>>(new Set());
  const [cleanupQueue, setCleanupQueue] = useState<string[]>([]); // Queue for background media cleanup

  // View State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12); // Optimized for grid layout

  // Selection State
  const [selectedMedia, setSelectedMedia] = useState<MediaData | null>(null);

  // Bulk selection state
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Logs and Actions
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [showCustomMessage, setShowCustomMessage] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'flagged'>('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'player' | 'club' | 'academy' | 'agent' | 'trainer' | 'admin' | 'marketer' | 'supabase'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'youtube' | 'supabase' | 'firebase' | 'external'>('all');
  const [eventFilter, setEventFilter] = useState<'all' | 'upload' | 'status_change' | 'notification_sent'>('all');
  const [actionTakenFilter, setActionTakenFilter] = useState<'all' | 'taken' | 'not_taken'>('all');
  const [messageSentFilter, setMessageSentFilter] = useState<'all' | 'sent' | 'not_sent'>('all');
  const [imageTypeFilter, setImageTypeFilter] = useState<'all' | 'profile' | 'cover' | 'additional' | 'avatar' | 'unknown'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'title_asc' | 'title_desc' | 'status'>('newest');
  const [mediaIdToLogsMeta, setMediaIdToLogsMeta] = useState<Record<string, { lastAction?: string; hasAction?: boolean; hasMessage?: boolean }>>({});

  // Get correct account type from collection name
  const getAccountTypeFromCollection = (collectionName: string): string => {
    switch (collectionName) {
      case 'players':
        return 'player';
      case 'students':
        return 'player'; // students are treated as players
      case 'coaches':
        return 'trainer';
      case 'academies':
        return 'academy';
      case 'clubs':
        return 'club';
      case 'agents':
        return 'agent';
      case 'marketers':
        return 'marketer';
      case 'admins':
        return 'admin';
      default:
        return collectionName.slice(0, -1); // fallback
    }
  };

  // Bytes formatter
  const formatBytes = useCallback((bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    return `${value} ${sizes[i]}`;
  }, []);

  // Get video source type
  const getVideoSourceType = (url: string): 'youtube' | 'supabase' | 'external' | 'firebase' => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    } else if (url.includes('supabase.co') || url.includes('ekyerljzfokqimbabzxm.supabase.co')) {
      return 'supabase';
    } else if (url.includes('firebase') || url.includes('googleapis.com')) {
      return 'firebase';
    } else {
      return 'external';
    }
  };

  // Get YouTube thumbnail from URL
  const getYouTubeThumbnail = (url: string): string | null => {
    const youtubeMatch = url.match(/(?:youtube\.com.*[?&]v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
    if (youtubeMatch && youtubeMatch[1]) {
      return `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`;
    }
    return null;
  };

  // Get video thumbnail - prioritize YouTube thumbnail, then use provided thumbnailUrl
  const getVideoThumbnail = (video: VideoData): string | null => {
    // If it's a YouTube video, get the thumbnail
    if (video.sourceType === 'youtube' || video.url.includes('youtube.com') || video.url.includes('youtu.be')) {
      const ytThumb = getYouTubeThumbnail(video.url);
      if (ytThumb) return ytThumb;
    }
    // Otherwise use the provided thumbnailUrl
    return video.thumbnailUrl || null;
  };

  // Fetch Supabase Videos
  // Fetch R2 Videos
  const fetchSupabaseVideos = async (): Promise<VideoData[]> => {
    const supabaseVideos: VideoData[] = [];
    let totalBytes = 0;

    try {
      // Import server action dynamically if needed, or assume it's available
      const { listBucketFiles } = await import('@/app/actions/media');

      const { success, files, error } = await listBucketFiles('videos', '');

      if (!success) {
        console.error('خطأ في جلب الفيديوهات من R2:', error);
        return supabaseVideos;
      }

      if (files && files.length > 0) {
        for (const file of files) {
          // file.name includes path e.g. "userId/video.mp4" (since prefix was empty)
          if (file.name && file.name.includes('/')) {
            let userId = file.name.split('/')[0];
            let fileName = file.name.split('/').pop() || file.name;
            let displayTitle = fileName;

            // Try to parse timestamp from filename (e.g. 1759505967520...)
            const timestampMatch = fileName.match(/^(\d{13})/);
            if (timestampMatch) {
              const ts = parseInt(timestampMatch[1]);
              const date = new Date(ts);
              if (!isNaN(date.getTime())) {
                displayTitle = `فيديو ${date.toLocaleDateString('ar-EG')}`;
              }
            } else {
              // If not timestamp, maybe clean up underscores and extension
              displayTitle = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ");
            }

            // Handle double nesting (e.g. videos/videos/user/...) caused by migration
            // If the first part of the path is the same as the bucket name (or 'videos'), skip it
            if (userId === 'videos' && file.name.split('/').length > 2) {
              userId = file.name.split('/')[1];
            }

            // Construct R2 Public URL
            const publicUrl = `https://assets.el7lm.com/videos/${file.name}`;

            // Ensure title is clean
            if (fileName === userId) {
              // If filename equals userid (e.g. folder), ignore or use generic
              // But listBucketFiles returns files usually?
              // R2 might return directory placeholders if size is 0 and ends with /
              if (file.size === 0 && file.name.endsWith('/')) continue;
            }

            const size = file.size || 0;
            totalBytes += size;

            const videoData: VideoData = {
              id: `r2_${file.name}`, // Use name as ID
              title: displayTitle,
              description: 'فيديو مخزن في النظام',
              url: publicUrl,
              thumbnailUrl: undefined,
              duration: 0,
              uploadDate: file.updated || new Date(),
              userId: userId,
              userEmail: '',
              userName: `مستخدم ${userId}`,
              accountType: 'supabase', // Keep as 'supabase' or change to 'r2' if filter permits
              status: 'pending',
              views: 0,
              likes: 0,
              comments: 0,
              phone: '',
              sourceType: 'supabase' // Map to existing filter/ui logic
            };
            supabaseVideos.push(videoData);
          }
        }
      }
    } catch (error) {
      console.error('خطأ في جلب الفيديوهات من R2:', error);
    }

    setVideosTotalBytes(totalBytes);
    return supabaseVideos;
  };

  // Fetch Supabase Images
  const fetchSupabaseImages = useCallback(async (): Promise<ImageData[]> => {
    const supabaseImages: ImageData[] = [];
    let totalBytes = 0;

    // جميع الـ buckets التي قد تحتوي على صور
    const imageBuckets = [
      'profile-images',
      'additional-images',
      'player-avatar',
      'player-additional-images',
      'playertrainer',
      'playerclub',
      'playeragent',
      'playeracademy',
      'avatars'
    ];

    console.log('🔍 جاري البحث عن الصور في Supabase buckets:', imageBuckets);

    // Import server action dynamically
    const { listBucketFiles } = await import('@/app/actions/media');

    // Fetch all buckets in parallel
    const bucketPromises = imageBuckets.map(async (bucketName) => {
      try {
        console.log(`📂 فحص bucket (async): ${bucketName}`);
        const result = await listBucketFiles(bucketName, '');
        return { bucketName, ...result };
      } catch (error) {
        return { bucketName, success: false, error, files: [] };
      }
    });

    const results = await Promise.all(bucketPromises);

    for (const { bucketName, success, files, error } of results) {
      if (!success) {
        console.warn(`⚠️ خطأ في جلب الصور من R2 ${bucketName}:`, error);
        continue;
      }

      // Process files
      console.log(`📊 عدد الملفات في ${bucketName}:`, files?.length || 0);

      if (files && files.length > 0) {
        console.log(`✅ تم العثور على ${files.length} ملف في ${bucketName}`);
        for (const file of files) {
          // تحقق من نوع الملف (صور فقط)
          const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
          if (!isImage) continue;

          console.log(`🖼️ معالجة صورة: ${file.name} من ${bucketName}`);

          let userId = 'unknown';
          let userName = 'مستخدم غير معروف';

          // استخراج معرف المستخدم من اسم الملف
          // في R2 (cloudflare provider)، الاسم يشمل المسار
          if (file.name.includes('/')) {
            userId = file.name.split('/')[0];
            userName = `مستخدم ${userId}`;
          } else if (file.name.includes('.')) {
            // ملفات مثل userId.jpg
            userId = file.name.split('.')[0];
            userName = `مستخدم ${userId}`;
          }


          // Construct R2 Public URL
          const publicUrl = `https://assets.el7lm.com/${bucketName}/${file.name}`;

          const size = file.size || 0;
          totalBytes += size;
          const getSupabaseImageType = (bucketName: string): 'profile' | 'cover' | 'additional' | 'avatar' | 'unknown' => {
            if (bucketName.includes('profile') || bucketName.includes('avatar')) return 'profile';
            if (bucketName.includes('cover')) return 'cover';
            if (bucketName.includes('additional')) return 'additional';
            return 'unknown';
          };

          let imgFileName = file.name.split('/').pop() || file.name;
          let displayTitle = imgFileName;

          // Context-aware using bucket
          if (bucketName.includes('avatar') || bucketName.includes('profile')) {
            displayTitle = 'صورة شخصية';
          } else if (bucketName.includes('club')) {
            displayTitle = 'شعار النادي';
          } else if (bucketName.includes('logo')) {
            displayTitle = 'شعار';
          } else if (bucketName.includes('cover')) {
            displayTitle = 'صورة غلاف';
          } else if (bucketName.includes('additional')) {
            displayTitle = 'صورة إضافية';
          } else if (bucketName.includes('documents')) {
            displayTitle = 'وثيقة';
          }

          // Check for timestamp in filename
          const tsMatch = imgFileName.match(/^(\d{13})/);
          if (tsMatch) {
            const ts = parseInt(tsMatch[1]);
            const date = new Date(ts);
            if (!isNaN(date.getTime())) {
              // If we created a generic title context, append date
              if (displayTitle !== imgFileName) {
                displayTitle += ` (${date.toLocaleDateString('ar-EG')})`;
              } else {
                displayTitle = `صورة ${date.toLocaleDateString('ar-EG')}`;
              }
            }
          } else if (file.updated) {
            // Use file updated time if filename isn't helping and name matches generic pattern
            const date = new Date(file.updated);
            if (displayTitle !== imgFileName && displayTitle === 'صورة شخصية') {
              displayTitle += ` ${date.toLocaleDateString('ar-EG')}`;
            } else if (displayTitle === imgFileName) {
              // Clean up filename
              displayTitle = imgFileName.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ");
            }
          }

          const imageData: ImageData = {
            id: `r2_img_${bucketName}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
            title: displayTitle,
            description: 'صورة مخزنة في النظام',
            url: publicUrl,
            thumbnailUrl: publicUrl,
            uploadDate: file.updated || new Date(),
            userId: userId,
            userEmail: '',
            userName: userName,
            accountType: 'supabase', // or 'r2'
            status: 'pending',
            views: 0,
            likes: 0,
            comments: 0,
            phone: '',
            sourceType: 'supabase',
            imageType: getSupabaseImageType(bucketName)
          };
          supabaseImages.push(imageData);
          console.log(`✅ تمت إضافة صورة: ${imageData.title} - ${publicUrl}`);
        }
      } else {
        console.log(`ℹ️ لا توجد ملفات في ${bucketName}`);
      }
    }

    console.log(`📈 إجمالي الصور المجلبة من Supabase: ${supabaseImages.length}`);
    setImagesTotalBytes(totalBytes);
    return supabaseImages;
  }, []);

  // Cleanup user media from Supabase when user is disabled/deleted
  // Cleanup user media using Server Action (supports R2 + Supabase)
  const cleanedUsersRef = React.useRef<Set<string>>(new Set());
  const cleanupUserMedia = useCallback(async (userId: string) => {
    try {
      // Import dynamically if needed, or just call the imported action
      const { deleteUserMedia } = await import('@/app/actions/media');

      const result = await deleteUserMedia(userId);

      if (result.success) {
        cleanedUsersRef.current.add(userId);
        console.log(`🧹 تم تنظيف وسائط المستخدم ${userId} بنجاح (Deleted ${result.deletedCount} files)`);
      } else {
        console.error('خطأ جزئي أثناء التنظيف:', result.errors);
      }
    } catch (e) {
      console.error('خطأ أثناء تنظيف وسائط المستخدم:', e);
    }
  }, []);

  // Process cleanup queue one by one with rate limiting
  useEffect(() => {
    if (cleanupQueue.length === 0) return;

    let isMounted = true;
    let timeoutId: any;

    const processNext = async () => {
      // Optimization: Batch skip already cleaned users
      let cleanupHistory: Record<string, number> = {};
      try {
        cleanupHistory = JSON.parse(localStorage.getItem('media_cleanup_history') || '{}');
      } catch (e) {
        console.error('Failed to parse cleanup history, resetting:', e);
        cleanupHistory = {};
      }

      const now = Date.now();

      let firstNeededIndex = -1;

      for (let i = 0; i < cleanupQueue.length; i++) {
        const id = cleanupQueue[i];
        const last = cleanupHistory[id];
        if (!last || (now - last) > 24 * 60 * 60 * 1000) {
          firstNeededIndex = i;
          break;
        }
      }

      if (firstNeededIndex === -1 && cleanupQueue.length > 0) {
        // All items in queue are recently cleaned
        if (isMounted) setCleanupQueue([]);
        return;
      }

      if (firstNeededIndex > 0) {
        // Skip the first N items
        if (isMounted) setCleanupQueue(prev => prev.slice(firstNeededIndex));
        return;
      }

      const userId = cleanupQueue[0];

      try {
        await cleanupUserMedia(userId);
        if (!isMounted) return;

        // Update history
        cleanupHistory[userId] = now;
        localStorage.setItem('media_cleanup_history', JSON.stringify(cleanupHistory));
      } catch (err) {
        console.error('Queue processing error:', err);
      }

      if (!isMounted) return;

      // Remove from queue and wait a bit before processing next
      timeoutId = setTimeout(() => {
        if (isMounted) setCleanupQueue(prev => prev.slice(1));
      }, 1000); // 1 second delay between requests
    };

    processNext();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [cleanupQueue, cleanupUserMedia]);

  // Watch users status changes and hide/cleanup media for disabled/deleted users
  useEffect(() => {
    if (!user || !userData || (userData.accountType !== 'admin' && userData.role !== 'admin')) return;
    const collections = ['students', 'coaches', 'academies', 'players'];
    const unsubs: (() => void)[] = [];
    const currentDisabled = new Set<string>();

    for (const collectionName of collections) {
      const unsub = onSnapshot(collection(db, collectionName), (snap) => {
        const idsToQueue: string[] = [];
        snap.forEach((d) => {
          const u = d.data() as any;
          const isDisabled = u?.isDeleted === true || u?.isActive === false;
          if (isDisabled) {
            currentDisabled.add(d.id);
            // Trigger cleanup once per user
            if (!cleanedUsersRef.current.has(d.id)) {
              cleanedUsersRef.current.add(d.id); // Mark as 'seen' this session
              idsToQueue.push(d.id);
            }
          }
        });

        if (idsToQueue.length > 0) {
          setCleanupQueue(prev => [...prev, ...idsToQueue]);
        }
        setDisabledUserIds(new Set(currentDisabled));
        // Filter already loaded media immediately
        setVideos((prev) => prev.filter((v) => !currentDisabled.has(v.userId)));
        setImages((prev) => prev.filter((i) => !currentDisabled.has(i.userId)));
      });
      unsubs.push(unsub);
    }

    return () => unsubs.forEach((u) => u());
  }, [user, userData, db, cleanupUserMedia]);

  // Fetch Videos
  useEffect(() => {
    const fetchVideos = async () => {
      if (!user || !userData || (userData.accountType !== 'admin' && userData.role !== 'admin')) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const allVideos: VideoData[] = [];
      const userMap = new Map<string, string>();

      // Fetch from Firebase collections
      const collections = ['students', 'coaches', 'academies', 'players'];

      const collectionPromises = collections.map(async (collectionName) => {
        try {
          const snap = await getDocs(collection(db, collectionName));
          return { collectionName, snap };
        } catch (e) {
          console.error(`Error fetching ${collectionName}`, e);
          return { collectionName, snap: null };
        }
      });

      const results = await Promise.all(collectionPromises);

      for (const { collectionName, snap: querySnapshot } of results) {
        if (!querySnapshot) continue;

        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          const userName = userData.full_name || userData.name || userData.userName || 'مستخدم';
          userMap.set(doc.id, userName);

          if (userData?.isDeleted === true) return;
          const userVideos = userData.videos || [];

          userVideos.forEach((video: any, index: number) => {
            if (video && video.url) {
              const videoData: VideoData = {
                id: `${doc.id}_${index}`,
                title: video.title || video.desc || `فيديو ${index + 1}`,
                description: video.description || video.desc || '',
                url: video.url,
                thumbnailUrl: video.thumbnail || video.thumbnailUrl,
                duration: video.duration || 0,
                uploadDate: video.uploadDate || video.createdAt || video.updated_at || new Date(),
                userId: doc.id,
                userEmail: userData.email || userData.userEmail || '',
                userName: userData.full_name || userData.name || userData.userName || 'مستخدم',
                accountType: getAccountTypeFromCollection(collectionName),
                status: video.status || 'pending',
                views: video.views || 0,
                likes: video.likes || 0,
                comments: video.comments || 0,
                phone: userData.phone || userData.phoneNumber || '',
                sourceType: getVideoSourceType(video.url)
              };
              allVideos.push(videoData);
            }
          });
        });
      }

      // Fetch from Supabase
      try {
        const supabaseVideos = await fetchSupabaseVideos();
        // Update user names from map
        supabaseVideos.forEach(v => {
          if (userMap.has(v.userId)) {
            v.userName = userMap.get(v.userId)!;
          }
        });
        allVideos.push(...supabaseVideos);
      } catch (error) {
        console.error('خطأ في جلب الفيديوهات من Supabase:', error);
      }

      setVideos(allVideos);
      setLoading(false);
    };

    fetchVideos();
  }, [user?.uid, userData?.role]);

  // Function to refetch images after update
  const refetchImages = useCallback(async () => {
    if (!user || !userData || (userData.accountType !== 'admin' && userData.role !== 'admin')) return;

    setImagesLoading(true);
    const allImages: ImageData[] = [];
    const userMap = new Map<string, string>();

    console.log('🔍 بدء جلب الصور من Firebase و Supabase...');

    // Fetch from Firebase collections
    const collections = ['students', 'coaches', 'academies', 'players'];

    const collectionPromises = collections.map(async (collectionName) => {
      try {
        console.log(`📂 جلب الصور من مجموعة (async): ${collectionName}`);
        const snap = await getDocs(collection(db, collectionName));
        return { collectionName, snap };
      } catch (e) {
        console.error(`Error fetching ${collectionName}`, e);
        return { collectionName, snap: null };
      }
    });

    const results = await Promise.all(collectionPromises);

    for (const { collectionName, snap: querySnapshot } of results) {
      if (!querySnapshot) continue;
      let collectionImageCount = 0;

      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const userName = userData.full_name || userData.name || userData.userName || 'مستخدم';
        userMap.set(doc.id, userName);

        if (userData?.isDeleted === true) return;

        // البحث في حقول مختلفة للصور
        const imageFields = [
          'images',
          'additional_images',
          'profile_image',
          'cover_image',
          'avatar',
          'profileImage',
          'coverImage'
        ];

        imageFields.forEach(fieldName => {
          const fieldData = userData[fieldName];

          if ((fieldName === 'profile_image' || fieldName === 'cover_image' || fieldName === 'avatar' || fieldName === 'profileImage' || fieldName === 'coverImage') && fieldData) {
            // صورة واحدة
            const getImageType = (fieldName: string): 'profile' | 'cover' | 'additional' | 'avatar' | 'unknown' => {
              if (fieldName.includes('profile') || fieldName === 'avatar') return 'profile';
              if (fieldName.includes('cover')) return 'cover';
              if (fieldName === 'avatar') return 'avatar';
              return 'unknown';
            };

            const imageUrl = typeof fieldData === 'string' ? fieldData : (typeof fieldData?.url === 'string' ? fieldData.url : '');
            const imageThumbnailUrl = typeof fieldData === 'string' ? fieldData : (typeof fieldData?.thumbnail === 'string' ? fieldData.thumbnail : (typeof fieldData?.url === 'string' ? fieldData.url : ''));

            // Skip if no valid URL
            if (!imageUrl || imageUrl.trim() === '' || imageUrl === '[object Object]') {
              console.warn(`Skipping invalid image URL for ${fieldName}:`, fieldData);
              return;
            }

            const imageData: ImageData = {
              id: `${doc.id}_${fieldName}`,
              title: fieldName === 'profile_image' || fieldName === 'profileImage' ? 'صورة شخصية' :
                fieldName === 'cover_image' || fieldName === 'coverImage' ? 'صورة غلاف' :
                  fieldName === 'avatar' ? 'أفاتار' : fieldName,
              description: `صورة ${fieldName} للمستخدم`,
              url: imageUrl,
              thumbnailUrl: imageThumbnailUrl,
              uploadDate: userData.createdAt || userData.created_at || new Date(),
              userId: doc.id,
              userEmail: userData.email || userData.userEmail || '',
              userName: userData.full_name || userData.name || userData.userName || 'مستخدم',
              accountType: getAccountTypeFromCollection(collectionName),
              status: 'approved',
              views: 0,
              likes: 0,
              comments: 0,
              phone: userData.phone || userData.phoneNumber || '',
              sourceType: 'firebase' as const,
              imageType: getImageType(fieldName)
            };
            allImages.push(imageData);
            collectionImageCount++;
          } else if (Array.isArray(fieldData)) {
            // مصفوفة صور
            fieldData.forEach((image: any, index: number) => {
              if (image && typeof image === 'string') {
                const imageUrl = image;
                const imageThumbnailUrl = image; // Assuming thumbnail is same as URL for string images

                // Skip if no valid URL
                if (!imageUrl || imageUrl.trim() === '' || imageUrl === '[object Object]') {
                  console.warn(`Skipping invalid image URL for ${fieldName}[${index}]:`, image);
                  return;
                }

                const getImageType = (fieldName: string): 'profile' | 'cover' | 'additional' | 'avatar' | 'unknown' => {
                  if (fieldName.includes('profile') || fieldName === 'avatar') return 'profile';
                  if (fieldName.includes('cover')) return 'cover';
                  if (fieldName.includes('additional')) return 'additional';
                  return 'unknown';
                };

                const imageData: ImageData = {
                  id: `${doc.id}_${fieldName}_${index}`,
                  title: `صورة ${index + 1}`,
                  description: `صورة من حقل ${fieldName}`,
                  url: imageUrl,
                  thumbnailUrl: imageThumbnailUrl,
                  uploadDate: userData.createdAt || new Date(),
                  userId: doc.id,
                  userEmail: userData.email || userData.userEmail || '',
                  userName: userData.full_name || userData.name || userData.userName || 'مستخدم',
                  accountType: getAccountTypeFromCollection(collectionName),
                  status: 'pending',
                  views: 0,
                  likes: 0,
                  comments: 0,
                  phone: userData.phone || userData.phoneNumber || '',
                  sourceType: 'firebase' as const,
                  imageType: getImageType(fieldName)
                };
                allImages.push(imageData);
                collectionImageCount++;
              } else if (image && image.url) {
                const getImageType = (fieldName: string): 'profile' | 'cover' | 'additional' | 'avatar' | 'unknown' => {
                  if (fieldName.includes('profile') || fieldName === 'avatar') return 'profile';
                  if (fieldName.includes('cover')) return 'cover';
                  if (fieldName.includes('additional')) return 'additional';
                  return 'unknown';
                };

                const imageData: ImageData = {
                  id: `${doc.id}_${fieldName}_${index}`,
                  title: image.title || `صورة ${index + 1}`,
                  description: image.description || image.desc || '',
                  url: image.url,
                  thumbnailUrl: image.thumbnail || image.thumbnailUrl || image.url,
                  uploadDate: image.uploadDate || userData.createdAt || new Date(),
                  userId: doc.id,
                  userEmail: userData.email || userData.userEmail || '',
                  userName: userData.full_name || userData.name || userData.userName || 'مستخدم',
                  accountType: getAccountTypeFromCollection(collectionName),
                  status: image.status || 'pending',
                  views: image.views || 0,
                  likes: image.likes || 0,
                  comments: image.comments || 0,
                  phone: userData.phone || userData.phoneNumber || '',
                  sourceType: 'firebase' as const,
                  imageType: getImageType(fieldName)
                };
                allImages.push(imageData);
                collectionImageCount++;
              }
            });
          }
        });
      });

      console.log(`✅ تم جلب ${collectionImageCount} صورة من ${collectionName}`);
    }

    console.log(`📊 إجمالي الصور من Firebase: ${allImages.length}`);

    // Fetch from Supabase
    try {
      const supabaseImages = await fetchSupabaseImages();
      // Update user names from map
      supabaseImages.forEach(img => {
        if (userMap.has(img.userId)) {
          img.userName = userMap.get(img.userId)!;
        }
      });
      allImages.push(...supabaseImages);
      console.log(`📊 إجمالي الصور بعد Supabase: ${allImages.length}`);
    } catch (error) {
      console.error('❌ خطأ في جلب الصور من Supabase:', error);
    }

    setImages(allImages);
    setImagesLoading(false);
    console.log(`🎉 انتهى جلب الصور. العدد النهائي: ${allImages.length}`);

    return allImages;
  }, [user?.uid, userData?.role, fetchSupabaseImages]);

  // Fetch Images
  useEffect(() => {
    const fetchImages = async () => {
      if (!user || !userData || (userData.accountType !== 'admin' && userData.role !== 'admin')) return;

      setImagesLoading(true);
      await refetchImages();
    };

    fetchImages();
  }, [user?.uid, userData?.role, refetchImages]);

  // Get current media data based on active tab
  const currentMediaData = activeTab === 'videos' ? videos : images;
  const currentLoading = activeTab === 'videos' ? loading : imagesLoading;

  // Filter and Sort media
  const filteredMedia = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    // Filter data
    const filtered = currentMediaData.filter((item) => {
      const matchesTerm = !term ||
        item.title?.toLowerCase().includes(term) ||
        item.userName?.toLowerCase().includes(term) ||
        item.userEmail?.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesAccount = accountTypeFilter === 'all' || item.accountType === accountTypeFilter;
      const matchesSource = sourceFilter === 'all' || item.sourceType === sourceFilter;
      const meta = mediaIdToLogsMeta[item.id];
      const matchesEvent = eventFilter === 'all' || (meta?.lastAction === eventFilter);
      const matchesActionTaken = actionTakenFilter === 'all' || (actionTakenFilter === 'taken' ? !!meta?.hasAction : !meta?.hasAction);
      const matchesMessageSent = messageSentFilter === 'all' || (messageSentFilter === 'sent' ? !!meta?.hasMessage : !meta?.hasMessage);

      // Image type filter only applies to images
      const matchesImageType = activeTab === 'videos' || imageTypeFilter === 'all' ||
        (activeTab === 'images' && (item as ImageData).imageType === imageTypeFilter);

      return matchesTerm && matchesStatus && matchesAccount && matchesSource && matchesEvent && matchesActionTaken && matchesMessageSent && matchesImageType;
    });

    // Sort data
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          const dateA = new Date(a.uploadDate);
          const dateB = new Date(b.uploadDate);
          return dateB.getTime() - dateA.getTime();

        case 'oldest':
          const dateAOld = new Date(a.uploadDate);
          const dateBOld = new Date(b.uploadDate);
          return dateAOld.getTime() - dateBOld.getTime();

        case 'title_asc':
          return a.title.localeCompare(b.title, 'ar');

        case 'title_desc':
          return b.title.localeCompare(a.title, 'ar');

        case 'status':
          const statusOrder = { 'pending': 0, 'flagged': 1, 'approved': 2, 'rejected': 3 };
          return statusOrder[a.status] - statusOrder[b.status];

        default:
          return 0;
      }
    });

    return sorted;
  }, [currentMediaData, searchTerm, statusFilter, accountTypeFilter, sourceFilter, eventFilter, actionTakenFilter, messageSentFilter, imageTypeFilter, sortOrder, activeTab, mediaIdToLogsMeta]);

  // Pagination
  const totalItems = filteredMedia.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMedia = filteredMedia.slice(startIndex, startIndex + itemsPerPage);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, accountTypeFilter, sourceFilter, eventFilter, actionTakenFilter, messageSentFilter, imageTypeFilter, sortOrder, activeTab, itemsPerPage]);

  // Fetch logs for media
  const fetchLogs = useCallback(async (mediaId: string) => {
    if (!mediaId) return;

    setLogsLoading(true);
    try {
      const logs = await actionLogService.getVideoLogs(mediaId);
      setLogs(logs);

      // Build metadata for advanced filters without causing re-render
      setTimeout(() => {
        const hasAction = logs.some(l => ['status_change', 'approve', 'reject', 'flag', 'review'].includes(l.action));
        const hasMessage = logs.some(l => l.action === 'notification_sent');
        const lastAction = logs[0]?.action;
        setMediaIdToLogsMeta(prev => ({ ...prev, [mediaId]: { lastAction, hasAction, hasMessage } }));
      }, 0);
    } catch (error) {
      console.error('خطأ في جلب السجلات:', error);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  // Update media status
  const updateMediaStatus = async (mediaId: string, newStatus: string) => {
    if (!selectedMedia) return;

    try {
      const [userId, itemIndex] = mediaId.split('_');
      const isImage = mediaId.includes('img');
      const collectionName = selectedMedia.accountType === 'student' ? 'students' :
        selectedMedia.accountType === 'coach' ? 'coaches' : 'academies';

      const userRef = doc(db, collectionName, userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const mediaArray = isImage ? (userData.images || []) : (userData.videos || []);
        const realIndex = parseInt(itemIndex.replace('img_', ''));

        if (mediaArray[realIndex]) {
          mediaArray[realIndex].status = newStatus;
          mediaArray[realIndex].updatedAt = new Date();

          const updateData = isImage ? { images: mediaArray } : { videos: mediaArray };
          await updateDoc(userRef, updateData);

          // Update local state
          if (isImage) {
            setImages(prev => prev.map(item =>
              item.id === mediaId ? { ...item, status: newStatus as any } : item
            ));
          } else {
            setVideos(prev => prev.map(item =>
              item.id === mediaId ? { ...item, status: newStatus as any } : item
            ));
          }

          setSelectedMedia(prev => prev ? { ...prev, status: newStatus as any } : null);

          // Log action
          await actionLogService.logVideoAction({
            action: 'status_change',
            videoId: mediaId,
            playerId: userId,
            actionBy: user?.uid || 'system',
            actionByType: 'admin',
            details: {
              oldStatus: selectedMedia.status,
              newStatus: newStatus,
              notes: `تم تغيير حالة ${isImage ? 'الصورة' : 'الفيديو'} إلى: ${newStatus}`,
              adminNotes: `تم التغيير بواسطة: ${user?.email}`
            }
          });

          fetchLogs(mediaId);
        }
      }
    } catch (error) {
      console.error('خطأ في تحديث حالة الوسائط:', error);
    }
  };

  // Open media details
  const openMediaDetails = useCallback((media: MediaData) => {
    setSelectedMedia(media);
    setIsDetailsOpen(true);
    fetchLogs(media.id);
  }, [fetchLogs]);

  // Open media preview
  const openMediaPreview = useCallback((media: MediaData, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedMedia(media);
    setIsDetailsOpen(true);
  }, []);

  // Simplified phone number formatting
  const formatPhoneNumber = (phone: string | undefined): string => {
    return cleanPhoneNumber(phone || '');
  };

  const displayPhoneNumber = (phone: string | undefined): string => {
    if (!phone) return 'غير متوفر';
    const cleanPhone = formatPhoneNumber(phone);
    if (!cleanPhone) return 'غير متوفر';
    return `+${cleanPhone}`;
  };

  // Quick Actions for media
  const handleQuickApprove = useCallback(async (media: MediaData, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click
    try {
      // Update database
      const userId = media.userId;
      const userRef = doc(db, 'players', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const isImage = activeTab === 'images';
        const mediaArray = isImage ? (userData.images || []) : (userData.videos || []);

        // Find the media in the array - try multiple matching strategies
        let mediaIndex = -1;

        // Strategy 1: Match by ID
        mediaIndex = mediaArray.findIndex((m: any) => m.id === media.id);

        // Strategy 2: Match by URL (if ID didn't match)
        if (mediaIndex === -1 && media.url) {
          mediaIndex = mediaArray.findIndex((m: any) => m.url === media.url || m.url?.includes(media.url) || media.url?.includes(m.url));
        }

        // Strategy 3: Match by title (if URL didn't match)
        if (mediaIndex === -1 && media.title) {
          mediaIndex = mediaArray.findIndex((m: any) =>
            (m.title && m.title === media.title) ||
            (m.desc && m.desc === media.title) ||
            (m.description && m.description === media.title)
          );
        }

        // Strategy 4: Match by index in ID (for IDs like userId_index)
        if (mediaIndex === -1 && media.id.includes('_')) {
          const parts = media.id.split('_');
          const indexPart = parts[parts.length - 1];
          const numericIndex = parseInt(indexPart);
          if (!isNaN(numericIndex) && numericIndex < mediaArray.length) {
            mediaIndex = numericIndex;
          }
        }

        if (mediaIndex !== -1) {
          mediaArray[mediaIndex].status = 'approved';
          mediaArray[mediaIndex].updatedAt = new Date();

          const updateData = isImage ? { images: mediaArray } : { videos: mediaArray };
          await updateDoc(userRef, updateData);
        } else {
          console.warn(`⚠️ لم يتم العثور على ${isImage ? 'الصورة' : 'الفيديو'} في قاعدة البيانات`);
        }
      }

      // Update local state
      if (activeTab === 'videos') {
        setVideos(prev => prev.map(v =>
          v.id === media.id ? { ...v, status: 'approved' as const } : v
        ));
      } else {
        setImages(prev => prev.map(i =>
          i.id === media.id ? { ...i, status: 'approved' as const } : i
        ));
        // Refetch images to ensure database changes are reflected
        setTimeout(() => refetchImages(), 500);
      }

      // Log action
      await actionLogService.logVideoAction({
        action: 'status_change',
        videoId: media.id,
        playerId: media.userId,
        actionBy: user?.uid || 'system',
        actionByType: 'admin',
        details: {
          oldStatus: media.status,
          newStatus: 'approved',
          notes: `تم الموافقة على ${activeTab === 'videos' ? 'الفيديو' : 'الصورة'} بواسطة المدير`,
          adminNotes: `تم التغيير بواسطة: ${user?.email}`
        }
      });

      toast.success(`تم الموافقة على ${activeTab === 'videos' ? 'الفيديو' : 'الصورة'} بنجاح`);
    } catch (error) {
      console.error('Error approving media:', error);
      toast.error(`حدث خطأ أثناء الموافقة على ${activeTab === 'videos' ? 'الفيديو' : 'الصورة'}`);

      // Revert local state on error
      if (activeTab === 'videos') {
        setVideos(prev => prev.map(v =>
          v.id === media.id ? { ...v, status: media.status } : v
        ));
      } else {
        setImages(prev => prev.map(i =>
          i.id === media.id ? { ...i, status: media.status } : i
        ));
      }
    }
  }, [activeTab, user?.uid, user?.email]);

  // Delete media function
  const handleDeleteMedia = useCallback(async (media: MediaData, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click

    // Log media data for debugging
    console.log('🗑️ محاولة حذف الوسائط:', {
      id: media.id,
      title: media.title,
      accountType: media.accountType,
      userId: media.userId,
      sourceType: media.sourceType,
      status: media.status,
      phone: media.phone,
      userName: media.userName
    });

    // Confirm deletion
    const confirmMessage = `⚠️ تأكيد الحذف النهائي\n\nهل أنت متأكد من حذف ${activeTab === 'videos' ? 'الفيديو' : 'الصورة'} "${media.title}"؟\n\nهذا الإجراء سيقوم بحذف الوسائط من:\n• واجهة الإدارة\n• قاعدة البيانات (Firebase)\n• التخزين السحابي (إذا كان من Supabase)\n• جميع الصفحات المتعلقة\n\n⚠️ هذا الإجراء لا يمكن التراجع عنه!`;
    if (!confirm(confirmMessage)) {
      return;
    }

    // Ask if admin wants to notify the user
    let shouldNotify = false;
    if (media.phone) {
      shouldNotify = confirm(`هل تريد إرسال إشعار للعميل ${media.userName} (${media.phone}) بإعلامه بحذف ${activeTab === 'videos' ? 'الفيديو' : 'الصورة'}؟`);
    }

    try {
      // Remove from local state immediately for better UX
      if (activeTab === 'videos') {
        setVideos(prev => prev.filter(v => v.id !== media.id));
      } else {
        setImages(prev => prev.filter(i => i.id !== media.id));
      }

      // Delete from Firebase database
      await deleteMediaFromDatabase(media);

      // Log deletion action
      await actionLogService.logVideoAction({
        action: 'reject',
        videoId: media.id,
        playerId: media.userId,
        actionBy: user?.uid || 'system',
        actionByType: 'admin',
        details: {
          oldStatus: media.status,
          newStatus: 'deleted',
          notes: `تم حذف ${activeTab === 'videos' ? 'الفيديو' : 'الصورة'} "${media.title}" بواسطة المدير`,
          adminNotes: `تم الحذف بواسطة: ${user?.email} - ${media.userName} (${media.phone})`
        }
      });

      // Send notification to user about deletion (if admin chose to)
      if (media.phone && shouldNotify) {
        try {
          const phoneNumber = formatPhoneNumber(media.phone);
          if (phoneNumber) {
            const deletionMessage = `مرحباً ${media.userName || 'عزيزي العميل'}،

نود إعلامك بأن ${activeTab === 'videos' ? 'الفيديو' : 'الصورة'} "${media.title}" قد تم حذفها من منصة العلم.

السبب: عدم الالتزام بمعايير المحتوى أو السياسات المحددة.

نشكرك لاستخدامك منصة العلم ونتمنى لك تجربة أفضل في المستقبل.

مع تحيات فريق العمل`;

            // Try SMS first, then WhatsApp as fallback
            let notificationSent = false;
            let notificationMethod = '';

            // Send SMS notification via Baba Service (not BeOn)
            try {
              const smsResponse = await fetch('/api/whatsapp/babaservice/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({
                  type: 'sms',
                  phoneNumbers: [phoneNumber],
                  message: deletionMessage
                })
              });

              if (smsResponse.ok) {
                console.log('✅ تم إرسال إشعار الحذف عبر SMS');
                notificationSent = true;
                notificationMethod = 'sms';
              } else {
                console.warn('⚠️ فشل في إرسال إشعار الحذف عبر SMS، جاري المحاولة عبر WhatsApp');
              }
            } catch (smsError) {
              console.warn('⚠️ خطأ في إرسال SMS، جاري المحاولة عبر WhatsApp:', smsError);
            }

            // Fallback to WhatsApp if SMS fails
            if (!notificationSent) {
              try {
                const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(deletionMessage)}`;
                // Note: We can't actually send WhatsApp programmatically, but we can log it
                console.log('📱 رابط WhatsApp للإشعار:', whatsappUrl);
                notificationSent = true;
                notificationMethod = 'whatsapp_link';
              } catch (whatsappError) {
                console.error('❌ خطأ في إنشاء رابط WhatsApp:', whatsappError);
              }
            }

            // Log notification sent
            if (notificationSent) {
              await actionLogService.logVideoAction({
                action: 'notification_sent',
                videoId: media.id,
                playerId: media.userId,
                actionBy: user?.uid || 'system',
                actionByType: 'admin',
                details: {
                  notificationType: 'sms',
                  notificationMessage: deletionMessage,
                  notes: `تم إرسال إشعار حذف ${activeTab === 'videos' ? 'الفيديو' : 'الصورة'} "${media.title}" عبر ${notificationMethod}`,
                  adminNotes: `إشعار الحذف أرسل إلى: ${phoneNumber}`
                }
              });
            }
          }
        } catch (notificationError) {
          console.error('❌ خطأ في إرسال إشعار الحذف:', notificationError);
        }
      }

      // Show success message
      let successMessage = `✅ تم حذف ${activeTab === 'videos' ? 'الفيديو' : 'الصورة'} بنجاح من:\n`;
      successMessage += `• واجهة الإدارة\n`;
      successMessage += `• قاعدة البيانات (Firebase)\n`;
      if (media.sourceType === 'supabase') {
        successMessage += `• التخزين السحابي (Supabase)\n`;
      }
      successMessage += `• جميع الصفحات المتعلقة\n\n`;

      if (media.phone && shouldNotify) {
        successMessage += `📱 تم إرسال إشعار للعميل`;
      } else if (media.phone && !shouldNotify) {
        successMessage += `📱 لم يتم إرسال إشعار للعميل`;
      }

      alert(successMessage);

    } catch (error) {
      console.error('❌ خطأ في حذف الوسائط:', error);

      // Show detailed error message
      let errorMessage = 'حدث خطأ أثناء حذف الوسائط';
      if (error instanceof Error) {
        errorMessage += `\n\nالتفاصيل: ${error.message}`;
      }
      alert(errorMessage);

      // Revert local state on error
      if (activeTab === 'videos') {
        setVideos(prev => [...prev, media as VideoData]);
      } else {
        setImages(prev => [...prev, media as ImageData]);
      }
    }
  }, [activeTab, user?.uid]);

  // Bulk selection functions
  const toggleBulkMode = () => {
    setIsBulkMode(!isBulkMode);
    if (isBulkMode) {
      // Clear selections when exiting bulk mode
      setSelectedVideos(new Set());
      setSelectedImages(new Set());
    }
  };

  const toggleMediaSelection = (mediaId: string) => {
    if (activeTab === 'videos') {
      setSelectedVideos(prev => {
        const newSet = new Set(prev);
        if (newSet.has(mediaId)) {
          newSet.delete(mediaId);
        } else {
          newSet.add(mediaId);
        }
        return newSet;
      });
    } else {
      setSelectedImages(prev => {
        const newSet = new Set(prev);
        if (newSet.has(mediaId)) {
          newSet.delete(mediaId);
        } else {
          newSet.add(mediaId);
        }
        return newSet;
      });
    }
  };

  const selectAllMedia = () => {
    if (activeTab === 'videos') {
      const allVideoIds = videos.map(v => v.id);
      setSelectedVideos(new Set(allVideoIds));
    } else {
      const allImageIds = images.map(i => i.id);
      setSelectedImages(new Set(allImageIds));
    }
  };

  const clearAllSelections = () => {
    setSelectedVideos(new Set());
    setSelectedImages(new Set());
  };

  const getSelectedCount = () => {
    return activeTab === 'videos' ? selectedVideos.size : selectedImages.size;
  };

  const getSelectedMedia = () => {
    if (activeTab === 'videos') {
      return videos.filter(v => selectedVideos.has(v.id));
    } else {
      return images.filter(i => selectedImages.has(i.id));
    }
  };

  // Function to delete media from Firebase database
  const deleteMediaFromDatabase = async (media: MediaData) => {
    try {
      console.log('🗑️ بدء حذف الوسائط من قاعدة البيانات:', {
        mediaId: media.id,
        mediaTitle: media.title,
        accountType: media.accountType,
        userId: media.userId,
        sourceType: media.sourceType
      });

      // Parse media ID to get user ID and media index
      const [userId, mediaIndex] = media.id.split('_');
      const isImage = media.id.includes('img');

      console.log('🔍 تحليل معرف الوسائط:', {
        userId,
        mediaIndex,
        isImage,
        fullId: media.id
      });

      // Determine collection name based on account type
      let collectionName = '';
      switch (media.accountType) {
        case 'player':
          collectionName = 'players';
          break;
        case 'student':
          collectionName = 'students';
          break;
        case 'coach':
        case 'trainer':
          collectionName = 'coaches';
          break;
        case 'academy':
          collectionName = 'academies';
          break;
        case 'club':
          collectionName = 'clubs';
          break;
        case 'agent':
          collectionName = 'agents';
          break;
        case 'marketer':
          collectionName = 'marketers';
          break;
        default:
          collectionName = 'players'; // fallback
      }

      console.log(`📂 حذف من مجموعة: ${collectionName}, معرف المستخدم: ${userId}`);

      // Get user document
      const userRef = doc(db, collectionName, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        console.warn('⚠️ المستخدم غير موجود في قاعدة البيانات:', {
          collectionName,
          userId,
          userRef: userRef.path
        });
        throw new Error(`المستخدم غير موجود في مجموعة ${collectionName} بمعرف ${userId}`);
      }

      const userData = userDoc.data();
      console.log('📄 بيانات المستخدم الموجودة:', {
        hasVideos: !!userData.videos,
        videosCount: userData.videos?.length || 0,
        hasAdditionalImages: !!userData.additional_images,
        additionalImagesCount: userData.additional_images?.length || 0,
        hasProfileImage: !!userData.profile_image,
        hasCoverImage: !!userData.cover_image
      });

      let updatedData = { ...userData };

      if (isImage) {
        // Handle image deletion
        const imageIndex = parseInt(mediaIndex.replace('img_', ''));
        console.log('🖼️ معالجة حذف الصورة:', {
          imageIndex,
          mediaIndex,
          hasAdditionalImages: !!userData.additional_images,
          additionalImagesLength: userData.additional_images?.length || 0,
          hasImages: !!userData.images,
          imagesLength: userData.images?.length || 0,
          hasProfileImage: !!userData.profile_image,
          hasCoverImage: !!userData.cover_image
        });

        let imageDeleted = false;

        // Check different image fields
        if (userData.additional_images && userData.additional_images[imageIndex]) {
          updatedData.additional_images = userData.additional_images.filter((_: any, index: number) => index !== imageIndex);
          console.log('🖼️ حذف صورة إضافية من الفهرس:', imageIndex);
          imageDeleted = true;
        } else if (userData.images && userData.images[imageIndex]) {
          updatedData.images = userData.images.filter((_: any, index: number) => index !== imageIndex);
          console.log('🖼️ حذف صورة من الفهرس:', imageIndex);
          imageDeleted = true;
        } else if (userData.profile_image && imageIndex === 0) {
          updatedData.profile_image = null;
          console.log('🖼️ حذف الصورة الشخصية');
          imageDeleted = true;
        } else if (userData.cover_image && imageIndex === 0) {
          updatedData.cover_image = null;
          console.log('🖼️ حذف صورة الغلاف');
          imageDeleted = true;
        }

        if (!imageDeleted) {
          console.warn('⚠️ لم يتم العثور على الصورة للحذف:', {
            imageIndex,
            availableAdditionalImages: userData.additional_images?.length || 0,
            availableImages: userData.images?.length || 0,
            hasProfileImage: !!userData.profile_image,
            hasCoverImage: !!userData.cover_image
          });
        }
      } else {
        // Handle video deletion
        const videoIndex = parseInt(mediaIndex);
        console.log('🎥 معالجة حذف الفيديو:', {
          videoIndex,
          mediaIndex,
          hasVideos: !!userData.videos,
          videosLength: userData.videos?.length || 0
        });

        if (userData.videos && userData.videos[videoIndex]) {
          updatedData.videos = userData.videos.filter((_: any, index: number) => index !== videoIndex);
          console.log('🎥 حذف فيديو من الفهرس:', videoIndex);
        } else {
          console.warn('⚠️ لم يتم العثور على الفيديو للحذف:', {
            videoIndex,
            availableVideos: userData.videos?.length || 0
          });
        }
      }

      // Update user document
      await updateDoc(userRef, updatedData);
      console.log('✅ تم حذف الوسائط من قاعدة البيانات بنجاح');

      // Also delete from Supabase if it's a Supabase media
      if (media.sourceType === 'supabase') {
        try {
          console.log('🗑️ حذف من Supabase Storage...');
          await deleteFromSupabaseStorage(media);
        } catch (supabaseError) {
          console.warn('⚠️ خطأ في حذف من Supabase:', supabaseError);
        }
      }

    } catch (error) {
      console.error('❌ خطأ في حذف الوسائط من قاعدة البيانات:', error);
      throw error; // Re-throw to handle in calling function
    }
  };

  // Function to delete media from Supabase Storage
  const deleteFromSupabaseStorage = async (media: MediaData) => {
    try {
      console.log('🗑️ حذف من Supabase Storage:', media.url);

      // Extract file path from URL
      const url = new URL(media.url);
      const pathParts = url.pathname.split('/');
      const bucketName = pathParts[1]; // e.g., 'videos' or 'profile-images'
      const filePath = pathParts.slice(2).join('/'); // e.g., 'userId/filename.mp4'

      console.log(`📂 Bucket: ${bucketName}, File Path: ${filePath}`);

      // Delete from Supabase Storage
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        console.error('❌ خطأ في حذف من Supabase Storage:', error);
        throw error;
      }

      console.log('✅ تم حذف الملف من Supabase Storage بنجاح');

    } catch (error) {
      console.error('❌ خطأ في حذف من Supabase Storage:', error);
      throw error;
    }
  };

  // Bulk delete function
  const handleBulkDelete = async () => {
    const selectedMedia = getSelectedMedia();
    if (selectedMedia.length === 0) {
      alert('لم يتم تحديد أي وسائط للحذف');
      return;
    }

    const confirmMessage = `⚠️ تأكيد الحذف النهائي\n\nهل أنت متأكد من حذف ${selectedMedia.length} ${activeTab === 'videos' ? 'فيديو' : 'صورة'}؟\n\nهذا الإجراء سيقوم بحذف الوسائط من:\n• واجهة الإدارة\n• قاعدة البيانات (Firebase)\n• التخزين السحابي (إذا كان من Supabase)\n• جميع الصفحات المتعلقة\n\n⚠️ هذا الإجراء لا يمكن التراجع عنه!`;

    if (!confirm(confirmMessage)) {
      return;
    }

    // Ask if admin wants to notify users
    let shouldNotify = false;
    const hasPhoneNumbers = selectedMedia.some(media => media.phone);
    if (hasPhoneNumbers) {
      shouldNotify = confirm(`هل تريد إرسال إشعارات للعملاء الذين لديهم أرقام هواتف؟\n\nسيتم إرسال إشعارات إلى ${selectedMedia.filter(m => m.phone).length} عميل`);
    }

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Process each selected media
      for (const media of selectedMedia) {
        try {
          // Remove from local state
          if (activeTab === 'videos') {
            setVideos(prev => prev.filter(v => v.id !== media.id));
          } else {
            setImages(prev => prev.filter(i => i.id !== media.id));
          }

          // Delete from database
          await deleteMediaFromDatabase(media);

          // Log deletion action
          await actionLogService.logVideoAction({
            action: 'reject',
            videoId: media.id,
            playerId: media.userId,
            actionBy: user?.uid || 'system',
            actionByType: 'admin',
            details: {
              oldStatus: media.status,
              newStatus: 'deleted',
              notes: `تم حذف ${activeTab === 'videos' ? 'الفيديو' : 'الصورة'} "${media.title}" بواسطة المدير (حذف مجمع)`,
              adminNotes: `تم الحذف بواسطة: ${user?.email} - ${media.userName} (${media.phone})`
            }
          });

          // Send notification if requested
          if (media.phone && shouldNotify) {
            try {
              const phoneNumber = formatPhoneNumber(media.phone);
              if (phoneNumber) {
                const deletionMessage = `مرحباً ${media.userName || 'عزيزي العميل'}،

نود إعلامك بأن ${activeTab === 'videos' ? 'الفيديو' : 'الصورة'} "${media.title}" قد تم حذفها من منصة العلم.

السبب: عدم الالتزام بمعايير المحتوى أو السياسات المحددة.

نشكرك لاستخدامك منصة العلم ونتمنى لك تجربة أفضل في المستقبل.

مع تحيات فريق العمل`;

                // Send SMS notification via Baba Service (not BeOn)
                try {
                  const smsResponse = await fetch('/api/whatsapp/babaservice/notifications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                    body: JSON.stringify({
                      type: 'sms',
                      phoneNumbers: [phoneNumber],
                      message: deletionMessage
                    })
                  });

                  if (smsResponse.ok) {
                    console.log('✅ تم إرسال إشعار الحذف عبر SMS');
                  } else {
                    console.warn('⚠️ فشل في إرسال إشعار الحذف عبر SMS');
                  }
                } catch (smsError) {
                  console.warn('⚠️ خطأ في إرسال SMS:', smsError);
                }

                // Log notification
                await actionLogService.logVideoAction({
                  action: 'notification_sent',
                  videoId: media.id,
                  playerId: media.userId,
                  actionBy: user?.uid || 'system',
                  actionByType: 'admin',
                  details: {
                    notificationType: 'sms',
                    notificationMessage: deletionMessage,
                    notes: `تم إرسال إشعار حذف ${activeTab === 'videos' ? 'الفيديو' : 'الصورة'} "${media.title}" (حذف مجمع)`,
                    adminNotes: `إشعار الحذف أرسل إلى: ${phoneNumber}`
                  }
                });
              }
            } catch (notificationError) {
              console.error('❌ خطأ في إرسال إشعار الحذف:', notificationError);
            }
          }

          successCount++;
        } catch (error) {
          console.error(`❌ خطأ في حذف الوسائط ${media.id}:`, error);
          errorCount++;
          errors.push(`${media.title}: ${error}`);

          // Revert local state on error
          if (activeTab === 'videos') {
            setVideos(prev => [...prev, media as VideoData]);
          } else {
            setImages(prev => [...prev, media as ImageData]);
          }
        }
      }

      // Clear selections
      clearAllSelections();
      setIsBulkMode(false);

      // Show results
      let resultMessage = `✅ تم حذف ${successCount} ${activeTab === 'videos' ? 'فيديو' : 'صورة'} بنجاح`;
      if (errorCount > 0) {
        resultMessage += `\n❌ فشل في حذف ${errorCount} ${activeTab === 'videos' ? 'فيديو' : 'صورة'}`;
        if (errors.length > 0) {
          resultMessage += `\n\nالأخطاء:\n${errors.join('\n')}`;
        }
      }
      if (shouldNotify && hasPhoneNumbers) {
        resultMessage += `\n📱 تم إرسال إشعارات للعملاء`;
      }

      alert(resultMessage);

    } catch (error) {
      console.error('❌ خطأ في الحذف المجمع:', error);

      // Show detailed error message
      let errorMessage = 'حدث خطأ أثناء الحذف المجمع';
      if (error instanceof Error) {
        errorMessage += `\n\nالتفاصيل: ${error.message}`;
      }
      alert(errorMessage);
    }
  };

  const handleQuickReject = useCallback(async (media: MediaData, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click
    try {
      // Update database
      const userId = media.userId;
      const userRef = doc(db, 'players', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const isImage = activeTab === 'images';
        const mediaArray = isImage ? (userData.images || []) : (userData.videos || []);

        // Find the media in the array - try multiple matching strategies
        let mediaIndex = -1;

        // Strategy 1: Match by ID
        mediaIndex = mediaArray.findIndex((m: any) => m.id === media.id);

        // Strategy 2: Match by URL (if ID didn't match)
        if (mediaIndex === -1 && media.url) {
          mediaIndex = mediaArray.findIndex((m: any) => m.url === media.url || m.url?.includes(media.url) || media.url?.includes(m.url));
        }

        // Strategy 3: Match by title (if URL didn't match)
        if (mediaIndex === -1 && media.title) {
          mediaIndex = mediaArray.findIndex((m: any) =>
            (m.title && m.title === media.title) ||
            (m.desc && m.desc === media.title) ||
            (m.description && m.description === media.title)
          );
        }

        // Strategy 4: Match by index in ID (for IDs like userId_index)
        if (mediaIndex === -1 && media.id.includes('_')) {
          const parts = media.id.split('_');
          const indexPart = parts[parts.length - 1];
          const numericIndex = parseInt(indexPart);
          if (!isNaN(numericIndex) && numericIndex < mediaArray.length) {
            mediaIndex = numericIndex;
          }
        }

        if (mediaIndex !== -1) {
          mediaArray[mediaIndex].status = 'rejected';
          mediaArray[mediaIndex].updatedAt = new Date();

          const updateData = isImage ? { images: mediaArray } : { videos: mediaArray };
          await updateDoc(userRef, updateData);
        } else {
          console.warn(`⚠️ لم يتم العثور على ${isImage ? 'الصورة' : 'الفيديو'} في قاعدة البيانات`);
        }
      }

      // Update local state
      if (activeTab === 'videos') {
        setVideos(prev => prev.map(v =>
          v.id === media.id ? { ...v, status: 'rejected' as const } : v
        ));
      } else {
        setImages(prev => prev.map(i =>
          i.id === media.id ? { ...i, status: 'rejected' as const } : i
        ));
        // Refetch images to ensure database changes are reflected
        setTimeout(() => refetchImages(), 500);
      }

      // Log action
      await actionLogService.logVideoAction({
        action: 'status_change',
        videoId: media.id,
        playerId: media.userId,
        actionBy: user?.uid || 'system',
        actionByType: 'admin',
        details: {
          oldStatus: media.status,
          newStatus: 'rejected',
          notes: `تم رفض ${activeTab === 'videos' ? 'الفيديو' : 'الصورة'} بواسطة المدير`,
          adminNotes: `تم التغيير بواسطة: ${user?.email}`
        }
      });

      toast.success(`تم رفض ${activeTab === 'videos' ? 'الفيديو' : 'الصورة'} بنجاح`);
    } catch (error) {
      console.error('Error rejecting media:', error);
      toast.error(`حدث خطأ أثناء رفض ${activeTab === 'videos' ? 'الفيديو' : 'الصورة'}`);

      // Revert local state on error
      if (activeTab === 'videos') {
        setVideos(prev => prev.map(v =>
          v.id === media.id ? { ...v, status: media.status } : v
        ));
      } else {
        setImages(prev => prev.map(i =>
          i.id === media.id ? { ...i, status: media.status } : i
        ));
      }
    }
  }, [activeTab, user?.uid, user?.email]);

  // Bulk approve function
  const handleBulkApprove = async () => {
    const selectedMedia = getSelectedMedia();
    if (selectedMedia.length === 0) {
      toast.error('لم يتم تحديد أي وسائط للموافقة');
      return;
    }

    if (!confirm(`هل أنت متأكد من الموافقة على ${selectedMedia.length} ${activeTab === 'videos' ? 'فيديو' : 'صورة'}؟`)) {
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const media of selectedMedia) {
        try {
          // Update database
          const userId = media.userId;
          const userRef = doc(db, 'players', userId);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const isImage = activeTab === 'images';
            const mediaArray = isImage ? (userData.images || []) : (userData.videos || []);

            console.log(`🔍 البحث عن ${isImage ? 'صورة' : 'فيديو'}:`, {
              mediaId: media.id,
              mediaUrl: media.url,
              mediaTitle: media.title,
              arrayLength: mediaArray.length,
              isImage
            });

            // Find the media in the array - try multiple matching strategies
            let mediaIndex = -1;

            // Strategy 1: Match by ID
            mediaIndex = mediaArray.findIndex((m: any) => m.id === media.id);

            // Strategy 2: Match by URL (if ID didn't match)
            if (mediaIndex === -1 && media.url) {
              mediaIndex = mediaArray.findIndex((m: any) => m.url === media.url || m.url?.includes(media.url) || media.url?.includes(m.url));
            }

            // Strategy 3: Match by title (if URL didn't match)
            if (mediaIndex === -1 && media.title) {
              mediaIndex = mediaArray.findIndex((m: any) =>
                (m.title && m.title === media.title) ||
                (m.desc && m.desc === media.title) ||
                (m.description && m.description === media.title)
              );
            }

            // Strategy 4: Match by index in ID (for IDs like userId_index)
            if (mediaIndex === -1 && media.id.includes('_')) {
              const parts = media.id.split('_');
              const indexPart = parts[parts.length - 1];
              const numericIndex = parseInt(indexPart);
              if (!isNaN(numericIndex) && numericIndex < mediaArray.length) {
                mediaIndex = numericIndex;
              }
            }

            console.log(`📌 النتيجة:`, {
              found: mediaIndex !== -1,
              index: mediaIndex,
              currentStatus: mediaIndex !== -1 ? mediaArray[mediaIndex]?.status : 'N/A'
            });

            if (mediaIndex !== -1) {
              mediaArray[mediaIndex].status = 'approved';
              mediaArray[mediaIndex].updatedAt = new Date();

              const updateData = isImage ? { images: mediaArray } : { videos: mediaArray };
              await updateDoc(userRef, updateData);
              console.log(`✅ تم تحديث ${isImage ? 'الصورة' : 'الفيديو'} في قاعدة البيانات`);
            } else {
              console.warn(`⚠️ لم يتم العثور على ${isImage ? 'الصورة' : 'الفيديو'} في قاعدة البيانات`);
            }
          } else {
            console.warn(`⚠️ المستخدم ${userId} غير موجود في قاعدة البيانات`);
          }

          // Update local state
          if (activeTab === 'videos') {
            setVideos(prev => prev.map(v =>
              v.id === media.id ? { ...v, status: 'approved' as const } : v
            ));
          } else {
            setImages(prev => prev.map(i =>
              i.id === media.id ? { ...i, status: 'approved' as const } : i
            ));
          }

          // Log action
          await actionLogService.logVideoAction({
            action: 'status_change',
            videoId: media.id,
            playerId: media.userId,
            actionBy: user?.uid || 'system',
            actionByType: 'admin',
            details: {
              oldStatus: media.status,
              newStatus: 'approved',
              notes: `تم الموافقة على ${activeTab === 'videos' ? 'الفيديو' : 'الصورة'} "${media.title}" بواسطة المدير (موافقة مجمعة)`,
              adminNotes: `تم التغيير بواسطة: ${user?.email}`
            }
          });

          successCount++;
        } catch (error: any) {
          console.error(`❌ خطأ في الموافقة على ${media.id}:`, error);
          errorCount++;
          errors.push(`${media.title}: ${error.message || error}`);

          // Revert local state on error
          if (activeTab === 'videos') {
            setVideos(prev => prev.map(v =>
              v.id === media.id ? { ...v, status: media.status } : v
            ));
          } else {
            setImages(prev => prev.map(i =>
              i.id === media.id ? { ...i, status: media.status } : i
            ));
          }
        }
      }

      // Clear selections
      clearAllSelections();

      // Refetch images if we updated images
      if (activeTab === 'images' && successCount > 0) {
        setTimeout(() => refetchImages(), 500);
      }

      // Show results
      if (successCount > 0) {
        toast.success(`تم الموافقة على ${successCount} ${activeTab === 'videos' ? 'فيديو' : 'صورة'} بنجاح`);
      }
      if (errorCount > 0) {
        toast.error(`فشل في الموافقة على ${errorCount} ${activeTab === 'videos' ? 'فيديو' : 'صورة'}`);
        console.error('الأخطاء:', errors);
      }
    } catch (error) {
      console.error('❌ خطأ في الموافقة المجمعة:', error);
      toast.error('حدث خطأ أثناء الموافقة المجمعة');
    }
  };

  // Bulk reject function
  const handleBulkReject = async () => {
    const selectedMedia = getSelectedMedia();
    if (selectedMedia.length === 0) {
      toast.error('لم يتم تحديد أي وسائط للرفض');
      return;
    }

    if (!confirm(`هل أنت متأكد من رفض ${selectedMedia.length} ${activeTab === 'videos' ? 'فيديو' : 'صورة'}؟`)) {
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const media of selectedMedia) {
        try {
          // Update database
          const userId = media.userId;
          const userRef = doc(db, 'players', userId);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const isImage = activeTab === 'images';
            const mediaArray = isImage ? (userData.images || []) : (userData.videos || []);

            console.log(`🔍 البحث عن ${isImage ? 'صورة' : 'فيديو'} للرفض:`, {
              mediaId: media.id,
              mediaUrl: media.url,
              mediaTitle: media.title,
              arrayLength: mediaArray.length,
              isImage
            });

            // Find the media in the array - try multiple matching strategies
            let mediaIndex = -1;

            // Strategy 1: Match by ID
            mediaIndex = mediaArray.findIndex((m: any) => m.id === media.id);

            // Strategy 2: Match by URL (if ID didn't match)
            if (mediaIndex === -1 && media.url) {
              mediaIndex = mediaArray.findIndex((m: any) => m.url === media.url || m.url?.includes(media.url) || media.url?.includes(m.url));
            }

            // Strategy 3: Match by title (if URL didn't match)
            if (mediaIndex === -1 && media.title) {
              mediaIndex = mediaArray.findIndex((m: any) =>
                (m.title && m.title === media.title) ||
                (m.desc && m.desc === media.title) ||
                (m.description && m.description === media.title)
              );
            }

            // Strategy 4: Match by index in ID (for IDs like userId_index)
            if (mediaIndex === -1 && media.id.includes('_')) {
              const parts = media.id.split('_');
              const indexPart = parts[parts.length - 1];
              const numericIndex = parseInt(indexPart);
              if (!isNaN(numericIndex) && numericIndex < mediaArray.length) {
                mediaIndex = numericIndex;
              }
            }

            console.log(`📌 النتيجة:`, {
              found: mediaIndex !== -1,
              index: mediaIndex,
              currentStatus: mediaIndex !== -1 ? mediaArray[mediaIndex]?.status : 'N/A'
            });

            if (mediaIndex !== -1) {
              mediaArray[mediaIndex].status = 'rejected';
              mediaArray[mediaIndex].updatedAt = new Date();

              const updateData = isImage ? { images: mediaArray } : { videos: mediaArray };
              await updateDoc(userRef, updateData);
              console.log(`✅ تم تحديث ${isImage ? 'الصورة' : 'الفيديو'} في قاعدة البيانات`);
            } else {
              console.warn(`⚠️ لم يتم العثور على ${isImage ? 'الصورة' : 'الفيديو'} في قاعدة البيانات`);
            }
          } else {
            console.warn(`⚠️ المستخدم ${userId} غير موجود في قاعدة البيانات`);
          }

          // Update local state
          if (activeTab === 'videos') {
            setVideos(prev => prev.map(v =>
              v.id === media.id ? { ...v, status: 'rejected' as const } : v
            ));
          } else {
            setImages(prev => prev.map(i =>
              i.id === media.id ? { ...i, status: 'rejected' as const } : i
            ));
          }

          // Log action
          await actionLogService.logVideoAction({
            action: 'status_change',
            videoId: media.id,
            playerId: media.userId,
            actionBy: user?.uid || 'system',
            actionByType: 'admin',
            details: {
              oldStatus: media.status,
              newStatus: 'rejected',
              notes: `تم رفض ${activeTab === 'videos' ? 'الفيديو' : 'الصورة'} "${media.title}" بواسطة المدير (رفض مجمع)`,
              adminNotes: `تم التغيير بواسطة: ${user?.email}`
            }
          });

          successCount++;
        } catch (error: any) {
          console.error(`❌ خطأ في رفض ${media.id}:`, error);
          errorCount++;
          errors.push(`${media.title}: ${error.message || error}`);

          // Revert local state on error
          if (activeTab === 'videos') {
            setVideos(prev => prev.map(v =>
              v.id === media.id ? { ...v, status: media.status } : v
            ));
          } else {
            setImages(prev => prev.map(i =>
              i.id === media.id ? { ...i, status: media.status } : i
            ));
          }
        }
      }

      // Clear selections
      clearAllSelections();

      // Refetch images if we updated images
      if (activeTab === 'images' && successCount > 0) {
        setTimeout(() => refetchImages(), 500);
      }

      // Show results
      if (successCount > 0) {
        toast.success(`تم رفض ${successCount} ${activeTab === 'videos' ? 'فيديو' : 'صورة'} بنجاح`);
      }
      if (errorCount > 0) {
        toast.error(`فشل في رفض ${errorCount} ${activeTab === 'videos' ? 'فيديو' : 'صورة'}`);
        console.error('الأخطاء:', errors);
      }
    } catch (error) {
      console.error('❌ خطأ في الرفض المجمع:', error);
      toast.error('حدث خطأ أثناء الرفض المجمع');
    }
  };

  // Simplified WhatsApp test functions
  const testWhatsAppLink = () => {
    if (!selectedMedia) return;
    const testPhone = '201017799580';
    const testMessage = 'اختبار WhatsApp Share من El7lm Platform';
    const whatsappUrl = `https://wa.me/${testPhone}?text=${encodeURIComponent(testMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const testUserPhone = () => {
    if (!selectedMedia || !selectedMedia.phone) {
      alert('رقم الهاتف غير متوفر');
      return;
    }
    const phoneNumber = formatPhoneNumber(selectedMedia.phone);
    if (!phoneNumber) {
      alert('رقم الهاتف غير صالح');
      return;
    }
    const message = customMessage || `مرحباً ${selectedMedia.userName}، تم مراجعة وسائطك في منصة العلم.`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Simplified WhatsApp sender
  const sendWhatsApp = (messageType: string = 'custom') => {
    if (!selectedMedia || !selectedMedia.phone) {
      alert('رقم الهاتف غير متوفر');
      return;
    }

    let message = '';
    if (messageType === 'custom') {
      message = customMessage.trim() || `مرحباً ${selectedMedia.userName}، تم مراجعة وسائطك في منصة العلم.`;
    } else {
      const template = performanceTemplateCategories
        .flatMap(cat => cat.templates)
        .find(t => t.id === messageType);
      message = template?.whatsapp || (template as any)?.smsMessage || `مرحباً ${selectedMedia.userName}، تم مراجعة وسائطك.`;
    }

    const phoneNumber = formatPhoneNumber(selectedMedia.phone);
    if (!phoneNumber || phoneNumber.length < 7 || phoneNumber.length > 15) {
      alert('رقم الهاتف غير صالح');
      return;
    }

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Simplified SMS sender - uses Baba Service (not BeOn)
  const sendSMS = async (messageType: string = 'custom') => {
    if (!selectedMedia) return;

    let finalMessage = customMessage?.trim();
    if (!finalMessage && messageType !== 'custom') {
      const template = performanceTemplateCategories
        .flatMap(cat => cat.templates)
        .find(t => t.id === messageType);
      finalMessage = (template as any)?.sms || (template as any)?.smsMessage || '';
    }

    if (!finalMessage) {
      alert('يرجى كتابة الرسالة');
      return;
    }

    const phoneNumber = formatPhoneNumber(selectedMedia.phone);
    if (!phoneNumber) {
      alert('رقم الهاتف غير صالح');
      return;
    }

    try {
      // Using Baba Service API endpoint (not BeOn)
      const response = await fetch('/api/whatsapp/babaservice/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          type: 'sms',
          phoneNumbers: [phoneNumber],
          message: finalMessage
        })
      });

      if (response.ok) {
        alert('تم إرسال الرسالة SMS بنجاح');
        setCustomMessage('');
        setShowCustomMessage(false);
      } else {
        alert('حدث خطأ في إرسال الرسالة');
      }
    } catch (error) {
      console.error('خطأ في إرسال الرسالة:', error);
      alert('حدث خطأ في إرسال الرسالة');
    }
  };


  // Enhanced pagination component
  const PaginationControls = () => {
    const getPageNumbers = () => {
      const pages: (number | string)[] = [];
      const maxVisible = 5;

      if (totalPages <= maxVisible) {
        // Show all pages if total is small
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Always show first page
        pages.push(1);

        if (currentPage > 3) {
          pages.push('...');
        }

        // Show pages around current page
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        for (let i = start; i <= end; i++) {
          pages.push(i);
        }

        if (currentPage < totalPages - 2) {
          pages.push('...');
        }

        // Always show last page
        pages.push(totalPages);
      }

      return pages;
    };

    const goToPage = (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    };

    return (
      <div className="bg-white p-4 rounded-lg border shadow-sm mt-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left side - Info and page size selector */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-sm text-gray-600">
              عرض <span className="font-semibold text-gray-900">{startIndex + 1}</span> إلى{' '}
              <span className="font-semibold text-gray-900">{Math.min(startIndex + itemsPerPage, totalItems)}</span> من{' '}
              <span className="font-semibold text-gray-900">{totalItems.toLocaleString()}</span> عنصر
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-500">عرض:</Label>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="24">24</SelectItem>
                  <SelectItem value="48">48</SelectItem>
                  <SelectItem value="96">96</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right side - Pagination controls */}
          <div className="flex items-center gap-2">
            {/* First page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="h-8 px-2"
              title="الصفحة الأولى"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>

            {/* Previous page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 px-3"
            >
              <ChevronRight className="w-4 h-4 ml-1" />
              السابق
            </Button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map((page, index) => {
                if (page === '...') {
                  return (
                    <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                      ...
                    </span>
                  );
                }
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => goToPage(page as number)}
                    className={`h-8 w-8 p-0 ${currentPage === page
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : ''
                      }`}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>

            {/* Next page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 px-3"
            >
              التالي
              <ChevronLeft className="w-4 h-4 mr-1" />
            </Button>

            {/* Last page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 px-2"
              title="الصفحة الأخيرة"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Check access permissions
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">غير مصرح لك بالوصول</h3>
          <p className="text-gray-600">يجب تسجيل الدخول أولاً</p>
        </div>
      </div>
    );
  }

  // Check if user is admin using accountType (primary) or role (fallback)
  const isAdmin = userData?.accountType === 'admin' || userData?.role === 'admin';

  if (!userData || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">غير مصرح لك بالوصول</h3>
          <p className="text-gray-600">هذه الصفحة مخصصة للمديرين فقط</p>
          <p className="text-sm text-gray-500 mt-2">نوع حسابك الحالي: {userData?.accountType || userData?.role || 'غير محدد'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">إدارة الوسائط</h1>
              <p className="text-gray-600">إدارة ومراجعة الفيديوهات والصور</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded">
                عرض {filteredMedia.length} من {currentMediaData.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MediaType)} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              الفيديوهات ({videos.length})
            </TabsTrigger>
            <TabsTrigger value="images" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              الصور ({images.length})
            </TabsTrigger>
          </TabsList>

          {/* Bulk Actions Toolbar */}
          {isBulkMode && (
            <div className="my-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={getSelectedCount() === currentMediaData.length && currentMediaData.length > 0}
                      onChange={selectAllMedia}
                      className="w-5 h-5 text-blue-600 bg-white border-2 border-blue-500 rounded focus:ring-blue-500 hover:bg-blue-50 transition-colors"
                      aria-label="تحديد جميع الوسائط"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      تحديد الكل ({getSelectedCount()}/{currentMediaData.length})
                    </span>
                  </div>
                  {getSelectedCount() > 0 && (
                    <div className="text-sm text-blue-600 font-medium">
                      {getSelectedCount()} {activeTab === 'videos' ? 'فيديو' : 'صورة'} محدد
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {getSelectedCount() > 0 && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleBulkApprove}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4" />
                        موافقة ({getSelectedCount()})
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleBulkReject}
                        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <XCircle className="w-4 h-4" />
                        رفض ({getSelectedCount()})
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        حذف ({getSelectedCount()})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllSelections}
                      >
                        إلغاء التحديد
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleBulkMode}
                  >
                    إغلاق وضع التحديد
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Mode Toggle */}
          {!isBulkMode && (
            <div className="my-4">
              <Button
                variant="outline"
                onClick={toggleBulkMode}
                className="flex items-center gap-2"
              >
                <CheckSquare className="w-4 h-4" />
                وضع التحديد المتعدد
              </Button>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">إجمالي</p>
                    <p className="text-xl font-bold">{currentMediaData.length}</p>
                  </div>
                  {activeTab === 'videos' ?
                    <Video className="w-6 h-6 text-blue-600" /> :
                    <ImageIcon className="w-6 h-6 text-purple-600" />
                  }
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">في الانتظار</p>
                    <p className="text-xl font-bold text-amber-600">
                      {currentMediaData.filter(v => v.status === 'pending').length}
                    </p>
                  </div>
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">مُوافق عليها</p>
                    <p className="text-xl font-bold text-green-600">
                      {currentMediaData.filter(v => v.status === 'approved').length}
                    </p>
                  </div>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">مرفوضة</p>
                    <p className="text-xl font-bold text-red-600">
                      {currentMediaData.filter(v => v.status === 'rejected').length}
                    </p>
                  </div>
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">بحث</Label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="ابحث هنا..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">الحالة</Label>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="pending">في الانتظار</SelectItem>
                      <SelectItem value="approved">موافق عليها</SelectItem>
                      <SelectItem value="rejected">مرفوضة</SelectItem>
                      <SelectItem value="flagged">مُعلَّمة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">نوع الحساب</Label>
                  <Select value={accountTypeFilter} onValueChange={(v) => setAccountTypeFilter(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأنواع</SelectItem>
                      <SelectItem value="player">لاعب</SelectItem>
                      <SelectItem value="club">نادي</SelectItem>
                      <SelectItem value="academy">أكاديمية</SelectItem>
                      <SelectItem value="agent">وكيل</SelectItem>
                      <SelectItem value="trainer">مدرب</SelectItem>
                      <SelectItem value="admin">إداري</SelectItem>
                      <SelectItem value="marketer">مسوق</SelectItem>
                      <SelectItem value="supabase">Supabase</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">الترتيب</Label>
                  <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">الأحدث أولاً</SelectItem>
                      <SelectItem value="oldest">الأقدم أولاً</SelectItem>
                      <SelectItem value="title_asc">العنوان (أ-ي)</SelectItem>
                      <SelectItem value="title_desc">العنوان (ي-أ)</SelectItem>
                      <SelectItem value="status">حسب الحالة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <TabsContent value="videos" className="space-y-6">
            {currentLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">جاري تحميل {activeTab === 'videos' ? 'الفيديوهات' : 'الصور'}...</p>
                </div>
              </div>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {paginatedMedia.map((video) => (
                      <Card key={video.id} className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-gray-200 hover:border-blue-300" onClick={() => !isBulkMode && openMediaDetails(video)}>
                        <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden relative">
                          {(() => {
                            const thumbnail = getVideoThumbnail(video);
                            return thumbnail ? (
                              <>
                                <img
                                  src={thumbnail}
                                  alt={video.title}
                                  onError={(e) => {
                                    // Fallback if thumbnail fails to load
                                    e.currentTarget.style.display = 'none';
                                    const parent = e.currentTarget.parentElement;
                                    if (parent) {
                                      const fallback = parent.querySelector('.fallback-thumbnail') as HTMLElement;
                                      if (fallback) fallback.style.display = 'flex';
                                    }
                                  }}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                {/* Fallback thumbnail */}
                                <div className="fallback-thumbnail hidden w-full h-full items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                                  <Video className="w-12 h-12 text-gray-500" />
                                </div>
                                {/* Play button overlay */}
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openMediaPreview(video, e);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-blue-600 hover:bg-blue-700 text-white border-none shadow-lg h-12 w-12 rounded-full"
                                    size="sm"
                                    title="معاينة الفيديو"
                                  >
                                    <Play className="w-6 h-6 fill-white" />
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                                <Video className="w-12 h-12 text-gray-500" />
                              </div>
                            );
                          })()}
                          {/* Status badge */}
                          <div className="absolute top-2 right-2 z-10">
                            <StatusBadge status={video.status} />
                          </div>
                          {isBulkMode ? (
                            <div className="absolute top-2 left-2">
                              <input
                                type="checkbox"
                                checked={selectedVideos.has(video.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleMediaSelection(video.id);
                                }}
                                className="w-6 h-6 text-blue-600 bg-white border-2 border-blue-500 rounded focus:ring-blue-500 shadow-lg hover:bg-blue-50 transition-colors"
                                aria-label={`تحديد الفيديو ${video.title}`}
                              />
                            </div>
                          ) : (
                            <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                onClick={(e) => handleQuickApprove(video, e)}
                                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 h-6 text-xs"
                                title="موافقة"
                              >
                                <CheckCircle className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => handleQuickReject(video, e)}
                                className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 h-6 text-xs"
                                title="رفض"
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => handleDeleteMedia(video, e)}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 h-6 text-xs"
                                title="حذف"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4 bg-white">
                          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-3 text-sm leading-tight break-all" title={video.title}>
                            {truncateText(video.title, 40)}
                          </h3>

                          {/* Description if available */}
                          {video.description && (
                            <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                              {video.description}
                            </p>
                          )}

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <span className="text-gray-700 truncate text-xs">{video.userName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <span className="text-green-700 text-xs truncate">
                                {displayPhoneNumber(video.phone)}
                              </span>
                            </div>

                            {/* Stats row */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <div className="flex items-center gap-3 text-xs text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Video className="w-3 h-3" />
                                  {video.views || 0}
                                </span>
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  {video.likes || 0}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {video.sourceType && (
                                  <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5">
                                    {video.sourceType === 'youtube' ? 'YouTube' : video.sourceType === 'supabase' ? 'Supabase' : video.sourceType}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {video.accountType}
                                </Badge>
                              </div>
                            </div>

                            {/* Upload date */}
                            {video.uploadDate && (
                              <div className="text-xs text-gray-500 pt-1">
                                {new Date(video.uploadDate).toLocaleDateString('en-GB', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedMedia.map((video) => (
                      <Card key={video.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openMediaDetails(video)}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-14 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                              {video.thumbnailUrl ? (
                                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Video className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">{video.title}</h3>
                              <p className="text-sm text-gray-600 truncate">{video.userName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Phone className="w-3 h-3 text-green-600" />
                                <span className="text-green-700 text-xs">
                                  {displayPhoneNumber(video.phone)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-2">
                                <StatusBadge status={video.status} />
                                <Badge variant="outline" className="text-xs">{video.accountType}</Badge>
                                <span className="text-xs text-gray-500">{video.views} مشاهدة</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={(e) => handleQuickApprove(video, e)}
                                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 h-7 text-xs"
                                title="موافقة"
                              >
                                <CheckCircle className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => handleQuickReject(video, e)}
                                className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 h-7 text-xs"
                                title="رفض"
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => handleDeleteMedia(video, e)}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 h-7 text-xs"
                                title="حذف"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                <PaginationControls />
              </>
            )}
          </TabsContent>

          <TabsContent value="images" className="space-y-6">
            {currentLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">جاري تحميل الصور...</p>
                </div>
              </div>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {paginatedMedia.map((image) => (
                      <Card key={image.id} className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-gray-200 hover:border-purple-300 flex flex-col h-full" onClick={() => !isBulkMode && openMediaDetails(image)}>
                        <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden relative flex-shrink-0">
                          {image.thumbnailUrl || image.url ? (
                            <>
                              <img
                                src={image.thumbnailUrl || image.url}
                                alt={image.title}
                                onError={(e) => {
                                  // Fallback if image fails to load
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    const fallback = parent.querySelector('.fallback-image') as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                  }
                                }}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              {/* Fallback image */}
                              <div className="fallback-image hidden w-full h-full items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                                <ImageIcon className="w-12 h-12 text-gray-500" />
                              </div>
                              {/* View overlay */}
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openMediaPreview(image, e);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-purple-600 hover:bg-purple-700 text-white border-none shadow-lg px-3 py-1.5"
                                  size="sm"
                                  title="معاينة الصورة"
                                >
                                  <ImageIcon className="w-4 h-4 mr-1" />
                                  معاينة
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                              <ImageIcon className="w-12 h-12 text-gray-500" />
                            </div>
                          )}
                          {/* Status badge */}
                          <div className="absolute top-2 right-2 z-10">
                            <StatusBadge status={image.status} />
                          </div>
                          {/* Image type badge - moved to bottom left */}
                          {image.imageType && (
                            <div className="absolute bottom-2 left-2 z-10">
                              <Badge variant="secondary" className="text-xs bg-black/70 text-white backdrop-blur-sm px-2 py-0.5">
                                {image.imageType === 'profile' ? 'شخصية' :
                                  image.imageType === 'cover' ? 'غلاف' :
                                    image.imageType === 'avatar' ? 'رمزية' :
                                      image.imageType === 'additional' ? 'إضافية' : image.imageType}
                              </Badge>
                            </div>
                          )}
                          {isBulkMode ? (
                            <div className="absolute top-2 left-2 z-10">
                              <input
                                type="checkbox"
                                checked={selectedImages.has(image.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleMediaSelection(image.id);
                                }}
                                className="w-6 h-6 text-blue-600 bg-white border-2 border-blue-500 rounded focus:ring-blue-500 shadow-lg hover:bg-blue-50 transition-colors"
                                aria-label={`تحديد الصورة ${image.title}`}
                              />
                            </div>
                          ) : (
                            <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <Button
                                size="sm"
                                onClick={(e) => handleQuickApprove(image, e)}
                                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 h-7 text-xs shadow-lg"
                                title="موافقة"
                              >
                                <CheckCircle className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => handleQuickReject(image, e)}
                                className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 h-7 text-xs shadow-lg"
                                title="رفض"
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => handleDeleteMedia(image, e)}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 h-7 text-xs shadow-lg"
                                title="حذف"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4 bg-white flex-1 flex flex-col">
                          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 text-sm leading-tight min-h-[2.5rem] break-all" title={image.title}>
                            {truncateText(image.title, 40)}
                          </h3>

                          {/* Description if available */}
                          {image.description && (
                            <p className="text-xs text-gray-600 line-clamp-2 mb-3 flex-shrink-0">
                              {image.description}
                            </p>
                          )}

                          <div className="space-y-2 text-sm mt-auto">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <span className="text-gray-700 truncate text-xs">{image.userName}</span>
                            </div>
                            {image.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-green-600 flex-shrink-0" />
                                <span className="text-green-700 text-xs truncate">
                                  {displayPhoneNumber(image.phone)}
                                </span>
                              </div>
                            )}

                            {/* Stats row */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
                              <div className="flex items-center gap-3 text-xs text-gray-600">
                                <span className="flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3" />
                                  {image.views || 0}
                                </span>
                                {image.likes > 0 && (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    {image.likes}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {image.sourceType && (
                                  <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5">
                                    {image.sourceType === 'supabase' ? 'SB' : image.sourceType === 'firebase' ? 'FB' : image.sourceType.substring(0, 2).toUpperCase()}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {image.accountType}
                                </Badge>
                              </div>
                            </div>

                            {/* Upload date */}
                            {image.uploadDate && (
                              <div className="text-xs text-gray-500 pt-1">
                                {new Date(image.uploadDate).toLocaleDateString('en-GB', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedMedia.map((image) => (
                      <Card key={image.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openMediaDetails(image)}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                              {image.thumbnailUrl ? (
                                <img src={image.thumbnailUrl} alt={image.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">{image.title}</h3>
                              <p className="text-sm text-gray-600 truncate">{image.userName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Phone className="w-3 h-3 text-green-600" />
                                <span className="text-green-700 text-xs">
                                  {displayPhoneNumber(image.phone)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-2">
                                <StatusBadge status={image.status} />
                                <Badge variant="outline" className="text-xs">{image.accountType}</Badge>
                                <span className="text-xs text-gray-500">{image.views} مشاهدة</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={(e) => handleQuickApprove(image, e)}
                                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 h-7 text-xs"
                                title="موافقة"
                              >
                                <CheckCircle className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => handleQuickReject(image, e)}
                                className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 h-7 text-xs"
                                title="رفض"
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => handleDeleteMedia(image, e)}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 h-7 text-xs"
                                title="حذف"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                <PaginationControls />
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Empty State */}
        {!currentLoading && paginatedMedia.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              {activeTab === 'videos' ? (
                <Video className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              ) : (
                <ImageIcon className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              )}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                لا توجد {activeTab === 'videos' ? 'فيديوهات' : 'صور'}
              </h3>
              <p className="text-gray-600">
                لم يتم رفع أي {activeTab === 'videos' ? 'فيديوهات' : 'صور'} بعد أو لا توجد نتائج تطابق الفلاتر المحددة
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Media Details Modal */}
      <UnifiedMediaModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        media={selectedMedia}
        mediaType={activeTab}
        onStatusUpdate={updateMediaStatus}
        onSendMessage={sendSMS}
        onSendWhatsApp={sendWhatsApp}
        onTestWhatsApp={testWhatsAppLink}
        onTestUserPhone={testUserPhone}
        logs={logs}
        logsLoading={logsLoading}
        customMessage={customMessage}
        setCustomMessage={setCustomMessage}
        displayPhoneNumber={displayPhoneNumber}
        formatPhoneNumber={formatPhoneNumber}
      />


    </div>
  );
}
