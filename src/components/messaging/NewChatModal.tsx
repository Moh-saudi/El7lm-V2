'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, UserPlus, Users, Building2, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/lib/i18n';

interface SearchResult {
    id: string;
    name: string;
    avatar: string;
    type: 'user' | 'player' | 'club' | 'academy' | 'trainer' | 'agent';
    email: string;
    phone?: string;
}

interface NewChatModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onStartChat: (user: SearchResult) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
    isOpen,
    onOpenChange,
    onStartChat
}) => {
    const { user } = useAuth();
    const { t, locale, isRTL } = useTranslation();
    const [queryText, setQueryText] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setQueryText('');
            setResults([]);
            return;
        }

        if (!queryText.trim() || queryText.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        const delayDebounce = setTimeout(async () => {
            try {
                const normalized = queryText.trim().toLowerCase();
                const combinedResults: SearchResult[] = [];
                const distinctIds = new Set<string>();

                // Search in all tables
                const tablesToSearch = [
                    { name: 'users', type: 'user' as const },
                    { name: 'players', type: 'player' as const },
                    { name: 'clubs', type: 'club' as const },
                    { name: 'academies', type: 'academy' as const },
                    { name: 'trainers', type: 'trainer' as const },
                    { name: 'agents', type: 'agent' as const }
                ];

                for (const { name: tableName, type } of tablesToSearch) {
                    try {
                        const { data: rows } = await supabase
                            .from(tableName)
                            .select('*')
                            .limit(50);

                        for (const row of (rows || [])) {
                            if (row.id === user?.id) continue;

                            // Get name from different possible fields
                            const name = (
                                row.displayName ||
                                row.name ||
                                row.full_name ||
                                row.club_name ||
                                row.academy_name ||
                                row.trainer_name ||
                                row.agent_name ||
                                ''
                            ).toLowerCase();

                            const email = (row.email || '').toLowerCase();
                            const phone = row.phoneNumber || row.phone || '';

                            // Search in name, email, or phone
                            if (name.includes(normalized) || email.includes(normalized) || phone.includes(normalized)) {
                                if (!distinctIds.has(row.id)) {
                                    distinctIds.add(row.id);

                                    const cloudflarePublicUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || process.env.NEXT_PUBLIC_CDN_URL || '';
                                    let avatarUrl = '';

                                    // Try to get avatar based on account type
                                    if (type === 'player') {
                                        avatarUrl = `${cloudflarePublicUrl}/avatars/${row.id}.jpg`;
                                    } else if (type === 'club') {
                                        avatarUrl = `${cloudflarePublicUrl}/club-logos/${row.id}.jpg`;
                                    } else if (type === 'academy') {
                                        avatarUrl = `${cloudflarePublicUrl}/academy-logos/${row.id}.jpg`;
                                    } else {
                                        avatarUrl = `${cloudflarePublicUrl}/avatars/${row.id}.jpg`;
                                    }

                                    // Fallback to stored avatar if exists
                                    if (!avatarUrl && (row.photoURL || row.avatar || row.logo)) {
                                        avatarUrl = row.photoURL || row.avatar || row.logo || '';
                                    }

                                    combinedResults.push({
                                        id: row.id,
                                        name: row.displayName ||
                                            row.name ||
                                            row.full_name ||
                                            row.club_name ||
                                            row.academy_name ||
                                            row.trainer_name ||
                                            row.agent_name ||
                                            t('sharedComponents.newChat.defaultUser'),
                                        avatar: avatarUrl,
                                        type,
                                        email: row.email || '',
                                        phone: phone
                                    });
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`Error searching in ${tableName}:`, error);
                    }
                }

                // Sort by name
                combinedResults.sort((a, b) => a.name.localeCompare(b.name, locale));

                setResults(combinedResults);
                console.log('✅ Search results:', combinedResults.length, 'accounts found');
            } catch (error) {
                console.error('Search Error:', error);
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [queryText, isOpen, user, locale, t]);

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'player': return { label: t('sharedComponents.newChat.types.player'), icon: Users, color: 'bg-blue-100 text-blue-700' };
            case 'club': return { label: t('sharedComponents.newChat.types.club'), icon: Building2, color: 'bg-orange-100 text-orange-700' };
            case 'academy': return { label: t('sharedComponents.newChat.types.academy'), icon: Building2, color: 'bg-purple-100 text-purple-700' };
            case 'trainer': return { label: t('sharedComponents.newChat.types.trainer'), icon: Users, color: 'bg-green-100 text-green-700' };
            case 'agent': return { label: t('sharedComponents.newChat.types.agent'), icon: Users, color: 'bg-yellow-100 text-yellow-700' };
            default: return { label: t('sharedComponents.newChat.defaultUser'), icon: Users, color: 'bg-gray-100 text-gray-700' };
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
                {/* Beautiful Header */}
                <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 opacity-90" />
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

                    <div className="relative px-6 pt-6 pb-5">
                        <DialogHeader className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <Sparkles className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-bold text-white">
                                        {t('sharedComponents.newChat.title')}
                                    </DialogTitle>
                                    <DialogDescription className="text-white/80 text-sm">
                                        {t('sharedComponents.newChat.subtitle')}
                                    </DialogDescription>
                                </div>
                            </div>

                            {/* Search Input */}
                            <div className="relative">
                                <Search className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 ${isRTL ? 'right-4' : 'left-4'}`} />
                                <input
                                    type="text"
                                    placeholder={t('sharedComponents.newChat.placeholder')}
                                    value={queryText}
                                    onChange={(e) => setQueryText(e.target.value)}
                                    className="w-full h-12 pr-12 pl-4 rounded-xl bg-white/95 backdrop-blur-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg text-sm"
                                    autoFocus
                                />
                            </div>
                        </DialogHeader>
                    </div>
                </div>

                {/* Results Area */}
                <ScrollArea className="h-[450px]" dir={isRTL ? 'rtl' : 'ltr'}>
                    <div className="p-4">
                        {loading ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center gap-3 py-20"
                            >
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                <p className="text-sm text-gray-500 font-medium">{t('sharedComponents.newChat.searching')}</p>
                            </motion.div>
                        ) : results.length === 0 && queryText ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center gap-3 py-20"
                            >
                                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                                    <Search className="h-8 w-8 text-gray-400" />
                                </div>
                                <p className="text-sm text-gray-600 font-medium">{t('sharedComponents.newChat.noResults')}</p>
                                <p className="text-xs text-gray-400">{t('sharedComponents.newChat.tryDifferent')}</p>
                            </motion.div>
                        ) : results.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center gap-3 py-20"
                            >
                                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                                    <UserPlus className="h-8 w-8 text-blue-500" />
                                </div>
                                <p className="text-sm text-gray-600 font-medium">{t('sharedComponents.newChat.startSearch')}</p>
                                <p className="text-xs text-gray-400">{t('sharedComponents.newChat.searchScope')}</p>
                            </motion.div>
                        ) : (
                            <div className="space-y-2">
                                <AnimatePresence>
                                    {results.map((res, index) => {
                                        const typeInfo = getTypeLabel(res.type);
                                        const TypeIcon = typeInfo.icon;

                                        return (
                                            <motion.button
                                                key={res.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                onClick={() => {
                                                    onStartChat(res);
                                                    onOpenChange(false);
                                                }}
                                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-l hover:from-blue-50 active:from-blue-100 transition-all text-right group border border-transparent hover:border-blue-200 hover:shadow-md"
                                            >
                                                <Avatar className="h-12 w-12 flex-shrink-0 ring-2 ring-white shadow-sm group-hover:ring-blue-200 transition-all">
                                                    <AvatarImage src={res.avatar} />
                                                    <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                                                        {res.name?.[0]?.toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                                            {res.name}
                                                        </h3>
                                                        <Badge
                                                            variant="secondary"
                                                            className={`text-[11px] px-2 py-0.5 h-5 gap-1 ${typeInfo.color} hover:${typeInfo.color}`}
                                                        >
                                                            <TypeIcon className="h-3 w-3" />
                                                            {typeInfo.label}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {res.email || res.phone || t('sharedComponents.newChat.noEmail')}
                                                    </p>
                                                </div>

                                                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                                        <UserPlus className="h-4 w-4 text-white" />
                                                    </div>
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Footer Stats */}
                {results.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="px-5 py-3 border-t bg-gradient-to-r from-gray-50 to-blue-50/50"
                        dir={isRTL ? 'rtl' : 'ltr'}
                    >
                        <p className="text-xs text-gray-600 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            {t('sharedComponents.newChat.foundPrefix')} <span className="font-semibold text-blue-600">{results.length}</span> {t('sharedComponents.newChat.account')}
                        </p>
                    </motion.div>
                )}
            </DialogContent>
        </Dialog>
    );
};
