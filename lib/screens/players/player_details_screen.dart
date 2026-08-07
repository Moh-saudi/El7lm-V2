import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/player.dart';
import '../../services/data_service.dart';
import '../messages/chat_detail_screen.dart';

import '../../widgets/player_share_modal.dart';

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
      if (mounted) setState(() => favorite = ids.contains(widget.initialPlayer.id));
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
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(context.tr('playerDetails')),
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
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Icon(
                  favorite
                      ? Icons.favorite_rounded
                      : Icons.favorite_border_rounded,
                  color: favorite ? const Color(0xFFE5484D) : null,
                ),
        ),
        const SizedBox(width: 8),
      ],
    ),
    body: FutureBuilder<Player>(
      future: future,
      initialData: widget.initialPlayer,
      builder: (context, snapshot) {
        final player = snapshot.data ?? widget.initialPlayer;
        _fetchedPlayer = player;
        return RefreshIndicator(
          onRefresh: () async {
            setState(
              () => future = widget.dataService.fetchPlayerById(player.id),
            );
            await future;
          },
          child: ListView(
            padding: const EdgeInsets.only(bottom: 32),
            children: [
              _PlayerHeader(player: player),
              if (snapshot.hasError)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Card(
                    color: Colors.orange.shade50,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(context.errorText(snapshot.error)),
                    ),
                  ),
                ),
              _PlayerProfile(player: player, dataService: widget.dataService),
            ],
          ),
        );
      },
    ),
  );
}

class _PlayerHeader extends StatelessWidget {
  const _PlayerHeader({required this.player});

