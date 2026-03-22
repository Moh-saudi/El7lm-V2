import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export interface InteractionNotification {
  id?: string;
  userId: string; // صاحب الملف الشخصي
  viewerId: string; // المشاهد
  viewerName: string;
  viewerType: string;
  viewerAccountType: string;
  type: 'profile_view' | 'search_result' | 'connection_request' | 'message_sent' | 'follow' | 'video_like' | 'video_comment' | 'video_share' | 'video_view';
  title: string;
  message: string;
  emoji: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  metadata?: {
    viewCount?: number;
    searchTerm?: string;
    searchRank?: number;
    profileType?: string;
    interactionTime?: number;
    videoId?: string;
    commentText?: string;
  };
  createdAt: any;
  expiresAt?: any;
}

class InteractionNotificationService {
  // إرسال إشعار مشاهدة الملف الشخصي
  async sendProfileViewNotification(
    profileOwnerId: string,
    viewerId: string,
    viewerName: string,
    viewerType: string,
    viewerAccountType: string,
    profileType: string = 'player'
  ): Promise<string> {
    try {
      console.log('📢 بدء إرسال إشعار مشاهدة الملف الشخصي:', {
        profileOwnerId,
        viewerId,
        viewerName,
        viewerType,
        viewerAccountType,
        profileType
      });
      
      // التحقق من عدم إرسال إشعار لنفس الشخص
      if (profileOwnerId === viewerId) {
        console.log('⚠️ تخطي الإشعار - نفس الشخص');
        return '';
      }

      // التحقق من عدم إرسال إشعار مكرر في آخر 5 دقائق
      const recentNotification = await this.checkRecentNotification(
        profileOwnerId,
        viewerId,
        'profile_view',
        5 * 60 * 1000 // 5 دقائق
      );

      if (recentNotification) {
        return recentNotification;
      }

      const messages = [
        {
          title: 'شخص مهتم بك! 👀',
          message: `${this.getAccountTypeLabel(viewerAccountType)} يطلع عليك! أمامك خطوة للاحتراف 🚀`,
          emoji: '👀'
        },
        {
          title: 'مشاهدة جديدة! ⭐',
          message: `${this.getAccountTypeLabel(viewerAccountType)} اكتشف موهبتك! تميزك واضح ⭐`,
          emoji: '⭐'
        },
        {
          title: 'فرصة ذهبية! 🔥',
          message: `${this.getAccountTypeLabel(viewerAccountType)} يتابعك! خطوة للاحتراف 🏆`,
          emoji: '🔥'
        },
        {
          title: 'انتباه احترافي! ✨',
          message: `${this.getAccountTypeLabel(viewerAccountType)} معجب بك! النجاح قريب ✨`,
          emoji: '✨'
        },
        {
          title: 'اهتمام متزايد! 🏆',
          message: `${this.getAccountTypeLabel(viewerAccountType)} شاهد ملفك! خطوة للقمة 🚀`,
          emoji: '🏆'
        }
      ];

      const randomMessage = messages[Math.floor(Math.random() * messages.length)];

      const notification: Omit<InteractionNotification, 'id' | 'createdAt'> = {
        userId: profileOwnerId,
        viewerId,
        viewerName,
        viewerType,
        viewerAccountType,
        type: 'profile_view',
        title: randomMessage.title,
        message: randomMessage.message,
        emoji: randomMessage.emoji,
        isRead: false,
        priority: 'medium',
        actionUrl: `/dashboard/${profileType}/profile`,
        metadata: {
          profileType,
          interactionTime: Date.now()
        },
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 يوم
      };

      console.log('📢 إضافة الإشعار إلى قاعدة البيانات...');
      
      const docRef = await addDoc(collection(db, 'interaction_notifications'), {
        ...notification,
        createdAt: serverTimestamp()
      });

      console.log('✅ تم إرسال إشعار مشاهدة الملف الشخصي:', {
        profileOwnerId,
        viewerId,
        viewerName,
        notificationId: docRef.id
      });

      return docRef.id;
    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار مشاهدة الملف الشخصي:', error);
      throw error;
    }
  }

