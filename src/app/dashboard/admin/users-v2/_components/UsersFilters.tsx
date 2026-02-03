/**
 * فلاتر البحث والتصفية
 */

'use client';

import React from 'react';
import { Input, Select, DatePicker, Space, Button, Badge, Segmented } from 'antd';
import {
    SearchOutlined,
    FilterOutlined,
    ClearOutlined,
    ReloadOutlined,
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
}

export default function UsersFiltersBar({
    filters,
    onFiltersChange,
    onReset,
    onRefresh,
    loading,
    countries,
    activeFiltersCount,
}: UsersFiltersBarProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            {/* صف البحث الرئيسي */}
            <div className="flex flex-wrap gap-3 items-center">
                {/* البحث */}
                <Input
                    placeholder="ابحث بالاسم، الهاتف، أو البريد..."
                    prefix={<SearchOutlined className="text-gray-400" />}
                    value={filters.search}
                    onChange={e => onFiltersChange({ search: e.target.value })}
                    allowClear
                    className="w-64"
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

                {/* تحديث */}
                <Button
                    icon={<ReloadOutlined spin={loading} />}
                    onClick={onRefresh}
                    loading={loading}
                    size="large"
                >
                    تحديث
                </Button>

                {/* مسح الفلاتر */}
                {activeFiltersCount > 0 && (
                    <Badge count={activeFiltersCount}>
                        <Button
                            icon={<ClearOutlined />}
                            onClick={onReset}
                            danger
                            size="large"
                        >
                            مسح الفلاتر
                        </Button>
                    </Badge>
                )}
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

                {/* البلد */}
                <Select
                    value={filters.country || undefined}
                    onChange={value => onFiltersChange({ country: value || '' })}
                    className="w-36"
                    placeholder="البلد"
                    allowClear
                    showSearch
                    options={[
                        { value: '', label: 'كل البلدان' },
                        ...countries.map(country => ({
                            value: country,
                            label: country,
                        })),
                    ]}
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
    country: '',
    dateRange: [null, null],
    profileCompletion: 'all',
};
