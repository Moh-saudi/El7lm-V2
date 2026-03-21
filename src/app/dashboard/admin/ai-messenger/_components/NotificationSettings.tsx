'use client';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ChatAmanService, ChatAmanTemplate } from '@/lib/services/chataman-service';
import { toast } from 'sonner';
import { Bell, Eye, Save, CheckCircle2, Info } from 'lucide-react';

export const NotificationSettings: React.FC = () => {
  const [templates, setTemplates] = useState<ChatAmanTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [profileViewTemplate, setProfileViewTemplate] = useState<string>('');

  const selectedTemplate = templates.find(t => t.name === profileViewTemplate) || null;

  // Load templates and saved config on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [fetchedTemplates, configSnap] = await Promise.all([
          ChatAmanService.getTemplates(),
          getDoc(doc(db, 'system_configs', 'notification_templates')),
        ]);

        setTemplates(fetchedTemplates);

        if (configSnap.exists()) {
          const data = configSnap.data();
          if (data.profile_view?.templateName) {
            setProfileViewTemplate(data.profile_view.templateName);
          }
        }
      } catch (err) {
        console.error('Error loading notification settings:', err);
        toast.error('حدث خطأ أثناء تحميل الإعدادات');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSave = async () => {
    if (!profileViewTemplate) {
      toast.error('يرجى اختيار قالب أولاً');
      return;
    }

    setSaving(true);
    setSaved(false);
    try {
      await setDoc(
        doc(db, 'system_configs', 'notification_templates'),
        {
          profile_view: {
            templateName: profileViewTemplate,
            params: ['recipientName'],
          },
        },
        { merge: true },
      );

      setSaved(true);
      toast.success('تم حفظ إعدادات الإشعارات بنجاح');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving notification settings:', err);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto custom-scrollbar p-1" dir="rtl">
      <Card className="border-none shadow-xl bg-white rounded-2xl">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-emerald-500" />
            إعدادات قوالب الإشعارات
          </CardTitle>
          <CardDescription className="text-[10px] text-slate-400">
            تحديد قوالب ChatAman المستخدمة لإرسال إشعارات WhatsApp التلقائية
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 space-y-6">
          {/* Profile View Notification Section */}
          <div className="border border-slate-100 rounded-2xl p-4 space-y-4 bg-slate-50/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Eye className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800">إشعار مشاهدة الملف الشخصي</h3>
                <p className="text-[10px] text-slate-400">يُرسل عند مشاهدة شخص ما للملف الشخصي لأحد المستخدمين</p>
              </div>
            </div>

            {/* Template Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">اختر القالب المخصص</Label>
              {loading ? (
                <p className="text-[11px] text-slate-400 animate-pulse py-2">جاري تحميل القوالب...</p>
              ) : (
                <Select
                  value={profileViewTemplate || 'none'}
                  onValueChange={(val) => {
                    setProfileViewTemplate(val === 'none' ? '' : val);
                    setSaved(false);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs border-slate-200 bg-white">
                    <SelectValue placeholder="اختر قالباً..." />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="none" className="font-bold text-slate-500">-- لا يوجد قالب محدد --</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.name} value={t.name}>
                        <div className="flex items-center justify-between w-full gap-6">
                          <span>{t.name}</span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-normal px-1 py-0 h-4 ${
                              t.category?.toUpperCase() === 'MARKETING'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-sky-50 text-sky-700 border-sky-200'
                            }`}
                          >
                            {t.category === 'MARKETING' ? 'تسويقي' : t.category === 'UTILITY' ? 'خدمي' : t.category || 'عام'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Template Body Preview */}
            {selectedTemplate && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-600">معاينة نص القالب</Label>
                <div className="bg-gray-100 text-xs p-3 rounded-xl text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedTemplate.body || 'لا يوجد نص معاينة لهذا القالب'}
                </div>
              </div>
            )}

            {/* Variable note */}
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50 border border-blue-100">
              <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-[10px] text-blue-700 leading-relaxed">
                المتغير {'{{1}}'} = اسم صاحب الحساب (يُملأ تلقائياً)
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={saving || !profileViewTemplate}
              className="h-9 px-5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  حفظ الإعدادات
                </>
              )}
            </Button>

            {saved && (
              <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold animate-in fade-in slide-in-from-left-2">
                <CheckCircle2 className="w-4 h-4" />
                تم الحفظ بنجاح
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
