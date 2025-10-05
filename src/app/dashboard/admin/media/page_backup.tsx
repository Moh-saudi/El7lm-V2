'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal, Image as ImageIcon, Download, Grid3X3, List, Search, Filter, Bell } from 'lucide-react';
import dynamic from 'next/dynamic';
import ReactPlayer from 'react-player';
import { Video, MessageSquare, Eye, User, Clock, Star, Flag, CheckCircle, XCircle, Phone, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, doc, updateDoc, getDoc, addDoc, query, where } from 'firebase/firestore';
import { actionLogService } from '@/lib/admin/action-logs';
import SendMessageButton from '@/components/messaging/SendMessageButton';
import { supabase, STORAGE_BUCKETS } from '@/lib/supabase/config';
import StatusBadge from '@/components/admin/videos/StatusBadge';
import VideoSourceBadge from '@/components/admin/videos/VideoSourceBadge';
import { performanceTemplateCategories, searchTemplates, exportTemplatesAsJson } from '@/lib/messages/performance-templates';

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

export default function MediaAdminPage() {
  const { user, userData } = useAuth();
  
  // Media Type State
  const [activeTab, setActiveTab] = useState<MediaType>('videos');
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(false);
  
  // View State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12); // Optimized for grid layout
  
  // Selection State
  const [selectedMedia, setSelectedMedia] = useState<MediaData | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<MediaData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Logs and Actions
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [showCustomMessage, setShowCustomMessage] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'flagged'>('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'player' | 'student' | 'coach' | 'academy' | 'supabase'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'youtube' | 'supabase' | 'firebase' | 'external'>('all');
  const [eventFilter, setEventFilter] = useState<'all' | 'upload' | 'status_change' | 'notification_sent'>('all');
  const [actionTakenFilter, setActionTakenFilter] = useState<'all' | 'taken' | 'not_taken'>('all');
  const [messageSentFilter, setMessageSentFilter] = useState<'all' | 'sent' | 'not_sent'>('all');
  const [mediaIdToLogsMeta, setMediaIdToLogsMeta] = useState<Record<string, { lastAction?: string; hasAction?: boolean; hasMessage?: boolean }>>({});

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

  // Fetch Supabase Videos
  const fetchSupabaseVideos = async (): Promise<VideoData[]> => {
    const supabaseVideos: VideoData[] = [];
    
    try {
      const { data: files, error } = await supabase.storage
        .from(STORAGE_BUCKETS.VIDEOS)
        .list('', {
          limit: 1000,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('خطأ في جلب الفيديوهات من Supabase:', error);
        return supabaseVideos;
      }

      if (files && files.length > 0) {
        for (const file of files) {
          if (file.name && file.name.includes('/')) {
            const userId = file.name.split('/')[0];
            const { data: urlData } = supabase.storage
              .from(STORAGE_BUCKETS.VIDEOS)
              .getPublicUrl(file.name);

            if (urlData?.publicUrl) {
              const videoData: VideoData = {
                id: `supabase_${file.id || file.name}`,
                title: file.name.split('/').pop() || 'فيديو من Supabase',
                description: 'فيديو مرفوع إلى Supabase Storage',
                url: urlData.publicUrl,
                thumbnailUrl: undefined,
                duration: 0,
                uploadDate: file.created_at ? new Date(file.created_at) : new Date(),
                userId: userId,
                userEmail: '',
                userName: `مستخدم ${userId}`,
                accountType: 'supabase',
                status: 'pending',
                views: 0,
                likes: 0,
                comments: 0,
                phone: '',
                sourceType: 'supabase'
              };
              supabaseVideos.push(videoData);
            }
          }
        }
      }
    } catch (error) {
      console.error('خطأ في جلب الفيديوهات من Supabase:', error);
    }

    return supabaseVideos;
  };

  // Fetch Supabase Images
  const fetchSupabaseImages = async (): Promise<ImageData[]> => {
    const supabaseImages: ImageData[] = [];
    
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
    
    for (const bucketName of imageBuckets) {
      try {
        console.log(`📂 فحص bucket: ${bucketName}`);
        const { data: files, error } = await supabase.storage
          .from(bucketName)
          .list('', {
            limit: 1000,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        if (error) {
          console.warn(`⚠️ خطأ في جلب الصور من ${bucketName}:`, error);
          continue;
        }

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
            if (file.name.includes('/')) {
              userId = file.name.split('/')[0];
              userName = `مستخدم ${userId}`;
            } else if (file.name.includes('.')) {
              // ملفات مثل userId.jpg
              userId = file.name.split('.')[0];
              userName = `مستخدم ${userId}`;
            }

            const { data: urlData } = supabase.storage
              .from(bucketName)
              .getPublicUrl(file.name);

            if (urlData?.publicUrl) {
              const imageData: ImageData = {
                id: `supabase_img_${bucketName}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
                title: file.name.split('/').pop() || `صورة من ${bucketName}`,
                description: `صورة مرفوعة إلى ${bucketName} في Supabase Storage`,
                url: urlData.publicUrl,
                thumbnailUrl: urlData.publicUrl,
                uploadDate: file.created_at ? new Date(file.created_at) : new Date(),
                userId: userId,
                userEmail: '',
                userName: userName,
                accountType: 'supabase',
                status: 'pending',
                views: 0,
                likes: 0,
                comments: 0,
                phone: '',
                sourceType: 'supabase'
              };
              supabaseImages.push(imageData);
              console.log(`✅ تمت إضافة صورة: ${imageData.title} - ${urlData.publicUrl}`);
            }
          }
        } else {
          console.log(`ℹ️ لا توجد ملفات في ${bucketName}`);
        }
      } catch (error) {
        console.error(`❌ خطأ في جلب الصور من ${bucketName}:`, error);
      }
    }
    
    console.log(`📈 إجمالي الصور المجلبة من Supabase: ${supabaseImages.length}`);
    return supabaseImages;
  };

  // Fetch Videos
  useEffect(() => {
    const fetchVideos = async () => {
      if (!user || !userData || userData.role !== 'admin') {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const allVideos: VideoData[] = [];

      // Fetch from Firebase collections
      const collections = ['students', 'coaches', 'academies', 'players'];
        
      for (const collectionName of collections) {
        try {
          const querySnapshot = await getDocs(collection(db, collectionName));
            
          querySnapshot.forEach((doc) => {
            const userData = doc.data();
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
                  accountType: collectionName === 'players' ? 'player' : collectionName.slice(0, -1),
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
        } catch (error) {
          console.error(`خطأ في جلب البيانات من مجموعة ${collectionName}:`, error);
        }
      }

      // Fetch from Supabase
      try {
        const supabaseVideos = await fetchSupabaseVideos();
        allVideos.push(...supabaseVideos);
      } catch (error) {
        console.error('خطأ في جلب الفيديوهات من Supabase:', error);
      }

      setVideos(allVideos);
      setLoading(false);
    };

    fetchVideos();
  }, [user, userData]);

  // Fetch Images
  useEffect(() => {
    const fetchImages = async () => {
      if (!user || !userData || userData.role !== 'admin') return;
      if (activeTab !== 'images') return;
      
      setImagesLoading(true);
      const allImages: ImageData[] = [];

      console.log('🔍 بدء جلب الصور من Firebase و Supabase...');

      // Fetch from Firebase collections
      const collections = ['students', 'coaches', 'academies', 'players'];
        
      for (const collectionName of collections) {
        try {
          console.log(`📂 جلب الصور من مجموعة: ${collectionName}`);
          const querySnapshot = await getDocs(collection(db, collectionName));
          let collectionImageCount = 0;
            
          querySnapshot.forEach((doc) => {
            const userData = doc.data();
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
                const imageData: ImageData = {
                  id: `${doc.id}_${fieldName}`,
                  title: `صورة ${fieldName === 'profile_image' ? 'شخصية' : fieldName}`,
                  description: `صورة من حقل ${fieldName}`,
                  url: typeof fieldData === 'string' ? fieldData : fieldData.url,
                  thumbnailUrl: typeof fieldData === 'string' ? fieldData : (fieldData.thumbnail || fieldData.url),
                  uploadDate: fieldData.uploadDate || fieldData.createdAt || new Date(),
                  userId: doc.id,
                  userEmail: userData.email || userData.userEmail || '',
                  userName: userData.full_name || userData.name || userData.userName || 'مستخدم',
                  accountType: collectionName === 'players' ? 'player' : collectionName.slice(0, -1),
                  status: fieldData.status || 'pending',
                  views: fieldData.views || 0,
                  likes: fieldData.likes || 0,
                  comments: fieldData.comments || 0,
                  phone: userData.phone || userData.phoneNumber || '',
                  sourceType: 'firebase' as const
                };
                allImages.push(imageData);
                collectionImageCount++;
              } else if (Array.isArray(fieldData) && fieldData.length > 0) {
                // مصفوفة صور
                fieldData.forEach((image: any, index: number) => {
                  if (image && (image.url || typeof image === 'string')) {
                    const imageUrl = typeof image === 'string' ? image : image.url;
                    const imageData: ImageData = {
                      id: `${doc.id}_${fieldName}_${index}`,
                      title: image.title || image.desc || `صورة ${index + 1} من ${fieldName}`,
                      description: image.description || image.desc || `صورة من حقل ${fieldName}`,
                      url: imageUrl,
                      thumbnailUrl: image.thumbnail || imageUrl,
                      uploadDate: image.uploadDate || image.createdAt || image.updated_at || new Date(),
                      userId: doc.id,
                      userEmail: userData.email || userData.userEmail || '',
                      userName: userData.full_name || userData.name || userData.userName || 'مستخدم',
                      accountType: collectionName === 'players' ? 'player' : collectionName.slice(0, -1),
                      status: image.status || 'pending',
                      views: image.views || 0,
                      likes: image.likes || 0,
                      comments: image.comments || 0,
                      phone: userData.phone || userData.phoneNumber || '',
                      sourceType: 'firebase' as const
                    };
                    allImages.push(imageData);
                    collectionImageCount++;
                  }
                });
              }
            });
          });
          
          console.log(`✅ تم جلب ${collectionImageCount} صورة من ${collectionName}`);
        } catch (error) {
          console.error(`❌ خطأ في جلب البيانات من مجموعة ${collectionName}:`, error);
        }
      }

      console.log(`📊 إجمالي الصور من Firebase: ${allImages.length}`);

      // Fetch from Supabase
      try {
        const supabaseImages = await fetchSupabaseImages();
        allImages.push(...supabaseImages);
        console.log(`📊 إجمالي الصور بعد Supabase: ${allImages.length}`);
      } catch (error) {
        console.error('❌ خطأ في جلب الصور من Supabase:', error);
      }

      setImages(allImages);
      setImagesLoading(false);
      console.log(`🎉 انتهى جلب الصور. العدد النهائي: ${allImages.length}`);
    };

    fetchImages();
  }, [user, userData, activeTab, fetchSupabaseImages]);

  // Get current media data based on active tab
  const currentMediaData = activeTab === 'videos' ? videos : images;
  const currentLoading = activeTab === 'videos' ? loading : imagesLoading;

  // Filter media
  const filteredMedia = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return currentMediaData.filter((item) => {
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

      return matchesTerm && matchesStatus && matchesAccount && matchesSource && matchesEvent && matchesActionTaken && matchesMessageSent;
    });
  }, [currentMediaData, searchTerm, statusFilter, accountTypeFilter, sourceFilter, eventFilter, actionTakenFilter, messageSentFilter, mediaIdToLogsMeta]);

  // Pagination
  const totalItems = filteredMedia.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMedia = filteredMedia.slice(startIndex, startIndex + itemsPerPage);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, accountTypeFilter, sourceFilter, eventFilter, actionTakenFilter, messageSentFilter, activeTab]);

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
    setPreviewMedia(media);
    setIsPreviewOpen(true);
  }, []);

  // Format phone number
  const formatPhoneNumber = useCallback((phone: string | undefined): string => {
    if (!phone) return '';
    let cleanPhone = phone.replace(/[^\d]/g, '');
    if (cleanPhone && !cleanPhone.startsWith('20')) {
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '20' + cleanPhone.substring(1);
      } else {
        cleanPhone = '20' + cleanPhone;
      }
    }
    return cleanPhone;
  }, []);

  const displayPhoneNumber = useCallback((phone: string | undefined): string => {
    if (!phone) return 'غير متوفر';
    const cleanPhone = formatPhoneNumber(phone);
    if (!cleanPhone) return 'غير متوفر';
    if (cleanPhone.startsWith('20')) {
      const countryCode = cleanPhone.substring(0, 2);
      const number = cleanPhone.substring(2);
      return `+${countryCode} ${number.substring(0, 2)} ${number.substring(2, 6)} ${number.substring(6)}`;
    }
    return cleanPhone;
  }, [formatPhoneNumber]);

  // Send SMS
  const sendSMS = async (messageType: string = 'custom') => {
    if (!selectedMedia) return;
    
    let message = '';
    
    if (messageType === 'custom') {
      message = customMessage.trim();
      if (!message) {
        alert('يرجى كتابة الرسالة');
        return;
      }
    } else {
      // Find template by ID
      const template = performanceTemplateCategories
        .flatMap(cat => cat.templates)
        .find(t => t.id === messageType);
      
      if (template) {
        message = template.sms;
      }
    }
    
    const phoneNumber = formatPhoneNumber(selectedMedia.phone);
    
    try {
      const response = await fetch('/api/beon/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          singlePhone: phoneNumber,
          message: message
        })
      });
      
      if (response.ok) {
        alert('تم إرسال الرسالة النصية بنجاح!');
        setCustomMessage('');
        setShowCustomMessage(false);
      } else {
        alert('حدث خطأ في إرسال الرسالة النصية');
      }
    } catch (error) {
      console.error('خطأ في إرسال SMS:', error);
      alert('حدث خطأ في إرسال الرسالة النصية');
    }
  };

  // Share WhatsApp
  const shareWhatsApp = (messageType: string = 'custom') => {
    if (!selectedMedia) return;
    
    let message = '';
    
    if (messageType === 'custom') {
      message = customMessage.trim();
      if (!message) {
        alert('يرجى كتابة الرسالة');
        return;
      }
    } else {
      // Find template by ID
      const template = performanceTemplateCategories
        .flatMap(cat => cat.templates)
        .find(t => t.id === messageType);
      
      if (template) {
        message = template.whatsapp;
      }
    }
    
    const encodedMessage = encodeURIComponent(message);
    const phoneNumber = formatPhoneNumber(selectedMedia.phone);
    
    if (!phoneNumber) {
      alert('رقم الهاتف غير متوفر');
      return;
    }
    
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    const cleanUrl = whatsappUrl.replace(/\s/g, '');
    window.open(cleanUrl, '_blank');
  };

  // Pagination component
  const PaginationControls = () => (
    <div className="flex items-center justify-between mt-8 bg-white p-4 rounded-lg border-2 shadow-lg">
      <div className="text-base font-bold text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
        عرض {startIndex + 1} إلى {Math.min(startIndex + itemsPerPage, totalItems)} من {totalItems} عنصر
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="border-2 border-blue-600 text-blue-700 hover:bg-blue-50 font-bold h-10 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
          السابق
        </Button>
        
        <div className="flex items-center gap-2">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            
            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(pageNum)}
                className={currentPage === pageNum ? 
                  "w-10 h-10 p-0 bg-blue-600 hover:bg-blue-700 text-white font-bold" : 
                  "w-10 h-10 p-0 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-bold"
                }
              >
                {pageNum}
              </Button>
            );
          })}
          {totalPages > 5 && currentPage < totalPages - 2 && (
            <>
              <MoreHorizontal className="w-5 h-5 text-gray-600" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                className="w-10 h-10 p-0 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-bold"
              >
                {totalPages}
              </Button>
            </>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="border-2 border-blue-600 text-blue-700 hover:bg-blue-50 font-bold h-10 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          التالي
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

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

  if (!userData || userData.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">غير مصرح لك بالوصول</h3>
          <p className="text-gray-600">هذه الصفحة مخصصة للمديرين فقط</p>
          <p className="text-sm text-gray-500 mt-2">دورك الحالي: {userData?.role || 'غير محدد'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
          <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-extrabold text-gray-900 mb-3">إدارة الوسائط</h1>
                  <p className="text-lg font-medium text-gray-700">إدارة ومراجعة جميع الفيديوهات والصور المرفوعة</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-base font-semibold text-gray-800 bg-gray-100 px-4 py-2 rounded-lg">
                    عرض {filteredMedia.length} من {currentMediaData.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className={viewMode === 'grid' ? 'bg-blue-600 hover:bg-blue-700 text-white font-semibold' : 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold'}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className={viewMode === 'list' ? 'bg-blue-600 hover:bg-blue-700 text-white font-semibold' : 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold'}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MediaType)} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-100 h-12">
            <TabsTrigger value="videos" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold text-lg h-10">
              <Video className="w-5 h-5" />
              الفيديوهات ({videos.length})
            </TabsTrigger>
            <TabsTrigger value="images" className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white font-bold text-lg h-10">
              <ImageIcon className="w-5 h-5" />
              الصور ({images.length})
            </TabsTrigger>
          </TabsList>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 my-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-blue-800">إجمالي العناصر</p>
                    <p className="text-3xl font-extrabold text-blue-900">{currentMediaData.length}</p>
                  </div>
                  {activeTab === 'videos' ? 
                    <Video className="w-10 h-10 text-blue-700" /> : 
                    <ImageIcon className="w-10 h-10 text-purple-700" />
                  }
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-amber-800">في الانتظار</p>
                    <p className="text-3xl font-extrabold text-amber-900">
                      {currentMediaData.filter(v => v.status === 'pending').length}
                    </p>
                  </div>
                  <Clock className="w-10 h-10 text-amber-700" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-green-800">مُوافق عليها</p>
                    <p className="text-3xl font-extrabold text-green-900">
                      {currentMediaData.filter(v => v.status === 'approved').length}
                    </p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-700" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-red-800">مرفوضة</p>
                    <p className="text-3xl font-extrabold text-red-900">
                      {currentMediaData.filter(v => v.status === 'rejected').length}
                    </p>
                  </div>
                  <XCircle className="w-10 h-10 text-red-700" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-8 border-2 shadow-lg">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                <div>
                  <Label className="text-sm font-bold text-gray-800 mb-2 block">بحث</Label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-5 h-5" />
                    <Input
                      placeholder="ابحث هنا..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-12 h-11 border-2 border-gray-300 focus:border-blue-500 text-gray-900 font-medium"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-bold text-gray-800 mb-2 block">الحالة</Label>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                    <SelectTrigger className="h-11 border-2 border-gray-300 focus:border-blue-500 text-gray-900 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-medium">
                      <SelectItem value="all" className="font-medium text-gray-900">الكل</SelectItem>
                      <SelectItem value="pending" className="font-medium text-amber-700">في الانتظار</SelectItem>
                      <SelectItem value="approved" className="font-medium text-green-700">موافق عليها</SelectItem>
                      <SelectItem value="rejected" className="font-medium text-red-700">مرفوضة</SelectItem>
                      <SelectItem value="flagged" className="font-medium text-orange-700">مُعلَّمة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-bold text-gray-800 mb-2 block">نوع الحساب</Label>
                  <Select value={accountTypeFilter} onValueChange={(v) => setAccountTypeFilter(v as any)}>
                    <SelectTrigger className="h-11 border-2 border-gray-300 focus:border-blue-500 text-gray-900 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-medium">
                      <SelectItem value="all" className="font-medium text-gray-900">الكل</SelectItem>
                      <SelectItem value="player" className="font-medium text-blue-700">لاعب</SelectItem>
                      <SelectItem value="student" className="font-medium text-purple-700">طالب</SelectItem>
                      <SelectItem value="coach" className="font-medium text-green-700">مدرب</SelectItem>
                      <SelectItem value="academy" className="font-medium text-indigo-700">أكاديمية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-bold text-gray-800 mb-2 block">المصدر</Label>
                  <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)}>
                    <SelectTrigger className="h-11 border-2 border-gray-300 focus:border-blue-500 text-gray-900 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-medium">
                      <SelectItem value="all" className="font-medium text-gray-900">الكل</SelectItem>
                      {activeTab === 'videos' && <SelectItem value="youtube" className="font-medium text-red-700">YouTube</SelectItem>}
                      <SelectItem value="supabase" className="font-medium text-green-700">Supabase</SelectItem>
                      <SelectItem value="firebase" className="font-medium text-orange-700">Firebase</SelectItem>
                      <SelectItem value="external" className="font-medium text-blue-700">رابط خارجي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-bold text-gray-800 mb-2 block">الحدث الأخير</Label>
                  <Select value={eventFilter} onValueChange={(v) => setEventFilter(v as any)}>
                    <SelectTrigger className="h-11 border-2 border-gray-300 focus:border-blue-500 text-gray-900 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-medium">
                      <SelectItem value="all" className="font-medium text-gray-900">الكل</SelectItem>
                      <SelectItem value="upload" className="font-medium text-blue-700">رفع</SelectItem>
                      <SelectItem value="status_change" className="font-medium text-amber-700">تغيير حالة</SelectItem>
                      <SelectItem value="notification_sent" className="font-medium text-green-700">إرسال إشعار</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-bold text-gray-800 mb-2 block">تم اتخاذ إجراء</Label>
                  <Select value={actionTakenFilter} onValueChange={(v) => setActionTakenFilter(v as any)}>
                    <SelectTrigger className="h-11 border-2 border-gray-300 focus:border-blue-500 text-gray-900 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-medium">
                      <SelectItem value="all" className="font-medium text-gray-900">الكل</SelectItem>
                      <SelectItem value="taken" className="font-medium text-green-700">نعم</SelectItem>
                      <SelectItem value="not_taken" className="font-medium text-red-700">لا</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-bold text-gray-800 mb-2 block">تم إرسال رسائل</Label>
                  <Select value={messageSentFilter} onValueChange={(v) => setMessageSentFilter(v as any)}>
                    <SelectTrigger className="h-11 border-2 border-gray-300 focus:border-blue-500 text-gray-900 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-medium">
                      <SelectItem value="all" className="font-medium text-gray-900">الكل</SelectItem>
                      <SelectItem value="sent" className="font-medium text-green-700">تم الإرسال</SelectItem>
                      <SelectItem value="not_sent" className="font-medium text-red-700">لم يُرسل</SelectItem>
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
                  <div className="animate-spin w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-800 font-bold text-xl mb-2">جاري تحميل {activeTab === 'videos' ? 'الفيديوهات' : 'الصور'}...</p>
                  {activeTab === 'images' && (
                    <div className="text-sm text-gray-600 space-y-1 mt-4">
                      <p>🔍 البحث في Firebase collections</p>
                      <p>🔍 البحث في Supabase buckets</p>
                      <p>📂 فحص جميع حقول الصور</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {paginatedMedia.map((video) => (
                      <Card key={video.id} className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-gray-200 hover:border-blue-300" onClick={() => openMediaDetails(video)}>
                        <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden relative">
                          {video.thumbnailUrl ? (
                            <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="w-12 h-12 text-gray-500" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                            <Button
                              onClick={(e) => openMediaPreview(video, e)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 font-bold shadow-lg"
                              size="sm"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              معاينة
                            </Button>
                          </div>
                          <div className="absolute top-2 right-2">
                            <StatusBadge status={video.status} />
                          </div>
                        </div>
                        <CardContent className="p-4 bg-white">
                          <h3 className="font-bold text-gray-900 line-clamp-2 mb-3 text-lg">{video.title}</h3>
                          <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="w-5 h-5 text-blue-700" />
                              <span className="text-gray-800 font-semibold">{video.userName}</span>
                            </div>
                            {/* Phone Number */}
                            <div className="flex items-center gap-2 bg-green-50 p-2 rounded-lg border border-green-200">
                              <Phone className="w-5 h-5 text-green-700" />
                              <span className="text-green-800 font-bold text-base">
                                {displayPhoneNumber(video.phone)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <Eye className="w-4 h-4 text-blue-700" />
                                  <span className="text-blue-800 font-bold">{video.views}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 text-amber-600" />
                                  <span className="text-amber-700 font-bold">{video.likes}</span>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-sm font-bold border-2 border-gray-400 text-gray-800">
                                {video.accountType}
                              </Badge>
                            </div>
                            {/* Action indicators */}
                            <div className="flex gap-2">
                              {mediaIdToLogsMeta[video.id]?.hasAction && (
                                <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-200 text-emerald-800 border border-emerald-300">إجراء</span>
                              )}
                              {mediaIdToLogsMeta[video.id]?.hasMessage && (
                                <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-200 text-blue-800 border border-blue-300">رسالة</span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paginatedMedia.map((video) => (
                      <Card key={video.id} className="hover:shadow-md transition-shadow cursor-pointer border-2 border-gray-200 hover:border-blue-300" onClick={() => openMediaDetails(video)}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-24 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                              {video.thumbnailUrl ? (
                                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Video className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 truncate text-lg">{video.title}</h3>
                              <p className="text-base text-gray-700 truncate font-semibold">{video.userName}</p>
                              {/* Phone Number in List View */}
                              <div className="flex items-center gap-2 mt-1 bg-green-50 p-1 rounded border border-green-200 w-fit">
                                <Phone className="w-4 h-4 text-green-700" />
                                <span className="text-green-800 font-bold text-sm">
                                  {displayPhoneNumber(video.phone)}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mt-2">
                                <StatusBadge status={video.status} />
                                <Badge variant="outline" className="text-sm font-bold border-2 border-gray-400 text-gray-800">{video.accountType}</Badge>
                                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                  <span>{video.views} مشاهدة</span>
                                  <span>{video.likes} إعجاب</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={(e) => openMediaPreview(video, e)}
                                variant="outline"
                                size="sm"
                                className="border-2 border-blue-600 text-blue-700 hover:bg-blue-50 font-bold"
                              >
                                <Eye className="w-4 h-4" />
                                معاينة
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
                  <div className="animate-spin w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600 font-medium">جاري تحميل الصور...</p>
                </div>
              </div>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                    {paginatedMedia.map((image) => (
                      <Card key={image.id} className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-gray-200 hover:border-purple-300" onClick={() => openMediaDetails(image)}>
                        <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden relative">
                          {image.thumbnailUrl ? (
                            <img src={image.thumbnailUrl} alt={image.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-12 h-12 text-gray-500" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                            <Button
                              onClick={(e) => openMediaPreview(image, e)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-purple-600 hover:bg-purple-700 text-white border-purple-600 font-bold shadow-lg"
                              size="sm"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              عرض
                            </Button>
                          </div>
                          <div className="absolute top-2 right-2">
                            <StatusBadge status={image.status} />
                          </div>
                        </div>
                        <CardContent className="p-3 bg-white">
                          <h3 className="font-bold text-gray-900 line-clamp-1 text-base mb-2">{image.title}</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4 text-purple-700" />
                              <span className="text-gray-800 font-semibold truncate">{image.userName}</span>
                            </div>
                            {/* Phone Number */}
                            <div className="flex items-center gap-1 bg-green-50 p-1 rounded border border-green-200">
                              <Phone className="w-4 h-4 text-green-700" />
                              <span className="text-green-800 font-bold text-xs truncate">
                                {displayPhoneNumber(image.phone)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Eye className="w-4 h-4 text-blue-700" />
                                  <span className="text-blue-800 font-bold">{image.views}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 text-amber-600" />
                                  <span className="text-amber-700 font-bold">{image.likes}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {mediaIdToLogsMeta[image.id]?.hasAction && (
                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-emerald-200 text-emerald-800 border border-emerald-300">إجراء</span>
                              )}
                              {mediaIdToLogsMeta[image.id]?.hasMessage && (
                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-200 text-blue-800 border border-blue-300">رسالة</span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paginatedMedia.map((image) => (
                      <Card key={image.id} className="hover:shadow-md transition-shadow cursor-pointer border-2 border-gray-200 hover:border-purple-300" onClick={() => openMediaDetails(image)}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                              {image.thumbnailUrl ? (
                                <img src={image.thumbnailUrl} alt={image.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 truncate text-lg">{image.title}</h3>
                              <p className="text-base text-gray-700 truncate font-semibold">{image.userName}</p>
                              {/* Phone Number in List View */}
                              <div className="flex items-center gap-2 mt-1 bg-green-50 p-1 rounded border border-green-200 w-fit">
                                <Phone className="w-4 h-4 text-green-700" />
                                <span className="text-green-800 font-bold text-sm">
                                  {displayPhoneNumber(image.phone)}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mt-2">
                                <StatusBadge status={image.status} />
                                <Badge variant="outline" className="text-sm font-bold border-2 border-gray-400 text-gray-800">{image.accountType}</Badge>
                                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                  <span>{image.views} مشاهدة</span>
                                  <span>{image.likes} إعجاب</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={(e) => openMediaPreview(image, e)}
                                variant="outline"
                                size="sm"
                                className="border-2 border-purple-600 text-purple-700 hover:bg-purple-50 font-bold"
                              >
                                <Eye className="w-4 h-4" />
                                عرض
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
          <Card className="border-2 border-gray-300 shadow-lg">
            <CardContent className="p-16 text-center bg-gradient-to-br from-gray-50 to-gray-100">
              {activeTab === 'videos' ? (
                <Video className="w-20 h-20 text-blue-500 mx-auto mb-6" />
              ) : (
                <ImageIcon className="w-20 h-20 text-purple-500 mx-auto mb-6" />
              )}
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                لا توجد {activeTab === 'videos' ? 'فيديوهات' : 'صور'}
              </h3>
              <p className="text-lg font-medium text-gray-700">
                لم يتم رفع أي {activeTab === 'videos' ? 'فيديوهات' : 'صور'} بعد أو لا توجد نتائج تطابق الفلاتر المحددة
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* NEW: Unified Media Management Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-[98vw] max-h-[95vh] w-full h-full flex flex-col p-0 overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
          <DialogHeader className="sr-only">
            <DialogTitle>مودال إدارة الوسائط المتطور</DialogTitle>
            <DialogDescription>
              مودال شامل ومتطور لإدارة ومراجعة جميع الوسائط مع أدوات احترافية
            </DialogDescription>
          </DialogHeader>
          {selectedMedia && (
            <>
              {/* ==================== HEADER SECTION ==================== */}
              <div className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white p-6 flex-shrink-0 sticky top-0 z-10 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl border-2 border-white/30">
                      {selectedMedia.thumbnailUrl ? (
                        <img src={selectedMedia.thumbnailUrl} alt={selectedMedia.title} className="w-full h-full object-cover" />
                      ) : (
                        activeTab === 'videos' ? 
                          <Video className="w-12 h-12 text-white" /> :
                          <ImageIcon className="w-12 h-12 text-white" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-3xl font-extrabold mb-2">{selectedMedia.title}</h2>
                      <div className="flex items-center gap-6 text-blue-100">
                        <span className="flex items-center gap-2 text-lg font-semibold">
                          <User className="w-5 h-5" />
                          {selectedMedia.userName}
                        </span>
                        <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2 border border-white/30">
                          <Phone className="w-5 h-5 text-green-300" />
                          <span className="text-white font-bold text-lg">
                            {displayPhoneNumber(selectedMedia.phone)}
                          </span>
                        </div>
                        <Badge className="bg-white/30 text-white border-white/50 font-bold text-base px-3 py-1">
                          {selectedMedia.accountType}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={selectedMedia.status} className="text-white border-0 shadow-lg" />
                    <div className="flex gap-3">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white border-2 border-green-500 font-bold px-4 py-2 shadow-lg"
                        onClick={() => updateMediaStatus(selectedMedia.id, 'approved')}
                        disabled={selectedMedia.status === 'approved'}
                      >
                        <CheckCircle className="w-5 h-5" />
                        موافقة
                      </Button>
                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white border-2 border-red-500 font-bold px-4 py-2 shadow-lg"
                        onClick={() => updateMediaStatus(selectedMedia.id, 'rejected')}
                        disabled={selectedMedia.status === 'rejected'}
                      >
                        <XCircle className="w-5 h-5" />
                        رفض
                      </Button>
                      <Button
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700 text-white border-2 border-orange-500 font-bold px-4 py-2 shadow-lg"
                        onClick={() => updateMediaStatus(selectedMedia.id, 'flagged')}
                        disabled={selectedMedia.status === 'flagged'}
                      >
                        <Flag className="w-5 h-5" />
                        تعليم
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 flex overflow-hidden">
                {/* Media Display */}
                <div className="flex-1 bg-gray-50 p-6">
                  <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {activeTab === 'videos' ? (
                      <div className="aspect-video bg-black">
                        {selectedMedia.url ? (
                          <ReactPlayer
                            url={selectedMedia.url}
                            width="100%"
                            height="100%"
                            controls={true}
                            config={{
                              youtube: {
                                playerVars: {
                                  modestbranding: 1,
                                  rel: 0,
                                  showinfo: 0
                                }
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-20 h-20 text-gray-400" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-100 flex items-center justify-center">
                        {selectedMedia.url ? (
                          <img src={selectedMedia.url} alt={selectedMedia.title} className="max-w-full max-h-full object-contain" />
                        ) : (
                          <ImageIcon className="w-20 h-20 text-gray-400" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Media Info */}
                  <div className="mt-6 bg-white rounded-2xl p-6 shadow-lg">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <MessageSquare className="w-6 h-6 text-blue-600" />
                      معلومات {activeTab === 'videos' ? 'الفيديو' : 'الصورة'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">الوصف</h4>
                        <p className="text-gray-600 leading-relaxed">
                          {selectedMedia.description || `لا يوجد وصف متوفر لهذا ${activeTab === 'videos' ? 'الفيديو' : 'الصورة'}.`}
                        </p>
                        
                        {/* Phone Number Highlight */}
                        <div className="mt-4">
                          <h4 className="font-semibold text-gray-800 mb-2">رقم الهاتف</h4>
                          <div className="flex items-center gap-3 bg-green-100 p-3 rounded-lg border-2 border-green-300">
                            <Phone className="w-6 h-6 text-green-700" />
                            <span className="text-green-900 font-bold text-xl">
                              {displayPhoneNumber(selectedMedia.phone)}
                            </span>
                            <Button
                              onClick={() => navigator.clipboard.writeText(displayPhoneNumber(selectedMedia.phone))}
                              variant="outline"
                              size="sm"
                              className="border-green-600 text-green-700 hover:bg-green-50 font-bold"
                            >
                              نسخ
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">الإحصائيات</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-blue-600" />
                            <span className="text-gray-600">{selectedMedia.views} مشاهدة</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-500" />
                            <span className="text-gray-600">{selectedMedia.likes} إعجاب</span>
                          </div>
                          {activeTab === 'videos' && 'sourceType' in selectedMedia && (
                            <VideoSourceBadge sourceType={(selectedMedia as VideoData).sourceType || ''} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Panel */}
                <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col">
                  <Tabs defaultValue="messages" className="flex flex-col h-full">
                    <TabsList className="bg-gray-100 border-b-2 border-gray-300 rounded-none grid w-full grid-cols-2 h-14">
                      <TabsTrigger value="messages" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold text-lg h-12">
                        <MessageSquare className="w-5 h-5 ml-2" />
                        الرسائل
                      </TabsTrigger>
                      <TabsTrigger value="logs" className="data-[state=active]:bg-gray-600 data-[state=active]:text-white font-bold text-lg h-12">
                        <Clock className="w-5 h-5 ml-2" />
                        السجل
                      </TabsTrigger>
                    </TabsList>

                    {/* Messages Tab */}
                    <TabsContent value="messages" className="flex-1 overflow-hidden p-4">
                      <div className="h-full overflow-y-auto space-y-4">
                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <Button
                            onClick={() => updateMediaStatus(selectedMedia.id, 'approved')}
                            disabled={selectedMedia.status === 'approved'}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold h-12 shadow-lg"
                          >
                            <CheckCircle className="w-5 h-5 mr-2" />
                            موافقة
                          </Button>
                          <Button
                            onClick={() => updateMediaStatus(selectedMedia.id, 'rejected')}
                            disabled={selectedMedia.status === 'rejected'}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold h-12 shadow-lg"
                          >
                            <XCircle className="w-5 h-5 mr-2" />
                            رفض
                          </Button>
                        </div>

                        {/* Direct Message */}
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border-2 border-purple-200 shadow-lg mb-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                              <MessageSquare className="w-5 h-5 text-white" />
                            </div>
                            <h4 className="font-bold text-gray-900 text-lg">رسالة مباشرة</h4>
                          </div>
                          <SendMessageButton
                            user={user}
                            userData={userData}
                            getUserDisplayName={() => (userData?.full_name || userData?.name || user?.email || 'أنا')}
                            targetUserId={selectedMedia.userId}
                            targetUserName={selectedMedia.userName}
                            targetUserType={selectedMedia.accountType}
                            buttonText="إرسال رسالة فورية"
                            buttonVariant="default"
                            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg font-bold text-base h-12"
                          />
                        </div>

                        {/* Notification Options */}
                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200 shadow-lg mb-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full flex items-center justify-center shadow-md">
                              <Bell className="w-5 h-5 text-white" />
                            </div>
                            <h4 className="font-bold text-gray-900 text-lg">إشعارات فورية</h4>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            <Button
                              onClick={() => {
                                // Send approval notification
                                alert('تم إرسال إشعار الموافقة!');
                              }}
                              className="bg-green-500 hover:bg-green-600 text-white font-bold h-10 text-sm"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              إشعار موافقة
                            </Button>
                            <Button
                              onClick={() => {
                                // Send rejection notification
                                alert('تم إرسال إشعار الرفض!');
                              }}
                              className="bg-red-500 hover:bg-red-600 text-white font-bold h-10 text-sm"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              إشعار رفض
                            </Button>
                            <Button
                              onClick={() => {
                                // Send review notification
                                alert('تم إرسال إشعار مراجعة!');
                              }}
                              className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-10 text-sm"
                            >
                              <Clock className="w-4 h-4 mr-2" />
                              إشعار مراجعة
                            </Button>
                          </div>
                        </div>

                        {/* Performance Templates */}
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-200 shadow-lg">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                              <Star className="w-5 h-5 text-white" />
                            </div>
                            <h4 className="font-bold text-gray-900 text-lg">قوالب تحليل الأداء (احترافي)</h4>
                          </div>
                          <div className="mb-4 flex items-center gap-2">
                            <Input
                              placeholder="ابحث داخل القوالب"
                              value={templateSearch}
                              onChange={(e) => setTemplateSearch(e.target.value)}
                              className="h-10 text-sm border-2 border-indigo-300 focus:border-indigo-500 font-medium"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-10 text-sm border-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-bold"
                              onClick={() => {
                                const json = exportTemplatesAsJson();
                                const blob = new Blob([json], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'performance-templates.json';
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              JSON
                            </Button>
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-3 pr-1">
                            {templateSearch.trim() ? (
                              <div className="space-y-2">
                                {searchTemplates(templateSearch).map((tpl) => (
                                  <div key={tpl.id} className="bg-white border-2 border-gray-200 rounded-lg p-3 shadow-md hover:shadow-lg transition-shadow">
                                    <h5 className="font-bold text-gray-900 text-sm mb-3">{tpl.title}</h5>
                                    <div className="flex gap-2">
                                      <Button onClick={() => shareWhatsApp(tpl.id)} size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-9">WhatsApp</Button>
                                      <Button onClick={() => sendSMS(tpl.id)} size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-9" disabled={tpl.sms.length > 65}>SMS</Button>
                                    </div>
                                    {tpl.sms.length > 65 && (<p className="text-xs text-amber-700 mt-2 font-medium">⚠️ رسالة القالب أطول من حد SMS</p>)}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              performanceTemplateCategories.map((cat) => (
                                <div key={cat.id} className="border border-gray-200 rounded-lg">
                                  <div className="px-3 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-700">{cat.title}</div>
                                  <div className="p-2 space-y-2">
                                    {cat.templates.map((tpl) => (
                                      <div key={tpl.id} className="bg-white border-2 border-gray-200 rounded-lg p-3 shadow-md hover:shadow-lg transition-shadow">
                                        <h5 className="font-bold text-gray-900 text-sm mb-3">{tpl.title}</h5>
                                        <div className="flex gap-2">
                                          <Button onClick={() => shareWhatsApp(tpl.id)} size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-9">WhatsApp</Button>
                                          <Button onClick={() => sendSMS(tpl.id)} size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-9" disabled={tpl.sms.length > 65}>SMS</Button>
                                        </div>
                                        {tpl.sms.length > 65 && (<p className="text-xs text-amber-700 mt-2 font-medium">⚠️ رسالة القالب أطول من حد SMS</p>)}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Custom Message */}
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border-2 border-emerald-200 shadow-lg">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-md">
                                <MessageSquare className="w-5 h-5 text-white" />
                              </div>
                              <h4 className="font-bold text-gray-900 text-lg">رسالة مخصصة</h4>
                            </div>
                            <Button
                              onClick={() => setShowCustomMessage(!showCustomMessage)}
                              variant="outline"
                              size="sm"
                              className="border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold h-10 px-4"
                            >
                              {showCustomMessage ? 'إخفاء' : 'إظهار'}
                            </Button>
                          </div>

                          {showCustomMessage && (
                            <div className="space-y-4">
                              <Textarea
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                placeholder="اكتب رسالتك المخصصة هنا..."
                                className="min-h-[100px] text-sm resize-none border-2 border-emerald-300 focus:border-emerald-500 font-medium"
                                maxLength={500}
                              />
                              <div className="flex justify-between items-center">
                                <p className="text-sm font-medium text-emerald-700">{customMessage.length}/500 حرف</p>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => setCustomMessage('')}
                                    variant="outline"
                                    size="sm"
                                    className="border-2 border-gray-300 text-gray-600 hover:bg-gray-50 font-bold"
                                  >
                                    مسح
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <Button
                                  onClick={() => sendSMS('custom')}
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 shadow-lg"
                                  disabled={!customMessage.trim()}
                                >
                                  <Phone className="w-4 h-4 mr-2" />
                                  SMS مخصص
                                </Button>
                                <Button
                                  onClick={() => shareWhatsApp('custom')}
                                  className="bg-green-600 hover:bg-green-700 text-white font-bold h-11 shadow-lg"
                                  disabled={!customMessage.trim()}
                                >
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  WhatsApp مخصص
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    {/* Logs Tab */}
                    <TabsContent value="logs" className="flex-1 overflow-hidden p-4">
                      <div className="h-full overflow-y-auto">
                        {logsLoading ? (
                          <div className="text-center py-12">
                            <div className="animate-spin w-12 h-12 border-4 border-gray-200 border-t-gray-600 rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-700 text-lg font-semibold">جاري تحميل السجل...</p>
                            <p className="text-gray-500 text-sm mt-2">يرجى الانتظار</p>
                          </div>
                        ) : logs.length === 0 ? (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Clock className="w-8 h-8 text-gray-500" />
                            </div>
                            <p className="text-gray-700 text-lg font-bold">لا يوجد سجلات</p>
                            <p className="text-gray-500 text-sm mt-2">ستظهر السجلات هنا عند حدوث أنشطة</p>
                            <Button
                              onClick={() => fetchLogs(selectedMedia.id)}
                              variant="outline"
                              size="sm"
                              className="mt-4 border-2 border-gray-400 text-gray-700 hover:bg-gray-50 font-bold"
                            >
                              تحديث السجل
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-bold text-gray-900 text-lg">سجل الأنشطة ({logs.length})</h4>
                              <Button
                                onClick={() => fetchLogs(selectedMedia.id)}
                                variant="outline"
                                size="sm"
                                className="border-2 border-blue-400 text-blue-700 hover:bg-blue-50 font-bold"
                              >
                                تحديث
                              </Button>
                            </div>
                            {logs.map(log => (
                              <div key={log.id} className="flex items-start gap-4 p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all shadow-md hover:shadow-lg">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 flex items-center justify-center flex-shrink-0 shadow-md">
                                  {log.action === 'upload' && <Video className="w-5 h-5 text-green-700" />}
                                  {log.action === 'status_change' && <Clock className="w-5 h-5 text-amber-700" />}
                                  {log.action === 'notification_sent' && <MessageSquare className="w-5 h-5 text-blue-700" />}
                                  {log.action === 'approve' && <CheckCircle className="w-5 h-5 text-green-700" />}
                                  {log.action === 'reject' && <XCircle className="w-5 h-5 text-red-700" />}
                                  {log.action === 'flag' && <Flag className="w-5 h-5 text-orange-700" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="text-base font-bold text-gray-900 capitalize">{log.action}</p>
                                    {log.action === 'notification_sent' && (
                                      <Badge className="bg-blue-200 text-blue-800 font-bold">إشعار</Badge>
                                    )}
                                    {log.action === 'status_change' && (
                                      <Badge className="bg-amber-200 text-amber-800 font-bold">تغيير حالة</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-700 font-medium leading-relaxed">{log.notes}</p>
                                  <div className="flex items-center gap-4 mt-3">
                                    <p className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                                      <Clock className="w-3 h-3" />
                                      {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('ar') : 'غير محدد'}
                                    </p>
                                    {log.actionBy && (
                                      <p className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                                        <User className="w-3 h-3" />
                                        {log.actionByType || 'مستخدم'}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] w-full p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="sr-only">
            <DialogTitle>معاينة {activeTab === 'videos' ? 'الفيديو' : 'الصورة'}</DialogTitle>
            <DialogDescription>
              معاينة سريعة لـ{activeTab === 'videos' ? 'الفيديو' : 'الصورة'} المحددة
            </DialogDescription>
          </DialogHeader>
          {previewMedia && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="bg-indigo-600 text-white p-4 flex-shrink-0 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{previewMedia.title}</h2>
                    <p className="text-blue-100 text-sm mt-1">
                      {previewMedia.userName} • {previewMedia.accountType}
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsPreviewOpen(false)}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white hover:bg-opacity-20"
                  >
                    ✕
                  </Button>
                </div>
              </div>

              {/* Media Display */}
              <div className="flex-1 p-4 bg-black min-h-0">
                <div className="w-full h-full flex items-center justify-center">
                  {activeTab === 'videos' ? (
                    <ReactPlayer
                      url={previewMedia.url}
                      width="100%"
                      height="100%"
                      controls={true}
                      config={{
                        youtube: {
                          playerVars: {
                            modestbranding: 1,
                            rel: 0,
                            showinfo: 0
                          }
                        }
                      }}
                    />
                  ) : (
                    <img 
                      src={previewMedia.url} 
                      alt={previewMedia.title} 
                      className="max-w-full max-h-full object-contain"
                    />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-4 bg-gray-50 flex-shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">معلومات {activeTab === 'videos' ? 'الفيديو' : 'الصورة'}</h3>
                    <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">{previewMedia.userName}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-green-100 p-2 rounded-lg border border-green-300">
                      <Phone className="w-5 h-5 text-green-700" />
                      <span className="font-bold text-green-900 text-lg">{displayPhoneNumber(previewMedia.phone)}</span>
                    </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">إحصائيات</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">{previewMedia.views} مشاهدة</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500" />
                        <span className="font-medium">{previewMedia.likes} إعجاب</span>
                      </div>
                      <StatusBadge status={previewMedia.status} />
                    </div>
                  </div>
                </div>
                
                {previewMedia.description && (
                  <div className="mt-4">
                    <h3 className="font-semibold text-gray-800 mb-2">الوصف</h3>
                    <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border">
                      {previewMedia.description}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4">
                  <Button
                    onClick={() => {
                      setIsPreviewOpen(false);
                      openMediaDetails(previewMedia);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    إدارة {activeTab === 'videos' ? 'الفيديو' : 'الصورة'}
                  </Button>
                  <Button
                    onClick={() => window.open(previewMedia.url, '_blank')}
                    variant="outline"
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    فتح في علامة تبويب جديدة
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
