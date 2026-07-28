import 'package:flutter/material.dart';

import '../../core/app_theme.dart';
import '../../models/opportunity.dart';
import '../../services/data_service.dart';
import '../../widgets/async_state_view.dart';

class OpportunitiesScreen extends StatefulWidget {
  const OpportunitiesScreen({super.key, required this.dataService});

  final DataService dataService;

  @override
  State<OpportunitiesScreen> createState() => _OpportunitiesScreenState();
}

class _OpportunitiesScreenState extends State<OpportunitiesScreen> {
  late Future<List<Opportunity>> future;

  @override
  void initState() {
    super.initState();
    future = widget.dataService.fetchOpportunities();
  }

  Future<void> apply(Opportunity opportunity) async {
    try {
      await widget.dataService.applyForOpportunity(opportunity.id);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('تم إرسال طلبك بنجاح.')));
    } catch (exception) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('$exception')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return AsyncStateView<List<Opportunity>>(
      future: future,
      builder: (context, opportunities) {
        if (opportunities.isEmpty) {
          return const Center(child: Text('لا توجد فرص متاحة الآن'));
        }
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: opportunities.length,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final item = opportunities[index];
            return Card(
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
                            color: AppColors.gold.withValues(alpha: .15),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(Icons.workspace_premium_outlined),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 16,
                                ),
                              ),
                              Text(
                                item.organizerName,
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
                    if (item.description.isNotEmpty) ...[
                      const SizedBox(height: 14),
                      Text(
                        item.description,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 7,
                      runSpacing: 7,
                      children: [
                        if (item.country.isNotEmpty)
                          _Tag(
                            icon: Icons.location_on_outlined,
                            text: item.country,
                          ),
                        if (item.city.isNotEmpty) _Tag(text: item.city),
                        ...item.positions
                            .take(3)
                            .map((position) => _Tag(text: position)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () => apply(item),
                      child: const Text('التقديم على الفرصة'),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
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
          if (icon != null) ...[Icon(icon, size: 14), const SizedBox(width: 3)],
          Text(text, style: const TextStyle(fontSize: 11)),
        ],
      ),
    );
  }
}
