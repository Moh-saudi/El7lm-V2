import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';

class BrandLogo extends StatelessWidget {
  const BrandLogo({super.key, this.size = 92, this.showName = true});

  final double size;
  final bool showName;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Image.asset(
          'assets/images/el7lm-logo.png',
          width: size,
          height: size,
          fit: BoxFit.contain,
        ),
        if (showName) ...[
          const SizedBox(height: 8),
          Text(
            context.tr('appName'),
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
          ),
        ],
      ],
    );
  }
}
