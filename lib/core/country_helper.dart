// ---------------------------------------------------------------------------
// country_helper.dart
// Localization helpers for country & city names (static dictionary – no AI,
// no network, works fully offline – same approach used by FIFA/Transfermarkt).
// ---------------------------------------------------------------------------

/// Returns a flag emoji for any country name (Arabic, English, ISO code).
String getCountryFlag(String? countryName) {
  if (countryName == null || countryName.trim().isEmpty) return '🌍';
  final n = countryName.trim().toLowerCase();

  if (n.contains('سعود') || n.contains('saudi') || n == 'sa') return '🇸🇦';
  if (n.contains('مصر') || n.contains('egypt') || n == 'eg') return '🇪🇬';
  if (n.contains('امارات') || n.contains('إمارات') || n.contains('uae') || n == 'ae') return '🇦🇪';
  if (n.contains('قطر') || n.contains('qatar') || n == 'qa') return '🇶🇦';
  if (n.contains('كويت') || n.contains('kuwait') || n == 'kw') return '🇰🇼';
  if (n.contains('بحرين') || n.contains('bahrain') || n == 'bh') return '🇧🇭';
  if (n.contains('عمان') || n.contains('oman') || n == 'om') return '🇴🇲';
  if (n.contains('اردن') || n.contains('أردن') || n.contains('jordan') || n == 'jo') return '🇯🇴';
  if (n.contains('مغرب') || n.contains('morocco') || n == 'ma') return '🇲🇦';
  if (n.contains('تونس') || n.contains('tunisia') || n == 'tn') return '🇹🇳';
  if (n.contains('جزائر') || n.contains('algeria') || n == 'dz') return '🇩🇿';
  if (n.contains('عراق') || n.contains('iraq') || n == 'iq') return '🇮🇶';
  if (n.contains('لبنان') || n.contains('lebanon') || n == 'lb') return '🇱🇧';
  if (n.contains('فلسطين') || n.contains('palestine') || n == 'ps') return '🇵🇸';
  if (n.contains('سوريا') || n.contains('syria') || n == 'sy') return '🇸🇾';
  if (n.contains('يمن') || n.contains('yemen') || n == 'ye') return '🇾🇪';
  if (n.contains('سودان') || n.contains('sudan') || n == 'sd') return '🇸🇩';
  if (n.contains('ليبيا') || n.contains('libya') || n == 'ly') return '🇱🇾';
  if (n.contains('موريتانيا') || n.contains('mauritania') || n == 'mr') return '🇲🇷';
  if (n.contains('صومال') || n.contains('somalia') || n == 'so') return '🇸🇴';
  if (n.contains('فرنسا') || n.contains('france') || n == 'fr') return '🇫🇷';
  if (n.contains('إسبانيا') || n.contains('اسبانيا') || n.contains('spain') || n == 'es') return '🇪🇸';
  if (n.contains('إنجلترا') || n.contains('انجلترا') || n.contains('england') || n == 'uk') return '🇬🇧';
  if (n.contains('برتغال') || n.contains('portugal') || n == 'pt') return '🇵🇹';
  if (n.contains('برازيل') || n.contains('brazil') || n == 'br') return '🇧🇷';
  if (n.contains('أرجنتين') || n.contains('ارجنتين') || n.contains('argentina') || n == 'ar') return '🇦🇷';

  return '🌍';
}

