import 'player.dart';
import '../screens/profile/player_profile_data.dart';

class PlayerFilter {
  const PlayerFilter({
    this.query = '',
    this.position = '',
    this.country = '',
    this.education = '',
    this.minAge,
    this.maxAge,
    this.minHeight,
    this.maxHeight,
    this.minWeight,
    this.maxWeight,
    this.hasVideos,
    this.hasImages,
  });

  final String query;
  final String position;
  final String country;
  final String education;
  final num? minAge;
  final num? maxAge;
  final num? minHeight;
  final num? maxHeight;
  final num? minWeight;
  final num? maxWeight;
  final bool? hasVideos;
  final bool? hasImages;

  int get activeCount => [
    query.trim().isNotEmpty,
    position.isNotEmpty,
    country.isNotEmpty,
    education.isNotEmpty,
    minAge != null,
    maxAge != null,
    minHeight != null,
    maxHeight != null,
    minWeight != null,
    maxWeight != null,
    hasVideos != null,
    hasImages != null,
  ].where((active) => active).length;

  bool matches(Player player) {
    final normalizedQuery = _normalize(query);
    if (normalizedQuery.isNotEmpty) {
      final queryDigits = _digits(query);
      final phoneDigits = _digits(player.phone);
      final localDigits = queryDigits.replaceFirst(RegExp(r'^0+'), '');
      final phoneMatches =
          queryDigits.length >= 5 &&
          (phoneDigits.contains(queryDigits) ||
              (localDigits.isNotEmpty && phoneDigits.contains(localDigits)));
      final searchable = _normalize(
        [
          player.name,
          player.phone,
          player.position,
          player.country,
          player.nationality,
          player.city,
          player.education,
          player.value(['current_club', 'club_name']),
          player.value(['full_name', 'displayName', 'email', 'whatsapp']),
          _flatten(player.rawPayload),
        ].join(' '),
      );
      if (!searchable.contains(normalizedQuery) && !phoneMatches) return false;
    }

    if (position.isNotEmpty &&
        canonicalProfileOptionValue('position', player.position) !=
            canonicalProfileOptionValue('position', position)) {
      return false;
    }
    if (country.isNotEmpty) {
      final wanted = canonicalProfileOptionValue('country', country);
      final playerCountries = [player.country, player.nationality]
          .where((value) => value.trim().isNotEmpty)
          .map((value) => canonicalProfileOptionValue('country', value));
      if (!playerCountries.contains(wanted)) return false;
    }
    if (education.isNotEmpty &&
        canonicalProfileOptionValue('education_level', player.education) !=
            canonicalProfileOptionValue('education_level', education)) {
      return false;
    }
    if (!_inside(player.age, minAge, maxAge)) return false;
    if (!_inside(player.height, minHeight, maxHeight)) return false;
    if (!_inside(player.weight, minWeight, maxWeight)) return false;
    if (hasVideos != null && player.hasVideos != hasVideos) return false;
    if (hasImages != null && player.hasImages != hasImages) return false;
    return true;
  }

  PlayerFilter copyWith({
    String? query,
    String? position,
    String? country,
    String? education,
    num? minAge,
    num? maxAge,
    num? minHeight,
    num? maxHeight,
    num? minWeight,
    num? maxWeight,
    bool? hasVideos,
    bool? hasImages,
    bool clearMinAge = false,
    bool clearMaxAge = false,
    bool clearMinHeight = false,
    bool clearMaxHeight = false,
    bool clearMinWeight = false,
    bool clearMaxWeight = false,
    bool clearHasVideos = false,
    bool clearHasImages = false,
  }) => PlayerFilter(
    query: query ?? this.query,
    position: position ?? this.position,
    country: country ?? this.country,
    education: education ?? this.education,
    minAge: clearMinAge ? null : minAge ?? this.minAge,
    maxAge: clearMaxAge ? null : maxAge ?? this.maxAge,
    minHeight: clearMinHeight ? null : minHeight ?? this.minHeight,
    maxHeight: clearMaxHeight ? null : maxHeight ?? this.maxHeight,
    minWeight: clearMinWeight ? null : minWeight ?? this.minWeight,
    maxWeight: clearMaxWeight ? null : maxWeight ?? this.maxWeight,
    hasVideos: clearHasVideos ? null : hasVideos ?? this.hasVideos,
    hasImages: clearHasImages ? null : hasImages ?? this.hasImages,
  );

  static bool _inside(num? value, num? minimum, num? maximum) {
    if (minimum == null && maximum == null) return true;
    if (value == null) return false;
    if (minimum != null && value < minimum) return false;
    if (maximum != null && value > maximum) return false;
    return true;
  }

  static String _normalize(String value) => value
      .trim()
      .toLowerCase()
      .replaceAll(RegExp(r'[\u064B-\u065F\u0670]'), '')
      .replaceAll('أ', 'ا')
      .replaceAll('إ', 'ا')
      .replaceAll('آ', 'ا')
      .replaceAll('ى', 'ي')
      .replaceAll(RegExp(r'\s+'), ' ');

  static String _digits(String value) => value.replaceAll(RegExp(r'\D'), '');

  static String _flatten(Object? value) {
    if (value is Map) return value.values.map(_flatten).join(' ');
    if (value is Iterable) return value.map(_flatten).join(' ');
    return value == null ? '' : '$value';
  }
}
