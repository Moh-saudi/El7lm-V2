import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../screens/payment/geidea_payment_screen.dart';
import '../../services/currency_service.dart';
import '../../services/data_service.dart';

/// حالة نتيجة عملية الدفع الموحدة
enum UnifiedPaymentStatus {
  success,   // تم الدفع بنجاح عبر البطاقة البنكية
  pending,   // تم اختيار التحويل اللحظي (انستاباي / فوراً) والطلب قيد مراجعة الإيصال
  cancelled, // تم إلغاء العملية أو إغلاق الشيت
  failed,    // حدث خطأ في عملية الدفع
}

/// طرق الدفع المعتمدة في المنصة
enum UnifiedPaymentMethod {
  card,     // بطاقة بنكية (Visa / Mastercard / Mada) عبر Geidea
  instapay, // انستاباي مصر
  fawran,   // فوراً قطر
}

/// نتيجة عملية الدفع الموحدة
class UnifiedPaymentResult {
  const UnifiedPaymentResult({
    required this.status,
    required this.method,
    this.orderId,
    this.message,
    required this.chargedAmount,
    required this.chargedCurrency,
  });

  final UnifiedPaymentStatus status;
  final UnifiedPaymentMethod method;
  final String? orderId;
  final String? message;
  final double chargedAmount;
  final String chargedCurrency;

  bool get isSuccess => status == UnifiedPaymentStatus.success;
  bool get isPending => status == UnifiedPaymentStatus.pending;
}

/// ويدجت شيت الدفع الموحد للمنصة لكافة العناصر المدفوعة (بطولات، فرص، اشتراكات)
class UnifiedPaymentSheet {
  UnifiedPaymentSheet._();

  static const String instapayNumber = '01017799580';
  static const String fawranDisplayNumber = '+974 7054 2458';
  static const String fawranRawNumber = '+97470542458';
  static const String supportWhatsapp = '97470542458';

