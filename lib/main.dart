import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'core/app_config.dart';
import 'l10n/locale_controller.dart';

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

  runApp(const El7lmApp());
}
