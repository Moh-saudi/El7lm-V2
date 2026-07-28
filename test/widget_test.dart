import 'package:el7lm_mobile/core/app_theme.dart';
import 'package:el7lm_mobile/screens/onboarding/onboarding_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('onboarding presents the El7lm value proposition', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: buildAppTheme(),
        home: OnboardingScreen(onDone: () async {}),
      ),
    );
    await tester.pump();

    expect(find.text('موهبتك تستحق أن تُرى'), findsOneWidget);
    expect(find.text('التالي'), findsOneWidget);
  });
}
