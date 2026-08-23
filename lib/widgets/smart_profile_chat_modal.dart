import 'package:country_picker/country_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../core/app_theme.dart';
import '../l10n/app_localizations.dart';
import '../models/user_profile.dart';
import '../screens/profile/player_profile_data.dart';
import '../services/data_service.dart';
import '../services/profile_answer_validator.dart';

/// Interactive AI Scout Assistant modal for 9-section player profile completion.
/// Prompts strictly fetch the exact translated titles from ar.json / en.json / es.json / pt.json via context.tr()
/// and enforce strict validation on all numerical, contact, date, and text fields.
class SmartProfileChatModal extends StatefulWidget {
  const SmartProfileChatModal({
    super.key,
    required this.profile,
    required this.dataService,
    required this.onProfileUpdated,
  });

  final UserProfile profile;
  final DataService dataService;
  final ValueChanged<UserProfile> onProfileUpdated;

  static Future<void> show(
    BuildContext context, {
    required UserProfile profile,
    required DataService dataService,
    required ValueChanged<UserProfile> onProfileUpdated,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => SmartProfileChatModal(
        profile: profile,
        dataService: dataService,
        onProfileUpdated: onProfileUpdated,
      ),
    );
  }

  @override
  State<SmartProfileChatModal> createState() => _SmartProfileChatModalState();
}

enum _FieldType { choice, slider, star, date, text, number }

enum _QuestionMode { essentials, complete }

class _ChatQuestion {
  const _ChatQuestion({
    required this.key,
    required this.sectionKey,
    required this.labelKey,
    required this.type,
    this.options,
    this.labelFor,
    this.min = 0,
    this.max = 100,
    this.unit = '',
    this.presetChipsAr,
    this.presetChipsEn,
  });

  final String key;
  final String sectionKey;
  final String labelKey;
  final _FieldType type;
  final List<String>? options;
  final String Function(String code)? labelFor;
  final double min;
  final double max;
  final String unit;
  final List<String>? presetChipsAr;
  final List<String>? presetChipsEn;

  /// Returns 100% exact label from ar.json / en.json / es.json / pt.json
  String getExactLabel(BuildContext context) {
    return context.tr(labelKey);
  }

  String promptFor(BuildContext context) {
    final title = getExactLabel(context);
    final lang = Localizations.localeOf(context).languageCode;
    switch (lang) {
      case 'es':
        return '[$title] - Por favor, proporciona tu respuesta ⚽';
      case 'pt':
        return '[$title] - Por favor, indica a tua resposta ⚽';
      case 'fr':
        return '[$title] - Veuillez préciser cette information ⚽';
      case 'en':
        return '[$title] - Please specify this detail ⚽';
      default:
        return '[$title]: يرجى تحديث أو إدخال هذا البيان ⚽';
    }
  }
}

class _ChatMessage {
  _ChatMessage({
    required this.text,
    required this.isUser,
    this.isError = false,
    this.questionKey,
  });

  final String text;
  final bool isUser;
  final bool isError;
  final String? questionKey;
}

class _SmartProfileChatModalState extends State<SmartProfileChatModal> {
  final List<_ChatMessage> _messages = [];
  final TextEditingController _inputCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  late Map<String, dynamic> _workingValues;
  late List<_ChatQuestion> _unansweredQuestions;
  int _currentQuestionIndex = 0;
  int _skippedCount = 0;
  bool _isSaving = false;
  bool _started = false;
  _QuestionMode? _questionMode;
  double _sliderVal = 50.0;
  int _starVal = 3;

