import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/app_config.dart';
import '../../core/app_theme.dart';
import '../../models/account_type.dart';
import '../../services/data_service.dart';
import '../cinema/player_cinema_screen.dart';
import '../opportunities/opportunities_screen.dart';
import '../players/manage_players_screen.dart';
import '../players/player_search_screen.dart';
import '../profile/player_profile_screen.dart';
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

  List<_Destination> get destinations => widget.accountType.isPlayer
      ? [
          _Destination(
            'الرئيسية',
            Icons.home_rounded,
            DashboardScreen(
              accountType: widget.accountType,
              displayName: widget.displayName,
              onNavigate: (index) => setState(() => selectedIndex = index),
            ),
          ),
          _Destination(
            'اللاعبون',
            Icons.groups_rounded,
            PlayerSearchScreen(dataService: widget.dataService),
          ),
          _Destination(
            'السينما',
            Icons.smart_display_rounded,
            PlayerCinemaScreen(dataService: widget.dataService),
          ),
          _Destination(
            'الفرص',
            Icons.explore_rounded,
            OpportunitiesScreen(dataService: widget.dataService),
          ),
          _Destination(
            'ملفي',
            Icons.person_rounded,
            PlayerProfileScreen(dataService: widget.dataService),
          ),
        ]
      : [
          _Destination(
            'الرئيسية',
            Icons.home_rounded,
            DashboardScreen(
              accountType: widget.accountType,
              displayName: widget.displayName,
              onNavigate: (index) => setState(() => selectedIndex = index),
            ),
          ),
          _Destination(
            'إدارة اللاعبين',
            Icons.group_add_rounded,
            ManagePlayersScreen(
              accountType: widget.accountType,
              organizationName: widget.displayName,
              dataService: widget.dataService,
            ),
          ),
        ];

  Future<void> openWeb(String path) async {
    final uri = Uri.parse('${AppConfig.webBaseUrl}$path');
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) &&
        mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تعذر فتح صفحة الويب الآن.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = destinations;
    if (selectedIndex >= items.length) selectedIndex = 0;
    return Scaffold(
      appBar: AppBar(
        title: Text(
          items[selectedIndex].label,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        actions: [
          Builder(
            builder: (context) => IconButton(
              tooltip: 'كل الأقسام',
              onPressed: () => Scaffold.of(context).openEndDrawer(),
              icon: const Icon(Icons.grid_view_rounded),
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
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: (index) => setState(() => selectedIndex = index),
        destinations: items
            .map(
              (item) => NavigationDestination(
                icon: Icon(item.icon),
                selectedIcon: Icon(item.icon, color: AppColors.green),
                label: item.label,
              ),
            )
            .toList(),
      ),
    );
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
    final links = [
      ('الرسائل', Icons.chat_bubble_outline, '$base/messages'),
      ('الإشعارات', Icons.notifications_none, '$base/notifications'),
      ('التقارير والإحصاءات', Icons.analytics_outlined, '$base/reports'),
      ('البطولات', Icons.emoji_events_outlined, '$base/tournaments'),
      ('الأكاديمية', Icons.school_outlined, '$base/academy'),
      ('المتجر', Icons.storefront_outlined, '$base/store'),
      ('الإعدادات', Icons.settings_outlined, '$base/settings'),
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
                  const Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'كل أقسام الحلم',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 18,
                          ),
                        ),
                        Text(
                          'تُفتح الأقسام التالية على الويب مؤقتًا',
                          style: TextStyle(
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
                      title: Text(link.$1),
                      trailing: const Icon(Icons.open_in_new, size: 17),
                      onTap: () {
                        Navigator.pop(context);
                        onOpen(link.$3);
                      },
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: const Text('تسجيل الخروج'),
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
