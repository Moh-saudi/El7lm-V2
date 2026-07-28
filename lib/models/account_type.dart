import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';

enum AccountType {
  player('player', 'account.player', 'account.playerDesc', Icons.sports_soccer),
  club('club', 'account.club', 'account.clubDesc', Icons.stadium),
  academy('academy', 'account.academy', 'account.academyDesc', Icons.school),
  agent('agent', 'account.agent', 'account.agentDesc', Icons.handshake),
  trainer(
    'trainer',
    'account.trainer',
    'account.trainerDesc',
    Icons.fitness_center,
  ),
  marketer(
    'marketer',
    'account.marketer',
    'account.marketerDesc',
    Icons.campaign,
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

  static AccountType fromValue(String? value) => values.firstWhere(
    (item) => item.value == value,
    orElse: () => AccountType.player,
  );
}
