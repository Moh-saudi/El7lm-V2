'use client';

import React, { useState } from 'react';

export interface CountryInfo {
    code: string;
    name: string;
    flag: string;
}

const COUNTRY_MAP: Record<string, { code: string; name: string; flag: string }> = {
    // دول عربية
    'مصر': { code: 'eg', name: 'مصر', flag: '🇪🇬' },
    'egypt': { code: 'eg', name: 'مصر', flag: '🇪🇬' },
    'eg': { code: 'eg', name: 'مصر', flag: '🇪🇬' },

    'السعودية': { code: 'sa', name: 'السعودية', flag: '🇸🇦' },
    'المملكة العربية السعودية': { code: 'sa', name: 'السعودية', flag: '🇸🇦' },
    'saudi arabia': { code: 'sa', name: 'السعودية', flag: '🇸🇦' },
    'ksa': { code: 'sa', name: 'السعودية', flag: '🇸🇦' },
    'sa': { code: 'sa', name: 'السعودية', flag: '🇸🇦' },

    'الإمارات': { code: 'ae', name: 'الإمارات', flag: '🇦🇪' },
    'الامارات': { code: 'ae', name: 'الإمارات', flag: '🇦🇪' },
    'uae': { code: 'ae', name: 'الإمارات', flag: '🇦🇪' },
    'ae': { code: 'ae', name: 'الإمارات', flag: '🇦🇪' },

    'الكويت': { code: 'kw', name: 'الكويت', flag: '🇰🇼' },
    'kuwait': { code: 'kw', name: 'الكويت', flag: '🇰🇼' },
    'kw': { code: 'kw', name: 'الكويت', flag: '🇰🇼' },

    'قطر': { code: 'qa', name: 'قطر', flag: '🇶🇦' },
    'qatar': { code: 'qa', name: 'قطر', flag: '🇶🇦' },
    'qa': { code: 'qa', name: 'قطر', flag: '🇶🇦' },

    'البحرين': { code: 'bh', name: 'البحرين', flag: '🇧🇭' },
    'bahrain': { code: 'bh', name: 'البحرين', flag: '🇧🇭' },
    'bh': { code: 'bh', name: 'البحرين', flag: '🇧🇭' },

    'عمان': { code: 'om', name: 'عمان', flag: '🇴🇲' },
    'سلطنة عمان': { code: 'om', name: 'عمان', flag: '🇴🇲' },
    'oman': { code: 'om', name: 'عمان', flag: '🇴🇲' },
    'om': { code: 'om', name: 'عمان', flag: '🇴🇲' },

    'الأردن': { code: 'jo', name: 'الأردن', flag: '🇯🇴' },
    'الاردن': { code: 'jo', name: 'الأردن', flag: '🇯🇴' },
    'jordan': { code: 'jo', name: 'الأردن', flag: '🇯🇴' },
    'jo': { code: 'jo', name: 'الأردن', flag: '🇯🇴' },

    'العراق': { code: 'iq', name: 'العراق', flag: '🇮🇶' },
    'iraq': { code: 'iq', name: 'العراق', flag: '🇮🇶' },
    'iq': { code: 'iq', name: 'العراق', flag: '🇮🇶' },

    'سوريا': { code: 'sy', name: 'سوريا', flag: '🇸🇾' },
    'syria': { code: 'sy', name: 'سوريا', flag: '🇸🇾' },
    'sy': { code: 'sy', name: 'سوريا', flag: '🇸🇾' },

    'المغرب': { code: 'ma', name: 'المغرب', flag: '🇲🇦' },
    'morocco': { code: 'ma', name: 'المغرب', flag: '🇲🇦' },
    'ma': { code: 'ma', name: 'المغرب', flag: '🇲🇦' },

    'الجزائر': { code: 'dz', name: 'الجزائر', flag: '🇩🇿' },
    'algeria': { code: 'dz', name: 'الجزائر', flag: '🇩🇿' },
    'dz': { code: 'dz', name: 'الجزائر', flag: '🇩🇿' },

    'تونس': { code: 'tn', name: 'تونس', flag: '🇹🇳' },
    'tunisia': { code: 'tn', name: 'تونس', flag: '🇹🇳' },
    'tn': { code: 'tn', name: 'تونس', flag: '🇹🇳' },

    'ليبيا': { code: 'ly', name: 'ليبيا', flag: '🇱🇾' },
    'libya': { code: 'ly', name: 'ليبيا', flag: '🇱🇾' },
    'ly': { code: 'ly', name: 'ليبيا', flag: '🇱🇾' },

    'السودان': { code: 'sd', name: 'السودان', flag: '🇸🇩' },
    'sudan': { code: 'sd', name: 'السودان', flag: '🇸🇩' },
    'sd': { code: 'sd', name: 'السودان', flag: '🇸🇩' },

    'اليمن': { code: 'ye', name: 'اليمن', flag: '🇾🇪' },
    'yemen': { code: 'ye', name: 'اليمن', flag: '🇾🇪' },
    'ye': { code: 'ye', name: 'اليمن', flag: '🇾🇪' },

    'فلسطين': { code: 'ps', name: 'فلسطين', flag: '🇵🇸' },
    'palestine': { code: 'ps', name: 'فلسطين', flag: '🇵🇸' },
    'ps': { code: 'ps', name: 'فلسطين', flag: '🇵🇸' },

    'لبنان': { code: 'lb', name: 'لبنان', flag: '🇱🇧' },
    'lebanon': { code: 'lb', name: 'لبنان', flag: '🇱🇧' },
    'lb': { code: 'lb', name: 'لبنان', flag: '🇱🇧' },

    'موريتانيا': { code: 'mr', name: 'موريتانيا', flag: '🇲🇷' },
    'mauritania': { code: 'mr', name: 'موريتانيا', flag: '🇲🇷' },
    'mr': { code: 'mr', name: 'موريتانيا', flag: '🇲🇷' },

    // دول شائعة أخرى
    'تركيا': { code: 'tr', name: 'تركيا', flag: '🇹🇷' },
    'turkey': { code: 'tr', name: 'تركيا', flag: '🇹🇷' },
    'tr': { code: 'tr', name: 'تركيا', flag: '🇹🇷' },

    'إسبانيا': { code: 'es', name: 'إسبانيا', flag: '🇪🇸' },
    'اسبانيا': { code: 'es', name: 'إسبانيا', flag: '🇪🇸' },
    'spain': { code: 'es', name: 'إسبانيا', flag: '🇪🇸' },
    'es': { code: 'es', name: 'إسبانيا', flag: '🇪🇸' },

    'فرنسا': { code: 'fr', name: 'فرنسا', flag: '🇫🇷' },
    'france': { code: 'fr', name: 'فرنسا', flag: '🇫🇷' },
    'fr': { code: 'fr', name: 'فرنسا', flag: '🇫🇷' },

    'إنجلترا': { code: 'gb', name: 'إنجلترا', flag: '🇬🇧' },
    'بريطانيا': { code: 'gb', name: 'بريطانيا', flag: '🇬🇧' },
    'uk': { code: 'gb', name: 'بريطانيا', flag: '🇬🇧' },
    'gb': { code: 'gb', name: 'بريطانيا', flag: '🇬🇧' },

    'ألمانيا': { code: 'de', name: 'ألمانيا', flag: '🇩🇪' },
    'المانيا': { code: 'de', name: 'ألمانيا', flag: '🇩🇪' },
    'germany': { code: 'de', name: 'ألمانيا', flag: '🇩🇪' },
    'de': { code: 'de', name: 'ألمانيا', flag: '🇩🇪' },

    'إيطاليا': { code: 'it', name: 'إيطاليا', flag: '🇮🇹' },
    'ايطاليا': { code: 'it', name: 'إيطاليا', flag: '🇮🇹' },
    'italy': { code: 'it', name: 'إيطاليا', flag: '🇮🇹' },
    'it': { code: 'it', name: 'إيطاليا', flag: '🇮🇹' },

    'البرازيل': { code: 'br', name: 'البرازيل', flag: '🇧🇷' },
    'brazil': { code: 'br', name: 'البرازيل', flag: '🇧🇷' },
    'br': { code: 'br', name: 'البرازيل', flag: '🇧🇷' },

    'الأرجنتين': { code: 'ar', name: 'الأرجنتين', flag: '🇦🇷' },
    'الارجنتين': { code: 'ar', name: 'الأرجنتين', flag: '🇦🇷' },
    'argentina': { code: 'ar', name: 'الأرجنتين', flag: '🇦🇷' },
    'ar': { code: 'ar', name: 'الأرجنتين', flag: '🇦🇷' },

    'الولايات المتحدة': { code: 'us', name: 'الولايات المتحدة', flag: '🇺🇸' },
    'أمريكا': { code: 'us', name: 'أمريكا', flag: '🇺🇸' },
    'امريكا': { code: 'us', name: 'أمريكا', flag: '🇺🇸' },
    'usa': { code: 'us', name: 'أمريكا', flag: '🇺🇸' },
    'us': { code: 'us', name: 'أمريكا', flag: '🇺🇸' },
};

