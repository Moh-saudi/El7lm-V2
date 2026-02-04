'use client';

import { useAuth } from '@/lib/firebase/auth-provider';
import { useState, useEffect } from 'react';
import { defineAbilityFor } from '@/lib/permissions/ability';

// أنواع الموظفين
export type EmployeeRole =
  | 'customer_service'    // خدمة عملاء
  | 'data_entry'          // إدخال بيانات
  | 'supervisor'          // مشرف
  | 'manager'             // مدير
  | 'admin'               // مدير النظام
  | 'developer';          // مطور

// الصلاحيات المتاحة
export interface EmployeePermissions {
  // إدارة العملاء
  canViewCustomers: boolean;
  canEditCustomers: boolean;
  canDeleteCustomers: boolean;
  canAddCustomers: boolean;

  // رفع الملفات
  canUploadFiles: boolean;
  canDownloadFiles: boolean;

  // التواصل
  canSendWhatsApp: boolean;
  canMakeCalls: boolean;
  canSendEmails: boolean;

  // إدارة البيانات
  canViewStatistics: boolean;
  canExportData: boolean;
  canImportData: boolean;

  // الأدوات المتقدمة
  canAccessAdvancedTools: boolean;
  canTestPhoneFormatting: boolean;
  canFixPhoneNumbers: boolean;
  canRemoveDuplicates: boolean;
  canDeleteAllData: boolean;

  // إدارة النظام
  canManageUsers: boolean;
  canManageRoles: boolean;
  canViewLogs: boolean;
  canAccessAdminPanel: boolean;
}

