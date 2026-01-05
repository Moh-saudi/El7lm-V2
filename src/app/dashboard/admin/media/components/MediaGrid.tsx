import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Eye, Heart, Calendar, Building, Phone, MessageSquare, MoreVertical, ShieldCheck, AlertCircle } from "lucide-react";
import { Media } from '../types';

interface MediaGridProps {
    items: Media[];
    loading: boolean;
    tab: 'videos' | 'images';
    onPreview: (media: Media) => void;
}

export const MediaGrid: React.FC<MediaGridProps> = ({ items, loading, tab, onPreview }) => {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 py-10">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="aspect-video bg-slate-100 animate-pulse rounded-xl" />
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="py-24 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <Play className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">لا توجد محتويات</h3>
                <p className="text-slate-500 text-sm mt-1">لم يتم العثور على أي وسائط تطابق معايير البحث.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
            {items.map((media) => (
                <Card
                    key={media.id}
                    className="group overflow-hidden border border-slate-200 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                >
                    {/* Media Thumbnail */}
                    <div
                        className="relative aspect-video bg-slate-900 cursor-pointer overflow-hidden"
                        onClick={() => onPreview(media)}
                    >
                        {tab === 'videos' ? (
                            media.thumbnailUrl ? (
                                <img
                                    src={media.thumbnailUrl}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    alt={media.title}
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                                    <Play className="w-12 h-12 text-white/50 group-hover:text-white transition-colors" />
                                </div>
                            )
                        ) : (
                            <img
                                src={media.url}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                alt={media.title}
                            />
                        )}

                        {/* Status Badge */}
                        <div className="absolute top-3 right-3 z-10">
                            <Badge className={`
                px-2 py-1 rounded-md border-none text-[10px] font-bold shadow-sm backdrop-blur-md
                ${media.status === 'pending' ? 'bg-amber-500/90 text-white' : ''}
                ${media.status === 'approved' ? 'bg-emerald-500/90 text-white' : ''}
                ${media.status === 'rejected' ? 'bg-rose-500/90 text-white' : ''}
                ${media.status === 'flagged' ? 'bg-orange-500/90 text-white' : ''}
              `}>
                                {media.status === 'pending' ? 'مراجعة' :
                                    media.status === 'approved' ? 'معتمد' :
                                        media.status === 'flagged' ? 'تنبيه' : 'مرفوض'}
                            </Badge>
                        </div>

                        {/* AI Status Indicator (Placeholder for future) */}
                        <div className="absolute bottom-3 right-3">
                            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-white border border-white/10">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                                AI Ready
                            </div>
                        </div>

                        {/* Hosting Source */}
                        <div className="absolute bottom-3 left-3">
                            <Badge variant="outline" className="bg-black/50 backdrop-blur-sm text-white border-white/20 text-[9px]">
                                {(media.sourceType === 'r2' || (media.url && (media.url.includes('r2.dev') || media.url.includes('el7lm.com')))) ? 'CDN' : 'Firebase'}
                            </Badge>
                        </div>
                    </div>

                    <CardContent className="p-4 space-y-3">
                        {/* Title & Category */}
                        <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-blue-600 uppercase mb-0.5">{media.category || 'عام'}</p>
                                <h3 className="text-sm font-semibold text-slate-900 truncate" title={media.title}>{media.title}</h3>
                            </div>
                        </div>

                        {/* User Info */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                {media.userName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-900 truncate">{media.userName}</p>
                                <p className="text-[10px] text-slate-500 truncate">{media.accountType} {media.country ? `• ${media.country}` : ''}</p>
                            </div>
                        </div>

                        {/* Footer Stats */}
                        <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-3 text-slate-400">
                                <div className="flex items-center gap-1 text-[10px]">
                                    <Eye className="w-3 h-3" /> {media.views}
                                </div>
                                <div className="flex items-center gap-1 text-[10px]">
                                    <Heart className="w-3 h-3" /> {media.likes}
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400">
                                {new Date(media.uploadDate?.toDate?.() || media.uploadDate).toLocaleDateString('ar-EG')}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
