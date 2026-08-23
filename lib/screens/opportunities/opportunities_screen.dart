import 'dart:ui';
import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/opportunity.dart';
import '../../services/data_service.dart';
import '../../widgets/async_state_view.dart';
import '../messages/chat_detail_screen.dart';

class OpportunitiesScreen extends StatefulWidget {
  const OpportunitiesScreen({super.key, required this.dataService});

  final DataService dataService;

  @override
  State<OpportunitiesScreen> createState() => _OpportunitiesScreenState();
}

class _OpportunitiesScreenState extends State<OpportunitiesScreen> {
  late Future<List<Opportunity>> future;
  String? selectedCountryId;
  int selectedTab = 0; // 0: Available, 1: My Applications
  List<Map<String, dynamic>> appliedList = [];
  bool loadingApplied = false;

  final ScrollController _countryScrollController = ScrollController();

  final List<Map<String, String>> priorityCountries = [
    {'id': 'egypt', 'flag': '🇪🇬', 'match': 'مصر'},
    {'id': 'saudi', 'flag': '🇸🇦', 'match': 'السعودية'},
    {'id': 'qatar', 'flag': '🇶🇦', 'match': 'قطر'},
    {'id': 'uae', 'flag': '🇦🇪', 'match': 'الإمارات'},
    {'id': 'morocco', 'flag': '🇲🇦', 'match': 'المغرب'},
    {'id': 'algeria', 'flag': '🇩🇿', 'match': 'الجزائر'},
    {'id': 'tunisia', 'flag': '🇹🇳', 'match': 'تونس'},
    {'id': 'spain', 'flag': '🇪🇸', 'match': 'إسبانيا'},
    {'id': 'portugal', 'flag': '🇵🇹', 'match': 'البرتغال'},
  ];

  @override
  void initState() {
    super.initState();
    future = widget.dataService.fetchOpportunities();
    _loadAppliedList();
  }

  @override
  void dispose() {
    _countryScrollController.dispose();
    super.dispose();
  }

  Future<void> _loadAppliedList() async {
    setState(() => loadingApplied = true);
    try {
      final list = await widget.dataService.fetchAppliedOpportunities();
      if (mounted) setState(() => appliedList = list);
    } catch (_) {
    } finally {
      if (mounted) setState(() => loadingApplied = false);
    }
  }

  void _scrollCountries(bool forward) {
    if (!_countryScrollController.hasClients) return;
    final target = forward
        ? (_countryScrollController.offset + 180).clamp(
            0.0,
            _countryScrollController.position.maxScrollExtent,
          )
        : (_countryScrollController.offset - 180).clamp(
            0.0,
            _countryScrollController.position.maxScrollExtent,
          );
    _countryScrollController.animateTo(
      target,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
    );
  }

  bool _isAlreadyApplied(String opportunityId) {
    return appliedList.any((item) => item['opportunityId'] == opportunityId);
  }

  Future<void> _showApplicationModal(Opportunity opportunity) async {
    final notesController = TextEditingController();
    final posController = TextEditingController();
    var submitting = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.gold.withValues(alpha: .15),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(
                      Icons.workspace_premium_rounded,
                      color: AppColors.gold,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.tr('applyModalTitle'),
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 16,
                            color: AppColors.navy,
                          ),
                        ),
                        Text(
                          opportunity.title.isEmpty
                              ? context.tr('sportsOpportunity')
                              : opportunity.title,
                          style: const TextStyle(
                            color: AppColors.muted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.green.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppColors.green.withValues(alpha: 0.2),
                  ),
                ),
                child: Text(
                  context.tr('applyModalSubtitle'),
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.ink,
                    height: 1.4,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: posController,
                enabled: !submitting,
                decoration: InputDecoration(
                  labelText: context.tr('preferredPositionLabel'),
                  prefixIcon: const Icon(
                    Icons.sports_soccer_rounded,
                    color: AppColors.green,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: notesController,
                enabled: !submitting,
                minLines: 3,
                maxLines: 5,
                decoration: InputDecoration(
                  labelText: context.tr('statementOfInterest'),
                  hintText: context.tr('statementHint'),
                  alignLabelWithHint: true,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  backgroundColor: AppColors.green,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: submitting
                    ? null
                    : () async {
                        final appSentMessage = context.tr('applicationSent');
                        final messenger = ScaffoldMessenger.of(context);
                        setSheetState(() => submitting = true);
                        try {
                          await widget.dataService.applyForOpportunity(
                            opportunity.id,
                            notes: notesController.text.trim(),
                            preferredPosition: posController.text.trim(),
                          );
                          if (!sheetContext.mounted) return;
                          Navigator.pop(sheetContext);
                          await _loadAppliedList();
                          if (!mounted) return;
                          setState(() => selectedTab = 1);
                          messenger.showSnackBar(
                            SnackBar(
                              content: Text(appSentMessage),
                              backgroundColor: AppColors.green,
                            ),
                          );
                        } catch (e) {
                          if (!sheetContext.mounted) return;
                          setSheetState(() => submitting = false);
                          if (!mounted) return;
                          messenger.showSnackBar(
                            SnackBar(content: Text(context.errorText(e))),
                          );
                        }
                      },
                icon: submitting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.send_rounded),
                label: Text(
                  context.tr('confirmApplication'),
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ),
      ),
    );
    notesController.dispose();
    posController.dispose();
  }

