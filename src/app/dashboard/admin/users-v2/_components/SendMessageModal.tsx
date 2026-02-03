/**
 * نافذة إرسال رسالة للمستخدم
 */

'use client';

import React, { useState } from 'react';
import { Modal, Form, Input, Radio, message } from 'antd';
import { User } from '../_types';
import { SendOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface SendMessageModalProps {
    visible: boolean;
    user: User | null;
    onClose: () => void;
    onSend: (user: User, title: string, body: string, method: 'notification' | 'email') => Promise<void>;
}

export default function SendMessageModal({
    visible,
    user,
    onClose,
    onSend,
}: SendMessageModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            if (user) {
                await onSend(user, values.title, values.body, values.method);
                form.resetFields();
                onClose();
                message.success('تم إرسال الرسالة بنجاح');
            }
        } catch (error) {
            console.error('Validation failed:', error);
            message.error('فشل إرسال الرسالة');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <Modal
            title={
                <span className="flex items-center gap-2">
                    <SendOutlined className="text-blue-500" />
                    إرسال رسالة إلى: {user.name}
                </span>
            }
            open={visible}
            onOk={handleSubmit}
            onCancel={onClose}
            okText="إرسال"
            cancelText="إلغاء"
            confirmLoading={loading}
            forceRender
        >
            <Form
                form={form}
                layout="vertical"
                name="send_message_form"
                initialValues={{ method: 'notification' }}
            >
                <Form.Item
                    name="method"
                    label="طريقة الإرسال"
                    className="mb-4"
                >
                    <Radio.Group buttonStyle="solid">
                        <Radio.Button value="notification">إشعار داخل التطبيق</Radio.Button>
                        {user.email && <Radio.Button value="email">بريد إلكتروني</Radio.Button>}
                    </Radio.Group>
                </Form.Item>

                <Form.Item
                    name="title"
                    label="عنوان الرسالة"
                    rules={[{ required: true, message: 'يرجى إدخال عنوان الرسالة' }]}
                >
                    <Input placeholder="عنوان الرسالة..." />
                </Form.Item>

                <Form.Item
                    name="body"
                    label="نص الرسالة"
                    rules={[{ required: true, message: 'يرجى إدخال نص الرسالة' }]}
                >
                    <TextArea
                        placeholder="اكتب رسالتك هنا..."
                        rows={4}
                        showCount
                        maxLength={500}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}
