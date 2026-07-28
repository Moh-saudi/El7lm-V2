import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../models/account_type.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({
    super.key,
    required this.accountType,
    required this.displayName,
    required this.onNavigate,
  });

  final AccountType accountType;
  final String displayName;
  final ValueChanged<int> onNavigate;

  @override
  Widget build(BuildContext context) {
    final player = accountType.isPlayer;
    return ListView(
      padding: const EdgeInsets.all(18),
      children: [
        Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.navy, Color(0xFF243378)],
              begin: Alignment.topRight,
              end: Alignment.bottomLeft,
            ),
            borderRadius: BorderRadius.circular(26),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                displayName.isEmpty
                    ? 'أهلًا بك في الحلم'
                    : 'أهلًا $displayName',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                player
                    ? 'كل خطوة تكملها في ملفك تقرّب موهبتك من الفرصة المناسبة.'
                    : 'أدر لاعبيك وشارك كود الدعوة من مكان واحد.',
                style: const TextStyle(color: Colors.white70, height: 1.6),
              ),
              const SizedBox(height: 18),
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.gold,
                  foregroundColor: AppColors.ink,
                  minimumSize: const Size(0, 44),
                ),
                onPressed: () => onNavigate(player ? 4 : 1),
                child: Text(player ? 'أكمل ملفك الرياضي' : 'إدارة اللاعبين'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Text(
          player ? 'ابدأ من هنا' : 'لوحة الحساب',
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 12),
        if (player)
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.15,
            children: [
              _QuickCard(
                title: 'البحث عن لاعبين',
                subtitle: 'اكتشف المواهب',
                icon: Icons.groups_rounded,
                onTap: () => onNavigate(1),
              ),
              _QuickCard(
                title: 'سينما اللاعبين',
                subtitle: 'شاهد أبرز اللقطات',
                icon: Icons.smart_display_rounded,
                onTap: () => onNavigate(2),
              ),
              _QuickCard(
                title: 'الفرص',
                subtitle: 'قدّم الآن',
                icon: Icons.explore_rounded,
                onTap: () => onNavigate(3),
              ),
              _QuickCard(
                title: 'ملفي الرياضي',
                subtitle: 'السيرة والبيانات',
                icon: Icons.badge_outlined,
                onTap: () => onNavigate(4),
              ),
            ],
          )
        else
          _QuickCard(
            title: 'إدارة اللاعبين',
            subtitle: 'قائمة اللاعبين وإنشاء كود دعوة جديد',
            icon: Icons.group_add_rounded,
            onTap: () => onNavigate(1),
          ),
        const SizedBox(height: 18),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.green.withValues(alpha: .1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.card_giftcard,
                    color: AppColors.green,
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'كل المزايا مجانية الآن',
                        style: TextStyle(fontWeight: FontWeight.w800),
                      ),
                      Text(
                        'لا توجد رسوم على أي نوع حساب في هذه المرحلة.',
                        style: TextStyle(color: AppColors.muted, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _QuickCard extends StatelessWidget {
  const _QuickCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: AppColors.green, size: 30),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: AppColors.muted,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
