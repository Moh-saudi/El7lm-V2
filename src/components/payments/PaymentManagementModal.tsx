'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { collection, getDocs, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

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
  paymentMethod?: 'mobile_wallet' | 'card' | 'geidea' | 'later';
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
      const paymentsQuery = query(
        collection(db, 'tournament_registrations'),
        where('tournamentId', '==', tournament.id),
        orderBy('registrationDate', 'desc')
      );
      
      const querySnapshot = await getDocs(paymentsQuery);
      const paymentsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          registrationId: data.registrationId || doc.id,
          playerName: data.accountName || data.playerName || 'غير محدد',
          playerEmail: data.accountEmail || data.playerEmail || '',
          playerPhone: data.accountPhone || data.playerPhone || '',
          amount: data.paymentAmount || data.amount || 0,
          playerCount: data.players?.length || data.playerCount || 1,
          paymentStatus: data.paymentStatus || 'pending',
          paymentMethod: data.paymentMethod,
          paymentType: data.paymentType,
          registrationDate: data.registrationDate?.toDate?.() || new Date(),
          paymentDate: data.paymentDate?.toDate?.() || null,
          notes: data.notes || '',
          receiptUrl: data.receiptUrl || '',
          receiptNumber: data.receiptNumber || '',
          mobileWalletProvider: data.mobileWalletProvider || '',
          mobileWalletNumber: data.mobileWalletNumber || '',
          geideaOrderId: data.geideaOrderId || '',
          geideaTransactionId: data.geideaTransactionId || '',
          geideaPaymentData: data.geideaPaymentData || '',
          players: data.players || []
        } as PaymentRecord;
      });
      
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('فشل في تحميل المدفوعات');
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.playerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.playerPhone.includes(searchTerm)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.paymentStatus === statusFilter);
    }

    setFilteredPayments(filtered);
  };

  const updatePaymentStatus = async (paymentId: string, newStatus: PaymentRecord['paymentStatus']) => {
    try {
      await updateDoc(doc(db, 'tournament_registrations', paymentId), {
        paymentStatus: newStatus,
        paymentDate: newStatus === 'paid' ? new Date() : null,
        updatedAt: new Date()
      });
      
      toast.success('تم تحديث حالة الدفع بنجاح');
      fetchPayments();
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('فشل في تحديث حالة الدفع');
    }
  };

  const getStatusColor = (status: PaymentRecord['paymentStatus']) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const getPaymentMethodText = (method?: string) => {
    switch (method) {
      case 'mobile_wallet': return 'محفظة إلكترونية';
      case 'card':
      case 'geidea': return 'كارت بنكي (جيديا)';
      case 'later': return 'دفع لاحقاً';
      default: return 'غير محدد';
    }
  };

  const getPaymentMethodIcon = (method?: string) => {
    switch (method) {
      case 'mobile_wallet': return Smartphone;
      case 'card':
      case 'geidea': return CreditCard;
      case 'later': return Clock;
      default: return DollarSign;
    }
  };

  const getPaymentMethodColor = (method?: string) => {
    switch (method) {
      case 'mobile_wallet': return 'bg-green-100 text-green-800 border-green-300';
      case 'card':
      case 'geidea': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'later': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleViewReceipt = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setShowReceiptModal(true);
  };

  const handleApprovePayment = async (paymentId: string) => {
    try {
      await updateDoc(doc(db, 'tournament_registrations', paymentId), {
        paymentStatus: 'paid',
        paymentDate: new Date(),
        updatedAt: new Date()
      });
      
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
      await updateDoc(doc(db, 'tournament_registrations', paymentId), {
        paymentStatus: 'failed',
        updatedAt: new Date()
      });
      
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-blue-600 flex items-center justify-center gap-2">
            <DollarSign className="h-8 w-8" />
            إدارة المدفوعات - {tournament.name}
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            إدارة وتتبع جميع مدفوعات البطولة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600">إجمالي المدفوعات</p>
                    <p className="text-2xl font-bold text-blue-800">{filteredPayments.length}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600">المبلغ المدفوع</p>
                    <p className="text-2xl font-bold text-green-800">{paidAmount} ج.م</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600">في الانتظار</p>
                    <p className="text-2xl font-bold text-yellow-800">{pendingAmount} ج.م</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600">إجمالي المبلغ</p>
                    <p className="text-2xl font-bold text-purple-800">{totalAmount} ج.م</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-600" />
                البحث والفلترة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">البحث</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="ابحث بالاسم أو البريد أو الهاتف..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">حالة الدفع</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="جميع الحالات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="pending">في الانتظار</SelectItem>
                      <SelectItem value="paid">مدفوع</SelectItem>
                      <SelectItem value="failed">فشل</SelectItem>
                      <SelectItem value="refunded">مسترد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">الإجراءات</Label>
                  <Button
                    variant="outline"
                    onClick={fetchPayments}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    تحديث
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                قائمة المدفوعات ({filteredPayments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">جاري تحميل المدفوعات...</p>
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد مدفوعات</h3>
                  <p className="text-gray-500">لم يتم العثور على مدفوعات تطابق معايير البحث</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPayments.map((payment) => (
                    <Card key={payment.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                          <div>
                            <p className="font-semibold text-gray-900">{payment.playerName}</p>
                            <p className="text-sm text-gray-600">{payment.playerEmail}</p>
                            <p className="text-sm text-gray-600">{payment.playerPhone}</p>
                          </div>
                          
                          <div>
                            <p className="text-lg font-bold text-gray-900">{payment.amount} ج.م</p>
                            <p className="text-sm text-gray-600">{payment.playerCount} لاعب</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Badge className={getStatusColor(payment.paymentStatus)}>
                              {getStatusText(payment.paymentStatus)}
                            </Badge>
                            {payment.paymentMethod && (
                              <Badge variant="outline" className={`${getPaymentMethodColor(payment.paymentMethod)} flex items-center gap-1 w-fit`}>
                                {React.createElement(getPaymentMethodIcon(payment.paymentMethod), { className: 'h-3 w-3' })}
                                <span className="text-xs">{getPaymentMethodText(payment.paymentMethod)}</span>
                              </Badge>
                            )}
                            {payment.paymentMethod === 'mobile_wallet' && payment.mobileWalletProvider && (
                              <p className="text-xs text-gray-500">
                                {payment.mobileWalletProvider === 'vodafone' ? 'فودافون كاش' :
                                 payment.mobileWalletProvider === 'orange' ? 'أورنج' :
                                 payment.mobileWalletProvider === 'etisalat' ? 'اتصالات' :
                                 payment.mobileWalletProvider === 'instapay' ? 'انستا باي' :
                                 payment.mobileWalletProvider}
                              </p>
                            )}
                            {payment.paymentMethod === 'card' || payment.paymentMethod === 'geidea' ? (
                              <p className="text-xs text-green-600 font-medium">
                                ✓ دفع آلي
                              </p>
                            ) : null}
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-600">
                              {new Date(payment.registrationDate).toLocaleDateString('en-GB')}
                            </p>
                            {payment.paymentDate && (
                              <p className="text-xs text-gray-500">
                                دفع: {new Date(payment.paymentDate).toLocaleDateString('en-GB')}
                              </p>
                            )}
                          </div>
                          
                          <div>
                            <p className="text-xs text-gray-500">
                              {payment.paymentType === 'deferred' ? 'دفع لاحق' : 'دفع فوري'}
                            </p>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            {payment.paymentStatus === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (payment.paymentMethod === 'mobile_wallet' && payment.receiptUrl) {
                                      handleViewReceipt(payment);
                                    } else {
                                      handleApprovePayment(payment.id);
                                    }
                                  }}
                                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                                  title="موافقة"
                                >
                                  <Check className="h-4 w-4" />
                                  <span className="mr-1 text-xs">موافقة</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectPayment(payment.id)}
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                  title="رفض"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            {payment.receiptUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewReceipt(payment)}
                                className="border-blue-300 text-blue-600 hover:bg-blue-50 w-full"
                                title="عرض الإيصال"
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                <span className="text-xs">عرض الإيصال</span>
                              </Button>
                            )}
                            {payment.paymentStatus === 'paid' && (
                              <Badge className="bg-green-100 text-green-800 w-fit">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                تم الدفع
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              <X className="h-4 w-4 mr-2" />
              إغلاق
            </Button>
            <Button
              onClick={() => {
                // TODO: Export to Excel
                toast.info('قريباً: تصدير إلى Excel');
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              تصدير Excel
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Receipt View Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              تفاصيل الدفع والإيصال
            </DialogTitle>
            <DialogDescription>
              مراجعة تفاصيل الدفع والإيصال المرفوع
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-6">
              {/* Payment Details */}
              <Card className="border-2 border-blue-100">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    معلومات الدفع
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">اسم المسجل</Label>
                      <p className="font-semibold text-gray-900">{selectedPayment.playerName}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">البريد الإلكتروني</Label>
                      <p className="font-semibold text-gray-900">{selectedPayment.playerEmail}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">رقم الهاتف</Label>
                      <p className="font-semibold text-gray-900">{selectedPayment.playerPhone}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">عدد اللاعبين</Label>
                      <p className="font-semibold text-gray-900">{selectedPayment.playerCount} لاعب</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">المبلغ</Label>
                      <p className="text-xl font-bold text-green-600">{selectedPayment.amount} ج.م</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">طريقة الدفع</Label>
                      <Badge className={`${getPaymentMethodColor(selectedPayment.paymentMethod)} flex items-center gap-1 w-fit mt-1`}>
                        {React.createElement(getPaymentMethodIcon(selectedPayment.paymentMethod), { className: 'h-3 w-3' })}
                        <span>{getPaymentMethodText(selectedPayment.paymentMethod)}</span>
                      </Badge>
                    </div>
                    {selectedPayment.paymentMethod === 'mobile_wallet' && (
                      <>
                        {selectedPayment.mobileWalletProvider && (
                          <div>
                            <Label className="text-sm text-gray-600">مزود المحفظة</Label>
                            <p className="font-semibold text-gray-900">
                              {selectedPayment.mobileWalletProvider === 'vodafone' ? 'فودافون كاش' :
                               selectedPayment.mobileWalletProvider === 'orange' ? 'أورنج' :
                               selectedPayment.mobileWalletProvider === 'etisalat' ? 'اتصالات' :
                               selectedPayment.mobileWalletProvider === 'instapay' ? 'انستا باي' :
                               selectedPayment.mobileWalletProvider}
                            </p>
                          </div>
                        )}
                        {selectedPayment.mobileWalletNumber && (
                          <div>
                            <Label className="text-sm text-gray-600">رقم المحفظة</Label>
                            <p className="font-semibold text-gray-900">{selectedPayment.mobileWalletNumber}</p>
                          </div>
                        )}
                        {selectedPayment.receiptNumber && (
                          <div>
                            <Label className="text-sm text-gray-600">رقم الإيصال</Label>
                            <p className="font-semibold text-gray-900">{selectedPayment.receiptNumber}</p>
                          </div>
                        )}
                      </>
                    )}
                    {(selectedPayment.paymentMethod === 'card' || selectedPayment.paymentMethod === 'geidea') && (
                      <>
                        {selectedPayment.geideaOrderId && (
                          <div>
                            <Label className="text-sm text-gray-600">رقم الطلب (جيديا)</Label>
                            <p className="font-semibold text-gray-900">{selectedPayment.geideaOrderId}</p>
                          </div>
                        )}
                        {selectedPayment.geideaTransactionId && (
                          <div>
                            <Label className="text-sm text-gray-600">رقم المعاملة</Label>
                            <p className="font-semibold text-gray-900">{selectedPayment.geideaTransactionId}</p>
                          </div>
                        )}
                      </>
                    )}
                    <div>
                      <Label className="text-sm text-gray-600">تاريخ التسجيل</Label>
                      <p className="font-semibold text-gray-900">
                        {new Date(selectedPayment.registrationDate).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">حالة الدفع</Label>
                      <Badge className={getStatusColor(selectedPayment.paymentStatus)}>
                        {getStatusText(selectedPayment.paymentStatus)}
                      </Badge>
                    </div>
                  </div>
                  {selectedPayment.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <Label className="text-sm text-gray-600">ملاحظات</Label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg mt-1">{selectedPayment.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Receipt Image */}
              {selectedPayment.receiptUrl && (
                <Card className="border-2 border-green-100">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-green-600" />
                      إيصال الدفع
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="relative bg-gray-100 rounded-lg p-4 border-2 border-dashed border-gray-300">
                        {selectedPayment.receiptUrl.startsWith('http') ? (
                          <img 
                            src={selectedPayment.receiptUrl} 
                            alt="Receipt"
                            className="w-full h-auto rounded-lg shadow-lg max-h-[600px] object-contain mx-auto"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'text-center py-8 text-gray-500';
                              errorDiv.textContent = 'فشل في تحميل الصورة';
                              e.currentTarget.parentElement?.appendChild(errorDiv);
                            }}
                          />
                        ) : (
                          <div className="text-center py-8">
                            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">الإيصال: {selectedPayment.receiptUrl}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (selectedPayment.receiptUrl?.startsWith('http')) {
                              window.open(selectedPayment.receiptUrl, '_blank');
                            }
                          }}
                          className="flex-1"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          فتح في نافذة جديدة
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (selectedPayment.receiptUrl?.startsWith('http')) {
                              const link = document.createElement('a');
                              link.href = selectedPayment.receiptUrl;
                              link.download = `receipt_${selectedPayment.receiptNumber || selectedPayment.id}.jpg`;
                              link.click();
                            }
                          }}
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          تحميل الإيصال
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              {selectedPayment.paymentStatus === 'pending' && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => handleApprovePayment(selectedPayment.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    الموافقة على الدفع
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRejectPayment(selectedPayment.id)}
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    رفض الدفع
                  </Button>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReceiptModal(false);
                    setSelectedPayment(null);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
