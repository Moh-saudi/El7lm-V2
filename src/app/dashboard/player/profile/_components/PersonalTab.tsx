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
import { COUNTRIES_FROM_REGISTER, getCitiesByCountry } from "@/data/countries-from-register";
import { ProfileFormValues } from "../schemas/profile";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
const ARABIC_TO_LATIN: Record<string, string> = {
    '\u0627': 'a', '\u0623': 'a', '\u0625': 'i', '\u0622': 'aa', '\u0628': 'b', '\u062a': 't', '\u062b': 'th',
    '\u062c': 'j', '\u062d': 'h', '\u062e': 'kh', '\u062f': 'd', '\u0630': 'dh', '\u0631': 'r', '\u0632': 'z',
    '\u0633': 's', '\u0634': 'sh', '\u0635': 's', '\u0636': 'd', '\u0637': 't', '\u0638': 'z', '\u0639': 'a',
    '\u063a': 'gh', '\u0641': 'f', '\u0642': 'q', '\u0643': 'k', '\u0644': 'l', '\u0645': 'm', '\u0646': 'n',
    '\u0647': 'h', '\u0648': 'w', '\u064a': 'y', '\u0649': 'a', '\u0629': 'a', '\u0621': '', '\u0624': 'w', '\u0626': 'y',
};

const transliterateArabic = (value: string) => value
    .split('')
    .map((character) => ARABIC_TO_LATIN[character] ?? character)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

// Use real names in each supported language; transliteration is only a final
// fallback for locations that are not yet present in the local catalogue.
const COUNTRY_TRANSLATIONS: Record<string, Record<'en' | 'es' | 'pt', string>> = {
    '\u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629': { en: 'Saudi Arabia', es: 'Arabia Saudí', pt: 'Arábia Saudita' },
    '\u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062a': { en: 'United Arab Emirates', es: 'Emiratos Árabes Unidos', pt: 'Emirados Árabes Unidos' },
    '\u0627\u0644\u0643\u0648\u064a\u062a': { en: 'Kuwait', es: 'Kuwait', pt: 'Kuwait' },
    '\u0642\u0637\u0631': { en: 'Qatar', es: 'Catar', pt: 'Catar' },
    '\u0627\u0644\u0628\u062d\u0631\u064a\u0646': { en: 'Bahrain', es: 'Baréin', pt: 'Bahrein' },
    '\u0639\u0645\u0627\u0646': { en: 'Oman', es: 'Omán', pt: 'Omã' },
    '\u0645\u0635\u0631': { en: 'Egypt', es: 'Egipto', pt: 'Egito' },
    '\u0627\u0644\u0623\u0631\u062f\u0646': { en: 'Jordan', es: 'Jordania', pt: 'Jordânia' },
    '\u0644\u0628\u0646\u0627\u0646': { en: 'Lebanon', es: 'Líbano', pt: 'Líbano' },
    '\u0627\u0644\u0639\u0631\u0627\u0642': { en: 'Iraq', es: 'Irak', pt: 'Iraque' },
    '\u0633\u0648\u0631\u064a\u0627': { en: 'Syria', es: 'Siria', pt: 'Síria' },
    '\u0627\u0644\u0645\u063a\u0631\u0628': { en: 'Morocco', es: 'Marruecos', pt: 'Marrocos' },
    '\u0627\u0644\u062c\u0632\u0627\u0626\u0631': { en: 'Algeria', es: 'Argelia', pt: 'Argélia' },
    '\u062a\u0648\u0646\u0633': { en: 'Tunisia', es: 'Túnez', pt: 'Tunísia' },
    '\u0644\u064a\u0628\u064a\u0627': { en: 'Libya', es: 'Libia', pt: 'Líbia' },
    '\u0627\u0644\u0633\u0648\u062f\u0627\u0646': { en: 'Sudan', es: 'Sudán', pt: 'Sudão' },
    '\u0627\u0644\u0633\u0646\u063a\u0627\u0644': { en: 'Senegal', es: 'Senegal', pt: 'Senegal' },
    '\u0633\u0627\u062d\u0644 \u0627\u0644\u0639\u0627\u062c': { en: 'Ivory Coast', es: 'Costa de Marfil', pt: 'Costa do Marfim' },
    '\u062c\u064a\u0628\u0648\u062a\u064a': { en: 'Djibouti', es: 'Yibuti', pt: 'Djibuti' },
    '\u0625\u0633\u0628\u0627\u0646\u064a\u0627': { en: 'Spain', es: 'España', pt: 'Espanha' },
    '\u0641\u0631\u0646\u0633\u0627': { en: 'France', es: 'Francia', pt: 'França' },
    '\u0625\u0646\u062c\u0644\u062a\u0631\u0627': { en: 'England', es: 'Inglaterra', pt: 'Inglaterra' },
    '\u0627\u0644\u0628\u0631\u062a\u063a\u0627\u0644': { en: 'Portugal', es: 'Portugal', pt: 'Portugal' },
    '\u0625\u064a\u0637\u0627\u0644\u064a\u0627': { en: 'Italy', es: 'Italia', pt: 'Itália' },
    '\u062a\u0631\u0643\u064a\u0627': { en: 'Turkey', es: 'Turquía', pt: 'Turquia' },
    '\u0627\u0644\u064a\u0645\u0646': { en: 'Yemen', es: 'Yemen', pt: 'Iêmen' },
    '\u0623\u0645\u0631\u064a\u0643\u0627': { en: 'United States', es: 'Estados Unidos', pt: 'Estados Unidos' },
};

