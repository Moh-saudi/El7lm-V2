import 'package:country_picker/country_picker.dart';
import 'package:flutter/material.dart';

/// Static reference data for the player profile form.
/// Keys and enum values mirror the web schema (profile.ts) exactly
/// so that data saved on mobile is perfectly compatible with the web.

// ─── Positions (using standard codes to match web schema) ─────────────────────
const kPositionCodes = [
  'GK',
  'SW',
  'CB',
  'LB',
  'RB',
  'LWB',
  'RWB',
  'CDM',
  'CM',
  'LM',
  'RM',
  'CAM',
  'LW',
  'RW',
  'SS',
  'CF',
  'ST',
];

/// Human-readable Arabic labels aligned with web translations.
const kPositionLabels = {
  'GK': 'حارس مرمى',
  'SW': 'ليبرو',
  'CB': 'قلب دفاع',
  'LB': 'ظهير أيسر',
  'RB': 'ظهير أيمن',
  'LWB': 'ظهير جناح أيسر',
  'RWB': 'ظهير جناح أيمن',
  'CDM': 'وسط دفاعي',
  'CM': 'لاعب وسط',
  'LM': 'وسط أيسر',
  'RM': 'وسط أيمن',
  'CAM': 'وسط مهاجم',
  'LW': 'جناح أيسر',
  'RW': 'جناح أيمن',
  'SS': 'مهاجم ثانٍ',
  'CF': 'مهاجم متأخر',
  'ST': 'مهاجم مركزي',
};

// ─── Foot Preference (must match web enum: right/left/both) ───────────────────
const kFoot = ['right', 'left', 'both'];
const kFootLabels = {'right': 'يمين', 'left': 'يسار', 'both': 'كلاهما'};

// ─── Contract Status (must match web enum: free/contracted/loan) ──────────────
const kContractStatus = ['free', 'contracted', 'loan'];
const kContractStatusLabels = {
  'free': 'بدون عقد',
  'contracted': 'متعاقد',
  'loan': 'مُعار',
};

// ─── Gender (must match web enum: male/female) ────────────────────────────────
const kGender = ['male', 'female'];
const kGenderLabels = {'male': 'ذكر', 'female': 'أنثى'};

// ─── Education Levels (must match web enum values) ────────────────────────────
const kEducationLevels = [
  'primary',
  'middle',
  'high_school',
  'diploma',
  'bachelors',
  'masters',
  'phd',
];
const kEducationLevelLabels = {
  'primary': 'ابتدائي',
  'middle': 'متوسط',
  'high_school': 'ثانوي',
  'diploma': 'دبلوم',
  'bachelors': 'بكالوريوس',
  'masters': 'ماجستير',
  'phd': 'دكتوراه',
};

bool educationUsesSchool(String level) => const {
  'primary',
  'middle',
  'high_school',
  'diploma',
}.contains(level.trim());

bool educationUsesUniversity(String level) =>
    const {'bachelors', 'masters', 'phd'}.contains(level.trim());

// ─── Work Rate (must match web enum: Low/Medium/High) ────────────────────────
const kWorkRate = ['Low', 'Medium', 'High'];
const kWorkRateLabels = {'Low': 'منخفض', 'Medium': 'متوسط', 'High': 'عالي'};

// ─── Blood Types ──────────────────────────────────────────────────────────────
const kBloodTypes = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

