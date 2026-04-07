import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tournament } from '@/app/dashboard/admin/tournaments/utils';
import { supabase } from '@/lib/supabase/config';
import { toast } from 'sonner';
import { Settings, Save, AlertCircle } from 'lucide-react';

interface SettingsManagerProps {
    tournament: Tournament;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ tournament }) => {
    const [formData, setFormData] = useState({
        name: tournament.name,
        isActive: tournament.isActive,
        country: tournament.country || (tournament as any).location_country || 'EG',
    });
    const [loading, setLoading] = useState(false);

    // Payment wallets state
    const [wallets, setWallets] = useState<any[]>([]);
    const [walletsLoading, setWalletsLoading] = useState(false);

    // Load payment settings for tournament country
    React.useEffect(() => {
        const loadPaymentSettings = async () => {
            if (!formData.country) return;

            setWalletsLoading(true);
            try {
                const { data } = await supabase
                    .from('payment_settings')
                    .select('*')
                    .eq('id', formData.country)
                    .single();

                if (!!data) {
                    setWallets(data.methods || []);
                } else {
                    setWallets([]);
                }
            } catch (error) {
                console.error('Error loading payment settings:', error);
            } finally {
                setWalletsLoading(false);
            }
        };

        loadPaymentSettings();
    }, [formData.country]);

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('يرجى إدخال اسم البطولة');
            return;
        }

        setLoading(true);
        try {
            await supabase
                .from('tournaments')
                .update({
                    name: formData.name,
                    isActive: formData.isActive,
                    country: formData.country,
                })
                .eq('id', tournament.id!);
            toast.success('تم حفظ إعدادات البطولة بنجاح');
        } catch (error) {
            console.error('Error updating tournament settings:', error);
            toast.error('حدث خطأ أثناء حفظ الإعدادات');
        } finally {
            setLoading(false);
        }
    };

    const handleAddWallet = () => {
        setWallets([...wallets, { id: '', name: '', enabled: true, accountNumber: '' }]);
    };

    const handleUpdateWallet = (index: number, field: string, value: any) => {
        const updated = [...wallets];
        updated[index] = { ...updated[index], [field]: value };
        setWallets(updated);
    };

    const handleRemoveWallet = (index: number) => {
        setWallets(wallets.filter((_, i) => i !== index));
    };

    const handleSaveWallets = async () => {
        setWalletsLoading(true);
        try {
            await supabase
                .from('payment_settings')
                .upsert({
                    id: formData.country,
                    country: formData.country,
                    methods: wallets.filter(w => w.id && w.name),
                    updatedAt: new Date().toISOString(),
                }, { onConflict: 'id' });
            toast.success('تم حفظ إعدادات المحافظ بنجاح');
        } catch (error) {
            console.error('Error saving wallets:', error);
            toast.error('حدث خطأ أثناء حفظ المحافظ');
        } finally {
            setWalletsLoading(false);
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

                        <div className="grid gap-2">
                            <Label htmlFor="country" className="text-base font-semibold">دولة البطولة</Label>
                            <select
                                id="country"
                                value={formData.country}
                                onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                                className="max-w-md px-3 py-2 border rounded-md"
                            >
                                <option value="EG">مصر</option>
                                <option value="SA">السعودية</option>
                                <option value="QA">قطر</option>
                                <option value="AE">الإمارات</option>
                                <option value="KW">الكويت</option>
                                <option value="BH">البحرين</option>
                                <option value="OM">عمان</option>
                            </select>
                            <p className="text-xs text-gray-500">ستحدد طرق الدفع المتاحة حسب الدولة</p>
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

            {/* Payment Wallets Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        💳 المحافظ الإلكترونية
                    </CardTitle>
                    <CardDescription>
                        إدارة طرق الدفع المتاحة للبطولة حسب الدولة: {formData.country === 'EG' ? 'مصر' : formData.country === 'SA' ? 'السعودية' : formData.country === 'QA' ? 'قطر' : formData.country}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {walletsLoading ? (
                        <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
                    ) : (
                        <>
                            {wallets.map((wallet, index) => (
                                <div key={index} className="p-4 border rounded-lg space-y-3 bg-gray-50">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-sm">معرف الطريقة (ID)</Label>
                                            <Input
                                                value={wallet.id}
                                                onChange={(e) => handleUpdateWallet(index, 'id', e.target.value)}
                                                placeholder="مثال: vodafone_cash"
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-sm">الاسم</Label>
                                            <Input
                                                value={wallet.name}
                                                onChange={(e) => handleUpdateWallet(index, 'name', e.target.value)}
                                                placeholder="مثال: فودافون كاش"
                                                className="mt-1"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm">رقم الحساب/المحفظة</Label>
                                        <Input
                                            value={wallet.accountNumber || ''}
                                            onChange={(e) => handleUpdateWallet(index, 'accountNumber', e.target.value)}
                                            placeholder="مثال: 01017799580"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={wallet.enabled !== false}
                                                onCheckedChange={(checked) => handleUpdateWallet(index, 'enabled', checked)}
                                            />
                                            <Label className="text-sm">{wallet.enabled !== false ? 'مفعّل' : 'معطّل'}</Label>
                                        </div>
                                        <Button
                                            onClick={() => handleRemoveWallet(index)}
                                            variant="destructive"
                                            size="sm"
                                        >
                                            حذف
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            <div className="flex gap-3 pt-2">
                                <Button
                                    onClick={handleAddWallet}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    إضافة محفظة جديدة
                                </Button>
                                <Button
                                    onClick={handleSaveWallets}
                                    disabled={walletsLoading}
                                    className="!bg-green-600 !hover:bg-green-700 text-white"
                                >
                                    {walletsLoading ? 'جاري الحفظ...' : 'حفظ المحافظ'}
                                </Button>
                            </div>
                        </>
                    )}
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
