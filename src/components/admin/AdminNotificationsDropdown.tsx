/**
 * مكون إشعارات الإدارة المتطور
 * يتميز بتصميم عصري وحركات سلسة
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, Trash2, User, FileText, CreditCard, Settings, LogIn, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { AdminNotification, AdminNotificationType } from '@/lib/notifications/admin-notifications';
import { useAuth } from '@/lib/firebase/auth-provider';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

// أيقونات حسب نوع الإشعار
const notificationIcons: Record<AdminNotificationType, React.ReactNode> = {
    user_update: <User className="w-4 h-4" />,
    user_status: <User className="w-4 h-4" />,
    content_update: <FileText className="w-4 h-4" />,
    payment_action: <CreditCard className="w-4 h-4" />,
    employee_login: <LogIn className="w-4 h-4" />,
    settings_change: <Settings className="w-4 h-4" />,
    profile_update: <User className="w-4 h-4" />,
    general: <Bell className="w-4 h-4" />
};

export function AdminNotificationsDropdown() {
    const { userData } = useAuth();

    console.log('🔔 AdminDropdown Render Check:', {
        exists: !!userData,
        type: userData?.accountType,
        isAdmin: userData?.accountType === 'admin'
    });

    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification
    } = useAdminNotifications();

    const [isOpen, setIsOpen] = useState(false);

    // التحقق من أن المستخدم مدير (admin) - تم تخفيف الشرط ليشمل أي مدير
    const isAdmin = userData?.accountType === 'admin';

    // لا تظهر لغير المدراء
    if (!isAdmin) {
        return null;
    }

    const formatTime = (timestamp: any) => {
        if (!timestamp) return '';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return formatDistanceToNow(date, { addSuffix: true, locale: ar });
        } catch {
            return '';
        }
    };

    const NotificationItem = ({ notification }: { notification: AdminNotification }) => (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className={`group relative p-4 mb-2 rounded-xl border transition-all duration-200 ${notification.isRead
                ? 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                : 'bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-blue-100 shadow-sm'
                }`}
        >
            <div className="flex gap-4 items-start">
                {/* Icon Container */}
                <div className={`p-2.5 rounded-xl text-white shadow-sm shrink-0 mt-1 ${notification.priority === 'critical' ? 'bg-gradient-to-br from-red-500 to-rose-600' :
                    notification.priority === 'high' ? 'bg-gradient-to-br from-orange-500 to-amber-600' :
                        notification.priority === 'medium' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
                            'bg-gradient-to-br from-slate-500 to-gray-600'
                    }`}>
                    {notificationIcons[notification.type] || notificationIcons.general}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                        <h4 className={`text-sm font-bold leading-tight ${notification.isRead ? 'text-gray-800' : 'text-blue-900'
                            }`}>
                            {notification.title}
                        </h4>
                        <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap shrink-0">
                            {formatTime(notification.createdAt)}
                        </span>
                    </div>

                    <p className="mt-1.5 text-xs text-gray-600 leading-relaxed font-medium">
                        {notification.message}
                    </p>

                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100/50">
                        <div className="flex items-center gap-2">
                            {notification.employeeName && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100/50 border border-gray-200/50">
                                    <User className="w-3 h-3 text-gray-400" />
                                    <span className="text-[10px] text-gray-600">{notification.employeeName}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {!notification.isRead && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead(notification.id!);
                                    }}
                                    title="تحديد كمقروء"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id!);
                                }}
                                title="حذف"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-full hover:bg-blue-50 transition-all duration-300 w-10 h-10"
                >
                    <div className={`absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 ${unreadCount > 0 ? 'bg-blue-500/10 opacity-100' : ''}`} />
                    <Bell className={`w-5 h-5 transition-colors duration-300 ${unreadCount > 0 ? 'text-blue-600 fill-blue-100' : 'text-gray-500'}`} />
                    <AnimatePresence>
                        {unreadCount > 0 && (
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute top-2 right-2 flex h-2.5 w-2.5"
                            >
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white"></span>
                            </motion.span>
                        )}
                    </AnimatePresence>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-[400px] p-0 border-0 shadow-2xl rounded-2xl bg-white/95 backdrop-blur-xl ring-1 ring-black/5 overflow-hidden mt-2"
                {...({ dir: 'rtl' } as any)}
            >
                <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                            مركز الإشراف
                            <Badge variant="outline" className="font-normal text-[10px] h-5 bg-white border-gray-200 text-gray-500">
                                Admin
                            </Badge>
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">سجل نشاطات الموظفين والنظام</p>
                    </div>
                    {unreadCount > 0 && (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border-blue-100">
                            {unreadCount} جديد
                        </Badge>
                    )}
                </div>

                <ScrollArea className="max-h-[500px] min-h-[100px] bg-gray-50/30">
                    <div className="p-3">
                        <AnimatePresence mode="popLayout">
                            {loading ? (
                                <div className="py-12 text-center space-y-3">
                                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto opacity-50"></div>
                                    <p className="text-sm text-gray-400">جاري التحديث...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="py-12 px-6 text-center"
                                >
                                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                                        <CheckCheck className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h4 className="text-gray-900 font-medium mb-1">الكل تمام!</h4>
                                    <p className="text-gray-500 text-sm">لا توجد إشعارات إدارية جديدة في الوقت الحالي.</p>
                                </motion.div>
                            ) : (
                                notifications.map((notification) => (
                                    <NotificationItem key={notification.id} notification={notification} />
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </ScrollArea>

                <div className="p-3 border-t border-gray-100 bg-white/50 backdrop-blur flex gap-2 sticky bottom-0 z-10">
                    <Button
                        variant="default"
                        size="sm"
                        className="flex-1 bg-gray-900 text-white hover:bg-gray-800 shadow-lg shadow-gray-200/50 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                        onClick={() => markAllAsRead()}
                        disabled={unreadCount === 0}
                    >
                        <CheckCheck className="ml-2 w-4 h-4" />
                        تحديد الكل كمقروء
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 hover:bg-gray-100 text-gray-600 rounded-xl transition-all"
                        onClick={() => setIsOpen(false)}
                    >
                        إغلاق
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default AdminNotificationsDropdown;
