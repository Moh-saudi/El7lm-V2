"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Stethoscope, Activity, Heart, Ruler, Weight, AlertTriangle, Plus, Trash2, FileText, Pill, Trash } from "lucide-react";
import { cn } from "@/lib/utils";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function MedicalTab() {
    const { control, watch } = useFormContext();

    // Field Arrays for Lists
    const { fields: injuryFields, append: appendInjury, remove: removeInjury } = useFieldArray({
        control,
        name: "injuries",
    });

    const { fields: surgeryFields, append: appendSurgery, remove: removeSurgery } = useFieldArray({
        control,
        name: "surgeries_list",
    });

    const { fields: allergyFields, append: appendAllergy, remove: removeAllergy } = useFieldArray({
        control,
        name: "allergies_list",
    });

    const { fields: medFields, append: appendMed, remove: removeMed } = useFieldArray({
        control,
        name: "medications",
    });

    const height = watch("height");
    const weight = watch("weight");

    const calculateBMI = (h: number, w: number) => {
        if (!h || !w) return { value: 0, status: "-", color: "gray" };
        const bmi = w / ((h / 100) * (h / 100));
        let status = "";
        let color = "";
        if (bmi < 18.5) { status = "نحافة"; color = "text-blue-500"; }
        else if (bmi < 25) { status = "وزن مثالي"; color = "text-green-500"; }
        else if (bmi < 30) { status = "وزن زائد"; color = "text-orange-500"; }
        else { status = "سمنة"; color = "text-red-500"; }
        return { value: bmi.toFixed(1), status, color };
    };

    const bmi = calculateBMI(Number(height), Number(weight));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 1. Basic Measurements */}
            <Card className="border-red-50 shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 bg-red-50/50 pb-4">
                    <div className="p-2 bg-red-100 rounded-lg text-red-600">
                        <Activity className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg text-red-900">القياسات الحيوية</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
                    <FormField
                        control={control}
                        name="height"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>الطول (سم)</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input type="number" className="bg-white pl-10" {...field} />
                                        <Ruler className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="weight"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>الوزن (كجم)</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input type="number" className="bg-white pl-10" {...field} />
                                        <Weight className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="blood_type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>فصيلة الدم</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || ""}>
                                    <FormControl>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="اختر" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {BLOOD_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* BMI Display */}
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-sm text-gray-500 mb-1">مؤشر كتلة الجسم (BMI)</span>
                        <div className="flex items-end gap-2">
                            <span className="text-2xl font-bold text-gray-800">{bmi.value}</span>
                            <span className={cn("text-sm font-medium mb-1", bmi.color)}>{bmi.status}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 2. Injuries History */}
                <Card className="border-orange-50 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between bg-orange-50/50 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><AlertTriangle className="w-5 h-5" /></div>
                            <CardTitle className="text-lg text-orange-900">سجل الإصابات</CardTitle>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => appendInjury({ type: '', date: '', status: 'Recovered' })}><Plus className="w-4 h-4" /></Button>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4">
                        {injuryFields.map((field, index) => (
                            <div key={field.id} className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm space-y-3 relative group">
                                <Button type="button" variant="ghost" size="icon" className="absolute top-2 left-2 text-red-500 h-6 w-6" onClick={() => removeInjury(index)}><Trash className="w-3 h-3" /></Button>
                                <FormField control={control} name={`injuries.${index}.type`} render={({ field }) => <Input placeholder="نوع الإصابة" className="h-9" {...field} value={field.value || ""} />} />
                                <div className="grid grid-cols-2 gap-2">
                                    <FormField control={control} name={`injuries.${index}.date`} render={({ field }) => <Input type="date" className="h-9" {...field} value={field.value || ""} />} />
                                    <FormField control={control} name={`injuries.${index}.status`} render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value || "Recovered"}><FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent><SelectItem value="Recovered">تعافى</SelectItem><SelectItem value="Injured">مصاب حالياً</SelectItem></SelectContent></Select>
                                    )} />
                                </div>
                            </div>
                        ))}
                        {injuryFields.length === 0 && <p className="text-center text-sm text-gray-400">لا يوجد إصابات مسجلة</p>}
                    </CardContent>
                </Card>

                {/* 3. Chronic & Other Info */}
                <Card className="border-purple-50 shadow-sm">
                    <CardHeader className="flex flex-row items-center gap-3 bg-purple-50/50 pb-4">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><Stethoscope className="w-5 h-5" /></div>
                        <CardTitle className="text-lg text-purple-900">معلومات طبية أخرى</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                        <FormField
                            control={control}
                            name="chronic_diseases"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">أمراض مزمنة</FormLabel>
                                        <FormDescription>هل تعاني من أي أمراض مزمنة (سكري، ضغط، ربو...)؟</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value || false} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm flex items-center gap-2"><Pill className="w-4 h-4 text-purple-500" /> الأدوية الحالية</h4>
                                <Button type="button" variant="ghost" size="sm" onClick={() => appendMed({ name: '' })}><Plus className="w-3 h-3" /></Button>
                            </div>
                            {medFields.map((field, index) => (
                                <div key={field.id} className="flex gap-2">
                                    <FormField control={control} name={`medications.${index}.name`} render={({ field }) => <Input placeholder="اسم الدواء" className="h-9 bg-white" {...field} value={field.value || ""} />} />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeMed(index)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /> العمليات الجراحية</h4>
                                <Button type="button" variant="ghost" size="sm" onClick={() => appendSurgery({ name: '', date: '' })}><Plus className="w-3 h-3" /></Button>
                            </div>
                            {surgeryFields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-2 gap-2">
                                    <FormField control={control} name={`surgeries_list.${index}.name`} render={({ field }) => <Input placeholder="العملية" className="h-9 bg-white" {...field} value={field.value || ""} />} />
                                    <div className="flex gap-1">
                                        <FormField control={control} name={`surgeries_list.${index}.date`} render={({ field }) => <Input placeholder="التاريخ/السنة" className="h-9 bg-white" {...field} value={field.value || ""} />} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSurgery(index)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> الحساسية</h4>
                                <Button type="button" variant="ghost" size="sm" onClick={() => appendAllergy({ name: '' })}><Plus className="w-3 h-3" /></Button>
                            </div>
                            {allergyFields.map((field, index) => (
                                <div key={field.id} className="flex gap-2">
                                    <FormField control={control} name={`allergies_list.${index}.name`} render={({ field }) => <Input placeholder="مسبب الحساسية" className="h-9 bg-white" {...field} value={field.value || ""} />} />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeAllergy(index)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            ))}
                        </div>

                    </CardContent>
                </Card>
            </div>

            <Card className="border-gray-100 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">التاريخ الطبي العائلي / ملاحظات إضافية</CardTitle>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={control}
                        name="family_history"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Textarea placeholder="هل هناك أمراض وراثية في العائلة؟ أو أي ملاحظات طبية أخرى تود ذكرها..." className="min-h-[100px] resize-none" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

        </div >
    );
}
