import 'dart:convert';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/player.dart';
import '../../services/data_service.dart';
import '../messages/chat_detail_screen.dart';

import '../../widgets/player_share_modal.dart';
import '../../widgets/player_skills_radar_chart.dart';
import '../profile/player_profile_data.dart';

class PlayerDetailsScreen extends StatefulWidget {
  const PlayerDetailsScreen({
    super.key,
    required this.initialPlayer,
    required this.dataService,
    this.initiallyFavorite = false,
    this.onFavoriteChanged,
  });

  final Player initialPlayer;
  final DataService dataService;
  final bool initiallyFavorite;
  final ValueChanged<bool>? onFavoriteChanged;

  @override
  State<PlayerDetailsScreen> createState() => _PlayerDetailsScreenState();
}

class _PlayerDetailsScreenState extends State<PlayerDetailsScreen> {
  late Future<Player> future;
  late bool favorite;
  bool favoriteBusy = false;
  Player? _fetchedPlayer;

  @override
  void initState() {
    super.initState();
    future = widget.dataService.fetchPlayerById(widget.initialPlayer.id);
    favorite = widget.initiallyFavorite;
    _checkFavorite();
  }

  Future<void> _checkFavorite() async {
    try {
      final ids = await widget.dataService.fetchFavoritePlayerIds();
      if (mounted) {
        setState(() => favorite = ids.contains(widget.initialPlayer.id));
      }
    } catch (_) {}
  }

