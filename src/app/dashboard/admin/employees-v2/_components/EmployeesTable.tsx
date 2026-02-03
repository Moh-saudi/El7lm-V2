'use client';

import React from 'react';
import { Table, Tag, Button, Space, Avatar, Tooltip, Popconfirm, Switch } from 'antd';
import { EditOutlined, DeleteOutlined, UserOutlined, KeyOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Employee } from '../_types';
import { usePermissions } from '../_hooks/usePermissions';
import { formatDistanceToNow, differenceInMinutes, differenceInHours } from 'date-fns';
import { ar } from 'date-fns/locale';

interface EmployeesTableProps {
    employees: Employee[];
    loading: boolean;
    onEdit: (employee: Employee) => void;
    onDelete: (id: string) => void;
    onResetPassword?: (employee: Employee) => void;
    onToggleStatus?: (id: string, newStatus: boolean) => void;
}

export default function EmployeesTable({
    employees,
    loading,
    onEdit,
    onDelete,
    onResetPassword,
    onToggleStatus
}: EmployeesTableProps) {
    const { can } = usePermissions();

    // حساب ما إذا كان الموظف متصلاً (دخل خلال آخر 30 دقيقة)
    const isOnline = (lastLogin?: Date) => {
        if (!lastLogin) return false;
        const minutesAgo = differenceInMinutes(new Date(), lastLogin);
        return minutesAgo < 30;
    };

    // حساب مدة العمل منذ آخر دخول
    const getWorkDuration = (lastLogin?: Date) => {
        if (!lastLogin) return null;
        const hours = differenceInHours(new Date(), lastLogin);
        const minutes = differenceInMinutes(new Date(), lastLogin) % 60;

        if (hours > 24) return null; // أكثر من يوم، ربما خرج
        if (hours > 0) return `${hours} س ${minutes} د`;
        return `${minutes} دقيقة`;
    };

    const columns = [
        {
            title: 'الموظف',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: Employee) => (
                <Space>
                    <div className="relative">
                        <Avatar src={record.avatar} icon={<UserOutlined />} />
                        {/* مؤشر الاتصال */}
                        {isOnline(record.lastLogin) && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                        )}
                    </div>
                    <div>
                        <div className="font-semibold">{text}</div>
                        <div className="text-xs text-gray-400">{record.email}</div>
                        {record.jobTitle && (
                            <div className="text-xs text-blue-500">{record.jobTitle}</div>
                        )}
                    </div>
                </Space>
            ),
        },
        {
            title: 'الدور',
            dataIndex: 'roleName',
            key: 'role',
            render: (roleName: string, record: Employee) => {
                let color = 'blue';
                if (record.roleId === 'admin') color = 'gold';
                if (record.roleId === 'editor') color = 'green';

                return <Tag color={color}>{roleName || record.roleId}</Tag>;
            },
        },
        {
            title: 'القسم',
            dataIndex: 'department',
            key: 'department',
            render: (dept: string) => <Tag>{dept || 'عام'}</Tag>,
        },
        {
            title: 'الحالة',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (isActive: boolean, record: Employee) => (
                <div className="flex flex-col gap-1">
                    {can('update', 'employees') && onToggleStatus ? (
                        <Tooltip title={isActive ? 'اضغط لإيقاف الحساب' : 'اضغط لتفعيل الحساب'}>
                            <Switch
                                checked={isActive}
                                onChange={(checked) => onToggleStatus(record.id, checked)}
                                checkedChildren="نشط"
                                unCheckedChildren="متوقف"
                                size="small"
                            />
                        </Tooltip>
                    ) : (
                        <Tag color={isActive ? 'success' : 'error'}>
                            {isActive ? 'نشط' : 'متوقف'}
                        </Tag>
                    )}
                    {/* مؤشر الاتصال الحالي */}
                    {isActive && isOnline(record.lastLogin) && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircleOutlined /> متصل الآن
                        </span>
                    )}
                </div>
            ),
        },
        {
            title: 'نشاط العمل',
            key: 'workActivity',
            render: (_: any, record: Employee) => {
                const workDuration = getWorkDuration(record.lastLogin);
                const online = isOnline(record.lastLogin);

                return (
                    <div className="text-xs">
                        {record.lastLogin ? (
                            <>
                                <Tooltip title={record.lastLogin.toLocaleString('ar-EG')}>
                                    <div className="text-gray-500">
                                        آخر دخول: {formatDistanceToNow(record.lastLogin, { addSuffix: true, locale: ar })}
                                    </div>
                                </Tooltip>
                                {online && workDuration && (
                                    <div className="text-blue-600 flex items-center gap-1 mt-1">
                                        <ClockCircleOutlined /> مدة الجلسة: {workDuration}
                                    </div>
                                )}
                            </>
                        ) : (
                            <span className="text-gray-400">لم يدخل بعد</span>
                        )}
                    </div>
                );
            },
        },
        {
            title: 'الإجراءات',
            key: 'actions',
            width: 150,
            render: (_: any, record: Employee) => (
                <Space size="small">
                    {/* زر إعادة تعيين كلمة المرور */}
                    {can('manage', 'employees') && onResetPassword && (
                        <Tooltip title="إعادة تعيين كلمة المرور">
                            <Button
                                type="text"
                                icon={<KeyOutlined className="text-orange-500" />}
                                onClick={() => onResetPassword(record)}
                            />
                        </Tooltip>
                    )}

                    {/* زر التعديل */}
                    {can('update', 'employees') && (
                        <Tooltip title="تعديل">
                            <Button
                                type="text"
                                icon={<EditOutlined className="text-blue-500" />}
                                onClick={() => onEdit(record)}
                            />
                        </Tooltip>
                    )}

                    {/* زر الحذف */}
                    {can('delete', 'employees') && (
                        <Popconfirm
                            title="هل أنت متأكد من حذف هذا الموظف؟"
                            description="سيتم إيقاف حساب الموظف ولن يتمكن من الدخول."
                            onConfirm={() => onDelete(record.id)}
                            okText="نعم، حذف"
                            cancelText="إلغاء"
                            okButtonProps={{ danger: true }}
                        >
                            <Button
                                type="text"
                                icon={<DeleteOutlined className="text-red-500" />}
                                danger
                            />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <Table
            dataSource={employees}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 900 }}
        />
    );
}

