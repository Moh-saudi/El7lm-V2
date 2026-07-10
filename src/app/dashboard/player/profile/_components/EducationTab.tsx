"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, Languages, Award, Plus, Trash2, Calendar } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const getTranslatedLanguagesList = (t: any) => [
    { value: "Arabic", label: t("profile.educationTab.languagesList.ar") },
    { value: "English", label: t("profile.educationTab.languagesList.en") },
    { value: "French", label: t("profile.educationTab.languagesList.fr") },
    { value: "German", label: t("profile.educationTab.languagesList.de") },
    { value: "Spanish", label: t("profile.educationTab.languagesList.es") },
    { value: "Italian", label: t("profile.educationTab.languagesList.it") },
    { value: "Turkish", label: t("profile.educationTab.languagesList.tr") },
    { value: "Other", label: t("profile.educationTab.languagesList.other") },
];

const getTranslatedEducationLevels = (t: any) => [
    { value: "primary", label: t("profile.educationTab.educationLevels.primary") },
    { value: "middle", label: t("profile.educationTab.educationLevels.middle") },
    { value: "high_school", label: t("profile.educationTab.educationLevels.highSchool") },
    { value: "bachelors", label: t("profile.educationTab.educationLevels.bachelors") },
    { value: "masters", label: t("profile.educationTab.educationLevels.masters") },
    { value: "phd", label: t("profile.educationTab.educationLevels.phd") },
];

export function EducationTab() {
    const { t } = useTranslation();
    const { control } = useFormContext();
    const educationLevels = getTranslatedEducationLevels(t);
    const languagesList = getTranslatedLanguagesList(t);

    const { fields: langFields, append: appendLang, remove: removeLang } = useFieldArray({
        control,
        name: "languages",
    });

    const { fields: courseFields, append: appendCourse, remove: removeCourse } = useFieldArray({
        control,
        name: "courses",
    });

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 50 }, (_, i) => (currentYear + 5 - i).toString());

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 1. Academic Education */}
            <Card className="border-indigo-100 shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 bg-indigo-50/50 pb-4">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                        <GraduationCap className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg text-indigo-900">{t('profile.educationTab.academicTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                    <FormField
                        control={control}
                        name="education_level"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('profile.educationTab.educationLevel')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder={t('profile.educationTab.selectLevel')} /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {educationLevels.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={control}
                        name="graduation_year"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('profile.educationTab.graduationYear')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder={t('profile.educationTab.selectYear')} /></SelectTrigger></FormControl>
                                    <SelectContent className="h-60">
                                        {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}
                    />

                    <div className="md:col-span-2">
                        <FormField
                            control={control}
                            name="school_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('profile.educationTab.schoolName')}</FormLabel>
                                    <FormControl><Input placeholder={t('profile.educationTab.schoolPlaceholder')} className="bg-white" {...field} value={field.value || ""} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 2. Languages */}
                <Card className="border-teal-100 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between bg-teal-50/50 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-teal-100 rounded-lg text-teal-600"><Languages className="w-5 h-5" /></div>
                            <CardTitle className="text-lg text-teal-900">{t('profile.educationTab.languages')}</CardTitle>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => appendLang({ language: 'English', level: 'Intermediate' })}><Plus className="w-4 h-4" /></Button>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                        {langFields.map((field, index) => (
                            <div key={field.id} className="flex gap-3 items-end">
                                <div className="flex-1">
                                    <FormField control={control} name={`languages.${index}.language`} render={({ field }) => (
                                        <FormItem><FormControl>
                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder={t('profile.educationTab.language')} /></SelectTrigger></FormControl>
                                                <SelectContent>{languagesList.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </FormControl></FormItem>
                                    )} />
                                </div>
                                <div className="flex-1">
                                    <FormField control={control} name={`languages.${index}.level`} render={({ field }) => (
                                        <FormItem><FormControl>
                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder={t('profile.educationTab.level')} /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Beginner">{t('profile.educationTab.levels.beginner')}</SelectItem>
                                                    <SelectItem value="Intermediate">{t('profile.educationTab.levels.intermediate')}</SelectItem>
                                                    <SelectItem value="Advanced">{t('profile.educationTab.levels.advanced')}</SelectItem>
                                                    <SelectItem value="Native">{t('profile.educationTab.levels.native')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl></FormItem>
                                    )} />
                                </div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeLang(index)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        ))}
                        {langFields.length === 0 && <p className="text-center text-sm text-gray-400">{t('profile.educationTab.noLanguages')}</p>}
                    </CardContent>
                </Card>

                {/* 3. Courses */}
                <Card className="border-orange-100 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between bg-orange-50/50 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><Award className="w-5 h-5" /></div>
                            <CardTitle className="text-lg text-orange-900">{t('profile.educationTab.courses')}</CardTitle>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => appendCourse({ name: '' })}><Plus className="w-4 h-4" /></Button>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                        {courseFields.map((field, index) => (
                            <div key={field.id} className="p-3 bg-gray-50 rounded-lg relative group space-y-3">
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeCourse(index)} className="absolute top-2 left-2 text-red-500 h-6 w-6 p-0"><Trash2 className="w-3 h-3" /></Button>
                                <FormField control={control} name={`courses.${index}.name`} render={({ field }) => <Input placeholder={t('profile.educationTab.coursePlaceholder')} {...field} className="bg-white h-9" value={field.value || ""} />} />
                                <div className="grid grid-cols-2 gap-2">
                                    <FormField control={control} name={`courses.${index}.organization`} render={({ field }) => <Input placeholder={t('profile.educationTab.organizationPlaceholder')} {...field} className="bg-white h-9" value={field.value || ""} />} />
                                    <FormField control={control} name={`courses.${index}.date`} render={({ field }) => <Input type="date" {...field} className="bg-white h-9" value={field.value || ""} />} />
                                </div>
                            </div>
                        ))}
                        {courseFields.length === 0 && <p className="text-center text-sm text-gray-400">{t('profile.educationTab.noCourses')}</p>}
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}
