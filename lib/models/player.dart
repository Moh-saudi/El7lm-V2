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
