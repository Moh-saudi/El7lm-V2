import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../l10n/app_localizations.dart';
import '../../models/account_type.dart';
import '../../services/auth_service.dart';
import '../../services/contact_validator.dart';
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
  String? errorKey;

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
    final normalizedCode = ContactValidator.digitsOnly(
      ContactValidator.normalizeDigits(code.text),
    );
    if (normalizedCode.length != 6) {
      setState(() => errorKey = 'otpLengthInvalid');
      return;
    }
    setState(() {
      loading = true;
      errorKey = null;
    });
    try {
      final result = await widget.authService.verifyOtp(
        phone: widget.phone,
        otp: normalizedCode,
        registration: widget.registration,
        selectedType: widget.accountType,
        name: widget.name,
      );
      if (mounted) Navigator.of(context).pop(result);
    } catch (exception) {
      setState(() => errorKey = context.errorTranslationKey(exception));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> resend() async {
    setState(() {
      loading = true;
      errorKey = null;
    });
    try {
      await widget.authService.sendOtp(
        phone: widget.phone,
        registration: widget.registration,
        expectedAccountType: widget.accountType,
        name: widget.name,
      );
      if (mounted) startTimer();
    } catch (exception) {
      if (mounted) {
        setState(() => errorKey = context.errorTranslationKey(exception));
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
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
            context.tr('verifyPhone'),
            textAlign: TextAlign.center,
            style: Theme.of(
              context,
            ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          Text(
            context.tr('otpSentTo', {'phone': widget.phone}),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 26),
          TextField(
            controller: code,
            autofocus: true,
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            textDirection: TextDirection.ltr,
            maxLength: 6,
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[0-9٠-٩۰-۹]')),
            ],
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
          if (errorKey != null) ...[
            const SizedBox(height: 8),
            Text(
              context.tr(errorKey!),
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.red),
            ),
          ],
          const SizedBox(height: 18),
          FilledButton(
            onPressed: loading ? null : verify,
            child: Text(context.tr(loading ? 'verifying' : 'verifyContinue')),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: remaining == 0 && !loading ? resend : null,
            child: Text(
              remaining == 0
                  ? context.tr('resendOtp')
                  : context.tr('resendAfter', {'seconds': remaining}),
            ),
          ),
        ],
      ),
    );
  }
}
