'use client';

import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { getSupabaseImageUrl } from '@/lib/supabase/image-utils';
import { EmployeeRole, RolePermissions } from '@/types/employees';
import { doc, onSnapshot } from 'firebase/firestore';
import {
    BarChart3,
    Briefcase,
    Building,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    DollarSign,
    FileText,
    GraduationCap,
    HardDrive,
    Headphones,
    LayoutDashboard,
    LayoutTemplate,
    LogOut,
    Mail,
    Menu,
    MessageCircle,
    MessageSquare,
    Monitor,
    Search,
    Settings,
    Shield,
    Target,
    Trophy,
    User,
    UserCheck,
    UserCog,
    UserPlus,
    Users
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

interface NewAdminSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    adminData?: any;
    isMobile?: boolean; // Prop for mobile check (optional if handled internally)
}

const NewAdminSidebar: React.FC<NewAdminSidebarProps> = ({
    isOpen,
    onToggle,
    adminData,
    isMobile: externalIsMobile
}) => {
    const pathname = usePathname();
    const router = useRouter();
    const { logout, user } = useAuth();

    // Internal mobile state if not provided
    const [internalIsMobile, setInternalIsMobile] = useState(false);
    const isMobile = externalIsMobile !== undefined ? externalIsMobile : internalIsMobile;

    useEffect(() => {
        if (externalIsMobile === undefined) {
            const checkMobile = () => setInternalIsMobile(window.innerWidth < 768);
            checkMobile();
            window.addEventListener('resize', checkMobile);
            return () => window.removeEventListener('resize', checkMobile);
        }
    }, [externalIsMobile]);


    // ─── PERMISSIONS LOGIC ───

    const DEFAULT_PERMISSIONS: Record<EmployeeRole, RolePermissions> = {
        support: {
            canViewUsers: true,
            canEditUsers: false,
            canViewFinancials: false,
            canManagePayments: false,
            allowedLocations: [],
            canViewReports: false,
            canManageContent: false,
            canManageEmployees: false,
            canViewSupport: true,
            canManageSupport: true
        },
        finance: {
            canViewUsers: true,
            canEditUsers: false,
            canViewFinancials: true,
            canManagePayments: true,
            allowedLocations: [],
            canViewReports: true,
            canManageContent: false,
            canManageEmployees: false,
            canViewSupport: false,
            canManageSupport: false
        },
        sales: {
            canViewUsers: true,
            canEditUsers: false,
            canViewFinancials: false,
            canManagePayments: false,
            allowedLocations: [],
            canViewReports: true,
            canManageContent: false,
            canManageEmployees: false,
            canViewSupport: true,
            canManageSupport: false
        },
        content: {
            canViewUsers: false,
            canEditUsers: false,
            canViewFinancials: false,
            canManagePayments: false,
            allowedLocations: [],
            canViewReports: false,
            canManageContent: true,
            canManageEmployees: false,
            canViewSupport: false,
            canManageSupport: false
        },
        admin: {
            canViewUsers: true,
            canEditUsers: true,
            canViewFinancials: true,
            canManagePayments: true,
            allowedLocations: [],
            canViewReports: true,
            canManageContent: true,
            canManageEmployees: true,
            canViewSupport: true,
            canManageSupport: true
        },
        supervisor: {
            canViewUsers: true,
            canEditUsers: true,
            canViewFinancials: true,
            canManagePayments: false,
            allowedLocations: [],
            canViewReports: true,
            canManageContent: true,
            canManageEmployees: false,
            canViewSupport: true,
            canManageSupport: true
        },
        editor: { // Needed if used in role type
            canViewUsers: false,
            canEditUsers: false,
            canViewFinancials: false,
            canManagePayments: false,
            allowedLocations: [],
            canViewReports: false,
            canManageContent: true,
            canManageEmployees: false,
            canViewSupport: false,
            canManageSupport: false
        },
        viewer: { // Needed if used in role type
            canViewUsers: true,
            canEditUsers: false,
            canViewFinancials: false,
            canManagePayments: false,
            allowedLocations: [],
            canViewReports: true,
            canManageContent: false,
            canManageEmployees: false,
            canViewSupport: false,
            canManageSupport: false
        },
        users_management: {
            canViewUsers: true,
            canEditUsers: true,
            canViewFinancials: false,
            canManagePayments: false,
            allowedLocations: [],
            canViewReports: true,
            canManageContent: false,
            canManageEmployees: false,
            canViewSupport: false,
            canManageSupport: false
        }
    };

    const getEmployeePermissions = useMemo((): RolePermissions | null => {
        if (!adminData) return null;

        // Check if user is an employee
        if (adminData.employeeId || adminData.employeeRole || adminData.role) {
            const role = (adminData.employeeRole || adminData.role) as EmployeeRole;

            // If permissions are explicitly stored in user/employee doc, use them (future proofing)
            if (adminData.permissions) {
                return adminData.permissions as RolePermissions;
            }

            // Otherwise fall back to defaults
            if (role && role in DEFAULT_PERMISSIONS) {
                return DEFAULT_PERMISSIONS[role];
            }
        }

        // If regular admin (not employee restricted), return null (means full access)
        return null;
    }, [adminData]);


    const hasPermission = (permissionKey?: keyof RolePermissions) => {
        // If no permission key required, allow
        if (!permissionKey) return true;
        // If full admin (no restrictions), allow
        if (!getEmployeePermissions) return true;
        // Check specific permission
        return getEmployeePermissions[permissionKey] === true;
    };

    // ─── MENU STRUCTURE ───

    const menuItems = [
        {
            title: 'لوحة التحكم',
            icon: LayoutDashboard,
            href: '/dashboard/admin',
            color: 'text-blue-600',
            // No permission required for dashboard home
        },
        {
            title: 'إدارة المستخدمين',
            icon: Users,
            color: 'text-green-600',
            permission: 'canViewUsers' as keyof RolePermissions,
            subItems: [
                {
                    title: 'جميع المستخدمين',
                    href: '/dashboard/admin/users',
                    icon: Users,
                    description: 'إدارة جميع المستخدمين في النظام',
                    permission: 'canViewUsers' as keyof RolePermissions,
                },
                {
                    title: 'الموظفين',
                    href: '/dashboard/admin/employees',
                    icon: Briefcase,
                    description: 'إدارة موظفي النظام وصلاحياتهم',
                    permission: 'canManageEmployees' as keyof RolePermissions,
                },
                {
                    title: 'تحويل اللاعبين التابعين',
                    href: '/admin/convert-dependent-players',
                    icon: UserCheck,
                    description: 'تحويل اللاعبين التابعين إلى حسابات قابلة لتسجيل الدخول',
                    permission: 'canEditUsers' as keyof RolePermissions,
                },
                {
                    title: 'اللاعبين',
                    href: '/dashboard/admin/users/players',
                    icon: UserCheck,
                    description: 'إدارة حسابات اللاعبين',
                    permission: 'canViewUsers' as keyof RolePermissions,
                },
                {
                    title: 'الأكاديميات',
                    href: '/dashboard/admin/users/academies',
                    icon: GraduationCap,
                    description: 'إدارة حسابات الأكاديميات',
                    permission: 'canViewUsers' as keyof RolePermissions,
                },
                {
                    title: 'الأندية',
                    href: '/dashboard/admin/users/clubs',
                    icon: Building,
                    description: 'إدارة حسابات الأندية',
                    permission: 'canViewUsers' as keyof RolePermissions,
                },
                {
                    title: 'الوكلاء والمدربين',
                    href: '/dashboard/admin/users/agents',
                    icon: UserCog,
                    description: 'إدارة حسابات الوكلاء والمدربين',
                    permission: 'canViewUsers' as keyof RolePermissions,
                },
                {
                    title: 'إدارة سفراء الحلم',
                    href: '/dashboard/admin/users/referrals',
                    icon: Users,
                    description: 'إدارة السفراء والمسوقين',
                    permission: 'canViewUsers' as keyof RolePermissions,
                },
                {
                    title: 'ترحيل البريد الإلكتروني',
                    href: '/dashboard/admin/email-migration',
                    icon: Mail,
                    description: 'ترحيل البريد الإلكتروني الطويل إلى النظام الجديد',
                    permission: 'canManageEmployees' as keyof RolePermissions, // restricted
                },
                {
                    title: 'فحص رقم الهاتف',
                    href: '/dashboard/admin/users/check-phone',
                    icon: Search,
                    description: 'فحص حالة رقم الهاتف في قاعدة البيانات',
                    permission: 'canViewUsers' as keyof RolePermissions,
                }
            ]
        },
        {
            title: 'المدفوعات والاشتراكات',
            icon: CreditCard,
            color: 'text-purple-600',
            permission: 'canViewFinancials' as keyof RolePermissions, // Group level check
            subItems: [
                { title: 'جميع المعاملات', href: '/dashboard/admin/payments', icon: DollarSign, permission: 'canViewFinancials' as keyof RolePermissions },
                { title: 'معاملات جيديا', href: '/dashboard/admin/geidea-transactions', icon: CreditCard, permission: 'canViewFinancials' as keyof RolePermissions },
                { title: 'إعدادات جيديا', href: '/dashboard/admin/geidea-settings', icon: Settings, permission: 'canManagePayments' as keyof RolePermissions }, // stricter
                { title: 'الدفعات الجماعية', href: '/dashboard/admin/payments/bulk', icon: CreditCard, permission: 'canManagePayments' as keyof RolePermissions },
                { title: 'إدارة SkipCash', href: '/dashboard/admin/skipcash', icon: CreditCard, permission: 'canManagePayments' as keyof RolePermissions },
                { title: 'الاشتراكات', href: '/dashboard/admin/subscriptions', icon: FileText, permission: 'canManagePayments' as keyof RolePermissions },
                { title: 'الفواتير', href: '/dashboard/admin/invoices', icon: FileText, permission: 'canViewFinancials' as keyof RolePermissions }
            ]
        },
        {
            title: 'التقارير والإحصائيات',
            icon: BarChart3,
            color: 'text-amber-600',
            permission: 'canViewReports' as keyof RolePermissions,
            subItems: [
                { title: 'التقارير المالية', href: '/dashboard/admin/reports/financial', icon: DollarSign, permission: 'canViewFinancials' as keyof RolePermissions },
                { title: 'إحصائيات المستخدمين', href: '/dashboard/admin/reports/users', icon: Users, permission: 'canViewReports' as keyof RolePermissions },
                { title: 'تقارير النشاط', href: '/dashboard/admin/reports/activity', icon: BarChart3, permission: 'canViewReports' as keyof RolePermissions },
                { title: 'Clarity Analytics', href: '/dashboard/admin/clarity', icon: BarChart3, permission: 'canViewReports' as keyof RolePermissions }
            ]
        },
        {
            title: 'المحتوى والوسائط',
            icon: HardDrive,
            color: 'text-rose-600',
            permission: 'canManageContent' as keyof RolePermissions,
            subItems: [
                { title: 'إدارة المحتوى', href: '/dashboard/admin/content', icon: LayoutTemplate, permission: 'canManageContent' as keyof RolePermissions },
                { title: 'إدارة الملفات', href: '/dashboard/admin/media', icon: HardDrive, permission: 'canManageContent' as keyof RolePermissions },
                { title: 'الصور والفيديوهات', href: '/dashboard/admin/media/gallery', icon: FileText, permission: 'canManageContent' as keyof RolePermissions },
                { title: 'أكاديمية الحلم (Admin)', href: '/dashboard/admin/dream-academy', icon: GraduationCap, permission: 'canManageContent' as keyof RolePermissions },
                { title: 'تصنيفات الأكاديمية', href: '/dashboard/admin/dream-academy-categories', icon: GraduationCap, permission: 'canManageContent' as keyof RolePermissions },
            ]
        },
        {
            title: 'الرسائل والدعم',
            icon: MessageCircle,
            color: 'text-pink-600',
            permission: 'canViewSupport' as keyof RolePermissions,
            subItems: [
                { title: 'الرسائل', href: '/dashboard/admin/messages', icon: MessageSquare, permission: 'canViewSupport' as keyof RolePermissions },
                { title: 'مركز الرسائل والبريد', href: '/dashboard/admin/email-center', icon: Mail, permission: 'canManageSupport' as keyof RolePermissions },
                { title: 'إدارة الإشعارات', href: '/dashboard/admin/notifications', icon: MessageCircle, permission: 'canManageSupport' as keyof RolePermissions },
                { title: 'الدعم الفني', href: '/dashboard/admin/support', icon: Headphones, permission: 'canManageSupport' as keyof RolePermissions },
                { title: 'إدارة العملاء', href: '/dashboard/admin/customer-management', icon: UserPlus, permission: 'canManageSupport' as keyof RolePermissions },
                { title: 'إدارة الواتساب', href: '/dashboard/admin/whatsapp', icon: MessageSquare, permission: 'canManageSupport' as keyof RolePermissions },
                // { title: 'اختبار الواتساب', href: '/dashboard/admin/whatsapp-test', icon: MessageSquare, permission: 'canManageSupport' as keyof RolePermissions }
            ]
        },
        {
            title: 'إدارة البطولات',
            icon: Trophy,
            href: '/dashboard/admin/tournaments',
            color: 'text-yellow-600',
            permission: 'canManageContent' as keyof RolePermissions, // Assuming content managers handle tournaments
        },
        {
            title: 'إدارة الإعلانات',
            icon: Monitor,
            href: '/dashboard/admin/ads',
            color: 'text-cyan-600',
            permission: 'canManageContent' as keyof RolePermissions,
        },
        {
            title: 'إدارة الوظائف',
            icon: Briefcase,
            href: '/dashboard/admin/careers',
            color: 'text-emerald-600',
            permission: 'canManageContent' as keyof RolePermissions,
        },
        {
            title: 'إعدادات النظام',
            icon: Settings,
            href: '/dashboard/admin/system',
            color: 'text-gray-600',
            permission: 'canManageEmployees' as keyof RolePermissions, // Only super admins/employee managers
        }
    ];

    // Helper to filter items recursively
    const filterItems = (items: typeof menuItems) => {
        return items.filter(item => {
            // 1. Check parent permission
            if (!hasPermission(item.permission)) return false;

            // 2. If it has subItems, filter them too
            if (item.subItems) {
                const filteredSub = item.subItems.filter(sub => hasPermission(sub.permission));
                // If all subitems are gone, hide parent? Or keep empty? usually hide.
                if (filteredSub.length === 0) return false;

                // Mutating a copy would be cleaner, but for filter logic:
                // We can't mutate the original array. We need to map then filter.
                return true;
            }

            return true;
        }).map(item => {
            // If subItems exist, return a shallow copy with filtered subItems
            if (item.subItems) {
                return {
                    ...item,
                    subItems: item.subItems.filter(sub => hasPermission(sub.permission))
                };
            }
            return item;
        });
    };

    const filteredMenuItems = useMemo(() => filterItems(menuItems), [menuItems, getEmployeePermissions]);


    const handleLogout = async () => {
        try {
            if (window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
                await logout();
                router.push('/auth/login');
            }
        } catch (error) {
            console.error('خطأ في تسجيل الخروج:', error);
        }
    };

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

    return (
        <div className={`fixed right-0 top-16 bottom-0 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 shadow-xl transition-all duration-300 z-40 flex flex-col ${isOpen ? 'w-72' : 'w-20'
            } ${isMobile && !isOpen ? 'translate-x-[100%]' : 'translate-x-0'
            }`}
            style={{
                direction: 'rtl'
            }}>
            {/* Toggle Button for Desktop */}
            {!isMobile && (
                <button
                    onClick={onToggle}
                    className="absolute -left-3 top-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full p-1.5 shadow-md hover:shadow-lg transition-all z-50 text-gray-600 dark:text-gray-300 hover:text-blue-600"
                >
                    {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            )}

            {/* Header Profile - Only Visible when open */}
            <div className={`p-4 border-b border-gray-200 dark:border-slate-800 flex-shrink-0 transition-opacity duration-200 ${!isOpen && !isMobile ? 'opacity-0 h-0 p-0 overflow-hidden' : 'opacity-100'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-800 dark:text-gray-100 leading-tight">لوحة الإدارة</h2>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            {adminData?.name || adminData?.full_name || 'مدير النظام'}
                        </p>
                        {adminData?.role && (
                            <span className='text-[10px] bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-gray-500 mt-1 inline-block'>
                                {adminData.role === 'admin' && !adminData.employeeRole ? 'Super Admin' : adminData.employeeRole || adminData.role}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation Scroll Area */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1 custom-scrollbar">
                {filteredMenuItems.map((item, index) => (
                    <div key={index} className="mb-1">
                        {item.subItems ? (
                            <details className="group [&_summary::-webkit-details-marker]:hidden" open={isOpen && item.subItems.some(sub => isActive(sub.href))}>
                                <summary className={`flex items-center p-2.5 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-all duration-200 ${(isOpen || isMobile) ? 'justify-between' : 'justify-center'
                                    } ${item.subItems.some(sub => isActive(sub.href)) ? 'bg-gray-50 dark:bg-slate-800/30' : ''}`}>

                                    {/* Icon & Title Wrapper */}
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg transition-colors ${item.subItems.some(sub => isActive(sub.href)) ? 'bg-white dark:bg-slate-700 shadow-sm' : 'bg-gray-50 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700'
                                            }`}>
                                            <item.icon className={`w-5 h-5 ${item.color}`} />
                                        </div>

                                        {(isOpen || isMobile) && (
                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">
                                                {item.title}
                                            </span>
                                        )}
                                    </div>

                                    {/* Arrow */}
                                    {(isOpen || isMobile) && (
                                        <ChevronLeft className="w-4 h-4 text-gray-400 transition-transform duration-200 group-open:-rotate-90" />
                                    )}
                                </summary>

                                {/* Submenu Dropdown */}
                                {(isOpen || isMobile) && (
                                    <div className="mr-5 mt-1 space-y-0.5 border-r-2 border-gray-100 dark:border-slate-800 pr-2">
                                        {item.subItems.map((subItem, subIndex) => (
                                            <Link
                                                key={subIndex}
                                                href={subItem.href}
                                                className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-all duration-200 ${isActive(subItem.href)
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium translate-x-[-4px]'
                                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-200'
                                                    }`}
                                                onClick={() => isMobile && onToggle()}
                                            >
                                                <subItem.icon className={`w-3.5 h-3.5 ${isActive(subItem.href) ? 'text-blue-500' : 'text-gray-400'}`} />
                                                <span>{subItem.title}</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </details>
                        ) : (
                            /** Single Item */
                            <Link
                                href={item.href}
                                className={`flex items-center ${(isOpen || isMobile) ? 'gap-3' : 'justify-center'} p-2.5 rounded-xl transition-all duration-200 group ${isActive(item.href)
                                        ? 'bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                                        : 'hover:bg-gray-100 dark:hover:bg-slate-800/50'
                                    }`}
                                onClick={() => isMobile && onToggle()}
                            >
                                <div className={`p-2 rounded-lg transition-colors ${isActive(item.href) ? 'bg-white dark:bg-slate-700 text-blue-600' : 'bg-gray-50 dark:bg-slate-800 text-gray-500 group-hover:bg-white dark:group-hover:bg-slate-700'
                                    }`}>
                                    <item.icon className={`w-5 h-5 ${isActive(item.href) ? 'text-blue-600' : item.color}`} />
                                </div>

                                {(isOpen || isMobile) && (
                                    <span className={`text-sm font-semibold ${isActive(item.href) ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>
                                        {item.title}
                                    </span>
                                )}
                            </Link>
                        )}
                    </div>
                ))}

                {/* Fallback space at bottom */}
                <div className="h-20"></div>
            </nav>

            {/* Footer Info */}
            <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
                {(isOpen || isMobile) ? (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>الإصدار 2.5</span>
                            <span>El7lm Platform</span>
                        </div>
                        <Button
                            onClick={handleLogout}
                            variant="destructive"
                            size="sm"
                            className="w-full gap-2 justify-center mt-1"
                        >
                            <LogOut className="w-4 h-4" />
                            تسجيل الخروج
                        </Button>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="تسجيل الخروج">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

        </div>
    );
};

export default NewAdminSidebar;