// تعريف الصلاحيات لكل دور
const ROLE_PERMISSIONS: Record<EmployeeRole, EmployeePermissions> = {
  customer_service: {
    // إدارة العملاء - محدودة
    canViewCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: false,
    canAddCustomers: false,

    // رفع الملفات - محدود
    canUploadFiles: false,
    canDownloadFiles: true,

    // التواصل - كامل
    canSendWhatsApp: true,
    canMakeCalls: true,
    canSendEmails: true,

    // إدارة البيانات - محدودة
    canViewStatistics: true,
    canExportData: false,
    canImportData: false,

    // الأدوات المتقدمة - محظورة
    canAccessAdvancedTools: false,
    canTestPhoneFormatting: false,
    canFixPhoneNumbers: false,
    canRemoveDuplicates: false,
    canDeleteAllData: false,

    // إدارة النظام - محظورة
    canManageUsers: false,
    canManageRoles: false,
    canViewLogs: false,
    canAccessAdminPanel: false,
  },

  data_entry: {
    // إدارة العملاء - محدودة
    canViewCustomers: true,
    canEditCustomers: false,
    canDeleteCustomers: false,
    canAddCustomers: true,

    // رفع الملفات - كامل
    canUploadFiles: true,
    canDownloadFiles: true,

    // التواصل - محظور
    canSendWhatsApp: false,
    canMakeCalls: false,
    canSendEmails: false,

    // إدارة البيانات - محدودة
    canViewStatistics: false,
    canExportData: false,
    canImportData: true,

    // الأدوات المتقدمة - محظورة
    canAccessAdvancedTools: false,
    canTestPhoneFormatting: false,
    canFixPhoneNumbers: false,
    canRemoveDuplicates: false,
    canDeleteAllData: false,

    // إدارة النظام - محظورة
    canManageUsers: false,
    canManageRoles: false,
    canViewLogs: false,
    canAccessAdminPanel: false,
  },

  supervisor: {
    // إدارة العملاء - كاملة
    canViewCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: true,
    canAddCustomers: true,

    // رفع الملفات - كامل
    canUploadFiles: true,
    canDownloadFiles: true,

    // التواصل - كامل
    canSendWhatsApp: true,
    canMakeCalls: true,
    canSendEmails: true,

    // إدارة البيانات - كاملة
    canViewStatistics: true,
    canExportData: true,
    canImportData: true,

    // الأدوات المتقدمة - محدودة
    canAccessAdvancedTools: true,
    canTestPhoneFormatting: true,
    canFixPhoneNumbers: true,
    canRemoveDuplicates: false,
    canDeleteAllData: false,

    // إدارة النظام - محدودة
    canManageUsers: false,
    canManageRoles: false,
    canViewLogs: true,
    canAccessAdminPanel: false,
  },

  manager: {
    // إدارة العملاء - كاملة
    canViewCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: true,
    canAddCustomers: true,

    // رفع الملفات - كامل
    canUploadFiles: true,
    canDownloadFiles: true,

    // التواصل - كامل
    canSendWhatsApp: true,
    canMakeCalls: true,
    canSendEmails: true,

    // إدارة البيانات - كاملة
    canViewStatistics: true,
    canExportData: true,
    canImportData: true,

    // الأدوات المتقدمة - كاملة
    canAccessAdvancedTools: true,
    canTestPhoneFormatting: true,
    canFixPhoneNumbers: true,
    canRemoveDuplicates: true,
    canDeleteAllData: false,

    // إدارة النظام - محدودة
    canManageUsers: true,
    canManageRoles: false,
    canViewLogs: true,
    canAccessAdminPanel: true,
  },

  admin: {
    // إدارة العملاء - كاملة
    canViewCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: true,
    canAddCustomers: true,

    // رفع الملفات - كامل
    canUploadFiles: true,
    canDownloadFiles: true,

    // التواصل - كامل
    canSendWhatsApp: true,
    canMakeCalls: true,
    canSendEmails: true,

    // إدارة البيانات - كاملة
    canViewStatistics: true,
    canExportData: true,
    canImportData: true,

    // الأدوات المتقدمة - كاملة
    canAccessAdvancedTools: true,
    canTestPhoneFormatting: true,
    canFixPhoneNumbers: true,
    canRemoveDuplicates: true,
    canDeleteAllData: true,

    // إدارة النظام - كاملة
    canManageUsers: true,
    canManageRoles: true,
    canViewLogs: true,
    canAccessAdminPanel: true,
  },

  developer: {
    // إدارة العملاء - كاملة
    canViewCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: true,
    canAddCustomers: true,

    // رفع الملفات - كامل
    canUploadFiles: true,
    canDownloadFiles: true,

    // التواصل - كامل
    canSendWhatsApp: true,
    canMakeCalls: true,
    canSendEmails: true,

    // إدارة البيانات - كاملة
    canViewStatistics: true,
    canExportData: true,
    canImportData: true,

    // الأدوات المتقدمة - كاملة
    canAccessAdvancedTools: true,
    canTestPhoneFormatting: true,
    canFixPhoneNumbers: true,
    canRemoveDuplicates: true,
    canDeleteAllData: true,

    // إدارة النظام - كاملة
    canManageUsers: true,
    canManageRoles: true,
    canViewLogs: true,
    canAccessAdminPanel: true,
  },
};