  // ── 100% Exact Schema Questions Aligned with Profile Screen Keys ──────────
  static const List<_ChatQuestion> _allQuestions = [
    // ── 1. Personal Section ────────────────────────────────────────────────
    _ChatQuestion(
      key: 'name',
      sectionKey: 'personal',
      labelKey: 'profile.field.name',
      type: _FieldType.text,
    ),
    _ChatQuestion(
      key: 'gender',
      sectionKey: 'personal',
      labelKey: 'profile.field.gender',
      type: _FieldType.choice,
      options: kGender,
      labelFor: genderLabel,
    ),
    _ChatQuestion(
      key: 'nationality',
      sectionKey: 'personal',
      labelKey: 'profile.field.nationality',
      type: _FieldType.choice,
      options: kCountries,
    ),
    _ChatQuestion(
      key: 'birth_date',
      sectionKey: 'personal',
      labelKey: 'profile.field.birth_date',
      type: _FieldType.date,
    ),
    _ChatQuestion(
      key: 'country',
      sectionKey: 'personal',
      labelKey: 'profile.field.country',
      type: _FieldType.choice,
      options: kCountries,
    ),
    _ChatQuestion(
      key: 'city',
      sectionKey: 'personal',
      labelKey: 'profile.field.city',
      type: _FieldType.text,
    ),
    _ChatQuestion(
      key: 'address',
      sectionKey: 'personal',
      labelKey: 'profile.field.address',
      type: _FieldType.text,
    ),
    _ChatQuestion(
      key: 'phone',
      sectionKey: 'personal',
      labelKey: 'profile.field.phone',
      type: _FieldType.number,
    ),
    _ChatQuestion(
      key: 'whatsapp',
      sectionKey: 'personal',
      labelKey: 'profile.field.whatsapp',
      type: _FieldType.number,
    ),
    _ChatQuestion(
      key: 'email',
      sectionKey: 'personal',
      labelKey: 'profile.field.email',
      type: _FieldType.text,
    ),
    _ChatQuestion(
      key: 'guardian_name',
      sectionKey: 'personal',
      labelKey: 'profile.field.guardian_name',
      type: _FieldType.text,
      presetChipsAr: ['لا ينطبق (فوق 18 سنة) 👨‍💼'],
      presetChipsEn: ['Not applicable (Over 18) 👨‍💼'],
    ),
    _ChatQuestion(
      key: 'guardian_phone',
      sectionKey: 'personal',
      labelKey: 'profile.field.guardian_phone',
      type: _FieldType.number,
      presetChipsAr: ['لا ينطبق 📱'],
      presetChipsEn: ['Not applicable 📱'],
    ),

    // ── 2. Education Section ───────────────────────────────────────────────
    _ChatQuestion(
      key: 'education_level',
      sectionKey: 'education',
      labelKey: 'profile.field.education_level',
      type: _FieldType.choice,
      options: kEducationLevels,
      labelFor: educationLabel,
    ),
    _ChatQuestion(
      key: 'school_name',
      sectionKey: 'education',
      labelKey: 'profile.field.school_name',
      type: _FieldType.text,
    ),
    _ChatQuestion(
      key: 'graduation_year',
      sectionKey: 'education',
      labelKey: 'profile.field.graduation_year',
      type: _FieldType.number,
    ),
    _ChatQuestion(
      key: 'university_name',
      sectionKey: 'education',
      labelKey: 'profile.field.university_name',
      type: _FieldType.text,
      presetChipsAr: ['لا يتوفر 🏛️'],
      presetChipsEn: ['N/A 🏛️'],
    ),
    _ChatQuestion(
      key: 'languages',
      sectionKey: 'education',
      labelKey: 'profile.field.languages',
      type: _FieldType.text,
      presetChipsAr: ['العربية 🇸🇦', 'العربية والإنجليزية 🇬🇧'],
      presetChipsEn: ['Arabic 🇸🇦', 'Arabic & English 🇬🇧'],
    ),

    // ── 3. Sports Career Section ───────────────────────────────────────────
    _ChatQuestion(
      key: 'current_club',
      sectionKey: 'career',
      labelKey: 'profile.field.current_club',
      type: _FieldType.text,
      presetChipsAr: ['لاعب حُر / بدون نادي 🏟️'],
      presetChipsEn: ['Free Agent / No Club 🏟️'],
    ),
    _ChatQuestion(
      key: 'position',
      sectionKey: 'career',
      labelKey: 'profile.field.position',
      type: _FieldType.choice,
      options: kPositionCodes,
      labelFor: positionLabel,
    ),
    _ChatQuestion(
      key: 'secondary_position',
      sectionKey: 'career',
      labelKey: 'profile.field.secondary_position',
      type: _FieldType.choice,
      options: kPositionCodes,
      labelFor: positionLabel,
    ),
    _ChatQuestion(
      key: 'foot',
      sectionKey: 'career',
      labelKey: 'profile.field.foot',
      type: _FieldType.choice,
      options: kFoot,
      labelFor: footLabel,
    ),
    _ChatQuestion(
      key: 'contract_status',
      sectionKey: 'career',
      labelKey: 'profile.field.contract_status',
      type: _FieldType.choice,
      options: kContractStatus,
      labelFor: contractLabel,
    ),
    _ChatQuestion(
      key: 'contract_end_date',
      sectionKey: 'career',
      labelKey: 'profile.field.contract_end_date',
      type: _FieldType.date,
    ),
    _ChatQuestion(
      key: 'market_value',
      sectionKey: 'career',
      labelKey: 'profile.field.market_value',
      type: _FieldType.number,
      presetChipsAr: ['0 💰'],
      presetChipsEn: ['0 💰'],
    ),
    _ChatQuestion(
      key: 'club_history',
      sectionKey: 'career',
      labelKey: 'profile.field.club_history',
      type: _FieldType.text,
      presetChipsAr: ['لاعب حُر ⚽'],
      presetChipsEn: ['Free Agent ⚽'],
    ),

    // ── 4. Measurements Section ───────────────────────────────────────────
    _ChatQuestion(
      key: 'height',
      sectionKey: 'measurements',
      labelKey: 'profile.field.height',
      type: _FieldType.slider,
      min: 100,
      max: 230,
      unit: 'cm',
    ),
    _ChatQuestion(
      key: 'weight',
      sectionKey: 'measurements',
      labelKey: 'profile.field.weight',
      type: _FieldType.slider,
      min: 30,
      max: 180,
      unit: 'kg',
    ),
    _ChatQuestion(
      key: 'jersey_number',
      sectionKey: 'measurements',
      labelKey: 'profile.field.jersey_number',
      type: _FieldType.number,
      presetChipsAr: ['10 👕', '7 👕', '9 👕'],
      presetChipsEn: ['10 👕', '7 👕', '9 👕'],
    ),

    // ── 5. Skills Section (FUT Stats 0-99) ────────────────────────────────
    _ChatQuestion(
      key: 'stats_pace',
      sectionKey: 'skills',
      labelKey: 'profile.field.stats_pace',
      type: _FieldType.slider,
      min: 1,
      max: 99,
    ),
    _ChatQuestion(
      key: 'stats_shooting',
      sectionKey: 'skills',
      labelKey: 'profile.field.stats_shooting',
      type: _FieldType.slider,
      min: 1,
      max: 99,
    ),
    _ChatQuestion(
      key: 'stats_passing',
      sectionKey: 'skills',
      labelKey: 'profile.field.stats_passing',
      type: _FieldType.slider,
      min: 1,
      max: 99,
    ),
    _ChatQuestion(
      key: 'stats_dribbling',
      sectionKey: 'skills',
      labelKey: 'profile.field.stats_dribbling',
      type: _FieldType.slider,
      min: 1,
      max: 99,
    ),
    _ChatQuestion(
      key: 'stats_defending',
      sectionKey: 'skills',
      labelKey: 'profile.field.stats_defending',
      type: _FieldType.slider,
      min: 1,
      max: 99,
    ),
    _ChatQuestion(
      key: 'stats_physical',
      sectionKey: 'skills',
      labelKey: 'profile.field.stats_physical',
      type: _FieldType.slider,
      min: 1,
      max: 99,
    ),
    _ChatQuestion(
      key: 'skill_moves',
      sectionKey: 'skills',
      labelKey: 'profile.field.skill_moves',
      type: _FieldType.star,
    ),
    _ChatQuestion(
      key: 'weak_foot',
      sectionKey: 'skills',
      labelKey: 'profile.field.weak_foot',
      type: _FieldType.star,
    ),

    // ── 6. Mental Section ──────────────────────────────────────────────────
    _ChatQuestion(
      key: 'mentality_leadership',
      sectionKey: 'mental',
      labelKey: 'profile.field.mentality_leadership',
      type: _FieldType.slider,
      min: 1,
      max: 99,
    ),
    _ChatQuestion(
      key: 'mentality_teamwork',
      sectionKey: 'mental',
      labelKey: 'profile.field.mentality_teamwork',
      type: _FieldType.slider,
      min: 1,
      max: 99,
    ),

    // ── 7. Medical Section ─────────────────────────────────────────────────
    _ChatQuestion(
      key: 'blood_type',
      sectionKey: 'medical',
      labelKey: 'profile.field.blood_type',
      type: _FieldType.choice,
      options: kBloodTypes,
    ),
    _ChatQuestion(
      key: 'chronic_diseases',
      sectionKey: 'medical',
      labelKey: 'profile.field.chronic_diseases',
      type: _FieldType.text,
      presetChipsAr: ['لا يوجد 🩺', 'سليم ومعافى ✅'],
      presetChipsEn: ['None 🩺', 'Healthy ✅'],
    ),
    _ChatQuestion(
      key: 'injuries',
      sectionKey: 'medical',
      labelKey: 'profile.field.injuries',
      type: _FieldType.text,
      presetChipsAr: ['لا توجد إصابات سابقة ✅'],
      presetChipsEn: ['No previous injuries ✅'],
    ),

    // ── 8. Training Section ────────────────────────────────────────────────
    _ChatQuestion(
      key: 'hours_per_week',
      sectionKey: 'training',
      labelKey: 'profile.field.hours_per_week',
      type: _FieldType.slider,
      min: 1,
      max: 40,
      unit: 'hrs',
    ),

    // ── 9. Professional / Bio Section ──────────────────────────────────────
    _ChatQuestion(
      key: 'agent_name',
      sectionKey: 'professional',
      labelKey: 'profile.field.agent_name',
      type: _FieldType.text,
      presetChipsAr: ['لا يوجد وكيل / حُر 💼'],
      presetChipsEn: ['No Agent / Self-managed 💼'],
    ),
    _ChatQuestion(
      key: 'transfermarkt_url',
      sectionKey: 'professional',
      labelKey: 'profile.field.transfermarkt_url',
      type: _FieldType.text,
      presetChipsAr: ['لا يوجد 🌐'],
      presetChipsEn: ['N/A 🌐'],
    ),
    _ChatQuestion(
      key: 'instagram_handle',
      sectionKey: 'professional',
      labelKey: 'profile.field.instagram_handle',
      type: _FieldType.text,
      presetChipsAr: ['لا يوجد 📸'],
      presetChipsEn: ['N/A 📸'],
    ),
    _ChatQuestion(
      key: 'brief',
      sectionKey: 'professional',
      labelKey: 'profile.field.bio',
      type: _FieldType.text,
      presetChipsAr: ['الاحتراف في أندية القمة 🏆'],
      presetChipsEn: ['Play professionally at top clubs 🏆'],
    ),
  ];