  /// الدالة الرئيسية الموحدة لعرض شاشة الدفع وإرجاع النتيجة
  static Future<UnifiedPaymentResult?> show({
    required BuildContext context,
    required DataService dataService,
    required String title,
    String? subtitle,
    String? logoUrl,
    required PriceBreakdown priceBreakdown,
    required String itemType, // 'tournament' | 'opportunity' | 'service'
    required String itemId,
    Map<String, dynamic>? extraMetadata,
  }) async {
    // 1. حساب سعر الصرف المعتمد
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
        priceBreakdown.finalPrice,
        priceBreakdown.currency,
      );
    } catch (e) {
      debugPrint('⚠️ [UnifiedPaymentSheet] convertToEgp failed: $e, using estimated rate');
      final estRate = CurrencyService.instance.getEstimatedRate(priceBreakdown.currency);
      conversion = CurrencyConversion(
        originalAmount: priceBreakdown.finalPrice,
        originalCurrency: priceBreakdown.currency,
        convertedAmountEgp: CurrencyService.instance.getEstimatedEgp(
          priceBreakdown.finalPrice,
          priceBreakdown.currency,
        ),
        exchangeRate: estRate,
        isConverted: priceBreakdown.currency != 'EGP',
      );
    }

    if (!context.mounted) return null;
    Navigator.of(context).pop(); // إغلاق مؤشر التحميل

    // 2. عرض شيت اختيار طريقة الدفع
    final selectedMethod = await showModalBottomSheet<UnifiedPaymentMethod>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => _PaymentModalContent(
        title: title,
        subtitle: subtitle,
        logoUrl: logoUrl,
        breakdown: priceBreakdown,
        conversion: conversion,
      ),
    );

    if (selectedMethod == null || !context.mounted) {
      return const UnifiedPaymentResult(
        status: UnifiedPaymentStatus.cancelled,
        method: UnifiedPaymentMethod.card,
        chargedAmount: 0,
        chargedCurrency: '',
      );
    }

    // 3. معالجة طريقة الدفع المختارة
    if (selectedMethod == UnifiedPaymentMethod.card) {
      return _executeCardPayment(
        context: context,
        dataService: dataService,
        title: title,
        itemId: itemId,
        itemType: itemType,
        breakdown: priceBreakdown,
        conversion: conversion,
        extraMetadata: extraMetadata,
      );
    } else {
      return _executeInstantTransfer(
        context: context,
        title: title,
        method: selectedMethod,
        breakdown: priceBreakdown,
        conversion: conversion,
      );
    }
  }

  /// تنفيذ الدفع عبر البطاقة البنكية وبوابة Geidea
  static Future<UnifiedPaymentResult> _executeCardPayment({
    required BuildContext context,
    required DataService dataService,
    required String title,
    required String itemId,
    required String itemType,
    required PriceBreakdown breakdown,
    required CurrencyConversion conversion,
    Map<String, dynamic>? extraMetadata,
  }) async {
    final email = dataService.authService.authUserId != null
        ? '${dataService.authService.authUserId}@el7lm.app'
        : 'player@el7lm.com';
    final customerName = dataService.authService.currentDisplayName.isNotEmpty
        ? dataService.authService.currentDisplayName
        : 'لاعب';

    var sessionLoadingShowing = true;
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(
        child: CircularProgressIndicator(color: AppColors.gold),
      ),
    ).then((_) => sessionLoadingShowing = false);

    Map<String, dynamic> session;
    try {
      session = await dataService.createGeideaSession(
        amount: breakdown.finalPrice,
        currency: breakdown.currency,
        customerEmail: email,
        customerName: customerName,
        metadata: {
          'type': itemType,
          'itemId': itemId,
          'title': title,
          'originalPrice': breakdown.originalPrice,
          'discountAmount': breakdown.discountAmount,
          'discountPercent': breakdown.discountPercent,
          'finalPrice': breakdown.finalPrice,
          'originalCurrency': breakdown.currency,
          'chargedAmountEgp': conversion.convertedAmountEgp,
          'exchangeRate': conversion.exchangeRate,
          ...?extraMetadata,
        },
      );
    } catch (e) {
      if (sessionLoadingShowing && context.mounted) {
        sessionLoadingShowing = false;
        Navigator.of(context).pop();
      }
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.errorText(e))),
        );
      }
      return UnifiedPaymentResult(
        status: UnifiedPaymentStatus.failed,
        method: UnifiedPaymentMethod.card,
        message: e.toString(),
        chargedAmount: breakdown.finalPrice,
        chargedCurrency: breakdown.currency,
      );
    }

    if (sessionLoadingShowing && context.mounted) {
      sessionLoadingShowing = false;
      Navigator.of(context).pop();
    }

    final redirectUrl = session['redirectUrl'] as String?;
    if (redirectUrl == null || redirectUrl.isEmpty) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('paymentSessionFailed'))),
        );
      }
      return UnifiedPaymentResult(
        status: UnifiedPaymentStatus.failed,
        method: UnifiedPaymentMethod.card,
        message: 'No redirect URL returned',
        chargedAmount: breakdown.finalPrice,
        chargedCurrency: breakdown.currency,
      );
    }

    final chargedAmount = (session['convertedAmountEgp'] as num?)?.toDouble() ??
        conversion.convertedAmountEgp;

    if (!context.mounted) {
      return const UnifiedPaymentResult(
        status: UnifiedPaymentStatus.cancelled,
        method: UnifiedPaymentMethod.card,
        chargedAmount: 0,
        chargedCurrency: 'EGP',
      );
    }

    final result = await Navigator.of(context).push<GeideaPaymentResult>(
      MaterialPageRoute(
        builder: (_) => GeideaPaymentScreen(
          paymentUrl: redirectUrl,
          sessionId: session['sessionId']?.toString() ?? session['id']?.toString(),
          amount: chargedAmount,
          currency: 'EGP',
          title: title,
          originalAmount: breakdown.finalPrice,
          originalCurrency: breakdown.currency,
          exchangeRate: conversion.exchangeRate,
        ),
      ),
    );

    final isSuccess = result?.success == true &&
        result?.orderId != null &&
        result!.orderId!.isNotEmpty &&
        result.orderId != 'null';

    if (isSuccess) {
      return UnifiedPaymentResult(
        status: UnifiedPaymentStatus.success,
        method: UnifiedPaymentMethod.card,
        orderId: result.orderId,
        message: result.message,
        chargedAmount: chargedAmount,
        chargedCurrency: 'EGP',
      );
    } else {
      return UnifiedPaymentResult(
        status: UnifiedPaymentStatus.cancelled,
        method: UnifiedPaymentMethod.card,
        message: result?.message ?? 'Payment cancelled',
        chargedAmount: chargedAmount,
        chargedCurrency: 'EGP',
      );
    }
  }

  /// تنفيذ التحويل اللحظي (انستاباي / فوراً)
  static Future<UnifiedPaymentResult> _executeInstantTransfer({
    required BuildContext context,
    required String title,
    required UnifiedPaymentMethod method,
    required PriceBreakdown breakdown,
    required CurrencyConversion conversion,
  }) async {
    final isInstapay = method == UnifiedPaymentMethod.instapay;
    final methodName = isInstapay ? 'انستاباي (InstaPay)' : 'فوراً (Fawran)';
    final transferNumber = isInstapay ? instapayNumber : fawranRawNumber;
    final amountText = isInstapay
        ? conversion.formattedEgp
        : '${breakdown.finalPrice} ${breakdown.currency}';

    // 1. نسخ رقم التحويل فورياً للحافظة
    await Clipboard.setData(ClipboardData(text: transferNumber));
    HapticFeedback.mediumImpact();

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'تم نسخ رقم $methodName ($transferNumber) إلى الحافظة بنجاح.',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          backgroundColor: isInstapay ? const Color(0xFF5E2750) : const Color(0xFF8A1538),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 4),
        ),
      );
    }

    // 2. فتح واتساب برسالة مجهزة
    final message =
        'السلام عليكم، قمت بالتحويل عبر $methodName لتأكيد الاشتراك في "$title". المبلغ: $amountText. مرفق إيصال التحويل.';
    final whatsappUri = Uri.parse(
      'https://wa.me/$supportWhatsapp?text=${Uri.encodeComponent(message)}',
    );
    try {
      if (await canLaunchUrl(whatsappUri)) {
        await launchUrl(whatsappUri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      debugPrint('⚠️ [UnifiedPaymentSheet] WhatsApp launch note: $e');
    }

    // 3. عرض نافذة التأكيد المعلق الموحدة
    if (context.mounted) {
      showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          icon: const CircleAvatar(
            radius: 26,
            backgroundColor: Color(0xFFFEF3C7),
            foregroundColor: Color(0xFFD97706),
            child: Icon(Icons.hourglass_top_rounded, size: 28),
          ),
          title: Text(
            ctx.trOr('pendingReviewTitle', 'طلب الاشتراك قيد المراجعة ⏳'),
            textAlign: TextAlign.center,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          content: Text(
            ctx.trOr(
              'pendingReviewMessage',
              'تم تسجيل طلبك وحالة الاشتراك الآن (معلق / Pending). يرجى إرسال صورة إيصال التحويل للمنظمين لتأكيد الحجز وتفعيل الاشتراك فوراً.',
            ),
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.muted, fontSize: 13),
          ),
          actionsAlignment: MainAxisAlignment.center,
          actions: [
            FilledButton(
              onPressed: () => Navigator.pop(ctx),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.navy,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(ctx.tr('ok')),
            ),
          ],
        ),
      );
    }

    return UnifiedPaymentResult(
      status: UnifiedPaymentStatus.pending,
      method: method,
      chargedAmount: isInstapay ? conversion.convertedAmountEgp : breakdown.finalPrice,
      chargedCurrency: isInstapay ? 'EGP' : breakdown.currency,
    );
  }
}

