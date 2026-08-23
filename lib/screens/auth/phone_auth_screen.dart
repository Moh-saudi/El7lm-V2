import 'dart:async';

import 'package:country_picker/country_picker.dart';
import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/account_type.dart';
import '../../services/auth_service.dart';
import '../../services/contact_validator.dart';
import '../../services/location_catalog_service.dart';
import '../../widgets/account_type_football_icon.dart';
import '../../widgets/brand_logo.dart';
import '../../widgets/company_footer.dart';
import '../../widgets/language_switcher.dart';
import '../../widgets/legal_links_footer.dart';
import '../../widgets/personal_sponsor_support.dart';
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
  Country selectedCountry = Country.parse('EG');
  bool registration = false;
  bool agreed = false;
  bool loading = false;
  String? errorKey;
  final locationCatalog = LocationCatalogService();

  String get countryCode => '+${selectedCountry.phoneCode}';

  Future<void> showTerms() async {
    final accepted = await showModalBottomSheet<bool>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (sheetContext) => FractionallySizedBox(
        heightFactor: .82,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      sheetContext.tr('termsAndConditions'),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(sheetContext),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: SelectableText(
                  sheetContext.tr('registrationTermsText'),
                  style: const TextStyle(height: 1.65, fontSize: 13),
                ),
              ),
            ),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () => Navigator.pop(sheetContext, true),
                  icon: const Icon(Icons.check_circle_outline_rounded),
                  label: Text(sheetContext.tr('agreeAndClose')),
                ),
              ),
            ),
          ],
        ),
      ),
    );
    if (accepted == true && mounted) setState(() => agreed = true);
  }

  Future<void> selectCountry() async {
    try {
      final countries = await locationCatalog.countries();
      if (!mounted || countries.isEmpty) return;
      final selected = await showModalBottomSheet<Country>(
        context: context,
        useSafeArea: true,
        isScrollControlled: true,
        showDragHandle: true,
        builder: (sheetContext) {
          var query = '';
          return StatefulBuilder(
            builder: (context, setSheetState) {
              final languageCode = Localizations.localeOf(context).languageCode;
              final filtered = countries.where((country) {
                final text = '${country.name} ${country.nameAr ?? ''} ${country.iso2} ${country.phoneCode ?? ''}'
                    .toLowerCase();
                return text.contains(query.toLowerCase());
              }).toList(growable: false);
              return FractionallySizedBox(
                heightFactor: .82,
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                      child: TextField(
                        autofocus: true,
                        decoration: InputDecoration(
                          labelText: context.tr('searchCountry'),
                          hintText: context.tr('searchCountryHint'),
                          prefixIcon: const Icon(Icons.search_rounded),
                        ),
                        onChanged: (value) => setSheetState(() => query = value.trim()),
                      ),
                    ),
                    Expanded(
                      child: ListView.builder(
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final item = filtered[index];
                          final parsed = Country.tryParse(item.iso2);
                          if (parsed == null) return const SizedBox.shrink();
                          final localizedName = languageCode == 'ar' && item.nameAr?.isNotEmpty == true
                              ? item.nameAr!
                              : item.name;
                          return ListTile(
                            leading: Text(item.flagEmoji ?? parsed.flagEmoji, style: const TextStyle(fontSize: 26)),
                            title: Text(localizedName),
                            subtitle: Text(item.iso2),
                            trailing: Text(item.phoneCode ?? '+${parsed.phoneCode}'),
                            onTap: () => Navigator.pop(context, parsed),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              );
            },
          );
        },
      );
      if (selected != null && mounted) setState(() => selectedCountry = selected);
      return;
    } catch (_) {
      // Keep authentication available while the remote catalogue is offline.
    }
    if (!mounted) return;
    showCountryPicker(
      context: context,
      showPhoneCode: true,
      favorite: const ['EG', 'QA', 'SA', 'AE'],
      countryListTheme: CountryListThemeData(
        flagSize: 28,
        bottomSheetHeight: MediaQuery.sizeOf(context).height * .78,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        inputDecoration: InputDecoration(
          labelText: context.tr('searchCountry'),
          hintText: context.tr('searchCountryHint'),
          prefixIcon: const Icon(Icons.search_rounded),
        ),
      ),
      onSelect: (country) => setState(() => selectedCountry = country),
    );
  }

  Future<void> submit() async {
    final phoneValidation = ContactValidator.phoneForCountry(
      input: phone.text,
      callingCode: selectedCountry.phoneCode,
      example: selectedCountry.example,
    );
    if (!phoneValidation.isValid) {
      setState(() => errorKey = phoneValidation.errorKey);
      return;
    }
    if (registration && name.text.trim().length < 3) {
      setState(() => errorKey = 'nameRequired');
      return;
    }
    if (registration && !agreed) {
      setState(() => errorKey = 'termsRequired');
      return;
    }

    setState(() {
      loading = true;
      errorKey = null;
    });
    try {
      final accountStatus = await widget.authService.sendOtp(
        phone: phoneValidation.value!,
        registration: registration,
        expectedAccountType: widget.accountType,
        name: name.text.trim(),
      );
      if (!mounted) return;
      final result = await Navigator.of(context).push<AuthResult>(
        MaterialPageRoute(
          builder: (_) => OtpScreen(
            phone: phoneValidation.value!,
            registration: registration,
            accountType: registration
                ? widget.accountType
                : (accountStatus.accountType ?? widget.accountType),
            name: name.text.trim(),
            authService: widget.authService,
          ),
        ),
      );
      if (result != null) widget.onAuthenticated(result);
    } catch (exception) {
      setState(() => errorKey = context.errorTranslationKey(exception));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: const PersonalSponsorSupportButton(),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 104),
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
                  errorKey = null;
                });
              },
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                AccountTypeFootballIcon(type: widget.accountType, size: 48),
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
                  width: 128,
                  child: InkWell(
                    onTap: selectCountry,
                    borderRadius: BorderRadius.circular(16),
                    child: InputDecorator(
                      decoration: InputDecoration(
                        labelText: context.tr('countryCode'),
                        contentPadding: const EdgeInsetsDirectional.fromSTEB(
                          12,
                          18,
                          8,
                          18,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            selectedCountry.flagEmoji,
                            style: const TextStyle(fontSize: 21),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              countryCode,
                              textDirection: TextDirection.ltr,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          const Icon(Icons.expand_more_rounded, size: 18),
                        ],
                      ),
                    ),
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
                      hintText: selectedCountry.example.isNotEmpty
                          ? selectedCountry.example
                          : '1012345678',
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
                title: Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      '${context.tr('agreeTo')} ',
                      style: const TextStyle(fontSize: 13),
                    ),
                    InkWell(
                      onTap: showTerms,
                      child: Text(
                        context.tr('termsAndConditions'),
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (errorKey != null) ...[
              const SizedBox(height: 8),
              Text(
                context.tr(errorKey!),
                style: const TextStyle(color: Colors.red),
              ),
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
            const FreeAccountsBanner(),
            LegalLinksFooter(onTerms: showTerms),
            const CompanyFooter(),
          ],
        ),
      ),
    );
  }
}
