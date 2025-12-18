
'use client';

import { useState, useEffect } from 'react';
import { PricingService } from '@/lib/pricing/pricing-service';
import { SubscriptionPlan, CountryOverride } from '@/types/pricing';
import { COUNTRIES } from '@/constants/countries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, Globe, Plus, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

export default function PricingPage() {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
    const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

    // Override Form State
    const [newOverrideCountry, setNewOverrideCountry] = useState('');
    const [newOverridePrice, setNewOverridePrice] = useState('');
    const [newOverrideOriginalPrice, setNewOverrideOriginalPrice] = useState('');

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        setLoading(true);
        const data = await PricingService.getAllPlans();
        setPlans(data);
        setLoading(false);
    };

    const handleBasePriceChange = (planId: string, field: 'base_price' | 'base_original_price', value: string) => {
        setPlans(currentPlans =>
            currentPlans.map(plan =>
                plan.id === planId ? { ...plan, [field]: Number(value) } : plan
            )
        );
    };

    const savePlan = async (plan: SubscriptionPlan) => {
        try {
            toast.loading('جاري حفظ التغييرات...');
            await PricingService.updatePlan(plan);
            toast.dismiss();
            toast.success('تم تحديث الخطة بنجاح');
            loadPlans(); // Refresh to ensure sync
        } catch (error) {
            toast.dismiss();
            toast.error('حدث خطأ أثناء الحفظ');
            console.error(error);
        }
    };

    const openOverrideModal = (plan: SubscriptionPlan) => {
        setEditingPlan(plan);
        setNewOverrideCountry('');
        setNewOverridePrice('');
        setNewOverrideOriginalPrice('');
        setIsOverrideModalOpen(true);
    };

    const addOverride = async () => {
        if (!editingPlan || !newOverrideCountry || !newOverridePrice || !newOverrideOriginalPrice) {
            toast.error('يرجى ملء جميع الحقول');
            return;
        }

        const country = COUNTRIES.find(c => c.code === newOverrideCountry);
        if (!country) return;

        const newOverride: CountryOverride = {
            currency: country.currency,
            price: Number(newOverridePrice),
            original_price: Number(newOverrideOriginalPrice),
            active: true
        };

        const updatedPlan = {
            ...editingPlan,
            overrides: {
                ...editingPlan.overrides,
                [newOverrideCountry]: newOverride
            }
        };

        await savePlan(updatedPlan);
        setEditingPlan(updatedPlan); // Update local state for modal

        // Reset form
        setNewOverrideCountry('');
        setNewOverridePrice('');
        setNewOverrideOriginalPrice('');
    };

    const removeOverride = async (countryCode: string) => {
        if (!editingPlan) return;

        const updatedOverrides = { ...editingPlan.overrides };
        delete updatedOverrides[countryCode];

        const updatedPlan = {
            ...editingPlan,
            overrides: updatedOverrides
        };

        await savePlan(updatedPlan);
        setEditingPlan(updatedPlan);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6" dir="rtl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">إدارة أسعار الاشتراكات</h1>
                    <p className="text-muted-foreground">تحديد الأسعار الأساسية والاستثناءات لكل دولة</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>الباقات الحالية</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-right">الباقة</TableHead>
                                <TableHead className="text-right">السعر الأساسي (USD)</TableHead>
                                <TableHead className="text-right">السعر الأصلي (USD)</TableHead>
                                <TableHead className="text-right">الاستثناءات</TableHead>
                                <TableHead className="text-right">إجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {plans.map((plan) => (
                                <TableRow key={plan.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{plan.icon}</span>
                                            <div>
                                                <div className="font-bold">{plan.title}</div>
                                                <div className="text-xs text-muted-foreground">{plan.period}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <span className="text-muted-foreground">$</span>
                                            <Input
                                                type="number"
                                                value={plan.base_price}
                                                onChange={(e) => handleBasePriceChange(plan.id, 'base_price', e.target.value)}
                                                className="w-20 h-8"
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <span className="text-muted-foreground">$</span>
                                            <Input
                                                type="number"
                                                value={plan.base_original_price}
                                                onChange={(e) => handleBasePriceChange(plan.id, 'base_original_price', e.target.value)}
                                                className="w-20 h-8 text-muted-foreground line-through"
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {plan.overrides && Object.keys(plan.overrides).map(code => (
                                                <Badge key={code} variant="secondary" className="text-xs">
                                                    {code}
                                                </Badge>
                                            ))}
                                            {(!plan.overrides || Object.keys(plan.overrides).length === 0) && (
                                                <span className="text-xs text-muted-foreground">لا يوجد</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openOverrideModal(plan)}
                                            >
                                                <Globe className="w-4 h-4 ml-2" />
                                                إدارة الدول
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => savePlan(plan)}
                                            >
                                                <Save className="w-4 h-4 ml-2" />
                                                حفظ
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Overrides Modal */}
            <Dialog open={isOverrideModalOpen} onOpenChange={setIsOverrideModalOpen}>
                <DialogContent className="max-w-2xl" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>إدارة الأسعار حسب الدولة - {editingPlan?.title}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Add New Override */}
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-4">
                            <h4 className="font-semibold text-sm">إضافة دولة جديدة</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-xs font-medium">الدولة</label>
                                    <Select value={newOverrideCountry} onValueChange={setNewOverrideCountry}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="اختر الدولة" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {COUNTRIES.map(country => (
                                                <SelectItem key={country.code} value={country.code}>
                                                    {country.name} ({country.currency})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium">السعر (Offer)</label>
                                    <Input
                                        type="number"
                                        placeholder="200"
                                        value={newOverridePrice}
                                        onChange={(e) => setNewOverridePrice(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium">السعر الأصلي</label>
                                    <Input
                                        type="number"
                                        placeholder="300"
                                        value={newOverrideOriginalPrice}
                                        onChange={(e) => setNewOverrideOriginalPrice(e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button onClick={addOverride} className="w-full">
                                <Plus className="w-4 h-4 ml-2" />
                                إضافة
                            </Button>
                        </div>

                        {/* List Existing Overrides */}
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm">الاستثناءات الحالية</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right">الدولة</TableHead>
                                        <TableHead className="text-right">العملة</TableHead>
                                        <TableHead className="text-right">السعر</TableHead>
                                        <TableHead className="text-right">السعر الأصلي</TableHead>
                                        <TableHead className="text-right"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {editingPlan?.overrides && Object.entries(editingPlan.overrides).map(([code, override]) => {
                                        const countryName = COUNTRIES.find(c => c.code === code)?.name || code;
                                        return (
                                            <TableRow key={code}>
                                                <TableCell className="font-medium flex items-center gap-2">
                                                    <Globe className="w-3 h-3 text-muted-foreground" />
                                                    {countryName}
                                                </TableCell>
                                                <TableCell>{override.currency}</TableCell>
                                                <TableCell className="font-bold text-green-600">{override.price}</TableCell>
                                                <TableCell className="text-muted-foreground line-through">{override.original_price}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => removeOverride(code)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {(!editingPlan?.overrides || Object.keys(editingPlan.overrides).length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                لا توجد استثناءات مضافة لهذه الباقة
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOverrideModalOpen(false)}>إغلاق</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