  private async sendVideoInteraction(
    type: 'video_like' | 'video_comment' | 'video_share' | 'video_view',
    videoOwnerId: string,
    actorId: string,
    actorName: string,
    actorType: string,
    actorAccountType: string,
    videoId: string,
    commentText?: string
  ): Promise<string> {
    const titles: Record<string, string> = {
      video_like: 'إعجاب جديد على فيديوك ❤️',
      video_comment: 'تعليق جديد على فيديوك 💬',
      video_share: 'تمت مشاركة فيديوك 🔗',
      video_view: 'شخص شاهد فيديوك 👀',
    };

    const messages: Record<string, string> = {
      video_like: `${actorName} (${this.getAccountTypeLabel(actorAccountType)}) أعجب بفيديوك`,
      video_comment: `${actorName} (${this.getAccountTypeLabel(actorAccountType)}) علّق: "${(commentText || '').substring(0, 50)}"`,
      video_share: `${actorName} (${this.getAccountTypeLabel(actorAccountType)}) شارك فيديوك`,
      video_view: `${actorName} (${this.getAccountTypeLabel(actorAccountType)}) شاهد فيديوك`,
    };

    const notification: Omit<InteractionNotification, 'id' | 'createdAt'> = {
      userId: videoOwnerId,
      viewerId: actorId,
      viewerName: actorName,
      viewerType: actorType,
      viewerAccountType: actorAccountType,
      type,
      title: titles[type],
      message: messages[type],
      emoji: type === 'video_like' ? '❤️' : type === 'video_comment' ? '💬' : type === 'video_share' ? '🔗' : '👀',
      isRead: false,
      priority: type === 'video_comment' ? 'high' : 'medium',
      actionUrl: `/dashboard/shared/videos`,
      metadata: {
        videoId,
        commentText,
        interactionTime: Date.now(),
      },
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    const docRef = await addDoc(collection(db, 'interaction_notifications'), {
      ...notification,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  }

  async sendVideoLikeNotification(
    videoOwnerId: string,
    actorId: string,
    actorName: string,
    actorType: string,
    actorAccountType: string,
    videoId: string,
  ): Promise<string> {
    return this.sendVideoInteraction('video_like', videoOwnerId, actorId, actorName, actorType, actorAccountType, videoId);
  }

  async sendVideoCommentNotification(
    videoOwnerId: string,
    actorId: string,
    actorName: string,
    actorType: string,
    actorAccountType: string,
    videoId: string,
    commentText: string,
  ): Promise<string> {
    return this.sendVideoInteraction('video_comment', videoOwnerId, actorId, actorName, actorType, actorAccountType, videoId, commentText);
  }

  async sendVideoShareNotification(
    videoOwnerId: string,
    actorId: string,
    actorName: string,
    actorType: string,
    actorAccountType: string,
    videoId: string,
  ): Promise<string> {
    return this.sendVideoInteraction('video_share', videoOwnerId, actorId, actorName, actorType, actorAccountType, videoId);
  }

  async sendVideoViewNotification(
    videoOwnerId: string,
    actorId: string,
    actorName: string,
    actorType: string,
    actorAccountType: string,
    videoId: string,
  ): Promise<string> {
    return this.sendVideoInteraction('video_view', videoOwnerId, actorId, actorName, actorType, actorAccountType, videoId);
  }
  // إرسال إشعار نتيجة البحث
  async sendSearchResultNotification(
    profileOwnerId: string,
    viewerId: string,
    viewerName: string,
    viewerType: string,
    viewerAccountType: string,
    searchTerm: string,
    rank: number
  ): Promise<string> {
    try {
      // التحقق من عدم إرسال إشعار مكرر في آخر 10 دقائق
      const recentNotification = await this.checkRecentNotification(
        profileOwnerId,
        viewerId,
        'search_result',
        10 * 60 * 1000 // 10 دقائق
      );

      if (recentNotification) {
        return recentNotification;
      }

      const messages = [
        {
          title: 'تم العثور عليك! 🔍',
          message: `شخص يبحث عن '${searchTerm}' وجدك في المرتبة ${rank}! تميزك يجعلك فريداً! ⭐`,
          emoji: '🔍'
        },
        {
          title: 'نتيجة بحث مميزة! 🎯',
          message: `أنت في المرتبة ${rank} لبحث '${searchTerm}'. مهاراتك تتحدث عن نفسها! 🏆`,
          emoji: '🎯'
        },
        {
          title: 'اكتشاف جديد! 💎',
          message: `${viewerName} يبحث عن '${searchTerm}' ووجدك! قيمتك الحقيقية تتجلى للجميع! ✨`,
          emoji: '💎'
        },
        {
          title: 'تميز في البحث! 🌟',
          message: `أنت من أفضل النتائج لبحث '${searchTerm}'. احترافيتك واضحة للجميع! 🚀`,
          emoji: '🌟'
        }
      ];

      const randomMessage = messages[Math.floor(Math.random() * messages.length)];

      const notification: Omit<InteractionNotification, 'id' | 'createdAt'> = {
        userId: profileOwnerId,
        viewerId,
        viewerName,
        viewerType,
        viewerAccountType,
        type: 'search_result',
        title: randomMessage.title,
        message: randomMessage.message,
        emoji: randomMessage.emoji,
        isRead: false,
        priority: 'high',
        actionUrl: `/dashboard/player/search`,
        metadata: {
          searchTerm,
          searchRank: rank,
          interactionTime: Date.now()
        },
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 يوم
      };

      const docRef = await addDoc(collection(db, 'interaction_notifications'), {
        ...notification,
        createdAt: serverTimestamp()
      });

      console.log('✅ تم إرسال إشعار نتيجة البحث:', {
        profileOwnerId,
        viewerId,
        searchTerm,
        rank,
        notificationId: docRef.id
      });

      return docRef.id;
    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار نتيجة البحث:', error);
      throw error;
    }
  }

  // إرسال إشعار طلب تواصل
  async sendConnectionRequestNotification(
    targetUserId: string,
    requesterId: string,
    requesterName: string,
    requesterType: string,
    requesterAccountType: string
  ): Promise<string> {
    try {
      const messages = [
        {
          title: 'طلب تواصل جديد! 🤝',
          message: `${requesterName} من ${this.getAccountTypeLabel(requesterAccountType)} يريد التواصل معك. فرصة ذهبية للتعاون! 🚀`,
          emoji: '🤝'
        },
        {
          title: 'اهتمام احترافي! 💼',
          message: `${requesterName} يبحث عن التعاون معك. احترافيتك تجذب الانتباه! ⭐`,
          emoji: '💼'
        },
        {
          title: 'فرصة جديدة! 🌟',
          message: `${requesterName} يريد التواصل معك. سرعة تقدمك مذهلة! 💎`,
          emoji: '🌟'
        }
      ];

      const randomMessage = messages[Math.floor(Math.random() * messages.length)];

      const notification: Omit<InteractionNotification, 'id' | 'createdAt'> = {
        userId: targetUserId,
        viewerId: requesterId,
        viewerName: requesterName,
        viewerType: requesterType,
        viewerAccountType: requesterAccountType,
        type: 'connection_request',
        title: randomMessage.title,
        message: randomMessage.message,
        emoji: randomMessage.emoji,
        isRead: false,
        priority: 'high',
        actionUrl: `/dashboard/messages`,
        metadata: {
          interactionTime: Date.now()
        },
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 يوم
      };

      const docRef = await addDoc(collection(db, 'interaction_notifications'), {
        ...notification,
        createdAt: serverTimestamp()
      });

      console.log('✅ تم إرسال إشعار طلب تواصل:', {
        targetUserId,
        requesterId,
        requesterName,
        notificationId: docRef.id
      });

      return docRef.id;
    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار طلب تواصل:', error);
      throw error;
    }
  }

  // إرسال إشعار رسالة جديدة
  async sendMessageNotification(
    receiverId: string,
    senderId: string,
    senderName: string,
    senderType: string,
    senderAccountType: string,
    messagePreview: string
  ): Promise<string> {
    try {
      const messages = [
        {
          title: 'رسالة جديدة! 💬',
          message: `${senderName} من ${this.getAccountTypeLabel(senderAccountType)} أرسل لك رسالة: "${messagePreview.substring(0, 30)}..."`,
          emoji: '💬'
        },
        {
          title: 'تواصل جديد! 📱',
          message: `رسالة من ${senderName}: "${messagePreview.substring(0, 30)}..."`,
          emoji: '📱'
        },
        {
          title: 'اهتمام مباشر! ⭐',
          message: `${senderName} يتواصل معك مباشرة. فرصة للتعاون! 🚀`,
          emoji: '⭐'
        }
      ];

      const randomMessage = messages[Math.floor(Math.random() * messages.length)];

      const notification: Omit<InteractionNotification, 'id' | 'createdAt'> = {
        userId: receiverId,
        viewerId: senderId,
        viewerName: senderName,
        viewerType: senderType,
        viewerAccountType: senderAccountType,
        type: 'message_sent',
        title: randomMessage.title,
        message: randomMessage.message,
        emoji: randomMessage.emoji,
        isRead: false,
        priority: 'high',
        actionUrl: `/dashboard/messages`,
        metadata: {
          messagePreview,
          interactionTime: Date.now()
        } as any,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 يوم
      };

      const docRef = await addDoc(collection(db, 'interaction_notifications'), {
        ...notification,
        createdAt: serverTimestamp()
      });

      console.log('✅ تم إرسال إشعار رسالة جديدة:', {
        receiverId,
        senderId,
        senderName,
        notificationId: docRef.id
      });

      return docRef.id;
    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار رسالة جديدة:', error);
      throw error;
    }
  }

  // التحقق من الإشعارات الحديثة لتجنب التكرار
  private async checkRecentNotification(
    userId: string,
    viewerId: string,
    type: string,
    timeWindow: number
  ): Promise<string | null> {
    try {
      // يمكن إضافة منطق للتحقق من الإشعارات الحديثة هنا
      // حالياً نرجع null للسماح بإرسال جميع الإشعارات
      return null;
    } catch (error) {
      console.error('❌ خطأ في التحقق من الإشعارات الحديثة:', error);
      return null;
    }
  }

  // الحصول على تسمية نوع الحساب
  private getAccountTypeLabel(accountType: string): string {
    const labels: Record<string, string> = {
      'club': 'نادي',
      'academy': 'أكاديمية',
      'agent': 'وكيل',
      'trainer': 'مدرب',
      'player': 'لاعب',
      'admin': 'مشرف',
      'marketer': 'مسوق'
    };

    return labels[accountType] || accountType;
  }

  // تحديث حالة قراءة الإشعار
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'interaction_notifications', notificationId), {
        isRead: true
      });
      console.log('✅ تم تحديث حالة قراءة الإشعار:', notificationId);
    } catch (error) {
      console.error('❌ خطأ في تحديث حالة قراءة الإشعار:', error);
      throw error;
    }
  }

  // حذف الإشعارات منتهية الصلاحية
  async cleanupExpiredNotifications(): Promise<void> {
    try {
      // يمكن إضافة منطق لحذف الإشعارات منتهية الصلاحية هنا
      console.log('✅ تم تنظيف الإشعارات منتهية الصلاحية');
    } catch (error) {
      console.error('❌ خطأ في تنظيف الإشعارات منتهية الصلاحية:', error);
    }
  }
}

export const interactionNotificationService = new InteractionNotificationService(); 
