import React, { useState } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, ExternalLink, Share2, QrCode, MessageCircle, Check, Link as LinkIcon, Globe, X } from 'lucide-react';
import { toast } from 'sonner';

import { Tournament } from '../utils';

interface ShareTournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournament: Tournament | null;
}

export const ShareTournamentModal: React.FC<ShareTournamentModalProps> = ({
    isOpen,
    onClose,
    tournament
}) => {
    const [copiedPublic, setCopiedPublic] = useState(false);
    const [copiedReg, setCopiedReg] = useState(false);

    if (!tournament || !tournament.id) return null;

    const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/tournaments/${tournament.id}` : '';
    const registrationUrl = typeof window !== 'undefined' ? `${window.location.origin}/tournaments/unified-registration?tournamentId=${tournament.id}` : '';

    const copyToClipboard = (text: string, isPublic: boolean) => {
        navigator.clipboard.writeText(text);
        if (isPublic) {
            setCopiedPublic(true);
            setTimeout(() => setCopiedPublic(false), 2000);
        } else {
            setCopiedReg(true);
            setTimeout(() => setCopiedReg(false), 2000);
        }
        toast.success('تم النسخ للحافظة');
    };

    const shareOnWhatsApp = () => {
        const text = `انضم إلينا في بطولة ${tournament.name}! 🔥\n\n📌 التفاصيل والتسجيل:\n${publicUrl}\n\nسجل الآن مباشرة:\n${registrationUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md bg-white p-0 gap-0 border-0 shadow-2xl overflow-hidden sm:rounded-2xl">
                {/* Header with Pattern and Close Button */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white text-center relative overflow-hidden">
                    {/* Decorative Background Pattern */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl"></div>

                    {/* Close Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="absolute left-3 top-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-20"
                    >
                        <X className="h-5 w-5" />
                    </Button>

                    <div className="relative z-10 flex flex-col items-center gap-4">
                        <div className="bg-white/15 p-4 rounded-2xl backdrop-blur-md shadow-lg border border-white/10 ring-1 ring-white/20">
                            <Share2 className="h-8 w-8 text-white drop-shadow-sm" />
                        </div>
                        <div className="space-y-1.5 max-w-[85%]">
                            <DialogTitle className="text-2xl font-bold text-white tracking-tight">
                                مشاركة البطولة
                            </DialogTitle>
                            <DialogDescription className="text-blue-50/90 text-sm font-medium leading-relaxed line-clamp-2">
                                {tournament.name}
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <div className="p-6 pt-8 space-y-6 bg-white relative">
                    <Tabs defaultValue="links" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-8 p-1.5 bg-gray-100/80 rounded-xl border border-gray-200/50">
                            <TabsTrigger
                                value="links"
                                className="rounded-lg font-medium text-sm data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all py-2"
                            >
                                الروابط والمشاركة
                            </TabsTrigger>
                            <TabsTrigger
                                value="qr"
                                className="rounded-lg font-medium text-sm data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all py-2"
                            >
                                رمز QR
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="links" className="space-y-5 animate-in slide-in-from-left-2 duration-300">
                            {/* Public Link Card */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-blue-500" />
                                    صفحة البطولة العامة
                                </Label>
                                <div className="flex items-center gap-2 p-1 border rounded-lg bg-gray-50 focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-sm group hover:border-blue-200">
                                    <div className="p-2 bg-white rounded border shadow-sm">
                                        <LinkIcon className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                    <Input
                                        value={publicUrl}
                                        readOnly
                                        className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-gray-600 h-9 ltr text-sm font-mono"
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => copyToClipboard(publicUrl, true)}
                                        className={copiedPublic ? "text-green-600 bg-green-50" : "text-gray-500 hover:text-blue-600 hover:bg-blue-50"}
                                    >
                                        {copiedPublic ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            {/* Registration Link Card */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <ExternalLink className="h-4 w-4 text-indigo-500" />
                                    رابط التسجيل المباشر
                                </Label>
                                <div className="flex items-center gap-2 p-1 border rounded-lg bg-gray-50 focus-within:ring-2 focus-within:ring-indigo-100 transition-all shadow-sm group hover:border-indigo-200">
                                    <div className="p-2 bg-white rounded border shadow-sm">
                                        <LinkIcon className="h-4 w-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                                    </div>
                                    <Input
                                        value={registrationUrl}
                                        readOnly
                                        className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-gray-600 h-9 ltr text-sm font-mono"
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => copyToClipboard(registrationUrl, false)}
                                        className={copiedReg ? "text-green-600 bg-green-50" : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"}
                                    >
                                        {copiedReg ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button
                                    onClick={shareOnWhatsApp}
                                    className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold h-12 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    <MessageCircle className="h-5 w-5 mr-2" />
                                    مشاركة عبر واتساب
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="qr" className="flex flex-col items-center justify-center py-4 animate-in slide-in-from-right-2 duration-300">
                            <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 shadow-sm mb-4 relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity blur"></div>
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicUrl)}`}
                                    alt="QR Code"
                                    className="w-48 h-48 relative z-10"
                                />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1">امسح الكود</h3>
                            <p className="text-gray-500 text-sm text-center max-w-[200px]">
                                وجه كاميرا الهاتف نحو الرمز للوصول لصفحة البطولة مباشرة
                            </p>

                            <Button variant="outline" className="mt-6 border-blue-200 text-blue-700 hover:bg-blue-50 w-full" onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(publicUrl)}`, '_blank')}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                فتح الصورة بحجم كامل
                            </Button>
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t text-xs text-gray-500">
                    <span>مشاركة آمنة وسريعة</span>
                    <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-200 text-gray-600 h-8">
                        إغلاق
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

