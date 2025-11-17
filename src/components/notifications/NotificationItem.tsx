'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Bell, 
  Eye,
  Check,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  MessageSquare,
  Heart,
  Users,
  Building2,
  GraduationCap,
  Trophy,
  Phone,
  Shield
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { resolveAvatarUrl } from '@/lib/notifications/sender-utils';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  link?: string;
  metadata?: Record<string, any>;
  scope: 'system' | 'club' | 'academy' | 'trainer' | string;
  organizationId?: string;
  createdAt: any;
  updatedAt: any;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  senderAccountType?: string;
  actionType?: 'profile_view' | 'message_sent' | 'connection_request' | 'follow' | 'like' | 'comment';
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onNavigateToSender?: (senderId: string) => void | Promise<void>;
  onNavigateToAction?: (notification: Notification) => void;
  showSenderInfo?: boolean;
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onNavigateToSender,
  onNavigateToAction,
  showSenderInfo = true
}: NotificationItemProps) {
  const metadata = notification.metadata || {};
  const primarySenderId =
    notification.senderId ||
    metadata.senderId ||
    metadata.viewerId ||
    metadata.profileOwnerId ||
    metadata.userId ||
    null;

  const derivedSenderName =
    notification.senderName ||
    metadata.senderName ||
    metadata.viewerName ||
    metadata.profileOwnerName ||
    metadata.userName ||
    metadata.title ||
    'مستخدم';

  const derivedSenderAvatar =
    notification.senderAvatar ||
    metadata.senderAvatar ||
    metadata.viewerAvatar ||
    metadata.profileImage ||
    metadata.userAvatar ||
    null;

  const derivedAccountType =
    notification.senderAccountType ||
    metadata.senderAccountType ||
    metadata.viewerAccountType ||
    metadata.profileType ||
    undefined;

  const resolvedSenderAvatar = useMemo(
    () =>
      resolveAvatarUrl(derivedSenderAvatar, {
        senderAccountType: derivedAccountType,
        metadata
      }) || undefined,
    [
      derivedSenderAvatar,
      derivedAccountType,
      metadata.senderBucket,
      metadata.avatarBucket,
      metadata.bucket,
      metadata.senderAccountType
    ]
  );

  // الحصول على أيقونة الإشعار
  const getNotificationIcon = (type: string, actionType?: string) => {
    if (actionType) {
      switch (actionType) {
        case 'profile_view':
          return <Eye className="w-5 h-5 text-blue-600" />;
        case 'message_sent':
          return <MessageSquare className="w-5 h-5 text-green-600" />;
        case 'connection_request':
          return <Users className="w-5 h-5 text-purple-600" />;
        case 'follow':
          return <Heart className="w-5 h-5 text-red-600" />;
        case 'like':
          return <Heart className="w-5 h-5 text-red-600" />;
        case 'comment':
          return <MessageSquare className="w-5 h-5 text-blue-600" />;
        default:
          return <Bell className="w-5 h-5 text-gray-600" />;
      }
    }

    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  // الحصول على لون النوع
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-orange-50 border-orange-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  // تنسيق الوقت
  const formatNotificationTime = (timestamp: any) => {
    try {
      const date = timestamp?.toDate?.() || new Date(timestamp);
              return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'الآن';
    }
  };

  // الحصول على تسمية نوع الإشعار
  const getNotificationTypeLabel = (type: string, actionType?: string) => {
    if (actionType) {
      switch (actionType) {
        case 'profile_view':
          return 'مشاهدة الملف الشخصي';
        case 'message_sent':
          return 'رسالة جديدة';
        case 'connection_request':
          return 'طلب اتصال';
        case 'follow':
          return 'متابعة';
        case 'like':
          return 'إعجاب';
        case 'comment':
          return 'تعليق';
        default:
          return 'تفاعل';
      }
    }

    switch (type) {
      case 'success':
        return 'نجح';
      case 'warning':
        return 'تحذير';
      case 'error':
        return 'خطأ';
      case 'info':
      default:
        return 'معلومات';
    }
  };

  // الحصول على أيقونة نوع الحساب
  const getAccountTypeIcon = (accountType?: string) => {
    switch (accountType) {
      case 'club':
        return <Building2 className="w-4 h-4 text-blue-600" />;
      case 'academy':
        return <GraduationCap className="w-4 h-4 text-green-600" />;
      case 'agent':
        return <Phone className="w-4 h-4 text-purple-600" />;
      case 'trainer':
        return <User className="w-4 h-4 text-orange-600" />;
      case 'player':
        return <Trophy className="w-4 h-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-red-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  // الحصول على تسمية نوع الحساب
  const getAccountTypeLabel = (accountType?: string) => {
    switch (accountType) {
      case 'club':
        return 'نادي';
      case 'academy':
        return 'أكاديمية';
      case 'agent':
        return 'وكيل';
      case 'trainer':
        return 'مدرب';
      case 'player':
        return 'لاعب';
      case 'admin':
        return 'مدير';
      default:
        return 'مستخدم';
    }
  };

  // الحصول على الحروف الأولى من الاسم
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card 
      className={`border-l-4 ${getTypeColor(notification.type)} ${
        !notification.isRead ? 'bg-blue-50 border-blue-300 shadow-md' : 'hover:bg-gray-50'
      } transition-all duration-200`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* صورة المرسل */}
          {showSenderInfo && (
            <div className="flex-shrink-0">
              <Avatar 
                className="w-12 h-12 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                onClick={() => {
                  if (primarySenderId && onNavigateToSender) {
                    onNavigateToSender(primarySenderId);
                  }
                }}
              >
                <AvatarImage src={resolvedSenderAvatar} alt={derivedSenderName} />
                <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                  {getInitials(derivedSenderName)}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* محتوى الإشعار */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                {/* عنوان الإشعار */}
                <h4 className="font-semibold text-lg text-gray-900 mb-1">
                  {notification.title}
                </h4>

                {/* معلومات المرسل */}
                {showSenderInfo && derivedSenderName && (
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {notification.actionType === 'profile_view' ? (
                      <>
                        <span className="text-sm text-gray-600">شاهد ملفك:</span>
                        <span 
                          className="font-medium text-blue-600 cursor-pointer hover:underline"
                          onClick={() => {
                            if (primarySenderId && onNavigateToSender) {
                              onNavigateToSender(primarySenderId);
                            }
                          }}
                        >
                          {derivedSenderName}
                        </span>
                      </>
                    ) : (
                      <>
                        <span 
                          className="font-medium text-blue-600 cursor-pointer hover:underline"
                          onClick={() => {
                            if (primarySenderId && onNavigateToSender) {
                              onNavigateToSender(primarySenderId);
                            }
                          }}
                        >
                          {derivedSenderName}
                        </span>
                      </>
                    )}
                    {derivedAccountType && (
                      <>
                        <span className="text-gray-400">•</span>
                        <div className="flex items-center gap-1">
                          {getAccountTypeIcon(derivedAccountType)}
                          <span className="text-sm text-gray-600">
                            {getAccountTypeLabel(derivedAccountType)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* رسالة الإشعار */}
                <p className="text-gray-700 mb-3 leading-relaxed">
                  {notification.message}
                </p>
              </div>

              {/* أيقونة الإشعار */}
              <div className="flex-shrink-0 mt-1">
                {getNotificationIcon(notification.type, notification.actionType)}
              </div>
            </div>

            {/* الشارات */}
            <div className="flex items-center gap-2 mb-3">
              {!notification.isRead && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                  جديد
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {getNotificationTypeLabel(notification.type, notification.actionType)}
              </Badge>
            </div>

            {/* التوقيت والأزرار */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{formatNotificationTime(notification.createdAt)}</span>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                {!notification.isRead && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onMarkAsRead(notification.id)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Check className="w-3 h-3" />
                    تحديد كمقروء
                  </Button>
                )}
                
                {/* زر عرض ملف صاحب الملف الشخصي (في حالة profile_view) */}
                {notification.actionType === 'profile_view' && 
                 primarySenderId && 
                 onNavigateToSender && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onNavigateToSender(primarySenderId)}
                    className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Eye className="w-3 h-3" />
                    عرض الملف الشخصي
                  </Button>
                )}
                
                {/* زر عرض ملف المرسل (في الحالات الأخرى) */}
                {notification.actionType !== 'profile_view' && 
                 primarySenderId && 
                 onNavigateToSender && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNavigateToSender(primarySenderId)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <User className="w-3 h-3" />
                    عرض ملف المرسل
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigateToAction?.(notification)}
                  className="flex items-center gap-1 text-xs"
                >
                  <Eye className="w-3 h-3" />
                  عرض التفاصيل
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

