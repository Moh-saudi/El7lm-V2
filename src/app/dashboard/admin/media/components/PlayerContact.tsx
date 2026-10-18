'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MediaItem } from '../types';
import { User, Phone, Mail, MessageSquare, Send, Trash2, MessageSquareText, Loader2, ShieldCheck, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { authenticatedFetch } from '@/lib/api/authenticated-fetch';
import { ChatAmanService } from '@/lib/services/chataman-service';

interface Props {
    item: MediaItem;
    userId: string;
    onDelete: (item: MediaItem) => Promise<void>;
    onClose: () => void;
}

export function PlayerContact({ item, userId, onDelete, onClose }: Props) {
    const [message, setMessage] = useState('');
    const [targetPhone, setTargetPhone] = useState(item.userPhone || '');
    const [sendingPush, setSendingPush] = useState(false);
    const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // ── إرسال رسالة واتساب رسمية عبر ChatAman API ──
    const handleSendWhatsAppChatAman = async () => {
        const cleanPhone = (targetPhone || item.userPhone || '').trim().replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 8) {
            toast.error('يرجى التأكد من كتابة رقم هاتف صحيح مع مفتاح الدولة');
            return;
        }
        if (!message.trim()) {
            toast.error('يرجى كتابة نص الرسالة أولاً');
            return;
        }

        setSendingWhatsApp(true);
        try {
            const formattedMsg = `مرحباً ${item.userName}،\n\nتواصل إدارة الكشافة وتحليل الأداء بمنصة الحلم الدولية:\n\n${message.trim()}\n\nرابط بروفايلك: https://el7lm.com/profile/${item.userId}`;
            const res = await ChatAmanService.sendMessage(cleanPhone, formattedMsg);
            if (res.success) {
                toast.success(`تم إرسال رسالة الواتساب بنجاح عبر ChatAman API إلى (${cleanPhone})`);
                setMessage('');
            } else {
                toast.error('فشل إرسال واتساب عبر ChatAman: ' + (res.error || 'خطأ غير معروف'));
            }
        } catch (e: any) {
            toast.error('خطأ في الاتصال بخدمة واتساب: ' + e.message);
        } finally {
            setSendingWhatsApp(false);
        }
    };

    // ── إرسال إشعار فوري داخل التطبيق ──
    const handleSendPushNotification = async () => {
        if (!message.trim()) return;
        setSendingPush(true);
        try {
            const res = await authenticatedFetch('/api/notifications/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: 'message_received',
                    targetUserId: item.userId,
                    actorId: userId,
                    actorName: 'مسؤول ومحلل أداء المنصة',
                    actorAccountType: 'admin',
                    metadata: { messagePreview: message.trim().substring(0, 100) },
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'فشل الإرسال');
            toast.success(`تم إرسال الإشعار إلى هاتف ${item.userName}`);
            setMessage('');
        } catch (e: any) {
            toast.error('فشل إرسال الإشعار: ' + e.message);
        } finally {
            setSendingPush(false);
        }
    };

    const handleDelete = async () => {
        if (deleting) return;
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        setDeleting(true);
        try {
            await onDelete(item);
            toast.success('تم حذف العنصر بنجاح');
            onClose();
        } catch (e: any) {
            toast.error('فشل الحذف: ' + e.message);
        } finally {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    return (
        <div className="space-y-4 text-right">
            {/* Player Direct Contact Card (Titanium Theme) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <User className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-black text-white">قنوات التواصل المباشر مع اللاعب</h4>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        ChatAman API جاهز ✅
                    </span>
                </div>

                <div className="bg-slate-950/70 rounded-xl p-3.5 space-y-3 text-xs border border-slate-800/80">
                    <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">
                            رقم الهاتف والواتساب (مع مفتاح الدولة):
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Phone className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={targetPhone}
                                    onChange={e => setTargetPhone(e.target.value)}
                                    placeholder="+2010... أو +966..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>
                    </div>

                    {item.userEmail && (
                        <div className="flex items-center gap-2 text-slate-300">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            <span className="font-mono text-xs">{item.userEmail}</span>
                        </div>
                    )}

                    <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800 flex items-center justify-between">
                        <span>النادي / الأكاديمية:</span>
                        <span className="text-white font-bold">{item.organization || 'لاعب حر'}</span>
                    </div>
                </div>
            </div>

            {/* Direct Dispatch Center (ChatAman WhatsApp + In-App Push) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <MessageSquareText className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-white">إرسال توجيه فني أو تقرير للاعب</h4>
                        <p className="text-[10px] text-slate-400">الإرسال المباشر برمجياً عبر ChatAman WhatsApp API أو إشعار فوري للتطبيق</p>
                    </div>
                </div>

                <Textarea
                    rows={4}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="اكتب التوجيه الفني، أو ملاحظات التطوير، أو دعوة للانضمام للاختبارات..."
                    className="text-xs bg-slate-950 border-slate-800 text-slate-200 resize-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl leading-relaxed"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <Button
                        onClick={handleSendWhatsAppChatAman}
                        disabled={sendingWhatsApp || !message.trim()}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black h-9.5 text-xs gap-2 cursor-pointer shadow-md shadow-emerald-900/20 active:scale-98 transition-all"
                    >
                        {sendingWhatsApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquareText className="w-4 h-4" />}
                        <span>{sendingWhatsApp ? 'جاري الإرسال عبر API...' : 'إرسال واتساب (ChatAman API)'}</span>
                    </Button>

                    <Button
                        onClick={handleSendPushNotification}
                        disabled={sendingPush || !message.trim()}
                        variant="outline"
                        className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold h-9.5 text-xs gap-2 cursor-pointer transition-all"
                    >
                        {sendingPush ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>{sendingPush ? 'جاري الإرسال...' : 'إشعار فوري للتطبيق (Push)'}</span>
                    </Button>
                </div>
            </div>

            {/* Danger Zone: Delete */}
            <div className="bg-rose-950/20 border border-rose-900/40 rounded-2xl p-4 flex items-center justify-between">
                <div>
                    <p className="text-xs font-black text-rose-400">حذف ملف الوسائط نهائياً</p>
                    <p className="text-[11px] text-rose-300/70">إزالة الفيديو والبيانات المرتبطة به من قاعدة البيانات وسحابة التخزين</p>
                </div>
                <Button
                    variant="ghost" size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="border border-rose-800/80 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 hover:text-white text-xs font-bold h-8.5 cursor-pointer transition-all"
                >
                    <Trash2 className="w-3.5 h-3.5 ml-1" />
                    {confirmDelete ? 'تأكيد الحذف النهائي؟' : 'حذف الفيديو'}
                </Button>
            </div>
        </div>
    );
}
