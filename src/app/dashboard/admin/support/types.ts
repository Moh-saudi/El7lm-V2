export interface SupportConversation {
    id: string;
    userId: string;
    userName: string;
    userType: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: string;
    lastMessage: string;
    lastMessageTime: any;
    unreadCount: number;
    assignedTo?: string;
    createdAt: any;
    updatedAt: any;
}

export interface SupportMessage {
    id: string;
    conversationId: string;
    senderId: string;
    senderName: string;
    senderType: string;
    message: string;
    timestamp: any;
    isRead: boolean;
}

export interface SupportStatsData {
    totalConversations: number;
    openConversations: number;
    inProgressConversations: number;
    resolvedToday: number;
    avgResponseTime: string;
}
