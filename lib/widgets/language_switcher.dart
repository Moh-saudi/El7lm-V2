import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../l10n/locale_controller.dart';

class LanguageSwitcher extends StatelessWidget {
  const LanguageSwitcher({super.key, this.compact = false});

  final bool compact;

  static const _languages = [
    (code: 'ar', label: 'العربية', flag: '🇶🇦'),
    (code: 'en', label: 'English', flag: '🇬🇧'),
    (code: 'es', label: 'Español', flag: '🇪🇸'),
    (code: 'pt', label: 'Português', flag: '🇵🇹'),
  ];

  @override
  Widget build(BuildContext context) {
    final current = LocaleController.instance.locale.languageCode;
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
                  Text(language.flag),
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
          ? Padding(
              padding: const EdgeInsets.all(8),
              child: Text(
                _languages
                    .firstWhere((language) => language.code == current)
                    .code
                    .toUpperCase(),
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            )
          : const Icon(Icons.language),
    );
  }
}
