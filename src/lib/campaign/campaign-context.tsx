'use client';
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/config';
import { ChatAmanService } from '@/lib/services/chataman-service';

export interface CampaignUser {
  id: string;
  name: string;
  phone: string;
  role: string;
  country: string;
}

export type VarSource = 'account_name' | 'country' | 'role' | 'custom';
export interface VarMapping { source: VarSource; customValue?: string; }

export interface FailedEntry { phone: string; name: string; reason?: string; }

export interface CampaignState {
  status: 'idle' | 'running' | 'completed';
  progress: number;               // 0-100
  total: number;
  success: number;
  failed: number;
  failedEntries: FailedEntry[];
  templateName: string;
  templateBody: string;
  segment: string;
  countries: string[];
  startedAt: Date | null;
  finishedAt: Date | null;
  logDocId: string | null;        // Firestore doc id
}

const ROLE_LABELS: Record<string, string> = {
  player: 'لاعب', club: 'نادي', academy: 'أكاديمية',
  trainer: 'مدرب', agent: 'وكيل', parent: 'ولي أمر',
};

const INITIAL: CampaignState = {
  status: 'idle', progress: 0, total: 0, success: 0, failed: 0,
  failedEntries: [], templateName: '', templateBody: '', segment: '',
  countries: [], startedAt: null, finishedAt: null, logDocId: null,
};

interface CampaignContextValue {
  campaign: CampaignState;
  startCampaign: (
    users: CampaignUser[],
    templateName: string,
    templateBody: string,
    templateLanguage: string,
    varMappings: VarMapping[],
    segment: string,
    countries: string[],
  ) => Promise<void>;
  dismissResult: () => void;
}

const CampaignContext = createContext<CampaignContextValue | null>(null);

const FALLBACK: CampaignContextValue = {
  campaign: INITIAL,
  startCampaign: async () => {},
  dismissResult: () => {},
};

export const useCampaign = () => {
  const ctx = useContext(CampaignContext);
  return ctx ?? FALLBACK;
};

export const CampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [campaign, setCampaign] = useState<CampaignState>(INITIAL);
  const cancelRef = useRef(false);

  const resolveVar = (mapping: VarMapping, user: CampaignUser): string => {
    switch (mapping.source) {
      case 'account_name': return user.name || '';
      case 'country':      return user.country || '';
      case 'role':         return ROLE_LABELS[user.role] || user.role || '';
      case 'custom':       return mapping.customValue || '';
    }
  };

  const startCampaign = useCallback(async (
    users: CampaignUser[],
    templateName: string,
    templateBody: string,
    templateLanguage: string,
    varMappings: VarMapping[],
    segment: string,
    countries: string[],
  ) => {
    if (campaign.status === 'running') return;
    cancelRef.current = false;

    // Save initial log to Supabase
    let logDocId: string | null = null;
    try {
      logDocId = crypto.randomUUID();
      const { error } = await supabase.from('campaign_logs').insert({
        id: logDocId,
        templateName,
        templateBody,
        segment,
        countries,
        total: users.length,
        success: 0,
        failed: 0,
        failedEntries: [],
        status: 'running',
        startedAt: new Date().toISOString(),
        finishedAt: null,
        varMappings,
      });
      if (error) { console.warn('Failed to create campaign log:', error); logDocId = null; }
    } catch (e) {
      console.warn('Failed to create campaign log:', e);
      logDocId = null;
    }

    setCampaign({
      status: 'running', progress: 0,
      total: users.length, success: 0, failed: 0, failedEntries: [],
      templateName, templateBody, segment, countries,
      startedAt: new Date(), finishedAt: null, logDocId,
    });

    let successCount = 0;
    let failCount = 0;
    const failedEntries: FailedEntry[] = [];

    for (let i = 0; i < users.length; i++) {
      if (cancelRef.current) break;
      const user = users[i];

      // Skip users with no phone
      if (!user.phone || user.phone.trim().length < 5) {
        failCount++;
        failedEntries.push({ phone: user.phone || '—', name: user.name, reason: 'رقم هاتف غير موجود' });
        setCampaign(prev => ({ ...prev, progress: Math.floor(((i + 1) / users.length) * 100), failed: failCount, failedEntries: [...failedEntries] }));
        continue;
      }

      const bodyParams = varMappings.map((m, idx) => {
        const val = resolveVar(m, user);
        if (!val && m.source !== 'custom') {
          console.warn(`⚠️ متغير {{${idx + 1}}} فارغ للمستخدم "${user.name}" (المصدر: ${m.source})`);
        }
        return val;
      });

      // Warn about empty params
      const emptyParams = bodyParams.map((v, i) => v ? null : `{{${i+1}}}`).filter(Boolean);

      try {
        const res = await ChatAmanService.sendTemplate(user.phone, templateName, {
          language: templateLanguage || 'ar',
          bodyParams,
        });
        if (res.success) {
          successCount++;
        } else {
          failCount++;
          const reason = emptyParams.length
            ? `قيم فارغة: ${emptyParams.join(', ')} — ${res.error || 'فشل'}`
            : (res.error || 'فشل الإرسال');
          failedEntries.push({ phone: user.phone, name: user.name, reason });
        }
      } catch (e: any) {
        failCount++;
        failedEntries.push({ phone: user.phone, name: user.name, reason: e?.message || 'خطأ غير معروف' });
      }

      const progress = Math.floor(((i + 1) / users.length) * 100);
      setCampaign(prev => ({
        ...prev,
        progress,
        success: successCount,
        failed: failCount,
        failedEntries: [...failedEntries],
      }));

      await new Promise(r => setTimeout(r, 3000));
    }

    const finishedAt = new Date();
    setCampaign(prev => ({
      ...prev,
      status: 'completed', progress: 100,
      success: successCount, failed: failCount,
      failedEntries: [...failedEntries], finishedAt,
    }));

    // Update Supabase log
    if (logDocId) {
      try {
        await supabase.from('campaign_logs').update({
          success: successCount,
          failed: failCount,
          failedEntries,
          status: 'completed',
          finishedAt: new Date().toISOString(),
        }).eq('id', logDocId);
      } catch (e) {
        console.warn('Failed to update campaign log:', e);
      }
    }
  }, [campaign.status]);

  const dismissResult = useCallback(() => {
    setCampaign(INITIAL);
  }, []);

  return (
    <CampaignContext.Provider value={{ campaign, startCampaign, dismissResult }}>
      {children}
    </CampaignContext.Provider>
  );
};
