import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../l10n/locale_controller.dart';

class LanguageSwitcher extends StatelessWidget {
  const LanguageSwitcher({super.key, this.compact = false, this.isDark = false});

  final bool compact;
  final bool isDark;

  static const _languages = [
    (code: 'ar', label: 'العربية', flag: '🇸🇦'),
    (code: 'en', label: 'English', flag: '🇬🇧'),
    (code: 'es', label: 'Español', flag: '🇪🇸'),
    (code: 'pt', label: 'Português', flag: '🇵🇹'),
    (code: 'fr', label: 'Français', flag: '🇫🇷'),
  ];

  @override
  Widget build(BuildContext context) {
    final current = LocaleController.instance.locale.languageCode;
    final currentLang = _languages.firstWhere(
      (language) => language.code == current,
      orElse: () => _languages.first,
    );

    return PopupMenuButton<String>(
      tooltip: context.tr('language'),
      initialValue: current,
      onSelected: (code) => LocaleController.instance.setLocale(Locale(code)),
      itemBuilder: (context) => _languages
          .map(
            (language) => PopupMenuItem(
              value: language.code,
              child: Row(
                children: [
                  Text(language.flag, style: const TextStyle(fontSize: 16)),
                  const SizedBox(width: 10),
                  Text(language.label),
                  const Spacer(),
                  if (language.code == current)
                    const Icon(Icons.check, size: 18),
                ],
              ),
            ),
          )
          .toList(),
      child: compact
          ? Container(
              height: 38,
              padding: const EdgeInsets.symmetric(horizontal: 10),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.12)
                    : const Color(0xFF0F172A).withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.15)
                      : const Color(0xFF0F172A).withValues(alpha: 0.08),
                  width: 0.8,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(currentLang.flag, style: const TextStyle(fontSize: 14)),
                  const SizedBox(width: 5),
                  Text(
                    current.toUpperCase(),
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 11.5,
                      letterSpacing: 0.5,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
                  ),
                ],
              ),
            )
          : const Icon(Icons.language),
    );
  }
}

