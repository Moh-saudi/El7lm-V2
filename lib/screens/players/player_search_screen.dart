import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../models/player.dart';
import '../../services/data_service.dart';
import '../../widgets/async_state_view.dart';

class PlayerSearchScreen extends StatefulWidget {
  const PlayerSearchScreen({super.key, required this.dataService});

  final DataService dataService;

  @override
  State<PlayerSearchScreen> createState() => _PlayerSearchScreenState();
}

class _PlayerSearchScreenState extends State<PlayerSearchScreen> {
  late Future<List<Player>> future;
  String query = '';

  @override
  void initState() {
    super.initState();
    future = widget.dataService.fetchPlayers();
  }

  void refresh() => setState(() => future = widget.dataService.fetchPlayers());

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: TextField(
            onChanged: (value) =>
                setState(() => query = value.trim().toLowerCase()),
            decoration: const InputDecoration(
              hintText: 'ابحث بالاسم أو المركز أو الدولة',
              prefixIcon: Icon(Icons.search),
            ),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async => refresh(),
            child: AsyncStateView<List<Player>>(
              future: future,
              builder: (context, players) {
                final filtered = players.where((player) {
                  final haystack =
                      '${player.name} ${player.position} ${player.country}'
                          .toLowerCase();
                  return query.isEmpty || haystack.contains(query);
                }).toList();
                if (filtered.isEmpty) {
                  return ListView(
                    children: const [
                      SizedBox(height: 140),
                      Center(child: Text('لا توجد نتائج مطابقة')),
                    ],
                  );
                }
                return GridView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: .72,
                  ),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) =>
                      _PlayerCard(player: filtered[index]),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

class _PlayerCard extends StatelessWidget {
  const _PlayerCard({required this.player});

  final Player player;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Container(
              width: double.infinity,
              color: const Color(0xFFE9EDF3),
              child: player.imageUrl.isEmpty
                  ? const Icon(Icons.person, size: 72, color: Color(0xFFB5BCC8))
                  : CachedNetworkImage(
                      imageUrl: player.imageUrl,
                      fit: BoxFit.cover,
                      errorWidget: (_, _, _) =>
                          const Icon(Icons.person, size: 72),
                    ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  player.name,
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
                      '${player.videos.length} فيديو',
                      style: const TextStyle(fontSize: 11),
                    ),
                    const Spacer(),
                    if (player.age != null)
                      Text(
                        '${player.age} سنة',
                        style: const TextStyle(fontSize: 11),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
