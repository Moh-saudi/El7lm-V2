import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Trophy, MapPin, Calendar, Users, DollarSign,
    Edit, Trash2, Link, UserPlus, Share
} from 'lucide-react';
import { toast } from 'sonner';
import { Tournament, formatDate, getCurrencySymbol } from '../utils';

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

export const TournamentCard: React.FC<TournamentCardProps> = ({
    tournament,
    onEdit,
    onDelete,
    onViewRegistrations,
    onViewProfessionalRegistrations,
    onManagePayments,
    onStatusChange,
    onShare
}) => {

    const getStatusColor = (t: Tournament) => {
        const now = new Date();
        const startDate = new Date(t.startDate);
        const endDate = new Date(t.endDate);
        const deadline = new Date(t.registrationDeadline);

        if (now > endDate) return 'bg-gray-500';
        if (now > startDate) return 'bg-green-500';
        if (now > deadline) return 'bg-red-500';
        return 'bg-blue-500';
    };

    const getStatusText = (t: Tournament) => {
        const now = new Date();
        const startDate = new Date(t.startDate);
        const endDate = new Date(t.endDate);
        const deadline = new Date(t.registrationDeadline);

        if (now > endDate) return 'انتهت';
        if (now > startDate) return 'جارية';
        if (now > deadline) return 'انتهى التسجيل';
        return 'قادمة';
    };

    return (
        <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        {tournament.logo ? (
                            <img
                                src={tournament.logo}
                                alt={tournament.name}
                                className="w-16 h-16 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                        ) : (
                            <div className="w-16 h-16 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Trophy className="h-8 w-8 text-yellow-600" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <CardTitle className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                                {tournament.name}
                            </CardTitle>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={`${getStatusColor(tournament)} text-white text-xs`}>
                                    {getStatusText(tournament)}
                                </Badge>
                                {tournament.isPaid && (
                                    <Badge className="bg-green-500 text-white text-xs">
                                        مدفوعة
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewRegistrations(tournament)}
                            className="h-9 w-9 p-0"
                            title="عرض التسجيلات"
                        >
                            <Users className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(tournament)}
                            className="h-9 w-9 p-0"
                            title="تعديل البطولة"
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(tournament.id!)}
                            className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="حذف البطولة"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-gray-400" />
                        <div>
                            <p className="text-xs text-gray-500">المكان</p>
                            <p className="text-sm font-medium text-gray-900">{tournament.location}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <div>
                            <p className="text-xs text-gray-500">تاريخ البداية</p>
                            <p className="text-sm font-medium text-gray-900">
                                {formatDate(tournament.startDate)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-gray-400" />
                        <div>
                            <p className="text-xs text-gray-500">المشاركون</p>
                            <p className="text-sm font-medium text-gray-900">
                                {tournament.currentParticipants}/{tournament.maxParticipants}
                            </p>
                        </div>
                    </div>

                    {tournament.isPaid && (
                        <div className="flex items-center gap-3">
                            <DollarSign className="h-5 w-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500">الرسوم</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {tournament.entryFee} {getCurrencySymbol(tournament.currency || 'EGP')}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {tournament.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{tournament.description}</p>
                )}

                <div className="pt-4 border-t border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={tournament.isActive === true}
                                onCheckedChange={(checked) => onStatusChange(tournament, checked)}
                            />
                            <span className={`text-sm font-medium ${tournament.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                                {tournament.isActive ? 'نشطة' : 'غير نشطة'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onShare(tournament)}
                            className="text-xs"
                        >
                            <Share className="h-3 w-3 mr-1" />
                            مشاركة
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewProfessionalRegistrations(tournament)}
                            className="text-xs"
                        >
                            <UserPlus className="h-3 w-3 mr-1" />
                            المسجلين
                        </Button>
                        {tournament.isPaid && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onManagePayments(tournament)}
                                className="text-xs"
                            >
                                <DollarSign className="h-3 w-3 mr-1" />
                                إدارة المدفوعات
                            </Button>
                        )}
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => window.location.href = `/dashboard/admin/tournaments/${tournament.id}`}
                            className="text-xs col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                        >
                            <Trophy className="h-3 w-3 mr-1" />
                            إدارة البطولة (الفرق، المباريات، النتائج)
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
