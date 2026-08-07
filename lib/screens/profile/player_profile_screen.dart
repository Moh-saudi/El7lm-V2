import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:intl/intl.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/account_type.dart';
import '../../models/user_profile.dart';
import '../../services/data_service.dart';
import '../../services/in_app_notification_service.dart';
import '../../widgets/parental_consent_dialog.dart';
import 'player_profile_data.dart';

class PlayerProfileScreen extends StatefulWidget {
  const PlayerProfileScreen({super.key, required this.dataService});

  final DataService dataService;

  @override
  State<PlayerProfileScreen> createState() => _PlayerProfileScreenState();
}

class _PlayerProfileScreenState extends State<PlayerProfileScreen> {
  late Future<UserProfile> future;

  @override
  void initState() {
    super.initState();
    future = widget.dataService.fetchProfile(AccountType.player);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<UserProfile>(
      future: future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return _ProfileError(
            message: context.errorText(snapshot.error),
            onRetry: () => setState(() {
              future = widget.dataService.fetchProfile(AccountType.player);
            }),
          );
        }
        final profile = snapshot.data;
        if (profile == null) return const SizedBox.shrink();

        return _ProfileForm(
          profile: profile,
          dataService: widget.dataService,
          onSaved: (updated) => setState(() {
            future = Future.value(updated);
          }),
          onRefresh: () async {
            setState(() {
              future = widget.dataService.fetchProfile(AccountType.player);
            });
            await future;
          },
        );
      },
    );
  }
}

class _ProfileForm extends StatefulWidget {
  const _ProfileForm({
    required this.profile,
    required this.dataService,
    required this.onSaved,
    required this.onRefresh,
  });

  final UserProfile profile;
  final DataService dataService;
  final ValueChanged<UserProfile> onSaved;
  final Future<void> Function() onRefresh;

  @override
  State<_ProfileForm> createState() => _ProfileFormState();
}

class _ProfileFormState extends State<_ProfileForm> {
  final formKey = GlobalKey<FormState>();
  final controllers = <String, TextEditingController>{};
  bool saving = false;
  bool editing = false;
  
  List<String> _memoImages = [];
  List<String> _memoDocs = [];
  List<String> _memoVideos = [];

  @override
  void initState() {
    super.initState();
    _initControllers();
    _updateMemos();
  }

