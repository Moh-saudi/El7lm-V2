"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Target, Plus, Trash2, Trophy } from "lucide-react";
import { useState } from "react";

export function ObjectivesTab() {
    const { control, watch, setValue } = useFormContext();
    const objectives = watch("objectives") || [];
    const [newObjective, setNewObjective] = useState("");

    const SUGGESTED_OBJECTIVES = [
        "الاشتراك في بطولات دولية",
        "الاشتراك في بطولات محلية",
        "القيام بمعايشات دولية",
        "القيام بمعايشات محلية",
        "الانضمام لمعسكرات تدريبية",
        "تعلم اللغة الإنجليزية واللغات",
        "تعلم تحليل الأداء",
        "تعلم التحكيم وتقنية الـ VAR",
        "تحسين اللياقة البدنية",
        "الانضمام لنادي محترف",
        "الحصول على منحة رياضية",
        "تطوير الثقافة التكتيكية",
        "الالتزام بنظام غذائي رياضي"
    ];

    const addObjective = (val: string) => {
        const text = val.trim();
        if (!text) return;
        const current = watch("objectives") || [];
        if (!current.includes(text)) {
            setValue("objectives", [...current, text], { shouldDirty: true });
        }
    };

    const handleAddCustom = () => {
        addObjective(newObjective);
        setNewObjective("");
    };

    const removeObjective = (index: number) => {
        const current = watch("objectives") || [];
        const updated = current.filter((_: any, i: number) => i !== index);
        setValue("objectives", updated, { shouldDirty: true });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card>
                <CardHeader className="flex flex-row items-center gap-4 py-4">
                    <div className="p-2 bg-green-100 rounded-lg text-green-600">
                        <Target className="w-6 h-6" />
                    </div>
                    <div>
                        <CardTitle>أهداف اللاعب</CardTitle>
                        <CardDescription>اختر من الأهداف المقترحة أو أضف أهدافك الخاصة</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Suggested Objectives */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">أهداف مقترحة (اضغط للإضافة):</h4>
                        <div className="flex flex-wrap gap-2">
                            {SUGGESTED_OBJECTIVES.map((goal) => {
                                const isSelected = objectives.includes(goal);
                                return (
                                    <button
                                        key={goal}
                                        type="button"
                                        onClick={() => !isSelected && addObjective(goal)}
                                        disabled={isSelected}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border
                                            ${isSelected
                                                ? 'bg-green-100 text-green-700 border-green-200 cursor-default opacity-60'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-green-500 hover:text-green-600 hover:bg-green-50'
                                            }`}
                                    >
                                        {goal} {isSelected && "✓"}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="border-t border-gray-100 my-4" />

                    {/* Add Custom Objective */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">أهداف خاصة:</h4>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="اكتب هدفاً خاصاً..."
                                    value={newObjective}
                                    onChange={(e) => setNewObjective(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustom())}
                                    className="bg-white"
                                />
                            </div>
                            <Button type="button" onClick={handleAddCustom} className="bg-black text-white hover:bg-black/90">
                                <Plus className="w-4 h-4 ml-2" />
                                إضافة
                            </Button>
                        </div>
                    </div>

                    {/* Objectives List */}
                    <div className="space-y-3">
                        {objectives.length > 0 ? (
                            objectives.map((obj: string, index: number) => (
                                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border group transition-all hover:bg-white hover:shadow-sm hover:border-green-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <span className="font-medium text-gray-800">{obj}</span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeObjective(index)}
                                        className="text-red-400 hover:text-red-500 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                                <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <h3 className="text-gray-500 font-medium">لم يتم تحديد أهداف بعد</h3>
                                <p className="text-gray-400 text-sm">اختر من القائمة أعلاه أو أضف هدفاً خاصاً</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
