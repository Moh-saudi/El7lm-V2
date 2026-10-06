/**
 * Hook لجلب المستخدمين من Supabase
 * تم تحسينه للعمل بكفاءة فائقة مع 10,000 مستخدم
 * يعتمد على جدول users القانوني الموحد (Canonical Identity Table)
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/config';
import { User, UsersStats, UsersFilters, AccountType, AccountStatus } from '../_types';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

// تحويل قيمة التاريخ إلى Date
const toDate = (value: any): Date | null => {
    if (!value) return null;
    if (value._seconds) return new Date(value._seconds * 1000);
    if (value instanceof Date) return value;
    if (typeof value === 'string') return new Date(value);
    return null;
};

// حساب نسبة اكتمال الملف الشخصي
const calculateProfileCompletion = (data: any): number => {
    const requiredFields = ['full_name', 'name', 'email', 'phone', 'country', 'city'];
    const filledFields = requiredFields.filter(field => data[field] && data[field].toString().trim() !== '');
    return Math.round((filledFields.length / requiredFields.length) * 100);
};

export function useUsers(initialLimit = 2000) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<UsersStats>({
        total: 0,
        active: 0,
        suspended: 0,
        deleted: 0,
        byType: {} as Record<AccountType, number>,
        byCountry: {},
        newToday: 0,
        newThisWeek: 0,
        newThisMonth: 0,
    });

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const userSelectColumns = `
                    id,
                    uid,
                    name,
                    full_name,
                    displayName,
                    email,
                    phone,
                    phoneNumber,
                    accountType,
                    role,
                    isActive,
                    isDeleted,
                    country,
                    countryCode,
                    city,
                    createdAt,
                    created_at,
                    registrationDate,
                    lastLogin,
                    profile_image,
                    avatar,
                    isSynced,
                    isGoogleUser,
                    suspensionReason,
                    suspendedAt,
                    academyId,
                    clubId
            `;

            // جلب المستخدمين عبر شريحتين متوازيتين لتخطي سقف PostgREST الافتراضي (1000 صف لكل طلب)
            const [batch1, batch2] = await Promise.all([
                supabase
                    .from('users')
                    .select(userSelectColumns)
                    .order('created_at', { ascending: false })
                    .range(0, 999),
                supabase
                    .from('users')
                    .select(userSelectColumns)
                    .order('created_at', { ascending: false })
                    .range(1000, 1999),
            ]);

            if (batch1.error) throw batch1.error;
            if (batch2.error) throw batch2.error;

            const data = [...(batch1.data || []), ...(batch2.data || [])];

            const allUsers: User[] = (data || []).map((row: any) => {
                const id = row.id || row.uid;
                const accountType = (row.accountType || row.role || 'player') as AccountType;
                const isDeleted = Boolean(row.isDeleted);
                const isActive = row.isActive !== false;
                const status: AccountStatus = isDeleted ? 'deleted' : (!isActive ? 'suspended' : 'active');

                // تحسين حجم الذاكرة: تجنب نصوص base64 الطويلة في الـ listings
                let profileImage = '';
                if (typeof row.profile_image === 'string' && row.profile_image.length < 1000) {
                    profileImage = row.profile_image;
                } else if (typeof row.avatar === 'string' && row.avatar.length < 1000) {
                    profileImage = row.avatar;
                }

                const userData: User = {
                    id,
                    uid: id,
                    name: row.full_name || row.displayName || row.name || 'غير محدد',
                    email: row.email || '',
                    phone: row.phone || row.phoneNumber || '',
                    accountType,
                    status,
                    isActive,
                    isDeleted,
                    verificationStatus: row.verificationStatus || (row.isVerified ? 'verified' : 'pending'),
                    profileCompletion: calculateProfileCompletion(row),
                    country: row.country || '',
                    countryCode: row.countryCode || '',
                    city: row.city || '',
                    createdAt: toDate(row.created_at || row.createdAt || row.registrationDate),
                    lastLogin: toDate(row.lastLogin || row.last_login),
                    parentAccountId: row.academyId || row.clubId || undefined,
                    parentAccountType: row.academyId ? 'academy' : (row.clubId ? 'club' : undefined),
                    parentOrganizationName: undefined,
                    suspendReason: row.suspensionReason || row.suspendReason,
                    suspendedAt: toDate(row.suspendedAt),
                    profileImage,
                    isSynced: Boolean(row.isSynced),
                    isGoogleUser: Boolean(row.isGoogleUser),
                    isPhoneAuth: Boolean(row.phone && !row.isGoogleUser),
                };

                return userData;
            });

            setUsers(allUsers);

            // حساب الإحصائيات بكفاءة
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

            const newStats: UsersStats = {
                total: allUsers.length,
                active: allUsers.filter(u => u.status === 'active').length,
                suspended: allUsers.filter(u => u.status === 'suspended').length,
                deleted: allUsers.filter(u => u.status === 'deleted').length,
                byType: {} as Record<AccountType, number>,
                byCountry: {},
                newToday: allUsers.filter(u => u.createdAt && u.createdAt >= today).length,
                newThisWeek: allUsers.filter(u => u.createdAt && u.createdAt >= weekAgo).length,
                newThisMonth: allUsers.filter(u => u.createdAt && u.createdAt >= monthAgo).length,
            };

            allUsers.forEach(u => {
                newStats.byType[u.accountType] = (newStats.byType[u.accountType] || 0) + 1;
                if (u.country) {
                    newStats.byCountry[u.country] = (newStats.byCountry[u.country] || 0) + 1;
                }
            });

            setStats(newStats);
        } catch (e: any) {
            console.error('Error fetching users:', e);
            setError(e.message || 'حدث خطأ في جلب المستخدمين');
        } finally {
            setLoading(false);
        }
    }, [initialLimit]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    return {
        users,
        loading,
        error,
        stats,
        refetch: fetchUsers,
    };
}

// فلترة المستخدمين
export function filterUsers(users: User[], filters: UsersFilters): User[] {
    return users.filter(user => {
        // البحث النصي
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const matchesSearch =
                user.name.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower) ||
                user.phone.includes(filters.search);
            if (!matchesSearch) return false;
        }

        // نوع الحساب
        if (filters.accountType !== 'all' && user.accountType !== filters.accountType) {
            return false;
        }

        // حالة الحساب
        if (filters.status !== 'all' && user.status !== filters.status) {
            return false;
        }

        // حالة التحقق
        if (filters.verification !== 'all' && user.verificationStatus !== filters.verification) {
            return false;
        }

        // البلد (اختيار متعدد)
        if (filters.countries && filters.countries.length > 0 && !filters.countries.includes(user.country)) {
            return false;
        }

        // اكتمال الملف
        if (filters.profileCompletion !== 'all') {
            if (filters.profileCompletion === 'complete' && user.profileCompletion < 100) return false;
            if (filters.profileCompletion === 'incomplete' && user.profileCompletion >= 100) return false;
        }

        // مصدر التسجيل
        if (filters.loginSource !== 'all') {
            if (filters.loginSource === 'google' && !user.isGoogleUser) return false;
            if (filters.loginSource === 'phone' && !user.isPhoneAuth) return false;
            if (filters.loginSource === 'email' && (user.isGoogleUser || user.isPhoneAuth)) return false;
        }

        // حالة المزامنة
        if (filters.isSynced !== 'all') {
            if (filters.isSynced === 'yes' && !user.isSynced) return false;
            if (filters.isSynced === 'no' && user.isSynced) return false;
        }

        // نطاق التاريخ
        if (user.createdAt) {
            const userDate = dayjs(user.createdAt);
            if (filters.dateRange[0]) {
                const startDate = dayjs(filters.dateRange[0]).startOf('day');
                if (userDate.isBefore(startDate)) return false;
            }
            if (filters.dateRange[1]) {
                const endDate = dayjs(filters.dateRange[1]).endOf('day');
                if (userDate.isAfter(endDate)) return false;
            }
        } else if (filters.dateRange[0] || filters.dateRange[1]) {
            return false;
        }

        return true;
    });
}
