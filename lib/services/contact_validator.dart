class ContactValidationResult {
  const ContactValidationResult.valid(this.value) : errorKey = null;
  const ContactValidationResult.invalid(this.errorKey) : value = null;

  final String? value;
  final String? errorKey;
  bool get isValid => errorKey == null;
}

class ContactValidator {
  const ContactValidator._();

  static ContactValidationResult email(String input) {
    final value = input.trim().toLowerCase();
    if (value.isEmpty) return const ContactValidationResult.valid('');
    if (value.length > 254 || !_emailPattern.hasMatch(value)) {
      return const ContactValidationResult.invalid('profileChatInvalidEmail');
    }
    return ContactValidationResult.valid(value);
  }

  static ContactValidationResult phoneForCountry({
    required String input,
    required String callingCode,
    String? example,
  }) {
    final normalized = normalizeDigits(input);
    final code = digitsOnly(callingCode);
    var digits = digitsOnly(normalized);
    if (digits.isEmpty || code.isEmpty) {
      return const ContactValidationResult.invalid('invalidPhoneForCountry');
    }

    if (normalized.trim().startsWith('+')) {
      if (!digits.startsWith(code)) {
        return const ContactValidationResult.invalid('phoneCountryMismatch');
      }
      digits = digits.substring(code.length);
    } else {
      digits = digits.replaceFirst(RegExp(r'^0+'), '');
    }

    final exampleLength = digitsOnly(example ?? '').length;
    final minLength = exampleLength > 0 ? exampleLength - 1 : 7;
    final maxLength = exampleLength > 0 ? exampleLength + 1 : 12;
    if (digits.length < minLength || digits.length > maxLength) {
      return const ContactValidationResult.invalid('invalidPhoneForCountry');
    }
    return ContactValidationResult.valid('+$code$digits');
  }

  static bool samePhone(String first, String second) {
    final a = digitsOnly(normalizeDigits(first)).replaceFirst(RegExp(r'^0+'), '');
    final b = digitsOnly(normalizeDigits(second)).replaceFirst(RegExp(r'^0+'), '');
    return a.isNotEmpty && a == b;
  }

  static String digitsOnly(String value) =>
      value.replaceAll(RegExp(r'[^0-9]'), '');

  static String normalizeDigits(String value) {
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

  static final _emailPattern = RegExp(
    r'^[a-z0-9.!#$%&\x27*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$',
    caseSensitive: false,
  );
}