  Future<void> toggleFavorite() async {
    if (favoriteBusy) return;
    final next = !favorite;
    setState(() {
      favorite = next;
      favoriteBusy = true;
    });
    try {
      await widget.dataService.setPlayerFavorite(widget.initialPlayer.id, next);
      widget.onFavoriteChanged?.call(next);
    } catch (_) {
      if (!mounted) return;
      setState(() => favorite = !next);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('favoriteUpdateFailed'))),
      );
    } finally {
      if (mounted) setState(() => favoriteBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Player>(
      future: future,
      initialData: widget.initialPlayer,
      builder: (context, snapshot) {
        final player = snapshot.data ?? widget.initialPlayer;
        _fetchedPlayer = player;
        return Scaffold(
          body: RefreshIndicator(
            onRefresh: () async {
              setState(
                () => future = widget.dataService.fetchPlayerById(player.id),
              );
              await future;
            },
            child: CustomScrollView(
              physics: const BouncingScrollPhysics(
                parent: AlwaysScrollableScrollPhysics(),
              ),
              slivers: [
                // ── Collapsible Hero SliverAppBar ──
                SliverAppBar(
                  expandedHeight: 280,
                  collapsedHeight: kToolbarHeight,
                  pinned: true,
                  stretch: true,
                  backgroundColor: AppColors.navy,
                  foregroundColor: Colors.white,
                  actions: [
                    IconButton(
                      tooltip: context.tr('shareWhatsApp'),
                      onPressed: () {
                        showPlayerShareModal(
                          context,
                          player: _fetchedPlayer ?? widget.initialPlayer,
                        );
                      },
                      icon: const Icon(Icons.share_rounded),
                    ),
                    IconButton(
                      tooltip: context.tr(favorite ? 'removeFavorite' : 'addFavorite'),
                      onPressed: favoriteBusy ? null : toggleFavorite,
                      icon: favoriteBusy
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : Icon(
                              favorite
                                  ? Icons.favorite_rounded
                                  : Icons.favorite_border_rounded,
                              color: favorite ? const Color(0xFFFF6B6B) : Colors.white,
                            ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  flexibleSpace: FlexibleSpaceBar(
                    collapseMode: CollapseMode.parallax,
                    titlePadding: const EdgeInsetsDirectional.only(
                      start: 48,
                      bottom: 16,
                    ),
                    title: Text(
                      player.localizedName(context.languageCode).isEmpty
                          ? context.tr('playerDetails')
                          : player.localizedName(context.languageCode),
                      style: GoogleFonts.cairo(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                        shadows: [
                          const Shadow(
                            color: Colors.black38,
                            blurRadius: 4,
                          ),
                        ],
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    background: _PlayerHeroBackground(player: player),
                  ),
                ),
                // ── Error banner ──
                if (snapshot.hasError)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Card(
                        color: Colors.orange.shade50,
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Text(context.errorText(snapshot.error)),
                        ),
                      ),
                    ),
                  ),
                // ── Body content ──
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                  sliver: SliverToBoxAdapter(
                    child: _PlayerProfile(
                      player: player,
                      dataService: widget.dataService,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Full-bleed hero background used inside the SliverAppBar's FlexibleSpaceBar.
class _PlayerHeroBackground extends StatelessWidget {
  const _PlayerHeroBackground({required this.player});

  final Player player;

  @override
  Widget build(BuildContext context) {
    final organization = player.rawPayload['_organization'];
    final orgMap = organization is Map
        ? Map<String, dynamic>.from(organization)
        : const <String, dynamic>{};
    final orgLogoUrl = _orgLogoUrl(orgMap);
    final hasOrg = orgMap.isNotEmpty &&
        '${orgMap['name'] ?? ''}'.trim().isNotEmpty;

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [AppColors.navy, Color(0xFF064E3B)],
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // ── Avatar with optional org badge ──
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 110,
                    height: 110,
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.3),
                          blurRadius: 16,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: ClipOval(child: _PlayerAvatar(player: player)),
                  ),
                  // ── Org logo badge (bottom-right of avatar) ──
                  if (hasOrg)
                    Positioned(
                      bottom: -4,
                      right: -4,
                      child: _OrgBadge(
                        logoUrl: orgLogoUrl,
                        orgName: '${orgMap['name'] ?? ''}',
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                player.localizedName(context.languageCode).isEmpty
                    ? context.tr('dreamPlayer')
                    : player.localizedName(context.languageCode),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 22,
                  shadows: [
                    Shadow(color: Colors.black38, blurRadius: 6),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                alignment: WrapAlignment.center,
                spacing: 8,
                runSpacing: 6,
                children: [
                  if (player.position.isNotEmpty)
                    _HeroChip(
                      icon: Icons.sports_soccer,
                      label: _localizedStoredText(context, player.position),
                    ),
                  if (player.country.isNotEmpty)
                    _HeroChip(
                      icon: Icons.public,
                      label: _localizedStoredText(context, player.country),
                    ),
                  if (player.age != null)
                    _HeroChip(
                      icon: Icons.cake_outlined,
                      label: context.tr('playerAgeValue', {'age': player.age}),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  static String _orgLogoUrl(Map<String, dynamic> org) {
    for (final key in ['logo_url', 'logoUrl', 'logo', 'image_url', 'imageUrl']) {
      final val = '${org[key] ?? ''}'.trim();
      if (val.startsWith('http')) return val;
    }
    return '';
  }
}

/// Smart avatar widget that handles http/data-uri/empty cases.
class _PlayerAvatar extends StatelessWidget {
  const _PlayerAvatar({required this.player});

  final Player player;

  @override
  Widget build(BuildContext context) {
    final url = player.imageUrl;
    if (url.isEmpty) return const _PlayerImageFallback();
    if (url.startsWith('data:image')) {
      try {
        return Image.memory(
          base64Decode(url.split(',').last),
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => const _PlayerImageFallback(),
        );
      } catch (_) {
        return const _PlayerImageFallback();
      }
    }
    if (kIsWeb) {
      return Image.network(
        url,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => const _PlayerImageFallback(),
      );
    }
    return CachedNetworkImage(
      imageUrl: url,
      fit: BoxFit.cover,
      placeholder: (_, _) => const _PlayerImageFallback(),
      errorWidget: (_, _, _) => const _PlayerImageFallback(),
    );
  }
}

/// Circular badge showing the organization logo (or fallback icon).
class _OrgBadge extends StatelessWidget {
  const _OrgBadge({required this.logoUrl, required this.orgName});

  final String logoUrl;
  final String orgName;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white,
        border: Border.all(color: AppColors.green, width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 6,
          ),
        ],
      ),
      child: ClipOval(
        child: logoUrl.isNotEmpty
            ? (kIsWeb
                ? Image.network(
                    logoUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => _orgFallbackIcon(),
                  )
                : CachedNetworkImage(
                    imageUrl: logoUrl,
                    fit: BoxFit.cover,
                    placeholder: (_, _) => _orgFallbackIcon(),
                    errorWidget: (_, _, _) => _orgFallbackIcon(),
                  ))
            : _orgFallbackIcon(),
      ),
    );
  }

  Widget _orgFallbackIcon() => Container(
        color: AppColors.green.withValues(alpha: 0.15),
        child: const Icon(
          Icons.shield_rounded,
          size: 20,
          color: AppColors.green,
        ),
      );
}

class _PlayerProfile extends StatelessWidget {
  const _PlayerProfile({required this.player, required this.dataService});

  final Player player;
  final DataService dataService;

  void _showMessageComposer(
    BuildContext context, {
    required Player player,
    required DataService dataService,
  }) async {
    final scaffold = ScaffoldMessenger.of(context);
    try {
      final conv = await dataService.startOrCreateConversation(
        targetId: player.id,
        targetName: player.name,
        targetType: 'player',
        targetAvatar: player.imageUrl,
      );
      if (!context.mounted) return;
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ChatDetailScreen(
            conversation: conv,
            targetId: player.id,
            targetName: player.name,
            targetType: 'player',
            dataService: dataService,
          ),
        ),
      );
    } catch (e) {
      scaffold.showSnackBar(SnackBar(content: Text(context.errorText(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final payload = player.rawPayload;
    final official = _asMap(payload['official_contact']);
    final phone = _firstText([
      official['phone'],
      payload['whatsapp'],
      payload['phone'],
      payload['originalPhone'],
    ]);
    final email = _firstPublicEmail([official['email'], payload['email']]);
    final contactName = _firstText([
      official['name'],
      payload['guardian_name'],
      player.name,
    ]);
    final images = _imageUrls(payload, player.imageUrl);
    final experience = _text(payload, ['experience_years', 'years_experience']);
    final quickStats = <_StatItem>[
      if (player.height != null)
        _StatItem(
          'height',
          Icons.height_rounded,
          '${player.height}',
          context.tr('heightCm'),
          const LinearGradient(colors: [Color(0xFFE0F2FE), Color(0xFFBAE6FD)]),
          const Color(0xFF0284C7),
          context.tr('statHeightDesc', {'val': '${player.height}'}),
        ),
      if (player.age != null)
        _StatItem(
          'age',
          Icons.cake_outlined,
          '${player.age}',
          context.tr('age'),
          const LinearGradient(colors: [Color(0xFFFEF3C7), Color(0xFFFDE68A)]),
          const Color(0xFFD97706),
          context.tr('statAgeDesc', {'val': '${player.age}'}),
        ),
      if (experience.isNotEmpty)
        _StatItem(
          'experience',
          Icons.insights_rounded,
          experience,
          context.tr('experienceYears'),
          const LinearGradient(colors: [Color(0xFFDCFCE7), Color(0xFFBBF7D0)]),
          const Color(0xFF16A34A),
          context.tr('statExperienceDesc', {'val': experience}),
        ),
      if (player.weight != null)
        _StatItem(
          'weight',
          Icons.monitor_weight_outlined,
          '${player.weight}',
          context.tr('weightKg'),
          const LinearGradient(colors: [Color(0xFFEDE9FE), Color(0xFFDDD6FE)]),
          const Color(0xFF7C3AED),
          context.tr('statWeightDesc', {'val': '${player.weight}'}),
        ),
    ];
    final personal = _fields(context, payload, const [
      ('nationality|country', 'playerNationality'),
      ('city', 'playerCity'),
      ('birth_date|birthDate', 'playerBirthDate'),
      ('gender', 'playerGender'),
    ]);
    final career = _fields(context, payload, const [
      ('primary_position|position', 'playerPrimaryPosition'),
      ('secondary_position', 'playerSecondaryPosition'),
      ('preferred_foot|foot', 'playerPreferredFoot'),
      ('current_club', 'playerCurrentClub'),
      ('player_number|jersey_number|favorite_jersey_number', 'playerNumber'),
      ('currently_contracted|contract_status', 'playerContractStatus'),
      ('contract_end_date', 'playerContractEnd'),
      ('available_for_transfer', 'playerTransferAvailability'),
      ('has_passport', 'playerPassport'),
      ('willing_to_relocate', 'playerRelocation'),
    ]);
    final education = _fields(context, payload, const [
      ('education_level', 'education'),
      ('school_name', 'playerSchool'),
      ('graduation_year', 'playerGraduationYear'),
      ('arabic_level', 'playerArabicLevel'),
      ('english_level', 'playerEnglishLevel'),
      ('spanish_level', 'playerSpanishLevel'),
    ]);
    final technical = _ratingEntries(payload['technical_skills']).isNotEmpty
        ? _ratingEntries(payload['technical_skills'])
        : _ratingEntries(payload['skills_technical']);
    final physical = _ratingEntries(payload['physical_skills']).isNotEmpty
        ? _ratingEntries(payload['physical_skills'])
        : _ratingEntries(payload['skills_physical']);
    final social = _ratingEntries(payload['social_skills']).isNotEmpty
        ? _ratingEntries(payload['social_skills'])
        : _ratingEntries(payload['mental_skills']);
    final objectives = _enabledEntries(payload['objectives']);
    final achievements = _listValues(payload['achievements']).isNotEmpty
        ? _listValues(payload['achievements'])
        : _listValues(payload['honors']);
    final clubs = _listValues(payload['club_history']).isNotEmpty
        ? _listValues(payload['club_history'])
        : _listValues(payload['previous_clubs']).isNotEmpty
            ? _listValues(payload['previous_clubs'])
            : _listValues(payload['experiences']);
    final courses = _listValues(payload['training_courses']).isNotEmpty
        ? _listValues(payload['training_courses'])
        : _listValues(payload['courses']).isNotEmpty
            ? _listValues(payload['courses'])
            : _listValues(payload['camps']);
    final injuries = _listValues(payload['injuries']).isNotEmpty
        ? _listValues(payload['injuries'])
        : _listValues(payload['injury_history']);
    final brief = _text(payload, ['brief', 'sports_notes', 'bio', 'about']);
    final organization = _asMap(payload['_organization']);
    final isEvaluated = '${payload['evaluation_status'] ?? ''}' == 'rated';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
          _ContactCard(
            contactName: contactName,
            hasRegisteredContact: phone.isNotEmpty || email.isNotEmpty,
            onMessage: () => _showMessageComposer(
              context,
              player: player,
              dataService: dataService,
            ),
          ),
          if (quickStats.isNotEmpty) ...[
            const SizedBox(height: 14),
            _QuickStats(items: quickStats),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _EvaluationCard(
                  isEvaluated: isEvaluated,
                  payload: payload,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _PlayerAffiliationCard(
                  organization: organization,
                  payload: payload,
                ),
              ),
            ],
          ),
          // ── Skills Radar & FUT Card ──
          const SizedBox(height: 22),
          _PlayerSkillsRadarSection(
            player: player,
            technical: technical,
            physical: physical,
            social: social,
          ),
          if (brief.isNotEmpty) ...[
            const SizedBox(height: 22),
            _ProfileSection(
              icon: Icons.auto_awesome_outlined,
              title: context.tr('playerAbout'),
              child: Text(brief, style: const TextStyle(height: 1.7)),
            ),
          ],
          if (personal.isNotEmpty) ...[
            const SizedBox(height: 22),
            _ProfileSection(
              icon: Icons.badge_outlined,
              title: context.tr('playerPersonalDetails'),
              child: _InfoGrid(fields: personal),
            ),
          ],
          if (career.isNotEmpty) ...[
            const SizedBox(height: 22),
            _ProfileSection(
              icon: Icons.sports_soccer_rounded,
              title: context.tr('playerCareer'),
              child: _InfoGrid(fields: career),
            ),
          ],
          if (education.isNotEmpty) ...[
            const SizedBox(height: 22),
            _ProfileSection(
              icon: Icons.school_outlined,
              title: context.tr('playerEducationLanguages'),
              child: _InfoGrid(fields: education),
            ),
          ],
          if (objectives.isNotEmpty) ...[
            const SizedBox(height: 22),
            _ProfileSection(
              icon: Icons.flag_outlined,
              title: context.tr('playerObjectives'),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: objectives
                    .map(
                      (value) => Chip(
                        label: Text(_localizedStoredText(context, value)),
                      ),
                    )
                    .toList(),
              ),
            ),
          ],
          if (achievements.isNotEmpty ||
              clubs.isNotEmpty ||
              courses.isNotEmpty ||
              injuries.isNotEmpty) ...[
            const SizedBox(height: 22),
            _ProfileSection(
              icon: Icons.emoji_events_outlined,
              title: context.tr('playerJourney'),
              child: Column(
                children: [
                  if (clubs.isNotEmpty)
                    _BulletGroup(
                      title: context.tr('playerClubHistory'),
                      values: clubs,
                    ),
                  if (achievements.isNotEmpty)
                    _BulletGroup(
                      title: context.tr('playerAchievements'),
                      values: achievements,
                    ),
                  if (courses.isNotEmpty)
                    _BulletGroup(
                      title: context.tr('playerCourses'),
                      values: courses,
                    ),
                  if (injuries.isNotEmpty)
                    _BulletGroup(
                      title: context.tr('playerInjuries') != 'playerInjuries'
                          ? context.tr('playerInjuries')
                          : 'السجل الطبي والإصابات',
                      values: injuries,
                    ),
                ],
              ),
            ),
          ],
          if (images.isNotEmpty) ...[
            const SizedBox(height: 22),
            _ProfileSection(
              icon: Icons.photo_library_outlined,
              title: context.tr('playerImages'),
              child: SizedBox(
                height: 170,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: images.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 10),
                  itemBuilder: (context, index) => ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: kIsWeb
                        ? Image.network(
                            images[index],
                            width: 145,
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => const SizedBox(
                              width: 145,
                              child: _PlayerImageFallback(),
                            ),
                          )
                        : CachedNetworkImage(
                            imageUrl: images[index],
                            width: 145,
                            fit: BoxFit.cover,
                            errorWidget: (_, _, _) => const SizedBox(
                              width: 145,
                              child: _PlayerImageFallback(),
                            ),
                          ),
                  ),
                ),
              ),
            ),
          ],
          if (player.videos.isNotEmpty) ...[
            const SizedBox(height: 22),
            _ProfileSection(
              icon: Icons.smart_display_outlined,
              title: context.tr('playerVideos'),
              child: Column(
                children: player.videos
                    .map(
                      (video) => Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          leading: const CircleAvatar(
                            backgroundColor: AppColors.green,
                            foregroundColor: Colors.white,
                            child: Icon(Icons.play_arrow_rounded),
                          ),
                          title: Text(
                            video.title.isEmpty
                                ? context.tr('newSkill')
                                : video.title,
                          ),
                          subtitle: Text(
                            video.url,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          trailing: const Icon(Icons.play_circle_fill_rounded, color: AppColors.green),
                          onTap: () => _playVideo(context, video.url),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
          ],
        ],
      );
  }

  static List<_InfoField> _fields(
    BuildContext context,
    Map<String, dynamic> payload,
    List<(String, String)> definitions,
  ) => definitions
      .map((definition) {
        final value = _text(payload, definition.$1.split('|'));
        return _InfoField(
          context.tr(definition.$2),
          _displayValue(context, value),
        );
      })
      .where((field) => field.value.isNotEmpty)
      .toList();

  static String _displayValue(BuildContext context, String value) {
    switch (value.trim().toLowerCase()) {
      case 'yes':
      case 'true':
        return context.tr('yes');
      case 'no':
      case 'false':
        return context.tr('no');
      default:
        return _localizedStoredText(context, value);
    }
  }

  static String _text(Map<String, dynamic> payload, List<String> keys) =>
      _firstText(keys.map((key) => payload[key]));

  static String _firstText(Iterable<Object?> values) {
    for (final value in values) {
      if (value == null) continue;
      final text = '$value'.trim();
      if (text.isNotEmpty && text != 'null' && text != '[]' && text != '{}') {
        return text;
      }
    }
    return '';
  }

  static String _firstPublicEmail(Iterable<Object?> values) {
    for (final value in values) {
      final email = '${value ?? ''}'.trim();
      if (email.isEmpty || email.startsWith('p20_') || email.startsWith('p_')) {
        continue;
      }
      if (email.contains('@')) return email;
    }
    return '';
  }

  static Map<String, dynamic> _asMap(Object? value) => value is Map
      ? Map<String, dynamic>.from(value)
      : const <String, dynamic>{};

  static List<MapEntry<String, double>> _ratingEntries(Object? value) {
    if (value == null) return const [];
    Map map = const {};
    if (value is Map) {
      map = value;
    } else if (value is String && value.trim().startsWith('{')) {
      try {
        final decoded = jsonDecode(value);
        if (decoded is Map) map = decoded;
      } catch (_) {}
    }
    if (map.isEmpty) return const [];
    return map.entries
        .map((entry) {
          final number = entry.value is num
              ? (entry.value as num).toDouble()
              : double.tryParse('${entry.value}') ?? 0;
          return MapEntry('${entry.key}', number.clamp(0.0, 5.0).toDouble());
        })
        .where((entry) => entry.key.trim().isNotEmpty && entry.value > 0)
        .toList();
  }

  static List<String> _enabledEntries(Object? value) {
    if (value is! Map) return const [];
    return value.entries
        .where((entry) => entry.value == true)
        .map((entry) => '${entry.key}'.trim())
        .where((entry) => entry.isNotEmpty)
        .toList();
  }

  static List<String> _listValues(Object? value) {
    if (value == null) return const [];
    List list = const [];
    if (value is List) {
      list = value;
    } else if (value is String) {
      final trimmed = value.trim();
      if (trimmed.startsWith('[')) {
        try {
          final decoded = jsonDecode(trimmed);
          if (decoded is List) list = decoded;
        } catch (_) {}
      }
      if (list.isEmpty && trimmed.isNotEmpty && trimmed != 'null') {
        return trimmed
            .split(RegExp(r'[\r\n,،;]+'))
            .map((s) => s.trim())
            .where((s) => s.isNotEmpty && s != 'null')
            .toList();
      }
    }
    if (list.isEmpty) return const [];
    return list
        .map((item) {
          if (item is Map) {
            return _firstText([
              item['title'],
              item['name'],
              item['club_name'],
              item['club'],
              item['team'],
              item['achievement'],
              item['course'],
              item['role'],
              item['description'],
              item['notes'],
              item['year'],
            ]);
          }
          return '$item'.trim();
        })
        .where((item) => item.isNotEmpty && item != 'null')
        .toList();
  }

  static List<String> _imageUrls(Map<String, dynamic> payload, String primary) {
    final result = <String>{};
    void collect(Object? value) {
      if (value is String) {
        final str = value.trim();
        if ((str.startsWith('http://') || str.startsWith('https://')) &&
            !_isRetiredStorageUrl(str)) {
          result.add(str);
        }
      } else if (value is List) {
        for (final item in value) {
          collect(item);
        }
      } else if (value is Map) {
        collect(value['url'] ?? value['downloadURL'] ?? value['src']);
      }
    }

    collect(primary);
    for (final key in [
      'image',
      'profile_image',
      'profile_image_url',
      'images',
      'additional_images',
      'additional_image_urls',
      'gallery',
      'photos',
    ]) {
      collect(payload[key]);
    }
    return result.toList();
  }

  static bool _isRetiredStorageUrl(String value) =>
      value.contains('ekyerljzfokqimbabzxm.supabase.co');
}

class _ContactCard extends StatelessWidget {
  const _ContactCard({
    required this.contactName,
    required this.hasRegisteredContact,
    required this.onMessage,
  });

  final String contactName;
  final bool hasRegisteredContact;
  final VoidCallback onMessage;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      gradient: const LinearGradient(
        colors: [Color(0xFFF0FDF4), Color(0xFFF8FAFC)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: const Color(0xFFBBF7D0)),
      boxShadow: const [
        BoxShadow(
          color: Color(0x06000000),
          blurRadius: 8,
          offset: Offset(0, 2),
        ),
      ],
    ),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.green.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.shield_outlined,
                color: AppColors.green,
                size: 20,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        context.tr('contactPlayer'),
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 13,
                          color: AppColors.navy,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFFDE68A)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.lock_rounded,
                              size: 10,
                              color: Color(0xFFD97706),
                            ),
                            const SizedBox(width: 3),
                            Text(
                              context.tr('contactViaAppOnly'),
                              style: const TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFFD97706),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (contactName.isNotEmpty)
                    Text(
                      context.languageCode == 'ar'
                          ? contactName
                          : transliterateArabicName(contactName),
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
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          height: 42,
          child: FilledButton.icon(
            onPressed: onMessage,
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.navy,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 0,
            ),
            icon: const Icon(Icons.forum_rounded, size: 18),
            label: Text(
              context.tr('startSecureInAppChat'),
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            ),
          ),
        ),
      ],
    ),
  );
}

String? _cleanVideoUrl(String? raw) {
  if (raw == null) return null;
  var url = raw.trim();
  if (url.isEmpty) return null;

  final httpIdx = url.indexOf('http');
  if (httpIdx > 0) {
    url = url.substring(httpIdx).trim();
  } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
    if (url.startsWith('www.') ||
        url.contains('tiktok.com') ||
        url.contains('youtube.com') ||
        url.contains('youtu.be')) {
      url = 'https://$url';
    } else {
      return null;
    }
  }
  return url;
}

Future<void> _playVideo(BuildContext context, String rawUrl) async {
  final clean = _cleanVideoUrl(rawUrl);
  if (clean == null) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('videoPlaybackFailed'))),
      );
    }
    return;
  }

  final uri = Uri.tryParse(clean);
  if (uri == null) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('videoPlaybackFailed'))),
      );
    }
    return;
  }

  bool launched = false;
  try {
    launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
  } catch (_) {}

  if (!launched) {
    try {
      launched = await launchUrl(uri, mode: LaunchMode.inAppBrowserView);
    } catch (_) {}
  }

  if (!launched) {
    try {
      launched = await launchUrl(uri, mode: LaunchMode.platformDefault);
    } catch (_) {}
  }

  if (!launched && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(context.tr('videoPlaybackFailed'))),
    );
  }
}


