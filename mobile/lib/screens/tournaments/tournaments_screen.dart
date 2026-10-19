import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

import 'package:cached_network_image/cached_network_image.dart';

import '../../core/app_config.dart';
import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/account_type.dart';
import '../../services/currency_service.dart';
import '../../services/data_service.dart';
import '../../widgets/payment/unified_payment_sheet.dart';

class TournamentsScreen extends StatefulWidget {
  const TournamentsScreen({
    super.key,
    required this.dataService,
    required this.accountType,
    this.isEmbedded = false,
  });

  final DataService dataService;
  final AccountType accountType;
  final bool isEmbedded;

  @override
  State<TournamentsScreen> createState() => _TournamentsScreenState();
}

class _TournamentsScreenState extends State<TournamentsScreen> {
  late Future<List<Map<String, dynamic>>> _future;
  String _selectedFilter = 'all'; // 'all', 'active', 'paid', 'free'
  Map<String, String> _registrationStatuses = {};

  @override
  void initState() {
    super.initState();
    _future = widget.dataService.fetchTournaments();
    _loadRegistrationStatuses();
  }

  Future<void> _loadRegistrationStatuses() async {
    try {
      final statuses = await widget.dataService.fetchUserTournamentRegistrationStatuses();
      if (mounted) {
        setState(() => _registrationStatuses = statuses);
      }
    } catch (_) {}
  }

  Future<void> _refresh() async {
    setState(() {
      _future = widget.dataService.fetchTournaments();
    });
    await Future.wait([_future, _loadRegistrationStatuses()]);
  }

  Future<void> _onRegisterTap(Map<String, dynamic> tournament) async {
    final breakdown = PriceBreakdown.fromMap(tournament);
    final isPaid = breakdown.finalPrice > 0 || tournament['isPaid'] == true;
    final name = '${tournament['name'] ?? tournament['title'] ?? context.tr('tournament')}';
    debugPrint('🔘 [_onRegisterTap] name: $name, isPaid: $isPaid, fee: ${breakdown.finalPrice}, currency: ${breakdown.currency}');

    if (!isPaid) {
      // بطولة مجانية → الانتقال مباشرة لنموذج التسجيل
      await _showFreeRegistrationSheet(tournament);
      return;
    }

    final tid = '${tournament['id'] ?? ''}';
    final rawLogo = '${tournament['logo'] ?? tournament['logo_url'] ?? tournament['logoUrl'] ?? tournament['image'] ?? tournament['image_url'] ?? tournament['imageUrl'] ?? tournament['cover_image'] ?? tournament['coverImage'] ?? tournament['cover_url'] ?? tournament['banner'] ?? ''}'.trim();
    String? logoUrl;
    if (rawLogo.isNotEmpty && rawLogo != 'null' && (rawLogo.startsWith('http://') || rawLogo.startsWith('https://'))) {
      logoUrl = rawLogo;
    }

    final result = await UnifiedPaymentSheet.show(
      context: context,
      dataService: widget.dataService,
      title: name,
      subtitle: '${tournament['city'] ?? tournament['location'] ?? ''}'.trim(),
      logoUrl: logoUrl,
      priceBreakdown: breakdown,
      itemType: 'tournament_registration',
      itemId: tid,
      extraMetadata: {
        'tournamentId': tid,
        'tournamentName': name,
      },
    );

    if (result == null || !mounted) return;

    if (result.isSuccess) {
      if (tid.isNotEmpty) {
        try {
          await widget.dataService.recordTournamentPaymentSuccess(
            tournamentId: tid,
            tournamentName: name,
            amount: result.chargedAmount,
            currency: result.chargedCurrency,
            orderId: result.orderId,
          );
          if (mounted) {
            setState(() {
              _registrationStatuses[tid] = 'paid';
            });
          }
        } catch (e) {
          debugPrint('⚠️ [TournamentsScreen] recordTournamentPaymentSuccess error: $e');
        }
      }
      if (!mounted) return;
      _showSuccessDialog(
        title: context.trOr('paymentSuccessTitle', 'تمت عملية الدفع بنجاح 🎉'),
        message: context.trOr(
          'tournamentRegistrationSuccess',
          'تم تسجيلك في البطولة وتأكيد سداد الرسوم بنجاح.',
        ),
      );
    } else if (result.isPending) {
      if (tid.isNotEmpty) {
        try {
          await widget.dataService.recordInstantTournamentRegistration(
            tournamentId: tid,
            tournamentName: name,
            amount: result.chargedAmount,
            currency: result.chargedCurrency,
            method: result.method == UnifiedPaymentMethod.instapay ? 'instapay' : 'fawran',
          );
          if (mounted) {
            setState(() {
              _registrationStatuses[tid] = 'pending';
            });
          }
        } catch (e) {
          debugPrint('⚠️ [TournamentsScreen] recordInstantTournamentRegistration note: $e');
        }
      }
    }
  }

