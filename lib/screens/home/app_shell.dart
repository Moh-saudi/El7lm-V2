import 'dart:async';
import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
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
import 'nisr_home_screen.dart';

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

class _AppShellState extends State<AppShell> with WidgetsBindingObserver, TickerProviderStateMixin {
  int selectedIndex = 0;
  final Set<int> _loadedTabs = {0};
  int _unreadMessagesCount = 0;
  int _unreadNotificationsCount = 0;
  bool _fetchingUnreadCounts = false;
  Timer? _unreadTimer;
  Timer? _initialUnreadTimer;
  RealtimeChannel? _notificationChannel;
  late AnimationController _navBarController;

  late final List<_Destination> _cachedDestinations;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initDestinations();
    _navBarController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    // Slide nav bar up on launch
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _navBarController.forward();
      _ensureProfileCompletionReminder();
      _setupRealtimeNotifications();
    });
    _initialUnreadTimer = Timer(const Duration(seconds: 2), () {
      if (mounted) _fetchUnreadCounts();
    });
    _startUnreadTimer();
  }

  void _setupRealtimeNotifications() {
    final uid = widget.dataService.authService.authUserId;
    if (uid != null && uid.isNotEmpty) {
      _notificationChannel?.unsubscribe();
      _notificationChannel = widget.dataService.subscribeToNotifications(uid, () {
        if (mounted) _fetchUnreadCounts();
      });
    }
  }

  void _startUnreadTimer() {
    _unreadTimer?.cancel();
    _unreadTimer = Timer.periodic(
      const Duration(seconds: 180),
      (_) => _fetchUnreadCounts(),
    );
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused || state == AppLifecycleState.inactive) {
      _unreadTimer?.cancel();
      _unreadTimer = null;
    } else if (state == AppLifecycleState.resumed) {
      if (mounted) {
        _fetchUnreadCounts();
        _setupRealtimeNotifications();
      }
      _startUnreadTimer();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _unreadTimer?.cancel();
    _initialUnreadTimer?.cancel();
    _notificationChannel?.unsubscribe();
    _navBarController.dispose();
    super.dispose();
  }

  void _selectTab(int index) {
    if (!mounted || index < 0 || index >= _cachedDestinations.length) return;
    if (index == selectedIndex) return;
    HapticFeedback.lightImpact();
    setState(() {
      selectedIndex = index;
      _loadedTabs.add(index);
    });
  }

  void _initDestinations() {
    _cachedDestinations = widget.accountType.isPlayer
        ? [
            _Destination(
              'home',
              CupertinoIcons.house_fill,
              NisrHomeScreen(
                displayName: widget.displayName,
                dataService: widget.dataService,
                onNavigate: _selectTab,
              ),
            ),
            _Destination(
              'players',
              CupertinoIcons.person_2_fill,
              PlayerSearchScreen(dataService: widget.dataService),
            ),
            _Destination(
              'cinema',
              CupertinoIcons.play_rectangle_fill,
              PlayerCinemaScreen(
                dataService: widget.dataService,
                isScreenActive: selectedIndex == 2,
              ),
            ),
            _Destination(
              'opportunities',
              CupertinoIcons.compass_fill,
              OpportunitiesScreen(dataService: widget.dataService),
            ),
            _Destination(
              'myProfile',
              CupertinoIcons.person_crop_circle_fill,
              PlayerProfileScreen(dataService: widget.dataService),
            ),
          ]
        : [
            _Destination(
              'home',
              CupertinoIcons.house_fill,
              DashboardScreen(
                accountType: widget.accountType,
                displayName: widget.displayName,
                dataService: widget.dataService,
                onNavigate: _selectTab,
              ),
            ),
            _Destination(
              'players',
              CupertinoIcons.person_2_fill,
              PlayerSearchScreen(dataService: widget.dataService),
            ),
            _Destination(
              'managePlayers',
              CupertinoIcons.person_badge_plus,
              ManagePlayersScreen(
                accountType: widget.accountType,
                organizationName: widget.displayName,
                dataService: widget.dataService,
              ),
            ),
            _Destination(
              'cinema',
              CupertinoIcons.play_rectangle_fill,
              PlayerCinemaScreen(
                dataService: widget.dataService,
                isScreenActive: selectedIndex == 3,
              ),
            ),
            _Destination(
              'myProfile',
              CupertinoIcons.person_crop_circle_fill,
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
    if (_fetchingUnreadCounts) return;
    _fetchingUnreadCounts = true;
    try {
      final currentUserId = widget.dataService.authService.authUserId ?? '';
      final convsFuture = widget.dataService.fetchConversations();
      final notifCountFuture = widget.dataService.fetchUnreadNotificationsCount();

      final convs = await convsFuture;
      final notifCount = await notifCountFuture;

      int msgCount = 0;
      for (final conv in convs) {
        msgCount += (conv.unreadCount[currentUserId] as num? ?? 0).toInt();
      }

      if (mounted) {
        setState(() {
          _unreadMessagesCount = msgCount;
          _unreadNotificationsCount = notifCount;
        });
      }
    } catch (_) {
    } finally {
      _fetchingUnreadCounts = false;
    }
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
        onTap: () => _selectTab(4),
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
                      Icons.camera_alt_rounded,
                      color: Color(0xFF2563EB),
                    ),
                  ),
                  title: const Text(
                    'التقاط صورة فورية بالكاميرا',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: const Text('تصوير مباشر بكاميرا الهاتف'),
                  onTap: () {
                    Navigator.pop(sheetCtx);
                    _pickAndUpload(ImageSource.camera, isVideo: false);
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
                const SizedBox(height: 8),
                ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFFFEF2F2),
                    child: Icon(
                      Icons.videocam_rounded,
                      color: Colors.red,
                    ),
                  ),
                  title: const Text(
                    'تصوير فيديو فوري بالكاميرا',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: const Text('تسجيل فيديو مباشر لمهارات اللاعب'),
                  onTap: () {
                    Navigator.pop(sheetCtx);
                    _pickAndUpload(ImageSource.camera, isVideo: true);
                  },
                ),
                const SizedBox(height: 8),
                ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFFF5F3FF),
                    child: Icon(
                      Icons.video_library_rounded,
                      color: Color(0xFF7C3AED),
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
      final publicUrl = await widget.dataService.uploadPlayerMedia(
        bytes: bytes,
        extension: ext,
        contentType: contentType,
        isVideo: isVideo,
      );

      // Persist to player profile in database
      try {
        final profile = await widget.dataService.fetchProfile(AccountType.player);
        if (isVideo) {
          final list = (profile.values['video_urls'] as List? ?? profile.values['videos'] as List? ?? []).map((e) => '$e').toList();
          if (!list.contains(publicUrl)) list.add(publicUrl);
          await widget.dataService.savePlayerProfile(profile, {'video_urls': list, 'videos': list});
        } else {
          final list = (profile.values['additional_images'] as List? ?? profile.values['images'] as List? ?? []).map((e) => '$e').toList();
          if (!list.contains(publicUrl)) list.add(publicUrl);
          await widget.dataService.savePlayerProfile(profile, {'additional_images': list, 'images': list});
        }
      } catch (profileSaveErr) {
        debugPrint('⚠️ Non-fatal profile media sync warning: $profileSaveErr');
      }

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
    final isProfile = selectedIndex < items.length &&
        (items[selectedIndex].icon == CupertinoIcons.person_crop_circle_fill);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      drawerEnableOpenDragGesture: false,
      endDrawer: _WebMenuDrawer(
        accountType: widget.accountType,
        onOpen: openWeb,
        onSignOut: widget.onSignOut,
      ),
      // ─── Minimal top bar ────────────────────────────────────────────────
      appBar: _MinimalAppBar(
        label: context.tr(items[selectedIndex].label),
        isCinema: false,
        unreadMessages: _unreadMessagesCount,
        unreadNotifications: _unreadNotificationsCount,
        onMessages: () async {
          await Navigator.of(context).push(_appleRoute(
            ConversationsScreen(dataService: widget.dataService),
          ));
          _fetchUnreadCounts();
        },
        onNotifications: () async {
          await Navigator.of(context).push(_appleRoute(
            NotificationsScreen(
              dataService: widget.dataService,
              onProfileCompletionTap: () => _selectTab(
                widget.accountType.isPlayer ? 4 : 4,
              ),
            ),
          ));
          _fetchUnreadCounts();
        },
        onSettings: () => Navigator.of(context).push(_appleRoute(
          ManagerSettingsScreen(onSignOut: widget.onSignOut),
        )),
        onMenu: () => Scaffold.of(context).openEndDrawer(),
        showSettings: true,
        showLanguage: true,
        languageSwitcher: const LanguageSwitcher(compact: true, isDark: false),
      ),
      extendBody: false,
      bottomNavigationBar: SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(0, 1),
          end: Offset.zero,
        ).animate(CurvedAnimation(
          parent: _navBarController,
          curve: Curves.easeOutCubic,
        )),
        child: _FloatingPillNav(
          items: items,
          selectedIndex: selectedIndex,
          onTap: _selectTab,
          isCinema: false,
        ),
      ),
      // ─── Body: lazy IndexedStack ──────────────────────────────────────
      body: Stack(
        children: [
          IndexedStack(
            index: selectedIndex,
            children: [
              for (var i = 0; i < items.length; i++)
                if (!_loadedTabs.contains(i))
                  const SizedBox.shrink()
                else if (items[i].screen is PlayerCinemaScreen)
                  PlayerCinemaScreen(
                    dataService: widget.dataService,
                    isScreenActive: selectedIndex == i,
                  )
                else
                  items[i].screen,
            ],
          ),
          // ─── Floating camera FAB (profile screen only) ───────────────
          if (isProfile && widget.accountType.isPlayer)
            Positioned(
              right: 20,
              bottom: 16,
              child: _AppleFAB(
                onPressed: () => _showUploadOptions(context),
              ),
            ),
        ],
      ),
    );
  }

  // Apple-style page transition (fade + slight slide up)
  Route<T> _appleRoute<T>(Widget page) {
    return PageRouteBuilder<T>(
      pageBuilder: (_, animation, secondaryAnimation) => page,
      transitionDuration: const Duration(milliseconds: 320),
      reverseTransitionDuration: const Duration(milliseconds: 280),
      transitionsBuilder: (_, animation, secondaryAnimation, child) {
        final curved = CurvedAnimation(
          parent: animation,
          curve: Curves.easeOutCubic,
        );
        return FadeTransition(
          opacity: curved,
          child: SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0, 0.04),
              end: Offset.zero,
            ).animate(curved),
            child: child,
          ),
        );
      },
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
            ('reports', CupertinoIcons.chart_bar_alt_fill, '$base/reports'),
            ('tournaments', CupertinoIcons.rosette, '$base/tournaments'),
            ('store', CupertinoIcons.cart_fill, '$base/store'),
          ]
        : [
            ('reports', CupertinoIcons.chart_bar_alt_fill, '$base/reports'),
            ('tournaments', CupertinoIcons.rosette, '$base/tournaments'),
            ('store', CupertinoIcons.cart_fill, '$base/store'),
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

class _IOSActionButton extends StatelessWidget {
  const _IOSActionButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
    this.badgeCount = 0,
    this.badgeColor = const Color(0xFFEF4444),
    this.isCinema = false,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  final int badgeCount;
  final Color badgeColor;
  final bool isCinema;

  @override
  Widget build(BuildContext context) {
    final bgColor = isCinema
        ? Colors.white.withValues(alpha: 0.12)
        : const Color(0xFF0F172A).withValues(alpha: 0.05);
    final borderColor = isCinema
        ? Colors.white.withValues(alpha: 0.15)
        : const Color(0xFF0F172A).withValues(alpha: 0.08);
    final iconColor = isCinema ? Colors.white : const Color(0xFF0F172A);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2.5),
      child: Tooltip(
        message: tooltip,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: borderColor, width: 0.8),
              ),
              child: Stack(
                alignment: Alignment.center,
                clipBehavior: Clip.none,
                children: [
                  Icon(icon, color: iconColor, size: 20),
                  if (badgeCount > 0)
                    Positioned(
                      top: -3,
                      right: -3,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 4,
                          vertical: 1.5,
                        ),
                        decoration: BoxDecoration(
                          color: badgeColor,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isCinema ? Colors.black : Colors.white,
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: badgeColor.withValues(alpha: 0.4),
                              blurRadius: 4,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                        constraints: const BoxConstraints(
                          minWidth: 16,
                          minHeight: 16,
                        ),
                        child: Text(
                          badgeCount > 99 ? '99+' : '$badgeCount',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 8.5,
                            fontWeight: FontWeight.w800,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// _MinimalAppBar — Clean, Apple-style top bar
// ═══════════════════════════════════════════════════════════════
class _MinimalAppBar extends StatelessWidget implements PreferredSizeWidget {
  const _MinimalAppBar({
    required this.label,
    required this.isCinema,
    required this.unreadMessages,
    required this.unreadNotifications,
    required this.onMessages,
    required this.onNotifications,
    required this.onSettings,
    required this.onMenu,
    required this.showSettings,
    required this.showLanguage,
    required this.languageSwitcher,
  });

  final String label;
  final bool isCinema;
  final int unreadMessages;
  final int unreadNotifications;
  final VoidCallback onMessages;
  final VoidCallback onNotifications;
  final VoidCallback onSettings;
  final VoidCallback onMenu;
  final bool showSettings;
  final bool showLanguage;
  final Widget languageSwitcher;

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    final bg = isCinema ? Colors.black : const Color(0xFFF9FBFF);
    final fg = isCinema ? Colors.white : AppColors.ink;

    return AppBar(
      backgroundColor: bg,
      foregroundColor: fg,
      elevation: 0,
      scrolledUnderElevation: isCinema ? 0 : 1,
      title: Text(
        label,
        style: GoogleFonts.cairo(
          fontWeight: FontWeight.w700,
          fontSize: 16,
          color: fg,
        ),
      ),
      actions: [
        if (showLanguage) languageSwitcher,
        if (showSettings)
          _IOSActionButton(
            tooltip: 'settings',
            icon: CupertinoIcons.gear_alt,
            isCinema: isCinema,
            onTap: onSettings,
          ),
        // Messages
        _IOSActionButton(
          tooltip: 'messages',
          icon: unreadMessages > 0
              ? CupertinoIcons.chat_bubble_2_fill
              : CupertinoIcons.chat_bubble_2,
          badgeCount: unreadMessages,
          badgeColor: const Color(0xFF10B981),
          isCinema: isCinema,
          onTap: onMessages,
        ),
        // Notifications
        _IOSActionButton(
          tooltip: 'notifications',
          icon: unreadNotifications > 0
              ? CupertinoIcons.bell_fill
              : CupertinoIcons.bell,
          badgeCount: unreadNotifications,
          badgeColor: const Color(0xFFEF4444),
          isCinema: isCinema,
          onTap: onNotifications,
        ),
        // Web menu
        Builder(
          builder: (ctx) => _IOSActionButton(
            tooltip: 'menu',
            icon: CupertinoIcons.square_grid_2x2,
            isCinema: isCinema,
            onTap: () => Scaffold.of(ctx).openEndDrawer(),
          ),
        ),
        const SizedBox(width: 8),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// _FloatingPillNav — Instagram/Apple floating pill navigation
// ═══════════════════════════════════════════════════════════════
class _FloatingPillNav extends StatelessWidget {
  const _FloatingPillNav({
    required this.items,
    required this.selectedIndex,
    required this.onTap,
    required this.isCinema,
  });

  final List<_Destination> items;
  final int selectedIndex;
  final ValueChanged<int> onTap;
  final bool isCinema;

  @override
  Widget build(BuildContext context) {
    final isDark = isCinema;
    final pillBg = isDark
        ? const Color(0xFF141E33)
        : Colors.white;
    final shadowColor = isDark
        ? Colors.black.withValues(alpha: 0.6)
        : const Color(0xFF111A4B).withValues(alpha: 0.12);

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 6, 16, 10),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(32),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
            child: Container(
              height: 64,
              decoration: BoxDecoration(
                color: pillBg.withValues(alpha: isDark ? 0.92 : 0.96),
                borderRadius: BorderRadius.circular(32),
                border: Border.all(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.12)
                      : const Color(0xFF111A4B).withValues(alpha: 0.08),
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: shadowColor,
                    blurRadius: 28,
                    spreadRadius: 0,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                children: [
                  for (var i = 0; i < items.length; i++)
                    _PillNavItem(
                      icon: items[i].icon,
                      label: items[i].label,
                      isSelected: i == selectedIndex,
                      isDark: isDark,
                      onTap: () => onTap(i),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// _PillNavItem — Single nav icon + label with animated indicator
// ═══════════════════════════════════════════════════════════════
class _PillNavItem extends StatefulWidget {
  const _PillNavItem({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.isDark,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool isSelected;
  final bool isDark;
  final VoidCallback onTap;

  @override
  State<_PillNavItem> createState() => _PillNavItemState();
}

class _PillNavItemState extends State<_PillNavItem>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
      value: widget.isSelected ? 1.0 : 0.0,
    );
    _scaleAnim = Tween<double>(begin: 1.0, end: 1.12).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeOutBack),
    );
  }

  @override
  void didUpdateWidget(_PillNavItem old) {
    super.didUpdateWidget(old);
    if (widget.isSelected != old.isSelected) {
      if (widget.isSelected) {
        _ctrl.forward();
      } else {
        _ctrl.reverse();
      }
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeColor = widget.isDark ? Colors.white : AppColors.green;
    final inactiveColor = widget.isDark
        ? Colors.white.withValues(alpha: 0.40)
        : const Color(0xFF64748B);

    return Expanded(
      child: GestureDetector(
        onTap: widget.onTap,
        behavior: HitTestBehavior.opaque,
        child: SizedBox(
          height: 64,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Icon with scale animation
              AnimatedBuilder(
                animation: _scaleAnim,
                builder: (_, child) => Transform.scale(
                  scale: widget.isSelected ? _scaleAnim.value : 1.0,
                  child: child,
                ),
                child: Icon(
                  widget.icon,
                  size: 22,
                  color: widget.isSelected ? activeColor : inactiveColor,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                context.tr(widget.label),
                style: GoogleFonts.cairo(
                  fontSize: 10.5,
                  fontWeight:
                      widget.isSelected ? FontWeight.w700 : FontWeight.w600,
                  color: widget.isSelected ? activeColor : inactiveColor,
                  letterSpacing: -0.2,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// _AppleFAB — Premium camera upload floating action button
// ═══════════════════════════════════════════════════════════════
class _AppleFAB extends StatefulWidget {
  const _AppleFAB({required this.onPressed});
  final VoidCallback onPressed;

  @override
  State<_AppleFAB> createState() => _AppleFABState();
}

class _AppleFABState extends State<_AppleFAB>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
      lowerBound: 0.9,
      upperBound: 1.0,
      value: 1.0,
    );
    _scale = _ctrl;
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _ctrl.reverse(),
      onTapUp: (_) {
        _ctrl.forward();
        widget.onPressed();
      },
      onTapCancel: () => _ctrl.forward(),
      child: AnimatedBuilder(
        animation: _scale,
        builder: (_, child) => Transform.scale(scale: _scale.value, child: child),
        child: Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF079455), Color(0xFF05713F)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: AppColors.green.withValues(alpha: 0.4),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: const Icon(
            CupertinoIcons.camera_fill,
            color: Colors.white,
            size: 24,
          ),
        ),
      ),
    );
  }
}

