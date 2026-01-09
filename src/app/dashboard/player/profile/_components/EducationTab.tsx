"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, Languages, Award, Plus, Trash2, Calendar } from "lucide-react";

const LANGUAGES_LIST = [
    "العربية", "English", "Français", "Deutsch", "Español", "Italiano", "Türkçe", "Other"
];

const EDUCATION_LEVELS = [
    { value: "primary", label: "ابتدائي" },
    { value: "middle", label: "متوسط" },
    { value: "high_school", label: "ثانوي" },
    { value: "bachelors", label: "بكالوريوس" },
    { value: "masters", label: "ماجستير" },
    { value: "phd", label: "دكتوراه" },
];

export function EducationTab() {
    const { control } = useFormContext();

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
                    <CardTitle className="text-lg text-indigo-900">التعليم الأكاديمي</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                    <FormField
                        control={control}
                        name="education_level"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>المستوى التعليمي</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="اختر المستوى" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {EDUCATION_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
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
                                <FormLabel>سنة التخرج (المتوقعة)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="اختر السنة" /></SelectTrigger></FormControl>
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
                                    <FormLabel>اسم المدرسة / الجامعة</FormLabel>
                                    <FormControl><Input placeholder="اسم المؤسسة التعليمية" className="bg-white" {...field} value={field.value || ""} /></FormControl>
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
                            <CardTitle className="text-lg text-teal-900">اللغات</CardTitle>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => appendLang({ language: '', level: 'Intermediate' })}><Plus className="w-4 h-4" /></Button>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                        {langFields.map((field, index) => (
                            <div key={field.id} className="flex gap-3 items-end">
                                <div className="flex-1">
                                    <FormField control={control} name={`languages.${index}.language`} render={({ field }) => (
                                        <FormItem><FormControl>
                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="اللغة" /></SelectTrigger></FormControl>
                                                <SelectContent>{LANGUAGES_LIST.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </FormControl></FormItem>
                                    )} />
                                </div>
                                <div className="flex-1">
                                    <FormField control={control} name={`languages.${index}.level`} render={({ field }) => (
                                        <FormItem><FormControl>
                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="المستوى" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Beginner">مبتدأ</SelectItem>
                                                    <SelectItem value="Intermediate">متوسط</SelectItem>
                                                    <SelectItem value="Advanced">متقدم</SelectItem>
                                                    <SelectItem value="Native">لغة أم</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl></FormItem>
                                    )} />
                                </div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeLang(index)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        ))}
                        {langFields.length === 0 && <p className="text-center text-sm text-gray-400">لا يوجد لغات مسجلة</p>}
                    </CardContent>
                </Card>

                {/* 3. Courses */}
                <Card className="border-orange-100 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between bg-orange-50/50 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><Award className="w-5 h-5" /></div>
                            <CardTitle className="text-lg text-orange-900">الدورات والشهادات</CardTitle>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => appendCourse({ name: '' })}><Plus className="w-4 h-4" /></Button>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                        {courseFields.map((field, index) => (
                            <div key={field.id} className="p-3 bg-gray-50 rounded-lg relative group space-y-3">
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeCourse(index)} className="absolute top-2 left-2 text-red-500 h-6 w-6 p-0"><Trash2 className="w-3 h-3" /></Button>
                                <FormField control={control} name={`courses.${index}.name`} render={({ field }) => <Input placeholder="اسم الدورة / الشهادة" {...field} className="bg-white h-9" value={field.value || ""} />} />
                                <div className="grid grid-cols-2 gap-2">
                                    <FormField control={control} name={`courses.${index}.organization`} render={({ field }) => <Input placeholder="الجهة المانحة" {...field} className="bg-white h-9" value={field.value || ""} />} />
                                    <FormField control={control} name={`courses.${index}.date`} render={({ field }) => <Input type="date" {...field} className="bg-white h-9" value={field.value || ""} />} />
                                </div>
                            </div>
                        ))}
                        {courseFields.length === 0 && <p className="text-center text-sm text-gray-400">لا يوجد دورات مسجلة</p>}
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}
