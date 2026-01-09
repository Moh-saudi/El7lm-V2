import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import {
    Download, Users, Search, CheckCircle, Clock, X, DollarSign,
    UserCheck, UserX
} from 'lucide-react';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Tournament, formatDate } from '../utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { fixReceiptUrl } from '@/lib/utils/cloudflare-r2-utils';

interface ProfessionalRegistrationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournament: Tournament | null;
}

export const ProfessionalRegistrationsModal: React.FC<ProfessionalRegistrationsModalProps> = ({
    isOpen,
    onClose,
    tournament
}) => {
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all');

    const fetchRegistrations = async () => {
        if (!tournament?.id) return;

        try {
            setLoading(true);

            // Fetch from new collection (group based)
            let allRegistrations: any[] = [];

            try {
                const newRegistrationsQuery = query(
                    collection(db, 'tournamentRegistrations'),
                    where('tournamentId', '==', tournament.id)
                );
                const newSnapshot = await getDocs(newRegistrationsQuery);
                const newRegistrations = newSnapshot.docs.map(doc => {
                    const data = doc.data();
                    const players = data.players || [];
                    // Process both individual players and the group registration itself
                    return players.map((player: any, index: number) => ({
                        id: `${doc.id}_${index}`,
                        originalId: doc.id,
                        playerId: player.id,
                        playerName: player.name || player.full_name || 'غير محدد',
                        playerEmail: player.email || data.accountEmail || '',
                        playerPhone: player.phone || data.accountPhone || '',
                        playerClub: player.club_id || data.clubName || '',
                        playerAvatar: player.photoURL || player.avatar || data.accountAvatar || null,
                        playerPosition: player.position || '',
                        registrationDate: data.registrationDate || data.createdAt || new Date(),
                        paymentStatus: data.paymentStatus || 'pending',
                        paymentAmount: data.paymentAmount || 0,
                        paymentMethod: data.paymentMethod,
                        notes: data.notes,
                        status: data.status || 'pending', // Registration status (approved/rejected)
                        registrationType: data.registrationType,
                        teamName: data.teamName || data.clubName || 'تسجيل فردي'
                    }));
                }).flat();
                allRegistrations = newRegistrations;
            } catch (error) {
                console.error('Error fetching new registrations:', error);
            }

            setRegistrations(allRegistrations);
        } catch (error) {
            console.error('Error fetching registrations:', error);
            toast.error('فشل في تحميل بيانات المسجلين');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && tournament) {
            fetchRegistrations();
        }
    }, [isOpen, tournament]);

    const handleStatusUpdate = async (regId: string, newStatus: string) => {
        // Find the registration to get originalDocId
        const reg = registrations.find(r => r.id === regId);
        if (!reg) return;

        try {
            await updateDoc(doc(db, 'tournamentRegistrations', reg.originalId), {
                status: newStatus,
                updatedAt: new Date()
            });
            toast.success(`تم تحديث الحالة إلى ${newStatus === 'approved' ? 'مقبول' : 'مرفوض'}`);

            // Optimistic update
            setRegistrations(prev => prev.map(r => r.originalId === reg.originalId ? { ...r, status: newStatus } : r));
        } catch (error) {
            console.error(error);
            toast.error('فشل تحديث الحالة');
        }
    };

    const filteredRegistrations = registrations.filter(reg => {
        const matchesSearch =
            reg.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.playerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.playerPhone.includes(searchTerm) ||
            reg.teamName?.toLowerCase().includes(searchTerm.toLowerCase());

        if (activeTab === 'all') return matchesSearch;
        if (activeTab === 'paid') return matchesSearch && reg.paymentStatus === 'paid';
        if (activeTab === 'pending') return matchesSearch && reg.paymentStatus === 'pending';
        if (activeTab === 'approved') return matchesSearch && reg.status === 'approved';

        return matchesSearch;
    });

    const exportToExcel = () => {
        toast.info('سيتم تفعيل التصدير قريباً');
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved': return <Badge className="bg-green-100 text-green-800 border-green-200">مقبول</Badge>;
            case 'rejected': return <Badge className="bg-red-100 text-red-800 border-red-200">مرفوض</Badge>;
            default: return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">قيد المراجعة</Badge>;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-gray-50 h-[90vh]">
                {/* Header */}
                <div className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
                    <div>
                        <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            المسجلين - {tournament?.name}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500 mt-1 mr-11">
                            إدارة طلبات التسجيل واللاعبين ({registrations.length} مسجل)
                        </DialogDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={fetchRegistrations} className="bg-white hover:bg-gray-50">
                            تحديث
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportToExcel} className="bg-white hover:bg-gray-50">
                            <Download className="h-4 w-4 mr-2" />
                            Excel
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col p-6 gap-6">
                    {/* Filters & Actions Bar */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                            <TabsList className="bg-gray-100 p-1">
                                <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">الكل</TabsTrigger>
                                <TabsTrigger value="paid" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"><DollarSign className="h-4 w-4" /> المدفوع</TabsTrigger>
                                <TabsTrigger value="pending" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"><Clock className="h-4 w-4" /> في الانتظار</TabsTrigger>
                                <TabsTrigger value="approved" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"><CheckCircle className="h-4 w-4" /> المقبولين</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="relative w-full md:w-72">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="بحث عن لاعب، فريق، رقم..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pr-9 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>

                    {/* Registrations Table */}
                    <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
                        <div className="overflow-y-auto flex-1">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <p className="text-gray-500 text-sm">جاري تحميل البيانات...</p>
                                </div>
                            ) : filteredRegistrations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                                    <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center">
                                        <Users className="h-8 w-8 opacity-20" />
                                    </div>
                                    <p>لا توجد نتائج مطابقة للبحث</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-gray-50 sticky top-0 z-10 border-b">
                                        <TableRow className="hover:bg-transparent border-b-gray-200">
                                            <TableHead className="text-right py-4 w-[300px] font-semibold text-gray-700">اللاعب / الفريق</TableHead>
                                            <TableHead className="text-right py-4 font-semibold text-gray-700">معلومات الاتصال</TableHead>
                                            <TableHead className="text-right py-4 font-semibold text-gray-700">التاريخ</TableHead>
                                            <TableHead className="text-right py-4 font-semibold text-gray-700">حالة الدفع</TableHead>
                                            <TableHead className="text-right py-4 font-semibold text-gray-700">حالة الطلب</TableHead>
                                            <TableHead className="text-center py-4 w-[120px] font-semibold text-gray-700">إجراءات</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredRegistrations.map((reg) => (
                                            <TableRow key={reg.id} className="hover:bg-blue-50/30 transition-colors group border-b-gray-100">
                                                <TableCell className="py-3">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm bg-gray-100">
                                                            <AvatarImage src={fixReceiptUrl(reg.playerAvatar) || ''} />
                                                            <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                                                                {reg.playerName.slice(0, 2)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-semibold text-gray-900">{reg.playerName}</div>
                                                            <div className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-1">
                                                                {reg.teamName}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <div className="space-y-1">
                                                        <div className="text-sm text-gray-700 font-medium ltr:text-left font-mono">{reg.playerPhone}</div>
                                                        <div className="text-xs text-gray-400">{reg.playerEmail}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3 text-gray-500 font-medium">
                                                    {formatDate(reg.registrationDate)}
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <Badge variant="outline" className={`font-normal ${reg.paymentStatus === 'paid'
                                                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                                        : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                                                        }`}>
                                                        {reg.paymentStatus === 'paid' ? 'تم الدفع' : 'معلق'}
                                                    </Badge>
                                                    {reg.paymentAmount > 0 && (
                                                        <span className="text-xs font-mono text-gray-500 block mt-1">
                                                            {reg.paymentAmount.toLocaleString()} ر.س
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    {getStatusBadge(reg.status)}
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-all transform scale-95 group-hover:scale-100">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700 rounded-full"
                                                            onClick={() => handleStatusUpdate(reg.id, 'approved')}
                                                            title="قبول التسجيل"
                                                        >
                                                            <UserCheck className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-full"
                                                            onClick={() => handleStatusUpdate(reg.id, 'rejected')}
                                                            title="رفض التسجيل"
                                                        >
                                                            <UserX className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                        <div className="bg-gray-50 p-4 border-t text-xs text-gray-500 flex justify-between items-center font-medium">
                            <span className="flex items-center gap-2">
                                <Users className="h-4 w-4 opacity-50" />
                                إجمالي النتائج: <span className="text-gray-900">{filteredRegistrations.length}</span>
                            </span>
                            <span className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500 opacity-70" />
                                مدفوع: <span className="text-green-700">{filteredRegistrations.filter(r => r.paymentStatus === 'paid').length}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
