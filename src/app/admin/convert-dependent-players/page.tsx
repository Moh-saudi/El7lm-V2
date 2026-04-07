'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, UserPlus, Eye, Mail, Phone, User, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface DependentPlayer {
  id: string;
  full_name?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  club_id?: string;
  academy_id?: string;
  trainer_id?: string;
  agent_id?: string;
  accountType?: string;
  organizationInfo?: string;
  hasEmailOrPhone: boolean;
  canCreateAccount: boolean;
  source: 'players' | 'player';
  // إضافة الحقول المفقودة
  profile_image?: string;
  nationality?: string;
  primary_position?: string;
  position?: string;
  birth_date?: any;
  birthDate?: any;
  country?: string;
  city?: string;
}

export default function ConvertDependentPlayersPage() {
  const [dependentPlayers, setDependentPlayers] = useState<DependentPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState<string[]>([]);
  const [converted, setConverted] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // جلب اللاعبين التابعين
  useEffect(() => {
    loadDependentPlayers();
  }, []);

  const loadDependentPlayers = async () => {
    try {
      setLoading(true);
      const allPlayers: DependentPlayer[] = [];

      // جلب من مجموعة players
      const { data: playersData } = await supabase.from('players').select('*');
      (playersData || []).forEach(row => {
        const player = processPlayerData(row.id, row, 'players');
        if (player) allPlayers.push(player);
      });

      // جلب من مجموعة player
      const { data: playerData } = await supabase.from('player').select('*');
      (playerData || []).forEach(row => {
        const player = processPlayerData(row.id, row, 'player');
        if (player) allPlayers.push(player);
      });

      // إزالة التكرار
      const uniquePlayers = allPlayers.filter((player, index, self) => 
        index === self.findIndex(p => p.id === player.id)
      );

      // فلترة اللاعبين التابعين فقط
      const dependentOnly = uniquePlayers.filter(player => {
        const hasOrganization = !!(
          player.club_id || player.academy_id || 
          player.trainer_id || player.agent_id
        );
        const isDependent = player.accountType?.startsWith('dependent') || hasOrganization;
        return isDependent;
      });

      setDependentPlayers(dependentOnly);
      console.log(`📊 تم العثور على ${dependentOnly.length} لاعب تابع`);
      
    } catch (error) {
      console.error('❌ خطأ في جلب اللاعبين التابعين:', error);
      toast.error('فشل في جلب اللاعبين التابعين');
    } finally {
      setLoading(false);
    }
  };

  const processPlayerData = (id: string, data: any, source: 'players' | 'player'): DependentPlayer | null => {
    const fullName = data.full_name || data.name || 
                     `${data.firstName || ''} ${data.lastName || ''}`.trim();
    const email = data.email;
    const phone = data.phone;
    
    if (!fullName && !email && !phone) {
      return null; // تخطي اللاعبين بدون بيانات كافية
    }

    let organizationInfo = '';
    if (data.club_id) organizationInfo = 'تابع لنادي';
    else if (data.academy_id) organizationInfo = 'تابع لأكاديمية';
    else if (data.trainer_id) organizationInfo = 'تابع لمدرب';
    else if (data.agent_id) organizationInfo = 'تابع لوكيل';

    const hasEmailOrPhone = !!(email || phone);
    const canCreateAccount = !!(email && fullName); // نحتاج إيميل واسم على الأقل

    return {
      id,
      full_name: fullName,
      email,
      phone,
      club_id: data.club_id,
      academy_id: data.academy_id,
      trainer_id: data.trainer_id,
      agent_id: data.agent_id,
      accountType: data.accountType,
      organizationInfo,
      hasEmailOrPhone,
      canCreateAccount,
      source,
      ...data
    };
  };

  const convertPlayerToAccount = async (player: DependentPlayer) => {
    if (!player.canCreateAccount) {
      toast.error(`لا يمكن إنشاء حساب لـ ${player.full_name} - بيانات غير مكتملة`);
      return;
    }

    setConverting(prev => [...prev, player.id]);
    setErrors(prev => ({ ...prev, [player.id]: '' }));

    try {
      console.log('🔄 تحويل اللاعب:', player.full_name);

      // 1. التحقق من عدم وجود الحساب مسبقاً
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id')
        .eq('email', player.email);

      if (existingUsers && existingUsers.length > 0) {
        throw new Error('حساب بهذا الإيميل موجود مسبقاً');
      }

      // 2. إنشاء كلمة مرور مؤقتة
      const tempPassword = generateTempPassword();

      // 3. إنشاء حساب Supabase Auth
      console.log('📧 إنشاء حساب Supabase Auth...');
      const signUpResult = await supabase.auth.signUp({
        email: player.email!,
        password: tempPassword,
        options: { emailRedirectTo: undefined }
      });
      const newUserId = signUpResult.data.user?.id;

      if (!newUserId) {
        throw new Error(signUpResult.error?.message || 'فشل إنشاء الحساب');
      }

      // 4. إنشاء بيانات المستخدم في جدول users
      const now = new Date().toISOString();
      const userData = {
        id: newUserId,
        email: player.email,
        accountType: 'player',
        full_name: player.full_name,
        name: player.full_name,
        phone: player.phone || '',

        // الاحتفاظ بالانتماء للمنظمة
        club_id: player.club_id || null,
        academy_id: player.academy_id || null,
        trainer_id: player.trainer_id || null,
        agent_id: player.agent_id || null,

        // معلومات إضافية
        profile_image: player.profile_image || '',
        nationality: player.nationality || '',
        primary_position: player.primary_position || player.position || '',
        birth_date: player.birth_date || player.birthDate || null,
        country: player.country || '',
        city: player.city || '',

        // حالة الحساب
        isActive: true,
        verified: false,
        profileCompleted: true,
        isNewUser: false,

        // إعدادات خاصة
        tempPassword: tempPassword,
        needsPasswordChange: true,
        convertedFromDependent: true,
        originalSource: player.source,
        unifiedPassword: true,

        // تواريخ
        createdAt: now,
        updatedAt: now,
        convertedAt: now
      };

      console.log('💾 حفظ في جدول users...');
      await supabase.from('users').upsert({ ...userData });

      // 5. تحديث البيانات الأصلية للإشارة للتحويل
      console.log('🔄 تحديث البيانات الأصلية...');
      await supabase.from(player.source).update({
        convertedToAccount: true,
        supabaseUid: newUserId,
        convertedAt: now,
        tempPassword: tempPassword,
        unifiedPassword: true
      }).eq('id', player.id);

      console.log('✅ تم تحويل اللاعب بنجاح');
      setConverted(prev => [...prev, player.id]);
      toast.success(
        `تم إنشاء حساب لـ ${player.full_name}. الرقم السري الموحد: ${tempPassword}`
      );

    } catch (error: any) {
      console.error('❌ خطأ في تحويل اللاعب:', error);
      const errorMessage = error.message || 'خطأ غير محدد';
      setErrors(prev => ({ ...prev, [player.id]: errorMessage }));
      toast.error(`فشل تحويل ${player.full_name}: ${errorMessage}`);
    } finally {
      setConverting(prev => prev.filter(id => id !== player.id));
    }
  };

  // 🔐 الرقم السري الموحد للاعبين التابعين المحولين
  const UNIFIED_PLAYER_PASSWORD = 'Player123!@#';
  
  const generateTempPassword = (): string => {
    // استخدام الرقم السري الموحد
    return UNIFIED_PLAYER_PASSWORD;
  };

  const getPlayerBadgeColor = (player: DependentPlayer) => {
    if (converted.includes(player.id)) return 'bg-green-100 text-green-800';
    if (!player.canCreateAccount) return 'bg-red-100 text-red-800';
    if (player.hasEmailOrPhone) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getPlayerBadgeText = (player: DependentPlayer) => {
    if (converted.includes(player.id)) return '✅ تم التحويل';
    if (!player.canCreateAccount) return '❌ غير قابل للتحويل';
    if (player.hasEmailOrPhone) return '✅ قابل للتحويل';
    return '⚠️ بيانات ناقصة';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري جلب اللاعبين التابعين...</p>
        </div>
      </div>
    );
  }

  const convertiblePlayers = dependentPlayers.filter(p => p.canCreateAccount);
  const unconvertiblePlayers = dependentPlayers.filter(p => !p.canCreateAccount);

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔄 تحويل اللاعبين التابعين إلى حسابات
          </h1>
          <p className="text-gray-600 mb-4">
            تحويل اللاعبين التابعين إلى حسابات قابلة لتسجيل الدخول واستقبال الإشعارات
          </p>
          
          {/* عرض الرقم السري الموحد */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">🔐 الرقم السري الموحد للاعبين</h3>
            </div>
            <div className="bg-white border-2 border-dashed border-blue-300 rounded-lg p-3">
              <div className="text-center">
                <span className="text-2xl font-mono font-bold text-blue-700 bg-blue-100 px-4 py-2 rounded-lg">
                  {UNIFIED_PLAYER_PASSWORD}
                </span>
              </div>
              <p className="text-sm text-blue-600 mt-2 text-center">
                جميع اللاعبين المحولين سيستخدمون هذا الرقم السري الموحد
              </p>
            </div>
          </div>
        </div>

        {/* إحصائيات */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-gray-600">إجمالي التابعين</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{dependentPlayers.length}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600">قابل للتحويل</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{convertiblePlayers.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-gray-600">غير قابل للتحويل</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{unconvertiblePlayers.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-500" />
                <span className="text-sm text-gray-600">تم التحويل</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">{converted.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* اللاعبين القابلين للتحويل */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              اللاعبين القابلين للتحويل ({convertiblePlayers.length})
            </CardTitle>
            <CardDescription>
              هؤلاء اللاعبين لديهم إيميل واسم ويمكن إنشاء حسابات لهم
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {convertiblePlayers.map(player => (
                <div key={player.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{player.full_name}</h3>
                      <Badge className={getPlayerBadgeColor(player)}>
                        {getPlayerBadgeText(player)}
                      </Badge>
                      <Badge variant="outline">
                        {player.organizationInfo}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-4 text-sm text-gray-600">
                      {player.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {player.email}
                        </div>
                      )}
                      {player.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {player.phone}
                        </div>
                      )}
                      <Badge variant="secondary">
                        {player.source}
                      </Badge>
                    </div>

                    {errors[player.id] && (
                      <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                        ❌ {errors[player.id]}
                      </div>
                    )}
                  </div>

                  <div className="mr-4">
                    <Button
                      onClick={() => convertPlayerToAccount(player)}
                      disabled={converting.includes(player.id) || converted.includes(player.id)}
                      className="flex items-center gap-2"
                    >
                      {converting.includes(player.id) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          جاري التحويل...
                        </>
                      ) : converted.includes(player.id) ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          تم التحويل
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          إنشاء حساب
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}

              {convertiblePlayers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  لا توجد لاعبين قابلين للتحويل حالياً
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* اللاعبين غير القابلين للتحويل */}
        {unconvertiblePlayers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                اللاعبين غير القابلين للتحويل ({unconvertiblePlayers.length})
              </CardTitle>
              <CardDescription>
                هؤلاء اللاعبين ينقصهم بيانات أساسية (إيميل أو اسم)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {unconvertiblePlayers.slice(0, 10).map(player => (
                  <div key={player.id} className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{player.full_name || 'اسم غير محدد'}</h3>
                        <Badge className="bg-red-100 text-red-800">
                          ❌ غير قابل للتحويل
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <p>الأسباب:</p>
                        <ul className="list-disc list-inside mr-4">
                          {!player.email && <li>لا يوجد إيميل</li>}
                          {!player.full_name && <li>لا يوجد اسم</li>}
                        </ul>
                      </div>
                    </div>

                    <div className="mr-4">
                      <Badge variant="secondary">
                        {player.source}
                      </Badge>
                    </div>
                  </div>
                ))}

                {unconvertiblePlayers.length > 10 && (
                  <div className="text-center text-gray-500">
                    ... و {unconvertiblePlayers.length - 10} لاعب آخر
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* تعليمات */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>📋 تعليمات التحويل</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li><strong>متطلبات التحويل:</strong> اللاعب يحتاج إيميل واسم كامل</li>
              <li><strong>الرقم السري الموحد:</strong> جميع اللاعبين سيستخدمون نفس الرقم السري <code className="bg-gray-100 px-2 py-1 rounded text-blue-600 font-mono">{UNIFIED_PLAYER_PASSWORD}</code></li>
              <li><strong>تسجيل الدخول:</strong> اللاعب يستطيع الدخول بالإيميل والرقم السري الموحد</li>
              <li><strong>تغيير كلمة المرور:</strong> سيُطلب من اللاعب تغيير كلمة المرور عند الدخول الأول</li>
              <li><strong>الإشعارات:</strong> سيتلقى اللاعب إشعارات مباشرة بعد التحويل</li>
              <li><strong>الانتماء:</strong> سيحتفظ اللاعب بانتمائه للمنظمة</li>
              <li><strong>سهولة الإدارة:</strong> نفس كلمة المرور لجميع اللاعبين المحولين لسهولة التوزيع</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