const CITY_TRANSLATIONS_BY_LOCALE: Record<'en' | 'es' | 'pt', Record<string, string>> = {
    en: {
        '\u0627\u0644\u0642\u0627\u0647\u0631\u0629': 'Cairo', '\u0627\u0644\u062c\u064a\u0632\u0629': 'Giza', '\u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629': 'Alexandria',
        '\u0627\u0644\u062e\u0631\u0637\u0648\u0645': 'Khartoum', '\u0623\u0645 \u062f\u0631\u0645\u0627\u0646': 'Omdurman', '\u0628\u062d\u0631\u064a': 'Bahri', '\u0645\u062f\u0646\u064a': 'Wad Madani',
    },
    es: {
        '\u0627\u0644\u0642\u0627\u0647\u0631\u0629': 'El Cairo', '\u0627\u0644\u062c\u064a\u0632\u0629': 'Guiza', '\u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629': 'Alejandría',
        '\u0627\u0644\u062e\u0631\u0637\u0648\u0645': 'Jartum', '\u0623\u0645 \u062f\u0631\u0645\u0627\u0646': 'Omdurmán', '\u0628\u062d\u0631\u064a': 'Bahri', '\u0645\u062f\u0646\u064a': 'Wad Madani',
    },
    pt: {
        '\u0627\u0644\u0642\u0627\u0647\u0631\u0629': 'Cairo', '\u0627\u0644\u062c\u064a\u0632\u0629': 'Giza', '\u0627\u0644\u0625\u0633\u0643\u0646\u062f\u0631\u064a\u0629': 'Alexandria',
        '\u0627\u0644\u062e\u0631\u0637\u0648\u0645': 'Cartum', '\u0623\u0645 \u062f\u0631\u0645\u0627\u0646': 'Omdurman', '\u0628\u062d\u0631\u064a': 'Bahri', '\u0645\u062f\u0646\u064a': 'Wad Madani',
    },
};

const CITY_TRANSLATIONS: Record<string, Record<string, string>> = {
    en: {
        "الخرطوم": "Khartoum", "أم درمان": "Omdurman", "بحري": "Bahri", "مدني": "Wad Madani",
        "القضارف": "Gedaref", "كسلا": "Kassala", "الأبيض": "El Obeid", "نيالا": "Nyala",
        "الفاشر": "El Fasher", "زالنجي": "Zalingei", "الجنينة": "Geneina", "بورتسودان": "Port Sudan",
    },
    es: {
        "الخرطوم": "Jartum", "أم درمان": "Omdurmán", "بحري": "Bahri", "مدني": "Wad Madani",
        "القضارف": "Gedaref", "كسلا": "Kassala", "الأبيض": "El Obeid", "نيالا": "Nyala",
        "الفاشر": "El Fasher", "زالنجي": "Zalingei", "الجنينة": "Geneina", "بورتسودان": "Puerto Sudán",
    },
    pt: {
        "الخرطوم": "Cartum", "أم درمان": "Omdurman", "بحري": "Bahri", "مدني": "Wad Madani",
        "القضارف": "Gedaref", "كسلا": "Kassala", "الأبيض": "El Obeid", "نيالا": "Nyala",
        "الفاشر": "El Fasher", "زالنجي": "Zalingei", "الجنينة": "Geneina", "بورتسودان": "Port Sudan",
    },
};

