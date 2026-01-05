import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaPlayer, MediaProvider, Poster } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout, DefaultAudioLayout } from '@vidstack/react/player/layouts/default';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
// Ensure Vidstack styles are loaded
import { CheckCircle, XCircle, Flag, Share2, Download, Info, BrainCircuit, Activity, FileText, Send, MessageSquare } from "lucide-react";
import { Media } from '../types';
import { feedbackTemplates } from '@/components/templates/feedback-templates';
import { toast } from 'sonner';

interface MediaInspectorProps {
    media: Media | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdateStatus: (media: Media, status: 'approved' | 'rejected' | 'flagged') => void;
}

export const MediaInspector: React.FC<MediaInspectorProps> = ({ media, isOpen, onClose, onUpdateStatus }) => {
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [messageContent, setMessageContent] = useState('');
    const [sending, setSending] = useState(false);
    const [videoError, setVideoError] = useState(false);

    // Reset error when media changes
    React.useEffect(() => {
        setVideoError(false);
    }, [media]);

    if (!media) return null;

    const isVideo = (url: string) => {
        // Naive check, can be improved.
        return url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') || !url.match(/\.(jpeg|jpg|gif|png)$/);
    };

    const isExternal = (url: string) => {
        return url.includes('youtube.com') ||
            url.includes('youtu.be') ||
            url.includes('vimeo.com') ||
            url.includes('twitch.tv');
    };

    const handleTemplateChange = (value: string) => {
        setSelectedTemplate(value);
        const template = feedbackTemplates.find(t => t.id === value);
        if (template) {
            let content = template.content.replace('[اسم اللاعب]', media.userName);
            setMessageContent(content);
        }
    };

    const handleSendMessage = async () => {
        if (!messageContent) return;
        setSending(true);

        // Simulate sending message
        await new Promise(resolve => setTimeout(resolve, 1500));

        toast.success(`تم إرسال الرسالة إلى ${media.userName} بنجاح`);
        console.log('Sending message to:', media.phone || media.userEmail, 'Content:', messageContent);

        setSending(false);
        setMessageContent('');
        setSelectedTemplate('');
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="left" className="w-full sm:max-w-xl md:max-w-2xl p-0 overflow-hidden flex flex-col bg-slate-50 border-r border-slate-200">

                {/* Header / Media Player */}
                <div className="bg-black relative aspect-video flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {media.thumbnailUrl || isVideo(media.url) ? (
                        <div className="w-full h-full">
                            <MediaPlayer
                                title={media.title}
                                src={media.url}
                                className="w-full h-full"
                                aspectRatio="16/9"
                                load="eager"
                            >
                                <MediaProvider>
                                    <Poster className="vds-poster" src={media.thumbnailUrl} alt={media.title} />
                                </MediaProvider>
                                <DefaultAudioLayout icons={defaultLayoutIcons} />
                                <DefaultVideoLayout icons={defaultLayoutIcons} />
                            </MediaPlayer>
                        </div>
                    ) : (
                        <img src={media.url} className="w-full h-full object-contain" alt={media.title} />
                    )}

                    <div className="absolute top-4 left-4 z-20 pointer-events-none">
                        <Badge className="bg-black/50 text-white backdrop-blur-sm border-white/20">
                            {media.category || 'Media'}
                        </Badge>
                    </div>
                </div>

                {/* Content Details */}
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-white">
                        <h2 className="text-xl font-bold text-slate-900 leading-tight">{media.title}</h2>
                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                            <span className="font-medium text-slate-900">{media.userName}</span>
                            <span>•</span>
                            <span>{new Date(media.uploadDate?.toDate?.() || media.uploadDate).toLocaleDateString('ar-EG')}</span>
                        </div>
                    </div>

                    <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-6 border-b border-slate-200 bg-white">
                            <TabsList className="bg-transparent h-12 w-full justify-start gap-6 p-0">
                                <TabsTrigger value="details" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none px-0 font-medium">
                                    التفاصيل
                                </TabsTrigger>
                                <TabsTrigger value="feedback" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600 data-[state=active]:shadow-none px-0 font-medium">
                                    <MessageSquare className="w-4 h-4 ml-2" />
                                    تواصل مع اللاعب
                                </TabsTrigger>
                                <TabsTrigger value="ai" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:text-purple-600 data-[state=active]:shadow-none px-0 font-medium">
                                    <BrainCircuit className="w-4 h-4 ml-2" />
                                    تحليل AI
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-slate-50">
                            <TabsContent value="details" className="p-6 m-0 space-y-6">
                                {/* Description */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                        الوصف
                                    </h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        {media.description || 'لا يوجد وصف مرفق.'}
                                    </p>
                                </div>

                                {/* Metadata Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">نوع الحساب</p>
                                        <p className="text-sm font-semibold text-slate-900">{media.accountType}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">المؤسسة</p>
                                        <p className="text-sm font-semibold text-slate-900">{media.organization || '-'}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">المشاهدات</p>
                                        <p className="text-sm font-semibold text-slate-900">{media.views}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">الإعجابات</p>
                                        <p className="text-sm font-semibold text-slate-900">{media.likes}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2">
                                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">بيانات الاتصال</p>
                                        <p className="text-sm font-semibold text-slate-900 flex justify-between">
                                            <span>{media.phone || '-'}</span>
                                            <span className="text-slate-400">|</span>
                                            <span>{media.userEmail}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Technical Info */}
                                <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
                                    <Info className="w-3 h-3" />
                                    <span>Source: {media.sourceType}</span>
                                    <span>•</span>
                                    <span>ID: {media.id}</span>
                                </div>
                            </TabsContent>

                            <TabsContent value="feedback" className="p-6 m-0 space-y-6">
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                    <h3 className="text-emerald-800 font-bold text-sm mb-1">رسالة تشجيعية سريعة</h3>
                                    <p className="text-emerald-600 text-xs">ساعد اللاعب على التطور من خلال إرسال ملاحظاتك الفنية مباشرة.</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">اختر قالب الرسالة</label>
                                        <Select onValueChange={handleTemplateChange} value={selectedTemplate}>
                                            <SelectTrigger className="w-full h-11 bg-white border-slate-200">
                                                <SelectValue placeholder="اختر نوع الرسالة..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {feedbackTemplates.map(t => (
                                                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">نص الرسالة</label>
                                        <Textarea
                                            value={messageContent}
                                            onChange={(e) => setMessageContent(e.target.value)}
                                            placeholder="اكتب رسالتك هنا أو اختر قالب..."
                                            className="min-h-[150px] bg-white border-slate-200 resize-none p-4 leading-relaxed"
                                        />
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <Button
                                            onClick={handleSendMessage}
                                            disabled={!messageContent || sending}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-6"
                                        >
                                            {sending ? 'جاري الإرسال...' : (
                                                <>
                                                    <Send className="w-4 h-4 ml-2" />
                                                    إرسال الرسالة
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="ai" className="p-6 m-0">
                                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 border-dashed">
                                    <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mb-4 text-purple-500">
                                        <BrainCircuit className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-1">التحليل الذكي قيد التجهيز</h3>
                                    <p className="max-w-xs text-sm text-slate-400">
                                        سيتم عرض البيانات التحليلية (السرعة، التمريرات، الأهداف) هنا فور ربط محرك الذكاء الاصطناعي.
                                    </p>
                                    <Button variant="outline" className="mt-6 font-medium border-purple-200 text-purple-700 hover:bg-purple-50">
                                        بدء تحليل تجريبي
                                    </Button>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>

                    {/* Sticky Actions Footer */}
                    <div className="p-4 bg-white border-t border-slate-200 flex flex-col gap-3 z-10">
                        <div className="flex gap-3">
                            <Button
                                onClick={() => onUpdateStatus(media, 'approved')}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 shadow-sm"
                            >
                                <CheckCircle className="w-4 h-4 ml-2" />
                                اعتماد
                            </Button>
                            <Button
                                onClick={() => onUpdateStatus(media, 'rejected')}
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold h-11 shadow-sm"
                            >
                                <XCircle className="w-4 h-4 ml-2" />
                                رفض
                            </Button>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => onUpdateStatus(media, 'flagged')}
                                className="flex-1 border-orange-200 text-orange-700 hover:bg-orange-50 font-medium"
                            >
                                <Flag className="w-4 h-4 ml-2" />
                                تنبيه للإدارة
                            </Button>
                        </div>
                    </div>
                </div>

            </SheetContent>
        </Sheet>
    );
};
