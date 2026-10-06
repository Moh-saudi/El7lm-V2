/**
 * صفحة إدارة المستخدمين - النسخة 2
 * تصميم جديد باستخدام Ant Design
 */

'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/api/authenticated-fetch';
import {
    ConfigProvider,
    App,
    Typography,
    Alert,
    Button,
    Space,
    message,
    Tabs,
    Switch,
    Tooltip,
    Modal,
} from 'antd';
import {
    DownloadOutlined,
    UserAddOutlined,
    ReloadOutlined,
    TableOutlined,
    BarChartOutlined,
    SyncOutlined,
    CloudSyncOutlined,
} from '@ant-design/icons';
import arEG from 'antd/locale/ar_EG';

// المكونات
import UsersStatsCards from './_components/UsersStats';
import UsersFiltersBar, { DEFAULT_FILTERS } from './_components/UsersFilters';
import UsersTable from './_components/UsersTable';
import UserDetailsModal from './_components/UserDetailsModal';
import EditUserModal from './_components/EditUserModal';
import SendMessageModal from './_components/SendMessageModal';
import BulkActionsBar from './_components/BulkActionsBar';
import UsersCharts from './_components/UsersCharts';

// الـ Hooks
import { useUsers } from './_hooks/useUsers';
import { useUserActions } from './_hooks/useUserActions';

// الأدوات
import { exportToCSV, exportToJSON } from './_utils/export';

// الأنواع
import { User, UsersFilters, ROLE_PERMISSIONS, Permission } from './_types';

import { useAbility } from '@/hooks/useAbility';
import AccessDenied from '@/components/admin/AccessDenied';

// حماية الصفحة
import { AccountTypeProtection } from '@/hooks/useAccountTypeAuth';
import { useAuth } from '@/lib/supabase/auth-provider';

const { Title, Text } = Typography;

