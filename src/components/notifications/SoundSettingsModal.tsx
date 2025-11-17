'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Volume2, VolumeX, Music, Settings, Info } from 'lucide-react';
import { getSoundSettings, saveSoundSettings, playNotificationSound, enableSoundForMobile } from '@/lib/notifications/sound-notifications';
import toast from 'react-hot-toast';

interface SoundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SoundSettingsModal({ isOpen, onClose }: SoundSettingsModalProps) {
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [isTesting, setIsTesting] = useState(false);

  // تحميل الإعدادات عند فتح المودال
  useEffect(() => {
    if (isOpen) {
      const settings = getSoundSettings();
      setEnabled(settings.enabled);
      setVolume(settings.volume);
    }
  }, [isOpen]);

  // حفظ الإعدادات
  const handleSave = () => {
    saveSoundSettings({
      enabled,
      volume,
      soundType: 'default'
    });
    toast.success('تم حفظ الإعدادات بنجاح');
    onClose();
  };

  // اختبار الصوت
  const handleTestSound = async () => {
    setIsTesting(true);
    
    // تفعيل الصوت للموبايل إذا لزم الأمر
    await enableSoundForMobile();
    
    // تشغيل صوت الاختبار
    playNotificationSound('default');
    
    setTimeout(() => {
      setIsTesting(false);
    }, 500);
  };

  // تفعيل الصوت للموبايل
  const handleEnableMobileSound = async () => {
    try {
      await enableSoundForMobile();
      toast.success('تم تفعيل الصوت بنجاح');
      playNotificationSound('default');
    } catch (error) {
      toast.error('فشل في تفعيل الصوت');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            إعدادات التنبيهات الصوتية
          </DialogTitle>
          <DialogDescription>
            قم بتخصيص إعدادات التنبيهات الصوتية حسب تفضيلاتك
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* تفعيل/تعطيل الصوت */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تفعيل التنبيهات الصوتية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {enabled ? (
                    <Volume2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <Label htmlFor="sound-enabled" className="text-base font-medium">
                      تفعيل الصوت
                    </Label>
                    <p className="text-sm text-gray-500">
                      تشغيل صوت عند وصول إشعار جديد
                    </p>
                  </div>
                </div>
                <Switch
                  id="sound-enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* مستوى الصوت */}
          {enabled && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">مستوى الصوت</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="volume">مستوى الصوت</Label>
                    <span className="text-sm text-gray-500">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                  <Slider
                    id="volume"
                    min={0}
                    max={1}
                    step={0.1}
                    value={[volume]}
                    onValueChange={(value) => setVolume(value[0])}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <VolumeX className="w-4 h-4" />
                  <span>صامت</span>
                  <div className="flex-1" />
                  <Volume2 className="w-4 h-4" />
                  <span>عالٍ</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* اختبار الصوت */}
          {enabled && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Button
                    onClick={handleTestSound}
                    disabled={isTesting}
                    className="w-full"
                    variant="outline"
                  >
                    <Music className="w-4 h-4 ml-2" />
                    {isTesting ? 'جاري التشغيل...' : 'اختبار الصوت'}
                  </Button>
                  <Button
                    onClick={handleEnableMobileSound}
                    className="w-full"
                    variant="outline"
                  >
                    <Volume2 className="w-4 h-4 ml-2" />
                    تفعيل الصوت للموبايل
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* معلومات */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="space-y-1 text-sm text-blue-800">
                  <p className="font-medium">ملاحظة:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>التنبيهات الصوتية تعمل على الكمبيوتر والموبايل</li>
                    <li>على الموبايل، قد تحتاج إلى تفعيل الصوت أولاً</li>
                    <li>الصوت لا يعمل عندما تكون الصفحة غير نشطة</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* الأزرار */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleSave}>
            حفظ الإعدادات
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

