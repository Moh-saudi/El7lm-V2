import { supabase } from '@/lib/supabase/config';
import { Opportunity, OpportunityApplication, ApplicationStatus } from '@/types/opportunities';

export async function getMyOpportunities(organizerId: string, status?: string): Promise<Opportunity[]> {
  let query = supabase.from('opportunities').select('*').eq('organizerId', organizerId);
  if (status) query = query.eq('status', status);
  const { data } = await query;
  const results = (data || []) as Opportunity[];
  return results.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}

export async function createOpportunity(
  data: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt' | 'currentApplicants' | 'viewCount'>
): Promise<string> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const { error } = await supabase.from('opportunities').insert({
    id,
    ...data,
    currentApplicants: 0,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  if (error) throw new Error(error.message);
  return id;
}


export async function updateOpportunity(id: string, data: Partial<Opportunity>): Promise<void> {
  await supabase.from('opportunities').update({ ...data, updatedAt: new Date().toISOString() }).eq('id', id);
}

export async function deleteOpportunity(id: string): Promise<void> {
  await supabase.from('opportunities').delete().eq('id', id);
}

export async function getOpportunityById(id: string): Promise<Opportunity | null> {
  const { data } = await supabase.from('opportunities').select('*').eq('id', id).limit(1);
  return data?.length ? (data[0] as Opportunity) : null;
}

export async function getOpportunityApplications(
  opportunityId: string,
  status?: string
): Promise<OpportunityApplication[]> {
  let query = supabase.from('opportunity_applications').select('*').eq('opportunityId', opportunityId);
  if (status) query = query.eq('status', status);
  const { data } = await query;
  const results = (data || []) as OpportunityApplication[];
  return results.sort((a, b) => (b.appliedAt > a.appliedAt ? 1 : -1));
}

export async function getPlayerApplications(playerId: string): Promise<OpportunityApplication[]> {
  const { data } = await supabase.from('opportunity_applications').select('*').eq('playerId', playerId);
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
  // Check duplicate application
  const { data: dupData } = await supabase
    .from('opportunity_applications')
    .select('id')
    .eq('opportunityId', opportunityId)
    .eq('playerId', playerId)
    .limit(1);

  if (dupData?.length) throw new Error('لقد تقدمت لهذه الفرصة مسبقاً');

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await supabase.from('opportunity_applications').insert({
    id,
    opportunityId,
    playerId,
    ...data,
    status: 'pending',
    appliedAt: now,
    updatedAt: now,
  });

  // increment currentApplicants
  const { data: oppData } = await supabase.from('opportunities').select('currentApplicants').eq('id', opportunityId).limit(1);
  const current = Number((oppData?.[0] as Record<string, unknown>)?.currentApplicants || 0);
  await supabase.from('opportunities').update({ currentApplicants: current + 1 }).eq('id', opportunityId);

  return id;
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  reviewedBy: string,
  note?: string
): Promise<void> {
  const payload: Record<string, unknown> = { status, reviewedBy, updatedAt: new Date().toISOString() };
  if (note) payload.reviewNote = note;
  await supabase.from('opportunity_applications').update(payload).eq('id', applicationId);
}

export async function rateApplication(applicationId: string, rating: number, comment?: string): Promise<void> {
  await supabase.from('opportunity_applications').update({
    rating,
    ratingComment: comment || '',
    ratedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).eq('id', applicationId);
}

export async function getExploreOpportunities(filters?: {
  type?: string;
  country?: string;
}): Promise<Opportunity[]> {
  let query = supabase.from('opportunities').select('*').eq('status', 'active').eq('isActive', true);
  if (filters?.type) query = query.eq('opportunityType', filters.type);
  if (filters?.country) query = query.eq('country', filters.country);
  const { data } = await query;
  const results = (data || []) as Opportunity[];
  return results.sort((a, b) => {
    if (b.isFeatured !== a.isFeatured) return b.isFeatured ? 1 : -1;
    return b.createdAt > a.createdAt ? 1 : -1;
  });
}

export async function incrementViewCount(id: string): Promise<void> {
  const { data } = await supabase.from('opportunities').select('viewCount').eq('id', id).limit(1);
  const current = Number((data?.[0] as Record<string, unknown>)?.viewCount || 0);
  await supabase.from('opportunities').update({ viewCount: current + 1 }).eq('id', id);
}