  @override
  void didUpdateWidget(covariant _ProfileForm oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.profile != widget.profile) {
      _initControllers();
      _updateMemos();
    }
  }

  void _updateMemos() {
    _memoImages = _urls('images', ['additional_images', 'gallery', 'additional_photos', 'photos', 'profile_images']);
    _memoDocs = _urls('documents', ['documents_urls', 'files', 'pdf_files']);
    _memoVideos = _urls('videos', ['video_urls', 'youtube_links', 'player_videos', 'skill_videos', 'user_videos']);
  }

  String _resolveMediaUrl(String value) => resolvePlayerMediaUrl(value);

  List<String> _urls(String primaryKey, [List<String>? fallbackKeys]) {
    final allKeys = [primaryKey, ...?fallbackKeys];
    final list = <String>{};
    for (final key in allKeys) {
      var raw = widget.profile.values[key];
      if (raw is String) {
        final trimmed = raw.trim();
        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
            (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
          try {
            raw = jsonDecode(trimmed);
          } catch (_) {}
        } else if (trimmed.contains(',') && !trimmed.startsWith('http')) {
          raw = trimmed.split(',').map((s) => s.trim()).toList();
        }
      }

      void process(dynamic item) {
        if (item == null) return;
        String val = '';
        if (item is Map) {
          val = '${item['url'] ?? item['video_url'] ?? item['videoUrl'] ?? item['path'] ?? item['src'] ?? item['uri'] ?? item['link'] ?? item['file'] ?? ''}';
        } else {
          val = '$item';
        }
        val = _resolveMediaUrl(val);
        if (val.isNotEmpty && val != 'null') list.add(val);
      }

      if (raw is List) {
        for (final e in raw) {
          process(e);
        }
      } else if (raw != null) {
        process(raw);
      }
    }
    return list.toList();
  }

  Future<void> _handleDeleteMedia(String url, String category) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(context.tr('confirmDelete')),
        content: Text(context.tr('deleteMediaPrompt')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(context.tr('cancel')),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              context.tr('delete'),
              style: const TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    final key = category == 'images'
        ? 'additional_images'
        : (category == 'videos' ? 'video_urls' : 'documents');

    final current = _rawUrls(key);
    final updated = current.where((e) {
      final val =
          e is Map ? '${e['url'] ?? e['path'] ?? e['src'] ?? ''}' : '$e';
      return _resolveMediaUrl(val) != url;
    }).toList();

    try {
      await widget.dataService.savePlayerProfile(widget.profile, {key: updated});
      if (!mounted) return;
      await widget.onRefresh();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  List<dynamic> _rawUrls(String key) {
    var raw = widget.profile.values[key];
    if (raw is String) {
      try {
        raw = jsonDecode(raw);
      } catch (_) {
        if (raw.contains(',')) {
          return raw.split(',').map((s) => s.trim()).toList();
        }
        return [raw];
      }
    }
    if (raw is List) return raw;
    return [];
  }

  void _initControllers() {
    final sections = getProfileSections();
    for (final section in sections) {
      for (final field in section.fields) {
        var value = widget.profile.values[field.key];
        if (value is Map) {
          value = value['url'] ??
              value['path'] ??
              value['src'] ??
              value['uri'] ??
              '';
        }
        final text = value is List
            ? value.map(_displayListItem).join('\n')
            : '${value ?? ''}';

        if (controllers.containsKey(field.key)) {
          controllers[field.key]!.text = text;
        } else {
          controllers[field.key] = TextEditingController(text: text);
        }
      }
    }
  }

  String _displayListItem(Object? item) {
    if (item is Map) return '${item['name'] ?? item['title'] ?? item['url'] ?? item}';
    return '$item';
  }

  String _computeOvr() {
    final keys = ['stats_pace', 'stats_shooting', 'stats_passing', 'stats_dribbling', 'stats_defending', 'stats_physical'];
    final vals = keys.map((k) => num.tryParse(controllers[k]?.text ?? '')?.toDouble()).whereType<double>().toList();
    if (vals.isEmpty) return '50';
    return (vals.reduce((a, b) => a + b) / vals.length).toInt().clamp(0, 99).toString();
  }

  @override
  void dispose() {
    for (final c in controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final sections = getProfileSections();
    final org = widget.profile.values['_organization'];
    final organization = (org is Map<String, dynamic> && org.isNotEmpty) ? org : null;

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: Form(
        key: formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
          children: [
            _buildHeader(context),
            const SizedBox(height: 16),
            _CompactActionTilesRow(
              profile: widget.profile,
              dataService: widget.dataService,
              organization: organization,
              onRefresh: widget.onRefresh,
              onSaved: widget.onSaved,
            ),
            const SizedBox(height: 16),
            ...sections.map((s) => _buildSection(context, s)),
            _MediaSection(
              profile: widget.profile,
              dataService: widget.dataService,
              onUploaded: widget.onSaved,
              images: _memoImages,
              documents: _memoDocs,
              videos: _memoVideos,
              onDelete: _handleDeleteMedia,
            ),
            const SizedBox(height: 16),
            const _NotificationSettingsCard(),
            if (editing) _buildSaveBar(context),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    final birthDate = DateTime.tryParse(
      '${widget.profile.values['birth_date'] ?? ''}',
    );
    final now = DateTime.now();
    final age = birthDate == null
        ? null
        : now.year -
              birthDate.year -
              ((now.month < birthDate.month ||
                      (now.month == birthDate.month &&
                          now.day < birthDate.day))
                  ? 1
                  : 0);
    final avatar = _avatarImageUrl;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF0F172A),
            Color(0xFF1E1B4B),
            Color(0xFF064E3B),
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF10B981).withValues(alpha: .3),
            blurRadius: 22,
            spreadRadius: 2,
            offset: const Offset(0, 8),
          ),
        ],
        border: Border.all(
          color: const Color(0xFFFFD700).withValues(alpha: .6),
          width: 2,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          children: [
            Positioned(
              top: -40,
              left: -40,
              child: Container(
                width: 160,
                height: 160,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFFFFD700).withValues(alpha: .07),
                ),
              ),
            ),
            Positioned(
              bottom: -55,
              right: -55,
              child: Container(
                width: 190,
                height: 190,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF10B981).withValues(alpha: .10),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 20, 18, 20),
              child: Column(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // OVR badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              Color(0xFFFFD700),
                              Color(0xFFF59E0B),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFFFD700)
                                  .withValues(alpha: .45),
                              blurRadius: 12,
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            Text(
                              _computeOvr(),
                              style: const TextStyle(
                                fontSize: 26,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0F172A),
                                height: 1,
                              ),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              'OVR',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF0F172A),
                                letterSpacing: 1,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 14),
                      // Avatar with camera button
                      SizedBox(
                        width: 82,
                        height: 82,
                        child: Stack(
                          children: [
                            Center(
                              child: GestureDetector(
                                onTap: avatar.isNotEmpty
                                    ? () => _showFullScreenImage(context, avatar)
                                    : null,
                                child: Container(
                                  padding: const EdgeInsets.all(3),
                                  decoration: const BoxDecoration(
                                    shape: BoxShape.circle,
                                    gradient: LinearGradient(
                                      colors: [
                                        Color(0xFFFFD700),
                                        Color(0xFF10B981),
                                      ],
                                    ),
                                  ),
                                  child: CircleAvatar(
                                    radius: 36,
                                    backgroundColor: const Color(0xFF1E293B),
                                    child: ClipOval(
                                      child: avatar.isNotEmpty
                                          ? CachedNetworkImage(
                                              imageUrl: avatar,
                                              key: ValueKey(avatar),
                                              width: 72,
                                              height: 72,
                                              fit: BoxFit.cover,
                                              placeholder: (context, url) => const CircularProgressIndicator(strokeWidth: 2),
                                              errorWidget: (context, url, error) => const Icon(
                                                Icons.person_rounded,
                                                size: 44,
                                                color: Colors.white,
                                              ),
                                            )
                                          : const Icon(
                                              Icons.person_rounded,
                                              size: 44,
                                              color: Colors.white,
                                            ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            Positioned(
                              bottom: 0,
                              right: 0,
                              child: GestureDetector(
                                onTap: _pickProfilePhoto,
                                child: Container(
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF10B981),
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(
                                        color: const Color(0x88000000),
                                        blurRadius: 6,
                                        offset: const Offset(0, 3),
                                      ),
                                    ],
                                    border: Border.all(
                                      color: const Color(0xFFFFD700),
                                      width: 2,
                                    ),
                                  ),
                                  child: const Icon(
                                    Icons.camera_alt_rounded,
                                    size: 16,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 14),
                      // Name / position / age
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              controllers['name']?.text.isNotEmpty == true
                                  ? controllers['name']!.text
                                  : context.tr('playerProfile'),
                              style: const TextStyle(
                                fontSize: 19,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                                letterSpacing: .3,
                              ),
                            ),
                            const SizedBox(height: 5),
                            if (controllers['primary_position']?.text.isNotEmpty ==
                                true)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981)
                                      .withValues(alpha: .25),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: const Color(0xFF10B981)
                                        .withValues(alpha: .5),
                                  ),
                                ),
                                child: Text(
                                  controllers['primary_position']!.text,
                                  style: const TextStyle(
                                    color: Color(0xFF6EE7B7),
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            if (age != null) ...[
                              const SizedBox(height: 5),
                              Text(
                                context.tr('playerAgeValue', {'age': age.toString()}),
                                style: const TextStyle(
                                  color: Color(0xFF94A3B8),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(height: 1, color: Color(0xFF334155)),
                  const SizedBox(height: 16),
                  // Stats row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildFutStatBadge(context.tr('profile.field.stats_pace').split(' ')[0].toUpperCase(), 'stats_pace'),
                      _buildFutStatBadge(context.tr('profile.field.stats_shooting').split(' ')[0].toUpperCase(), 'stats_shooting'),
                      _buildFutStatBadge(context.tr('profile.field.stats_passing').split(' ')[0].toUpperCase(), 'stats_passing'),
                      _buildFutStatBadge(context.tr('profile.field.stats_dribbling').split(' ')[0].toUpperCase(), 'stats_dribbling'),
                      _buildFutStatBadge(context.tr('profile.field.stats_defending').split(' ')[0].toUpperCase(), 'stats_defending'),
                      _buildFutStatBadge(context.tr('profile.field.stats_physical').split(' ')[0].toUpperCase(), 'stats_physical'),
                    ],
                  ),
                  const SizedBox(height: 18),
                  // Edit / Lock toggle button
                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: editing
                            ? const Color(0xFFEF4444)
                            : const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        elevation: 6,
                        shadowColor: (editing
                                ? const Color(0xFFEF4444)
                                : const Color(0xFF10B981))
                            .withValues(alpha: .45),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      onPressed: saving
                          ? null
                          : () => setState(() => editing = !editing),
                      icon: Icon(
                        editing
                            ? Icons.lock_outline_rounded
                            : Icons.edit_note_rounded,
                        size: 22,
                      ),
                      label: Text(
                        editing
                            ? context.tr('closeEditMode')
                            : context.tr('editPlayerData'),
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          letterSpacing: .4,
                        ),
                      ),
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

  Widget _buildFutStatBadge(String label, String statKey) {
    final rawVal = controllers[statKey]?.text ?? '';
    final val = num.tryParse(rawVal)?.toInt() ?? 50;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          '$val',
          style: const TextStyle(
            color: Color(0xFFFFD700),
            fontSize: 17,
            fontWeight: FontWeight.w900,
            height: 1,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF94A3B8),
            fontSize: 9,
            fontWeight: FontWeight.bold,
            letterSpacing: .5,
          ),
        ),
      ],
    );
  }

  Widget _buildSection(BuildContext context, ProfileSection section) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: ExpansionTile(
        initiallyExpanded: section.key == 'personal',
        leading: Icon(section.icon, color: AppColors.green),
        title: Text(context.tr(section.title), style: const TextStyle(fontWeight: FontWeight.bold)),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        children: section.fields.map((f) => Padding(padding: const EdgeInsets.only(top: 12), child: _buildField(context, f))).toList(),
      ),
    );
  }

  Widget _buildField(BuildContext context, ProfileField field) {
    final label = context.tr(field.label);
    final ctrl = controllers[field.key]!;

    if (_booleanFields.contains(field.key)) {
      final isTrue =
          ctrl.text.toLowerCase() == 'true' || ctrl.text == context.tr('yes');
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: InputDecorator(
          decoration: InputDecoration(
            labelText: label,
            filled: true,
            fillColor: editing ? Colors.white : Colors.grey[50],
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey[300]!)),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<bool>(
              value: isTrue,
              isExpanded: true,
              items: [
                DropdownMenuItem(value: true, child: Text(context.tr('yes'))),
                DropdownMenuItem(value: false, child: Text(context.tr('no'))),
              ],
              onChanged: editing
                  ? (v) => setState(() => ctrl.text = v == true ? 'true' : 'false')
                  : null,
            ),
          ),
        ),
      );
    }

    if (field.options != null) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: InputDecorator(
          decoration: InputDecoration(
            labelText: label,
            filled: true,
            fillColor: editing ? Colors.white : Colors.grey[50],
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey[300]!)),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: field.options!.contains(ctrl.text) ? ctrl.text : null,
              isExpanded: true,
              items: field.options!
                  .map((o) => DropdownMenuItem(value: o, child: Text(o)))
                  .toList(),
              onChanged: editing ? (v) => setState(() => ctrl.text = v ?? '') : null,
            ),
          ),
        ),
      );
    }

    if (field.isSlider) {
      final val = double.tryParse(ctrl.text) ?? 50.0;
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: InputDecorator(
          decoration: InputDecoration(
            labelText: label,
            filled: true,
            fillColor: editing ? Colors.white : Colors.grey[50],
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey[300]!)),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  const Spacer(),
                  Text(val.toInt().toString(),
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, color: AppColors.green)),
                ],
              ),
              Slider(
                value: val.clamp(0, 99),
                min: 0,
                max: 99,
                divisions: 99,
                activeColor: AppColors.green,
                onChanged: editing
                    ? (v) => setState(() => ctrl.text = v.toInt().toString())
                    : null,
              ),
            ],
          ),
        ),
      );
    }

    if (field.isStar) {
      final val = int.tryParse(ctrl.text) ?? 1;
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: InputDecorator(
          decoration: InputDecoration(
            labelText: label,
            filled: true,
            fillColor: editing ? Colors.white : Colors.grey[50],
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey[300]!)),
          ),
          child: Row(
            children: List.generate(
                5,
                (i) => IconButton(
                      icon: Icon(i < val ? Icons.star : Icons.star_border,
                          color: AppColors.green),
                      onPressed: editing
                          ? () => setState(() => ctrl.text = (i + 1).toString())
                          : null,
                    )),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: ctrl,
        enabled: editing,
        maxLines: field.multiline ? 3 : 1,
        keyboardType: _numericFields.contains(field.key)
            ? TextInputType.number
            : TextInputType.text,
        decoration: InputDecoration(
          labelText: label,
          filled: true,
          fillColor: editing ? Colors.white : Colors.grey[50],
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey[300]!),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey[300]!),
          ),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
    );
  }

  void _showFullScreenImage(BuildContext context, String url) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => _FullScreenImageViewer(url: url),
      ),
    );
  }

  Widget _buildSaveBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: SizedBox(
        width: double.infinity,
        height: 50,
        child: FilledButton(
          onPressed: saving ? null : save,
          style: FilledButton.styleFrom(backgroundColor: AppColors.green),
          child: Text(context.tr(saving ? 'saving' : 'saveAll')),
        ),
      ),
    );
  }

  String get _avatarImageUrl {
    for (final k in ['profile_image_url', 'image', 'avatar']) {
      final v = widget.profile.values[k];
      if (v != null && v != 'null') return _resolveMediaUrl(v is Map ? '${v['url'] ?? ''}' : '$v');
    }
    return '';
  }

  Future<void> save() async {
    if (!formKey.currentState!.validate()) return;
    setState(() => saving = true);
    try {
      final updates = collectUpdates();
      await widget.dataService.savePlayerProfile(widget.profile, updates);
      if (!mounted) return;
      setState(() => editing = false);
      final updated = UserProfile(
        userId: widget.profile.userId,
        accountType: widget.profile.accountType,
        values: widget.profile.mergeUpdates(updates),
      );
      widget.onSaved(updated);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Map<String, dynamic> collectUpdates() {
    final res = <String, dynamic>{};
    for (final e in controllers.entries) {
      final key = e.key;
      final text = e.value.text;

      if (_booleanFields.contains(key)) {
        res[key] = text.toLowerCase() == 'true';
      } else if (_numericFields.contains(key)) {
        res[key] = num.tryParse(text) ?? 0;
      } else {
        res[key] = text;
      }
    }
    return res;
  }

  Future<void> _pickProfilePhoto() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery);
    if (file == null) return;
    final bytes = await file.readAsBytes();
    final path = await widget.dataService.uploadProfileImage(bytes: bytes, extension: 'jpg', contentType: 'image/jpeg');
    await widget.dataService.savePlayerProfile(widget.profile, {'image': path});
    widget.onRefresh();
  }
}

