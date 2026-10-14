import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'core/app_config.dart';
import 'l10n/locale_controller.dart';
import 'services/push_notification_service.dart';

class MyHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback = (X509Certificate cert, String host, int port) => true;
  }
}

Future<void> main() async {
  if (kDebugMode) {
    HttpOverrides.global = MyHttpOverrides();
  }
  WidgetsFlutterBinding.ensureInitialized();

  // Enable Edge-to-Edge display mode for Android 15 & modern devices
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarDividerColor: Colors.transparent,
    ),
  );

  await LocaleController.instance.initialize();

  if (AppConfig.hasSupabaseConfiguration) {
    debugPrint('Initializing Supabase with URL: ${AppConfig.supabaseUrl}');
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      publishableKey: AppConfig.supabasePublishableKey,
      authOptions: const FlutterAuthClientOptions(
        authFlowType: AuthFlowType.pkce,
      ),
    );
  } else {
    debugPrint('Supabase configuration is missing. App will run in legacy mode.');
  }

  // Initialize Firebase Cloud Messaging for Background & Foreground Push Notifications
  try {
    await PushNotificationService().initialize();
  } catch (e) {
    debugPrint('Failed to initialize push notifications: $e');
  }

  runApp(const El7lmApp());
}
