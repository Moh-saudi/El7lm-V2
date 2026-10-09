import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

import '../core/app_config.dart';

class AppUpdateService {
  AppUpdateService._();

  static const int currentBuildCode = 24;
  static const String currentVersionName = '1.0.7';

  static bool _hasPromptedThisSession = false;

  /// Checks for available updates and prompts the user if a newer build exists.
  static Future<void> checkAndPromptUpdate(BuildContext context) async {
    if (_hasPromptedThisSession) return;

    try {
      final uri = Uri.parse('${AppConfig.apiBaseUrl}/api/app/version?_t=${DateTime.now().millisecondsSinceEpoch}');
      final response = await http.get(uri).timeout(const Duration(seconds: 4));

      if (response.statusCode != 200) return;
      final data = jsonDecode(response.body) as Map<String, dynamic>;

      final int latestBuild = (data['latestBuildNumber'] as num?)?.toInt() ?? currentBuildCode;
      final int minRequired = (data['minRequiredBuildNumber'] as num?)?.toInt() ?? 0;
      final bool forceUpdate = (data['forceUpdate'] as bool?) ?? (currentBuildCode < minRequired);
      final String playStoreUrl = (data['playStoreUrl'] as String?) ??
          'https://play.google.com/store/apps/details?id=com.el7lm.el7lm_mobile';
      final String notes = (data['releaseNotes'] as String?) ??
          'يتوفر تحديث جديد لمنصة الحلم بمميزات متطورة وسينما اللاعبين. يرجى التحديث لتجربة أفضل.';

      if (latestBuild > currentBuildCode && context.mounted) {
        _hasPromptedThisSession = true;
        _showUpdateDialog(
          context: context,
          releaseNotes: notes,
          playStoreUrl: playStoreUrl,
          forceUpdate: forceUpdate,
        );
      }
    } catch (_) {
      // Non-blocking: fail silently on network timeout or offline
    }
  }

  static void _showUpdateDialog({
    required BuildContext context,
    required String releaseNotes,
    required String playStoreUrl,
    required bool forceUpdate,
  }) {
    showDialog<void>(
      context: context,
      barrierDismissible: !forceUpdate,
      builder: (ctx) => PopScope(
        canPop: !forceUpdate,
        child: Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          backgroundColor: const Color(0xFF1E293B),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 26),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 68,
                  height: 68,
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.system_update_rounded,
                    color: Color(0xFF10B981),
                    size: 36,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'تحديث جديد متوفر 🚀',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 10),
                Text(
                  releaseNotes,
                  style: const TextStyle(
                    fontSize: 14,
                    height: 1.5,
                    color: Color(0xFF94A3B8),
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      elevation: 0,
                    ),
                    onPressed: () async {
                      final uri = Uri.parse(playStoreUrl);
                      if (await canLaunchUrl(uri)) {
                        await launchUrl(uri, mode: LaunchMode.externalApplication);
                      }
                    },
                    child: const Text(
                      'تحديث الآن من Google Play',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                if (!forceUpdate) ...[
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    child: const Text(
                      'لاحقاً',
                      style: TextStyle(
                        fontSize: 14,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