// Hook للصلاحيات (Legacy wrapper for new CASL system)
export const useEmployeePermissions = () => {
  const { userData } = useAuth();
  const [permissions, setPermissions] = useState<EmployeePermissions | null>(null);
  const [role, setRole] = useState<EmployeeRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData) {
      const ability = defineAbilityFor(userData);

      // Mapping old permissions to CASL
      const caslPermissions: EmployeePermissions = {
        canViewCustomers: ability.can('read', 'users'),
        canEditCustomers: ability.can('update', 'users'),
        canDeleteCustomers: ability.can('delete', 'users'),
        canAddCustomers: ability.can('create', 'users'),

        canUploadFiles: ability.can('create', 'media'),
        canDownloadFiles: ability.can('read', 'media'),

        canSendWhatsApp: ability.can('manage', 'communications'),
        canMakeCalls: ability.can('manage', 'communications'),
        canSendEmails: ability.can('manage', 'communications'),

        canViewStatistics: ability.can('read', 'reports'),
        canExportData: ability.can('manage', 'reports'),
        canImportData: ability.can('manage', 'users'),

        canAccessAdvancedTools: ability.can('manage', 'settings'),
        canTestPhoneFormatting: ability.can('manage', 'settings'),
        canFixPhoneNumbers: ability.can('manage', 'users'),
        canRemoveDuplicates: ability.can('manage', 'users'),
        canDeleteAllData: ability.can('delete', 'all'),

        canManageUsers: ability.can('manage', 'users'),
        canManageRoles: ability.can('manage', 'roles'),
        canViewLogs: ability.can('read', 'settings'),
        canAccessAdminPanel: ability.can('read', 'employees'),
      };

      setPermissions(caslPermissions);
      setRole((userData.employeeRole || userData.role || userData.accountType) as EmployeeRole);
      setLoading(false);
    }
  }, [userData]);

  // دالة للتحقق من صلاحية معينة
  const hasPermission = (permission: keyof EmployeePermissions): boolean => {
    return permissions?.[permission] || false;
  };

  // دالة للتحقق من مجموعة صلاحيات
  const hasAnyPermission = (permissionsList: (keyof EmployeePermissions)[]): boolean => {
    return permissionsList.some(permission => hasPermission(permission));
  };

  // دالة للتحقق من جميع الصلاحيات
  const hasAllPermissions = (permissionsList: (keyof EmployeePermissions)[]): boolean => {
    return permissionsList.every(permission => hasPermission(permission));
  };

  return {
    permissions,
    role,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    ROLE_PERMISSIONS,
  };
};

// مكون الحماية بالصلاحيات
export const PermissionGuard = ({
  children,
  requiredPermissions,
  requireAll = false,
  fallback = null,
}: {
  children: React.ReactNode;
  requiredPermissions: (keyof EmployeePermissions)[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}): any => {
  const { hasAnyPermission, hasAllPermissions, loading } = useEmployeePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const hasAccess = requireAll
    ? hasAllPermissions(requiredPermissions)
    : hasAnyPermission(requiredPermissions);

  if (!hasAccess) {
    return fallback || null;
  }

  return children;
};

// مكون عرض معلومات الصلاحيات
export const PermissionsInfo = () => {
  const { permissions, role, loading } = useEmployeePermissions();

  if (loading) {
    return <div>جاري التحميل...</div>;
  }

  if (!permissions || !role) {
    return <div>لا توجد صلاحيات متاحة</div>;
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">معلومات الصلاحيات</h3>
      <p className="text-sm text-gray-600 mb-4">الدور: {role}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-2">إدارة العملاء</h4>
          <ul className="text-sm space-y-1">
            <li>عرض العملاء: {permissions.canViewCustomers ? '✅' : '❌'}</li>
            <li>تعديل العملاء: {permissions.canEditCustomers ? '✅' : '❌'}</li>
            <li>حذف العملاء: {permissions.canDeleteCustomers ? '✅' : '❌'}</li>
            <li>إضافة عملاء: {permissions.canAddCustomers ? '✅' : '❌'}</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium mb-2">التواصل</h4>
          <ul className="text-sm space-y-1">
            <li>إرسال واتساب: {permissions.canSendWhatsApp ? '✅' : '❌'}</li>
            <li>إجراء مكالمات: {permissions.canMakeCalls ? '✅' : '❌'}</li>
            <li>إرسال بريد إلكتروني: {permissions.canSendEmails ? '✅' : '❌'}</li>
          </ul>
        </div>

        <div>
          <h4 className="font-medium mb-2">الأدوات المتقدمة</h4>
          <ul className="text-sm space-y-1">
            <li>الوصول للأدوات المتقدمة: {permissions.canAccessAdvancedTools ? '✅' : '❌'}</li>
            <li>اختبار تنسيق الأرقام: {permissions.canTestPhoneFormatting ? '✅' : '❌'}</li>
            <li>إصلاح أرقام الهواتف: {permissions.canFixPhoneNumbers ? '✅' : '❌'}</li>
            <li>إزالة التكرارات: {permissions.canRemoveDuplicates ? '✅' : '❌'}</li>
            <li>حذف جميع البيانات: {permissions.canDeleteAllData ? '✅' : '❌'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
