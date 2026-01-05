'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Modular Components
import { MediaStats } from './components/MediaStats';
import { MediaFilterBar } from './components/MediaFilterBar';
import { MediaGrid } from './components/MediaGrid';
import { MediaInspector } from './components/MediaInspector';
import { Media } from './types';

export default function MediaReviewPage() {
  const { user, userData } = useAuth();

  // --- State ---
  const [tab, setTab] = useState<'videos' | 'images'>('videos');
  const [videos, setVideos] = useState<Media[]>([]);
  const [images, setImages] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Selection & Modal
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // --- Authorization ---
  const isAuthorized = useMemo(() => {
    return user && (userData?.accountType === 'admin' || userData?.role === 'admin' || (userData?.accountType as unknown as string) === 'employee');
  }, [user, userData]);

  // --- Data Fetching ---
  const fetchData = useCallback(async (type: 'videos' | 'images') => {
    const result: Media[] = [];
    const colls = ['players', 'coaches', 'academies', 'clubs', 'agents'];

    // 1. Fetch from Firestore
    for (const coll of colls) {
      try {
        const snap = await getDocs(collection(db, coll));
        snap.docs.forEach(d => {
          const data = d.data();
          const items = type === 'videos' ? data.videos : data.images;

          if (items && Array.isArray(items)) {
            items.forEach((item: any, i: number) => {
              // Extract Organization name
              let organization = '';
              if (data.academy_name) organization = data.academy_name;
              else if (data.club_name) organization = data.club_name;
              else if (data.academy) organization = data.academy;
              else if (data.club) organization = data.club;
              else if (coll === 'academies' || coll === 'clubs') organization = data.name || data.fullName || data.full_name;

              // Map Account Type
              const accountTypeMap: Record<string, string> = {
                'players': 'player', 'coaches': 'coach', 'trainers': 'trainer',
                'academies': 'academy', 'clubs': 'club', 'agents': 'agent'
              };

              // Determine Source Type (R2 vs Firebase) based on URL
              const isR2 = item.url && (item.url.includes('r2.dev') || item.url.includes('supabase') || item.url.includes('el7lm.com'));

              result.push({
                id: `${d.id}_${i}`,
                title: item.title || item.label || item.desc || item.description || `${type === 'videos' ? 'فيديو' : 'صورة'} ${i + 1}`,
                description: item.description || item.desc || '',
                url: item.url || '',
                thumbnailUrl: item.thumbnail || item.thumbnailUrl || (type === 'videos' ? undefined : item.url),
                uploadDate: item.uploadedAt || item.createdAt || item.created_at || new Date(),
                userId: d.id,
                userName: data.full_name || data.fullName || data.name || data.displayName || 'مستخدم غير معروف',
                userEmail: data.email || '',
                accountType: accountTypeMap[coll] || coll,
                organization,
                status: item.status || 'pending',
                views: item.views || 0,
                likes: item.likes || 0,
                phone: data.phone || data.phoneNumber || data.telephone,
                sourceType: isR2 ? 'r2' : 'firebase',
                category: item.category || 'skills',
                country: data.country || '',
                position: data.position || '',
                age: data.age || undefined
              });
            });
          }
        });
      } catch (err) {
        console.error(`Error fetching from ${coll}:`, err);
      }
    }

    // 2. Fetch from R2 (Direct Buckets)
    try {
      const { listBucketFiles } = await import('@/app/actions/media');
      const buckets = type === 'videos' ? ['videos'] : ['profile-images', 'avatars'];

      for (const bucket of buckets) {
        const { success, files } = await listBucketFiles(bucket, '');
        if (success && files) {
          files.forEach(file => {
            // Only add if not duplicate (optional, but R2 usually distinct from Firestore records if structured correctly)
            result.push({
              id: `r2_${file.name}`,
              title: file.name.split('/').pop() || file.name,
              description: 'Uploaded directly to CDN',
              url: file.url || '',
              uploadDate: file.uploadedAt || new Date(),
              userId: 'system_r2',
              userName: 'System Storage',
              userEmail: '',
              accountType: 'system',
              status: 'pending',
              views: 0,
              likes: 0,
              sourceType: 'r2',
              category: 'CDN Content'
            });
          });
        }
      }
    } catch (err) { console.error('R2 fetch error', err); }

    return result;
  }, []);

  // --- Effects ---
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchData(tab);
      if (tab === 'videos') setVideos(data);
      else setImages(data);
      setLoading(false);
    };
    load();
  }, [tab, fetchData]);

  // --- Computation ---
  const filtered = useMemo(() => {
    const list = tab === 'videos' ? videos : images;
    return list.filter(m => {
      const matchStatus = statusFilter === 'all' || m.status === statusFilter;
      const term = searchTerm.toLowerCase();
      const matchSearch = !term ||
        m.title.toLowerCase().includes(term) ||
        m.userName.toLowerCase().includes(term) ||
        m.organization?.toLowerCase().includes(term);
      return matchStatus && matchSearch;
    });
  }, [videos, images, tab, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    const list = tab === 'videos' ? videos : images;
    return {
      total: list.length,
      pending: list.filter(m => m.status === 'pending').length,
      approved: list.filter(m => m.status === 'approved').length,
      rejected: list.filter(m => m.status === 'rejected').length
    };
  }, [videos, images, tab]);

  // --- Handlers ---
  const handleUpdateStatus = async (media: Media, newStatus: 'approved' | 'rejected' | 'flagged') => {
    try {
      // Logic for R2 direct files (mock)
      if (media.userId === 'system_r2') {
        toast.info('Status update for raw CDN files is not fully supported yet.');
        return;
      }

      const [userId, index] = media.id.split('_');
      const collName = media.accountType + 's'; // simple pluralization
      const userRef = doc(db, collName, userId);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        const arr = tab === 'videos' ? (data.videos || []) : (data.images || []);
        const idx = parseInt(index);

        if (arr[idx]) {
          arr[idx].status = newStatus;
          arr[idx].reviewedAt = new Date();
          arr[idx].reviewedBy = user?.uid;

          await updateDoc(userRef, tab === 'videos' ? { videos: arr } : { images: arr });

          // Update Local State
          const updateList = (list: Media[]) => list.map(m => m.id === media.id ? { ...m, status: newStatus } : m);
          if (tab === 'videos') setVideos(prev => updateList(prev));
          else setImages(prev => updateList(prev));

          toast.success(`Media marked as ${newStatus}`);
          setIsInspectorOpen(false);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to update status');
    }
  };

  const handlePreview = (media: Media) => {
    setSelectedMedia(media);
    setIsInspectorOpen(true);
  };

  // --- Access Denied View ---
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-xl border-none">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
            <Shield className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Access Restricted</h3>
            <p className="text-slate-500 text-sm mt-2">To view this page, you must have Administrator privileges.</p>
          </div>
          <Button className="w-full" variant="outline" onClick={() => window.location.href = '/'}>
            Return Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20" dir="rtl">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between py-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold">
                M
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">مركز مراجعة المحتوى</h1>
                <p className="text-xs text-slate-500 font-medium">Media Review & Moderation</p>
              </div>
            </div>

            <Tabs value={tab} onValueChange={(v: any) => setTab(v)} className="w-full md:w-auto">
              <TabsList className="bg-slate-100 p-1 rounded-lg w-full md:w-auto h-auto">
                <TabsTrigger value="videos" className="px-6 py-2 rounded-md font-medium text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  فيديو ({videos.length})
                </TabsTrigger>
                <TabsTrigger value="images" className="px-6 py-2 rounded-md font-medium text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  صور ({images.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* Stats Overview */}
        <MediaStats stats={stats} />

        {/* Filter Bar */}
        <MediaFilterBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />

        {/* Content Grid */}
        <MediaGrid
          items={filtered}
          loading={loading}
          tab={tab}
          onPreview={handlePreview}
        />
      </div>

      {/* Inspector Sheet/Modal */}
      <MediaInspector
        media={selectedMedia}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        onUpdateStatus={handleUpdateStatus}
      />

    </div>
  );
}
