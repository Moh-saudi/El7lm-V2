import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app_localizations.dart';

class LocaleController extends ChangeNotifier {
  LocaleController._();

  static final instance = LocaleController._();
  static const _preferenceKey = 'app_locale';

  Locale _locale = const Locale('ar');

  Locale get locale => _locale;

  Future<void> initialize() async {
    final preferences = await SharedPreferences.getInstance();
    final saved = preferences.getString(_preferenceKey);
    if (saved != null &&
        AppLocalizations.supportedLocales.any(
          (locale) => locale.languageCode == saved,
        )) {
      _locale = Locale(saved);
    }
  }

  Future<void> setLocale(Locale locale) async {
    if (_locale.languageCode == locale.languageCode) return;
    _locale = Locale(locale.languageCode);
    notifyListeners();
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_preferenceKey, locale.languageCode);
  }
}