/**
 * البحث عن بيانات الدولة ومطابقتها من الاسم أو الرمز
 */
export function getCountryData(rawCountry?: string | null): CountryInfo | null {
    if (!rawCountry) return null;
    const clean = rawCountry.trim().toLowerCase();
    if (!clean) return null;

    // مطابقة مباشرة
    if (COUNTRY_MAP[clean]) {
        return COUNTRY_MAP[clean];
    }

    // مطابقة جزئية
    for (const [key, val] of Object.entries(COUNTRY_MAP)) {
        if (clean.includes(key) || key.includes(clean)) {
            return val;
        }
    }

    return null;
}

interface CountryFlagProps {
    country?: string | null;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    showName?: boolean;
    className?: string;
}

export function CountryFlag({
    country,
    size = 'sm',
    showName = false,
    className = '',
}: CountryFlagProps) {
    const [imgError, setImgError] = useState(false);
    const countryData = getCountryData(country);

    if (!countryData) {
        if (!country) return null;
        return (
            <span className={`inline-flex items-center gap-1 text-slate-500 text-[10px] ${className}`}>
                <span>🌐</span>
                {showName && <span>{country}</span>}
            </span>
        );
    }

    const sizeClasses = {
        xs: 'w-3.5 h-2.5',
        sm: 'w-4 h-3',
        md: 'w-5 h-3.5',
        lg: 'w-6 h-4',
    }[size];

    return (
        <span
            className={`inline-flex items-center gap-1 shrink-0 ${className}`}
            title={countryData.name}
        >
            {!imgError ? (
                <img
                    src={`https://flagcdn.com/w40/${countryData.code}.png`}
                    srcSet={`https://flagcdn.com/w80/${countryData.code}.png 2x`}
                    alt={countryData.name}
                    className={`${sizeClasses} object-cover rounded-xs border border-slate-300/80 shadow-2xs shrink-0`}
                    onError={() => setImgError(true)}
                    loading="lazy"
                />
            ) : (
                <span className="text-xs leading-none select-none">{countryData.flag}</span>
            )}
            {showName && <span className="truncate">{countryData.name}</span>}
        </span>
    );
}
