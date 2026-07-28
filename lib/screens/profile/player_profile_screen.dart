import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/account_type.dart';
import '../../models/user_profile.dart';
import '../../services/data_service.dart';

class PlayerProfileScreen extends StatefulWidget {
  const PlayerProfileScreen({super.key, required this.dataService});

  final DataService dataService;

  @override
  State<PlayerProfileScreen> createState() => _PlayerProfileScreenState();
}

class _PlayerProfileScreenState extends State<PlayerProfileScreen> {
  late Future<UserProfile> future;

  @override
  void initState() {
    super.initState();
    future = widget.dataService.fetchProfile(AccountType.player);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<UserProfile>(
      future: future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return _ProfileError(
            message: context.errorText(snapshot.error),
            onRetry: () => setState(
              () =>
                  future = widget.dataService.fetchProfile(AccountType.player),
            ),
          );
        }
        return _ProfileForm(
          profile: snapshot.data!,
          dataService: widget.dataService,
          onSaved: (updated) => setState(() => future = Future.value(updated)),
        );
      },
    );
  }
}

class _ProfileForm extends StatefulWidget {
  const _ProfileForm({
    required this.profile,
    required this.dataService,
    required this.onSaved,
  });

  final UserProfile profile;
  final DataService dataService;
  final ValueChanged<UserProfile> onSaved;

  @override
  State<_ProfileForm> createState() => _ProfileFormState();
}

class _ProfileFormState extends State<_ProfileForm> {
  final formKey = GlobalKey<FormState>();
  final controllers = <String, TextEditingController>{};
  bool saving = false;

  static const listFields = {
    'languages',
    'courses',
    'club_history',
    'achievements',
    'surgeries_list',
    'allergies_list',
    'medications',
    'injuries',
    'images',
    'objectives',
    'social_links',
    'documents',
    'contract_history',
    'agent_history',
    'private_coaches',
    'academies',
  };

  @override
  void initState() {
    super.initState();
    for (final section in profileSections) {
      for (final field in section.fields) {
        final value = widget.profile.values[field.key];
        controllers[field.key] = TextEditingController(
          text: value is List
              ? value.map(_displayListItem).join('\n')
              : '${value ?? ''}',
        );
      }
    }
  }

  String _displayListItem(Object? item) {
    if (item is Map) {
      return '${item['name'] ?? item['title'] ?? item['url'] ?? item}';
    }
    return '$item';
  }

  Map<String, dynamic> collectUpdates() {
    final result = <String, dynamic>{};
    for (final entry in controllers.entries) {
      final value = entry.value.text.trim();
      if (listFields.contains(entry.key)) {
        result[entry.key] = value
            .split(RegExp(r'[\n,]'))
            .map((item) => item.trim())
            .where((item) => item.isNotEmpty)
            .toList();
      } else if (_numericFields.contains(entry.key)) {
        result[entry.key] = num.tryParse(value);
      } else if (_booleanFields.contains(entry.key)) {
        result[entry.key] =
            value.toLowerCase() == 'true' ||
            value.toLowerCase() == context.tr('yes').toLowerCase();
      } else {
        result[entry.key] = value;
      }
    }
    result['full_name'] = result['name'];
    return result;
  }

  Future<void> save() async {
    if (!formKey.currentState!.validate()) return;
    setState(() => saving = true);
    try {
      final updates = collectUpdates();
      await widget.dataService.savePlayerProfile(widget.profile, updates);
      final updated = UserProfile(
        userId: widget.profile.userId,
        accountType: widget.profile.accountType,
        values: widget.profile.mergeUpdates(updates),
      );
      widget.onSaved(updated);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(context.tr('profileSaved'))));
    } catch (exception) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('$exception')));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  void dispose() {
    for (final controller in controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Row(
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: AppColors.navy.withValues(alpha: .08),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.person, size: 38),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          controllers['name']?.text.isNotEmpty == true
                              ? controllers['name']!.text
                              : context.tr('playerProfile'),
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          context.tr('profileSubtitle'),
                          style: const TextStyle(
                            color: AppColors.muted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.sync, color: AppColors.green),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      context.tr('preserveFields'),
                      style: const TextStyle(fontSize: 12, height: 1.5),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          ...profileSections.map(
            (section) => Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ExpansionTile(
                initiallyExpanded: section == profileSections.first,
                leading: Icon(section.icon, color: AppColors.green),
                title: Text(
                  context.trOr(
                    'profile.section.${section.fields.first.key}',
                    section.title,
                  ),
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 16),
                children: section.fields
                    .map(
                      (field) => Padding(
                        padding: const EdgeInsets.only(top: 11),
                        child: TextFormField(
                          controller: controllers[field.key],
                          keyboardType: field.keyboardType,
                          maxLines: field.multiline ? 3 : 1,
                          textDirection:
                              field.keyboardType == TextInputType.url ||
                                  field.keyboardType ==
                                      TextInputType.emailAddress
                              ? TextDirection.ltr
                              : null,
                          decoration: InputDecoration(
                            labelText: context.trOr(
                              'profile.field.${field.key}',
                              field.label,
                            ),
                            helperText: field.helper == null
                                ? null
                                : context.trOr(
                                    'profile.helper.${field.key}',
                                    field.helper!,
                                  ),
                          ),
                          validator: field.required
                              ? (value) => value == null || value.trim().isEmpty
                                    ? context.tr('requiredField')
                                    : null
                              : null,
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
          ),
          FilledButton.icon(
            onPressed: saving ? null : save,
            icon: saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.save_outlined),
            label: Text(context.tr(saving ? 'saving' : 'saveAll')),
          ),
        ],
      ),
    );
  }
}

