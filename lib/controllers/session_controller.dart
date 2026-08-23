import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/app_config.dart';
import '../models/account_type.dart';
import '../services/auth_service.dart';

enum AppStage {
  loading,
  onboarding,
  accountType,
  authentication,
  authenticated,
}

class SessionController extends ChangeNotifier {
  SessionController(this.authService);

  final AuthService authService;

  AppStage stage = AppStage.loading;
  AccountType? accountType;
  String displayName = '';

  Future<void> initialize() async {
    final preferences = await SharedPreferences.getInstance();
    final onboardingDone = preferences.getBool('onboarding_done') ?? false;

    if (AppConfig.hasSupabaseConfiguration) {
      Supabase.instance.client.auth.onAuthStateChange.listen((data) {
        if (data.event == AuthChangeEvent.signedOut) {
          stage = AppStage.authentication;
          displayName = '';
          notifyListeners();
        }
      });
    }

    final savedType = await authService.savedAccountType();
    accountType = savedType;

    if (authService.hasSession && savedType != null) {
      displayName = authService.currentDisplayName;
      stage = AppStage.authenticated;
    } else {
      if (authService.hasExpiredOrInvalidSession) {
        await authService.signOut();
      }
      if (!onboardingDone) {
        stage = AppStage.onboarding;
      } else if (savedType == null) {
        stage = AppStage.accountType;
      } else {
        stage = AppStage.authentication;
      }
    }
    notifyListeners();
  }

  Future<void> completeOnboarding() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setBool('onboarding_done', true);
    stage = AppStage.accountType;
    notifyListeners();
  }

  void selectAccountType(AccountType value) {
    accountType = value;
    stage = AppStage.authentication;
    notifyListeners();
  }

  void changeAccountType() {
    stage = AppStage.accountType;
    notifyListeners();
  }

  void completeAuthentication(AuthResult result) {
    accountType = result.accountType;
    displayName = result.userName;
    stage = AppStage.authenticated;
    notifyListeners();
  }

  Future<void> signOut() async {
    await authService.signOut();
    displayName = '';
    stage = AppStage.authentication;
    notifyListeners();
  }
}
