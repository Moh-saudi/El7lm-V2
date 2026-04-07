import { supabase } from '@/lib/supabase/config';
import {
  Referral,
  PlayerRewards,
  Badge,
  BADGES,
  POINTS_CONVERSION,
  ReferralStats
} from '@/types/referral';

class ReferralService {

  generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async createOrUpdatePlayerRewards(playerId: string): Promise<PlayerRewards> {
    try {
      const { data: existing } = await supabase.from('player_rewards').select('*').eq('id', playerId).limit(1);
      if (existing?.length) return existing[0] as PlayerRewards;

      const now = new Date().toISOString();
      const newRewards: PlayerRewards = {
        playerId,
        totalPoints: 0,
        availablePoints: 0,
        totalEarnings: 0,
        referralCount: 0,
        badges: [],
        lastUpdated: now,
        createdAt: now,
      };

      await supabase.from('player_rewards').insert({ id: playerId, ...newRewards });
      return newRewards;
    } catch (error) {
      console.error('خطأ في إنشاء نظام مكافآت اللاعب:', error);
      throw error;
    }
  }

  async addPointsToPlayer(playerId: string, points: number, reason: string): Promise<void> {
    try {
      const { data: existing } = await supabase.from('player_rewards').select('totalPoints, availablePoints, totalEarnings').eq('id', playerId).limit(1);
      if (!existing?.length) return;

      const row = existing[0] as Record<string, unknown>;
      const now = new Date().toISOString();

      await supabase.from('player_rewards').update({
        totalPoints: Number(row.totalPoints || 0) + points,
        availablePoints: Number(row.availablePoints || 0) + points,
        totalEarnings: Number(row.totalEarnings || 0) + points / POINTS_CONVERSION.POINTS_PER_DOLLAR,
        lastUpdated: now,
      }).eq('id', playerId);

      await supabase.from('point_transactions').insert({
        id: crypto.randomUUID(),
        playerId,
        points,
        reason,
        timestamp: now,
        type: 'earned',
      });

      console.log(`✅ تم إضافة ${points} نقطة للاعب ${playerId} - السبب: ${reason}`);
    } catch (error) {
      console.error('خطأ في إضافة النقاط:', error);
      throw error;
    }
  }

  async createReferral(referrerId: string, referralCode: string): Promise<string> {
    try {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const referralData = {
        id,
        referrerId,
        referredId: '',
        referralCode,
        status: 'pending',
        createdAt: now,
        rewards: {
          referrerPoints: POINTS_CONVERSION.REFERRAL_POINTS,
          referredPoints: POINTS_CONVERSION.REFERRED_BONUS_POINTS,
          referrerBadges: [],
        },
      };

      const { error } = await supabase.from('referrals').insert(referralData);
      if (error) throw error;
      console.log(`✅ تم إنشاء إحالة جديدة: ${id}`);
      return id;
    } catch (error) {
      console.error('خطأ في إنشاء الإحالة:', error);
      throw error;
    }
  }

  async completeReferral(referralCode: string, newPlayerId: string): Promise<void> {
    try {
      const { data: referrals } = await supabase.from('referrals')
        .select('*').eq('referralCode', referralCode).eq('status', 'pending').limit(1);

      if (!referrals?.length) throw new Error('كود الإحالة غير صحيح أو منتهي الصلاحية');

      const referralData = referrals[0] as Record<string, unknown>;
      if (referralData.referrerId === newPlayerId) throw new Error('لا يمكن استخدام كود الإحالة لنفس اللاعب');

      const now = new Date().toISOString();
      await supabase.from('referrals').update({ referredId: newPlayerId, status: 'completed', completedAt: now }).eq('id', referralData.id);

      await this.addPointsToPlayer(String(referralData.referrerId), POINTS_CONVERSION.REFERRAL_POINTS, 'إحالة لاعب جديد');
      await this.addPointsToPlayer(newPlayerId, POINTS_CONVERSION.REFERRED_BONUS_POINTS, 'مكافأة انضمام عبر إحالة');

      const { data: rewardRow } = await supabase.from('player_rewards').select('referralCount').eq('id', referralData.referrerId).limit(1);
      const currentCount = Number((rewardRow?.[0] as Record<string, unknown>)?.referralCount || 0);
      await supabase.from('player_rewards').update({ referralCount: currentCount + 1 }).eq('id', referralData.referrerId);

      await this.checkAndAwardBadges(String(referralData.referrerId), 'referral');

      console.log(`✅ تم إكمال الإحالة: ${referralCode} للاعب الجديد: ${newPlayerId}`);
    } catch (error) {
      console.error('خطأ في إكمال الإحالة:', error);
      throw error;
    }
  }

