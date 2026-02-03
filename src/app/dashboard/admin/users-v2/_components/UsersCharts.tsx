/**
 * رسوم بيانية للإحصائيات - تصميم محسّن
 */

'use client';

import React from 'react';
import { Card, Row, Col, Empty, Spin, Statistic } from 'antd';
import {
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    RadialBarChart,
    RadialBar,
} from 'recharts';
import {
    UserOutlined,
    RiseOutlined,
    GlobalOutlined,
    CheckCircleOutlined,
} from '@ant-design/icons';
import { UsersStats, ACCOUNT_TYPE_LABELS, AccountType } from '../_types';

interface UsersChartsProps {
    stats: UsersStats;
    loading?: boolean;
}

// ألوان أنواع الحسابات - ألوان متدرجة جميلة
const TYPE_COLORS: Record<string, string> = {
    player: '#3B82F6',
    club: '#10B981',
    academy: '#8B5CF6',
    trainer: '#F59E0B',
    agent: '#06B6D4',
    marketer: '#EC4899',
    parent: '#F97316',
    admin: '#EF4444',
};

// Custom Tooltip للرسوم البيانية
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">{label || payload[0]?.name}</p>
                <p className="text-blue-600 dark:text-blue-400 font-bold text-lg">
                    {payload[0]?.value?.toLocaleString('ar-EG')} مستخدم
                </p>
            </div>
        );
    }
    return null;
};

export default function UsersCharts({ stats, loading }: UsersChartsProps) {
    // بيانات توزيع الأنواع
    const typeData = Object.entries(stats.byType)
        .filter(([, count]) => count > 0)
        .map(([type, count]) => ({
            name: ACCOUNT_TYPE_LABELS[type as AccountType] || type,
            value: count,
            color: TYPE_COLORS[type] || '#3B82F6',
            fill: TYPE_COLORS[type] || '#3B82F6',
        }))
        .sort((a, b) => b.value - a.value);

    // بيانات الحالة
    const statusData = [
        { name: 'نشط', value: stats.active, color: '#10B981', fill: '#10B981' },
        { name: 'موقوف', value: stats.suspended, color: '#F59E0B', fill: '#F59E0B' },
        { name: 'محذوف', value: stats.deleted, color: '#EF4444', fill: '#EF4444' },
    ].filter(item => item.value > 0);

    // بيانات النمو
    const growthData = [
        { name: 'اليوم', value: stats.newToday, icon: '📅' },
        { name: 'الأسبوع', value: stats.newThisWeek, icon: '📊' },
        { name: 'الشهر', value: stats.newThisMonth, icon: '📈' },
    ];

    // بيانات البلدان (أعلى 6)
    const countryData = Object.entries(stats.byCountry)
        .filter(([country]) => country)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([country, count], index) => ({
            name: country,
            value: count,
            fill: [
                '#3B82F6', '#10B981', '#8B5CF6',
                '#F59E0B', '#06B6D4', '#EC4899'
            ][index] || '#3B82F6',
        }));

    // حساب النسب المئوية للحالة
    const totalForStatus = stats.active + stats.suspended + stats.deleted;
    const activePercent = totalForStatus > 0 ? Math.round((stats.active / totalForStatus) * 100) : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* الصف الأول: توزيع الأنواع + حالة الحسابات */}
            <Row gutter={[24, 24]}>
                {/* توزيع أنواع الحسابات */}
                <Col xs={24} lg={14}>
                    <Card
                        className="h-full shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
                        styles={{ body: { padding: '24px' } }}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <UserOutlined className="text-white text-lg" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white m-0">
                                    توزيع أنواع الحسابات
                                </h3>
                                <p className="text-sm text-gray-500 m-0">
                                    إجمالي {stats.total.toLocaleString('ar-EG')} مستخدم
                                </p>
                            </div>
                        </div>

                        {typeData.length > 0 ? (
                            <div className="space-y-4">
                                {typeData.map((item, index) => {
                                    const maxValue = typeData[0]?.value || 1;
                                    const percent = Math.round((item.value / maxValue) * 100);
                                    return (
                                        <div key={index} className="flex items-center gap-3">
                                            <div className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300 text-left">
                                                {item.name}
                                            </div>
                                            <div className="flex-1">
                                                <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden relative">
                                                    <div
                                                        className="h-full rounded-lg transition-all duration-700 flex items-center justify-end px-3"
                                                        style={{
                                                            width: `${percent}%`,
                                                            backgroundColor: item.color,
                                                            minWidth: '40px'
                                                        }}
                                                    >
                                                        <span className="text-white text-sm font-bold">
                                                            {item.value.toLocaleString('ar-EG')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <Empty description="لا توجد بيانات" />
                        )}
                    </Card>
                </Col>

                {/* حالة الحسابات */}
                <Col xs={24} lg={10}>
                    <Card
                        className="h-full shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
                        styles={{ body: { padding: '24px' } }}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                <CheckCircleOutlined className="text-white text-lg" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white m-0">
                                    حالة الحسابات
                                </h3>
                                <p className="text-sm text-gray-500 m-0">
                                    {activePercent}% نشط
                                </p>
                            </div>
                        </div>

                        {statusData.length > 0 ? (
                            <div className="flex flex-col items-center">
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={85}
                                            paddingAngle={4}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>

                                {/* المفتاح */}
                                <div className="flex flex-wrap justify-center gap-4 mt-2">
                                    {statusData.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {item.name}: <strong>{item.value}</strong>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <Empty description="لا توجد بيانات" />
                        )}
                    </Card>
                </Col>
            </Row>

            {/* الصف الثاني: النمو + البلدان */}
            <Row gutter={[24, 24]}>
                {/* المستخدمين الجدد */}
                <Col xs={24} lg={12}>
                    <Card
                        className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
                        styles={{ body: { padding: '24px' } }}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                <RiseOutlined className="text-white text-lg" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white m-0">
                                    المستخدمين الجدد
                                </h3>
                                <p className="text-sm text-gray-500 m-0">
                                    معدل النمو
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            {growthData.map((item, index) => (
                                <div
                                    key={index}
                                    className="text-center p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800"
                                >
                                    <div className="text-2xl mb-2">{item.icon}</div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {item.value.toLocaleString('ar-EG')}
                                    </div>
                                    <div className="text-sm text-gray-500">{item.name}</div>
                                </div>
                            ))}
                        </div>

                        <ResponsiveContainer width="100%" height={120}>
                            <AreaChart data={growthData}>
                                <defs>
                                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                <YAxis hide />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#F59E0B"
                                    strokeWidth={3}
                                    fill="url(#colorGrowth)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                {/* أعلى البلدان */}
                <Col xs={24} lg={12}>
                    <Card
                        className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
                        styles={{ body: { padding: '24px' } }}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                <GlobalOutlined className="text-white text-lg" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white m-0">
                                    أعلى البلدان
                                </h3>
                                <p className="text-sm text-gray-500 m-0">
                                    توزيع جغرافي
                                </p>
                            </div>
                        </div>

                        {countryData.length > 0 ? (
                            <div className="space-y-3">
                                {countryData.map((item, index) => {
                                    const maxValue = countryData[0]?.value || 1;
                                    const percent = Math.round((item.value / maxValue) * 100);
                                    return (
                                        <div key={index} className="flex items-center gap-3">
                                            <div className="w-6 text-center font-bold text-gray-400">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        {item.name}
                                                    </span>
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                        {item.value.toLocaleString('ar-EG')}
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${percent}%`,
                                                            background: `linear-gradient(90deg, ${item.fill}, ${item.fill}dd)`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <Empty description="لا توجد بيانات" />
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
