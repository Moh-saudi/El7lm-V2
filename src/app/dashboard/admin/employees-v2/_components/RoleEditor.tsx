'use client';

import React, { useEffect, useState } from 'react';
import { Form, Input, Collapse, Switch, Tag, Row, Col, Alert, Badge, Typography } from 'antd';
import { CheckOutlined, CloseOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import { Role, Permission, PermissionAction, PermissionResource, ALL_PERMISSIONS_LIST } from '../_types';

const { Panel } = Collapse;
const { Text } = Typography;

interface RoleEditorProps {
    initialValues?: Partial<Role>;
    form: any;
}

export default function RoleEditor({ initialValues, form }: RoleEditorProps) {
    const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);

    useEffect(() => {
        if (initialValues?.permissions) {
            setSelectedPermissions(initialValues.permissions);
            form.setFieldsValue(initialValues);
        } else {
            setSelectedPermissions([]);
            form.resetFields();
        }
    }, [initialValues, form]);

    // معالجة تغيير صلاحية فردية
    const togglePermission = (resource: PermissionResource, action: PermissionAction, checked: boolean) => {
        const permission: Permission = `${action}:${resource}`;
        let newPermissions = [...selectedPermissions];

        if (checked) {
            if (!newPermissions.includes(permission)) newPermissions.push(permission);
        } else {
            newPermissions = newPermissions.filter(p => p !== permission);
        }

        setSelectedPermissions(newPermissions);
        form.setFieldValue('permissions', newPermissions);
    };

    // معالجة تغيير صلاحيات قسم كامل (تفعيل/إلغاء تفعيل الكل)
    const toggleResourceAll = (resource: PermissionResource, actions: PermissionAction[], checked: boolean) => {
        let newPermissions = [...selectedPermissions];

        // أولاً نحذف كل صلاحيات هذا المورد
        newPermissions = newPermissions.filter(p => !p.endsWith(`:${resource}`));

        if (checked) {
            // نضيف كل الصلاحيات بما فيها 'manage'
            newPermissions.push(`manage:${resource}` as Permission);
            actions.forEach(action => {
                if (action !== 'manage') newPermissions.push(`${action}:${resource}` as Permission);
            });
        }

        setSelectedPermissions(newPermissions);
        form.setFieldValue('permissions', newPermissions);
    };

    const isPermissionSelected = (resource: PermissionResource, action: PermissionAction) => {
        return selectedPermissions.includes(`${action}:${resource}`);
    };

    const isResourceFullyManaged = (resource: PermissionResource) => {
        return isPermissionSelected(resource, 'manage');
    };

    // حساب عدد الصلاحيات المختارة لكل مورد
    const getSelectedCountForResource = (resource: PermissionResource) => {
        return selectedPermissions.filter(p => p.endsWith(`:${resource}`)).length;
    };

    // دالة مساعدة لتلوين الصلاحيات
    const getActionColor = (action: string) => {
        switch (action) {
            case 'create': return 'green';
            case 'read': return 'blue';
            case 'update': return 'orange';
            case 'delete': return 'red';
            case 'manage': return 'purple';
            default: return 'default';
        }
    };

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'create': return 'إضافة';
            case 'read': return 'عرض';
            case 'update': return 'تعديل';
            case 'delete': return 'حذف';
            case 'manage': return 'تحكم  كامل';
            default: return action;
        }
    };

    return (
        <Form form={form} layout="vertical">
            <Alert
                message="إدارة الصلاحيات المتقدمة"
                description="قم بتكوين أدوار دقيقة. استخدم المفتاح الرئيسي لتفعيل الإدارة الكاملة للقسم، أو افتح القائمة لتحديد صلاحيات جزئية."
                type="info"
                showIcon
                className="mb-6"
            />

            <Row gutter={16}>
                <Col span={24}>
                    <Form.Item
                        name="name"
                        label="اسم الدور الوظيفي"
                        rules={[{ required: true, message: 'يرجى إدخال اسم الدور' }]}
                    >
                        <Input size="large" placeholder="مثال: مدير مالي، مشرف محتوى..." prefix={<Badge status="processing" />} />
                    </Form.Item>
                </Col>
                <Col span={24}>
                    <Form.Item
                        name="description"
                        label="وصف المهام"
                    >
                        <Input.TextArea placeholder="وصف موجز للمسؤوليات..." rows={2} />
                    </Form.Item>
                </Col>
            </Row>

            <Form.Item name="permissions" hidden>
                <Input />
            </Form.Item>

            <div className="mt-4">
                <h3 className="text-gray-700 font-semibold mb-3">مصفوفة الصلاحيات</h3>

                <Collapse
                    accordion
                    expandIcon={({ isActive }) => isActive ? <DownOutlined /> : <RightOutlined />}
                    className="bg-white border-none shadow-sm rounded-lg overflow-hidden"
                >
                    {ALL_PERMISSIONS_LIST.map((group) => {
                        const selectedCount = getSelectedCountForResource(group.resource);
                        const isFull = isResourceFullyManaged(group.resource);

                        return (
                            <Panel
                                key={group.resource}
                                header={
                                    <div className="flex items-center justify-between w-full py-1">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-gray-800 text-base">{group.label}</span>
                                            <span className="text-xs text-gray-400">{group.description || 'إدارة صلاحيات هذا القسم'}</span>
                                        </div>
                                        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                            {selectedCount > 0 && !isFull && (
                                                <Tag color="blue">{selectedCount} صلاحيات</Tag>
                                            )}
                                            {isFull && <Tag color="purple">إدارة كاملة</Tag>}

                                            <Switch
                                                checked={isFull || (selectedCount === group.actions.length)}
                                                onChange={(checked) => toggleResourceAll(group.resource, group.actions, checked)}
                                                checkedChildren={<CheckOutlined />}
                                                unCheckedChildren={<CloseOutlined />}
                                            />
                                        </div>
                                    </div>
                                }
                                className="mb-2 border border-gray-100 rounded-lg"
                            >
                                <div className="p-2 bg-gray-50 rounded-md">
                                    <Row gutter={[16, 16]}>
                                        {/* خيار الإدارة الكاملة المميز */}
                                        <Col span={24}>
                                            <div className={`p-3 rounded-lg flex items-center justify-between transition-colors ${isFull ? 'bg-purple-50 border border-purple-200' : 'bg-white border border-gray-200'}`}>
                                                <div>
                                                    <span className={`font-bold ${isFull ? 'text-purple-700' : 'text-gray-600'}`}>إدارة كاملة (Admin)</span>
                                                    <p className="text-xs text-gray-400 m-0">يمنح جميع الصلاحيات الحالية والمستقبلية لهذا القسم</p>
                                                </div>
                                                <Switch
                                                    size="small"
                                                    checked={isFull}
                                                    onChange={(checked) => togglePermission(group.resource, 'manage', checked)}
                                                />
                                            </div>
                                        </Col>

                                        {/* الصلاحيات الفرعية */}
                                        {group.actions.filter(a => a !== 'manage').map(action => (
                                            <Col key={action} xs={24} sm={12} md={8}>
                                                <div
                                                    className={`
                                                        flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm
                                                        ${isPermissionSelected(group.resource, action)
                                                            ? `bg-${getActionColor(action)}-50 border-${getActionColor(action)}-200`
                                                            : 'bg-white border-gray-200 hover:border-blue-300'}
                                                    `}
                                                    onClick={() => togglePermission(group.resource, action, !isPermissionSelected(group.resource, action))}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Tag color={getActionColor(action)} className="mr-0">
                                                            {getActionLabel(action)}
                                                        </Tag>
                                                        {/* <span className="text-gray-600 text-sm font-medium">{getActionLabel(action)}</span> */}
                                                    </div>

                                                    {isPermissionSelected(group.resource, action) && (
                                                        <CheckOutlined className={`text-${getActionColor(action)}-600`} />
                                                    )}
                                                </div>
                                            </Col>
                                        ))}
                                    </Row>
                                </div>
                            </Panel>
                        );
                    })}
                </Collapse>
            </div>
        </Form>
    );
}
