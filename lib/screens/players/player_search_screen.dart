import 'dart:math' as math;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/player.dart';
import '../../models/player_filter.dart';
import '../../services/data_service.dart';
import '../../widgets/async_state_view.dart';
import '../../widgets/player_filter_sheet.dart';
import 'player_details_screen.dart';

class PlayerSearchScreen extends StatefulWidget {
  const PlayerSearchScreen({super.key, required this.dataService});

  final DataService dataService;

  @override
  State<PlayerSearchScreen> createState() => _PlayerSearchScreenState();
}

class _PlayerSearchScreenState extends State<PlayerSearchScreen> {
  static const pageSize = 20;

  late Future<List<Player>> future;
  final searchController = TextEditingController();
  final scrollController = ScrollController();
  PlayerFilter filter = const PlayerFilter();
  int currentPage = 1;

  @override
  void initState() {
    super.initState();
    future = widget.dataService.fetchPlayers();
  }

  @override
  void dispose() {
    searchController.dispose();
    scrollController.dispose();
    super.dispose();
  }

  Future<void> refresh() async {
    final next = widget.dataService.fetchPlayers();
    setState(() => future = next);
    await next;
  }

  void updateQuery(String value) {
    setState(() {
      filter = filter.copyWith(query: value.trim());
      currentPage = 1;
    });
  }

  void goToPage(int page, int totalPages) {
    setState(() => currentPage = page.clamp(1, totalPages));
    if (scrollController.hasClients) {
      scrollController.animateTo(
        0,
        duration: const Duration(milliseconds: 260),
        curve: Curves.easeOut,
      );
    }
  }

  Future<void> openFilters(List<Player> players) async {
    final result = await showPlayerFilterSheet(
      context: context,
      initial: filter,
      players: players,
    );
    if (result == null || !mounted) return;
    setState(() {
      filter = result.copyWith(query: searchController.text.trim());
      currentPage = 1;
    });
  }

  Future<void> openPlayer(Player player) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PlayerDetailsScreen(
          initialPlayer: player,
          dataService: widget.dataService,
        ),
      ),
    );
    // This State, its page number, filters and scroll position remain intact.
  }

  @override
  Widget build(BuildContext context) => AsyncStateView<List<Player>>(
    future: future,
    builder: (context, players) {
      final filtered = players.where(filter.matches).toList();
      final advancedFilterCount =
          filter.activeCount - (filter.query.isEmpty ? 0 : 1);
      final totalPages = math.max(1, (filtered.length / pageSize).ceil());
      if (currentPage > totalPages) currentPage = totalPages;
      final start = (currentPage - 1) * pageSize;
      final pagePlayers = filtered.skip(start).take(pageSize).toList();

      return Stack(
        children: [
          Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: searchController,
                        onChanged: updateQuery,
                        decoration: InputDecoration(
                          hintText: context.tr('searchEveryWay'),
                          prefixIcon: const Icon(Icons.search),
                          suffixIcon: searchController.text.isEmpty
                              ? null
                              : IconButton(
                                  onPressed: () {
                                    searchController.clear();
                                    updateQuery('');
                                  },
                                  icon: const Icon(Icons.close),
                                ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 9),
                    Badge(
                      isLabelVisible: advancedFilterCount > 0,
                      label: Text('$advancedFilterCount'),
                      child: IconButton.filledTonal(
                        tooltip: context.tr('advancedFilters'),
                        onPressed: () => openFilters(players),
                        icon: const Icon(Icons.tune),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Text(
                      context.tr('resultsCount', {
                        'count': filtered.length,
                        'total': players.length,
                      }),
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 12,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      context.tr('pageOf', {
                        'page': currentPage,
                        'total': totalPages,
                      }),
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: refresh,
                  child: pagePlayers.isEmpty
                      ? ListView(
                          controller: scrollController,
                          children: [
                            const SizedBox(height: 140),
                            Center(child: Text(context.tr('noSearchResults'))),
                          ],
                        )
                      : LayoutBuilder(
                          builder: (context, constraints) {
                            final columns = constraints.maxWidth >= 850
                                ? 4
                                : constraints.maxWidth >= 600
                                ? 3
                                : 2;
                            return GridView.builder(
                              controller: scrollController,
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 94),
                              gridDelegate:
                                  SliverGridDelegateWithFixedCrossAxisCount(
                                    crossAxisCount: columns,
                                    crossAxisSpacing: 12,
                                    mainAxisSpacing: 12,
                                    childAspectRatio: .70,
                                  ),
                              itemCount: pagePlayers.length,
                              itemBuilder: (context, index) => _PlayerCard(
                                player: pagePlayers[index],
                                onTap: () => openPlayer(pagePlayers[index]),
                              ),
                            );
                          },
                        ),
                ),
              ),
            ],
          ),
          if (totalPages > 1)
            PositionedDirectional(
              start: 18,
              end: 18,
              bottom: 14,
              child: _FloatingPager(
                currentPage: currentPage,
                totalPages: totalPages,
                onChanged: (page) => goToPage(page, totalPages),
              ),
            ),
        ],
      );
    },
  );
}

