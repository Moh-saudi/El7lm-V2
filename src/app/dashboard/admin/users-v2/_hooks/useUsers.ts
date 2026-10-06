/**
 * Hook لجلب المستخدمين من Supabase
 * معمارية متكاملة للترقيم والفلترة السحابية (Server-Side Pagination & Querying)
 * مصممة للعمل بكفاءة فائقة مع 10,000 إلى 100,000 مستخدم بصفر استهلاك للذاكرة
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

export interface UseUsersOptions {
    page?: number;
    pageSize?: number;
    filters?: UsersFilters;
}

export function useUsers(options: UseUsersOptions = {}) {
    const { page = 1, pageSize = 20, filters } = options;
    const [users, setUsers] = useState<User[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [availableCountries, setAvailableCountries] = useState<string[]>([]);
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

    useEffect(() => {
        supabase
            .from('users')
            .select('country')
            .neq('accountType', 'admin')
            .not('country', 'is', null)
            .then(({ data }) => {
                if (data) {
                    const uniqueCountries = [...new Set(data.map((d: any) => d.country).filter(Boolean))].sort() as string[];
                    setAvailableCountries(uniqueCountries);
                }
            });
    }, []);

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
                    clubId,
                    lastLoginDevice
            `;

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            // 1. استعلام الجدول المقسم سحابياً (Server-side Pagination)
            let query = supabase
                .from('users')
                .select(userSelectColumns, { count: 'exact' })
                .neq('accountType', 'admin') // استبعاد المشرفين من جدول المستخدمين العاديين
                .order('created_at', { ascending: false });

            // تطبيق الفلاتر سحابياً
            if (filters?.search?.trim()) {
                const term = filters.search.trim();
                query = query.or(`name.ilike.%${term}%,full_name.ilike.%${term}%,displayName.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,phoneNumber.ilike.%${term}%`);
            }

            if (filters?.accountType && filters.accountType !== 'all') {
                query = query.eq('accountType', filters.accountType);
            }

            if (filters?.status === 'active') {
                query = query.or('isActive.eq.true,isActive.is.null').or('isDeleted.eq.false,isDeleted.is.null');
            } else if (filters?.status === 'suspended') {
                query = query.eq('isActive', false).or('isDeleted.eq.false,isDeleted.is.null');
            } else if (filters?.status === 'deleted') {
                query = query.eq('isDeleted', true);
            }

            if (filters?.countries && filters.countries.length > 0) {
                query = query.in('country', filters.countries);
            }

            const { data, count, error: fetchError } = await query.range(from, to);

            if (fetchError) {
                throw fetchError;
            }

            setTotalCount(count ?? 0);

            const allUsers: User[] = (data || []).map((row: any) => {
                const id = row.id || row.uid;
                const accountType = (row.accountType || row.role || 'player') as AccountType;
                const isDeleted = Boolean(row.isDeleted);
                const isActive = row.isActive !== false;
                const status: AccountStatus = isDeleted ? 'deleted' : (!isActive ? 'suspended' : 'active');

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
                    lastLoginDevice: row.lastLoginDevice || undefined,
                    loginPlatform: (() => {
                        const raw = String(row.lastLoginDevice || '').toLowerCase();
                        if (!raw) return 'unknown';
                        if (raw.includes('mobile') || raw.includes('dart') || raw.includes('dalvik') || raw.includes('okhttp')) return 'mobile';
                        if (raw.includes('web') || raw.includes('mozilla') || raw.includes('chrome') || raw.includes('safari') || raw.includes('windows') || raw.includes('macintosh')) return 'web';
                        return 'unknown';
                    })(),
                };

                return userData;
            });

            setUsers(allUsers);

            // 2. جلب الإحصائيات العامة السحابية المتوازية (0 KB memory overhead عبر HTTP HEAD)
            const now = new Date();
            const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const weekAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const monthAgoIso = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

            const [
                totalRes,
                activeRes,
                suspendedRes,
                deletedRes,
                newTodayRes,
                newWeekRes,
                newMonthRes,
                playersRes,
                clubsRes,
                academiesRes,
                trainersRes,
                agentsRes,
                marketersRes,
                parentsRes,
            ] = await Promise.all([
                supabase.from('users').select('id', { count: 'exact', head: true }).neq('accountType', 'admin'),
                supabase.from('users').select('id', { count: 'exact', head: true }).neq('accountType', 'admin').or('isActive.eq.true,isActive.is.null').or('isDeleted.eq.false,isDeleted.is.null'),
                supabase.from('users').select('id', { count: 'exact', head: true }).neq('accountType', 'admin').eq('isActive', false).or('isDeleted.eq.false,isDeleted.is.null'),
                supabase.from('users').select('id', { count: 'exact', head: true }).neq('accountType', 'admin').eq('isDeleted', true),
                supabase.from('users').select('id', { count: 'exact', head: true }).neq('accountType', 'admin').gte('created_at', todayIso),
                supabase.from('users').select('id', { count: 'exact', head: true }).neq('accountType', 'admin').gte('created_at', weekAgoIso),
                supabase.from('users').select('id', { count: 'exact', head: true }).neq('accountType', 'admin').gte('created_at', monthAgoIso),
                supabase.from('users').select('id', { count: 'exact', head: true }).eq('accountType', 'player'),
                supabase.from('users').select('id', { count: 'exact', head: true }).eq('accountType', 'club'),
                supabase.from('users').select('id', { count: 'exact', head: true }).eq('accountType', 'academy'),
                supabase.from('users').select('id', { count: 'exact', head: true }).eq('accountType', 'trainer'),
                supabase.from('users').select('id', { count: 'exact', head: true }).eq('accountType', 'agent'),
                supabase.from('users').select('id', { count: 'exact', head: true }).eq('accountType', 'marketer'),
                supabase.from('users').select('id', { count: 'exact', head: true }).eq('accountType', 'parent'),
            ]);

            setStats({
                total: totalRes.count ?? 0,
                active: activeRes.count ?? 0,
                suspended: suspendedRes.count ?? 0,
                deleted: deletedRes.count ?? 0,
                newToday: newTodayRes.count ?? 0,
                newThisWeek: newWeekRes.count ?? 0,
                newThisMonth: newMonthRes.count ?? 0,
                byType: {
                    player: playersRes.count ?? 0,
                    club: clubsRes.count ?? 0,
                    academy: academiesRes.count ?? 0,
                    trainer: trainersRes.count ?? 0,
                    agent: agentsRes.count ?? 0,
                    marketer: marketersRes.count ?? 0,
                    parent: parentsRes.count ?? 0,
                    admin: 0,
                },
                byCountry: {},
            });

        } catch (e: any) {
            console.error('Error fetching users:', e);
            setError(e.message || 'حدث خطأ في جلب المستخدمين');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, filters]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    return {
        users,
        totalCount,
        availableCountries,
        loading,
        error,
        stats,
        refetch: fetchUsers,
    };
}
