import 'package:flutter/material.dart';
import 'package:country_picker/country_picker.dart';

import '../l10n/app_localizations.dart';
import '../models/player.dart';
import '../models/player_filter.dart';
import '../screens/profile/player_profile_data.dart';

Future<PlayerFilter?> showPlayerFilterSheet({
  required BuildContext context,
  required PlayerFilter initial,
  required List<Player> players,
}) => showModalBottomSheet<PlayerFilter>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  builder: (_) => FractionallySizedBox(
    heightFactor: .92,
    child: _PlayerFilterSheet(initial: initial, players: players),
  ),
);

class _PlayerFilterSheet extends StatefulWidget {
  const _PlayerFilterSheet({required this.initial, required this.players});

  final PlayerFilter initial;
  final List<Player> players;

  @override
  State<_PlayerFilterSheet> createState() => _PlayerFilterSheetState();
}

class _PlayerFilterSheetState extends State<_PlayerFilterSheet> {
  late final TextEditingController query;
  late final TextEditingController minAge;
  late final TextEditingController maxAge;
  late final TextEditingController minHeight;
  late final TextEditingController maxHeight;
  late final TextEditingController minWeight;
  late final TextEditingController maxWeight;
  late String position;
  late String country;
  late String education;
  late bool? hasVideos;
  late bool? hasImages;

  @override
  void initState() {
    super.initState();
    final filter = widget.initial;
    query = TextEditingController(text: filter.query);
    minAge = _numberController(filter.minAge);
    maxAge = _numberController(filter.maxAge);
    minHeight = _numberController(filter.minHeight);
    maxHeight = _numberController(filter.maxHeight);
    minWeight = _numberController(filter.minWeight);
    maxWeight = _numberController(filter.maxWeight);
    position = canonicalProfileOptionValue('position', filter.position);
    country = canonicalProfileOptionValue('country', filter.country);
    education = canonicalProfileOptionValue(
      'education_level',
      filter.education,
    );
    hasVideos = filter.hasVideos;
    hasImages = filter.hasImages;
  }

  static TextEditingController _numberController(num? value) =>
      TextEditingController(text: value == null ? '' : '$value');

  List<_FilterOption> _options({
    required String fieldKey,
    required Iterable<String> values,
  }) {
    final unique = <String, _FilterOption>{};
    for (final raw in values) {
      if (raw.trim().isEmpty) continue;
      final canonical = canonicalProfileOptionValue(fieldKey, raw);
      if (fieldKey == 'education_level' &&
          !kEducationLevels.contains(canonical)) {
        continue;
      }
      final label = fieldKey == 'country'
          ? (Country.tryParse(canonical)?.getTranslatedName(context) ?? raw)
          : localizedProfileOptionLabel(context, fieldKey, canonical);
      unique.putIfAbsent(
        canonical.toLowerCase(),
        () => _FilterOption(canonical, label),
      );
    }
    final result = unique.values.toList();
    result.sort(
      (a, b) => a.label.toLowerCase().compareTo(b.label.toLowerCase()),
    );
    return result;
  }

  PlayerFilter get value => PlayerFilter(
    query: query.text.trim(),
    position: position,
    country: country,
    education: education,
    minAge: num.tryParse(minAge.text),
    maxAge: num.tryParse(maxAge.text),
    minHeight: num.tryParse(minHeight.text),
    maxHeight: num.tryParse(maxHeight.text),
    minWeight: num.tryParse(minWeight.text),
    maxWeight: num.tryParse(maxWeight.text),
    hasVideos: hasVideos,
    hasImages: hasImages,
  );

