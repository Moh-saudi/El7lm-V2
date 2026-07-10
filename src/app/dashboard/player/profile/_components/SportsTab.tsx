"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { Trophy, Dumbbell, Plus, Trash2, Calendar, Shirt, Briefcase, Activity, MapPin, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useTranslation } from "@/lib/i18n";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const POSITIONS = [
    { value: "GK", label: "حارس مرمى" },
    { value: "CB", label: "قلب دفاع" },
    { value: "LB", label: "ظهير أيسر" },
    { value: "RB", label: "ظهير أيمن" },
    { value: "CDM", label: "وسط دفاعي" },
    { value: "CM", label: "وسط مركزي" },
    { value: "CAM", label: "وسط هجومي" },
    { value: "LW", label: "جناح أيسر" },
    { value: "RW", label: "جناح أيمن" },
    { value: "SS", label: "مهاجم ثاني" },
    { value: "ST", label: "مهاجم صريح" },
];

const getTranslatedPositions = (t: any) => [
    { value: "GK", label: t("profile.sportsTab.positions.GK") },
    { value: "CB", label: t("profile.sportsTab.positions.CB") },
    { value: "LB", label: t("profile.sportsTab.positions.LB") },
    { value: "RB", label: t("profile.sportsTab.positions.RB") },
    { value: "CDM", label: t("profile.sportsTab.positions.CDM") },
    { value: "CM", label: t("profile.sportsTab.positions.CM") },
    { value: "CAM", label: t("profile.sportsTab.positions.CAM") },
    { value: "LW", label: t("profile.sportsTab.positions.LW") },
    { value: "RW", label: t("profile.sportsTab.positions.RW") },
    { value: "SS", label: t("profile.sportsTab.positions.SS") },
    { value: "ST", label: t("profile.sportsTab.positions.ST") },
];

const POS_COORDS: Record<string, { x: number; y: number }> = {
    GK: { x: 50, y: 88 },
    CB: { x: 50, y: 75 },
    LB: { x: 15, y: 75 },
    RB: { x: 85, y: 75 },
    CDM: { x: 50, y: 60 },
    CM: { x: 50, y: 50 },
    CAM: { x: 50, y: 35 },
    LW: { x: 15, y: 25 },
    RW: { x: 85, y: 25 },
    SS: { x: 50, y: 25 },
    ST: { x: 50, y: 12 },
};

