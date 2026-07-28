import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../models/account_type.dart';
import '../../services/auth_service.dart';
import '../../widgets/brand_logo.dart';
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
      setState(() => error = 'أدخل رقم هاتف صحيحًا.');
      return;
    }
    if (registration && name.text.trim().length < 3) {
      setState(() => error = 'أدخل الاسم الكامل.');
      return;
    }
    if (registration && !agreed) {
      setState(() => error = 'يجب الموافقة على الشروط وسياسة الخصوصية.');
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
            const BrandLogo(size: 78),
            const SizedBox(height: 28),
            SegmentedButton<bool>(
              segments: const [
                ButtonSegment(value: false, label: Text('تسجيل الدخول')),
                ButtonSegment(value: true, label: Text('إنشاء حساب')),
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
                    'متابعة كـ${widget.accountType.arabicName}',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                TextButton(
                  onPressed: widget.onChangeAccountType,
                  child: const Text('تغيير'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (registration) ...[
              TextField(
                controller: name,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'الاسم الكامل',
                  prefixIcon: Icon(Icons.person_outline),
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
                    decoration: const InputDecoration(labelText: 'الدولة'),
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
                    decoration: const InputDecoration(
                      labelText: 'رقم الهاتف',
                      hintText: '1012345678',
                      prefixIcon: Icon(Icons.phone_iphone),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Text(
              'سنرسل رمز تأكيد من 6 أرقام عبر WhatsApp أو SMS.',
              style: TextStyle(color: AppColors.muted, fontSize: 12),
            ),
            if (registration) ...[
              const SizedBox(height: 12),
              CheckboxListTile(
                value: agreed,
                onChanged: (value) => setState(() => agreed = value ?? false),
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                title: const Text(
                  'أوافق على الشروط وسياسة الخصوصية',
                  style: TextStyle(fontSize: 13),
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
              label: Text(loading ? 'جاري الإرسال...' : 'إرسال رمز التأكيد'),
            ),
            const SizedBox(height: 16),
            const Text(
              'جميع الحسابات مجانية حاليًا.',
              textAlign: TextAlign.center,
              style: TextStyle(
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