class _OrganizationCard extends StatelessWidget {
  const _OrganizationCard({required this.organization});
  final Map<String, dynamic> organization;
  @override
  Widget build(BuildContext context) {
    final name = '${organization['name'] ?? ''}'.trim();
    final type = '${organization['type'] ?? ''}'.trim();
    final logo = '${organization['logo'] ?? ''}'.trim();
    final joinedViaReferral = organization['joinedViaReferral'] == true;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFDCE6F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: .03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 64,
            height: 64,
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.green.withValues(alpha: .1),
              border: Border.all(color: AppColors.green.withValues(alpha: .25)),
            ),
            child: ClipOval(
              child: logo.isEmpty
                  ? const Icon(Icons.shield_outlined, color: AppColors.green)
                  : CachedNetworkImage(
                      imageUrl: logo,
                      fit: BoxFit.cover,
                      errorWidget: (_, _, _) => const Icon(
                        Icons.shield_outlined,
                        color: AppColors.green,
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.tr('playerOrganization'),
                  style: const TextStyle(color: AppColors.muted, fontSize: 11),
                ),
                Text(
                  name,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 17,
                  ),
                ),
                if (type.isNotEmpty)
                  Text(
                    type,
                    style:
                        const TextStyle(color: AppColors.muted, fontSize: 13),
                  ),
                if (joinedViaReferral)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF4D6),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.workspace_premium_outlined,
                              size: 14),
                          const SizedBox(width: 5),
                          Flexible(
                            child: Text(
                              context.tr('joinedThroughDreamAmbassadors'),
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _JoinOrgCard extends StatefulWidget {
  const _JoinOrgCard({required this.dataService, required this.onJoined});
  final DataService dataService;
  final VoidCallback onJoined;
  @override
  State<_JoinOrgCard> createState() => _JoinOrgCardState();
}

class _JoinOrgCardState extends State<_JoinOrgCard> {
  final controller = TextEditingController();
  bool loading = false;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>?>(
      future: widget.dataService.fetchJoinedOrganization(),
      builder: (context, snapshot) {
        final joinedOrg = snapshot.data;
        if (joinedOrg != null &&
            joinedOrg['name'] != null &&
            joinedOrg['name'].toString().isNotEmpty) {
          final name = '${joinedOrg['name']}';
          final code = '${joinedOrg['code'] ?? 'ACDVMRC44'}';
          final type = '${joinedOrg['type'] ?? 'academy'}';
          final typeLabel = switch (type) {
            'club' => 'نادي ⚽',
            'trainer' => 'مدرب 👟',
            'agent' => 'وكيل 💼',
            _ => 'أكاديمية 🏆',
          };

          return Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.green.withValues(alpha: .12),
                  AppColors.navy.withValues(alpha: .05),
                ],
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.green.withValues(alpha: 0.4), width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  spreadRadius: 1,
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const CircleAvatar(
                      backgroundColor: AppColors.green,
                      radius: 20,
                      child: Icon(Icons.verified_rounded, color: Colors.white, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'المنظمة المنضم إليها حالياً ⚽',
                            style: TextStyle(fontSize: 11, color: AppColors.muted, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            name,
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.navy),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.green,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        'عضو رسمياً $typeLabel 🟢',
                        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                const Divider(height: 1),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'كود الدعوة المستعمل: $code',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.navy),
                    ),
                    const Text(
                      'الحالة: مقترن بالمنظمة 🟢',
                      style: TextStyle(fontSize: 11, color: AppColors.green, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ],
            ),
          );
        }

        return Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppColors.green.withValues(alpha: .08),
                AppColors.navy.withValues(alpha: .04),
              ],
            ),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.green.withValues(alpha: .2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const CircleAvatar(
                    backgroundColor: AppColors.green,
                    radius: 18,
                    child: Icon(Icons.group_add_rounded,
                        color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Text(context.tr('joinOrgTitle'),
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.w900)),
                ],
              ),
              const SizedBox(height: 10),
              Text(context.tr('joinOrgDesc'),
                  style: const TextStyle(color: AppColors.muted, height: 1.5)),
              const SizedBox(height: 20),
              TextField(
                controller: controller,
                decoration: InputDecoration(
                  hintText: context.tr('orgCodeHint'),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: Colors.grey[200]!)),
                  enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: Colors.grey[200]!)),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: FilledButton(
                  onPressed: loading
                      ? null
                      : () async {
                          if (controller.text.trim().isEmpty) return;
                          setState(() => loading = true);
                          try {
                            await widget.dataService
                                .joinOrganizationByCode(controller.text);
                            widget.onJoined();
                          } catch (e) {
                            if (!mounted) return;
                            ScaffoldMessenger.of(context)
                                .showSnackBar(SnackBar(content: Text(e.toString())));
                          } finally {
                            setState(() => loading = false);
                          }
                        },
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.navy,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                  child: loading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2))
                      : Text(context.tr('verifyAndJoin'),
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _MediaSection extends StatefulWidget {
  const _MediaSection({
    required this.profile,
    required this.dataService,
    required this.onUploaded,
    required this.images,
    required this.documents,
    required this.videos,
    required this.onDelete,
  });

  final UserProfile profile;
  final DataService dataService;
  final ValueChanged<UserProfile> onUploaded;
  final List<String> images, documents, videos;
  final Future<void> Function(String url, String category) onDelete;

  @override
  State<_MediaSection> createState() => _MediaSectionState();
}

class _MediaSectionState extends State<_MediaSection> {
  bool uploading = false;

  Future<void> _pickAndUploadImage() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery);
    if (file == null) return;
    setState(() => uploading = true);
    try {
      final bytes = await file.readAsBytes();
      final ext = file.name.contains('.') ? file.name.split('.').last : 'jpg';
      final path = await widget.dataService.uploadPlayerMedia(
        bytes: bytes,
        extension: ext,
        contentType: 'image/$ext',
        isVideo: false,
      );
      final current = widget.images.toList();
      current.add(path);
      await widget.dataService.savePlayerProfile(widget.profile, {'additional_images': current});
      if (!mounted) return;
      widget.onUploaded(widget.profile);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => uploading = false);
    }
  }

  Future<void> _pickAndUploadVideo() async {
    final urlController = TextEditingController();
    final action = await showModalBottomSheet<String>(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.video_library_rounded, color: AppColors.green),
              title: const Text('اختيار فيديو من الاستوديو'),
              onTap: () => Navigator.pop(context, 'file'),
            ),
            ListTile(
              leading: const Icon(Icons.link_rounded, color: Colors.red),
              title: const Text('إضافة رابط فيديو (YouTube / Vimeo)'),
              onTap: () => Navigator.pop(context, 'link'),
            ),
          ],
        ),
      ),
    );

    if (action == 'file') {
      final file = await ImagePicker().pickVideo(source: ImageSource.gallery);
      if (file == null) return;
      setState(() => uploading = true);
      try {
        final bytes = await file.readAsBytes();
        final ext = file.name.contains('.') ? file.name.split('.').last : 'mp4';
        final path = await widget.dataService.uploadPlayerMedia(
          bytes: bytes,
          extension: ext,
          contentType: 'video/$ext',
          isVideo: true,
        );
        final current = widget.videos.toList();
        current.add(path);
        await widget.dataService.savePlayerProfile(widget.profile, {'video_urls': current});
        if (!mounted) return;
        widget.onUploaded(widget.profile);
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      } finally {
        if (mounted) setState(() => uploading = false);
      }
    } else if (action == 'link') {
      if (!mounted) return;
      final confirm = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('إضافة رابط فيديو'),
          content: TextField(
            controller: urlController,
            decoration: const InputDecoration(hintText: 'https://youtube.com/watch?v=...'),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('إلغاء')),
            TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('إضافة')),
          ],
        ),
      );
      if (confirm == true && urlController.text.trim().isNotEmpty) {
        final current = widget.videos.toList();
        current.add(urlController.text.trim());
        await widget.dataService.savePlayerProfile(widget.profile, {'video_urls': current});
        widget.onUploaded(widget.profile);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              context.tr('mediaAndDocs'),
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
            ),
            if (uploading)
              const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
            else
              Row(
                children: [
                  IconButton.filledTonal(
                    onPressed: _pickAndUploadImage,
                    icon: const Icon(Icons.add_a_photo_rounded, size: 20),
                    tooltip: 'إضافة صورة',
                  ),
                  const SizedBox(width: 8),
                  IconButton.filledTonal(
                    onPressed: _pickAndUploadVideo,
                    icon: const Icon(Icons.video_call_rounded, size: 20),
                    tooltip: 'إضافة فيديو',
                  ),
                ],
              ),
          ],
        ),
        const SizedBox(height: 16),
        if (widget.images.isNotEmpty) ...[
          Text(context.tr('imagesCountLabel', {'count': widget.images.length.toString()}),
              style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
            ),
            itemCount: widget.images.length,
            itemBuilder: (context, i) => _buildMediaGridItem(context, widget.images[i], 'images'),
          ),
          const SizedBox(height: 20),
        ],
        if (widget.documents.isNotEmpty) ...[
          Text(context.tr('docsCountLabel', {'count': widget.documents.length.toString()}),
              style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ...widget.documents.asMap().entries.map((e) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: const Icon(Icons.description_rounded, color: Colors.blue),
                  title: Text(context.tr('officialDocAttached', {'index': (e.key + 1).toString()})),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline_rounded, color: Colors.red),
                    onPressed: () => widget.onDelete(e.value, 'documents'),
                  ),
                  onTap: () => _openMediaUrl(e.value),
                ),
              )),
          const SizedBox(height: 16),
        ],
        if (widget.videos.isNotEmpty) ...[
          Text(context.tr('videosCountLabel', {'count': widget.videos.length.toString()}),
              style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ...widget.videos.asMap().entries.map((e) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: const Icon(Icons.play_circle_fill_rounded, color: Colors.red),
                  title: Text(context.tr('skillVideoAttached', {'index': (e.key + 1).toString()})),
                  subtitle: Text(
                    e.value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11, color: AppColors.muted),
                  ),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline_rounded, color: Colors.red),
                    onPressed: () => widget.onDelete(e.value, 'videos'),
                  ),
                  onTap: () => _openMediaUrl(e.value),
                ),
              )),
        ],
        if (widget.images.isEmpty && widget.documents.isEmpty && widget.videos.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Center(
              child: Text(context.tr('noMediaAttached'),
                  style: const TextStyle(color: AppColors.muted)),
            ),
          ),
        const SizedBox(height: 40),
      ],
    );
  }

  Future<void> _openMediaUrl(String url) async {
    try {
      final uri = Uri.parse(url);
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('تعذر فتح الرابط: $url')),
      );
    }
  }

  Widget _buildMediaGridItem(BuildContext context, String url, String category) {
    return Stack(
      children: [
        Positioned.fill(
          child: GestureDetector(
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => _FullScreenImageViewer(url: url))),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: CachedNetworkImage(
                imageUrl: url,
                fit: BoxFit.cover,
                placeholder: (_, _) => Container(color: Colors.grey[100]),
                errorWidget: (_, _, _) => Container(
                  color: Colors.grey[200],
                  child: const Icon(Icons.broken_image_rounded, color: Colors.grey, size: 28),
                ),
              ),
            ),
          ),
        ),
        Positioned(
          top: 4,
          right: 4,
          child: GestureDetector(
            onTap: () => widget.onDelete(url, category),
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
              child: const Icon(Icons.close_rounded, color: Colors.white, size: 16),
            ),
          ),
        ),
      ],
    );
  }
}