// ---------------------------------------------------------------------------
// Country name dictionary  {arabicKey: {locale: localizedName}}
// Normalised key = trimmed lowercase Arabic name (or English/code fallback).
// ---------------------------------------------------------------------------
const Map<String, Map<String, String>> _countryTranslations = {
  'مصر':        {'ar': 'مصر',         'en': 'Egypt',                'fr': 'Égypte',               'es': 'Egipto',         'pt': 'Egito'},
  'السعودية':   {'ar': 'السعودية',    'en': 'Saudi Arabia',         'fr': 'Arabie saoudite',      'es': 'Arabia Saudita', 'pt': 'Arábia Saudita'},
  'قطر':        {'ar': 'قطر',         'en': 'Qatar',                'fr': 'Qatar',                'es': 'Catar',          'pt': 'Catar'},
  'الإمارات':   {'ar': 'الإمارات',   'en': 'United Arab Emirates', 'fr': 'Émirats arabes unis',  'es': 'Emiratos Árabes Unidos', 'pt': 'Emirados Árabes'},
  'الامارات':   {'ar': 'الإمارات',   'en': 'United Arab Emirates', 'fr': 'Émirats arabes unis',  'es': 'Emiratos Árabes Unidos', 'pt': 'Emirados Árabes'},
  'المغرب':     {'ar': 'المغرب',      'en': 'Morocco',              'fr': 'Maroc',                'es': 'Marruecos',      'pt': 'Marrocos'},
  'الجزائر':    {'ar': 'الجزائر',     'en': 'Algeria',              'fr': 'Algérie',              'es': 'Argelia',        'pt': 'Argélia'},
  'تونس':       {'ar': 'تونس',        'en': 'Tunisia',              'fr': 'Tunisie',              'es': 'Túnez',          'pt': 'Tunísia'},
  'الكويت':     {'ar': 'الكويت',      'en': 'Kuwait',               'fr': 'Koweït',               'es': 'Kuwait',         'pt': 'Kuwait'},
  'البحرين':    {'ar': 'البحرين',     'en': 'Bahrain',              'fr': 'Bahreïn',              'es': 'Baréin',         'pt': 'Barein'},
  'عمان':       {'ar': 'عُمان',       'en': 'Oman',                 'fr': 'Oman',                 'es': 'Omán',           'pt': 'Omã'},
  'الأردن':     {'ar': 'الأردن',      'en': 'Jordan',               'fr': 'Jordanie',             'es': 'Jordania',       'pt': 'Jordânia'},
  'العراق':     {'ar': 'العراق',      'en': 'Iraq',                 'fr': 'Irak',                 'es': 'Irak',           'pt': 'Iraque'},
  'لبنان':      {'ar': 'لبنان',       'en': 'Lebanon',              'fr': 'Liban',                'es': 'Líbano',         'pt': 'Líbano'},
  'فلسطين':     {'ar': 'فلسطين',      'en': 'Palestine',            'fr': 'Palestine',            'es': 'Palestina',      'pt': 'Palestina'},
  'سوريا':      {'ar': 'سوريا',       'en': 'Syria',                'fr': 'Syrie',                'es': 'Siria',          'pt': 'Síria'},
  'اليمن':      {'ar': 'اليمن',       'en': 'Yemen',                'fr': 'Yémen',                'es': 'Yemen',          'pt': 'Iémen'},
  'السودان':    {'ar': 'السودان',     'en': 'Sudan',                'fr': 'Soudan',               'es': 'Sudán',          'pt': 'Sudão'},
  'ليبيا':      {'ar': 'ليبيا',       'en': 'Libya',                'fr': 'Libye',                'es': 'Libia',          'pt': 'Líbia'},
  'فرنسا':      {'ar': 'فرنسا',       'en': 'France',               'fr': 'France',               'es': 'Francia',        'pt': 'França'},
  'إسبانيا':    {'ar': 'إسبانيا',    'en': 'Spain',                'fr': 'Espagne',              'es': 'España',         'pt': 'Espanha'},
  'البرتغال':   {'ar': 'البرتغال',    'en': 'Portugal',             'fr': 'Portugal',             'es': 'Portugal',       'pt': 'Portugal'},
  'إنجلترا':    {'ar': 'إنجلترا',    'en': 'England',              'fr': 'Angleterre',           'es': 'Inglaterra',     'pt': 'Inglaterra'},
  'البرازيل':   {'ar': 'البرازيل',    'en': 'Brazil',               'fr': 'Brésil',               'es': 'Brasil',         'pt': 'Brasil'},
  'الأرجنتين':  {'ar': 'الأرجنتين',  'en': 'Argentina',            'fr': 'Argentine',            'es': 'Argentina',      'pt': 'Argentina'},
  'ألمانيا':    {'ar': 'ألمانيا',     'en': 'Germany',              'fr': 'Allemagne',            'es': 'Alemania',       'pt': 'Alemanha'},
  'إيطاليا':    {'ar': 'إيطاليا',    'en': 'Italy',                'fr': 'Italie',               'es': 'Italia',         'pt': 'Itália'},
  'هولندا':     {'ar': 'هولندا',      'en': 'Netherlands',          'fr': 'Pays-Bas',             'es': 'Países Bajos',   'pt': 'Países Baixos'},
  'بلجيكا':     {'ar': 'بلجيكا',      'en': 'Belgium',              'fr': 'Belgique',             'es': 'Bélgica',        'pt': 'Bélgica'},
  'تركيا':      {'ar': 'تركيا',       'en': 'Turkey',               'fr': 'Turquie',              'es': 'Turquía',        'pt': 'Turquia'},
  'الصين':      {'ar': 'الصين',       'en': 'China',                'fr': 'Chine',                'es': 'China',          'pt': 'China'},
  'اليابان':    {'ar': 'اليابان',     'en': 'Japan',                'fr': 'Japon',                'es': 'Japón',          'pt': 'Japão'},
  'كوريا':      {'ar': 'كوريا',       'en': 'South Korea',          'fr': 'Corée du Sud',         'es': 'Corea del Sur',  'pt': 'Coreia do Sul'},
};

