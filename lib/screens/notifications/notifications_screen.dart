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
    if (mounted) setState(() => future = next);
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
                return Card(
                  color: item.isRead
                      ? Colors.white
                      : AppColors.green.withValues(alpha: .08),
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(14),
                    leading: CircleAvatar(
                      backgroundColor: item.isRead
                          ? const Color(0xFFF0F2F6)
                          : AppColors.green,
                      foregroundColor: item.isRead
                          ? AppColors.muted
                          : Colors.white,
                      child: const Icon(Icons.notifications_rounded),
                    ),
                    title: Text(
                      item.title.isEmpty
                          ? context.tr('notifications')
                          : item.title,
                      style: TextStyle(
                        fontWeight: item.isRead
                            ? FontWeight.w600
                            : FontWeight.w900,
                      ),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (item.message.isNotEmpty) ...[
                          const SizedBox(height: 5),
                          Text(item.message),
                        ],
                        if (item.createdAt != null) ...[
                          const SizedBox(height: 7),
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
                      ],
                    ),
                    onTap: () async {
                      if (!item.isRead) {
                        await widget.dataService.markNotificationRead(item);
                      }
                      if (item.type == 'profile_completion' &&
                          widget.onProfileCompletionTap != null) {
                        if (!context.mounted) return;
                        Navigator.pop(context);
                        widget.onProfileCompletionTap!();
                        return;
                      }
                      await refresh();
                    },
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