  static const Set<String> _essentialQuestionKeys = {
    'name',
    'gender',
    'nationality',
    'birth_date',
    'country',
    'city',
    'phone',
    'position',
    'foot',
    'height',
    'weight',
    'current_club',
  };

  @override
  void initState() {
    super.initState();
    _workingValues = Map<String, dynamic>.from(widget.profile.values);
    _filterQuestions();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_started) {
      _started = true;
      _startConversation();
    }
  }

  void _restartChat() {
    setState(() {
      _workingValues = Map<String, dynamic>.from(widget.profile.values);
      _filterQuestions();
      _currentQuestionIndex = 0;
      _skippedCount = 0;
      _questionMode = null;
      _messages.clear();
      _started = false;
    });
    _startConversation();
  }

  void _filterQuestions() {
    _unansweredQuestions = _allQuestions.where((q) {
      if (!_isQuestionApplicable(q)) return false;
      final val = _workingValues[q.key];
      if (val == null) return true;
      final str = '$val'.trim();
      return str.isEmpty || str == '0' || str == 'false' || str == '0.0';
    }).toList();
    if (_unansweredQuestions.isEmpty) {
      _unansweredQuestions = List.from(_allQuestions);
    }
  }

  bool _isQuestionApplicable(_ChatQuestion question) {
    final level = '${_workingValues['education_level'] ?? ''}'.trim();
    if (question.key == 'school_name') {
      return educationUsesSchool(level);
    }
    if (question.key == 'university_name') {
      return educationUsesUniversity(level);
    }
    return true;
  }

  void _startConversation() {
    if (_unansweredQuestions.isEmpty) return;
    _messages.add(
      _ChatMessage(
        text: switch (Localizations.localeOf(context).languageCode) {
          'es' =>
            '¿Quieres responder ahora solo las preguntas esenciales o completar todo el perfil?',
          'pt' =>
            'Queres responder agora apenas às perguntas essenciais ou completar todo o perfil?',
          'fr' =>
            'Souhaitez-vous répondre uniquement aux questions essentielles ou compléter tout le profil ?',
          'en' =>
            'Would you like to answer only the essential questions now, or complete the full profile?',
          _ =>
            'هل تود الإجابة عن الأسئلة الأساسية فقط الآن، أم استكمال الملف بالكامل؟ يمكنك العودة في أي وقت.',
        },
        isUser: false,
      ),
    );
  }

  void _selectQuestionMode(_QuestionMode mode) {
    final lang = Localizations.localeOf(context).languageCode;
    final allUnanswered = _allQuestions.where((q) {
      if (!_isQuestionApplicable(q)) return false;
      final value = _workingValues[q.key];
      final text = '${value ?? ''}'.trim();
      return text.isEmpty || text == '0' || text == 'false' || text == '0.0';
    });
    final selected = mode == _QuestionMode.essentials
        ? allUnanswered.where((q) => _essentialQuestionKeys.contains(q.key))
        : allUnanswered;

    setState(() {
      _questionMode = mode;
      _unansweredQuestions = selected.toList();
      _currentQuestionIndex = 0;
      _messages.add(
        _ChatMessage(
          text: mode == _QuestionMode.essentials
              ? switch (lang) {
                  'es' =>
                    'Preguntas esenciales ahora; completaré el resto más tarde.',
                  'pt' =>
                    'Perguntas essenciais agora; completo o resto mais tarde.',
                  'fr' =>
                    'Les questions essentielles maintenant ; je compléterai le reste plus tard.',
                  'en' =>
                    'Essential questions now; I will complete the rest later.',
                  _ => 'الأسئلة الأساسية الآن، وسأكمل الباقي لاحقًا.',
                }
              : switch (lang) {
                  'es' => 'Completar todo el perfil ahora.',
                  'pt' => 'Completar todo o perfil agora.',
                  'fr' => 'Compléter tout le profil maintenant.',
                  'en' => 'Complete the full profile now.',
                  _ => 'استكمال الملف بالكامل الآن.',
                },
          isUser: true,
        ),
      );
      if (_unansweredQuestions.isNotEmpty) {
        final firstQuestion = _unansweredQuestions.first;
        _messages.add(
          _ChatMessage(
            text: firstQuestion.promptFor(context),
            isUser: false,
            questionKey: firstQuestion.key,
          ),
        );
        _resetControlState(firstQuestion);
      }
    });
    _scrollToBottom();
  }

  void _resetControlState(_ChatQuestion q) {
    if (q.type == _FieldType.slider) {
      _sliderVal = ((q.min + q.max) / 2).roundToDouble();
    } else if (q.type == _FieldType.star) {
      _starVal = 3;
    }
  }

  int _computeCompletionPct() {
    final sections = getProfileSections();
    int total = 0;
    int filled = 0;

    for (final section in sections) {
      for (final field in section.fields) {
        total++;
        final rawVal = _workingValues[field.key];
        final str = '${rawVal ?? ''}'.trim();
        if (str.isNotEmpty &&
            str != 'null' &&
            str != '0' &&
            str != 'false' &&
            str != '0.0') {
          filled++;
        }
      }
    }

    if (total == 0) return 0;
    return ((filled / total) * 100).round().clamp(0, 100);
  }

  String _validationMessage(String errorKey, String lang) {
    if (lang == 'ar') {
      return context.trOr(errorKey, 'يرجى إدخال إجابة صحيحة.');
    }
    return context.trOr(errorKey, 'Please enter a valid answer.');
  }

  Future<void> _submitAnswer(String rawVal, String displayLabel) async {
    if (_currentQuestionIndex >= _unansweredQuestions.length) return;
    final currentQ = _unansweredQuestions[_currentQuestionIndex];
    final lang = Localizations.localeOf(context).languageCode;

    final answer = ProfileAnswerValidator.validate(
      key: currentQ.key,
      rawValue: rawVal,
      fieldType: currentQ.type.name,
      languageCode: lang,
      min: currentQ.min,
      max: currentQ.max,
      options: currentQ.key == 'country' || currentQ.key == 'nationality'
          ? null
          : currentQ.options,
      registeredPhone:
          '${widget.profile.values['phone'] ?? widget.profile.values['phoneNumber'] ?? ''}',
    );
    if (!answer.isValid) {
      setState(() {
        _messages.add(
          _ChatMessage(
            text: _validationMessage(answer.errorKey!, lang),
            isUser: false,
            isError: true,
          ),
        );
      });
      _scrollToBottom();
      return;
    }

    setState(() {
      _messages.add(_ChatMessage(text: displayLabel, isUser: true));
      _workingValues[currentQ.key] = answer.value;
    });
    _scrollToBottom();

    // Auto-save to Supabase
    setState(() => _isSaving = true);
    try {
      await widget.dataService.savePlayerProfile(widget.profile, {
        currentQ.key: answer.value,
      }, strict: true);
      final updatedProfile = UserProfile(
        userId: widget.profile.userId,
        accountType: widget.profile.accountType,
        values: widget.profile.mergeUpdates({currentQ.key: answer.value}),
      );
      widget.onProfileUpdated(updatedProfile);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isSaving = false;
        _workingValues.remove(currentQ.key);
        _messages.add(
          _ChatMessage(
            text: context.trOr(
              'profileChatSaveFailed',
              'Could not save this answer. Please try again.',
            ),
            isUser: false,
            isError: true,
          ),
        );
      });
      _scrollToBottom();
      return;
    }
    if (mounted) setState(() => _isSaving = false);

    // Next question
    _unansweredQuestions = _unansweredQuestions
        .where(_isQuestionApplicable)
        .toList(growable: false);
    _currentQuestionIndex++;
    if (!mounted) return;

    if (_currentQuestionIndex < _unansweredQuestions.length) {
      final nextQ = _unansweredQuestions[_currentQuestionIndex];
      await Future.delayed(const Duration(milliseconds: 300));
      if (!mounted) return;
      setState(() {
        _messages.add(
          _ChatMessage(
            text: nextQ.promptFor(context),
            isUser: false,
            questionKey: nextQ.key,
          ),
        );
      });
      _resetControlState(nextQ);
      _scrollToBottom();
    } else {
      // Completed current queue!
      await Future.delayed(const Duration(milliseconds: 300));
      if (!mounted) return;
      final pct = _computeCompletionPct();
      final completionMsg = pct >= 100
          ? switch (lang) {
              'es' =>
                '🎉 ¡Increíble Capitán! Tu tarjeta de talento está 100% completa y lista para ojeadores.',
              'pt' =>
                '🎉 Incrível Capitão! O teu cartão está 100% completo e pronto para os olheiros.',
              'fr' =>
                '🎉 Bravo Capitaine ! Votre carte de talent est complète et prête pour les recruteurs.',
              'en' =>
                '🎉 Incredible Captain! Your talent card is 100% complete and ready for scouts!',
              _ =>
                '🎉 أبدعت يا كابتن! اكتمل كارت موهبتك بنسبة 100% وأصبحت جاهزاً لتصدر نتائج كشافين الأندية!',
            }
          : switch (lang) {
              'es' =>
                '🎉 ¡Gran progreso! Tu tarjeta ha alcanzado el $pct%. Puedes volver en cualquier momento.',
              'pt' =>
                '🎉 Grande progresso! O teu cartão atingiu $pct%. Podes voltar a qualquer momento.',
              'fr' =>
                '🎉 Belle progression ! Votre carte a atteint $pct %. Vous pouvez revenir à tout moment.',
              'en' =>
                '🎉 Great progress! Your card has reached $pct%. You can return anytime to complete more.',
              _ =>
                '🎉 أحسنت يا كابتن! وصل كارتك لنسبة $pct%. يمكنك العودة في أي وقت لاستكمال باقي البيانات لرفع فرصتك للـ 100% ⭐',
            };

      setState(() {
        _messages.add(_ChatMessage(text: completionMsg, isUser: false));
      });
      _scrollToBottom();
    }
  }

  void _skipQuestion() {
    if (_currentQuestionIndex >= _unansweredQuestions.length) return;
    _skippedCount++;
    final lang = Localizations.localeOf(context).languageCode;
    final skipText = switch (lang) {
      'es' => 'Omitir ⏭️',
      'pt' => 'Saltar ⏭️',
      'fr' => 'Passer ⏭️',
      'en' => 'Skip ⏭️',
      _ => 'تخطي ⏭️',
    };
    _submitAnswer('', skipText);

    // Schedule 24-hour reminder if questions are skipped
    _schedule24hReminder();
  }

  Future<void> _schedule24hReminder() async {
    try {
      final reminderTime = DateTime.now()
          .add(const Duration(hours: 24))
          .toIso8601String();
      await _storage.write(
        key: 'profile_reminder_scheduled_at',
        value: reminderTime,
      );
      await _storage.write(
        key: 'profile_reminder_skipped_count',
        value: '$_skippedCount',
      );
    } catch (_) {}
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final lang = Localizations.localeOf(context).languageCode;
    final pct = _computeCompletionPct();
    final isChoosingMode = _questionMode == null;
    final hasNextQ =
        !isChoosingMode && _currentQuestionIndex < _unansweredQuestions.length;
    final currentQ = hasNextQ
        ? _unansweredQuestions[_currentQuestionIndex]
        : null;

    final headerTitle = switch (lang) {
      'es' => 'Capitán El7lm - Ojeador IA ⚽',
      'pt' => 'Capitão El7lm - Olheiro IA ⚽',
      'fr' => 'Capitaine El7lm - Recruteur IA ⚽',
      'en' => 'Captain El7lm - AI Scout ⚽',
      _ => 'كابتن حلم - المستكشف الذكي ⚽',
    };

    final headerSubtitle = switch (lang) {
      'es' => 'Completa tu perfil para oportunidades',
      'pt' => 'Completa o teu perfil para oportunidades',
      'fr' => 'Complétez votre profil pour obtenir des opportunités',
      'en' => 'Complete profile to get opportunities',
      _ => 'إكمال بيانات الملف للحصول على فرصة',
    };

    final skipBtnLabel = switch (lang) {
      'es' => 'Omitir ⏭️',
      'pt' => 'Saltar ⏭️',
      'fr' => 'Passer ⏭️',
      'en' => 'Skip ⏭️',
      _ => 'تخطي ⏭️',
    };

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          // ── Header & Progress Bar ──────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.navy, Color(0xFF1E1B4B)],
              ),
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            child: Column(
              children: [
                Center(
                  child: Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: .4),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const CircleAvatar(
                      radius: 20,
                      backgroundColor: AppColors.green,
                      child: Icon(
                        Icons.smart_toy_rounded,
                        color: Colors.white,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            headerTitle,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 15,
                            ),
                          ),
                          Text(
                            headerSubtitle,
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: .7),
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: switch (lang) {
                        'es' => 'Reiniciar',
                        'pt' => 'Reiniciar',
                        'fr' => 'Recommencer',
                        'en' => 'Restart',
                        _ => 'إعادة المحادثة',
                      },
                      icon: const Icon(
                        Icons.refresh_rounded,
                        color: Colors.white,
                      ),
                      onPressed: _restartChat,
                    ),
                    IconButton(
                      icon: const Icon(
                        Icons.close_rounded,
                        color: Colors.white,
                      ),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      switch (lang) {
                        'es' => 'Progreso:',
                        'pt' => 'Progresso:',
                        'fr' => 'Progression :',
                        'en' => 'Card Progress:',
                        _ => 'اكتمال الكارت:',
                      },
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '$pct%',
                      style: TextStyle(
                        color: pct >= 80
                            ? AppColors.green
                            : const Color(0xFFFFD700),
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: pct / 100,
                    minHeight: 6,
                    backgroundColor: Colors.white.withValues(alpha: .2),
                    valueColor: AlwaysStoppedAnimation<Color>(
                      pct >= 80 ? AppColors.green : const Color(0xFFFFD700),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Chat Messages ──────────────────────────────────────────────────────
          Expanded(
            child: ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, i) {
                final msg = _messages[i];
                return _buildChatBubble(msg);
              },
            ),
          ),

          // ── Interactive Question Controls or End-of-Chat Action Card ──────────
          if (isChoosingMode)
            _buildQuestionModeChooser(lang)
          else if (hasNextQ && currentQ != null)
            Container(
              padding: EdgeInsets.fromLTRB(
                16,
                12,
                16,
                MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                border: Border(top: BorderSide(color: Colors.grey[200]!)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ConstrainedBox(
                    // Some questions, such as country and nationality, have
                    // many choices. Keep the action area inside the sheet and
                    // let its options scroll instead of overflowing the modal.
                    constraints: BoxConstraints(
                      maxHeight: MediaQuery.sizeOf(context).height * .34,
                    ),
                    child: Scrollbar(
                      child: SingleChildScrollView(
                        padding: const EdgeInsetsDirectional.only(end: 2),
                        child: _buildQuestionControl(currentQ, lang),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      TextButton.icon(
                        onPressed: _skipQuestion,
                        icon: const Icon(Icons.skip_next_rounded, size: 18),
                        label: Text(skipBtnLabel),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.grey[600],
                        ),
                      ),
                      if (_isSaving)
                        const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.green,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            )
          else
            _buildEndActions(context, lang),
        ],
      ),
    );
  }

  Widget _buildQuestionModeChooser(String lang) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        16,
        14,
        16,
        MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        border: Border(top: BorderSide(color: Colors.grey[200]!)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _selectQuestionMode(_QuestionMode.essentials),
              icon: const Icon(Icons.bolt_rounded),
              label: Text(switch (lang) {
                'es' => 'Solo preguntas esenciales',
                'pt' => 'Apenas perguntas essenciais',
                'fr' => 'Questions essentielles uniquement',
                'en' => 'Essential questions only',
                _ => 'الأسئلة الأساسية فقط الآن',
              }),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.green,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 13),
              ),
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => _selectQuestionMode(_QuestionMode.complete),
              icon: const Icon(Icons.fact_check_outlined),
              label: Text(switch (lang) {
                'es' => 'Completar todo el perfil',
                'pt' => 'Completar todo o perfil',
                'fr' => 'Compléter tout le profil',
                'en' => 'Complete full profile',
                _ => 'استكمال الملف بالكامل',
              }),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.navy,
                side: const BorderSide(color: AppColors.navy),
                padding: const EdgeInsets.symmetric(vertical: 13),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEndActions(BuildContext context, String lang) {
    final pct = _computeCompletionPct();
    final isAr = lang == 'ar';

    final finishBtnText = switch (lang) {
      'es' => '🎴 Guardar y ver tarjeta de talento',
      'pt' => '🎴 Salvar e ver cartão de talento',
      'fr' => '🎴 Enregistrer et voir la carte de talent',
      'en' => '🎴 Save & View Talent Card',
      _ => '🎴 حفظ ومعاينة كارت الموهبة',
    };

    final retrySkippedBtnText = switch (lang) {
      'es' => '🔄 Completar preguntas restantes',
      'pt' => '🔄 Completar perguntas restantes',
      'fr' => '🔄 Compléter les questions restantes',
      'en' => '🔄 Complete Remaining Questions',
      _ => '🔄 استكمال الأسئلة المتبقية للوصول لـ 100%',
    };

    return Container(
      padding: EdgeInsets.fromLTRB(
        16,
        14,
        16,
        MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        border: Border(top: BorderSide(color: Colors.grey[200]!)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              onPressed: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    backgroundColor: AppColors.navy,
                    content: Row(
                      children: [
                        const Icon(Icons.stars_rounded, color: AppColors.gold),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            isAr
                                ? 'تم إكمال وتحديث كارت الموهبة بنسبة $pct% 🎉'
                                : 'Talent card updated to $pct% 🎉',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.check_circle_rounded),
              label: Text(
                finishBtnText,
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.green,
                foregroundColor: Colors.white,
              ),
            ),
          ),
          if (pct < 100) ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: OutlinedButton.icon(
                onPressed: _restartChat,
                icon: const Icon(Icons.refresh_rounded, color: AppColors.navy),
                label: Text(
                  retrySkippedBtnText,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: AppColors.navy,
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.navy, width: 1.5),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildChatBubble(_ChatMessage msg) {
    if (msg.isUser) {
      return Align(
        alignment: Alignment.centerRight,
        child: Container(
          margin: const EdgeInsets.only(bottom: 12, left: 40),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.green,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(16),
              topRight: Radius.circular(16),
              bottomLeft: Radius.circular(16),
            ),
          ),
          child: Text(
            msg.text,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
          ),
        ),
      );
    }

    final bgColor = msg.isError ? Colors.red.shade50 : const Color(0xFFF1F5F9);
    final textColor = msg.isError ? Colors.red.shade900 : AppColors.navy;

    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12, right: 40),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 14,
              backgroundColor: msg.isError ? Colors.red : AppColors.navy,
              child: Icon(
                msg.isError
                    ? Icons.warning_amber_rounded
                    : Icons.smart_toy_rounded,
                color: Colors.white,
                size: 16,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(16),
                    topRight: Radius.circular(16),
                    bottomRight: Radius.circular(16),
                  ),
                  border: msg.isError
                      ? Border.all(color: Colors.red.shade200)
                      : null,
                ),
                child: Text(
                  msg.text,
                  style: TextStyle(
                    color: textColor,
                    fontSize: 13,
                    height: 1.4,
                    fontWeight: msg.isError
                        ? FontWeight.bold
                        : FontWeight.normal,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuestionControl(_ChatQuestion q, String lang) {
    final isAr = lang == 'ar';
    final confirmLabel = switch (lang) {
      'es' => 'Confirmar',
      'pt' => 'Confirmar',
      'fr' => 'Confirmer',
      'en' => 'Confirm',
      _ => 'تأكيد الإجابة',
    };

    switch (q.type) {
      case _FieldType.choice:
        if (q.key == 'country' || q.key == 'nationality') {
          return SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                showCountryPicker(
                  context: context,
                  showPhoneCode: false,
                  countryFilter: supportedCountryIsoCodes,
                  countryListTheme: CountryListThemeData(
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(24),
                    ),
                    bottomSheetHeight: MediaQuery.sizeOf(context).height * .72,
                    inputDecoration: InputDecoration(
                      labelText: switch (lang) {
                        'es' => 'Buscar país',
                        'pt' => 'Pesquisar país',
                        'fr' => 'Rechercher un pays',
                        'en' => 'Search country',
                        _ => 'ابحث عن الدولة',
                      },
                      prefixIcon: const Icon(Icons.search_rounded),
                    ),
                  ),
                  onSelect: (country) {
                    final label =
                        country.getTranslatedName(context) ?? country.name;
                    _submitAnswer(
                      canonicalCountryStorageValue(country.countryCode),
                      label,
                    );
                  },
                );
              },
              icon: const Icon(Icons.public_rounded),
              label: Text(switch (lang) {
                'es' => 'Seleccionar país',
                'pt' => 'Selecionar país',
                'fr' => 'Sélectionner un pays',
                'en' => 'Select country',
                _ => 'اختر الدولة',
              }),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.green,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          );
        }
        return Wrap(
          spacing: 8,
          runSpacing: 8,
          children: (q.options ?? []).map((opt) {
            final label = localizedProfileOptionLabel(context, q.key, opt);
            return ActionChip(
              avatar: const Icon(
                Icons.sports_soccer_rounded,
                size: 16,
                color: AppColors.green,
              ),
              label: Text(
                label,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              backgroundColor: Colors.white,
              side: BorderSide(color: AppColors.green.withValues(alpha: .4)),
              onPressed: () => _submitAnswer(opt, label),
            );
          }).toList(),
        );

      case _FieldType.slider:
        return Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${_sliderVal.toInt()} ${q.unit}',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: AppColors.green,
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: () => _submitAnswer(
                    _sliderVal.toInt().toString(),
                    '${_sliderVal.toInt()} ${q.unit}',
                  ),
                  icon: const Icon(Icons.check_rounded, size: 18),
                  label: Text(confirmLabel),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.navy,
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
            Slider(
              value: _sliderVal,
              min: q.min,
              max: q.max,
              divisions: (q.max - q.min).toInt(),
              activeColor: AppColors.green,
              onChanged: (v) => setState(() => _sliderVal = v),
            ),
          ],
        );

      case _FieldType.star:
        return Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                5,
                (i) => IconButton(
                  icon: Icon(
                    i < _starVal
                        ? Icons.star_rounded
                        : Icons.star_border_rounded,
                    color: AppColors.green,
                    size: 32,
                  ),
                  onPressed: () => setState(() => _starVal = i + 1),
                ),
              ),
            ),
            ElevatedButton.icon(
              onPressed: () => _submitAnswer('$_starVal', '$_starVal ⭐'),
              icon: const Icon(Icons.check_rounded, size: 18),
              label: Text('$confirmLabel ($_starVal ⭐)'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.navy,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        );

      case _FieldType.date:
        final isBirthDate = q.key == 'birth_date';
        final isFutureDate = q.key == 'contract_end_date';
        final dateLabel = isBirthDate
            ? switch (lang) {
                'es' => 'Seleccionar fecha de nacimiento',
                'pt' => 'Selecionar data de nascimento',
                'fr' => 'Sélectionner la date de naissance',
                'en' => 'Pick Date of Birth',
                _ => 'اختر تاريخ الميلاد 🎂',
              }
            : switch (lang) {
                'es' => 'Seleccionar fecha',
                'pt' => 'Selecionar data',
                'fr' => 'Sélectionner une date',
                'en' => 'Pick Date',
                _ => 'اختر التاريخ 📅',
              };

        final initial = isBirthDate
            ? DateTime(2002)
            : (isFutureDate
                  ? DateTime.now().add(const Duration(days: 365))
                  : DateTime.now());
        final firstDate = isFutureDate ? DateTime.now() : DateTime(1950);
        final lastDate = isFutureDate ? DateTime(2045) : DateTime.now();

        return SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton.icon(
            onPressed: () async {
              final navCtx = context;
              final picked = await showDatePicker(
                context: navCtx,
                initialDate: initial,
                firstDate: firstDate,
                lastDate: lastDate,
              );
              if (!mounted) return;
              if (picked != null) {
                final dateStr =
                    '${picked.year.toString().padLeft(4, '0')}-'
                    '${picked.month.toString().padLeft(2, '0')}-'
                    '${picked.day.toString().padLeft(2, '0')}';
                _submitAnswer(dateStr, dateStr);
              }
            },
            icon: const Icon(Icons.calendar_today_rounded),
            label: Text(dateLabel),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.green,
              foregroundColor: Colors.white,
            ),
          ),
        );

      case _FieldType.text:
      case _FieldType.number:
        if (q.key == 'city') {
          final cities = citiesForCountry('${_workingValues['country'] ?? ''}');
          if (cities.isNotEmpty) {
            return DropdownButtonFormField<String>(
              isExpanded: true,
              decoration: InputDecoration(
                labelText: q.getExactLabel(context),
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
              onChanged: (city) {
                if (city != null) {
                  _submitAnswer(city, localizedCityLabel(context, city));
                }
              },
            );
          }
        }
        final presetChips = isAr ? q.presetChipsAr : q.presetChipsEn;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (presetChips != null && presetChips.isNotEmpty) ...[
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: presetChips.map((chipText) {
                  return ActionChip(
                    label: Text(
                      chipText,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    backgroundColor: Colors.white,
                    side: BorderSide(
                      color: AppColors.navy.withValues(alpha: .3),
                    ),
                    onPressed: () => _submitAnswer(chipText, chipText),
                  );
                }).toList(),
              ),
              const SizedBox(height: 8),
            ],
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _inputCtrl,
                    keyboardType: q.type == _FieldType.number
                        ? TextInputType.number
                        : TextInputType.text,
                    decoration: InputDecoration(
                      hintText: switch (lang) {
                        'es' => 'Escribe tu respuesta aquí...',
                        'pt' => 'Escreve a tua resposta aqui...',
                        'fr' => 'Écrivez votre réponse ici…',
                        'en' => 'Type your answer here...',
                        _ => 'اكتب إجابتك هنا...',
                      },
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 10,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: () {
                    final text = _inputCtrl.text.trim();
                    if (text.isNotEmpty) {
                      _inputCtrl.clear();
                      _submitAnswer(text, text);
                    }
                  },
                  icon: const Icon(Icons.send_rounded),
                  style: IconButton.styleFrom(backgroundColor: AppColors.green),
                ),
              ],
            ),
          ],
        );
    }
  }
}
