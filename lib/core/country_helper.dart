/// Helper to get flag emoji for any country name (Arabic or English)
String getCountryFlag(String? countryName) {
  if (countryName == null || countryName.trim().isEmpty) return '🌍';
  final name = countryName.trim().toLowerCase();

  if (name.contains('سعود') || name.contains('saudi') || name == 'sa' || name.contains('السعودية')) return '🇸🇦';
  if (name.contains('مصر') || name.contains('egypt') || name == 'eg') return '🇪🇬';
  if (name.contains('امارات') || name.contains('إمارات') || name.contains('uae') || name == 'ae') return '🇦🇪';
  if (name.contains('قطر') || name.contains('qatar') || name == 'qa') return '🇶🇦';
  if (name.contains('كويت') || name.contains('kuwait') || name == 'kw') return '🇰🇼';
  if (name.contains('بحرين') || name.contains('bahrain') || name == 'bh') return '🇧🇭';
  if (name.contains('عمان') || name.contains('oman') || name == 'om') return '🇴🇲';
  if (name.contains('اردن') || name.contains('أردن') || name.contains('jordan') || name == 'jo') return '🇯🇴';
  if (name.contains('مغرب') || name.contains('morocco') || name == 'ma') return '🇲🇦';
  if (name.contains('تونس') || name.contains('tunisia') || name == 'tn') return '🇹🇳';
  if (name.contains('جزائر') || name.contains('algeria') || name == 'dz') return '🇩🇿';
  if (name.contains('عراق') || name.contains('iraq') || name == 'iq') return '🇮🇶';
  if (name.contains('لبنان') || name.contains('lebanon') || name == 'lb') return '🇱🇧';
  if (name.contains('فلسطين') || name.contains('palestine') || name == 'ps') return '🇵🇸';
  if (name.contains('سوريا') || name.contains('syria') || name == 'sy') return '🇸🇾';
  if (name.contains('يمن') || name.contains('yemen') || name == 'ye') return '🇾🇪';
  if (name.contains('سودان') || name.contains('sudan') || name == 'sd') return '🇸🇩';
  if (name.contains('ليبيا') || name.contains('libya') || name == 'ly') return '🇱🇾';
  if (name.contains('موريتانيا') || name.contains('mauritania') || name == 'mr') return '🇲🇷';
  if (name.contains('صومال') || name.contains('somalia') || name == 'so') return '🇸🇴';
  if (name.contains('فرنسا') || name.contains('france') || name == 'fr') return '🇫🇷';
  if (name.contains('إسبانيا') || name.contains('اسبانيا') || name.contains('spain') || name == 'es') return '🇪🇸';
  if (name.contains('إنجلترا') || name.contains('انجلترا') || name.contains('england') || name == 'uk') return '🇬🇧';
  if (name.contains('برتغال') || name.contains('portugal') || name == 'pt') return '🇵🇹';
  if (name.contains('برازيل') || name.contains('brazil') || name == 'br') return '🇧🇷';
  if (name.contains('أرجنتين') || name.contains('ارجنتين') || name.contains('argentina') || name == 'ar') return '🇦🇷';

  return '🌍';
}
