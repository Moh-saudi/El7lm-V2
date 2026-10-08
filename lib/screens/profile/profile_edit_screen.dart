import 'dart:convert';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:country_picker/country_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/user_profile.dart';
import '../../services/data_service.dart';
import '../../services/profile_answer_validator.dart';
import 'player_profile_data.dart';

/// A standalone screen for editing all profile fields (tabs + fields).
/// Opened via Navigator.push from [PlayerProfileScreen].
class ProfileEditScreen extends StatefulWidget {
  const ProfileEditScreen({
    super.key,
    required this.profile,
    required this.dataService,
    required this.onSaved,
  });

  final UserProfile profile;
  final DataService dataService;
  final ValueChanged<UserProfile> onSaved;

  @override
  State<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends State<ProfileEditScreen>
    with SingleTickerProviderStateMixin {
  final formKey = GlobalKey<FormState>();
  final controllers = <String, TextEditingController>{};
  final _initialControllerValues = <String, String>{};
  final _initialRawValues = <String, dynamic>{};

  static const _structuredProfileFields = {
    'languages',
    'courses',
    'club_history',
    'achievements',
    'allergies_list',
    'surgeries_list',
    'medications',
    'injuries',
    'family_history',
    'private_coaches',
    'academies',
    'social_links',
  };

  bool saving = false;
  late final List<ProfileSection> _sections;
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _sections = getProfileSections();
    _tabController = TabController(length: _sections.length, vsync: this);
    _initControllers();
  }

