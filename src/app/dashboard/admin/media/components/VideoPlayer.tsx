'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { MediaItem, detectMediaSource } from '../types';
import {
    Play, Pause, FastForward, Rewind, ZoomIn,
    Volume2, VolumeX, Film, Cloud, PlaySquare,
    Music2, Globe, ExternalLink
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

    const detectedSource = useMemo(() => detectMediaSource(item), [item]);

    // Reset state on item change
    useEffect(() => {
        setIsPlaying(false);
        setCurrentTime(0);
        setPlaybackRate(1.0);
        setZoomLevel(1);
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
            {/* Video Viewport */}
            <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden group select-none">
                {item.type === 'video' ? (
                    (() => {
                        if (detectedSource === 'direct') {
                            return (
                                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                                    <video
                                        ref={videoRef}
                                        src={item.url}
                                        playsInline
                                        preload="auto"
                                        onClick={togglePlay}
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
                                        <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-700 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md pointer-events-none">
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
                                <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                                    <PlaySquare className="w-12 h-12 text-red-500" />
                                    <a href={item.url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline text-sm font-bold">
                                        فتح الفيديو في منصة YouTube ↗
                                    </a>
                                </div>
                            );
                        }

                        return (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                                <Globe className="w-12 h-12 text-sky-400" />
                                <p className="text-white/80 text-sm font-semibold">فيديو عبر رابط خارجي</p>
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow"
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

            {/* HUD Controls (only for direct stored videos) */}
            {item.type === 'video' && detectedSource === 'direct' && (
                <div className="bg-slate-900/95 border-t border-slate-800 p-3 space-y-2 flex-shrink-0">
                    {/* Timeline Scrubber */}
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                        <span className="w-10 text-left">{formatTime(currentTime)}</span>
                        <input
                            type="range"
                            min="0"
                            max={duration || 100}
                            step="0.1"
                            value={currentTime}
                            onChange={e => handleSeek(parseFloat(e.target.value))}
                            className="flex-1 h-1.5 accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer"
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
                                className="h-8 px-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg gap-1.5 cursor-pointer"
                            >
                                {isPlaying ? <Pause className="w-4 h-4 text-emerald-400" /> : <Play className="w-4 h-4 fill-emerald-400 text-emerald-400" />}
                                <span className="text-xs">{isPlaying ? 'إيقاف' : 'تشغيل'}</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleSeek(currentTime - 5)} className="w-8 h-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer" title="رجوع 5 ثوانٍ">
                                <Rewind className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleSeek(currentTime + 5)} className="w-8 h-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer" title="تقديم 5 ثوانٍ">
                                <FastForward className="w-3.5 h-3.5" />
                            </Button>
                            {/* Frame Stepper */}
                            <div className="hidden sm:flex items-center border border-slate-800 rounded-lg overflow-hidden ml-1">
                                <button onClick={() => handleStepFrame(-1)} className="px-2 py-1 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer" title="إطار للخلف">
                                    ◄ إطار
                                </button>
                                <button onClick={() => handleStepFrame(1)} className="px-2 py-1 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer border-r border-slate-800" title="إطار للأمام">
                                    إطار ►
                                </button>
                            </div>
                        </div>

                        {/* Speed & Zoom */}
                        <div className="flex items-center gap-1.5">
                            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                                {[0.25, 0.5, 1.0, 1.5].map(rate => (
                                    <button
                                        key={rate}
                                        onClick={() => handleSpeedChange(rate)}
                                        className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                                            playbackRate === rate ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        {rate === 1.0 ? '1x' : `${rate}x`}
                                    </button>
                                ))}
                            </div>
                            <Button
                                variant="ghost" size="sm"
                                onClick={toggleZoom}
                                className={`h-7 px-2 text-[10px] font-bold rounded-lg border border-slate-800 cursor-pointer ${
                                    zoomLevel > 1 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'text-slate-400 hover:text-white'
                                }`}
                                title="تكبير اللقطة"
                            >
                                <ZoomIn className="w-3 h-3 ml-1" />
                                <span>{zoomLevel}x</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={toggleMute} className="w-7 h-7 text-slate-400 hover:text-white rounded-lg cursor-pointer">
                                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Metadata Ribbon */}
            <div className="bg-slate-900 px-4 py-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
                <div className="flex items-center gap-2 truncate">
                    <Film className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="font-bold text-white truncate">{item.title}</span>
                    <span className="text-[10px] text-slate-400">• {item.category || 'فيديو مهارات'}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-shrink-0">
                    {detectedSource === 'direct' && (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                            ☁️ رفع سحابي (R2)
                        </span>
                    )}
                    {detectedSource === 'youtube' && (
                        <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded font-bold">
                            🔴 YouTube
                        </span>
                    )}
                    {detectedSource === 'tiktok' && (
                        <span className="bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded font-bold">
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
