import 'dart:math' as math;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/account_type.dart';
import '../../models/app_notification.dart';
import '../../models/opportunity.dart';
import '../../models/player.dart';
import '../../models/user_profile.dart';
import '../../services/data_service.dart';
import '../../widgets/company_footer.dart';
import '../messages/chat_detail_screen.dart';
import '../players/manage_players_screen.dart';
import '../players/player_details_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({
    super.key,
    required this.accountType,
    required this.displayName,
    required this.dataService,
    required this.onNavigate,
  });

  final AccountType accountType;
  final String displayName;
  final DataService dataService;
  final ValueChanged<int> onNavigate;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late Future<_DashboardData> future;

  @override
  void initState() {
    super.initState();
    future = _load();
  }

  Future<_DashboardData> _load() async {
    if (!widget.accountType.isPlayer) return const _DashboardData();

    final results = await Future.wait<dynamic>([
      widget.dataService
          .fetchProfile(AccountType.player)
          .then<UserProfile?>((value) => value)
          .catchError((_) => null),
      widget.dataService
          .fetchOpportunities()
          .then<List<Opportunity>>((value) => value)
          .catchError((_) => const <Opportunity>[]),
      widget.dataService
          .fetchNotifications()
          .then<List<AppNotification>>((value) => value)
          .catchError((_) => const <AppNotification>[]),
    ]);

    return _DashboardData(
      profile: results[0] as UserProfile?,
      opportunities: results[1] as List<Opportunity>,
      notifications: results[2] as List<AppNotification>,
    );
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() => future = next);
    await next;
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.accountType.isPlayer) {
      return _ManagerDashboard(
        displayName: widget.displayName,
        accountType: widget.accountType,
        dataService: widget.dataService,
        onNavigate: widget.onNavigate,
      );
    }

    return FutureBuilder<_DashboardData>(
      future: future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        final data = snapshot.data ?? const _DashboardData();
        return _PlayerTodayDashboard(
          displayName: widget.displayName,
          data: data,
          dataService: widget.dataService,
          onNavigate: widget.onNavigate,
          onRefresh: _refresh,
        );
      },
    );
  }
}

class _PlayerTodayDashboard extends StatelessWidget {
  const _PlayerTodayDashboard({
    required this.displayName,
    required this.data,
    required this.dataService,
    required this.onNavigate,
    required this.onRefresh,
  });

  final String displayName;
  final _DashboardData data;
  final DataService dataService;
  final ValueChanged<int> onNavigate;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final readiness = _ProfileReadiness.from(data.profile);
    final nextStep = readiness.nextStep;
    final opportunity = _bestOpportunity(data.profile, data.opportunities);
    final latestNotification = data.notifications.firstOrNull;

