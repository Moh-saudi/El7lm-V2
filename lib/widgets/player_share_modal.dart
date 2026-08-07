import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/app_theme.dart';
import '../l10n/app_localizations.dart';
import '../models/player.dart';

void showPlayerShareModal(BuildContext context, {required Player player}) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => _PlayerShareModal(player: player),
  );
}

class _PlayerShareModal extends StatelessWidget {
  const _PlayerShareModal({required this.player});

  final Player player;

  String _buildFormattedWhatsAppMessage(BuildContext context) {
    final name = player.name.isNotEmpty ? player.name : context.tr('dreamPlayer');
    final position = player.position.isNotEmpty ? player.position : '-';
    final country = player.country.isNotEmpty ? player.country : '-';
    final age = player.age != null ? '${player.age}' : '-';
    final height = player.height != null ? '${player.height} سم' : '-';
    final profileUrl = 'https://www.el7lm.com/player/${player.id}';

    return '🏆 السيرة الذاتية الرسمية للاعب من منصة الحلم الدولية للألعاب الرياضية ⚽\n\n'
        '👤 الاسم: $name\n'
        '📌 المركز: $position\n'
        '🎂 العمر: $age سنة  |  📏 الطول: $height\n'
        '🌍 البلد: $country\n'
        '🌟 التقييم: ملف معتمد رسمياً ببيانات فنية موثقة 🌟\n\n'
        '🔗 للاطلاع على الملف الشامل وكراسة الكشاف المباشرة:\n'
        '$profileUrl\n\n'
        '#منصة_الحلم #سيرة_لاعب #الكشاف_الرياضي';
  }