class _ProfileError extends StatelessWidget {
  const _ProfileError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.person_off_outlined, size: 48),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: Text(context.tr('retry'))),
          ],
        ),
      ),
    );
  }
}

class ProfileSection {
  const ProfileSection(this.title, this.icon, this.fields);

  final String title;
  final IconData icon;
  final List<ProfileField> fields;
}

class ProfileField {
  const ProfileField(
    this.key,
    this.label, {
    this.required = false,
    this.multiline = false,
    this.keyboardType = TextInputType.text,
    this.helper,
  });

  final String key;
  final String label;
  final bool required;
  final bool multiline;
  final TextInputType keyboardType;
  final String? helper;
}

const _numericFields = {
  'height',
  'weight',
  'shoe_size',
  'stats_pace',
  'stats_shooting',
  'stats_passing',
  'stats_dribbling',
  'stats_defending',
  'stats_physical',
  'skill_moves',
  'weak_foot',
  'mentality_leadership',
  'mentality_teamwork',
  'mentality_vision',
  'mentality_aggression',
  'mentality_composure',
};

const _booleanFields = {'has_private_coach', 'has_joined_academy'};

const profileSections = [
  ProfileSection('البيانات الشخصية', Icons.person_outline, [
    ProfileField('name', 'الاسم الكامل', required: true),
    ProfileField('birth_date', 'تاريخ الميلاد'),
    ProfileField('gender', 'الجنس'),
    ProfileField('nationality', 'الجنسية'),
    ProfileField('country', 'الدولة'),
    ProfileField('city', 'المدينة'),
    ProfileField('phone', 'رقم الهاتف', keyboardType: TextInputType.phone),
    ProfileField(
      'email',
      'البريد الإلكتروني',
      keyboardType: TextInputType.emailAddress,
    ),
    ProfileField('whatsapp', 'WhatsApp', keyboardType: TextInputType.phone),
    ProfileField('address', 'العنوان', multiline: true),
  ]),
  ProfileSection('التعليم واللغات', Icons.school_outlined, [
    ProfileField('education_level', 'المستوى التعليمي'),
    ProfileField('school_name', 'اسم المدرسة'),
    ProfileField('graduation_year', 'سنة التخرج'),
    ProfileField('university_name', 'الجامعة'),
    ProfileField(
      'languages',
      'اللغات',
      multiline: true,
      helper: 'كل عنصر في سطر',
    ),
    ProfileField(
      'courses',
      'الدورات',
      multiline: true,
      helper: 'كل دورة في سطر',
    ),
  ]),
  ProfileSection('المسيرة الرياضية', Icons.sports_soccer, [
    ProfileField('position', 'المركز الأساسي', required: true),
    ProfileField('detailed_position', 'المركز التفصيلي'),
    ProfileField('secondary_position', 'المركز الثانوي'),
    ProfileField('jersey_number', 'رقم القميص'),
    ProfileField('current_club', 'النادي الحالي'),
    ProfileField('contract_status', 'حالة العقد'),
    ProfileField('contract_end_date', 'نهاية العقد'),
    ProfileField('foot', 'القدم المفضلة'),
    ProfileField('club_history', 'تاريخ الأندية', multiline: true),
    ProfileField('achievements', 'الإنجازات', multiline: true),
  ]),
  ProfileSection('القياسات والمعدات', Icons.straighten, [
    ProfileField('height', 'الطول (سم)', keyboardType: TextInputType.number),
    ProfileField('weight', 'الوزن (كجم)', keyboardType: TextInputType.number),
    ProfileField(
      'shoe_size',
      'مقاس الحذاء',
      keyboardType: TextInputType.number,
    ),
    ProfileField('clothing_size', 'مقاس الملابس'),
  ]),
  ProfileSection('المهارات الرياضية', Icons.radar, [
    ProfileField(
      'stats_pace',
      'السرعة 0-99',
      keyboardType: TextInputType.number,
    ),
    ProfileField(
      'stats_shooting',
      'التسديد 0-99',
      keyboardType: TextInputType.number,
    ),
    ProfileField(
      'stats_passing',
      'التمرير 0-99',
      keyboardType: TextInputType.number,
    ),
    ProfileField(
      'stats_dribbling',
      'المراوغة 0-99',
      keyboardType: TextInputType.number,
    ),
    ProfileField(
      'stats_defending',
      'الدفاع 0-99',
      keyboardType: TextInputType.number,
    ),
    ProfileField(
      'stats_physical',
      'القوة البدنية 0-99',
      keyboardType: TextInputType.number,
    ),
    ProfileField(
      'skill_moves',
      'المهارات 1-5',
      keyboardType: TextInputType.number,
    ),
    ProfileField(
      'weak_foot',
      'القدم الضعيفة 1-5',
      keyboardType: TextInputType.number,
    ),
    ProfileField('work_rate_attack', 'معدل العمل الهجومي'),
    ProfileField('work_rate_defense', 'معدل العمل الدفاعي'),
  ]),
  ProfileSection('السمات الذهنية', Icons.psychology_outlined, [
    ProfileField(
      'mentality_leadership',
      'القيادة 0-99',
      keyboardType: TextInputType.number,
    ),
    ProfileField(
      'mentality_teamwork',
      'العمل الجماعي 0-99',
      keyboardType: TextInputType.number,
    ),
    ProfileField(
      'mentality_vision',
      'الرؤية 0-99',
      keyboardType: TextInputType.number,
    ),
    ProfileField(
      'mentality_aggression',
      'الحماس 0-99',
      keyboardType: TextInputType.number,
    ),
    ProfileField(
      'mentality_composure',
      'الهدوء 0-99',
      keyboardType: TextInputType.number,
    ),
  ]),
  ProfileSection('البيانات الطبية', Icons.medical_information_outlined, [
    ProfileField('blood_type', 'فصيلة الدم'),
    ProfileField('chronic_diseases', 'الأمراض المزمنة', multiline: true),
    ProfileField('surgeries_list', 'العمليات السابقة', multiline: true),
    ProfileField('allergies_list', 'الحساسية', multiline: true),
    ProfileField('medications', 'الأدوية', multiline: true),
    ProfileField('injuries', 'الإصابات', multiline: true),
    ProfileField('family_history', 'التاريخ العائلي', multiline: true),
    ProfileField('last_checkup', 'آخر فحص طبي'),
  ]),
  ProfileSection('التدريب والأكاديميات', Icons.fitness_center, [
    ProfileField(
      'has_private_coach',
      'لديه مدرب خاص؟',
      helper: 'اكتب نعم أو لا',
    ),
    ProfileField('private_coaches', 'المدربون الخاصون', multiline: true),
    ProfileField(
      'has_joined_academy',
      'سبق الانضمام لأكاديمية؟',
      helper: 'اكتب نعم أو لا',
    ),
    ProfileField('academies', 'الأكاديميات', multiline: true),
  ]),
  ProfileSection('السيرة والاحتراف', Icons.badge_outlined, [
    ProfileField('bio', 'نبذة اللاعب', multiline: true),
    ProfileField('objectives', 'الأهداف الرياضية', multiline: true),
    ProfileField('agent_name', 'اسم الوكيل'),
    ProfileField(
      'agent_phone',
      'هاتف الوكيل',
      keyboardType: TextInputType.phone,
    ),
    ProfileField(
      'transfermarkt_url',
      'رابط Transfermarkt',
      keyboardType: TextInputType.url,
    ),
    ProfileField('instagram_handle', 'Instagram'),
    ProfileField('social_links', 'روابط التواصل', multiline: true),
    ProfileField('contract_history', 'سجل العقود', multiline: true),
    ProfileField('agent_history', 'سجل الوكلاء', multiline: true),
  ]),
  ProfileSection('الوسائط والمستندات', Icons.perm_media_outlined, [
    ProfileField(
      'image',
      'رابط الصورة الشخصية',
      keyboardType: TextInputType.url,
    ),
    ProfileField(
      'images',
      'معرض الصور',
      multiline: true,
      helper: 'رابط في كل سطر',
    ),
    ProfileField(
      'documents',
      'المستندات',
      multiline: true,
      helper: 'رابط في كل سطر',
    ),
  ]),
];
