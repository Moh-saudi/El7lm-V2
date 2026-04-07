/**
 * Smart Notification Service - Supabase Edition
 * تم تحويله من Firebase Firestore إلى Supabase
 */

import { supabase } from '@/lib/supabase/config';

export interface SmartNotification {
  id?: string;
  userId: string;
  viewerId: string;
  viewerName: string;
  viewerType: string;
  type: 'profile_view' | 'search_result' | 'connection_request' | 'achievement' | 'trending';
  title: string;
  message: string;
  emoji: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  metadata?: {
    viewCount?: number;
    searchTerm?: string;
    achievementType?: string;
    trendingRank?: number;
  };
  createdAt: string;
  expiresAt?: string;
}

const MOTIVATIONAL_MESSAGES = {
  profile_view: [
    { emoji: '👀', title: 'شخص مهتم بك!', message: 'قام {viewerName} بمشاهدة ملفك الشخصي. اهتمامهم بك يعني أنك على الطريق الصحيح!' },
    { emoji: '⭐', title: 'ملفك يجذب الانتباه', message: '{viewerName} من {viewerType} شاهد ملفك. استمر في تطوير نفسك!' },
    { emoji: '🚀', title: 'أنت تحت الأضواء', message: 'شخص آخر اكتشف موهبتك! {viewerName} يتابع تقدمك باهتمام.' },
    { emoji: '💫', title: 'نجومك تتألق', message: 'ملفك الشخصي يجذب الانتباه! {viewerName} من {viewerType} معجب بمسارك.' },
    { emoji: '🎯', title: 'أنت في دائرة الاهتمام', message: '{viewerName} يتابعك عن كثب. استمر في التميز!' }
  ],
  search_result: [
    { emoji: '🔍', title: 'تم العثور عليك!', message: 'شخص يبحث عن {searchTerm} وجدك! أنت في قمة النتائج.' },
    { emoji: '🏆', title: 'أنت الأفضل في البحث', message: 'عند البحث عن {searchTerm}، أنت في المقدمة! تميزك واضح.' },
    { emoji: '💎', title: 'كنز تم اكتشافه', message: 'شخص يبحث عن {searchTerm} وجدك! أنت الكنز المفقود.' },
    { emoji: '🌟', title: 'نجم في السماء', message: 'عند البحث عن {searchTerm}، أنت النجم اللامع! استمر في التميز.' },
    { emoji: '🎖️', title: 'أنت الأول في البحث', message: 'عند البحث عن {searchTerm}، أنت في المرتبة الأولى! فخر لنا.' }
  ],
  connection_request: [
    { emoji: '🤝', title: 'طلب تواصل جديد!', message: '{viewerName} يريد التواصل معك. فرصة ذهبية للتعاون!' },
    { emoji: '💼', title: 'فرصة مهنية', message: '{viewerName} من {viewerType} يريد التعاون معك. مستقبلك ينتظر!' },
    { emoji: '🎯', title: 'هدف جديد', message: '{viewerName} يرى فيك شريك مثالي. استثمر في هذه العلاقة!' },
    { emoji: '🚀', title: 'انطلاق نحو النجاح', message: '{viewerName} يريد أن يكون جزءاً من رحلتك نحو النجاح!' },
    { emoji: '💫', title: 'شراكة ناجحة', message: '{viewerName} يرى فيك شريكاً مثالياً. المستقبل ينتظر!' }
  ],
  achievement: [
    { emoji: '🏆', title: 'إنجاز جديد!', message: 'لقد حققت {achievementType}! أنت تتقدم بسرعة مذهلة.' },
    { emoji: '⭐', title: 'نجم متألق', message: 'إنجاز {achievementType} يثبت أنك على الطريق الصحيح!' },
    { emoji: '🎖️', title: 'ميدالية جديدة', message: 'حصلت على {achievementType}! استمر في التميز.' },
    { emoji: '🌟', title: 'نجم في السماء', message: '{achievementType} يثبت أنك نجم حقيقي!' },
    { emoji: '💎', title: 'كنز ثمين', message: 'إنجاز {achievementType} يجعلك كنزاً ثميناً!' }
  ],
  trending: [
    { emoji: '🔥', title: 'أنت ترند!', message: 'ملفك في المرتبة {rank} في الترند! أنت نجم حقيقي.' },
    { emoji: '⚡', title: 'سرعة البرق', message: 'أنت في المرتبة {rank} في الترند! سرعتك مذهلة.' },
    { emoji: '🚀', title: 'انطلاق نحو النجوم', message: 'المرتبة {rank} في الترند! أنت تتجه نحو النجوم.' },
    { emoji: '💫', title: 'نجم متألق', message: 'في المرتبة {rank} في الترند! تألقك واضح للجميع.' },
    { emoji: '🎯', title: 'هدف محقق', message: 'المرتبة {rank} في الترند! أهدافك تتحقق بسرعة.' }
  ]
};

