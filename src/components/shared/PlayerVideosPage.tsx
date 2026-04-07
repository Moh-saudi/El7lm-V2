'use client';

import Comments from '@/components/video/Comments';
import MessageComposerSheet from '@/components/shared/MessageComposerSheet';
import PlayerImage from '@/components/ui/player-image';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import { getPlayerAvatarUrl, getSupabaseImageUrl } from '@/lib/supabase/image-utils';
import { safeNavigate } from '@/lib/utils/url-validator';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import relativeTime from 'dayjs/plugin/relativeTime';
import { dispatchNotification } from '@/lib/notifications/notification-dispatcher';
import {
  ArrowRight,
  Calendar,
  Eye,
  Film,
  Filter,
  Heart,
  MessageCircle,
  MessageSquare,
  Music,
  Play,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
  UserCheck,
  UserPlus,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactPlayer from 'react-player';

dayjs.extend(relativeTime);

// ─── Types ────────────────────────────────────────────────────────────────────

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
  views: number;
  music: string;
  playerId: string;
  createdAt: string | Date | null;
  // Search fields
  country?: string;
  nationality?: string;
  age?: number;
  phone?: string;
}

interface SearchFilters {
  name: string;
  position: string;
  ageMin: string;
  ageMax: string;
  country: string;
  phone: string;
}

function calcAge(birthDate: any): number | undefined {
  if (!birthDate) return undefined;
  try {
    const d = birthDate?.toDate ? birthDate.toDate() : new Date(birthDate);
    const diff = Date.now() - d.getTime();
    const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    return age > 0 && age < 100 ? age : undefined;
  } catch { return undefined; }
}

interface PlayerVideosPageProps {
  accountType: 'club' | 'academy' | 'trainer' | 'agent' | 'player' | 'marketer';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STREAMING_PLATFORMS = [
  'youtube.com', 'youtu.be', 'facebook.com', 'fb.watch',
  'instagram.com', 'vimeo.com', 'tiktok.com',
];

function resolveVideoUrl(raw: string): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (STREAMING_PLATFORMS.some(p => lower.includes(p))) return raw;
  const resolved = getSupabaseImageUrl(raw, 'videos');
  return resolved || null;
}

function isDirectVideo(url: string) {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (STREAMING_PLATFORMS.some(p => lower.includes(p))) return false;
  const clean = url.split('?')[0].toLowerCase();
  return (
    clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mov') ||
    url.includes('supabase.co/storage') || url.includes('assets.el7lm.com') ||
    url.includes('r2.dev') || url.includes('firebasestorage.googleapis.com')
  );
}

