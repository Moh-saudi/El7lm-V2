/**
 * إحصائيات المستخدمين - تصميم نهاري تنفيذي (Executive Light Mode)
 */

'use client';

import React from 'react';
import { Card, Statistic, Row, Col, Progress } from 'antd';
import {
    UserOutlined,
    CheckCircleOutlined,
    StopOutlined,
    DeleteOutlined,
    RiseOutlined,
    TeamOutlined,
} from '@ant-design/icons';
import { UsersStats, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS, AccountType } from '../_types';

interface UsersStatsCardsProps {
    stats: UsersStats;
    loading?: boolean;
}

export default function UsersStatsCards({ stats, loading }: UsersStatsCardsProps) {
    return (
        <div className="space-y-4">
            {/* الإحصائيات الرئيسية */}
            <Row gutter={[16, 16]}>
                <Col xs={12} sm={6}>
                    <Card bordered={false} className="bg-white border border-slate-200/80 shadow-sm rounded-xl hover:shadow-md transition-shadow">
                        <Statistic
                            title={<span className="text-slate-600 font-medium">إجمالي المستخدمين</span>}
                            value={stats.total}
                            loading={loading}
                            prefix={<TeamOutlined className="text-emerald-600 p-2 bg-emerald-50 rounded-lg ml-2" />}
                            valueStyle={{ color: '#0f172a', fontWeight: 700 }}
                        />
                    </Card>
                </Col>

                <Col xs={12} sm={6}>
                    <Card bordered={false} className="bg-white border border-slate-200/80 shadow-sm rounded-xl hover:shadow-md transition-shadow">
                        <Statistic
                            title={<span className="text-slate-600 font-medium">نشط</span>}
                            value={stats.active}
                            loading={loading}
                            prefix={<CheckCircleOutlined className="text-emerald-500 p-2 bg-emerald-50 rounded-lg ml-2" />}
                            valueStyle={{ color: '#059669', fontWeight: 700 }}
                        />
                    </Card>
                </Col>

                <Col xs={12} sm={6}>
                    <Card bordered={false} className="bg-white border border-slate-200/80 shadow-sm rounded-xl hover:shadow-md transition-shadow">
                        <Statistic
                            title={<span className="text-slate-600 font-medium">موقوف</span>}
                            value={stats.suspended}
                            loading={loading}
                            prefix={<StopOutlined className="text-amber-500 p-2 bg-amber-50 rounded-lg ml-2" />}
                            valueStyle={{ color: '#d97706', fontWeight: 700 }}
                        />
                    </Card>
                </Col>

                <Col xs={12} sm={6}>
                    <Card bordered={false} className="bg-white border border-slate-200/80 shadow-sm rounded-xl hover:shadow-md transition-shadow">
                        <Statistic
                            title={<span className="text-slate-600 font-medium">محذوف</span>}
                            value={stats.deleted}
                            loading={loading}
                            prefix={<DeleteOutlined className="text-rose-500 p-2 bg-rose-50 rounded-lg ml-2" />}
                            valueStyle={{ color: '#e11d48', fontWeight: 700 }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* إحصائيات النمو وتوزيع الحسابات */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <Card
                        title={
                            <span className="flex items-center gap-2 text-slate-800 font-bold">
                                <RiseOutlined className="text-emerald-600" />
                                النمو والتسجيلات الجديدة
                            </span>
                        }
                        bordered={false}
                        className="bg-white border border-slate-200/80 shadow-sm rounded-xl"
                        size="small"
                    >
                        <Row gutter={16}>
                            <Col span={8}>
                                <Statistic
                                    title={<span className="text-slate-500 text-xs">اليوم</span>}
                                    value={stats.newToday}
                                    loading={loading}
                                    valueStyle={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}
                                    suffix={<span className="text-emerald-600 text-sm font-semibold">+</span>}
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title={<span className="text-slate-500 text-xs">هذا الأسبوع</span>}
                                    value={stats.newThisWeek}
                                    loading={loading}
                                    valueStyle={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}
                                    suffix={<span className="text-emerald-600 text-sm font-semibold">+</span>}
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title={<span className="text-slate-500 text-xs">هذا الشهر</span>}
                                    value={stats.newThisMonth}
                                    loading={loading}
                                    valueStyle={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}
                                    suffix={<span className="text-emerald-600 text-sm font-semibold">+</span>}
                                />
                            </Col>
                        </Row>
                    </Card>
                </Col>

                {/* توزيع أنواع الحسابات */}
                <Col xs={24} md={12}>
                    <Card
                        title={
                            <span className="flex items-center gap-2 text-slate-800 font-bold">
                                <UserOutlined className="text-indigo-600" />
                                توزيع أنواع الحسابات
                            </span>
                        }
                        bordered={false}
                        className="bg-white border border-slate-200/80 shadow-sm rounded-xl"
                        size="small"
                    >
                        <div className="space-y-2">
                            {Object.entries(stats.byType)
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 4)
                                .map(([type, count]) => (
                                    <div key={type} className="flex items-center gap-2">
                                        <span className="w-20 text-sm text-slate-600 font-medium">
                                            {ACCOUNT_TYPE_LABELS[type as AccountType] || type}
                                        </span>
                                        <Progress
                                            percent={stats.total > 0 ? Math.round((count / stats.total) * 100) : 0}
                                            size="small"
                                            strokeColor={getColorHex(ACCOUNT_TYPE_COLORS[type as AccountType] || 'blue')}
                                            showInfo={false}
                                            className="flex-1"
                                        />
                                        <span className="w-12 text-sm text-left font-semibold text-slate-700">{count}</span>
                                    </div>
                                ))}
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

// تحويل اسم اللون إلى hex متناسق مع التصميم النهاري
function getColorHex(color: string): string {
    const colors: Record<string, string> = {
        blue: '#2563eb',
        green: '#059669',
        purple: '#7c3aed',
        orange: '#d97706',
        cyan: '#0891b2',
        magenta: '#db2777',
        gold: '#d97706',
        red: '#e11d48',
    };
    return colors[color] || '#059669';
}