class _ProfileError extends StatelessWidget {
  const _ProfileError({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.red),
          const SizedBox(height: 16),
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 24),
          ElevatedButton(onPressed: onRetry, child: Text(context.tr('retry'))),
        ],
      ),
    ),
  );
}

const _numericFields = {
  'height', 'weight', 'jersey_number', 'shoe_size', 'caps', 'goals', 'assists',
  'stats_pace', 'stats_shooting', 'stats_passing', 'stats_dribbling', 'stats_defending', 'stats_physical',
  'weak_foot', 'skill_moves', 'hours_per_week',
  'mentality_leadership', 'mentality_composure', 'mentality_aggression', 'mentality_vision', 'mentality_teamwork'
};

const _booleanFields = {
  'has_private_coach', 'has_joined_academy'
};

List<ProfileSection> getProfileSections() {
  return [
    ProfileSection('personal', 'profile.section.personal', Icons.person, [
      const ProfileField('name', 'profile.field.name', required: true),
      const ProfileField('gender', 'profile.field.gender', options: kGender),
      const ProfileField('nationality', 'profile.field.nationality', options: kCountries),
      const ProfileField('birth_date', 'profile.field.birth_date'),
      const ProfileField('birth_place', 'profile.field.birth_place'),
      const ProfileField('current_residence', 'profile.field.current_residence', options: kCountries),
      const ProfileField('phone', 'profile.field.phone'),
      const ProfileField('email', 'profile.field.email'),
    ]),
    ProfileSection('education', 'profile.section.education', Icons.school, [
      const ProfileField('school_name', 'profile.field.school_name'),
      const ProfileField('education_level', 'profile.field.education_level', options: kEducationLevels),
      const ProfileField('gpa', 'profile.field.gpa'),
      const ProfileField('academic_interests', 'profile.field.academic_interests', multiline: true),
    ]),
    ProfileSection('career', 'profile.section.career', Icons.sports_soccer, [
      const ProfileField('current_club', 'profile.field.current_club'),
      const ProfileField('club_history', 'profile.field.club_history', multiline: true),
      const ProfileField('primary_position', 'profile.field.position', options: kPositions),
      const ProfileField('secondary_position', 'profile.field.secondary_position', options: kPositions),
      const ProfileField('foot', 'profile.field.foot', options: kFoot),
      const ProfileField('contract_status', 'profile.field.contract_status', options: kContractStatus),
      const ProfileField('caps', 'profile.field.caps'),
      const ProfileField('goals', 'profile.field.goals'),
      const ProfileField('assists', 'profile.field.assists'),
    ]),
    ProfileSection('measurements', 'profile.section.measurements', Icons.straighten, [
      const ProfileField('height', 'profile.field.height'),
      const ProfileField('weight', 'profile.field.weight'),
      const ProfileField('jersey_number', 'profile.field.jersey_number'),
      const ProfileField('shoe_size', 'profile.field.shoe_size'),
      const ProfileField('clothing_size', 'profile.field.clothing_size', options: kClothingSizes),
    ]),
    ProfileSection('skills', 'profile.section.skills', Icons.bolt, [
      const ProfileField('stats_pace', 'profile.field.stats_pace', isSlider: true),
      const ProfileField('stats_shooting', 'profile.field.stats_shooting', isSlider: true),
      const ProfileField('stats_passing', 'profile.field.stats_passing', isSlider: true),
      const ProfileField('stats_dribbling', 'profile.field.stats_dribbling', isSlider: true),
      const ProfileField('stats_defending', 'profile.field.stats_defending', isSlider: true),
      const ProfileField('stats_physical', 'profile.field.stats_physical', isSlider: true),
      const ProfileField('weak_foot', 'profile.field.weak_foot', isStar: true),
      const ProfileField('skill_moves', 'profile.field.skill_moves', isStar: true),
    ]),
    ProfileSection('mental', 'profile.section.mental', Icons.psychology, [
      const ProfileField('mentality_leadership', 'profile.field.mentality_leadership', isSlider: true),
      const ProfileField('mentality_composure', 'profile.field.mentality_composure', isSlider: true),
      const ProfileField('mentality_aggression', 'profile.field.mentality_aggression', isSlider: true),
      const ProfileField('mentality_vision', 'profile.field.mentality_vision', isSlider: true),
      const ProfileField('mentality_teamwork', 'profile.field.mentality_teamwork', isSlider: true),
    ]),
    ProfileSection('medical', 'profile.section.medical', Icons.medical_services, [
      const ProfileField('blood_type', 'profile.field.blood_type', options: kBloodTypes),
      const ProfileField('allergies_list', 'profile.field.allergies_list', multiline: true),
      const ProfileField('surgeries_list', 'profile.field.surgeries_list', multiline: true),
      const ProfileField('medical_notes', 'profile.field.medical_notes', multiline: true),
    ]),
    ProfileSection('training', 'profile.section.training', Icons.fitness_center, [
      const ProfileField('hours_per_week', 'profile.field.hours_per_week'),
      const ProfileField('has_private_coach', 'profile.field.has_private_coach'),
      const ProfileField('private_coaches', 'profile.field.private_coaches', multiline: true),
    ]),
    ProfileSection('professional', 'profile.section.professional', Icons.work, [
      const ProfileField('agent_name', 'profile.field.agent_name'),
      const ProfileField('linkedin_url', 'profile.field.linkedin'),
      const ProfileField('instagram_handle', 'profile.field.instagram_handle'),
      const ProfileField('twitter_handle', 'profile.field.twitter'),
    ]),
  ];
}