class _FloatingPager extends StatelessWidget {
  const _FloatingPager({
    required this.currentPage,
    required this.totalPages,
    required this.onChanged,
  });

  final int currentPage;
  final int totalPages;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) => Center(
    child: Material(
      elevation: 12,
      borderRadius: BorderRadius.circular(28),
      color: AppColors.navy,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              color: Colors.white,
              disabledColor: Colors.white30,
              onPressed: currentPage > 1
                  ? () => onChanged(currentPage - 1)
                  : null,
              icon: const Icon(Icons.chevron_left),
            ),
            DropdownButtonHideUnderline(
              child: DropdownButton<int>(
                value: currentPage,
                dropdownColor: AppColors.navy,
                iconEnabledColor: Colors.white,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                ),
                items: List.generate(
                  totalPages,
                  (index) => DropdownMenuItem(
                    value: index + 1,
                    child: Text('${index + 1} / $totalPages'),
                  ),
                ),
                onChanged: (page) {
                  if (page != null) onChanged(page);
                },
              ),
            ),
            IconButton(
              color: Colors.white,
              disabledColor: Colors.white30,
              onPressed: currentPage < totalPages
                  ? () => onChanged(currentPage + 1)
                  : null,
              icon: const Icon(Icons.chevron_right),
            ),
          ],
        ),
      ),
    ),
  );
}

class _PlayerCard extends StatelessWidget {
  const _PlayerCard({required this.player, required this.onTap});

  final Player player;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Stack(
              fit: StackFit.expand,
              children: [
                ColoredBox(
                  color: const Color(0xFFE9EDF3),
                  child: player.imageUrl.isEmpty
                      ? const Icon(
                          Icons.person,
                          size: 72,
                          color: Color(0xFFB5BCC8),
                        )
                      : CachedNetworkImage(
                          imageUrl: player.imageUrl,
                          fit: BoxFit.cover,
                          errorWidget: (_, _, _) =>
                              const Icon(Icons.person, size: 72),
                        ),
                ),
                PositionedDirectional(
                  top: 8,
                  end: 8,
                  child: Row(
                    children: [
                      if (player.hasImages)
                        const _MediaBadge(icon: Icons.photo_camera),
                      if (player.hasVideos)
                        const _MediaBadge(icon: Icons.play_arrow),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  player.name.isEmpty ? context.tr('dreamPlayer') : player.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 4),
                Text(
                  [
                    player.position,
                    player.country,
                  ].where((item) => item.isNotEmpty).join(' • '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: AppColors.muted, fontSize: 11),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.play_circle_outline, size: 16),
                    const SizedBox(width: 4),
                    Text(
                      context.tr('videosCount', {
                        'count': player.videos.length,
                      }),
                      style: const TextStyle(fontSize: 11),
                    ),
                    const Spacer(),
                    if (player.age != null)
                      Text(
                        context.tr('ageYears', {'age': player.age}),
                        style: const TextStyle(fontSize: 11),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class _MediaBadge extends StatelessWidget {
  const _MediaBadge({required this.icon});

  final IconData icon;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsetsDirectional.only(start: 4),
    padding: const EdgeInsets.all(5),
    decoration: const BoxDecoration(
      color: AppColors.green,
      shape: BoxShape.circle,
    ),
    child: Icon(icon, color: Colors.white, size: 15),
  );
}
