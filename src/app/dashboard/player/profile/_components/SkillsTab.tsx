"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Zap, Star, Sword, Shield, Activity, Target } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper to get color based on stat value
const getStatColor = (value: number) => {
    if (value < 50) return "bg-red-500";
    if (value < 70) return "bg-yellow-500";
    if (value < 85) return "bg-green-500";
    return "bg-emerald-600";
};

const StatSlider = ({ name, label, icon: Icon, description }: { name: string, label: string, icon: any, description?: string }) => {
    const { control } = useFormContext();

    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => {
                const value = Number(field.value) || 50;
                return (
                    <FormItem className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-gray-100 rounded-md text-gray-600">
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div>
                                    <FormLabel className="text-base font-semibold text-gray-700">{label}</FormLabel>
                                    {description && <p className="text-xs text-gray-400">{description}</p>}
                                </div>
                            </div>
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm transition-colors duration-300", getStatColor(value))}>
                                {value}
                            </div>
                        </div>
                        <FormControl>
                            <Slider
                                value={[value]}
                                min={0}
                                max={99}
                                step={1}
                                onValueChange={(vals) => field.onChange(vals[0])}
                                className={cn("py-2", "[&_.absolute]:" + getStatColor(value))}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                );
            }}
        />
    );
};

const StarRating = ({ name, label }: { name: string, label: string }) => {
    const { control } = useFormContext();
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => {
                const value = Number(field.value) || 1;
                return (
                    <FormItem className="space-y-3">
                        <FormLabel>{label}</FormLabel>
                        <FormControl>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => field.onChange(star)}
                                            className={cn("transition-all hover:scale-110 focus:outline-none", star <= value ? "text-yellow-400 fill-yellow-400" : "text-gray-200")}
                                        >
                                            <Star className={cn("w-8 h-8", star <= value ? "fill-current" : "")} />
                                        </button>
                                    ))}
                                </div>
                                <div className="text-sm text-gray-500 font-medium">
                                    {value === 1 && "ضعيف جدًا"}
                                    {value === 2 && "ضعيف"}
                                    {value === 3 && "متوسط"}
                                    {value === 4 && "جيد جدًا"}
                                    {value === 5 && "عالمي"}
                                </div>
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                );
            }}
        />
    );
};

export function SkillsTab() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 1. Technical & Physical */}
                <Card className="border-blue-100 shadow-sm md:col-span-2">
                    <CardHeader className="flex flex-row items-center gap-3 bg-blue-50/50 pb-4">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Zap className="w-5 h-5" /></div>
                        <CardTitle className="text-lg text-blue-900">القدرات الفنية والبدنية</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 p-6">
                        <StatSlider name="stats_pace" label="السرعة (Pace)" icon={Activity} />
                        <StatSlider name="stats_shooting" label="التسديد (Shooting)" icon={Target} />
                        <StatSlider name="stats_passing" label="التمرير (Passing)" icon={Brain} />
                        <StatSlider name="stats_dribbling" label="المراوغة (Dribbling)" icon={Zap} />
                        <StatSlider name="stats_defending" label="الدفاع (Defending)" icon={Shield} />
                        <StatSlider name="stats_physical" label="البدنية (Physical)" icon={Sword} />
                    </CardContent>
                </Card>

                {/* 2. Mental Attributes */}
                <Card className="border-purple-100 shadow-sm">
                    <CardHeader className="flex flex-row items-center gap-3 bg-purple-50/50 pb-4">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><Brain className="w-5 h-5" /></div>
                        <CardTitle className="text-lg text-purple-900">القدرات الذهنية</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                        <StatSlider name="mentality_vision" label="الرؤية (Vision)" icon={Brain} />
                        <StatSlider name="mentality_leadership" label="القيادة (Leadership)" icon={Star} />
                        <StatSlider name="mentality_composure" label="الهدوء (Composure)" icon={Activity} />
                        <StatSlider name="mentality_teamwork" label="العمل الجماعي" icon={Brain} />
                        <StatSlider name="mentality_aggression" label="الشراسة (Aggression)" icon={Sword} />
                    </CardContent>
                </Card>

                {/* 3. Advanced Skills */}
                <Card className="border-amber-100 shadow-sm">
                    <CardHeader className="flex flex-row items-center gap-3 bg-amber-50/50 pb-4">
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><Star className="w-5 h-5" /></div>
                        <CardTitle className="text-lg text-amber-900">مهارات متقدمة</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8 p-6">
                        <div className="grid grid-cols-2 gap-8">
                            <StarRating name="skill_moves" label="مهارات المراوغة (Skill Moves)" />
                            <StarRating name="weak_foot" label="القدم الضعيفة (Weak Foot)" />
                        </div>

                        <div className="h-px bg-gray-100" />

                        <div className="grid grid-cols-2 gap-8">
                            <FormField
                                control={useFormContext().control}
                                name="work_rate_attack"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>معدل الهجوم</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || "Medium"}>
                                            <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="اختر" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="Low">منخفض</SelectItem>
                                                <SelectItem value="Medium">متوسط</SelectItem>
                                                <SelectItem value="High">مرتفع</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={useFormContext().control}
                                name="work_rate_defense"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>معدل الدفاع</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || "Medium"}>
                                            <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="اختر" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="Low">منخفض</SelectItem>
                                                <SelectItem value="Medium">متوسط</SelectItem>
                                                <SelectItem value="High">مرتفع</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}
