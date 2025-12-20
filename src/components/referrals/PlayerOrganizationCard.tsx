'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Building2,
    GraduationCap,
    Briefcase,
    Users,
    Clock,
    CheckCircle2,
    XCircle,
    ArrowRight,
    Plus
} from 'lucide-react';
import { organizationReferralService } from '@/lib/organization/organization-referral-service';
import { PlayerJoinRequest } from '@/types/organization-referral';

interface PlayerOrganizationCardProps {
    playerId: string;
}

const getOrganizationIcon = (type: string) => {
    switch (type) {
        case 'academy':
            return GraduationCap;
        case 'club':
            return Building2;
        case 'agent':
            return Briefcase;
        default:
            return Users;
    }
};

const getOrganizationTypeLabel = (type: string) => {
    switch (type) {
        case 'academy':
            return 'أكاديمية';
        case 'club':
            return 'نادي';
        case 'agent':
            return 'وكيل';
        case 'trainer':
            return 'مدرب';
        default:
            return 'منظمة';
    }
};

export default function PlayerOrganizationCard({ playerId }: PlayerOrganizationCardProps) {
    const [joinRequests, setJoinRequests] = useState<PlayerJoinRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadJoinRequests();
    }, [playerId]);

    const loadJoinRequests = async () => {
        try {
            setLoading(true);
            const requests = await organizationReferralService.getPlayerJoinRequests(playerId);
            setJoinRequests(requests);
        } catch (error) {
            console.error('Error loading join requests:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // فلترة الطلبات
    const approvedRequests = joinRequests.filter(r => r.status === 'approved');
    const pendingRequests = joinRequests.filter(r => r.status === 'pending');
    const rejectedRequests = joinRequests.filter(r => r.status === 'rejected');

    // إذا لم يكن هناك أي طلبات
    if (joinRequests.length === 0) {
        return (
            <Card className="border-2 border-dashed border-gray-300 bg-gray-50/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="h-5 w-5 text-gray-400" />
                        الانضمام لمنظمة
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-4">
                        <div className="mb-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-100 rounded-full mb-3">
                                <Plus className="h-8 w-8 text-emerald-600" />
                            </div>
                            <p className="text-gray-600 mb-2">
                                لست منضماً لأي أكاديمية أو نادي بعد
                            </p>
                            <p className="text-sm text-gray-500">
                                انضم إلى أكاديمية للحصول على تدريب احترافي وفرص أفضل
                            </p>
                        </div>
                        <Link href="/dashboard/player/referrals">
                            <Button className="bg-emerald-600 hover:bg-emerald-700">
                                <Plus className="h-4 w-4 mr-2" />
                                انضم الآن
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        ارتباطاتي
                    </span>
                    <Link href="/dashboard/player/referrals">
                        <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                            عرض الكل
                            <ArrowRight className="h-4 w-4 mr-2" />
                        </Button>
                    </Link>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <div className="space-y-4">
                    {/* الطلبات المقبولة */}
                    {approvedRequests.map((request) => {
                        const Icon = getOrganizationIcon(request.organizationType);
                        return (
                            <div
                                key={request.id}
                                className="flex items-start gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg"
                            >
                                <div className="p-3 bg-emerald-600 rounded-lg">
                                    <Icon className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-gray-900">
                                            {request.organizationName}
                                        </h4>
                                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            مُقبول
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        {getOrganizationTypeLabel(request.organizationType)}
                                    </p>
                                    {request.approvedAt && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            ✅ تم القبول: {new Date(request.approvedAt as any).toLocaleDateString('ar')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* الطلبات قيد الانتظار */}
                    {pendingRequests.map((request) => {
                        const Icon = getOrganizationIcon(request.organizationType);
                        return (
                            <div
                                key={request.id}
                                className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg"
                            >
                                <div className="p-3 bg-amber-500 rounded-lg">
                                    <Icon className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-gray-900">
                                            {request.organizationName}
                                        </h4>
                                        <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                                            <Clock className="h-3 w-3 mr-1" />
                                            في الانتظار
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        {getOrganizationTypeLabel(request.organizationType)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        📅 تم الإرسال: {new Date(request.requestedAt as any).toLocaleDateString('ar')}
                                    </p>
                                </div>
                            </div>
                        );
                    })}

                    {/* الطلبات المرفوضة (آخر واحدة فقط) */}
                    {rejectedRequests.length > 0 && (
                        <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="p-3 bg-red-500 rounded-lg">
                                <XCircle className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-gray-900">
                                        {rejectedRequests[0].organizationName}
                                    </h4>
                                    <Badge className="bg-red-100 text-red-700 border-red-300">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        مرفوض
                                    </Badge>
                                </div>
                                <p className="text-sm text-gray-600">
                                    {getOrganizationTypeLabel(rejectedRequests[0].organizationType)}
                                </p>
                                {rejectedRequests[0].rejectionReason && (
                                    <p className="text-xs text-red-600 mt-1">
                                        💬 السبب: {rejectedRequests[0].rejectionReason}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* زر الانضمام */}
                    <Link href="/dashboard/player/referrals">
                        <Button variant="outline" className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                            <Plus className="h-4 w-4 mr-2" />
                            انضم لمنظمة جديدة
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
