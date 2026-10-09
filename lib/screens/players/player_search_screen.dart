import 'dart:async';
import 'dart:convert';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../core/country_helper.dart';
import '../../l10n/app_localizations.dart';
import '../../models/player.dart';
import '../../models/player_filter.dart';
import '../../services/data_service.dart';
import '../../widgets/player_filter_sheet.dart';
import '../profile/player_profile_data.dart';
import 'player_details_screen.dart';

class PlayerSearchScreen extends StatefulWidget {
  const PlayerSearchScreen({super.key, required this.dataService});

  final DataService dataService;

  @override
  State<PlayerSearchScreen> createState() => _PlayerSearchScreenState();
}

class _PlayerSearchScreenState extends State<PlayerSearchScreen> {
  static const int _batchLimit = 30;

  final List<Player> _players = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  bool _hasMore = true;
  int _currentPage = 1;
  String? _error;
  Timer? _debounceTimer;

  final searchController = TextEditingController();
  final scrollController = ScrollController();
  PlayerFilter filter = const PlayerFilter();
  Set<String> favoriteIds = <String>{};
  final Set<String> favoriteChanges = <String>{};
  bool favoritesOnly = false;

  @override
  void initState() {
    super.initState();
    scrollController.addListener(_onScroll);
    _loadInitialPlayers();
    _loadFavorites();
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    scrollController.removeListener(_onScroll);
    scrollController.dispose();
    searchController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!scrollController.hasClients) return;
    final maxScroll = scrollController.position.maxScrollExtent;
    final currentScroll = scrollController.position.pixels;
    if (currentScroll >= maxScroll - 350) {
      if (!_isLoading && !_isLoadingMore && _hasMore) {
        _loadNextPage();
      }
    }
  }

  Future<void> _loadInitialPlayers() async {
    setState(() {
      _isLoading = true;
      _currentPage = 1;
      _hasMore = true;
      _error = null;
    });

    try {
      final results = await widget.dataService.fetchPlayers(
        page: 1,
        limit: _batchLimit,
        search: filter.query.isNotEmpty ? filter.query : null,
        position: filter.position.isNotEmpty ? filter.position : null,
        country: filter.country.isNotEmpty ? filter.country : null,
      );

      if (!mounted) return;
      setState(() {
        _players.clear();
        _players.addAll(results);
        _isLoading = false;
        _hasMore = results.length >= _batchLimit;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _loadNextPage() async {
    if (_isLoadingMore || !_hasMore) return;
    setState(() => _isLoadingMore = true);

    final nextPage = _currentPage + 1;
    try {
      final results = await widget.dataService.fetchPlayers(
        page: nextPage,
        limit: _batchLimit,
        search: filter.query.isNotEmpty ? filter.query : null,
        position: filter.position.isNotEmpty ? filter.position : null,
        country: filter.country.isNotEmpty ? filter.country : null,
      );

      if (!mounted) return;
      setState(() {
        _currentPage = nextPage;
        final existingIds = _players.map((p) => p.id).toSet();
        for (final p in results) {
          if (!existingIds.contains(p.id)) {
            _players.add(p);
            existingIds.add(p.id);
          }
        }
        _hasMore = results.length >= _batchLimit;
        _isLoadingMore = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _isLoadingMore = false);
    }
  }

  Future<void> refresh() async {
    await Future.wait([
      _loadInitialPlayers(),
      _loadFavorites(),
    ]);
  }

  Future<void> _loadFavorites() async {
    try {
      final ids = await widget.dataService.fetchFavoritePlayerIds();
      if (mounted) setState(() => favoriteIds = ids);
    } catch (_) {}
  }

  Future<void> toggleFavorite(Player player) async {
    if (favoriteChanges.contains(player.id)) return;
    final wasFavorite = favoriteIds.contains(player.id);
    setState(() {
      favoriteChanges.add(player.id);
      if (wasFavorite) {
        favoriteIds.remove(player.id);
      } else {
        favoriteIds.add(player.id);
      }
    });
    try {
      await widget.dataService.setPlayerFavorite(player.id, !wasFavorite);
    } catch (exception) {
      if (!mounted) return;
      setState(() {
        if (wasFavorite) {
          favoriteIds.add(player.id);
        } else {
          favoriteIds.remove(player.id);
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('favoriteUpdateFailed'))),
      );
    } finally {
      if (mounted) setState(() => favoriteChanges.remove(player.id));
    }
  }

  void updateQuery(String value) {
    setState(() {
      filter = filter.copyWith(query: value.trim());
    });
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 350), () {
      if (!mounted) return;
      _loadInitialPlayers();
    });
  }

  Future<void> openFilters() async {
    final result = await showPlayerFilterSheet(
      context: context,
      initial: filter,
      players: _players,
    );
    if (result == null || !mounted) return;
    setState(() {
      filter = result.copyWith(query: searchController.text.trim());
    });
    _loadInitialPlayers();
  }

  Future<void> openPlayer(Player player) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PlayerDetailsScreen(
          initialPlayer: player,
          dataService: widget.dataService,
          initiallyFavorite: favoriteIds.contains(player.id),
          onFavoriteChanged: (isFavorite) {
            if (!mounted) return;
            setState(() {
              if (isFavorite) {
                favoriteIds.add(player.id);
              } else {
                favoriteIds.remove(player.id);
              }
            });
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _players
        .where(filter.matches)
        .where((player) => !favoritesOnly || favoriteIds.contains(player.id))
        .toList();
    final advancedFilterCount =
        filter.activeCount - (filter.query.isEmpty ? 0 : 1);

    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 850
            ? 4
            : constraints.maxWidth >= 600
                ? 3
                : 2;

        return RefreshIndicator(
          onRefresh: refresh,
          child: CustomScrollView(
            controller: scrollController,
            physics: const BouncingScrollPhysics(
              parent: AlwaysScrollableScrollPhysics(),
            ),
            slivers: [
              SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
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
                              onPressed: openFilters,
                              icon: const Icon(Icons.tune),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Align(
                        alignment: AlignmentDirectional.centerStart,
                        child: FilterChip(
                          selected: favoritesOnly,
                          avatar: Icon(
                            favoritesOnly
                                ? Icons.favorite_rounded
                                : Icons.favorite_border_rounded,
                            size: 17,
                          ),
                          label: Text(
                            context.tr('favoritesOnly', {
                              'count': favoriteIds.length,
                            }),
                          ),
                          onSelected: (value) => setState(() {
                            favoritesOnly = value;
                          }),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
              if (_isLoading && _players.isEmpty)
                const SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (_error != null && _players.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.error_outline, size: 48, color: Colors.orange),
                          const SizedBox(height: 12),
                          Text(_error!, textAlign: TextAlign.center),
                          const SizedBox(height: 16),
                          ElevatedButton.icon(
                            onPressed: _loadInitialPlayers,
                            icon: const Icon(Icons.refresh),
                            label: Text(context.tr('retry')),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              else if (filtered.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(
                    child: Text(context.tr('noSearchResults')),
                  ),
                )
              else ...[
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  sliver: SliverGrid(
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: columns,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: .70,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, index) => RepaintBoundary(
                        child: _PlayerCard(
                          player: filtered[index],
                          isFavorite: favoriteIds.contains(filtered[index].id),
                          favoriteBusy: favoriteChanges.contains(filtered[index].id),
                          onFavorite: () => toggleFavorite(filtered[index]),
                          onTap: () => openPlayer(filtered[index]),
                        ),
                      ),
                      childCount: filtered.length,
                      addAutomaticKeepAlives: true,
                      addRepaintBoundaries: false,
                    ),
                  ),
                ),
                if (_isLoadingMore)
                  const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Center(
                        child: SizedBox(
                          width: 26,
                          height: 26,
                          child: CircularProgressIndicator(strokeWidth: 2.5),
                        ),
                      ),
                    ),
                  )
                else if (!_hasMore && filtered.isNotEmpty)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                      child: Center(
                        child: Text(
                          '${context.tr('showingAllPlayers')} (${filtered.length})',
                          style: TextStyle(
                            color: Colors.grey.shade500,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _PlayerCard extends StatelessWidget {
  const _PlayerCard({
    required this.player,
    required this.isFavorite,
    required this.favoriteBusy,
    required this.onFavorite,
    required this.onTap,
  });

  final Player player;
  final bool isFavorite;
  final bool favoriteBusy;
  final VoidCallback onFavorite;
  final VoidCallback onTap;

  static final Map<String, Uint8List> _base64Cache = <String, Uint8List>{};

  static Uint8List? _getDecodedBytes(String raw) {
    if (!raw.startsWith('data:image')) return null;
    final cached = _base64Cache[raw];
    if (cached != null) return cached;
    try {
      final bytes = base64Decode(raw.split(',').last);
      _base64Cache[raw] = bytes;
      return bytes;
    } catch (_) {
      return null;
    }
  }

  Widget _buildImage(BuildContext context) {
    if (player.imageUrl.isEmpty) {
      return const Icon(
        Icons.person,
        size: 72,
        color: Color(0xFFB5BCC8),
      );
    }
    if (player.imageUrl.startsWith('data:image')) {
      final bytes = _getDecodedBytes(player.imageUrl);
      if (bytes != null) {
        return Image.memory(
          bytes,
          fit: BoxFit.cover,
          cacheWidth: 360,
          cacheHeight: 480,
          errorBuilder: (_, _, _) => const Icon(Icons.person, size: 72),
        );
      }
      return const Icon(Icons.person, size: 72);
    }
    if (kIsWeb) {
      return Image.network(
        player.imageUrl,
        fit: BoxFit.cover,
        cacheWidth: 360,
        cacheHeight: 480,
        errorBuilder: (_, _, _) => const Icon(Icons.person, size: 72),
      );
    }
    return CachedNetworkImage(
      imageUrl: player.imageUrl,
      fit: BoxFit.cover,
      memCacheWidth: 360,
      memCacheHeight: 480,
      placeholder: (_, _) => const Icon(Icons.person, size: 72),
      errorWidget: (_, _, _) => const Icon(Icons.person, size: 72),
    );
  }

  @override
  Widget build(BuildContext context) => Card(
    elevation: 1,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    child: InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ColoredBox(
                    color: const Color(0xFFE9EDF3),
                    child: _buildImage(context),
                  ),
                  PositionedDirectional(
                    top: 8,
                    end: 8,
                    child: Material(
                      color: Colors.white.withValues(alpha: .94),
                      shape: const CircleBorder(),
                      elevation: 2,
                      child: IconButton(
                        tooltip: context.tr(
                          isFavorite ? 'removeFavorite' : 'addFavorite',
                        ),
                        onPressed: favoriteBusy ? null : onFavorite,
                        icon: favoriteBusy
                            ? const SizedBox(
                                width: 19,
                                height: 19,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : Icon(
                                isFavorite
                                    ? Icons.favorite_rounded
                                    : Icons.favorite_border_rounded,
                                color: isFavorite
                                    ? const Color(0xFFE5484D)
                                    : AppColors.navy,
                              ),
                      ),
                    ),
                  ),
                  PositionedDirectional(
                    top: 56,
                    end: 8,
                    child: Column(
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
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  player.localizedName(context.languageCode).isEmpty
                      ? context.tr('dreamPlayer')
                      : player.localizedName(context.languageCode),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 4),
                Text(
                  [
                    player.position.isEmpty
                        ? ''
                        : localizedProfileOptionLabel(
                            context,
                            'position',
                            canonicalProfileOptionValue(
                              'position',
                              player.position,
                            ),
                          ),
                    player.country.isNotEmpty
                        ? '${localizedProfileOptionLabel(context, 'country', canonicalProfileOptionValue('country', player.country))} ${getCountryFlag(player.country)}'
                        : '',
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
