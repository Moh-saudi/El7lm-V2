export interface Tournament {
  id: string;
  name: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  maxParticipants: number;
  currentParticipants: number;
  entryFee: number;
  isPaid: boolean;
  isActive: boolean;
  feeType: 'individual' | 'club';
  maxPlayersPerClub?: number;
  ageGroups?: string[];
  categories?: string[];
  rules?: string;
  prizes?: string;
  contactInfo?: string;
  logo?: string;
  paymentMethods?: string[];
  paymentDeadline?: string;
  refundPolicy?: string;
  registrations?: TournamentRegistration[];
}

export interface TournamentRegistration {
  id?: string;
  tournamentId: string;
  playerId: string;
  playerName: string;
  playerEmail: string;
  playerPhone: string;
  playerAge: number;
  playerClub: string;
  playerPosition: string;
  registrationDate: Date | any;
  paymentStatus: 'pending' | 'paid' | 'free';
  paymentAmount: number;
  notes?: string;
  registrationType: 'individual' | 'club';
  clubName?: string;
  clubContact?: string;
  clubPlayers?: ClubPlayer[];
  paymentMethod?: string;
  paymentType?: 'immediate' | 'deferred';
}

export interface ClubPlayer {
  name: string;
  birthDate?: string;
  position: string;
  phone: string;
}

export interface RegistrationFormData {
  selectedTournament: string;
  registrationType: 'individual' | 'club';
  playerName: string;
  playerEmail: string;
  playerPhone: string;
  playerAge: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'mobile_wallet' | 'later' | 'immediate' | 'geidea';
  notes: string;
  clubName: string;
  clubContact: string;
  clubPlayers: ClubPlayer[];
}