  @override
  Widget build(BuildContext context) {
    final positions = _options(
      fieldKey: 'position',
      values: widget.players.map((player) => player.position),
    );
    final countries = _options(
      fieldKey: 'country',
      values: widget.players.expand(
        (player) => [player.country, player.nationality],
      ),
    );
    final educations = _options(
      fieldKey: 'education_level',
      values: widget.players.map((player) => player.education),
    );
    return Material(
      color: Theme.of(context).scaffoldBackgroundColor,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 8),
              child: Column(
                children: [
                  Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.black12,
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          context.tr('advancedFilters'),
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.w900),
                        ),
                      ),
                      TextButton.icon(
                        onPressed: () =>
                            Navigator.pop(context, const PlayerFilter()),
                        icon: const Icon(Icons.restart_alt_rounded, size: 18),
                        label: Text(context.tr('resetFilters')),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: Scrollbar(
                thumbVisibility: true,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextField(
                        controller: query,
                        decoration: InputDecoration(
                          isDense: true,
                          hintText: context.tr('searchAllFields'),
                          prefixIcon: const Icon(Icons.manage_search_rounded),
                        ),
                      ),
                      const SizedBox(height: 10),
                      _ChoiceField(
                        label: context.tr('position'),
                        value: position,
                        values: positions,
                        onChanged: (value) => setState(() => position = value),
                      ),
                      const SizedBox(height: 10),
                      _ChoiceField(
                        label: context.tr('country'),
                        value: country,
                        values: countries,
                        onChanged: (value) => setState(() => country = value),
                      ),
                      const SizedBox(height: 10),
                      _ChoiceField(
                        label: context.tr('education'),
                        value: education,
                        values: educations,
                        onChanged: (value) => setState(() => education = value),
                      ),
                      const SizedBox(height: 14),
                      _RangeRow(
                        label: context.tr('age'),
                        minimum: minAge,
                        maximum: maxAge,
                      ),
                      const SizedBox(height: 10),
                      _RangeRow(
                        label: context.tr('heightCm'),
                        minimum: minHeight,
                        maximum: maxHeight,
                      ),
                      const SizedBox(height: 10),
                      _RangeRow(
                        label: context.tr('weightKg'),
                        minimum: minWeight,
                        maximum: maxWeight,
                      ),
                      const SizedBox(height: 14),
                      _BooleanFilter(
                        label: context.tr('videoAvailability'),
                        value: hasVideos,
                        onChanged: (value) => setState(() => hasVideos = value),
                      ),
                      const SizedBox(height: 12),
                      _BooleanFilter(
                        label: context.tr('imageAvailability'),
                        value: hasImages,
                        onChanged: (value) => setState(() => hasImages = value),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 16,
                    offset: Offset(0, -3),
                  ),
                ],
              ),
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                ),
                onPressed: () => Navigator.pop(context, value),
                icon: const Icon(Icons.filter_alt_rounded),
                label: Text(context.tr('applyFilters')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChoiceField extends StatelessWidget {
  const _ChoiceField({
    required this.label,
    required this.value,
    required this.values,
    required this.onChanged,
  });

  final String label;
  final String value;
  final List<_FilterOption> values;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final selected = values.where((item) => item.value == value).firstOrNull;
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () async {
        final result = await _showSearchableOptions(context);
        if (result != null) onChanged(result);
      },
      child: InputDecorator(
        decoration: InputDecoration(labelText: label, isDense: true),
        child: Row(
          children: [
            Expanded(
              child: Text(
                selected?.label ?? context.tr('all'),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (value.isNotEmpty)
              IconButton(
                tooltip: context.tr('clear'),
                visualDensity: VisualDensity.compact,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints.tightFor(
                  width: 32,
                  height: 32,
                ),
                onPressed: () => onChanged(''),
                icon: const Icon(Icons.close_rounded, size: 18),
              )
            else
              const Icon(Icons.keyboard_arrow_down_rounded),
          ],
        ),
      ),
    );
  }

  Future<String?> _showSearchableOptions(BuildContext context) {
    return showModalBottomSheet<String>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) {
        var query = '';
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final filtered = values
                .where(
                  (item) =>
                      item.label.toLowerCase().contains(query.toLowerCase()),
                )
                .toList();
            return FractionallySizedBox(
              heightFactor: .68,
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                    child: TextField(
                      autofocus: true,
                      decoration: InputDecoration(
                        isDense: true,
                        hintText: context.tr('searchOptions'),
                        prefixIcon: const Icon(Icons.search_rounded),
                      ),
                      onChanged: (text) =>
                          setSheetState(() => query = text.trim()),
                    ),
                  ),
                  Expanded(
                    child: Scrollbar(
                      thumbVisibility: true,
                      child: ListView(
                        children: [
                          ListTile(
                            leading: const Icon(Icons.filter_alt_off_rounded),
                            title: Text(context.tr('all')),
                            selected: value.isEmpty,
                            onTap: () => Navigator.pop(sheetContext, ''),
                          ),
                          ...filtered.map(
                            (item) => ListTile(
                              title: Text(item.label),
                              trailing: item.value == value
                                  ? const Icon(Icons.check_circle_rounded)
                                  : null,
                              selected: item.value == value,
                              onTap: () =>
                                  Navigator.pop(sheetContext, item.value),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _FilterOption {
  const _FilterOption(this.value, this.label);
  final String value;
  final String label;
}

class _RangeRow extends StatelessWidget {
  const _RangeRow({
    required this.label,
    required this.minimum,
    required this.maximum,
  });

  final String label;
  final TextEditingController minimum;
  final TextEditingController maximum;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: TextField(
          controller: minimum,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            isDense: true,
            labelText: '${context.tr('from')} $label',
          ),
        ),
      ),
      const SizedBox(width: 10),
      Expanded(
        child: TextField(
          controller: maximum,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            isDense: true,
            labelText: '${context.tr('to')} $label',
          ),
        ),
      ),
    ],
  );
}

class _BooleanFilter extends StatelessWidget {
  const _BooleanFilter({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final bool? value;
  final ValueChanged<bool?> onChanged;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
      const SizedBox(height: 7),
      SizedBox(
        width: double.infinity,
        child: SegmentedButton<bool?>(
          expandedInsets: EdgeInsets.zero,
          segments: [
            ButtonSegment(value: null, label: Text(context.tr('all'))),
            ButtonSegment(value: true, label: Text(context.tr('available'))),
            ButtonSegment(
              value: false,
              label: Text(context.tr('notAvailable')),
            ),
          ],
          selected: {value},
          showSelectedIcon: false,
          onSelectionChanged: (values) => onChanged(values.first),
        ),
      ),
    ],
  );
}