class _QuickStats extends StatelessWidget {
  const _QuickStats({required this.items});

  final List<_StatItem> items;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Row(
      children: items.map((item) {
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 3),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () => _showStatDetailModal(context, item),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    vertical: 10,
                    horizontal: 4,
                  ),
                  decoration: BoxDecoration(
                    gradient: item.bgGradient,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: item.accentColor.withValues(alpha: 0.35),
                      width: 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: item.accentColor.withValues(alpha: 0.08),
                        blurRadius: 6,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(item.icon, color: item.accentColor, size: 20),
                      const SizedBox(height: 4),
                      Text(
                        item.value,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                          color: item.accentColor,
                        ),
                      ),
                      const SizedBox(height: 1),
                      Text(
                        item.label,
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: item.accentColor.withValues(alpha: 0.85),
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _EvaluationCard extends StatelessWidget {
  const _EvaluationCard({required this.isEvaluated, required this.payload});

  final bool isEvaluated;
  final Map<String, dynamic> payload;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => _showEvaluationDetailModal(context, isEvaluated, payload),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFFEDE9FE), Color(0xFFDDD6FE)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFC4B5FD)),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF7C3AED).withValues(alpha: 0.1),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white,
                ),
                child: const Icon(
                  Icons.stars_rounded,
                  color: Color(0xFF7C3AED),
                  size: 22,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                context.tr('talentEvaluation'),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF5B21B6),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                context.tr(
                  isEvaluated ? 'talentEvaluated' : 'talentUnderEvaluation',
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF6D28D9),
                  fontWeight: FontWeight.bold,
                  fontSize: 10,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PlayerAffiliationCard extends StatelessWidget {
  const _PlayerAffiliationCard({
    required this.organization,
    required this.payload,
  });

  final Map<String, dynamic> organization;
  final Map<String, dynamic> payload;

  static String _orgLogoUrl(Map<String, dynamic> org) {
    for (final key in ['logo_url', 'logoUrl', 'logo', 'image_url', 'imageUrl']) {
      final val = '${org[key] ?? ''}'.trim();
      if (val.startsWith('http')) return val;
    }
    return '';
  }

  @override
  Widget build(BuildContext context) {
    final hasOrganization =
        organization.isNotEmpty &&
        '${organization['name'] ?? ''}'.trim().isNotEmpty;
    final orgName = '${organization['name'] ?? ''}'.trim();
    final orgLogoUrl = _orgLogoUrl(organization);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () =>
            _showAffiliationDetailModal(context, organization, payload),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFFDCFCE7), Color(0xFFBBF7D0)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF86EFAC)),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF16A34A).withValues(alpha: 0.1),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // ── Org logo or fallback icon ──
              if (hasOrganization && orgLogoUrl.isNotEmpty)
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white,
                    border: Border.all(
                      color: const Color(0xFF86EFAC),
                      width: 1.5,
                    ),
                  ),
                  child: ClipOval(
                    child: kIsWeb
                        ? Image.network(
                            orgLogoUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => _fallbackIcon(),
                          )
                        : CachedNetworkImage(
                            imageUrl: orgLogoUrl,
                            fit: BoxFit.cover,
                            placeholder: (_, _) => _fallbackIcon(),
                            errorWidget: (_, _, _) => _fallbackIcon(),
                          ),
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.all(7),
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white,
                  ),
                  child: Icon(
                    hasOrganization
                        ? Icons.shield_rounded
                        : Icons.sports_soccer_rounded,
                    color: const Color(0xFF16A34A),
                    size: 22,
                  ),
                ),
              const SizedBox(height: 6),
              Text(
                context.tr('playerAffiliationStatus'),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF14532D),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                hasOrganization ? orgName : context.tr('freePlayer'),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF15803D),
                  fontWeight: FontWeight.bold,
                  fontSize: 10,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _fallbackIcon() => Container(
        color: const Color(0xFFDCFCE7),
        child: const Icon(
          Icons.shield_rounded,
          size: 24,
          color: Color(0xFF16A34A),
        ),
      );
}

