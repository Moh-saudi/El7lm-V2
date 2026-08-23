import 'dart:async';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/app_config.dart';
import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/account_type.dart';
import '../../services/data_service.dart';
import '../../services/in_app_notification_service.dart';
import '../../widgets/language_switcher.dart';
import '../cinema/player_cinema_screen.dart';
import '../messages/conversations_screen.dart';
import '../notifications/notifications_screen.dart';
import '../opportunities/opportunities_screen.dart';
import '../players/manage_players_screen.dart';
import '../players/player_search_screen.dart';
import '../profile/manager_profile_screen.dart';
import '../profile/manager_settings_screen.dart';
import '../profile/player_profile_screen.dart';
import '../profile/player_profile_data.dart';
import 'dashboard_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({
    super.key,
    required this.accountType,
    required this.displayName,
    required this.dataService,
    required this.onSignOut,
  });

  final AccountType accountType;
  final String displayName;
  final DataService dataService;
  final Future<void> Function() onSignOut;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int selectedIndex = 0;
  int _unreadMessagesCount = 0;
  int _unreadNotificationsCount = 0;
  Timer? _unreadTimer;

  late final List<_Destination> _cachedDestinations;

  @override
  void initState() {
    super.initState();
    _initDestinations();
    _fetchUnreadCounts();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _ensureProfileCompletionReminder();
    });
    _unreadTimer = Timer.periodic(
      const Duration(seconds: 15),
      (_) => _fetchUnreadCounts(),
    );
  }

  @override
  void dispose() {
    _unreadTimer?.cancel();
    super.dispose();
  }

  void _initDestinations() {
    _cachedDestinations = widget.accountType.isPlayer
        ? [
            _Destination(
              'home',
              Icons.home_rounded,
              DashboardScreen(
                accountType: widget.accountType,
                displayName: widget.displayName,
                dataService: widget.dataService,
                onNavigate: (index) => setState(() => selectedIndex = index),
              ),
            ),
            _Destination(
              'players',
              Icons.groups_rounded,
              PlayerSearchScreen(dataService: widget.dataService),
            ),
            _Destination(
              'cinema',
              Icons.smart_display_rounded,
              PlayerCinemaScreen(
                dataService: widget.dataService,
                isScreenActive: selectedIndex == 2,
              ),
            ),
            _Destination(
              'opportunities',
              Icons.explore_rounded,
              OpportunitiesScreen(dataService: widget.dataService),
            ),
            _Destination(
              'myProfile',
              Icons.person_rounded,
              PlayerProfileScreen(dataService: widget.dataService),
            ),
          ]
        : [
            _Destination(
              'home',
              Icons.home_rounded,
              DashboardScreen(
                accountType: widget.accountType,
                displayName: widget.displayName,
                dataService: widget.dataService,
                onNavigate: (index) => setState(() => selectedIndex = index),
              ),
            ),
            _Destination(
              'players',
              Icons.groups_rounded,
              PlayerSearchScreen(dataService: widget.dataService),
            ),
            _Destination(
              'managePlayers',
              Icons.group_add_rounded,
              ManagePlayersScreen(
                accountType: widget.accountType,
                organizationName: widget.displayName,
                dataService: widget.dataService,
              ),
            ),
            _Destination(
              'cinema',
              Icons.smart_display_rounded,
              PlayerCinemaScreen(
                dataService: widget.dataService,
                isScreenActive: selectedIndex == 3,
              ),
            ),
            _Destination(
              'myProfile',
              Icons.person_rounded,
              ManagerProfileScreen(
                accountType: widget.accountType,
                displayName: widget.displayName,
                authService: widget.dataService.authService,
                dataService: widget.dataService,
                onSignOut: widget.onSignOut,
              ),
            ),
          ];
  }

  List<_Destination> destinations(BuildContext context) {
    return _cachedDestinations;
  }

  Future<void> _fetchUnreadCounts() async {
    try {
      final convs = await widget.dataService.fetchConversations();
      final currentUserId = widget.dataService.authService.authUserId ?? '';
      int msgCount = 0;
      for (final conv in convs) {
        msgCount += (conv.unreadCount[currentUserId] as num? ?? 0).toInt();
      }

      final notifs = await widget.dataService.fetchNotifications();
      int notifCount = notifs.where((n) => !n.isRead).length;

      if (mounted) {
        setState(() {
          _unreadMessagesCount = msgCount;
          _unreadNotificationsCount = notifCount;
        });
      }
    } catch (_) {}
  }

  Future<void> _ensureProfileCompletionReminder() async {
    if (!widget.accountType.isPlayer || !mounted) return;
    try {
      final profile = await widget.dataService.fetchProfile(AccountType.player);
      var total = 0;
      var filled = 0;
      for (final section in getProfileSections()) {
        for (final field in section.fields) {
          total++;
          final value = '${profile.values[field.key] ?? ''}'.trim();
          if (value.isNotEmpty &&
              value != 'null' &&
              value != '0' &&
              value != 'false' &&
              value != '0.0') {
            filled++;
          }
        }
      }
      final percent = total == 0 ? 0 : ((filled / total) * 100).round();
      if (!mounted) return;
      final notification = await InAppNotificationService()
          .createProfileReminderIfDue(
            completionPercent: percent,
            title: context.tr('profileReminderTitle'),
            message: context.tr('profileReminderBody', {'percent': '$percent'}),
          );
      if (!mounted || notification == null) return;
      InAppNotificationService().showInAppNotificationBanner(
        context: context,
        title: notification.title,
        body: notification.message,
        onTap: () => setState(() => selectedIndex = 4),
      );
      await _fetchUnreadCounts();
    } catch (_) {}
  }

  Future<void> _showUploadOptions(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetCtx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  context.tr('uploadSkillsMedia'),
                  style: Theme.of(
                    sheetCtx,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 6),
                Text(
                  context.tr('mediaSelectChoice'),
                  style: const TextStyle(color: AppColors.muted, fontSize: 13),
                ),
                const SizedBox(height: 20),
                ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFFEFF6FF),
                    child: Icon(
                      Icons.videocam_rounded,
                      color: Color(0xFF2563EB),
                    ),
                  ),
                  title: Text(
                    context.tr('uploadVideoClip'),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Text(context.tr('mp4FormatsDesc')),
                  onTap: () {
                    Navigator.pop(sheetCtx);
                    _pickAndUpload(ImageSource.gallery, isVideo: true);
                  },
                ),
                const SizedBox(height: 8),
                ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFFECFDF5),
                    child: Icon(
                      Icons.photo_library_rounded,
                      color: AppColors.green,
                    ),
                  ),
                  title: Text(
                    context.tr('uploadPhoto'),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Text(context.tr('jpgPngDesc')),
                  onTap: () {
                    Navigator.pop(sheetCtx);
                    _pickAndUpload(ImageSource.gallery, isVideo: false);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _pickAndUpload(
    ImageSource source, {
    required bool isVideo,
  }) async {
    final picker = ImagePicker();
    final file = isVideo
        ? await picker.pickVideo(source: source)
        : await picker.pickImage(source: source, imageQuality: 85);

    if (file == null) return;

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(context.tr('uploadingMediaWait')),
        duration: const Duration(seconds: 4),
      ),
    );

    try {
      final bytes = await file.readAsBytes();
      final ext = file.name.contains('.')
          ? file.name.split('.').last
          : (isVideo ? 'mp4' : 'jpg');
      final contentType = isVideo ? 'video/mp4' : 'image/jpeg';
      await widget.dataService.uploadPlayerMedia(
        bytes: bytes,
        extension: ext,
        contentType: contentType,
        isVideo: isVideo,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(context.tr('mediaUploadedSuccess')),
          backgroundColor: AppColors.green,
        ),
      );

      setState(() {
        _initDestinations();
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(context.errorText(e)),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = destinations(context);
    final isCinema = items[selectedIndex].icon == Icons.smart_display_rounded;
    final isProfile = items[selectedIndex].icon == Icons.person_rounded;

    return Scaffold(
      drawerEnableOpenDragGesture: false,
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      floatingActionButton: isProfile && widget.accountType.isPlayer
          ? FloatingActionButton(
              heroTag: 'camera-upload-fab',
              backgroundColor: AppColors.green,
              foregroundColor: Colors.white,
              onPressed: () => _showUploadOptions(context),
              child: const Icon(Icons.camera_alt_rounded),
            )
          : null,
      appBar: AppBar(
        backgroundColor: isCinema ? Colors.black : null,
        foregroundColor: isCinema ? Colors.white : null,
        title: Text(
          context.tr(items[selectedIndex].label),
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        actions: [
          if (!isCinema) const LanguageSwitcher(compact: true),
          if (!isCinema)
            IconButton(
              tooltip: context.tr('settings'),
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) =>
                      ManagerSettingsScreen(onSignOut: widget.onSignOut),
                ),
              ),
              icon: const Icon(Icons.settings_outlined),
            ),
          IconButton(
            tooltip: context.trOr('messages', 'Messages'),
            onPressed: () async {
              await Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) =>
                      ConversationsScreen(dataService: widget.dataService),
                ),
              );
              _fetchUnreadCounts();
            },
            icon: Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(
                  _unreadMessagesCount > 0
                      ? Icons.chat_rounded
                      : Icons.chat_outlined,
                  color: isCinema ? Colors.white : AppColors.navy,
                  size: 23,
                ),
                if (_unreadMessagesCount > 0)
                  Positioned(
                    top: -4,
                    right: -6,
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(
                        color: Colors.green,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(
                        minWidth: 16,
                        minHeight: 16,
                      ),
                      child: Text(
                        '$_unreadMessagesCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          IconButton(
            tooltip: context.trOr('notifications', 'Notifications'),
            onPressed: () async {
              await Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => NotificationsScreen(
                    dataService: widget.dataService,
                    onProfileCompletionTap: () {
                      setState(() => selectedIndex = 4);
                    },
                  ),
                ),
              );
              _fetchUnreadCounts();
            },
            icon: Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(
                  _unreadNotificationsCount > 0
                      ? Icons.notifications_active_rounded
                      : Icons.notifications_none_rounded,
                  color: isCinema ? Colors.white : AppColors.navy,
                  size: 23,
                ),
                if (_unreadNotificationsCount > 0)
                  Positioned(
                    top: -4,
                    right: -6,
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(
                        minWidth: 16,
                        minHeight: 16,
                      ),
                      child: Text(
                        '$_unreadNotificationsCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Builder(
            builder: (ctx) => IconButton(
              icon: Icon(
                Icons.grid_view_rounded,
                color: isCinema ? Colors.white : AppColors.navy,
              ),
              onPressed: () => Scaffold.of(ctx).openEndDrawer(),
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      endDrawer: _WebMenuDrawer(
        accountType: widget.accountType,
        onOpen: openWeb,
        onSignOut: widget.onSignOut,
      ),
      body: IndexedStack(
        index: selectedIndex,
        children: items.map((item) => item.screen).toList(),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: selectedIndex,
        onTap: (index) {
          debugPrint(
            '=== AppShell: Switching tab from $selectedIndex to $index ===',
          );
          setState(() {
            selectedIndex = index;
          });
        },
        type: BottomNavigationBarType.fixed,
        selectedItemColor: AppColors.green,
        unselectedItemColor: AppColors.navy,
        backgroundColor: Colors.white,
        elevation: 8,
        selectedLabelStyle: const TextStyle(
          fontWeight: FontWeight.bold,
          fontSize: 11,
        ),
        unselectedLabelStyle: const TextStyle(fontSize: 11),
        items: items
            .map(
              (item) => BottomNavigationBarItem(
                icon: Icon(item.icon),
                activeIcon: Icon(item.icon, color: AppColors.green),
                label: context.tr(item.label),
              ),
            )
            .toList(),
      ),
    );
  }

  Future<void> openWeb(String path) async {
    final base = AppConfig.webBaseUrl;
    final params = <String, String>{'mobile_source': 'flutter_app'};
    final target = Uri.parse(base).replace(path: path, queryParameters: params);

    try {
      if (!await launchUrl(target, mode: LaunchMode.externalApplication)) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('cannotOpenWebPage'))),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(context.errorText(e))));
    }
  }
}

