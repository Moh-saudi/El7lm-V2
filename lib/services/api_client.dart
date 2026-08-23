import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../core/app_config.dart';

class ApiException implements Exception {
  const ApiException(
    this.message, {
    this.statusCode,
    this.translationKey,
    this.code,
  });

  final String message;
  final int? statusCode;
  final String? translationKey;
  final String? code;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({http.Client? httpClient}) : _http = httpClient ?? http.Client();

  final http.Client _http;

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = AppConfig.apiBaseUrl.replaceFirst(RegExp(r'/$'), '');
    return Uri.parse('$base$path').replace(queryParameters: query);
  }

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, String>? query,
    String? accessToken,
  }) async {
    return _request(
      () => _http.get(_uri(path, query), headers: _headers(accessToken)),
      const Duration(seconds: 25),
    );
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
    String? accessToken,
  }) async {
    return _request(
      () => _http.post(
        _uri(path),
        headers: _headers(accessToken),
        body: jsonEncode(body ?? const <String, dynamic>{}),
      ),
      const Duration(seconds: 30),
    );
  }

  Future<Map<String, dynamic>> _request(
    Future<http.Response> Function() send,
    Duration timeout,
  ) async {
    try {
      return _decode(await send().timeout(timeout));
    } on ApiException {
      rethrow;
    } on TimeoutException {
      throw const ApiException(
        'The request timed out.',
        translationKey: 'requestTimeout',
      );
    } on SocketException {
      throw const ApiException(
        'The network is unavailable.',
        translationKey: 'connectionError',
      );
    } on http.ClientException {
      throw const ApiException(
        'The request could not reach the server.',
        translationKey: 'connectionError',
      );
    } catch (_) {
      throw const ApiException(
        'The request failed.',
        translationKey: 'connectionError',
      );
    }
  }

  Map<String, String> _headers(String? token) => {
    HttpHeaders.contentTypeHeader: 'application/json',
    HttpHeaders.acceptHeader: 'application/json',
    if (token != null && token.isNotEmpty)
      HttpHeaders.authorizationHeader: 'Bearer $token',
  };

  Map<String, dynamic> _decode(http.Response response) {
    final Object? decoded;
    try {
      decoded = jsonDecode(utf8.decode(response.bodyBytes));
    } catch (_) {
      throw ApiException(
        'Could not read the server response.',
        statusCode: response.statusCode,
        translationKey: 'serverReadError',
      );
    }
    final payload = decoded is Map
        ? Map<String, dynamic>.from(decoded)
        : <String, dynamic>{'data': decoded};
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final code = payload['code']?.toString();
      throw ApiException(
        '${payload['error'] ?? payload['message'] ?? 'A connection error occurred'}',
        statusCode: response.statusCode,
        code: code,
        translationKey: _errorTranslationKey(response.statusCode, code),
      );
    }
    return payload;
  }

  String _errorTranslationKey(int statusCode, String? code) {
    return switch (code) {
      'ACCOUNT_NOT_FOUND' => 'accountNotFoundRegisterFirst',
      'ACCOUNT_ALREADY_EXISTS' => 'accountAlreadyExistsLogin',
      'ACCOUNT_TYPE_MISMATCH' => 'accountTypeMismatch',
      'ACCOUNT_LOOKUP_UNAVAILABLE' => 'accountLookupUnavailable',
      'INVALID_OTP' || 'OTP_INVALID' || 'OTP_EXPIRED' => 'invalidOtp',
      _ when statusCode == 429 => 'tooManyRequests',
      _ when statusCode >= 500 => 'serviceUnavailable',
      _ => 'requestFailed',
    };
  }
}