  async checkAndAwardBadges(playerId: string, category: 'referral' | 'video' | 'academy'): Promise<void> {
    try {
      const { data: rewardRows } = await supabase.from('player_rewards').select('*').eq('id', playerId).limit(1);
      if (!rewardRows?.length) return;

      const rewards = rewardRows[0] as PlayerRewards;
      const currentBadges = rewards.badges.map((b: Badge) => b.id);
      const now = new Date().toISOString();

      let badgesToAward: Badge[] = [];

      if (category === 'referral') {
        for (const badge of BADGES.REFERRAL_BADGES) {
          if (rewards.referralCount >= badge.requirement && !currentBadges.includes(badge.id)) {
            badgesToAward.push({ ...badge, earnedAt: now });
          }
        }
      }

      if (badgesToAward.length > 0) {
        await supabase.from('player_rewards').update({ badges: [...rewards.badges, ...badgesToAward] }).eq('id', playerId);
        console.log(`🏆 تم منح ${badgesToAward.length} شارة جديدة للاعب ${playerId}`);
      }
    } catch (error) {
      console.error('خطأ في فحص الشارات:', error);
    }
  }

  async getPlayerReferralStats(playerId: string): Promise<ReferralStats> {
    try {
      const { data: allReferrals } = await supabase.from('referrals').select('*').eq('referrerId', playerId);
      const referrals = (allReferrals ?? []).filter((r: Record<string, unknown>) => r.status === 'completed') as Referral[];

      const { data: rewardRows } = await supabase.from('player_rewards').select('*').eq('id', playerId).limit(1);
      const rewards = rewardRows?.length ? rewardRows[0] as PlayerRewards : null;

      const monthlyReferrals: { [month: string]: number } = {};
      referrals.forEach(referral => {
        const date = new Date(String(referral.createdAt));
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyReferrals[monthKey] = (monthlyReferrals[monthKey] || 0) + 1;
      });

      return {
        playerId,
        totalReferrals: referrals.length,
        completedReferrals: referrals.length,
        totalPointsEarned: rewards?.totalPoints || 0,
        totalEarnings: rewards?.totalEarnings || 0,
        monthlyReferrals,
        topReferrers: [],
      };
    } catch (error) {
      console.error('خطأ في جلب إحصائيات الإحالات:', error);
      throw error;
    }
  }

  async getUserReferralCodes(userId: string): Promise<Referral[]> {
    try {
      const { data } = await supabase.from('referrals').select('*').eq('referrerId', userId);
      return (data ?? []) as Referral[];
    } catch (error) {
      console.error('خطأ في جلب أكواد الإحالة للمستخدم:', error);
      return [];
    }
  }

  async getTopReferrers(limit: number = 10): Promise<ReferralStats['topReferrers']> {
    try {
      const { data: rewards } = await supabase.from('player_rewards').select('*').order('referralCount', { ascending: false }).order('totalEarnings', { ascending: false }).limit(limit);
      const topReferrers = [];

      for (const reward of (rewards ?? []) as Record<string, unknown>[]) {
        const resolvedId = reward.playerId || reward.id;
        const { data: playerRows } = await supabase.from('players').select('full_name, name').eq('id', resolvedId).limit(1);
        const player = playerRows?.[0] as Record<string, unknown> | undefined;

        topReferrers.push({
          playerId: String(resolvedId),
          playerName: String(player?.full_name || player?.name || 'لاعب مجهول'),
          referralCount: Number(reward.referralCount || 0),
          totalEarnings: Number(reward.totalEarnings || 0),
        });
      }

      return topReferrers;
    } catch (error) {
      console.error('خطأ في جلب أفضل المحيلين:', error);
      throw error;
    }
  }

  createReferralLink(referralCode: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/invite/${referralCode}`;
  }

  createShareMessages(referralCode: string, playerName: string): { whatsapp: string; sms: string; email: string; } {
    const referralLink = this.createReferralLink(referralCode);
    const message = `مرحباً! أنا ${playerName} وأدعوك للانضمام إلى منصة كرة القدم الرائدة! 🏆\n\n🎯 احصل على:\n• 5000 نقطة مجانية عند التسجيل\n• خصم 20% على أول اشتراك\n• دروس مجانية من أكاديمية الحلم\n• منتجات رياضية بأسعار مميزة\n\n🔗 انضم الآن: ${referralLink}\n\n#كرة_القدم #منصة_الرياضة`;

    return {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
      sms: `sms:?body=${encodeURIComponent(message)}`,
      email: `mailto:?subject=دعوة للانضمام لمنصة كرة القدم&body=${encodeURIComponent(message)}`,
    };
  }
}

export const referralService = new ReferralService();