  Future<void> _openChatWithOrganizer(Opportunity opportunity) async {
    final organizerId =
        '${opportunity.rawPayload['organizerId'] ?? opportunity.rawPayload['publisherId'] ?? opportunity.id}';
    final organizerName = opportunity.organizerName.isNotEmpty
        ? opportunity.organizerName
        : context.tr('verifiedOrganization');
    final organizerType =
        '${opportunity.rawPayload['organizerType'] ?? 'organization'}';

    try {
      final conv = await widget.dataService.startOrCreateConversation(
        targetId: organizerId,
        targetName: organizerName,
        targetType: organizerType,
      );
      if (!mounted) return;
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ChatDetailScreen(
            conversation: conv,
            targetId: organizerId,
            targetName: organizerName,
            targetType: organizerType,
            dataService: widget.dataService,
          ),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('openWebFailed'))),
      );
    }
  }

  String _formatDate(String isoString) {
    if (isoString.isEmpty) return '';
    try {
      final dt = DateTime.parse(isoString).toLocal();
      return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return isoString;
    }
  }

  @override
  Widget build(BuildContext context) {
    return AsyncStateView<List<Opportunity>>(
      future: future,
      builder: (context, opportunities) {
        final activeMatch = selectedCountryId == null
            ? null
            : priorityCountries.firstWhere(
                (c) => c['id'] == selectedCountryId,
              )['match'];

        final filtered = activeMatch == null
            ? opportunities
            : opportunities
                .where(
                  (o) => o.country.toLowerCase().contains(
                    activeMatch.toLowerCase(),
                  ),
                )
                .toList();

        return CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // ─── Header Segmented Tabs ───────────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => selectedTab = 0),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: selectedTab == 0
                                  ? Colors.white
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: selectedTab == 0
                                  ? [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: .05),
                                        blurRadius: 4,
                                        offset: const Offset(0, 2),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.explore_rounded,
                                  size: 18,
                                  color: selectedTab == 0
                                      ? AppColors.green
                                      : AppColors.muted,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  context.tr('availableOpportunities'),
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: selectedTab == 0
                                        ? FontWeight.bold
                                        : FontWeight.normal,
                                    color: selectedTab == 0
                                        ? AppColors.navy
                                        : AppColors.muted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => selectedTab = 1),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: selectedTab == 1
                                  ? Colors.white
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: selectedTab == 1
                                  ? [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: .05),
                                        blurRadius: 4,
                                        offset: const Offset(0, 2),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.assignment_turned_in_rounded,
                                  size: 18,
                                  color: selectedTab == 1
                                      ? AppColors.green
                                      : AppColors.muted,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  context.tr('myApplicationsHistory'),
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: selectedTab == 1
                                        ? FontWeight.bold
                                        : FontWeight.normal,
                                    color: selectedTab == 1
                                        ? AppColors.navy
                                        : AppColors.muted,
                                  ),
                                ),
                                if (appliedList.isNotEmpty) ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 6,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppColors.green,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Text(
                                      '${appliedList.length}',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            if (selectedTab == 0) ...[
              // ─── Territory Explorer ──────────────────────────────────────────
              SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
                          child: Text(
                            context.tr('exploreByCountry'),
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 18,
                              color: AppColors.navy,
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: Row(
                            children: [
                              IconButton(
                                icon: const Icon(
                                  Icons.arrow_back_ios_rounded,
                                  size: 16,
                                  color: AppColors.navy,
                                ),
                                onPressed: () => _scrollCountries(false),
                                visualDensity: VisualDensity.compact,
                              ),
                              IconButton(
                                icon: const Icon(
                                  Icons.arrow_forward_ios_rounded,
                                  size: 16,
                                  color: AppColors.navy,
                                ),
                                onPressed: () => _scrollCountries(true),
                                visualDensity: VisualDensity.compact,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    SizedBox(
                      height: 100,
                      child: ScrollConfiguration(
                        behavior: ScrollConfiguration.of(context).copyWith(
                          dragDevices: {
                            PointerDeviceKind.touch,
                            PointerDeviceKind.mouse,
                            PointerDeviceKind.trackpad,
                            PointerDeviceKind.stylus,
                          },
                        ),
                        child: ListView.builder(
                          controller: _countryScrollController,
                          physics: const BouncingScrollPhysics(
                            parent: AlwaysScrollableScrollPhysics(),
                          ),
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          itemCount: priorityCountries.length,
                          itemBuilder: (context, i) {
                            final c = priorityCountries[i];
                            final isSelected = selectedCountryId == c['id'];
                            return GestureDetector(
                              onTap: () {
                                setState(() {
                                  selectedCountryId = isSelected
                                      ? null
                                      : c['id'];
                                });
                              },
                              child: Container(
                                width: 80,
                                margin: const EdgeInsets.symmetric(
                                  horizontal: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? AppColors.green.withValues(alpha: .1)
                                      : Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: isSelected
                                        ? AppColors.green
                                        : Colors.grey.shade200,
                                    width: 2,
                                  ),
                                ),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      c['flag']!,
                                      style: const TextStyle(fontSize: 32),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      context.tr('country.${c['id']}'),
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: isSelected
                                            ? FontWeight.w900
                                            : FontWeight.bold,
                                        color: isSelected
                                            ? AppColors.green
                                            : AppColors.ink,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // ─── Section Title ───────────────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          selectedCountryId == null
                              ? context.tr('latestOpportunities')
                              : context.tr('opportunitiesIn', {
                                  'country': context.tr(
                                    'country.$selectedCountryId',
                                  ),
                                }),
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 18,
                            color: AppColors.navy,
                          ),
                        ),
                      ),
                      if (selectedCountryId != null)
                        TextButton(
                          onPressed: () =>
                              setState(() => selectedCountryId = null),
                          child: Text(context.tr('viewAll')),
                        ),
                    ],
                  ),
                ),
              ),

              // ─── Available Opportunities List ─────────────────────────────
              if (filtered.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.search_off_rounded,
                          size: 64,
                          color: Colors.grey.shade300,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          context.tr('noOpportunities'),
                          style: const TextStyle(color: AppColors.muted),
                        ),
                      ],
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final item = filtered[index];
                        final applied = _isAlreadyApplied(item.id);
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _OpportunityCard(
                            opportunity: item,
                            isApplied: applied,
                            onApply: () => _showApplicationModal(item),
                          ),
                        );
                      },
                      childCount: filtered.length,
                    ),
                  ),
                ),
            ] else ...[
              // ─── My Applications History Tab ──────────────────────────────
              if (appliedList.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.assignment_late_outlined,
                          size: 64,
                          color: Colors.grey.shade300,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          context.tr('noOpportunities'),
                          style: const TextStyle(color: AppColors.muted),
                        ),
                      ],
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final appItem = appliedList[index];
                        final oppId = '${appItem['opportunityId']}';
                        final matchedOpp = opportunities.firstWhere(
                          (o) => o.id == oppId,
                          orElse: () => Opportunity(
                            id: oppId,
                            title: context.tr('sportsOpportunity'),
                            organizerName: context.tr('verifiedOrganization'),
                            description: '',
                            country: '',
                            city: '',
                            type: 'trial',
                            positions: const [],
                            deadline: null,
                            rawPayload: const {},
                          ),
                        );

                        final dateFormatted = _formatDate(
                          '${appItem['appliedAt'] ?? ''}',
                        );
                        final notes = '${appItem['notes'] ?? ''}';
                        final pos = '${appItem['preferredPosition'] ?? ''}';

                        return Card(
                          margin: const EdgeInsets.only(bottom: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                            side: BorderSide(
                              color: AppColors.green.withValues(alpha: 0.3),
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: AppColors.green.withValues(
                                          alpha: .15,
                                        ),
                                        borderRadius: BorderRadius.circular(
                                          14,
                                        ),
                                      ),
                                      child: const Icon(
                                        Icons.check_circle_rounded,
                                        color: AppColors.green,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            matchedOpp.title,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w900,
                                              fontSize: 16,
                                              color: AppColors.navy,
                                            ),
                                          ),
                                          Text(
                                            matchedOpp.organizerName,
                                            style: const TextStyle(
                                              color: AppColors.muted,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.amber.shade50,
                                        borderRadius: BorderRadius.circular(20),
                                        border: Border.all(
                                          color: Colors.amber.shade300,
                                        ),
                                      ),
                                      child: Text(
                                        context.tr('applicationStatusPending'),
                                        style: TextStyle(
                                          color: Colors.amber.shade900,
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    const Icon(
                                      Icons.calendar_today_rounded,
                                      size: 14,
                                      color: AppColors.muted,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      context.tr('appliedAtDate', {
                                        'date': dateFormatted,
                                      }),
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.muted,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                                if (pos.isNotEmpty) ...[
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      const Icon(
                                        Icons.sports_soccer_rounded,
                                        size: 14,
                                        color: AppColors.green,
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        '${context.tr('preferredPositionLabel')}: $pos',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: AppColors.navy,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                                if (notes.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    width: double.infinity,
                                    decoration: BoxDecoration(
                                      color: Colors.grey.shade50,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Text(
                                      notes,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.ink,
                                        fontStyle: FontStyle.italic,
                                      ),
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 14),
                                SizedBox(
                                  width: double.infinity,
                                  child: OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      side: const BorderSide(
                                        color: AppColors.green,
                                      ),
                                    ),
                                    onPressed: () =>
                                        _openChatWithOrganizer(matchedOpp),
                                    icon: const Icon(
                                      Icons.chat_bubble_outline_rounded,
                                      color: AppColors.green,
                                      size: 18,
                                    ),
                                    label: Text(
                                      context.tr('contactOrganizer'),
                                      style: const TextStyle(
                                        color: AppColors.green,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                      childCount: appliedList.length,
                    ),
                  ),
                ),
            ],
          ],
        );
      },
    );
  }
}

