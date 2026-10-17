import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// نتيجة تحويل العملة مع التفاصيل
class CurrencyConversion {
  const CurrencyConversion({
    required this.originalAmount,
    required this.originalCurrency,
    required this.convertedAmountEgp,
    required this.exchangeRate,
    required this.isConverted,
  });

  final double originalAmount;
  final String originalCurrency;
  final double convertedAmountEgp;
  final double exchangeRate;
  final bool isConverted;

  String get formattedOriginal =>
      '${originalAmount.toStringAsFixed(originalAmount.truncateToDouble() == originalAmount ? 0 : 2)} $originalCurrency';

  String get formattedEgp =>
      '${convertedAmountEgp.toStringAsFixed(2)} EGP';

  String get formattedSummary => isConverted
      ? '$formattedEgp ($formattedOriginal)'
      : formattedEgp;
}

/// نتيجة فحص وتطبيق الخصم على البطولة أو الفرصة
class PriceBreakdown {
  const PriceBreakdown({
    required this.originalPrice,
    required this.discountAmount,
    required this.discountPercent,
    required this.finalPrice,
    required this.hasDiscount,
    required this.currency,
  });

  final double originalPrice;
  final double discountAmount;
  final double discountPercent;
  final double finalPrice;
  final bool hasDiscount;
  final String currency;

  factory PriceBreakdown.fromMap(Map<String, dynamic> item) {
    // 1. استخراج السعر الأساسي
    final rawFee = item['entryFee'] ??
        item['entry_fee'] ??
        item['fee'] ??
        item['registrationFee'] ??
        item['price'] ??
        item['amount'];

    double price = 0.0;
    if (rawFee is num) {
      price = rawFee.toDouble();
    } else if (rawFee != null) {
      price = double.tryParse('$rawFee') ?? 0.0;
    }

    final rawOrig = item['originalPrice'] ??
        item['original_price'] ??
        item['basePrice'] ??
        item['base_price'];

    double originalPrice = price;
    if (rawOrig is num) {
      originalPrice = rawOrig.toDouble();
    } else if (rawOrig != null) {
      final parsed = double.tryParse('$rawOrig');
      if (parsed != null && parsed > price) {
        originalPrice = parsed;
      }
    }

    // 2. استخراج الخصم
    final rawDiscountPercent = item['discountPercent'] ??
        item['discount_percent'] ??
        item['discount_percentage'];

    final rawDiscountAmount = item['discountAmount'] ??
        item['discount_amount'] ??
        item['discount'];

    double discountPercent = 0.0;
    double discountAmount = 0.0;
    double finalPrice = price;

    if (rawDiscountPercent is num && rawDiscountPercent > 0) {
      discountPercent = rawDiscountPercent.toDouble();
      discountAmount = (price * (discountPercent / 100));
      finalPrice = (price - discountAmount).clamp(0.0, price);
    } else if (rawDiscountAmount is num && rawDiscountAmount > 0) {
      discountAmount = rawDiscountAmount.toDouble();
      discountPercent = price > 0 ? ((discountAmount / price) * 100) : 0.0;
      finalPrice = (price - discountAmount).clamp(0.0, price);
    } else if (originalPrice > price && price > 0) {
      discountAmount = originalPrice - price;
      discountPercent = (discountAmount / originalPrice) * 100;
      finalPrice = price;
    }

    final hasDiscount = discountAmount > 0 && finalPrice < (originalPrice > price ? originalPrice : price);
    final currency = '${item['currency'] ?? 'EGP'}'.trim().toUpperCase();

    return PriceBreakdown(
      originalPrice: originalPrice > price ? originalPrice : price,
      discountAmount: discountAmount,
      discountPercent: discountPercent,
      finalPrice: finalPrice > 0 ? finalPrice : (price > 0 ? price : 0.0),
      hasDiscount: hasDiscount,
      currency: currency.isNotEmpty ? currency : 'EGP',
    );
  }
}

/// خدمة تحويل العملات اللحظية المعتمدة
class CurrencyService {
  CurrencyService._();
  static final CurrencyService instance = CurrencyService._();

  // ذاكرة تخزين مؤقت لأسعار الصرف مع وقت الصلاحية (ساعة واحدة)
  final Map<String, double> _cachedRatesToEgp = {};
  DateTime? _lastRatesFetchTime;

