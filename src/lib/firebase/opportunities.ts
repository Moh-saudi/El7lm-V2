import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Opportunity, OpportunityApplication, ApplicationStatus } from '@/types/opportunities';

export async function getMyOpportunities(organizerId: string, status?: string): Promise<Opportunity[]> {
  const constraints: any[] = [where('organizerId', '==', organizerId)];
  if (status) constraints.push(where('status', '==', status));
  const q = query(collection(db, 'opportunities'), ...constraints);
  const snap = await getDocs(q);
  const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Opportunity));
  return results.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}

export async function createOpportunity(
  data: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt' | 'currentApplicants' | 'viewCount'>
): Promise<string> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'opportunities'), {
    ...data,
    currentApplicants: 0,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateOpportunity(id: string, data: Partial<Opportunity>): Promise<void> {
  await updateDoc(doc(db, 'opportunities', id), { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteOpportunity(id: string): Promise<void> {
  await deleteDoc(doc(db, 'opportunities', id));
}

export async function getOpportunityById(id: string): Promise<Opportunity | null> {
  const snap = await getDoc(doc(db, 'opportunities', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Opportunity;
}

export async function getOpportunityApplications(
  opportunityId: string,
  status?: string
): Promise<OpportunityApplication[]> {
  const constraints: any[] = [where('opportunityId', '==', opportunityId)];
  if (status) constraints.push(where('status', '==', status));
  const q = query(collection(db, 'opportunity_applications'), ...constraints);
  const snap = await getDocs(q);
  const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as OpportunityApplication));
  return results.sort((a, b) => (b.appliedAt > a.appliedAt ? 1 : -1));
}

export async function getPlayerApplications(playerId: string): Promise<OpportunityApplication[]> {
  const q = query(
    collection(db, 'opportunity_applications'),
    where('playerId', '==', playerId)
  );
  const snap = await getDocs(q);
  const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as OpportunityApplication));
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
  const dupQ = query(
    collection(db, 'opportunity_applications'),
    where('opportunityId', '==', opportunityId),
    where('playerId', '==', playerId)
  );
  const dupSnap = await getDocs(dupQ);
  if (!dupSnap.empty) {
    throw new Error('لقد تقدمت لهذه الفرصة مسبقاً');
  }

  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'opportunity_applications'), {
    opportunityId,
    playerId,
    ...data,
    status: 'pending',
    appliedAt: now,
    updatedAt: now,
  });
  await updateDoc(doc(db, 'opportunities', opportunityId), {
    currentApplicants: increment(1),
  });
  return docRef.id;
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  reviewedBy: string,
  note?: string
): Promise<void> {
  const payload: any = {
    status,
    reviewedBy,
    updatedAt: new Date().toISOString(),
  };
  if (note) payload.reviewNote = note;
  await updateDoc(doc(db, 'opportunity_applications', applicationId), payload);
}

export async function rateApplication(applicationId: string, rating: number, comment?: string): Promise<void> {
  await updateDoc(doc(db, 'opportunity_applications', applicationId), {
    rating,
    ratingComment: comment || '',
    ratedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function getExploreOpportunities(filters?: {
  type?: string;
  country?: string;
}): Promise<Opportunity[]> {
  const constraints: any[] = [
    where('status', '==', 'active'),
    where('isActive', '==', true),
  ];
  if (filters?.type) constraints.push(where('opportunityType', '==', filters.type));
  if (filters?.country) constraints.push(where('country', '==', filters.country));
  const q = query(collection(db, 'opportunities'), ...constraints);
  const snap = await getDocs(q);
  const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Opportunity));
  // Sort: featured first, then newest
  return results.sort((a, b) => {
    if (b.isFeatured !== a.isFeatured) return b.isFeatured ? 1 : -1;
    return b.createdAt > a.createdAt ? 1 : -1;
  });
}

export async function incrementViewCount(id: string): Promise<void> {
  await updateDoc(doc(db, 'opportunities', id), { viewCount: increment(1) });
}
