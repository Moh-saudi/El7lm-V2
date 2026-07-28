import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/app_config.dart';
import '../models/account_type.dart';
import '../models/opportunity.dart';
import '../models/player.dart';
import '../models/user_profile.dart';
import 'api_client.dart';
import 'auth_service.dart';

class DataService {
  DataService(this._api, this._auth);

  final ApiClient _api;
  final AuthService _auth;

  Future<List<Player>> fetchPlayers() async {
    if (AppConfig.hasSupabaseConfiguration && _auth.hasSession) {
      try {
        final client = Supabase.instance.client;
        final playerRows = await client.from('players').select();
        List<Map<String, dynamic>> userRows = const [];
        try {
          final rows = await client
              .from('users')
              .select()
              .eq('accountType', 'player');
          userRows = rows.map(Map<String, dynamic>.from).toList();
        } catch (_) {
          // Player records alone still contain the complete sports profile.
        }
        final merged = <String, Map<String, dynamic>>{};

        for (final row in userRows) {
          final data = row;
          final id = '${data['id'] ?? data['uid'] ?? ''}';
          if (id.isNotEmpty && !_isDeleted(data)) merged[id] = data;
        }
        for (final row in playerRows) {
          final data = Map<String, dynamic>.from(row);
          final id = '${data['id'] ?? data['uid'] ?? ''}';
          if (id.isEmpty || _isDeleted(data)) continue;
          merged[id] = _mergeMissing(data, merged[id]);
        }
        if (merged.isNotEmpty) {
          return merged.values.map(Player.fromJson).toList();
        }
      } catch (_) {
        // The public API remains a safe fallback if RLS limits full-table reads.
      }
    }

    final response = await _api.get('/api/players/videos');
    final data = response['data'];
    if (data is! List) return const [];
    return data
        .whereType<Map>()
        .map((row) => Player.fromJson(Map<String, dynamic>.from(row)))
        .toList();
  }

  Future<Player> fetchPlayerById(String playerId) async {
    _requireSupabase();
    final client = Supabase.instance.client;
    Map<String, dynamic>? player;
    Map<String, dynamic>? user;

    player = await client
        .from('players')
        .select()
        .eq('id', playerId)
        .maybeSingle();
    player ??= await client
        .from('players')
        .select()
        .eq('uid', playerId)
        .maybeSingle();
    try {
      user = await client
          .from('users')
          .select()
          .eq('id', playerId)
          .maybeSingle();
      user ??= await client
          .from('users')
          .select()
          .eq('uid', playerId)
          .maybeSingle();
    } catch (_) {
      // The sports profile remains authoritative if users access is limited.
    }

    final data = _mergeMissing(player ?? const {}, user);
    if (data.isEmpty) {
      throw const ApiException(
        'Player profile was not found.',
        translationKey: 'playerNotFound',
      );
    }
    return Player.fromJson(data);
  }

  Future<List<Opportunity>> fetchOpportunities() async {
    final response = await _api.get(
      '/api/opportunities',
      query: const {'explore': 'true'},
    );
    final data = response['data'];
    if (data is! List) return const [];
    return data
        .whereType<Map>()
        .map((row) => Opportunity.fromJson(Map<String, dynamic>.from(row)))
        .toList();
  }

  Future<void> applyForOpportunity(String opportunityId) async {
    await _api.post(
      '/api/opportunities/apply',
      body: {'opportunityId': opportunityId},
      accessToken: _auth.accessToken,
    );
  }

  Future<UserProfile> fetchProfile(AccountType accountType) async {
    _requireSupabase();
    final client = Supabase.instance.client;
    final authId = _auth.authUserId;
    final legacyId = await _auth.legacyUserId();
    final table = _tableFor(accountType);

    Map<String, dynamic>? specific;
    for (final id in {
      authId,
      legacyId,
    }.whereType<String>().where((e) => e.isNotEmpty)) {
      specific = await client.from(table).select().eq('id', id).maybeSingle();
      specific ??= await client
          .from(table)
          .select()
          .eq('uid', id)
          .maybeSingle();
      if (specific != null) break;
    }

    Map<String, dynamic>? user;
    for (final id in {
      authId,
      legacyId,
    }.whereType<String>().where((e) => e.isNotEmpty)) {
      user = await client.from('users').select().eq('id', id).maybeSingle();
      user ??= await client.from('users').select().eq('uid', id).maybeSingle();
      if (user != null) break;
    }

    final merged = <String, dynamic>{...?specific};
    merged['name'] ??=
        specific?['full_name'] ?? user?['displayName'] ?? user?['full_name'];
    merged['email'] ??= user?['email'];
    merged['phone'] ??= specific?['phone'] ?? user?['phoneNumber'];
    return UserProfile(
      userId: '${specific?['id'] ?? user?['id'] ?? legacyId ?? authId ?? ''}',
      accountType: accountType.value,
      values: merged,
    );
  }

