export type OpportunityType = 'trial' | 'tryout' | 'training' | 'loan' | 'job' | 'camp' | 'scout' | 'intl';
export type OrganizerType = 'club' | 'academy' | 'agent' | 'trainer' | 'marketer';
export type OpportunityStatus = 'draft' | 'active' | 'closed' | 'cancelled';
export type ApplicationStatus = 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'waitlisted';

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select';
  required: boolean;
  options?: string[];
}

export interface Opportunity {
  id: string;
  organizerId: string;
  organizerType: OrganizerType;
  organizerName: string;
  opportunityType: OpportunityType;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  applicationDeadline: string;
  maxApplicants: number;
  currentApplicants: number;
  targetPositions?: string[];
  ageMin?: number;
  ageMax?: number;
  minRating?: number;
  nationality?: string;
  gender?: 'male' | 'female' | 'both';
  requirements?: string;
  location?: string;
  country?: string;
  city?: string;
  isPaid: boolean;
  fee?: number;
  currency?: string;
  providesAccommodation: boolean;
  providesMeals: boolean;
  providesTransport: boolean;
  compensation?: string;
  coverImage?: string;
  status: OpportunityStatus;
  isActive: boolean;
  isFeatured: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  customFields?: CustomField[];
}

export interface OpportunityApplication {
  id: string;
  opportunityId: string;
  opportunityTitle?: string;
  organizerName?: string;
  organizerType?: string;
  opportunityDeadline?: string;
  playerId: string;
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
    pace?: number;
    shooting?: number;
    passing?: number;
    dribbling?: number;
    defending?: number;
    physical?: number;
  };
  customAnswers?: Record<string, string>;
  message?: string;
  status: ApplicationStatus;
  reviewedBy?: string;
  reviewNote?: string;
  rating?: number;
  ratingComment?: string;
  ratedAt?: string;
  appliedAt: string;
  updatedAt: string;
}