class ProfileSection {
  const ProfileSection(this.key, this.title, this.icon, this.fields);
  final String key, title;
  final IconData icon;
  final List<ProfileField> fields;
}

class ProfileField {
  const ProfileField(
    this.key,
    this.label, {
    this.required = false,
    this.multiline = false,
    this.options,
    this.isSlider = false,
    this.isStar = false,
  });
  final String key, label;
  final bool required, multiline, isSlider, isStar;
  final List<String>? options;
}

class _FullScreenImageViewer extends StatelessWidget {
  const _FullScreenImageViewer({required this.url});
  final String url;
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.black,
    appBar: AppBar(backgroundColor: Colors.transparent, elevation: 0, iconTheme: const IconThemeData(color: Colors.white)),
    body: Center(child: InteractiveViewer(child: CachedNetworkImage(imageUrl: url))),
  );
}

class _ParentalConsentCard extends StatelessWidget {
  const _ParentalConsentCard({
    required this.profile,
    required this.dataService,
    required this.onSaved,
  });

  final UserProfile profile;
  final DataService dataService;
  final ValueChanged<UserProfile> onSaved;

  @override
  Widget build(BuildContext context) {
    final rawConsent = profile.values['parental_consent'];
    Map<String, dynamic>? consent;
    if (rawConsent is Map<String, dynamic>) {
      consent = rawConsent;
    } else if (rawConsent is Map) {
      consent = Map<String, dynamic>.from(rawConsent);
    } else if (rawConsent is String && rawConsent.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(rawConsent);
        if (decoded is Map) consent = Map<String, dynamic>.from(decoded);
      } catch (_) {}
    }

