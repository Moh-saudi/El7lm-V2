'use client';

import React, { useEffect, useState, useRef, useMemo, memo } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import {
  Heart, MessageCircle, Share2, Music, Play, UserPlus, Search, Filter, Volume2, VolumeX, Calendar
} from 'lucide-react';
import Comments from '@/components/video/Comments';
import PlayerImage from '@/components/ui/player-image';
import ReactPlayer from 'react-player';
import { safeNavigate } from '@/lib/utils/url-validator';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import 'dayjs/locale/ar';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { getPlayerAvatarUrl, getSupabaseImageUrl } from '@/lib/supabase/image-utils';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, Keyboard } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

import 'swiper/css';
import 'swiper/css/mousewheel';
import 'swiper/css/keyboard';

interface Video {
  id: string;
  url: string;
  playerName: string;
  playerImage: string;
  playerPosition?: string;
  description: string;
  likes: number;
  comments: number;
  shares: number;
  music: string;
  playerId: string;
  createdAt: any;
}

interface PlayerVideosPageProps {
  accountType: 'club' | 'academy' | 'trainer' | 'agent' | 'player';
}

function isDirectVideo(url: string) {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();

  // Explicitly exclude common social media players that need ReactPlayer
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') ||
    lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch') ||
    lowerUrl.includes('instagram.com') || lowerUrl.includes('vimeo.com') ||
    lowerUrl.includes('tiktok.com')) {
    return false;
  }

  const cleanUrl = url.split('?')[0].toLowerCase();
  return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.mov') ||
    url.includes('supabase.co/storage') || url.includes('assets.el7lm.com') || url.includes('r2.dev') ||
    url.includes('firebasestorage.googleapis.com');
}