  Future<void> _showFreeRegistrationSheet(Map<String, dynamic> tournament) async {
    final name = '${tournament['name'] ?? tournament['title'] ?? context.tr('tournament')}';
    var submitting = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetCtx) => StatefulBuilder(
        builder: (ctx, setSheet) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.gold.withValues(alpha: .15),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(CupertinoIcons.rosette, color: AppColors.gold),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          ctx.tr('registerForTournament'),
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 16,
                            color: AppColors.navy,
                          ),
                        ),
                        Text(
                          name,
                          style: const TextStyle(color: AppColors.muted, fontSize: 12),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.green.withValues(alpha: .07),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.green.withValues(alpha: .2)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline_rounded, color: AppColors.green, size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        ctx.tr('tournamentRegistrationInfo'),
                        style: const TextStyle(fontSize: 12, color: AppColors.ink, height: 1.5),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  backgroundColor: AppColors.green,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: submitting
                    ? null
                    : () async {
                        setSheet(() => submitting = true);
                        try {
                          await widget.dataService.registerForTournament(
                            '${tournament['id'] ?? ''}',
                          );
                          if (!sheetCtx.mounted) return;
                          Navigator.pop(sheetCtx);
                          if (!mounted) return;
                          _showSuccessDialog(
                            title: ctx.tr('registrationSent'),
                            message: ctx.tr('tournamentRegistrationSuccess'),
                          );
                        } catch (e) {
                          if (!sheetCtx.mounted) return;
                          setSheet(() => submitting = false);
                          ScaffoldMessenger.of(ctx).showSnackBar(
                            SnackBar(content: Text(ctx.errorText(e))),
                          );
                        }
                      },
                icon: submitting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.send_rounded),
                label: Text(
                  ctx.tr('confirmRegistration'),
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showSuccessDialog({required String title, required String message}) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: const CircleAvatar(
          radius: 28,
          backgroundColor: Color(0xFFDCFCE7),
          foregroundColor: AppColors.green,
          child: Icon(Icons.check_rounded, size: 30),
        ),
        title: Text(title, textAlign: TextAlign.center),
        content: Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.muted)),
        actionsAlignment: MainAxisAlignment.center,
        actions: [
          FilledButton(
            onPressed: () => Navigator.pop(ctx),
            style: FilledButton.styleFrom(backgroundColor: AppColors.green),
            child: Text(ctx.tr('great')),
          ),
        ],
      ),
    );
  }

  List<Map<String, dynamic>> _applyFilter(List<Map<String, dynamic>> list) {
    if (_selectedFilter == 'active') {
      return list.where((t) {
        return t['isActive'] == true ||
            t['status'] == 'active' ||
            t['status'] == 'ongoing' ||
            t['status'] == 'open';
      }).toList();
    }
    if (_selectedFilter == 'paid') {
      return list.where((t) {
        final b = PriceBreakdown.fromMap(t);
        return b.finalPrice > 0 || t['isPaid'] == true;
      }).toList();
    }
    if (_selectedFilter == 'free') {
      return list.where((t) {
        final b = PriceBreakdown.fromMap(t);
        return b.finalPrice <= 0 && t['isPaid'] != true;
      }).toList();
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final content = FutureBuilder<List<Map<String, dynamic>>>(
      future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: AppColors.gold));
          }

          final rawTournaments = snapshot.data ?? [];
          final tournaments = _applyFilter(rawTournaments);

          // Counts for filter chips
          final allCount = rawTournaments.length;
          final activeCount = rawTournaments
              .where((t) =>
                  t['isActive'] == true ||
                  t['status'] == 'active' ||
                  t['status'] == 'ongoing' ||
                  t['status'] == 'open')
              .length;
          final paidCount = rawTournaments.where((t) {
            final b = PriceBreakdown.fromMap(t);
            return b.finalPrice > 0 || t['isPaid'] == true;
          }).length;
          final freeCount = rawTournaments.where((t) {
            final b = PriceBreakdown.fromMap(t);
            return b.finalPrice <= 0 && t['isPaid'] != true;
          }).length;

          return RefreshIndicator(
            onRefresh: _refresh,
            color: AppColors.gold,
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                // ─── Header ────────────────────────────────────────────────
                SliverToBoxAdapter(
                  child: Container(
                    margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0A1239), Color(0xFF1A3A5C), Color(0xFF0D6B4E)],
                        begin: Alignment.topRight,
                        end: Alignment.bottomLeft,
                      ),
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(CupertinoIcons.rosette, color: AppColors.gold, size: 28),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                context.tr('tournamentsPortalTitle'),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          context.tr('tournamentsPortalSubtitle'),
                          style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.5),
                        ),
                      ],
                    ),
                  ),
                ),

                // ─── Filter chips row ──────────────────────────────────────
                SliverToBoxAdapter(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
                    child: Row(
                      children: [
                        _FilterChip(
                          label: '${context.tr('filterAll')} ($allCount)',
                          selected: _selectedFilter == 'all',
                          onTap: () => setState(() => _selectedFilter = 'all'),
                        ),
                        const SizedBox(width: 8),
                        _FilterChip(
                          label: '${context.tr('filterActive')} ($activeCount)',
                          selected: _selectedFilter == 'active',
                          onTap: () => setState(() => _selectedFilter = 'active'),
                        ),
                        const SizedBox(width: 8),
                        _FilterChip(
                          label: '${context.tr('filterPaid')} ($paidCount)',
                          selected: _selectedFilter == 'paid',
                          onTap: () => setState(() => _selectedFilter = 'paid'),
                        ),
                        const SizedBox(width: 8),
                        _FilterChip(
                          label: '${context.tr('filterFree')} ($freeCount)',
                          selected: _selectedFilter == 'free',
                          onTap: () => setState(() => _selectedFilter = 'free'),
                        ),
                      ],
                    ),
                  ),
                ),

                // ─── Tournaments list ───────────────────────────────────────
                if (tournaments.isEmpty)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(CupertinoIcons.rosette, size: 72, color: Colors.grey.shade300),
                          const SizedBox(height: 14),
                          Text(
                            context.tr('noTournamentsAvailable'),
                            style: const TextStyle(color: AppColors.muted, fontSize: 16),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            context.tr('checkBackLater'),
                            style: const TextStyle(color: AppColors.muted, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final t = tournaments[index];
                          final tid = '${t['id'] ?? ''}';
                          return _TournamentCard(
                            tournament: t,
                            registrationStatus: _registrationStatuses[tid],
                            onRegister: () => _onRegisterTap(t),
                          );
                        },
                        childCount: tournaments.length,
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      );

    if (widget.isEmbedded) {
      return content;
    }

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: content,
    );
  }
}

