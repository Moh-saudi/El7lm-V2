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

  factory Player.fromJson(Map<String, dynamic> json) {
    final rawVideos = json['videos'];
    return Player(
      id: '${json['id'] ?? json['uid'] ?? ''}',
      name: '${json['full_name'] ?? json['name'] ?? ''}',
      position: '${json['primary_position'] ?? json['position'] ?? ''}',
      country: '${json['country'] ?? json['nationality'] ?? ''}',
      age: _asInt(json['age']),
      imageUrl:
          '${json['profile_image_url'] ?? json['profile_image'] ?? json['image'] ?? ''}',
      videos: rawVideos is List
          ? rawVideos
                .whereType<Map>()
                .map(
                  (item) => PlayerVideo.fromJson(
                    Map<String, dynamic>.from(item),
                    playerName: '${json['full_name'] ?? json['name'] ?? ''}',
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
}

class PlayerVideo {
  const PlayerVideo({
    required this.id,
    required this.url,
    required this.thumbnailUrl,
    required this.title,
    required this.playerName,
    required this.rawPayload,
  });

  final String id;
  final String url;
  final String thumbnailUrl;
  final String title;
  final String playerName;
  final Map<String, dynamic> rawPayload;

  factory PlayerVideo.fromJson(
    Map<String, dynamic> json, {
    required String playerName,
  }) => PlayerVideo(
    id: '${json['id'] ?? json['videoId'] ?? json['url'] ?? ''}',
    url: '${json['url'] ?? json['video_url'] ?? json['videoUrl'] ?? ''}',
    thumbnailUrl:
        '${json['thumbnail'] ?? json['thumbnailUrl'] ?? json['poster'] ?? ''}',
    title: '${json['title'] ?? json['description'] ?? ''}',
    playerName: playerName,
    rawPayload: Map<String, dynamic>.from(json),
  );
}