const COUNTRY_REGION_BY_NAME: Record<string, string> = {
    'السعودية': 'SA',
    'الإمارات': 'AE',
    'الكويت': 'KW',
    'قطر': 'QA',
    'البحرين': 'BH',
    'عمان': 'OM',
    'مصر': 'EG',
    'الأردن': 'JO',
    'لبنان': 'LB',
    'العراق': 'IQ',
    'سوريا': 'SY',
    'المغرب': 'MA',
    'الجزائر': 'DZ',
    'تونس': 'TN',
    'ليبيا': 'LY',
    'السودان': 'SD',
    'السنغال': 'SN',
    'ساحل العاج': 'CI',
    'جيبوتي': 'DJ',
    'إسبانيا': 'ES',
    'فرنسا': 'FR',
    'إنجلترا': 'GB',
    'البرتغال': 'PT',
    'إيطاليا': 'IT',
    'اليونان': 'GR',
    'قبرص': 'CY',
    'تركيا': 'TR',
    'تايلاند': 'TH',
    'اليمن': 'YE',
    'أمريكا': 'US',
    'الفلبين': 'PH',
    'اليابان': 'JP',
    'الهند': 'IN',
    'الصين': 'CN',
    'كوريا': 'KR',
    'إيران': 'IR',
    'باكستان': 'PK',
    'أوزبكستان': 'UZ',
    'أفغانستان': 'AF',
    'روسيا': 'RU',
    'أوكرانيا': 'UA',
    'ألمانيا': 'DE',
    'هولندا': 'NL',
    'بلجيكا': 'BE',
    'سويسرا': 'CH',
    'النمسا': 'AT',
    'السويد': 'SE',
    'النرويج': 'NO',
    'الدنمارك': 'DK',
    'فنلندا': 'FI',
    'بولندا': 'PL',
    'التشيك': 'CZ',
    'المجر': 'HU',
    'رومانيا': 'RO',
    'بلغاريا': 'BG',
    'كرواتيا': 'HR',
    'صربيا': 'RS',
    'ألبانيا': 'AL',
    'كندا': 'CA',
    'المكسيك': 'MX',
    'البرازيل': 'BR',
    'الأرجنتين': 'AR',
    'تشيلي': 'CL',
    'كولومبيا': 'CO',
    'بيرو': 'PE',
    'فنزويلا': 'VE',
    'أستراليا': 'AU',
    'نيوزيلندا': 'NZ',
    'جنوب أفريقيا': 'ZA',
    'كينيا': 'KE',
    'نيجيريا': 'NG',
    'غانا': 'GH',
    'تنزانيا': 'TZ',
    'أوغندا': 'UG',
    'إثيوبيا': 'ET',
    'إندونيسيا': 'ID',
    'ماليزيا': 'MY',
    'سنغافورة': 'SG',
    'فيتنام': 'VN',
    'كمبوديا': 'KH',
    'لاوس': 'LA',
    'ميانمار': 'MM',
    'بنغلاديش': 'BD',
    'سريلانكا': 'LK',
    'نيبال': 'NP',
    'بوتان': 'BT',
    'منغوليا': 'MN',
    'كازاخستان': 'KZ',
    'قيرغيزستان': 'KG',
    'طاجيكستان': 'TJ',
    'تركمانستان': 'TM',
    'أذربيجان': 'AZ',
    'أرمينيا': 'AM',
    'جورجيا': 'GE',
    'بيلاروسيا': 'BY',
    'مولدوفا': 'MD',
    'ليتوانيا': 'LT',
    'لاتفيا': 'LV',
    'إستونيا': 'EE',
    'سلوفاكيا': 'SK',
    'سلوفينيا': 'SI',
    'البوسنة والهرسك': 'BA',
    'الجبل الأسود': 'ME',
    'مقدونيا': 'MK',
    'أيسلندا': 'IS',
    'أيرلندا': 'IE',
    'لوكسمبورغ': 'LU',
    'مالطا': 'MT',
};

