'use client';

import React from 'react';
import { Card, Badge, Typography, Switch, Button, Space, ConfigProvider, Tag } from 'antd';
import {
    TrophyOutlined, EnvironmentOutlined, CalendarOutlined,
    TeamOutlined, DollarOutlined, EditOutlined, DeleteOutlined,
    ShareAltOutlined, UserAddOutlined, SettingOutlined,
} from '@ant-design/icons';
import arEG from 'antd/locale/ar_EG';
import { Tournament, formatDate, getCurrencySymbol } from '../utils';
import { fixReceiptUrl } from '@/lib/utils/cloudflare-r2-utils';

const { Text, Title } = Typography;

const ANTD_THEME = {
    token: { colorPrimary: '#d97706', borderRadius: 10, fontFamily: 'inherit' },
};

interface TournamentCardProps {
    tournament: Tournament;
    onEdit: (t: Tournament) => void;
    onDelete: (id: string) => void;
    onViewRegistrations: (t: Tournament) => void;
    onViewProfessionalRegistrations: (t: Tournament) => void;
    onManagePayments: (t: Tournament) => void;
    onStatusChange: (t: Tournament, isActive: boolean) => void;
    onShare: (t: Tournament) => void;
}

const getStatus = (t: Tournament): { text: string; color: string } => {
    const now = new Date();
    const start = new Date(t.startDate);
    const end = new Date(t.endDate);
    const deadline = new Date(t.registrationDeadline);
    if (now > end)       return { text: 'انتهت',         color: 'default' };
    if (now > start)     return { text: 'جارية',         color: 'success' };
    if (now > deadline)  return { text: 'انتهى التسجيل', color: 'error' };
    return               { text: 'قادمة',               color: 'processing' };
};

export const TournamentCard: React.FC<TournamentCardProps> = ({
    tournament,
    onEdit,
    onDelete,
    onViewRegistrations,
    onViewProfessionalRegistrations,
    onManagePayments,
    onStatusChange,
    onShare,
}) => {
    const status = getStatus(tournament);

    return (
        <ConfigProvider locale={arEG} theme={ANTD_THEME} direction="rtl">
            <Card
                style={{ borderRadius: 14, overflow: 'hidden', height: '100%' }}
                bodyStyle={{ padding: 0 }}
                hoverable
            >
                {/* ── Header ── */}
                <div style={{
                    padding: '16px 16px 12px',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                }}>
                    {/* Logo */}
                    <div style={{
                        width: 52, height: 52, borderRadius: 10, flexShrink: 0,
                        overflow: 'hidden', border: '1px solid #e5e7eb',
                        background: '#fef9ec',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {tournament.logo ? (
                            <img
                                src={fixReceiptUrl(tournament.logo) || tournament.logo}
                                alt={tournament.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                        ) : (
                            <TrophyOutlined style={{ fontSize: 22, color: '#d97706' }} />
                        )}
                    </div>

                    {/* Name + badges */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <Title
                            level={5}
                            style={{ margin: 0, marginBottom: 6, lineHeight: 1.35, fontSize: 15 }}
                            ellipsis={{ rows: 2 }}
                        >
                            {tournament.name}
                        </Title>
                        <Space size={4} wrap>
                            <Badge status={status.color as any} text={
                                <Text style={{ fontSize: 11 }}>{status.text}</Text>
                            } />
                            {tournament.isPaid && (
                                <Tag color="green" style={{ fontSize: 11, margin: 0 }}>مدفوعة</Tag>
                            )}
                            {!tournament.isActive && (
                                <Tag color="default" style={{ fontSize: 11, margin: 0 }}>معطلة</Tag>
                            )}
                        </Space>
                    </div>

                    {/* Quick actions */}
                    <Space size={2} style={{ flexShrink: 0 }}>
                        <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => onEdit(tournament)}
                            title="تعديل"
                        />
                        <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => onDelete(tournament.id!)}
                            title="حذف"
                        />
                    </Space>
                </div>

                {/* ── Info Grid ── */}
                <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
                    <InfoRow icon={<EnvironmentOutlined style={{ color: '#9ca3af' }} />} label="المكان" value={tournament.location} />
                    <InfoRow icon={<CalendarOutlined style={{ color: '#9ca3af' }} />} label="البداية" value={formatDate(tournament.startDate)} />
                    <InfoRow
                        icon={<TeamOutlined style={{ color: '#9ca3af' }} />}
                        label="المشاركون"
                        value={`${tournament.currentParticipants} / ${tournament.maxParticipants}`}
                    />
                    {tournament.isPaid && (
                        <InfoRow
                            icon={<DollarOutlined style={{ color: '#9ca3af' }} />}
                            label="الرسوم"
                            value={`${tournament.entryFee} ${getCurrencySymbol(tournament.currency || 'EGP')}`}
                        />
                    )}
                </div>

                {tournament.description && (
                    <div style={{ padding: '0 16px 10px' }}>
                        <Text
                            type="secondary"
                            style={{ fontSize: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                            title={tournament.description}
                        >
                            {tournament.description}
                        </Text>
                    </div>
                )}

                {/* ── Footer ── */}
                <div style={{ padding: '10px 16px 14px', borderTop: '1px solid #f0f0f0' }}>
                    {/* Active toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <Text style={{ fontSize: 13, color: tournament.isActive ? '#16a34a' : '#9ca3af', fontWeight: 500 }}>
                            {tournament.isActive ? 'البطولة نشطة' : 'غير نشطة'}
                        </Text>
                        <Switch
                            size="small"
                            checked={tournament.isActive === true}
                            onChange={checked => onStatusChange(tournament, checked)}
                        />
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        <Button size="small" icon={<ShareAltOutlined />} onClick={() => onShare(tournament)} style={{ fontSize: 12 }}>
                            مشاركة
                        </Button>
                        <Button size="small" icon={<UserAddOutlined />} onClick={() => onViewProfessionalRegistrations(tournament)} style={{ fontSize: 12 }}>
                            المسجلون
                        </Button>
                        {tournament.isPaid && (
                            <Button size="small" icon={<DollarOutlined />} onClick={() => onManagePayments(tournament)} style={{ fontSize: 12 }}>
                                المدفوعات
                            </Button>
                        )}
                        <Button
                            type="primary"
                            size="small"
                            icon={<SettingOutlined />}
                            onClick={() => window.location.href = `/dashboard/admin/tournaments/${tournament.id}`}
                            style={{
                                fontSize: 12,
                                gridColumn: tournament.isPaid ? 'auto' : '1 / -1',
                                background: 'linear-gradient(to left, #2563eb, #4f46e5)',
                                border: 'none',
                            }}
                        >
                            إدارة البطولة
                        </Button>
                    </div>
                </div>
            </Card>
        </ConfigProvider>
    );
};

// ── Helper ──────────────────────────────────────────────────────────────────

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span style={{ flexShrink: 0, fontSize: 13 }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.3 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {value || '—'}
            </div>
        </div>
    </div>
);