  @override
  void didUpdateWidget(covariant ProfileEditScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.profile != widget.profile) {
      _initControllers();
    }
  }

  bool _isNonEmpty(dynamic val) {
    if (val == null) return false;
    final str = '$val'.trim();
    return str.isNotEmpty && str != 'null';
  }

  bool _isValidPhone(dynamic val) {
    if (val == null) return false;
    final str = '$val'.trim();
    if (str.isEmpty || str == 'null' || str.toLowerCase().contains('test')) {
      return false;
    }
    final digits = str.replaceAll(RegExp(r'\D'), '');
    return digits.length >= 7;
  }

  dynamic _getRawValue(String fieldKey) {
    if (fieldKey == 'phone') {
      var val = widget.profile.values['phone'];
      if (_isValidPhone(val)) return val;

      final phoneAliases = [
        'phoneNumber',
        'mobile',
        'telephone',
        'phone_number',
        'user_phone',
      ];
      for (final alias in phoneAliases) {
        val = widget.profile.values[alias];
        if (_isValidPhone(val)) return val;
      }

      try {
        final authUser = Supabase.instance.client.auth.currentUser;
        final authPhone = authUser?.phone ?? authUser?.userMetadata?['phone'];
        if (_isValidPhone(authPhone)) return '$authPhone'.trim();
      } catch (_) {}

      final digits = widget.profile.userId.replaceAll(RegExp(r'\D'), '');
      if (digits.length >= 9) return digits;
      return null;
    }

    var val = widget.profile.values[fieldKey];
    if (_isNonEmpty(val)) return val;

    final aliases = <String, List<String>>{
      'name': ['full_name', 'displayName', 'player_name', 'username'],
      'phone': ['phoneNumber', 'mobile', 'telephone', 'phone_number'],
      'email': ['emailAddress', 'mail'],
      'brief': ['bio', 'about', 'overview', 'description'],
      'height': ['height_cm', 'stature'],
      'weight': ['weight_kg', 'mass'],
      'position': ['primary_position', 'main_position', 'pos'],
      'secondary_position': ['alt_position', 'secondaryPosition'],
      'contract_status': ['contractStatus', 'status'],
      'guardian_name': ['guardianName', 'parent_name'],
      'guardian_phone': ['guardianPhone', 'parent_phone'],
    };

    final list = aliases[fieldKey];
    if (list != null) {
      for (final alias in list) {
        val = widget.profile.values[alias];
        if (_isNonEmpty(val)) return val;
      }
    }

    if (fieldKey == 'guardian_name' || fieldKey == 'guardian_phone') {
      final consentRaw = widget.profile.values['parental_consent'];
      if (consentRaw is Map) {
        val = consentRaw[fieldKey];
        if (_isNonEmpty(val)) return val;
      } else if (consentRaw is String && consentRaw.trim().isNotEmpty) {
        try {
          final decoded = jsonDecode(consentRaw);
          if (decoded is Map) {
            val = decoded[fieldKey];
            if (_isNonEmpty(val)) return val;
          }
        } catch (_) {}
      }
    }

    return null;
  }

  void _initControllers() {
    for (final section in _sections) {
      for (final field in section.fields) {
        var value = _getRawValue(field.key);
        _initialRawValues[field.key] = value;
        if (value is Map) {
          value =
              value['url'] ??
              value['path'] ??
              value['src'] ??
              value['uri'] ??
              value['name'] ??
              '';
        }
        final text = value is List
            ? value.map(_displayListItem).join('\n')
            : '${value ?? ''}';

        if (controllers.containsKey(field.key)) {
          controllers[field.key]!.text = text;
        } else {
          controllers[field.key] = TextEditingController(text: text);
        }
        _initialControllerValues[field.key] = text;
      }
    }
  }

  String _displayListItem(Object? item) {
    if (item is Map) {
      return '${item['name'] ?? item['title'] ?? item['club_name'] ?? item['club'] ?? item['language'] ?? item['injury_type'] ?? item['allergen'] ?? item['procedure'] ?? item['condition'] ?? item['url'] ?? item}';
    }
    return '$item';
  }

  @override
  void dispose() {
    _tabController.dispose();
    for (final c in controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  bool _isFieldApplicable(ProfileField field) {
    final level = controllers['education_level']?.text.trim() ?? '';
    if (field.key == 'school_name') return educationUsesSchool(level);
    if (field.key == 'university_name') return educationUsesUniversity(level);
    return true;
  }

  Future<void> _pickProfileDate(BuildContext context, String key) async {
    DateTime? initial;
    try {
      if (controllers[key]!.text.isNotEmpty) {
        initial = DateTime.parse(controllers[key]!.text);
      }
    } catch (_) {}
    final isContractDate = key == 'contract_end_date';
    final today = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial ?? (isContractDate ? today : DateTime(2000)),
      firstDate: isContractDate ? today : DateTime(1950),
      lastDate: isContractDate ? DateTime(today.year + 50) : today,
      locale: Localizations.localeOf(context),
      builder: (context, child) => Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(
            maxWidth: 360,
            maxHeight: 520,
          ),
          child: child!,
        ),
      ),
    );
    if (picked != null && mounted) {
      setState(() {
        controllers[key]!.text =
            '${picked.year.toString().padLeft(4, '0')}-'
            '${picked.month.toString().padLeft(2, '0')}-'
            '${picked.day.toString().padLeft(2, '0')}';
      });
    }
  }

  bool _hasUnsavedChanges() {
    for (final e in controllers.entries) {
      if (e.value.text.trim() !=
          (_initialControllerValues[e.key] ?? '').trim()) {
        return true;
      }
    }
    return false;
  }

  Future<void> _showDiscardDialog() async {
    final discard = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(ctx.tr('discardChanges')),
        content: Text(ctx.tr('discardChangesConfirm')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(ctx.tr('cancel')),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              ctx.tr('discard'),
              style: const TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
    if (discard == true && mounted) Navigator.of(context).pop();
  }

  Future<void> save() async {
    if (!formKey.currentState!.validate()) return;
    try {
      final updates = collectUpdates();
      if (updates.isEmpty) {
        Navigator.of(context).pop();
        return;
      }
      setState(() => saving = true);
      await widget.dataService.savePlayerProfile(
        widget.profile,
        updates,
        strict: true,
      );
      if (!mounted) return;
      final updated = UserProfile(
        userId: widget.profile.userId,
        accountType: widget.profile.accountType,
        values: widget.profile.mergeUpdates(updates),
      );
      widget.onSaved(updated);
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(_localizedSaveError(e))));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Map<String, dynamic> collectUpdates() {
    final res = <String, dynamic>{};
    for (final e in controllers.entries) {
      final key = e.key;
      final text = e.value.text.trim();
      if (text == (_initialControllerValues[key] ?? '').trim()) continue;

      if (_editBooleanFields.contains(key)) {
        res[key] = text.toLowerCase() == 'true';
      } else if (_editNumericFields.contains(key)) {
        res[key] = text.isEmpty
            ? null
            : num.parse(ProfileAnswerValidator.normalizeDigits(text));
      } else if (_structuredProfileFields.contains(key)) {
        res[key] = _serializeStructuredValue(key, text);
      } else {
        res[key] = text;
      }
    }
    return res;
  }

  String _localizedSaveError(Object error) {
    if (error is FormatException) return context.tr(error.message);
    return context.errorText(error);
  }

  dynamic _serializeStructuredValue(String key, String text) {
    final lines = text
        .split(RegExp(r'\r?\n'))
        .map((line) => line.trim())
        .where((line) => line.isNotEmpty)
        .toList();
    final original = _initialRawValues[key];
    if (original is List && original.every((item) => item is Map)) {
      final valueKey = _structuredValueKey(key);
      return List<dynamic>.generate(lines.length, (index) {
        final previous = index < original.length
            ? Map<String, dynamic>.from(original[index] as Map)
            : <String, dynamic>{};
        previous[valueKey] = lines[index];
        return previous;
      });
    }
    return lines;
  }

  String _structuredValueKey(String key) => switch (key) {
    'club_history' => 'club_name',
    'languages' => 'language',
    'achievements' => 'title',
    'injuries' => 'injury_type',
    _ => 'name',
  };

  double _numericMax(String key) => switch (key) {
    'height' => 230,
    'weight' => 180,
    'weak_foot' || 'skill_moves' => 5,
    'shoe_size' => 60,
    'jersey_number' => 99,
    'hours_per_week' => 168,
    'market_value' => 1000000000,
    'caps' || 'goals' || 'assists' => 100000,
    _ => 100,
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        scrolledUnderElevation: 1,
        title: Text(
          context.tr('editPlayerData'),
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w900,
            color: AppColors.navy,
          ),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: () {
            if (_hasUnsavedChanges()) {
              _showDiscardDialog();
            } else {
              Navigator.of(context).pop();
            }
          },
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            child: FilledButton(
              onPressed: saving ? null : save,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.green,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 14),
                elevation: 0,
              ),
              child: saving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(
                      context.tr('saveAll'),
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                      ),
                    ),
            ),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: _buildTabBar(context),
        ),
      ),
      bottomNavigationBar: _buildAppleBottomBar(context),
      body: Form(
        key: formKey,
        child: TabBarView(
          controller: _tabController,
          children: _sections.map((s) {
            return ListView(
              key: PageStorageKey<String>('edit_section_${s.key}'),
              physics: const AlwaysScrollableScrollPhysics(
                parent: ClampingScrollPhysics(),
              ),
              keyboardDismissBehavior:
                  ScrollViewKeyboardDismissBehavior.onDrag,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              children: _buildSectionFields(context, s),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildTabBar(BuildContext context) {
    return Container(
      height: 58,
      margin: const EdgeInsets.symmetric(vertical: 2),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: .04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: TabBar(
        controller: _tabController,
        isScrollable: true,
        tabAlignment: TabAlignment.start,
        dividerColor: Colors.transparent,
        indicatorSize: TabBarIndicatorSize.tab,
        indicatorPadding: const EdgeInsets.symmetric(
          vertical: 6,
          horizontal: 4,
        ),
        indicator: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: const LinearGradient(
            colors: [AppColors.green, Color(0xFF059669)],
          ),
          boxShadow: [
            BoxShadow(
              color: AppColors.green.withValues(alpha: .4),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        labelColor: Colors.white,
        unselectedLabelColor: const Color(0xFF64748B),
        labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
        unselectedLabelStyle: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        tabs: _sections.map((s) {
          return Tab(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(s.icon, size: 16),
                  const SizedBox(width: 6),
                  Text(context.tr(s.title)),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  List<Widget> _buildSectionFields(
    BuildContext context,
    ProfileSection section,
  ) {
    return [
      // Section Header Card
      Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppColors.green.withValues(alpha: .08),
              AppColors.navy.withValues(alpha: .04),
            ],
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.green.withValues(alpha: .2)),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.green.withValues(alpha: .15),
              child: Icon(section.icon, color: AppColors.green, size: 20),
            ),
            const SizedBox(width: 12),
            Text(
              context.tr(section.title),
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w900,
                color: AppColors.navy,
              ),
            ),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: .12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                context.tr('profileEditMode'),
                style: const TextStyle(
                  fontSize: 10,
                  color: Color(0xFF10B981),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
      // Fields
      ...section.fields
          .where(_isFieldApplicable)
          .map((f) => _buildField(context, f)),
    ];
  }

  Widget _buildField(BuildContext context, ProfileField field) {
    final label = context.tr(field.label);
    final ctrl = controllers[field.key]!;

    if (_editBooleanFields.contains(field.key)) {
      final isTrue =
          ctrl.text.toLowerCase() == 'true' || ctrl.text == context.tr('yes');
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: InputDecorator(
          decoration: InputDecoration(
            labelText: label,
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 8,
            ),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<bool>(
              value: isTrue,
              isExpanded: true,
              items: [
                DropdownMenuItem(value: true, child: Text(context.tr('yes'))),
                DropdownMenuItem(value: false, child: Text(context.tr('no'))),
              ],
              onChanged: (v) =>
                    setState(() => ctrl.text = v == true ? 'true' : 'false'),
            ),
          ),
        ),
      );
    }

    if (field.key == 'country' || field.key == 'nationality') {
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () {
            showCountryPicker(
              context: context,
              showPhoneCode: false,
              countryFilter: supportedCountryIsoCodes,
              countryListTheme: CountryListThemeData(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(24),
                ),
                bottomSheetHeight: MediaQuery.sizeOf(context).height * .72,
              ),
              onSelect: (country) {
                setState(() {
                  ctrl.text = canonicalCountryStorageValue(country.countryCode);
                  controllers['city']?.clear();
                });
              },
            );
          },
          child: InputDecorator(
            decoration: InputDecoration(
              labelText: label,
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.public_rounded, color: AppColors.green),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    ctrl.text.isEmpty
                        ? context.tr('selectCountry')
                        : localizedProfileOptionLabel(
                            context,
                            field.key,
                            ctrl.text,
                          ),
                  ),
                ),
                const Icon(Icons.arrow_drop_down_rounded),
              ],
            ),
          ),
        ),
      );
    }

    if (field.key == 'city') {
      final cities = citiesForCountry(controllers['country']?.text ?? '');
      if (cities.isNotEmpty) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: DropdownButtonFormField<String>(
            initialValue: cities.contains(ctrl.text) ? ctrl.text : null,
            isExpanded: true,
            decoration: InputDecoration(
              labelText: label,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            items: cities
                .map(
                  (city) => DropdownMenuItem(
                    value: city,
                    child: Text(localizedCityLabel(context, city)),
                  ),
                )
                .toList(),
            onChanged: (value) => setState(() => ctrl.text = value ?? ''),
          ),
        );
      }
    }

    if (field.options != null) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: InputDecorator(
          decoration: InputDecoration(
            labelText: label,
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 8,
            ),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: field.options!.contains(ctrl.text) ? ctrl.text : null,
              isExpanded: true,
              items: field.options!
                  .map(
                    (o) => DropdownMenuItem(
                      value: o,
                      child: Text(
                        localizedProfileOptionLabel(context, field.key, o),
                      ),
                    ),
                  )
                  .toList(),
              onChanged: (v) => setState(() => ctrl.text = v ?? ''),
            ),
          ),
        ),
      );
    }

    if (field.isSlider) {
      final val = double.tryParse(ctrl.text) ?? 50.0;
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: InputDecorator(
          decoration: InputDecoration(
            labelText: label,
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  const Spacer(),
                  Text(
                    val.toInt().toString(),
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: AppColors.green,
                    ),
                  ),
                ],
              ),
              Slider(
                value: val.clamp(0, 99),
                min: 0,
                max: 99,
                divisions: 99,
                activeColor: AppColors.green,
                onChanged: (v) =>
                      setState(() => ctrl.text = v.toInt().toString()),
              ),
            ],
          ),
        ),
      );
    }

    if (field.isStar) {
      final val = int.tryParse(ctrl.text) ?? 1;
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: InputDecorator(
          decoration: InputDecoration(
            labelText: label,
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
          ),
          child: Row(
            children: List.generate(
              5,
              (i) => IconButton(
                icon: Icon(
                  i < val ? Icons.star : Icons.star_border,
                  color: AppColors.green,
                ),
                onPressed: () =>
                      setState(() => ctrl.text = (i + 1).toString()),
              ),
            ),
          ),
        ),
      );
    }

    if (field.key == 'birth_date' || field.key == 'contract_end_date') {
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: InkWell(
          onTap: () => _pickProfileDate(context, field.key),
          borderRadius: BorderRadius.circular(12),
          child: InputDecorator(
            decoration: InputDecoration(
              labelText: label,
              filled: true,
              fillColor: Colors.white,
              suffixIcon: const Icon(
                Icons.calendar_today_rounded,
                color: AppColors.green,
                size: 20,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: AppColors.green.withValues(alpha: .5),
                ),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: AppColors.green.withValues(alpha: .4),
                ),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 12,
              ),
            ),
            child: Text(
              ctrl.text.isNotEmpty ? ctrl.text : '',
              style: TextStyle(
                color: ctrl.text.isNotEmpty ? null : Colors.grey[400],
              ),
            ),
          ),
        ),
      );
    }

    // Default text field
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: ctrl,
        enabled: true,
        maxLines: field.multiline ? 3 : 1,
        keyboardType: _editNumericFields.contains(field.key)
            ? TextInputType.number
            : field.key == 'phone' ||
                  field.key == 'whatsapp' ||
                  field.key == 'guardian_phone'
            ? TextInputType.phone
            : field.key == 'email'
            ? TextInputType.emailAddress
            : TextInputType.text,
        validator: (value) {
          if (field.required && (value == null || value.trim().isEmpty)) {
            return context.tr('requiredField');
          }
          if (value != null && value.trim().isNotEmpty) {
            if (_editNumericFields.contains(field.key)) {
              final number = num.tryParse(
                ProfileAnswerValidator.normalizeDigits(value.trim()),
              );
              if (number == null ||
                  number < 0 ||
                  number > _numericMax(field.key)) {
                return context.tr('profileChatInvalidNumber');
              }
            } else {
              final validation = ProfileAnswerValidator.validate(
                key: field.key,
                rawValue: value,
                fieldType: 'text',
                languageCode: Localizations.localeOf(context).languageCode,
                registeredPhone:
                    '${_getRawValue('phone') ?? widget.profile.values['phone'] ?? ''}',
                enforceSelectedScript: false,
              );
              if (!validation.isValid) {
                return context.tr(validation.errorKey!);
              }
            }
            if (field.key == 'height') {
              final h = num.tryParse(
                ProfileAnswerValidator.normalizeDigits(value),
              );
              if (h == null || h < 100 || h > 230) {
                return context.tr('profileHeightRange');
              }
            } else if (field.key == 'weight') {
              final w = num.tryParse(
                ProfileAnswerValidator.normalizeDigits(value),
              );
              if (w == null || w < 30 || w > 180) {
                return context.tr('profileWeightRange');
              }
            } else if (field.key == 'market_value') {
              final v = num.tryParse(
                ProfileAnswerValidator.normalizeDigits(value),
              );
              if (v == null || v < 0) return context.tr('requiredField');
            }
          }
          return null;
        },
        decoration: InputDecoration(
          labelText: label,
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey[300]!),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: AppColors.green.withValues(alpha: .3)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.green, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 12,
          ),
        ),
      ),
    );
  }

  Widget _buildAppleBottomBar(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(
            top: BorderSide(
              color: const Color(0xFF0F172A).withValues(alpha: 0.08),
              width: 1,
            ),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: SizedBox(
          width: double.infinity,
          height: 50,
          child: FilledButton.icon(
            onPressed: saving ? null : save,
            icon: saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(CupertinoIcons.checkmark_alt_circle_fill, size: 20),
            label: Text(
              saving ? context.tr('saving') : context.tr('saveAll'),
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.2,
              ),
            ),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.green,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

const _editNumericFields = {
  'height',
  'weight',
  'jersey_number',
  'shoe_size',
  'caps',
  'goals',
  'assists',
  'stats_pace',
  'stats_shooting',
  'stats_passing',
  'stats_dribbling',
  'stats_defending',
  'stats_physical',
  'weak_foot',
  'skill_moves',
  'hours_per_week',
  'market_value',
  'mentality_leadership',
  'mentality_composure',
  'mentality_aggression',
  'mentality_vision',
  'mentality_teamwork',
};

const _editBooleanFields = {'has_private_coach', 'has_joined_academy'};
