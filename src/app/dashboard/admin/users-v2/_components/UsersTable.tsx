/**
 * جدول المستخدمين - Ant Design Table
 */

'use client';

import React, { useState } from 'react';
import {
    Table,
    Tag,
    Avatar,
    Progress,
    Dropdown,
    Button,
    Space,
    Tooltip,
    Typography,
    Modal,
    Input,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
    MoreOutlined,
    UserOutlined,
    MailOutlined,
    PhoneOutlined,
    CheckCircleOutlined,
    StopOutlined,
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    MessageOutlined,
    SafetyCertificateOutlined,
    ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
    User,
    Permission,
    ACCOUNT_TYPE_LABELS,
    ACCOUNT_TYPE_COLORS,
    STATUS_COLORS,
    VERIFICATION_LABELS,
    VERIFICATION_COLORS,
} from '../_types';

const { Text } = Typography;
const { TextArea } = Input;

// الحصول على الأحرف الأولى من الاسم
const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// الحصول على لون الـ Avatar حسب نوع الحساب
const getAvatarColor = (accountType: string): string => {
    const colors: Record<string, string> = {
        player: '#1890ff',
        club: '#52c41a',
        academy: '#722ed1',
        trainer: '#fa8c16',
        agent: '#13c2c2',
        marketer: '#eb2f96',
        parent: '#faad14',
        admin: '#ff4d4f',
    };
    return colors[accountType] || '#1890ff';
};


interface UsersTableProps {
    users: User[];
    loading?: boolean;
    permissions: Permission;
    onView: (user: User) => void;
    onEdit: (user: User) => void;
    onSuspend: (user: User, reason: string) => Promise<boolean>;
    onActivate: (user: User) => Promise<boolean>;
    onDelete: (user: User, permanent?: boolean) => Promise<boolean>;
    onVerify: (user: User) => Promise<boolean>;
    onMessage: (user: User) => void;
    selectedRowKeys: React.Key[];
    onSelectionChange: (keys: React.Key[]) => void;
}

