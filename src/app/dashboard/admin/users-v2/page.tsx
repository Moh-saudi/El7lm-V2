/**
 * صفحة إدارة المستخدمين - النسخة 2
 * تصميم جديد باستخدام Ant Design
 */

'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import { useUsers, filterUsers } from './_hooks/useUsers';
import { useUserActions } from './_hooks/useUserActions';

// الأدوات
import { exportToCSV, exportToJSON } from './_utils/export';

// الأنواع
import { User, UsersFilters, ROLE_PERMISSIONS, Permission } from './_types';

import { useAbility } from '@/hooks/useAbility';
import AccessDenied from '@/components/admin/AccessDenied';

// حماية الصفحة
import { AccountTypeProtection } from '@/hooks/useAccountTypeAuth';
import { useAuth } from '@/lib/firebase/auth-provider';

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

    // جلب البيانات - زيادة الحد لجلب جميع المستخدمين
    const { users, loading, error, stats, refetch } = useUsers(2000);
    const { suspendUser, activateUser, deleteUser, verifyUser, updateUser, sendMessage } = useUserActions();

    // فلترة المستخدمين
    const filteredUsers = useMemo(() => {
        let baseFiltered = filterUsers(users, filters);

        // استبعاد حسابات المسؤولين (الموظفين) لأن لهم صفحة خاصة ولا يجب أن يظهروا هنا
        baseFiltered = baseFiltered.filter(user => user.accountType !== 'admin');

        // تطبيق قيود النطاق الجغرافي من CASL إذا وجدت
        // نقوم بالتحقق مما إذا كان المستخدم يملك صلاحية القراءة لهذا المستخدم المحدد (بناءً على بلده)
        return baseFiltered.filter(user => can('read', { resource: 'users', country: user.country } as any));
    }, [users, filters, can]);

    // المستخدمين المحددين
    const selectedUsers = useMemo(() => {
        return users.filter(u => selectedRowKeys.includes(u.id));
    }, [users, selectedRowKeys]);

    // قائمة البلدان المتاحة
    const countries = useMemo(() => {
        return [...new Set(users.map(u => u.country).filter(Boolean))].sort();
    }, [users]);

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

    // تحديث الفلاتر
    const handleFiltersChange = useCallback((newFilters: Partial<UsersFilters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    // إعادة تعيين الفلاتر
    const handleResetFilters = useCallback(() => {
        setFilters(DEFAULT_FILTERS);
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
            const response = await fetch('/api/admin/sync-users-dates', {
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
                                    <span className="text-gray-600">إجمالي الحسابات في Firebase Auth:</span>
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
                    colorPrimary: '#1890ff',
                },
            }}
        >
            <App>
                <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
                    {/* الهيدر */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <Title level={2} className="m-0 mb-1">
                                إدارة المستخدمين
                            </Title>
                            <Text type="secondary">
                                {filteredUsers.length} مستخدم {activeFiltersCount > 0 && `(مُفلتر من ${users.length})`}
                            </Text>
                        </div>
                        <Space wrap>
                            {/* زر المزامنة الجديد */}
                            <Button
                                icon={<CloudSyncOutlined spin={isSyncing} />}
                                onClick={handleSyncUsers}
                                loading={isSyncing}
                                disabled={isSyncing}
                            >
                                مزامنة البيانات
                            </Button>

                            {/* التحديث التلقائي */}
                            <Tooltip title={autoRefresh ? 'إيقاف التحديث التلقائي' : 'تفعيل التحديث التلقائي (كل 30 ثانية)'}>
                                <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                    <SyncOutlined spin={autoRefresh} className={autoRefresh ? 'text-green-500' : 'text-gray-400'} />
                                    <Switch
                                        size="small"
                                        checked={autoRefresh}
                                        onChange={setAutoRefresh}
                                    />
                                </div>
                            </Tooltip>

                            {permissions.export && (
                                <Button icon={<DownloadOutlined />} onClick={() => handleExport('csv')}>
                                    تصدير
                                </Button>
                            )}
                            {permissions.edit && (
                                <Button type="primary" icon={<UserAddOutlined />} onClick={handleAddUser}>
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
                                totalCount={users.length}
                                filteredCount={filteredUsers.length}
                            />

                            {/* الجدول */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                <UsersTable
                                    users={filteredUsers}
                                    loading={loading}
                                    permissions={permissions}
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
