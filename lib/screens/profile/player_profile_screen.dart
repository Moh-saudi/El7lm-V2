import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart' hide TextDirection;
import 'package:url_launcher/url_launcher.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/account_type.dart';
import '../../models/player.dart';
import '../../models/user_profile.dart';
import '../../services/data_service.dart';
import '../../services/media_upload_manager.dart';
import '../../services/profile_answer_validator.dart';
import '../../widgets/parental_consent_dialog.dart';
import '../../widgets/player_share_modal.dart';
import '../../widgets/player_skills_radar_chart.dart';
import '../../widgets/smart_profile_chat_modal.dart';
import 'player_profile_data.dart';
import 'profile_edit_screen.dart';

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
    widget.dataService.profileNotifier.addListener(_onProfileUpdated);
  }

  void _onProfileUpdated() {
    final updated = widget.dataService.profileNotifier.value;
    if (updated != null && mounted) {
      setState(() {
        future = Future.value(updated);
      });
    }
  }

  @override
  void dispose() {
    widget.dataService.profileNotifier.removeListener(_onProfileUpdated);
    super.dispose();
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
  final _initialControllerValues = <String, String>{};
  final _initialRawValues = <String, dynamic>{};
  static const _structuredProfileFields = {
    'languages',
    'courses',
    'club_history',
    'achievements',
    'allergies_list',
    'surgeries_list',
    'medications',
    'injuries',
    'family_history',
    'private_coaches',
    'academies',
    'social_links',
  };
  bool saving = false;
  bool editing = false;
  bool _showSkillsRadar = false;

  @override
  void initState() {
    super.initState();
    _initControllers();
  }

  @override
  void didUpdateWidget(covariant _ProfileForm oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.profile != widget.profile) {
      _initControllers();
    }
  }

  String _resolveMediaUrl(String value) => resolvePlayerMediaUrl(value);


  bool _isNonEmpty(dynamic val) {
    if (val == null) return false;
    final str = '$val'.trim();
    return str.isNotEmpty && str != 'null';
  }

  bool _isValidPhone(dynamic val) {
    if (val == null) return false;
    final str = '$val'.trim();
    if (str.isEmpty || str == 'null' || str.toLowerCase().contains('test')) {
      return false;
    }
    final digits = str.replaceAll(RegExp(r'\D'), '');
    return digits.length >= 7;
  }

  dynamic _getRawValue(String fieldKey) {
    if (fieldKey == 'phone') {
      var val = widget.profile.values['phone'];
      if (_isValidPhone(val)) return val;

      final phoneAliases = [
        'phoneNumber',
        'mobile',
        'telephone',
        'phone_number',
        'user_phone',
      ];
      for (final alias in phoneAliases) {
        val = widget.profile.values[alias];
        if (_isValidPhone(val)) return val;
      }

      // Check current auth user
      try {
        final authUser = Supabase.instance.client.auth.currentUser;
        final authPhone = authUser?.phone ?? authUser?.userMetadata?['phone'];
        if (_isValidPhone(authPhone)) return '$authPhone'.trim();
      } catch (_) {}

      // Fallback from profile.userId if it contains a phone sequence
      final digits = widget.profile.userId.replaceAll(RegExp(r'\D'), '');
      if (digits.length >= 9) {
        return digits;
      }
      return null;
    }

    // 1. Direct key
    var val = widget.profile.values[fieldKey];
    if (_isNonEmpty(val)) return val;

    // 2. Map aliases for common schema variations
    final aliases = <String, List<String>>{
      'name': ['full_name', 'displayName', 'player_name', 'username'],
      'phone': ['phoneNumber', 'mobile', 'telephone', 'phone_number'],
      'email': ['emailAddress', 'mail'],
      'brief': ['bio', 'about', 'overview', 'description'],
      'height': ['height_cm', 'stature'],
      'weight': ['weight_kg', 'mass'],
      'position': ['primary_position', 'main_position', 'pos'],
      'secondary_position': ['alt_position', 'secondaryPosition'],
      'contract_status': ['contractStatus', 'status'],
      'guardian_name': ['guardianName', 'parent_name'],
      'guardian_phone': ['guardianPhone', 'parent_phone'],
    };

    final list = aliases[fieldKey];
    if (list != null) {
      for (final alias in list) {
        val = widget.profile.values[alias];
        if (_isNonEmpty(val)) return val;
      }
    }

    // 3. Fallback to nested objects if key exists in parental_consent
    if (fieldKey == 'guardian_name' || fieldKey == 'guardian_phone') {
      final consentRaw = widget.profile.values['parental_consent'];
      if (consentRaw is Map) {
        val = consentRaw[fieldKey];
        if (_isNonEmpty(val)) return val;
      } else if (consentRaw is String && consentRaw.trim().isNotEmpty) {
        try {
          final decoded = jsonDecode(consentRaw);
          if (decoded is Map) {
            val = decoded[fieldKey];
            if (_isNonEmpty(val)) return val;
          }
        } catch (_) {}
      }
    }

    return null;
  }

  void _initControllers() {
    for (final section in getProfileSections()) {
      for (final field in section.fields) {
        var value = _getRawValue(field.key);
        _initialRawValues[field.key] = value;
        if (value is Map) {
          value =
              value['url'] ??
              value['path'] ??
              value['src'] ??
              value['uri'] ??
              value['name'] ??
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
        _initialControllerValues[field.key] = text;
      }
    }
  }

  String _displayListItem(Object? item) {
    if (item is Map) {
      return '${item['name'] ?? item['title'] ?? item['club_name'] ?? item['club'] ?? item['language'] ?? item['injury_type'] ?? item['allergen'] ?? item['procedure'] ?? item['condition'] ?? item['url'] ?? item}';
    }
    return '$item';
  }

  String _computeOvr() {
    final keys = [
      'stats_pace',
      'stats_shooting',
      'stats_passing',
      'stats_dribbling',
      'stats_defending',
      'stats_physical',
    ];
    final vals = keys
        .map((k) => num.tryParse(controllers[k]?.text ?? '')?.toDouble())
        .whereType<double>()
        .toList();
    if (vals.isEmpty) return '50';
    return (vals.reduce((a, b) => a + b) / vals.length)
        .toInt()
        .clamp(0, 99)
        .toString();
  }

  @override
  void dispose() {
    for (final c in controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  List<String> _extractMediaList(List<String> candidateKeys) {
    final results = <String>{};
    for (final key in candidateKeys) {
      final raw = widget.profile.values[key];
      if (raw != null) {
        results.addAll(MediaUploadManager.extractCleanUrls(raw));
      }
    }
    return results.toList();
  }

  Future<void> _handleDeleteMedia(String url, String category) async {
    final updatedValues = Map<String, dynamic>.from(widget.profile.values);
    if (category == 'videos') {
      final currentList = MediaUploadManager.extractVideoItems(
        widget.profile.values['videos'] ??
            widget.profile.values['video_urls'] ??
            widget.profile.values['uploaded_videos'],
      );
      currentList.removeWhere((item) => item.url == url);
      final jsonList = currentList.map((e) => e.toJson()).toList();
      final updates = <String, dynamic>{
        'videos': jsonList,
        'video_urls': jsonList,
        'uploaded_videos': jsonList,
      };
      await widget.dataService.savePlayerProfile(widget.profile, updates);

      updatedValues['videos'] = jsonList;
      updatedValues['video_urls'] = jsonList;
      updatedValues['uploaded_videos'] = jsonList;
      final updatedProfile = UserProfile(
        userId: widget.profile.userId,
        accountType: widget.profile.accountType,
        values: updatedValues,
      );
      widget.onSaved(updatedProfile);
      return;
    }

    final keyToUpdate = switch (category) {
      'images' => 'additional_images',
      _ => 'documents',
    };
    final currentList = _extractMediaList([keyToUpdate, category]);
    currentList.removeWhere((item) => item == url);

    final updates = <String, dynamic>{keyToUpdate: currentList};
    if (category == 'images') {
      updates['images'] = currentList;
    }
    await widget.dataService.savePlayerProfile(widget.profile, updates);

    updatedValues[keyToUpdate] = currentList;
    if (category == 'images') {
      updatedValues['images'] = currentList;
    }
    final updatedProfile = UserProfile(
      userId: widget.profile.userId,
      accountType: widget.profile.accountType,
      values: updatedValues,
    );
    widget.onSaved(updatedProfile);
  }

  void _openEditScreen(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ProfileEditScreen(
          profile: widget.profile,
          dataService: widget.dataService,
          onSaved: (updated) {
            widget.onSaved(updated);
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final org = widget.profile.values['_organization'];
    final organization = (org is Map<String, dynamic> && org.isNotEmpty)
        ? org
        : null;

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(
          parent: ClampingScrollPhysics(),
        ),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
        children: [
          _buildHeader(context),
          const SizedBox(height: 12),
          _CompactActionTilesRow(
            profile: widget.profile,
            dataService: widget.dataService,
            organization: organization,
            onRefresh: widget.onRefresh,
            onSaved: widget.onSaved,
          ),
          const SizedBox(height: 10),
          // ── AI Scout Assistant Banner ──
          _SmartScoutBanner(
            profile: widget.profile,
            dataService: widget.dataService,
            onSaved: widget.onSaved,
          ),
          const SizedBox(height: 16),
          // ── Edit Profile Button ──
          SizedBox(
            width: double.infinity,
            height: 54,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                foregroundColor: Colors.white,
                elevation: 6,
                shadowColor: const Color(0xFF10B981).withValues(alpha: .45),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              onPressed: () => _openEditScreen(context),
              icon: const Icon(Icons.edit_note_rounded, size: 22),
              label: Text(
                context.tr('editPlayerData'),
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                  letterSpacing: .4,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          // ── Media & Videos Section ──
          _MediaSection(
            profile: widget.profile,
            dataService: widget.dataService,
            images: _extractMediaList(['additional_images', 'images']),
            documents: _extractMediaList(['documents', 'documents_urls']),
            videos: MediaUploadManager.extractVideoItems(
              widget.profile.values['videos'] ??
                  widget.profile.values['video_urls'] ??
                  widget.profile.values['uploaded_videos'],
            ),
            onUploaded: widget.onSaved,
            onDelete: _handleDeleteMedia,
          ),
          const SizedBox(height: 16),
        ],
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
                      (now.month == birthDate.month && now.day < birthDate.day))
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
          colors: [Color(0xFF0F172A), Color(0xFF1E1B4B), Color(0xFF064E3B)],
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
                          horizontal: 12,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [Color(0xFFFFD700), Color(0xFFF59E0B)],
                          ),
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(
                                0xFFFFD700,
                              ).withValues(alpha: .45),
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
                                    ? () =>
                                          _showFullScreenImage(context, avatar)
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
                                              placeholder: (context, url) =>
                                                  const CircularProgressIndicator(
                                                    strokeWidth: 2,
                                                  ),
                                              errorWidget:
                                                  (context, url, error) =>
                                                      const Icon(
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
                                  : '${_getRawValue('name') ?? context.tr('playerProfile')}',
                              style: const TextStyle(
                                fontSize: 19,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                                letterSpacing: .3,
                              ),
                            ),
                            const SizedBox(height: 5),
                            if (controllers['position']?.text.isNotEmpty ==
                                true)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 3,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(
                                    0xFF10B981,
                                  ).withValues(alpha: .25),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: const Color(
                                      0xFF10B981,
                                    ).withValues(alpha: .5),
                                  ),
                                ),
                                child: Text(
                                  localizedProfileOptionLabel(
                                    context,
                                    'position',
                                    controllers['position']!.text,
                                  ),
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
                                context.tr('playerAgeValue', {
                                  'age': age.toString(),
                                }),
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
                      _buildFutStatBadge(
                        context
                            .tr('profile.field.stats_pace')
                            .split(' ')[0]
                            .toUpperCase(),
                        'stats_pace',
                      ),
                      _buildFutStatBadge(
                        context
                            .tr('profile.field.stats_shooting')
                            .split(' ')[0]
                            .toUpperCase(),
                        'stats_shooting',
                      ),
                      _buildFutStatBadge(
                        context
                            .tr('profile.field.stats_passing')
                            .split(' ')[0]
                            .toUpperCase(),
                        'stats_passing',
                      ),
                      _buildFutStatBadge(
                        context
                            .tr('profile.field.stats_dribbling')
                            .split(' ')[0]
                            .toUpperCase(),
                        'stats_dribbling',
                      ),
                      _buildFutStatBadge(
                        context
                            .tr('profile.field.stats_defending')
                            .split(' ')[0]
                            .toUpperCase(),
                        'stats_defending',
                      ),
                      _buildFutStatBadge(
                        context
                            .tr('profile.field.stats_physical')
                            .split(' ')[0]
                            .toUpperCase(),
                        'stats_physical',
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // ── Skills Radar Chart Toggle ──
                  InkWell(
                    borderRadius: BorderRadius.circular(10),
                    onTap: () =>
                        setState(() => _showSkillsRadar = !_showSkillsRadar),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        vertical: 4,
                        horizontal: 8,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _showSkillsRadar
                                ? Icons.radar
                                : Icons.radar_outlined,
                            size: 15,
                            color: const Color(0xFF10B981),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _showSkillsRadar
                                ? context.tr('hideSkillsRadar')
                                : context.tr('showSkillsRadar'),
                            style: const TextStyle(
                              color: Color(0xFF6EE7B7),
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            _showSkillsRadar
                                ? Icons.keyboard_arrow_up
                                : Icons.keyboard_arrow_down,
                            size: 16,
                            color: const Color(0xFF6EE7B7),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (_showSkillsRadar) ...[
                    const SizedBox(height: 10),
                    Center(
                      child: PlayerSkillsRadarChart(
                        pace:
                            num.tryParse(
                              controllers['stats_pace']?.text ?? '',
                            ) ??
                            50,
                        shooting:
                            num.tryParse(
                              controllers['stats_shooting']?.text ?? '',
                            ) ??
                            50,
                        passing:
                            num.tryParse(
                              controllers['stats_passing']?.text ?? '',
                            ) ??
                            50,
                        dribbling:
                            num.tryParse(
                              controllers['stats_dribbling']?.text ?? '',
                            ) ??
                            50,
                        defending:
                            num.tryParse(
                              controllers['stats_defending']?.text ?? '',
                            ) ??
                            50,
                        physical:
                            num.tryParse(
                              controllers['stats_physical']?.text ?? '',
                            ) ??
                            50,
                        size: 240,
                        isDark: true,
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                  const SizedBox(height: 14),
                  // ── Profile Completion Bar ──
                  Builder(
                    builder: (ctx) {
                      final pct = _computeCompletion();
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                ctx.tr('profileCompletion'),
                                style: const TextStyle(
                                  color: Color(0xFF94A3B8),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  letterSpacing: .3,
                                ),
                              ),
                              Text(
                                '$pct%',
                                style: TextStyle(
                                  color: pct >= 80
                                      ? const Color(0xFF10B981)
                                      : pct >= 50
                                      ? const Color(0xFFFFD700)
                                      : const Color(0xFFEF4444),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: LinearProgressIndicator(
                              value: pct / 100,
                              minHeight: 6,
                              backgroundColor: const Color(0xFF1E293B),
                              valueColor: AlwaysStoppedAnimation<Color>(
                                pct >= 80
                                    ? const Color(0xFF10B981)
                                    : pct >= 50
                                    ? const Color(0xFFFFD700)
                                    : const Color(0xFFEF4444),
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 18),
                  // Action Buttons Column: Digital FUT Card & Edit Toggle
                  Column(
                    children: [
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFFFD700),
                            foregroundColor: const Color(0xFF0F172A),
                            elevation: 6,
                            shadowColor: const Color(
                              0xFFFFD700,
                            ).withValues(alpha: .5),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          onPressed: () {
                            final vals = widget.profile.values;
                            final birthDate = DateTime.tryParse(
                              '${vals['birth_date'] ?? ''}',
                            );
                            final now = DateTime.now();
                            final age = birthDate == null
                                ? null
                                : now.year - birthDate.year;
                            final p = Player(
                              id: widget.profile.userId,
                              name:
                                  '${vals['name'] ?? context.tr('playerProfile')}',
                              position: '${vals['position'] ?? 'ST'}',
                              country: '${vals['country'] ?? 'السعودية'}',
                              age: age,
                              imageUrl: _avatarImageUrl,
                              videos: const [],
                              rawPayload: vals,
                            );
                            showPlayerShareModal(context, player: p);
                          },
                          icon: const Icon(
                            Icons.style_rounded,
                            size: 22,
                            color: Color(0xFF0F172A),
                          ),
                          label: Text(
                            switch (Localizations.localeOf(
                              context,
                            ).languageCode) {
                              'fr' => '🎴 Voir la carte de talent (FUT Card)',
                              'es' => '🎴 Ver tarjeta de talento (FUT Card)',
                              'pt' => '🎴 Ver cartão de talento (FUT Card)',
                              'en' => '🎴 View Digital Talent Card (FUT Card)',
                              _ => '🎴 معاينة واستعراض كارت الموهبة (FUT Card)',
                            },
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                              letterSpacing: .3,
                            ),
                          ),
                        ),
                      ),
                    ],
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


  bool _isFieldApplicable(ProfileField field) {
    final level = controllers['education_level']?.text.trim() ?? '';
    if (field.key == 'school_name') {
      return educationUsesSchool(level);
    }
    if (field.key == 'university_name') {
      return educationUsesUniversity(level);
    }
    return true;
  }

  /// Computes true profile completion percentage across all 9 sections.
  int _computeCompletion() {
    final sections = getProfileSections();
    int totalFields = 0;
    int filledFields = 0;

    for (final section in sections) {
      for (final field in section.fields) {
        if (!_isFieldApplicable(field)) continue;
        totalFields++;
        final ctrlText = controllers[field.key]?.text.trim() ?? '';
        final rawVal = _getRawValue(field.key);
        final val = ctrlText.isNotEmpty ? ctrlText : '${rawVal ?? ''}'.trim();

        if (val.isNotEmpty &&
            val != 'null' &&
            val != '0' &&
            val != 'false' &&
            val != '0.0') {
          filledFields++;
        }
      }
    }

    if (totalFields == 0) return 0;
    return ((filledFields / totalFields) * 100).round().clamp(0, 100);
  }

  void _showFullScreenImage(BuildContext context, String url) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => _FullScreenImageViewer(url: url),
      ),
    );
  }

  String get _avatarImageUrl {
    for (final k in [
      'avatar_url',
      'photo_url',
      'profile_image_url',
      'image',
      'profile_image',
      'avatar',
      'user_image',
      'picture',
    ]) {
      final v = widget.profile.values[k];
      if (v != null) {
        final text = '$v'.trim();
        if (text.isNotEmpty && text != 'null') {
          return _resolveMediaUrl(
            v is Map ? '${v['url'] ?? v['path'] ?? v['src'] ?? ''}' : text,
          );
        }
      }
    }
    return '';
  }

  Future<void> save() async {
    if (!formKey.currentState!.validate()) return;
    try {
      final updates = collectUpdates();
      if (updates.isEmpty) {
        setState(() => editing = false);
        return;
      }
      setState(() => saving = true);
      await widget.dataService.savePlayerProfile(
        widget.profile,
        updates,
        strict: true,
      );
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(_localizedSaveError(e))));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Map<String, dynamic> collectUpdates() {
    final res = <String, dynamic>{};
    for (final e in controllers.entries) {
      final key = e.key;
      final text = e.value.text.trim();
      if (text == (_initialControllerValues[key] ?? '').trim()) continue;

      if (_booleanFields.contains(key)) {
        res[key] = text.toLowerCase() == 'true';
      } else if (_numericFields.contains(key)) {
        res[key] = text.isEmpty
            ? null
            : num.parse(ProfileAnswerValidator.normalizeDigits(text));
      } else if (_structuredProfileFields.contains(key)) {
        res[key] = _serializeStructuredValue(key, text);
      } else {
        res[key] = text;
      }
    }
    return res;
  }

  String _localizedSaveError(Object error) {
    if (error is FormatException) {
      return context.tr(error.message);
    }
    return context.errorText(error);
  }

  dynamic _serializeStructuredValue(String key, String text) {
    final lines = text
        .split(RegExp(r'\r?\n'))
        .map((line) => line.trim())
        .where((line) => line.isNotEmpty)
        .toList();
    final original = _initialRawValues[key];
    if (original is List && original.every((item) => item is Map)) {
      final valueKey = _structuredValueKey(key);
      return List<dynamic>.generate(lines.length, (index) {
        final previous = index < original.length
            ? Map<String, dynamic>.from(original[index] as Map)
            : <String, dynamic>{};
        previous[valueKey] = lines[index];
        return previous;
      });
    }
    return lines;
  }

  String _structuredValueKey(String key) => switch (key) {
    'club_history' => 'club_name',
    'languages' => 'language',
    'achievements' => 'title',
    'injuries' => 'injury_type',
    _ => 'name',
  };


  Future<void> _pickProfilePhoto() async {
    final updated = await MediaUploadManager.pickAndUploadMedia(
      context: context,
      dataService: widget.dataService,
      profile: widget.profile,
      isVideo: false,
      isProfilePhoto: true,
    );
    if (updated != null && mounted) {
      widget.onSaved(updated);
      widget.onRefresh();
    }
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
            'club' => '${context.tr('organizationType.club')} ⚽',
            'trainer' => '${context.tr('organizationType.trainer')} 👟',
            'agent' => '${context.tr('organizationType.agent')} 💼',
            _ => '${context.tr('organizationType.academy')} 🏆',
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
              border: Border.all(
                color: AppColors.green.withValues(alpha: 0.4),
                width: 1.5,
              ),
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
                      child: Icon(
                        Icons.verified_rounded,
                        color: Colors.white,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            context.tr('currentAffiliatedOrg'),
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppColors.muted,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            name,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: AppColors.navy,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.green,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${context.tr('officialMember')} $typeLabel 🟢',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
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
                      '${context.tr('usedInviteCode')}: $code',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: AppColors.navy,
                      ),
                    ),
                    Text(
                      '${context.tr('orgAffiliationStatus')} 🟢',
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.green,
                        fontWeight: FontWeight.bold,
                      ),
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
                    child: Icon(
                      Icons.group_add_rounded,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    context.tr('joinOrgTitle'),
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                context.tr('joinOrgDesc'),
                style: const TextStyle(color: AppColors.muted, height: 1.5),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: controller,
                decoration: InputDecoration(
                  hintText: context.tr('orgCodeHint'),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: Colors.grey[200]!),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide(color: Colors.grey[200]!),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 16,
                  ),
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
                          final messenger = ScaffoldMessenger.of(context);
                          final successMessage = context.tr(
                            'joinRequestSubmitted',
                          );
                          setState(() => loading = true);
                          try {
                            await widget.dataService.joinOrganizationByCode(
                              controller.text,
                            );
                            widget.onJoined();
                            messenger.showSnackBar(
                              SnackBar(content: Text(successMessage)),
                            );
                          } catch (e) {
                            if (!mounted) return;
                            final errText = this.context.errorText(e);
                            messenger.showSnackBar(
                              SnackBar(content: Text(errText)),
                            );
                          } finally {
                            if (mounted) setState(() => loading = false);
                          }
                        },
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.navy,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: loading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : Text(
                          context.tr('verifyAndJoin'),
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
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
  final List<String> images, documents;
  final List<VideoMediaItem> videos;
  final Future<void> Function(String url, String category) onDelete;

  @override
  State<_MediaSection> createState() => _MediaSectionState();
}

class _MediaSectionState extends State<_MediaSection> {
  bool uploading = false;

  Future<void> _pickAndUploadImage() async {
    final updated = await MediaUploadManager.pickAndUploadMedia(
      context: context,
      dataService: widget.dataService,
      profile: widget.profile,
      isVideo: false,
      onLoadingChanged: (loading) {
        if (mounted) setState(() => uploading = loading);
      },
    );
    if (updated != null && mounted) {
      widget.onUploaded(updated);
    }
  }

  Future<void> _pickAndUploadVideo() async {
    final updated = await MediaUploadManager.pickAndUploadMedia(
      context: context,
      dataService: widget.dataService,
      profile: widget.profile,
      isVideo: true,
      onLoadingChanged: (loading) {
        if (mounted) setState(() => uploading = loading);
      },
    );
    if (updated != null && mounted) {
      widget.onUploaded(updated);
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
              const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            else
              Row(
                children: [
                  IconButton.filledTonal(
                    onPressed: _pickAndUploadImage,
                    icon: const Icon(Icons.add_a_photo_rounded, size: 20),
                    tooltip: context.tr('addPhoto'),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filledTonal(
                    onPressed: _pickAndUploadVideo,
                    icon: const Icon(Icons.video_call_rounded, size: 20),
                    tooltip: context.tr('addVideo'),
                  ),
                ],
              ),
          ],
        ),
        const SizedBox(height: 16),
        if (widget.images.isNotEmpty) ...[
          Text(
            context.tr('imagesCountLabel', {
              'count': widget.images.length.toString(),
            }),
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
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
            itemBuilder: (context, i) =>
                _buildMediaGridItem(context, widget.images[i], 'images'),
          ),
          const SizedBox(height: 20),
        ],
        if (widget.documents.isNotEmpty) ...[
          Text(
            context.tr('docsCountLabel', {
              'count': widget.documents.length.toString(),
            }),
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          ...widget.documents.asMap().entries.map(
            (e) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: const Icon(
                  Icons.description_rounded,
                  color: Colors.blue,
                ),
                title: Text(
                  context.tr('officialDocAttached', {
                    'index': (e.key + 1).toString(),
                  }),
                ),
                trailing: IconButton(
                  icon: const Icon(
                    Icons.delete_outline_rounded,
                    color: Colors.red,
                  ),
                  onPressed: () => widget.onDelete(e.value, 'documents'),
                ),
                onTap: () => _openMediaUrl(e.value),
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
        if (widget.videos.isNotEmpty) ...[
          Text(
            context.tr('videosCountLabel', {
              'count': widget.videos.length.toString(),
            }),
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          ...widget.videos.asMap().entries.map(
            (e) {
              final video = e.value;
              final displayTitle = video.title.isNotEmpty
                  ? video.title
                  : context.tr('skillVideoAttached', {
                      'index': (e.key + 1).toString(),
                    });
              final isExternal = video.url.contains('youtu') ||
                  video.url.contains('tiktok') ||
                  video.url.contains('facebook');

              return Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: Colors.grey.shade200),
                ),
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  leading: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: isExternal
                          ? const Color(0xFFF3E8FF)
                          : const Color(0xFFFEF2F2),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isExternal
                          ? Icons.link_rounded
                          : Icons.play_arrow_rounded,
                      color: isExternal
                          ? const Color(0xFF9333EA)
                          : const Color(0xFFDC2626),
                      size: 24,
                    ),
                  ),
                  title: Text(
                    displayTitle,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.verified_rounded,
                          size: 13,
                          color: AppColors.green,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          isExternal ? 'رابط خارجي معتمد' : 'فيديو مهارات معتمد',
                          style: const TextStyle(
                            fontSize: 11.5,
                            color: AppColors.muted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  trailing: IconButton(
                    icon: const Icon(
                      Icons.delete_outline_rounded,
                      color: Colors.red,
                    ),
                    onPressed: () => widget.onDelete(video.url, 'videos'),
                  ),
                  onTap: () => _openMediaUrl(video.url),
                ),
              );
            },
          ),
        ],
        if (widget.images.isEmpty &&
            widget.documents.isEmpty &&
            widget.videos.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Center(
              child: Text(
                context.tr('noMediaAttached'),
                style: const TextStyle(color: AppColors.muted),
              ),
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('${context.tr("linkOpenFailed")}: $url')));
    }
  }

  Widget _buildMediaGridItem(
    BuildContext context,
    String url,
    String category,
  ) {
    return Stack(
      children: [
        Positioned.fill(
          child: GestureDetector(
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => _FullScreenImageViewer(url: url),
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: CachedNetworkImage(
                imageUrl: url,
                fit: BoxFit.cover,
                placeholder: (_, _) => Container(color: Colors.grey[100]),
                errorWidget: (_, _, _) => Container(
                  color: Colors.grey[200],
                  child: const Icon(
                    Icons.broken_image_rounded,
                    color: Colors.grey,
                    size: 28,
                  ),
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
              decoration: const BoxDecoration(
                color: Colors.black54,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.close_rounded,
                color: Colors.white,
                size: 16,
              ),
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
  'height',
  'weight',
  'jersey_number',
  'shoe_size',
  'caps',
  'goals',
  'assists',
  'stats_pace',
  'stats_shooting',
  'stats_passing',
  'stats_dribbling',
  'stats_defending',
  'stats_physical',
  'weak_foot',
  'skill_moves',
  'hours_per_week',
  'market_value',
  'mentality_leadership',
  'mentality_composure',
  'mentality_aggression',
  'mentality_vision',
  'mentality_teamwork',
};

const _booleanFields = {'has_private_coach', 'has_joined_academy'};

class _FullScreenImageViewer extends StatelessWidget {
  const _FullScreenImageViewer({required this.url});
  final String url;
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.black,
    appBar: AppBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      iconTheme: const IconThemeData(color: Colors.white),
    ),
    body: Center(
      child: InteractiveViewer(child: CachedNetworkImage(imageUrl: url)),
    ),
  );
}

String resolvePlayerMediaUrl(String value) {
  var str = value.trim();
  if (str.isEmpty || str == 'null') return '';
  const r2DevBase = 'https://pub-d4c7563dad1f41f3adf319c6a25a5f44.r2.dev';
  const supabaseBase =
      'https://mjuaefipdzxfqazzbyke.supabase.co/storage/v1/object/public';

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

  if (str.contains(
    'ekyerljzfokqimbabzxm.supabase.co/storage/v1/object/public/',
  )) {
    final path = str.substring(
      'https://ekyerljzfokqimbabzxm.supabase.co/storage/v1/object/public/'
          .length,
    );
    return '$r2DevBase/$path';
  }

  if (str.startsWith('http://') ||
      str.startsWith('https://') ||
      str.startsWith('data:')) {
    return str;
  }

  if (str.startsWith('player-media://')) {
    final path = str.substring('player-media://'.length);
    return '$r2DevBase/$path';
  }

  for (final bucket in [
    'profile-images',
    'videos',
    'documents',
    'avatars',
    'ads',
    'gallery',
    'photos',
    'player-images',
  ]) {
    if (str.startsWith('$bucket/')) {
      return '$supabaseBase/$str';
    }
  }

  var cleanPath = str.startsWith('/') ? str.substring(1) : str;
  final result = '$r2DevBase/$cleanPath';
  debugPrint('MEDIA_URL_RESOLVED: "$value" -> "$result"');
  return result;
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
    Map<String, dynamic>? consent;
    final rawConsent = profile.values['parental_consent'];
    if (rawConsent is Map) {
      consent = Map<String, dynamic>.from(rawConsent);
    } else if (rawConsent is String && rawConsent.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(rawConsent);
        if (decoded is Map) consent = Map<String, dynamic>.from(decoded);
      } catch (_) {}
    }
    final isConsentSigned =
        consent?['signed'] == true ||
        profile.values['guardian_approved'] == true ||
        profile.values['guardian_approval'] == true ||
        profile.values['guardian_consent'] == true;

    Map<String, dynamic>? orgMap = organization;
    final rawOrg =
        profile.values['_organization'] ?? profile.values['organization'];
    if (rawOrg is Map) {
      orgMap = Map<String, dynamic>.from(rawOrg);
    } else if (rawOrg is String && rawOrg.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(rawOrg);
        if (decoded is Map) orgMap = Map<String, dynamic>.from(decoded);
      } catch (_) {}
    }
    final isOrgJoined = orgMap != null && orgMap.isNotEmpty;

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
                final guardianName =
                    consent?['guardian_name']?.toString() ?? '';
                final relationship =
                    consent?['guardian_relationship']?.toString() ?? '';
                final signatureUrl =
                    consent?['signature_url']?.toString() ?? '';

                await showDialog<bool>(
                  context: context,
                  builder: (ctx) => ParentalConsentDialog(
                    initialGuardianName: guardianName,
                    initialRelationship: relationship,
                    initialPhone: consent?['guardian_phone']?.toString(),
                    initialSignatureUrl: signatureUrl,
                    onConfirmed:
                        ({
                          required guardianName,
                          required relationship,
                          required guardianPhone,
                          signatureBytes,
                        }) async {
                          String finalSigUrl = signatureUrl;
                          if (signatureBytes != null &&
                              signatureBytes.isNotEmpty) {
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
                            'signed_at':
                                consent?['signed_at'] ??
                                DateTime.now().toIso8601String(),
                          };

                          final updates = {'parental_consent': payload};
                          await dataService.savePlayerProfile(profile, updates);

                          final updatedValues = Map<String, dynamic>.from(
                            profile.values,
                          );
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
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 12,
                ),
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
                        isConsentSigned
                            ? Icons.verified_rounded
                            : Icons.draw_rounded,
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
                            context.tr(
                              isConsentSigned
                                  ? 'guardianTileTitle'
                                  : 'guardianSignatureTitle',
                            ),
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
                            context.tr(
                              isConsentSigned
                                  ? 'guardianVerifiedSubtitle'
                                  : 'guardianSignSubtitle',
                            ),
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
                  _showOrgDetailsModal(context, orgMap!);
                } else {
                  _showJoinOrgModal(context, dataService, onRefresh);
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 12,
                ),
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
                        isOrgJoined
                            ? Icons.apartment_rounded
                            : Icons.group_add_rounded,
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
                                ? '${orgMap['name'] ?? context.tr('yourOrganization')}'
                                : context.tr('joinOrganizationTitle'),
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
                            context.tr(
                              isOrgJoined
                                  ? 'organizationJoinedSubtitle'
                                  : 'enterOrganizationCodeSubtitle',
                            ),
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
  bool busy = false;
  String? error;

  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => StatefulBuilder(
      builder: (context, setModalState) {
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
                  const Icon(
                    Icons.apartment_rounded,
                    color: AppColors.green,
                    size: 24,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    ctx.tr('joinOrgButton'),
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
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
                        hintText: ctx.tr('orgCodeInputHint'),
                        prefixIcon: const Icon(Icons.qr_code_rounded),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Tooltip(
                    message: ctx.tr('pasteReferralCode'),
                    child: IconButton.filledTonal(
                      style: IconButton.styleFrom(
                        backgroundColor: AppColors.green.withValues(
                          alpha: 0.15,
                        ),
                        foregroundColor: AppColors.green,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      icon: const Icon(Icons.content_paste_rounded),
                      onPressed: () async {
                        final data = await Clipboard.getData('text/plain');
                        final dataText = data?.text;
                        if (dataText != null && dataText.isNotEmpty) {
                          final parsed = DataService.parseReferralCodeInput(
                            dataText,
                          );
                          controller.text = parsed;
                          setModalState(() {});
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Tooltip(
                    message: ctx.tr('scanJoinQr'),
                    child: IconButton.filledTonal(
                      style: IconButton.styleFrom(
                        backgroundColor: AppColors.navy.withValues(alpha: 0.15),
                        foregroundColor: AppColors.navy,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      icon: const Icon(Icons.qr_code_scanner_rounded),
                      onPressed: () {
                        _showQrCameraScannerModal(
                          ctx,
                          onScanned: (scannedCode) {
                            final parsed = DataService.parseReferralCodeInput(
                              scannedCode,
                            );
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
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  side: BorderSide(
                    color: AppColors.navy.withValues(alpha: 0.4),
                  ),
                ),
                icon: const Icon(
                  Icons.camera_alt_rounded,
                  color: AppColors.navy,
                  size: 18,
                ),
                label: Text(
                  '📷 ${ctx.tr('scanJoinQr')}',
                  style: const TextStyle(
                    color: AppColors.navy,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                onPressed: () {
                  _showQrCameraScannerModal(
                    ctx,
                    onScanned: (scannedCode) {
                      final parsed = DataService.parseReferralCodeInput(
                        scannedCode,
                      );
                      controller.text = parsed;
                      setModalState(() {});
                    },
                  );
                },
              ),
              if (error != null && error!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  error!,
                  style: const TextStyle(color: Colors.red, fontSize: 12),
                ),
              ],
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.green,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: busy
                      ? null
                      : () async {
                          setModalState(() {
                            busy = true;
                            error = null;
                          });
                          try {
                            final messenger = ScaffoldMessenger.of(ctx);
                            await dataService.joinOrganizationByCode(
                              controller.text,
                            );
                            if (ctx.mounted) {
                              Navigator.of(ctx).pop();
                              messenger.showSnackBar(
                                SnackBar(
                                  content: Text(ctx.tr('joinRequestSubmitted')),
                                ),
                              );
                            }
                            await onJoined();
                          } catch (e) {
                            setModalState(() {
                              busy = false;
                              error = ctx.errorText(e);
                            });
                          }
                        },
                  child: busy
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : Text(
                          ctx.tr('submitButton'),
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
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
  final name = org['name']?.toString() ?? context.tr('dreamAcademyInternational');
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
                child: const Icon(
                  Icons.verified_rounded,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${ctx.tr("orgMemberJoined")} • ${org["type"] ?? ctx.tr("orgCertifiedAcademy")}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.muted,
                      ),
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
                  Text(
                    ctx.tr("orgInviteCode").replaceAll("{code}", code),
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Builder(
                    builder: (ctx) {
                      final raw =
                          org['joinedAt'] ??
                          org['organizationJoinedAt'] ??
                          org['createdAt'] ??
                          org['created_at'];
                      final dt = raw != null
                          ? DateTime.tryParse('$raw')?.toLocal()
                          : null;
                      final localeStr = Localizations.localeOf(ctx).toString();
                      final dateStr = dt != null
                          ? DateFormat.yMMMMd(localeStr).format(dt)
                          : DateFormat.yMMMMd(localeStr).format(DateTime(2026, 8, 8));
                      return Text(
                        ctx.tr('orgJoinedAt').replaceAll('{date}', dateStr),
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.muted,
                        ),
                      );
                    },
                  ),
                ],
              ),
              IconButton.filledTonal(
                tooltip: ctx.tr('orgViewQr'),
                icon: const Icon(
                  Icons.qr_code_2_rounded,
                  color: AppColors.navy,
                ),
                onPressed: () =>
                    _showQrModal(context, name: name, code: code, url: joinUrl),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.share_rounded, size: 18),
                  label: Text(ctx.tr('orgShareWebLink')),
                  onPressed: () async {
                    final shareText =
                        '🏆 ${ctx.tr('orgInviteShareText')}\n${ctx.tr('orgNameLabel')}: $name\n${ctx.tr('orgInviteCodeLabel')}: $code\n${ctx.tr('orgDirectJoinLink')}: $joinUrl';
                    final whatsappUri = Uri.parse(
                      'whatsapp://send?text=${Uri.encodeComponent(shareText)}',
                    );
                    if (await canLaunchUrl(whatsappUri)) {
                      await launchUrl(whatsappUri);
                    } else {
                      await Clipboard.setData(ClipboardData(text: shareText));
                      if (ctx.mounted) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          SnackBar(
                            content: Text(ctx.tr('orgCopyInviteSuccess')),
                          ),
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
                  child: Text(ctx.tr('closeWindow')),
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
          const Icon(
            Icons.qr_code_scanner_rounded,
            color: AppColors.green,
            size: 40,
          ),
          const SizedBox(height: 8),
          Text(
            ctx.tr('orgQrTitleFor').replaceAll('{name}', name),
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
                const Icon(
                  Icons.qr_code_2_rounded,
                  size: 160,
                  color: AppColors.navy,
                ),
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
          child: Text(ctx.tr('closeDialog')),
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
              const Icon(
                Icons.qr_code_scanner_rounded,
                color: AppColors.green,
                size: 28,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  ctx.tr('qrScanTitle'),
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
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
                    const Icon(
                      Icons.center_focus_weak_rounded,
                      size: 90,
                      color: AppColors.green,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      ctx.tr('qrScanHint'),
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.9),
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                Positioned(
                  bottom: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.green,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      ctx.tr('qrScannerActive'),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            ctx.tr('qrScanOrChoose'),
            style: const TextStyle(fontSize: 12, color: AppColors.muted),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            children: [
              ActionChip(
                avatar: const Icon(
                  Icons.sports_soccer_rounded,
                  size: 16,
                  color: AppColors.green,
                ),
                label: Text(
                  ctx.tr('qrSampleClub'),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                ),
                onPressed: () {
                  Navigator.of(ctx).pop();
                  onScanned('CLBWUL3NI');
                },
              ),
              ActionChip(
                avatar: const Icon(
                  Icons.school_rounded,
                  size: 16,
                  color: AppColors.gold,
                ),
                label: Text(
                  ctx.tr('qrSampleAcademy'),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                ),
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
              child: Text(ctx.tr('qrCloseScanner')),
            ),
          ),
        ],
      ),
    ),
  );
}

class _SmartScoutBanner extends StatelessWidget {
  const _SmartScoutBanner({
    required this.profile,
    required this.dataService,
    required this.onSaved,
  });

  final UserProfile profile;
  final DataService dataService;
  final ValueChanged<UserProfile> onSaved;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {
        SmartProfileChatModal.show(
          context,
          profile: profile,
          dataService: dataService,
          onProfileUpdated: onSaved,
        );
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topRight,
            end: Alignment.bottomLeft,
            colors: [Color(0xFF0F172A), Color(0xFF064E3B)],
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: const Color(0xFF10B981).withValues(alpha: .6),
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF10B981).withValues(alpha: .25),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: .2),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.smart_toy_rounded,
                color: Color(0xFF6EE7B7),
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.tr('profileChatScoutTitle'),
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    context.tr('profileChatScoutSubtitle'),
                    style: const TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                context.tr('profileChatScoutStart'),
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