    final profileValues = data.profile?.values ?? <String, dynamic>{};
    final orgRaw = profileValues['_organization'] ?? profileValues['organization'];
    Map<String, dynamic>? organization;
    if (orgRaw is Map<String, dynamic> && orgRaw.isNotEmpty) {
      organization = orgRaw;
    } else if (profileValues['organizationId'] != null ||
        profileValues['organization_name'] != null ||
        profileValues['academy_name'] != null ||
        profileValues['club_name'] != null) {
      organization = {
        'id': profileValues['organizationId'] ?? 'org_acad_hlm_int',
        'type': profileValues['organizationType'] ?? 'academy',
        'name': profileValues['organization_name'] ??
            profileValues['academy_name'] ??
            profileValues['club_name'] ??
            'أكاديمية الحلم الدولية',
        'joinedAt': profileValues['joinedAt'] ?? '2026-08-06',
        'code': profileValues['referralCodeUsed'] ?? 'ACDVMRC44',
      };
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 104),
        children: [
          _CareerHeader(
            displayName: displayName,
            readiness: readiness.percent,
            onProfile: () => onNavigate(4),
          ),
          if (organization != null) ...[
            const SizedBox(height: 14),
            _OrganizationDashboardBanner(
              organization: organization,
              dataService: dataService,
            ),
          ],
          const SizedBox(height: 18),
          _SectionTitle(
            eyebrow: context.tr('todayPriority'),
            title: context.tr('nextCareerStep'),
          ),
          const SizedBox(height: 10),
          _NextStepCard(
            step: nextStep,
            onTap: () => onNavigate(nextStep.destination),
          ),
          const SizedBox(height: 22),
          _SectionTitle(
            eyebrow: context.tr('selectedForYou'),
            title: context.tr('closestOpportunity'),
            action: context.tr('viewAll'),
            onAction: () => onNavigate(3),
          ),
          const SizedBox(height: 10),
          _OpportunitySpotlight(match: opportunity, onTap: () => onNavigate(3)),
          const SizedBox(height: 22),
          _SectionTitle(
            eyebrow: context.tr('buildMomentum'),
            title: context.tr('weeklyCareerPlan'),
          ),
          const SizedBox(height: 10),
          _WeeklyPlanCard(
            readiness: readiness,
            hasOpportunity: data.opportunities.isNotEmpty,
            onProfile: () => onNavigate(4),
            onOpportunity: () => onNavigate(3),
          ),
          const SizedBox(height: 22),
          _SectionTitle(
            eyebrow: context.tr('careerPulse'),
            title: context.tr('latestImportantActivity'),
          ),
          const SizedBox(height: 10),
          _LatestActivityCard(
            notification: latestNotification,
            onTap: () => onNavigate(0),
          ),
          const SizedBox(height: 22),
          _WearablePreviewCard(onTap: () => _showWearablePreview(context)),
          const SizedBox(height: 18),
          const FreeAccountsBanner(),
          const CompanyFooter(),
        ],
      ),
    );
  }

  Future<void> _showWearablePreview(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      useSafeArea: true,
      builder: (sheetContext) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircleAvatar(
              radius: 30,
              backgroundColor: Color(0xFFFFF3F1),
              child: Icon(
                Icons.watch_rounded,
                color: Color(0xFFE5484D),
                size: 34,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              sheetContext.tr('wearableCenterTitle'),
              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            Text(
              sheetContext.tr('wearableComingExplanation'),
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.muted, height: 1.6),
            ),
            const SizedBox(height: 18),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: [
                _MetricChip(
                  icon: Icons.directions_walk,
                  text: sheetContext.tr('steps'),
                ),
                _MetricChip(
                  icon: Icons.favorite_outline,
                  text: sheetContext.tr('heartRate'),
                ),
                _MetricChip(
                  icon: Icons.bedtime_outlined,
                  text: sheetContext.tr('sleep'),
                ),
                _MetricChip(
                  icon: Icons.sports_score,
                  text: sheetContext.tr('workouts'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CareerHeader extends StatelessWidget {
  const _CareerHeader({
    required this.displayName,
    required this.readiness,
    required this.onProfile,
  });

  final String displayName;
  final int readiness;
  final VoidCallback onProfile;

  @override
  Widget build(BuildContext context) {
    final name = displayName.trim();
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0A1239), Color(0xFF173E63), Color(0xFF087F5B)],
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
        ),
        borderRadius: BorderRadius.circular(28),
        boxShadow: const [
          BoxShadow(
            color: Color(0x38111A4B),
            blurRadius: 28,
            offset: Offset(0, 14),
          ),
        ],
      ),
      child: Stack(
        children: [
          const PositionedDirectional(
            end: -22,
            top: -36,
            child: Icon(
              Icons.sports_soccer_rounded,
              color: Color(0x18FFFFFF),
              size: 150,
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                context.tr('yourFieldToday'),
                style: const TextStyle(
                  color: AppColors.gold,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  letterSpacing: .4,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                name.isEmpty
                    ? context.tr('welcomeDream')
                    : context.tr('welcomeName', {'name': name}),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  SizedBox(
                    width: 74,
                    height: 74,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox.expand(
                          child: CircularProgressIndicator(
                            value: readiness / 100,
                            strokeWidth: 7,
                            backgroundColor: Colors.white24,
                            color: AppColors.gold,
                          ),
                        ),
                        Text(
                          '$readiness%',
                          textDirection: TextDirection.ltr,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 15),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.tr('clubReadiness'),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          context.tr('readinessExplanation'),
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 11,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: onProfile,
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.white38),
                  backgroundColor: Colors.white.withValues(alpha: .08),
                ),
                icon: const Icon(Icons.insights_rounded, size: 18),
                label: Text(context.tr('improveReadiness')),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _NextStepCard extends StatelessWidget {
  const _NextStepCard({required this.step, required this.onTap});

  final _CareerStep step;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Container(
          padding: const EdgeInsets.all(17),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: AppColors.gold.withValues(alpha: .45)),
          ),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: AppColors.gold.withValues(alpha: .14),
                  borderRadius: BorderRadius.circular(17),
                ),
                child: Icon(step.icon, color: const Color(0xFFB66F00)),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.tr(step.titleKey),
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      context.tr(step.descriptionKey),
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 12,
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios_rounded, size: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _OpportunitySpotlight extends StatelessWidget {
  const _OpportunitySpotlight({required this.match, required this.onTap});

  final _OpportunityMatch? match;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    if (match == null) {
      return _EmptyFeatureCard(
        icon: Icons.explore_outlined,
        title: context.tr('noRecommendedOpportunity'),
        subtitle: context.tr('checkOpportunitiesSoon'),
      );
    }
    final item = match!.opportunity;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF102847),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const CircleAvatar(
                backgroundColor: Color(0x22FFFFFF),
                foregroundColor: AppColors.gold,
                child: Icon(Icons.workspace_premium_outlined),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title.isEmpty
                          ? context.tr('sportsOpportunity')
                          : item.title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    if (item.organizerName.isNotEmpty)
                      Text(
                        item.organizerName,
                        style: const TextStyle(
                          color: Colors.white60,
                          fontSize: 12,
                        ),
                      ),
                  ],
                ),
              ),
              if (match!.percent != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.green,
                    borderRadius: BorderRadius.circular(30),
                  ),
                  child: Text(
                    '${match!.percent}%',
                    textDirection: TextDirection.ltr,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
            ],
          ),
          if (match!.reasonKeys.isNotEmpty) ...[
            const SizedBox(height: 15),
            Text(
              context.tr('whyThisFitsYou'),
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 11,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 7),
            Wrap(
              spacing: 7,
              runSpacing: 7,
              children: match!.reasonKeys
                  .map(
                    (key) => Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 9,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: .09),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        context.tr(key),
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 10,
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ],
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: onTap,
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.gold,
              foregroundColor: AppColors.ink,
            ),
            icon: const Icon(Icons.arrow_outward_rounded),
            label: Text(context.tr('reviewOpportunity')),
          ),
        ],
      ),
    );
  }
}

