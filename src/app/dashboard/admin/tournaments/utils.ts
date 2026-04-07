
export interface Tournament {
    id?: string;
    name: string;
    description: string;
    location: string;
    locationUrl?: string;
    startDate: string;
    endDate: string;
    registrationDeadline: string;
    maxParticipants: number;
    currentParticipants: number;
    entryFee: number;
    currency: string;
    isPaid: boolean;
    isActive: boolean;
    ageGroups: string[];
    categories: string[];
    rules: string;
    prizes: string;
    contactInfo: string;
    logo?: string;
    paymentMethods: string[];
    paymentDeadline: string;
    refundPolicy: string;
    feeType: 'individual' | 'club';
    maxPlayersPerClub?: number;
    allowInstallments?: boolean;
    installmentsCount?: number;
    installmentsDetails?: string;
    country?: string;  // Added for country selection
    walletName?: string; // Added for wallet name (e.g. Vodafone Cash)
    walletNumber?: string; // Added for wallet number
    createdAt: Date;
    updatedAt: Date;
    registrations: TournamentRegistration[];
}

export interface TournamentRegistration {
    id?: string;
    playerId: string;
    playerName: string;
    playerEmail: string;
    playerPhone: string;
    playerAge: number;
    playerClub: string;
    playerPosition: string;
    registrationDate: Date;
    paymentStatus: 'pending' | 'paid' | 'free';
    paymentAmount: number;
    notes?: string;
    registrationType?: 'individual' | 'club';
    clubName?: string;
    clubContact?: string;
    accountType?: 'player' | 'club' | 'coach' | 'academy' | 'agent' | 'marketer' | 'parent';
    accountName?: string;
    accountEmail?: string;
    accountPhone?: string;
    organizationName?: string;
    organizationType?: string;
    paymentMethod?: 'mobile_wallet' | 'card' | 'later';
    mobileWalletProvider?: string;
    mobileWalletNumber?: string;
    receiptUrl?: string;
    receiptNumber?: string;
}

export const getCurrencySymbol = (currency: string): string => {
    const currencySymbols: Record<string, string> = {
        'USD': '$',
        'EGP': 'ج.م',
        'EUR': '€',
        'GBP': '£',
        'SAR': 'ر.س',
        'AED': 'د.إ',
        'KWD': 'د.ك',
        'QAR': 'ر.ق',
        'BHD': 'د.ب',
        'OMR': 'ر.ع',
        'JOD': 'د.أ',
        'LBP': 'ل.ل',
        'TND': 'د.ت',
        'DZD': 'د.ج',
        'MAD': 'د.م',
        'LYD': 'د.ل',
        'TRY': '₺',
        'RUB': '₽',
        'CNY': '¥',
        'JPY': '¥',
        'INR': '₹',
        'AUD': 'A$',
        'CAD': 'C$',
        'CHF': 'CHF',
        'NZD': 'NZ$',
        'ZAR': 'R',
        'BRL': 'R$',
        'MXN': '$',
        'SGD': 'S$',
        'HKD': 'HK$',
        'SEK': 'kr',
        'NOK': 'kr',
        'DKK': 'kr',
        'PLN': 'zł',
        'ILS': '₪',
        'THB': '฿',
        'MYR': 'RM'
    };
    return currencySymbols[currency] || currency;
};

// دالة لتنسيق التاريخ بصيغة DD/MM/YYYY (ميلادي فقط)
export const formatDate = (date: any) => {
    if (!date) return 'غير محدد';
    try {
        let d: Date;
        if (date instanceof Date) {
            d = date;
        } else {
            d = new Date(date);
        }

        if (isNaN(d.getTime())) {
            return 'غير محدد';
        }

        // صيغة DD/MM/YYYY (ميلادي فقط)
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        return `${day}/${month}/${year}`;
    } catch (error) {
        return 'غير محدد';
    }
};
