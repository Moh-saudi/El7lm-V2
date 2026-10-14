import 'package:flutter/material.dart';

import '../core/app_theme.dart';
import '../models/account_type.dart';

class AccountTypeFootballIcon extends StatelessWidget {
  const AccountTypeFootballIcon({
    super.key,
    required this.type,
    this.size = 52,
  });

  final AccountType type;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.green.withValues(alpha: .16),
            AppColors.navy.withValues(alpha: .08),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(size * .3),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Icon(type.icon, color: AppColors.green, size: size * .58),
          PositionedDirectional(
            end: 3,
            bottom: 3,
            child: Container(
              padding: EdgeInsets.all(size * .055),
              decoration: const BoxDecoration(
                color: AppColors.navy,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.sports_soccer_rounded,
                color: Colors.white,
                size: size * .22,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
