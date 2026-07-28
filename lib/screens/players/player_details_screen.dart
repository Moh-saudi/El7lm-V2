import 'dart:convert';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/player.dart';
import '../../services/data_service.dart';

class PlayerDetailsScreen extends StatefulWidget {
  const PlayerDetailsScreen({
    super.key,
    required this.initialPlayer,
    required this.dataService,
  });

  final Player initialPlayer;
  final DataService dataService;

  @override
  State<PlayerDetailsScreen> createState() => _PlayerDetailsScreenState();
}

class _PlayerDetailsScreenState extends State<PlayerDetailsScreen> {
  late Future<Player> future;

  @override
  void initState() {
    super.initState();
    future = widget.dataService.fetchPlayerById(widget.initialPlayer.id);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(context.tr('playerDetails'))),
    body: FutureBuilder<Player>(
      future: future,
      initialData: widget.initialPlayer,
      builder: (context, snapshot) {
        final player = snapshot.data ?? widget.initialPlayer;
        return RefreshIndicator(
          onRefresh: () async {
            setState(
              () => future = widget.dataService.fetchPlayerById(player.id),
            );
            await future;
          },
          child: ListView(
            padding: const EdgeInsets.only(bottom: 32),
            children: [
              _PlayerHeader(player: player),
              if (snapshot.hasError)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Card(
                    color: Colors.orange.shade50,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(context.errorText(snapshot.error)),
                    ),
                  ),
                ),
              _PlayerData(player: player),
            ],
          ),
        );
      },
    ),
  );
}

class _PlayerHeader extends StatelessWidget {
  const _PlayerHeader({required this.player});

  final Player player;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      gradient: LinearGradient(
        colors: [AppColors.navy, AppColors.green.withValues(alpha: .88)],
      ),
    ),
    child: Column(
      children: [
        CircleAvatar(
          radius: 58,
          backgroundColor: Colors.white,
          backgroundImage: player.imageUrl.isEmpty
              ? null
              : CachedNetworkImageProvider(player.imageUrl),
          child: player.imageUrl.isEmpty
              ? const Icon(Icons.person, size: 64)
              : null,
        ),
        const SizedBox(height: 14),
        Text(
          player.name.isEmpty ? context.tr('dreamPlayer') : player.name,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w900,
            fontSize: 23,
          ),
        ),
        const SizedBox(height: 5),
        Text(
          [
            player.position,
            player.country,
          ].where((value) => value.isNotEmpty).join(' • '),
          style: const TextStyle(color: Colors.white70),
        ),
      ],
    ),
  );
}

class _PlayerData extends StatelessWidget {
  const _PlayerData({required this.player});

  final Player player;

  static const hiddenKeys = {
    'id',
    'uid',
    'videos',
    'images',
    'additional_images',
    'profile_image',
    'profile_image_url',
    'image',
    'password',
    'authPassword',
    'hashed_password',
    'salt',
    'refresh_token',
    'access_token',
  };

  @override
  Widget build(BuildContext context) {
    final fields =
        player.rawPayload.entries
            .where(
              (entry) => _isSafeKey(entry.key) && _hasDisplayValue(entry.value),
            )
            .toList()
          ..sort((a, b) => a.key.compareTo(b.key));
    final images = _imageUrls(player.rawPayload, player.imageUrl);

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _SectionTitle(
            icon: Icons.badge_outlined,
            title: context.tr('registeredPlayerData'),
          ),
          const SizedBox(height: 10),
          ...fields.map(
            (entry) => _DataRow(
              label: context.trOr(
                'profile.field.${entry.key}',
                _humanize(entry.key),
              ),
              value: _formatValue(entry.value),
            ),
          ),
          if (images.isNotEmpty) ...[
            const SizedBox(height: 22),
            _SectionTitle(
              icon: Icons.photo_library_outlined,
              title: context.tr('playerImages'),
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: 150,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: images.length,
                separatorBuilder: (_, _) => const SizedBox(width: 10),
                itemBuilder: (context, index) => ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: CachedNetworkImage(
                    imageUrl: images[index],
                    width: 130,
                    fit: BoxFit.cover,
                    errorWidget: (_, _, _) =>
                        const SizedBox(width: 130, child: Icon(Icons.image)),
                  ),
                ),
              ),
            ),
          ],
          if (player.videos.isNotEmpty) ...[
            const SizedBox(height: 22),
            _SectionTitle(
              icon: Icons.smart_display_outlined,
              title: context.tr('playerVideos'),
            ),
            const SizedBox(height: 8),
            ...player.videos.map(
              (video) => Card(
                child: ListTile(
                  leading: const Icon(
                    Icons.play_circle_fill,
                    color: AppColors.green,
                  ),
                  title: Text(
                    video.title.isEmpty ? context.tr('newSkill') : video.title,
                  ),
                  subtitle: Text(
                    video.url,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  trailing: const Icon(Icons.open_in_new),
                  onTap: () async {
                    final uri = Uri.tryParse(video.url);
                    if (uri != null) {
                      await launchUrl(
                        uri,
                        mode: LaunchMode.externalApplication,
                      );
                    }
                  },
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  static bool _hasDisplayValue(Object? value) {
    if (value == null) return false;
    if (value is String) return value.trim().isNotEmpty;
    if (value is Iterable) return value.isNotEmpty;
    if (value is Map) return value.isNotEmpty;
    return true;
  }

  static bool _isSafeKey(String key) {
    if (hiddenKeys.contains(key)) return false;
    final normalized = key.toLowerCase();
    return ![
      'password',
      'token',
      'secret',
      'salt',
      'credential',
    ].any(normalized.contains);
  }

  static String _formatValue(Object? value) {
    if (value is List) return value.map(_formatValue).join('\n');
    if (value is Map) {
      return const JsonEncoder.withIndent('  ').convert(value);
    }
    if (value is bool) return value ? '✓' : '—';
    return '$value';
  }

  static String _humanize(String key) => key
      .replaceAll(RegExp(r'([a-z])([A-Z])'), r'$1 $2')
      .replaceAll('_', ' ')
      .trim();

  static List<String> _imageUrls(Map<String, dynamic> payload, String primary) {
    final result = <String>{if (primary.isNotEmpty) primary};
    void collect(Object? value) {
      if (value is String && Uri.tryParse(value)?.hasScheme == true) {
        result.add(value);
      } else if (value is List) {
        for (final item in value) {
          collect(item);
        }
      } else if (value is Map) {
        collect(value['url']);
      }
    }

    for (final key in ['images', 'additional_images', 'gallery', 'photos']) {
      collect(payload[key]);
    }
    return result.toList();
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.icon, required this.title});

  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Icon(icon, color: AppColors.green),
      const SizedBox(width: 8),
      Expanded(
        child: Text(
          title,
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
        ),
      ),
    ],
  );
}

class _DataRow extends StatelessWidget {
  const _DataRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 8),
    padding: const EdgeInsets.all(13),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: const Color(0xFFE5E8EE)),
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          flex: 2,
          child: Text(
            label,
            style: const TextStyle(
              color: AppColors.muted,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(flex: 3, child: SelectableText(value)),
      ],
    ),
  );
}
