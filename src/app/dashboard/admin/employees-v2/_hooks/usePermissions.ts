import { useMemo } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { defineAbilityFor } from '@/lib/permissions/ability';
import { PermissionAction, PermissionResource } from '@/lib/permissions/types';

/**
 * Hook لإدارة والتحقق من الصلاحيات باستخدام CASL
 */
export function usePermissions() {
    const { userData } = useAuth();

    // إنشاء كائن الصلاحيات (Ability) بناءً على المستخدم الحالي
    // يتم إعادة حسابه فقط عند تغير المستخدم أو دوره
    const ability = useMemo(() => {
        // هنا يمكننا جلب الدور الكامل من الـ Context أو الـ State إذا كان مخصصاً
        // حالياً نعتمد على الأدوار الافتراضية + الـ role string
        // ملاحظة: userData قد لا يحتوي على تفاصيل الدور الكاملة إذا كانت مخزنة في collection منفصل
        // في النسخة المتقدمة، يجب تمرير Role Object إلى defineAbilityFor
        return defineAbilityFor(userData);
    }, [userData]);

    // دالة التحقق الأساسية
    const can = (action: PermissionAction, resource: PermissionResource) => {
        return ability.can(action, resource);
    };

    // دالة مساعدة للتحقق من أي من الصلاحيات (OR)
    const canAny = (permissions: { action: PermissionAction, resource: PermissionResource }[]) => {
        return permissions.some(p => can(p.action, p.resource));
    };

    // دالة مساعدة للتحقق من كل الصلاحيات (AND)
    const canAll = (permissions: { action: PermissionAction, resource: PermissionResource }[]) => {
        return permissions.every(p => can(p.action, p.resource));
    };

    return {
        ability, // نمرر كائن CASL الأصلي لمن يحتاجه
        can,
        canAny,
        canAll,
        currentUserRole: userData?.role || 'user'
    };
}
