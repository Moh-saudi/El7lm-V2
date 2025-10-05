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
  RefreshCw
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
  paymentMethod?: string;
  paymentType?: 'immediate' | 'deferred';
  registrationDate: Date;
  paymentDate?: Date;
  notes?: string;
  receiptUrl?: string;
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
      const paymentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        registrationDate: doc.data().registrationDate?.toDate?.() || new Date(),
        paymentDate: doc.data().paymentDate?.toDate?.() || null
      })) as PaymentRecord[];
      
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
                          
                          <div>
                            <Badge className={getStatusColor(payment.paymentStatus)}>
                              {getStatusText(payment.paymentStatus)}
                            </Badge>
                            {payment.paymentMethod && (
                              <p className="text-xs text-gray-500 mt-1">{payment.paymentMethod}</p>
                            )}
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
                          
                          <div className="flex gap-2">
                            {payment.paymentStatus === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updatePaymentStatus(payment.id, 'paid')}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updatePaymentStatus(payment.id, 'failed')}
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-300 text-gray-600 hover:bg-gray-50"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
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
    </Dialog>
  );
}
