'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MediaItem } from '../types';
import { User, Phone, Mail, Send, Trash2, MessageSquareText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authenticatedFetch } from '@/lib/api/authenticated-fetch';

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
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // ── فتح محادثة واتساب المباشرة مع اللاعب ──
    const handleOpenWhatsAppDirect = () => {
        const cleanPhone = (targetPhone || item.userPhone || '').trim().replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 8) {
            toast.error('يرجى التأكد من كتابة رقم هاتف صحيح مع مفتاح الدولة');
            return;
        }

        const textToSend = message.trim()
            ? `مرحباً ${item.userName}،\n\nتواصل إدارة الكشافة وتحليل الأداء بمنصة الحلم الدولية:\n\n${message.trim()}\n\nرابط بروفايلك: https://el7lm.com/profile/${item.userId}`
            : `مرحباً ${item.userName}، تواصل إدارة الكشافة وتحليل الأداء بمنصة الحلم بخصوص فيديوهاتك ومستواك الفني.`;

        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textToSend)}`;
        window.open(url, '_blank');
        toast.success(`تم فتح تطبيق واتساب مع (${cleanPhone}) بنجاح`);
    };

    // ── إرسال إشعار فوري داخل التطبيق ──
    const handleSendPushNotification = async () => {
        if (!message.trim()) {
            toast.error('يرجى كتابة نص الإشعار أولاً');
            return;
        }
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
            toast.error('فشل إرسال الإشعار: ' + (e?.message || 'خطأ غير متوقع'));
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
            toast.error('فشل الحذف: ' + (e?.message || 'خطأ غير متوقع'));
        } finally {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    return (
        <div className="space-y-4 text-right">
            {/* Player Direct Contact Card (Daylight Theme) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs text-slate-900">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                            <User className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-black text-slate-900">قنوات التواصل المباشر مع اللاعب</h4>
                    </div>
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        محادثة واتساب مباشرة 💬
                    </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 space-y-3 text-xs border border-slate-200">
                    <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            رقم الهاتف والواتساب (مع مفتاح الدولة):
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={targetPhone}
                                    onChange={e => setTargetPhone(e.target.value)}
                                    placeholder="+2010... أو +966..."
                                    className="w-full bg-white border border-slate-300 rounded-lg pr-9 pl-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>
                    </div>

                    {item.userEmail && (
                        <div className="flex items-center gap-2 text-slate-700">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono text-xs">{item.userEmail}</span>
                        </div>
                    )}

                    <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-200 flex items-center justify-between">
                        <span>النادي / الأكاديمية:</span>
                        <span className="text-slate-900 font-bold">{item.organization || 'لاعب حر'}</span>
                    </div>
                </div>
            </div>

            {/* Direct Dispatch Center (Direct WhatsApp Opening + Push Notification) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs text-slate-900">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                        <MessageSquareText className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-slate-900">إرسال توجيه فني أو فتح محادثة</h4>
                        <p className="text-[10px] text-slate-500">فتح تطبيق واتساب مباشرة مع اللاعب أو إرسال إشعار فوري داخل التطبيق</p>
                    </div>
                </div>

                <Textarea
                    rows={4}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="اكتب التوجيه الفني أو الملاحظات التي ترغب بإرسالها في رسالة الواتساب أو الإشعار..."
                    className="text-xs bg-white border-slate-200 text-slate-900 resize-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl leading-relaxed"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <Button
                        onClick={handleOpenWhatsAppDirect}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-9.5 text-xs gap-2 cursor-pointer shadow-xs active:scale-98 transition-all"
                    >
                        <MessageSquareText className="w-4 h-4" />
                        <span>مراسلة عبر واتساب (فتح المحادثة) 💬</span>
                    </Button>

                    <Button
                        onClick={handleSendPushNotification}
                        disabled={sendingPush || !message.trim()}
                        variant="outline"
                        className="border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold h-9.5 text-xs gap-2 cursor-pointer transition-all"
                    >
                        {sendingPush ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>{sendingPush ? 'جاري الإرسال...' : 'إرسال إشعار للتطبيق (Push)'}</span>
                    </Button>
                </div>
            </div>

            {/* Danger Zone: Delete */}
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between text-rose-950">
                <div>
                    <p className="text-xs font-black text-rose-900">حذف ملف الوسائط نهائياً</p>
                    <p className="text-[11px] text-rose-700">إزالة الفيديو والبيانات المرتبطة به من قاعدة البيانات وسحابة التخزين</p>
                </div>
                <Button
                    variant="ghost" size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="border border-rose-300 bg-white text-rose-700 hover:bg-rose-100 text-xs font-bold h-8.5 cursor-pointer transition-all"
                >
                    <Trash2 className="w-3.5 h-3.5 ml-1" />
                    {confirmDelete ? 'تأكيد الحذف النهائي؟' : 'حذف الفيديو'}
                </Button>
            </div>
        </div>
    );
}