// ─── Clothing Sizes (must match web enum) ─────────────────────────────────────
const kClothingSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// ─── Countries (Arabic names — stored as Arabic, same as web) ─────────────────
const kCountries = [
  'السعودية',
  'الإمارات',
  'الكويت',
  'قطر',
  'البحرين',
  'عمان',
  'مصر',
  'الأردن',
  'لبنان',
  'العراق',
  'سوريا',
  'المغرب',
  'الجزائر',
  'تونس',
  'ليبيا',
  'السودان',
  'السنغال',
  'ساحل العاج',
  'جيبوتي',
  'إسبانيا',
  'فرنسا',
  'إنجلترا',
  'البرتغال',
  'إيطاليا',
  'اليونان',
  'قبرص',
  'تركيا',
  'تايلاند',
  'اليمن',
  'أمريكا',
  'الفلبين',
  'اليابان',
  'الهند',
  'الصين',
  'كوريا',
  'إيران',
  'باكستان',
  'أوزبكستان',
  'أفغانستان',
  'روسيا',
  'أوكرانيا',
  'ألمانيا',
  'هولندا',
  'بلجيكا',
  'سويسرا',
  'النمسا',
  'السويد',
  'النرويج',
  'الدنمارك',
  'فنلندا',
  'بولندا',
  'التشيك',
  'المجر',
  'رومانيا',
  'بلغاريا',
  'كرواتيا',
  'صربيا',
  'ألبانيا',
  'كندا',
  'المكسيك',
  'البرازيل',
  'الأرجنتين',
  'تشيلي',
  'كولومبيا',
  'بيرو',
  'فنزويلا',
  'أستراليا',
  'نيوزيلندا',
  'جنوب أفريقيا',
  'كينيا',
  'نيجيريا',
  'غانا',
  'تنزانيا',
  'أوغندا',
  'إثيوبيا',
  'إندونيسيا',
  'ماليزيا',
  'سنغافورة',
  'فيتنام',
  'كمبوديا',
  'لاوس',
  'ميانمار',
  'بنغلاديش',
  'سريلانكا',
  'نيبال',
  'بوتان',
  'منغوليا',
  'كازاخستان',
  'قيرغيزستان',
  'طاجيكستان',
  'تركمانستان',
  'أذربيجان',
  'أرمينيا',
  'جورجيا',
  'بيلاروسيا',
  'مولدوفا',
  'ليتوانيا',
  'لاتفيا',
  'إستونيا',
  'سلوفاكيا',
  'سلوفينيا',
  'البوسنة والهرسك',
  'الجبل الأسود',
  'مقدونيا',
  'أيسلندا',
  'أيرلندا',
  'لوكسمبورغ',
  'مالطا',
];

String canonicalCountryStorageValue(String isoCode) {
  final normalizedCode = isoCode.toUpperCase();
  for (final storedName in kCountries) {
    if (Country.tryParse(storedName)?.countryCode == normalizedCode) {
      return storedName;
    }
  }
  return _countryStorageAliases[normalizedCode] ?? isoCode;
}

const _countryStorageAliases = <String, String>{
  'AE': 'الإمارات',
  'GB': 'إنجلترا',
  'US': 'أمريكا',
  'KR': 'كوريا',
  'CI': 'ساحل العاج',
  'CZ': 'التشيك',
  'MK': 'مقدونيا',
  'RU': 'روسيا',
  'TW': 'الصين',
};

List<String> get supportedCountryIsoCodes {
  final codes = <String>{..._countryStorageAliases.keys};
  for (final storedName in kCountries) {
    final code = Country.tryParse(storedName)?.countryCode;
    if (code != null && code.isNotEmpty) codes.add(code);
  }
  return codes.toList(growable: false);
}

