import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_client.dart';

class AppLocalizations {
  const AppLocalizations(this.locale, this._values);

  final Locale locale;
  final Map<String, String> _values;

  static const supportedLocales = [
    Locale('ar'),
    Locale('en'),
    Locale('es'),
    Locale('pt'),
  ];

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  String text(String key, [Map<String, Object?> values = const {}]) {
    var result = _values[key] ?? key;
    for (final entry in values.entries) {
      result = result.replaceAll('{${entry.key}}', '${entry.value ?? ''}');
    }
    return result;
  }

  String textOr(
    String key,
    String fallback, [
    Map<String, Object?> values = const {},
  ]) {
    var result = _values[key] ?? fallback;
    for (final entry in values.entries) {
      result = result.replaceAll('{${entry.key}}', '${entry.value ?? ''}');
    }
    return result;
  }

  static const delegate = _AppLocalizationsDelegate();
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => AppLocalizations.supportedLocales.any(
    (supported) => supported.languageCode == locale.languageCode,
  );

  @override
  Future<AppLocalizations> load(Locale locale) async {
    final languageCode = isSupported(locale) ? locale.languageCode : 'ar';
    final source = await rootBundle.loadString(
      'assets/i18n/$languageCode.json',
    );
    final decoded = Map<String, dynamic>.from(jsonDecode(source) as Map);
    return AppLocalizations(
      Locale(languageCode),
      decoded.map((key, value) => MapEntry(key, '$value')),
    );
  }

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

extension AppTranslationContext on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);

  String tr(String key, [Map<String, Object?> values = const {}]) =>
      l10n.text(key, values);

  String trOr(
    String key,
    String fallback, [
    Map<String, Object?> values = const {},
  ]) => l10n.textOr(key, fallback, values);

  String errorText(Object? error) {
    if (error is ApiException && error.translationKey != null) {
      return tr(error.translationKey!);
    }
    return '$error';
  }
}
