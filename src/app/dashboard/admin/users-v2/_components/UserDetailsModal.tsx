/**
 * نافذة تفاصيل المستخدم
 */

'use client';

import React from 'react';
import {
    Modal,
    Descriptions,
    Tag,
    Avatar,
    Progress,
    Button,
    Space,
    Divider,
    Timeline,
    Typography,
} from 'antd';
import {
    UserOutlined,
    MailOutlined,
    PhoneOutlined,
    GlobalOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    EditOutlined,
    MessageOutlined,
    StopOutlined,
    DeleteOutlined,
} from '@ant-design/icons';
import {
    User,
    Permission,
    ACCOUNT_TYPE_LABELS,
    ACCOUNT_TYPE_COLORS,
    STATUS_LABELS,
    STATUS_COLORS,
    VERIFICATION_LABELS,
    VERIFICATION_COLORS,
} from '../_types';

const { Text, Title } = Typography;

interface UserDetailsModalProps {
    user: User | null;
    visible: boolean;
    onClose: () => void;
    permissions: Permission;
    onEdit: (user: User) => void;
    onMessage: (user: User) => void;
    onSuspend: (user: User) => void;
    onActivate: (user: User) => void;
    onDelete: (user: User) => void;
    onVerify: (user: User) => void;
}

export default function UserDetailsModal({
    user,
    visible,
    onClose,
    permissions,
    onEdit,
    onMessage,
    onSuspend,
    onActivate,
    onDelete,
    onVerify,
}: UserDetailsModalProps) {
    if (!user) return null;

    return (
        <Modal
            title={null}
            open={visible}
            onCancel={onClose}
            footer={null}
            width={700}
            centered
        >
            {/* الهيدر */}
            <div className="flex items-start gap-4 mb-6">
                <Avatar
                    size={80}
                    src={user.profileImage}
                    icon={!user.profileImage && <UserOutlined />}
                    className="bg-gradient-to-br from-blue-400 to-purple-500"
                />
                <div className="flex-1">
                    <Title level={4} className="m-0 mb-1">{user.name}</Title>
                    <div className="flex flex-wrap gap-2 mb-2">
                        <Tag color={ACCOUNT_TYPE_COLORS[user.accountType]}>
                            {ACCOUNT_TYPE_LABELS[user.accountType]}
                        </Tag>
                        <Tag color={STATUS_COLORS[user.status]}>
                            {STATUS_LABELS[user.status]}
                        </Tag>
                        <Tag color={VERIFICATION_COLORS[user.verificationStatus]}>
                            {VERIFICATION_LABELS[user.verificationStatus]}
                        </Tag>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">اكتمال الملف:</span>
                        <Progress
                            percent={user.profileCompletion}
                            size="small"
                            className="w-32"
                            strokeColor={user.profileCompletion >= 80 ? '#52c41a' : user.profileCompletion >= 50 ? '#faad14' : '#ff4d4f'}
                        />
                    </div>
                </div>
            </div>

            {/* الأزرار */}
            <div className="flex flex-wrap gap-2 mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {permissions.edit && (
                    <Button icon={<EditOutlined />} onClick={() => onEdit(user)}>
                        تعديل
                    </Button>
                )}
                {permissions.message && (
                    <Button icon={<MessageOutlined />} onClick={() => onMessage(user)}>
                        إرسال رسالة
                    </Button>
                )}
                {user.verificationStatus !== 'verified' && permissions.edit && (
                    <Button
                        icon={<CheckCircleOutlined />}
                        type="primary"
                        onClick={() => onVerify(user)}
                    >
                        توثيق
                    </Button>
                )}
                {user.status === 'active' && permissions.suspend && (
                    <Button
                        icon={<StopOutlined />}
                        danger
                        onClick={() => onSuspend(user)}
                    >
                        تعليق
                    </Button>
                )}
                {user.status === 'suspended' && permissions.suspend && (
                    <Button
                        icon={<CheckCircleOutlined />}
                        type="primary"
                        onClick={() => onActivate(user)}
                    >
                        تفعيل
                    </Button>
                )}
                {permissions.delete && (
                    <Button
                        icon={<DeleteOutlined />}
                        danger
                        onClick={() => onDelete(user)}
                    >
                        حذف
                    </Button>
                )}
            </div>

            <Divider className="my-4" />

            {/* التفاصيل */}
            <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label={<><MailOutlined /> البريد</>} span={2}>
                    {user.email ? (
                        <Text copyable>{user.email}</Text>
                    ) : (
                        <span className="text-gray-400">غير محدد</span>
                    )}
                </Descriptions.Item>

                <Descriptions.Item label={<><PhoneOutlined /> الهاتف</>} span={2}>
                    {user.phone ? (
                        <Text copyable dir="ltr">{user.phone}</Text>
                    ) : (
                        <span className="text-gray-400">غير محدد</span>
                    )}
                </Descriptions.Item>

                <Descriptions.Item label={<><GlobalOutlined /> البلد</>}>
                    {user.country || <span className="text-gray-400">غير محدد</span>}
                </Descriptions.Item>

                <Descriptions.Item label="المدينة">
                    {user.city || <span className="text-gray-400">غير محدد</span>}
                </Descriptions.Item>

                <Descriptions.Item label={<><CalendarOutlined /> تاريخ التسجيل</>}>
                    {user.createdAt ? (
                        user.createdAt.toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })
                    ) : (
                        <span className="text-gray-400">غير محدد</span>
                    )}
                </Descriptions.Item>

                <Descriptions.Item label="آخر دخول">
                    {user.lastLogin ? (
                        user.lastLogin.toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })
                    ) : (
                        <span className="text-gray-400">لم يسجل دخول بعد</span>
                    )}
                </Descriptions.Item>

                {user.parentOrganizationName && (
                    <Descriptions.Item label="المنظمة" span={2}>
                        {user.parentOrganizationName}
                    </Descriptions.Item>
                )}

                {user.suspendReason && (
                    <Descriptions.Item label="سبب التعليق" span={2}>
                        <span className="text-red-500">{user.suspendReason}</span>
                    </Descriptions.Item>
                )}
            </Descriptions>

            {/* معرف المستخدم */}
            <div className="mt-4 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-500 font-mono">
                ID: <Text copyable={{ text: user.id }}>{user.id}</Text>
            </div>
        </Modal>
    );
}