  Future<void> savePlayerProfile(
    UserProfile profile,
    Map<String, dynamic> updates,
  ) async {
    _requireSupabase();
    final client = Supabase.instance.client;
    final merged = profile.mergeUpdates(updates);
    final playerPayload = {...merged, 'id': profile.userId};

    await client.from('players').upsert(playerPayload);
    await client.from('users').upsert({
      'id': profile.userId,
      'displayName': updates['name'] ?? merged['full_name'] ?? merged['name'],
      'phoneNumber': updates['phone'] ?? merged['phone'],
      'isProfileComplete': true,
      'updatedAt': DateTime.now().toUtc().toIso8601String(),
    });
  }

  Future<List<Map<String, dynamic>>> fetchManagedPlayers(
    AccountType accountType,
  ) async {
    _requireSupabase();
    final client = Supabase.instance.client;
    final authId = _auth.authUserId;
    final legacyId = await _auth.legacyUserId();
    final organizationIds = {
      authId,
      legacyId,
    }.whereType<String>().where((value) => value.isNotEmpty).toList();
    if (organizationIds.isEmpty) return const [];

    final idFields = <String, List<String>>{
      'club': ['club_id', 'clubId', 'organizationId'],
      'academy': ['academy_id', 'academyId', 'organizationId'],
      'trainer': ['trainer_id', 'trainerId', 'organizationId'],
      'agent': ['agent_id', 'agentId', 'organizationId'],
      'marketer': ['organizationId'],
    };
    final seen = <String>{};
    final players = <Map<String, dynamic>>[];
    for (final organizationId in organizationIds) {
      for (final field in idFields[accountType.value] ?? ['organizationId']) {
        final rows = await client
            .from('players')
            .select()
            .eq(field, organizationId);
        for (final row in rows) {
          final map = Map<String, dynamic>.from(row);
          if (seen.add('${map['id']}')) players.add(map);
        }
      }
    }
    return players;
  }

  Future<Map<String, dynamic>> createInviteCode({
    required AccountType accountType,
    required String organizationName,
    required String description,
  }) async {
    _requireSupabase();
    final client = Supabase.instance.client;
    // RLS requires organizationId to match auth.uid().
    final organizationId = _auth.authUserId;
    if (organizationId == null) {
      throw const ApiException(
        'Could not identify the account.',
        translationKey: 'accountUnavailable',
      );
    }

    final prefix = switch (accountType) {
      AccountType.club => 'CLB',
      AccountType.academy => 'ACD',
      AccountType.trainer => 'TRN',
      AccountType.agent => 'AGT',
      _ => 'ORG',
    };
    final token = DateTime.now().microsecondsSinceEpoch
        .toRadixString(36)
        .toUpperCase();
    final suffix = token.length <= 6
        ? token.padLeft(6, '0')
        : token.substring(token.length - 6);
    final code = '$prefix$suffix';
    final now = DateTime.now().toUtc().toIso8601String();
    final payload = <String, dynamic>{
      'id': '${DateTime.now().microsecondsSinceEpoch}-$code',
      'organizationId': organizationId,
      'organizationType': accountType.value,
      'organizationName': organizationName,
      'referralCode': code,
      'inviteLink': '${AppConfig.webBaseUrl}/join/org/$code',
      'description': description,
      'isActive': true,
      'currentUsage': 0,
      'createdAt': now,
      'updatedAt': now,
    };
    await client.from('organization_referrals').insert(payload);
    return payload;
  }

  String _tableFor(AccountType type) => switch (type) {
    AccountType.player => 'players',
    AccountType.club => 'clubs',
    AccountType.academy => 'academies',
    AccountType.agent => 'agents',
    AccountType.trainer => 'trainers',
    AccountType.marketer => 'marketers',
  };

  static bool _isDeleted(Map<String, dynamic> data) =>
      data['isDeleted'] == true || data['is_deleted'] == true;

  static Map<String, dynamic> _mergeMissing(
    Map<String, dynamic> preferred,
    Map<String, dynamic>? fallback,
  ) {
    final result = <String, dynamic>{...?fallback, ...preferred};
    for (final entry in (fallback ?? const <String, dynamic>{}).entries) {
      final current = result[entry.key];
      if (current == null || '$current'.trim().isEmpty) {
        result[entry.key] = entry.value;
      }
    }
    return result;
  }

  void _requireSupabase() {
    if (!AppConfig.hasSupabaseConfiguration) {
      throw const ApiException(
        'Database connection settings are incomplete.',
        translationKey: 'supabaseMissing',
      );
    }
  }
}