void _showStatDetailModal(BuildContext context, _StatItem item) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => Padding(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: item.bgGradient,
              shape: BoxShape.circle,
            ),
            child: Icon(item.icon, size: 36, color: item.accentColor),
          ),
          const SizedBox(height: 14),
          Text(
            '${item.label}: ${item.value}',
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              color: AppColors.navy,
            ),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Text(
              item.detailText,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.navy,
                height: 1.6,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => Navigator.pop(ctx),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.navy,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(context.tr('agreeAndClose')),
            ),
          ),
        ],
      ),
    ),
  );
}

void _showEvaluationDetailModal(
  BuildContext context,
  bool isEvaluated,
  Map<String, dynamic> payload,
) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => Padding(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF7C3AED).withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(
                  Icons.stars_rounded,
                  color: Color(0xFF7C3AED),
                  size: 28,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.tr('talentEvaluation'),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: AppColors.navy,
                      ),
                    ),
                    Text(
                      context.tr(
                        isEvaluated
                            ? 'talentEvaluated'
                            : 'talentUnderEvaluation',
                      ),
                      style: const TextStyle(
                        color: Color(0xFF7C3AED),
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF5F3FF),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFDDD6FE)),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.info_outline_rounded,
                  color: Color(0xFF7C3AED),
                  size: 20,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    context.tr('byTechnicalCommittee'),
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF5B21B6),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Text(
            isEvaluated
                ? context.tr('talentEvaluationVerifiedDesc')
                : context.tr('talentEvaluationPendingDesc'),
            style: const TextStyle(
              fontSize: 13,
              height: 1.6,
              color: AppColors.navy,
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => Navigator.pop(ctx),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.navy,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(context.tr('agreeAndClose')),
            ),
          ),
        ],
      ),
    ),
  );
}

