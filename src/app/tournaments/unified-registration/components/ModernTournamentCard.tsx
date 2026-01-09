import React from 'react';
import { Tournament } from '@/types/tournament';
import { Trophy, Calendar, MapPin, Users, DollarSign, Clock, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { fixReceiptUrl } from '@/lib/utils/cloudflare-r2-utils';

// Helper for currency
const getCurrencySymbol = (currency: string = 'EGP') => {
    const symbols: Record<string, string> = { EGP: 'ج.م', USD: '$', SAR: 'ر.س', EUR: '€' };
    return symbols[currency] || currency;
};

// Formatting date
const formatDate = (date: any) => {
    if (!date) return 'غير محدد';
    try {
        return new Date(date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return 'غير محدد'; }
};

interface ModernTournamentCardProps {
    tournament: Tournament;
    isSelected: boolean;
    onSelect: (tournament: Tournament) => void;
}

export const ModernTournamentCard: React.FC<ModernTournamentCardProps> = ({ tournament, isSelected, onSelect }) => {
    // Casting to any to access dynamic props added in page.tsx
    const t = tournament as any;
    const isAvailable = t.canRegister;
    const statusColor = isAvailable ? 'bg-emerald-500' : 'bg-rose-500';
    const statusText = isAvailable ? 'متاح للتسجيل' : (!t.isWithinDeadline ? 'انتهى التسجيل' : !t.hasSpots ? 'العدد مكتمل' : 'غير متاح');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            className={cn(
                "relative group overflow-hidden rounded-2xl border transition-all duration-300 flex flex-col h-full",
                isSelected
                    ? "border-amber-500 shadow-xl ring-2 ring-amber-500/20 bg-amber-50/10"
                    : "border-gray-200 bg-white hover:border-amber-300 hover:shadow-lg"
            )}
        >
            {/* Image / Header Gradient */}
            <div className="h-48 relative overflow-hidden bg-gray-900 shrink-0">
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent z-10" />

                {tournament.logo ? (
                    <img
                        src={fixReceiptUrl(tournament.logo) || tournament.logo}
                        alt={tournament.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                        <Trophy className="w-16 h-16 text-gray-700" />
                    </div>
                )}

                {/* Overlay Content */}
                <div className="absolute top-4 right-4 left-4 z-20 flex justify-between items-start">
                    <Badge className={cn("text-white border-0 shadow-sm", statusColor)}>
                        {statusText}
                    </Badge>
                    {tournament.isPaid && (
                        <Badge variant="outline" className="bg-black/40 text-amber-400 border-amber-400/50 backdrop-blur-md">
                            بطولة مدفوعة
                        </Badge>
                    )}
                </div>

                <div className="absolute bottom-4 right-4 z-20 w-full pr-4 pl-4 text-white">
                    <h3 className="text-xl font-bold line-clamp-1 mb-1 group-hover:text-amber-400 transition-colors drop-shadow-md">
                        {tournament.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-200">
                        <MapPin className="w-3 h-3 text-amber-500" />
                        <span>{tournament.location || 'موقع غير محدد'}</span>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 flex flex-col flex-1">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 text-amber-500" />
                        <span>{formatDate(tournament.startDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                        <Users className="w-4 h-4 text-amber-500" />
                        <span>{t.currentParticipants} / {tournament.maxParticipants}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 col-span-2 pt-2 border-t border-dashed border-gray-100 mt-1">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="text-gray-500">رسوم الاشتراك:</span>
                        <span className={cn("font-bold text-lg", tournament.entryFee > 0 ? "text-gray-900" : "text-green-600")}>
                            {tournament.entryFee > 0 ? `${tournament.entryFee} ${getCurrencySymbol(tournament.currency)}` : 'مجــــاني'}
                        </span>
                    </div>
                </div>

                <div className="flex-1" /> {/* Spacer */}

                {/* Selection State / Button */}
                <div className="pt-2">
                    <Button
                        onClick={() => onSelect(tournament)}
                        disabled={!isAvailable && !isSelected}
                        className={cn(
                            "w-full rounded-xl h-12 text-base transition-all duration-300 font-bold shadow-sm",
                            isSelected
                                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200"
                                : isAvailable
                                    ? "bg-slate-900 hover:bg-slate-800 text-white hover:shadow-lg hover:shadow-slate-200"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                        )}
                    >
                        {isSelected ? (
                            <>
                                <CheckCircle className="w-5 h-5 mr-2" />
                                تم الاختيار
                            </>
                        ) : !isAvailable ? (
                            'التسجيل مغلق'
                        ) : (
                            <>
                                اختيار البطولة
                                <ArrowRight className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};