/// محتوى الشيت التفاعلي لاختيار طريقة الدفع
class _PaymentModalContent extends StatefulWidget {
  const _PaymentModalContent({
    required this.title,
    this.subtitle,
    this.logoUrl,
    required this.breakdown,
    required this.conversion,
  });

  final String title;
  final String? subtitle;
  final String? logoUrl;
  final PriceBreakdown breakdown;
  final CurrencyConversion conversion;

  @override
  State<_PaymentModalContent> createState() => _PaymentModalContentState();
}

class _PaymentModalContentState extends State<_PaymentModalContent> {
  UnifiedPaymentMethod _selectedMethod = UnifiedPaymentMethod.card;
  bool _showExchangeRate = false;

  @override
  Widget build(BuildContext context) {
    final ctx = context;
    final breakdown = widget.breakdown;
    final conversion = widget.conversion;

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        top: 12,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Header with Title & Logo
          Row(
            children: [
              if (widget.logoUrl != null && widget.logoUrl!.isNotEmpty) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.network(
                    widget.logoUrl!,
                    width: 42,
                    height: 42,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => _buildFallbackLogo(),
                  ),
                ),
                const SizedBox(width: 12),
              ] else ...[
                _buildFallbackLogo(),
                const SizedBox(width: 12),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                        color: AppColors.navy,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (widget.subtitle != null && widget.subtitle!.isNotEmpty)
                      Text(
                        widget.subtitle!,
                        style: const TextStyle(fontSize: 12, color: AppColors.muted),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close_rounded, color: AppColors.muted),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Summary Price Card
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      ctx.trOr('requiredAmount', 'المبلغ المطلوب:'),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    Row(
                      children: [
                        if (breakdown.hasDiscount) ...[
                          Text(
                            '${breakdown.originalPrice.toStringAsFixed(0)} ${breakdown.currency}',
                            style: const TextStyle(
                              decoration: TextDecoration.lineThrough,
                              color: AppColors.muted,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.green.withValues(alpha: .12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              'خصم ${breakdown.discountPercent.toStringAsFixed(0)}%',
                              style: const TextStyle(
                                color: AppColors.green,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                        ],
                        Text(
                          '${breakdown.finalPrice.toStringAsFixed(0)} ${breakdown.currency}',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: AppColors.navy,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),

                // Converted EGP preview if non-EGP
                if (conversion.isConverted) ...[
                  const SizedBox(height: 6),
                  InkWell(
                    onTap: () => setState(() => _showExchangeRate = !_showExchangeRate),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '≈ ${conversion.formattedEgp}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: AppColors.gold,
                            ),
                          ),
                          Text(
                            _showExchangeRate
                                ? ctx.trOr('hideExchangeRate', 'إخفاء سعر الصرف')
                                : ctx.trOr('showExchangeRate', 'عرض المعادل بالجنيه المصري'),
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppColors.muted,
                              decoration: TextDecoration.underline,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (_showExchangeRate) ...[
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

          const SizedBox(height: 14),

          // 3 Method Cards Side by Side
          Row(
            children: [
              // 1. بطاقة بنكية
              Expanded(
                child: _buildCompactMethodCard(
                  title: ctx.trOr('cardPayment', 'بطاقة بنكية'),
                  icon: _buildCardBrandLogos(),
                  isSelected: _selectedMethod == UnifiedPaymentMethod.card,
                  onTap: () => setState(() => _selectedMethod = UnifiedPaymentMethod.card),
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
                  isSelected: _selectedMethod == UnifiedPaymentMethod.instapay,
                  onTap: () => setState(() => _selectedMethod = UnifiedPaymentMethod.instapay),
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
                  isSelected: _selectedMethod == UnifiedPaymentMethod.fawran,
                  onTap: () => setState(() => _selectedMethod = UnifiedPaymentMethod.fawran),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Details bar according to selected method
          if (_selectedMethod == UnifiedPaymentMethod.card) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.gold.withValues(alpha: .08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.gold.withValues(alpha: .2)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.lock_outline_rounded, color: AppColors.gold, size: 15),
                  const SizedBox(width: 8),
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
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: () => Navigator.pop(context, UnifiedPaymentMethod.card),
              icon: const Icon(Icons.lock_rounded, size: 16),
              label: Text(
                ctx.trOr('confirmAndPay', 'تأكيد والانتقال للدفع'),
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.gold,
                foregroundColor: AppColors.ink,
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ] else if (_selectedMethod == UnifiedPaymentMethod.instapay) ...[
            _buildNumberBar(
              color: const Color(0xFF5E2750),
              label: ctx.trOr('transferNumber', 'رقم انستاباي:'),
              number: UnifiedPaymentSheet.instapayNumber,
              equivalentText: conversion.isConverted ? '≈ ${conversion.formattedEgp}' : null,
            ),
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: () => Navigator.pop(context, UnifiedPaymentMethod.instapay),
              icon: const Icon(Icons.send_rounded, size: 16),
              label: Text(
                ctx.trOr('confirmTransferAndSend', 'تأكيد التحويل وإرسال الإيصال'),
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF5E2750),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ] else if (_selectedMethod == UnifiedPaymentMethod.fawran) ...[
            _buildNumberBar(
              color: const Color(0xFF8A1538),
              label: ctx.trOr('transferNumber', 'رقم فوراً:'),
              number: UnifiedPaymentSheet.fawranDisplayNumber,
              rawNumber: UnifiedPaymentSheet.fawranRawNumber,
            ),
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: () => Navigator.pop(context, UnifiedPaymentMethod.fawran),
              icon: const Icon(Icons.send_rounded, size: 16),
              label: Text(
                ctx.trOr('confirmTransferAndSend', 'تأكيد التحويل وإرسال الإيصال'),
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF8A1538),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFallbackLogo() => Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: AppColors.navy.withValues(alpha: .08),
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Icon(Icons.sports_soccer, color: AppColors.navy, size: 22),
      );

  Widget _buildCompactMethodCard({
    required String title,
    String? flag,
    required Widget icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 9),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.gold.withValues(alpha: .08) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.gold : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppColors.gold.withValues(alpha: .2),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  )
                ]
              : null,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(height: 22, child: Center(child: icon)),
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
                      fontWeight: isSelected ? FontWeight.w900 : FontWeight.bold,
                      color: isSelected ? AppColors.navy : Colors.grey.shade800,
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

  Widget _buildNumberBar({
    required Color color,
    required String label,
    required String number,
    String? rawNumber,
    String? equivalentText,
  }) {
    final copyTarget = rawNumber ?? number;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .06),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: .2)),
      ),
      child: Row(
        children: [
          Icon(Icons.phone_android_rounded, color: color, size: 16),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
          const SizedBox(width: 6),
          Expanded(
            child: Directionality(
              textDirection: TextDirection.ltr,
              child: Text(
                number,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  color: color,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ),
          if (equivalentText != null) ...[
            Text(
              equivalentText,
              style: TextStyle(
                fontSize: 10,
                color: color.withValues(alpha: .8),
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(width: 6),
          ],
          InkWell(
            onTap: () async {
              await Clipboard.setData(ClipboardData(text: copyTarget));
              HapticFeedback.selectionClick();
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('تم نسخ الرقم: $copyTarget'),
                    duration: const Duration(seconds: 2),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            },
            borderRadius: BorderRadius.circular(6),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.copy_rounded, color: Colors.white, size: 11),
                  SizedBox(width: 3),
                  Text(
                    'نسخ',
                    style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCardBrandLogos() => Row(
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
          const SizedBox(width: 4),
          const Text(
            'مدى / فيزا',
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.navy),
          ),
        ],
      );
}
