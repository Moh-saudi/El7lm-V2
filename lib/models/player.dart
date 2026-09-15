class Player {
  const Player({
    required this.id,
    required this.name,
    required this.position,
    required this.country,
    required this.age,
    required this.imageUrl,
    required this.videos,
    required this.rawPayload,
  });

  final String id;
  final String name;
  final String position;
  final String country;
  final int? age;
  final String imageUrl;
  final List<PlayerVideo> videos;
  final Map<String, dynamic> rawPayload;

  String localizedName(String locale) {
    if (name.isEmpty) return '';
    if (locale == 'ar') return name;
    return transliterateArabicName(name);
  }

  String value(List<String> keys) {
    for (final key in keys) {
      final raw = rawPayload[key];
      if (raw == null) continue;
      final text = '$raw'.trim();
      if (text.isNotEmpty && text != 'null') return text;
    }
    return '';
  }

  num? number(List<String> keys) {
    for (final key in keys) {
      final raw = rawPayload[key];
      if (raw is num) return raw;
      final parsed = num.tryParse('${raw ?? ''}');
      if (parsed != null) return parsed;
    }
    return null;
  }

  String get phone => value(['phone', 'phoneNumber', 'whatsapp']);
  String get city => value(['city']);
  String get nationality => value(['nationality', 'country']);
  String get education => value([
    'education_level',
    'educationLevel',
    'school_name',
    'university_name',
    'education',
  ]);
  num? get height => number(['height', 'height_cm']);
  num? get weight => number(['weight', 'weight_kg']);
  bool get hasVideos => videos.any((video) => video.url.isNotEmpty);
  bool get hasImages {
    if (imageUrl.isNotEmpty) return true;
    for (final key in [
      'images',
      'additional_images',
      'gallery',
      'photos',
      'profile_images',
    ]) {
      final value = rawPayload[key];
      if (value is List && value.isNotEmpty) return true;
      if (value is Map && value.isNotEmpty) return true;
      if (value is String && value.trim().isNotEmpty) return true;
    }
    return false;
  }

  factory Player.fromJson(Map<String, dynamic> json) {
    final rawVideos = json['videos'];
    final explicitAge = _asInt(json['age']);
    return Player(
      id: '${json['id'] ?? json['uid'] ?? ''}',
      name: '${json['full_name'] ?? json['name'] ?? ''}',
      position: '${json['primary_position'] ?? json['position'] ?? ''}',
      country: '${json['country'] ?? json['nationality'] ?? ''}',
      age:
          explicitAge ??
          _ageFromBirthDate(json['birth_date'] ?? json['birthDate']),
      imageUrl: _asUrl(
        json['profile_image_url'] ??
            json['profile_image'] ??
            json['image'] ??
            json['avatar'],
      ),
      videos: rawVideos is List
          ? rawVideos
                .whereType<Map>()
                .map(
                  (item) => PlayerVideo.fromJson(
                    Map<String, dynamic>.from(item),
                    playerId: '${json['id'] ?? json['uid'] ?? ''}',
                    playerName: '${json['full_name'] ?? json['name'] ?? ''}',
                    playerPayload: json,
                  ),
                )
                .toList()
          : const [],
      rawPayload: Map<String, dynamic>.from(json),
    );
  }

  static int? _asInt(Object? value) {
    if (value is int) return value;
    return int.tryParse('$value');
  }

  static String _asUrl(Object? value) {
    if (value is String) return _usableUrl(value);
    if (value is Map) {
      return _usableUrl(
        '${value['url'] ?? value['downloadURL'] ?? value['src'] ?? ''}',
      );
    }
    return '';
  }

  static String _usableUrl(String value) {
    var url = value.trim();
    if (url.isEmpty || url == 'null' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      return '';
    }
    if (url.contains('ekyerljzfokqimbabzxm.supabase.co')) return '';
    if (url.contains('images.weserv.nl')) {
      final uri = Uri.tryParse(url);
      final target = uri?.queryParameters['url'];
      if (target != null && target.isNotEmpty && (target.startsWith('http://') || target.startsWith('https://'))) {
        url = target;
      }
    }
    return url;
  }

  static int? _ageFromBirthDate(Object? value) {
    final date = DateTime.tryParse('${value ?? ''}');
    if (date == null) return null;
    final now = DateTime.now();
    var age = now.year - date.year;
    if (now.month < date.month ||
        (now.month == date.month && now.day < date.day)) {
      age--;
    }
    return age >= 0 && age <= 120 ? age : null;
  }
}

