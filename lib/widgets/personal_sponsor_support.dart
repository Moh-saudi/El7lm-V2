import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/app_theme.dart';
import '../l10n/app_localizations.dart';

class PersonalSponsorSupportButton extends StatelessWidget {
  const PersonalSponsorSupportButton({super.key});

  static const whatsAppNumber = '97430611350';
  static const supportEmail = 'info@el7lm.com';

  static Future<void> showSupport(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      useSafeArea: true,
      isScrollControlled: true,
      builder: (sheetContext) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircleAvatar(
                radius: 28,
                backgroundColor: Color(0xFFE8FFF6),
                child: Icon(
                  Icons.support_agent_rounded,
                  color: AppColors.green,
                  size: 32,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                sheetContext.tr('personalSponsorService'),
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 4),
              Text(
                sheetContext.tr('support24h'),
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.muted),
              ),
              const SizedBox(height: 18),
              _ContactTile(
                icon: Icons.chat_rounded,
                color: const Color(0xFF25D366),
                title: sheetContext.tr('contactWhatsApp'),
                subtitle: '+974 3061 1350',
                onTap: () => _open(
                  sheetContext,
                  Uri.parse('https://wa.me/$whatsAppNumber'),
                ),
              ),
              const SizedBox(height: 10),
              _ContactTile(
                icon: Icons.email_outlined,
                color: AppColors.green,
                title: sheetContext.tr('contactEmail'),
                subtitle: supportEmail,
                onTap: () => _open(
                  sheetContext,
                  Uri.parse('mailto:$supportEmail'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static Future<void> _open(BuildContext context, Uri uri) async {
    final messenger = ScaffoldMessenger.maybeOf(context);
    final failureMessage = context.tr('openContactFailed');
    if (context.mounted) Navigator.of(context).pop();
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      messenger?.showSnackBar(SnackBar(content: Text(failureMessage)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: context.tr('personalSponsorService'),
      child: FloatingActionButton.small(
        heroTag: 'personal-sponsor-support',
        tooltip: context.tr('personalSponsorService'),
        onPressed: () => showSupport(context),
        backgroundColor: AppColors.green,
        foregroundColor: Colors.white,
        child: const Icon(Icons.support_agent_rounded),
      ),
    );
  }
}

class _ContactTile extends StatelessWidget {
  const _ContactTile({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: color.withValues(alpha: .22)),
      ),
      leading: CircleAvatar(
        backgroundColor: color.withValues(alpha: .12),
        foregroundColor: color,
        child: Icon(icon),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
      subtitle: Text(subtitle, textDirection: TextDirection.ltr),
      trailing: const Icon(Icons.open_in_new_rounded, size: 18),
    );
  }
}
