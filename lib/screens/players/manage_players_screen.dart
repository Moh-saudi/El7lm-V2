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

  Future<void> _showCreateInviteModal(BuildContext context) async {
    final titleController = TextEditingController();
    final maxUsageController = TextEditingController();
    bool isUnlimited = true;
    bool isSubmitting = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 10,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.qr_code_2_rounded, color: AppColors.green, size: 28),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        context.tr('issueNewInviteCode'),
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          color: AppColors.navy,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  context.tr('ambassadorNameOrDescription'),
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: titleController,
                  decoration: InputDecoration(
                    hintText: context.tr('enterInviteDescriptionHint'),
                    filled: true,
                    fillColor: Colors.grey[100],
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  context.tr('usageLimit'),
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    ChoiceChip(
                      label: Text(context.tr('unlimitedUsage')),
                      selected: isUnlimited,
                      selectedColor: AppColors.green.withValues(alpha: 0.2),
                      onSelected: (val) {
                        setModalState(() {
                          isUnlimited = true;
                          maxUsageController.clear();
                        });
                      },
                    ),
                    const SizedBox(width: 10),
                    ChoiceChip(
                      label: Text(context.tr('maxUsageCount')),
                      selected: !isUnlimited,
                      selectedColor: AppColors.green.withValues(alpha: 0.2),
                      onSelected: (val) {
                        setModalState(() => isUnlimited = false);
                      },
                    ),
                  ],
                ),
                if (!isUnlimited) ...[
                  const SizedBox(height: 10),
                  TextField(
                    controller: maxUsageController,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: InputDecoration(
                      hintText: context.tr('enterMaxUsesHint'),
                      filled: true,
                      fillColor: Colors.grey[100],
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                ],
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: FilledButton.icon(
                    onPressed: isSubmitting
                        ? null
                        : () async {
                            final title = titleController.text.trim();
                            int? maxUsage;
                            if (!isUnlimited && maxUsageController.text.trim().isNotEmpty) {
                              maxUsage = int.tryParse(maxUsageController.text.trim());
                            }

                            setModalState(() => isSubmitting = true);
                            try {
                              final orgName = widget.organizationName.trim().isEmpty
                                  ? widget.accountType.localizedName(context)
                                  : widget.organizationName.trim();

                              await widget.dataService.createInviteCode(
                                accountType: widget.accountType,
                                organizationName: orgName,
                                description: title.isNotEmpty ? title : 'انضم إلى $orgName',
                                maxUsage: maxUsage,
                              );

                              if (ctx.mounted) Navigator.pop(ctx);
                              _refreshData();

                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(context.tr('inviteCodeCreatedSuccess')),
                                    backgroundColor: AppColors.green,
                                  ),
                                );
                              }
                            } catch (e) {
                              setModalState(() => isSubmitting = false);
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Error: $e')),
                                );
                              }
                            }
                          },
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.navy,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    icon: isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Icon(Icons.check_circle_rounded),
                    label: Text(
                      isSubmitting ? context.tr('issuing') : context.tr('generateInviteCode'),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
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
    final whatsappUri = Uri.parse('https://wa.me/?text=${Uri.encodeComponent(message)}');
    try {
      if (!await launchUrl(whatsappUri, mode: LaunchMode.externalApplication)) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذر فتح تطبيق الواتساب')),
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تعذر فتح الواتساب')),
      );
    }
  }

  Future<void> _deleteCode(String referralId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('حذف كود الدعوة'),
        content: const Text('هل أنت أخيرًا متأكد من رغبتك في حذف كود الدعوة هذا؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx, false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(dialogCtx, true),
            child: const Text('نعم، حذف الكود'),
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
            const SnackBar(content: Text('تم حذف كود الدعوة بنجاح')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('تعذر حذف الكود: $e')),
          );
        }
      }
    }
  }

  void _showReferralDetailModal(Map<String, dynamic> item) {
    final code = '${item['referralCode'] ?? item['code'] ?? ''}';
    final description = '${item['description'] ?? 'انضم إلى المنظمة'}';
    final currentUsage = (item['currentUsage'] as num? ?? 0).toInt();
    final maxUsage = item['maxUsage'] != null ? (item['maxUsage'] as num).toInt() : null;
    final usageText = maxUsage != null ? '$currentUsage / $maxUsage' : '$currentUsage / ∞';
    final link = '${item['inviteLink'] ?? 'https://www.el7lm.com/join/org/$code'}';
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
                  const Icon(Icons.qr_code_2_rounded, size: 28, color: AppColors.green),
                  const SizedBox(width: 8),
                  Text(
                    description,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.navy),
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
                  border: Border.all(color: AppColors.green.withValues(alpha: 0.4), width: 1.5),
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
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () async {
                        final message = _buildFormattedShareMessage(code, link, description);
                        await Clipboard.setData(ClipboardData(text: message));
                        if (!sheetCtx.mounted) return;
                        ScaffoldMessenger.of(sheetCtx).showSnackBar(
                          SnackBar(
                            content: Text(context.tr('copyInviteMessageSuccess')),
                            backgroundColor: AppColors.green,
                          ),
                        );
                      },
                      icon: const Icon(Icons.copy_rounded, size: 18),
                      label: Text(context.tr('copyMessage'), style: const TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        backgroundColor: const Color(0xFF25D366),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => _shareToWhatsApp(code, link, description),
                      icon: const Icon(Icons.share_rounded, size: 18),
                      label: Text(context.tr('shareWhatsApp'), style: const TextStyle(fontWeight: FontWeight.bold)),
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
                label: Text(context.tr('deleteInviteCode'), style: const TextStyle(fontWeight: FontWeight.bold)),
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
                      style: const TextStyle(color: AppColors.muted, fontSize: 11),
                    ),
                  ],
                ),
              ),
              FilledButton.icon(
                onPressed: () => _showCreateInviteModal(context),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.navy,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.add_rounded, size: 18),
                label: Text(context.tr('newCode'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
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
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Center(
                      child: Text(
                        context.tr('noInviteCodesYet'),
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: AppColors.muted, fontSize: 12),
                      ),
                    ),
                  ),
                );
              }

              return Column(
                children: referrals.map((item) {
                  final code = '${item['referralCode'] ?? item['code'] ?? ''}';
                  final description = '${item['description'] ?? ''}';
                  final currentUsage = (item['currentUsage'] as num? ?? 0).toInt();
                  final maxUsage = item['maxUsage'] != null ? (item['maxUsage'] as num).toInt() : null;
                  final usageText = maxUsage != null ? '$currentUsage/$maxUsage' : '$currentUsage/∞';
                  final link = '${item['inviteLink'] ?? 'https://www.el7lm.com/join/org/$code'}';
                  final referralId = '${item['id']}';

                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 1.5,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: () => _showReferralDetailModal(item),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        child: Row(
                          children: [
                            // Mini QR Code Thumbnail
                            Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: AppColors.green.withValues(alpha: 0.4), width: 1),
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
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppColors.navy.withValues(alpha: 0.08),
                                          borderRadius: BorderRadius.circular(6),
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
                                        context.tr('usageLabel', {'usage': usageText}),
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
                            IconButton(
                              tooltip: 'QR',
                              icon: const Icon(Icons.qr_code_scanner_rounded, color: AppColors.green, size: 20),
                              onPressed: () => _showReferralDetailModal(item),
                              visualDensity: VisualDensity.compact,
                            ),
                            IconButton(
                              tooltip: context.tr('deleteInviteCode'),
                              icon: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent, size: 20),
                              onPressed: () => _deleteCode(referralId),
                              visualDensity: VisualDensity.compact,
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
                    final avatarUrl = '${player['profile_image_url'] ?? player['profile_image'] ?? player['image'] ?? player['avatar'] ?? player['photo_url'] ?? ''}'.trim();
                    final joinCode = '${player['join_code'] ?? player['referral_code'] ?? player['code'] ?? player['invite_code'] ?? ''}'.trim();
                    final playerId = '${player['id']}';
                    final approvalStatus = '${player['approval_status'] ?? player['status'] ?? ''}';
                    final isApproved = approvalStatus == 'approved' ||
                        player['guardian_approval'] == true ||
                        player['guardian_consent'] == true ||
                        player['parent_consent'] == true ||
                        player['guardian_approved'] == true;
                    final isPending = !isApproved && approvalStatus != 'rejected';

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
                                        color: isApproved ? AppColors.green : Colors.amber.shade800,
                                      ),
                              ),
                              title: Text('$name', style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (position.toString().isNotEmpty) Text('$position'),
                                  if (joinCode.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: Text(
                                        context.tr('joinCodeLabel', {'code': joinCode}),
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: AppColors.navy,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              trailing: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: (isApproved ? Colors.green : Colors.amber).withValues(alpha: .12),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      isApproved ? Icons.check_circle_rounded : Icons.hourglass_empty_rounded,
                                      size: 14,
                                      color: isApproved ? Colors.green : Colors.amber.shade800,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      context.tr(isApproved ? 'guardianApproved' : 'pendingApproval'),
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: isApproved ? Colors.green : Colors.amber.shade800,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),

                            // Action Row for Pending Players (Approve / Reject)
                            if (isPending)
                              Padding(
                                padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: OutlinedButton.icon(
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: Colors.redAccent,
                                          side: const BorderSide(color: Colors.redAccent),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                          padding: const EdgeInsets.symmetric(vertical: 6),
                                        ),
                                        onPressed: () async {
                                          await widget.dataService.rejectPlayerJoinRequest(
                                            playerId: playerId,
                                            accountType: widget.accountType,
                                          );
                                          if (context.mounted) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(
                                                content: Text(context.tr('playerRejectedSuccess')),
                                                backgroundColor: Colors.redAccent,
                                              ),
                                            );
                                            _refreshData();
                                          }
                                        },
                                        icon: const Icon(Icons.close_rounded, size: 16),
                                        label: Text(context.tr('rejectPlayer'), style: const TextStyle(fontSize: 12)),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: ElevatedButton.icon(
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.green,
                                          foregroundColor: Colors.white,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                          padding: const EdgeInsets.symmetric(vertical: 6),
                                        ),
                                        onPressed: () async {
                                          await widget.dataService.approvePlayerJoinRequest(
                                            playerId: playerId,
                                            accountType: widget.accountType,
                                          );
                                          if (context.mounted) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(
                                                content: Text(context.tr('playerApprovedSuccess')),
                                                backgroundColor: AppColors.green,
                                              ),
                                            );
                                            _refreshData();
                                          }
                                        },
                                        icon: const Icon(Icons.check_rounded, size: 16),
                                        label: Text(context.tr('approvePlayer'), style: const TextStyle(fontSize: 12)),
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
    final approved = players.where((p) =>
      p['guardian_approval'] == true ||
      p['guardian_consent'] == true ||
      p['parent_consent'] == true ||
      p['guardian_approved'] == true
    ).length;
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
            _StatColumn(label: context.tr('totalPlayers'), value: '$total', color: Colors.white),
            Container(height: 30, width: 1, color: Colors.white24),
            _StatColumn(label: context.tr('approved'), value: '$approved', color: AppColors.green),
            Container(height: 30, width: 1, color: Colors.white24),
            _StatColumn(label: context.tr('pending'), value: '$pending', color: Colors.orangeAccent),
          ],
        ),
      ),
    );
  }
}

class _StatColumn extends StatelessWidget {
  const _StatColumn({required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.white70)),
      ],
    );
  }
}
