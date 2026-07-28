import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../../l10n/app_localizations.dart';
import '../../models/player.dart';
import '../../services/data_service.dart';
import '../../widgets/async_state_view.dart';

class PlayerCinemaScreen extends StatefulWidget {
  const PlayerCinemaScreen({super.key, required this.dataService});

  final DataService dataService;

  @override
  State<PlayerCinemaScreen> createState() => _PlayerCinemaScreenState();
}

class _PlayerCinemaScreenState extends State<PlayerCinemaScreen> {
  late Future<List<PlayerVideo>> future;

  @override
  void initState() {
    super.initState();
    future = widget.dataService.fetchPlayers().then(
      (players) => players.expand((player) => player.videos).toList(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      child: AsyncStateView<List<PlayerVideo>>(
        future: future,
        builder: (context, videos) {
          if (videos.isEmpty) {
            return Center(
              child: Text(
                context.tr('noVideos'),
                style: const TextStyle(color: Colors.white),
              ),
            );
          }
          return PageView.builder(
            scrollDirection: Axis.vertical,
            itemCount: videos.length,
            itemBuilder: (context, index) => _CinemaVideo(video: videos[index]),
          );
        },
      ),
    );
  }
}

class _CinemaVideo extends StatefulWidget {
  const _CinemaVideo({required this.video});

  final PlayerVideo video;

  @override
  State<_CinemaVideo> createState() => _CinemaVideoState();
}

class _CinemaVideoState extends State<_CinemaVideo> {
  VideoPlayerController? controller;
  bool failed = false;

  @override
  void initState() {
    super.initState();
    final uri = Uri.tryParse(widget.video.url);
    if (uri == null || !uri.hasScheme) {
      failed = true;
      return;
    }
    controller = VideoPlayerController.networkUrl(uri)
      ..initialize()
          .then((_) {
            if (!mounted) return;
            controller!
              ..setLooping(true)
              ..play();
            setState(() {});
          })
          .catchError((_) {
            if (mounted) setState(() => failed = true);
          });
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
          onTap: () {
            if (!ready) return;
            setState(() {
              controller!.value.isPlaying
                  ? controller!.pause()
                  : controller!.play();
            });
          },
          child: ColoredBox(
            color: Colors.black,
            child: ready
                ? FittedBox(
                    fit: BoxFit.contain,
                    child: SizedBox(
                      width: controller!.value.size.width,
                      height: controller!.value.size.height,
                      child: VideoPlayer(controller!),
                    ),
                  )
                : widget.video.thumbnailUrl.isNotEmpty
                ? CachedNetworkImage(
                    imageUrl: widget.video.thumbnailUrl,
                    fit: BoxFit.cover,
                    errorWidget: (_, _, _) => const _VideoPlaceholder(),
                  )
                : const _VideoPlaceholder(),
          ),
        ),
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.transparent, Colors.black87],
              begin: Alignment.center,
              end: Alignment.bottomCenter,
            ),
          ),
        ),
        Positioned(
          right: 18,
          left: 80,
          bottom: 26,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.video.playerName.isEmpty
                    ? context.tr('dreamPlayer')
                    : widget.video.playerName,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
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
        Positioned(
          left: 14,
          bottom: 28,
          child: Column(
            children: [
              _CinemaAction(
                icon: Icons.favorite_border,
                label: context.tr('like'),
              ),
              _CinemaAction(
                icon: Icons.bookmark_border,
                label: context.tr('save'),
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

class _VideoPlaceholder extends StatelessWidget {
  const _VideoPlaceholder();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Icon(Icons.play_circle_fill, color: Colors.white70, size: 76),
    );
  }
}

class _CinemaAction extends StatelessWidget {
  const _CinemaAction({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
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
    );
  }
}