// ─── Filter Chip Widget ──────────────────────────────────────────────────────

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.green : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? AppColors.green : Colors.grey.shade300,
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: AppColors.green.withValues(alpha: .25),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  )
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: selected ? FontWeight.bold : FontWeight.w600,
            color: selected ? Colors.white : AppColors.ink,
          ),
        ),
      ),
    );
  }
}

// ─── Tournament Card ──────────────────────────────────────────────────────────

class _TournamentCard extends StatelessWidget {
  const _TournamentCard({
    required this.tournament,
    required this.onRegister,
    this.registrationStatus,
  });

  final Map<String, dynamic> tournament;
  final VoidCallback onRegister;
  final String? registrationStatus;

  PriceBreakdown get _breakdown => PriceBreakdown.fromMap(tournament);
  bool get _isPaid => _breakdown.finalPrice > 0 || tournament['isPaid'] == true;

  bool get _isOpen {
    if (tournament['isActive'] == false) return false;
    final status = '${tournament['status'] ?? 'upcoming'}';
    return status != 'closed' && status != 'completed';
  }

  @override
  Widget build(BuildContext context) {
    final name = '${tournament['name'] ?? tournament['title'] ?? context.tr('tournament')}';
    final description = '${tournament['description'] ?? ''}';
    final startDate = '${tournament['startDate'] ?? tournament['start_date'] ?? ''}';
    final location = '${tournament['location'] ?? tournament['city'] ?? ''}';
    final isOpen = _isOpen;
    final isActive = tournament['isActive'] == true;
    final ageGroup = '${tournament['ageGroup'] ?? tournament['age_group'] ?? ''}';
    final b = _breakdown;

    final rawLogo = '${tournament['logo'] ?? tournament['logo_url'] ?? tournament['logoUrl'] ?? tournament['image'] ?? tournament['image_url'] ?? tournament['imageUrl'] ?? tournament['cover_image'] ?? tournament['coverImage'] ?? tournament['cover_url'] ?? tournament['banner'] ?? ''}'.trim();
    String? logoUrl;
    if (rawLogo.isNotEmpty && rawLogo != 'null') {
      if (rawLogo.startsWith('http://') || rawLogo.startsWith('https://')) {
        logoUrl = rawLogo;
      } else if (rawLogo.startsWith('/')) {
        logoUrl = '${AppConfig.apiBaseUrl}$rawLogo';
      } else {
        logoUrl = '${AppConfig.apiBaseUrl}/$rawLogo';
      }
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: _isPaid
              ? AppColors.gold.withValues(alpha: .35)
              : AppColors.green.withValues(alpha: .25),
        ),
      ),
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: _isPaid
                          ? AppColors.gold.withValues(alpha: .12)
                          : AppColors.green.withValues(alpha: .12),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: _isPaid
                            ? AppColors.gold.withValues(alpha: .3)
                            : AppColors.green.withValues(alpha: .3),
                      ),
                    ),
                    child: (logoUrl != null && logoUrl.isNotEmpty)
                        ? CachedNetworkImage(
                            imageUrl: logoUrl,
                            fit: BoxFit.cover,
                            placeholder: (_, _) => Center(
                              child: SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: _isPaid ? AppColors.gold : AppColors.green,
                                ),
                              ),
                            ),
                            errorWidget: (_, _, _) => Icon(
                              CupertinoIcons.rosette,
                              color: _isPaid ? AppColors.gold : AppColors.green,
                              size: 24,
                            ),
                          )
                        : Icon(
                            CupertinoIcons.rosette,
                            color: _isPaid ? AppColors.gold : AppColors.green,
                            size: 24,
                          ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 15,
                          color: AppColors.navy,
                        ),
                      ),
                      if (description.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(
                          description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.muted,
                            fontSize: 12,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    // Fee badge with discounts & approximate EGP
                    if (_isPaid)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          if (b.hasDiscount) ...[
                            Text(
                              '${b.originalPrice.toStringAsFixed(0)} ${b.currency}',
                              style: const TextStyle(
                                decoration: TextDecoration.lineThrough,
                                color: AppColors.muted,
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 2),
                          ],
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: AppColors.gold.withValues(alpha: .12),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: AppColors.gold.withValues(alpha: .4)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (b.hasDiscount) ...[
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                    margin: const EdgeInsets.only(left: 4),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF16A34A),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      '-${b.discountPercent.toStringAsFixed(0)}%',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                                Text(
                                  '${b.finalPrice.toStringAsFixed(b.finalPrice.truncateToDouble() == b.finalPrice ? 0 : 2)} ${b.currency}',
                                  style: const TextStyle(
                                    color: AppColors.gold,
                                    fontWeight: FontWeight.w900,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (b.currency != 'EGP') ...[
                            const SizedBox(height: 3),
                            Text(
                              '≈ ${CurrencyService.instance.getEstimatedEgp(b.finalPrice, b.currency).toStringAsFixed(0)} ج.م',
                              style: const TextStyle(
                                color: AppColors.muted,
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ],
                      )
                    else
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: AppColors.green.withValues(alpha: .1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          context.tr('free'),
                          style: const TextStyle(
                            color: AppColors.green,
                            fontWeight: FontWeight.w900,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    if (isActive) ...[
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: Color(0xFF16A34A),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              context.tr('filterActive'),
                              style: const TextStyle(
                                color: Color(0xFF16A34A),
                                fontWeight: FontWeight.bold,
                                fontSize: 10,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),

            // Meta chips
            if (startDate.isNotEmpty || location.isNotEmpty || ageGroup.isNotEmpty) ...[
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  if (startDate.isNotEmpty)
                    _MetaChip(icon: Icons.calendar_today_rounded, label: _formatDate(startDate)),
                  if (location.isNotEmpty)
                    _MetaChip(icon: Icons.location_on_rounded, label: location),
                  if (ageGroup.isNotEmpty)
                    _MetaChip(icon: Icons.groups_rounded, label: ageGroup),
                ],
              ),
            ],

            const SizedBox(height: 16),

            // CTA button or Registration Status
            if (registrationStatus == 'pending') ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 13),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFF59E0B)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.hourglass_top_rounded, color: Color(0xFFB45309), size: 18),
                    const SizedBox(width: 8),
                    Text(
                      context.trOr('registrationPendingReview', 'الاشتراك قيد المراجعة (معلق) ⏳'),
                      style: const TextStyle(
                        color: Color(0xFFB45309),
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ] else if (registrationStatus == 'paid' || registrationStatus == 'approved') ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 13),
                decoration: BoxDecoration(
                  color: const Color(0xFFDCFCE7),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF16A34A)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.check_circle_rounded, color: Color(0xFF16A34A), size: 18),
                    const SizedBox(width: 8),
                    Text(
                      context.trOr('registrationConfirmed', 'تم تأكيد الاشتراك ✓'),
                      style: const TextStyle(
                        color: Color(0xFF16A34A),
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ] else ...[
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: isOpen ? onRegister : null,
                  style: FilledButton.styleFrom(
                    backgroundColor: _isPaid ? AppColors.gold : AppColors.green,
                    foregroundColor: _isPaid ? AppColors.ink : Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  icon: Icon(
                    _isPaid ? Icons.payment_rounded : Icons.app_registration_rounded,
                    size: 18,
                  ),
                  label: Text(
                    isOpen
                        ? (_isPaid ? context.tr('payAndRegister') : context.tr('registerNow'))
                        : context.tr('registrationClosed'),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatDate(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return iso;
    }
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.icon, required this.label});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AppColors.muted),
          const SizedBox(width: 4),
          Text(label, style: const TextStyle(fontSize: 11, color: AppColors.muted)),
        ],
      ),
    );
  }
}