// ---------------------------------------------------------------------------
// City name dictionary
// ---------------------------------------------------------------------------
const Map<String, Map<String, String>> _cityTranslations = {
  'القاهرة':     {'ar': 'القاهرة',     'en': 'Cairo',        'fr': 'Le Caire',     'es': 'El Cairo',     'pt': 'Cairo'},
  'الاسكندرية': {'ar': 'الإسكندرية', 'en': 'Alexandria',   'fr': 'Alexandrie',   'es': 'Alejandría',   'pt': 'Alexandria'},
  'الإسكندرية': {'ar': 'الإسكندرية', 'en': 'Alexandria',   'fr': 'Alexandrie',   'es': 'Alejandría',   'pt': 'Alexandria'},
  'الرياض':      {'ar': 'الرياض',      'en': 'Riyadh',       'fr': 'Riyad',        'es': 'Riad',         'pt': 'Riad'},
  'جدة':         {'ar': 'جدة',         'en': 'Jeddah',       'fr': 'Djeddah',      'es': 'Yeda',         'pt': 'Jidá'},
  'الدوحة':      {'ar': 'الدوحة',      'en': 'Doha',         'fr': 'Doha',         'es': 'Doha',         'pt': 'Doha'},
  'دبي':         {'ar': 'دبي',         'en': 'Dubai',        'fr': 'Dubaï',        'es': 'Dubái',        'pt': 'Dubai'},
  'أبوظبي':      {'ar': 'أبوظبي',      'en': 'Abu Dhabi',    'fr': 'Abou Dhabi',   'es': 'Abu Dabi',     'pt': 'Abu Dhabi'},
  'الكويت':      {'ar': 'الكويت',      'en': 'Kuwait City',  'fr': 'Koweït',       'es': 'Ciudad de Kuwait', 'pt': 'Cidade do Kuwait'},
  'المنامة':     {'ar': 'المنامة',     'en': 'Manama',       'fr': 'Manama',       'es': 'Manama',       'pt': 'Manama'},
  'مسقط':        {'ar': 'مسقط',        'en': 'Muscat',       'fr': 'Mascate',      'es': 'Mascate',      'pt': 'Mascate'},
  'عمان':        {'ar': 'عمّان',        'en': 'Amman',        'fr': 'Amman',        'es': 'Ammán',        'pt': 'Amã'},
  'بغداد':       {'ar': 'بغداد',       'en': 'Baghdad',      'fr': 'Bagdad',       'es': 'Bagdad',       'pt': 'Bagdá'},
  'بيروت':       {'ar': 'بيروت',       'en': 'Beirut',       'fr': 'Beyrouth',     'es': 'Beirut',       'pt': 'Beirute'},
  'دمشق':        {'ar': 'دمشق',        'en': 'Damascus',     'fr': 'Damas',        'es': 'Damasco',      'pt': 'Damasco'},
  'الدار البيضاء': {'ar': 'الدار البيضاء', 'en': 'Casablanca', 'fr': 'Casablanca', 'es': 'Casablanca',   'pt': 'Casablanca'},
  'الرباط':      {'ar': 'الرباط',      'en': 'Rabat',        'fr': 'Rabat',        'es': 'Rabat',        'pt': 'Rabat'},
  'تونس':        {'ar': 'تونس',        'en': 'Tunis',        'fr': 'Tunis',        'es': 'Túnez',        'pt': 'Tunes'},
  'الجزائر':     {'ar': 'الجزائر',     'en': 'Algiers',      'fr': 'Alger',        'es': 'Argel',        'pt': 'Argel'},
  'طرابلس':      {'ar': 'طرابلس',      'en': 'Tripoli',      'fr': 'Tripoli',      'es': 'Trípoli',      'pt': 'Trípoli'},
  'الخرطوم':     {'ar': 'الخرطوم',     'en': 'Khartoum',     'fr': 'Khartoum',     'es': 'Jartum',       'pt': 'Cartum'},
  'باريس':       {'ar': 'باريس',       'en': 'Paris',        'fr': 'Paris',        'es': 'París',        'pt': 'Paris'},
  'مدريد':       {'ar': 'مدريد',       'en': 'Madrid',       'fr': 'Madrid',       'es': 'Madrid',       'pt': 'Madri'},
  'برشلونة':     {'ar': 'برشلونة',     'en': 'Barcelona',    'fr': 'Barcelone',    'es': 'Barcelona',    'pt': 'Barcelona'},
  'لشبونة':      {'ar': 'لشبونة',      'en': 'Lisbon',       'fr': 'Lisbonne',     'es': 'Lisboa',       'pt': 'Lisboa'},
  'لندن':        {'ar': 'لندن',        'en': 'London',       'fr': 'Londres',      'es': 'Londres',      'pt': 'Londres'},
  'مانشستر':     {'ar': 'مانشستر',     'en': 'Manchester',   'fr': 'Manchester',   'es': 'Mánchester',   'pt': 'Manchester'},
};

