import 'package:flutter_test/flutter_test.dart';
import 'package:el7lm_mobile/services/contact_validator.dart';

void main() {
  group('ContactValidator phoneForCountry', () {
    test('normalizes Egyptian local and Arabic digits', () {
      final result = ContactValidator.phoneForCountry(
        input: '٠١٠٠٠٠٠٠٠٠٤',
        callingCode: '20',
        example: '1001234567',
      );
      expect(result.isValid, isTrue);
      expect(result.value, '+201000000004');
    });

    test('rejects a calling code from another country', () {
      final result = ContactValidator.phoneForCountry(
        input: '+97455123456',
        callingCode: '20',
        example: '1001234567',
      );
      expect(result.errorKey, 'phoneCountryMismatch');
    });
  });

  test('compares formatted account phone numbers', () {
    expect(ContactValidator.samePhone('+20 100 000 0004', '٢٠١٠٠٠٠٠٠٠٠٤'), isTrue);
  });

  test('rejects malformed email', () {
    expect(ContactValidator.email('player@').isValid, isFalse);
    expect(ContactValidator.email('player@example.com').isValid, isTrue);
  });
}