class _OpportunityCard extends StatelessWidget {
  const _OpportunityCard({
    required this.opportunity,
    required this.isApplied,
    required this.onApply,
  });

  final Opportunity opportunity;
  final bool isApplied;
  final VoidCallback onApply;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: isApplied ? 1 : 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: isApplied
            ? const BorderSide(color: AppColors.green, width: 1.5)
            : BorderSide.none,
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isApplied
                        ? AppColors.green.withValues(alpha: .15)
                        : AppColors.gold.withValues(alpha: .15),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    isApplied
                        ? Icons.check_circle_rounded
                        : Icons.workspace_premium_outlined,
                    color: isApplied ? AppColors.green : AppColors.gold,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        opportunity.title.isEmpty
                            ? context.tr('sportsOpportunity')
                            : opportunity.title,
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                          color: AppColors.navy,
                        ),
                      ),
                      Text(
                        opportunity.organizerName.isEmpty
                            ? context.tr('verifiedOrganization')
                            : opportunity.organizerName,
                        style: const TextStyle(
                          color: AppColors.muted,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                if (isApplied)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.green.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      context.tr('alreadyAppliedBadge'),
                      style: const TextStyle(
                        color: AppColors.green,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
            if (opportunity.description.isNotEmpty) ...[
              const SizedBox(height: 14),
              Text(
                opportunity.description,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AppColors.ink, height: 1.4),
              ),
            ],
            const SizedBox(height: 14),
            Wrap(
              spacing: 7,
              runSpacing: 7,
              children: [
                if (opportunity.country.isNotEmpty)
                  _Tag(
                    icon: Icons.location_on_outlined,
                    text: opportunity.country,
                  ),
                if (opportunity.city.isNotEmpty) _Tag(text: opportunity.city),
                ...opportunity.positions
                    .take(3)
                    .map((position) => _Tag(text: position)),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: isApplied
                  ? OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        side: const BorderSide(color: AppColors.green),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onPressed: onApply,
                      icon: const Icon(
                        Icons.edit_note_rounded,
                        color: AppColors.green,
                      ),
                      label: Text(
                        context.tr('alreadyAppliedBadge'),
                        style: const TextStyle(
                          color: AppColors.green,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    )
                  : FilledButton(
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        backgroundColor: AppColors.green,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onPressed: onApply,
                      child: Text(
                        context.tr('applyOpportunity'),
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag({required this.text, this.icon});

  final String text;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFF0F2F6),
        borderRadius: BorderRadius.circular(30),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: AppColors.navy),
            const SizedBox(width: 3),
          ],
          Text(
            text,
            style: const TextStyle(fontSize: 11, color: AppColors.navy),
          ),
        ],
      ),
    );
  }
}
