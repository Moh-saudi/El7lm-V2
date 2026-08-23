import 'package:el7lm_mobile/screens/profile/player_profile_data.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('education question flow', () {
    test('middle school never asks for university', () {
      expect(educationUsesSchool('middle'), isTrue);
      expect(educationUsesUniversity('middle'), isFalse);
    });

    test('university degrees do not ask for school name', () {
      expect(educationUsesSchool('bachelors'), isFalse);
      expect(educationUsesUniversity('bachelors'), isTrue);
      expect(educationUsesUniversity('masters'), isTrue);
      expect(educationUsesUniversity('phd'), isTrue);
    });
  });

  test('ISO country selections use web-compatible stored values', () {
    expect(canonicalCountryStorageValue('CN'), 'الصين');
    expect(canonicalCountryStorageValue('DZ'), 'الجزائر');
    expect(canonicalCountryStorageValue('AE'), 'الإمارات');
  });

  test('cities are linked to the selected canonical country', () {
    expect(citiesForCountry('CN'), contains('بكين'));
    expect(citiesForCountry('الجزائر'), contains('وهران'));
    expect(citiesForCountry('AE'), contains('دبي'));
    expect(citiesForCountry('AD'), const ['أخرى']);
  });

  test('mobile country picker is restricted to the web catalogue', () {
    expect(supportedCountryIsoCodes, isNot(contains('AD')));
    expect(supportedCountryIsoCodes, containsAll(['CN', 'DZ', 'AE', 'SA']));
  });
}