class PlayerVideo {
  const PlayerVideo({
    required this.id,
    required this.url,
    required this.thumbnailUrl,
    required this.title,
    required this.playerId,
    required this.playerName,
    required this.playerPayload,
    required this.rawPayload,
  });

  final String id;
  final String url;
  final String thumbnailUrl;
  final String title;
  final String playerId;
  final String playerName;
  final Map<String, dynamic> playerPayload;
  final Map<String, dynamic> rawPayload;

  factory PlayerVideo.fromJson(
    Map<String, dynamic> json, {
    required String playerId,
    required String playerName,
    required Map<String, dynamic> playerPayload,
  }) => PlayerVideo(
    id: '${json['id'] ?? json['videoId'] ?? json['url'] ?? ''}',
    url: '${json['url'] ?? json['video_url'] ?? json['videoUrl'] ?? ''}',
    thumbnailUrl:
        '${json['thumbnail'] ?? json['thumbnailUrl'] ?? json['poster'] ?? ''}',
    title: '${json['title'] ?? json['description'] ?? json['desc'] ?? ''}',
    playerId: playerId,
    playerName: playerName,
    playerPayload: Map<String, dynamic>.from(playerPayload),
    rawPayload: Map<String, dynamic>.from(json),
  );
}

String transliterateArabicName(String text) {
  if (text.trim().isEmpty) return '';
  final hasArabic = RegExp(r'[\u0600-\u06FF]').hasMatch(text);
  if (!hasArabic) return text;

  const nameMap = <String, String>{
    'عبدالرحمن': 'Abdulrahman',
    'عبد الرحمن': 'Abdulrahman',
    'عبدالله': 'Abdullah',
    'عبد الله': 'Abdullah',
    'عبدالعزيز': 'Abdulaziz',
    'عبد العزيز': 'Abdulaziz',
    'عبدالملك': 'Abdulmalik',
    'عبد الملك': 'Abdulmalik',
    'عبدالكريم': 'Abdulkarim',
    'عبد الكريم': 'Abdulkarim',
    'عبدالمجيد': 'Abdulmajeed',
    'عبد المجيد': 'Abdulmajeed',
    'عبدالعظيم': 'Abdulazim',
    'عبد العظيم': 'Abdulazim',
    'عبدالقادر': 'Abdulkader',
    'عبد القادر': 'Abdulkader',
    'عبدالفتاح': 'Abdulfattah',
    'عبد الفتاح': 'Abdulfattah',
    'عبدالرازق': 'Abdulrazaq',
    'عبد الرازق': 'Abdulrazaq',
    'عبداللطيف': 'Abdullatif',
    'عبد اللطيف': 'Abdullatif',
    'عبدالسلام': 'Abdulsalam',
    'عبد السلام': 'Abdulsalam',
    'عبدالحكيم': 'Abdulhakim',
    'عبد الحكيم': 'Abdulhakim',
    'عبدالحميد': 'Abdulhamid',
    'عبد الحميد': 'Abdulhamid',
    'محمد': 'Mohamed',
    'احمد': 'Ahmed',
    'أحمد': 'Ahmed',
    'محمود': 'Mahmoud',
    'علي': 'Ali',
    'حسن': 'Hassan',
    'حسين': 'Hussein',
    'خالد': 'Khaled',
    'جابر': 'Jaber',
    'ابراهيم': 'Ibrahim',
    'إبراهيم': 'Ibrahim',
    'يوسف': 'Youssef',
    'عمر': 'Omar',
    'عمرو': 'Amr',
    'سعيد': 'Saeed',
    'سعد': 'Saad',
    'سالم': 'Salem',
    'طارق': 'Tarek',
    'كريم': 'Karim',
    'مصطفى': 'Mostafa',
    'سليمان': 'Soliman',
    'صالح': 'Saleh',
    'فهد': 'Fahad',
    'سلطان': 'Sultan',
    'فيصل': 'Faisal',
    'وليد': 'Waleed',
    'ياسر': 'Yasser',
    'حمزة': 'Hamza',
    'زياد': 'Ziad',
    'مالك': 'Malik',
    'سامي': 'Sami',
    'رامي': 'Rami',
    'هاني': 'Hany',
    'عادل': 'Adel',
    'هشام': 'Hesham',
    'ماجد': 'Maged',
    'طاهر': 'Taher',
    'شوقي': 'Shawky',
    'باسم': 'Bassem',
    'بسام': 'Bassam',
    'حسام': 'Hossam',
    'عصام': 'Essam',
    'إسلام': 'Islam',
    'اسلام': 'Islam',
    'أيمن': 'Ayman',
    'ايمن': 'Ayman',
    'أشرف': 'Ashraf',
    'اشرف': 'Ashraf',
    'عماد': 'Emad',
    'تامر': 'Tamer',
    'وائل': 'Wael',
    'هيثم': 'Haitham',
    'مروان': 'Marwan',
    'شريف': 'Sherif',
    'صلاح': 'Salah',
    'جمال': 'Gamal',
    'سامح': 'Sameh',
    'حاتم': 'Hatem',
    'نادر': 'Nader',
    'نبيل': 'Nabil',
    'عاطف': 'Atef',
    'علاء': 'Alaa',
    'بهاء': 'Bahaa',
    'ضياء': 'Diaa',
    'منصور': 'Mansour',
    'ناصر': 'Nasser',
    'يحيى': 'Yehia',
    'يحيي': 'Yehia',
    'معاذ': 'Moaz',
    'انس': 'Anas',
    'أنس': 'Anas',
    'بلال': 'Belal',
    'حميد': 'Humaid',
    'حمد': 'Hamad',
    'خليفة': 'Khalifa',
    'مبارك': 'Mubarak',
    'هزاع': 'Hazza',
    'مطر': 'Matar',
    'سيف': 'Saif',
    'زايد': 'Zayed',
    'راشد': 'Rashid',
    'عبد': 'Abd',
    'الحلم': 'El7lm',
    'التجريبي': 'Demo',
    'لاعب': 'Player',
    'كابتن': 'Captain',
  };

  var trimmed = text.trim();
  if (nameMap.containsKey(trimmed)) {
    return nameMap[trimmed]!;
  }

  trimmed = trimmed
      .replaceAll('لاعب الحلم التجريبي', 'El7lm Demo Player')
      .replaceAll('عبد الرحمن', 'Abdulrahman')
      .replaceAll('عبد الله', 'Abdullah')
      .replaceAll('عبد العزيز', 'Abdulaziz')
      .replaceAll('عبد الملك', 'Abdulmalik')
      .replaceAll('عبد الكريم', 'Abdulkarim')
      .replaceAll('عبد المجيد', 'Abdulmajeed')
      .replaceAll('عبد العظيم', 'Abdulazim')
      .replaceAll('عبد القادر', 'Abdulkader')
      .replaceAll('عبد الفتاح', 'Abdulfattah')
      .replaceAll('عبد الرازق', 'Abdulrazaq')
      .replaceAll('عبد اللطيف', 'Abdullatif')
      .replaceAll('عبد السلام', 'Abdulsalam')
      .replaceAll('عبد الحكيم', 'Abdulhakim')
      .replaceAll('عبد الحميد', 'Abdulhamid');

  const charMap = <String, String>{
    'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'aa', 'ب': 'b', 'ت': 't', 'ث': 'th',
    'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
    'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a',
    'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
    'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'a', 'ء': '', 'ؤ': 'w', 'ئ': 'y',
  };

  final words = trimmed.split(RegExp(r'\s+'));
  final converted = words.map((w) {
    if (w.isEmpty) return '';
    if (!RegExp(r'[\u0600-\u06FF]').hasMatch(w)) return w;
    if (nameMap.containsKey(w)) return nameMap[w]!;

    final sb = StringBuffer();
    for (var i = 0; i < w.length; i++) {
      final ch = w[i];
      sb.write(charMap[ch] ?? ch);
    }
    final s = sb.toString();
    if (s.isEmpty) return w;
    return '${s[0].toUpperCase()}${s.substring(1)}';
  }).join(' ');

  return converted.isNotEmpty ? converted : text;
}
