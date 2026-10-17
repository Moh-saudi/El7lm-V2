import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';

/// Result returned after the Geidea payment flow completes.
class GeideaPaymentResult {
  const GeideaPaymentResult({
    required this.success,
    this.orderId,
    this.message,
  });

  final bool success;
  final String? orderId;
  final String? message;
}

/// Full-screen in-app WebView that hosts the Geidea payment page.
class GeideaPaymentScreen extends StatefulWidget {
  const GeideaPaymentScreen({
    super.key,
    required this.paymentUrl,
    this.sessionId,
    required this.amount,
    required this.currency,
    required this.title,
    this.originalAmount,
    this.originalCurrency,
    this.exchangeRate,
  });

  final String paymentUrl;
  final String? sessionId;
  final double amount;
  final String currency;
  final String title;
  final double? originalAmount;
  final String? originalCurrency;
  final double? exchangeRate;

  @override
  State<GeideaPaymentScreen> createState() => _GeideaPaymentScreenState();
}

class _GeideaPaymentScreenState extends State<GeideaPaymentScreen> {
  late final WebViewController _controller;
  bool _loading = true;
  bool _completed = false;
  bool _hasPopped = false;

  String get _formattedAmountSubtitle {
    final cur = widget.currency.trim().toUpperCase();
    final origCur = widget.originalCurrency?.trim().toUpperCase();
    final hasConversion = origCur != null && origCur.isNotEmpty && origCur != 'EGP' && widget.originalAmount != null;

    final egpFormatted = '${widget.amount.toStringAsFixed(2)} EGP';
    if (!hasConversion) {
      return '${widget.amount.toStringAsFixed(2)} $cur';
    }

    final origAmt = widget.originalAmount!;
    final origFormatted = '${origAmt.toStringAsFixed(origAmt.truncateToDouble() == origAmt ? 0 : 2)} $origCur';
    return '$egpFormatted ($origFormatted)';
  }


  String? _extractSessionId(String url) {
    if (widget.sessionId != null && widget.sessionId!.trim().isNotEmpty) {
      return widget.sessionId!.trim();
    }
    final uri = Uri.tryParse(url);
    if (uri != null) {
      if (uri.query.isNotEmpty && !uri.query.contains('=')) {
        return uri.query;
      }
      return uri.queryParameters['sessionId'] ?? uri.queryParameters['id'];
    }
    return null;
  }

  String _buildCheckoutHtml(String sId) {
    return '''<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Geidea Payment</title>
  <style>
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      color: #64748b;
      text-align: center;
      padding: 24px;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 4px solid #e2e8f0;
      border-top-color: #0b2545;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .title {
      font-size: 16px;
      font-weight: 800;
      color: #0b2545;
      margin-bottom: 6px;
    }
    .subtitle {
      font-size: 13px;
      color: #94a3b8;
    }
  </style>
  <script src="https://www.merchant.geidea.net/hpp/geideaCheckout.min.js"></script>
</head>
<body>
  <div id="loader" class="loading-container">
    <div class="spinner"></div>
    <div class="title">بوابة الدفع الآمنة Geidea</div>
    <div class="subtitle">جارٍ تجهيز نموذج الدفع...</div>
  </div>

  <script>
    function sendToFlutter(payload) {
      try {
        if (window.GeideaFlutterBridge && window.GeideaFlutterBridge.postMessage) {
          window.GeideaFlutterBridge.postMessage(JSON.stringify(payload));
        }
      } catch (e) {
        console.error('Bridge error:', e);
      }
    }

    let started = false;
    function initGeidea() {
      if (started) return;
      if (!window.GeideaCheckout) {
        setTimeout(initGeidea, 150);
        return;
      }
      started = true;
      try {
        const onSuccess = function(data) {
          sendToFlutter({ event: 'success', data: data });
        };
        const onError = function(error) {
          sendToFlutter({ event: 'error', error: error });
        };
        const onCancel = function() {
          sendToFlutter({ event: 'cancel' });
        };

        const payment = new window.GeideaCheckout(onSuccess, onError, onCancel);
        payment.startPayment("$sId");

        setTimeout(function() {
          const l = document.getElementById('loader');
          if (l) l.style.display = 'none';
        }, 500);
      } catch (err) {
        sendToFlutter({ event: 'error', error: err.toString() });
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initGeidea);
    } else {
      initGeidea();
    }
  </script>
</body>
</html>''';
  }

