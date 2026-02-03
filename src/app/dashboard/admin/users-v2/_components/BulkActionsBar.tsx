/**
 * شريط الإجراءات الجماعية
 */

'use client';

import React, { useState } from 'react';
import { Button, Space, Dropdown, Modal, Input, message, Popconfirm } from 'antd';
import {
    DownloadOutlined,
    MessageOutlined,
    StopOutlined,
    CheckCircleOutlined,
    DeleteOutlined,
    CloseOutlined,
    FileExcelOutlined,
    FileTextOutlined,
} from '@ant-design/icons';
import { User, Permission } from '../_types';
import { exportToCSV, exportToJSON } from '../_utils/export';

const { TextArea } = Input;

interface BulkActionsBarProps {
    selectedUsers: User[];
    allUsers: User[];
    onClearSelection: () => void;
    permissions: Permission;
    onSuspendBulk: (users: User[], reason: string) => Promise<void>;
    onActivateBulk: (users: User[]) => Promise<void>;
    onDeleteBulk: (users: User[]) => Promise<void>;
    onMessageBulk: (users: User[], title: string, body: string) => Promise<void>;
}

export default function BulkActionsBar({
    selectedUsers,
    allUsers,
    onClearSelection,
    permissions,
    onSuspendBulk,
    onActivateBulk,
    onDeleteBulk,
    onMessageBulk,
}: BulkActionsBarProps) {
    const [messageModal, setMessageModal] = useState(false);
    const [suspendModal, setSuspendModal] = useState(false);
    const [messageTitle, setMessageTitle] = useState('');
    const [messageBody, setMessageBody] = useState('');
    const [suspendReason, setSuspendReason] = useState('');
    const [loading, setLoading] = useState(false);

    if (selectedUsers.length === 0) return null;

    // تصدير المحددين
    const handleExportSelected = (format: 'csv' | 'json') => {
        if (format === 'csv') {
            exportToCSV(selectedUsers, 'selected_users');
        } else {
            exportToJSON(selectedUsers, 'selected_users');
        }
        message.success(`تم تصدير ${selectedUsers.length} مستخدم`);
    };

    // إرسال رسالة جماعية
    const handleSendMessage = async () => {
        if (!messageTitle.trim() || !messageBody.trim()) {
            message.error('يرجى إدخال عنوان ونص الرسالة');
            return;
        }
        setLoading(true);
        try {
            await onMessageBulk(selectedUsers, messageTitle, messageBody);
            setMessageModal(false);
            setMessageTitle('');
            setMessageBody('');
            message.success(`تم إرسال الرسالة إلى ${selectedUsers.length} مستخدم`);
        } catch (error) {
            message.error('حدث خطأ في إرسال الرسائل');
        }
        setLoading(false);
    };

    // تعليق جماعي
    const handleSuspendBulk = async () => {
        if (!suspendReason.trim()) {
            message.error('يرجى إدخال سبب التعليق');
            return;
        }
        setLoading(true);
        try {
            await onSuspendBulk(selectedUsers, suspendReason);
            setSuspendModal(false);
            setSuspendReason('');
            onClearSelection();
        } catch (error) {
            message.error('حدث خطأ في تعليق الحسابات');
        }
        setLoading(false);
    };

    // تفعيل جماعي
    const handleActivateBulk = async () => {
        setLoading(true);
        try {
            await onActivateBulk(selectedUsers);
            onClearSelection();
        } catch (error) {
            message.error('حدث خطأ في تفعيل الحسابات');
        }
        setLoading(false);
    };

    // حذف جماعي
    const handleDeleteBulk = async () => {
        setLoading(true);
        try {
            await onDeleteBulk(selectedUsers);
            onClearSelection();
        } catch (error) {
            message.error('حدث خطأ في حذف الحسابات');
        }
        setLoading(false);
    };

    const exportItems = [
        {
            key: 'csv',
            icon: <FileExcelOutlined />,
            label: 'تصدير CSV (Excel)',
            onClick: () => handleExportSelected('csv'),
        },
        {
            key: 'json',
            icon: <FileTextOutlined />,
            label: 'تصدير JSON',
            onClick: () => handleExportSelected('json'),
        },
        { type: 'divider' },
        {
            key: 'csv-all',
            icon: <FileExcelOutlined />,
            label: `تصدير الكل (${allUsers.length})`,
            onClick: () => {
                exportToCSV(allUsers, 'all_users');
                message.success(`تم تصدير ${allUsers.length} مستخدم`);
            },
        },
    ];

    return (
        <>
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center gap-4">
                    {/* العدد المحدد */}
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                        <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">
                            {selectedUsers.length}
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 text-sm">
                            محدد
                        </span>
                    </div>

                    <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

                    {/* الإجراءات */}
                    <Space size="small">
                        {/* تصدير */}
                        <Dropdown menu={{ items: exportItems as any }} trigger={['click']}>
                            <Button icon={<DownloadOutlined />}>
                                تصدير
                            </Button>
                        </Dropdown>

                        {/* رسالة */}
                        {permissions.message && (
                            <Button
                                icon={<MessageOutlined />}
                                onClick={() => setMessageModal(true)}
                            >
                                رسالة
                            </Button>
                        )}

                        {/* تفعيل */}
                        {permissions.suspend && (
                            <Popconfirm
                                title="تفعيل الحسابات"
                                description={`هل تريد تفعيل ${selectedUsers.length} حساب؟`}
                                onConfirm={handleActivateBulk}
                                okText="تفعيل"
                                cancelText="إلغاء"
                            >
                                <Button
                                    icon={<CheckCircleOutlined />}
                                    type="primary"
                                    loading={loading}
                                >
                                    تفعيل
                                </Button>
                            </Popconfirm>
                        )}

                        {/* تعليق */}
                        {permissions.suspend && (
                            <Button
                                icon={<StopOutlined />}
                                danger
                                onClick={() => setSuspendModal(true)}
                            >
                                تعليق
                            </Button>
                        )}

                        {/* حذف */}
                        {permissions.delete && (
                            <Popconfirm
                                title="حذف الحسابات"
                                description={`هل تريد حذف ${selectedUsers.length} حساب؟`}
                                onConfirm={handleDeleteBulk}
                                okText="حذف"
                                okType="danger"
                                cancelText="إلغاء"
                            >
                                <Button
                                    icon={<DeleteOutlined />}
                                    danger
                                    loading={loading}
                                >
                                    حذف
                                </Button>
                            </Popconfirm>
                        )}
                    </Space>

                    <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

                    {/* إلغاء التحديد */}
                    <Button
                        type="text"
                        icon={<CloseOutlined />}
                        onClick={onClearSelection}
                    >
                        إلغاء
                    </Button>
                </div>
            </div>

            {/* نافذة الرسالة */}
            <Modal
                title="إرسال رسالة جماعية"
                open={messageModal}
                onOk={handleSendMessage}
                onCancel={() => setMessageModal(false)}
                okText="إرسال"
                cancelText="إلغاء"
                confirmLoading={loading}
            >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        سيتم إرسال الرسالة إلى <strong>{selectedUsers.length}</strong> مستخدم
                    </p>
                    <Input
                        placeholder="عنوان الرسالة..."
                        value={messageTitle}
                        onChange={e => setMessageTitle(e.target.value)}
                    />
                    <TextArea
                        placeholder="نص الرسالة..."
                        value={messageBody}
                        onChange={e => setMessageBody(e.target.value)}
                        rows={4}
                    />
                </div>
            </Modal>

            {/* نافذة التعليق */}
            <Modal
                title="تعليق الحسابات"
                open={suspendModal}
                onOk={handleSuspendBulk}
                onCancel={() => setSuspendModal(false)}
                okText="تعليق"
                okButtonProps={{ danger: true }}
                cancelText="إلغاء"
                confirmLoading={loading}
            >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        سيتم تعليق <strong>{selectedUsers.length}</strong> حساب
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
