/**
 * Hook لجلب المستخدمين من Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/config';
import { User, UsersStats, UsersFilters, AccountType } from '../_types';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

const TABLES = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents', 'marketers'];

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

export function useUsers(initialLimit = 100) {
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

            const usersMap = new Map<string, User>();

            // جلب من جميع الجداول مع دمج البيانات
            for (const tableName of TABLES) {
                try {
                    const { data: rows, error: fetchError } = await supabase
                        .from(tableName)
                        .select('*');

                    if (fetchError) {
                        console.warn(`Error fetching ${tableName}:`, fetchError);
                        continue;
                    }

                    (rows || []).forEach((data: any) => {
                        const id = data.id;
                        if (!id) return;
                        const accountType = (data.accountType || data.role || tableName.replace(/s$/, '')) as AccountType;

                        // تجهيز بيانات المستخدم من السجل الحالي
                        const userData: User = {
                            id: id,
                            uid: id,
                            name: data.full_name || data.name || data.club_name || data.academy_name || 'غير محدد',
                            email: data.email || '',
                            phone: data.phone || data.phoneNumber || '',
                            accountType,
                            status: data.isDeleted ? 'deleted' : data.isActive === false ? 'suspended' : 'active',
                            isActive: data.isActive !== false,
                            isDeleted: data.isDeleted || false,
                            verificationStatus: data.verificationStatus || 'pending',
                            profileCompletion: calculateProfileCompletion(data),
                            country: data.country || '',
                            countryCode: data.countryCode || '',
                            city: data.city || '',
                            createdAt: toDate(data.createdAt || data.created_at || data.registrationDate || data.date),
                            lastLogin: toDate(data.lastLogin || data.last_login),
                            parentAccountId: data.parentAccountId || data.clubId || data.academyId,
                            parentAccountType: data.parentAccountType,
                            parentOrganizationName: data.parentOrganizationName,
                            suspendReason: data.suspendReason,
                            suspendedAt: toDate(data.suspendedAt),
                            profileImage: data.profile_image || data.profileImage || data.avatar ||
                                data.photoURL || data.image || data.logo || data.club_logo ||
                                data.academy_logo || data.photo || '',
                            isSynced: data.isSynced || false,
                            isGoogleUser: data.isGoogleUser || false,
                            isPhoneAuth: data.isPhoneAuth || false,
                        };

                        if (usersMap.has(id)) {
                            // دمج البيانات: المفضل هو البيانات غير الفارغة
                            const existing = usersMap.get(id)!;
                            usersMap.set(id, {
                                ...existing,
                                name: (userData.name !== 'غير محدد' && userData.name) || existing.name,
                                email: userData.email || existing.email,
                                phone: userData.phone || existing.phone,
                                country: userData.country || existing.country,
                                city: userData.city || existing.city,
                                profileImage: userData.profileImage || existing.profileImage,
                                lastLogin: (userData.lastLogin && existing.lastLogin)
                                    ? (userData.lastLogin > existing.lastLogin ? userData.lastLogin : existing.lastLogin)
                                    : (userData.lastLogin || existing.lastLogin),
                                createdAt: existing.createdAt || userData.createdAt,
                                profileCompletion: Math.max(existing.profileCompletion, userData.profileCompletion),
                                isSynced: existing.isSynced || userData.isSynced,
                                isGoogleUser: existing.isGoogleUser || userData.isGoogleUser,
                                isPhoneAuth: existing.isPhoneAuth || userData.isPhoneAuth,
                            });
                        } else {
                            usersMap.set(id, userData);
                        }
                    });
                } catch (e) {
                    console.warn(`Error fetching ${tableName}:`, e);
                }
            }

            const allUsers = Array.from(usersMap.values());

            // ترتيب حسب تاريخ الإنشاء
            allUsers.sort((a, b) => {
                const dateA = a.createdAt?.getTime() || 0;
                const dateB = b.createdAt?.getTime() || 0;
                return dateB - dateA;
            });

            setUsers(allUsers);

            // حساب الإحصائيات
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

        // نطاق التاريخ - تعديل ليكون دقيقاً وشاملاً لليوم بالكامل
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
            // إذا كان هناك فلتر تاريخ والمستخدم ليس لديه تاريخ، نستبعده
            return false;
        }

        return true;
    });
}