  @override
  void initState() {
    super.initState();

    final sId = _extractSessionId(widget.paymentUrl);

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setUserAgent('Mozilla/5.0 (Linux; Android 15; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36')
      ..addJavaScriptChannel(
        'GeideaFlutterBridge',
        onMessageReceived: (JavaScriptMessage message) {
          try {
            final data = jsonDecode(message.message) as Map<String, dynamic>;
            final event = data['event'];
            if (event == 'success') {
              final inner = data['data'];
              final rawOrderId = (inner is Map)
                  ? (inner['orderId'] ?? inner['merchantReferenceId'])?.toString()
                  : null;
              final respCode = (inner is Map)
                  ? (inner['responseCode'] ?? inner['responsecode'])?.toString()
                  : null;
              final orderId = (rawOrderId != null && rawOrderId != 'null' && rawOrderId.trim().isNotEmpty)
                  ? rawOrderId.trim()
                  : null;

              if (orderId != null && (respCode == null || respCode == '000')) {
                _completed = true;
                _finishWithResult(GeideaPaymentResult(
                  success: true,
                  orderId: orderId,
                ));
              } else {
                _completed = true;
                _finishWithResult(const GeideaPaymentResult(
                  success: false,
                  message: 'تم إلغاء عملية الدفع',
                ));
              }
            } else if (event == 'cancel') {
              _completed = true;
              _finishWithResult(const GeideaPaymentResult(
                success: false,
                message: 'تم إلغاء الدفع',
              ));
            } else if (event == 'error') {
              _completed = true;
              _finishWithResult(GeideaPaymentResult(
                success: false,
                message: data['error']?.toString() ?? 'فشل الدفع',
              ));
            }
          } catch (e) {
            debugPrint('[GeideaFlutterBridge] error: $e');
          }
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) setState(() => _loading = true);
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _loading = false);
          },
          onWebResourceError: (error) {
            debugPrint('[GeideaWebView] error: ${error.description}');
            if (mounted) setState(() => _loading = false);
          },
          onNavigationRequest: (NavigationRequest request) {
            _checkPaymentUrl(request.url);
            return NavigationDecision.navigate;
          },
        ),
      );

    if (_controller.platform is AndroidWebViewController) {
      AndroidWebViewController.enableDebugging(true);
      final android = _controller.platform as AndroidWebViewController;
      android.setMediaPlaybackRequiresUserGesture(false);
    }

    if (sId != null && sId.isNotEmpty) {
      debugPrint('[GeideaPaymentScreen] Loading SDK page with session: $sId');
      _controller.loadHtmlString(
        _buildCheckoutHtml(sId),
        baseUrl: 'https://www.merchant.geidea.net',
      );
    } else {
      debugPrint('[GeideaPaymentScreen] Loading direct URL: ${widget.paymentUrl}');
      _controller.loadRequest(Uri.parse(widget.paymentUrl));
    }
  }

  void _checkPaymentUrl(String url) {
    if (_completed) return;
    final lower = url.toLowerCase();
    debugPrint('🎯 [GeideaPaymentScreen] _checkPaymentUrl: $url');

    // Only process redirect URLs pointing back to platform or containing response code
    if (!lower.contains('el7lm.com') && !lower.contains('responsecode=')) {
      return;
    }

    final uri = Uri.tryParse(url);
    final responseCode = uri?.queryParameters['responseCode'] ??
        uri?.queryParameters['responsecode'] ??
        uri?.queryParameters['ResponseCode'];
    final responseMessage = uri?.queryParameters['responseMessage'] ??
        uri?.queryParameters['responsemessage'];
    final status = uri?.queryParameters['status']?.toLowerCase();
    final rawOrderId = uri?.queryParameters['orderId'] ??
        uri?.queryParameters['order_id'] ??
        uri?.queryParameters['merchantReferenceId'];
    final orderId = (rawOrderId != null && rawOrderId != 'null' && rawOrderId.trim().isNotEmpty)
        ? rawOrderId.trim()
        : null;

    // 1. التحقق الصارم من كود الاستجابة (000 = نجاح، أي كود آخر = فشل أو إلغاء)
    if (responseCode != null && responseCode.isNotEmpty) {
      _completed = true;
      if (responseCode == '000' && orderId != null) {
        debugPrint('🎯 [GeideaPaymentScreen] Success responseCode=000: orderId=$orderId');
        _finishWithResult(GeideaPaymentResult(success: true, orderId: orderId));
      } else {
        debugPrint('🎯 [GeideaPaymentScreen] Non-success responseCode=$responseCode: $responseMessage');
        _finishWithResult(GeideaPaymentResult(
          success: false,
          message: responseMessage ?? 'تم إلغاء عملية الدفع ($responseCode)',
        ));
      }
      return;
    }

    // 2. التحقق من حالات الفشل الصريحة في المسار أو المعاملات أو إذا كان orderId=null
    if (status == 'failed' ||
        status == 'cancelled' ||
        status == 'cancel' ||
        lower.contains('/payment/failed') ||
        lower.contains('/payment/cancel') ||
        (lower.contains('orderid=null') && !lower.contains('responsecode=000'))) {
      _completed = true;
      debugPrint('🎯 [GeideaPaymentScreen] Failure redirect detected');
      _finishWithResult(
        GeideaPaymentResult(
          success: false,
          message: responseMessage ?? 'تم إلغاء عملية الدفع',
        ),
      );
      return;
    }

    // 3. التحقق من مسار النجاح - يشترط وجود orderId حقيقي صالح
    if (status == 'success' || (lower.contains('/payment/success') && orderId != null)) {
      _completed = true;
      debugPrint('🎯 [GeideaPaymentScreen] Success redirect detected: orderId=$orderId');
      _finishWithResult(GeideaPaymentResult(success: true, orderId: orderId));
      return;
    }

    // 4. إذا تمت إعادة التوجيه إلى موقع التاجر بدون orderId صالح (مثل النقر على "العودة إلى موقع التاجر" بعد الإلغاء)
    if (lower.contains('el7lm.com/payment') && orderId == null) {
      _completed = true;
      debugPrint('🎯 [GeideaPaymentScreen] Return to merchant with no valid orderId -> Cancel');
      _finishWithResult(
        const GeideaPaymentResult(
          success: false,
          message: 'تم إلغاء عملية الدفع',
        ),
      );
      return;
    }
  }

  void _finishWithResult(GeideaPaymentResult result) {
    if (_hasPopped) return;
    _hasPopped = true;
    _completed = true;
    debugPrint('🎯 [GeideaPaymentScreen] _finishWithResult: success=${result.success}, msg=${result.message}');
    if (!mounted) return;
    Navigator.of(context).pop(result);
  }

  Future<bool> _onWillPop() async {
    if (_hasPopped) return false;
    if (_completed) {
      _finishWithResult(const GeideaPaymentResult(
        success: false,
        message: 'تم إلغاء عملية الدفع',
      ));
      return false;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: const Icon(
          Icons.payment_rounded,
          color: AppColors.gold,
          size: 36,
        ),
        title: Text(ctx.trOr('cancelPaymentTitle', 'إلغاء عملية الدفع؟')),
        content: Text(ctx.trOr('cancelPaymentMessage', 'هل أنت متأكد من رغبتك في إلغاء عملية الدفع والعودة؟')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(ctx.trOr('continuePayment', 'متابعة الدفع')),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: Text(ctx.trOr('cancelPaymentConfirm', 'نعم، إلغاء الدفع')),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      _finishWithResult(
        const GeideaPaymentResult(
          success: false,
          message: 'تم إلغاء الدفع من قبل المستخدم',
        ),
      );
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop || _hasPopped) return;
        await _onWillPop();
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          scrolledUnderElevation: 1,
          leading: IconButton(
            icon: const Icon(Icons.close_rounded),
            onPressed: _onWillPop,
            tooltip: context.tr('cancel'),
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                context.tr('securePayment'),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  color: AppColors.navy,
                ),
              ),
              Directionality(
                textDirection: TextDirection.ltr,
                child: Text(
                  _formattedAmountSubtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.muted,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Row(
                children: [
                  const Icon(
                    Icons.lock_rounded,
                    size: 14,
                    color: AppColors.green,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Geidea',
                    style: const TextStyle(
                      color: AppColors.green,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        body: Stack(
          children: [
            WebViewWidget(controller: _controller),
            if (_loading)
              Container(
                color: Colors.white,
                child: const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(
                        color: AppColors.gold,
                        strokeWidth: 3,
                      ),
                      SizedBox(height: 16),
                      Text(
                        'جارٍ تحميل صفحة الدفع...',
                        style: TextStyle(color: AppColors.muted),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