function getVideoThumbnail(url: string) {
  if (!url) return undefined;
  const youtubeMatch = url.match(/(?:youtube\.com.*[?&]v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return youtubeMatch ? `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg` : undefined;
}

// Sub-component for each slide to optimize rendering
const VideoSlide = memo(({
  video,
  isActive,
  isNear,
  muted,
  playing,
  onTogglePlay,
  onLike,
  onComment,
  onShare,
  onFollow,
  isLiked,
  isFollowing,
  router
}: {
  video: Video;
  isActive: boolean;
  isNear: boolean;
  muted: boolean;
  playing: boolean;
  onTogglePlay: () => void;
  onLike: (id: string) => void;
  onComment: (id: string) => void;
  onShare: (v: Video) => void;
  onFollow: (id: string) => void;
  isLiked: boolean;
  isFollowing: boolean;
  router: any;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const stuckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Shared stuck detection for both video element and ReactPlayer
    if (isActive && playing) {
      setIsStuck(false);
      if (stuckTimeoutRef.current) clearTimeout(stuckTimeoutRef.current);

      stuckTimeoutRef.current = setTimeout(() => {
        // If still loading after 10 seconds and we're active
        if (isLoading) {
          console.warn("Video load timeout (10s):", video.url);
          setIsStuck(true);
          setHasError(true);
          setIsLoading(false);
        }
      }, 10000); // 10 seconds is safer for varied connections

      if (videoRef.current) {
        videoRef.current.play().catch(err => {
          if (err.name !== 'AbortError') {
            console.warn("Playback failed:", err);
          }
        });
      }
    } else {
      if (stuckTimeoutRef.current) {
        clearTimeout(stuckTimeoutRef.current);
        stuckTimeoutRef.current = null;
      }
      if (videoRef.current) videoRef.current.pause();
    }

    return () => {
      if (stuckTimeoutRef.current) clearTimeout(stuckTimeoutRef.current);
    };
  }, [isActive, playing, video.url, isLoading]);

  // Handle successful play/canplay
  const handlePlaybackStarted = () => {
    setIsLoading(false);
    setIsStuck(false);
    if (stuckTimeoutRef.current) {
      clearTimeout(stuckTimeoutRef.current);
      stuckTimeoutRef.current = null;
    }
  };

  // Reset states when video changes
  useEffect(() => {
    setHasError(false);
    setIsStuck(false);
    setIsLoading(true);
  }, [video.url]);

  return (
    <div className="w-full h-full relative bg-black overflow-hidden flex items-center justify-center" onClick={onTogglePlay}>
      {/* Video Content */}
      <div className="absolute inset-0 w-full h-full z-0">
        {isNear && !hasError ? (
          isDirectVideo(video.url) ? (
            <video
              ref={videoRef}
              src={video.url}
              className="w-full h-full object-cover"
              loop
              muted={muted}
              playsInline
              onCanPlay={handlePlaybackStarted}
              onPlaying={handlePlaybackStarted}
              onLoadedData={handlePlaybackStarted}
              onWaiting={() => setIsLoading(true)}
              onError={() => {
                console.error("Video element error:", video.url);
                setHasError(true);
              }}
              style={{ display: 'block' }}
            />
          ) : (
            <div className="w-full h-full">
              <ReactPlayer
                url={video.url}
                playing={isActive && playing}
                loop
                muted={muted}
                width="100%"
                height="100%"
                playsinline
                onStart={handlePlaybackStarted}
                onPlay={handlePlaybackStarted}
                onReady={handlePlaybackStarted}
                onBuffer={() => setIsLoading(true)}
                onBufferEnd={() => setIsLoading(false)}
                onError={(e) => {
                  console.error("ReactPlayer error:", e, video.url);
                  setHasError(true);
                }}
                config={{
                  youtube: { playerVars: { showinfo: 0, controls: 0, rel: 0, modestbranding: 1, iv_load_policy: 3, autoplay: 1 } },
                  facebook: { attributes: { 'data-show-text': 'false' } },
                  file: {
                    attributes: {
                      style: { objectFit: 'cover', width: '100%', height: '100%' }
                    }
                  }
                }}
              />
            </div>
          )
        ) : (
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${getVideoThumbnail(video.url) || video.playerImage || '/default-player-avatar.png'})` }}
          >
            {hasError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white p-6 text-center z-50">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                  <Play className="w-8 h-8 opacity-40" />
                </div>
                <p className="font-bold text-lg mb-2">عذراً، تعذر تشغيل الفيديو</p>
                <p className="text-sm opacity-60">
                  {isStuck ? "الفيديو يستغرق وقتاً طويلاً في التحميل" : "قد يكون الرابط غير متاح حالياً"}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); window.open(video.url, '_blank'); }}
                  className="mt-6 px-6 py-2 bg-white text-black rounded-full font-bold hover:scale-105 transition-transform"
                >
                  فتح الفيديو الأصلي
                </button>
              </div>
            )}
          </div>
        )}

        {/* Loading Spinner for specific video slide */}
        {isActive && isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 pointer-events-none z-10" />

      {/* Interactions Hud */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-7 z-30 pointer-events-auto">
        <div className="relative mb-2">
          <div onClick={(e) => { e.stopPropagation(); safeNavigate(router, `/dashboard/shared/player-profile/${video.playerId}`); }} className="w-16 h-16 rounded-full border-2 border-white/90 p-0.5 cursor-pointer shadow-2xl overflow-hidden bg-zinc-800 transition-transform active:scale-90">
            <PlayerImage src={video.playerImage} alt={video.playerName} className="w-full h-full rounded-full object-cover" />
          </div>
          {!isFollowing && (
            <button onClick={(e) => { e.stopPropagation(); onFollow(video.playerId); }} className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 bg-[#FE2C55] rounded-full flex items-center justify-center border-2 border-black shadow-lg hover:scale-110 transition-transform">
              <UserPlus className="w-3.5 h-3.5 text-white" />
            </button>
          )}
        </div>

        <button onClick={(e) => { e.stopPropagation(); onLike(video.id); }} className="flex flex-col items-center">
          <div className={`w-14 h-14 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/10 transition-all ${isLiked ? 'text-[#FE2C55]' : 'text-white'}`}>
            <Heart className={`w-8 h-8 ${isLiked ? 'fill-current' : ''}`} />
          </div>
          <span className="text-white text-sm font-black mt-2 drop-shadow-md">{video.likes}</span>
        </button>

        <button onClick={(e) => { e.stopPropagation(); onComment(video.id); }} className="flex flex-col items-center">
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white transition-all">
            <MessageCircle className="w-8 h-8" />
          </div>
          <span className="text-white text-sm font-black mt-2 drop-shadow-md">{video.comments}</span>
        </button>

        <button onClick={(e) => { e.stopPropagation(); onShare(video); }} className="flex flex-col items-center text-white">
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/10 transition-all">
            <Share2 className="w-7 h-7" />
          </div>
          <span className="text-white text-sm font-black mt-2 drop-shadow-md">{video.shares}</span>
        </button>
      </div>

      {/* Info Hud */}
      <div className="absolute bottom-8 left-0 right-20 p-8 z-20 text-white flex flex-col gap-3 pointer-events-none drop-shadow-2xl">
        <div className="flex items-center gap-2 pointer-events-auto">
          <h3 onClick={(e) => { e.stopPropagation(); safeNavigate(router, `/dashboard/shared/player-profile/${video.playerId}`); }} className="text-2xl font-black cursor-pointer hover:underline">@{video.playerName}</h3>
          {video.playerPosition && <span className="text-[10px] bg-blue-600 px-2 py-1 rounded text-white font-black shadow-lg">{video.playerPosition}</span>}
        </div>
        <p className="text-base font-medium line-clamp-2 leading-relaxed opacity-95 pr-3 border-r-2 border-white/30 pointer-events-auto">{video.description || "أداء مذهل في الملعب! 🔥"}</p>
        <div className="flex items-center gap-4 text-sm font-bold text-white/70 mt-1">
          <div className="flex items-center gap-2"><Music className="w-4 h-4 text-blue-400" /><span>{video.music}</span></div>
          <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-purple-400" /><span>{dayjs(video.createdAt).locale('ar').fromNow()}</span></div>
        </div>
      </div>

      {/* Play/Pause Indicator */}
      {!playing && isActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 bg-black/10">
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-20 h-20 bg-black/40 backdrop-blur-3xl rounded-full flex items-center justify-center text-white border border-white/20 shadow-2xl">
            <Play className="w-10 h-10 fill-current ml-2" />
          </motion.div>
        </div>
      )}
    </div>
  );
});

VideoSlide.displayName = 'VideoSlide';

export default function PlayerVideosPage({ accountType }: PlayerVideosPageProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'following'>('all');
  const [mounted, setMounted] = useState(false);

  const [likedVideos, setLikedVideos] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);

  const swiperRef = useRef<SwiperType | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    fetchVideos();
    if (user) loadUserPreferences();
  }, [user]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const playersSnapshot = await getDocs(collection(db, 'players'));
      const allVideos: Video[] = [];
      for (const playerDoc of playersSnapshot.docs) {
        const playerData = playerDoc.data();
        if (playerData.isDeleted) continue;
        const playerVideos = playerData.videos || [];
        playerVideos.forEach((video: any, index: number) => {
          if (!video.url) return; // Skip videos without URLs

          let videoDate = video.createdAt || video.updated_at || new Date();
          if (videoDate?.toDate) videoDate = videoDate.toDate();

          const videoUrl = getSupabaseImageUrl(video.url, 'videos');
          if (!videoUrl) return;

          allVideos.push({
            id: `${playerDoc.id}_${index}`,
            url: videoUrl,
            playerName: playerData.full_name || playerData.name || 'لاعب',
            playerImage: getPlayerAvatarUrl(playerData) || '/default-player-avatar.png',
            playerPosition: playerData.primary_position || '',
            description: video.description || '',
            likes: video.likes || 0,
            comments: video.comments || 0,
            shares: video.shares || 0,
            music: video.music || 'Original Sound',
            playerId: playerDoc.id,
            createdAt: videoDate,
          });
        });
      }
      setVideos(allVideos.sort(() => Math.random() - 0.5));
      setLoading(false);
    } catch (err) { console.error(err); setLoading(false); }
  };

  const loadUserPreferences = async () => {
    if (!user) return;
    try {
      const mapping = { club: 'clubs', academy: 'academies', trainer: 'trainers', agent: 'agents', player: 'players' };
      const col = mapping[accountType] || 'players';
      const docSnap = await getDoc(doc(db, col, user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLikedVideos(data.likedVideos || []);
        setFollowing(data.following || []);
      }
    } catch (err) { console.error(err); }
  };

  const filteredVideos = useMemo(() => {
    let f = videos;
    if (searchQuery) f = f.filter(v => v.playerName.toLowerCase().includes(searchQuery.toLowerCase()) || v.description.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterType === 'following') f = f.filter(v => following.includes(v.playerId));
    return f;
  }, [videos, searchQuery, filterType, following]);

  const handleLike = async (id: string) => {
    if (!user) return;
    const isLiked = likedVideos.includes(id);
    const newList = isLiked ? likedVideos.filter(vid => vid !== id) : [...likedVideos, id];
    setLikedVideos(newList);
    // Update player videos count
    try {
      const [pid, vidIdx] = id.split('_');
      const idx = parseInt(vidIdx);
      const playerRef = doc(db, 'players', pid);
      const pDoc = await getDoc(playerRef);
      if (pDoc.exists()) {
        const vids = pDoc.data().videos || [];
        if (vids[idx]) {
          vids[idx].likes = Math.max(0, (vids[idx].likes || 0) + (isLiked ? -1 : 1));
          await updateDoc(playerRef, { videos: vids });
        }
      }
      // Update current user data
      const mapping = { club: 'clubs', academy: 'academies', trainer: 'trainers', agent: 'agents', player: 'players' };
      const col = mapping[accountType] || 'players';
      await updateDoc(doc(db, col, user.uid), { likedVideos: newList });
    } catch (err) { console.error(err); }
  };

  const handleFollow = async (pid: string) => {
    if (!user) return;
    const isFollowing = following.includes(pid);
    const newList = isFollowing ? following.filter(id => id !== pid) : [...following, pid];
    setFollowing(newList);
    try {
      const mapping = { club: 'clubs', academy: 'academies', trainer: 'trainers', agent: 'agents', player: 'players' };
      const col = mapping[accountType] || 'players';
      await updateDoc(doc(db, col, user.uid), { following: newList });
    } catch (err) { console.error(err); }
  };

  const handleShare = (v: Video) => {
    const url = `${window.location.origin}/videos/${v.id}`;
    if (navigator.share) navigator.share({ title: v.playerName, url });
    else navigator.clipboard.writeText(url);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-black text-white">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-lg font-bold">جاري تحميل التجربة...</p>
    </div>
  );

  return (
    <div className="relative w-full h-full flex-1 bg-black overflow-hidden flex justify-center selection:bg-blue-500/30">
      {/* Background Aura - Optimized for performance */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
        {filteredVideos[currentVideoIndex] && (
          <div
            key={filteredVideos[currentVideoIndex].id}
            className="absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out"
          >
            <div
              className="absolute inset-0 bg-cover bg-center blur-[80px] brightness-[0.3] saturate-[1.2] opacity-60"
              style={{ backgroundImage: `url(${getVideoThumbnail(filteredVideos[currentVideoIndex].url) || filteredVideos[currentVideoIndex].playerImage})` }}
            />
            <div className="absolute inset-0 bg-black/50" />
          </div>
        )}
      </div>

      {/* Header HUD */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] z-[60] px-4 py-8 pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSearch(!showSearch)} className="p-3 rounded-full bg-black/40 backdrop-blur-3xl border border-white/10 text-white hover:bg-white/10 transition-all shadow-xl">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-3 rounded-full bg-black/40 backdrop-blur-3xl border border-white/10 text-white transition-all shadow-xl">
              <Filter className="w-5 h-5" />
            </button>
          </div>
          <div className="flex bg-black/40 backdrop-blur-3xl border border-white/10 rounded-full p-1.5 shadow-2xl">
            <button onClick={() => setFilterType('all')} className={`px-6 py-1.5 rounded-full text-sm font-black transition-all ${filterType === 'all' ? 'bg-white text-black shadow-lg scale-105' : 'text-white/50'}`}>لك</button>
            <button onClick={() => setFilterType('following')} className={`px-6 py-1.5 rounded-full text-sm font-black transition-all ${filterType === 'following' ? 'bg-white text-black shadow-lg scale-105' : 'text-white/50'}`}>متابعة</button>
          </div>
          <button onClick={() => setMuted(!muted)} className="p-3 rounded-full bg-black/40 backdrop-blur-3xl border border-white/10 text-white hover:bg-white/10 shadow-xl">
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Swiper "Special Frame" Container */}
      <div className="relative w-full max-w-[500px] h-full z-10 bg-black shadow-[0_0_150px_rgba(0,0,0,1)] border-x border-white/10 ring-1 ring-white/5">
        {mounted && filteredVideos.length > 0 && (
          <Swiper
            direction="vertical"
            modules={[Mousewheel, Keyboard]}
            mousewheel={{ forceToAxis: true, sensitivity: 1 }}
            keyboard={{ enabled: true }}
            className="h-full w-full"
            onSlideChange={(s) => setCurrentVideoIndex(s.activeIndex)}
            speed={400}
            threshold={10}
            resistanceRatio={0.5}
            nested={true}
          >
            {filteredVideos.map((video, index) => (
              <SwiperSlide key={video.id} className="h-full w-full">
                <VideoSlide
                  video={video}
                  isActive={index === currentVideoIndex}
                  isNear={Math.abs(index - currentVideoIndex) <= 2} // Pre-load 2 neighbors for better balance
                  muted={muted}
                  playing={playing}
                  onTogglePlay={() => setPlaying(!playing)}
                  onLike={handleLike}
                  onComment={(id) => setSelectedVideoId(id)}
                  onShare={handleShare}
                  onFollow={handleFollow}
                  isLiked={likedVideos.includes(video.id)}
                  isFollowing={following.includes(video.playerId)}
                  router={router}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>

      {/* Full-screen Comments Modal */}
      <AnimatePresence>
        {selectedVideoId && (
          <div className="fixed inset-0 z-[100] flex justify-center pointer-events-none">
            <div className="w-full max-w-[500px] h-full relative pointer-events-auto shadow-[0_0_100px_rgba(0,0,0,0.8)]">
              <Comments videoId={selectedVideoId} isOpen={true} onClose={() => setSelectedVideoId(null)} inline={true} />
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} className="absolute top-24 left-1/2 w-full max-w-[460px] z-[70] px-4">
            <div className="bg-zinc-900/98 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-white/20 shadow-full">
              <div className="relative">
                <input type="text" placeholder="ابحث عن المهارة..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-full py-4 px-8 text-white outline-none focus:ring-2 focus:ring-blue-500/50" />
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
