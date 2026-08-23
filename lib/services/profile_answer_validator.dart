import 'contact_validator.dart';

class ProfileAnswerValidationResult {
  const ProfileAnswerValidationResult._({this.value, this.errorKey});

  const ProfileAnswerValidationResult.valid(Object? value)
    : this._(value: value);

  const ProfileAnswerValidationResult.invalid(String errorKey)
    : this._(errorKey: errorKey);

  final Object? value;
  final String? errorKey;

  bool get isValid => errorKey == null;
}

class ProfileAnswerValidator {
  const ProfileAnswerValidator._();

  static const _phoneKeys = {
    'phone',
    'whatsapp',
    'guardian_phone',
    'agent_phone',
  };

  static const _integerKeys = {
    'graduation_year',
    'jersey_number',
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
    'hours_per_week',
  };

  static const _numberKeys = {'height', 'weight', 'market_value'};

  static ProfileAnswerValidationResult validate({
    required String key,
    required String rawValue,
    required String fieldType,
    required String languageCode,
    double min = 0,
    double max = 100,
    List<String>? options,
    String? registeredPhone,
  }) {
    final value = _normalizeDigits(rawValue.trim());
    if (value.isEmpty) return const ProfileAnswerValidationResult.valid('');

    if (options != null && options.isNotEmpty && !options.contains(value)) {
      return const ProfileAnswerValidationResult.invalid(
        'profileChatInvalidChoice',
      );
    }

    if (key == 'name' && value.length < 3) {
      return const ProfileAnswerValidationResult.invalid(
        'profileChatInvalidName',
      );
    }

    if (key == 'email') {
      final result = ContactValidator.email(value);
      if (!result.isValid) {
        return ProfileAnswerValidationResult.invalid(result.errorKey!);
      }
      return ProfileAnswerValidationResult.valid(result.value);
    }

    if (_phoneKeys.contains(key)) {
      if (_isNotApplicable(value)) {
        return ProfileAnswerValidationResult.valid(value);
      }
      final clean = value.replaceAll(RegExp(r'[^0-9+]'), '');
      if (clean.length < 7 || clean.indexOf('+') > 0) {
        return const ProfileAnswerValidationResult.invalid(
          'profileChatInvalidPhone',
        );
      }
      if (key == 'phone' &&
          registeredPhone?.trim().isNotEmpty == true &&
          !ContactValidator.samePhone(clean, registeredPhone!)) {
        return const ProfileAnswerValidationResult.invalid(
          'profilePhoneMustMatchLogin',
        );
      }
      return ProfileAnswerValidationResult.valid(clean);
    }

    if (fieldType == 'text' &&
        !_languageFlexibleKeys.contains(key) &&
        !_matchesSelectedScript(value, languageCode)) {
      return const ProfileAnswerValidationResult.invalid(
        'profileChatWrongWritingLanguage',
      );
    }

    if (fieldType == 'date') {
      final parsed = DateTime.tryParse(value);
      if (parsed == null) {
        return const ProfileAnswerValidationResult.invalid(
          'profileChatInvalidDate',
        );
      }
      final today = DateTime.now();
      if (key == 'birth_date' && parsed.isAfter(today)) {
        return const ProfileAnswerValidationResult.invalid(
          'profileChatInvalidBirthDate',
        );
      }
      if (key == 'contract_end_date' && parsed.isBefore(_dateOnly(today))) {
        return const ProfileAnswerValidationResult.invalid(
          'profileChatInvalidFutureDate',
        );
      }
      return ProfileAnswerValidationResult.valid(
        '${parsed.year.toString().padLeft(4, '0')}-'
        '${parsed.month.toString().padLeft(2, '0')}-'
        '${parsed.day.toString().padLeft(2, '0')}',
      );
    }

    if (_integerKeys.contains(key) ||
        fieldType == 'slider' ||
        fieldType == 'star') {
      final number = int.tryParse(value);
      if (number == null) {
        return const ProfileAnswerValidationResult.invalid(
          'profileChatInvalidNumber',
        );
      }
      if (key == 'graduation_year') {
        final latestReasonableYear = DateTime.now().year + 15;
        if (number < 1950 || number > latestReasonableYear) {
          return const ProfileAnswerValidationResult.invalid(
            'profileChatInvalidGraduationYear',
          );
        }
        return ProfileAnswerValidationResult.valid(number);
      }
      if (number < min || number > max) {
        return const ProfileAnswerValidationResult.invalid(
          'profileChatInvalidNumber',
        );
      }
      return ProfileAnswerValidationResult.valid(number);
    }

    if (_numberKeys.contains(key) || fieldType == 'number') {
      final number = num.tryParse(value);
      if (number == null || number < min || number > max) {
        return const ProfileAnswerValidationResult.invalid(
          'profileChatInvalidNumber',
        );
      }
      return ProfileAnswerValidationResult.valid(number);
    }

    return ProfileAnswerValidationResult.valid(value);
  }

  static bool _isNotApplicable(String value) {
    final lower = value.toLowerCase();
    return lower == 'n/a' ||
        lower == 'na' ||
        lower.contains('not applicable') ||
        value.contains('لا ينطبق');
  }

  static const _languageFlexibleKeys = {
    'email',
    'phone',
    'whatsapp',
    'guardian_phone',
    'agent_phone',
    'website',
    'facebook',
    'instagram',
    'twitter',
    'linkedin',
    'instagram_handle',
    'transfermarkt_url',
    'license_number',
  };

  static bool _matchesSelectedScript(String value, String languageCode) {
    if (!RegExp(r'[A-Za-z\u0600-\u06FF]').hasMatch(value)) return true;
    if (languageCode == 'ar') {
      return RegExp(r'[\u0600-\u06FF]').hasMatch(value);
    }
    return RegExp(r'[A-Za-z]').hasMatch(value);
  }

  static DateTime _dateOnly(DateTime value) =>
      DateTime(value.year, value.month, value.day);

  static String _normalizeDigits(String value) {
    const easternArabic = '٠١٢٣٤٥٦٧٨٩';
    const persian = '۰۱۲۳۴۵۶۷۸۹';
    var normalized = value;
    for (var index = 0; index < 10; index++) {
      normalized = normalized
          .replaceAll(easternArabic[index], '$index')
          .replaceAll(persian[index], '$index');
    }
    return normalized;
  }
}
