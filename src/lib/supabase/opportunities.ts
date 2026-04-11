import { supabase } from '@/lib/supabase/config';
import { Opportunity, OpportunityApplication, ApplicationStatus } from '@/types/opportunities';

export async function getMyOpportunities(organizerId: string, status?: string): Promise<Opportunity[]> {
  try {
    const params = new URLSearchParams({ organizerId });
    if (status) params.set('status', status);
    const res = await fetch(`/api/opportunities?${params}`);
    if (!res.ok) {
      console.error('[getMyOpportunities] API error:', res.status, await res.text());
      return [];
    }
    const { data } = await res.json();
    const results = (data || []) as Opportunity[];
    return results.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  } catch (err) {
    console.error('[getMyOpportunities] fetch error:', err);
    return [];
  }
}

export async function createOpportunity(
  data: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt' | 'currentApplicants' | 'viewCount'>
): Promise<string> {
  const res = await fetch('/api/opportunities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'فشل إنشاء الفرصة');
  return json.id;
}

export async function updateOpportunity(id: string, data: Partial<Opportunity>): Promise<void> {
  const res = await fetch('/api/opportunities', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error || 'فشل تحديث الفرصة');
  }
}

export async function deleteOpportunity(id: string): Promise<void> {
  const res = await fetch(`/api/opportunities?id=${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error || 'فشل حذف الفرصة');
  }
}

export async function getOpportunityById(id: string): Promise<Opportunity | null> {
  const res = await fetch(`/api/opportunities?id=${id}&single=true`);
  if (!res.ok) return null;
  const { data } = await res.json();
  return data?.length ? (data[0] as Opportunity) : null;
}

export async function getOpportunityApplications(
  opportunityId: string,
  status?: string
): Promise<OpportunityApplication[]> {
  const params = new URLSearchParams({ opportunityId });
  if (status) params.set('status', status);
  const res = await fetch(`/api/opportunities/applications?${params}`);
  if (!res.ok) return [];
  const { data } = await res.json();
  const results = (data || []) as OpportunityApplication[];
  return results.sort((a, b) => (b.appliedAt > a.appliedAt ? 1 : -1));
}

export async function getPlayerApplications(playerId: string): Promise<OpportunityApplication[]> {
  const res = await fetch(`/api/opportunities/applications?playerId=${playerId}`);
  if (!res.ok) return [];
  const { data } = await res.json();
  const results = (data || []) as OpportunityApplication[];
  return results.sort((a, b) => (b.appliedAt > a.appliedAt ? 1 : -1));
}

export async function applyToOpportunity(
  opportunityId: string,
  playerId: string,
  data: {
    playerName: string;
    playerPhone?: string;
    playerPosition?: string;
    playerCountry?: string;
    playerNationality?: string;
    playerAge?: number;
    playerHeight?: number;
    playerWeight?: number;
    playerFoot?: string;
    playerCurrentClub?: string;
    playerContractStatus?: string;
    playerAvatarUrl?: string;
    playerStats?: {
      pace?: number; shooting?: number; passing?: number;
      dribbling?: number; defending?: number; physical?: number;
    };
    opportunityTitle?: string;
    organizerName?: string;
    organizerType?: string;
    opportunityDeadline?: string;
    customAnswers?: Record<string, string>;
    message?: string;
  }
): Promise<string> {
  const res = await fetch('/api/opportunities/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ opportunityId, playerId, ...data }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'فشل التقديم على الفرصة');
  return json.id;
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  reviewedBy: string,
  note?: string
): Promise<void> {
  await fetch('/api/opportunities/applications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: applicationId, status, reviewedBy, reviewNote: note }),
  });
}

export async function rateApplication(applicationId: string, rating: number, comment?: string): Promise<void> {
  await fetch('/api/opportunities/applications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: applicationId, rating, ratingComment: comment || '', ratedAt: new Date().toISOString() }),
  });
}

export async function getExploreOpportunities(filters?: {
  type?: string;
  country?: string;
}): Promise<Opportunity[]> {
  try {
    const params = new URLSearchParams({ explore: 'true' });
    if (filters?.type) params.set('type', filters.type);
    if (filters?.country) params.set('country', filters.country);
    const res = await fetch(`/api/opportunities?${params}`);
    if (!res.ok) {
      console.error('[getExploreOpportunities] API error:', res.status, await res.text());
      return [];
    }
    const { data } = await res.json();
    const results = (data || []) as Opportunity[];
    return results.sort((a, b) => {
      if (b.isFeatured !== a.isFeatured) return b.isFeatured ? 1 : -1;
      return b.createdAt > a.createdAt ? 1 : -1;
    });
  } catch (err) {
    console.error('[getExploreOpportunities] fetch error:', err);
    return [];
  }
}

export async function incrementViewCount(id: string): Promise<void> {
  // fire-and-forget through API to bypass RLS
  fetch(`/api/opportunities/${id}/view`, { method: 'POST' }).catch(() => {});
}
