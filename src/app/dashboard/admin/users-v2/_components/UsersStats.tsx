/**
 * إحصائيات المستخدمين
 */

'use client';

import React from 'react';
import { Card, Statistic, Row, Col, Progress, Tooltip } from 'antd';
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
                    <Card bordered={false} className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                        <Statistic
                            title={<span className="text-gray-600 dark:text-gray-300">إجمالي المستخدمين</span>}
                            value={stats.total}
                            loading={loading}
                            prefix={<TeamOutlined className="text-blue-500" />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>

                <Col xs={12} sm={6}>
                    <Card bordered={false} className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                        <Statistic
                            title={<span className="text-gray-600 dark:text-gray-300">نشط</span>}
                            value={stats.active}
                            loading={loading}
                            prefix={<CheckCircleOutlined className="text-green-500" />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>

                <Col xs={12} sm={6}>
                    <Card bordered={false} className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
                        <Statistic
                            title={<span className="text-gray-600 dark:text-gray-300">موقوف</span>}
                            value={stats.suspended}
                            loading={loading}
                            prefix={<StopOutlined className="text-orange-500" />}
                            valueStyle={{ color: '#fa8c16' }}
                        />
                    </Card>
                </Col>

                <Col xs={12} sm={6}>
                    <Card bordered={false} className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
                        <Statistic
                            title={<span className="text-gray-600 dark:text-gray-300">محذوف</span>}
                            value={stats.deleted}
                            loading={loading}
                            prefix={<DeleteOutlined className="text-red-500" />}
                            valueStyle={{ color: '#ff4d4f' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* إحصائيات النمو */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <Card
                        title={
                            <span className="flex items-center gap-2">
                                <RiseOutlined className="text-green-500" />
                                النمو
                            </span>
                        }
                        bordered={false}
                        size="small"
                    >
                        <Row gutter={16}>
                            <Col span={8}>
                                <Statistic
                                    title="اليوم"
                                    value={stats.newToday}
                                    loading={loading}
                                    valueStyle={{ fontSize: '1.2rem' }}
                                    suffix={<span className="text-green-500 text-sm">+</span>}
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title="هذا الأسبوع"
                                    value={stats.newThisWeek}
                                    loading={loading}
                                    valueStyle={{ fontSize: '1.2rem' }}
                                    suffix={<span className="text-green-500 text-sm">+</span>}
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic
                                    title="هذا الشهر"
                                    value={stats.newThisMonth}
                                    loading={loading}
                                    valueStyle={{ fontSize: '1.2rem' }}
                                    suffix={<span className="text-green-500 text-sm">+</span>}
                                />
                            </Col>
                        </Row>
                    </Card>
                </Col>

                {/* توزيع أنواع الحسابات */}
                <Col xs={24} md={12}>
                    <Card
                        title={
                            <span className="flex items-center gap-2">
                                <UserOutlined className="text-blue-500" />
                                أنواع الحسابات
                            </span>
                        }
                        bordered={false}
                        size="small"
                    >
                        <div className="space-y-2">
                            {Object.entries(stats.byType)
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 4)
                                .map(([type, count]) => (
                                    <div key={type} className="flex items-center gap-2">
                                        <span className="w-20 text-sm text-gray-600">
                                            {ACCOUNT_TYPE_LABELS[type as AccountType]}
                                        </span>
                                        <Progress
                                            percent={Math.round((count / stats.total) * 100)}
                                            size="small"
                                            strokeColor={getColorHex(ACCOUNT_TYPE_COLORS[type as AccountType])}
                                            showInfo={false}
                                            className="flex-1"
                                        />
                                        <span className="w-10 text-sm text-right">{count}</span>
                                    </div>
                                ))}
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

// تحويل اسم اللون إلى hex
function getColorHex(color: string): string {
    const colors: Record<string, string> = {
        blue: '#1890ff',
        green: '#52c41a',
        purple: '#722ed1',
        orange: '#fa8c16',
        cyan: '#13c2c2',
        magenta: '#eb2f96',
        gold: '#faad14',
        red: '#ff4d4f',
    };
    return colors[color] || '#1890ff';
}
