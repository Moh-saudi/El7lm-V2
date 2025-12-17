export interface Ad {
    id?: string;
    title: string;
    description: string;
    type: 'video' | 'image' | 'text';
    mediaUrl?: string;
    ctaText?: string;
    ctaUrl?: string;
    customUrl?: string;
    isActive: boolean;
    priority: number;
    targetAudience: 'all' | 'new_users' | 'returning_users';
    startDate?: string;
    endDate?: string;
    createdAt: Date;
    updatedAt: Date;
    views: number;
    clicks: number;
    // Display location - where the ad should appear
    displayLocation?: 'landing' | 'dashboard' | 'player' | 'club' | 'academy' | 'trainer' | 'agent' | 'admin' | 'all';
    // New popup-specific fields
    popupType: 'modal' | 'toast' | 'banner' | 'side-panel';
    displayDelay: number; // seconds
    maxDisplays: number;
    displayFrequency: 'once' | 'daily' | 'weekly' | 'always';
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
    showCloseButton: boolean;
    autoClose?: number; // seconds
    showProgressBar: boolean;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    discount?: string;
    countdown?: string;
}
