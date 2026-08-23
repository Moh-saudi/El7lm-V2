import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../l10n/locale_controller.dart';

class LanguageSwitcher extends StatelessWidget {
  const LanguageSwitcher({super.key, this.compact = false});

  final bool compact;

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
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              margin: const EdgeInsets.symmetric(horizontal: 4),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(currentLang.flag, style: const TextStyle(fontSize: 15)),
                  const SizedBox(width: 5),
                  Text(
                    current.toUpperCase(),
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 12,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            )
          : const Icon(Icons.language),
    );
  }
}
