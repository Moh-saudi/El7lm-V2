/**
 * الرسوم البيانية لإحصائيات المستخدمين - تصميم نهاري تنفيذي (Executive Light Mode)
 */

'use client';

import React from 'react';
import { Card, Row, Col, Empty } from 'antd';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
} from 'recharts';
import {
    UserOutlined,
    CheckCircleOutlined,
    RiseOutlined,
    GlobalOutlined,
} from '@ant-design/icons';
import { UsersStats, ACCOUNT_TYPE_LABELS, AccountType } from '../_types';

interface UsersChartsProps {
    stats: UsersStats;
    loading?: boolean;
}

// ألوان متناسقة للأنواع
const TYPE_COLORS: Record<string, string> = {
    player: '#059669', // Emerald
    club: '#2563EB',   // Royal Blue
    academy: '#7C3AED',// Purple
    trainer: '#D97706',// Amber
    agent: '#0891B2',  // Cyan
    marketer: '#DB2777', // Pink
    parent: '#4F46E5', // Indigo
    admin: '#E11D48',  // Rose
};

// Custom Tooltip للرسوم البيانية
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white shadow-xl rounded-lg p-3 border border-slate-200">
                <p className="font-semibold text-slate-800 mb-1">{label || payload[0]?.name}</p>
                <p className="text-emerald-600 font-bold text-lg">
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
            color: TYPE_COLORS[type] || '#2563EB',
            fill: TYPE_COLORS[type] || '#2563EB',
        }))
        .sort((a, b) => b.value - a.value);

    // بيانات الحالة
    const statusData = [
        { name: 'نشط', value: stats.active, color: '#059669', fill: '#059669' },
        { name: 'موقوف', value: stats.suspended, color: '#D97706', fill: '#D97706' },
        { name: 'محذوف', value: stats.deleted, color: '#E11D48', fill: '#E11D48' },
    ].filter(item => item.value > 0);

    // بيانات النمو
    const growthData = [
        { name: 'اليوم', value: stats.newToday, icon: '📅' },
        { name: 'هذا الأسبوع', value: stats.newThisWeek, icon: '📊' },
        { name: 'هذا الشهر', value: stats.newThisMonth, icon: '📈' },
    ];

    // أعلى 5 بلدان
    const countryData = Object.entries(stats.byCountry)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([country, count], index) => {
            const colors = ['#059669', '#2563EB', '#7C3AED', '#D97706', '#0891B2'];
            return {
                name: country,
                value: count,
                fill: colors[index] || '#64748B',
            };
        });

    const activePercent = stats.total > 0
        ? Math.round((stats.active / stats.total) * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* الصف الأول: توزيع الأنواع + حالة الحسابات */}
            <Row gutter={[24, 24]}>
                {/* توزيع أنواع الحسابات */}
                <Col xs={24} lg={14}>
                    <Card
                        className="h-full shadow-sm border border-slate-200/80 bg-white rounded-xl"
                        styles={{ body: { padding: '24px' } }}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <UserOutlined className="text-lg" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 m-0">
                                    توزيع أنواع الحسابات
                                </h3>
                                <p className="text-sm text-slate-500 m-0">
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
                                            <div className="w-20 text-sm font-medium text-slate-700 text-left">
                                                {item.name}
                                            </div>
                                            <div className="flex-1">
                                                <div className="h-8 bg-slate-100 rounded-lg overflow-hidden relative">
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
                        className="h-full shadow-sm border border-slate-200/80 bg-white rounded-xl"
                        styles={{ body: { padding: '24px' } }}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <CheckCircleOutlined className="text-lg" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 m-0">
                                    حالة الحسابات
                                </h3>
                                <p className="text-sm text-slate-500 m-0">
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
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
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
                        className="shadow-sm border border-slate-200/80 bg-white rounded-xl"
                        styles={{ body: { padding: '24px' } }}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <RiseOutlined className="text-lg" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 m-0">
                                    المستخدمين الجدد
                                </h3>
                                <p className="text-sm text-slate-500 m-0">
                                    معدل النمو
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            {growthData.map((item, index) => (
                                <div
                                    key={index}
                                    className="text-center p-4 rounded-xl bg-slate-50 border border-slate-100"
                                >
                                    <div className="text-2xl mb-2">{item.icon}</div>
                                    <div className="text-2xl font-bold text-slate-800">
                                        {item.value.toLocaleString('ar-EG')}
                                    </div>
                                    <div className="text-sm text-slate-500">{item.name}</div>
                                </div>
                            ))}
                        </div>

                        <ResponsiveContainer width="100%" height={120}>
                            <AreaChart data={growthData}>
                                <defs>
                                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                <YAxis hide />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#059669"
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
                        className="shadow-sm border border-slate-200/80 bg-white rounded-xl"
                        styles={{ body: { padding: '24px' } }}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <GlobalOutlined className="text-lg" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 m-0">
                                    أعلى البلدان
                                </h3>
                                <p className="text-sm text-slate-500 m-0">
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
                                            <div className="w-6 text-center font-bold text-slate-400">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-sm font-medium text-slate-700">
                                                        {item.name}
                                                    </span>
                                                    <span className="text-sm font-bold text-slate-900">
                                                        {item.value.toLocaleString('ar-EG')}
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
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
