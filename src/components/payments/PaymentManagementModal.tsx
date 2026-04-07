'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  X,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Download,
  RefreshCw,
  CreditCard,
  Smartphone,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Check,
  XCircle,
  MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/config';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface PaymentManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: {
    id: string;
    name: string;
    entryFee: number;
    paymentDeadline?: string;
  };
}

interface PaymentRecord {
  id: string;
  registrationId: string;
  playerName: string;
  playerEmail: string;
  playerPhone: string;
  amount: number;
  playerCount: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: 'mobile_wallet' | 'card' | 'geidea' | 'later' | 'skipcash';
  paymentType?: 'immediate' | 'deferred';
  registrationDate: Date;
  paymentDate?: Date;
  notes?: string;
  receiptUrl?: string;
  receiptNumber?: string;
  mobileWalletProvider?: string;
  mobileWalletNumber?: string;
  geideaOrderId?: string;
  geideaTransactionId?: string;
  geideaPaymentData?: string;
  players?: Array<{ id: string; name: string; }>;
}

export default function PaymentManagementModal({
  isOpen,
  onClose,
  tournament
}: PaymentManagementModalProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filteredPayments, setFilteredPayments] = useState<PaymentRecord[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPayments();
    }
  }, [isOpen, tournament.id]);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, statusFilter]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const allPayments: PaymentRecord[] = [];

      // 1. Fetch from 'tournament_registrations' (Individual/Old)
      try {
        const { data: oldData } = await supabase
          .from('tournament_registrations')
          .select('*')
          .eq('tournamentId', tournament.id)
          .order('registrationDate', { ascending: false });

        if (oldData) {
          const oldPayments = oldData.map((data: any) => ({
            id: data.id,
            registrationId: data.registrationId || data.id,
            playerName: data.accountName || data.playerName || 'غير محدد',
            playerEmail: data.accountEmail || data.playerEmail || '',
            playerPhone: data.accountPhone || data.playerPhone || '',
            amount: data.paymentAmount || data.amount || 0,
            playerCount: data.players?.length || data.playerCount || 1,
            paymentStatus: data.paymentStatus || 'pending',
            paymentMethod: data.paymentMethod,
            paymentType: data.paymentType,
            registrationDate: data.registrationDate ? new Date(data.registrationDate) : new Date(),
            paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
            notes: data.notes || '',
            receiptUrl: data.receiptUrl || '',
            receiptNumber: data.receiptNumber || '',
            mobileWalletProvider: data.mobileWalletProvider || '',
            mobileWalletNumber: data.mobileWalletNumber || '',
            geideaOrderId: data.geideaOrderId || '',
            geideaTransactionId: data.geideaTransactionId || '',
            geideaPaymentData: data.geideaPaymentData || '',
            players: data.players || []
          } as PaymentRecord));
          allPayments.push(...oldPayments);
        }
      } catch (e) {
        console.error("Error fetching old payments", e);
      }

      // 2. Fetch from 'tournamentRegistrations' (Group/New)
      try {
        const { data: newData } = await supabase
          .from('tournamentRegistrations')
          .select('*')
          .eq('tournamentId', tournament.id);

        if (newData) {
          const newPayments = newData.map((data: any) => ({
            id: data.id,
            registrationId: data.id,
            playerName: data.teamName || data.clubName || data.accountName || 'فريق',
            playerEmail: data.accountEmail || '',
            playerPhone: data.accountPhone || '',
            amount: data.paymentAmount || 0,
            playerCount: data.players?.length || 0,
            paymentStatus: data.paymentStatus || 'pending',
            paymentMethod: data.paymentMethod,
            paymentType: 'immediate',
            registrationDate: data.registrationDate ? new Date(data.registrationDate) : (data.createdAt ? new Date(data.createdAt) : new Date()),
            paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
            notes: data.notes || '',
            receiptUrl: data.receiptUrl || '',
            receiptNumber: data.receiptNumber || '',
            mobileWalletProvider: data.mobileWalletProvider || '',
            mobileWalletNumber: data.mobileWalletNumber || '',
            geideaOrderId: data.geideaOrderId || '',
            geideaTransactionId: data.geideaTransactionId || '',
            geideaPaymentData: '',
            players: data.players || []
          } as PaymentRecord));
          allPayments.push(...newPayments);
        }
      } catch (e) {
        console.error("Error fetching new payments", e);
      }

      // Sort by date desc
      allPayments.sort((a, b) => b.registrationDate.getTime() - a.registrationDate.getTime());

      setPayments(allPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('فشل في تحميل المدفوعات');
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.playerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.playerPhone.includes(searchTerm)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.paymentStatus === statusFilter);
    }

    setFilteredPayments(filtered);
  };

  const updatePaymentStatus = async (paymentId: string, newStatus: PaymentRecord['paymentStatus']) => {
    try {
      await supabase
        .from('tournament_registrations')
        .update({
          paymentStatus: newStatus,
          paymentDate: newStatus === 'paid' ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString()
        })
        .eq('id', paymentId);

      toast.success('تم تحديث حالة الدفع بنجاح');
      fetchPayments();
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('فشل في تحديث حالة الدفع');
    }
  };

  const getStatusColor = (status: PaymentRecord['paymentStatus']) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'refunded': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: PaymentRecord['paymentStatus']) => {
    switch (status) {
      case 'paid': return 'مدفوع';
      case 'pending': return 'في الانتظار';
      case 'failed': return 'فشل';
      case 'refunded': return 'مسترد';
      default: return 'غير محدد';
    }
  };

  const getPaymentMethodIcon = (method?: string) => {
    switch (method) {
      case 'mobile_wallet': return Smartphone;
      case 'card':
      case 'geidea':
      case 'skipcash': return CreditCard;
      case 'later': return Clock;
      default: return DollarSign;
    }
  };

  const getPaymentMethodText = (method?: string) => {
    switch (method) {
      case 'mobile_wallet': return 'محفظة إلكترونية';
      case 'card':
      case 'geidea': return 'كارت بنكي (جيديا)';
      case 'skipcash': return 'كارت بنكي (SkipCash)';
      case 'later': return 'دفع لاحقاً';
      default: return 'غير محدد';
    }
  };

  const handleViewReceipt = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setShowReceiptModal(true);
  };

  const handleApprovePayment = async (paymentId: string) => {
    try {
      await supabase
        .from('tournament_registrations')
        .update({
          paymentStatus: 'paid',
          paymentDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .eq('id', paymentId);

      toast.success('تم الموافقة على الدفع بنجاح');
      fetchPayments();
      setShowReceiptModal(false);
      setSelectedPayment(null);
    } catch (error) {
      console.error('Error approving payment:', error);
      toast.error('فشل في الموافقة على الدفع');
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    try {
      await supabase
        .from('tournament_registrations')
        .update({
          paymentStatus: 'failed',
          updatedAt: new Date().toISOString()
        })
        .eq('id', paymentId);

      toast.success('تم رفض الدفع');
      fetchPayments();
      setShowReceiptModal(false);
      setSelectedPayment(null);
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('فشل في رفض الدفع');
    }
  };

  const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const paidAmount = filteredPayments.filter(p => p.paymentStatus === 'paid').reduce((sum, payment) => sum + payment.amount, 0);
  const pendingAmount = filteredPayments.filter(p => p.paymentStatus === 'pending').reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-gray-50">
        <DialogHeader className="bg-white px-6 py-4 border-b shrink-0 shadow-sm z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  إدارة المدفوعات
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  {tournament.name}
                </DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 border-blue-200 shadow-sm group hover:shadow-md transition-all">
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-blue-600">إجمالي المدفوعات (عدد)</p>
                  <Users className="h-5 w-5 text-blue-500 opacity-70 group-hover:opacity-100" />
                </div>
                <p className="text-2xl font-bold text-blue-900">{filteredPayments.length}</p>
                <div className="h-1 w-full bg-blue-200 rounded-full mt-1"><div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }}></div></div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200 shadow-sm group hover:shadow-md transition-all">
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-green-600">المبلغ المحصل</p>
                  <CheckCircle className="h-5 w-5 text-green-500 opacity-70 group-hover:opacity-100" />
                </div>
                <p className="text-2xl font-bold text-green-900">{paidAmount.toLocaleString()} ج.م</p>
                <div className="h-1 w-full bg-green-200 rounded-full mt-1">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${(paidAmount / (totalAmount || 1)) * 100}%` }}></div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200 shadow-sm group hover:shadow-md transition-all">
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-yellow-600">في الانتظار</p>
                  <Clock className="h-5 w-5 text-yellow-500 opacity-70 group-hover:opacity-100" />
                </div>
                <p className="text-2xl font-bold text-yellow-900">{pendingAmount.toLocaleString()} ج.م</p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200 shadow-sm group hover:shadow-md transition-all">
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-purple-600">إجمالي المتوقع</p>
                  <DollarSign className="h-5 w-5 text-purple-500 opacity-70 group-hover:opacity-100" />
                </div>
                <p className="text-2xl font-bold text-purple-900">{totalAmount.toLocaleString()} ج.م</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
              <TabsList className="bg-gray-100">
                <TabsTrigger value="all">الكل</TabsTrigger>
                <TabsTrigger value="pending" className="gap-2"><Clock className="h-4 w-4" /> في الانتظار</TabsTrigger>
                <TabsTrigger value="paid" className="gap-2"><CheckCircle className="h-4 w-4" /> مدفوع</TabsTrigger>
                <TabsTrigger value="failed" className="gap-2"><XCircle className="h-4 w-4" /> مرفوض</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full md:w-80 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="بحث باسم، بريد، هاتف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-9 bg-gray-50 focus:bg-white border-gray-200"
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchPayments} title="تحديث" className="bg-white hover:bg-gray-50">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Payments Table */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden min-h-[400px] flex flex-col">
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="bg-gray-50 sticky top-0 z-10 border-b">
                  <TableRow className="hover:bg-transparent border-b-gray-200">
                    <TableHead className="text-right py-4 w-[250px] font-semibold text-gray-700">المستخدم</TableHead>
                    <TableHead className="text-right py-4 font-semibold text-gray-700">بيانات التواصل</TableHead>
                    <TableHead className="text-right py-4 font-semibold text-gray-700">المبلغ</TableHead>
                    <TableHead className="text-right py-4 font-semibold text-gray-700">طريقة الدفع</TableHead>
                    <TableHead className="text-right py-4 font-semibold text-gray-700">الحالة</TableHead>
                    <TableHead className="text-right py-4 font-semibold text-gray-700">التاريخ</TableHead>
                    <TableHead className="text-center py-4 text-xs w-[100px] font-semibold text-gray-700">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <p className="text-gray-500">جاري تحميل البيانات...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center gap-3 opacity-50">
                          <CreditCard className="h-12 w-12 text-gray-300" />
                          <p className="text-gray-500">لا توجد مدفوعات تطابق معايير البحث</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id} className="group hover:bg-gray-50 transition-colors border-b-gray-100">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-gray-100 shadow-sm bg-gray-50">
                              <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-xs">
                                {payment.playerName.slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-gray-900">{payment.playerName}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{payment.playerCount} لاعب</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-xs font-mono text-gray-600">{payment.playerPhone}</div>
                            <div className="text-xs text-gray-400">{payment.playerEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-gray-900">{payment.amount.toLocaleString()} <span className="text-xs font-normal text-gray-500">ج.م</span></div>
                        </TableCell>
                        <TableCell>
                          {payment.paymentMethod ? (
                            <div className="flex items-center gap-1.5 text-sm text-gray-700">
                              {React.createElement(getPaymentMethodIcon(payment.paymentMethod), { className: 'h-4 w-4 text-gray-400' })}
                              <span>
                                {payment.paymentMethod === 'mobile_wallet' ? 'محفظة' :
                                  payment.paymentMethod === 'card' ? 'بطاقة' :
                                    payment.paymentMethod === 'geidea' ? 'جيديا' :
                                      payment.paymentMethod === 'skipcash' ? 'SkipCash' : 'آجل'}
                              </span>
                            </div>
                          ) : <span className="text-gray-400 text-xs">-</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(payment.paymentStatus)}>
                            {getStatusText(payment.paymentStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-gray-500">
                            <div>{new Date(payment.registrationDate).toLocaleDateString('en-GB')}</div>
                            <div className="text-[10px] text-gray-400">{new Date(payment.registrationDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white">
                                <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {payment.paymentStatus === 'pending' && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleApprovePayment(payment.id)} className="text-green-600 focus:text-green-700 focus:bg-green-50 cursor-pointer">
                                      <Check className="h-4 w-4 mr-2" /> موافقة
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleRejectPayment(payment.id)} className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer">
                                      <XCircle className="h-4 w-4 mr-2" /> رفض
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                {payment.receiptUrl && (
                                  <DropdownMenuItem onClick={() => handleViewReceipt(payment)} className="cursor-pointer">
                                    <FileText className="h-4 w-4 mr-2" /> عرض الإيصال
                                  </DropdownMenuItem>
                                )}
                                {!payment.receiptUrl && (
                                  <DropdownMenuItem disabled>
                                    <span className="text-gray-400 text-xs">لا يوجد إيصال</span>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="bg-gray-50 p-4 border-t text-xs text-gray-500 flex justify-between">
              <span>عرض {filteredPayments.length} من أصل {payments.length}</span>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Receipt Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              تفاصيل الدفع
            </DialogTitle>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h3 className="font-semibold mb-3 text-sm text-gray-900 border-b pb-2">بيانات المستخدم</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">الاسم:</span> <span className="font-medium">{selectedPayment.playerName}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">الهاتف:</span> <span className="font-medium font-mono">{selectedPayment.playerPhone}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">البريد:</span> <span className="font-medium">{selectedPayment.playerEmail}</span></div>
                    </div>
                  </div>

                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                    <h3 className="font-semibold mb-3 text-sm text-blue-900 border-b border-blue-200 pb-2">تفاصيل المعاملة</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-blue-700/70">المبلغ:</span> <span className="font-bold text-blue-700 text-lg">{selectedPayment.amount} ج.م</span></div>
                      <div className="flex justify-between"><span className="text-blue-700/70">الطريقة:</span> <span className="font-medium">{getPaymentMethodText(selectedPayment.paymentMethod)}</span></div>
                      {selectedPayment.mobileWalletProvider && (
                        <div className="flex justify-between"><span className="text-blue-700/70">المحفظة:</span> <span className="font-medium">{selectedPayment.mobileWalletProvider}</span></div>
                      )}
                      <div className="flex justify-between items-center"><span className="text-blue-700/70">الحالة:</span>
                        <Badge variant="outline" className={getStatusColor(selectedPayment.paymentStatus)}>{getStatusText(selectedPayment.paymentStatus)}</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedPayment.receiptUrl ? (
                    <div className="border rounded-lg overflow-hidden bg-gray-900/5 items-center flex justify-center p-2 relative group">
                      <img
                        src={selectedPayment.receiptUrl}
                        alt="Receipt"
                        className="max-h-[400px] object-contain rounded shadow-sm bg-white"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => window.open(selectedPayment.receiptUrl, '_blank')}>
                          <ExternalLink className="h-4 w-4 mr-2" /> فتح
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full min-h-[200px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-400 gap-2">
                      <FileText className="h-10 w-10 opacity-20" />
                      <p>لا يوجد إيصال مرفق</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedPayment.paymentStatus === 'pending' && (
                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => handleRejectPayment(selectedPayment.id)} className="text-red-600 hover:bg-red-50 border-red-200 hover:border-red-300">
                    <XCircle className="h-4 w-4 mr-2" /> رفض
                  </Button>
                  <Button onClick={() => handleApprovePayment(selectedPayment.id)} className="bg-green-600 hover:bg-green-700">
                    <Check className="h-4 w-4 mr-2" /> موافقة على الدفع
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
