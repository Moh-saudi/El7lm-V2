'use client';

import React, { useEffect } from 'react';
import { Form, Input, Select, Switch, Row, Col, Divider, Alert, Upload, Button, message } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, InboxOutlined, FileTextOutlined } from '@ant-design/icons';
import { Employee, Role, EmployeeDocument } from '../_types';

interface EmployeeFormProps {
    initialValues?: Partial<Employee>;
    roles: Role[];
    isEditing: boolean;
    form: any; // Ant Form Instance
}

const { Dragger } = Upload;

export default function EmployeeForm({ initialValues, roles, isEditing, form }: EmployeeFormProps) {

    const [uploadedDocs, setUploadedDocs] = React.useState<EmployeeDocument[]>([]);

    // إعادة تعيين النموذج عند تغيير القيم الأولية
    useEffect(() => {
        if (initialValues) {
            form.setFieldsValue(initialValues);
            if (initialValues.documents) {
                setUploadedDocs(initialValues.documents);
            }
        } else {
            form.resetFields();
            form.setFieldsValue({ isActive: true });
            setUploadedDocs([]);
        }
    }, [initialValues, form]);

    // دالة مخصصة للرفع
    const handleCustomUpload = async ({ file, onSuccess, onError }: any) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'employees'); // مجلد رئيسي
        formData.append('path', `documents/${Date.now()}_${file.name}`); // مسار فرعي
        formData.append('contentType', file.type);

        try {
            const response = await fetch('/api/storage/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();

            if (data.success) {
                const newDoc: EmployeeDocument = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    url: data.url,
                    type: file.type.includes('image') ? 'image' : 'document',
                    uploadedAt: new Date()
                };

                setUploadedDocs(prev => {
                    const updated = [...prev, newDoc];
                    // تحديث قيمة الفورم أيضاً لضمان إرسالها
                    form.setFieldsValue({ documents: updated });
                    return updated;
                });

                onSuccess(data, file);
                message.success('تم رفع الملف بنجاح');
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            console.error('Upload error:', err);
            onError(err);
            message.error('فشل رفع الملف: ' + err.message);
        }
    };

    const uploadProps = {
        name: 'file',
        multiple: true,
        customRequest: handleCustomUpload,
        showUploadList: false, // سنعرض القائمة بطريقتنا الخاصة
        onDrop(e: any) {
            console.log('Dropped files', e.dataTransfer.files);
        },
    };

    const removeDoc = (id: string) => {
        setUploadedDocs(prev => {
            const updated = prev.filter(d => d.id !== id);
            form.setFieldsValue({ documents: updated });
            return updated;
        });
    };

    return (
        <Form
            form={form}
            layout="vertical"
            initialValues={{ isActive: true, phonePrefix: '+20' }}
        >
            {/* تنبيه لكلمة المرور */}
            {!isEditing && (
                <Alert
                    message="كلمة المرور الافتراضية"
                    description="سيتم إنشاء كلمة مرور تلقائية وإرسالها للموظف، أو يمكنك تعيينها يدوياً أدناه."
                    type="info"
                    showIcon
                    className="mb-6"
                />
            )}

            <Row gutter={16}>
                {/* المعلومات الشخصية */}
                <Col span={24}>
                    <h3 className="mb-4 text-base font-semibold text-gray-700">المعلومات الشخصية</h3>
                </Col>

                <Col xs={24} md={12}>
                    <Form.Item
                        name="name"
                        label="الاسم الكامل"
                        rules={[{ required: true, message: 'يرجى إدخال اسم الموظف' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="مثال: أحمد محمد" />
                    </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                    <Form.Item
                        name="phone"
                        label="رقم الهاتف"
                        rules={[{ required: true, message: 'يرجى إدخال رقم الهاتف' }]}
                    >
                        <Input
                            addonBefore={
                                <Form.Item name="phonePrefix" noStyle initialValue="+20">
                                    <Select style={{ width: 90 }} popupMatchSelectWidth={false}>
                                        <Select.Option value="+20">🇪🇬 +20</Select.Option>
                                        <Select.Option value="+966">🇸🇦 +966</Select.Option>
                                        <Select.Option value="+971">🇦🇪 +971</Select.Option>
                                        <Select.Option value="+974">🇶🇦 +974</Select.Option>
                                        <Select.Option value="+965">🇰🇼 +965</Select.Option>
                                        <Select.Option value="+973">🇧🇭 +973</Select.Option>
                                        <Select.Option value="+968">🇴🇲 +968</Select.Option>
                                    </Select>
                                </Form.Item>
                            }
                            placeholder="10xxxxxxxx"
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                    <Form.Item
                        name="email"
                        label="البريد الإلكتروني للعمل (تسجيل الدخول)"
                        rules={[
                            { required: true, message: 'يرجى إدخال بريد العمل' },
                            { type: 'email', message: 'بريد إلكتروني غير صالح' }
                        ]}
                    >
                        <Input prefix={<MailOutlined />} placeholder="name@company.com" disabled={isEditing} />
                    </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                    <Form.Item
                        name="personalEmail"
                        label="البريد الإلكتروني الشخصي (اختياري)"
                        rules={[{ type: 'email', message: 'بريد إلكتروني غير صالح' }]}
                    >
                        <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="personal@gmail.com" />
                    </Form.Item>
                </Col>

                {!isEditing && (
                    <Col xs={24} md={12}>
                        <Form.Item
                            name="password"
                            label="كلمة المرور الأولية"
                            rules={[{ required: true, min: 6, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="******" />
                        </Form.Item>
                    </Col>
                )}
            </Row>

            <Divider />

            <Row gutter={16}>
                {/* معلومات الوظيفة */}
                <Col span={24}>
                    <h3 className="mb-4 text-base font-semibold text-gray-700">تفاصيل الوظيفة</h3>
                </Col>

                <Col xs={24} md={12}>
                    <Form.Item
                        name="roleId"
                        label="مستوى الصلاحيات (الدور)"
                        tooltip="هذا الخيار يحدد ما يمكن للموظف فعله ورؤيته داخل لوحة التحكم."
                        rules={[{ required: true, message: 'يرجى تحديد صلاحيات الموظف' }]}
                    >
                        <Select placeholder="اختر مستوى الصلاحية (مثل: مدير مالي، مشرف)">
                            {roles.map(role => (
                                <Select.Option key={role.id} value={role.id}>
                                    {role.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                    <Form.Item
                        name="department"
                        label="القسم / الإدارة"
                        rules={[{ required: true, message: 'يرجى تحديد القسم التابع له' }]}
                    >
                        <Select placeholder="اختر القسم (النطاق الوظيفي)">
                            <Select.Option value="الإدارة العليا">الإدارة العليا (Top Management)</Select.Option>
                            <Select.Option value="إدارة المستخدمين">إدارة المستخدمين واللاعبين</Select.Option>
                            <Select.Option value="إدارة البطولات">إدارة البطولات والمسابقات</Select.Option>
                            <Select.Option value="المالية والاشتراكات">الإدارة المالية والاشتراكات</Select.Option>
                            <Select.Option value="المحتوى والميديا">إدارة المحتوى والميديا (Media)</Select.Option>
                            <Select.Option value="الدعم الفني">الدعم الفني وخدمة العملاء</Select.Option>
                            <Select.Option value="التسويق والمبيعات">التسويق والمبيعات</Select.Option>
                            <Select.Option value="التقارير">التقارير والمتابعة والرقابة</Select.Option>
                            <Select.Option value="التقنية">التقنية والتطوير</Select.Option>
                        </Select>
                    </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                    <Form.Item
                        name="jobTitle"
                        label="المسمى الوظيفي (Job Title)"
                    >
                        <Input placeholder="مثال: Senior Accountant, HR Specialist" />
                    </Form.Item>
                </Col>

                <Col span={24}>
                    <Form.Item
                        name="allowedCountries"
                        label="النطاق الجغرافي (الدول المسموحة)"
                        help="اتركه فارغاً لتعيين صلاحية عالمية (كل الدول). أو اختر دولاً محددة للحصر."
                    >
                        <Select
                            mode="multiple"
                            placeholder="اختر الدول المصرح بها..."
                            allowClear
                            maxTagCount="responsive"
                        >
                            <Select.Option value="Egypt">مصر 🇪🇬</Select.Option>
                            <Select.Option value="Saudi Arabia">السعودية 🇸🇦</Select.Option>
                            <Select.Option value="UAE">الإمارات 🇦🇪</Select.Option>
                            <Select.Option value="Qatar">قطر 🇶🇦</Select.Option>
                            <Select.Option value="Kuwait">الكويت 🇰🇼</Select.Option>
                            <Select.Option value="Bahrain">البحرين 🇧🇭</Select.Option>
                            <Select.Option value="Oman">عمان 🇴🇲</Select.Option>
                            <Select.Option value="Jordan">الأردن 🇯🇴</Select.Option>
                            <Select.Option value="Iraq">العراق 🇮🇶</Select.Option>
                            <Select.Option value="Lebanon">لبنان 🇱🇧</Select.Option>
                            <Select.Option value="Palestine">فلسطين 🇵🇸</Select.Option>
                            <Select.Option value="Morocco">المغرب 🇲🇦</Select.Option>
                            <Select.Option value="Algeria">الجزائر 🇩🇿</Select.Option>
                            <Select.Option value="Tunisia">تونس 🇹🇳</Select.Option>
                            <Select.Option value="Libya">ليبيا 🇱🇾</Select.Option>
                        </Select>
                    </Form.Item>
                </Col>

                <Col span={24}>
                    <Form.Item
                        name="isActive"
                        label="حالة الحساب"
                        valuePropName="checked"
                    >
                        <Switch checkedChildren="نشط" unCheckedChildren="متوقف" />
                    </Form.Item>
                </Col>
            </Row>

            <Divider />

            <Row gutter={16}>
                <Col span={24}>
                    <h3 className="mb-4 text-base font-semibold text-gray-700 flex items-center gap-2">
                        <FileTextOutlined /> المستندات والمرفقات
                        <span className="text-xs font-normal text-gray-400">(العقود، الهوية، السيرة الذاتية)</span>
                    </h3>
                </Col>
                <Col span={24}>
                    <Form.Item name="documents" noStyle>
                        <Dragger {...uploadProps}>
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">اضغط أو اسحب الملفات هنا للرفع</p>
                            <p className="ant-upload-hint">
                                سيتم رفع الملفات مباشرة إلى السحابة (Cloudflare R2).
                            </p>
                        </Dragger>
                    </Form.Item>

                    {/* قائمة الملفات المرفوعة */}
                    {uploadedDocs.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {uploadedDocs.map(doc => (
                                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                                    <div className="flex items-center gap-3">
                                        {doc.type === 'image' ? <FileTextOutlined className="text-blue-500" /> : <FileTextOutlined className="text-orange-500" />}
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                            {doc.name}
                                        </a>
                                    </div>
                                    <Button type="text" danger size="small" onClick={() => removeDoc(doc.id)}>
                                        حذف
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </Col>
            </Row>
        </Form>
    );
}
