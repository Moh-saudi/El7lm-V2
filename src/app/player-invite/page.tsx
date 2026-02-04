'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { createPlayerLoginAccount, PlayerLoginData } from '@/lib/utils/player-login-account';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Search, CheckCircle, AlertTriangle, Mail, Phone, User, Building } from 'lucide-react';
import { toast } from 'sonner';

interface PlayerResult extends PlayerLoginData {
  id: string;
  full_name: string;
  organizationInfo: string;
  source: 'players' | 'player';
  canCreateAccount: boolean;
}

export default function PlayerInvitePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  // البحث عن اللاعب
  const searchForPlayer = async () => {
    if (!searchQuery.trim()) {
      toast.error('يرجى إدخال اسم أو إيميل أو رقم هاتف للبحث');
      return;
    }

    setSearching(true);
    try {
      const results: PlayerResult[] = [];

      // البحث في مجموعة players
      const playersQuery1 = query(collection(db, 'players'), where('full_name', '>=', searchQuery));
      const playersQuery2 = query(collection(db, 'players'), where('email', '==', searchQuery));
      const playersQuery3 = query(collection(db, 'players'), where('phone', '==', searchQuery));

      const [snapshot1, snapshot2, snapshot3] = await Promise.all([
        getDocs(playersQuery1),
        getDocs(playersQuery2),
        getDocs(playersQuery3)
      ]);

      // البحث في مجموعة player
      const playerQuery1 = query(collection(db, 'player'), where('full_name', '>=', searchQuery));
      const playerQuery2 = query(collection(db, 'player'), where('email', '==', searchQuery));
      const playerQuery3 = query(collection(db, 'player'), where('phone', '==', searchQuery));

      const [snapshot4, snapshot5, snapshot6] = await Promise.all([
        getDocs(playerQuery1),
        getDocs(playerQuery2),
        getDocs(playerQuery3)
      ]);

      // جمع النتائج
      const allSnapshots = [
        { docs: snapshot1.docs, source: 'players' as const },
        { docs: snapshot2.docs, source: 'players' as const },
        { docs: snapshot3.docs, source: 'players' as const },
        { docs: snapshot4.docs, source: 'player' as const },
        { docs: snapshot5.docs, source: 'player' as const },
        { docs: snapshot6.docs, source: 'player' as const }
      ];

      const processedIds = new Set<string>();

      allSnapshots.forEach(({ docs, source }) => {
        docs.forEach(doc => {
          if (processedIds.has(doc.id)) return;
          processedIds.add(doc.id);

          const data = doc.data();

          // التحقق من أن اللاعب تابع لمنظمة
          const isDependent = !!(data.club_id || data.academy_id || data.trainer_id || data.agent_id);
          if (!isDependent) return;

          let organizationInfo = '';
          if (data.club_id) organizationInfo = 'تابع لنادي';
          else if (data.academy_id) organizationInfo = 'تابع لأكاديمية';
          else if (data.trainer_id) organizationInfo = 'تابع لمدرب';
          else if (data.agent_id) organizationInfo = 'تابع لوكيل';

          results.push({
            id: doc.id,
            full_name: data.full_name || data.name || '',
            email: data.email,
            phone: data.phone,
            club_id: data.club_id,
            academy_id: data.academy_id,
            trainer_id: data.trainer_id,
            agent_id: data.agent_id,
            organizationInfo,
            source,
            canCreateAccount: !!(data.email && (data.full_name || data.name))
          });
        });
      });

      setSearchResults(results);

      if (results.length === 0) {
        toast.error('لم يتم العثور على لاعبين تابعين بهذا الاسم أو الإيميل');
      } else {
        toast.success(`تم العثور على ${results.length} لاعب`);
      }

    } catch (error) {
      console.error('خطأ في البحث:', error);
      toast.error('حدث خطأ أثناء البحث');
    } finally {
      setSearching(false);
    }
  };

  // إنشاء حساب للاعب
  const createAccountForPlayer = async (player: PlayerResult) => {
    setCreating(player.id);

    try {
      const result = await createPlayerLoginAccount(player.id, player, player.source);

      if (result.success) {
        toast.success(`تم إنشاء حساب تسجيل الدخول بنجاح! 
        كلمة المرور: ${result.tempPassword}
        يمكنك الآن تسجيل الدخول بإيميلك وكلمة المرور هذه`);

        // إزالة اللاعب من النتائج بعد إنشاء الحساب
        setSearchResults(prev => prev.filter(p => p.id !== player.id));
      } else {
        toast.error(`فشل في إنشاء الحساب: ${result.message}`);
      }
    } catch (error) {
      console.error('خطأ في إنشاء الحساب:', error);
      toast.error('حدث خطأ في إنشاء حساب تسجيل الدخول');
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-4 rounded-full">
              <UserPlus className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🔐 إنشاء حساب تسجيل دخول
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            إذا كنت لاعباً تابعاً لنادي أو أكاديمية أو مدرب، يمكنك إنشاء حساب تسجيل دخول للوصول لملفك الشخصي والإشعارات
          </p>
        </div>

        {/* البحث */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              البحث عن ملفك الشخصي
            </CardTitle>
            <CardDescription>
              ابحث عن ملفك باستخدام اسمك الكامل أو إيميلك أو رقم هاتفك
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="search">الاسم / الإيميل / رقم الهاتف</Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="أدخل اسمك الكامل أو إيميلك أو رقم هاتفك"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchForPlayer()}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={searchForPlayer}
                  disabled={searching || !searchQuery.trim()}
                  className="px-8"
                >
                  {searching ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      جاري البحث...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      بحث
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* النتائج */}
        {searchResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>نتائج البحث ({searchResults.length})</CardTitle>
              <CardDescription>
                اللاعبين التابعين الذين تم العثور عليهم
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {searchResults.map((player) => (
                  <div key={player.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <User className="w-5 h-5 text-blue-600" />
                          <h3 className="text-lg font-semibold">{player.full_name}</h3>
                          <div className="flex items-center gap-1 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            <Building className="w-3 h-3" />
                            {player.organizationInfo}
                          </div>
                        </div>

                        <div className="flex gap-4 text-sm text-gray-600 mb-3">
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
                        </div>

                        {player.canCreateAccount ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">يمكن إنشاء حساب تسجيل دخول</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm">بيانات ناقصة (الإيميل والاسم مطلوبان)</span>
                          </div>
                        )}
                      </div>

                      <div className="mr-4">
                        <Button
                          onClick={() => createAccountForPlayer(player)}
                          disabled={!player.canCreateAccount || creating === player.id}
                          variant={player.canCreateAccount ? "default" : "secondary"}
                        >
                          {creating === player.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              جاري الإنشاء...
                            </>
                          ) : player.canCreateAccount ? (
                            <>
                              <UserPlus className="w-4 h-4 mr-2" />
                              إنشاء حساب
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              غير متاح
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* تعليمات */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>📋 كيفية استخدام الصفحة</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li><strong>ابحث عن ملفك:</strong> أدخل اسمك الكامل أو إيميلك أو رقم هاتفك</li>
              <li><strong>تأكد من البيانات:</strong> تأكد أن الملف الظاهر هو ملفك الشخصي</li>
              <li><strong>أنشئ حساب:</strong> اضغط على "إنشاء حساب" إذا كانت البيانات صحيحة</li>
              <li><strong>احفظ كلمة المرور:</strong> ستظهر لك كلمة مرور مؤقتة - احفظها</li>
              <li><strong>سجل دخول:</strong> يمكنك الآن تسجيل الدخول بإيميلك وكلمة المرور</li>
              <li><strong>غير كلمة المرور:</strong> ستُطلب منك تغيير كلمة المرور عند الدخول الأول</li>
            </ol>

            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={() => router.push('/auth/login')}
                className="px-8"
              >
                الذهاب لصفحة تسجيل الدخول
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