const SPECIAL_COUNTRY_LABELS: Record<string, Record<'en' | 'es' | 'pt', string>> = {
    'إنجلترا': { en: 'England', es: 'Inglaterra', pt: 'Inglaterra' },
};

const CITY_LABELS: Record<string, Record<'en' | 'es' | 'pt', string>> = {
    'فاليتا': { en: 'Valletta', es: 'La Valeta', pt: 'Valeta' },
    'بيركيركارا': { en: 'Birkirkara', es: 'Birkirkara', pt: 'Birkirkara' },
    'مستون': { en: 'Mosta', es: 'Mosta', pt: 'Mosta' },
    'زابار': { en: 'Zabbar', es: 'Zabbar', pt: 'Zabbar' },
    'سليما': { en: 'Sliema', es: 'Sliema', pt: 'Sliema' },
    'سانت جوليان': { en: "St Julian's", es: 'San Julián', pt: 'Saint Julian' },
    slyma: { en: 'Sliema', es: 'Sliema', pt: 'Sliema' },
    sliema: { en: 'Sliema', es: 'Sliema', pt: 'Sliema' },
};

const titleCaseLatin = (value: string) => value.replace(/\b\p{L}/gu, (char) => char.toLocaleUpperCase());

const hasArabic = (value: string) => /[\u0600-\u06FF]/.test(value);

export function PersonalTab() {
    const { t, locale } = useTranslation();
    const form = useFormContext<ProfileFormValues>();
    const { watch, setValue, control } = form;

    const birthDate = watch("birth_date");
    const selectedCountry = watch("country");

    const [age, setAge] = useState<number>(0);
    const [cities, setCities] = useState<string[]>([]);
    const isMinor = age > 0 && age < 18;
    const localizeCountry = (country: string) => {
        if (!country || locale === 'ar') return country;
        const targetLocale = locale as 'en' | 'es' | 'pt';
        const regionCode = COUNTRY_REGION_BY_NAME[country];
        const specialLabel = SPECIAL_COUNTRY_LABELS[country]?.[targetLocale];

        if (specialLabel) return specialLabel;

        if (regionCode) {
            try {
                return new Intl.DisplayNames([targetLocale], { type: 'region' }).of(regionCode) || country;
            } catch {
                return COUNTRY_TRANSLATIONS[country]?.[targetLocale] ?? country;
            }
        }

        return COUNTRY_TRANSLATIONS[country]?.[targetLocale] ?? country;
    };

    const localizeCity = (city: string) => {
        if (!city || locale === 'ar') return city;
        const targetLocale = locale as 'en' | 'es' | 'pt';
        const normalizedCity = city.trim().toLowerCase();

        return CITY_LABELS[city]?.[targetLocale]
            ?? CITY_LABELS[normalizedCity]?.[targetLocale]
            ?? CITY_TRANSLATIONS_BY_LOCALE[targetLocale]?.[city]
            ?? (hasArabic(city) ? transliterateArabic(city) : titleCaseLatin(city.trim()));
    };

    const cityOptions = Array.from(new Set([
        ...cities,
        ...(form.getValues("city") ? [form.getValues("city") as string] : []),
    ].filter(Boolean)));
    const supportedCountries = COUNTRIES_FROM_REGISTER
        .map((country) => country.name)
        .sort((a, b) => a.localeCompare(b));

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
                                        {supportedCountries.map((country) => (
                                            <SelectItem key={country} value={country}>{localizeCountry(country)}</SelectItem>
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
                                        {supportedCountries.map((country) => (
                                            <SelectItem key={country} value={country}>{localizeCountry(country)}</SelectItem>
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
                                        {cityOptions.map((city) => (
                                            <SelectItem key={city} value={city}>{localizeCity(city)}</SelectItem>
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
