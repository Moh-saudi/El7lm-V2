class Opportunity {
  const Opportunity({
    required this.id,
    required this.title,
    required this.organizerName,
    required this.description,
    required this.country,
    required this.city,
    required this.type,
    required this.positions,
    required this.deadline,
    required this.rawPayload,
  });

  final String id;
  final String title;
  final String organizerName;
  final String description;
  final String country;
  final String city;
  final String type;
  final List<String> positions;
  final DateTime? deadline;
  final Map<String, dynamic> rawPayload;

  factory Opportunity.fromJson(Map<String, dynamic> json) {
    final positionData = json['positions'] ?? json['targetPositions'];
    return Opportunity(
      id: '${json['id'] ?? ''}',
      title: '${json['title'] ?? ''}',
      organizerName: '${json['organizerName'] ?? ''}',
      description: '${json['description'] ?? ''}',
      country: '${json['country'] ?? ''}',
      city: '${json['city'] ?? ''}',
      type: '${json['opportunityType'] ?? json['type'] ?? ''}',
      positions: positionData is List
          ? positionData.map((item) => '$item').toList()
          : const [],
      deadline: DateTime.tryParse(
        '${json['applicationDeadline'] ?? json['deadline'] ?? ''}',
      ),
      rawPayload: Map<String, dynamic>.from(json),
    );
  }

  Map<String, dynamic>? get translations {
    final t = rawPayload['translations'];
    if (t is Map<String, dynamic>) return t;
    if (t is Map) return Map<String, dynamic>.from(t);
    return null;
  }

  String localizedTitle([String? locale]) {
    final t = translations;
    if (t != null && locale != null && locale != 'ar') {
      final langData = t[locale] ?? t['en'];
      if (langData is Map && langData['title'] != null && '${langData['title']}'.trim().isNotEmpty) {
        return '${langData['title']}';
      }
    }
    return title;
  }

  String localizedDescription([String? locale]) {
    final t = translations;
    if (t != null && locale != null && locale != 'ar') {
      final langData = t[locale] ?? t['en'];
      if (langData is Map && langData['description'] != null && '${langData['description']}'.trim().isNotEmpty) {
        return '${langData['description']}';
      }
    }
    return description;
  }

  /// Returns the organizer name in the requested locale.
  /// Priority: translations[locale].organizerName → translations.en.organizerName
  ///           → rawPayload['organizerNameEn'] → organizerName (original).
  String localizedOrganizerName([String? locale]) {
    // 1. Check structured translations block
    final t = translations;
    if (t != null && locale != null && locale != 'ar') {
      final langData = t[locale] ?? t['en'];
      if (langData is Map) {
        final locName = '${langData['organizerName'] ?? ''}'.trim();
        if (locName.isNotEmpty) return locName;
      }
    }
    // 2. Fallback: explicit English name field stored on the opportunity
    if (locale != null && locale != 'ar') {
      final enName = '${rawPayload['organizerNameEn'] ?? rawPayload['organizerName_en'] ?? ''}'.trim();
      if (enName.isNotEmpty) return enName;
    }
    // 3. Smart transliteration fallback if locale is non-Arabic and name has Arabic characters
    if (locale != null && locale != 'ar' && RegExp(r'[\u0600-\u06FF]').hasMatch(organizerName)) {
      final latin = _transliterateOrgName(organizerName, locale);
      if (latin.isNotEmpty) return latin;
    }

    // 4. Original name
    return organizerName;
  }

  static String _transliterateOrgName(String name, String locale) {
    var s = name.trim();
    if (s.contains('السيلية')) {
      return locale == 'pt' ? 'Clube Al-Sailiya Catar' : (locale == 'fr' ? 'Club Al-Sailiya Qatar' : 'Al-Sailiya SC Qatar');
    }
    if (s.contains('الشق')) {
      return locale == 'pt' ? 'Clube Al-Shaq' : 'Al-Shaq Club';
    }
    if (s.contains('الريان')) {
      return 'Al-Rayyan SC';
    }
    if (s.contains('السد')) {
      return 'Al-Sadd SC';
    }
    if (s.contains('الغرافة')) {
      return 'Al-Gharafa SC';
    }
    if (s.contains('الدحيل')) {
      return 'Al-Duhail SC';
    }
    if (s.contains('الوكرة')) {
      return 'Al-Wakrah SC';
    }
    if (s.contains('ميسك')) {
      return 'Mesk Qatar';
    }
    if (s.contains('أكاديمية الحلم')) {
      return 'El7lm International Academy';
    }
    // Generic replace prefixes
    s = s.replaceAll('نادي', locale == 'pt' ? 'Clube' : 'Club')
         .replaceAll('أكاديمية', locale == 'pt' ? 'Academia' : (locale == 'fr' ? 'Académie' : 'Academy'))
         .replaceAll('قطر', locale == 'pt' || locale == 'es' ? 'Catar' : 'Qatar')
         .replaceAll('مصر', locale == 'fr' ? 'Égypte' : (locale == 'pt' ? 'Egito' : 'Egypt'));
    return s;
  }
}

