import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/brand_logo.dart';
import '../../widgets/language_switcher.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, required this.onDone});

  final Future<void> Function() onDone;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final controller = PageController();
  int index = 0;

  static const items = [
    (
      icon: Icons.auto_awesome,
      titleKey: 'onboarding1Title',
      textKey: 'onboarding1Text',
    ),
    (
      icon: Icons.smart_display_rounded,
      titleKey: 'onboarding2Title',
      textKey: 'onboarding2Text',
    ),
    (
      icon: Icons.travel_explore,
      titleKey: 'onboarding3Title',
      textKey: 'onboarding3Text',
    ),
    (
      icon: Icons.groups_rounded,
      titleKey: 'onboarding4Title',
      textKey: 'onboarding4Text',
    ),
    (
      icon: Icons.verified_user_rounded,
      titleKey: 'onboarding5Title',
      textKey: 'onboarding5Text',
    ),
  ];

  Future<void> next() async {
    if (index == items.length - 1) {
      await widget.onDone();
      return;
    }
    await controller.nextPage(
      duration: const Duration(milliseconds: 350),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const BrandLogo(size: 52, showName: false),
                  Row(
                    children: [
                      const LanguageSwitcher(compact: true),
                      TextButton(
                        onPressed: widget.onDone,
                        child: Text(context.tr('skip')),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: controller,
                itemCount: items.length,
                onPageChanged: (value) => setState(() => index = value),
                itemBuilder: (context, pageIndex) {
                  final item = items[pageIndex];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 28),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 210,
                          height: 210,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                AppColors.navy.withValues(alpha: .08),
                                AppColors.green.withValues(alpha: .18),
                              ],
                              begin: Alignment.topRight,
                              end: Alignment.bottomLeft,
                            ),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            item.icon,
                            size: 92,
                            color: pageIndex.isEven
                                ? AppColors.navy
                                : AppColors.green,
                          ),
                        ),
                        const SizedBox(height: 42),
                        Text(
                          context.tr(item.titleKey),
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.headlineSmall
                              ?.copyWith(fontWeight: FontWeight.w900),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          context.tr(item.textKey),
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyLarge
                              ?.copyWith(color: AppColors.muted, height: 1.8),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                items.length,
                (dot) => AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  width: dot == index ? 26 : 8,
                  height: 8,
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  decoration: BoxDecoration(
                    color: dot == index
                        ? AppColors.green
                        : const Color(0xFFD9DEE8),
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: FilledButton(
                onPressed: next,
                child: Text(
                  context.tr(index == items.length - 1 ? 'startNow' : 'next'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