const FootballPitch = ({ position, number, name }: { position: string, number: string, name: string }) => {
    const { t } = useTranslation();
    const coords = POS_COORDS[position] || { x: 50, y: 50 };
    const positionsList = getTranslatedPositions(t);
    return (
        <div className="relative w-full aspect-[2/3] bg-emerald-600 rounded-xl border-4 border-emerald-800 shadow-inner overflow-hidden select-none">
            {/* Grass Pattern */}
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(0deg,transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_10%]" />

            {/* Lines */}
            <div className="absolute inset-4 border-2 border-white/60 rounded-sm" />

            {/* Center Circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/60 rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-white/60 rounded-full" />
            </div>
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-white/60" />

            {/* Penalty Areas */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-3/5 h-1/6 border-2 border-t-0 border-white/60 bg-white/5" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/5 h-1/6 border-2 border-b-0 border-white/60 bg-white/5" />

            {/* Goals */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-4 border-x-2 border-b-2 border-white/60 bg-white/10" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-4 border-x-2 border-t-2 border-white/60 bg-white/10" />

            {/* Player Marker */}
            <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-700 ease-out z-10"
                style={{ top: `${coords.y}%`, left: `${coords.x}%` }}
            >
                <div className="relative group">
                    {/* Pulse Effect */}
                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                    {/* Dot/Shirt */}
                    <div className="relative w-12 h-12 bg-red-600 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white font-black text-lg">
                        {number || '?'}
                    </div>
                    {/* Tooltip */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        {positionsList.find(p => p.value === position)?.label || position}
                    </div>
                </div>
                <div className="mt-2 px-3 py-1 bg-black/60 text-white text-xs font-bold rounded-full backdrop-blur-md shadow-sm border border-white/10">
                    {name || t('common.player')}
                </div>
            </div>
        </div>
    )
}

export function SportsTab() {
    const { t } = useTranslation();
    const form = useFormContext();
    const { control, watch } = form;

    const position = watch("position");
    const jerseyNumber = watch("jersey_number");
    const contractStatus = watch("contract_status");
    const name = watch("name");

    // Stats Logic
    const pace = watch("stats_pace") || 50;
    const shooting = watch("stats_shooting") || 50;
    const passing = watch("stats_passing") || 50;
    const dribbling = watch("stats_dribbling") || 50;
    const defending = watch("stats_defending") || 50;
    const physical = watch("stats_physical") || 50;

    // Visibility Toggles
    const hasPrivateCoach = watch("has_private_coach");
    const hasJoinedAcademy = watch("has_joined_academy");

    const ovr = Math.round((Number(pace) + Number(shooting) + Number(passing) + Number(dribbling) + Number(defending) + Number(physical)) / 6);

    const statsData = [
        { subject: t('profile.sportsTab.stats.pace'), A: Number(pace), fullMark: 99 },
        { subject: t('profile.sportsTab.stats.shooting'), A: Number(shooting), fullMark: 99 },
        { subject: t('profile.sportsTab.stats.passing'), A: Number(passing), fullMark: 99 },
        { subject: t('profile.sportsTab.stats.dribbling'), A: Number(dribbling), fullMark: 99 },
        { subject: t('profile.sportsTab.stats.defending'), A: Number(defending), fullMark: 99 },
        { subject: t('profile.sportsTab.stats.physical'), A: Number(physical), fullMark: 99 },
    ];

    const positionsList = getTranslatedPositions(t);

    // Club History Repeater
    const { fields: clubFields, append: appendClub, remove: removeClub } = useFieldArray({
        control,
        name: "club_history",
    });

    // Private Coaches Repeater
    const { fields: coachFields, append: appendCoach, remove: removeCoach } = useFieldArray({
        control,
        name: "private_coaches",
    });

    // Academies Repeater
    const { fields: academyFields, append: appendAcademy, remove: removeAcademy } = useFieldArray({
        control,
        name: "academies",
    });

    // Achievements Repeater
    const { fields: achFields, append: appendAch, remove: removeAch } = useFieldArray({
        control,
        name: "achievements",
    });

    // Options Generation
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 30 }, (_, i) => (currentYear + 1 - i).toString());
    const seasons = years.map(y => `${parseInt(y) - 1}/${y}`);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

                {/* Left Column Data (Right in RTL) - Wider now */}
                <div className="md:col-span-9 space-y-8">
                    {/* 1. Contract Status */}


                    {/* 2. Physical & Technical Attributes */}
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4 py-4">
                            <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                                <Activity className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle>{t('profile.sportsTab.technicalPhysical')}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-6 p-6">
                            {/* Primary Position */}
                            <FormField
                                control={control}
                                name="position"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('profile.sportsTab.primaryPosition')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                            <FormControl>
                                                <SelectTrigger className="bg-blue-50/30 border-blue-200">
                                                    <SelectValue placeholder={t('profile.sportsTab.selectPosition')} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {positionsList.map((pos) => (
                                                    <SelectItem key={pos.value} value={pos.value}>{pos.label} ({pos.value})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Secondary Position */}
                            <FormField
                                control={control}
                                name="secondary_position"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('profile.sportsTab.secondaryPosition')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('profile.sportsTab.selectPosition')} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {positionsList.map((pos) => (
                                                    <SelectItem key={pos.value} value={pos.value}>{pos.label} ({pos.value})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Jersey Number */}
                            <FormField
                                control={control}
                                name="jersey_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('profile.sportsTab.jerseyNumber')}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type="number" className="pl-10" placeholder="10" {...field} value={field.value ?? ''} />
                                                <Shirt className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Foot */}
                            <FormField
                                control={control}
                                name="foot"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('profile.sportsTab.preferredFoot')}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('profile.sportsTab.selectFoot')} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="right">{t('profile.sportsTab.right')}</SelectItem>
                                                <SelectItem value="left">{t('profile.sportsTab.left')}</SelectItem>
                                                <SelectItem value="both">{t('profile.sportsTab.both')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Height & Weight */}
                            <div className="flex gap-4">
                                <FormField
                                    control={control}
                                    name="height"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>{t('profile.sportsTab.height')}</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name="weight"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>{t('profile.sportsTab.weight')}</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                        </CardContent>
                    </Card>

                    {/* 3. Training & Academies */}
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4 py-4">
                            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                <Dumbbell className="w-6 h-6" />
                            </div>
                            <CardTitle>{t('profile.sportsTab.trainingAcademies')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8 p-6">
                            {/* Private Coach Section */}
                            <div className="space-y-4">
                                <FormField
                                    control={control}
                                    name="has_private_coach"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-white">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">{t('profile.sportsTab.privateCoach')}</FormLabel>
                                                <FormDescription>{t('profile.sportsTab.privateCoachDesc')}</FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {hasPrivateCoach && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <FormLabel className="text-purple-800">{t('profile.sportsTab.privateCoachHistory')}</FormLabel>
                                                <Button type="button" size="sm" onClick={() => appendCoach({ name: '' })} variant="default" className="gap-2 h-8 bg-black text-white hover:bg-black/80">
                                                    <Plus className="w-3.5 h-3.5" /> {t('profile.sportsTab.addCoach')}
                                                </Button>
                                            </div>
                                            {coachFields.map((field, index) => (
                                                <div key={field.id} className="flex flex-col md:flex-row gap-3 md:items-end p-3 md:p-0 rounded-lg md:rounded-none bg-white/50 md:bg-transparent border md:border-0 border-purple-100">
                                                    <div className="flex-1 w-full">
                                                        <FormField control={control} name={`private_coaches.${index}.name`} render={({ field }) => (<FormItem><FormControl><Input placeholder={t('profile.sportsTab.coachName')} className="bg-white" {...field} /></FormControl></FormItem>)} />
                                                    </div>
                                                    <div className="flex gap-2 w-full md:w-auto">
                                                        <div className="flex-1 md:w-32">
                                                            <FormField control={control} name={`private_coaches.${index}.start_date`} render={({ field }) => (
                                                                <FormItem>
                                                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                                                        <FormControl><SelectTrigger className="bg-white h-9"><SelectValue placeholder={t('profile.sportsTab.fromYear')} /></SelectTrigger></FormControl>
                                                                        <SelectContent position="popper" className="h-60">
                                                                            {years.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </FormItem>
                                                            )} />
                                                        </div>
                                                        <div className="flex-1 md:w-32">
                                                            <FormField control={control} name={`private_coaches.${index}.end_date`} render={({ field }) => (
                                                                <FormItem>
                                                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                                                        <FormControl><SelectTrigger className="bg-white h-9"><SelectValue placeholder={t('profile.sportsTab.toYear')} /></SelectTrigger></FormControl>
                                                                        <SelectContent position="popper" className="h-60">
                                                                            {years.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </FormItem>
                                                            )} />
                                                        </div>
                                                    </div>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeCoach(index)} className="text-red-500 hover:bg-red-50 hover:text-red-600 mb-0.5 self-end md:self-auto"><Trash2 className="w-4 h-4" /></Button>
                                                </div>
                                            ))}
                                            {coachFields.length === 0 && <p className="text-sm text-gray-400 text-center py-2">{t('profile.sportsTab.addCoachClick')}</p>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Academies Section */}
                            <div className="space-y-4 pt-4 border-t">
                                <FormField
                                    control={control}
                                    name="has_joined_academy"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-white">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base">{t('profile.sportsTab.academies')}</FormLabel>
                                                <FormDescription>{t('profile.sportsTab.academiesDesc')}</FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {hasJoinedAcademy && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100 space-y-4">
                                            <div className="flex justify-between items-center">
                                                <FormLabel className="text-purple-800">{t('profile.sportsTab.academiesHistory')}</FormLabel>
                                                <Button type="button" size="sm" onClick={() => appendAcademy({ name: '' })} variant="default" className="gap-2 h-8 bg-black text-white hover:bg-black/80">
                                                    <Plus className="w-3.5 h-3.5" /> {t('profile.sportsTab.addAcademy')}
                                                </Button>
                                            </div>
                                            {academyFields.map((field, index) => (
                                                <div key={field.id} className="flex flex-col md:flex-row gap-3 md:items-end p-3 md:p-0 rounded-lg md:rounded-none bg-white/50 md:bg-transparent border md:border-0 border-purple-100">
                                                    <div className="flex-1 w-full">
                                                        <FormField control={control} name={`academies.${index}.name`} render={({ field }) => (<FormItem><FormControl><Input placeholder={t('profile.sportsTab.academyName')} className="bg-white" {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                                                    </div>
                                                    <div className="flex gap-2 w-full md:w-auto">
                                                        <div className="flex-1 md:w-32">
                                                            <FormField control={control} name={`academies.${index}.start_date`} render={({ field }) => (
                                                                <FormItem>
                                                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                                                        <FormControl><SelectTrigger className="bg-white h-9"><SelectValue placeholder={t('profile.sportsTab.fromYear')} /></SelectTrigger></FormControl>
                                                                        <SelectContent position="popper" className="h-60">
                                                                            {years.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </FormItem>
                                                            )} />
                                                        </div>
                                                        <div className="flex-1 md:w-32">
                                                            <FormField control={control} name={`academies.${index}.end_date`} render={({ field }) => (
                                                                <FormItem>
                                                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                                                        <FormControl><SelectTrigger className="bg-white h-9"><SelectValue placeholder={t('profile.sportsTab.toYear')} /></SelectTrigger></FormControl>
                                                                        <SelectContent position="popper" className="h-60">
                                                                            {years.map((year) => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </FormItem>
                                                            )} />
                                                        </div>
                                                    </div>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeAcademy(index)} className="text-red-500 hover:bg-red-50 hover:text-red-600 mb-0.5 self-end md:self-auto"><Trash2 className="w-4 h-4" /></Button>
                                                </div>
                                            ))}
                                            {academyFields.length === 0 && <p className="text-sm text-gray-400 text-center py-2">{t('profile.sportsTab.addAcademyClick')}</p>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 4. Club History (Enhanced) */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between py-4">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <CardTitle>{t('profile.sportsTab.clubHistory')}</CardTitle>
                            </div>
                            <Button variant="default" size="sm" onClick={() => appendClub({ club_name: '', season: '' })} className="gap-2 bg-black text-white hover:bg-black/90">
                                <Plus className="w-4 h-4" /> {t('profile.sportsTab.addClub')}
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {clubFields.map((field, index) => (
                                <div key={field.id} className="relative p-6 border rounded-xl bg-gray-50/50 space-y-5 hover:shadow-md transition-shadow">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeClub(index)}
                                        className="absolute top-3 left-3 text-red-500 hover:bg-red-50 hover:text-red-700 z-10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={control}
                                            name={`club_history.${index}.club_name`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t('profile.sportsTab.clubName')}</FormLabel>
                                                    <FormControl><Input placeholder={t('profile.sportsTab.clubName')} {...field} value={field.value || ''} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={control}
                                            name={`club_history.${index}.season`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t('profile.sportsTab.season')}</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                                        <FormControl>
                                                            <SelectTrigger className="bg-white">
                                                                <SelectValue placeholder={t('profile.sportsTab.selectSeason')} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {seasons.map((season) => (
                                                                <SelectItem key={season} value={season}>{season}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                                        <FormField control={control} name={`club_history.${index}.position_played`} render={({ field }) => (<FormItem className="col-span-2"><FormLabel className="text-xs text-gray-500">{t('profile.sportsTab.positionPlayed')}</FormLabel><FormControl><Input className="h-9" placeholder={t('profile.sportsTab.positionPlayedPlaceholder')} {...field} /></FormControl></FormItem>)} />
                                        <FormField control={control} name={`club_history.${index}.goals`} render={({ field }) => (<FormItem><FormLabel className="text-xs text-gray-500">{t('profile.sportsTab.goals')}</FormLabel><FormControl><Input type="number" className="h-9" {...field} value={field.value ?? ''} /></FormControl></FormItem>)} />
                                        <FormField control={control} name={`club_history.${index}.assists`} render={({ field }) => (<FormItem><FormLabel className="text-xs text-gray-500">{t('profile.sportsTab.assists')}</FormLabel><FormControl><Input type="number" className="h-9" {...field} value={field.value ?? ''} /></FormControl></FormItem>)} />
                                    </div>
                                </div>
                            ))}
                            {clubFields.length === 0 && (
                                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    <p className="text-gray-400">{t('profile.sportsTab.noClubs')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between py-4">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600">
                                    <Trophy className="w-6 h-6" />
                                </div>
                                <CardTitle>{t('profile.sportsTab.achievements')}</CardTitle>
                            </div>
                            <Button variant="default" size="sm" onClick={() => appendAch({ title: '' })} className="gap-2 bg-black text-white hover:bg-black/90">
                                <Plus className="w-4 h-4" /> {t('profile.sportsTab.addAchievement')}
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {achFields.map((field, index) => (
                                <div key={field.id} className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name={`achievements.${index}.title`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder={t('profile.sportsTab.achievementTitle')} {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => removeAch(index)} className="text-red-500">
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                </div>
                            ))}
                            {achFields.length === 0 && (
                                <p className="text-center text-sm text-gray-400 py-4">{t('profile.sportsTab.noAchievements')}</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Visual Pitch & Card Preview */}
                <div className="md:col-span-3">
                    <div className="sticky top-28 space-y-6">
                        <Tabs defaultValue="pitch" className="w-full">
                            <TabsList className="w-full grid grid-cols-2 h-12 bg-white/50 backdrop-blur border shadow-sm rounded-lg p-1">
                                <TabsTrigger value="pitch" className="gap-2 h-full rounded-md data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-sm"><MapPin className="w-4 h-4" /> {t('profile.sportsTab.pitchTab')}</TabsTrigger>
                                <TabsTrigger value="radar" className="gap-2 h-full rounded-md data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm"><BarChart3 className="w-4 h-4" /> {t('profile.sportsTab.radarTab')}</TabsTrigger>
                            </TabsList>
                            <TabsContent value="pitch" className="mt-4">
                                <Card className="overflow-hidden border-2 border-green-100 shadow-md">
                                    <CardHeader className="bg-green-50/50 pb-4">
                                        <CardTitle className="text-center text-green-800">{t('profile.sportsTab.pitchCardTitle')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="bg-green-600 p-4 min-h-[400px] flex items-center justify-center relative">
                                            <FootballPitch position={position || 'CM'} number={jerseyNumber || '10'} name={name} />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="radar" className="mt-4">
                                <Card className="overflow-hidden border-2 border-slate-900 shadow-md bg-slate-900 text-white">
                                    <CardHeader className="bg-slate-800/50 pb-4 border-b border-slate-700">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-center text-white">{t('profile.sportsTab.radarCardTitle')}</CardTitle>
                                            <div className="flex flex-col items-center bg-yellow-500 text-black font-black px-2 py-1 rounded shadow-lg leading-tight">
                                                <span className="text-xl">{ovr || 50}</span>
                                                <span className="text-[8px]">OVR</span>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0 h-[400px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={statsData}>
                                                <PolarGrid stroke="#475569" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#e2e8f0', fontSize: 11 }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                                <Radar name="Stats" dataKey="A" stroke="#fbbf24" strokeWidth={2} fill="#fbbf24" fillOpacity={0.5} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>

                        {/* Summary Card */}
                        <Card>
                            <CardHeader><CardTitle className="text-sm text-gray-500">{t('profile.sportsTab.summary')}</CardTitle></CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between text-sm border-b pb-2">
                                    <span className="text-gray-500">{t('profile.sportsTab.positionLabel')}</span>
                                    <span className="font-bold">{positionsList.find(p => p.value === position)?.label || '-'}</span>
                                </div>
                                <div className="flex justify-between text-sm border-b pb-2">
                                    <span className="text-gray-500">{t('profile.sportsTab.footLabel')}</span>
                                    <span className="font-bold">
                                        {form.getValues('foot') === 'right' ? t('profile.sportsTab.right') : form.getValues('foot') === 'left' ? t('profile.sportsTab.left') : form.getValues('foot') === 'both' ? t('profile.sportsTab.both') : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm border-b pb-2">
                                    <span className="text-gray-500">{t('profile.sportsTab.statusLabel')}</span>
                                    <span className={contractStatus === 'contracted' ? "text-green-600 font-bold" : "text-gray-600"}>
                                        {contractStatus === 'contracted' ? t('profile.sportsTab.contracted') : t('profile.sportsTab.free')}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

            </div>
        </div>
    );
}