void _showAffiliationDetailModal(
  BuildContext context,
  Map<String, dynamic> organization,
  Map<String, dynamic> payload,
) {
  final hasOrganization =
      organization.isNotEmpty &&
      '${organization['name'] ?? ''}'.trim().isNotEmpty;
  final orgName = '${organization['name'] ?? ''}'.trim();
  final orgType = '${organization['type'] ?? ''}'.trim();
  final joinedViaReferral =
      organization['joinedViaReferral'] == true ||
      payload['joinedViaReferral'] == true;
  final rawJoinDate =
      payload['joinedAt'] ??
      payload['organizationJoinedAt'] ??
      payload['requestedAt'] ??
      payload['created_at'] ??
      payload['createdAt'];
  final joinDateText = _formatJoinDate(context, rawJoinDate);

  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => Padding(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.green.withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(
                  Icons.sports_soccer_rounded,
                  color: AppColors.green,
                  size: 28,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.tr('playerAffiliationStatus'),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: AppColors.navy,
                      ),
                    ),
                    Text(
                      hasOrganization ? orgName : context.tr('freePlayer'),
                      style: const TextStyle(
                        color: AppColors.green,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDF4),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFBBF7D0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  hasOrganization
                      ? context.tr('playerOfficiallyRegisteredTo', {'org': '$orgName${orgType.isNotEmpty ? " ($orgType)" : ""}'})
                      : context.tr('availableForImmediateTransfer'),
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF166534),
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (joinedViaReferral) ...[
                  const SizedBox(height: 6),
                  Text(
                    context.tr('joinedThroughDreamAmbassadors'),
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.muted,
                    ),
                  ),
                ],
                if (joinDateText.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(
                        Icons.calendar_today_rounded,
                        size: 12,
                        color: Color(0xFF166534),
                      ),
                      const SizedBox(width: 5),
                      Text(
                        context.tr('officialJoinDate', {'date': joinDateText}),
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF166534),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),
          Text(
            context.tr('playerAffiliationModalDesc'),
            style: const TextStyle(fontSize: 13, height: 1.6, color: AppColors.navy),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => Navigator.pop(ctx),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.navy,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(context.tr('agreeAndClose')),
            ),
          ),
        ],
      ),
    ),
  );
}