class _WeeklyPlanCard extends StatelessWidget {
  const _WeeklyPlanCard({
    required this.readiness,
    required this.hasOpportunity,
    required this.onProfile,
    required this.onOpportunity,
  });

  final _ProfileReadiness readiness;
  final bool hasOpportunity;
  final VoidCallback onProfile;
  final VoidCallback onOpportunity;

  @override
  Widget build(BuildContext context) {
    final tasks = [
      _PlanTask('weeklyTaskBasics', readiness.basicsComplete, onProfile),
      _PlanTask('weeklyTaskSports', readiness.sportsComplete, onProfile),
      _PlanTask('weeklyTaskOpportunity', false, onOpportunity),
    ];
    final complete = tasks.where((task) => task.complete).length;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    context.tr('tasksCompleted', {
                      'done': complete,
                      'total': tasks.length,
                    }),
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                ),
                Text(
                  '${((complete / tasks.length) * 100).round()}%',
                  textDirection: TextDirection.ltr,
                  style: const TextStyle(
                    color: AppColors.green,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            LinearProgressIndicator(
              value: complete / tasks.length,
              minHeight: 7,
              borderRadius: BorderRadius.circular(20),
              backgroundColor: const Color(0xFFE8EDF4),
              color: AppColors.green,
            ),
            const SizedBox(height: 12),
            ...tasks.map(
              (task) => ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                onTap: task.onTap,
                leading: Icon(
                  task.complete
                      ? Icons.check_circle_rounded
                      : Icons.radio_button_unchecked_rounded,
                  color: task.complete ? AppColors.green : AppColors.muted,
                ),
                title: Text(
                  context.tr(task.labelKey),
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    decoration: task.complete
                        ? TextDecoration.lineThrough
                        : null,
                    color: task.complete ? AppColors.muted : AppColors.ink,
                  ),
                ),
                trailing: task.complete
                    ? null
                    : const Icon(Icons.chevron_right_rounded),
              ),
            ),
            if (!hasOpportunity)
              Text(
                context.tr('opportunityTaskWaiting'),
                style: const TextStyle(color: AppColors.muted, fontSize: 11),
              ),
          ],
        ),
      ),
    );
  }
}

class _LatestActivityCard extends StatelessWidget {
  const _LatestActivityCard({required this.notification, required this.onTap});

