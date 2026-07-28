import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/account_type.dart';
import '../../services/data_service.dart';

class ManagePlayersScreen extends StatefulWidget {
  const ManagePlayersScreen({
    super.key,
    required this.accountType,
    required this.organizationName,
    required this.dataService,
  });

  final AccountType accountType;
  final String organizationName;
  final DataService dataService;

  @override
  State<ManagePlayersScreen> createState() => _ManagePlayersScreenState();
}

class _ManagePlayersScreenState extends State<ManagePlayersScreen> {
  late Future<List<Map<String, dynamic>>> future;
  Map<String, dynamic>? invitation;
  bool generating = false;

  @override
  void initState() {
    super.initState();
    future = widget.dataService.fetchManagedPlayers(widget.accountType);
  }

  Future<void> createInvite() async {
    setState(() => generating = true);
    try {
      final organizationName = widget.organizationName.trim().isEmpty
          ? widget.accountType.localizedName(context)
          : widget.organizationName.trim();
      final result = await widget.dataService.createInviteCode(
        accountType: widget.accountType,
        organizationName: organizationName,
        description: context.tr('inviteDescription', {
          'name': organizationName,
        }),
      );
      setState(() => invitation = result);
    } catch (exception) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(context.errorText(exception))));
    } finally {
      if (mounted) setState(() => generating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {
        setState(
          () => future = widget.dataService.fetchManagedPlayers(
            widget.accountType,
          ),
        );
        await future;
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.qr_code_2_rounded,
                        color: AppColors.green,
                        size: 32,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          context.tr('invitePlayer'),
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    context.tr('inviteHelp'),
                    style: const TextStyle(color: AppColors.muted, height: 1.6),
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: generating ? null : createInvite,
                    icon: const Icon(Icons.add_link),
                    label: Text(
                      context.tr(
                        generating ? 'generating' : 'createInviteCode',
                      ),
                    ),
                  ),
                  if (invitation != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.green.withValues(alpha: .08),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          Text(
                            context.tr('inviteCode'),
                            style: const TextStyle(fontSize: 12),
                          ),
                          SelectableText(
                            '${invitation!['referralCode']}',
                            style: const TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 3,
                            ),
                          ),
                          const SizedBox(height: 6),
                          TextButton.icon(
                            onPressed: () async {
                              await Clipboard.setData(
                                ClipboardData(
                                  text: '${invitation!['inviteLink']}',
                                ),
                              );
                              if (!context.mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(context.tr('inviteCopied')),
                                ),
                              );
                            },
                            icon: const Icon(Icons.copy),
                            label: Text(context.tr('copyInvite')),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            context.tr('managedPlayers'),
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 10),
          FutureBuilder<List<Map<String, dynamic>>>(
            future: future,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Padding(
                  padding: EdgeInsets.all(36),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              if (snapshot.hasError) {
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Text(context.errorText(snapshot.error)),
                  ),
                );
              }
              final players = snapshot.data ?? const [];
              if (players.isEmpty) {
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Center(child: Text(context.tr('noManagedPlayers'))),
                  ),
                );
              }
              return Column(
                children: players.map((player) {
                  final name =
                      player['full_name'] ??
                      player['name'] ??
                      context.tr('player');
                  final position =
                      player['primary_position'] ?? player['position'] ?? '';
                  return Card(
                    margin: const EdgeInsets.only(bottom: 9),
                    child: ListTile(
                      leading: const CircleAvatar(child: Icon(Icons.person)),
                      title: Text('$name'),
                      subtitle: Text('$position'),
                      trailing: const Icon(Icons.arrow_back_ios_new, size: 16),
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}
