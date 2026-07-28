import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../models/player.dart';
import '../models/player_filter.dart';

Future<PlayerFilter?> showPlayerFilterSheet({
  required BuildContext context,
  required PlayerFilter initial,
  required List<Player> players,
}) => showModalBottomSheet<PlayerFilter>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  builder: (_) => _PlayerFilterSheet(initial: initial, players: players),
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
    position = filter.position;
    country = filter.country;
    education = filter.education;
    hasVideos = filter.hasVideos;
    hasImages = filter.hasImages;
  }

  static TextEditingController _numberController(num? value) =>
      TextEditingController(text: value == null ? '' : '$value');

  List<String> _values(String Function(Player player) read) =>
      widget.players
          .map(read)
          .where((value) => value.trim().isNotEmpty)
          .map((value) => value.trim())
          .toSet()
          .toList()
        ..sort();

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
    final positions = _values((player) => player.position);
    final countries = _values((player) => player.country);
    final educations = _values((player) => player.education);
    return Padding(
      padding: EdgeInsets.only(
        left: 18,
        right: 18,
        top: 12,
        bottom: MediaQuery.viewInsetsOf(context).bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    context.tr('advancedFilters'),
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: () => Navigator.pop(context, const PlayerFilter()),
                  child: Text(context.tr('resetFilters')),
                ),
              ],
            ),
            const SizedBox(height: 8),
            TextField(
              controller: query,
              decoration: InputDecoration(
                labelText: context.tr('searchAllFields'),
                prefixIcon: const Icon(Icons.manage_search),
              ),
            ),
            const SizedBox(height: 12),
            _ChoiceField(
              label: context.tr('position'),
              value: position,
              values: positions,
              onChanged: (value) => setState(() => position = value),
            ),
            const SizedBox(height: 12),
            _ChoiceField(
              label: context.tr('country'),
              value: country,
              values: countries,
              onChanged: (value) => setState(() => country = value),
            ),
            const SizedBox(height: 12),
            _ChoiceField(
              label: context.tr('education'),
              value: education,
              values: educations,
              onChanged: (value) => setState(() => education = value),
            ),
            const SizedBox(height: 16),
            _RangeRow(
              label: context.tr('age'),
              minimum: minAge,
              maximum: maxAge,
            ),
            const SizedBox(height: 12),
            _RangeRow(
              label: context.tr('heightCm'),
              minimum: minHeight,
              maximum: maxHeight,
            ),
            const SizedBox(height: 12),
            _RangeRow(
              label: context.tr('weightKg'),
              minimum: minWeight,
              maximum: maxWeight,
            ),
            const SizedBox(height: 16),
            _BooleanFilter(
              label: context.tr('videoAvailability'),
              value: hasVideos,
              onChanged: (value) => setState(() => hasVideos = value),
            ),
            const SizedBox(height: 10),
            _BooleanFilter(
              label: context.tr('imageAvailability'),
              value: hasImages,
              onChanged: (value) => setState(() => hasImages = value),
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: () => Navigator.pop(context, value),
              icon: const Icon(Icons.filter_alt),
              label: Text(context.tr('applyFilters')),
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
  final List<String> values;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) => DropdownButtonFormField<String>(
    initialValue: values.contains(value) ? value : '',
    isExpanded: true,
    decoration: InputDecoration(labelText: label),
    items: [
      DropdownMenuItem(value: '', child: Text(context.tr('all'))),
      ...values.map(
        (item) => DropdownMenuItem(
          value: item,
          child: Text(item, overflow: TextOverflow.ellipsis),
        ),
      ),
    ],
    onChanged: (newValue) => onChanged(newValue ?? ''),
  );
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
            labelText: '${context.tr('from')} $label',
          ),
        ),
      ),
      const SizedBox(width: 10),
      Expanded(
        child: TextField(
          controller: maximum,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(labelText: '${context.tr('to')} $label'),
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
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(child: Text(label)),
      SegmentedButton<bool?>(
        segments: [
          ButtonSegment(value: null, label: Text(context.tr('all'))),
          ButtonSegment(value: true, label: Text(context.tr('available'))),
          ButtonSegment(value: false, label: Text(context.tr('notAvailable'))),
        ],
        selected: {value},
        showSelectedIcon: false,
        onSelectionChanged: (values) => onChanged(values.first),
      ),
    ],
  );
}