export default function UsersTable({
    users,
    loading,
    permissions,
    onView,
    onEdit,
    onSuspend,
    onActivate,
    onDelete,
    onVerify,
    onMessage,
    selectedRowKeys,
    onSelectionChange,
}: UsersTableProps) {
    const [suspendModal, setSuspendModal] = useState<{ visible: boolean; user: User | null }>({
        visible: false,
        user: null,
    });
    const [suspendReason, setSuspendReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // معالجة التعليق
    const handleSuspend = async () => {
        if (!suspendModal.user || !suspendReason.trim()) return;

        setActionLoading(true);
        const success = await onSuspend(suspendModal.user, suspendReason);
        setActionLoading(false);

        if (success) {
            setSuspendModal({ visible: false, user: null });
            setSuspendReason('');
        }
    };

    // تأكيد الحذف
    const confirmDelete = (user: User, permanent = false) => {
        Modal.confirm({
            title: permanent ? 'حذف نهائي' : 'حذف الحساب',
            icon: <ExclamationCircleOutlined />,
            content: permanent
                ? `هل أنت متأكد من حذف حساب "${user.name}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`
                : `هل أنت متأكد من حذف حساب "${user.name}"؟`,
            okText: 'حذف',
            okType: 'danger',
            cancelText: 'إلغاء',
            onOk: () => onDelete(user, permanent),
        });
    };

    // أعمدة الجدول
    const columns: ColumnsType<User> = [
        {
            title: 'المستخدم',
            key: 'user',
            fixed: 'left',
            width: 280,
            render: (_, record) => (
                <div className="flex items-center gap-3">
                    <Avatar
                        size={48}
                        src={record.profileImage || undefined}
                        style={{
                            backgroundColor: record.profileImage ? undefined : getAvatarColor(record.accountType),
                            fontSize: '18px',
                            fontWeight: 'bold',
                        }}
                    >
                        {!record.profileImage && getInitials(record.name)}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                            {record.name}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                            <Tag color={ACCOUNT_TYPE_COLORS[record.accountType]} className="m-0">
                                {ACCOUNT_TYPE_LABELS[record.accountType]}
                            </Tag>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: 'معلومات الاتصال',
            key: 'contact',
            width: 220,
            render: (_, record) => (
                <div className="space-y-1">
                    {record.email && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                            <MailOutlined className="text-gray-400" />
                            <Text copyable={{ text: record.email }} className="text-xs">
                                {record.email.length > 25 ? record.email.slice(0, 25) + '...' : record.email}
                            </Text>
                        </div>
                    )}
                    {record.phone && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                            <PhoneOutlined className="text-gray-400" />
                            <Text copyable={{ text: record.phone }} className="text-xs" dir="ltr">
                                {record.phone}
                            </Text>
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'الحالة',
            key: 'status',
            width: 120,
            align: 'center',
            filters: [
                { text: 'نشط', value: 'active' },
                { text: 'موقوف', value: 'suspended' },
                { text: 'محذوف', value: 'deleted' },
            ],
            onFilter: (value, record) => record.status === value,
            render: (_, record) => (
                <div className="flex flex-col items-center gap-1">
                    <Tag color={STATUS_COLORS[record.status]}>
                        {record.status === 'active' ? '🟢 نشط' :
                            record.status === 'suspended' ? '🟠 موقوف' : '🔴 محذوف'}
                    </Tag>
                    <Tag color={VERIFICATION_COLORS[record.verificationStatus]} className="text-xs">
                        {VERIFICATION_LABELS[record.verificationStatus]}
                    </Tag>
                </div>
            ),
        },
        {
            title: 'الملف الشخصي',
            key: 'profile',
            width: 120,
            align: 'center',
            sorter: (a, b) => a.profileCompletion - b.profileCompletion,
            render: (_, record) => (
                <Tooltip title={`${record.profileCompletion}% مكتمل`}>
                    <Progress
                        type="circle"
                        percent={record.profileCompletion}
                        size={40}
                        strokeColor={record.profileCompletion >= 80 ? '#52c41a' : record.profileCompletion >= 50 ? '#faad14' : '#ff4d4f'}
                    />
                </Tooltip>
            ),
        },
        {
            title: 'الموقع',
            key: 'location',
            width: 150,
            render: (_, record) => (
                <div className="text-sm">
                    {record.country && (
                        <div className="text-gray-600">{record.country}</div>
                    )}
                    {record.city && (
                        <div className="text-xs text-gray-400">{record.city}</div>
                    )}
                </div>
            ),
        },
        {
            title: 'تاريخ التسجيل',
            key: 'createdAt',
            width: 130,
            sorter: (a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0),
            render: (_, record) => (
                <div className="text-sm text-gray-600">
                    {record.createdAt ? (
                        <>
                            <div>{record.createdAt.toLocaleDateString('ar-EG')}</div>
                            <div className="text-xs text-gray-400">
                                {record.createdAt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </>
                    ) : (
                        <span className="text-gray-400">-</span>
                    )}
                </div>
            ),
        },
        {
            title: 'الإجراءات',
            key: 'actions',
            fixed: 'right',
            width: 80,
            align: 'center',
            render: (_, record) => {
                const items = [
                    permissions.view && {
                        key: 'view',
                        icon: <EyeOutlined />,
                        label: 'عرض التفاصيل',
                        onClick: () => onView(record),
                    },
                    permissions.edit && {
                        key: 'edit',
                        icon: <EditOutlined />,
                        label: 'تعديل',
                        onClick: () => onEdit(record),
                    },
                    permissions.message && {
                        key: 'message',
                        icon: <MessageOutlined />,
                        label: 'إرسال رسالة',
                        onClick: () => onMessage(record),
                    },
                    record.verificationStatus !== 'verified' && permissions.edit && {
                        key: 'verify',
                        icon: <SafetyCertificateOutlined />,
                        label: 'توثيق الحساب',
                        onClick: () => onVerify(record),
                    },
                    { type: 'divider' },
                    record.status === 'active' && permissions.suspend && {
                        key: 'suspend',
                        icon: <StopOutlined />,
                        label: 'تعليق الحساب',
                        danger: true,
                        onClick: () => setSuspendModal({ visible: true, user: record }),
                    },
                    record.status === 'suspended' && permissions.suspend && {
                        key: 'activate',
                        icon: <CheckCircleOutlined />,
                        label: 'تفعيل الحساب',
                        onClick: () => onActivate(record),
                    },
                    permissions.delete && {
                        key: 'delete',
                        icon: <DeleteOutlined />,
                        label: 'حذف',
                        danger: true,
                        onClick: () => confirmDelete(record),
                    },
                ].filter(Boolean) as any[];

                return (
                    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
                        <Button type="text" icon={<MoreOutlined />} />
                    </Dropdown>
                );
            },
        },
    ];

    // إعدادات الصفحات
    const pagination: TablePaginationConfig = {
        pageSize: 20,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50', '100'],
        showTotal: (total, range) => `${range[0]}-${range[1]} من ${total} مستخدم`,
        showQuickJumper: true,
    };

    return (
        <>
            <Table
                columns={columns}
                dataSource={users}
                rowKey="id"
                loading={loading}
                pagination={pagination}
                scroll={{ x: 1200 }}
                rowSelection={
                    permissions.bulkActions
                        ? {
                            selectedRowKeys,
                            onChange: onSelectionChange,
                        }
                        : undefined
                }
                size="middle"
                className="users-table"
            />

            {/* نافذة التعليق */}
            <Modal
                title="تعليق الحساب"
                open={suspendModal.visible}
                onOk={handleSuspend}
                onCancel={() => {
                    setSuspendModal({ visible: false, user: null });
                    setSuspendReason('');
                }}
                okText="تعليق"
                cancelText="إلغاء"
                okButtonProps={{ danger: true, loading: actionLoading }}
                confirmLoading={actionLoading}
            >
                <div className="space-y-4">
                    <p>
                        سيتم تعليق حساب <strong>{suspendModal.user?.name}</strong>
                    </p>
                    <TextArea
                        placeholder="سبب التعليق..."
                        value={suspendReason}
                        onChange={e => setSuspendReason(e.target.value)}
                        rows={3}
                    />
                </div>
            </Modal>
        </>
    );
}
