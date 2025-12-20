import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tournament } from '@/app/dashboard/admin/tournaments/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toast } from 'sonner';
import { Settings, Save, AlertCircle } from 'lucide-react';

interface SettingsManagerProps {
    tournament: Tournament;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ tournament }) => {
    const [formData, setFormData] = useState({
        name: tournament.name,
        isActive: tournament.isActive,
    });
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('يرجى إدخال اسم البطولة');
            return;
        }

        setLoading(true);
        try {
            const docRef = doc(db, 'tournaments', tournament.id!);
            await updateDoc(docRef, {
                name: formData.name,
                isActive: formData.isActive
            });
            toast.success('تم حفظ إعدادات البطولة بنجاح');
        } catch (error) {
            console.error('Error updating tournament settings:', error);
            toast.error('حدث خطأ أثناء حفظ الإعدادات');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Settings className="h-5 w-5 text-gray-500" />
                        إعدادات البطولة العامة
                    </CardTitle>
                    <CardDescription>
                        تعديل البيانات الأساسية وإعدادات الظهور للبطولة
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-base font-semibold">اسم البطولة</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="مثال: كأس العرب"
                                className="max-w-md"
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                            <div className="space-y-0.5">
                                <Label className="text-base font-semibold">حالة البطولة</Label>
                                <p className="text-sm text-gray-500">
                                    تفعيل أو تعطيل ظهور البطولة للجمهور والمشاركين
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${formData.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                                    {formData.isActive ? 'نشطة' : 'غير نشطة'}
                                </span>
                                <Switch
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button
                            onClick={handleSave}
                            disabled={loading}
                            className="!bg-yellow-600 !hover:bg-yellow-700 text-white min-w-[140px]"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                    جاري الحفظ...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Save className="h-4 w-4" />
                                    حفظ التغييرات
                                </span>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">ملاحظة مهمة</p>
                    <p>تعطيل البطولة سيخفيها عن جميع المستخدمين ولكنه لن يحذف البيانات المسجلة فيها (الفرق، المباريات، النتائج).</p>
                </div>
            </div>
        </div>
    );
};
