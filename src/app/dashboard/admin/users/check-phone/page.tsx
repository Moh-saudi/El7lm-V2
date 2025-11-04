'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Phone, AlertCircle, CheckCircle2, XCircle, Shield, Trash2, RotateCcw, ExternalLink, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AccountTypeProtection } from '@/hooks/useAccountTypeAuth';
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export default function CheckPhonePage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  const checkPhone = async () => {
    if (!phone.trim()) {
      setError('يرجى إدخال رقم الهاتف');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      // تنظيف الرقم من الأحرف غير الرقمية
      const cleanPhone = phone.replace(/\D/g, '');
      
      const response = await fetch('/api/debug/check-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      
      if (!response.ok) {
        throw new Error('فشل في الاتصال بالخادم');
      }
      
      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setError(error.message || 'حدث خطأ أثناء الفحص');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      checkPhone();
    }
  };

  const handleDelete = (account: any) => {
    setSelectedAccount(account);
    setShowDeleteDialog(true);
  };

  const handleRestore = (account: any) => {
    setSelectedAccount(account);
    setShowRestoreDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedAccount || !user) return;

    setActionLoading(selectedAccount.id);
    try {
      const collectionName = selectedAccount.collection;
      const accountRef = doc(db, collectionName, selectedAccount.id);

      const deletePayload = {
        isDeleted: true,
        isActive: false,
        deletedAt: new Date(),
        deletedBy: user.uid
      };

      // Update in source collection
      await updateDoc(accountRef, deletePayload);

      // Also sync to users collection if exists
      try {
        const userDoc = await getDoc(doc(db, 'users', selectedAccount.id));
        if (userDoc.exists()) {
          await updateDoc(doc(db, 'users', selectedAccount.id), deletePayload);
        }
      } catch (e) {
        // Non-critical if users collection doesn't exist
        console.log('Users collection sync skipped:', e);
      }

      // Update local state
      setResult({
        ...result,
        accounts: result.accounts.map((acc: any) =>
          acc.id === selectedAccount.id
            ? { ...acc, isDeleted: true, isActive: false }
            : acc
        )
      });

      toast.success(`تم حذف حساب ${selectedAccount.name || selectedAccount.email} بنجاح`);
      setShowDeleteDialog(false);
      setSelectedAccount(null);
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(`حدث خطأ أثناء حذف الحساب: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const confirmRestore = async () => {
    if (!selectedAccount || !user) return;

    setActionLoading(selectedAccount.id);
    try {
      const collectionName = selectedAccount.collection;
      const accountRef = doc(db, collectionName, selectedAccount.id);

      const restorePayload = {
        isDeleted: false,
        isActive: true,
        restoredAt: new Date(),
        restoredBy: user.uid
      };

      // Update in source collection
      await updateDoc(accountRef, restorePayload);

      // Also sync to users collection if exists
      try {
        const userDoc = await getDoc(doc(db, 'users', selectedAccount.id));
        if (userDoc.exists()) {
          await updateDoc(doc(db, 'users', selectedAccount.id), restorePayload);
        }
      } catch (e) {
        // Non-critical if users collection doesn't exist
        console.log('Users collection sync skipped:', e);
      }

      // Update local state
      setResult({
        ...result,
        accounts: result.accounts.map((acc: any) =>
          acc.id === selectedAccount.id
            ? { ...acc, isDeleted: false, isActive: true }
            : acc
        )
      });

      toast.success(`تم استعادة حساب ${selectedAccount.name || selectedAccount.email} بنجاح`);
      setShowRestoreDialog(false);
      setSelectedAccount(null);
    } catch (error: any) {
      console.error('Error restoring account:', error);
      toast.error(`حدث خطأ أثناء استعادة الحساب: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const goToUserPage = () => {
    router.push('/dashboard/admin/users');
  };

  return (
    <AccountTypeProtection allowedTypes={['admin']}>
      <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
                  <Search className="h-10 w-10 text-teal-600" />
                  فحص رقم الهاتف
                </h1>
                <p className="text-gray-600 mt-2 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  تحقق من حالة رقم الهاتف في قاعدة البيانات ومعرفة تفاصيل الحسابات المرتبطة به
                </p>
              </div>
            </div>
          </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            إدخال رقم الهاتف
          </CardTitle>
          <CardDescription>
            أدخل رقم الهاتف للتحقق من وجوده وحالة الحسابات المرتبطة به
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="مثال: 201278988086 أو 1278988086"
                className="w-full"
                disabled={loading}
              />
            </div>
            <Button
              onClick={checkPhone}
              disabled={loading || !phone.trim()}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  جاري الفحص...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  فحص الرقم
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.found ? (
                <>
                  <XCircle className="w-5 h-5 text-orange-600" />
                  <span>النتيجة: تم العثور على {result.count} حساب</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>النتيجة: الرقم غير موجود</span>
                </>
              )}
            </CardTitle>
            <CardDescription>
              رقم الهاتف: <strong>{result.phone}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result.accounts && result.accounts.length > 0 ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  تم العثور على {result.count} حساب مرتبط بهذا الرقم
                </div>
                {result.accounts.map((acc: any, i: number) => (
                  <Card key={i} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">
                              الحساب {i + 1}: {acc.name || 'بدون اسم'}
                            </h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant="outline" className="mr-2">
                                {acc.collection}
                              </Badge>
                              <Badge variant={acc.accountType === 'club' ? 'default' : 'secondary'}>
                                {acc.accountType || 'غير محدد'}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => goToUserPage()}
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              عرض في المستخدمين
                            </Button>
                            {acc.isDeleted === true || (acc.isDeleted === undefined && acc.isActive === undefined) ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestore(acc)}
                                disabled={actionLoading === acc.id}
                                className="text-green-600 border-green-300 hover:bg-green-50"
                              >
                                {actionLoading === acc.id ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-4 h-4 mr-1" />
                                )}
                                استعادة
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(acc)}
                                disabled={actionLoading === acc.id}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                {actionLoading === acc.id ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4 mr-1" />
                                )}
                                حذف
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">البريد الإلكتروني:</span>
                            <div className="font-mono text-xs break-all">{acc.email}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">معرف الحساب:</span>
                            <div className="font-mono text-xs break-all">{acc.id}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t">
                          <div>
                            <span className="text-muted-foreground block text-xs mb-1">isDeleted</span>
                            <Badge 
                              variant={acc.isDeleted === true ? 'destructive' : acc.isDeleted === undefined ? 'outline' : 'secondary'}
                            >
                              {String(acc.isDeleted)} ({acc.isDeletedType})
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-xs mb-1">isActive</span>
                            <Badge 
                              variant={acc.isActive === false ? 'destructive' : acc.isActive === undefined ? 'outline' : 'default'}
                            >
                              {String(acc.isActive)} ({acc.isActiveType})
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-xs mb-1">حالة الحساب</span>
                            {(acc.isDeleted === true || acc.isActive === false || 
                              (acc.isDeleted === undefined && acc.isActive === undefined)) ? (
                              <Badge variant="destructive">محذوف/غير نشط</Badge>
                            ) : (
                              <Badge variant="default">نشط</Badge>
                            )}
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-xs mb-1">يمكن التسجيل؟</span>
                            {(acc.isDeleted === true || acc.isActive === false || 
                              (acc.isDeleted === undefined && acc.isActive === undefined)) ? (
                              <Badge variant="default" className="bg-green-600">نعم</Badge>
                            ) : (
                              <Badge variant="destructive">لا</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">الرقم غير موجود في قاعدة البيانات</p>
                <p className="text-muted-foreground">يمكن استخدام هذا الرقم للتسجيل</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف حساب <strong>{selectedAccount?.name || selectedAccount?.email}</strong>؟
              <br />
              سيتم تعطيل الحساب ونقله إلى الأرشيف. يمكن استعادته لاحقاً.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={actionLoading !== null}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  حذف الحساب
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الاستعادة</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من استعادة حساب <strong>{selectedAccount?.name || selectedAccount?.email}</strong>؟
              <br />
              سيتم تفعيل الحساب وإعادته إلى قائمة المستخدمين النشطين.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              إلغاء
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={confirmRestore}
              disabled={actionLoading !== null}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  جاري الاستعادة...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  استعادة الحساب
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AccountTypeProtection>
  );
}