/// Mirrors the city dependency used by the web player form. Values remain in
/// the canonical Arabic storage format so web and mobile save compatible data.
const kCitiesByCountry = <String, List<String>>{
  'السعودية': [
    'الرياض',
    'جدة',
    'مكة المكرمة',
    'المدينة المنورة',
    'الدمام',
    'الخبر',
    'الظهران',
    'الهفوف',
    'الأحساء',
    'الطائف',
    'تبوك',
    'حائل',
    'نجران',
    'جازان',
    'أبها',
    'خميس مشيط',
    'ينبع',
    'الجبيل',
    'القطيف',
    'عرعر',
    'الباحة',
    'سكاكا',
    'بيشة',
  ],
  'الإمارات': [
    'أبوظبي',
    'دبي',
    'الشارقة',
    'العين',
    'عجمان',
    'رأس الخيمة',
    'الفجيرة',
    'أم القيوين',
  ],
  'الكويت': [
    'مدينة الكويت',
    'حولي',
    'الفروانية',
    'الأحمدي',
    'الجهراء',
    'مبارك الكبير',
  ],
  'قطر': [
    'الدوحة',
    'الوكرة',
    'الخور',
    'الريان',
    'أم صلال',
    'الظعاين',
    'الشحانية',
    'دخان',
  ],
  'البحرين': ['المنامة', 'المحرق', 'الرفاع', 'مدينة عيسى', 'مدينة حمد', 'سترة'],
  'عمان': [
    'مسقط',
    'صلالة',
    'صحار',
    'نزوى',
    'صور',
    'عبري',
    'البريمي',
    'بدية',
    'خصب',
    'الرستاق',
    'إبراء',
  ],
  'مصر': [
    'القاهرة',
    'الجيزة',
    'الإسكندرية',
    'الدقهلية',
    'البحر الأحمر',
    'البحيرة',
    'الفيوم',
    'الغربية',
    'الإسماعيلية',
    'المنوفية',
    'المنيا',
    'القليوبية',
    'الوادي الجديد',
    'السويس',
    'أسوان',
    'أسيوط',
    'بني سويف',
    'بورسعيد',
    'دمياط',
    'الشرقية',
    'جنوب سيناء',
    'كفر الشيخ',
    'مطروح',
    'الأقصر',
    'قنا',
    'شمال سيناء',
    'سوهاج',
  ],
  'الأردن': [
    'عمّان',
    'إربد',
    'الزرقاء',
    'العقبة',
    'السلط',
    'المفرق',
    'جرش',
    'الكرك',
  ],
  'لبنان': ['بيروت', 'طرابلس', 'صيدا', 'صور', 'بعلبك', 'زحلة', 'جونية'],
  'العراق': [
    'بغداد',
    'البصرة',
    'الموصل',
    'أربيل',
    'السليمانية',
    'النجف',
    'كربلاء',
    'كركوك',
  ],
  'سوريا': [
    'دمشق',
    'حلب',
    'حمص',
    'حماة',
    'اللاذقية',
    'طرطوس',
    'دير الزور',
    'الرقة',
    'السويداء',
  ],
  'المغرب': [
    'الرباط',
    'الدار البيضاء',
    'فاس',
    'مراكش',
    'طنجة',
    'مكناس',
    'وجدة',
    'أكادير',
    'تطوان',
    'آسفي',
  ],
  'الجزائر': [
    'الجزائر',
    'وهران',
    'قسنطينة',
    'عنابة',
    'تلمسان',
    'بجاية',
    'باتنة',
  ],
  'تونس': ['تونس', 'صفاقس', 'سوسة', 'بنزرت', 'القيروان', 'نابل'],
  'ليبيا': ['طرابلس', 'بنغازي', 'مصراتة', 'سبها', 'سرت', 'البيضاء'],
  'السودان': [
    'الخرطوم',
    'أم درمان',
    'بحري',
    'مدني',
    'بورتسودان',
    'كسلا',
    'القضارف',
    'عطبرة',
  ],
  'إسبانيا': ['مدريد', 'برشلونة', 'فالنسيا', 'إشبيلية', 'بلباو', 'ملقا'],
  'فرنسا': ['باريس', 'مارسيليا', 'ليون', 'ليل', 'نيس', 'تولوز'],
  'إنجلترا': ['لندن', 'مانشستر', 'ليفربول', 'برمنغهام', 'ليدز', 'نيوكاسل'],
  'البرتغال': ['لشبونة', 'بورتو', 'براغا', 'فارو', 'كويمبرا', 'أفيرو'],
  'إيطاليا': ['روما', 'ميلانو', 'نابولي', 'تورينو', 'فلورنسا', 'جنوة'],
  'اليونان': ['أثينا', 'سالونيك', 'باتراس', 'لاريسا'],
  'قبرص': ['نيقوسيا', 'ليماسول', 'لارنكا', 'بافوس'],
  'تركيا': ['إسطنبول', 'أنقرة', 'إزمير', 'بورصة', 'أنطاليا', 'قونية'],
  'تايلاند': ['بانكوك', 'فوكيت', 'تشيانغ ماي', 'باتايا'],
  'اليمن': ['صنعاء', 'عدن', 'تعز', 'الحديدة', 'المكلا', 'إب'],
  'أمريكا': [
    'نيويورك',
    'لوس أنجلوس',
    'شيكاغو',
    'هيوستن',
    'فينيكس',
    'فيلادلفيا',
    'سان أنطونيو',
    'سان دييغو',
    'دالاس',
    'سان خوسيه',
    'أوستن',
    'سان فرانسيسكو',
    'واشنطن',
    'بوسطن',
  ],
  'الصين': [
    'بكين',
    'شنغهاي',
    'غوانزو',
    'شنتشن',
    'تيانجين',
    'ووهان',
    'تشنغدو',
    'نانجينغ',
    'هانغتشو',
  ],
};

