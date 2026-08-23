import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/account_type.dart';
import '../../models/player.dart';
import '../../services/data_service.dart';
import 'player_details_screen.dart';

class ManagePlayersScreen extends StatefulWidget {
  const ManagePlayersScreen({
    super.key,
    required this.accountType,
    required this.organizationName,
    required this.dataService,
  });

  final AccountType accountType;
  final String organizationName;
  final DataService dataService;

  @override
  State<ManagePlayersScreen> createState() => _ManagePlayersScreenState();
}

class _ManagePlayersScreenState extends State<ManagePlayersScreen> {
  late Future<List<Map<String, dynamic>>> future;
  late Future<List<Map<String, dynamic>>> referralsFuture;

  @override
  void initState() {
    super.initState();
    future = widget.dataService.fetchManagedPlayers(widget.accountType);
    referralsFuture = widget.dataService.fetchAllInviteCodes();
  }

  void _refreshData() {
    setState(() {
      future = widget.dataService.fetchManagedPlayers(widget.accountType);
      referralsFuture = widget.dataService.fetchAllInviteCodes();
    });
  }

  String _formatJoinDate(BuildContext context, dynamic dateValue) {
    if (dateValue == null) return '';
    final str = '$dateValue'.trim();
    if (str.isEmpty || str == 'null') return '';
    final dt = DateTime.tryParse(str);
    if (dt == null) return str;
    final local = dt.toLocal();
    final lang = Localizations.localeOf(context).languageCode;
    if (lang == 'ar') {
      final months = [
        'يناير',
        'فبراير',
        'مارس',
        'أبريل',
        'مايو',
        'يونيو',
        'يوليو',
        'أغسطس',
        'سبتمبر',
        'أكتوبر',
        'نوفمبر',
        'ديسمبر',
      ];
      return '${local.day} ${months[local.month - 1]} ${local.year}';
    }
    return '${local.year}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')}';
  }

  Future<void> _showCreateInviteModal(BuildContext context) async {
    final titleController = TextEditingController();
    final maxUsageController = TextEditingController();
    bool isUnlimited = true;
    bool isSubmitting = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: false,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // ── Drag Handle ──────────────────────────────────────────
                const SizedBox(height: 12),
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),

                // ── Gradient Header ───────────────────────────────────────
                Container(
                  margin: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 16,
                  ),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.navy, Color(0xFF1E3A5F)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.gold.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.qr_code_2_rounded,
                          color: AppColors.gold,
                          size: 26,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              context.tr('issueNewInviteCode'),
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              context.tr('tapCodeToViewQr'),
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.white.withValues(alpha: 0.7),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // ── Form Fields ───────────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Description Field
                      Text(
                        context.tr('ambassadorNameOrDescription'),
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.navy,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: titleController,
                        textDirection: TextDirection.rtl,
                        decoration: InputDecoration(
                          hintText: context.tr('enterInviteDescriptionHint'),
                          hintStyle: const TextStyle(
                            fontSize: 13,
                            color: Colors.grey,
                          ),
                          prefixIcon: const Icon(
                            Icons.edit_note_rounded,
                            color: AppColors.green,
                            size: 22,
                          ),
                          filled: true,
                          fillColor: const Color(0xFFF5F7FA),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide.none,
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: const BorderSide(
                              color: AppColors.green,
                              width: 1.5,
                            ),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 14,
                          ),
                        ),
                      ),

                      const SizedBox(height: 18),

                      // Usage Limit Section
                      Text(
                        context.tr('usageLimit'),
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.navy,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setModalState(() {
                                isUnlimited = true;
                                maxUsageController.clear();
                              }),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 12,
                                ),
                                decoration: BoxDecoration(
                                  color: isUnlimited
                                      ? AppColors.green.withValues(alpha: 0.12)
                                      : const Color(0xFFF5F7FA),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isUnlimited
                                        ? AppColors.green
                                        : Colors.transparent,
                                    width: 1.5,
                                  ),
                                ),
                                child: Column(
                                  children: [
                                    Icon(
                                      Icons.all_inclusive_rounded,
                                      color: isUnlimited
                                          ? AppColors.green
                                          : Colors.grey,
                                      size: 22,
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      context.tr('unlimitedUsage'),
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: isUnlimited
                                            ? AppColors.green
                                            : Colors.grey,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: GestureDetector(
                              onTap: () =>
                                  setModalState(() => isUnlimited = false),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                padding: const EdgeInsets.symmetric(
                                  vertical: 12,
                                ),
                                decoration: BoxDecoration(
                                  color: !isUnlimited
                                      ? AppColors.navy.withValues(alpha: 0.1)
                                      : const Color(0xFFF5F7FA),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: !isUnlimited
                                        ? AppColors.navy
                                        : Colors.transparent,
                                    width: 1.5,
                                  ),
                                ),
                                child: Column(
                                  children: [
                                    Icon(
                                      Icons.pin_rounded,
                                      color: !isUnlimited
                                          ? AppColors.navy
                                          : Colors.grey,
                                      size: 22,
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      context.tr('maxUsageCount'),
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: !isUnlimited
                                            ? AppColors.navy
                                            : Colors.grey,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),

                      // Max Usage Input (animated)
                      AnimatedSize(
                        duration: const Duration(milliseconds: 250),
                        curve: Curves.easeInOut,
                        child: !isUnlimited
                            ? Padding(
                                padding: const EdgeInsets.only(top: 12),
                                child: TextField(
                                  controller: maxUsageController,
                                  keyboardType: TextInputType.number,
                                  inputFormatters: [
                                    FilteringTextInputFormatter.digitsOnly,
                                  ],
                                  decoration: InputDecoration(
                                    hintText: context.tr('enterMaxUsesHint'),
                                    hintStyle: const TextStyle(
                                      fontSize: 13,
                                      color: Colors.grey,
                                    ),
                                    prefixIcon: const Icon(
                                      Icons.group_rounded,
                                      color: AppColors.navy,
                                      size: 20,
                                    ),
                                    filled: true,
                                    fillColor: const Color(0xFFF5F7FA),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(14),
                                      borderSide: BorderSide.none,
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(14),
                                      borderSide: const BorderSide(
                                        color: AppColors.navy,
                                        width: 1.5,
                                      ),
                                    ),
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 14,
                                      vertical: 14,
                                    ),
                                  ),
                                ),
                              )
                            : const SizedBox.shrink(),
                      ),

                      const SizedBox(height: 24),

                      // Submit Button
                      SizedBox(
                        width: double.infinity,
                        height: 54,
                        child: FilledButton(
                          onPressed: isSubmitting
                              ? null
                              : () async {
                                  final title = titleController.text.trim();
                                  int? maxUsage;
                                  if (!isUnlimited &&
                                      maxUsageController.text
                                          .trim()
                                          .isNotEmpty) {
                                    maxUsage = int.tryParse(
                                      maxUsageController.text.trim(),
                                    );
                                  }

                                  setModalState(() => isSubmitting = true);
                                  try {
                                    final orgName =
                                        widget.organizationName.trim().isEmpty
                                        ? widget.accountType.localizedName(
                                            context,
                                          )
                                        : widget.organizationName.trim();

                                    await widget.dataService.createInviteCode(
                                      accountType: widget.accountType,
                                      organizationName: orgName,
                                      description: title.isNotEmpty
                                          ? title
                                          : 'انضم إلى $orgName',
                                      maxUsage: maxUsage,
                                    );

                                    if (ctx.mounted) Navigator.pop(ctx);
                                    _refreshData();

                                    if (context.mounted) {
                                      ScaffoldMessenger.of(
                                        context,
                                      ).showSnackBar(
                                        SnackBar(
                                          content: Row(
                                            children: [
                                              const Icon(
                                                Icons.check_circle_rounded,
                                                color: Colors.white,
                                                size: 20,
                                              ),
                                              const SizedBox(width: 8),
                                              Text(
                                                context.tr(
                                                  'inviteCodeCreatedSuccess',
                                                ),
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ],
                                          ),
                                          backgroundColor: AppColors.green,
                                          behavior: SnackBarBehavior.floating,
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(
                                              12,
                                            ),
                                          ),
                                        ),
                                      );
                                    }
                                  } catch (e) {
                                    setModalState(() => isSubmitting = false);
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(
                                        context,
                                      ).showSnackBar(
                                        SnackBar(
                                          content: Text(
                                            e.toString().replaceAll(
                                              'Exception: ',
                                              '',
                                            ),
                                          ),
                                          backgroundColor: Colors.red.shade800,
                                          behavior: SnackBarBehavior.floating,
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(
                                              12,
                                            ),
                                          ),
                                        ),
                                      );
                                    }
                                  }
                                },
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.green,
                            disabledBackgroundColor: AppColors.green.withValues(
                              alpha: 0.5,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: isSubmitting
                              ? const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        color: Colors.white,
                                        strokeWidth: 2.5,
                                      ),
                                    ),
                                    SizedBox(width: 12),
                                    Text(
                                      'جارٍ الإصدار...',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 15,
                                      ),
                                    ),
                                  ],
                                )
                              : Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.qr_code_rounded, size: 22),
                                    const SizedBox(width: 8),
                                    Text(
                                      context.tr('generateInviteCode'),
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w900,
                                        fontSize: 16,
                                      ),
                                    ),
                                  ],
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  String _buildFormattedShareMessage(String code, String link, String title) {
    final orgName = widget.organizationName.trim().isEmpty
        ? widget.accountType.localizedName(context)
        : widget.organizationName.trim();
    return '🏆 دعوة انضمام رسمية من $orgName عبر منصة الحلم الدولية للألعاب الرياضية ⚽\n\n'
        '📌 الفئة / الوصف: $title\n\n'
        '🎯 كود الانضمام المباشر: $code\n'
        '🔗 رابط الانضمام المباشر: $link\n\n'
        'سجّل حسابك كلاعب الآن واستخدم الكود للانضمام الفوري لصفوف لاعبينا!\n'
        '#منصة_الحلم #الحلم_الرياضي';
  }

  Future<void> _shareToWhatsApp(String code, String link, String title) async {
    final message = _buildFormattedShareMessage(code, link, title);
    final whatsappUri = Uri.parse(
      'https://wa.me/?text=${Uri.encodeComponent(message)}',
    );
    try {
      if (!await launchUrl(whatsappUri, mode: LaunchMode.externalApplication)) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذر فتح تطبيق الواتساب')),
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('تعذر فتح الواتساب')));
    }
  }

  Future<void> _deleteCode(String referralId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: Text(context.tr('deleteInviteCode')),
        content: Text(context.tr('deleteInviteConfirm')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx, false),
            child: Text(context.tr('cancel')),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(dialogCtx, true),
            child: Text(context.tr('deleteInviteCode')),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await widget.dataService.deleteReferralCode(referralId);
        _refreshData();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('تم حذف كود الدعوة بنجاح ✅'),
              backgroundColor: AppColors.green,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          final msg = e.toString().replaceAll('Exception: ', '').trim();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(
                    Icons.warning_amber_rounded,
                    color: Colors.white,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      msg,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              backgroundColor: Colors.red.shade800,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              duration: const Duration(seconds: 5),
            ),
          );
        }
      }
    }
  }

  void _showReferralDetailModal(Map<String, dynamic> item) {
    final code = '${item['referralCode'] ?? item['code'] ?? ''}';
    final description = '${item['description'] ?? 'انضم إلى المنظمة'}';
    final currentUsage = (item['currentUsage'] as num? ?? 0).toInt();
    final maxUsage = item['maxUsage'] != null
        ? (item['maxUsage'] as num).toInt()
        : null;
    final usageText = maxUsage != null
        ? '$currentUsage / $maxUsage'
        : '$currentUsage / ∞';
    final link =
        '${item['inviteLink'] ?? 'https://www.el7lm.com/join/org/$code'}';
    final referralId = '${item['id']}';
    final orgName = widget.organizationName.trim().isEmpty
        ? widget.accountType.localizedName(context)
        : widget.organizationName.trim();

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetCtx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.qr_code_2_rounded,
                    size: 28,
                    color: AppColors.green,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    description,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.navy,
                    ),
                  ),
                ],
              ),
              Text(
                '$orgName • الاستخدام: $usageText',
                style: const TextStyle(fontSize: 12, color: AppColors.muted),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: AppColors.green.withValues(alpha: 0.4),
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.06),
                      blurRadius: 12,
                      spreadRadius: 1,
                    ),
                  ],
                ),
                child: QrImageView(
                  data: link,
                  version: QrVersions.auto,
                  size: 180.0,
                  gapless: true,
                ),
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: AppColors.green.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: SelectableText(
                  code,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2,
                    color: AppColors.navy,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        foregroundColor: AppColors.navy,
                        side: const BorderSide(color: AppColors.navy),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onPressed: () async {
                        final message = _buildFormattedShareMessage(
                          code,
                          link,
                          description,
                        );
                        await Clipboard.setData(ClipboardData(text: message));
                        if (!sheetCtx.mounted || !mounted) return;
                        ScaffoldMessenger.of(sheetCtx).showSnackBar(
                          SnackBar(
                            content: Text(
                              sheetCtx.tr('copyInviteMessageSuccess'),
                            ),
                            backgroundColor: AppColors.green,
                          ),
                        );
                      },
                      icon: const Icon(Icons.copy_rounded, size: 18),
                      label: Text(
                        context.tr('copyMessage'),
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        backgroundColor: const Color(0xFF25D366),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onPressed: () =>
                          _shareToWhatsApp(code, link, description),
                      icon: const Icon(Icons.share_rounded, size: 18),
                      label: Text(
                        context.tr('shareWhatsApp'),
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextButton.icon(
                style: TextButton.styleFrom(foregroundColor: Colors.red),
                onPressed: () {
                  Navigator.pop(sheetCtx);
                  _deleteCode(referralId);
                },
                icon: const Icon(Icons.delete_outline_rounded, size: 18),
                label: Text(
                  context.tr('deleteInviteCode'),
                  style: const TextStyle(fontWeight: FontWeight.bold),
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
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── 1. Referrals Header & Creation Card ─────────────────────────────
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.tr('dreamAmbassadorsAndInviteCodes'),
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                        color: AppColors.navy,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      context.tr('tapCodeToViewQr'),
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              FilledButton.icon(
                onPressed: () => _showCreateInviteModal(context),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.navy,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                icon: const Icon(Icons.add_rounded, size: 18),
                label: Text(
                  context.tr('newCode'),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // ── 2. Compact Referrals Grid/List (سفراء الحلم) ──────────────────────
          FutureBuilder<List<Map<String, dynamic>>>(
            future: referralsFuture,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              final referrals = snapshot.data ?? [];
              if (snapshot.hasError || referrals.isEmpty) {
                return Card(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Center(
                      child: Text(
                        context.tr('noInviteCodesYet'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: AppColors.muted,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                );
              }

              return Column(
                children: referrals.map((item) {
                  final code = '${item['referralCode'] ?? item['code'] ?? ''}';
                  final description = '${item['description'] ?? ''}';
                  final currentUsage = (item['currentUsage'] as num? ?? 0)
                      .toInt();
                  final maxUsage = item['maxUsage'] != null
                      ? (item['maxUsage'] as num).toInt()
                      : null;
                  final usageText = maxUsage != null
                      ? '$currentUsage/$maxUsage'
                      : '$currentUsage/∞';
                  final link =
                      '${item['inviteLink'] ?? 'https://www.el7lm.com/join/org/$code'}';
                  final referralId = '${item['id']}';

                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 1.5,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: () => _showReferralDetailModal(item),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                        child: Row(
                          children: [
                            // Mini QR Code Thumbnail
                            Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: AppColors.green.withValues(alpha: 0.4),
                                  width: 1,
                                ),
                              ),
                              child: QrImageView(
                                data: link,
                                version: QrVersions.auto,
                                size: 44.0,
                                gapless: true,
                              ),
                            ),
                            const SizedBox(width: 12),
                            // Details: Description, Code, Usage
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    description.isNotEmpty ? description : code,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                      color: AppColors.navy,
                                    ),
                                  ),
                                  const SizedBox(height: 3),
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: AppColors.navy.withValues(
                                            alpha: 0.08,
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            6,
                                          ),
                                        ),
                                        child: Text(
                                          code,
                                          style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w900,
                                            letterSpacing: 1,
                                            color: AppColors.navy,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        context.tr('usageLabel', {
                                          'usage': usageText,
                                        }),
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: AppColors.muted,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            // Quick Action Buttons: Zoom QR & Delete
                            SizedBox(
                              width: 34,
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    tooltip: context.tr('viewQrCode'),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints.tightFor(
                                      width: 32,
                                      height: 32,
                                    ),
                                    icon: const Icon(
                                      Icons.qr_code_scanner_rounded,
                                      color: AppColors.green,
                                      size: 19,
                                    ),
                                    onPressed: () =>
                                        _showReferralDetailModal(item),
                                  ),
                                  IconButton(
                                    tooltip: context.tr('deleteInviteCode'),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints.tightFor(
                                      width: 32,
                                      height: 32,
                                    ),
                                    icon: const Icon(
                                      Icons.delete_outline_rounded,
                                      color: Colors.redAccent,
                                      size: 19,
                                    ),
                                    onPressed: () => _deleteCode(referralId),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              );
            },
          ),
          const SizedBox(height: 20),

          // ── 3. Managed Roster Section (اللاعبون التابعون) ──────────────────────
          Text(
            context.tr('managedPlayers'),
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 10),
          FutureBuilder<List<Map<String, dynamic>>>(
            future: future,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Padding(
                  padding: EdgeInsets.all(36),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              if (snapshot.hasError) {
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Text(context.errorText(snapshot.error)),
                  ),
                );
              }
              final players = snapshot.data ?? const [];
              if (players.isEmpty) {
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Center(child: Text(context.tr('noManagedPlayers'))),
                  ),
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  RosterAnalyticsCard(players: players),
                  ...players.map((player) {
                    final name =
                        player['full_name'] ??
                        player['name'] ??
                        context.tr('player');
                    final position =
                        player['primary_position'] ?? player['position'] ?? '';
                    final avatarUrl =
                        '${player['profile_image_url'] ?? player['profile_image'] ?? player['image'] ?? player['avatar'] ?? player['photo_url'] ?? ''}'
                            .trim();
                    final joinCode =
                        '${player['join_code'] ?? player['referral_code'] ?? player['code'] ?? player['invite_code'] ?? ''}'
                            .trim();
                    final playerId = '${player['id']}';
                    final approvalStatus =
                        '${player['approval_status'] ?? player['status'] ?? ''}';
                    final isApproved =
                        approvalStatus == 'approved' ||
                        player['guardian_approval'] == true ||
                        player['guardian_consent'] == true ||
                        player['parent_consent'] == true ||
                        player['guardian_approved'] == true;
                    final isPending =
                        !isApproved && approvalStatus != 'rejected';

                    final rawJoinDate =
                        player['joinedAt'] ??
                        player['organizationJoinedAt'] ??
                        player['requestedAt'] ??
                        player['created_at'] ??
                        player['createdAt'];
                    final joinDateText = _formatJoinDate(context, rawJoinDate);

                    return Card(
                      margin: const EdgeInsets.only(bottom: 9),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Column(
                          children: [
                            ListTile(
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => PlayerDetailsScreen(
                                      initialPlayer: Player.fromJson(player),
                                      dataService: widget.dataService,
                                    ),
                                  ),
                                );
                              },
                              leading: CircleAvatar(
                                backgroundColor: isApproved
                                    ? AppColors.green.withValues(alpha: .12)
                                    : Colors.amber.withValues(alpha: .12),
                                backgroundImage: avatarUrl.startsWith('http')
                                    ? NetworkImage(avatarUrl)
                                    : null,
                                child: avatarUrl.startsWith('http')
                                    ? null
                                    : Icon(
                                        Icons.person,
                                        color: isApproved
                                            ? AppColors.green
                                            : Colors.amber.shade800,
                                      ),
                              ),
                              title: Text(
                                '$name',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (position.toString().isNotEmpty)
                                    Text('$position'),
                                  if (joinCode.isNotEmpty ||
                                      joinDateText.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 3),
                                      child: Wrap(
                                        spacing: 8,
                                        runSpacing: 2,
                                        children: [
                                          if (joinCode.isNotEmpty)
                                            Text(
                                              context.tr('joinCodeLabel', {
                                                'code': joinCode,
                                              }),
                                              style: const TextStyle(
                                                fontSize: 11,
                                                color: AppColors.navy,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          if (joinDateText.isNotEmpty)
                                            Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                const Icon(
                                                  Icons.calendar_today_rounded,
                                                  size: 11,
                                                  color: AppColors.muted,
                                                ),
                                                const SizedBox(width: 3),
                                                Text(
                                                  joinDateText,
                                                  style: const TextStyle(
                                                    fontSize: 11,
                                                    color: AppColors.muted,
                                                    fontWeight: FontWeight.w600,
                                                  ),
                                                ),
                                              ],
                                            ),
                                        ],
                                      ),
                                    ),
                                ],
                              ),
                              trailing: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color:
                                      (isApproved ? Colors.green : Colors.amber)
                                          .withValues(alpha: .12),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      isApproved
                                          ? Icons.check_circle_rounded
                                          : Icons.hourglass_empty_rounded,
                                      size: 14,
                                      color: isApproved
                                          ? Colors.green
                                          : Colors.amber.shade800,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      context.tr(
                                        isApproved
                                            ? 'guardianApproved'
                                            : 'pendingApproval',
                                      ),
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: isApproved
                                            ? Colors.green
                                            : Colors.amber.shade800,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),

                            // Action Row for Pending Players (Approve / Reject)
                            if (isPending)
                              Padding(
                                padding: const EdgeInsets.fromLTRB(
                                  16,
                                  0,
                                  16,
                                  10,
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: OutlinedButton.icon(
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: Colors.redAccent,
                                          side: const BorderSide(
                                            color: Colors.redAccent,
                                          ),
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(
                                              10,
                                            ),
                                          ),
                                          padding: const EdgeInsets.symmetric(
                                            vertical: 6,
                                          ),
                                        ),
                                        onPressed: () async {
                                          await widget.dataService
                                              .rejectPlayerJoinRequest(
                                                playerId: playerId,
                                                accountType: widget.accountType,
                                              );
                                          if (context.mounted) {
                                            ScaffoldMessenger.of(
                                              context,
                                            ).showSnackBar(
                                              SnackBar(
                                                content: Text(
                                                  context.tr(
                                                    'playerRejectedSuccess',
                                                  ),
                                                ),
                                                backgroundColor:
                                                    Colors.redAccent,
                                              ),
                                            );
                                            _refreshData();
                                          }
                                        },
                                        icon: const Icon(
                                          Icons.close_rounded,
                                          size: 16,
                                        ),
                                        label: Text(
                                          context.tr('rejectPlayer'),
                                          style: const TextStyle(fontSize: 12),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: ElevatedButton.icon(
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.green,
                                          foregroundColor: Colors.white,
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(
                                              10,
                                            ),
                                          ),
                                          padding: const EdgeInsets.symmetric(
                                            vertical: 6,
                                          ),
                                        ),
                                        onPressed: () async {
                                          await widget.dataService
                                              .approvePlayerJoinRequest(
                                                playerId: playerId,
                                                accountType: widget.accountType,
                                              );
                                          if (context.mounted) {
                                            ScaffoldMessenger.of(
                                              context,
                                            ).showSnackBar(
                                              SnackBar(
                                                content: Text(
                                                  context.tr(
                                                    'playerApprovedSuccess',
                                                  ),
                                                ),
                                                backgroundColor:
                                                    AppColors.green,
                                              ),
                                            );
                                            _refreshData();
                                          }
                                        },
                                        icon: const Icon(
                                          Icons.check_rounded,
                                          size: 16,
                                        ),
                                        label: Text(
                                          context.tr('approvePlayer'),
                                          style: const TextStyle(fontSize: 12),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class RosterAnalyticsCard extends StatelessWidget {
  const RosterAnalyticsCard({super.key, required this.players});
  final List<Map<String, dynamic>> players;

  @override
  Widget build(BuildContext context) {
    final total = players.length;
    final approved = players
        .where(
          (p) =>
              p['guardian_approval'] == true ||
              p['guardian_consent'] == true ||
              p['parent_consent'] == true ||
              p['guardian_approved'] == true,
        )
        .length;
    final pending = total - approved;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      color: AppColors.navy,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _StatColumn(
              label: context.tr('approved'),
              value: '$approved',
              color: AppColors.green,
            ),
            Container(height: 30, width: 1, color: Colors.white24),
            _StatColumn(
              label: context.tr('pending'),
              value: '$pending',
              color: Colors.orangeAccent,
            ),
          ],
        ),
      ),
    );
  }
}

class _StatColumn extends StatelessWidget {
  const _StatColumn({
    required this.label,
    required this.value,
    required this.color,
  });
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Colors.white70),
        ),
      ],
    );
  }
}
