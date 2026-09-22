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
        const userEmail = String(userData?.email || '').toLowerCase().trim();
        if (userEmail === 'admin@el7lm.com' || userEmail === 'admin@elhilm.com' || userEmail.endsWith('@el7lm.com')) {
            return true;
        }

        // السوبر أدمن دائماً مسموح له (من يملك نوع حساب أدمن أو دور أدمن وليس موظفاً مقيداً)
        const isRestrictedEmployee = Boolean(
            userData?.isEmployee &&
            userData?.employeeRole &&
            userData?.employeeRole !== 'admin' &&
            userData?.employeeRole !== 'super_admin'
        );

        const isAdmin = userData?.accountType === 'admin' || userData?.role === 'admin' || userData?.isAdmin === true;
        if (isAdmin && !isRestrictedEmployee) {
            return true;
        }

        // إذا كان التحقق بسيطاً (Resource Name)
        if (typeof resource === 'string') {
            if (resource === 'pricing') {
                return (
                    ability.can(action, 'pricing') ||
                    ability.can(action, 'financials') ||
                    ability.can('manage', 'financials') ||
                    ability.can(action, 'subscriptions') ||
                    ability.can('manage', 'all')
                );
            }
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
