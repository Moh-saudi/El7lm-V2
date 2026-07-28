import 'package:el7lm_mobile/models/player.dart';
import 'package:el7lm_mobile/models/player_filter.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final player = Player.fromJson({
    'id': 'player-1',
    'full_name': 'أحمد محمد',
    'phone': '+20 100 123 4567',
    'country': 'مصر',
    'nationality': 'مصري',
    'primary_position': 'مهاجم',
    'height': 182,
    'weight': 76,
    'education_level': 'جامعي',
    'profile_image_url': 'https://example.com/player.jpg',
    'videos': [
      {'url': 'https://example.com/highlight.mp4', 'desc': 'هدف'},
    ],
  });

  test('free text searches name, phone, country and position', () {
    expect(const PlayerFilter(query: 'احمد').matches(player), isTrue);
    expect(const PlayerFilter(query: '0100123').matches(player), isTrue);
    expect(const PlayerFilter(query: 'مصر').matches(player), isTrue);
    expect(const PlayerFilter(query: 'مهاجم').matches(player), isTrue);
    expect(const PlayerFilter(query: 'غير موجود').matches(player), isFalse);
  });

  test('advanced numeric, education and media filters combine with AND', () {
    const matching = PlayerFilter(
      education: 'جامعي',
      minHeight: 180,
      maxHeight: 185,
      minWeight: 70,
      maxWeight: 80,
      hasVideos: true,
      hasImages: true,
    );
    const outsideHeight = PlayerFilter(minHeight: 190);
    const withoutVideos = PlayerFilter(hasVideos: false);

    expect(matching.matches(player), isTrue);
    expect(outsideHeight.matches(player), isFalse);
    expect(withoutVideos.matches(player), isFalse);
  });
}
