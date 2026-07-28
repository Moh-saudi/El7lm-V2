import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/account_type.dart';
import '../../services/auth_service.dart';
import '../../widgets/brand_logo.dart';
import '../../widgets/language_switcher.dart';
import 'otp_screen.dart';

class PhoneAuthScreen extends StatefulWidget {
  const PhoneAuthScreen({
    super.key,
    required this.accountType,
    required this.authService,
    required this.onAuthenticated,
    required this.onChangeAccountType,
  });

  final AccountType accountType;
  final AuthService authService;
  final ValueChanged<AuthResult> onAuthenticated;
  final VoidCallback onChangeAccountType;

  @override
  State<PhoneAuthScreen> createState() => _PhoneAuthScreenState();
}

class _PhoneAuthScreenState extends State<PhoneAuthScreen> {
  final phone = TextEditingController();
  final name = TextEditingController();
  String countryCode = '+20';
  bool registration = false;
  bool agreed = false;
  bool loading = false;
  String? error;

  static const countries = {
    '+20': 'مصر',
    '+974': 'قطر',
    '+966': 'السعودية',
    '+971': 'الإمارات',
    '+965': 'الكويت',
    '+968': 'عُمان',
    '+973': 'البحرين',
    '+962': 'الأردن',
    '+964': 'العراق',
    '+212': 'المغرب',
    '+213': 'الجزائر',
    '+216': 'تونس',
  };

  String get fullPhone =>
      '$countryCode${phone.text.replaceAll(RegExp(r'\D'), '').replaceFirst(RegExp(r'^0+'), '')}';

  Future<void> submit() async {
    final digits = phone.text.replaceAll(RegExp(r'\D'), '');
    if (digits.length < 7) {
      setState(() => error = context.tr('invalidPhone'));
      return;
    }
    if (registration && name.text.trim().length < 3) {
      setState(() => error = context.tr('nameRequired'));
      return;
    }
    if (registration && !agreed) {
      setState(() => error = context.tr('termsRequired'));
      return;
    }

    setState(() {
      loading = true;
      error = null;
    });
    try {
      await widget.authService.sendOtp(
        phone: fullPhone,
        registration: registration,
        name: name.text.trim(),
      );
      if (!mounted) return;
      final result = await Navigator.of(context).push<AuthResult>(
        MaterialPageRoute(
          builder: (_) => OtpScreen(
            phone: fullPhone,
            registration: registration,
            accountType: widget.accountType,
            name: name.text.trim(),
            authService: widget.authService,
          ),
        ),
      );
      if (result != null) widget.onAuthenticated(result);
    } catch (exception) {
      setState(() => error = '$exception');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const SizedBox(height: 10),
            const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                BrandLogo(size: 78),
                SizedBox(width: 12),
                LanguageSwitcher(compact: true),
              ],
            ),
            const SizedBox(height: 28),
            SegmentedButton<bool>(
              segments: [
                ButtonSegment(value: false, label: Text(context.tr('login'))),
                ButtonSegment(
                  value: true,
                  label: Text(context.tr('createAccount')),
                ),
              ],
              selected: {registration},
              onSelectionChanged: (value) {
                setState(() {
                  registration = value.first;
                  error = null;
                });
              },
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.green.withValues(alpha: .1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(widget.accountType.icon, color: AppColors.green),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    context.tr('continueAs', {
                      'type': widget.accountType.localizedName(context),
                    }),
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                TextButton(
                  onPressed: widget.onChangeAccountType,
                  child: Text(context.tr('change')),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (registration) ...[
              TextField(
                controller: name,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  labelText: context.tr('fullName'),
                  prefixIcon: const Icon(Icons.person_outline),
                ),
              ),
              const SizedBox(height: 12),
            ],
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 118,
                  child: DropdownButtonFormField<String>(
                    initialValue: countryCode,
                    decoration: InputDecoration(
                      labelText: context.tr('country'),
                    ),
                    items: countries.entries
                        .map(
                          (entry) => DropdownMenuItem(
                            value: entry.key,
                            child: Text(entry.key),
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      if (value != null) setState(() => countryCode = value);
                    },
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: phone,
                    keyboardType: TextInputType.phone,
                    textDirection: TextDirection.ltr,
                    decoration: InputDecoration(
                      labelText: context.tr('phone'),
                      hintText: '1012345678',
                      prefixIcon: const Icon(Icons.phone_iphone),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              context.tr('otpDeliveryHelp'),
              style: const TextStyle(color: AppColors.muted, fontSize: 12),
            ),
            if (registration) ...[
              const SizedBox(height: 12),
              CheckboxListTile(
                value: agreed,
                onChanged: (value) => setState(() => agreed = value ?? false),
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                title: Text(
                  context.tr('acceptTerms'),
                  style: const TextStyle(fontSize: 13),
                ),
              ),
            ],
            if (error != null) ...[
              const SizedBox(height: 8),
              Text(error!, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: loading ? null : submit,
              icon: loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.sms_outlined),
              label: Text(context.tr(loading ? 'sending' : 'sendOtp')),
            ),
            const SizedBox(height: 16),
            Text(
              context.tr('allAccountsFree'),
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.green,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
