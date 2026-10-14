import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';

enum AccountType {
  player('player', 'account.player', 'account.playerDesc', Icons.sports_soccer),
  club('club', 'account.club', 'account.clubDesc', Icons.stadium_rounded),
  academy('academy', 'account.academy', 'account.academyDesc', Icons.school),
  agent('agent', 'account.agent', 'account.agentDesc', Icons.handshake_rounded),
  trainer(
    'trainer',
    'account.trainer',
    'account.trainerDesc',
    Icons.sports_rounded,
  ),
  marketer(
    'marketer',
    'account.marketer',
    'account.marketerDesc',
    Icons.campaign_rounded,
  );

  const AccountType(this.value, this.nameKey, this.descriptionKey, this.icon);

  final String value;
  final String nameKey;
  final String descriptionKey;
  final IconData icon;

  String localizedName(BuildContext context) => context.tr(nameKey);

  String localizedDescription(BuildContext context) =>
      context.tr(descriptionKey);

  bool get isPlayer => this == AccountType.player;

  static AccountType? tryFromValue(String? value) {
    final normalized = value?.trim().toLowerCase();
    for (final item in values) {
      if (item.value == normalized) return item;
    }
    return null;
  }

  static AccountType fromValue(String? value) => values.firstWhere(
    (item) => item.value == value,
    orElse: () => AccountType.player,
  );
}
