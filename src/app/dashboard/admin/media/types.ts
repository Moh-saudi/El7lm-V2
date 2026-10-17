export type MediaStatus  = 'pending' | 'approved' | 'rejected' | 'flagged';
export type MediaType    = 'video' | 'image';
export type MediaSortKey = 'date_desc' | 'date_asc' | 'name_asc' | 'status' | 'size_desc' | 'type';
export type AccountType = 'player' | 'coach' | 'academy' | 'club' | 'agent' | 'system';

export interface DateFilter {
    from: string; // YYYY-MM-DD
    to:   string; // YYYY-MM-DD
}

export interface FootballSkills {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
}

export interface MediaItem {
    id: string;
    r2Key: string;          // مسار الملف في R2 (للتحديثات)
    fileSize?: number;      // حجم الملف بالبايت
    type: MediaType;
    title: string;
    description: string;
    url: string;
    thumbnailUrl?: string;
    uploadDate: Date;
    status: MediaStatus;
    // بيانات صاحب الوسيط
    userId: string;
    userName: string;
    userEmail: string;
    userPhone?: string;
    userImage?: string;
    accountType: AccountType;
    organization?: string;
    country?: string;
    position?: string;
    age?: number;
    // إحصائيات
    views: number;
    likes: number;
    // metadata
    sourceType: 'r2' | 'firebase';
    category?: string;
    // ملاحظات الإشراف
    notes?: string;
    // تحليل الأداء الرياضي (AI + Human Scout)
    aiAnalysis?: string;
    aiRating?: number;
    aiAnalyzedAt?: Date;
    skills?: FootballSkills;
    overallScore?: number;
    dominantFoot?: string;
    tacticalStrengths?: string[];
    developmentAreas?: string[];
    scoutRecommendation?: string;
}

export interface MediaStats {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    flagged: number;
    videos: number;
    images: number;
}
