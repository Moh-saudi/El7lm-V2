import 'dart:convert';

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

class PhoneAccountStatus {
  const PhoneAccountStatus({required this.found, this.accountType});

  final bool found;
  final AccountType? accountType;
}

class AuthService {
  AuthService(this._api);

  final ApiClient _api;
  static const _storage = FlutterSecureStorage();

  bool get isAuthenticated => AppConfig.hasSupabaseConfiguration
      ? Supabase.instance.client.auth.currentSession != null
      : false;

  bool get hasSession => AppConfig.hasSupabaseConfiguration
      ? Supabase.instance.client.auth.currentSession != null
      : false;

  bool get hasExpiredOrInvalidSession {
    if (!AppConfig.hasSupabaseConfiguration) return false;
    final session = Supabase.instance.client.auth.currentSession;
    return session != null && session.isExpired;
  }

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

  Future<PhoneAccountStatus> checkPhone(String phone) async {
    // 1. First try the backend resolve-phone endpoint
    try {
      final result = await _api.post(
        '/api/auth/resolve-phone',
        body: {'phoneNumber': phone},
      );
      return PhoneAccountStatus(
        found: result['found'] == true,
        accountType: AccountType.tryFromValue(
          result['accountType']?.toString(),
        ),
      );
    } on ApiException catch (error) {
      if (error.code == 'INVALID_PHONE' ||
          error.code == 'TOO_MANY_REQUESTS' ||
          error.statusCode == 429) {
        rethrow;
      }
      // If server returned another error, try Supabase fallback
    } catch (_) {
      // Network or parsing failure, try fallback
    }

    // 2. Fallback to Supabase Edge function if configured
    if (AppConfig.hasSupabaseConfiguration) {
      try {
        final response = await Supabase.instance.client.functions.invoke(
          'resolve-phone',
          body: {'phoneNumber': phone},
        );
        final result = _functionPayload(response.data);
        return PhoneAccountStatus(
          found: result['found'] == true,
          accountType: AccountType.tryFromValue(
            result['accountType']?.toString(),
          ),
        );
      } on FunctionException catch (error) {
        final payload = _functionPayload(error.details);
        final code = payload['code']?.toString();
        if (code == 'INVALID_PHONE' ||
            code == 'TOO_MANY_REQUESTS' ||
            error.status == 429) {
          throw ApiException(
            '${payload['error'] ?? payload['message'] ?? error.reasonPhrase ?? 'Rate limit exceeded.'}',
            statusCode: error.status,
            code: code ?? 'TOO_MANY_REQUESTS',
            translationKey: code == 'INVALID_PHONE'
                ? 'invalidPhone'
                : 'tooManyRequests',
          );
        }
      } catch (_) {}
    }

    throw const ApiException(
      'The phone verification service could not be reached.',
      code: 'ACCOUNT_LOOKUP_UNAVAILABLE',
      translationKey: 'accountLookupUnavailable',
    );
  }

  Map<String, dynamic> _functionPayload(dynamic data) {
    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }
    if (data is String) {
      try {
        final decoded = jsonDecode(data);
        if (decoded is Map) {
          return Map<String, dynamic>.from(decoded);
        }
      } catch (_) {}
    }
    return const <String, dynamic>{};
  }

  Future<PhoneAccountStatus> sendOtp({
    required String phone,
    required bool registration,
    required AccountType expectedAccountType,
    String? name,
  }) async {
    final response = await _api.post(
      '/api/otp/send',
      body: {
        'phoneNumber': phone,
        'name': name,
        'purpose': registration ? 'registration' : 'login',
        'channel': 'auto',
        'expectedAccountType': expectedAccountType.value,
      },
    );

    final returnedType = AccountType.tryFromValue(
      response['accountType']?.toString(),
    );

    return PhoneAccountStatus(
      found: response['found'] == true || !registration,
      accountType: returnedType,
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
      Map<String, dynamic> check;
      try {
        check = await _api.post(
          '/api/v1/auth/otp/verify-session',
          body: {'phone': phone, 'otp': otp},
        );
      } catch (_) {
        check = await _api.post(
          '/api/auth/verify-otp-and-check',
          body: {'phoneNumber': phone, 'otp': otp},
        );
      }
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
      try {
        result = await _api.post(
          '/api/v1/auth/otp/verify-session',
          body: {'phone': phone, 'otp': otp},
        );
      } catch (_) {
        result = await _api.post(
          '/api/auth/otp-login',
          body: {'phoneNumber': phone, 'otp': otp},
        );
      }
    }

    final authEmail = '${result['authEmail'] ?? ''}';
    final authPassword = '${result['authPassword'] ?? result['tempPassword'] ?? ''}';
    if (AppConfig.hasSupabaseConfiguration &&
        authEmail.isNotEmpty &&
        authPassword.isNotEmpty) {
      try {
        await Supabase.instance.client.auth.signInWithPassword(
          email: authEmail,
          password: authPassword,
        );
      } on AuthException catch (error) {
        throw ApiException(
          error.message,
          statusCode: int.tryParse(error.statusCode ?? '') ?? 400,
          code: error.code,
          translationKey: 'sessionCreationFailed',
        );
      }
    }

    final returnedType = AccountType.tryFromValue(
      result['accountType']?.toString(),
    );
    final accountType = registration
        ? (returnedType ?? selectedType)
        : returnedType;
    if (accountType == null) {
      throw const ApiException(
        'The account type could not be identified.',
        code: 'ACCOUNT_TYPE_MISSING',
        translationKey: 'accountTypeMissing',
      );
    }
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
    if (AppConfig.hasSupabaseConfiguration) {
      final metadata = Supabase.instance.client.auth.currentUser?.userMetadata;
      final sessionType = AccountType.tryFromValue(
        metadata?['accountType']?.toString(),
      );
      if (sessionType != null) {
        await _storage.write(key: 'account_type', value: sessionType.value);
        return sessionType;
      }
    }
    final value = await _storage.read(key: 'account_type');
    return AccountType.tryFromValue(value);
  }

  Future<String?> legacyUserId() => _storage.read(key: 'legacy_user_id');

  Future<void> signOut() async {
    if (AppConfig.hasSupabaseConfiguration) {
      await Supabase.instance.client.auth.signOut();
    }
    await _storage.deleteAll();
  }
}
