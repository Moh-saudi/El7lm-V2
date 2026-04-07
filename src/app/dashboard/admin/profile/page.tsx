'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Phone, Camera, Save, X, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { notifyProfileUpdate } from '@/lib/notifications/admin-notifications';


export default function AdminProfile() {
  const { user, userData, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    email: '',
    avatar: ''
  });

  // تحديث profileData عند تغيير userData (بعد refreshUserData)
  useEffect(() => {
    if (userData && !isEditing) {
      setProfileData(prev => ({
        name: userData.name || userData.full_name || userData.displayName || prev.name,
        phone: userData.phone || userData.phoneNumber || prev.phone,
        email: user?.email || userData.email || prev.email,
        avatar: userData.avatar || userData.profile_image || userData.photoURL || prev.avatar
      }));
    }
  }, [userData, user, isEditing]);

  // جلب البيانات من Supabase
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);

        // البحث في users table أولاً
        const { data: userDoc } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userDoc) {
          setProfileData({
            name: userDoc.name || userDoc.full_name || userDoc.displayName || '',
            phone: userDoc.phone || userDoc.phoneNumber || '',
            email: user.email || userDoc.email || '',
            avatar: userDoc.avatar || userDoc.profile_image || userDoc.photoURL || ''
          });
        } else {
          // البحث في employees table
          // أولاً: البحث مباشرة بـ UID كـ id
          const { data: employeeDoc } = await supabase
            .from('employees')
            .select('*')
            .eq('id', user.id)
            .single();

          if (employeeDoc) {
            setProfileData({
              name: employeeDoc.name || '',
              phone: employeeDoc.phone || '',
              email: user.email || employeeDoc.email || '',
              avatar: employeeDoc.avatar || ''
            });
          } else {
            // ثانياً: البحث بـ authUserId
            const { data: employeeRows } = await supabase
              .from('employees')
              .select('*')
              .eq('authUserId', user.id);

            if (employeeRows && employeeRows.length > 0) {
              const employeeData = employeeRows[0];
              setProfileData({
                name: employeeData.name || '',
                phone: employeeData.phone || '',
                email: user.email || employeeData.email || '',
                avatar: employeeData.avatar || ''
              });
            } else {
              setProfileData({
                name: '',
                phone: '',
                email: user.email || '',
                avatar: ''
              });
            }
          }
        }
      } catch (error) {
        console.error('خطأ في جلب البيانات:', error);
        toast.error('حدث خطأ أثناء جلب البيانات');
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [user]);

  // رفع الصورة
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً. الحد الأقصى: 5 ميجابايت');
      return;
    }

    try {
      setUploadingAvatar(true);
      toast.info('جاري رفع الصورة...');

      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const bucketName = 'assets';
      const filePath = `avatars/admin-avatars/${user.id}/${timestamp}.${fileExt}`;

      const { storageManager } = await import('@/lib/storage');

      const result = await storageManager.upload(
        bucketName,
        filePath,
        file,
        {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        }
      );

      if (!result?.publicUrl) {
        throw new Error('فشل في الحصول على رابط الصورة');
      }

      setProfileData(prev => ({ ...prev, avatar: result.publicUrl }));
      toast.success('تم رفع الصورة بنجاح');
    } catch (error: any) {
      console.error('خطأ في رفع الصورة:', error);
      toast.error(error?.message || 'حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // حفظ البيانات
  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();

    console.log('💾 بدء حفظ البيانات...', {
      uid: user?.id,
      name: profileData.name,
      phone: profileData.phone,
      avatar: profileData.avatar ? 'موجود' : 'غير موجود'
    });

    if (!user?.id) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    if (!profileData.name.trim()) {
      toast.error('الاسم مطلوب');
      return;
    }

    if (profileData.name.trim().length < 3) {
      toast.error('الاسم يجب أن يحتوي على 3 أحرف على الأقل');
      return;
    }

    if (profileData.phone && !/^\+?\d{8,15}$/.test(profileData.phone.trim())) {
      toast.error('رقم الهاتف غير صحيح');
      return;
    }

    try {
      setSaving(true);
      console.log('📤 جاري حفظ البيانات في Supabase...');

      const updateData = {
        name: profileData.name.trim(),
        phone: profileData.phone.trim() || null,
        avatar: profileData.avatar || null,
        updatedAt: new Date().toISOString()
      };

      // التحقق من وجود المستخدم في users table
      const { data: userDoc } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userDoc) {
        const finalUpdateData = {
          ...updateData,
          accountType: userDoc.accountType || 'admin'
        };

        console.log('📋 البيانات المراد حفظها في users:', finalUpdateData);
        await supabase.from('users').update(finalUpdateData).eq('id', user.id);
        console.log('✅ تم حفظ البيانات بنجاح في users table');

        if (userDoc.employeeId) {
          await supabase.from('employees').update(updateData).eq('id', userDoc.employeeId);
          console.log('✅ تم تحديث بيانات الموظف أيضاً');
        }
      } else {
        // البحث في employees table
        const { data: employeeDoc } = await supabase
          .from('employees')
          .select('*')
          .eq('id', user.id)
          .single();

        if (employeeDoc) {
          console.log('📋 البيانات المراد حفظها في employees:', updateData);
          await supabase.from('employees').update(updateData).eq('id', user.id);
          console.log('✅ تم حفظ البيانات بنجاح في employees table');
        } else {
          const { data: employeeRows } = await supabase
            .from('employees')
            .select('*')
            .eq('authUserId', user.id);

          if (employeeRows && employeeRows.length > 0) {
            const employeeRef = employeeRows[0];
            console.log('📋 البيانات المراد حفظها في employees:', updateData);
            await supabase.from('employees').update(updateData).eq('id', employeeRef.id);
            console.log('✅ تم حفظ البيانات بنجاح في employees table');
          } else {
            const newUserData = {
              id: user.id,
              email: user.email || '',
              accountType: 'admin',
              ...updateData,
              createdAt: new Date().toISOString()
            };
            console.log('📋 إنشاء record جديد في users:', newUserData);
            await supabase.from('users').upsert(newUserData);
            console.log('✅ تم إنشاء وحفظ البيانات في users table');
          }
        }
      }

      // إرسال إشعار للإدارة
      console.log('🔍 Checking notification conditions:', {
        hasEmployeeId: !!userData?.employeeId,
        hasRoleId: !!userData?.roleId,
        accountType: userData?.accountType
      });

      if (userData?.employeeId || userData?.roleId || userData?.accountType === 'admin') {
        const changes: string[] = [];

        if (updateData.name !== (userData?.name || userData?.displayName)) {
          changes.push(`الاسم (من "${userData?.name || userData?.displayName}" إلى "${updateData.name}")`);
        }
        if ((updateData.phone || '') !== (userData?.phone || '')) {
          changes.push('رقم الهاتف');
        }
        if (updateData.avatar && updateData.avatar !== userData?.avatar) {
          changes.push('الصورة الشخصية');
        }

        console.log('📝 Detected changes:', changes);

        if (changes.length > 0) {
          try {
            await notifyProfileUpdate(
              {
                id: userData?.employeeId || user.id,
                name: updateData.name,
                email: user.email || undefined
              },
              changes
            );
            console.log('📢 تم إرسال إشعار للإدارة بنجاح');
          } catch (notifError) {
            console.error('❌ فشل إرسال الإشعار:', notifError);
          }
        } else {
          console.log('⚠️ No changes detected for notification');
        }
      }

      setProfileData(prev => ({
        ...prev,
        name: updateData.name,
        phone: updateData.phone || '',
        avatar: updateData.avatar || ''
      }));

      await refreshUserData();
      console.log('✅ تم تحديث بيانات المستخدم في الذاكرة');

      setIsEditing(false);
      toast.success('تم حفظ البيانات بنجاح');
    } catch (error: any) {
      console.error('❌ خطأ في حفظ البيانات:', error);
      toast.error(error?.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  // إرسال رابط تغيير كلمة المرور
  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast.error('البريد الإلكتروني غير متوفر');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) throw error;
      toast.success('تم إرسال رابط تغيير كلمة المرور إلى بريدك الإلكتروني');
    } catch (error: any) {
      console.error('خطأ في إرسال رابط تغيير كلمة المرور:', error);
      toast.error(error?.message || 'حدث خطأ أثناء إرسال الرابط');
    }
  };

  // إلغاء التعديل
  const handleCancel = async () => {
    setIsEditing(false);
    if (user?.id) {
      try {
        const { data: userDoc } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userDoc) {
          setProfileData({
            name: userDoc.name || userDoc.full_name || userDoc.displayName || '',
            phone: userDoc.phone || userDoc.phoneNumber || '',
            email: user.email || userDoc.email || '',
            avatar: userDoc.avatar || userDoc.profile_image || userDoc.photoURL || ''
          });
        } else {
          const { data: employeeRows } = await supabase
            .from('employees')
            .select('*')
            .eq('authUserId', user.id);

          if (employeeRows && employeeRows.length > 0) {
            const employeeData = employeeRows[0];
            setProfileData({
              name: employeeData.name || '',
              phone: employeeData.phone || '',
              email: user.email || employeeData.email || '',
              avatar: employeeData.avatar || ''
            });
          }
        }
      } catch (error) {
        console.error('خطأ في إعادة تحميل البيانات:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full border-4 border-blue-200 animate-spin border-t-blue-600"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">الملف الشخصي</CardTitle>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                className="flex gap-2 items-center text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-md hover:from-blue-700 hover:to-blue-800"
              >
                <Edit className="w-4 h-4" />
                تعديل البيانات
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* صورة الملف الشخصي */}
          <div className="flex flex-col gap-4 items-center">
            <div className="relative">
              <Avatar className="w-32 h-32">
                <AvatarImage src={profileData.avatar} alt="صورة الملف الشخصي" />
                <AvatarFallback>
                  <User className="w-16 h-16 text-gray-400" />
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <label
                  className="absolute right-0 bottom-0 p-2 text-white bg-blue-600 rounded-full border-2 border-white shadow-lg cursor-pointer hover:bg-blue-700"
                  title="تغيير الصورة"
                >
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    aria-label="رفع صورة الملف الشخصي"
                  />
                </label>
              )}
            </div>
            {uploadingAvatar && (
              <p className="text-sm text-blue-600">جاري رفع الصورة...</p>
            )}
          </div>

          {/* الاسم */}
          <div>
            <Label htmlFor="name">الاسم الكامل</Label>
            <Input
              id="name"
              value={profileData.name}
              onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
              disabled={!isEditing}
              placeholder="أدخل الاسم الكامل"
              className="mt-1"
            />
          </div>

          {/* البريد الإلكتروني */}
          <div>
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              value={profileData.email}
              disabled
              className="mt-1 bg-gray-50"
            />
            <p className="mt-1 text-xs text-gray-500">لا يمكن تغيير البريد الإلكتروني</p>
          </div>

          {/* رقم الهاتف */}
          <div>
            <Label htmlFor="phone">رقم الهاتف</Label>
            <Input
              id="phone"
              value={profileData.phone}
              onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
              disabled={!isEditing}
              placeholder="+974 1234 5678"
              className="mt-1"
            />
            <p className="mt-1 text-xs text-gray-500">يمكنك إضافة رمز الدولة (+974)</p>
          </div>

          {/* أزرار الإجراءات */}
          {isEditing && (
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={(e) => handleSave(e)}
                disabled={saving}
                className="flex flex-1 gap-2 justify-center items-center text-white bg-gradient-to-r from-green-600 to-green-700 shadow-md hover:from-green-700 hover:to-green-800 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </Button>
              <Button
                type="button"
                onClick={handleCancel}
                variant="outline"
                disabled={saving}
                className="flex gap-2 justify-center items-center text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                إلغاء
              </Button>
            </div>
          )}

          {/* تغيير كلمة المرور */}
          <div className="pt-6 border-t">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">أمان الحساب</h3>
                <p className="text-sm text-gray-500">إرسال رابط آمن لتغيير كلمة المرور</p>
              </div>
              <Button
                onClick={handlePasswordReset}
                variant="outline"
                className="flex gap-2 items-center text-orange-600 border-orange-300 hover:bg-orange-50 hover:border-orange-400"
              >
                <Mail className="w-4 h-4" />
                إرسال رابط تغيير كلمة المرور
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