class _ProfileSection extends StatelessWidget {
  const _ProfileSection({
    required this.icon,
    required this.title,
    required this.child,
  });

  final IconData icon;
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(18),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      border: Border.all(color: const Color(0xFFE4E9F0)),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _SectionTitle(icon: icon, title: title),
        const SizedBox(height: 16),
        child,
      ],
    ),
  );
}

class _InfoGrid extends StatelessWidget {
  const _InfoGrid({required this.fields});

  final List<_InfoField> fields;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final itemWidth = constraints.maxWidth >= 600
          ? (constraints.maxWidth - 12) / 2
          : constraints.maxWidth;
      return Wrap(
        spacing: 12,
        runSpacing: 10,
        children: fields
            .map(
              (field) => Container(
                width: itemWidth,
                padding: const EdgeInsets.all(13),
                decoration: BoxDecoration(
                  color: const Color(0xFFF6F8FB),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      field.label,
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    SelectableText(
                      field.value,
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
              ),
            )
            .toList(),
      );
    },
  );
}

class _PlayerSkillsRadarSection extends StatelessWidget {
  const _PlayerSkillsRadarSection({
    required this.player,
    required this.technical,
    required this.physical,
    required this.social,
  });

  final Player player;
  final List<MapEntry<String, double>> technical;
  final List<MapEntry<String, double>> physical;
  final List<MapEntry<String, double>> social;

