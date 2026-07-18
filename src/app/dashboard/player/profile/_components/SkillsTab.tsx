"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Zap, Star, Sword, Shield, Activity, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

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
                    <FormItem className="min-w-0 space-y-2 rounded-xl border border-gray-100 bg-white/80 p-3 shadow-[0_1px_8px_rgba(15,23,42,0.04)]">
                        <div className="flex min-w-0 items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                                <div className="shrink-0 rounded-md bg-gray-100 p-1.5 text-gray-600">
                                    <Icon className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <FormLabel className="block truncate text-sm font-semibold text-gray-700">{label}</FormLabel>
                                    {description && <p className="text-xs text-gray-400">{description}</p>}
                                </div>
                            </div>
                            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm transition-colors duration-300", getStatColor(value))}>
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
                                className={cn("py-1", "[&_.absolute]:" + getStatColor(value))}
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
    const { t } = useTranslation();
    const { control } = useFormContext();
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => {
                const value = Number(field.value) || 1;
                return (
                    <FormItem className="min-w-0 space-y-2 rounded-xl border border-gray-100 bg-white/80 p-3 shadow-[0_1px_8px_rgba(15,23,42,0.04)]">
                        <FormLabel className="block truncate text-sm font-semibold text-gray-700">{label}</FormLabel>
                        <FormControl>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => field.onChange(star)}
                                            className={cn("transition-all hover:scale-110 focus:outline-none", star <= value ? "text-yellow-400 fill-yellow-400" : "text-gray-200")}
                                        >
                                            <Star className={cn("h-4 w-4 sm:h-5 sm:w-5", star <= value ? "fill-current" : "")} />
                                        </button>
                                    ))}
                                </div>
                                <div className="text-xs font-medium text-gray-500">
                                    {value === 1 && t('profile.skillsTab.rating.veryPoor')}
                                    {value === 2 && t('profile.skillsTab.rating.poor')}
                                    {value === 3 && t('profile.skillsTab.rating.average')}
                                    {value === 4 && t('profile.skillsTab.rating.veryGood')}
                                    {value === 5 && t('profile.skillsTab.rating.worldClass')}
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
    const { t } = useTranslation();
    const { control } = useFormContext();

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {/* 1. Technical & Physical */}
                <Card className="flex h-full flex-col border-blue-100 shadow-sm md:col-span-2 lg:col-span-1">
                    <CardHeader className="flex flex-row items-center gap-3 bg-blue-50/50 pb-4">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Zap className="w-5 h-5" /></div>
                        <CardTitle className="text-lg text-blue-900">{t('profile.skillsTab.technicalPhysical')}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid flex-1 grid-cols-2 gap-3 p-4">
                        <StatSlider name="stats_pace" label={t('profile.skillsTab.pace')} icon={Activity} />
                        <StatSlider name="stats_shooting" label={t('profile.skillsTab.shooting')} icon={Target} />
                        <StatSlider name="stats_passing" label={t('profile.skillsTab.passing')} icon={Brain} />
                        <StatSlider name="stats_dribbling" label={t('profile.skillsTab.dribbling')} icon={Zap} />
                        <StatSlider name="stats_defending" label={t('profile.skillsTab.defending')} icon={Shield} />
                        <StatSlider name="stats_physical" label={t('profile.skillsTab.physical')} icon={Sword} />
                    </CardContent>
                </Card>

                {/* 2. Mental Attributes */}
                <Card className="flex h-full flex-col border-purple-100 shadow-sm">
                    <CardHeader className="flex flex-row items-center gap-3 bg-purple-50/50 pb-4">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><Brain className="w-5 h-5" /></div>
                        <CardTitle className="text-lg text-purple-900">{t('profile.skillsTab.mentalCapacity')}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid flex-1 grid-cols-2 gap-3 p-4">
                        <StatSlider name="mentality_vision" label={t('profile.skillsTab.vision')} icon={Brain} />
                        <StatSlider name="mentality_leadership" label={t('profile.skillsTab.leadership')} icon={Star} />
                        <StatSlider name="mentality_composure" label={t('profile.skillsTab.composure')} icon={Activity} />
                        <StatSlider name="mentality_teamwork" label={t('profile.skillsTab.teamwork')} icon={Brain} />
                        <StatSlider name="mentality_aggression" label={t('profile.skillsTab.aggression')} icon={Sword} />
                    </CardContent>
                </Card>

                {/* 3. Advanced Skills */}
                <Card className="flex h-full flex-col border-amber-100 shadow-sm md:col-span-2 lg:col-span-1">
                    <CardHeader className="flex flex-row items-center gap-3 bg-amber-50/50 pb-4">
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><Star className="w-5 h-5" /></div>
                        <CardTitle className="text-lg text-amber-900">{t('profile.skillsTab.advancedSkills')}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid flex-1 grid-cols-2 gap-3 p-4">
                        <StarRating name="skill_moves" label={t('profile.skillsTab.skillMoves')} />
                        <StarRating name="weak_foot" label={t('profile.skillsTab.weakFoot')} />
                        <FormField
                            control={control}
                            name="work_rate_attack"
                            render={({ field }) => (
                                <FormItem className="min-w-0 space-y-2 rounded-xl border border-gray-100 bg-white/80 p-3 shadow-[0_1px_8px_rgba(15,23,42,0.04)]">
                                    <FormLabel className="block truncate text-sm font-semibold text-gray-700">{t('profile.skillsTab.attackWorkRate')}</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || "Medium"}>
                                        <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder={t('profile.skillsTab.select')} /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Low">{t('profile.skillsTab.low')}</SelectItem>
                                            <SelectItem value="Medium">{t('profile.skillsTab.medium')}</SelectItem>
                                            <SelectItem value="High">{t('profile.skillsTab.high')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name="work_rate_defense"
                            render={({ field }) => (
                                <FormItem className="min-w-0 space-y-2 rounded-xl border border-gray-100 bg-white/80 p-3 shadow-[0_1px_8px_rgba(15,23,42,0.04)]">
                                    <FormLabel className="block truncate text-sm font-semibold text-gray-700">{t('profile.skillsTab.defenseWorkRate')}</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || "Medium"}>
                                        <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder={t('profile.skillsTab.select')} /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Low">{t('profile.skillsTab.low')}</SelectItem>
                                            <SelectItem value="Medium">{t('profile.skillsTab.medium')}</SelectItem>
                                            <SelectItem value="High">{t('profile.skillsTab.high')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}
