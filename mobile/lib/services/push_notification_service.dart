import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

// ─────────────────────────────────────────────────────────────────
// Notification Channel Config (Android)
// ─────────────────────────────────────────────────────────────────
const _kChannelId = 'el7lm_main';
const _kChannelName = 'منصة الحلم';
const _kChannelDesc = 'إشعارات منصة الحلم للفرص والرسائل والتحديثات';

/// Plugin singleton used by both the background isolate and the main isolate.
final FlutterLocalNotificationsPlugin _localNotifications =
    FlutterLocalNotificationsPlugin();

/// Must be a top-level function — called by FCM in the background isolate.
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Firebase must be initialised before anything else in this isolate.
  await Firebase.initializeApp();

  debugPrint('[Push] ★ Background message: ${message.messageId}');

  // Show a visible heads-up / drawer notification via flutter_local_notifications.
  await _initLocalNotificationsForIsolate();
  await _showLocalNotification(message);
}

/// Lightweight init for background isolates (no callbacks needed).
Future<void> _initLocalNotificationsForIsolate() async {
  const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
  const initSettings = InitializationSettings(android: androidInit);
  await _localNotifications.initialize(initSettings);
}

/// Displays a system notification from a [RemoteMessage].
Future<void> _showLocalNotification(RemoteMessage message) async {
  final notification = message.notification;
  final android = message.notification?.android;

  // Prefer data payload fields when notification fields are absent
  final title = notification?.title ??
      message.data['title'] as String? ??
      'منصة الحلم';
  final body = notification?.body ??
      message.data['body'] as String? ??
      message.data['message'] as String? ??
      '';

  if (title.isEmpty && body.isEmpty) return;

  final androidDetails = AndroidNotificationDetails(
    _kChannelId,
    _kChannelName,
    channelDescription: _kChannelDesc,
    importance: Importance.high,
    priority: Priority.high,
    // Show heads-up notification (pops at top of screen)
    fullScreenIntent: false,
    icon: android?.smallIcon ?? '@mipmap/ic_launcher',
    styleInformation: body.length > 40
        ? BigTextStyleInformation(body)
        : null,
    playSound: true,
    enableVibration: true,
  );

  final details = NotificationDetails(android: androidDetails);

  // Use a stable id from the message so duplicate FCM retries don't double-notify.
  final id = (message.messageId?.hashCode ?? DateTime.now().millisecondsSinceEpoch) & 0x7FFFFFFF;

  await _localNotifications.show(id, title, body, details,
      payload: message.data['actionUrl'] as String? ?? message.data['link'] as String?);
}

// ─────────────────────────────────────────────────────────────────
// PushNotificationService — main-isolate singleton
// ─────────────────────────────────────────────────────────────────
class PushNotificationService {
  factory PushNotificationService() => _instance;
  PushNotificationService._internal();
  static final PushNotificationService _instance =
      PushNotificationService._internal();

  static const _fcmTokenKey = 'saved_fcm_token';
  final _storage = const FlutterSecureStorage();

  bool _initialized = false;
  String? _fcmToken;
  String? get fcmToken => _fcmToken;

  /// Called when a foreground FCM message arrives (in-app handling).
  Function(RemoteMessage message)? onForegroundMessage;

  /// Called when user taps a notification to open the app.
  Function(RemoteMessage message)? onNotificationOpened;

  /// Called when user taps a local notification (payload = actionUrl).
  Function(String? payload)? onLocalNotificationTap;

  // ─────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      await Firebase.initializeApp();

      // ── Register background handler (must be top-level fn) ──
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // ── Initialise flutter_local_notifications ──
      await _initLocalNotifications();

      // ── Request OS permission ──
      final messaging = FirebaseMessaging.instance;

      // Android 13+ requires explicit permission; iOS always prompts.
      await messaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      // Ensure Android delivers foreground FCM as heads-up alerts too.
      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      // ── FCM Token ──
      _fcmToken = await messaging.getToken();
      if (_fcmToken != null) {
        debugPrint('[Push] FCM Token obtained');
        await _saveAndSyncToken(_fcmToken!);
      }

      messaging.onTokenRefresh.listen((newToken) async {
        _fcmToken = newToken;
        await _saveAndSyncToken(newToken);
      });

      // ── Foreground messages ──
      FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
        debugPrint('[Push] ★ Foreground message: ${message.notification?.title}');
        // Show local notification so the user sees it even when inside the app.
        await _showLocalNotification(message);
        onForegroundMessage?.call(message);
      });

      // ── Notification tap (app in background/terminated) ──
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        debugPrint('[Push] ★ Notification tapped: ${message.notification?.title}');
        onNotificationOpened?.call(message);
      });

      // ── App launched by tapping a notification ──
      final initialMessage = await messaging.getInitialMessage();
      if (initialMessage != null) {
        onNotificationOpened?.call(initialMessage);
      }

      _initialized = true;
      debugPrint('[Push] ✅ Initialised successfully');
    } catch (e) {
      debugPrint('[Push] ❌ Init error: $e');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────

  Future<void> _initLocalNotifications() async {
    // Create the Android notification channel first so the OS knows about it.
    const androidChannel = AndroidNotificationChannel(
      _kChannelId,
      _kChannelName,
      description: _kChannelDesc,
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(androidChannel);

    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidInit);

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        onLocalNotificationTap?.call(response.payload);
      },
    );
  }

  Future<void> _saveAndSyncToken(String token) async {
    try {
      await _storage.write(key: _fcmTokenKey, value: token);
      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId != null && userId.isNotEmpty) {
        await syncTokenWithServer(userId);
      }
    } catch (_) {}
  }

  Future<void> syncTokenWithServer(String userId) async {
    try {
      final token = _fcmToken ?? await _storage.read(key: _fcmTokenKey);
      if (token == null || token.isEmpty) return;

      await Supabase.instance.client.from('users').update({
        'fcmToken': token,
        'pushToken': token,
        'updatedAt': DateTime.now().toIso8601String(),
      }).eq('id', userId);

      debugPrint('[Push] ✅ FCM token synced for user: $userId');
    } catch (e) {
      debugPrint('[Push] ❌ Token sync error: $e');
    }
  }
}