  final AppNotification? notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    if (notification == null) {
      return _EmptyFeatureCard(
        icon: Icons.notifications_active_outlined,
        title: context.tr('careerQuietNow'),
        subtitle: context.tr('careerActivityWillAppear'),
      );
    }
    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.all(14),
        leading: CircleAvatar(
          backgroundColor: AppColors.green.withValues(alpha: .12),
          foregroundColor: AppColors.green,
          child: const Icon(Icons.bolt_rounded),
        ),
        title: Text(
          notification!.title.isEmpty
              ? context.tr('newCareerActivity')
              : notification!.title,
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
        subtitle: notification!.message.isEmpty
            ? null
            : Text(
                notification!.message,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
        trailing: notification!.isRead
            ? null
            : const CircleAvatar(radius: 5, backgroundColor: AppColors.gold),
      ),
    );
  }
}

class _WearablePreviewCard extends StatelessWidget {
  const _WearablePreviewCard({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Ink(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFFFF4F1), Color(0xFFFFFBF0)],
          ),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFFFFD9CF)),
        ),
        child: Row(
          children: [
            const CircleAvatar(
              radius: 27,
              backgroundColor: Colors.white,
              foregroundColor: Color(0xFFE5484D),
              child: Icon(Icons.watch_rounded, size: 29),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          context.tr('myReadinessToday'),
                          style: const TextStyle(fontWeight: FontWeight.w900),
                        ),
                      ),
                      const SizedBox(width: 7),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 7,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.gold.withValues(alpha: .18),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          context.tr('comingSoon'),
                          style: const TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    context.tr('connectWatchPreview'),
                    style: const TextStyle(
                      color: AppColors.muted,
                      fontSize: 11,
                      height: 1.45,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({
    required this.eyebrow,
    required this.title,
    this.action,
    this.onAction,
  });

  final String eyebrow;
  final String title;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                eyebrow,
                style: const TextStyle(
                  color: AppColors.green,
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                ),
              ),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
        if (action != null)
          TextButton(onPressed: onAction, child: Text(action!)),
      ],
    );
  }
}

class _EmptyFeatureCard extends StatelessWidget {
  const _EmptyFeatureCard({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: AppColors.green.withValues(alpha: .1),
              foregroundColor: AppColors.green,
              child: Icon(icon),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w900),
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
            ),
          ],
        ),
      ),
    );
  }
}

class _MetricChip extends StatelessWidget {
  const _MetricChip({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Chip(
      avatar: Icon(icon, size: 17, color: AppColors.green),
      label: Text(text),
      side: BorderSide.none,
      backgroundColor: AppColors.green.withValues(alpha: .08),
    );
  }
}

class _ManagerDashboard extends StatelessWidget {
  const _ManagerDashboard({
    required this.displayName,
    required this.accountType,
    required this.dataService,
    required this.onNavigate,
  });

  final String displayName;
  final AccountType accountType;
  final DataService dataService;
  final ValueChanged<int> onNavigate;

  @override
  Widget build(BuildContext context) {
    final title = displayName.trim().isEmpty
        ? context.tr('welcomeDream')
        : context.tr('welcomeName', {'name': displayName});

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      children: [
        // 1. Header Banner
        Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.navy, Color(0xFF173E63), AppColors.green],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(26),
            boxShadow: [
              BoxShadow(
                color: AppColors.navy.withValues(alpha: .2),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const CircleAvatar(
                    backgroundColor: Colors.white24,
                    radius: 22,
                    child: Icon(Icons.stadium_rounded, color: AppColors.gold, size: 26),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                context.tr('managerWelcomeText'),
                style: const TextStyle(color: Colors.white70, height: 1.5, fontSize: 14),
              ),
              const SizedBox(height: 18),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.gold,
                      foregroundColor: AppColors.ink,
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    ),
                    onPressed: () => onNavigate(1),
                    icon: const Icon(Icons.person_search_rounded, size: 20),
                    label: Text(context.tr('players')),
                  ),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Colors.white38),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    onPressed: () => onNavigate(2),
                    icon: const Icon(Icons.group_add_rounded, size: 20),
                    label: Text(context.tr('invitePlayer')),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Player Roster Slider above Management Center
        _PlayersHorizontalSlider(
          dataService: dataService,
          accountType: accountType,
          onNavigate: onNavigate,
        ),
        const SizedBox(height: 20),

        // 2. Section Title: Quick Actions
        _SectionTitle(
          eyebrow: context.tr('managerHub'),
          title: context.tr('quickActions'),
        ),
        const SizedBox(height: 12),