const RANDOM_MOTIVATIONAL_MESSAGES = [
  { emoji: '💪', message: 'قوتك الداخلية تجذب الانتباه!' },
  { emoji: '🎯', message: 'أهدافك واضحة وطموحاتك عالية!' },
  { emoji: '🌟', message: 'أنت نجم في سماء النجاح!' },
  { emoji: '🚀', message: 'سرعة تقدمك مذهلة!' },
  { emoji: '💎', message: 'قيمتك الحقيقية تتجلى للجميع!' },
  { emoji: '🏆', message: 'أنت بطلاً في مجالك!' },
  { emoji: '⭐', message: 'تميزك يجعلك فريداً!' },
  { emoji: '🎖️', message: 'إنجازاتك تتحدث عن نفسها!' },
  { emoji: '🔥', message: 'شغفك يضيء الطريق للآخرين!' },
  { emoji: '💫', message: 'أنت مصدر إلهام للكثيرين!' }
];

class SmartNotificationService {
  private rand<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private getTypeName(type: string): string {
    const typeNames: Record<string, string> = {
      player: 'لاعب', club: 'نادي', academy: 'أكاديمية',
      agent: 'وكيل', trainer: 'مدرب', admin: 'مشرف'
    };
    return typeNames[type] || 'مستخدم';
  }

  private async insert(notification: Omit<SmartNotification, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    const { error } = await supabase.from('smart_notifications').insert({ id, ...notification });
    if (error) throw error;
    return id;
  }

  async sendProfileViewNotification(
    profileOwnerId: string,
    viewerId: string,
    viewerName: string,
    viewerType: string
  ): Promise<string> {
    const msg = this.rand(MOTIVATIONAL_MESSAGES.profile_view);
    const motivational = this.rand(RANDOM_MOTIVATIONAL_MESSAGES);

    await this.updateViewCount(profileOwnerId);

    return this.insert({
      userId: profileOwnerId, viewerId, viewerName, viewerType,
      type: 'profile_view', title: msg.title,
      message: msg.message
        .replace('{viewerName}', viewerName)
        .replace('{viewerType}', this.getTypeName(viewerType)) + ' ' + motivational.message,
      emoji: msg.emoji, isRead: false, priority: 'medium',
      actionUrl: `/dashboard/profile/${viewerId}`,
      metadata: { viewCount: 1 },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  async sendSearchResultNotification(
    userId: string,
    searcherId: string,
    searcherName: string,
    searcherType: string,
    searchTerm: string,
    rank: number
  ): Promise<string> {
    const msg = this.rand(MOTIVATIONAL_MESSAGES.search_result);

    return this.insert({
      userId, viewerId: searcherId, viewerName: searcherName, viewerType: searcherType,
      type: 'search_result', title: msg.title,
      message: msg.message.replace('{searchTerm}', searchTerm),
      emoji: msg.emoji, isRead: false, priority: 'high',
      actionUrl: `/dashboard/search?term=${encodeURIComponent(searchTerm)}`,
      metadata: { searchTerm, viewCount: rank },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  async sendConnectionRequestNotification(
    userId: string,
    requesterId: string,
    requesterName: string,
    requesterType: string
  ): Promise<string> {
    const msg = this.rand(MOTIVATIONAL_MESSAGES.connection_request);

    return this.insert({
      userId, viewerId: requesterId, viewerName: requesterName, viewerType: requesterType,
      type: 'connection_request', title: msg.title,
      message: msg.message
        .replace('{viewerName}', requesterName)
        .replace('{viewerType}', this.getTypeName(requesterType)),
      emoji: msg.emoji, isRead: false, priority: 'urgent',
      actionUrl: `/dashboard/connections/${requesterId}`,
      metadata: { viewCount: 1 },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  async sendAchievementNotification(
    userId: string,
    achievementType: string,
    achievementValue?: number
  ): Promise<string> {
    const msg = this.rand(MOTIVATIONAL_MESSAGES.achievement);

    return this.insert({
      userId, viewerId: 'system', viewerName: 'النظام', viewerType: 'system',
      type: 'achievement', title: msg.title,
      message: msg.message.replace('{achievementType}', achievementType),
      emoji: msg.emoji, isRead: false, priority: 'high',
      actionUrl: `/dashboard/achievements`,
      metadata: { achievementType, viewCount: achievementValue || 1 },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  async sendTrendingNotification(userId: string, rank: number, category: string): Promise<string> {
    const msg = this.rand(MOTIVATIONAL_MESSAGES.trending);

    return this.insert({
      userId, viewerId: 'system', viewerName: 'النظام', viewerType: 'system',
      type: 'trending', title: msg.title,
      message: msg.message.replace('{rank}', rank.toString()),
      emoji: msg.emoji, isRead: false, priority: 'urgent',
      actionUrl: `/dashboard/trending`,
      metadata: { trendingRank: rank, viewCount: 1 },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  private async updateViewCount(userId: string): Promise<void> {
    try {
      const { data } = await supabase.from('users').select('profileViews').eq('id', userId).maybeSingle();
      const current = (data as any)?.profileViews ?? 0;
      await supabase.from('users').update({
        profileViews: current + 1,
        lastViewedAt: new Date().toISOString(),
      }).eq('id', userId);
    } catch (error) {
      console.error('خطأ في تحديث عداد المشاهدات:', error);
    }
  }
}

export const smartNotificationService = new SmartNotificationService();