  @override
  Widget build(BuildContext context) {
    final ovr = player.overallRating;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE4E9F0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x06000000),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: _SectionTitle(
                  icon: Icons.radar_rounded,
                  title: context.tr('playerSkills'),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFFD700), Color(0xFFF59E0B)],
                  ),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFFFD700).withValues(alpha: 0.4),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '$ovr',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Text(
                      'OVR',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // ── 6 FUT Attribute Badges ──
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _futStatBadge('PAC', player.pace, const Color(0xFF3B82F6)),
              _futStatBadge('SHO', player.shooting, const Color(0xFFEF4444)),
              _futStatBadge('PAS', player.passing, const Color(0xFF10B981)),
              _futStatBadge('DRI', player.dribbling, const Color(0xFF8B5CF6)),
              _futStatBadge('DEF', player.defending, const Color(0xFFF59E0B)),
              _futStatBadge('PHY', player.physical, const Color(0xFFEC4899)),
            ],
          ),
          const SizedBox(height: 16),
          // ── 6-Axis Interactive Radar Chart ──
          Center(
            child: PlayerSkillsRadarChart(
              pace: player.pace,
              shooting: player.shooting,
              passing: player.passing,
              dribbling: player.dribbling,
              defending: player.defending,
              physical: player.physical,
              isDark: false,
              size: 240,
            ),
          ),
          // ── Detailed Skills Breakdown ──
          if (technical.isNotEmpty || physical.isNotEmpty || social.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Divider(color: Color(0xFFF1F5F9), height: 1),
            const SizedBox(height: 14),
            if (technical.isNotEmpty)
              _SkillGroup(
                title: context.tr('technicalSkills'),
                entries: technical,
              ),
            if (physical.isNotEmpty)
              _SkillGroup(
                title: context.tr('physicalSkills'),
                entries: physical,
              ),
            if (social.isNotEmpty)
              _SkillGroup(
                title: context.tr('socialSkills'),
                entries: social,
              ),
          ],
        ],
      ),
    );
  }

  Widget _futStatBadge(String label, num val, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          Text(
            '${val.round()}',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w900,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: AppColors.muted,
            ),
          ),
        ],
      ),
    );
  }
}

class _SkillGroup extends StatelessWidget {
  const _SkillGroup({required this.title, required this.entries});

  final String title;
  final List<MapEntry<String, double>> entries;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
        const SizedBox(height: 10),
        ...entries.map(
          (entry) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              children: [
                SizedBox(
                  width: 112,
                  child: Text(_localizedStoredText(context, entry.key)),
                ),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: LinearProgressIndicator(
                      value: entry.value / 5,
                      minHeight: 9,
                      backgroundColor: const Color(0xFFE6EBF1),
                      color: AppColors.green,
                    ),
                  ),
                ),
                const SizedBox(width: 9),
                Text(
                  '${entry.value.toInt()}/5',
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ],
            ),
          ),
        ),
      ],
    ),
  );
}

class _BulletGroup extends StatelessWidget {
  const _BulletGroup({required this.title, required this.values});

  final String title;
  final List<String> values;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 13,
            color: AppColors.navy,
          ),
        ),
        const SizedBox(height: 7),
        ...values.map(
          (value) => Padding(
            padding: const EdgeInsets.only(bottom: 5),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.only(top: 7),
                  child: Icon(Icons.circle, size: 6, color: AppColors.green),
                ),
                const SizedBox(width: 8),
                Expanded(child: Text(value)),
              ],
            ),
          ),
        ),
      ],
    ),
  );
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.icon, required this.title});

  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        padding: const EdgeInsets.all(7),
        decoration: BoxDecoration(
          color: AppColors.green.withValues(alpha: .12),
          borderRadius: BorderRadius.circular(9),
        ),
        child: Icon(icon, color: AppColors.green, size: 18),
      ),
      const SizedBox(width: 9),
      Flexible(
        child: Text(
          title,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w800,
            color: AppColors.navy,
          ),
        ),
      ),
    ],
  );
}

class _HeroChip extends StatelessWidget {
  const _HeroChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: .14),
      borderRadius: BorderRadius.circular(30),
      border: Border.all(color: Colors.white24),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: Colors.white),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(color: Colors.white)),
      ],
    ),
  );
}

class _PlayerImageFallback extends StatelessWidget {
  const _PlayerImageFallback();

  @override
  Widget build(BuildContext context) => Container(
    color: const Color(0xFFEAF3EF),
    alignment: Alignment.center,
    child: const Icon(
      Icons.sports_soccer_rounded,
      size: 54,
      color: AppColors.green,
    ),
  );
}

class _InfoField {
  const _InfoField(this.label, this.value);

  final String label;
  final String value;
}

class _StatItem {
  const _StatItem(
    this.type,
    this.icon,
    this.value,
    this.label,
    this.bgGradient,
    this.accentColor,
    this.detailText,
  );

  final String type;
  final IconData icon;
  final String value;
  final String label;
  final LinearGradient bgGradient;
  final Color accentColor;
  final String detailText;
}

String _formatJoinDate(BuildContext context, dynamic dateValue) {
  if (dateValue == null) return '';
  final str = '$dateValue'.trim();
  if (str.isEmpty || str == 'null') return '';
  final dt = DateTime.tryParse(str);
  if (dt == null) return str;
  final local = dt.toLocal();
  final lang = Localizations.localeOf(context).languageCode;
  if (lang == 'ar') {
    final months = [
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر',
    ];
    return '${local.day} ${months[local.month - 1]} ${local.year}';
  }
  return '${local.year}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')}';
}

