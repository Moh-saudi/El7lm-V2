"use client";

import { useFormContext } from "react-hook-form";
import { format, differenceInYears, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { CalendarIcon, User, MapPin, Phone, Mail, ShieldAlert, AlertCircle, FileText } from "lucide-react";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SUPPORTED_COUNTRIES, getCitiesByCountry } from "@/lib/cities-data";
import { ProfileFormValues } from "../schemas/profile";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export function PersonalTab() {
    const { t } = useTranslation();
    const form = useFormContext<ProfileFormValues>();
    const { watch, setValue, control } = form;

    const birthDate = watch("birth_date");
    const selectedCountry = watch("country");

    const [age, setAge] = useState<number>(0);
    const [cities, setCities] = useState<string[]>([]);
    const isMinor = age > 0 && age < 18;

    // Calculate Age
    useEffect(() => {
        if (birthDate) {
            const date = new Date(birthDate);
            const calculatedAge = differenceInYears(new Date(), date);
            setAge(calculatedAge);
        }
    }, [birthDate]);

    // Update Cities when Country changes
    useEffect(() => {
        if (selectedCountry) {
            const countryCities = getCitiesByCountry(selectedCountry);
            setCities(countryCities);
            // Reset city if not in new list
            const currentCity = form.getValues("city");
            if (currentCity && !countryCities.includes(currentCity)) {
                setValue("city", "");
            }
        } else {
            setCities([]);
        }
    }, [selectedCountry, setValue, form]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 1. Basic Information Card */}
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{t('profile.personalTab.basicInfo')}</h3>
                        <p className="text-sm text-gray-500">{t('profile.personalTab.basicInfoDesc')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div className="col-span-1 md:col-span-2">
                        <FormField
                            control={control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('profile.personalTab.fullName')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t('profile.personalTab.fullNamePlaceholder')}
                                            className="h-12 text-lg bg-gray-50/50 focus:bg-white transition-all"
                                            {...field}
                                            value={field.value || ''}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Birth Date */}
                    <FormField
                        control={control}
                        name="birth_date"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('profile.personalTab.birthDate')}</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type="date"
                                            className="h-12 pr-10 bg-gray-50/50 focus:bg-white transition-all block w-full text-right"
                                            {...field}
                                            value={field.value || ''}
                                        />
                                        <CalendarIcon className="w-5 h-5 absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
                                    </div>
                                </FormControl>
                                {age > 0 && (
                                    <FormDescription className={cn("mt-2 font-medium", isMinor ? "text-amber-600" : "text-green-600")}>
                                        {t('profile.personalTab.currentAge').replace('{{age}}', String(age))}
                                    </FormDescription>
                                )}
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Nationality */}
                    <FormField
                        control={control}
                        name="nationality"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('profile.personalTab.nationality')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 bg-gray-50/50 focus:bg-white">
                                            <SelectValue placeholder={t('profile.personalTab.selectNationality')} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="max-h-[300px]">
                                        {/* Using Supported Countries for Nationality as well for consistency, or generic list */}
                                        {SUPPORTED_COUNTRIES.map((country) => (
                                            <SelectItem key={country} value={country}>{country}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Gender */}
                    <div className="col-span-1 md:col-span-2">
                        <FormField
                            control={control}
                            name="gender"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>{t('profile.personalTab.gender')}</FormLabel>
                                    <FormControl>
                                        <div className="flex gap-4">
                                            {['male', 'female'].map((g) => (
                                                <label
                                                    key={g}
                                                    className={cn(
                                                        "flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:bg-gray-50",
                                                        field.value === g
                                                            ? "border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20"
                                                            : "border-gray-100 text-gray-600 hover:border-gray-200"
                                                    )}
                                                >
                                                    <input
                                                        type="radio"
                                                        className="hidden"
                                                        {...field}
                                                        value={g}
                                                        checked={field.value === g}
                                                        onChange={() => field.onChange(g)}
                                                    />
                                                    <span className="text-lg font-medium">{g === 'male' ? t('profile.personalTab.male') : t('profile.personalTab.female')}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>


                    {/* Brief */}
                    <div className="col-span-1 md:col-span-2">
                        <FormField
                            control={control}
                            name={"brief" as any}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('profile.personalTab.brief')}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t('profile.personalTab.briefPlaceholder')}
                                            className="min-h-[100px] bg-gray-50/50 focus:bg-white text-base"
                                            {...field}
                                            value={field.value || ''}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* 2. Guardian Alert Section */}
            {
                isMinor && (
                    <Alert className="bg-amber-50 border-amber-200 text-amber-900 shadow-sm animate-in zoom-in-95 duration-300">
                        <ShieldAlert className="h-6 w-6 text-amber-600 ml-3" />
                        <AlertTitle className="text-lg font-bold text-amber-800 mb-2">{t('profile.personalTab.parentConsentTitle')}</AlertTitle>
                        <AlertDescription className="text-amber-700 leading-relaxed">
                            {t('profile.personalTab.parentConsentDesc')}
                        </AlertDescription>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-amber-200/50">
                            <FormField
                                control={control}
                                name="guardian_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-amber-900">{t('profile.personalTab.parentName')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t('profile.personalTab.fullName')} className="bg-white border-amber-200 focus:border-amber-400" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="guardian_phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-amber-900">{t('profile.personalTab.parentPhone')}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    placeholder="+966..."
                                                    className="h-12 pl-10 bg-white border-amber-200 focus:border-amber-400 text-left ltr"
                                                    {...field}
                                                    value={field.value || ''}
                                                />
                                                <Phone className="w-5 h-5 absolute left-3 top-3.5 text-amber-500" />
                                            </div>
                                        </FormControl>
                                        <FormDescription className="text-xs text-amber-700">
                                            {t('profile.personalTab.parentPhoneDesc')}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </Alert>
                )
            }

            {/* 3. Residence & Contact */}
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-green-50 rounded-xl text-green-600">
                        <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{t('profile.personalTab.residenceContact')}</h3>
                        <p className="text-sm text-gray-500">{t('profile.personalTab.residenceContactDesc')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Country */}
                    <FormField
                        control={control}
                        name="country"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('profile.personalTab.country')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 bg-gray-50/50 focus:bg-white">
                                            <SelectValue placeholder={t('profile.personalTab.selectCountry')} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="max-h-[300px]">
                                        {SUPPORTED_COUNTRIES.map((country) => (
                                            <SelectItem key={country} value={country}>{country}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* City */}
                    <FormField
                        control={control}
                        name="city"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('profile.personalTab.city')}</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    // defaultValue={field.value}
                                    value={field.value || ""}
                                    disabled={!selectedCountry || cities.length === 0}
                                >
                                    <FormControl>
                                        <SelectTrigger className="h-12 bg-gray-50/50 focus:bg-white">
                                            <SelectValue placeholder={selectedCountry ? t('profile.personalTab.selectCity') : t('profile.personalTab.selectCountryFirst')} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="max-h-[300px]">
                                        {cities.map((city) => (
                                            <SelectItem key={city} value={city}>{city}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Address */}
                    <div className="col-span-1 md:col-span-2">
                        <FormField
                            control={control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('profile.personalTab.detailedAddress')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t('profile.personalTab.detailedAddressPlaceholder')}
                                            className="h-12 bg-gray-50/50 focus:bg-white"
                                            {...field}
                                            value={field.value || ''}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Phone */}
                    <FormField
                        control={control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('profile.personalTab.phone')}</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input className="h-12 pl-10 text-left ltr bg-gray-50/50 focus:bg-white" placeholder="+966..." {...field} />
                                        <Phone className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Email (Read Only often, but editable here) */}
                    <FormField
                        control={control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('profile.personalTab.email')}</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input className="h-12 pl-10 text-left ltr bg-gray-50/50 focus:bg-white" type="email" {...field} />
                                        <Mail className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

        </div >
    );
}
