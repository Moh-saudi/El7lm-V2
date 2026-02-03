/**
 * نافذة تعديل بيانات المستخدم
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Divider, message } from 'antd';
import { User, AccountType, ACCOUNT_TYPE_LABELS, Permission } from '../_types';

const { Option } = Select;

interface EditUserModalProps {
    visible: boolean;
    user: User | null;
    onClose: () => void;
    onUpdate: (user: User, data: Partial<User>) => Promise<boolean>;
    permissions: Permission;
}

export default function EditUserModal({
    visible,
    user,
    onClose,
    onUpdate,
    permissions,
}: EditUserModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    // تحديث النموذج عند فتح النافذة
    useEffect(() => {
        if (visible && user) {
            form.setFieldsValue({
                name: user.name,
                phone: user.phone,
                country: user.country,
                city: user.city,
                accountType: user.accountType,
            });
        }
    }, [visible, user, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            if (user) {
                const success = await onUpdate(user, values);
                if (success) {
                    onClose();
                }
            }
        } catch (error) {
            console.error('Validation failed:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <Modal
            title={`تعديل بيانات: ${user.name}`}
            open={visible}
            onOk={handleSubmit}
            onCancel={onClose}
            okText="حفظ التغييرات"
            cancelText="إلغاء"
            confirmLoading={loading}
            forceRender
        >
            <Form
                form={form}
                layout="vertical"
                name="edit_user_form"
            >
                <Form.Item
                    name="name"
                    label="الاسم الكامل"
                    rules={[{ required: true, message: 'يرجى إدخال الاسم' }]}
                >
                    <Input placeholder="الاسم الكامل" />
                </Form.Item>

                <Form.Item
                    name="phone"
                    label="رقم الهاتف"
                    rules={[{ required: true, message: 'يرجى إدخال رقم الهاتف' }]}
                >
                    <Input placeholder="رقم الهاتف" dir="ltr" />
                </Form.Item>

                <div className="grid grid-cols-2 gap-4">
                    <Form.Item
                        name="country"
                        label="الدولة"
                    >
                        <Input placeholder="الدولة" />
                    </Form.Item>

                    <Form.Item
                        name="city"
                        label="المدينة"
                    >
                        <Input placeholder="المدينة" />
                    </Form.Item>
                </div>

                <Divider />

                <Form.Item
                    name="accountType"
                    label="نوع الحساب"
                    rules={[{ required: true, message: 'يرجى اختيار نوع الحساب' }]}
                    extra="تغيير نوع الحساب قد يؤثر على صلاحيات المستخدم"
                >
                    <Select disabled={!permissions.edit}>
                        {Object.entries(ACCOUNT_TYPE_LABELS).map(([key, label]) => (
                            <Option key={key} value={key}>{label}</Option>
                        ))}
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    );
}
