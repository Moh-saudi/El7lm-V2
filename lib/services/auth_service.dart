import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/app_config.dart';
import '../models/account_type.dart';
import 'api_client.dart';

class AuthResult {
  const AuthResult({
    required this.accountType,
    required this.userName,
    required this.isNewUser,
  });

  final AccountType accountType;
  final String userName;
  final bool isNewUser;
}

class AuthService {
  AuthService(this._api);

  final ApiClient _api;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  bool get hasSession =>
      AppConfig.hasSupabaseConfiguration &&
      Supabase.instance.client.auth.currentSession != null;

  String? get accessToken => AppConfig.hasSupabaseConfiguration
      ? Supabase.instance.client.auth.currentSession?.accessToken
      : null;

  String? get authUserId => AppConfig.hasSupabaseConfiguration
      ? Supabase.instance.client.auth.currentUser?.id
      : null;

  String get currentDisplayName {
    if (!AppConfig.hasSupabaseConfiguration) return '';
    final metadata = Supabase.instance.client.auth.currentUser?.userMetadata;
    return '${metadata?['full_name'] ?? metadata?['name'] ?? ''}';
  }

  Future<void> sendOtp({
    required String phone,
    required bool registration,
    String? name,
  }) async {
    await _api.post(
      '/api/otp/send',
      body: {
        'phoneNumber': phone,
        'name': name,
        'purpose': registration ? 'registration' : 'login',
        'channel': 'auto',
      },
    );
  }

  Future<AuthResult> verifyOtp({
    required String phone,
    required String otp,
    required bool registration,
    required AccountType selectedType,
    required String name,
  }) async {
    late Map<String, dynamic> result;
    var isNew = false;

    if (registration) {
      final check = await _api.post(
        '/api/auth/verify-otp-and-check',
        body: {'phoneNumber': phone, 'otp': otp},
      );
      isNew = check['isNew'] == true;
      result = isNew
          ? await _api.post(
              '/api/auth/create-user-with-phone',
              body: {
                'phoneNumber': phone,
                'accountType': selectedType.value,
                'name': name.trim(),
              },
            )
          : check;
    } else {
      result = await _api.post(
        '/api/auth/otp-login',
        body: {'phoneNumber': phone, 'otp': otp},
      );
    }

    final authEmail = '${result['authEmail'] ?? ''}';
    final authPassword = '${result['authPassword'] ?? ''}';
    if (AppConfig.hasSupabaseConfiguration &&
        authEmail.isNotEmpty &&
        authPassword.isNotEmpty) {
      await Supabase.instance.client.auth.signInWithPassword(
        email: authEmail,
        password: authPassword,
      );
    }

    final accountType = AccountType.fromValue(
      '${result['accountType'] ?? selectedType.value}',
    );
    await _storage.write(key: 'account_type', value: accountType.value);
    await _storage.write(
      key: 'legacy_user_id',
      value: '${result['uid'] ?? ''}',
    );

    return AuthResult(
      accountType: accountType,
      userName: '${result['userName'] ?? name}',
      isNewUser: isNew,
    );
  }

  Future<AccountType?> savedAccountType() async {
    final value = await _storage.read(key: 'account_type');
    return value == null ? null : AccountType.fromValue(value);
  }

  Future<String?> legacyUserId() => _storage.read(key: 'legacy_user_id');

  Future<void> signOut() async {
    if (AppConfig.hasSupabaseConfiguration) {
      await Supabase.instance.client.auth.signOut();
    }
    await _storage.deleteAll();
  }
}
