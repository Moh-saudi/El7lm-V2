'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MediaItem } from '../types';
import { User, Phone, Mail, MessageSquare, Send, Trash2 } from 'lucide-react';
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
    const [sendingMsg, setSendingMsg] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleSendMessage = async () => {
        if (!message.trim()) return;
        setSendingMsg(true);
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
            toast.error('فشل إرسال الرسالة: ' + e.message);
        } finally {
            setSendingMsg(false);
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
        <div className="space-y-4">
            {/* Player Direct Contact Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-black text-slate-900">قنوات التواصل المباشر مع اللاعب</h4>
                </div>
                <div className="bg-slate-50 rounded-xl p-3.5 space-y-2.5 text-xs border border-slate-200/80">
                    {item.userPhone ? (
                        <div className="flex items-center justify-between text-slate-800">
                            <span className="flex items-center gap-2 font-mono">
                                <Phone className="w-3.5 h-3.5 text-slate-400" /> {item.userPhone}
                            </span>
                            <a
                                href={`https://wa.me/${item.userPhone.replace(/\D/g, '')}`}
                                target="_blank" rel="noreferrer"
                                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1"
                            >
                                <span>مراسلة واتساب 💬</span>
                            </a>
                        </div>
                    ) : (
                        <p className="text-slate-400 text-xs">لا يوجد رقم هاتف مسجل</p>
                    )}
                    {item.userEmail && (
                        <div className="flex items-center gap-2 text-slate-700">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono">{item.userEmail}</span>
                        </div>
                    )}
                    <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-200/80 flex items-center justify-between">
                        <span>النادي / الأكاديمية:</span>
                        <span className="text-slate-900 font-bold">{item.organization || 'لاعب حر'}</span>
                    </div>
                </div>
            </div>

            {/* Instant Mobile Notification */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <MessageSquare className="w-4 h-4 text-teal-600" />
                    <h4 className="text-xs font-black text-slate-900">إرسال إشعار فوري لهاتف اللاعب</h4>
                </div>
                <p className="text-[11px] text-slate-500">
                    يصل الإشعار فوراً في شريط إشعارات هاتف ({item.userName}).
                </p>
                <Textarea
                    rows={3}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="اكتب التوجيه الفني أو التنبيه المباشر للاعب..."
                    className="text-xs bg-slate-50 border-slate-200 text-slate-800 resize-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
                <Button
                    onClick={handleSendMessage}
                    disabled={sendingMsg || !message.trim()}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-9 text-xs gap-2 cursor-pointer shadow-xs"
                >
                    <Send className={`w-3.5 h-3.5 ${sendingMsg ? 'animate-spin' : ''}`} />
                    <span>{sendingMsg ? 'جاري الإرسال...' : 'إرسال الإشعار لهاتف اللاعب'}</span>
                </Button>
            </div>

            {/* Danger Zone: Delete */}
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-rose-900">حذف هذا الفيديو</p>
                    <p className="text-[11px] text-rose-700">إزالة ملف الفيديو والبيانات المرتبطة به نهائياً</p>
                </div>
                <Button
                    variant="ghost" size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="border border-rose-300 text-rose-700 hover:bg-rose-100 text-xs font-bold h-8.5 cursor-pointer"
                >
                    <Trash2 className="w-3.5 h-3.5 ml-1" />
                    {confirmDelete ? 'تأكيد الحذف النهائي؟' : 'حذف الفيديو'}
                </Button>
            </div>
        </div>
    );
}