/// Translate a country name to the given locale (ar/en/fr/es/pt).
/// Falls back to the original name if no match is found.
String localizeCountry(String? name, String locale) {
  if (name == null || name.trim().isEmpty) return name ?? '';
  final key = name.trim();
  // Try direct key match first
  final entry = _countryTranslations[key];
  if (entry != null) return entry[locale] ?? entry['en'] ?? key;
  // Try lowercase partial match
  final lower = key.toLowerCase();
  for (final e in _countryTranslations.entries) {
    if (lower.contains(e.key.toLowerCase()) ||
        e.key.toLowerCase().contains(lower)) {
      return e.value[locale] ?? e.value['en'] ?? key;
    }
  }
  return key;
}

/// Translate a city name to the given locale (ar/en/fr/es/pt).
/// Falls back to the original name if no match is found.
String localizeCity(String? name, String locale) {
  if (name == null || name.trim().isEmpty) return name ?? '';
  final key = name.trim();
  final entry = _cityTranslations[key];
  if (entry != null) return entry[locale] ?? entry['en'] ?? key;
  final lower = key.toLowerCase();
  for (final e in _cityTranslations.entries) {
    if (lower.contains(e.key.toLowerCase()) ||
        e.key.toLowerCase().contains(lower)) {
      return e.value[locale] ?? e.value['en'] ?? key;
    }
  }
  return key;
}