  Future<void> _shareToWhatsApp(BuildContext context) async {
    final message = _buildFormattedWhatsAppMessage(context);
    final url = Uri.parse('https://wa.me/?text=${Uri.encodeComponent(message)}');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      await Clipboard.setData(ClipboardData(text: message));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(context.tr('copyInviteMessageSuccess')),
            backgroundColor: AppColors.green,
          ),
        );
      }
    }
  }

  void _copySmartWebLink(BuildContext context) async {
    final profileUrl = 'https://www.el7lm.com/player/${player.id}';
    await Clipboard.setData(ClipboardData(text: profileUrl));
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(context.tr('profileLinkCopiedSuccess')),
          backgroundColor: AppColors.green,
        ),
      );
    }
  }

  void _showDigitalCardDialog(BuildContext context) {
    final profileUrl = 'https://www.el7lm.com/player/${player.id}';
    final name = player.name.isNotEmpty ? player.name : context.tr('dreamPlayer');
    final position = player.position.isNotEmpty ? player.position : '-';

    showDialog<void>(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        backgroundColor: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.navy, Color(0xFF0F172A)],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.green, width: 2),
            boxShadow: [
              BoxShadow(
                color: AppColors.green.withValues(alpha: 0.3),
                blurRadius: 20,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // EA Sports Header Badge
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.green,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'EL7LM PRO',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 11,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                  const Icon(Icons.verified_rounded, color: AppColors.green, size: 24),
                ],
              ),
              const SizedBox(height: 16),
              // Player Avatar Circle
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.green, width: 3),
                  color: Colors.white10,
                ),
                child: ClipOval(
                  child: player.imageUrl.isNotEmpty
                      ? Image.network(
                          player.imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => const Icon(Icons.person, size: 50, color: Colors.white70),
                        )
                      : const Icon(Icons.person, size: 50, color: Colors.white70),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                name,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                position,
                style: const TextStyle(
                  color: AppColors.green,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 16),
              // QR Code Card
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: QrImageView(
                  data: profileUrl,
                  version: QrVersions.auto,
                  size: 130.0,
                  gapless: true,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                context.tr('scanQrToViewProfile'),
                style: const TextStyle(color: Colors.white70, fontSize: 11),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white38),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => Navigator.pop(ctx),
                      icon: const Icon(Icons.close_rounded, size: 18),
                      label: Text(context.tr('close')),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.green,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: profileUrl));
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(context.tr('profileLinkCopiedSuccess')),
                            backgroundColor: AppColors.green,
                          ),
                        );
                      },
                      icon: const Icon(Icons.copy_rounded, size: 18),
                      label: Text(context.tr('copyLink')),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showScoutDossierDialog(BuildContext context) {
    final name = player.name.isNotEmpty ? player.name : context.tr('dreamPlayer');
    final position = player.position.isNotEmpty ? player.position : '-';
    final country = player.country.isNotEmpty ? player.country : '-';
    final age = player.age != null ? '${player.age}' : '-';
    final height = player.height != null ? '${player.height} cm' : '-';
    final weight = player.weight != null ? '${player.weight} kg' : '-';
    final profileUrl = 'https://www.el7lm.com/player/${player.id}';

    showDialog<void>(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.picture_as_pdf_rounded, color: Colors.red, size: 26),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.tr('officialScoutDossier'),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: AppColors.navy,
                          ),
                        ),
                        Text(
                          context.tr('certifiedScoutReport'),
                          style: const TextStyle(fontSize: 11, color: AppColors.muted),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const Divider(height: 24),
              _DossierRow(label: context.tr('playerNameLabel'), value: name),
              _DossierRow(label: context.tr('primaryPositionLabel'), value: position),
              _DossierRow(label: context.tr('countryNationalityLabel'), value: country),
              _DossierRow(label: context.tr('sportsAgeLabel'), value: age),
              _DossierRow(label: context.tr('heightWeightLabel'), value: '$height / $weight'),
              _DossierRow(label: context.tr('verificationStatusLabel'), value: context.tr('byTechnicalCommittee')),
              const SizedBox(height: 14),
              Center(
                child: QrImageView(
                  data: profileUrl,
                  version: QrVersions.auto,
                  size: 90.0,
                  gapless: true,
                ),
              ),
              const SizedBox(height: 4),
              Center(
                child: Text(
                  context.tr('verifiedTechnicalDossier'),
                  style: const TextStyle(fontSize: 10, color: AppColors.muted, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.navy,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: profileUrl));
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(context.tr('profileLinkCopiedSuccess')),
                        backgroundColor: AppColors.green,
                      ),
                    );
                  },
                  icon: const Icon(Icons.share_rounded, size: 18),
                  label: Text(context.tr('shareReportLink')),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            context.tr('sharePlayerCvHeader'),
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: AppColors.navy,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            context.tr('chooseShareMethod'),
            style: const TextStyle(color: AppColors.muted, fontSize: 12),
          ),
          const SizedBox(height: 16),
          // Option 1: WhatsApp Formatted Share
          _ShareOptionTile(
            icon: Icons.chat_bubble_rounded,
            iconColor: const Color(0xFF25D366),
            bgColor: const Color(0xFFDCFCE7),
            title: context.tr('shareViaWhatsApp'),
            subtitle: context.tr('formattedWhatsAppMessageDesc'),
            onTap: () {
              Navigator.pop(context);
              _shareToWhatsApp(context);
            },
          ),
          const SizedBox(height: 10),
          // Option 2: Copy Dynamic Web Link
          _ShareOptionTile(
            icon: Icons.link_rounded,
            iconColor: const Color(0xFF0284C7),
            bgColor: const Color(0xFFE0F2FE),
            title: context.tr('copySmartWebLink'),
            subtitle: context.tr('dynamicWebLinkDesc'),
            onTap: () {
              Navigator.pop(context);
              _copySmartWebLink(context);
            },
          ),
          const SizedBox(height: 10),
          // Option 3: Digital EA-Sports Player Card & QR
          _ShareOptionTile(
            icon: Icons.qr_code_2_rounded,
            iconColor: const Color(0xFF7C3AED),
            bgColor: const Color(0xFFEDE9FE),
            title: context.tr('digitalPlayerCard'),
            subtitle: context.tr('digitalPlayerCardDesc'),
            onTap: () {
              Navigator.pop(context);
              _showDigitalCardDialog(context);
            },
          ),
          const SizedBox(height: 10),
          // Option 4: Official Scout Dossier
          _ShareOptionTile(
            icon: Icons.picture_as_pdf_rounded,
            iconColor: const Color(0xFFE11D48),
            bgColor: const Color(0xFFFFE4E6),
            title: context.tr('officialScoutDossier'),
            subtitle: context.tr('officialScoutDossierDesc'),
            onTap: () {
              Navigator.pop(context);
              _showScoutDossierDialog(context);
            },
          ),
        ],
      ),
    );
  }
}

class _ShareOptionTile extends StatelessWidget {
  const _ShareOptionTile({
    required this.icon,
    required this.iconColor,
    required this.bgColor,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final Color bgColor;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x08000000),
                blurRadius: 8,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: iconColor, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: AppColors.navy,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.muted,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.muted),
            ],
          ),
        ),
      ),
    );
  }
}

class _DossierRow extends StatelessWidget {
  const _DossierRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.muted, fontSize: 12)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.navy)),
        ],
      ),
    );
  }
}
