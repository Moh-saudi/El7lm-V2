'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { MediaItem, detectMediaSource } from '../types';
import {
    Play, Pause, FastForward, Rewind, ZoomIn,
    Volume2, VolumeX, Film, PlaySquare,
    Globe, ExternalLink, Music2, AlertTriangle
} from 'lucide-react';
import { formatTime } from './studio-utils';

interface Props {
    item: MediaItem;
}

export function VideoPlayer({ item }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [isMuted, setIsMuted] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [loadError, setLoadError] = useState<string | null>(null);

    const detectedSource = useMemo(() => detectMediaSource(item), [item]);

    // تأمين تشغيل مقاطع التخزين السحابي عبر البروكسي الداخلي لمنع قيود الـ CORS
    const videoStreamUrl = useMemo(() => {
        if (!item.url) return '';
        if (
            detectedSource === 'direct' ||
            item.url.includes('r2.dev') ||
            item.url.includes('assets.el7lm.com') ||
            item.url.includes('cloudflarestorage.com')
        ) {
            return `/api/media/proxy-video?url=${encodeURIComponent(item.url)}`;
        }
        return item.url;
    }, [item.url, detectedSource]);

    // Reset state on item change
    useEffect(() => {
        setIsPlaying(false);
        setCurrentTime(0);
        setPlaybackRate(1.0);
        setZoomLevel(1);
        setLoadError(null);
    }, [item]);

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleSeek = (time: number) => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
        setCurrentTime(videoRef.current.currentTime);
    };

    const handleStepFrame = (frames: number) => {
        if (!videoRef.current) return;
        videoRef.current.pause();
        setIsPlaying(false);
        videoRef.current.currentTime += frames * (1 / 30);
    };

    const handleSpeedChange = (rate: number) => {
        setPlaybackRate(rate);
        if (videoRef.current) videoRef.current.playbackRate = rate;
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const toggleZoom = () => {
        setZoomLevel(prev => (prev === 1 ? 1.5 : prev === 1.5 ? 2.0 : 1));
    };

    // Keyboard shortcuts (Space for play/pause)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="flex flex-col min-h-0 bg-slate-950 relative h-full">
            {/* Video Viewport (Black letterboxed canvas for video aspect ratio) */}
            <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden group select-none">
                {item.type === 'video' ? (
                    (() => {
                        if (detectedSource === 'direct') {
                            if (loadError) {
                                return (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-white gap-3 select-text">
                                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                            <AlertTriangle className="w-8 h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-bold text-base text-slate-100">تعذر تشغيل هذا المقطع</p>
                                            <p className="text-xs text-slate-400 max-w-md">{loadError}</p>
                                        </div>
                                        <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-400 max-w-lg break-all">
                                            {item.url}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                                    <video
                                        ref={videoRef}
                                        src={videoStreamUrl}
                                        playsInline
                                        preload="auto"
                                        onClick={togglePlay}
                                        onError={() => {
                                            setLoadError('الملف غير موجود على السيرفر السحابي (404 Not Found). قد يكون الرفع قد انقطع أثناء إرسال الفيديو من الموبايل، أو تم حذف الملف مسبقاً.');
                                        }}
                                        onTimeUpdate={() => {
                                             if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                                        }}
                                        onLoadedMetadata={() => {
                                             if (videoRef.current) setDuration(videoRef.current.duration);
                                        }}
                                        onEnded={() => setIsPlaying(false)}
                                        style={{
                                            transform: `scale(${zoomLevel})`,
                                            transformOrigin: 'center center',
                                            transition: 'transform 0.2s ease-out'
                                        }}
                                        className="w-full h-full object-contain cursor-pointer"
                                    />
                                    {!isPlaying && (
                                        <div onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer">
                                            <div className="w-16 h-16 rounded-full bg-emerald-600/90 text-white flex items-center justify-center shadow-xl shadow-emerald-600/30 hover:scale-105 transition-all">
                                                <Play className="w-8 h-8 fill-white ml-1" />
                                            </div>
                                        </div>
                                    )}
                                    {zoomLevel > 1 && (
                                        <div className="absolute top-3 left-3 bg-white/95 border border-slate-300 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md pointer-events-none">
                                            تكبير {zoomLevel}x
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        if (detectedSource === 'youtube') {
                            const ytMatch = item.url.match(/(?:youtu\.be\/|watch\?v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
                            const ytId = ytMatch ? ytMatch[1] : null;
                            return ytId ? (
                                <iframe
                                    src={`https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0&modestbranding=1`}
                                    className="w-full h-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center bg-white text-slate-900">
                                    <PlaySquare className="w-12 h-12 text-red-600" />
                                    <a href={item.url} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline text-sm font-bold">
                                        فتح الفيديو في منصة YouTube ↗
                                    </a>
                                </div>
                            );
                        }

                        if (detectedSource === 'tiktok') {
                            return (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 text-center bg-slate-900 text-white relative overflow-hidden">
                                    {item.thumbnailUrl && (
                                        <div
                                            className="absolute inset-0 bg-cover bg-center opacity-25 blur-sm scale-105"
                                            style={{ backgroundImage: `url(${item.thumbnailUrl})` }}
                                        />
                                    )}
                                    <div className="relative z-10 flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 rounded-2xl bg-black/70 border border-slate-700 flex items-center justify-center shadow-lg">
                                            <Music2 className="w-8 h-8 text-cyan-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-bold text-base text-white">فيديو منصة TikTok</p>
                                            <p className="text-slate-400 text-xs max-w-sm truncate">{item.title}</p>
                                        </div>
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-pink-500 hover:opacity-90 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg transition-all"
                                        >
                                            مشاهدة الفيديو على TikTok <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center bg-white text-slate-900">
                                <Globe className="w-12 h-12 text-sky-600" />
                                <p className="text-slate-700 text-sm font-semibold">فيديو عبر رابط خارجي</p>
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs"
                                >
                                    مشاهدة الرابط الأصلي <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        );
                    })()
                ) : (
                    <div className="w-full h-full flex items-center justify-center p-4">
                        <img
                            src={item.url}
                            alt={item.title}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                        />
                    </div>
                )}
            </div>

            {/* HUD Controls (Daylight theme) */}
            {item.type === 'video' && detectedSource === 'direct' && (
                <div className="bg-white border-t border-slate-200 p-3 space-y-2 flex-shrink-0">
                    {/* Timeline Scrubber */}
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600 font-bold">
                        <span className="w-10 text-left">{formatTime(currentTime)}</span>
                        <input
                            type="range"
                            min="0"
                            max={duration || 100}
                            step="0.1"
                            value={currentTime}
                            onChange={e => handleSeek(parseFloat(e.target.value))}
                            className="flex-1 h-1.5 accent-emerald-600 bg-slate-200 rounded-lg cursor-pointer"
                        />
                        <span className="w-10 text-right">{formatTime(duration)}</span>
                    </div>

                    {/* HUD Buttons */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        {/* Playback & Seek */}
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="ghost" size="sm"
                                onClick={togglePlay}
                                className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg gap-1.5 cursor-pointer shadow-xs"
                            >
                                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                                <span className="text-xs">{isPlaying ? 'إيقاف' : 'تشغيل'}</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleSeek(currentTime - 5)} className="w-8 h-8 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer border border-slate-200" title="رجوع 5 ثوانٍ">
                                <Rewind className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleSeek(currentTime + 5)} className="w-8 h-8 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer border border-slate-200" title="تقديم 5 ثوانٍ">
                                <FastForward className="w-3.5 h-3.5" />
                            </Button>
                            {/* Frame Stepper */}
                            <div className="hidden sm:flex items-center border border-slate-300 rounded-lg overflow-hidden ml-1 bg-white">
                                <button onClick={() => handleStepFrame(-1)} className="px-2 py-1 text-[10px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer" title="إطار للخلف">
                                    ◄ إطار
                                </button>
                                <button onClick={() => handleStepFrame(1)} className="px-2 py-1 text-[10px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border-r border-slate-300" title="إطار للأمام">
                                    إطار ►
                                </button>
                            </div>
                        </div>

                        {/* Speed & Zoom */}
                        <div className="flex items-center gap-1.5">
                            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px]">
                                {[0.25, 0.5, 1.0, 1.5].map(rate => (
                                    <button
                                        key={rate}
                                        onClick={() => handleSpeedChange(rate)}
                                        className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                                            playbackRate === rate ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        {rate === 1.0 ? '1x' : `${rate}x`}
                                    </button>
                                ))}
                            </div>
                            <Button
                                variant="ghost" size="sm"
                                onClick={toggleZoom}
                                className={`h-7 px-2 text-[10px] font-bold rounded-lg border border-slate-300 bg-white cursor-pointer ${
                                    zoomLevel > 1 ? 'bg-amber-100 text-amber-900 border-amber-300 font-black' : 'text-slate-700 hover:bg-slate-100'
                                }`}
                                title="تكبير اللقطة"
                            >
                                <ZoomIn className="w-3 h-3 ml-1" />
                                <span>{zoomLevel}x</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={toggleMute} className="w-7 h-7 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer">
                                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-600" /> : <Volume2 className="w-3.5 h-3.5" />}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Metadata Ribbon (Daylight) */}
            <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 flex-shrink-0">
                <div className="flex items-center gap-2 truncate">
                    <Film className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="font-bold text-slate-900 truncate">{item.title}</span>
                    <span className="text-[10px] text-slate-500">• {item.category || 'فيديو مهارات'}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-600 flex-shrink-0">
                    {detectedSource === 'direct' && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                            ☁️ تشغيل سحابي مباشر
                        </span>
                    )}
                    {detectedSource === 'youtube' && (
                        <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded font-bold">
                            🔴 YouTube
                        </span>
                    )}
                    {detectedSource === 'tiktok' && (
                        <span className="bg-slate-100 text-slate-800 border border-slate-300 px-2 py-0.5 rounded font-bold">
                            🖤 TikTok
                        </span>
                    )}
                    {item.fileSize && item.fileSize > 0 && <span>{(item.fileSize / 1024 / 1024).toFixed(1)} MB</span>}
                    <span>{item.views} مشاهدة</span>
                </div>
            </div>
        </div>
    );
}