List<String> citiesForCountry(String countryValue) {
  final canonical = kCountries.contains(countryValue)
      ? countryValue
      : canonicalCountryStorageValue(countryValue);
  if (canonical.isEmpty) return const [];
  return kCitiesByCountry[canonical] ?? const ['أخرى'];
}

String localizedCityLabel(BuildContext context, String value) {
  final language = Localizations.localeOf(context).languageCode;
  if (language == 'ar') return value;
  if (value == 'أخرى') {
    return switch (language) {
      'es' => 'Otra',
      'pt' => 'Outra',
      'fr' => 'Autre',
      _ => 'Other',
    };
  }
  const letters = <String, String>{
    'ا': 'a',
    'أ': 'a',
    'إ': 'i',
    'آ': 'aa',
    'ب': 'b',
    'ت': 't',
    'ث': 'th',
    'ج': 'j',
    'ح': 'h',
    'خ': 'kh',
    'د': 'd',
    'ذ': 'dh',
    'ر': 'r',
    'ز': 'z',
    'س': 's',
    'ش': 'sh',
    'ص': 's',
    'ض': 'd',
    'ط': 't',
    'ظ': 'z',
    'ع': 'a',
    'غ': 'gh',
    'ف': 'f',
    'ق': 'q',
    'ك': 'k',
    'ل': 'l',
    'م': 'm',
    'ن': 'n',
    'ه': 'h',
    'و': 'w',
    'ي': 'y',
    'ى': 'a',
    'ة': 'a',
    'ء': '',
    'ؤ': 'w',
    'ئ': 'y',
  };
  final result = value.split('').map((c) => letters[c] ?? c).join();
  return result.isEmpty
      ? value
      : '${result[0].toUpperCase()}${result.substring(1)}';
}

/// Returns human-readable label for a dropdown code.
String positionLabel(String code) => kPositionLabels[code] ?? code;
String footLabel(String code) => kFootLabels[code] ?? code;
String contractLabel(String code) => kContractStatusLabels[code] ?? code;
String genderLabel(String code) => kGenderLabels[code] ?? code;
String educationLabel(String code) => kEducationLevelLabels[code] ?? code;
String workRateLabel(String code) => kWorkRateLabels[code] ?? code;

String localizedProfileOptionLabel(
  BuildContext context,
  String fieldKey,
  String value,
) {
  if (fieldKey == 'country' || fieldKey == 'nationality') {
    final country = Country.tryParse(value);
    return country?.getTranslatedName(context) ?? value;
  }

  final group = switch (fieldKey) {
    'position' || 'secondary_position' => 'position',
    'foot' => 'foot',
    'contract_status' => 'contract',
    'gender' => 'gender',
    'education_level' => 'education',
    'work_rate_attack' || 'work_rate_defense' => 'workRate',
    _ => '',
  };
  if (group.isEmpty) return value;
  final fallback = switch (fieldKey) {
    'position' || 'secondary_position' => positionLabel(value),
    'foot' => footLabel(value),
    'contract_status' => contractLabel(value),
    'gender' => genderLabel(value),
    'education_level' => educationLabel(value),
    'work_rate_attack' || 'work_rate_defense' => workRateLabel(value),
    _ => value,
  };
  final language = Localizations.localeOf(context).languageCode;
  return _profileOptionTranslations[language]?['$group.$value'] ?? fallback;
}