String _localizedStoredText(BuildContext context, String value) {
  final language = Localizations.localeOf(context).languageCode;

  // ── First check if value is an English code (e.g. GK, CB, right, contracted)
  final arPos = kPositionLabels[value];
  final arFoot = kFootLabels[value];
  final arContract = kContractStatusLabels[value];
  final arGender = kGenderLabels[value];
  final arEdu = kEducationLevelLabels[value];
  final arWork = kWorkRateLabels[value];
  final arValue = arPos ?? arFoot ?? arContract ?? arGender ?? arEdu ?? arWork;

  if (arValue != null) {
    if (language == 'ar') return arValue;
    // Map code or Arabic text for non-Arabic locales
    value = arValue;
  } else if (language == 'ar') {
    return value;
  }
  const translations = <String, Map<String, String>>{
    'مصر': {'en': 'Egypt', 'es': 'Egipto', 'pt': 'Egito'},
    'جناح أيسر': {
      'en': 'Left winger',
      'es': 'Extremo izquierdo',
      'pt': 'Extremo esquerdo',
    },
    'جناح أيمن': {
      'en': 'Right winger',
      'es': 'Extremo derecho',
      'pt': 'Extremo direito',
    },
    'حارس مرمى': {'en': 'Goalkeeper', 'es': 'Portero', 'pt': 'Guarda-redes'},
    'مدافع': {'en': 'Defender', 'es': 'Defensa', 'pt': 'Defesa'},
    'لاعب وسط': {'en': 'Midfielder', 'es': 'Centrocampista', 'pt': 'Médio'},
    'مهاجم': {'en': 'Forward', 'es': 'Delantero', 'pt': 'Avançado'},
    'اليمنى': {'en': 'Right', 'es': 'Derecho', 'pt': 'Direito'},
    'اليسرى': {'en': 'Left', 'es': 'Izquierdo', 'pt': 'Esquerdo'},
    'ثانوي': {
      'en': 'Secondary education',
      'es': 'Educación secundaria',
      'pt': 'Ensino secundário',
    },
    'محترف': {'en': 'Professional', 'es': 'Profesional', 'pt': 'Profissional'},
    'متوسط': {'en': 'Intermediate', 'es': 'Intermedio', 'pt': 'Intermédio'},
    'مبتدئ': {'en': 'Beginner', 'es': 'Principiante', 'pt': 'Iniciante'},
    'الخطف': {'en': 'Interception', 'es': 'Intercepción', 'pt': 'Interceção'},
    'التسديد': {'en': 'Shooting', 'es': 'Tiro', 'pt': 'Remate'},
    'التمرير': {'en': 'Passing', 'es': 'Pase', 'pt': 'Passe'},
    'المراوغة': {'en': 'Dribbling', 'es': 'Regate', 'pt': 'Drible'},
    'استقبال الكرة': {
      'en': 'First touch',
      'es': 'Control del balón',
      'pt': 'Receção da bola',
    },
    'التحكم بالكرة': {
      'en': 'Ball control',
      'es': 'Control de balón',
      'pt': 'Controlo de bola',
    },
    'الضربات الحرة': {'en': 'Free kicks', 'es': 'Tiros libres', 'pt': 'Livres'},
    'القفز للكرات الهوائية': {
      'en': 'Aerial ability',
      'es': 'Juego aéreo',
      'pt': 'Jogo aéreo',
    },
    'القوة': {'en': 'Strength', 'es': 'Fuerza', 'pt': 'Força'},
    'التحمل': {'en': 'Stamina', 'es': 'Resistencia', 'pt': 'Resistência'},
    'السرعة': {'en': 'Pace', 'es': 'Velocidad', 'pt': 'Velocidade'},
    'التوازن': {'en': 'Balance', 'es': 'Equilibrio', 'pt': 'Equilíbrio'},
    'التوقيت': {'en': 'Timing', 'es': 'Sincronización', 'pt': 'Tempo'},
    'الرشاقة': {'en': 'Agility', 'es': 'Agilidad', 'pt': 'Agilidade'},
    'المرونة': {
      'en': 'Flexibility',
      'es': 'Flexibilidad',
      'pt': 'Flexibilidade',
    },
    'ردود الأفعال': {'en': 'Reactions', 'es': 'Reflejos', 'pt': 'Reflexos'},
    'التواصل': {
      'en': 'Communication',
      'es': 'Comunicación',
      'pt': 'Comunicação',
    },
    'القيادة': {'en': 'Leadership', 'es': 'Liderazgo', 'pt': 'Liderança'},
    'الانضباط': {'en': 'Discipline', 'es': 'Disciplina', 'pt': 'Disciplina'},
    'تقبل النقد': {
      'en': 'Accepting feedback',
      'es': 'Aceptar comentarios',
      'pt': 'Aceitar feedback',
    },
    'إدارة الضغط': {
      'en': 'Pressure management',
      'es': 'Gestión de presión',
      'pt': 'Gestão da pressão',
    },
    'الثقة بالنفس': {'en': 'Confidence', 'es': 'Confianza', 'pt': 'Confiança'},
    'العمل الجماعي': {
      'en': 'Teamwork',
      'es': 'Trabajo en equipo',
      'pt': 'Trabalho em equipa',
    },
    'التحفيز الذاتي': {
      'en': 'Self-motivation',
      'es': 'Automotivación',
      'pt': 'Automotivação',
    },
    'الفوز ببطولة دولية': {
      'en': 'Win an international championship',
      'es': 'Ganar un campeonato internacional',
      'pt': 'Ganhar um campeonato internacional',
    },
    'الفوز ببطولة محلية': {
      'en': 'Win a domestic championship',
      'es': 'Ganar un campeonato nacional',
      'pt': 'Ganhar um campeonato nacional',
    },
    'اللعب في دوري أوروبي': {
      'en': 'Play in a European league',
      'es': 'Jugar en una liga europea',
      'pt': 'Jogar numa liga europeia',
    },
    'تمثيل المنتخب الوطني': {
      'en': 'Represent the national team',
      'es': 'Representar a la selección nacional',
      'pt': 'Representar a seleção nacional',
    },
    'الاحتراف في نادي كبير': {
      'en': 'Turn professional at a major club',
      'es': 'Ser profesional en un gran club',
      'pt': 'Ser profissional num grande clube',
    },
    'تطوير اللياقة البدنية': {
      'en': 'Improve physical fitness',
      'es': 'Mejorar la condición física',
      'pt': 'Melhorar a condição física',
    },
    'الحصول على جوائز فردية': {
      'en': 'Win individual awards',
      'es': 'Ganar premios individuales',
      'pt': 'Ganhar prémios individuais',
    },
  };
  return translations[value]?[language] ??
      (language == 'fr' ? (translations[value] ?? const {})['en'] : null) ??
      value;
}
