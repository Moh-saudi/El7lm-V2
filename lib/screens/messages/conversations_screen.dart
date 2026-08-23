import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../core/country_helper.dart';
import '../../models/conversation.dart';
import '../../services/data_service.dart';
import 'chat_detail_screen.dart';

class ConversationsScreen extends StatefulWidget {
  const ConversationsScreen({super.key, required this.dataService});

  final DataService dataService;

  @override
  State<ConversationsScreen> createState() => _ConversationsScreenState();
}

class _ConversationsScreenState extends State<ConversationsScreen> {
  late Future<List<ConversationModel>> _future;
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  void _refresh() {
    setState(() {
      _future = widget.dataService.fetchConversations();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _navigateToChat(
    ConversationModel conv,
    String targetId,
    String targetName,
    String targetType,
  ) {
    Navigator.of(context)
        .push(
      MaterialPageRoute<void>(
        builder: (_) => ChatDetailScreen(
          conversation: conv,
          targetId: targetId,
          targetName: targetName,
          targetType: targetType,
          dataService: widget.dataService,
        ),
      ),
    )
        .then((_) {
      if (mounted) _refresh();
    });
  }

  Future<void> _startChatWith({
    required BuildContext sheetContext,
    required String targetId,
    required String targetName,
    required String targetType,
    String? targetAvatar,
  }) async {
    final nav = Navigator.of(context);

    if (Navigator.of(sheetContext).canPop()) {
      Navigator.of(sheetContext).pop();
    }

    await Future<void>.delayed(const Duration(milliseconds: 150));

    try {
      final conv = await widget.dataService.startOrCreateConversation(
        targetId: targetId,
        targetName: targetName,
        targetType: targetType,
        targetAvatar: targetAvatar,
      );

      await nav.push(
        MaterialPageRoute<void>(
          builder: (_) => ChatDetailScreen(
            conversation: conv,
            targetId: targetId,
            targetName: targetName,
            targetType: targetType,
            dataService: widget.dataService,
          ),
        ),
      );
      _refresh();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('تعذر فتح المحادثة: $e')),
        );
      }
    }
  }