  // أسعار صرف احتياطية موثوقة مقابل الجنيه المصري (EGP)
  static const Map<String, double> _fallbackRatesToEgp = {
    'EGP': 1.0,
    'USD': 53.46,  // الدولار الأمريكي
    'EUR': 58.20,  // اليورو
    'GBP': 68.10,  // الجنيه الإسترليني
    'SAR': 14.25,  // الريال السعودي
    'AED': 14.55,  // الدرهم الإماراتي
    'QAR': 14.68,  // الريال القطري
    'KWD': 174.50, // الدينار الكويتي
    'BHD': 141.80, // الدينار البحريني
    'OMR': 138.90, // الريال العماني
    'JOD': 75.40,  // الدينار الأردني
    'MAD': 5.50,   // الدرهم المغربي
    'DZD': 0.40,   // الدينار الجزائري
    'TND': 17.50,  // الدينار التونسي
    'TRY': 1.55,   // الليرة التركية
    'CHF': 61.50,  // الفرنك السويسري
    'CAD': 38.50,  // الدولار الكندي
  };

  /// الحصول على سعر تقديري فوري (من الذاكرة المؤقتة أو الأسعار المعتمدة) دون انتظار شبكة
  double getEstimatedRate(String currencyCode) {
    final code = currencyCode.trim().toUpperCase();
    if (code.isEmpty || code == 'EGP') return 1.0;
    return _cachedRatesToEgp[code] ?? _fallbackRatesToEgp[code] ?? 1.0;
  }

  /// تحويل تقديري فوري للجنيه المصري (مفيد لعرض المعاينة السريعة في الكروت)
  double getEstimatedEgp(double amount, String currencyCode) {
    final rate = getEstimatedRate(currencyCode);
    return double.parse((amount * rate).toStringAsFixed(2));
  }

  /// جلب سعر الصرف اللحظي لعملة معينة مقابل الجنيه المصري (EGP)
  Future<double> getRateToEgp(String currencyCode) async {
    final code = currencyCode.trim().toUpperCase();
    if (code.isEmpty || code == 'EGP') return 1.0;

    // التحقق من صلاحية الكاش (ساعة واحدة)
    final now = DateTime.now();
    if (_lastRatesFetchTime != null &&
        now.difference(_lastRatesFetchTime!).inMinutes < 60 &&
        _cachedRatesToEgp.containsKey(code)) {
      return _cachedRatesToEgp[code]!;
    }

    // محاولة جلب السعر الحي من API مفتوح ومجاني
    try {
      final uri = Uri.parse('https://open.er-api.com/v6/latest/$code');
      final res = await http.get(uri).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final rates = data['rates'] as Map<String, dynamic>?;
        if (rates != null && rates['EGP'] != null) {
          final rate = (rates['EGP'] as num).toDouble();
          if (rate > 0) {
            _cachedRatesToEgp[code] = rate;
            _lastRatesFetchTime = now;
            debugPrint('💱 [CurrencyService] Live rate fetched: 1 $code = $rate EGP');
            return rate;
          }
        }
      }
    } catch (e) {
      debugPrint('⚠️ [CurrencyService] Live rate fetch failed ($e), using fallback');
    }

    // الرجوع للسعر الاحتياطي
    final fallback = _fallbackRatesToEgp[code] ?? 1.0;
    _cachedRatesToEgp[code] = fallback;
    return fallback;
  }

  /// تحويل أي مبلغ إلى الجنيه المصري مع التفاصيل الكاملة
  Future<CurrencyConversion> convertToEgp(double amount, String currencyCode) async {
    final code = currencyCode.trim().toUpperCase();
    if (code == 'EGP' || code.isEmpty) {
      return CurrencyConversion(
        originalAmount: amount,
        originalCurrency: 'EGP',
        convertedAmountEgp: amount,
        exchangeRate: 1.0,
        isConverted: false,
      );
    }

    final rate = await getRateToEgp(code);
    final egpAmount = double.parse((amount * rate).toStringAsFixed(2));

    return CurrencyConversion(
      originalAmount: amount,
      originalCurrency: code,
      convertedAmountEgp: egpAmount,
      exchangeRate: rate,
      isConverted: true,
    );
  }
}
