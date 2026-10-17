import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

import 'package:flutter/services.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/app_config.dart';
import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/account_type.dart';
import '../../services/currency_service.dart';
import '../../services/data_service.dart';
import '../payment/geidea_payment_screen.dart';

enum PaymentMethodType { card, instapay, fawran }

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

    // بطولة مدفوعة → احتساب سعر الصرف المعتمد وعرض ملخص الدفع
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(
        child: CircularProgressIndicator(color: AppColors.gold),
      ),
    );

    CurrencyConversion conversion;
    try {
      conversion = await CurrencyService.instance.convertToEgp(
        breakdown.finalPrice,
        breakdown.currency,
      );
    } catch (e) {
      debugPrint('⚠️ [_onRegisterTap] convertToEgp failed: $e, using estimated rate');
      final estRate = CurrencyService.instance.getEstimatedRate(breakdown.currency);
      conversion = CurrencyConversion(
        originalAmount: breakdown.finalPrice,
        originalCurrency: breakdown.currency,
        convertedAmountEgp: CurrencyService.instance.getEstimatedEgp(breakdown.finalPrice, breakdown.currency),
        exchangeRate: estRate,
        isConverted: breakdown.currency != 'EGP',
      );
    }

    if (!mounted) return;
    Navigator.of(context).pop(); // dismiss loading

    // عرض شيت التأكيد المالي وطريقة الدفع (بطاقة / انستاباي / فوراً)
    final methodChoice = await _showPaymentConfirmationSheet(
      tournament: tournament,
      breakdown: breakdown,
      conversion: conversion,
    );

    if (methodChoice == null || !mounted) return;

    if (methodChoice == PaymentMethodType.card) {
      await _startPaymentFlow(
        breakdown: breakdown,
        conversion: conversion,
        tournament: tournament,
      );
    } else {
      await _handleInstantTransferRegistration(
        tournament: tournament,
        breakdown: breakdown,
        conversion: conversion,
        method: methodChoice,
      );
    }
  }

  /// عرض شيت التأكيد المالي للبطولة مع اختيار طريقة الدفع (بطاقة فيزا/ماستر، انستاباي، فوراً)
  Future<PaymentMethodType?> _showPaymentConfirmationSheet({
    required Map<String, dynamic> tournament,
    required PriceBreakdown breakdown,
    required CurrencyConversion conversion,
  }) {
    final name = '${tournament['name'] ?? tournament['title'] ?? context.tr('tournament')}';
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

    var selectedMethod = PaymentMethodType.card;
    var showExchangeRate = false;

    return showModalBottomSheet<PaymentMethodType>(
      context: context,
      isScrollControlled: true,
      enableDrag: false,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetCtx) => StatefulBuilder(
        builder: (ctx, setSheetState) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
            child: SingleChildScrollView(
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
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: AppColors.gold.withValues(alpha: .15),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: AppColors.gold.withValues(alpha: .3),
                            ),
                          ),
                          child: (logoUrl != null && logoUrl.isNotEmpty)
                              ? CachedNetworkImage(
                                  imageUrl: logoUrl,
                                  fit: BoxFit.cover,
                                  placeholder: (_, _) => const Center(
                                    child: SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.gold),
                                    ),
                                  ),
                                  errorWidget: (_, _, _) => const Icon(CupertinoIcons.rosette, color: AppColors.gold),
                                )
                              : const Icon(CupertinoIcons.rosette, color: AppColors.gold),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              ctx.trOr('paymentSummary', 'ملخص عملية الدفع'),
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
                  const SizedBox(height: 16),

                  // كارت تفاصيل الرسوم والخصم والتحويل
                  // ─── كارت ملخص الدفع المالي ──────────────────────────────
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: AppColors.canvas,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      children: [
                        if (breakdown.hasDiscount) ...[
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                ctx.trOr('originalFee', 'الرسوم الأساسية'),
                                style: const TextStyle(color: AppColors.muted, fontSize: 11),
                              ),
                              Text(
                                '${breakdown.originalPrice.toStringAsFixed(breakdown.originalPrice.truncateToDouble() == breakdown.originalPrice ? 0 : 2)} ${breakdown.currency}',
                                style: const TextStyle(
                                  decoration: TextDecoration.lineThrough,
                                  color: AppColors.muted,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                ctx.trOr('discount', 'الخصم'),
                                style: const TextStyle(
                                  color: Color(0xFF16A34A),
                                  fontWeight: FontWeight.w600,
                                  fontSize: 11,
                                ),
                              ),
                              Text(
                                '-${breakdown.discountPercent.toStringAsFixed(0)}% (-${breakdown.discountAmount.toStringAsFixed(breakdown.discountAmount.truncateToDouble() == breakdown.discountAmount ? 0 : 2)} ${breakdown.currency})',
                                style: const TextStyle(
                                  color: Color(0xFF16A34A),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                          const Divider(height: 12),
                        ],

                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              ctx.trOr('finalFee', 'المبلغ المطلوب'),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: AppColors.navy,
                                fontSize: 13,
                              ),
                            ),
                            Text(
                              '${breakdown.finalPrice.toStringAsFixed(breakdown.finalPrice.truncateToDouble() == breakdown.finalPrice ? 0 : 2)} ${breakdown.currency}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w900,
                                color: AppColors.navy,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),

                        if (conversion.isConverted) ...[
                          const SizedBox(height: 6),
                          InkWell(
                            onTap: () => setSheetState(() => showExchangeRate = !showExchangeRate),
                            borderRadius: BorderRadius.circular(6),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 2),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    showExchangeRate
                                        ? Icons.keyboard_arrow_up_rounded
                                        : Icons.keyboard_arrow_down_rounded,
                                    size: 16,
                                    color: AppColors.muted,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    showExchangeRate
                                        ? ctx.trOr('hideExchangeRate', 'إخفاء سعر الصرف')
                                        : ctx.trOr('showExchangeRate', 'عرض المعادل بالجنيه المصري'),
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: AppColors.muted,
                                      fontWeight: FontWeight.w600,
                                      decoration: TextDecoration.underline,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          if (showExchangeRate) ...[
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppColors.gold.withValues(alpha: .1),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppColors.gold.withValues(alpha: .3)),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    '1 ${breakdown.currency} = ${conversion.exchangeRate.toStringAsFixed(2)} EGP',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.navy,
                                      fontSize: 11,
                                    ),
                                  ),
                                  Text(
                                    conversion.formattedEgp,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                      color: AppColors.gold,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: 10),

                  // ─── أيقونات طرق الدفع متجاورة ─────────────────────────────
                  Row(
                    children: [
                      // 1. بطاقة بنكية
                      Expanded(
                        child: _buildCompactMethodCard(
                          title: ctx.trOr('cardPayment', 'بطاقة بنكية'),
                          icon: _buildCardBrandLogos(),
                          isSelected: selectedMethod == PaymentMethodType.card,
                          onTap: () => setSheetState(() => selectedMethod = PaymentMethodType.card),
                        ),
                      ),
                      const SizedBox(width: 8),

                      // 2. انستاباي
                      Expanded(
                        child: _buildCompactMethodCard(
                          title: ctx.trOr('instapayTitle', 'انستاباي'),
                          flag: '🇪🇬',
                          icon: Image.asset(
                            'assets/images/instapay.png',
                            height: 18,
                            fit: BoxFit.contain,
                          ),
                          isSelected: selectedMethod == PaymentMethodType.instapay,
                          onTap: () => setSheetState(() => selectedMethod = PaymentMethodType.instapay),
                        ),
                      ),
                      const SizedBox(width: 8),

                      // 3. فوراً
                      Expanded(
                        child: _buildCompactMethodCard(
                          title: ctx.trOr('fawranTitle', 'فوراً'),
                          flag: '🇶🇦',
                          icon: ClipRRect(
                            borderRadius: BorderRadius.circular(3),
                            child: Image.asset(
                              'assets/images/fawran.jpg',
                              height: 15,
                              fit: BoxFit.contain,
                            ),
                          ),
                          isSelected: selectedMethod == PaymentMethodType.fawran,
                          onTap: () => setSheetState(() => selectedMethod = PaymentMethodType.fawran),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 10),

                  // ─── جزء الرقم / الإشعار (مبسط وصغير جداً) ──────────────────
                  if (selectedMethod == PaymentMethodType.card) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                      decoration: BoxDecoration(
                        color: AppColors.gold.withValues(alpha: .08),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.gold.withValues(alpha: .2)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.lock_outline_rounded, color: AppColors.gold, size: 14),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              ctx.trOr(
                                'cardInstantNotice',
                                'يتم إنشاء رابط دفع لحظي مشفر عبر بوابة Geidea.',
                              ),
                              style: const TextStyle(fontSize: 11, color: AppColors.navy),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed: () => Navigator.pop(sheetCtx, PaymentMethodType.card),
                      icon: const Icon(Icons.lock_rounded, size: 16),
                      label: Text(
                        ctx.trOr('confirmAndPay', 'تأكيد والانتقال للدفع'),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.gold,
                        foregroundColor: AppColors.ink,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ] else if (selectedMethod == PaymentMethodType.instapay) ...[
                    _buildCompactNumberBar(
                      ctx: ctx,
                      color: const Color(0xFF5E2750),
                      label: ctx.trOr('transferNumber', 'رقم انستاباي:'),
                      number: '01017799580',
                      equivalentText: conversion.isConverted ? '≈ ${conversion.formattedEgp}' : null,
                    ),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed: () => Navigator.pop(sheetCtx, PaymentMethodType.instapay),
                      icon: const Icon(Icons.send_rounded, size: 16),
                      label: Text(
                        ctx.trOr('confirmTransferAndSend', 'تأكيد التحويل وإرسال الإيصال'),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF5E2750),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ] else if (selectedMethod == PaymentMethodType.fawran) ...[
                    _buildCompactNumberBar(
                      ctx: ctx,
                      color: const Color(0xFF8A1538),
                      label: ctx.trOr('transferNumber', 'رقم فوراً:'),
                      number: '+974 7054 2458',
                      rawNumber: '+97470542458',
                    ),
                    const SizedBox(height: 12),
                    FilledButton.icon(
                      onPressed: () => Navigator.pop(sheetCtx, PaymentMethodType.fawran),
                      icon: const Icon(Icons.send_rounded, size: 16),
                      label: Text(
                        ctx.trOr('confirmTransferAndSend', 'تأكيد التحويل وإرسال الإيصال'),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF8A1538),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],

                  const SizedBox(height: 6),
                  TextButton(
                    onPressed: () => Navigator.pop(sheetCtx, null),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(
                      ctx.tr('cancel'),
                      style: const TextStyle(color: AppColors.muted, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// كارت اختيار طريقة الدفع المدمج (عرض أفقي متجاور)
  static Widget _buildCompactMethodCard({
    required String title,
    required Widget icon,
    String? flag,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.gold.withValues(alpha: .12) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.gold : Colors.grey.shade200,
            width: isSelected ? 1.8 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppColors.gold.withValues(alpha: .18),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: 20,
              child: Center(child: icon),
            ),
            const SizedBox(height: 5),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (flag != null) ...[
                  Text(flag, style: const TextStyle(fontSize: 10)),
                  const SizedBox(width: 3),
                ],
                Flexible(
                  child: Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
                      color: isSelected ? AppColors.navy : AppColors.ink,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// شريط رقم التحويل اللحظي فائق الصغر
  static Widget _buildCompactNumberBar({
    required BuildContext ctx,
    required Color color,
    required String label,
    required String number,
    String? rawNumber,
    String? equivalentText,
  }) {
    final toCopy = rawNumber ?? number.replaceAll(' ', '');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .06),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: .2)),
      ),
      child: Row(
        children: [
          Icon(Icons.phone_iphone_rounded, size: 14, color: color),
          const SizedBox(width: 5),
          Text(
            label,
            style: const TextStyle(fontSize: 11, color: AppColors.muted),
          ),
          const SizedBox(width: 6),
          Directionality(
            textDirection: TextDirection.ltr,
            child: Text(
              '\u202A$number\u202C',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w900,
                color: color,
                letterSpacing: 0.5,
              ),
            ),
          ),
          if (equivalentText != null) ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: color.withValues(alpha: .12),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                equivalentText,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ),
          ],
          const Spacer(),
          InkWell(
            onTap: () {
              Clipboard.setData(ClipboardData(text: toCopy));
              ScaffoldMessenger.of(ctx).showSnackBar(
                SnackBar(
                  content: Text(ctx.trOr('numberCopied', 'تم نسخ الرقم بنجاح ($toCopy)')),
                  duration: const Duration(seconds: 2),
                ),
              );
            },
            borderRadius: BorderRadius.circular(6),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
              decoration: BoxDecoration(
                color: color.withValues(alpha: .12),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.copy_rounded, size: 11, color: color),
                  const SizedBox(width: 3),
                  Text(
                    ctx.trOr('copy', 'نسخ'),
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// شعارات فيزا وماستركارد
  static Widget _buildCardBrandLogos() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1.5),
          decoration: BoxDecoration(
            color: const Color(0xFF1434CB),
            borderRadius: BorderRadius.circular(3),
          ),
          child: const Text(
            'VISA',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 8,
              letterSpacing: 0.3,
            ),
          ),
        ),
        const SizedBox(width: 3),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 1.5),
          decoration: BoxDecoration(
            color: const Color(0xFF222222),
            borderRadius: BorderRadius.circular(3),
          ),
          child: SizedBox(
            width: 16,
            height: 10,
            child: Stack(
              alignment: Alignment.center,
              children: [
                Positioned(
                  left: 0,
                  child: Container(
                    width: 9,
                    height: 9,
                    decoration: const BoxDecoration(
                      color: Color(0xFFEB001B),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                Positioned(
                  right: 0,
                  child: Container(
                    width: 9,
                    height: 9,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF79E1B).withValues(alpha: .9),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// معالجة التسجيل بالتحويل اللحظي (انستاباي / فوراً)
  Future<void> _handleInstantTransferRegistration({
    required Map<String, dynamic> tournament,
    required PriceBreakdown breakdown,
    required CurrencyConversion conversion,
    required PaymentMethodType method,
  }) async {
    final tid = '${tournament['id'] ?? ''}';
    final name = '${tournament['name'] ?? tournament['title'] ?? context.tr('tournament')}';
    final isInstapay = method == PaymentMethodType.instapay;
    final methodName = isInstapay ? 'انستاباي (InstaPay)' : 'فوراً (Fawran)';
    final transferNumber = isInstapay ? '01017799580' : '+97470542458';
    final amountText = isInstapay ? conversion.formattedEgp : '${breakdown.finalPrice} ${breakdown.currency}';

    // نسخ رقم التحويل فورياً للحافظة
    await Clipboard.setData(ClipboardData(text: transferNumber));

    // تسجيل طلب البطولة كـ pending لحين تأكيد المنظمين
    if (tid.isNotEmpty) {
      try {
        final chargedAmount = isInstapay ? conversion.convertedAmountEgp : breakdown.finalPrice;
        final chargedCurrency = isInstapay ? 'EGP' : breakdown.currency;
        await widget.dataService.recordInstantTournamentRegistration(
          tournamentId: tid,
          tournamentName: name,
          amount: chargedAmount,
          currency: chargedCurrency,
          method: isInstapay ? 'instapay' : 'fawran',
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

    // فتح واتساب لإرسال الإيصال
    final message = 'السلام عليكم، قمت بالتحويل عبر $methodName لتأكيد التسجيل في بطولة "$name". المبلغ: $amountText. مرفق إيصال التحويل.';
    final whatsappUri = Uri.parse('https://wa.me/97470542458?text=${Uri.encodeComponent(message)}');
    try {
      if (await canLaunchUrl(whatsappUri)) {
        await launchUrl(whatsappUri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      debugPrint('⚠️ [TournamentsScreen] WhatsApp launch note: $e');
    }

    if (!mounted) return;
    _showSuccessDialog(
      title: context.trOr('pendingReviewTitle', 'طلب الاشتراك قيد المراجعة ⏳'),
      message: context.trOr(
        'pendingReviewMessage',
        'تم تسجيل طلبك وحالة الاشتراك الآن (معلق / Pending). يرجى إرسال صورة إيصال التحويل للمنظمين لتأكيد الحجز وتفعيل الاشتراك فوراً.',
      ),
    );
  }

  Future<void> _startPaymentFlow({
    required PriceBreakdown breakdown,
    required CurrencyConversion conversion,
    required Map<String, dynamic> tournament,
  }) async {
    final name = '${tournament['name'] ?? tournament['title'] ?? context.tr('tournament')}';
    debugPrint('🚀 [_startPaymentFlow] Starting Geidea payment: ${conversion.formattedSummary} for $name');
    final email = widget.dataService.authService.authUserId != null
        ? '${widget.dataService.authService.authUserId}@el7lm.app'
        : 'player@el7lm.com';
    final customerName = widget.dataService.authService.currentDisplayName.isNotEmpty
        ? widget.dataService.authService.currentDisplayName
        : 'لاعب';

    // Show loading dialog while creating session
    if (!mounted) return;
    Map<String, dynamic> session;
    var sessionLoadingShowing = true;
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator(color: AppColors.gold)),
    ).then((_) => sessionLoadingShowing = false);

    try {
      session = await widget.dataService.createGeideaSession(
        amount: breakdown.finalPrice,
        currency: breakdown.currency,
        customerEmail: email,
        customerName: customerName,
        metadata: {
          'type': 'tournament_registration',
          'tournamentId': '${tournament['id'] ?? ''}',
          'tournamentName': name,
          'originalPrice': breakdown.originalPrice,
          'discountAmount': breakdown.discountAmount,
          'discountPercent': breakdown.discountPercent,
          'finalPrice': breakdown.finalPrice,
          'originalCurrency': breakdown.currency,
          'chargedAmountEgp': conversion.convertedAmountEgp,
          'exchangeRate': conversion.exchangeRate,
        },
      );
    } catch (e) {
      if (sessionLoadingShowing && mounted) {
        sessionLoadingShowing = false;
        Navigator.of(context).pop();
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.errorText(e))),
        );
      }
      return;
    }

    if (sessionLoadingShowing && mounted) {
      sessionLoadingShowing = false;
      Navigator.of(context).pop(); // dismiss loading
    }

    final redirectUrl = session['redirectUrl'] as String?;
    if (redirectUrl == null || redirectUrl.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('paymentSessionFailed'))),
        );
      }
      return;
    }

    final chargedAmount = (session['convertedAmountEgp'] as num?)?.toDouble() ?? conversion.convertedAmountEgp;
    debugPrint('🎯 [TournamentsScreen] Pushing GeideaPaymentScreen with url: $redirectUrl, amount: $chargedAmount EGP');

    if (!mounted) return;
    final result = await Navigator.of(context).push<GeideaPaymentResult>(
      MaterialPageRoute(
        builder: (_) => GeideaPaymentScreen(
          paymentUrl: redirectUrl,
          sessionId: session['sessionId']?.toString() ?? session['id']?.toString(),
          amount: chargedAmount,
          currency: 'EGP',
          title: name,
          originalAmount: breakdown.finalPrice,
          originalCurrency: breakdown.currency,
          exchangeRate: conversion.exchangeRate,
        ),
      ),
    );
    debugPrint('🎯 [TournamentsScreen] Returned from GeideaPaymentScreen: success=${result?.success}, msg=${result?.message}');

    if (!mounted) return;

    final isRealSuccess = result?.success == true &&
        result?.orderId != null &&
        result!.orderId!.isNotEmpty &&
        result.orderId != 'null';

    if (isRealSuccess) {
      final tid = '${tournament['id'] ?? ''}';
      if (tid.isNotEmpty) {
        try {
          await widget.dataService.recordTournamentPaymentSuccess(
            tournamentId: tid,
            tournamentName: name,
            amount: chargedAmount,
            currency: 'EGP',
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
        title: context.trOr('paymentSuccessTitle', 'تمت عملية الدفع بنجاح'),
        message: context.trOr(
          'tournamentRegistrationSuccess',
          'تم تسجيلك في البطولة وتأكيد سداد الرسوم بنجاح.',
        ),
      );
    } else if (result != null && !result.success) {
      final tid = '${tournament['id'] ?? ''}';
      if (tid.isNotEmpty) {
        widget.dataService.recordTournamentPaymentCancelled(
          tournamentId: tid,
          tournamentName: name,
          amount: chargedAmount,
          currency: 'EGP',
          reason: result.message,
        );
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.message ?? context.trOr('paymentCancelled', 'تم إلغاء عملية الدفع')),
          backgroundColor: Colors.red.shade600,
        ),
      );
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