  final Player player;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
    decoration: BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topRight,
        end: Alignment.bottomLeft,
        colors: [AppColors.navy, AppColors.green.withValues(alpha: .9)],
      ),
    ),
    child: Column(
      children: [
        Container(
          width: 124,
          height: 124,
          padding: const EdgeInsets.all(4),
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white,
          ),
          child: ClipOval(
            child: player.imageUrl.isEmpty
                ? const _PlayerImageFallback()
                : kIsWeb
                    ? Image.network(
                        player.imageUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => const _PlayerImageFallback(),
                      )
                    : CachedNetworkImage(
                        imageUrl: player.imageUrl,
                        fit: BoxFit.cover,
                        errorWidget: (_, _, _) => const _PlayerImageFallback(),
                      ),
          ),
        ),
        const SizedBox(height: 14),
        Text(
          player.name.isEmpty ? context.tr('dreamPlayer') : player.name,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w900,
            fontSize: 24,
          ),
        ),
        const SizedBox(height: 10),
        Wrap(
          alignment: WrapAlignment.center,
          spacing: 8,
          runSpacing: 8,
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
      scaffold.showSnackBar(
        SnackBar(content: Text(context.errorText(e))),
      );
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
          const LinearGradient(
            colors: [Color(0xFFE0F2FE), Color(0xFFBAE6FD)],
          ),
          const Color(0xFF0284C7),
          'الطول: ${player.height} سم - قامة رياضية متناسقة تمنح تفوقاً حركياً في الالتحامات والكرات العالية.',
        ),
      if (player.age != null)
        _StatItem(
          'age',
          Icons.cake_outlined,
          '${player.age}',
          context.tr('age'),
          const LinearGradient(
            colors: [Color(0xFFFEF3C7), Color(0xFFFDE68A)],
          ),
          const Color(0xFFD97706),
          'العمر: ${player.age} سنة - الفئة السنية المعتمدة في الأكاديميات والبطولات الرسمية.',
        ),
      if (experience.isNotEmpty)
        _StatItem(
          'experience',
          Icons.insights_rounded,
          experience,
          context.tr('experienceYears'),
          const LinearGradient(
            colors: [Color(0xFFDCFCE7), Color(0xFFBBF7D0)],
          ),
          const Color(0xFF16A34A),
          'سنوات الخبرة: $experience سنة - مسيرة رياضية في التدريبات والمشاركات الميدانية.',
        ),
      if (player.weight != null)
        _StatItem(
          'weight',
          Icons.monitor_weight_outlined,
          '${player.weight}',
          context.tr('weightKg'),
          const LinearGradient(
            colors: [Color(0xFFEDE9FE), Color(0xFFDDD6FE)],
          ),
          const Color(0xFF7C3AED),
          'الوزن: ${player.weight} كجم - كتلة بدنية ملائمة للبنية الرياضية في الملعب.',
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
    final technical = _ratingEntries(payload['technical_skills']);
    final physical = _ratingEntries(payload['physical_skills']);
    final social = _ratingEntries(payload['social_skills']);
    final objectives = _enabledEntries(payload['objectives']);
    final achievements = _listValues(payload['achievements']);
    final clubs = _listValues(payload['club_history']).isNotEmpty
        ? _listValues(payload['club_history'])
        : _listValues(payload['previous_clubs']);
    final courses = _listValues(payload['training_courses']).isNotEmpty
        ? _listValues(payload['training_courses'])
        : _listValues(payload['courses']);
    final brief = _text(payload, ['brief', 'sports_notes']);
    final organization = _asMap(payload['_organization']);
    final isEvaluated = '${payload['evaluation_status'] ?? ''}' == 'rated';

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
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
          if (technical.isNotEmpty ||
              physical.isNotEmpty ||
              social.isNotEmpty) ...[
            const SizedBox(height: 22),
            _ProfileSection(
              icon: Icons.insights_rounded,
              title: context.tr('playerSkills'),
              child: Column(
                children: [
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
              ),
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
              courses.isNotEmpty) ...[
            const SizedBox(height: 22),
            _ProfileSection(
              icon: Icons.emoji_events_outlined,
              title: context.tr('playerJourney'),
              child: Column(
                children: [
                  if (achievements.isNotEmpty)
                    _BulletGroup(
                      title: context.tr('playerAchievements'),
                      values: achievements,
                    ),
                  if (clubs.isNotEmpty)
                    _BulletGroup(
                      title: context.tr('playerClubHistory'),
                      values: clubs,
                    ),
                  if (courses.isNotEmpty)
                    _BulletGroup(
                      title: context.tr('playerCourses'),
                      values: courses,
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
                          trailing: const Icon(Icons.open_in_new_rounded),
                          onTap: () => _openUri(
                            context,
                            Uri.tryParse(video.url),
                            failureKey: 'videoPlaybackFailed',
                          ),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
          ],
        ],
      ),
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
    if (value is! Map) return const [];
    return value.entries
        .map((entry) {
          final number = entry.value is num
              ? (entry.value as num).toDouble()
              : double.tryParse('${entry.value}') ?? 0;
          return MapEntry('${entry.key}', number.clamp(0.0, 5.0).toDouble());
        })
        .where((entry) => entry.key.trim().isNotEmpty)
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
    if (value is! List) return const [];
    return value
        .map((item) {
          if (item is Map) {
            return _firstText([
              item['title'],
              item['name'],
              item['club'],
              item['description'],
            ]);
          }
          return '$item'.trim();
        })
        .where((item) => item.isNotEmpty)
        .toList();
  }

  static List<String> _imageUrls(Map<String, dynamic> payload, String primary) {
    final result = <String>{};
    void collect(Object? value) {
      if (value is String &&
          (value.startsWith('http://') || value.startsWith('https://')) &&
          !_isRetiredStorageUrl(value)) {
        result.add(value);
      } else if (value is List) {
        for (final item in value) {
          collect(item);
        }
      } else if (value is Map) {
        collect(value['url']);
      }
    }

    collect(primary);
    for (final key in ['images', 'additional_images', 'gallery', 'photos']) {
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
        colors: [
          Color(0xFFF0FDF4),
          Color(0xFFF8FAFC),
        ],
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
              child: const Icon(Icons.shield_outlined, color: AppColors.green, size: 20),
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
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFFDE68A)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.lock_rounded, size: 10, color: Color(0xFFD97706)),
                            SizedBox(width: 3),
                            Text(
                              'التواصل عبر التطبيق فقط',
                              style: TextStyle(
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
                      contactName,
                      style: const TextStyle(color: AppColors.muted, fontSize: 11),
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
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            icon: const Icon(Icons.forum_rounded, size: 18),
            label: const Text(
              'بدء محادثة آمنة عبر التطبيق 💬',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            ),
          ),
        ),
      ],
    ),
  );
}

