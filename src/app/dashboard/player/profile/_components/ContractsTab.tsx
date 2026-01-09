"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Calendar, DollarSign, UserCheck, Phone, FileText, Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ContractsTab() {
    const { control, watch } = useFormContext();
    const contractStatus = watch("contract_status");

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 1. Current Status */}
            <Card className="border-slate-100 shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 bg-slate-50/50 pb-4">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        <Briefcase className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg text-slate-900">الوضع التعاقدي الحالي</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                    <div className="md:col-span-2">
                        <FormField
                            control={control}
                            name="contract_status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>حالة اللاعب</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || "Free"}>
                                        <FormControl>
                                            <SelectTrigger className="bg-white h-12">
                                                <SelectValue placeholder="اختر الحالة" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Free">لاعب حر (Free Agent)</SelectItem>
                                            <SelectItem value="Contracted">مرتبط بعقد (Contracted)</SelectItem>
                                            <SelectItem value="Loan">إعارة (Loan)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        {field.value === 'Free' && <span className="text-green-600 font-medium">يمكنك الانتقال لأي نادي مجاناً</span>}
                                        {field.value === 'Contracted' && <span className="text-blue-600 font-medium">أنت مرتبط بعقد مع ناديك الحالي</span>}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {(contractStatus === 'Contracted' || contractStatus === 'Loan') && (
                        <>
                            <FormField
                                control={control}
                                name="current_club"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel>النادي الحالي</FormLabel>
                                        <FormControl>
                                            <Input className="bg-white" placeholder="اسم النادي" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="contract_end_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>نهاية العقد</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type="date" className="bg-white pl-10" {...field} value={field.value || ""} />
                                                <Calendar className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="salary"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>الراتب الحالي (اختياري)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input className="bg-white pl-10" placeholder="مثال: 5000" {...field} value={field.value || ""} />
                                                <DollarSign className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                            </div>
                                        </FormControl>
                                        <FormDescription>سيتم التعامل مع هذه المعلومة بسرية</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </>
                    )}

                    <FormField
                        control={control}
                        name="market_value"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>القيمة السوقية التقديرية (Market Value)</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input className="bg-white pl-10" placeholder="مثال: 50000" {...field} value={field.value || ""} />
                                        <DollarSign className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* 2. Agent Info */}
            <Card className="border-violet-100 shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 bg-violet-50/50 pb-4">
                    <div className="p-2 bg-violet-100 rounded-lg text-violet-600">
                        <UserCheck className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg text-violet-900">معلومات الوكيل</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                    <FormField
                        control={control}
                        name="agent_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>اسم الوكيل</FormLabel>
                                <FormControl>
                                    <Input placeholder="اسم وكيل الأعمال" className="bg-white" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="agent_phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>رقم تواصل الوكيل</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input className="bg-white pl-10" placeholder="+966..." {...field} value={field.value || ""} />
                                        <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* 3. Official Contact Info */}
            <Card className="border-fuchsia-100 shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 bg-fuchsia-50/50 pb-4">
                    <div className="p-2 bg-fuchsia-100 rounded-lg text-fuchsia-600">
                        <Phone className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg text-fuchsia-900">جهة الاتصال والتفاوض الرسمية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={control}
                            name="official_contact.name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>الاسم الكامل</FormLabel>
                                    <FormControl>
                                        <Input placeholder="الاسم الكامل للشخص المسؤول" className="bg-white" {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name="official_contact.title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>المسمى الوظيفي</FormLabel>
                                    <FormControl>
                                        <Input placeholder="مثال: مدير أعمال / والدي" className="bg-white" {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name="official_contact.phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>رقم الهاتف</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input className="bg-white pl-10" placeholder="+966..." dir="ltr" {...field} value={field.value || ""} />
                                            <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name="official_contact.whatsapp"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>رقم الواتساب</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input className="bg-white pl-10" placeholder="+966..." dir="ltr" {...field} value={field.value || ""} />
                                            <Phone className="w-4 h-4 absolute left-3 top-3 text-green-500" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name="official_contact.email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>البريد الإلكتروني</FormLabel>
                                    <FormControl>
                                        <Input className="bg-white" placeholder="example@email.com" type="email" {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <div className="mb-4 text-sm font-medium text-gray-700">حسابات التواصل الاجتماعي</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={control}
                                name="official_contact.social_links.facebook"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <div className="relative">
                                                <Input className="bg-white pl-10" placeholder="رابط فيسبوك" {...field} value={field.value || ""} />
                                                <Facebook className="w-4 h-4 absolute left-3 top-3 text-blue-600" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="official_contact.social_links.instagram"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <div className="relative">
                                                <Input className="bg-white pl-10" placeholder="رابط انستجرام" {...field} value={field.value || ""} />
                                                <Instagram className="w-4 h-4 absolute left-3 top-3 text-pink-600" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="official_contact.social_links.linkedin"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <div className="relative">
                                                <Input className="bg-white pl-10" placeholder="رابط لينكد إن" {...field} value={field.value || ""} />
                                                <Linkedin className="w-4 h-4 absolute left-3 top-3 text-blue-800" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="official_contact.social_links.twitter"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <div className="relative">
                                                <Input className="bg-white pl-10" placeholder="رابط تويتر / X" {...field} value={field.value || ""} />
                                                <Twitter className="w-4 h-4 absolute left-3 top-3 text-sky-500" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