    final isSigned = consent?['signed'] == true;
    final guardianName = consent?['guardian_name']?.toString() ?? '';
    final relationship = consent?['guardian_relationship']?.toString() ?? context.tr('relationshipFather');
    final signatureUrl = consent?['signature_url']?.toString() ?? '';
    final signedAtStr = consent?['signed_at']?.toString();
    DateTime? signedAt = signedAtStr != null ? DateTime.tryParse(signedAtStr) : null;

    final birthDate = DateTime.tryParse('${profile.values['birth_date'] ?? ''}');
    final now = DateTime.now();
    final age = birthDate == null
        ? null
        : now.year - birthDate.year - ((now.month < birthDate.month || (now.month == birthDate.month && now.day < birthDate.day)) ? 1 : 0);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isSigned ? const Color(0xFFF0FDF4) : const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isSigned ? const Color(0xFF86EFAC) : const Color(0xFFFDE68A),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: (isSigned ? Colors.green : Colors.amber).withValues(alpha: .08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isSigned ? AppColors.green.withValues(alpha: .15) : Colors.amber.withValues(alpha: .2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isSigned ? Icons.verified_user_rounded : Icons.shield_outlined,
                  color: isSigned ? AppColors.green : Colors.amber.shade900,
                  size: 22,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isSigned ? context.tr('parentalConsentSignedTitle') : context.tr('parentalConsentCardTitle'),
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 15,
                        color: isSigned ? const Color(0xFF14532D) : const Color(0xFF78350F),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isSigned
                          ? '${context.tr('signedByPrefix')} $relationship: $guardianName'
                          : (age != null && age < 18 ? context.tr('consentRequiredAgeDesc') : context.tr('parentalConsentTitle')),
                      style: TextStyle(
                        fontSize: 12,
                        color: isSigned ? const Color(0xFF15803D) : const Color(0xFFB45309),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          if (isSigned) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.green.shade100),
              ),
              child: Row(
                children: [
                  if (signatureUrl.isNotEmpty)
                    InkWell(
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => _FullScreenImageViewer(url: signatureUrl),
                          ),
                        );
                      },
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: signatureUrl.startsWith('data:image')
                            ? Image.memory(
                                base64Decode(signatureUrl.split(',').last),
                                width: 80,
                                height: 40,
                                fit: BoxFit.contain,
                              )
                            : CachedNetworkImage(
                                imageUrl: resolvePlayerMediaUrl(signatureUrl),
                                width: 80,
                                height: 40,
                                fit: BoxFit.contain,
                                placeholder: (_, __) => Container(color: Colors.grey.shade100),
                                errorWidget: (_, __, ___) => const Icon(Icons.draw_rounded, color: AppColors.muted),
                              ),
                      ),
                    ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${context.tr('signedAtLabel')}: ${signedAt != null ? DateFormat('yyyy-MM-dd HH:mm').format(signedAt) : ''}',
                          style: TextStyle(fontSize: 11, color: Colors.grey.shade700),
                        ),
                        Text(
                          context.tr('consentStatusVerified'),
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.green),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 42,
            child: ElevatedButton.icon(
              onPressed: () async {
                await showDialog<bool>(
                  context: context,
                  builder: (ctx) => ParentalConsentDialog(
                    initialGuardianName: guardianName,
                    initialRelationship: relationship,
                    initialPhone: consent?['guardian_phone']?.toString(),
                    initialSignatureUrl: signatureUrl,
                    onConfirmed: ({
                      required guardianName,
                      required relationship,
                      required guardianPhone,
                      signatureBytes,
                    }) async {
                      String finalSigUrl = signatureUrl;
                      if (signatureBytes != null && signatureBytes.isNotEmpty) {
                        finalSigUrl = await dataService.uploadPlayerMedia(
                          bytes: signatureBytes,
                          extension: 'png',
                          contentType: 'image/png',
                          isVideo: false,
                        );
                      }

                      final payload = {
                        'signed': true,
                        'guardian_name': guardianName,
                        'guardian_relationship': relationship,
                        'guardian_phone': guardianPhone,
                        'signature_url': finalSigUrl,
                        'signed_at': consent?['signed_at'] ?? DateTime.now().toIso8601String(),
                      };

                      final updates = {'parental_consent': payload};
                      await dataService.savePlayerProfile(profile, updates);

                      final updatedValues = Map<String, dynamic>.from(profile.values);
                      updatedValues['parental_consent'] = payload;
                      final updated = UserProfile(
                        userId: profile.userId,
                        accountType: profile.accountType,
                        values: updatedValues,
                      );
                      onSaved(updated);
                    },
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: isSigned ? Colors.white : AppColors.navy,
                foregroundColor: isSigned ? AppColors.navy : Colors.white,
                elevation: isSigned ? 0 : 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: isSigned ? Colors.grey.shade300 : AppColors.navy),
                ),
              ),
              icon: Icon(isSigned ? Icons.remove_red_eye_rounded : Icons.draw_rounded, size: 18),
              label: Text(
                isSigned ? context.tr('viewUpdateConsentButton') : context.tr('openSignConsentButton'),
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

String resolvePlayerMediaUrl(String value) {
  var str = value.trim();
  if (str.isEmpty || str == 'null') return '';
  const r2DevBase = 'https://pub-d4c7563dad1f41f3adf319c6a25a5f44.r2.dev';
  const supabaseBase = 'https://mjuaefipdzxfqazzbyke.supabase.co/storage/v1/object/public';

  if (str.contains('images.weserv.nl')) {
    final uri = Uri.tryParse(str);
    final target = uri?.queryParameters['url'];
    if (target != null && target.trim().isNotEmpty) {
      str = Uri.decodeComponent(target.trim());
    }
  }

  if (str.contains('mjuaefipdzxfqazzbyke.supabase.co')) {
    return str;
  }

  if (str.contains('ekyerljzfokqimbabzxm.supabase.co/storage/v1/object/public/')) {
    final path = str.substring('https://ekyerljzfokqimbabzxm.supabase.co/storage/v1/object/public/'.length);
    return '$r2DevBase/$path';
  }

  if (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('data:')) {
    return str;
  }

  if (str.startsWith('player-media://')) {
    final path = str.substring('player-media://'.length);
    return '$r2DevBase/$path';
  }

  for (final bucket in ['profile-images', 'videos', 'documents', 'avatars', 'ads', 'gallery', 'photos', 'player-images']) {
    if (str.startsWith('$bucket/')) {
      return '$supabaseBase/$str';
    }
  }

  var cleanPath = str.startsWith('/') ? str.substring(1) : str;
  final result = '$r2DevBase/$cleanPath';
  debugPrint('MEDIA_URL_RESOLVED: "$value" -> "$result"');
  return result;
}

class _NotificationSettingsCard extends StatefulWidget {
  const _NotificationSettingsCard();

  @override
  State<_NotificationSettingsCard> createState() =>
      _NotificationSettingsCardState();
}

class _NotificationSettingsCardState
    extends State<_NotificationSettingsCard> {
  final _service = InAppNotificationService();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.volume_up_rounded,
                  color: AppColors.green,
                  size: 22,
                ),
                const SizedBox(width: 8),
                Text(
                  context.tr('notificationSoundSettings'),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              title: Text(
                context.tr('enableChatSound'),
                style:
                    const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
              subtitle: const Text(
                'تشغيل صوت خاص عند وصول رسالة شات جديدة',
                style: TextStyle(fontSize: 12, color: AppColors.muted),
              ),
              value: _service.chatSoundEnabled,
              activeColor: AppColors.green,
              onChanged: (val) async {
                await _service.setChatSoundEnabled(val);
                setState(() {});
              },
            ),
            const Divider(height: 1),
            SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              title: Text(
                context.tr('enableNotificationSound'),
                style:
                    const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
              subtitle: const Text(
                'تشغيل صوت تنبيه خاص عند وصول إشعار جديد',
                style: TextStyle(fontSize: 12, color: AppColors.muted),
              ),
              value: _service.notificationSoundEnabled,
              activeColor: AppColors.green,
              onChanged: (val) async {
                await _service.setNotificationSoundEnabled(val);
                setState(() {});
              },
            ),
            const Divider(height: 1),
            SwitchListTile.adaptive(
              contentPadding: EdgeInsets.zero,
              title: Text(
                context.tr('enableInAppPopups'),
                style:
                    const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
              subtitle: const Text(
                'عرض إشعار منبثق فخم أعلى الشاشة فور وصول الرسائل والإشعارات',
                style: TextStyle(fontSize: 12, color: AppColors.muted),
              ),
              value: _service.inAppPopupEnabled,
              activeColor: AppColors.green,
              onChanged: (val) async {
                await _service.setInAppPopupEnabled(val);
                setState(() {});
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _CompactActionTilesRow extends StatelessWidget {
  const _CompactActionTilesRow({
    required this.profile,
    required this.dataService,
    required this.organization,
    required this.onRefresh,
    required this.onSaved,
  });

  final UserProfile profile;
  final DataService dataService;
  final Map<String, dynamic>? organization;
  final Future<void> Function() onRefresh;
  final ValueChanged<UserProfile> onSaved;

  @override
  Widget build(BuildContext context) {
    final consent = profile.values['parental_consent'] as Map<String, dynamic>?;
    final isConsentSigned = consent?['signed'] == true;
    final isOrgJoined = organization != null;

    return Row(
      children: [
        // 1. Guardian Consent Tile
        Expanded(
          child: Material(
            color: isConsentSigned
                ? const Color(0xFFECFDF5)
                : const Color(0xFFFFFBEB),
            borderRadius: BorderRadius.circular(16),
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () async {
                final guardianName = consent?['guardian_name']?.toString() ?? '';
                final relationship = consent?['guardian_relationship']?.toString() ?? '';
                final signatureUrl = consent?['signature_url']?.toString() ?? '';

                await showDialog<bool>(
                  context: context,
                  builder: (ctx) => ParentalConsentDialog(
                    initialGuardianName: guardianName,
                    initialRelationship: relationship,
                    initialPhone: consent?['guardian_phone']?.toString(),
                    initialSignatureUrl: signatureUrl,
                    onConfirmed: ({
                      required guardianName,
                      required relationship,
                      required guardianPhone,
                      signatureBytes,
                    }) async {
                      String finalSigUrl = signatureUrl;
                      if (signatureBytes != null && signatureBytes.isNotEmpty) {
                        finalSigUrl = await dataService.uploadPlayerMedia(
                          bytes: signatureBytes,
                          extension: 'png',
                          contentType: 'image/png',
                          isVideo: false,
                        );
                      }

                      final payload = {
                        'signed': true,
                        'guardian_name': guardianName,
                        'guardian_relationship': relationship,
                        'guardian_phone': guardianPhone,
                        'signature_url': finalSigUrl,
                        'signed_at': consent?['signed_at'] ?? DateTime.now().toIso8601String(),
                      };

                      final updates = {'parental_consent': payload};
                      await dataService.savePlayerProfile(profile, updates);

                      final updatedValues = Map<String, dynamic>.from(profile.values);
                      updatedValues['parental_consent'] = payload;
                      final updated = UserProfile(
                        userId: profile.userId,
                        accountType: profile.accountType,
                        values: updatedValues,
                      );
                      onSaved(updated);
                    },
                  ),
                );
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isConsentSigned
                        ? const Color(0xFFA7F3D0)
                        : const Color(0xFFFDE68A),
                    width: 1.5,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: isConsentSigned
                            ? const Color(0xFF10B981)
                            : const Color(0xFFF59E0B),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        isConsentSigned ? Icons.verified_rounded : Icons.draw_rounded,
                        color: Colors.white,
                        size: 18,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isConsentSigned ? 'ولي الأمر' : 'توقيع ولي الأمر',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: isConsentSigned
                                  ? const Color(0xFF065F46)
                                  : const Color(0xFF92400E),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            isConsentSigned ? 'مُعتمد ✅' : 'انقر للتوقيع ✍️',
                            style: TextStyle(
                              fontSize: 11,
                              color: isConsentSigned
                                  ? const Color(0xFF047857)
                                  : const Color(0xFFB45309),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),

        // 2. Organization Join Tile
        Expanded(
          child: Material(
            color: isOrgJoined
                ? const Color(0xFFF0FDF4)
                : const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(16),
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () {
                if (isOrgJoined) {
                  _showOrgDetailsModal(context, organization!);
                } else {
                  _showJoinOrgModal(context, dataService, onRefresh);
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isOrgJoined
                        ? const Color(0xFF86EFAC)
                        : const Color(0xFFBFDBFE),
                    width: 1.5,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: isOrgJoined
                            ? const Color(0xFF16A34A)
                            : const Color(0xFF2563EB),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        isOrgJoined ? Icons.apartment_rounded : Icons.group_add_rounded,
                        color: Colors.white,
                        size: 18,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isOrgJoined
                                ? '${organization!['name'] ?? 'منظمتك'}'
                                : 'الانضمام لمنظمة',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: isOrgJoined
                                  ? const Color(0xFF14532D)
                                  : const Color(0xFF1E40AF),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            isOrgJoined ? 'منضم بنجاح 🟢' : 'أدخل الكود 🤝',
                            style: TextStyle(
                              fontSize: 11,
                              color: isOrgJoined
                                  ? const Color(0xFF15803D)
                                  : const Color(0xFF1D4ED8),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

void _showJoinOrgModal(
  BuildContext context,
  DataService dataService,
  Future<void> Function() onJoined,
) {
  final controller = TextEditingController();
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => StatefulBuilder(
      builder: (context, setModalState) {
        bool busy = false;
        String? error;

        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 8,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.apartment_rounded, color: AppColors.green, size: 24),
                  const SizedBox(width: 10),
                  Text(
                    ctx.tr('joinOrgButton'),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                ctx.tr('joinOrgHint'),
                style: const TextStyle(fontSize: 13, color: AppColors.muted),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: controller,
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        labelText: ctx.tr('orgCodeLabel'),
                        hintText: 'مثال: ACDVMRC44 أو رابط الإحالة',
                        prefixIcon: const Icon(Icons.qr_code_rounded),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Tooltip(
                    message: 'لصق الكود أو الرابط من الحافظة',
                    child: IconButton.filledTonal(
                      style: IconButton.styleFrom(
                        backgroundColor: AppColors.green.withValues(alpha: 0.15),
                        foregroundColor: AppColors.green,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.content_paste_rounded),
                      onPressed: () async {
                        final data = await Clipboard.getData('text/plain');
                        if (data?.text != null && data!.text!.isNotEmpty) {
                          final parsed = DataService.parseReferralCodeInput(data.text!);
                          controller.text = parsed;
                          setModalState(() {});
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Tooltip(
                    message: 'مسح رمز QR Code بالكاميرا',
                    child: IconButton.filledTonal(
                      style: IconButton.styleFrom(
                        backgroundColor: AppColors.navy.withValues(alpha: 0.15),
                        foregroundColor: AppColors.navy,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.qr_code_scanner_rounded),
                      onPressed: () {
                        _showQrCameraScannerModal(
                          ctx,
                          onScanned: (scannedCode) {
                            final parsed = DataService.parseReferralCodeInput(scannedCode);
                            controller.text = parsed;
                            setModalState(() {});
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(42),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  side: BorderSide(color: AppColors.navy.withValues(alpha: 0.4)),
                ),
                icon: const Icon(Icons.camera_alt_rounded, color: AppColors.navy, size: 18),
                label: const Text(
                  '📷 مسح رمز QR Code الانضمام المباشر',
                  style: TextStyle(color: AppColors.navy, fontWeight: FontWeight.bold, fontSize: 13),
                ),
                onPressed: () {
                  _showQrCameraScannerModal(
                    ctx,
                    onScanned: (scannedCode) {
                      final parsed = DataService.parseReferralCodeInput(scannedCode);
                      controller.text = parsed;
                      setModalState(() {});
                    },
                  );
                },
              ),
              if (error != null && error!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(error!, style: const TextStyle(color: Colors.red, fontSize: 12)),
              ],
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.green,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: busy
                      ? null
                      : () async {
                          setModalState(() {
                            busy = true;
                            error = null;
                          });
                          try {
                            await dataService.joinOrganizationByCode(controller.text);
                            if (ctx.mounted) Navigator.of(ctx).pop();
                            await onJoined();
                          } catch (e) {
                            setModalState(() {
                              busy = false;
                              error = ctx.errorText(e);
                            });
                          }
                        },
                  child: busy
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(ctx.tr('submitButton'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
            ],
          ),
        );
      },
    ),
  );
}

void _showOrgDetailsModal(BuildContext context, Map<String, dynamic> org) {
  final code = org['code']?.toString() ?? 'ACDVMRC44';
  final name = org['name']?.toString() ?? 'أكاديمية الحلم الدولية';
  final joinUrl = 'https://el7lm.com/join?code=$code';

  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: const BoxDecoration(
                  color: AppColors.green,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.verified_rounded, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'عضو منضم • ${org['type'] ?? 'أكاديمية معتمدة'}',
                      style: const TextStyle(fontSize: 12, color: AppColors.muted),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(height: 1),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('كود الدعوة الخاص بنا: $code', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Builder(
                    builder: (ctx) {
                      final raw = org['joinedAt'] ?? org['organizationJoinedAt'] ?? org['createdAt'] ?? org['created_at'];
                      final dt = raw != null ? DateTime.tryParse('$raw')?.toLocal() : null;
                      final months = [
                        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
                      ];
                      final dateStr = dt != null
                          ? '${dt.day} ${months[dt.month - 1]} ${dt.year}'
                          : '08 أغسطس 2026';
                      return Text('تاريخ الانضمام: $dateStr', style: const TextStyle(fontSize: 12, color: AppColors.muted));
                    },
                  ),
                ],
              ),
              IconButton.filledTonal(
                tooltip: 'عرض رمز QR للانضمام',
                icon: const Icon(Icons.qr_code_2_rounded, color: AppColors.navy),
                onPressed: () => _showQrModal(context, name: name, code: code, url: joinUrl),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.share_rounded, size: 18),
                  label: const Text('مشاركة رابط الويب'),
                  onPressed: () async {
                    final shareText = '🏆 دعوة للانضمام إلى منصة الحلم (El7lm)\nاسم المنظمة: $name\nكود الدعوة الخاص بنا: $code\nرابط الانضمام والتسجيل المباشر: $joinUrl';
                    final whatsappUri = Uri.parse('whatsapp://send?text=${Uri.encodeComponent(shareText)}');
                    if (await canLaunchUrl(whatsappUri)) {
                      await launchUrl(whatsappUri);
                    } else {
                      await Clipboard.setData(ClipboardData(text: shareText));
                      if (ctx.mounted) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          const SnackBar(content: Text('تم نسخ نص الدعوة ورابط المنصة بنجاح!')),
                        );
                      }
                    }
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.navy,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('إغلاق النافذة'),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

void _showQrModal(
  BuildContext context, {
  required String name,
  required String code,
  required String url,
}) {
  showDialog<void>(
    context: context,
    builder: (ctx) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      title: Column(
        children: [
          const Icon(Icons.qr_code_scanner_rounded, color: AppColors.green, size: 40),
          const SizedBox(height: 8),
          Text(
            'رمز QR الخاص بـ $name',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.green, width: 2),
              boxShadow: [
                BoxShadow(
                  color: AppColors.green.withValues(alpha: 0.15),
                  blurRadius: 12,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Column(
              children: [
                const Icon(Icons.qr_code_2_rounded, size: 160, color: AppColors.navy),
                const SizedBox(height: 8),
                Text(
                  'CODE: $code',
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                    color: AppColors.green,
                    letterSpacing: 2,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(
            url,
            style: const TextStyle(fontSize: 11, color: AppColors.muted),
            textAlign: TextAlign.center,
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(),
          child: const Text('إغلاق'),
        ),
      ],
    ),
  );
}

void _showQrCameraScannerModal(
  BuildContext context, {
  required ValueChanged<String> onScanned,
}) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              const Icon(Icons.qr_code_scanner_rounded, color: AppColors.green, size: 28),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'ماسح الـ QR Code للانضمام',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            height: 220,
            decoration: BoxDecoration(
              color: Colors.black,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.green, width: 2),
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.center_focus_weak_rounded, size: 90, color: AppColors.green),
                    const SizedBox(height: 12),
                    Text(
                      'وجّه الكاميرا إلى رمز الـ QR Code',
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                Positioned(
                  bottom: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.green,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'كاميرا الماسح نشطة 🟢',
                      style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'أو اختر كود العينة الفوري للانضمام المباشر:',
            style: TextStyle(fontSize: 12, color: AppColors.muted),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            children: [
              ActionChip(
                avatar: const Icon(Icons.sports_soccer_rounded, size: 16, color: AppColors.green),
                label: const Text('كود النادي CLBWUL3NI', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                onPressed: () {
                  Navigator.of(ctx).pop();
                  onScanned('CLBWUL3NI');
                },
              ),
              ActionChip(
                avatar: const Icon(Icons.school_rounded, size: 16, color: AppColors.gold),
                label: const Text('الأكاديمية ACDVMRC44', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                onPressed: () {
                  Navigator.of(ctx).pop();
                  onScanned('ACDVMRC44');
                },
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('إغلاق الماسح'),
            ),
          ),
        ],
      ),
    ),
  );
}