function UsersPageContent() {
    const { userData } = useAuth();
    const { can } = useAbility();

    if (!can('read', 'users')) {
        return <AccessDenied resource="إدارة المستخدمين" />;
    }

    // بناء كائن الصلاحيات القديم من النظام الجديد للتوافق مع المكونات
    const permissions: Permission = useMemo(() => ({
        view: can('read', 'users'),
        edit: can('update', 'users'),
        delete: can('delete', 'users'),
        suspend: can('update', 'users'), // تعليق الحساب يعتبر تحديث
        message: can('manage', 'communications'),
        export: can('read', 'reports'),
        bulkActions: can('manage', 'users'),
    }), [can]);

    // الحالة
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [filters, setFilters] = useState<UsersFilters>(DEFAULT_FILTERS);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [detailsModal, setDetailsModal] = useState<{ visible: boolean; user: User | null }>({
        visible: false,
        user: null,
    });
    const [editModal, setEditModal] = useState<{ visible: boolean; user: User | null }>({
        visible: false,
        user: null,
    });
    const [messageModal, setMessageModal] = useState<{ visible: boolean; user: User | null }>({
        visible: false,
        user: null,
    });
    const [activeTab, setActiveTab] = useState<'table' | 'charts'>('table');
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // جلب البيانات بمعمارية الترقيم السحابي المقسم (Server-Side Pagination)
    const { users, totalCount, availableCountries, loading, error, stats, refetch } = useUsers({
        page,
        pageSize,
        filters,
    });
    const { suspendUser, activateUser, deleteUser, verifyUser, updateUser, sendMessage } = useUserActions();

    // تطبيق قيود النطاق الجغرافي من CASL إذا وجدت
    const filteredUsers = useMemo(() => {
        return users.filter(user => can('read', { resource: 'users', country: user.country } as any));
    }, [users, can]);

    // المستخدمين المحددين
    const selectedUsers = useMemo(() => {
        return users.filter(u => selectedRowKeys.includes(u.id));
    }, [users, selectedRowKeys]);

    // قائمة البلدان المتاحة (تأتي مباشرة من قاعدة البيانات بالكامل)
    const countries = useMemo(() => {
        if (availableCountries && availableCountries.length > 0) return availableCountries;
        return [...new Set(users.map(u => u.country).filter(Boolean))].sort();
    }, [availableCountries, users]);

    // عدد الفلاتر النشطة
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.search) count++;
        if (filters.accountType !== 'all') count++;
        if (filters.status !== 'all') count++;
        if (filters.verification !== 'all') count++;
        if (filters.countries && filters.countries.length > 0) count++;
        if (filters.profileCompletion !== 'all') count++;
        if (filters.dateRange[0] || filters.dateRange[1]) count++;
        return count;
    }, [filters]);

    // التحديث التلقائي
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            refetch();
        }, 30000); // كل 30 ثانية

        return () => clearInterval(interval);
    }, [autoRefresh, refetch]);

    // تغيير الصفحة وحجمها سحابياً
    const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
        setPage(newPage);
        setPageSize(newPageSize);
    }, []);

    // تحديث الفلاتر مع إعادة الصفحة للبداية
    const handleFiltersChange = useCallback((newFilters: Partial<UsersFilters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPage(1);
    }, []);

    // إعادة تعيين الفلاتر
    const handleResetFilters = useCallback(() => {
        setFilters(DEFAULT_FILTERS);
        setPage(1);
    }, []);

    // عرض تفاصيل المستخدم
    const handleViewUser = useCallback((user: User) => {
        setDetailsModal({ visible: true, user });
    }, []);

    // تعديل المستخدم
    const handleEditUser = useCallback((user: User) => {
        setEditModal({ visible: true, user });
    }, []);

    const onUpdateUser = async (user: User, data: Partial<User>) => {
        const success = await updateUser(user, data);
        if (success) {
            setEditModal({ visible: false, user: null });
            refetch();
        }
        return success;
    };

    // إرسال رسالة
    const handleMessageUser = useCallback((user: User) => {
        setMessageModal({ visible: true, user });
    }, []);

    const onSendMessage = async (user: User, title: string, body: string, method: 'notification' | 'email') => {
        await sendMessage(user, title, body, method);
        setMessageModal({ visible: false, user: null });
    };

    // تصدير البيانات
    const handleExport = useCallback((format: 'csv' | 'json' = 'csv') => {
        if (format === 'csv') {
            exportToCSV(filteredUsers, 'users');
        } else {
            exportToJSON(filteredUsers, 'users');
        }
        message.success(`تم تصدير ${filteredUsers.length} مستخدم`);
    }, [filteredUsers]);

    // إضافة مستخدم
    const handleAddUser = useCallback(() => {
        message.info('قريباً: إضافة مستخدم');
    }, []);

    // مزامنة المستخدمين
    const handleSyncUsers = async () => {
        try {
            setIsSyncing(true);
            message.loading({ content: 'جاري بدء عملية المزامنة...', key: 'sync' });

            // هنا نستخدم fetch لأنه طلب API وليس عملية Firestore مباشرة
            const response = await authenticatedFetch('/api/admin/sync-users-dates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                message.destroy('sync');

                Modal.success({
                    title: 'تقرير المزامنة والتحقق',
                    content: (
                        <div className="py-2">
                            <Alert
                                message="تمت عملية المزامنة بنجاح"
                                description="تم التأكد من وجود كافة الحسابات المسجلة في القائمة أدناه."
                                type="success"
                                showIcon
                                className="mb-4"
                            />
                            <div className="bg-gray-50 list-none p-3 rounded-lg border border-gray-100">
                                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                    <span className="text-gray-600">إجمالي الحسابات المسجّلة:</span>
                                    <span className="font-bold text-blue-600">{data.totalAuthUsers}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                    <span className="text-gray-600">حسابات تم استرجاعها (كانت مفقودة):</span>
                                    <span className="font-bold text-green-600">{data.createdCount}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-gray-600">حسابات تم تحديث بياناتها:</span>
                                    <span className="font-bold text-orange-600">{data.updatedCount}</span>
                                </div>
                            </div>
                            <p className="text-gray-500 text-xs mt-3 text-center">
                                سيتم تحديث الجدول الآن ليعكس هذه النتائج.
                            </p>
                        </div>
                    ),
                    okText: 'تم',
                    width: 500,
                    onOk: () => refetch()
                });
                refetch(); // تحديث القائمة لرؤية المستخدمين الجدد
            } else {
                throw new Error(data.error || 'فشل عملية المزامنة');
            }
        } catch (error: any) {
            console.error('Sync error:', error);
            message.error({ content: error.message || 'حدث خطأ أثناء المزامنة', key: 'sync' });
        } finally {
            setIsSyncing(false);
        }
    };

    // إجراءات جماعية
    const handleSuspendBulk = useCallback(async (users: User[], reason: string) => {
        for (const user of users) {
            await suspendUser(user, reason);
        }
        refetch();
        message.success(`تم تعليق ${users.length} حساب`);
    }, [suspendUser, refetch]);

    const handleActivateBulk = useCallback(async (users: User[]) => {
        for (const user of users) {
            await activateUser(user);
        }
        refetch();
        message.success(`تم تفعيل ${users.length} حساب`);
    }, [activateUser, refetch]);

    const handleDeleteBulk = useCallback(async (users: User[]) => {
        for (const user of users) {
            await deleteUser(user);
        }
        refetch();
        message.success(`تم حذف ${users.length} حساب`);
    }, [deleteUser, refetch]);

    const handleMessageBulk = useCallback(async (users: User[], title: string, body: string) => {
        // TODO: تنفيذ إرسال الرسائل الجماعية
        message.info('قريباً: إرسال رسائل جماعية');
    }, []);

    if (error) {
        return (
            <div className="p-6">
                <Alert
                    message="خطأ في جلب البيانات"
                    description={error}
                    type="error"
                    showIcon
                    action={
                        <Button onClick={refetch}>إعادة المحاولة</Button>
                    }
                />
            </div>
        );
    }

    return (
        <ConfigProvider
            direction="rtl"
            locale={arEG}
            theme={{
                token: {
                    fontFamily: 'inherit',
                    colorPrimary: '#059669',
                    borderRadius: 10,
                },
            }}
        >
            <App>
                <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
                    {/* الهيدر */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <Title level={2} className="m-0 mb-1 !text-slate-800 font-bold">
                                إدارة المستخدمين
                            </Title>
                            <Text type="secondary" className="!text-slate-500">
                                {stats.total > 0 ? `${stats.total.toLocaleString()} مستخدم مسجل` : 'جاري التحميل...'}
                                {activeFiltersCount > 0 && ` • نتائج التصفية: ${totalCount.toLocaleString()}`}
                            </Text>
                        </div>
                        <Space wrap size="middle">
                            {/* زر التحديث التلقائي */}
                            <Button
                                icon={<SyncOutlined spin={autoRefresh} className={autoRefresh ? 'text-emerald-600' : 'text-slate-500'} />}
                                onClick={() => setAutoRefresh(prev => !prev)}
                                className={autoRefresh ? '!border-emerald-500 !bg-emerald-50 !text-emerald-700 font-medium shadow-sm' : 'border-slate-300 hover:border-emerald-500 text-slate-700'}
                            >
                                {autoRefresh ? 'تحديث تلقائي: نشط' : 'تحديث تلقائي'}
                            </Button>

                            {/* زر المزامنة */}
                            <Button
                                icon={<CloudSyncOutlined spin={isSyncing} />}
                                onClick={handleSyncUsers}
                                loading={isSyncing}
                                disabled={isSyncing}
                                className="border-slate-300 hover:border-emerald-500 text-slate-700"
                            >
                                مزامنة البيانات
                            </Button>

                            {permissions.export && (
                                <Button icon={<DownloadOutlined />} onClick={() => handleExport('csv')} className="border-slate-300 hover:border-emerald-500 text-slate-700">
                                    تصدير
                                </Button>
                            )}
                            {permissions.edit && (
                                <Button type="primary" icon={<UserAddOutlined />} onClick={handleAddUser} className="!bg-emerald-600 hover:!bg-emerald-700 shadow-sm font-medium">
                                    إضافة مستخدم
                                </Button>
                            )}
                        </Space>
                    </div>

                    {/* الإحصائيات */}
                    <UsersStatsCards stats={stats} loading={loading} />

                    {/* التبويبات */}
                    <Tabs
                        activeKey={activeTab}
                        onChange={key => setActiveTab(key as 'table' | 'charts')}
                        items={[
                            {
                                key: 'table',
                                label: (
                                    <span className="flex items-center gap-2">
                                        <TableOutlined />
                                        الجدول
                                    </span>
                                ),
                            },
                            {
                                key: 'charts',
                                label: (
                                    <span className="flex items-center gap-2">
                                        <BarChartOutlined />
                                        الرسوم البيانية
                                    </span>
                                ),
                            },
                        ]}
                    />

                    {activeTab === 'table' ? (
                        <>
                            {/* الفلاتر */}
                            <UsersFiltersBar
                                filters={filters}
                                onFiltersChange={handleFiltersChange}
                                onReset={handleResetFilters}
                                onRefresh={refetch}
                                loading={loading}
                                countries={countries}
                                activeFiltersCount={activeFiltersCount}
                                totalCount={stats.total}
                                filteredCount={totalCount}
                            />

                            {/* الجدول */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
                                <UsersTable
                                    users={filteredUsers}
                                    loading={loading}
                                    permissions={permissions}
                                    page={page}
                                    pageSize={pageSize}
                                    total={totalCount}
                                    onPageChange={handlePageChange}
                                    onView={handleViewUser}
                                    onEdit={handleEditUser}
                                    onSuspend={suspendUser}
                                    onActivate={activateUser}
                                    onDelete={deleteUser}
                                    onVerify={verifyUser}
                                    onMessage={handleMessageUser}
                                    selectedRowKeys={selectedRowKeys}
                                    onSelectionChange={setSelectedRowKeys}
                                />
                            </div>
                        </>
                    ) : (
                        /* الرسوم البيانية */
                        <UsersCharts stats={stats} loading={loading} />
                    )}

                    {/* نافذة التفاصيل */}
                    <UserDetailsModal
                        user={detailsModal.user}
                        visible={detailsModal.visible}
                        onClose={() => setDetailsModal({ visible: false, user: null })}
                        permissions={permissions}
                        onEdit={(user) => {
                            setDetailsModal({ visible: false, user: null });
                            handleEditUser(user);
                        }}
                        onMessage={handleMessageUser}
                        onSuspend={(user) => {
                            setDetailsModal({ visible: false, user: null });
                        }}
                        onActivate={async (user) => {
                            await activateUser(user);
                            refetch();
                        }}
                        onDelete={async (user) => {
                            await deleteUser(user);
                            refetch();
                        }}
                        onVerify={async (user) => {
                            await verifyUser(user);
                            refetch();
                        }}
                    />

                    {/* نافذة التعديل */}
                    <EditUserModal
                        user={editModal.user}
                        visible={editModal.visible}
                        onClose={() => setEditModal({ visible: false, user: null })}
                        onUpdate={onUpdateUser}
                        permissions={permissions}
                    />

                    {/* نافذة الرسائل */}
                    <SendMessageModal
                        user={messageModal.user}
                        visible={messageModal.visible}
                        onClose={() => setMessageModal({ visible: false, user: null })}
                        onSend={onSendMessage}
                    />

                    {/* شريط الإجراءات الجماعية */}
                    <BulkActionsBar
                        selectedUsers={selectedUsers}
                        allUsers={filteredUsers}
                        onClearSelection={() => setSelectedRowKeys([])}
                        permissions={permissions}
                        onSuspendBulk={handleSuspendBulk}
                        onActivateBulk={handleActivateBulk}
                        onDeleteBulk={handleDeleteBulk}
                        onMessageBulk={handleMessageBulk}
                    />
                </div>
            </App>
        </ConfigProvider>
    );
}

export default function UsersPageV2() {
    return (
        <AccountTypeProtection allowedTypes={['admin']}>
            <UsersPageContent />
        </AccountTypeProtection>
    );
}
