/**
 * فلاتر البحث والتصفية
 */

'use client';

import React from 'react';
import { Input, Select, DatePicker, Space, Button, Badge, Segmented, Typography } from 'antd';
const { Text } = Typography;
import {
    SearchOutlined,
    FilterOutlined,
    ClearOutlined,
    ReloadOutlined,
    GoogleOutlined,
    PhoneOutlined,
    MailOutlined,
    SyncOutlined,
} from '@ant-design/icons';
import {
    UsersFilters,
    AccountType,
    AccountStatus,
    VerificationStatus,
    ACCOUNT_TYPE_LABELS,
    STATUS_LABELS,
    VERIFICATION_LABELS,
} from '../_types';

const { RangePicker } = DatePicker;

interface UsersFiltersBarProps {
    filters: UsersFilters;
    onFiltersChange: (filters: Partial<UsersFilters>) => void;
    onReset: () => void;
    onRefresh: () => void;
    loading?: boolean;
    countries: string[];
    activeFiltersCount: number;
    totalCount: number;
    filteredCount: number;
}

export default function UsersFiltersBar({
    filters,
    onFiltersChange,
    onReset,
    onRefresh,
    loading,
    countries,
    activeFiltersCount,
    totalCount,
    filteredCount,
}: UsersFiltersBarProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            {/* صف البحث والمعلومات */}
            <div className="flex flex-wrap gap-4 items-center justify-between mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <Badge
                        status="processing"
                        text={<span className="font-bold text-gray-700 dark:text-gray-200">إجمالي النتائج: {filteredCount}</span>}
                    />
                    {activeFiltersCount > 0 && (
                        <Text type="secondary" className="text-xs">
                            (مُفلتر من إجمالي {totalCount} مستخدم)
                        </Text>
                    )}
                </div>

                <Space>
                    {/* تحديث */}
                    <Button
                        icon={<ReloadOutlined spin={loading} />}
                        onClick={onRefresh}
                        loading={loading}
                        size="middle"
                    >
                        تحديث البيانات
                    </Button>

                    {/* مسح الفلاتر */}
                    {activeFiltersCount > 0 && (
                        <Badge count={activeFiltersCount}>
                            <Button
                                icon={<ClearOutlined />}
                                onClick={onReset}
                                danger
                                size="middle"
                            >
                                مسح الفلاتر
                            </Button>
                        </Badge>
                    )}
                </Space>
            </div>

            {/* صف البحث الرئيسي */}
            <div className="flex flex-wrap gap-3 items-center">
                {/* البحث */}
                <Input
                    placeholder="ابحث بالاسم، الهاتف، أو البريد..."
                    prefix={<SearchOutlined className="text-gray-400" />}
                    value={filters.search}
                    onChange={e => onFiltersChange({ search: e.target.value })}
                    allowClear
                    className="w-80"
                    size="large"
                />

                {/* نوع الحساب */}
                <Select
                    value={filters.accountType}
                    onChange={value => onFiltersChange({ accountType: value })}
                    className="w-36"
                    size="large"
                    options={[
                        { value: 'all', label: 'كل الأنواع' },
                        ...Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => ({
                            value,
                            label,
                        })),
                    ]}
                />

                {/* حالة الحساب */}
                <Segmented
                    value={filters.status}
                    onChange={value => onFiltersChange({ status: value as AccountStatus | 'all' })}
                    options={[
                        { value: 'all', label: 'الكل' },
                        { value: 'active', label: '🟢 نشط' },
                        { value: 'suspended', label: '🟠 موقوف' },
                        { value: 'deleted', label: '🔴 محذوف' },
                    ]}
                    size="large"
                />
            </div>

            {/* صف الفلاتر الإضافية */}
            <div className="flex flex-wrap gap-3 items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                {/* حالة التحقق */}
                <Select
                    value={filters.verification}
                    onChange={value => onFiltersChange({ verification: value })}
                    className="w-36"
                    placeholder="التحقق"
                    options={[
                        { value: 'all', label: 'كل الحالات' },
                        ...Object.entries(VERIFICATION_LABELS).map(([value, label]) => ({
                            value,
                            label,
                        })),
                    ]}
                />

                {/* مصدر التسجيل */}
                <Select
                    value={filters.loginSource}
                    onChange={value => onFiltersChange({ loginSource: value })}
                    className="w-44"
                    placeholder="مصدر التسجيل"
                    options={[
                        { value: 'all', label: 'كل المصادر' },
                        {
                            value: 'google', label: (
                                <div className="flex items-center gap-2">
                                    <GoogleOutlined className="text-red-500" />
                                    <span>جوجل</span>
                                </div>
                            )
                        },
                        {
                            value: 'phone', label: (
                                <div className="flex items-center gap-2">
                                    <PhoneOutlined className="text-green-500" />
                                    <span>هاتف</span>
                                </div>
                            )
                        },
                        {
                            value: 'email', label: (
                                <div className="flex items-center gap-2">
                                    <MailOutlined className="text-blue-500" />
                                    <span>إيميل</span>
                                </div>
                            )
                        },
                    ]}
                />

                {/* حالة المزامنة */}
                <Select
                    value={filters.isSynced}
                    onChange={value => onFiltersChange({ isSynced: value })}
                    className="w-40"
                    placeholder="حالة المزامنة"
                    options={[
                        { value: 'all', label: 'الكل (مزامنة)' },
                        {
                            value: 'yes', label: (
                                <div className="flex items-center gap-2">
                                    <SyncOutlined className="text-blue-500" />
                                    <span>مسترجع</span>
                                </div>
                            )
                        },
                        { value: 'no', label: 'حساب أصلي' },
                    ]}
                />

                {/* البلد */}
                <Select
                    mode="multiple"
                    value={filters.countries}
                    onChange={value => onFiltersChange({ countries: value })}
                    className="flex-1 min-w-[200px]"
                    placeholder="اختر البلدان"
                    allowClear
                    showSearch
                    maxTagCount="responsive"
                    options={countries.map(country => ({
                        value: country,
                        label: country,
                    }))}
                />

                {/* اكتمال الملف */}
                <Select
                    value={filters.profileCompletion}
                    onChange={value => onFiltersChange({ profileCompletion: value })}
                    className="w-40"
                    placeholder="الملف الشخصي"
                    options={[
                        { value: 'all', label: 'الكل' },
                        { value: 'complete', label: '✅ مكتمل' },
                        { value: 'incomplete', label: '⚠️ غير مكتمل' },
                    ]}
                />

                {/* نطاق التاريخ */}
                <RangePicker
                    value={filters.dateRange as any}
                    onChange={dates => onFiltersChange({ dateRange: dates as any })}
                    placeholder={['من تاريخ', 'إلى تاريخ']}
                    allowClear
                />
            </div>
        </div>
    );
}

// القيم الافتراضية للفلاتر
export const DEFAULT_FILTERS: UsersFilters = {
    search: '',
    accountType: 'all',
    status: 'all',
    verification: 'all',
    countries: [],
    dateRange: [null, null],
    profileCompletion: 'all',
    loginSource: 'all',
    isSynced: 'all',
};
