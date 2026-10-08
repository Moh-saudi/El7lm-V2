import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/app_notification.dart';
import '../../services/data_service.dart';
import '../../services/in_app_notification_service.dart';

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
  late Future<List<AppNotification>> future;
  Timer? refreshTimer;

  @override
  void initState() {
    super.initState();
    future = widget.dataService.fetchNotifications();
    refreshTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => refresh(silent: true),
    );
  }

  Future<void> refresh({bool silent = false}) async {
    final next = widget.dataService.fetchNotifications();
    if (mounted) {
      setState(() {
        future = next;
      });
    }
    if (!silent) await next;
  }

  @override
  void dispose() {
    refreshTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('notificationCenter')),
        actions: [
          if (kDebugMode) ...[
            PopupMenuButton<String>(
              icon: const Icon(
                Icons.notifications_active_rounded,
                color: AppColors.gold,
              ),
              tooltip: 'اختبار الإشعارات (مطورين)',
              onSelected: (value) {
                if (value == 'notif') {
                  InAppNotificationService().showInAppNotificationBanner(
                    context: context,
                    title: 'فرصة كشف مواهب جديدة! ⚽',
                    body: 'تمت إضافتك إلى القائمة المختصرة لنادي الريان.',
                  );
                } else if (value == 'chat') {
                  InAppNotificationService().showInAppMessageBanner(
                    context: context,
                    senderName: 'الكابتن أحمد',
                    messageText: 'أهلاً بك! تم قبول طلب التجربة الخاصة بك.',
                  );
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'notif',
                  child: Row(
                    children: [
                      Icon(
                        Icons.notifications_rounded,
                        color: AppColors.gold,
                        size: 20,
                      ),
                      SizedBox(width: 8),
                      Text('تجربة إشعار منصة'),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'chat',
                  child: Row(
                    children: [
                      Icon(
                        Icons.chat_bubble_rounded,
                        color: AppColors.green,
                        size: 20,
                      ),
                      SizedBox(width: 8),
                      Text('تجربة رسالة محادثة'),
                    ],
                  ),
                ),
              ],
            ),
          ],
          TextButton(
            onPressed: () async {
              await widget.dataService.markAllNotificationsRead();
              await refresh();
            },
            child: Text(context.tr('markAllRead')),
          ),
        ],
      ),
      body: FutureBuilder<List<AppNotification>>(
        future: future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting &&
              !snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.cloud_off_outlined, size: 52),
                    const SizedBox(height: 12),
                    Text(
                      context.errorText(snapshot.error),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 14),
                    FilledButton.tonal(
                      onPressed: refresh,
                      child: Text(context.tr('retry')),
                    ),
                  ],
                ),
              ),
            );
          }
          final items = snapshot.data ?? const [];
          if (items.isEmpty) {
            return RefreshIndicator(
              onRefresh: refresh,
              child: ListView(
                children: [
                  const SizedBox(height: 170),
                  Icon(
                    Icons.notifications_none_rounded,
                    size: 72,
                    color: AppColors.green.withValues(alpha: .55),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    context.tr('noNotifications'),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: refresh,
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final item = items[index];

                // Dynamically translate profile reminder notifications
                var displayTitle = item.title.isEmpty
                    ? context.tr('notifications')
                    : item.title;
                var displayMessage = item.message;

                final isProfileReminder = item.type == 'profile_completion' ||
                    item.id == 'profile-completion-reminder' ||
                    item.title.contains('أكمل ملف') ||
                    item.title.contains('Complete Your Talent Profile');

                if (isProfileReminder) {
                  displayTitle = context.tr('profileReminderTitle');
                  final match = RegExp(r'(\d+)').firstMatch(item.message);
                  final percent = match?.group(1) ?? '70';
                  displayMessage = context.tr('profileReminderBody', {'percent': percent});
                }

                return Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(18),
                    onTap: () async {
                      if (!item.isRead) {
                        await widget.dataService.markNotificationRead(item);
                      }
                      if (isProfileReminder &&
                          widget.onProfileCompletionTap != null) {
                        if (!context.mounted) return;
                        Navigator.pop(context);
                        widget.onProfileCompletionTap!();
                        return;
                      }
                      await refresh();
                    },
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(
                          color: item.isRead
                              ? const Color(0xFFE2E8F0)
                              : AppColors.green.withValues(alpha: 0.35),
                          width: item.isRead ? 1.0 : 1.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: item.isRead
                                ? const Color(0x060F172A)
                                : AppColors.green.withValues(alpha: 0.08),
                            blurRadius: item.isRead ? 10 : 14,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Leading Icon Badge
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: item.isRead
                                  ? const Color(0xFFF1F5F9)
                                  : const Color(0xFFECFDF5),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: item.isRead
                                    ? const Color(0xFFE2E8F0)
                                    : const Color(0xFFA7F3D0),
                                width: 0.8,
                              ),
                            ),
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                Icon(
                                  isProfileReminder
                                      ? Icons.sports_soccer_rounded
                                      : Icons.notifications_rounded,
                                  color: item.isRead
                                      ? const Color(0xFF94A3B8)
                                      : AppColors.green,
                                  size: 22,
                                ),
                                if (!item.isRead)
                                  Positioned(
                                    top: 4,
                                    right: 4,
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
                          ),
                          const SizedBox(width: 14),
                          // Content
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        displayTitle,
                                        style: TextStyle(
                                          fontWeight: item.isRead
                                              ? FontWeight.w600
                                              : FontWeight.w800,
                                          fontSize: 14.5,
                                          color: const Color(0xFF0F172A),
                                        ),
                                      ),
                                    ),
                                    if (!item.isRead) ...[
                                      const SizedBox(width: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 7,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFECFDF5),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          context.tr('newStatus') != 'newStatus'
                                              ? context.tr('newStatus')
                                              : 'جديد',
                                          style: const TextStyle(
                                            color: AppColors.green,
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                if (displayMessage.isNotEmpty) ...[
                                  const SizedBox(height: 6),
                                  Text(
                                    displayMessage,
                                    style: TextStyle(
                                      fontSize: 13,
                                      height: 1.45,
                                      color: item.isRead
                                          ? const Color(0xFF64748B)
                                          : const Color(0xFF334155),
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    if (item.createdAt != null) ...[
                                      const Icon(
                                        Icons.access_time_rounded,
                                        size: 12,
                                        color: AppColors.muted,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        DateFormat.yMd(
                                          Localizations.localeOf(context).languageCode,
                                        ).add_jm().format(item.createdAt!.toLocal()),
                                        style: const TextStyle(
                                          color: AppColors.muted,
                                          fontSize: 11,
                                        ),
                                      ),
                                    ],
                                    const Spacer(),
                                    if (isProfileReminder)
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 9,
                                          vertical: 3,
                                        ),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFF0FDF4),
                                          borderRadius: BorderRadius.circular(8),
                                          border: Border.all(
                                            color: const Color(0xFF86EFAC),
                                            width: 0.8,
                                          ),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(
                                              context.tr('editProfile'),
                                              style: const TextStyle(
                                                color: AppColors.green,
                                                fontSize: 11,
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                            const SizedBox(width: 4),
                                            const Icon(
                                              Icons.arrow_forward_ios_rounded,
                                              size: 10,
                                              color: AppColors.green,
                                            ),
                                          ],
                                        ),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
