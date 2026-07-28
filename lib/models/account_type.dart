import 'package:flutter/material.dart';

enum AccountType {
  player('player', 'لاعب', 'أبني ملفي الرياضي وأصل للفرص', Icons.sports_soccer),
  club('club', 'نادي', 'أكتشف اللاعبين وأدير فريقي', Icons.stadium),
  academy(
    'academy',
    'أكاديمية',
    'أدير اللاعبين والبرامج التدريبية',
    Icons.school,
  ),
  agent('agent', 'وكيل لاعبين', 'أدير المواهب والفرص والعقود', Icons.handshake),
  trainer(
    'trainer',
    'مدرب',
    'أتابع لاعبيّ وتطورهم الرياضي',
    Icons.fitness_center,
  ),
  marketer(
    'marketer',
    'مسوّق رياضي',
    'أدير حملات وفرص اللاعبين',
    Icons.campaign,
  );

  const AccountType(this.value, this.arabicName, this.description, this.icon);

  final String value;
  final String arabicName;
  final String description;
  final IconData icon;

  bool get isPlayer => this == AccountType.player;

  static AccountType fromValue(String? value) => values.firstWhere(
    (item) => item.value == value,
    orElse: () => AccountType.player,
  );
}
