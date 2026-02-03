'use client';

import React, { useState } from 'react';
import { Button, Card, Tabs, Modal, Form, Space, message, Alert, Input } from 'antd';
import { PlusOutlined, UsergroupAddOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import EmployeesTable from './_components/EmployeesTable';
import EmployeeForm from './_components/EmployeeForm';
import RoleEditor from './_components/RoleEditor';
import { useEmployees } from './_hooks/useEmployees';
import { useAbility } from '@/hooks/useAbility';
import AccessDenied from '@/components/admin/AccessDenied';
import { Employee, Role } from './_types';

const { TabPane } = Tabs;

export default function EmployeesPageV2() {
    const { employees, roles, loading, addEmployee, updateEmployee, deleteEmployee, addRole, updateRole, deleteRole, resetEmployeePassword } = useEmployees();
    const { can } = useAbility();

    if (!can('read', 'employees')) {
        return <AccessDenied resource="إدارة الموظفين والصلاحيات" />;
    }
    const [form] = Form.useForm();
    const [roleForm] = Form.useForm();
    const [passwordForm] = Form.useForm();

    // حالات النوافذ المنبثقة
    const [isEmpModalVisible, setIsEmpModalVisible] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

    const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);

    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
    const [passwordResetEmp, setPasswordResetEmp] = useState<Employee | null>(null);

    // --- معالجة الموظفين ---
    const handleAddEmployee = () => {
        setEditingEmployee(null);
        setIsEmpModalVisible(true);
    };

    const handleEditEmployee = (emp: Employee) => {
        setEditingEmployee(emp);
        setIsEmpModalVisible(true);
    };

    const handleEmpModalOk = async () => {
        try {
            const values = await form.validateFields();

            // تحضير البيانات
            const empData = {
                ...values,
                roleName: roles.find(r => r.id === values.roleId)?.name // حفظ الاسم للعرض
            };

            if (editingEmployee) {
                // تعديل
                await updateEmployee(editingEmployee.id, empData);
            } else {
                // إضافة جديد (بكلمة المرور)
                if (!values.password) throw new Error('كلمة المرور مطلوبة');
                await addEmployee(empData, values.password);
            }

            setIsEmpModalVisible(false);
            form.resetFields();
        } catch (error) {
            console.error('Validate Failed:', error);
        }
    };

    // --- معالجة الأدوار ---
    const handleAddRole = () => {
        setEditingRole(null);
        setIsRoleModalVisible(true);
    };

    const handleEditRole = (role: Role) => {
        // منع تعديل دور الأدمن
        if (role.id === 'admin') {
            message.warning('لا يمكن تعديل صلاحيات المدير العام للنظام');
            return;
        }
        setEditingRole(role);
        setIsRoleModalVisible(true);
    };

    const handleRoleModalOk = async () => {
        try {
            const values = await roleForm.validateFields();

            if (editingRole) {
                await updateRole(editingRole.id, values);
            } else {
                await addRole(values);
            }

            setIsRoleModalVisible(false);
            roleForm.resetFields();
        } catch (error) {
            console.error('Validate Failed:', error);
        }
    };

    // --- إعادة تعيين كلمة المرور ---
    const handleResetPasswordClick = (emp: Employee) => {
        setPasswordResetEmp(emp);
        setIsPasswordModalVisible(true);
        passwordForm.resetFields();
    };

    const handlePasswordResetOk = async () => {
        try {
            const values = await passwordForm.validateFields();
            if (!passwordResetEmp) return;

            await resetEmployeePassword(passwordResetEmp.uid, values.newPassword);
            setIsPasswordModalVisible(false);
            passwordForm.resetFields();
            setPasswordResetEmp(null);
        } catch (error) {
            console.error('Password Reset Failed:', error);
        }
    };

    // --- تغيير حالة الموظف (نشط/متوقف) ---
    const handleToggleStatus = async (id: string, newStatus: boolean) => {
        try {
            await updateEmployee(id, { isActive: newStatus });
            message.success(newStatus ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب');
        } catch (error) {
            console.error('Toggle status failed:', error);
        }
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إدارة الموظفين والصلاحيات</h1>
                    <p className="text-gray-500">التحكم الكامل في فريق العمل وتوزيع المهام</p>
                </div>
            </div>

            <Tabs defaultActiveKey="employees" type="card">

                {/* تبويب الموظفين */}
                <TabPane
                    tab={<span className="flex items-center gap-2"><UsergroupAddOutlined /> الموظفين</span>}
                    key="employees"
                >
                    <Card
                        extra={
                            can('create', 'employees') && (
                                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddEmployee}>
                                    إضافة موظف جديد
                                </Button>
                            )
                        }
                    >
                        <EmployeesTable
                            employees={employees}
                            loading={loading}
                            onEdit={handleEditEmployee}
                            onDelete={(id) => deleteEmployee(id)}
                            onResetPassword={handleResetPasswordClick}
                            onToggleStatus={handleToggleStatus}
                        />
                    </Card>
                </TabPane>

                {/* تبويب الأدوار - يظهر فقط لمن يملك صلاحية إدارة الأدوار */}
                {can('manage', 'roles') && (
                    <TabPane
                        tab={<span className="flex items-center gap-2"><SafetyCertificateOutlined /> الأدوار والصلاحيات</span>}
                        key="roles"
                    >
                        <Alert
                            message="إدارة الأدوار"
                            description="هنا يمكنك إنشاء أدوار وظيفية جديدة وتحديد الصلاحيات الدقيقة لكل دور."
                            type="info"
                            showIcon
                            className="mb-4"
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* بطاقة إضافة دور جديد */}
                            <div
                                onClick={handleAddRole}
                                className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors min-h-[200px]"
                            >
                                <PlusOutlined className="text-3xl text-gray-400 mb-2" />
                                <span className="text-gray-600 font-medium">إنشاء دور جديد</span>
                            </div>

                            {/* بطاقات الأدوار الموجودة */}
                            {roles.map(role => (
                                <Card
                                    key={role.id}
                                    title={role.name}
                                    extra={
                                        role.id !== 'admin' && (
                                            <Button type="link" onClick={() => handleEditRole(role)}>تعديل</Button>
                                        )
                                    }
                                    className="hover:shadow-md transition-shadow"
                                >
                                    <p className="text-gray-500 mb-4 h-10 overflow-hidden text-ellipsis">
                                        {role.description || 'لا يوجد وصف'}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                            {role.permissions.length} صلاحيات
                                        </span>
                                        {role.isSystem && (
                                            <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                                                نظام
                                            </span>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </TabPane>
                )}
            </Tabs>

            {/* نافذة الموظف */}
            <Modal
                title={editingEmployee ? 'تعديل بيانات موظف' : 'إضافة موظف جديد'}
                open={isEmpModalVisible}
                onOk={handleEmpModalOk}
                onCancel={() => setIsEmpModalVisible(false)}
                width={800}
                okText="حفظ"
                cancelText="إلغاء"
            >
                <EmployeeForm
                    form={form}
                    roles={roles}
                    isEditing={!!editingEmployee}
                    initialValues={editingEmployee || undefined}
                />
            </Modal>

            {/* نافذة الدور */}
            <Modal
                title={editingRole ? 'تعديل الصلاحيات' : 'إنشاء دور وظيفي جديد'}
                open={isRoleModalVisible}
                onOk={handleRoleModalOk}
                onCancel={() => setIsRoleModalVisible(false)}
                width={900}
                okText="حفظ الصلاحيات"
                cancelText="إلغاء"
                className="top-5"
            >
                <RoleEditor
                    form={roleForm}
                    initialValues={editingRole || undefined}
                />
            </Modal>

            {/* نافذة تغيير كلمة المرور */}
            <Modal
                title={`تغيير كلمة المرور: ${passwordResetEmp?.name}`}
                open={isPasswordModalVisible}
                onOk={handlePasswordResetOk}
                onCancel={() => setIsPasswordModalVisible(false)}
                okText="تحديث كلمة المرور"
                cancelText="إلغاء"
                confirmLoading={loading}
            >
                <Alert
                    message="تنبيه أمني"
                    description="سيتم تغيير كلمة المرور فوراً وسيطلب من الموظف تسجيل الدخول بالكلمة الجديدة."
                    type="warning"
                    showIcon
                    className="mb-4"
                />
                <Form form={passwordForm} layout="vertical">
                    <Form.Item
                        name="newPassword"
                        label="كلمة المرور الجديدة"
                        rules={[{ required: true, min: 6, message: 'يجب أن تكون 6 أحرف على الأقل' }]}
                    >
                        <Input.Password placeholder="أدخل كلمة مرور قوية" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