  Future<void> _showNewChatDialog() async {
    final players = await widget.dataService.fetchPlayers();
    final filterController = TextEditingController();

    if (!mounted) return;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (context, setState2) {
            final query = filterController.text.trim().toLowerCase();
            final filtered = players.where((p) {
              if (query.isEmpty) return true;
              return p.name.toLowerCase().contains(query) ||
                  p.position.toLowerCase().contains(query) ||
                  p.country.toLowerCase().contains(query);
            }).toList();

            return SafeArea(
              child: Container(
                height: MediaQuery.of(context).size.height * 0.75,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'ابدأ محادثة جديدة 💬',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.navy,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: filterController,
                      onChanged: (_) => setState2(() {}),
                      decoration: InputDecoration(
                        hintText: 'ابحث بالاسم، المركز أو الدولة...',
                        prefixIcon: const Icon(Icons.search_rounded),
                        filled: true,
                        fillColor: Colors.grey[100],
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Expanded(
                      child: filtered.isEmpty
                          ? const Center(
                              child: Text(
                                'لا توجد حسابات مطابقة',
                                style: TextStyle(color: AppColors.muted),
                              ),
                            )
                          : ListView.separated(
                              itemCount: filtered.length,
                              separatorBuilder: (context, index) =>
                                  const Divider(height: 1),
                              itemBuilder: (_, i) {
                                final player = filtered[i];
                                const badge = _AccountTypeBadge(
                                  label: 'لاعب 🏃',
                                  color: AppColors.green,
                                );
                                final flag = getCountryFlag(player.country);

                                return ListTile(
                                  contentPadding: const EdgeInsets.symmetric(
                                    vertical: 4,
                                    horizontal: 8,
                                  ),
                                  leading: CircleAvatar(
                                    radius: 22,
                                    backgroundColor:
                                        AppColors.green.withValues(alpha: .15),
                                    backgroundImage:
                                        (player.imageUrl.isNotEmpty &&
                                                player.imageUrl.startsWith('http'))
                                            ? NetworkImage(player.imageUrl)
                                            : null,
                                    child: (player.imageUrl.isEmpty ||
                                            !player.imageUrl.startsWith('http'))
                                        ? Text(
                                            player.name.isNotEmpty
                                                ? player.name[0].toUpperCase()
                                                : 'P',
                                            style: const TextStyle(
                                              color: AppColors.green,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          )
                                        : null,
                                  ),
                                  title: Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          player.name,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 15,
                                          ),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 3,
                                        ),
                                        decoration: BoxDecoration(
                                          color: badge.color.withValues(
                                            alpha: 0.12,
                                          ),
                                          borderRadius:
                                              BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          badge.label,
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: badge.color,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  subtitle: Text(
                                    '${player.position} • ${player.country} $flag',
                                    style: const TextStyle(
                                      color: AppColors.muted,
                                      fontSize: 12,
                                    ),
                                  ),
                                  trailing: Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: AppColors.green
                                          .withValues(alpha: 0.1),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(
                                      Icons.chat_bubble_rounded,
                                      color: AppColors.green,
                                      size: 18,
                                    ),
                                  ),
                                  onTap: () => _startChatWith(
                                    sheetContext: sheetCtx,
                                    targetId: player.id,
                                    targetName: player.name,
                                    targetType: 'player',
                                    targetAvatar: player.imageUrl,
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final currentUserId = widget.dataService.authService.authUserId ?? '';

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'المحادثات 💬',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            tooltip: 'تحديث',
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _refresh,
          ),
        ],
      ),
      body: FutureBuilder<List<ConversationModel>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text('خطأ في جلب المحادثات: ${snapshot.error}'),
              ),
            );
          }

          final conversations = snapshot.data ?? [];
          final filtered = conversations.where((conv) {
            if (_searchQuery.isEmpty) return true;
            final otherId = conv.participants.firstWhere(
              (id) => id != currentUserId,
              orElse: () => '',
            );
            final name = conv.participantNames[otherId] ?? '';
            return name.toLowerCase().contains(_searchQuery.toLowerCase());
          }).toList();

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: TextField(
                  controller: _searchController,
                  onChanged: (val) => setState(() => _searchQuery = val.trim()),
                  decoration: InputDecoration(
                    hintText: 'البحث في المحادثات...',
                    prefixIcon: const Icon(Icons.search_rounded),
                    filled: true,
                    fillColor: Colors.grey[100],
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                  ),
                ),
              ),
              Expanded(
                child: filtered.isEmpty
                    ? _EmptyState(onNewChat: _showNewChatDialog)
                    : RefreshIndicator(
                        onRefresh: () async => _refresh(),
                        child: ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: filtered.length,
                          separatorBuilder: (context, index) =>
                              const Divider(height: 1),
                          itemBuilder: (ctx2, index) {
                            final conv = filtered[index];
                            final targetId = conv.participants.firstWhere(
                              (id) => id != currentUserId,
                              orElse: () => '',
                            );
                            final targetName =
                                conv.participantNames[targetId] ?? 'مستخدم';
                            final targetType =
                                conv.participantTypes[targetId] ?? 'player';
                            final avatarUrl = conv.participantAvatars[targetId] ?? '';
                            final unread = (conv.unreadCount[currentUserId]
                                        as num? ??
                                    0)
                                .toInt();

                            final timeStr = conv.lastMessageTime != null
                                ? '${conv.lastMessageTime!.hour.toString().padLeft(2, '0')}:${conv.lastMessageTime!.minute.toString().padLeft(2, '0')}'
                                : '';

                            final badge = _getAccountTypeBadge(targetType);

                            // Active/Online indicator based on recent message timestamp
                            final isOnline = conv.updatedAt != null &&
                                DateTime.now().difference(conv.updatedAt!).inMinutes < 15;

                            return ListTile(
                              contentPadding: const EdgeInsets.symmetric(
                                vertical: 8,
                                horizontal: 4,
                              ),
                              onTap: () => _navigateToChat(
                                conv,
                                targetId,
                                targetName,
                                targetType,
                              ),
                              leading: Stack(
                                children: [
                                  CircleAvatar(
                                    radius: 24,
                                    backgroundColor:
                                        badge.color.withValues(alpha: .15),
                                    backgroundImage:
                                        (avatarUrl.isNotEmpty && avatarUrl.startsWith('http'))
                                            ? NetworkImage(avatarUrl)
                                            : null,
                                    child: (avatarUrl.isEmpty || !avatarUrl.startsWith('http'))
                                        ? Text(
                                            targetName.isNotEmpty
                                                ? targetName[0].toUpperCase()
                                                : '?',
                                            style: TextStyle(
                                              color: badge.color,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 18,
                                            ),
                                          )
                                        : null,
                                  ),
                                  Positioned(
                                    bottom: 0,
                                    right: 0,
                                    child: Container(
                                      width: 12,
                                      height: 12,
                                      decoration: BoxDecoration(
                                        color: isOnline ? Colors.green : Colors.grey[400],
                                        shape: BoxShape.circle,
                                        border: Border.all(color: Colors.white, width: 2),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              title: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      targetName,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                      ),
                                    ),
                                  ),
                                  Text(
                                    timeStr,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Theme.of(ctx2)
                                          .textTheme
                                          .bodySmall
                                          ?.color,
                                    ),
                                  ),
                                ],
                              ),
                              subtitle: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 6,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: badge.color.withValues(
                                        alpha: 0.12,
                                      ),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      badge.label,
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: badge.color,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      conv.lastMessage.isNotEmpty
                                          ? conv.lastMessage
                                          : 'محادثة جديدة',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: unread > 0
                                            ? Theme.of(ctx2)
                                                .textTheme
                                                .bodyLarge
                                                ?.color
                                            : Theme.of(ctx2)
                                                .textTheme
                                                .bodySmall
                                                ?.color,
                                        fontWeight: unread > 0
                                            ? FontWeight.bold
                                            : FontWeight.normal,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              trailing: unread > 0
                                  ? Container(
                                      padding: const EdgeInsets.all(7),
                                      decoration: const BoxDecoration(
                                        color: AppColors.green,
                                        shape: BoxShape.circle,
                                      ),
                                      child: Text(
                                        '$unread',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 11,
                                        ),
                                      ),
                                    )
                                  : const Icon(
                                      Icons.chevron_right_rounded,
                                      color: AppColors.muted,
                                    ),
                            );
                          },
                        ),
                      ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.green,
        foregroundColor: Colors.white,
        onPressed: _showNewChatDialog,
        child: const Icon(Icons.chat_bubble_rounded),
      ),
    );
  }

  _AccountTypeBadge _getAccountTypeBadge(String type) {
    return switch (type.toLowerCase()) {
      'club' => const _AccountTypeBadge(
          label: 'نادي ⚽',
          color: Color(0xFF2563EB),
        ),
      'academy' => const _AccountTypeBadge(
          label: 'أكاديمية 🏆',
          color: Color(0xFFD97706),
        ),
      'trainer' => const _AccountTypeBadge(
          label: 'مدرب 👟',
          color: Color(0xFF7C3AED),
        ),
      'agent' => const _AccountTypeBadge(
          label: 'وكيل 💼',
          color: Color(0xFFDC2626),
        ),
      'marketer' => const _AccountTypeBadge(
          label: 'مسوق 📣',
          color: Color(0xFF059669),
        ),
      _ => const _AccountTypeBadge(
          label: 'لاعب 🏃',
          color: AppColors.green,
        ),
    };
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onNewChat});
  final VoidCallback onNewChat;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.forum_outlined,
              size: 64,
              color: Theme.of(context).disabledColor,
            ),
            const SizedBox(height: 12),
            const Text(
              'لا توجد محادثات نشطة',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'اضغط + لبدء محادثة مع لاعب، نادي أو أكاديمية',
              style: TextStyle(
                fontSize: 13,
                color: Theme.of(context).disabledColor,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.green,
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 12,
                ),
              ),
              onPressed: onNewChat,
              icon: const Icon(Icons.chat_bubble_rounded),
              label: const Text(
                'ابدأ محادثة جديدة',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AccountTypeBadge {
  const _AccountTypeBadge({required this.label, required this.color});
  final String label;
  final Color color;
}
