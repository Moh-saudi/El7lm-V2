import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { PermissionAction, PermissionResource, Role, DEFAULT_ROLES } from './types';

// تعريف نوع القدرة (Ability)
export type AppAbility = MongoAbility<[PermissionAction | 'manage', PermissionResource | 'all' | object]>;

/**
 * دالة لتعريف الصلاحيات بناءً على المستخدم ودوره
 * تطبق قيود النطاق الجغرافي (Countries Scope) if needed
 */
export function defineAbilityFor(userData: any, role?: Role) {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    // إذا لم يكن هناك مستخدم، لا صلاحيات (Guest)
    if (!userData) {
        return build();
    }

    // الحساب الرئيسي للنظام يجب أن يملك صلاحية كاملة دائمًا، حتى لو كانت
    // هناك بيانات دور/صلاحيات قديمة أو متزامنة جزئيًا في userData.
    const normalizedEmail = String(userData.email || '').trim().toLowerCase();
    if (normalizedEmail === 'admin@el7lm.com' || normalizedEmail === 'admin@elhilm.com') {
        can('manage', 'all');
        return build();
    }

    // 1. صلاحيات السوبر أدمن (مدير النظام)
    const userRole = userData.roleId || userData.employeeRole || userData.role || userData.accountType;
    const userPermissions = userData.permissions;

    // إذا كان نوع الحساب أدمن أو الدور أدمن (وليس موظفاً مقيداً بدور خاص غير الأدمن)
    const isExplicitRestrictedEmployee = Boolean(
        userData.isEmployee &&
        userData.employeeRole &&
        userData.employeeRole !== 'admin' &&
        userData.employeeRole !== 'super_admin'
    );

    if ((userData.accountType === 'admin' || userRole === 'admin' || userData.isAdmin) && !isExplicitRestrictedEmployee) {
        can('manage', 'all');
        return build();
    }

    // 2. استخدام الصلاحيات المخزنة مباشرة في userData
    // إذا كان الموظف لديه قائمة صلاحيات مباشرة
    if (userPermissions && Array.isArray(userPermissions) && userPermissions.length > 0) {
        userPermissions.forEach((permission: string) => {
            const [action, resource] = permission.split(':') as [PermissionAction, PermissionResource];
            if (action && resource) {
                // تطبيق شروط الموقع الجغرافي (Location Scoping) إذا كانت موجودة
                if (userData.allowedCountries && userData.allowedCountries.length > 0) {
                    can(action, resource, { country: { $in: userData.allowedCountries } });
                } else {
                    can(action, resource);
                }

                // ربط تلقائي: صلاحيات المالية والاشتراكات تمنح صلاحيات التسعير والباقات
                if (resource === 'financials' || resource === 'subscriptions') {
                    can(action, 'pricing');
                    if (action === 'manage') {
                        can('create', 'pricing');
                        can('read', 'pricing');
                        can('update', 'pricing');
                        can('delete', 'pricing');
                    }
                }
            }
        });
        return build();
    }

    // 3. تحديد الدور (مخصص أو افتراضي) كـ fallback
    let currentRole = role;
    if (!currentRole) {
        // البحث بالمعرف أولاً ثم بالاسم (ليدعم المسميات العربية القديمة)
        currentRole = DEFAULT_ROLES.find(r => r.id === userRole || r.name === userRole);
    }

    // 4. تطبيق الصلاحيات الأساسية من الدور الافتراضي
    if (currentRole) {
        currentRole.permissions.forEach(permission => {
            const [action, resource] = permission.split(':') as [PermissionAction, PermissionResource];
            if (action && resource) {
                if (userData.allowedCountries && userData.allowedCountries.length > 0) {
                    can(action, resource, { country: { $in: userData.allowedCountries } });
                } else {
                    can(action, resource);
                }
            }
        });
    } else {
        // إذا كان المسمى الوظيفي يحتوي على كلمات تدل على الدعم أو الوكالة، امنحه صلاحيات الدعم تلقائياً
        const supportKeywords = ['دعم', 'وكيل', 'agent', 'support', 'مشرف'];
        const isSupportLike = typeof userRole === 'string' && supportKeywords.some(key => userRole.toLowerCase().includes(key));

        if (isSupportLike) {
            const supportRole = DEFAULT_ROLES.find(r => r.id === 'support_agent');
            if (supportRole) {
                supportRole.permissions.forEach(permission => {
                    const [action, resource] = permission.split(':') as [PermissionAction, PermissionResource];
                    can(action, resource);
                });
            }
        }
    }

    return build();
}
