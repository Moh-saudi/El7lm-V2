import 'package:flutter/material.dart';

import 'controllers/session_controller.dart';
import 'core/app_theme.dart';
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
      animation: session,
      builder: (context, _) => MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'منصة الحلم',
        theme: buildAppTheme(),
        locale: const Locale('ar'),
        builder: (context, child) => Directionality(
          textDirection: TextDirection.rtl,
          child: child ?? const SizedBox.shrink(),
        ),
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
