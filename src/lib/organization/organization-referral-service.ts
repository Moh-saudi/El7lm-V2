import { supabase } from '@/lib/supabase/config';
import { OrganizationReferral, PlayerJoinRequest, JoinRequestNotification } from '@/types/organization-referral';

class OrganizationReferralService {
  private normalizeReferralCode(referralCode: string): string {
    return String(referralCode || '').trim().toUpperCase().replace(/\s+/g, '');
  }

  private isReferralUsable(referral: OrganizationReferral): boolean {
    if (referral.isActive !== true) return false;
    const expiresAt = referral.expiresAt ? new Date(referral.expiresAt as string | Date) : null;
    if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) return false;
    const maxUsage = referral.maxUsage == null ? null : Number(referral.maxUsage);
    const currentUsage = Number(referral.currentUsage || 0);
    return maxUsage == null || !Number.isFinite(maxUsage) || currentUsage < maxUsage;
  }

  // توليد كود إحالة فريد للمنظمة
  generateOrganizationReferralCode(orgType: string): string {
    const prefix = this.getOrgPrefix(orgType);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix;
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private getOrgPrefix(orgType: string): string {
    switch (orgType) {
      case 'club': return 'CLB';
      case 'academy': return 'ACD';
      case 'trainer': return 'TRN';
      case 'agent': return 'AGT';
      default: return 'ORG';
    }
  }

  // إنشاء كود إحالة جديد للمنظمة
  async createOrganizationReferral(
    organizationId: string,
    organizationType: string,
    organizationName: string,
    options?: {
      description?: string;
      maxUsage?: number;
      expiresAt?: Date;
    }
  ): Promise<OrganizationReferral> {
    try {
      if (!organizationId || !organizationName) throw new Error('بيانات المنظمة غير مكتملة');
      let referralCode = '';
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const candidate = this.generateOrganizationReferralCode(organizationType);
        const { data: existing, error: lookupError } = await supabase
          .from('organization_referrals')
          .select('id')
          .eq('referralCode', candidate)
          .limit(1);
        if (lookupError) throw lookupError;
        if (!existing?.length) {
          referralCode = candidate;
          break;
        }
      }
      if (!referralCode) throw new Error('تعذر إنشاء كود فريد، حاول مرة أخرى');
      const maxUsage = options?.maxUsage == null ? undefined : Math.max(0, Math.floor(Number(options.maxUsage)));
      if (maxUsage !== undefined && !Number.isFinite(maxUsage)) throw new Error('الحد الأقصى للاستخدام غير صحيح');

      // التحقق من عدم وجود الكود مسبقاً
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const referralData: OrganizationReferral = {
        id,
        organizationId,
        organizationType: organizationType as OrganizationReferral['organizationType'],
        organizationName,
        referralCode,
        inviteLink: `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || ''}/join/org/${referralCode}`,
        description: options?.description || `انضم إلى ${organizationName}`,
        isActive: true,
        maxUsage,
        currentUsage: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: options?.expiresAt
      };

      const { error: insertError } = await supabase.from('organization_referrals').insert({
        ...referralData,
        createdAt: now,
        updatedAt: now,
        expiresAt: options?.expiresAt?.toISOString() || null,
      });
      if (insertError) throw insertError;

      return referralData;
    } catch (error) {
      console.error('خطأ في إنشاء كود الإحالة:', error);
      throw error;
    }
  }

  // البحث عن كود الإحالة
  async findReferralByCode(referralCode: string): Promise<OrganizationReferral | null> {
    try {
      const normalized = this.normalizeReferralCode(referralCode);
      if (!normalized) return null;
      const { data, error } = await supabase
        .from('organization_referrals')
        .select('*')
        .eq('referralCode', normalized)
        .eq('isActive', true)
        .limit(1);

      if (error || !data?.length) return null;
      const referral = data[0] as OrganizationReferral;
      return this.isReferralUsable(referral) ? referral : null;
    } catch (error) {
      console.error('خطأ في البحث عن كود الإحالة:', error);
      return null;
    }
  }

  // التحقق من كود الإحالة (alias for findReferralByCode)
  async verifyReferralCode(referralCode: string): Promise<OrganizationReferral | null> {
    return this.findReferralByCode(referralCode);
  }

  // إنشاء طلب انضمام
  async createJoinRequest(
    playerId: string,
    playerData: Record<string, unknown>,
    referralCode: string
  ): Promise<PlayerJoinRequest> {
    try {
      const normalizedCode = this.normalizeReferralCode(referralCode);
      const referral = await this.findReferralByCode(normalizedCode);

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || authData.user.id !== playerId) {
        throw new Error('يجب استخدام حساب اللاعب الحالي لإرسال طلب الانضمام');
      }

      if (!referral) {
        throw new Error('كود الإحالة غير صحيح أو منتهي الصلاحية');
      }

      if (referral.maxUsage != null && Number(referral.currentUsage || 0) >= Number(referral.maxUsage)) {
        if ((referral.currentUsage || 0) >= Number(referral.maxUsage)) {
          throw new Error('تم الوصول إلى الحد الأقصى لاستخدام هذا الكود');
        }
      }

      // التحقق من أن الحساب المستهدف هو لاعب فقط
      try {
        const [{ data: playersData }, { data: playerData2 }] = await Promise.all([
          supabase.from('players').select('id').eq('id', playerId).limit(1),
          supabase.from('player').select('id').eq('id', playerId).limit(1),
        ]);
        const isPlayerCollection = !!(playersData?.length || playerData2?.length);
        const isPlayerType = (String(playerData?.accountType || '')) === 'player';
        if (!isPlayerCollection && !isPlayerType) {
          throw new Error('كود الانضمام متاح لحسابات اللاعبين فقط');
        }
      } catch (e) {
        if (String(playerData?.accountType || '') !== 'player') {
          throw new Error('كود الانضمام متاح لحسابات اللاعبين فقط');
        }
      }

      // التحقق من عدم وجود طلب سابق معلق
      const { data: existingRequests } = await supabase
        .from('player_join_requests')
        .select('id')
        .eq('playerId', playerId)
        .eq('organizationId', referral.organizationId)
        .eq('status', 'pending')
        .limit(1);

      if (existingRequests?.length) {
        throw new Error('لديك طلب انضمام معلق بالفعل لهذه المنظمة');
      }

      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const joinRequest: PlayerJoinRequest = {
        id,
        playerId,
        playerName: String(playerData.full_name || playerData.name || ''),
        playerEmail: String(playerData.email || ''),
        playerPhone: String(playerData.phone || ''),
        organizationId: referral.organizationId,
        organizationType: referral.organizationType,
        organizationName: referral.organizationName,
        referralCode: normalizedCode,
        status: 'pending',
        requestedAt: new Date(),
        playerData: {
          position: String(playerData.primary_position || playerData.position || ''),
          age: playerData.age as number,
          nationality: String(playerData.nationality || ''),
          experience: String(playerData.experience_years || ''),
        }
      };

      const { error: requestError } = await supabase
        .from('player_join_requests')
        .insert({ ...joinRequest, requestedAt: now });
      if (requestError) throw requestError;

      // تحديث عداد الاستخدام
      const { data: currentReferral } = await supabase
        .from('organization_referrals')
        .select('currentUsage')
        .eq('id', referral.id)
        .limit(1);
      const currentUsage = Number((currentReferral?.[0] as Record<string, unknown>)?.currentUsage || 0);
      let usageUpdate = supabase.from('organization_referrals')
        .update({ currentUsage: currentUsage + 1, updatedAt: now })
        .eq('id', referral.id)
        .eq('currentUsage', currentUsage)
        .eq('isActive', true);
      const maxUsage = referral.maxUsage == null ? null : Number(referral.maxUsage);
      if (maxUsage != null && Number.isFinite(maxUsage)) usageUpdate = usageUpdate.lt('currentUsage', maxUsage);
      const { data: usageRows, error: usageError } = await usageUpdate.select('id');
      if (usageError || !usageRows?.length) {
        await supabase.from('player_join_requests').delete().eq('id', id);
        throw new Error('Referral code usage could not be reserved; please try again');
      }

      // إنشاء إشعار للمنظمة
      await this.createJoinRequestNotification(joinRequest);

      return joinRequest;
    } catch (error) {
      console.error('خطأ في إنشاء طلب الانضمام:', error);
      throw error;
    }
  }

  // إنشاء إشعار طلب الانضمام
  private async createJoinRequestNotification(joinRequest: PlayerJoinRequest): Promise<void> {
    try {
      const now = new Date().toISOString();
      const notification: JoinRequestNotification & { id: string } = {
        id: crypto.randomUUID(),
        organizationId: joinRequest.organizationId,
        organizationType: joinRequest.organizationType,
        requestId: joinRequest.id,
        playerId: joinRequest.playerId,
        playerName: joinRequest.playerName,
        type: 'new_join_request',
        message: `طلب انضمام جديد من اللاعب ${joinRequest.playerName}`,
        isRead: false,
        createdAt: new Date(),
      };

      await supabase.from('join_request_notifications').insert({ ...notification, createdAt: now });
    } catch (error) {
      console.error('خطأ في إنشاء الإشعار:', error);
    }
  }

  // الموافقة على طلب الانضمام
  async approveJoinRequest(
    requestId: string,
    approvedBy: string,
    approverName: string,
    notes?: string
  ): Promise<void> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || authData.user.id !== approvedBy) {
        throw new Error('Authenticated user does not match the approver');
      }
      const { data: requestRows } = await supabase
        .from('player_join_requests')
        .select('*')
        .eq('id', requestId)
        .limit(1);

      if (!requestRows?.length) throw new Error('طلب الانضمام غير موجود');

      const requestData = requestRows[0] as unknown as PlayerJoinRequest;

      if (requestData.status !== 'pending') throw new Error('طلب الانضمام تم معالجته مسبقاً');

      const now = new Date().toISOString();
      const { error: updateError } = await supabase.from('player_join_requests').update({
        status: 'approved',
        processedAt: now,
        processedBy: approvedBy,
        notes: notes || '',
      }).eq('id', requestId);
      if (updateError) throw updateError;

      await this.linkPlayerToOrganization({ ...requestData, processedBy: approvedBy } as PlayerJoinRequest & { processedBy: string });
      await this.createPlayerNotification(requestData, 'approved', approverName);
    } catch (error) {
      console.error('خطأ في الموافقة على الطلب:', error);
      throw error;
    }
  }

  // ربط اللاعب بالمنظمة
  private async linkPlayerToOrganization(requestData: PlayerJoinRequest & { processedBy?: string }): Promise<void> {
    try {
      const organizationIdFields: Record<string, string[]> = {
        club: ['club_id', 'clubId'],
        academy: ['academy_id', 'academyId'],
        trainer: ['trainer_id', 'trainerId'],
        agent: ['agent_id', 'agentId'],
      };
      const orgIdFields = organizationIdFields[requestData.organizationType];
      if (!orgIdFields) throw new Error('نوع المنظمة غير مدعوم');
      const now = new Date().toISOString();
      const updateData: Record<string, unknown> = {
        organizationId: requestData.organizationId,
        organizationType: requestData.organizationType,
        organizationName: requestData.organizationName,
        joinRequestId: requestData.id,
        joinRequestStatus: 'approved',
        joinedViaReferral: true,
        referralCodeUsed: requestData.referralCode,
        organizationJoinedAt: now,
        organizationApprovedBy: { userId: requestData.processedBy, approvedAt: now },
        updatedAt: now,
      };
      for (const field of orgIdFields) updateData[field] = requestData.organizationId;

      // البحث عن اللاعب في مجموعتين
      for (const tableName of ['players', 'player']) {
        const { data } = await supabase.from(tableName).select('id').eq('id', requestData.playerId).limit(1);
        if (data?.length) {
          const { error: updateError } = await supabase.from(tableName).update(updateData).eq('id', requestData.playerId);
          if (updateError) throw updateError;
          break;
        }
      }
    } catch (error) {
      console.error('خطأ في ربط اللاعب بالمنظمة:', error);
      throw error;
    }
  }

  // إنشاء إشعار للاعب
  private async createPlayerNotification(
    requestData: PlayerJoinRequest,
    type: 'approved' | 'rejected',
    processorName: string
  ): Promise<void> {
    try {
      const message = type === 'approved'
        ? `تم قبول طلب انضمامك إلى ${requestData.organizationName}`
        : `تم رفض طلب انضمامك إلى ${requestData.organizationName}`;

      await supabase.from('player_notifications').insert({
        id: crypto.randomUUID(),
        playerId: requestData.playerId,
        organizationId: requestData.organizationId,
        organizationName: requestData.organizationName,
        type: `request_${type}`,
        message,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('خطأ في إنشاء إشعار اللاعب:', error);
    }
  }

  // رفض طلب الانضمام
  async rejectJoinRequest(
    requestId: string,
    rejectedBy: string,
    rejectorName: string,
    reason?: string
  ): Promise<void> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || authData.user.id !== rejectedBy) {
        throw new Error('Authenticated user does not match the rejector');
      }
      const now = new Date().toISOString();
      const { error: updateError } = await supabase.from('player_join_requests').update({
        status: 'rejected',
        processedAt: now,
        processedBy: rejectedBy,
        notes: reason || '',
      }).eq('id', requestId);
      if (updateError) throw updateError;

      const { data } = await supabase.from('player_join_requests').select('*').eq('id', requestId).limit(1);
      if (data?.length) {
        await this.createPlayerNotification(data[0] as unknown as PlayerJoinRequest, 'rejected', rejectorName);
      }
    } catch (error) {
      console.error('خطأ في رفض الطلب:', error);
      throw error;
    }
  }

  // جلب طلبات الانضمام للمنظمة
  async getOrganizationJoinRequests(
    organizationId: string,
    status?: string
  ): Promise<PlayerJoinRequest[]> {
    try {
      let query = supabase
        .from('player_join_requests')
        .select('*')
        .eq('organizationId', organizationId);

      if (status) query = query.eq('status', status);

      const { data } = await query;
      const requests = (data || []) as unknown as PlayerJoinRequest[];

      return requests.sort((a, b) => {
        const dateA = a.requestedAt instanceof Date ? a.requestedAt : new Date(a.requestedAt as unknown as string);
        const dateB = b.requestedAt instanceof Date ? b.requestedAt : new Date(b.requestedAt as unknown as string);
        return dateB.getTime() - dateA.getTime();
      });
    } catch (error) {
      console.error('خطأ في جلب طلبات الانضمام:', error);
      return [];
    }
  }

  // جلب طلبات الانضمام الخاصة بلاعب معين
  async getPlayerJoinRequests(
    playerId: string,
    status?: string
  ): Promise<PlayerJoinRequest[]> {
    try {
      let query = supabase
        .from('player_join_requests')
        .select('*')
        .eq('playerId', playerId);

      if (status) query = query.eq('status', status);

      const { data } = await query;
      const requests = (data || []) as unknown as PlayerJoinRequest[];

      return requests.sort((a, b) => {
        const dateA = a.requestedAt instanceof Date ? a.requestedAt : new Date(a.requestedAt as unknown as string);
        const dateB = b.requestedAt instanceof Date ? b.requestedAt : new Date(b.requestedAt as unknown as string);
        return dateB.getTime() - dateA.getTime();
      });
    } catch (error) {
      console.error('خطأ في جلب طلبات انضمام اللاعب:', error);
      return [];
    }
  }

  // جلب أكواد الإحالة للمنظمة
  async getOrganizationReferrals(organizationId: string): Promise<OrganizationReferral[]> {
    try {
      const { data } = await supabase
        .from('organization_referrals')
        .select('*')
        .eq('organizationId', organizationId)
        .order('createdAt', { ascending: false });

      return (data || []) as OrganizationReferral[];
    } catch (error) {
      console.error('خطأ في جلب أكواد الإحالة:', error);
      return [];
    }
  }

  // تحديث بيانات كود الإحالة
  async updateOrganizationReferral(
    referralId: string,
    organizationId: string,
    updates: {
      referralCode?: string;
      isActive?: boolean;
      maxUsage?: number;
      description?: string;
      expiresAt?: Date | null;
    }
  ): Promise<OrganizationReferral> {
    try {
      const { data: rows } = await supabase
        .from('organization_referrals')
        .select('*')
        .eq('id', referralId)
        .limit(1);

      if (!rows?.length) throw new Error('كود الإحالة غير موجود');
      const data = rows[0] as OrganizationReferral;
      if (data.organizationId !== organizationId) throw new Error('صلاحيات غير كافية');

      const now = new Date().toISOString();
      const updateData: Record<string, unknown> = { updatedAt: now };

      if (updates.referralCode && updates.referralCode !== data.referralCode) {
        const newCode = updates.referralCode.toUpperCase().replace(/\s+/g, '');
        const { data: existing } = await supabase
          .from('organization_referrals')
          .select('id')
          .eq('referralCode', newCode)
          .limit(1);
        if (existing?.length && (existing[0] as Record<string, unknown>).id !== referralId) {
          throw new Error('الكود مستخدم بالفعل');
        }
        updateData.referralCode = newCode;
        updateData.inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/join/org/${newCode}`;
      }

      if (typeof updates.isActive === 'boolean') updateData.isActive = updates.isActive;
      if (typeof updates.maxUsage === 'number') updateData.maxUsage = updates.maxUsage;
      if (typeof updates.description === 'string') updateData.description = updates.description;
      if (updates.expiresAt === null) updateData.expiresAt = null;
      else if (updates.expiresAt) updateData.expiresAt = updates.expiresAt.toISOString();

      await supabase.from('organization_referrals').update(updateData).eq('id', referralId);

      const { data: updated } = await supabase.from('organization_referrals').select('*').eq('id', referralId).limit(1);
      return (updated?.[0] || { ...data, ...updateData }) as OrganizationReferral;
    } catch (error) {
      console.error('خطأ في تحديث كود الإحالة:', error);
      throw error;
    }
  }
}

export const organizationReferralService = new OrganizationReferralService();
