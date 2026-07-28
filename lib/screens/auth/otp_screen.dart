import 'dart:async';

import 'package:flutter/material.dart';

import '../../models/account_type.dart';
import '../../services/auth_service.dart';
import '../../widgets/brand_logo.dart';

class OtpScreen extends StatefulWidget {
  const OtpScreen({
    super.key,
    required this.phone,
    required this.registration,
    required this.accountType,
    required this.name,
    required this.authService,
  });

  final String phone;
  final bool registration;
  final AccountType accountType;
  final String name;
  final AuthService authService;

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final code = TextEditingController();
  Timer? timer;
  int remaining = 30;
  bool loading = false;
  String? error;

  @override
  void initState() {
    super.initState();
    startTimer();
  }

  void startTimer() {
    timer?.cancel();
    setState(() => remaining = 30);
    timer = Timer.periodic(const Duration(seconds: 1), (value) {
      if (remaining <= 1) {
        value.cancel();
        setState(() => remaining = 0);
      } else {
        setState(() => remaining--);
      }
    });
  }

  Future<void> verify() async {
    if (code.text.trim().length != 6) {
      setState(() => error = 'أدخل الرمز المكوّن من 6 أرقام.');
      return;
    }
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final result = await widget.authService.verifyOtp(
        phone: widget.phone,
        otp: code.text.trim(),
        registration: widget.registration,
        selectedType: widget.accountType,
        name: widget.name,
      );
      if (mounted) Navigator.of(context).pop(result);
    } catch (exception) {
      setState(() => error = '$exception');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> resend() async {
    await widget.authService.sendOtp(
      phone: widget.phone,
      registration: widget.registration,
      name: widget.name,
    );
    startTimer();
  }

  @override
  void dispose() {
    timer?.cancel();
    code.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const BrandLogo(size: 68),
          const SizedBox(height: 30),
          Text(
            'تأكيد رقم الهاتف',
            textAlign: TextAlign.center,
            style: Theme.of(
              context,
            ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          Text('أرسلنا الرمز إلى ${widget.phone}', textAlign: TextAlign.center),
          const SizedBox(height: 26),
          TextField(
            controller: code,
            autofocus: true,
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            textDirection: TextDirection.ltr,
            maxLength: 6,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              letterSpacing: 12,
            ),
            decoration: const InputDecoration(
              hintText: '••••••',
              counterText: '',
            ),
            onSubmitted: (_) => verify(),
          ),
          if (error != null) ...[
            const SizedBox(height: 8),
            Text(
              error!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.red),
            ),
          ],
          const SizedBox(height: 18),
          FilledButton(
            onPressed: loading ? null : verify,
            child: Text(loading ? 'جاري التحقق...' : 'تأكيد ومتابعة'),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: remaining == 0 ? resend : null,
            child: Text(
              remaining == 0
                  ? 'إعادة إرسال الرمز'
                  : 'إعادة الإرسال بعد $remaining ث',
            ),
          ),
        ],
      ),
    );
  }
}