function getYoutubeThumbnail(url: string): string | undefined {
  const m = url.match(/(?:youtube\.com.*[?&]v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : undefined;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}ك`;
  return String(n);
}

const COLLECTION_MAP: Record<string, string> = {
  club: 'clubs', academy: 'academies', trainer: 'trainers', agent: 'agents', player: 'players',
};

// ─── HUD Action Button ────────────────────────────────────────────────────────

const HudButton = memo(({
  icon, label, active, activeColor = 'text-red-400', activeBg = 'bg-red-500/20', onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  activeColor?: string;
  activeBg?: string;
  onClick: (e: React.MouseEvent) => void;
}) => (
  <motion.button
    onClick={(e) => { e.stopPropagation(); onClick(e); }}
    whileTap={{ scale: 0.80 }}
    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
    className="flex flex-col items-center gap-2"
    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', minWidth: 52 }}
  >
    {/* Icon circle */}
    <div
      className={`w-13 h-13 flex items-center justify-center rounded-full border shadow-lg transition-all duration-200
        ${active
          ? `${activeColor} ${activeBg} border-current/30`
          : 'text-white bg-black/40 border-white/15 backdrop-blur-md'}`}
      style={{ width: 52, height: 52 }}
    >
      {icon}
    </div>
    {/* Count label — larger and always white */}
    <span
      className="text-white text-sm font-black tabular-nums leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
      style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
    >
      {label}
    </span>
  </motion.button>
));
HudButton.displayName = 'HudButton';

// ─── VideoSlide ───────────────────────────────────────────────────────────────

const VideoSlide = memo(({
  video, isActive, isNear, muted, playing,
  onTogglePlay, onLike, onComment, onShare, onFollow, onView, onMessage, onProfileClick,
  isLiked, isFollowing, router,
}: {
  video: Video; isActive: boolean; isNear: boolean; muted: boolean; playing: boolean;
  onTogglePlay: () => void; onLike: (id: string) => void; onComment: (id: string) => void;
  onShare: (v: Video) => void; onFollow: (id: string) => void; onView: (id: string) => void;
  onMessage: (v: Video) => void; onProfileClick: (playerId: string) => void;
  isLiked: boolean; isFollowing: boolean; router: any;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);
  const [errorType, setErrorType] = useState<'network' | 'format' | 'timeout' | 'unknown'>('unknown');
  const [isLoading, setIsLoading] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [retryKey, setRetryKey] = useState(0); // increment to force remount
  const stuckRef = useRef<NodeJS.Timeout | null>(null);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isDirect = useMemo(() => isDirectVideo(video.url), [video.url]);
  const isYouTube = useMemo(() => video.url.includes('youtube.com') || video.url.includes('youtu.be'), [video.url]);

  // Play / pause sync
  useEffect(() => {
    if (isActive && playing) {
      // YouTube needs more time to initialize; direct files need less
      const timeout = isYouTube ? 25000 : 18000;
      stuckRef.current = setTimeout(() => {
        if (isLoading) { setHasError(true); setErrorType('timeout'); setIsLoading(false); }
      }, timeout);
      videoRef.current?.play(); // catch removed;
    } else {
      if (stuckRef.current) clearTimeout(stuckRef.current);
      videoRef.current?.pause();
    }
    return () => { if (stuckRef.current) clearTimeout(stuckRef.current); };
  }, [isActive, playing, isLoading, isYouTube]);

  // View count: register after 3s of watching
  useEffect(() => {
    if (isActive && playing && !hasError) {
      viewTimerRef.current = setTimeout(() => onView(video.id), 3000);
    } else {
      if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
    }
    return () => { if (viewTimerRef.current) clearTimeout(viewTimerRef.current); };
  }, [isActive, playing, hasError, video.id, onView]);

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
    setVideoProgress(0);
    setRetryKey(k => k + 1);
  }, [video.url]);

  const onReady = useCallback(() => {
    setIsLoading(false);
    if (stuckRef.current) { clearTimeout(stuckRef.current); stuckRef.current = null; }
  }, []);

  const handleRetry = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setHasError(false);
    setIsLoading(true);
    setRetryKey(k => k + 1);
  }, []);

  const handleVideoError = useCallback((e?: any) => {
    if (stuckRef.current) clearTimeout(stuckRef.current);
    const code = e?.target?.error?.code;
    if (code === 2) setErrorType('network');
    else if (code === 3 || code === 4) setErrorType('format');
    else setErrorType('unknown');
    setHasError(true);
    setIsLoading(false);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const el = videoRef.current;
    if (el && el.duration > 0) setVideoProgress(el.currentTime / el.duration);
  }, []);

  const thumbnail = useMemo(
    () => getYoutubeThumbnail(video.url) || video.playerImage || '/default-player-avatar.png',
    [video.url, video.playerImage],
  );

  const bottomOffset = 'calc(env(safe-area-inset-bottom, 0px) + 28px)';

  const errorMessages: Record<string, string> = {
    network: 'تعذّر الوصول للفيديو — تحقق من الاتصال',
    format: 'صيغة الفيديو غير مدعومة',
    timeout: 'استغرق التحميل وقتاً طويلاً',
    unknown: 'تعذّر تشغيل الفيديو',
  };

  return (
    <div className="absolute inset-0 bg-black overflow-hidden" onClick={onTogglePlay}>

      {/* Thumbnail base layer */}
      <div
        className="absolute inset-0 z-0 bg-zinc-900 bg-cover bg-center"
        style={{ backgroundImage: `url(${thumbnail})` }}
      />

      {/* Video layer */}
      {isNear && !hasError && (
        <div key={retryKey} className="absolute inset-0 z-[1]">
          {isDirect ? (
            <video
              ref={videoRef}
              src={video.url}
              poster={thumbnail}
              className="w-full h-full object-cover"
              loop muted={muted} playsInline preload="metadata"
              onCanPlay={onReady} onPlaying={onReady} onLoadedData={onReady}
              onWaiting={() => setIsLoading(true)}
              onTimeUpdate={handleTimeUpdate}
              onError={handleVideoError}
            />
          ) : (
            <ReactPlayer
              url={video.url}
              playing={isActive && playing}
              loop muted={muted}
              width="100%" height="100%"
              playsinline
              onStart={onReady} onPlay={onReady} onReady={onReady}
              onBuffer={() => setIsLoading(true)}
              onBufferEnd={onReady}
              onError={() => handleVideoError()}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              config={{
                youtube: {
                  playerVars: {
                    showinfo: 0,
                    controls: 0,
                    rel: 0,
                    modestbranding: 1,
                    autoplay: 1,
                    // ✅ mute:1 required for autoplay in browsers
                    mute: muted ? 1 : 0,
                    playsinline: 1,
                    iv_load_policy: 3,
                    fs: 0,
                  },
                },
                facebook: { appId: '966242223397117', playerId: 'fb-player' },
                vimeo: { playerOptions: { autopause: false, muted: true } },
                file: {
                  attributes: {
                    style: { objectFit: 'cover', width: '100%', height: '100%' },
                    playsInline: true,
                  },
                  forceVideo: true,
                },
              }}
            />
          )}
        </div>
      )}

      {/* Error overlay */}
      {hasError && (
        <div
          className="absolute inset-0 z-[2] flex flex-col items-center justify-center bg-black/85 text-white p-6 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 rounded-full bg-white/8 flex items-center justify-center mb-4 border border-white/10">
            <Play className="w-7 h-7 opacity-30" />
          </div>
          <p className="font-black text-base mb-1">{errorMessages[errorType]}</p>
          {errorType === 'timeout' && (
            <p className="text-xs text-white/40 mb-5">قد يكون الاتصال بطيئاً</p>
          )}
          {errorType === 'format' && (
            <p className="text-xs text-white/40 mb-5">جرّب الفتح في المتصفح</p>
          )}
          {(errorType === 'network' || errorType === 'unknown') && (
            <p className="text-xs text-white/40 mb-5">قد يكون الفيديو محذوفاً أو خاصاً</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {/* Retry */}
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/15 border border-white/20 rounded-full font-bold text-sm active:scale-95 transition-transform"
            >
              <RefreshCw className="w-4 h-4" /> إعادة المحاولة
            </button>
            {/* Open externally */}
            {isYouTube ? (
              <button
                onClick={(e) => { e.stopPropagation(); window.open(video.url, '_blank'); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600/80 rounded-full font-bold text-sm active:scale-95 transition-transform"
              >
                ▶ يوتيوب
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); window.open(video.url, '_blank'); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/15 border border-white/20 rounded-full font-bold text-sm active:scale-95 transition-transform"
              >
                فتح في المتصفح
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading spinner */}
      {isActive && isLoading && !hasError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 z-30 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 30%, transparent 55%, rgba(0,0,0,0.85) 100%)' }}
      />

      {/* Progress bar (direct video only) */}
      {isActive && videoProgress > 0 && (
        <div className="absolute bottom-0 inset-x-0 z-40 h-0.5 pointer-events-none">
          <div className="h-full bg-white/25">
            <div
              className="h-full bg-white/80 transition-none"
              style={{ width: `${videoProgress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Right-side HUD ─────────────────────────────── */}
      <div
        className="absolute right-3 flex flex-col items-center gap-4 z-40 pointer-events-auto"
        style={{ bottom: bottomOffset }}
      >
        {/* Avatar + Follow */}
        <div className="flex flex-col items-center gap-2">
          <div
            onClick={(e) => { e.stopPropagation(); onProfileClick(video.playerId); }}
            className="w-12 h-12 rounded-full border-[2.5px] border-white/90 overflow-hidden bg-zinc-800 cursor-pointer shadow-xl active:scale-95 transition-transform"
          >
            <PlayerImage src={video.playerImage} alt={video.playerName} className="w-full h-full rounded-full object-cover" />
          </div>
          {/* Follow button — below avatar, not overlapping */}
          <button
            onClick={(e) => { e.stopPropagation(); onFollow(video.playerId); }}
            className={`flex items-center justify-center w-7 h-7 rounded-full border-2 border-black shadow-lg transition-all duration-200 active:scale-90
              ${isFollowing ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ touchAction: 'manipulation' }}
            title={isFollowing ? 'تمت المتابعة' : 'متابعة'}
          >
            {isFollowing
              ? <UserCheck className="w-3.5 h-3.5 text-white" />
              : <UserPlus className="w-3.5 h-3.5 text-white" />
            }
          </button>
        </div>

        {/* Like */}
        <HudButton
          icon={<Heart className={`w-7 h-7 transition-all duration-150 ${isLiked ? 'fill-current' : ''}`} />}
          label={formatCount(video.likes)}
          active={isLiked}
          activeColor="text-red-400"
          activeBg="bg-red-500/25"
          onClick={() => onLike(video.id)}
        />

        {/* Comments */}
        <HudButton
          icon={<MessageCircle className="w-7 h-7" />}
          label={formatCount(video.comments)}
          onClick={() => onComment(video.id)}
        />

        {/* Share */}
        <HudButton
          icon={<Send className="w-6 h-6" />}
          label={formatCount(video.shares)}
          onClick={() => onShare(video)}
        />

        {/* Views (display only) */}
        <HudButton
          icon={<Eye className="w-6 h-6 opacity-75" />}
          label={formatCount(video.views)}
          onClick={() => {}}
        />

        {/* Message player */}
        <HudButton
          icon={<MessageSquare className="w-6 h-6" />}
          label="رسالة"
          activeColor="text-blue-400"
          activeBg="bg-blue-500/20"
          onClick={() => onMessage(video)}
        />
      </div>

      {/* ── Bottom-left info ───────────────────────────── */}
      <div
        className="absolute left-0 z-40 text-white flex flex-col gap-2 pointer-events-none"
        style={{ bottom: bottomOffset, right: '72px', paddingInlineStart: '16px' }}
      >
        {/* Name + position */}
        <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
          <h3
            onClick={(e) => { e.stopPropagation(); onProfileClick(video.playerId); }}
            className="text-base font-black cursor-pointer drop-shadow-md leading-tight"
          >
            @{video.playerName}
          </h3>
          {video.playerPosition && (
            <span className="text-[10px] bg-blue-500/80 backdrop-blur-sm px-2 py-0.5 rounded-md font-bold border border-blue-400/30">
              {video.playerPosition}
            </span>
          )}
        </div>

        {/* Description */}
        {video.description && (
          <p className="text-sm font-medium line-clamp-2 opacity-85 leading-relaxed drop-shadow">
            {video.description}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[11px] text-white/55">
          <span className="flex items-center gap-1">
            <Music className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[120px]">{video.music}</span>
          </span>
          {video.createdAt && (
            <span className="flex items-center gap-1 shrink-0">
              <Calendar className="w-3 h-3" />
              {dayjs(video.createdAt).locale('ar').fromNow()}
            </span>
          )}
        </div>
      </div>

      {/* Play/Pause indicator */}
      <AnimatePresence>
        {!playing && isActive && (
          <motion.div
            key="pause-icon"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <div className="w-16 h-16 bg-black/50 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/20 shadow-xl">
              <Play className="w-7 h-7 fill-current ml-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
VideoSlide.displayName = 'VideoSlide';

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onBack }: { onBack: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-6 gap-6">
      <Film className="w-20 h-20 opacity-20" />
      <div>
        <h2 className="text-2xl font-black mb-2">لا توجد فيديوهات</h2>
        <p className="text-white/50 text-sm">لم يرفع اللاعبون فيديوهات بعد</p>
      </div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 rounded-full font-bold active:scale-95 transition-transform"
      >
        <ArrowRight className="w-4 h-4" />
        العودة
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PlayerVideosPage({ accountType }: PlayerVideosPageProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({ name: '', position: '', ageMin: '', ageMax: '', country: '', phone: '' });
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'following'>('all');
  const [likedVideos, setLikedVideos] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [messageTarget, setMessageTarget] = useState<Video | null>(null);

  // Track videos viewed in this session to avoid duplicate view counts
  const viewedRef = useRef<Set<string>>(new Set());
  // Track profile views in this session
  const profileViewedRef = useRef<Set<string>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const { user, userData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchVideos();
    if (user) loadUserPreferences();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Scroll-snap index tracking ──
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    if (idx !== currentIndex) {
      setCurrentIndex(idx);
      setPlaying(true);
    }
  }, [currentIndex]);

  // ── Fetch ──
  const fetchVideos = async () => {
    try {
      setLoading(true);
      const { data: playersData } = await supabase.from('players').select('*').eq('isDeleted', false);
      const all: Video[] = [];
      for (const d of (playersData || [])) {
        (d.videos || []).forEach((v: any, idx: number) => {
          if (!v.url) return;
          const videoUrl = resolveVideoUrl(v.url);
          if (!videoUrl) return;
          let createdAt = v.createdAt || v.updated_at || null;
          if (createdAt && typeof createdAt === 'object' && createdAt.toDate) createdAt = createdAt.toDate();
          const age = d.age || calcAge(d.birth_date);
          all.push({
            id: `${d.id}_${idx}`,
            url: videoUrl,
            playerName: d.full_name || d.name || 'لاعب',
            playerImage: getPlayerAvatarUrl(d) || '/default-player-avatar.png',
            playerPosition: d.primary_position || '',
            description: v.description || v.desc || '',
            likes: v.likes || 0,
            comments: Array.isArray(v.comments) ? v.comments.length : (v.commentsCount || v.comments || 0),
            shares: v.shares || 0,
            views: v.views || 0,
            music: v.music || 'Original Sound',
            playerId: d.id,
            createdAt,
            country: d.country || d.nationality || '',
            nationality: d.nationality || d.country || '',
            age,
            phone: d.phone || d.whatsapp || '',
          });
        });
      }
      // Shuffle
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
      setVideos(all);
    } catch (err) {
      console.error('fetchVideos error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPreferences = async () => {
    if (!user) return;
    try {
      const table = COLLECTION_MAP[accountType] || 'players';
      const { data: prefData } = await supabase.from(table).select('likedVideos,following').eq('id', user.id).maybeSingle();
      if (prefData) {
        setLikedVideos(prefData.likedVideos || []);
        setFollowing(prefData.following || []);
      }
    } catch {}
  };

  // Dynamic positions fetched directly from DB (all players, not just those with videos)
  const [uniquePositions, setUniquePositions] = useState<string[]>([]);

  // Dynamic countries fetched directly from DB (all players, not just those with videos)
  const [uniqueCountries, setUniqueCountries] = useState<string[]>([]);

  useEffect(() => {
    supabase.from('players').select('country,nationality,primary_position,position').then(({ data }) => {
      const countries = new Set<string>();
      const positions = new Set<string>();
      (data || []).forEach(d => {
        const c = d.country || d.nationality;
        if (c && typeof c === 'string' && c.trim()) countries.add(c.trim());
        const p = d.primary_position || d.position;
        if (p && typeof p === 'string' && p.trim()) positions.add(p.trim());
      });
      setUniqueCountries(Array.from(countries).sort());
      setUniquePositions(Array.from(positions).sort());
    }); // catch removed;
  }, []);

  const filteredVideos = useMemo(() => {
    let f = videos;
    const { name, position, ageMin, ageMax, country, phone } = filters;

    if (name) {
      const q = name.toLowerCase();
      f = f.filter(v => v.playerName.toLowerCase().includes(q) || v.description.toLowerCase().includes(q));
    }
    if (position) f = f.filter(v => v.playerPosition === position);
    if (ageMin) f = f.filter(v => v.age !== undefined && v.age >= parseInt(ageMin));
    if (ageMax) f = f.filter(v => v.age !== undefined && v.age <= parseInt(ageMax));
    if (country) {
      const cq = country.toLowerCase();
      f = f.filter(v => (v.country || v.nationality || '').toLowerCase().includes(cq));
    }
    if (phone) f = f.filter(v => (v.phone || '').replace(/\D/g, '').includes(phone.replace(/\D/g, '')));
    if (filterType === 'following') f = f.filter(v => following.includes(v.playerId));
    return f;
  }, [videos, filters, filterType, following]);

  // Keep active filters count updated
  useEffect(() => {
    const { name, position, ageMin, ageMax, country, phone } = filters;
    setActiveFiltersCount([name, position, ageMin, ageMax, country, phone].filter(Boolean).length);
  }, [filters]);

  const handleLike = useCallback(async (id: string) => {
    if (!user) return;
    const liked = likedVideos.includes(id);
    const next = liked ? likedVideos.filter(x => x !== id) : [...likedVideos, id];
    setLikedVideos(next);
    setVideos(prev => prev.map(v => v.id === id ? { ...v, likes: Math.max(0, v.likes + (liked ? -1 : 1)) } : v));
    try {
      const [pid, idxStr] = id.split('_');
      const { data: pData } = await supabase.from('players').select('videos').eq('id', pid).maybeSingle();
      if (pData) {
        const vids = [...(pData.videos || [])];
        const i = parseInt(idxStr);
        if (vids[i]) {
          vids[i] = { ...vids[i], likes: Math.max(0, (vids[i].likes || 0) + (liked ? -1 : 1)) };
          await supabase.from('players').update({ videos: vids }).eq('id', pid);
        }
      }
      const table = COLLECTION_MAP[accountType] || 'players';
      await supabase.from(table).update({ likedVideos: next }).eq('id', user.id);
      // Dispatch video_like notification only when adding a like
      if (!liked && user.id !== pid) {
        const viewerName = userData?.full_name || userData?.name || user.user_metadata?.full_name || 'مستخدم';
        dispatchNotification({
          eventType: 'video_like',
          targetUserId: pid,
          actorId: user.id,
          actorName: viewerName,
          actorAccountType: accountType,
          metadata: { videoId: id },
        });
      }
    } catch {}
  }, [user, likedVideos, accountType, userData]);

  const handleFollow = useCallback(async (pid: string) => {
    if (!user) return;
    const isF = following.includes(pid);
    const next = isF ? following.filter(x => x !== pid) : [...following, pid];
    setFollowing(next);
    try {
      const table = COLLECTION_MAP[accountType] || 'players';
      await supabase.from(table).update({ following: next }).eq('id', user.id);
      // Dispatch follow notification only when following (not unfollowing)
      if (!isF && user.id !== pid) {
        const viewerName = userData?.full_name || userData?.name || user.user_metadata?.full_name || 'مستخدم';
        dispatchNotification({
          eventType: 'follow',
          targetUserId: pid,
          actorId: user.id,
          actorName: viewerName,
          actorAccountType: accountType,
        });
      }
    } catch {}
  }, [user, following, accountType, userData]);

  const handleShare = useCallback((v: Video) => {
    const url = `${window.location.origin}/videos/${v.id}`;
    setVideos(prev => prev.map(vid => vid.id === v.id ? { ...vid, shares: vid.shares + 1 } : vid));
    if (navigator.share) navigator.share({ title: v.playerName, url });
    else navigator.clipboard.writeText(url).then(() => {});
    // Persist share count + dispatch notification
    try {
      const [pid, idxStr] = v.id.split('_');
      supabase.from('players').select('videos').eq('id', pid).maybeSingle().then(({ data: pData }) => {
        if (!pData) return;
        const vids = [...(pData.videos || [])];
        const i = parseInt(idxStr);
        if (vids[i]) {
          vids[i] = { ...vids[i], shares: (vids[i].shares || 0) + 1 };
          supabase.from('players').update({ videos: vids }).eq('id', pid);
        }
      });
      if (user && user.id !== pid) {
        const viewerName = userData?.full_name || userData?.name || user.user_metadata?.full_name || 'مستخدم';
        dispatchNotification({
          eventType: 'video_share',
          targetUserId: pid,
          actorId: user.id,
          actorName: viewerName,
          actorAccountType: accountType,
          metadata: { videoId: v.id },
        });
      }
    } catch {}
  }, [user, userData, accountType]);

  const handleView = useCallback(async (id: string) => {
    if (viewedRef.current.has(id)) return;
    viewedRef.current.add(id);
    setVideos(prev => prev.map(v => v.id === id ? { ...v, views: v.views + 1 } : v));
    try {
      const [pid, idxStr] = id.split('_');
      const { data: pData } = await supabase.from('players').select('videos').eq('id', pid).maybeSingle();
      if (pData) {
        const vids = [...(pData.videos || [])];
        const i = parseInt(idxStr);
        if (vids[i]) {
          vids[i] = { ...vids[i], views: (vids[i].views || 0) + 1 };
          await supabase.from('players').update({ videos: vids }).eq('id', pid);
        }
      }
      // Send video view notification (only if viewer ≠ owner)
      if (user && user.id !== pid) {
        const viewerName = userData?.full_name || userData?.name || user.user_metadata?.full_name || 'مستخدم';
        dispatchNotification({
          eventType: 'video_view',
          targetUserId: pid,
          actorId: user.id,
          actorName: viewerName,
          actorAccountType: accountType,
          metadata: { videoId: id },
        });
      }
    } catch {}
  }, [user, userData, accountType]);

  const handleProfileClick = useCallback((playerId: string) => {
    if (user && user.id !== playerId && !profileViewedRef.current.has(playerId)) {
      profileViewedRef.current.add(playerId);
      const viewerName = userData?.full_name || userData?.name || user.user_metadata?.full_name || 'مستخدم';
      dispatchNotification({
        eventType: 'profile_view',
        targetUserId: playerId,
        actorId: user.id,
        actorName: viewerName,
        actorAccountType: accountType,
      });
    }
    safeNavigate(router, `/dashboard/shared/player-profile/${playerId}`);
  }, [user, userData, accountType, router]);

  const handleMessage = useCallback((v: Video) => {
    setMessageTarget(v);
  }, []);

  const handleComment = useCallback((id: string) => setSelectedVideoId(id), []);
  const handleTogglePlay = useCallback(() => setPlaying(p => !p), []);
  const handleToggleMute = useCallback(() => setMuted(m => !m), []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white gap-4" style={{ zIndex: 60 }}>
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-white/10" />
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
        <p className="text-sm font-bold opacity-50 tracking-wide">جاري تحميل الفيديوهات</p>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black"
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif", zIndex: 60 }}
      dir="rtl"
    >
      {/* Ambient aura background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {filteredVideos[currentIndex] && (
          <div
            className="absolute inset-0 bg-cover bg-center blur-[100px] brightness-[0.2] saturate-200 opacity-60 transition-[background-image] duration-1000"
            style={{ backgroundImage: `url(${getYoutubeThumbnail(filteredVideos[currentIndex].url) || filteredVideos[currentIndex].playerImage})` }}
          />
        )}
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* ── Video column ── */}
      <div
        className="absolute inset-0 mx-auto w-full max-w-[500px]"
        style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* ── Scroll-snap feed ── */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="cinema-scroll absolute inset-0 overflow-y-scroll"
          style={{
            scrollSnapType: 'y mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          } as React.CSSProperties}
        >
          {filteredVideos.length > 0 ? filteredVideos.map((video, index) => (
            <div
              key={video.id}
              className="relative"
              style={{ height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
            >
              <VideoSlide
                video={video}
                isActive={index === currentIndex}
                isNear={Math.abs(index - currentIndex) <= 1}
                muted={muted}
                playing={playing}
                onTogglePlay={handleTogglePlay}
                onLike={handleLike}
                onComment={handleComment}
                onShare={handleShare}
                onFollow={handleFollow}
                onView={handleView}
                onMessage={handleMessage}
                onProfileClick={handleProfileClick}
                isLiked={likedVideos.includes(video.id)}
                isFollowing={following.includes(video.playerId)}
                router={router}
              />
            </div>
          )) : (
            <EmptyState onBack={() => router.back()} />
          )}
        </div>

        {/* ── Top HUD ── */}
        <div
          className="absolute top-0 inset-x-0 z-50 px-3 flex items-center justify-between gap-2 pointer-events-auto"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
            paddingBottom: '12px',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
          }}
        >
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white active:scale-90 transition-transform"
          >
            <ArrowRight className="w-5 h-5" />
          </button>

          <div className="flex bg-black/50 backdrop-blur-xl border border-white/10 rounded-full p-1">
            {(['all', 'following'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-5 py-1.5 rounded-full text-sm font-black transition-all duration-200
                  ${filterType === type ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white/80'}`}
              >
                {type === 'all' ? 'لك' : 'متابعة'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(s => !s)}
              className="relative p-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white active:scale-90 transition-transform"
            >
              <SlidersHorizontal className="w-5 h-5" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-[9px] font-black text-white flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            <button
              onClick={handleToggleMute}
              className="p-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white active:scale-90 transition-transform"
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Video counter pill */}
        {filteredVideos.length > 0 && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <span className="text-white/35 text-xs font-bold tabular-nums">
              {currentIndex + 1} / {filteredVideos.length}
            </span>
          </div>
        )}

        {/* ── Filter panel ─────────────────────────────── */}
        <AnimatePresence>
          {showSearch && (
            <>
              {/* Backdrop — click anywhere to close */}
              <div
                className="absolute inset-0 z-40"
                onClick={() => setShowSearch(false)}
              />
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="absolute top-[60px] inset-x-2 z-50"
              style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif", maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}
            >
              <div className="rounded-2xl p-3 shadow-2xl space-y-3" style={{ background: 'rgba(18,18,20,0.98)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)' }}>

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    <Filter className="w-3.5 h-3.5" style={{ color: '#34d399' }} />
                    فلترة اللاعبين
                    {activeFiltersCount > 0 && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: '#10b981', color: '#fff' }}>
                        {activeFiltersCount} فلتر
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={() => setFilters({ name: '', position: '', ageMin: '', ageMax: '', country: '', phone: '' })}
                        className="text-[10px] font-bold"
                        style={{ color: '#f87171' }}
                      >
                        مسح الكل
                      </button>
                    )}
                    <button onClick={() => setShowSearch(false)} style={{ color: 'rgba(255,255,255,0.5)' }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Name search */}
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 w-3.5 h-3.5 pointer-events-none" style={{ color: 'rgba(255,255,255,0.35)' }} />
                  <input
                    type="text"
                    placeholder="اسم اللاعب أو وصف الفيديو..."
                    value={filters.name}
                    onChange={e => setFilters(p => ({ ...p, name: e.target.value }))}
                    autoFocus
                    className="w-full rounded-xl py-2 pr-9 pl-3 text-xs outline-none transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      caretColor: '#34d399',
                      fontFamily: "'Cairo', 'Tajawal', sans-serif",
                    }}
                  />
                </div>

                {/* Position + Country */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-bold mb-1 pr-1" style={{ color: 'rgba(255,255,255,0.45)' }}>المركز</p>
                    <select
                      value={filters.position}
                      onChange={e => setFilters(p => ({ ...p, position: e.target.value }))}
                      className="w-full rounded-xl py-2 pr-3 pl-2 text-xs outline-none appearance-none cursor-pointer"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontFamily: "'Cairo', 'Tajawal', sans-serif",
                      }}
                    >
                      <option value="" style={{ background: '#18181b', color: '#fff' }}>كل المراكز</option>
                      {uniquePositions.map(p => (
                        <option key={p} value={p} style={{ background: '#18181b', color: '#fff' }}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold mb-1 pr-1" style={{ color: 'rgba(255,255,255,0.45)' }}>الدولة</p>
                    <select
                      value={filters.country}
                      onChange={e => setFilters(p => ({ ...p, country: e.target.value }))}
                      className="w-full rounded-xl py-2 pr-3 pl-2 text-xs outline-none appearance-none cursor-pointer"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontFamily: "'Cairo', 'Tajawal', sans-serif",
                      }}
                    >
                      <option value="" style={{ background: '#18181b', color: '#fff' }}>كل الدول</option>
                      {uniqueCountries.map(c => (
                        <option key={c} value={c} style={{ background: '#18181b', color: '#fff' }}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Age range */}
                <div>
                  <p className="text-[10px] font-bold mb-1 pr-1" style={{ color: 'rgba(255,255,255,0.45)' }}>السن</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="من"
                      min={5} max={50}
                      value={filters.ageMin}
                      onChange={e => setFilters(p => ({ ...p, ageMin: e.target.value }))}
                      className="w-full rounded-xl py-2 px-3 text-xs outline-none text-center"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        caretColor: '#34d399',
                        fontFamily: "'Cairo', 'Tajawal', sans-serif",
                      }}
                    />
                    <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>
                    <input
                      type="number"
                      placeholder="إلى"
                      min={5} max={50}
                      value={filters.ageMax}
                      onChange={e => setFilters(p => ({ ...p, ageMax: e.target.value }))}
                      className="w-full rounded-xl py-2 px-3 text-xs outline-none text-center"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        caretColor: '#34d399',
                        fontFamily: "'Cairo', 'Tajawal', sans-serif",
                      }}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <p className="text-[10px] font-bold mb-1 pr-1" style={{ color: 'rgba(255,255,255,0.45)' }}>رقم الهاتف</p>
                  <input
                    type="tel"
                    placeholder="ابحث برقم الهاتف..."
                    value={filters.phone}
                    onChange={e => setFilters(p => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-xl py-2 px-3 text-xs outline-none font-mono"
                    dir="ltr"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      caretColor: '#34d399',
                    }}
                  />
                </div>

                {/* Result count */}
                <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {filteredVideos.length} فيديو من {videos.length}
                  </span>
                  <button
                    onClick={() => setShowSearch(false)}
                    className="text-[10px] font-black"
                    style={{ color: '#34d399' }}
                  >
                    عرض النتائج ←
                  </button>
                </div>
              </div>
            </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Swipe hint */}
        {filteredVideos.length > 1 && currentIndex === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ delay: 2, duration: 2.5, times: [0, 0.2, 0.7, 1] }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center gap-1"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: 2, duration: 0.8, delay: 2 }}
              className="w-8 h-8 rounded-full border-2 border-white/40 flex items-center justify-center"
            >
              <span className="text-white/60 text-lg">↑</span>
            </motion.div>
            <span className="text-white/50 text-xs font-bold">اسحب للأعلى</span>
          </motion.div>
        )}
      </div>

      {/* Comments panel */}
      <AnimatePresence>
        {selectedVideoId && (
          <div className="absolute inset-0 z-[100] flex justify-center pointer-events-none">
            <div className="w-full max-w-[500px] h-full relative pointer-events-auto">
              <Comments
                videoId={selectedVideoId}
                isOpen={true}
                onClose={(newCount?: number) => {
                  if (newCount !== undefined && selectedVideoId) {
                    setVideos(prev => prev.map(v => v.id === selectedVideoId ? { ...v, comments: newCount } : v));
                  }
                  setSelectedVideoId(null);
                }}
                inline={true}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Message composer */}
      {messageTarget && (
        <div className="absolute inset-0 z-[110] flex justify-center pointer-events-none">
          <div className="w-full max-w-[500px] h-full relative pointer-events-auto">
            <MessageComposerSheet
              playerId={messageTarget.playerId}
              playerName={messageTarget.playerName}
              playerImage={messageTarget.playerImage}
              playerPosition={messageTarget.playerPosition}
              isOpen={!!messageTarget}
              onClose={() => setMessageTarget(null)}
              senderAccountType={accountType}
            />
          </div>
        </div>
      )}
    </div>
  );
}
