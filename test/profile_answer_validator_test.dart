import 'package:el7lm_mobile/services/profile_answer_validator.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('selected writing script', () {
    test('rejects Latin narrative while Arabic is selected', () {
      final result = ProfileAnswerValidator.validate(
        key: 'brief',
        rawValue: 'I want to become a professional player',
        fieldType: 'text',
        languageCode: 'ar',
      );
      expect(result.errorKey, 'profileChatWrongWritingLanguage');
    });

    test('rejects official school names in another writing script', () {
      final result = ProfileAnswerValidator.validate(
        key: 'school_name',
        rawValue: 'Future International School',
        fieldType: 'text',
        languageCode: 'ar',
      );
      expect(result.errorKey, 'profileChatWrongWritingLanguage');
    });
  });

  test('rejects invalid profile chat answers before saving', () {
    expect(
      ProfileAnswerValidator.validate(
        key: 'name',
        rawValue: 'Mo',
        fieldType: 'text',
        languageCode: 'en',
      ).errorKey,
      'profileChatInvalidName',
    );

    expect(
      ProfileAnswerValidator.validate(
        key: 'height',
        rawValue: '260',
        fieldType: 'slider',
        languageCode: 'en',
        min: 100,
        max: 230,
      ).errorKey,
      'profileChatInvalidNumber',
    );

    expect(
      ProfileAnswerValidator.validate(
        key: 'position',
        rawValue: 'STRIKER',
        fieldType: 'choice',
        languageCode: 'en',
        options: const ['GK', 'ST'],
      ).errorKey,
      'profileChatInvalidChoice',
    );
  });

  test('normalizes valid profile chat answers to database friendly values', () {
    expect(
      ProfileAnswerValidator.validate(
        key: 'phone',
        rawValue: '+20 101 779 9580',
        fieldType: 'number',
        languageCode: 'en',
      ).value,
      '+201017799580',
    );

    expect(
      ProfileAnswerValidator.validate(
        key: 'graduation_year',
        rawValue: '2024',
        fieldType: 'number',
        languageCode: 'en',
      ).value,
      2024,
    );

    expect(
      ProfileAnswerValidator.validate(
        key: 'graduation_year',
        rawValue: '٢٠٢٤',
        fieldType: 'number',
        languageCode: 'ar',
      ).value,
      2024,
    );

    expect(
      ProfileAnswerValidator.validate(
        key: 'birth_date',
        rawValue: '2004-02-03',
        fieldType: 'date',
        languageCode: 'en',
      ).value,
      '2004-02-03',
    );
  });
}
