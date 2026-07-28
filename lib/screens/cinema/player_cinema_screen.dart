import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../l10n/app_localizations.dart';
import '../../models/player.dart';
import '../../models/player_filter.dart';
import '../../services/data_service.dart';
import '../../widgets/async_state_view.dart';
import '../../widgets/player_filter_sheet.dart';
import '../players/player_details_screen.dart';

class PlayerCinemaScreen extends StatefulWidget {
  const PlayerCinemaScreen({super.key, required this.dataService});

  final DataService dataService;

  @override
  State<PlayerCinemaScreen> createState() => _PlayerCinemaScreenState();
}

class _PlayerCinemaScreenState extends State<PlayerCinemaScreen> {
  late Future<List<Player>> future;
  PlayerFilter filter = const PlayerFilter(hasVideos: true);
  int activeIndex = 0;

  @override
  void initState() {
    super.initState();
    future = widget.dataService.fetchPlayers();
  }

  Future<void> openFilters(List<Player> players) async {
    final result = await showPlayerFilterSheet(
      context: context,
      initial: filter,
      players: players,
    );
    if (result == null || !mounted) return;
    setState(() {
      filter = result;
      activeIndex = 0;
    });
  }

  Future<void> openPlayer(Player player) => Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => PlayerDetailsScreen(
        initialPlayer: player,
        dataService: widget.dataService,
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => Container(
    color: Colors.black,
    child: AsyncStateView<List<Player>>(
      future: future,
      builder: (context, players) {
        final matchedPlayers = players.where(filter.matches).toList();
        final videos = [
          for (final player in matchedPlayers)
            for (final video in player.videos)
              if (video.url.isNotEmpty) (player: player, video: video),
        ];
        if (activeIndex >= videos.length) activeIndex = 0;

        return Stack(
          children: [
            if (videos.isEmpty)
              Center(
                child: Text(
                  context.tr('noVideosMatching'),
                  style: const TextStyle(color: Colors.white),
                ),
              )
            else
              PageView.builder(
                key: ValueKey(
                  '${filter.query}-${filter.activeCount}-${videos.length}',
                ),
                scrollDirection: Axis.vertical,
                itemCount: videos.length,
                onPageChanged: (index) => setState(() => activeIndex = index),
                itemBuilder: (context, index) => _CinemaVideo(
                  player: videos[index].player,
                  video: videos[index].video,
                  isActive: index == activeIndex,
                  onPlayerTap: () => openPlayer(videos[index].player),
                ),
              ),
            PositionedDirectional(
              top: 10,
              start: 12,
              child: SafeArea(
                child: Row(
                  children: [
                    FilledButton.tonalIcon(
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.black54,
                        foregroundColor: Colors.white,
                      ),
                      onPressed: () => openFilters(players),
                      icon: const Icon(Icons.tune),
                      label: Text(
                        filter.activeCount == 0
                            ? context.tr('searchAndFilter')
                            : '${context.tr('searchAndFilter')} (${filter.activeCount})',
                      ),
                    ),
                    if (videos.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 7,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '${activeIndex + 1} / ${videos.length}',
                          style: const TextStyle(color: Colors.white),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        );
      },
    ),
  );
}

class _CinemaVideo extends StatefulWidget {
  const _CinemaVideo({
    required this.player,
    required this.video,
    required this.isActive,
    required this.onPlayerTap,
  });

  final Player player;
  final PlayerVideo video;
  final bool isActive;
  final VoidCallback onPlayerTap;

  @override
  State<_CinemaVideo> createState() => _CinemaVideoState();
}

class _CinemaVideoState extends State<_CinemaVideo> {
  VideoPlayerController? controller;
  bool failed = false;
  bool manuallyPaused = false;

  bool get isDirectVideo {
    final clean = widget.video.url.split('?').first.toLowerCase();
    return clean.endsWith('.mp4') ||
        clean.endsWith('.webm') ||
        clean.endsWith('.mov') ||
        widget.video.url.contains('supabase.co/storage') ||
        widget.video.url.contains('assets.el7lm.com') ||
        widget.video.url.contains('r2.dev') ||
        widget.video.url.contains('firebasestorage.googleapis.com');
  }

  @override
  void initState() {
    super.initState();
    if (isDirectVideo) _initializeDirectVideo();
  }

  @override
  void didUpdateWidget(covariant _CinemaVideo oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (isDirectVideo && oldWidget.isActive != widget.isActive) {
      _syncPlayback();
    }
  }

  Future<void> _initializeDirectVideo() async {
    final uri = Uri.tryParse(widget.video.url);
    if (uri == null || !uri.hasScheme) {
      failed = true;
      return;
    }
    final next = VideoPlayerController.networkUrl(uri);
    controller = next;
    try {
      await next.initialize();
      await next.setLooping(true);
      await next.setVolume(0);
      if (!mounted) return;
      await _syncPlayback();
      setState(() {});
    } catch (_) {
      if (mounted) setState(() => failed = true);
    }
  }

  Future<void> _syncPlayback() async {
    final video = controller;
    if (video?.value.isInitialized != true) return;
    if (widget.isActive && !manuallyPaused) {
      await video!.play();
    } else {
      await video!.pause();
    }
  }

  @override
  void dispose() {
    controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ready = controller?.value.isInitialized == true && !failed;
    return Stack(
      fit: StackFit.expand,
      children: [
        GestureDetector(
          onTap: isDirectVideo
              ? () {
                  if (!ready) return;
                  setState(() => manuallyPaused = !manuallyPaused);
                  _syncPlayback();
                }
              : null,
          child: ColoredBox(
            color: Colors.black,
            child: isDirectVideo
                ? ready
                      ? FittedBox(
                          fit: BoxFit.contain,
                          child: SizedBox(
                            width: controller!.value.size.width,
                            height: controller!.value.size.height,
                            child: VideoPlayer(controller!),
                          ),
                        )
                      : _VideoPoster(video: widget.video, failed: failed)
                : widget.isActive
                ? _EmbeddedPlatformVideo(url: widget.video.url)
                : _VideoPoster(video: widget.video),
          ),
        ),
        const IgnorePointer(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.transparent, Colors.black87],
                begin: Alignment.center,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
        ),
        PositionedDirectional(
          start: 18,
          end: 80,
          bottom: 26,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              InkWell(
                onTap: widget.onPlayerTap,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      widget.player.name.isEmpty
                          ? context.tr('dreamPlayer')
                          : widget.player.name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 18,
                      ),
                    ),
                    const SizedBox(width: 5),
                    const Icon(
                      Icons.open_in_new,
                      color: Colors.white,
                      size: 16,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 5),
              Text(
                widget.video.title.isEmpty
                    ? context.tr('newSkill')
                    : widget.video.title,
                style: const TextStyle(color: Colors.white70),
              ),
            ],
          ),
        ),
        PositionedDirectional(
          end: 14,
          bottom: 28,
          child: Column(
            children: [
              _CinemaAction(
                icon: Icons.person_outline,
                label: context.tr('profile'),
                onTap: widget.onPlayerTap,
              ),
              _CinemaAction(
                icon: Icons.open_in_new,
                label: context.tr('openVideo'),
                onTap: () async {
                  final uri = Uri.tryParse(widget.video.url);
                  if (uri != null) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                },
              ),
              _CinemaAction(
                icon: Icons.share_outlined,
                label: context.tr('share'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _EmbeddedPlatformVideo extends StatefulWidget {
  const _EmbeddedPlatformVideo({required this.url});

  final String url;

  @override
  State<_EmbeddedPlatformVideo> createState() => _EmbeddedPlatformVideoState();
}

class _EmbeddedPlatformVideoState extends State<_EmbeddedPlatformVideo> {
  late final WebViewController controller;

  @override
  void initState() {
    super.initState();
    controller = WebViewController();
    if (!kIsWeb) {
      controller
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(Colors.black)
        ..setNavigationDelegate(
          NavigationDelegate(
            onPageFinished: (_) async {
              await controller.runJavaScript('''
                document.querySelectorAll('video').forEach(function(video) {
                  video.muted = true;
                  video.loop = true;
                  video.setAttribute('playsinline', '');
                  video.play().catch(function() {});
                });
              ''');
            },
          ),
        );
    }
    controller.loadRequest(_embeddableUri(widget.url));
  }

  @override
  Widget build(BuildContext context) => WebViewWidget(controller: controller);

  static Uri _embeddableUri(String source) {
    final uri = Uri.tryParse(source);
    if (uri == null) return Uri.parse('about:blank');
    final host = uri.host.toLowerCase();

    if (host.contains('youtube.com') || host == 'youtu.be') {
      final id = host == 'youtu.be'
          ? (uri.pathSegments.isEmpty ? null : uri.pathSegments.first)
          : uri.queryParameters['v'] ??
                _afterSegment(uri.pathSegments, 'embed') ??
                _afterSegment(uri.pathSegments, 'shorts');
      if (id != null && id.isNotEmpty) {
        return Uri.parse(
          'https://www.youtube.com/embed/$id?autoplay=1&mute=1&loop=1&playlist=$id&playsinline=1&controls=1',
        );
      }
    }
    if (host.contains('tiktok.com')) {
      final id = _afterSegment(uri.pathSegments, 'video');
      if (id != null && id.isNotEmpty) {
        return Uri.parse(
          'https://www.tiktok.com/player/v1/$id?autoplay=1&loop=1&music_info=1&description=1',
        );
      }
    }
    if (host.contains('vimeo.com') && uri.pathSegments.isNotEmpty) {
      final id = uri.pathSegments.last;
      return Uri.parse(
        'https://player.vimeo.com/video/$id?autoplay=1&muted=1&loop=1',
      );
    }
    return uri;
  }

  static String? _afterSegment(List<String> segments, String target) {
    final index = segments.indexOf(target);
    return index >= 0 && index + 1 < segments.length
        ? segments[index + 1]
        : null;
  }
}

class _VideoPoster extends StatelessWidget {
  const _VideoPoster({required this.video, this.failed = false});

  final PlayerVideo video;
  final bool failed;

  @override
  Widget build(BuildContext context) => Stack(
    fit: StackFit.expand,
    children: [
      if (video.thumbnailUrl.isNotEmpty)
        CachedNetworkImage(
          imageUrl: video.thumbnailUrl,
          fit: BoxFit.cover,
          errorWidget: (_, _, _) => const ColoredBox(color: Colors.black),
        ),
      const Center(
        child: Icon(Icons.play_circle_fill, color: Colors.white70, size: 76),
      ),
      if (failed)
        Center(
          child: Padding(
            padding: const EdgeInsets.only(top: 110),
            child: Text(
              context.tr('videoPlaybackFailed'),
              style: const TextStyle(color: Colors.white70),
            ),
          ),
        ),
    ],
  );
}

class _CinemaAction extends StatelessWidget {
  const _CinemaAction({required this.icon, required this.label, this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    child: Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Column(
        children: [
          Icon(icon, color: Colors.white, size: 30),
          Text(
            label,
            style: const TextStyle(color: Colors.white, fontSize: 10),
          ),
        ],
      ),
    ),
  );
}
