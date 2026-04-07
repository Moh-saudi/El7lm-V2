'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/config';
import { createPlayerLoginAccount } from '@/lib/utils/player-login-account';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, CheckCircle, AlertTriangle, Mail, Phone, User, Building, Copy, Eye, EyeOff, Loader } from 'lucide-react';
import { toast } from 'sonner';

interface InviteCodeData {
  playerId: string;
  playerName: string;
  organizationType: string;
  organizationName: string;
  email?: string;
  phone?: string;
  createdAt: Date;
  usedAt?: Date;
  isUsed: boolean;
}

interface PlayerData {
  id: string;
  full_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  club_id?: string;
  academy_id?: string;
  trainer_id?: string;
  agent_id?: string;
  source: 'players' | 'player';
}

export default function InviteCodePage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<InviteCodeData | null>(null);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInviteData();
  }, [params.code]);

  const loadInviteData = async () => {
    try {
      setLoading(true);
      setError(null);

      // البحث عن كود الدعوة في جدول invite_codes
      const { data: inviteDocs } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', params.code);

      if (!inviteDocs || inviteDocs.length === 0) {
        setError('كود الدعوة غير صحيح أو منتهي الصلاحية');
        return;
      }

      const invite = inviteDocs[0] as InviteCodeData;

      if (invite.isUsed) {
        setError('تم استخدام كود الدعوة من قبل');
        return;
      }

      setInviteData(invite);

      // البحث عن بيانات اللاعب
      const playerDoc = await findPlayerById(invite.playerId);
      if (playerDoc) {
        setPlayerData(playerDoc);
        setEmail(playerDoc.email || '');
      } else {
        setError('لم يتم العثور على بيانات اللاعب');
      }

    } catch (error) {
      console.error('خطأ في تحميل كود الدعوة:', error);
      setError('حدث خطأ في تحميل كود الدعوة');
    } finally {
      setLoading(false);
    }
  };

  const findPlayerById = async (playerId: string): Promise<PlayerData | null> => {
    try {
      // البحث في جدول players
      const { data: playerRow } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (playerRow) {
        return {
          ...playerRow,
          id: playerRow.id,
          source: 'players' as const
        } as PlayerData;
      }

      // البحث في جدول player
      const { data: playerRow2 } = await supabase
        .from('player')
        .select('*')
        .eq('id', playerId)
        .single();

      if (playerRow2) {
        return {
          ...playerRow2,
          id: playerRow2.id,
          source: 'player' as const
        } as PlayerData;
      }

      return null;
    } catch (error) {
      console.error('خطأ في البحث عن اللاعب:', error);
      return null;
    }
  };

  const handleCreateAccount = async () => {
    if (!email || !confirmEmail) {
      toast.error('يرجى إدخال الإيميل وتأكيده');
      return;
    }

    if (email !== confirmEmail) {
      toast.error('الإيميل وتأكيد الإيميل غير متطابقين');
      return;
    }

    if (!playerData || !inviteData) {
      toast.error('بيانات غير مكتملة');
      return;
    }

    setIsCreating(true);

    try {
      // إنشاء حساب اللاعب
      const updatedPlayerData = {
        ...playerData,
        email: email
      };

      const result = await createPlayerLoginAccount(playerData.id, updatedPlayerData, playerData.source);

      if (result.success) {
        setCreatedPassword(result.tempPassword || 'Player123!@#');

        // تحديث كود الدعوة كمستخدم
        await supabase.from('invite_codes').insert({
          id: crypto.randomUUID(),
          ...inviteData,
          isUsed: true,
          usedAt: new Date().toISOString(),
          usedEmail: email
        });

        toast.success('تم إنشاء حساب تسجيل الدخول بنجاح!');
      } else {
        toast.error(`فشل في إنشاء الحساب: ${result.message}`);
      }
    } catch (error) {
      console.error('خطأ في إنشاء الحساب:', error);
      toast.error('حدث خطأ في إنشاء حساب تسجيل الدخول');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('تم النسخ للحافظة');
  };

  const getOrganizationInfo = () => {
    if (!inviteData) return '';
    return `${inviteData.organizationType} - ${inviteData.organizationName}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل كود الدعوة...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              خطأ في كود الدعوة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="w-full"
            >
              العودة للصفحة الرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="bg-green-600 p-4 rounded-full">
              <UserPlus className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🎉 مرحباً بك!
          </h1>
          <p className="text-lg text-gray-600">
            تم دعوتك لإنشاء حساب تسجيل دخول للوصول لملفك الشخصي
          </p>
        </div>

        {!createdPassword ? (
          // نموذج إنشاء الحساب
          <Card>
            <CardHeader>
              <CardTitle>إنشاء حساب تسجيل الدخول</CardTitle>
              <CardDescription>
                أكمل البيانات أدناه لإنشاء حساب تسجيل الدخول الخاص بك
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* معلومات اللاعب */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  معلوماتك الشخصية
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-600">الاسم</Label>
                    <div className="font-medium">{playerData?.full_name || playerData?.name}</div>
                  </div>

                  <div>
                    <Label className="text-gray-600">الانتماء</Label>
                    <div className="flex items-center gap-1">
                      <Building className="w-3 h-3 text-blue-600" />
                      <span className="font-medium">{getOrganizationInfo()}</span>
                    </div>
                  </div>

                  {playerData?.phone && (
                    <div>
                      <Label className="text-gray-600">رقم الهاتف</Label>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-gray-500" />
                        <span className="font-medium">{playerData.phone}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* إدخال الإيميل */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    الإيميل لتسجيل الدخول
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="أدخل إيميلك الصحيح"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ستستخدم هذا الإيميل لتسجيل الدخول لحسابك
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirmEmail">تأكيد الإيميل</Label>
                  <Input
                    id="confirmEmail"
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="أعد إدخال الإيميل"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* زر إنشاء الحساب */}
              <Button
                onClick={handleCreateAccount}
                disabled={!email || !confirmEmail || email !== confirmEmail || isCreating}
                className="w-full"
                size="lg"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    جاري إنشاء الحساب...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    إنشاء حساب تسجيل الدخول
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          // عرض نتيجة إنشاء الحساب
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                تم إنشاء حسابك بنجاح!
              </CardTitle>
              <CardDescription>
                يمكنك الآن تسجيل الدخول باستخدام البيانات أدناه
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* بيانات تسجيل الدخول */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-3">بيانات تسجيل الدخول:</h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">الإيميل:</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-white px-3 py-2 rounded border">{email}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(email)}
                        className="p-2"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">كلمة المرور:</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-white px-3 py-2 rounded border">
                        {showPassword ? createdPassword : '••••••••••'}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-2"
                      >
                        {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(createdPassword!)}
                        className="p-2"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* تعليمات */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">الخطوات التالية:</h4>
                <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                  <li>اذهب إلى صفحة تسجيل الدخول</li>
                  <li>أدخل إيميلك وكلمة المرور المؤقتة</li>
                  <li>ستُطلب منك تغيير كلمة المرور عند الدخول الأول</li>
                  <li>يمكنك الآن الوصول لملفك الشخصي وتلقي الإشعارات</li>
                </ol>
              </div>

              {/* أزرار الإجراء */}
              <div className="flex gap-3">
                <Button
                  onClick={() => router.push('/auth/login')}
                  className="flex-1"
                >
                  تسجيل الدخول الآن
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push('/')}
                >
                  الصفحة الرئيسية
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
