import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/app_notification.dart';
import '../../services/data_service.dart';
import '../profile/player_profile_data.dart';

enum NotificationFilter { all, unread }

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({
    super.key,
    required this.dataService,
    this.onProfileCompletionTap,
  });

  final DataService dataService;
  final VoidCallback? onProfileCompletionTap;

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late Future<List<AppNotification>> _future;
  Timer? _refreshTimer;
  NotificationFilter _selectedFilter = NotificationFilter.all;

  final Set<String> _readIds = {};
  final Set<String> _locallyDeletedIds = {};

  // Cached profile completion percentage for instant, zero-lag scrolling
  int _profileCompletionPercent = 85;

  @override
  void initState() {
    super.initState();
    _updateProfilePercent();
    _future = widget.dataService.fetchNotifications();
    _refreshTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _refresh(silent: true),
    );
  }

  void _updateProfilePercent() {
    final cachedProfile = widget.dataService.profileNotifier.value;
    if (cachedProfile != null) {
      _profileCompletionPercent =
          computePlayerProfileCompletion(cachedProfile.values);
    }
  }

  Future<void> _refresh({bool silent = false}) async {
    _updateProfilePercent();
    final next = widget.dataService.fetchNotifications();
    if (mounted) {
      setState(() {
        _future = next;
      });
    }
    if (!silent) await next;
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  String _formatRelativeTime(DateTime? date, BuildContext context) {
    if (date == null) return '';
    final now = DateTime.now();
    final diff = now.difference(date.toLocal());
    final isAr = Localizations.localeOf(context).languageCode == 'ar';

    if (diff.inSeconds < 60) {
      return isAr ? 'الآن' : 'Just now';
    } else if (diff.inMinutes < 60) {
      return isAr ? 'منذ ${diff.inMinutes} د' : '${diff.inMinutes}m ago';
    } else if (diff.inHours < 24) {
      return isAr ? 'منذ ${diff.inHours} س' : '${diff.inHours}h ago';
    } else if (diff.inDays == 1) {
      return isAr ? 'أمس' : 'Yesterday';
    } else if (diff.inDays < 7) {
      return isAr ? 'منذ ${diff.inDays} أيام' : '${diff.inDays}d ago';
    } else {
      return DateFormat('M/d', Localizations.localeOf(context).languageCode)
          .format(date.toLocal());
    }
  }

  bool _isProfileReminder(AppNotification item) {
    final type = (item.type ?? '').toLowerCase();
    return type == 'profile_completion' ||
        type == 'profile_reminder' ||
        type == 'reminder' ||
        item.id == 'profile-completion-reminder' ||
        item.title.contains('أكمل ملف') ||
        item.title.contains('تحديث بيانات') ||
        item.title.contains('بياناتك') ||
        item.title.contains('Complete Your Talent Profile');
  }

  bool _isAwarenessTip(AppNotification item) {
    final type = (item.type ?? '').toLowerCase();
    final title = item.title.toLowerCase();
    return type == 'awareness' ||
        type == 'tip' ||
        type == 'educational' ||
        title.contains('نصيحة') ||
        title.contains('توعية') ||
        title.contains('إرشاد') ||
        title.contains('tip') ||
        title.contains('guide');
  }

  bool _isActionable(AppNotification item) {
    return item.actionUrl != null && item.actionUrl!.trim().isNotEmpty;
  }

  IconData _categoryIcon(AppNotification item) {
    if (_isProfileReminder(item)) {
      return Icons.sports_soccer_rounded;
    }
    if (_isAwarenessTip(item)) {
      return Icons.lightbulb_rounded;
    }
    if (_isActionable(item)) {
      return Icons.touch_app_rounded;
    }
    final type = (item.type ?? '').toLowerCase();
    if (type.contains('opportunity') ||
        item.sourceTable == 'broadcasts' ||
        item.title.contains('فرصة') ||
        item.title.contains('معسكر') ||
        item.title.contains('اختبار')) {
      return Icons.track_changes_rounded;
    }
    if (type.contains('tournament') || item.title.contains('بطولة')) {
      return Icons.emoji_events_rounded;
    }
    if (type.contains('payment') ||
        type.contains('subscription') ||
        item.title.contains('اشتراك') ||
        item.title.contains('دفع')) {
      return Icons.credit_card_rounded;
    }
    return Icons.notifications_rounded;
  }

  Color _categoryIconColor(AppNotification item) {
    if (_isProfileReminder(item)) return AppColors.green;
    if (_isAwarenessTip(item)) return const Color(0xFFF59E0B); // Amber
    if (_isActionable(item)) return const Color(0xFF2563EB); // Vibrant Blue
    final type = (item.type ?? '').toLowerCase();
    if (type.contains('opportunity') ||
        item.sourceTable == 'broadcasts' ||
        item.title.contains('فرصة') ||
        item.title.contains('معسكر')) {
      return const Color(0xFFD97706); // Dark Amber
    }
    if (type.contains('tournament') || item.title.contains('بطولة')) {
      return const Color(0xFF0EA5E9); // Sky Blue
    }
    if (type.contains('payment') || item.title.contains('اشتراك')) {
      return const Color(0xFF8B5CF6); // Purple
    }
    return const Color(0xFF6366F1); // Indigo
  }

  String _categorySourceLabel(AppNotification item, BuildContext context) {
    final isAr = Localizations.localeOf(context).languageCode == 'ar';
    if (_isProfileReminder(item)) {
      return isAr ? 'تحديث دوري' : 'Periodic Update';
    }
    if (_isAwarenessTip(item)) {
      return isAr ? 'نصيحة رياضية' : 'Sports Tip';
    }
    if (_isActionable(item)) {
      return isAr ? 'إشعار تفاعلي' : 'Interactive Link';
    }
    if (item.sourceTable == 'broadcasts') {
      return isAr ? 'فرص المنصة' : 'Opportunities';
    }
    final type = (item.type ?? '').toLowerCase();
    if (type.contains('tournament') || item.title.contains('بطولة')) {
      return isAr ? 'بطولات الحلم' : 'Tournaments';
    }
    if (type.contains('subscription') || item.title.contains('اشتراك')) {
      return isAr ? 'الاشتراكات' : 'Subscription';
    }
    return isAr ? 'إدارة المنصة' : 'Platform Admin';
  }

  bool _isItemRead(AppNotification item) {
    return item.isRead || _readIds.contains(item.id);
  }

  Future<void> _markAllRead(List<AppNotification> items) async {
    final unread = items.where((i) => !_isItemRead(i)).toList();
    if (unread.isEmpty) return;

    // Optimistic UI update
    setState(() {
      _readIds.addAll(unread.map((i) => i.id));
    });

    try {
      await widget.dataService.markAllNotificationsRead();
    } catch (_) {}

    if (mounted) {
      final isAr = Localizations.localeOf(context).languageCode == 'ar';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          backgroundColor: const Color(0xFF0F172A),
          duration: const Duration(seconds: 2),
          content: Row(
            children: [
              const Icon(
                Icons.check_circle_rounded,
                color: AppColors.green,
                size: 18,
              ),
              const SizedBox(width: 8),
              Text(
                isAr
                    ? 'تم تعيين جميع الإشعارات كمقروءة'
                    : 'All notifications marked as read',
                style: const TextStyle(fontSize: 13, color: Colors.white),
              ),
            ],
          ),
        ),
      );
      _refresh(silent: true);
    }
  }

  Future<void> _deleteSingleNotification(AppNotification item, {bool silent = false}) async {
    setState(() {
      _locallyDeletedIds.add(item.id);
    });

    try {
      await widget.dataService.deleteNotification(item);
    } catch (_) {}

    if (!silent && mounted) {
      final isAr = Localizations.localeOf(context).languageCode == 'ar';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          backgroundColor: const Color(0xFF0F172A),
          duration: const Duration(seconds: 2),
          content: Text(
            isAr ? 'تم حذف الإشعار' : 'Notification deleted',
            style: const TextStyle(fontSize: 13, color: Colors.white),
          ),
        ),
      );
      _refresh(silent: true);
    }
  }

  Future<void> _clearNotificationsDialog(BuildContext context, bool isAr) async {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  isAr ? 'إدارة وحذف الإشعارات' : 'Manage & Clear Notifications',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  isAr
                      ? 'اختر الإجراء المناسب لتنظيف صندوق الإشعارات'
                      : 'Choose an action to clean up your notification inbox',
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 20),
                ListTile(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: const BorderSide(color: Color(0xFFF1F5F9)),
                  ),
                  tileColor: const Color(0xFFF8FAFC),
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: const Icon(
                      Icons.cleaning_services_rounded,
                      color: Color(0xFFD97706),
                      size: 20,
                    ),
                  ),
                  title: Text(
                    isAr ? 'حذف المقروءة فقط' : 'Clear read notifications only',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  subtitle: Text(
                    isAr
                        ? 'إبقاء الإشعارات الجديدة غير المقروءة وحذف الباقي'
                        : 'Keep unread notifications and delete the rest',
                    style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                  ),
                  onTap: () async {
                    final messenger = ScaffoldMessenger.of(context);
                    Navigator.pop(ctx);
                    await widget.dataService.clearAllNotifications(onlyRead: true);
                    if (mounted) {
                      _refresh();
                      messenger.showSnackBar(
                        SnackBar(
                          behavior: SnackBarBehavior.floating,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          backgroundColor: const Color(0xFF0F172A),
                          content: Text(
                            isAr ? 'تم مسح الإشعارات المقروءة' : 'Read notifications cleared',
                            style: const TextStyle(color: Colors.white, fontSize: 13),
                          ),
                        ),
                      );
                    }
                  },
                ),
                const SizedBox(height: 10),
                ListTile(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: BorderSide(color: Colors.red.shade100),
                  ),
                  tileColor: Colors.red.shade50.withValues(alpha: 0.5),
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: const Icon(
                      Icons.delete_forever_rounded,
                      color: Colors.red,
                      size: 20,
                    ),
                  ),
                  title: Text(
                    isAr ? 'حذف كافة الإشعارات' : 'Clear all notifications',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Colors.red,
                    ),
                  ),
                  subtitle: Text(
                    isAr
                        ? 'تفريغ صندوق الإشعارات بالكامل'
                        : 'Completely empty your notifications inbox',
                    style: const TextStyle(fontSize: 11.5, color: Color(0xFFEF4444)),
                  ),
                  onTap: () async {
                    final messenger = ScaffoldMessenger.of(context);
                    Navigator.pop(ctx);
                    await widget.dataService.clearAllNotifications(onlyRead: false);
                    if (mounted) {
                      setState(() {
                        _locallyDeletedIds.clear();
                      });
                      _refresh();
                      messenger.showSnackBar(
                        SnackBar(
                          behavior: SnackBarBehavior.floating,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          backgroundColor: const Color(0xFF0F172A),
                          content: Text(
                            isAr ? 'تم تفريغ صندوق الإشعارات' : 'All notifications cleared',
                            style: const TextStyle(color: Colors.white, fontSize: 13),
                          ),
                        ),
                      );
                    }
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _handleOpenActionUrl(String rawUrl) async {
    try {
      final uri = Uri.parse(rawUrl.trim());
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final isAr = Localizations.localeOf(context).languageCode == 'ar';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        centerTitle: true,
        title: Text(
          context.tr('notificationCenter'),
          style: const TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w700,
            color: Color(0xFF0F172A),
          ),
        ),
        actions: [
          // Clear / Delete Options Action Button
          IconButton(
            tooltip: isAr ? 'مسح وحذف' : 'Clear notifications',
            splashRadius: 20,
            icon: Container(
              width: 36,
              height: 36,
              decoration: const BoxDecoration(
                color: Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.delete_sweep_outlined,
                size: 20,
                color: Color(0xFF64748B),
              ),
            ),
            onPressed: () => _clearNotificationsDialog(context, isAr),
          ),

          // Mark all read action button
          FutureBuilder<List<AppNotification>>(
            future: _future,
            builder: (context, snapshot) {
              final rawItems = snapshot.data ?? const [];
              final items = rawItems.where((i) => !_locallyDeletedIds.contains(i.id)).toList();
              final unreadCount = items.where((i) => !_isItemRead(i)).length;

              return Padding(
                padding: const EdgeInsetsDirectional.only(end: 8),
                child: IconButton(
                  tooltip: isAr ? 'قراءة الكل' : 'Mark all read',
                  splashRadius: 20,
                  icon: Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: unreadCount > 0
                              ? AppColors.green.withValues(alpha: 0.1)
                              : const Color(0xFFF1F5F9),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.done_all_rounded,
                          size: 19,
                          color: unreadCount > 0
                              ? AppColors.green
                              : const Color(0xFF94A3B8),
                        ),
                      ),
                      if (unreadCount > 0)
                        Positioned(
                          top: 0,
                          right: 0,
                          child: Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppColors.green,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                    ],
                  ),
                  onPressed: unreadCount > 0 ? () => _markAllRead(items) : null,
                ),
              );
            },
          ),
        ],
      ),
      body: FutureBuilder<List<AppNotification>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting &&
              !snapshot.hasData) {
            return const Center(
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: AppColors.green,
              ),
            );
          }

          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.cloud_off_outlined,
                      size: 48,
                      color: Color(0xFF94A3B8),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      context.errorText(snapshot.error),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 14),
                    FilledButton.tonal(
                      onPressed: _refresh,
                      child: Text(context.tr('retry')),
                    ),
                  ],
                ),
              ),
            );
          }

          final rawItems = snapshot.data ?? const [];
          final allItems = rawItems.where((i) => !_locallyDeletedIds.contains(i.id)).toList();
          final unreadItems = allItems.where((i) => !_isItemRead(i)).toList();
          final displayedItems = _selectedFilter == NotificationFilter.unread
              ? unreadItems
              : allItems;

          return Column(
            children: [
              // iOS-Style Segmented Filter Tabs
              Container(
                color: Colors.white,
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: Container(
                  height: 38,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.all(3),
                  child: Row(
                    children: [
                      Expanded(
                        child: _buildFilterTab(
                          label: isAr
                              ? 'الكل (${allItems.length})'
                              : 'All (${allItems.length})',
                          isSelected: _selectedFilter == NotificationFilter.all,
                          onTap: () {
                            if (_selectedFilter != NotificationFilter.all) {
                              setState(() {
                                _selectedFilter = NotificationFilter.all;
                              });
                            }
                          },
                        ),
                      ),
                      Expanded(
                        child: _buildFilterTab(
                          label: isAr
                              ? 'غير مقروء (${unreadItems.length})'
                              : 'Unread (${unreadItems.length})',
                          isSelected:
                              _selectedFilter == NotificationFilter.unread,
                          hasBadge: unreadItems.isNotEmpty,
                          onTap: () {
                            if (_selectedFilter != NotificationFilter.unread) {
                              setState(() {
                                _selectedFilter = NotificationFilter.unread;
                              });
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Notification List or Empty State
              Expanded(
                child: displayedItems.isEmpty
                    ? _buildEmptyState(isAr)
                    : RefreshIndicator(
                        color: AppColors.green,
                        onRefresh: _refresh,
                        child: ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(
                            parent: BouncingScrollPhysics(),
                          ),
                          padding: const EdgeInsets.fromLTRB(16, 10, 16, 30),
                          itemCount: displayedItems.length,
                          itemBuilder: (context, index) {
                            final item = displayedItems[index];
                            return _buildDismissibleNotificationCard(item, isAr);
                          },
                        ),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildFilterTab({
    required String label,
    required bool isSelected,
    bool hasBadge = false,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeInOut,
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(9),
          boxShadow: isSelected
              ? const [
                  BoxShadow(
                    color: Color(0x0F000000),
                    blurRadius: 4,
                    offset: Offset(0, 1.5),
                  ),
                ]
              : null,
        ),
        alignment: Alignment.center,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected
                    ? const Color(0xFF0F172A)
                    : const Color(0xFF64748B),
              ),
            ),
            if (hasBadge && !isSelected) ...[
              const SizedBox(width: 5),
              Container(
                width: 6,
                height: 6,
                decoration: const BoxDecoration(
                  color: AppColors.green,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDismissibleNotificationCard(AppNotification item, bool isAr) {
    return Dismissible(
      key: ValueKey('notif_dismiss_${item.id}'),
      direction: DismissDirection.endToStart,
      background: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 20),
        decoration: BoxDecoration(
          color: const Color(0xFFEF4444),
          borderRadius: BorderRadius.circular(15),
        ),
        alignment: AlignmentDirectional.centerEnd,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              isAr ? 'حذف' : 'Delete',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
            const SizedBox(width: 6),
            const Icon(
              Icons.delete_outline_rounded,
              color: Colors.white,
              size: 20,
            ),
          ],
        ),
      ),
      onDismissed: (_) {
        _deleteSingleNotification(item, silent: true);
      },
      child: _buildNotificationCard(item, isAr),
    );
  }

  Widget _buildNotificationCard(AppNotification item, bool isAr) {
    final isRead = _isItemRead(item);
    final isProfileReminder = _isProfileReminder(item);
    final isAwareness = _isAwarenessTip(item);
    final isActionable = _isActionable(item);

    var displayTitle =
        item.title.isEmpty ? context.tr('notifications') : item.title;
    var displayMessage = item.message;

    if (isProfileReminder) {
      displayTitle = context.tr('profileReminderTitle');
      displayMessage = context.tr('profileReminderBody', {
        'percent': '$_profileCompletionPercent',
      });
    }

    final categoryColor = _categoryIconColor(item);
    final categoryIcon = _categoryIcon(item);
    final sourceLabel = _categorySourceLabel(item, context);
    final timeStr = _formatRelativeTime(item.createdAt, context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(15),
          onTap: () async {
            if (!isRead) {
              setState(() {
                _readIds.add(item.id);
              });
              try {
                await widget.dataService.markNotificationRead(item);
              } catch (_) {}
            }
            if (isProfileReminder && widget.onProfileCompletionTap != null) {
              if (!mounted) return;
              Navigator.pop(context);
              widget.onProfileCompletionTap!();
              return;
            }
            if (isActionable) {
              _handleOpenActionUrl(item.actionUrl!);
            }
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(15),
              border: Border.all(
                color: isRead
                    ? const Color(0xFFF1F5F9)
                    : categoryColor.withValues(alpha: 0.35),
                width: isRead ? 0.8 : 1.2,
              ),
              boxShadow: [
                BoxShadow(
                  color: isRead
                      ? const Color(0x05000000)
                      : categoryColor.withValues(alpha: 0.06),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // iOS-Style Header Row: Squircle icon + Category badge + Timestamp + Single Delete Icon
                Row(
                  children: [
                    // Mini squircle icon (22x22)
                    Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: categoryColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      alignment: Alignment.center,
                      child: Icon(categoryIcon, size: 13, color: categoryColor),
                    ),
                    const SizedBox(width: 7),

                    // Category Badge Tag
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: categoryColor.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        sourceLabel,
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                          color: categoryColor,
                        ),
                      ),
                    ),
                    const SizedBox(width: 5),
                    const Text(
                      '·',
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFF94A3B8),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 5),

                    // Relative Timestamp
                    Text(
                      timeStr,
                      style: const TextStyle(
                        fontSize: 10.5,
                        color: Color(0xFF94A3B8),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const Spacer(),

                    // Unread Indicator Dot
                    if (!isRead) ...[
                      Container(
                        width: 7.5,
                        height: 7.5,
                        decoration: BoxDecoration(
                          color: categoryColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                    ],

                    // Direct 1-Tap Delete Icon Button
                    InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: () => _deleteSingleNotification(item),
                      child: Padding(
                        padding: const EdgeInsets.all(3),
                        child: Icon(
                          Icons.close_rounded,
                          size: 16,
                          color: Colors.grey.shade400,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 7),

                // Title
                Text(
                  displayTitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: isRead ? FontWeight.w600 : FontWeight.w800,
                    color: const Color(0xFF0F172A),
                    height: 1.25,
                  ),
                ),

                // Body Message
                if (displayMessage.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    displayMessage,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12,
                      color: isRead
                          ? const Color(0xFF64748B)
                          : const Color(0xFF334155),
                      height: 1.35,
                    ),
                  ),
                ],

                // 1) Awareness / Educational Tip Box
                if (isAwareness) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7).withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(9),
                      border: Border.all(color: const Color(0xFFFDE68A), width: 0.8),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.tips_and_updates_outlined,
                          size: 14,
                          color: Color(0xFFD97706),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            isAr
                                ? 'نصيحة لتطوير موهبتك وزيادة فرص اكتشافك من الكشافين'
                                : 'Tip to enhance your athletic profile & scouting visibility',
                            style: const TextStyle(
                              fontSize: 11,
                              color: Color(0xFFB45309),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // 2) Profile Reminder Action & Progress Bar
                if (isProfileReminder) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: const Color(0xFFBBF7D0),
                        width: 0.7,
                      ),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(3),
                            child: LinearProgressIndicator(
                              value: _profileCompletionPercent / 100.0,
                              backgroundColor: const Color(0xFFDCFCE7),
                              valueColor: const AlwaysStoppedAnimation(
                                AppColors.green,
                              ),
                              minHeight: 4.5,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '$_profileCompletionPercent%',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.green,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              context.tr('editProfile'),
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppColors.green,
                              ),
                            ),
                            const SizedBox(width: 2),
                            const Icon(
                              Icons.arrow_forward_ios_rounded,
                              size: 9,
                              color: AppColors.green,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],

                // 3) Actionable Notification: Direct Button to open link / view details
                if (isActionable) ...[
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    height: 32,
                    child: FilledButton.tonal(
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFFEFF6FF),
                        foregroundColor: const Color(0xFF2563EB),
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                          side: const BorderSide(
                            color: Color(0xFFBFDBFE),
                            width: 0.7,
                          ),
                        ),
                      ),
                      onPressed: () => _handleOpenActionUrl(item.actionUrl!),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            isAr
                                ? 'عرض التفاصيل / الانتقال للرابط'
                                : 'View Details / Open Link',
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Icon(Icons.open_in_new_rounded, size: 13),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(bool isAr) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 58,
              height: 58,
              decoration: const BoxDecoration(
                color: Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.notifications_none_rounded,
                size: 30,
                color: Color(0xFF94A3B8),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              _selectedFilter == NotificationFilter.unread
                  ? (isAr
                      ? 'لا توجد إشعارات غير مقروءة'
                      : 'No unread notifications')
                  : context.tr('noNotifications'),
              style: const TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w600,
                color: Color(0xFF475569),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
