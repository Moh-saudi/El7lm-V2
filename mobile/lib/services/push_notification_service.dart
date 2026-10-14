import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
    debugPrint('[PushNotificationService] Background message received: ${message.messageId}');
  } catch (e) {
    debugPrint('[PushNotificationService] Error in background handler: $e');
  }
}

class PushNotificationService {
  factory PushNotificationService() => _instance;
  PushNotificationService._internal();
  static final PushNotificationService _instance = PushNotificationService._internal();

  static const _fcmTokenKey = 'saved_fcm_token';
  final _storage = const FlutterSecureStorage();

  bool _initialized = false;
  String? _fcmToken;
  String? get fcmToken => _fcmToken;

  Function(RemoteMessage message)? onForegroundMessage;
  Function(RemoteMessage message)? onNotificationOpened;

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      await Firebase.initializeApp();
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      final messaging = FirebaseMessaging.instance;

      // 1. Request notification permission (Required for Android 13+ & iOS)
      final settings = await messaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      debugPrint('[PushNotificationService] User permission status: ${settings.authorizationStatus}');

      // 2. Fetch FCM Token
      _fcmToken = await messaging.getToken();
      if (_fcmToken != null) {
        debugPrint('[PushNotificationService] FCM Token: $_fcmToken');
        await _saveAndSyncToken(_fcmToken!);
      }

      // 3. Listen for token refresh
      messaging.onTokenRefresh.listen((newToken) async {
        _fcmToken = newToken;
        await _saveAndSyncToken(newToken);
      });

      // 4. Foreground message listener
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('[PushNotificationService] Foreground notification: ${message.notification?.title}');
        if (onForegroundMessage != null) {
          onForegroundMessage!(message);
        }
      });

      // 5. App opened via notification tap
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        debugPrint('[PushNotificationService] Notification opened: ${message.notification?.title}');
        if (onNotificationOpened != null) {
          onNotificationOpened!(message);
        }
      });

      // 6. Check if app was opened from terminated state by a notification
      final initialMessage = await messaging.getInitialMessage();
      if (initialMessage != null && onNotificationOpened != null) {
        onNotificationOpened!(initialMessage);
      }

      _initialized = true;
    } catch (e) {
      debugPrint('[PushNotificationService] Failed to initialize Firebase Messaging: $e');
    }
  }

  Future<void> _saveAndSyncToken(String token) async {
    try {
      await _storage.write(key: _fcmTokenKey, value: token);

      final authUserId = Supabase.instance.client.auth.currentUser?.id;
      if (authUserId != null && authUserId.isNotEmpty) {
        await syncTokenWithServer(authUserId);
      }
    } catch (_) {}
  }

  Future<void> syncTokenWithServer(String userId) async {
    try {
      final token = _fcmToken ?? await _storage.read(key: _fcmTokenKey);
      if (token == null || token.isEmpty) return;

      // Update user record in Supabase with their FCM token so backend can push
      await Supabase.instance.client
          .from('users')
          .update({
            'fcmToken': token,
            'pushToken': token,
            'updatedAt': DateTime.now().toIso8601String(),
          })
          .eq('id', userId);
      debugPrint('[PushNotificationService] Synced FCM token with Supabase for user: $userId');
    } catch (e) {
      debugPrint('[PushNotificationService] Error syncing FCM token with DB: $e');
    }
  }
}
