/**
 * Hook لجلب المستخدمين من Firebase
 */

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, limit, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { User, UsersStats, UsersFilters, AccountType } from '../_types';

const COLLECTIONS = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents', 'marketers', 'parents'];

// تحويل Firestore Timestamp إلى Date
const toDate = (value: any): Date | null => {
    if (!value) return null;
    if (value._seconds) return new Date(value._seconds * 1000);
    if (value.toDate) return value.toDate();
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

            // جلب من جميع المجموعات مع دمج البيانات
            for (const collectionName of COLLECTIONS) {
                try {
                    const q = query(
                        collection(db, collectionName)
                    );

                    const snapshot = await getDocs(q);

                    snapshot.docs.forEach(doc => {
                        const data = doc.data();
                        const id = doc.id;
                        const accountType = (data.accountType || data.role || collectionName.replace(/s$/, '')) as AccountType;

                        // تجهيز بيانات المستخدم من المستند الحالي
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
                            createdAt: toDate(data.createdAt || data.created_at),
                            lastLogin: toDate(data.lastLogin || data.last_login),
                            parentAccountId: data.parentAccountId || data.clubId || data.academyId,
                            parentAccountType: data.parentAccountType,
                            parentOrganizationName: data.parentOrganizationName,
                            suspendReason: data.suspendReason,
                            suspendedAt: toDate(data.suspendedAt),
                            profileImage: data.profile_image || data.profileImage || data.avatar ||
                                data.photoURL || data.image || data.logo || data.club_logo ||
                                data.academy_logo || data.photo || '',
                        };

                        if (usersMap.has(id)) {
                            // دمج البيانات: المفضل هو البيانات غير الفارغة
                            const existing = usersMap.get(id)!;
                            usersMap.set(id, {
                                ...existing,
                                // نفضل البيانات من المجموعات الفرعية (مثل players/marketers) إذا كانت موجودة
                                // أو نفضل البيانات غير الفارغة
                                name: (userData.name !== 'غير محدد' && userData.name) || existing.name,
                                email: userData.email || existing.email, // ✅ إضافة دمج البريد الإلكتروني
                                phone: userData.phone || existing.phone,
                                country: userData.country || existing.country,
                                city: userData.city || existing.city,
                                profileImage: userData.profileImage || existing.profileImage,
                                lastLogin: (userData.lastLogin && existing.lastLogin)
                                    ? (userData.lastLogin > existing.lastLogin ? userData.lastLogin : existing.lastLogin) // نأخذ التاريخ الأحدث
                                    : (userData.lastLogin || existing.lastLogin),
                                createdAt: existing.createdAt || userData.createdAt,
                                profileCompletion: Math.max(existing.profileCompletion, userData.profileCompletion),
                            });
                        } else {
                            usersMap.set(id, userData);
                        }
                    });
                } catch (e) {
                    console.warn(`Error fetching ${collectionName}:`, e);
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

        // البلد
        if (filters.country && user.country !== filters.country) {
            return false;
        }

        // اكتمال الملف
        if (filters.profileCompletion !== 'all') {
            if (filters.profileCompletion === 'complete' && user.profileCompletion < 100) return false;
            if (filters.profileCompletion === 'incomplete' && user.profileCompletion >= 100) return false;
        }

        // نطاق التاريخ
        if (filters.dateRange[0] && user.createdAt && user.createdAt < filters.dateRange[0]) {
            return false;
        }
        if (filters.dateRange[1] && user.createdAt && user.createdAt > filters.dateRange[1]) {
            return false;
        }

        return true;
    });
}
