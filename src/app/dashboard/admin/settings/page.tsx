'use client';

import ErrorDisplay from '@/components/admin/ErrorDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Bell, Database, RefreshCw, Save, Settings, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AdminSettingsPage() {
  const { handleError, handleSuccess } = useErrorHandler();
  const [settings, setSettings] = useState({
    siteName: 'El7lm - منصة كرة القدم',
    siteDescription: 'منصة شاملة لإدارة كرة القدم والرياضة',
    maintenanceMode: false,
    registrationEnabled: true,
    emailNotifications: true,
    smsNotifications: true,
    analyticsEnabled: true,
    debugMode: false
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings');
        const result = await response.json();

        if (result.success) {
          setSettings(prev => ({ ...prev, ...result.data }));
        } else {
          throw new Error(result.error || 'فشل في تحميل الإعدادات');
        }
      } catch (error) {
        const errorResult = handleError(error, {
          context: 'تحميل الإعدادات',
          showToast: false
        });
        setError(errorResult.message);
      } finally {
        setInitialLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('Settings saved:', result.data);
        handleSuccess('تم حفظ الإعدادات بنجاح', 'حفظ الإعدادات');
      } else {
        throw new Error(result.error || 'فشل في حفظ الإعدادات');
      }
    } catch (error) {
      handleError(error, {
        context: 'حفظ الإعدادات'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm('هل أنت متأكد من إعادة تعيين الإعدادات؟')) {
      setSettings({
        siteName: 'El7lm - منصة كرة القدم',
        siteDescription: 'منصة شاملة لإدارة كرة القدم والرياضة',
        maintenanceMode: false,
        registrationEnabled: true,
        emailNotifications: true,
        smsNotifications: true,
        analyticsEnabled: true,
        debugMode: false
      });
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الإعدادات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <ErrorDisplay
              error={error}
              title="خطأ في تحميل الإعدادات"
              onRetry={() => window.location.reload()}
              onDismiss={() => setError(null)}
              variant="destructive"
            />
          </div>
        )}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            إعدادات الإدارة
          </h1>
          <p className="text-gray-600">
            إدارة إعدادات الموقع والتطبيق
          </p>
        </div>

        <div className="grid gap-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                الإعدادات العامة
              </CardTitle>
              <CardDescription>
                إعدادات أساسية للموقع
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siteName">اسم الموقع</Label>
                  <Input
                    id="siteName"
                    value={settings.siteName}
                    onChange={(e) => setSettings(prev => ({ ...prev, siteName: e.target.value }))}
                    placeholder="اسم الموقع"
                  />
                </div>
                <div>
                  <Label htmlFor="siteDescription">وصف الموقع</Label>
                  <Input
                    id="siteDescription"
                    value={settings.siteDescription}
                    onChange={(e) => setSettings(prev => ({ ...prev, siteDescription: e.target.value }))}
                    placeholder="وصف الموقع"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                إعدادات النظام
              </CardTitle>
              <CardDescription>
                إعدادات النظام والأمان
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="maintenanceMode">وضع الصيانة</Label>
                  <p className="text-sm text-gray-500">إيقاف الموقع مؤقتاً للصيانة</p>
                </div>
                <Switch
                  id="maintenanceMode"
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, maintenanceMode: checked }))}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="registrationEnabled">تفعيل التسجيل</Label>
                  <p className="text-sm text-gray-500">السماح للمستخدمين الجدد بالتسجيل</p>
                </div>
                <Switch
                  id="registrationEnabled"
                  checked={settings.registrationEnabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, registrationEnabled: checked }))}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="debugMode">وضع التطوير</Label>
                  <p className="text-sm text-gray-500">عرض معلومات التطوير والأخطاء</p>
                </div>
                <Switch
                  id="debugMode"
                  checked={settings.debugMode}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, debugMode: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                إعدادات الإشعارات
              </CardTitle>
              <CardDescription>
                إدارة الإشعارات والتنبيهات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailNotifications">إشعارات البريد الإلكتروني</Label>
                  <p className="text-sm text-gray-500">إرسال الإشعارات عبر البريد الإلكتروني</p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailNotifications: checked }))}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="smsNotifications">إشعارات الرسائل النصية</Label>
                  <p className="text-sm text-gray-500">إرسال الإشعارات عبر الرسائل النصية</p>
                </div>
                <Switch
                  id="smsNotifications"
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, smsNotifications: checked }))}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="analyticsEnabled">تفعيل التحليلات</Label>
                  <p className="text-sm text-gray-500">جمع بيانات الاستخدام والتحليلات</p>
                </div>
                <Switch
                  id="analyticsEnabled"
                  checked={settings.analyticsEnabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, analyticsEnabled: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              إعادة تعيين
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
