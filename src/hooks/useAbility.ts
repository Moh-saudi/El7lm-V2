import { useMemo } from 'react';
import { subject } from '@casl/ability';
import { useAuth } from '@/lib/firebase/auth-provider';
import { defineAbilityFor } from '@/lib/permissions/ability';
import { PermissionAction, PermissionResource } from '@/lib/permissions/types';

/**
 * Hook لإدارة والتحقق من الصلاحيات باستخدام CASL في جميع أنحاء التطبيق
 */
export function useAbility() {
    const { userData } = useAuth();

    // إنشاء كائن الصلاحيات (Ability) بناءً على المستخدم الحالي
    const ability = useMemo(() => {
        return defineAbilityFor(userData);
    }, [userData]);

    // دالة التحقق الأساسية - تدعم التحقق البسيط والمتحقق المعقد المعتمد على الكائنات
    const can = (action: PermissionAction, resource: PermissionResource | any) => {
        // Master Admin Override - الحساب الرئيسي للنظام له صلاحيات كاملة دائماً
        if (userData?.email === 'admin@el7lm.com' || userData?.email === 'admin@elhilm.com') {
            return true;
        }

        // السوبر أدمن دائماً مسموح له (من يملك نوع حساب أدمن وليس لديه معرف موظف أو دور أو صلاحيات محددة)
        const hasSpecificPermissions =
            (userData?.permissions && userData.permissions.length > 0) ||
            userData?.roleId ||
            userData?.employeeRole ||
            userData?.role ||
            userData?.employeeId ||
            userData?.isEmployee;

        if (userData?.accountType === 'admin' && !hasSpecificPermissions) {
            // console.log('🛡️ Super Admin Access Granted (No restrictions found)');
            return true;
        }

        // إذا كان التحقق بسيطاً (Resource Name)
        if (typeof resource === 'string') {
            return ability.can(action, resource as PermissionResource);
        }

        // إذا كان التحقق معقداً (Object with attributes like country)
        // نقوم بتحويل الكائن إلى النوع المتوقع من CASL
        const subjectName = resource.resource || resource.__type || 'all';
        return ability.can(action, subject(subjectName, resource));
    };

    // دالة مساعدة للتحقق من أي من الصلاحيات (OR)
    const canAny = (permissions: { action: PermissionAction, resource: PermissionResource }[]) => {
        return permissions.some(p => can(p.action, p.resource));
    };

    return {
        ability,
        can,
        canAny,
        userRole: userData?.roleId || userData?.employeeRole || userData?.role || userData?.accountType || 'guest'
    };
}