class _Destination {
  const _Destination(this.label, this.icon, this.screen);

  final String label;
  final IconData icon;
  final Widget screen;
}

class _WebMenuDrawer extends StatelessWidget {
  const _WebMenuDrawer({
    required this.accountType,
    required this.onOpen,
    required this.onSignOut,
  });

  final AccountType accountType;
  final Future<void> Function(String path) onOpen;
  final Future<void> Function() onSignOut;

  @override
  Widget build(BuildContext context) {
    final base = '/dashboard/${accountType.value}';
    // Every path in this list has a real page under src/app/dashboard.
    // Player settings are native and are intentionally not duplicated here.
    final links = accountType.isPlayer
        ? [
            ('messages', Icons.chat_bubble_outline, '$base/messages'),
            ('notifications', Icons.notifications_none, '$base/notifications'),
            ('reports', Icons.analytics_outlined, '$base/reports'),
            ('tournaments', Icons.emoji_events_outlined, '$base/tournaments'),
            ('store', Icons.storefront_outlined, '$base/store'),
          ]
        : [
            ('messages', Icons.chat_bubble_outline, '$base/messages'),
            ('notifications', Icons.notifications_none, '$base/notifications'),
            ('players', Icons.groups_outlined, '$base/players'),
            (
              'searchPlayers',
              Icons.person_search_outlined,
              '$base/search-players',
            ),
            (
              'playerVideos',
              Icons.video_library_outlined,
              '$base/player-videos',
            ),
            ('store', Icons.storefront_outlined, '$base/store'),
            ('myProfile', Icons.account_circle_outlined, '$base/profile'),
          ];

    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            DrawerHeader(
              child: Row(
                children: [
                  Image.asset('assets/images/el7lm-logo.png', width: 68),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.tr('allDreamSections'),
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 18,
                          ),
                        ),
                        Text(
                          context.tr('webTemporary'),
                          style: const TextStyle(
                            color: AppColors.muted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                children: [
                  ...links.map(
                    (link) => ListTile(
                      leading: Icon(link.$2),
                      title: Text(context.tr(link.$1)),
                      trailing: const Icon(Icons.open_in_new, size: 17),
                      onTap: () async {
                        final pageTitle = context.tr(link.$1);
                        final confirmed = await showDialog<bool>(
                          context: context,
                          builder: (dialogContext) => AlertDialog(
                            icon: const Icon(
                              Icons.open_in_browser_rounded,
                              color: AppColors.green,
                              size: 34,
                            ),
                            title: Text(
                              context.tr('continueToWebTitle'),
                              textAlign: TextAlign.center,
                            ),
                            content: Text(
                              context.tr('continueToWebMessage', {
                                'page': pageTitle,
                              }),
                              textAlign: TextAlign.center,
                            ),
                            actions: [
                              TextButton(
                                onPressed: () =>
                                    Navigator.pop(dialogContext, false),
                                child: Text(context.tr('cancel')),
                              ),
                              FilledButton.icon(
                                onPressed: () =>
                                    Navigator.pop(dialogContext, true),
                                icon: const Icon(Icons.open_in_new_rounded),
                                label: Text(context.tr('continueToWebAction')),
                              ),
                            ],
                          ),
                        );
                        if (confirmed != true || !context.mounted) return;
                        Navigator.pop(context);
                        await onOpen(link.$3);
                      },
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: Text(context.tr('signOut')),
              onTap: () async {
                Navigator.pop(context);
                await onSignOut();
              },
            ),
          ],
        ),
      ),
    );
  }
}