/// Converts legacy/localized labels back to the stable schema value used by
/// filters and persistence. This prevents Arabic, English, French, Spanish and
/// Portuguese labels for the same option from appearing as duplicates.
String canonicalProfileOptionValue(String fieldKey, String value) {
  final raw = _normalizedOptionText(value);
  if (raw.isEmpty) return '';
  if (fieldKey == 'country' || fieldKey == 'nationality') {
    return Country.tryParse(value)?.countryCode.toUpperCase() ?? value.trim();
  }
  final group = switch (fieldKey) {
    'position' || 'secondary_position' => 'position',
    'education' || 'education_level' => 'education',
    _ => '',
  };
  final values = switch (group) {
    'position' => kPositionCodes,
    'education' => kEducationLevels,
    _ => const <String>[],
  };
  for (final code in values) {
    final labels = <String>{
      code,
      if (group == 'position') positionLabel(code),
      if (group == 'education') educationLabel(code),
    };
    for (final translations in _profileOptionTranslations.values) {
      final translated = translations['$group.$code'];
      if (translated != null) labels.add(translated);
    }
    if (labels.any((label) => _normalizedOptionText(label) == raw)) {
      return code;
    }
  }
  return value.trim();
}

String _normalizedOptionText(String value) => value
    .trim()
    .toLowerCase()
    .replaceAll(RegExp(r'[\u064B-\u065F\u0670]'), '')
    .replaceAll('أ', 'ا')
    .replaceAll('إ', 'ا')
    .replaceAll('آ', 'ا')
    .replaceAll('ى', 'ي')
    .replaceAll(RegExp(r'[_\-\s]+'), ' ');

