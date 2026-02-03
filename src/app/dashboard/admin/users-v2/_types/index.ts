/**
 * تعريفات صفحة إدارة المستخدمين
 */

// أنواع الحسابات
export type AccountType = 'player' | 'club' | 'academy' | 'trainer' | 'agent' | 'marketer' | 'parent' | 'admin';

// حالة التحقق
export type VerificationStatus = 'verified' | 'pending' | 'rejected';

// حالة الحساب
export type AccountStatus = 'active' | 'suspended' | 'deleted';

// المستخدم
export interface User {
    id: string;
    uid: string;
    name: string;
    email: string;
    phone: string;
    accountType: AccountType;
    status: AccountStatus;
    isActive: boolean;
    isDeleted: boolean;
    verificationStatus: VerificationStatus;
    profileCompletion: number;
    country: string;
    countryCode: string;
    city: string;
    createdAt: Date | null;
    lastLogin: Date | null;
    parentAccountId?: string;
    parentAccountType?: string;
    parentOrganizationName?: string;
    suspendReason?: string;
    suspendedAt?: Date;
    profileImage?: string;
}

// إحصائيات المستخدمين
export interface UsersStats {
    total: number;
    active: number;
    suspended: number;
    deleted: number;
    byType: Record<AccountType, number>;
    byCountry: Record<string, number>;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
}

// فلاتر البحث
export interface UsersFilters {
    search: string;
    accountType: AccountType | 'all';
    status: AccountStatus | 'all';
    verification: VerificationStatus | 'all';
    country: string;
    dateRange: [Date | null, Date | null];
    profileCompletion: 'all' | 'complete' | 'incomplete';
}

// صلاحيات الموظفين
export type EmployeeRole = 'admin' | 'manager' | 'support' | 'moderator';

export interface Permission {
    view: boolean;
    edit: boolean;
    delete: boolean;
    suspend: boolean;
    message: boolean;
    export: boolean;
    bulkActions: boolean;
}

export const ROLE_PERMISSIONS: Record<EmployeeRole, Permission> = {
    admin: {
        view: true,
        edit: true,
        delete: true,
        suspend: true,
        message: true,
        export: true,
        bulkActions: true,
    },
    manager: {
        view: true,
        edit: true,
        delete: false,
        suspend: true,
        message: true,
        export: true,
        bulkActions: true,
    },
    support: {
        view: true,
        edit: false,
        delete: false,
        suspend: false,
        message: true,
        export: false,
        bulkActions: false,
    },
    moderator: {
        view: true,
        edit: false,
        delete: false,
        suspend: false,
        message: false,
        export: false,
        bulkActions: false,
    },
};

// ثوابت
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
    player: 'لاعب',
    club: 'نادي',
    academy: 'أكاديمية',
    trainer: 'مدرب',
    agent: 'وكيل',
    marketer: 'مسوق',
    parent: 'ولي أمر',
    admin: 'مسؤول',
};

export const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
    player: 'blue',
    club: 'green',
    academy: 'purple',
    trainer: 'orange',
    agent: 'cyan',
    marketer: 'magenta',
    parent: 'gold',
    admin: 'red',
};

export const STATUS_LABELS: Record<AccountStatus, string> = {
    active: 'نشط',
    suspended: 'موقوف',
    deleted: 'محذوف',
};

export const STATUS_COLORS: Record<AccountStatus, string> = {
    active: 'success',
    suspended: 'warning',
    deleted: 'error',
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
    verified: 'موثق',
    pending: 'قيد المراجعة',
    rejected: 'مرفوض',
};

export const VERIFICATION_COLORS: Record<VerificationStatus, string> = {
    verified: 'success',
    pending: 'processing',
    rejected: 'error',
};
