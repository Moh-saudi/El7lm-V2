export interface Media {
    id: string;
    title: string;
    description: string;
    url: string;
    thumbnailUrl?: string;
    uploadDate: any;
    userId: string;
    userName: string;
    userEmail: string;
    accountType: string;
    organization?: string;
    status: 'pending' | 'approved' | 'rejected' | 'flagged';
    views: number;
    likes: number;
    phone?: string;
    sourceType: 'firebase' | 'r2';
    category?: string;
    country?: string;
    position?: string;
    age?: number;
}
