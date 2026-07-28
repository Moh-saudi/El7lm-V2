import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'controllers/session_controller.dart';
import 'core/app_theme.dart';
import 'l10n/app_localizations.dart';
import 'l10n/locale_controller.dart';
import 'screens/auth/account_type_screen.dart';
import 'screens/auth/phone_auth_screen.dart';
import 'screens/home/app_shell.dart';
import 'screens/onboarding/onboarding_screen.dart';
import 'services/api_client.dart';
import 'services/auth_service.dart';
import 'services/data_service.dart';

class El7lmApp extends StatefulWidget {
  const El7lmApp({super.key});

  @override
  State<El7lmApp> createState() => _El7lmAppState();
}

class _El7lmAppState extends State<El7lmApp> {
  late final ApiClient apiClient;
  late final AuthService authService;
  late final DataService dataService;
  late final SessionController session;

  @override
  void initState() {
    super.initState();
    apiClient = ApiClient();
    authService = AuthService(apiClient);
    dataService = DataService(apiClient, authService);
    session = SessionController(authService)..initialize();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([session, LocaleController.instance]),
      builder: (context, _) => MaterialApp(
        debugShowCheckedModeBanner: false,
        onGenerateTitle: (context) => context.tr('appName'),
        theme: buildAppTheme(),
        locale: LocaleController.instance.locale,
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: switch (session.stage) {
          AppStage.loading => const _BootScreen(),
          AppStage.onboarding => OnboardingScreen(
            onDone: session.completeOnboarding,
          ),
          AppStage.accountType => AccountTypeScreen(
            onSelected: session.selectAccountType,
          ),
          AppStage.authentication => PhoneAuthScreen(
            accountType: session.accountType!,
            authService: authService,
            onAuthenticated: session.completeAuthentication,
            onChangeAccountType: session.changeAccountType,
          ),
          AppStage.authenticated => AppShell(
            accountType: session.accountType!,
            displayName: session.displayName,
            dataService: dataService,
            onSignOut: session.signOut,
          ),
        },
      ),
    );
  }
}

class _BootScreen extends StatelessWidget {
  const _BootScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