Future<void> _openUri(
  BuildContext context,
  Uri? uri, {
  String failureKey = 'openContactFailed',
}) async {
  if (uri != null &&
      await launchUrl(uri, mode: LaunchMode.externalApplication)) {
    return;
  }
  if (context.mounted) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(context.tr(failureKey))));
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
                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
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
  const _EvaluationCard({
    required this.isEvaluated,
    required this.payload,
  });

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
                child: const Icon(Icons.stars_rounded, color: Color(0xFF7C3AED), size: 22),
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
                context.tr(isEvaluated ? 'talentEvaluated' : 'talentUnderEvaluation'),
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

  @override
  Widget build(BuildContext context) {
    final hasOrganization =
        organization.isNotEmpty &&
        '${organization['name'] ?? ''}'.trim().isNotEmpty;
    final orgName = '${organization['name'] ?? ''}'.trim();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => _showAffiliationDetailModal(context, organization, payload),
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
              Container(
                padding: const EdgeInsets.all(7),
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white,
                ),
                child: const Icon(Icons.sports_soccer_rounded, color: Color(0xFF16A34A), size: 22),
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
                maxLines: 1,
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
                child: const Icon(Icons.stars_rounded, color: Color(0xFF7C3AED), size: 28),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.tr('talentEvaluation'),
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.navy),
                    ),
                    Text(
                      context.tr(isEvaluated ? 'talentEvaluated' : 'talentUnderEvaluation'),
                      style: const TextStyle(color: Color(0xFF7C3AED), fontWeight: FontWeight.bold, fontSize: 13),
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
                const Icon(Icons.info_outline_rounded, color: Color(0xFF7C3AED), size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    context.tr('byTechnicalCommittee'),
                    style: const TextStyle(fontSize: 12, color: Color(0xFF5B21B6), fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Text(
            isEvaluated
                ? 'تم فحص وتقييم أداء ومهارات اللاعب بنجاح بواسطة خوارزميات الحلم واللجنة الفنية المتخصصة.'
                : 'الملف حالياً في مرحلة التقييم الفني بواسطة خوارزميات الحلم المعتمدة واللجنة الرياضية.',
            style: const TextStyle(fontSize: 13, height: 1.6, color: AppColors.navy),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => Navigator.pop(ctx),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.navy,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
  final joinedViaReferral = organization['joinedViaReferral'] == true || payload['joinedViaReferral'] == true;
  final rawJoinDate = payload['joinedAt'] ??
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
                child: const Icon(Icons.sports_soccer_rounded, color: AppColors.green, size: 28),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.tr('playerAffiliationStatus'),
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.navy),
                    ),
                    Text(
                      hasOrganization ? orgName : context.tr('freePlayer'),
                      style: const TextStyle(color: AppColors.green, fontWeight: FontWeight.bold, fontSize: 13),
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
                      ? 'اللاعب مسجل ورسمياً منتسب إلى: $orgName${orgType.isNotEmpty ? " ($orgType)" : ""}'
                      : context.tr('availableForImmediateTransfer'),
                  style: const TextStyle(fontSize: 13, color: Color(0xFF166534), fontWeight: FontWeight.w700),
                ),
                if (joinedViaReferral) ...[
                  const SizedBox(height: 6),
                  Text(
                    context.tr('joinedThroughDreamAmbassadors'),
                    style: const TextStyle(fontSize: 11, color: AppColors.muted),
                  ),
                ],
                if (joinDateText.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today_rounded, size: 12, color: Color(0xFF166534)),
                      const SizedBox(width: 5),
                      Text(
                        'تاريخ الانضمام الرسمي: $joinDateText',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF166534), fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),
          const Text(
            'حالة الانتقال والعقود توضح وضعية اللاعب القانونية والرياضية الحالية لإتاحة التواصل والتفاوض المباشر من قبل الأندية والكشافين.',
            style: TextStyle(fontSize: 13, height: 1.6, color: AppColors.navy),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => Navigator.pop(ctx),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.navy,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
        Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
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
    children: [
      Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: AppColors.green.withValues(alpha: .12),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: AppColors.green),
      ),
      const SizedBox(width: 10),
      Expanded(
        child: Text(
          title,
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
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
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return '${local.day} ${months[local.month - 1]} ${local.year}';
  }
  return '${local.year}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')}';
}

String _localizedStoredText(BuildContext context, String value) {
  final language = Localizations.localeOf(context).languageCode;
  if (language == 'ar') return value;
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
  return translations[value]?[language] ?? value;
}
