import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../services/in_app_notification_service.dart';
import '../../widgets/company_footer.dart';
import '../../widgets/sign_out_dialog.dart';

class ManagerSettingsScreen extends StatefulWidget {
  const ManagerSettingsScreen({super.key, required this.onSignOut});

  final Future<void> Function() onSignOut;

  @override
  State<ManagerSettingsScreen> createState() => _ManagerSettingsScreenState();
}

class _ManagerSettingsScreenState extends State<ManagerSettingsScreen> {
  final _service = InAppNotificationService();
  bool _isSigningOut = false;

  Future<void> _signOut() async {
    final confirmed = await showSignOutConfirmationDialog(context);
    if (!confirmed || !mounted) return;
    setState(() => _isSigningOut = true);
    try {
      await widget.onSignOut();
    } finally {
      if (mounted) setState(() => _isSigningOut = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('settings'))),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.volume_up_rounded,
                        color: AppColors.green,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          context.tr('notificationSoundSettings'),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _setting(
                    title: 'enableChatSound',
                    subtitle: 'enableChatSoundDescription',
                    value: _service.chatSoundEnabled,
                    onChanged: _service.setChatSoundEnabled,
                  ),
                  const Divider(height: 1),
                  _setting(
                    title: 'enableNotificationSound',
                    subtitle: 'enableNotificationSoundDescription',
                    value: _service.notificationSoundEnabled,
                    onChanged: _service.setNotificationSoundEnabled,
                  ),
                  const Divider(height: 1),
                  _setting(
                    title: 'enableInAppPopups',
                    subtitle: 'enableInAppPopupsDescription',
                    value: _service.inAppPopupEnabled,
                    onChanged: _service.setInAppPopupEnabled,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: ListTile(
              leading: const Icon(
                Icons.logout_rounded,
                color: Color(0xFFE5484D),
              ),
              title: Text(
                context.tr('signOut'),
                style: const TextStyle(
                  color: Color(0xFFE5484D),
                  fontWeight: FontWeight.w700,
                ),
              ),
              trailing: _isSigningOut
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(
                      Icons.arrow_forward_ios_rounded,
                      size: 16,
                      color: Color(0xFFE5484D),
                    ),
              onTap: _isSigningOut ? null : _signOut,
            ),
          ),
          const SizedBox(height: 24),
          const FreeAccountsBanner(),
          const CompanyFooter(),
        ],
      ),
    );
  }

  Widget _setting({
    required String title,
    required String subtitle,
    required bool value,
    required Future<void> Function(bool) onChanged,
  }) {
    return SwitchListTile.adaptive(
      contentPadding: EdgeInsets.zero,
      title: Text(
        context.tr(title),
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
      ),
      subtitle: Text(
        context.tr(subtitle),
        style: const TextStyle(fontSize: 12, color: AppColors.muted),
      ),
      value: value,
      activeTrackColor: AppColors.green,
      onChanged: (next) async {
        await onChanged(next);
        if (mounted) setState(() {});
      },
    );
  }
}
