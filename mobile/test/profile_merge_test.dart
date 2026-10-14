import 'package:el7lm_mobile/models/user_profile.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('profile updates preserve web-only and future fields', () {
    final profile = UserProfile(
      userId: 'player-1',
      accountType: 'player',
      values: {
        'name': 'لاعب قديم',
        'future_web_field': {'nested': true},
        'documents': ['a.pdf'],
      },
    );

    final merged = profile.mergeUpdates({'name': 'لاعب محدث'});

    expect(merged['name'], 'لاعب محدث');
    expect(merged['future_web_field'], {'nested': true});
    expect(merged['documents'], ['a.pdf']);
    expect(merged['updatedAt'], isNotEmpty);
  });
}
