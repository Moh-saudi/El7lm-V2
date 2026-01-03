export interface MessageTemplate {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    description: string;
}

export interface NotificationUser {
    id: string;
    displayName: string | null;
    email: string | null;
    phone: string | null;
    accountType: string;
    isActive?: boolean;
    avatar?: string;
    createdAt?: any;
}

export interface NotificationForm {
    title: string;
    message: string;
    type: string;
    priority: string;
    targetType: string;
    accountTypes: string[];
    selectedUsers: string[];
    customNumbers: string;
    sendMethods: {
        inApp: boolean;
        sms: boolean;
        whatsapp: boolean;
    };
    scheduleType: 'immediate' | 'scheduled';
    scheduledDate?: string;
    scheduledTime?: string;
}