        // 3. Compact Quick Action Grid
        Row(
          children: [
            Expanded(
              child: _ManagerCardTile(
                icon: Icons.person_search_rounded,
                iconColor: AppColors.green,
                title: context.tr('players'),
                onTap: () => onNavigate(1),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _ManagerCardTile(
                icon: Icons.groups_rounded,
                iconColor: AppColors.navy,
                title: context.tr('managePlayers'),
                onTap: () => onNavigate(2),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _ManagerCardTile(
                icon: Icons.movie_creation_rounded,
                iconColor: const Color(0xFFE5484D),
                title: context.tr('talentCinema'),
                onTap: () => onNavigate(3),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _ManagerCardTile(
                icon: Icons.admin_panel_settings_rounded,
                iconColor: AppColors.gold,
                title: context.tr('myProfile'),
                onTap: () => onNavigate(4),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // 4. Live Squad & Roster Analytics Card
        FutureBuilder<List<Map<String, dynamic>>>(
          future: dataService.fetchManagedPlayers(accountType),
          builder: (context, snapshot) {
            if (snapshot.hasData && snapshot.data!.isNotEmpty) {
              return RosterAnalyticsCard(players: snapshot.data!);
            }
            return const SizedBox.shrink();
          },
        ),

        // 5. Official Tournament Registration Banner
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF8A6400), Color(0xFFD4AF37), Color(0xFFF7D070)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(22),
            boxShadow: [
              BoxShadow(
                color: AppColors.gold.withValues(alpha: .25),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const CircleAvatar(
                    backgroundColor: Colors.white24,
                    radius: 22,
                    child: Icon(Icons.emoji_events_rounded, color: Colors.white, size: 26),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.tr('tournamentsPortalTitle'),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          context.tr('tournamentsPortalSubtitle'),
                          style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.ink,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                ),
                onPressed: () async {
                  final uri = Uri.parse('https://el7lm.com/tournaments/unified-registration');
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                },
                icon: const Icon(Icons.verified_rounded, size: 18, color: AppColors.gold),
                label: Text(context.tr('registerInTournament')),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // 5. Feature Spotlight Card
        Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.gold.withValues(alpha: 0.4), width: 1.5),
            ),
            child: Row(
              children: [
                const CircleAvatar(
                  radius: 24,
                  backgroundColor: Color(0x22FFD700),
                  child: Icon(Icons.star_rounded, color: AppColors.gold, size: 28),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.gold,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          context.tr('scoutTalentsTitle'),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            color: AppColors.ink,
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        context.tr('scoutTalentsSubtitle'),
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.white70,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // 6. Social Media Official Channels
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.tr('followEl7lm'),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _SocialIconButton(
                      icon: Icons.facebook_rounded,
                      color: const Color(0xFF1877F2),
                      url: 'https://www.facebook.com/hagzz',
                    ),
                    _SocialIconButton(
                      icon: Icons.camera_alt_rounded,
                      color: const Color(0xFFE4405F),
                      url: 'https://www.instagram.com/hagzzel7lm',
                    ),
                    _SocialIconButton(
                      icon: Icons.video_library_rounded,
                      color: Colors.black,
                      url: 'https://www.tiktok.com/@hagzz25',
                    ),
                    _SocialIconButton(
                      icon: Icons.work_rounded,
                      color: const Color(0xFF0A66C2),
                      url: 'https://www.linkedin.com/company/hagzz',
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),

        const FreeAccountsBanner(),
        const CompanyFooter(),
      ],
    );
  }
}

class _ManagerCardTile extends StatelessWidget {
  const _ManagerCardTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0.5,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          child: Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: iconColor.withValues(alpha: .12),
                child: Icon(icon, color: iconColor, size: 18),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DashboardData {
  const _DashboardData({
    this.profile,
    this.opportunities = const [],
    this.notifications = const [],
  });

  final UserProfile? profile;
  final List<Opportunity> opportunities;
  final List<AppNotification> notifications;
}

class _ProfileReadiness {
  const _ProfileReadiness({
    required this.percent,
    required this.basicsComplete,
    required this.sportsComplete,
    required this.mediaComplete,
    required this.nextStep,
  });

  final int percent;
  final bool basicsComplete;
  final bool sportsComplete;
  final bool mediaComplete;
  final _CareerStep nextStep;

  factory _ProfileReadiness.from(UserProfile? profile) {
    final values = profile?.values ?? const <String, dynamic>{};
    final name = _has(values, ['name', 'full_name', 'displayName']);
    final birth = _has(values, ['birth_date', 'birthDate', 'age']);
    final country = _has(values, ['country', 'nationality']);
    final phone = _has(values, ['phone', 'phoneNumber', 'whatsapp']);
    final position = _has(values, ['position', 'primary_position']);
    final foot = _has(values, ['foot', 'preferred_foot']);
    final height = _has(values, ['height', 'height_cm']);
    final weight = _has(values, ['weight', 'weight_kg']);
    final image = _has(values, [
      'profile_image_url',
      'profile_image',
      'image',
      'avatar',
    ]);
    final media = _hasMedia(values);
    final checks = [
      name,
      birth,
      country,
      phone,
      position,
      foot,
      height,
      weight,
      image,
      media,
    ];
    final percent =
        ((checks.where((value) => value).length / checks.length) * 100).round();
    final basics = name && birth && country && phone && image;
    final sports = position && foot && height && weight;

    final _CareerStep next;
    if (!basics) {
      next = const _CareerStep(
        'completeIdentityStep',
        'completeIdentityStepDesc',
        Icons.person_search_rounded,
        4,
      );
    } else if (!sports) {
      next = const _CareerStep(
        'completeSportsStep',
        'completeSportsStepDesc',
        Icons.sports_soccer_rounded,
        4,
      );
    } else if (!media) {
      next = const _CareerStep(
        'addHighlightStep',
        'addHighlightStepDesc',
        Icons.video_call_rounded,
        4,
      );
    } else {
      next = const _CareerStep(
        'exploreOpportunityStep',
        'exploreOpportunityStepDesc',
        Icons.travel_explore_rounded,
        3,
      );
    }

    return _ProfileReadiness(
      percent: percent,
      basicsComplete: basics,
      sportsComplete: sports,
      mediaComplete: media,
      nextStep: next,
    );
  }
}

class _CareerStep {
  const _CareerStep(
    this.titleKey,
    this.descriptionKey,
    this.icon,
    this.destination,
  );

  final String titleKey;
  final String descriptionKey;
  final IconData icon;
  final int destination;
}

class _PlanTask {
  const _PlanTask(this.labelKey, this.complete, this.onTap);

  final String labelKey;
  final bool complete;
  final VoidCallback onTap;
}

class _OpportunityMatch {
  const _OpportunityMatch(this.opportunity, this.percent, this.reasonKeys);

  final Opportunity opportunity;
  final int? percent;
  final List<String> reasonKeys;
}

_OpportunityMatch? _bestOpportunity(
  UserProfile? profile,
  List<Opportunity> opportunities,
) {
  if (opportunities.isEmpty) return null;
  final values = profile?.values ?? const <String, dynamic>{};
  final playerPosition = _text(values, ['position', 'primary_position']);
  final playerCountry = _text(values, ['country', 'nationality']);
  final playerAge = _age(values);

  final matches = opportunities.map((opportunity) {
    var possible = 0;
    var earned = 0;
    final reasons = <String>[];

    if (opportunity.positions.isNotEmpty) {
      possible += 50;
      final fits =
          playerPosition.isNotEmpty &&
          opportunity.positions.any(
            (position) => _sameText(position, playerPosition),
          );
      if (fits) {
        earned += 50;
        reasons.add('positionMatches');
      }
    }
    if (opportunity.country.trim().isNotEmpty) {
      possible += 30;
      if (playerCountry.isNotEmpty &&
          _sameText(opportunity.country, playerCountry)) {
        earned += 30;
        reasons.add('countryMatches');
      }
    }
    final minAge = _asInt(
      opportunity.rawPayload['minAge'] ?? opportunity.rawPayload['min_age'],
    );
    final maxAge = _asInt(
      opportunity.rawPayload['maxAge'] ?? opportunity.rawPayload['max_age'],
    );
    if (minAge != null || maxAge != null) {
      possible += 20;
      if (playerAge != null &&
          (minAge == null || playerAge >= minAge) &&
          (maxAge == null || playerAge <= maxAge)) {
        earned += 20;
        reasons.add('ageMatches');
      }
    }

    final percent = possible == 0 ? null : ((earned / possible) * 100).round();
    return _OpportunityMatch(opportunity, percent, reasons);
  }).toList();

  matches.sort((left, right) {
    final byScore = (right.percent ?? -1).compareTo(left.percent ?? -1);
    if (byScore != 0) return byScore;
    final farFuture = DateTime(2100);
    return (left.opportunity.deadline ?? farFuture).compareTo(
      right.opportunity.deadline ?? farFuture,
    );
  });
  return matches.first;
}

bool _has(Map<String, dynamic> values, List<String> keys) {
  for (final key in keys) {
    final value = values[key];
    if (value == null) continue;
    if (value is String && value.trim().isNotEmpty && value != 'null') {
      return true;
    }
    if (value is num || value is bool) return true;
    if (value is List && value.isNotEmpty) return true;
    if (value is Map && value.isNotEmpty) return true;
  }
  return false;
}

bool _hasMedia(Map<String, dynamic> values) {
  return _has(values, [
    'videos',
    'video_url',
    'videoUrl',
    'highlight_video',
    'gallery',
    'photos',
    'additional_images',
  ]);
}

String _text(Map<String, dynamic> values, List<String> keys) {
  for (final key in keys) {
    final value = '${values[key] ?? ''}'.trim();
    if (value.isNotEmpty && value != 'null') return value;
  }
  return '';
}

int? _age(Map<String, dynamic> values) {
  final explicit = _asInt(values['age']);
  if (explicit != null) return explicit;
  final birth = DateTime.tryParse(
    '${values['birth_date'] ?? values['birthDate'] ?? ''}',
  );
  if (birth == null) return null;
  final now = DateTime.now();
  var result = now.year - birth.year;
  if (now.month < birth.month ||
      (now.month == birth.month && now.day < birth.day)) {
    result--;
  }
  return math.max(0, result);
}

int? _asInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.round();
  return int.tryParse('${value ?? ''}');
}

bool _sameText(String left, String right) {
  final a = left.trim().toLowerCase();
  final b = right.trim().toLowerCase();
  return a == b || a.contains(b) || b.contains(a);
}

class _SocialIconButton extends StatelessWidget {
  const _SocialIconButton({
    required this.icon,
    required this.color,
    required this.url,
  });

  final IconData icon;
  final Color color;
  final String url;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(30),
      onTap: () async {
        final uri = Uri.parse(url);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      },
      child: CircleAvatar(
        radius: 22,
        backgroundColor: color.withValues(alpha: .12),
        child: Icon(icon, color: color, size: 22),
      ),
    );
  }
}

class _OrganizationDashboardBanner extends StatelessWidget {
  const _OrganizationDashboardBanner({
    required this.organization,
    required this.dataService,
  });

  final Map<String, dynamic> organization;
  final DataService dataService;

  @override
  Widget build(BuildContext context) {
    final orgName =
        organization['name']?.toString() ?? 'أكاديمية الحلم الدولية';
    final orgType = organization['type']?.toString() ?? 'academy';
    final joinedAtStr = organization['joinedAt']?.toString();
    DateTime? joinedAt;
    if (joinedAtStr != null) {
      joinedAt = DateTime.tryParse(joinedAtStr);
    }
    final formattedDate = joinedAt != null
        ? '${joinedAt.year}-${joinedAt.month.toString().padLeft(2, '0')}-${joinedAt.day.toString().padLeft(2, '0')}'
        : 'مؤخراً';

    final typeLabel = switch (orgType) {
      'club' => 'نادي رياضي رسمي ⚽',
      'academy' => 'أكاديمية معتمدة 🏆',
      'trainer' => 'مدرب شخصي 🏃',
      'agent' => 'وكيل لاعبين 💼',
      _ => 'منظمة رياضية 🏟️',
    };

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF0F172A),
            Color(0xFF1E293B),
            Color(0xFF065F46),
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF10B981).withValues(alpha: .25),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
        border: Border.all(
          color: const Color(0xFFFFD700).withValues(alpha: .5),
          width: 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.gold.withValues(alpha: 0.2),
                  border: Border.all(color: AppColors.gold, width: 2),
                ),
                child: const Center(
                  child: Icon(
                    Icons.verified_rounded,
                    color: AppColors.gold,
                    size: 26,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      orgName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            typeLabel,
                            style: const TextStyle(
                              color: AppColors.gold,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Icon(
                          Icons.circle,
                          color: Color(0xFF10B981),
                          size: 8,
                        ),
                        const SizedBox(width: 4),
                        const Text(
                          'عضو منضم نشط',
                          style: TextStyle(
                            color: Color(0xFF6EE7B7),
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(color: Colors.white24, height: 1),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'تاريخ الانضمام: $formattedDate',
                style: const TextStyle(color: Colors.white70, fontSize: 12),
              ),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 8,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                onPressed: () async {
                  final orgId =
                      organization['id']?.toString() ?? 'org_acad_hlm_int';
                  final conv = await dataService.startOrCreateConversation(
                    targetId: orgId,
                    targetName: orgName,
                    targetType: orgType,
                  );
                  if (!context.mounted) return;
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => ChatDetailScreen(
                        conversation: conv,
                        targetId: orgId,
                        targetName: orgName,
                        targetType: orgType,
                        dataService: dataService,
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.chat_bubble_rounded, size: 16),
                label: const Text(
                  'مراسلة الإدارة',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _PlayersHorizontalSlider extends StatelessWidget {
  const _PlayersHorizontalSlider({
    required this.dataService,
    required this.accountType,
    required this.onNavigate,
  });

  final DataService dataService;
  final AccountType accountType;
  final ValueChanged<int> onNavigate;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: dataService.fetchManagedPlayers(accountType),
      builder: (context, snapshot) {
        final rawManaged = snapshot.data ?? [];
        final managedPlayers = rawManaged.map((m) => Player.fromJson(m)).toList();
        final hasManaged = managedPlayers.isNotEmpty;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                    ),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.gold.withValues(alpha: 0.5), width: 1.5),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x40000000),
                        blurRadius: 8,
                        offset: Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.stars_rounded, size: 18, color: AppColors.gold),
                      const SizedBox(width: 6),
                      Text(
                        hasManaged
                            ? '${context.tr('players')} (${managedPlayers.length})'
                            : context.tr('scoutTalentsTitle'),
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
                TextButton.icon(
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.gold,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  ),
                  onPressed: () => onNavigate(2),
                  icon: const Icon(Icons.arrow_forward_rounded, size: 14),
                  label: Text(
                    context.tr('viewAll'),
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.gold,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: 115,
              child: hasManaged
                  ? ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: managedPlayers.length + 1,
                      separatorBuilder: (context, _) => const SizedBox(width: 10),
                      itemBuilder: (context, index) {
                        if (index == managedPlayers.length) {
                          return _AddPlayerSquareCard(onTap: () => onNavigate(2));
                        }
                        return _PlayerSquareCard(
                          player: managedPlayers[index],
                          dataService: dataService,
                        );
                      },
                    )
                  : FutureBuilder<List<Player>>(
                      future: dataService.fetchPlayers(),
                      builder: (context, allSnapshot) {
                        final allPlayers = allSnapshot.data ?? [];
                        if (allPlayers.isEmpty) {
                          return _AddPlayerSquareCard(onTap: () => onNavigate(2));
                        }
                        return ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: math.min(allPlayers.length, 12) + 1,
                          separatorBuilder: (context, _) => const SizedBox(width: 10),
                          itemBuilder: (context, index) {
                            if (index == math.min(allPlayers.length, 12)) {
                              return _AddPlayerSquareCard(onTap: () => onNavigate(2));
                            }
                            return _PlayerSquareCard(
                              player: allPlayers[index],
                              dataService: dataService,
                            );
                          },
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }
}

class _PlayerSquareCard extends StatelessWidget {
  const _PlayerSquareCard({
    required this.player,
    required this.dataService,
  });

  final Player player;
  final DataService dataService;

  @override
  Widget build(BuildContext context) {
    final pos = player.position.isNotEmpty ? player.position : 'لاعب';

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => PlayerDetailsScreen(
                initialPlayer: player,
                dataService: dataService,
              ),
            ),
          );
        },
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: 88,
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.gold.withValues(alpha: 0.3)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.25),
                blurRadius: 6,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Stack(
                alignment: Alignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.gold, width: 1.5),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(24),
                      child: Container(
                        width: 48,
                        height: 48,
                        color: AppColors.navy,
                        child: player.imageUrl.isNotEmpty
                            ? CachedNetworkImage(
                                imageUrl: player.imageUrl,
                                fit: BoxFit.cover,
                                errorWidget: (context, url, error) => const Icon(
                                  Icons.person_rounded,
                                  color: Colors.white70,
                                  size: 28,
                                ),
                              )
                            : const Icon(
                                Icons.person_rounded,
                                color: Colors.white70,
                                size: 28,
                              ),
                      ),
                    ),
                  ),
                  if (player.position.isNotEmpty)
                    Positioned(
                      top: 0,
                      right: 0,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: AppColors.gold,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          player.position.length > 3
                              ? player.position.substring(0, 3)
                              : player.position,
                          style: const TextStyle(
                            color: AppColors.ink,
                            fontSize: 8,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                player.name.isNotEmpty ? player.name : 'لاعب',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                pos,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AddPlayerSquareCard extends StatelessWidget {
  const _AddPlayerSquareCard({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: 84,
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.04),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppColors.gold.withValues(alpha: 0.4),
            width: 1.5,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.gold.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.person_add_alt_1_rounded,
                color: AppColors.gold,
                size: 24,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              context.tr('invitePlayer'),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.gold,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

