import 'package:el7lm_mobile/core/app_theme.dart';
import 'package:el7lm_mobile/l10n/app_localizations.dart';
import 'package:el7lm_mobile/screens/onboarding/onboarding_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const translations = {
    'ar': (
      title: 'موهبتك تستحق أن تُرى',
      next: 'التالي',
      direction: TextDirection.rtl,
    ),
    'en': (
      title: 'Your Talent Deserves to Be Seen',
      next: 'Next',
      direction: TextDirection.ltr,
    ),
    'es': (
      title: 'Tu Talento Merece Ser Visto',
      next: 'Siguiente',
      direction: TextDirection.ltr,
    ),
    'pt': (
      title: 'Seu Talento Merece Ser Visto',
      next: 'Próximo',
      direction: TextDirection.ltr,
    ),
  };

  for (final entry in translations.entries) {
    testWidgets('onboarding renders ${entry.key} with the right direction', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          locale: Locale(entry.key),
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          theme: buildAppTheme(),
          home: OnboardingScreen(onDone: () async {}),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text(entry.value.title), findsOneWidget);
      expect(find.text(entry.value.next), findsOneWidget);
      expect(
        Directionality.of(tester.element(find.byType(OnboardingScreen))),
        entry.value.direction,
      );
    });
  }
}