const _profileOptionTranslations = <String, Map<String, String>>{
  'en': {
    'position.GK': 'Goalkeeper',
    'position.SW': 'Sweeper',
    'position.CB': 'Center Back',
    'position.LB': 'Left Back',
    'position.RB': 'Right Back',
    'position.LWB': 'Left Wing-Back',
    'position.RWB': 'Right Wing-Back',
    'position.CDM': 'Defensive Midfielder',
    'position.CM': 'Central Midfielder',
    'position.LM': 'Left Midfielder',
    'position.RM': 'Right Midfielder',
    'position.CAM': 'Attacking Midfielder',
    'position.LW': 'Left Winger',
    'position.RW': 'Right Winger',
    'position.SS': 'Second Striker',
    'position.CF': 'Center Forward',
    'position.ST': 'Center Forward',
    'foot.right': 'Right',
    'foot.left': 'Left',
    'foot.both': 'Both',
    'contract.free': 'Free Agent',
    'contract.contracted': 'Contracted',
    'contract.loan': 'On Loan',
    'gender.male': 'Male',
    'gender.female': 'Female',
    'education.primary': 'Primary School',
    'education.middle': 'Middle School',
    'education.high_school': 'High School',
    'education.diploma': 'Diploma',
    'education.bachelors': "Bachelor's Degree",
    'education.masters': "Master's Degree",
    'education.phd': 'PhD',
    'workRate.Low': 'Low',
    'workRate.Medium': 'Medium',
    'workRate.High': 'High',
  },
  'es': {
    'position.GK': 'Portero',
    'position.SW': 'Líbero',
    'position.CB': 'Defensa central',
    'position.LB': 'Lateral izquierdo',
    'position.RB': 'Lateral derecho',
    'position.LWB': 'Carrilero izquierdo',
    'position.RWB': 'Carrilero derecho',
    'position.CDM': 'Mediocentro defensivo',
    'position.CM': 'Mediocentro',
    'position.LM': 'Centrocampista izquierdo',
    'position.RM': 'Centrocampista derecho',
    'position.CAM': 'Mediocentro ofensivo',
    'position.LW': 'Extremo izquierdo',
    'position.RW': 'Extremo derecho',
    'position.SS': 'Segundo delantero',
    'position.CF': 'Mediapunta',
    'position.ST': 'Delantero centro',
    'foot.right': 'Derecho',
    'foot.left': 'Izquierdo',
    'foot.both': 'Ambos',
    'contract.free': 'Agente libre',
    'contract.contracted': 'Con contrato',
    'contract.loan': 'Cedido',
    'gender.male': 'Masculino',
    'gender.female': 'Femenino',
    'education.primary': 'Primaria',
    'education.middle': 'Secundaria básica',
    'education.high_school': 'Bachillerato',
    'education.diploma': 'Diploma',
    'education.bachelors': 'Licenciatura',
    'education.masters': 'Máster',
    'education.phd': 'Doctorado',
    'workRate.Low': 'Bajo',
    'workRate.Medium': 'Medio',
    'workRate.High': 'Alto',
  },
  'pt': {
    'position.GK': 'Guarda-redes',
    'position.SW': 'Líbero',
    'position.CB': 'Defesa central',
    'position.LB': 'Lateral esquerdo',
    'position.RB': 'Lateral direito',
    'position.LWB': 'Ala esquerdo',
    'position.RWB': 'Ala direito',
    'position.CDM': 'Médio defensivo',
    'position.CM': 'Médio centro',
    'position.LM': 'Médio esquerdo',
    'position.RM': 'Médio direito',
    'position.CAM': 'Médio ofensivo',
    'position.LW': 'Extremo esquerdo',
    'position.RW': 'Extremo direito',
    'position.SS': 'Segundo avançado',
    'position.CF': 'Avançado recuado',
    'position.ST': 'Ponta de lança',
    'foot.right': 'Direito',
    'foot.left': 'Esquerdo',
    'foot.both': 'Ambos',
    'contract.free': 'Jogador livre',
    'contract.contracted': 'Contratado',
    'contract.loan': 'Emprestado',
    'gender.male': 'Masculino',
    'gender.female': 'Feminino',
    'education.primary': 'Ensino primário',
    'education.middle': 'Ensino básico',
    'education.high_school': 'Ensino secundário',
    'education.diploma': 'Diploma',
    'education.bachelors': 'Licenciatura',
    'education.masters': 'Mestrado',
    'education.phd': 'Doutoramento',
    'workRate.Low': 'Baixo',
    'workRate.Medium': 'Médio',
    'workRate.High': 'Alto',
  },
  'fr': {
    'position.GK': 'Gardien de but',
    'position.SW': 'Libéro',
    'position.CB': 'Défenseur central',
    'position.LB': 'Arrière gauche',
    'position.RB': 'Arrière droit',
    'position.LWB': 'Piston gauche',
    'position.RWB': 'Piston droit',
    'position.CDM': 'Milieu défensif',
    'position.CM': 'Milieu central',
    'position.LM': 'Milieu gauche',
    'position.RM': 'Milieu droit',
    'position.CAM': 'Milieu offensif',
    'position.LW': 'Ailier gauche',
    'position.RW': 'Ailier droit',
    'position.SS': 'Deuxième attaquant',
    'position.CF': 'Avant-centre',
    'position.ST': 'Buteur',
    'foot.right': 'Droit',
    'foot.left': 'Gauche',
    'foot.both': 'Les deux',
    'contract.free': 'Joueur libre',
    'contract.contracted': 'Sous contrat',
    'contract.loan': 'En prêt',
    'gender.male': 'Homme',
    'gender.female': 'Femme',
    'education.primary': 'École primaire',
    'education.middle': 'Collège',
    'education.high_school': 'Lycée',
    'education.diploma': 'Diplôme',
    'education.bachelors': 'Licence',
    'education.masters': 'Master',
    'education.phd': 'Doctorat',
    'workRate.Low': 'Faible',
    'workRate.Medium': 'Moyen',
    'workRate.High': 'Élevé',
  },
};

class ProfileSection {
  const ProfileSection(this.key, this.title, this.icon, this.fields);
  final String key;
  final String title;
  final IconData icon;
  final List<ProfileField> fields;
}

class ProfileField {
  const ProfileField(
    this.key,
    this.label, {
    this.multiline = false,
    this.required = false,
    this.options,
    this.labelFor,
    this.isSlider = false,
    this.isStar = false,
  });

  final String key;
  final String label;
  final bool multiline;
  final bool required;
  final List<String>? options;
  final String Function(String code)? labelFor;
  final bool isSlider;
  final bool isStar;
}

