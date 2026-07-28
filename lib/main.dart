import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'core/app_config.dart';
import 'l10n/locale_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await LocaleController.instance.initialize();

  if (AppConfig.hasSupabaseConfiguration) {
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      publishableKey: AppConfig.supabasePublishableKey,
      authOptions: const FlutterAuthClientOptions(
        authFlowType: AuthFlowType.pkce,
      ),
    );
  }

  runApp(const El7lmApp());
}
