'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Copy, 
  CheckCircle, 
  DollarSign, 
  Users, 
  Calendar,
  Clock,
  X,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface WalletPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData: {
    tournamentName: string;
    amount: number;
    playerCount: number;
    paymentDeadline?: string;
    registrationId: string;
  };
  onPaymentSuccess?: () => void;
}

export default function WalletPaymentModal({ 
  isOpen, 
  onClose, 
  paymentData, 
  onPaymentSuccess 
}: WalletPaymentModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'vodafone' | 'etisalat' | 'orange'>('vodafone');

  // بيانات المحافظ الإلكترونية (مثال)
  const walletData = {
    vodafone: {
      name: 'فودافون كاش',
      number: '01012345678',
      icon: '📱',
      color: 'bg-red-500'
    },
    etisalat: {
      name: 'اتصالات كاش',
      number: '01234567890',
      icon: '📱',
      color: 'bg-blue-500'
    },
    orange: {
      name: 'أورنج كاش',
      number: '01512345678',
      icon: '📱',
      color: 'bg-orange-500'
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('تم نسخ البيانات');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error('فشل في نسخ البيانات');
    }
  };

  const handlePaymentComplete = () => {
    toast.success('تم إرسال طلب الدفع بنجاح! سيتم التأكيد خلال 24 ساعة');
    onPaymentSuccess?.();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-green-600 flex items-center justify-center gap-2">
            <Smartphone className="h-8 w-8" />
            الدفع عبر المحفظة الإلكترونية
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            ادفع رسوم البطولة باستخدام المحفظة الإلكترونية
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Summary */}
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="p-3 bg-green-100 rounded-full w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600">المبلغ المطلوب</p>
                  <p className="text-xl font-bold text-green-800">{paymentData.amount} ج.م</p>
                </div>
                
                <div className="text-center">
                  <div className="p-3 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600">عدد اللاعبين</p>
                  <p className="text-xl font-bold text-blue-800">{paymentData.playerCount}</p>
                </div>
                
                <div className="text-center">
                  <div className="p-3 bg-orange-100 rounded-full w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-orange-600" />
                  </div>
                  <p className="text-sm text-gray-600">البطولة</p>
                  <p className="text-lg font-bold text-orange-800 line-clamp-1">{paymentData.tournamentName}</p>
                </div>
              </div>
              
              {paymentData.paymentDeadline && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">
                      آخر موعد للدفع: {new Date(paymentData.paymentDeadline).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Wallet Selection */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold text-gray-700">اختر المحفظة الإلكترونية</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(walletData).map(([key, wallet]) => (
                <div
                  key={key}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    paymentMethod === key
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPaymentMethod(key as any)}
                >
                  <div className="text-center">
                    <div className={`p-3 ${wallet.color} rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center`}>
                      <span className="text-2xl">{wallet.icon}</span>
                    </div>
                    <h4 className="font-semibold text-gray-900">{wallet.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{wallet.number}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">تعليمات الدفع</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-blue-100 rounded-full mt-1">
                    <span className="text-sm font-bold text-blue-600">1</span>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700">
                      افتح تطبيق {walletData[paymentMethod].name} على هاتفك
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-blue-100 rounded-full mt-1">
                    <span className="text-sm font-bold text-blue-600">2</span>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700">
                      ادفع المبلغ الإجمالي <strong>{paymentData.amount} ج.م</strong> إلى الرقم التالي:
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        value={walletData[paymentMethod].number}
                        readOnly
                        className="bg-white border-blue-300"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(walletData[paymentMethod].number, 'number')}
                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                      >
                        {copiedField === 'number' ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-blue-100 rounded-full mt-1">
                    <span className="text-sm font-bold text-blue-600">3</span>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700">
                      أرسل إيصال الدفع عبر الواتساب أو ارفعه في النظام
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Reference */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-gray-700">رقم المرجع</Label>
            <div className="flex items-center gap-2">
              <Input
                value={`PAY-${paymentData.registrationId.slice(-8).toUpperCase()}`}
                readOnly
                className="bg-gray-50 border-gray-300"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(`PAY-${paymentData.registrationId.slice(-8).toUpperCase()}`, 'reference')}
                className="border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                {copiedField === 'reference' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              استخدم هذا الرقم كمرجع عند الدفع
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              <X className="h-4 w-4 mr-2" />
              إلغاء
            </Button>
            <Button
              onClick={handlePaymentComplete}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              تأكيد الدفع
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