List<ProfileSection> getProfileSections() {
  return [
    // ── 1. Personal ────────────────────────────────────────────────────────────
    ProfileSection('personal', 'profile.section.personal', Icons.person, [
      const ProfileField('name', 'profile.field.name', required: true),
      ProfileField(
        'gender',
        'profile.field.gender',
        options: kGender,
        labelFor: genderLabel,
      ),
      const ProfileField(
        'nationality',
        'profile.field.nationality',
        options: kCountries,
      ),
      const ProfileField('birth_date', 'profile.field.birth_date'),
      const ProfileField(
        'country',
        'profile.field.country',
        options: kCountries,
      ),
      const ProfileField('city', 'profile.field.city'),
      const ProfileField('address', 'profile.field.address'),
      const ProfileField('phone', 'profile.field.phone'),
      const ProfileField('whatsapp', 'profile.field.whatsapp'),
      const ProfileField('email', 'profile.field.email'),
      const ProfileField('brief', 'profile.field.bio', multiline: true),
      const ProfileField('guardian_name', 'profile.field.guardian_name'),
      const ProfileField('guardian_phone', 'profile.field.guardian_phone'),
    ]),
    // ── 2. Education ────────────────────────────────────────────────────────────
    ProfileSection('education', 'profile.section.education', Icons.school, [
      ProfileField(
        'education_level',
        'profile.field.education_level',
        options: kEducationLevels,
        labelFor: educationLabel,
      ),
      const ProfileField('school_name', 'profile.field.school_name'),
      const ProfileField('graduation_year', 'profile.field.graduation_year'),
      const ProfileField('university_name', 'profile.field.university_name'),
      const ProfileField(
        'languages',
        'profile.field.languages',
        multiline: true,
      ),
      const ProfileField('courses', 'profile.field.courses', multiline: true),
    ]),
    // ── 3. Sports Career ────────────────────────────────────────────────────────
    ProfileSection('career', 'profile.section.career', Icons.sports_soccer, [
      const ProfileField('current_club', 'profile.field.current_club'),
      ProfileField(
        'position',
        'profile.field.position',
        options: kPositionCodes,
        labelFor: positionLabel,
      ),
      ProfileField(
        'secondary_position',
        'profile.field.secondary_position',
        options: kPositionCodes,
        labelFor: positionLabel,
      ),
      ProfileField(
        'foot',
        'profile.field.foot',
        options: kFoot,
        labelFor: footLabel,
      ),
      ProfileField(
        'contract_status',
        'profile.field.contract_status',
        options: kContractStatus,
        labelFor: contractLabel,
      ),
      const ProfileField(
        'contract_end_date',
        'profile.field.contract_end_date',
      ),
      const ProfileField('market_value', 'profile.field.market_value'),
      const ProfileField(
        'club_history',
        'profile.field.club_history',
        multiline: true,
      ),
      const ProfileField(
        'achievements',
        'profile.field.achievements',
        multiline: true,
      ),
      const ProfileField('caps', 'profile.field.caps'),
      const ProfileField('goals', 'profile.field.goals'),
      const ProfileField('assists', 'profile.field.assists'),
    ]),
    // ── 4. Measurements ─────────────────────────────────────────────────────────
    ProfileSection(
      'measurements',
      'profile.section.measurements',
      Icons.straighten,
      [
        const ProfileField('height', 'profile.field.height'),
        const ProfileField('weight', 'profile.field.weight'),
        const ProfileField('jersey_number', 'profile.field.jersey_number'),
        const ProfileField('shoe_size', 'profile.field.shoe_size'),
        ProfileField(
          'clothing_size',
          'profile.field.clothing_size',
          options: kClothingSizes,
        ),
      ],
    ),
    // ── 5. Skills ────────────────────────────────────────────────────────────────
    ProfileSection('skills', 'profile.section.skills', Icons.bolt, [
      const ProfileField(
        'stats_pace',
        'profile.field.stats_pace',
        isSlider: true,
      ),
      const ProfileField(
        'stats_shooting',
        'profile.field.stats_shooting',
        isSlider: true,
      ),
      const ProfileField(
        'stats_passing',
        'profile.field.stats_passing',
        isSlider: true,
      ),
      const ProfileField(
        'stats_dribbling',
        'profile.field.stats_dribbling',
        isSlider: true,
      ),
      const ProfileField(
        'stats_defending',
        'profile.field.stats_defending',
        isSlider: true,
      ),
      const ProfileField(
        'stats_physical',
        'profile.field.stats_physical',
        isSlider: true,
      ),
      const ProfileField('weak_foot', 'profile.field.weak_foot', isStar: true),
      const ProfileField(
        'skill_moves',
        'profile.field.skill_moves',
        isStar: true,
      ),
      ProfileField(
        'work_rate_attack',
        'profile.field.work_rate_attack',
        options: kWorkRate,
        labelFor: workRateLabel,
      ),
      ProfileField(
        'work_rate_defense',
        'profile.field.work_rate_defense',
        options: kWorkRate,
        labelFor: workRateLabel,
      ),
    ]),
    // ── 6. Mental ────────────────────────────────────────────────────────────────
    ProfileSection('mental', 'profile.section.mental', Icons.psychology, [
      const ProfileField(
        'mentality_leadership',
        'profile.field.mentality_leadership',
        isSlider: true,
      ),
      const ProfileField(
        'mentality_composure',
        'profile.field.mentality_composure',
        isSlider: true,
      ),
      const ProfileField(
        'mentality_aggression',
        'profile.field.mentality_aggression',
        isSlider: true,
      ),
      const ProfileField(
        'mentality_vision',
        'profile.field.mentality_vision',
        isSlider: true,
      ),
      const ProfileField(
        'mentality_teamwork',
        'profile.field.mentality_teamwork',
        isSlider: true,
      ),
    ]),
    // ── 7. Medical ───────────────────────────────────────────────────────────────
    ProfileSection(
      'medical',
      'profile.section.medical',
      Icons.medical_services,
      [
        const ProfileField(
          'blood_type',
          'profile.field.blood_type',
          options: kBloodTypes,
        ),
        const ProfileField(
          'chronic_diseases',
          'profile.field.chronic_diseases',
          multiline: true,
        ),
        const ProfileField(
          'allergies_list',
          'profile.field.allergies_list',
          multiline: true,
        ),
        const ProfileField(
          'surgeries_list',
          'profile.field.surgeries_list',
          multiline: true,
        ),
        const ProfileField(
          'medications',
          'profile.field.medications',
          multiline: true,
        ),
        const ProfileField(
          'injuries',
          'profile.field.injuries',
          multiline: true,
        ),
        const ProfileField(
          'family_history',
          'profile.field.family_history',
          multiline: true,
        ),
        const ProfileField('last_checkup', 'profile.field.last_checkup'),
      ],
    ),
    // ── 8. Training ──────────────────────────────────────────────────────────────
    ProfileSection(
      'training',
      'profile.section.training',
      Icons.fitness_center,
      [
        const ProfileField('hours_per_week', 'profile.field.hours_per_week'),
        const ProfileField(
          'has_private_coach',
          'profile.field.has_private_coach',
        ),
        const ProfileField(
          'private_coaches',
          'profile.field.private_coaches',
          multiline: true,
        ),
        const ProfileField(
          'has_joined_academy',
          'profile.field.has_joined_academy',
        ),
        const ProfileField(
          'academies',
          'profile.field.academies',
          multiline: true,
        ),
      ],
    ),
    // ── 9. Professional / CV ─────────────────────────────────────────────────────
    ProfileSection('professional', 'profile.section.professional', Icons.work, [
      const ProfileField('agent_name', 'profile.field.agent_name'),
      const ProfileField('agent_phone', 'profile.field.agent_phone'),
      const ProfileField(
        'transfermarkt_url',
        'profile.field.transfermarkt_url',
      ),
      const ProfileField('instagram_handle', 'profile.field.instagram_handle'),
      const ProfileField(
        'social_links',
        'profile.field.social_links',
        multiline: true,
      ),
    ]),
  ];
}
