/**
 * نظام التنبيهات المتقدم للأدمن - Supabase Edition
 * تم تحويله من Firebase Firestore إلى Supabase
 */

import { supabase } from '@/lib/supabase/config';

export interface AdminNotification {
  id?: string;
  type: 'payment' | 'user' | 'system' | 'security' | 'error' | 'warning' | 'info' | 'video';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  adminId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  readAt?: string;
  action?: { label: string; url: string };
}

export interface NotificationSettings {
  adminId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  notificationTypes: {
    payments: boolean;
    newUsers: boolean;
    systemAlerts: boolean;
    securityEvents: boolean;
    errorReports: boolean;
    newVideos: boolean;
  };
  quietHours: { enabled: boolean; startTime: string; endTime: string };
}

class AdminNotificationService {
  private static instance: AdminNotificationService;
  private isSupported = false;

  constructor() {
    this.checkSupport();
  }

  static getInstance(): AdminNotificationService {
    if (!AdminNotificationService.instance) {
      AdminNotificationService.instance = new AdminNotificationService();
    }
    return AdminNotificationService.instance;
  }

  private checkSupport() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      this.isSupported = false;
      return;
    }
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
  }

  async registerForNotifications(_adminId: string): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Skipping SW push registration in non-production environment');
      return false;
    }
    try {
      console.warn('Service Worker registration disabled to prevent SSR conflicts');
      return false;
    } catch (error) {
      console.error('Failed to register for notifications:', error);
      return false;
    }
  }

  async sendNotification(notification: Omit<AdminNotification, 'id' | 'createdAt' | 'isRead'>): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error } = await supabase.from('admin_notifications').insert({
      id, ...notification, isRead: false, createdAt: now,
    });
    if (error) throw error;

    await this.sendPushNotification({ ...notification, id, isRead: false, createdAt: now });
    await this.sendEmailNotification({ ...notification, id, isRead: false, createdAt: now });

    return id;
  }

  async getNotifications(adminId?: string, unreadOnly = false): Promise<AdminNotification[]> {
    try {
      let query = supabase
        .from('admin_notifications')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(50);

      if (adminId) query = query.eq('adminId', adminId);
      if (unreadOnly) query = query.eq('isRead', false);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as AdminNotification[];
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return [];
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      await supabase
        .from('admin_notifications')
        .update({ isRead: true, readAt: new Date().toISOString() })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async markAllAsRead(adminId: string): Promise<void> {
    try {
      await supabase
        .from('admin_notifications')
        .update({ isRead: true, readAt: new Date().toISOString() })
        .eq('adminId', adminId)
        .eq('isRead', false);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }

  private async sendPushNotification(notification: AdminNotification): Promise<void> {
    try {
      await fetch('/api/admin/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: notification.title, message: notification.message,
          type: notification.type, priority: notification.priority, action: notification.action,
        }),
      });
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  private async sendEmailNotification(notification: AdminNotification): Promise<void> {
    try {
      await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'admin@el7lm.com',
          subject: `[El7lm Admin] ${notification.title}`,
          message: notification.message, type: notification.type, priority: notification.priority,
        }),
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  async createAutoNotifications() {
    const notifications = [
      { type: 'payment' as const, title: 'مدفوعات فاشلة تحتاج مراجعة', message: 'هناك عدد من المدفوعات الفاشلة تحتاج إلى مراجعة فورية', priority: 'high' as const, action: { label: 'مراجعة المدفوعات', url: '/dashboard/admin/payments?status=failed' } },
      { type: 'user' as const, title: 'مستخدمين جدد في انتظار التحقق', message: 'هناك مستخدمين جدد يحتاجون موافقة إدارية', priority: 'medium' as const, action: { label: 'مراجعة المستخدمين', url: '/dashboard/admin/users?verified=false' } },
      { type: 'system' as const, title: 'تحديث أسعار العملات مطلوب', message: 'لم يتم تحديث أسعار العملات لأكثر من 24 ساعة', priority: 'medium' as const, action: { label: 'تحديث الأسعار', url: '/dashboard/admin/system' } },
    ];
    for (const n of notifications) await this.sendNotification(n);
  }

  async checkNewVideos() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const collections = ['players', 'clubs', 'agents', 'marketers'];
      let totalNewVideos = 0;
      const newVideosByUser: Record<string, number> = {};

      for (const table of collections) {
        try {
          const { data } = await supabase
            .from(table)
            .select('full_name, name, userName, videos')
            .not('videos', 'is', null);

          (data ?? []).forEach((row: Record<string, unknown>) => {
            const videos = Array.isArray(row.videos) ? row.videos : [];
            const newVids = videos.filter((v: Record<string, unknown>) => {
              if (!v?.uploadDate) return false;
              return String(v.uploadDate) > oneHourAgo && v.status === 'pending';
            });
            if (newVids.length > 0) {
              totalNewVideos += newVids.length;
              const name = String(row.full_name ?? row.name ?? row.userName ?? 'مستخدم');
              newVideosByUser[name] = (newVideosByUser[name] || 0) + newVids.length;
            }
          });
        } catch (e) {
          console.error(`خطأ في فحص الفيديوهات من ${table}:`, e);
        }
      }

      if (totalNewVideos > 0) {
        const userNames = Object.keys(newVideosByUser).slice(0, 3);
        const remainingUsers = Object.keys(newVideosByUser).length - 3;
        let message = `تم رفع ${totalNewVideos} فيديو جديد من قبل: ${userNames.join('، ')}`;
        if (remainingUsers > 0) message += ` و${remainingUsers} مستخدم آخر`;
        message += '. يرجى مراجعة الفيديوهات الجديدة.';

        await this.sendNotification({
          type: 'video', title: `فيديوهات جديدة تحتاج مراجعة (${totalNewVideos})`, message, priority: 'medium',
          action: { label: 'مراجعة الفيديوهات الجديدة', url: '/dashboard/admin/videos?status=pending&sort=newest' },
          metadata: { totalNewVideos, newVideosByUser, timestamp: new Date().toISOString() },
        });
      }
    } catch (error) {
      console.error('خطأ في فحص الفيديوهات الجديدة:', error);
    }
  }

  async notifyNewVideo(videoData: { title: string; userName: string; accountType: string; videoId: string; uploadDate: Date }) {
    try {
      const accountTypeText: Record<string, string> = { player: 'لاعب', club: 'نادي', agent: 'وكيل', parent: 'ولي أمر', marketer: 'مسوق' };
      await this.sendNotification({
        type: 'video', title: `فيديو جديد: ${videoData.title}`,
        message: `تم رفع فيديو جديد من قبل ${videoData.userName} (${accountTypeText[videoData.accountType] ?? videoData.accountType}). يرجى مراجعة الفيديو.`,
        priority: 'medium',
        action: { label: 'مراجعة الفيديو', url: `/dashboard/admin/videos?video=${videoData.videoId}` },
        metadata: { videoId: videoData.videoId, userName: videoData.userName, accountType: videoData.accountType, uploadDate: videoData.uploadDate.toISOString() },
      });
    } catch (error) {
      console.error('خطأ في إرسال إشعار الفيديو الجديد:', error);
    }
  }

  async getNotificationSettings(adminId: string): Promise<NotificationSettings | null> {
    try {
      const { data } = await supabase
        .from('admin_notification_settings')
        .select('*')
        .eq('adminId', adminId)
        .limit(1)
        .single();
      return data as NotificationSettings | null;
    } catch {
      return null;
    }
  }

  async updateNotificationSettings(settings: NotificationSettings): Promise<void> {
    try {
      await supabase
        .from('admin_notification_settings')
        .upsert({ ...settings, id: settings.adminId });
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    }
  }

  startPeriodicChecks() {
    setInterval(() => this.checkCriticalEvents(), 5 * 60 * 1000);
    setInterval(() => this.checkNewVideos(), 15 * 60 * 1000);
    setInterval(() => this.generateDailyReport(), 24 * 60 * 60 * 1000);
  }

  private async checkCriticalEvents() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gt('createdAt', oneHourAgo);

      if ((count ?? 0) > 5) {
        await this.sendNotification({
          type: 'payment', title: 'تحذير: عدد كبير من المدفوعات الفاشلة',
          message: `تم رصد ${count} مدفوعات فاشلة في الساعة الماضية`, priority: 'critical',
          action: { label: 'فحص الآن', url: '/dashboard/admin/payments?status=failed' },
        });
      }

      await this.checkDatabaseHealth();
    } catch (error) {
      console.error('Error in periodic checks:', error);
      await this.sendNotification({ type: 'system', title: 'خطأ في النظام', message: 'حدث خطأ أثناء الفحص الدوري للنظام', priority: 'high' });
    }
  }

  private async checkDatabaseHealth() {
    try {
      await supabase.from('users').select('id').limit(1);
    } catch {
      await this.sendNotification({
        type: 'system', title: 'تحذير: مشكلة في قاعدة البيانات',
        message: 'فشل في الاتصال بقاعدة البيانات', priority: 'critical',
        action: { label: 'فحص النظام', url: '/dashboard/admin/system' },
      });
    }
  }

  private async generateDailyReport() {
    try {
      await this.sendNotification({
        type: 'info', title: 'التقرير اليومي',
        message: 'تم إنشاء التقرير اليومي للنظام', priority: 'low',
        action: { label: 'عرض التفاصيل', url: '/dashboard/admin/reports/financial' },
      });
    } catch (error) {
      console.error('Failed to generate daily report:', error);
    }
  }
}

export const adminNotificationService = AdminNotificationService.getInstance();

export const sendAdminAlert = (title: string, message: string, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium') =>
  adminNotificationService.sendNotification({ type: 'info', title, message, priority });

export const sendPaymentAlert = (message: string, paymentId?: string) =>
  adminNotificationService.sendNotification({
    type: 'payment', title: 'تنبيه مدفوعات', message, priority: 'high',
    action: paymentId ? { label: 'عرض المدفوعة', url: `/dashboard/admin/payments?id=${paymentId}` } : undefined,
  });

export const sendSecurityAlert = (message: string, userId?: string) =>
  adminNotificationService.sendNotification({
    type: 'security', title: 'تحذير أمني', message, priority: 'critical',
    action: userId ? { label: 'عرض المستخدم', url: `/dashboard/admin/users?id=${userId}` } : undefined,
  });
