import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/app_config.dart';
import '../core/app_theme.dart';
import '../l10n/app_localizations.dart';
import 'personal_sponsor_support.dart';

class LegalLinksFooter extends StatelessWidget {
  const LegalLinksFooter({super.key, required this.onTerms});

  final VoidCallback onTerms;

  Future<void> _openPrivacy(BuildContext context) async {
    final uri = Uri.parse('${AppConfig.webBaseUrl}/privacy');
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) &&
        context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(context.tr('openWebFailed'))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 3,
      children: [
        TextButton(onPressed: onTerms, child: Text(context.tr('terms'))),
        const Text('•', style: TextStyle(color: AppColors.muted)),
        TextButton(
          onPressed: () => _openPrivacy(context),
          child: Text(context.tr('privacyPolicy')),
        ),
        const Text('•', style: TextStyle(color: AppColors.muted)),
        TextButton(
          onPressed: () => PersonalSponsorSupportButton.showSupport(context),
          child: Text(context.tr('help')),
        ),
      ],
    );
  }
}
