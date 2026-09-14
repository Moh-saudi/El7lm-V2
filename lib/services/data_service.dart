import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/app_config.dart';
import '../models/account_type.dart';
import '../models/app_notification.dart';
import '../models/chat_message.dart';
import '../models/chat_contact.dart';
import '../models/conversation.dart';
import '../models/opportunity.dart';
import '../models/player.dart';
import '../models/user_profile.dart';
import 'api_client.dart';
import 'auth_service.dart';
import 'contact_validator.dart';
import 'in_app_notification_service.dart';

class DataService {
  DataService(this._api, this._auth);

  final ApiClient _api;
  final AuthService _auth;

  ApiClient get apiClient => _api;
  AuthService get authService => _auth;

  Future<List<AppNotification>> fetchNotifications() async {
    _requireSupabase();
    final ids = {
      _auth.authUserId,
      await _auth.legacyUserId(),
    }.whereType<String>().where((value) => value.isNotEmpty).toList();
    if (ids.isEmpty) return const [];

    final client = Supabase.instance.client;
    final result = <AppNotification>[];
    for (final source in ['notifications', 'interaction_notifications']) {
      try {
        final rows = await client
            .from(source)
            .select()
            .inFilter('userId', ids)
            .order('createdAt', ascending: false)
            .limit(100);
        result.addAll(
          rows.map(
            (row) => AppNotification.fromJson(
              Map<String, dynamic>.from(row),
              sourceTable: source,
            ),
          ),
        );
      } catch (_) {
        // A second notification source can still be available under stricter RLS.
      }
    }
    final profileReminder = await InAppNotificationService()
        .getProfileCompletionNotification();
    if (profileReminder != null) result.add(profileReminder);
    result.sort((a, b) {
      final left = a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      final right = b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      return right.compareTo(left);
    });
    return result;
  }

  Future<void> markNotificationRead(AppNotification notification) async {
    if (notification.sourceTable ==
        InAppNotificationService.profileReminderSource) {
      await InAppNotificationService().markProfileCompletionNotificationRead();
      return;
    }
    _requireSupabase();
    await Supabase.instance.client
        .from(notification.sourceTable)
        .update({
          'isRead': true,
          if (notification.sourceTable == 'notifications') 'read': true,
        })
        .eq('id', notification.id);
  }

  Future<void> markAllNotificationsRead() async {
    final notifications = await fetchNotifications();
    for (final notification in notifications.where((item) => !item.isRead)) {
      await markNotificationRead(notification);
    }
  }

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
          return Future.wait(
            merged.values.map((data) async {
              await _resolvePlayerMedia(client, data);
              return Player.fromJson(data);
            }),
          );
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
    await _enrichPlayerOrganization(client, data);
    await _resolvePlayerMedia(client, data);
    return Player.fromJson(data);
  }

  Future<void> sendPlayerMessage(Player player, String message) async {
    _requireSupabase();
    if (_auth.authUserId == null || _auth.authUserId!.isEmpty) {
      throw const ApiException(
        'Could not identify the account.',
        translationKey: 'accountUnavailable',
      );
    }
    final body = message.trim();
    if (body.isEmpty) return;
    final response = await Supabase.instance.client.functions.invoke(
      'send-player-message',
      body: {'playerId': player.id, 'message': body},
    );
    if (response.status < 200 || response.status >= 300) {
      throw const ApiException(
        'The message could not be sent.',
        translationKey: 'messageSendFailed',
      );
    }
  }

  Future<Set<String>> fetchFavoritePlayerIds() async {
    _requireSupabase();
    final ownerId = _auth.authUserId;
    if (ownerId == null || ownerId.isEmpty) return const <String>{};
    try {
      final rows = await Supabase.instance.client
          .from('player_favorites')
          .select('player_id')
          .eq('owner_id', ownerId)
          .order('created_at', ascending: false);
      return rows
          .map((row) => '${row['player_id'] ?? ''}'.trim())
          .where((id) => id.isNotEmpty)
          .toSet();
    } catch (_) {
      return const <String>{};
    }
  }

  Future<void> setPlayerFavorite(String playerId, bool favorite) async {
    _requireSupabase();
    final ownerId = _auth.authUserId;
    if (ownerId == null || ownerId.isEmpty) {
      throw const ApiException(
        'Could not identify the account.',
        translationKey: 'accountUnavailable',
      );
    }
    final table = Supabase.instance.client.from('player_favorites');
    if (favorite) {
      await table.insert({'owner_id': ownerId, 'player_id': playerId});
    } else {
      await table.delete().eq('owner_id', ownerId).eq('player_id', playerId);
    }
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

  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<void> applyForOpportunity(
    String opportunityId, {
    String? notes,
    String? preferredPosition,
  }) async {
    try {
      await _api.post(
        '/api/opportunities/apply',
        body: {
          'opportunityId': opportunityId,
          if (notes != null && notes.isNotEmpty) 'notes': notes,
          if (preferredPosition != null && preferredPosition.isNotEmpty)
            'preferredPosition': preferredPosition,
        },
        accessToken: _auth.accessToken,
      );
    } catch (_) {}

    final now = DateTime.now().toUtc().toIso8601String();
    final existingRaw = await _storage.read(key: 'applied_opportunities_list');
    List<dynamic> list = [];
    if (existingRaw != null && existingRaw.isNotEmpty) {
      try {
        list = jsonDecode(existingRaw) as List<dynamic>;
      } catch (_) {}
    }
    list.removeWhere((item) => item['opportunityId'] == opportunityId);
    list.insert(0, {
      'opportunityId': opportunityId,
      'appliedAt': now,
      'notes': notes ?? '',
      'preferredPosition': preferredPosition ?? '',
      'status': 'pending',
    });
    await _storage.write(
      key: 'applied_opportunities_list',
      value: jsonEncode(list),
    );
  }

  Future<List<Map<String, dynamic>>> fetchAppliedOpportunities() async {
    final existingRaw = await _storage.read(key: 'applied_opportunities_list');
    if (existingRaw == null || existingRaw.isEmpty) return const [];
    try {
      final list = jsonDecode(existingRaw) as List<dynamic>;
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } catch (_) {
      return const [];
    }
  }

  Future<UserProfile> fetchProfile(AccountType accountType) async {
    try {
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
        try {
          specific = await client
              .from(table)
              .select()
              .eq('id', id)
              .maybeSingle();
          specific ??= await client
              .from(table)
              .select()
              .eq('uid', id)
              .maybeSingle();
          if (specific != null) break;
        } catch (_) {}
      }

      Map<String, dynamic>? user;
      for (final id in {
        authId,
        legacyId,
      }.whereType<String>().where((e) => e.isNotEmpty)) {
        try {
          user = await client.from('users').select().eq('id', id).maybeSingle();
          user ??= await client
              .from('users')
              .select()
              .eq('uid', id)
              .maybeSingle();
          if (user != null) break;
        } catch (_) {}
      }

      final merged = <String, dynamic>{...?specific};
      merged['name'] ??=
          specific?['full_name'] ?? user?['displayName'] ?? user?['full_name'];
      merged['email'] ??= user?['email'];
      merged['phone'] ??= specific?['phone'] ?? user?['phoneNumber'];
      if (accountType == AccountType.player) {
        try {
          await _enrichPlayerOrganization(client, merged);
          await _resolvePlayerMedia(client, merged);
        } catch (_) {}
      }
      return UserProfile(
        userId:
            '${specific?['id'] ?? user?['id'] ?? legacyId ?? authId ?? 'guest'}',
        accountType: accountType.value,
        values: merged,
      );
    } catch (_) {
      final authId = _auth.authUserId;
      final legacyId = await _auth.legacyUserId();
      return UserProfile(
        userId: authId ?? legacyId ?? 'guest_player',
        accountType: accountType.value,
        values: const {'name': 'لاعب الحلم', 'position': 'ST', 'foot': 'right'},
      );
    }
  }

  Future<void> savePlayerProfile(
    UserProfile profile,
    Map<String, dynamic> updates, {
    bool strict = false,
  }) async {
    await saveOrganizationProfile(profile, updates, strict: strict);
  }

  Future<void> saveOrganizationProfile(
    UserProfile profile,
    Map<String, dynamic> updates, {
    bool strict = false,
  }) async {
    _requireSupabase();
    final submittedEmail = '${updates['email'] ?? ''}'.trim();
    if (submittedEmail.isNotEmpty &&
        !ContactValidator.email(submittedEmail).isValid) {
      throw const FormatException('profileChatInvalidEmail');
    }
    final submittedPhone = '${updates['phone'] ?? ''}'.trim();
    final registeredPhone =
        '${profile.values['phone'] ?? profile.values['phoneNumber'] ?? ''}'
            .trim();
    if (submittedPhone.isNotEmpty &&
        registeredPhone.isNotEmpty &&
        !ContactValidator.samePhone(submittedPhone, registeredPhone)) {
      throw const FormatException('profilePhoneMustMatchLogin');
    }
    final client = Supabase.instance.client;
    if (updates.isEmpty) return;
    final merged = profile.mergeUpdates(updates);
    final accountType = AccountType.fromValue(profile.accountType);
    final table = _tableFor(accountType);

    final nonColumnKeys = {
      'userId',
      'accountType',
      'values',
      'rawPayload',
      'editRequestStatus',
      'edit_request_status',
      'is_edit_pending',
      'edit_request_date',
      '_organization',
    };
    final payload = <String, dynamic>{'id': profile.userId};
    // Send only fields that the player actually changed.  Sending the merged
    // web/mobile profile used to include legacy keys that are not columns in
    // every deployment, making a valid edit fail as a whole.
    updates.forEach((key, value) {
      if (!key.startsWith('_') && !nonColumnKeys.contains(key)) {
        payload[key] = value;
      }
    });

    try {
      final res = await client
          .from(table)
          .update(payload)
          .eq('id', profile.userId)
          .select();
      if (res.isEmpty) {
        await client.from(table).upsert(payload);
      }
    } catch (e) {
      debugPrint('Error saving to $table: $e');
      if (strict) rethrow;
    }

    try {
      final userPayload = <String, dynamic>{
        'isProfileComplete': true,
        'updatedAt': DateTime.now().toUtc().toIso8601String(),
      };
      final nameVal =
          updates['name'] ??
          updates['full_name'] ??
          updates['academy_name'] ??
          merged['name'] ??
          merged['full_name'] ??
          merged['academy_name'];
      if (nameVal != null) {
        userPayload['displayName'] = nameVal;
        userPayload['full_name'] = nameVal;
      }
      if (updates['phone'] != null || merged['phone'] != null) {
        userPayload['phoneNumber'] = updates['phone'] ?? merged['phone'];
      }
      await client.from('users').update(userPayload).eq('id', profile.userId);
    } catch (_) {}
  }

  Future<String> uploadProfileImage({
    required Uint8List bytes,
    required String extension,
    required String contentType,
  }) async {
    _requireSupabase();
    final ownerId = _auth.authUserId ?? await _auth.legacyUserId() ?? 'user';
    final safeExtension = extension.toLowerCase().replaceAll(
      RegExp(r'[^a-z0-9]'),
      '',
    );
    final ext = safeExtension.isEmpty ? 'jpg' : safeExtension;
    final timeStamp = DateTime.now().microsecondsSinceEpoch;
    final paths = ['$ownerId.$ext', '${ownerId}_$timeStamp.$ext'];
    final client = Supabase.instance.client;

    for (final bucket in ['profile-images', 'ads', 'avatars']) {
      for (final path in paths) {
        try {
          await client.storage
              .from(bucket)
              .uploadBinary(
                path,
                bytes,
                fileOptions: FileOptions(
                  contentType: contentType,
                  upsert: true,
                ),
              );
          // Return the relative path compatible with R2 resolution
          return '$bucket/$path';
        } catch (e) {
          debugPrint('Profile image upload error ($bucket/$path): $e');
        }
      }
    }

    final base64Data = base64Encode(bytes);
    final mime = contentType.isNotEmpty ? contentType : 'image/jpeg';
    return 'data:$mime;base64,$base64Data';
  }

  Future<String> uploadPlayerMedia({
    required Uint8List bytes,
    required String extension,
    required String contentType,
    required bool isVideo,
    bool isDocument = false,
  }) async {
    _requireSupabase();
    final ownerId = _auth.authUserId ?? await _auth.legacyUserId() ?? 'user';
    final safeExtension = extension.toLowerCase().replaceAll(
      RegExp(r'[^a-z0-9]'),
      '',
    );
    final ext = safeExtension.isEmpty
        ? (isVideo ? 'mp4' : (isDocument ? 'pdf' : 'jpg'))
        : safeExtension;
    final timeStamp = DateTime.now().microsecondsSinceEpoch;
    final flatPath = '${ownerId}_$timeStamp.$ext';

    final primaryBucket = isVideo
        ? 'videos'
        : (isDocument ||
                  contentType.contains('pdf') ||
                  contentType.contains('document')
              ? 'documents'
              : 'profile-images');

    final client = Supabase.instance.client;
    try {
      await client.storage
          .from(primaryBucket)
          .uploadBinary(
            flatPath,
            bytes,
            fileOptions: FileOptions(contentType: contentType, upsert: true),
          );
      return client.storage.from(primaryBucket).getPublicUrl(flatPath);
    } catch (e) {
      debugPrint('Player media upload error ($primaryBucket/$flatPath): $e');
    }

    final base64Data = base64Encode(bytes);
    final fallbackMime = contentType.isNotEmpty
        ? contentType
        : (isVideo
              ? 'video/mp4'
              : (isDocument ? 'application/pdf' : 'image/jpeg'));
    return 'data:$fallbackMime;base64,$fallbackMime;base64,$base64Data';
  }

  Future<List<Map<String, dynamic>>> fetchManagedPlayers(
    AccountType accountType, {
    bool onlyApproved = false,
  }) async {
    _requireSupabase();
    if (accountType == AccountType.player) {
      throw const ApiException(
        'Player accounts cannot create invitation codes.',
        translationKey: 'inviteCodesOrganizationOnly',
      );
    }
    final client = Supabase.instance.client;
    final authId = _auth.authUserId;
    final legacyId = await _auth.legacyUserId();
    final organizationIds = {
      authId,
      legacyId,
    }.whereType<String>().where((value) => value.isNotEmpty).toList();

    final seen = <String>{};
    final players = <Map<String, dynamic>>[];

    final idFields = <String, List<String>>{
      'club': ['club_id', 'clubId', 'organizationId'],
      'academy': ['academy_id', 'academyId', 'organizationId'],
      'trainer': ['trainer_id', 'trainerId', 'organizationId'],
      'agent': ['agent_id', 'agentId', 'organizationId'],
      'marketer': ['organizationId'],
    };

    if (organizationIds.isNotEmpty) {
      for (final organizationId in organizationIds) {
        for (final field in idFields[accountType.value] ?? ['organizationId']) {
          try {
            final rows = await client
                .from('players')
                .select()
                .eq(field, organizationId);
            for (final row in rows) {
              final map = Map<String, dynamic>.from(row);
              final approvalStatus =
                  map['approval_status'] ?? map['status'] ?? 'approved';
              if (onlyApproved &&
                  (approvalStatus == 'pending' || map['is_pending'] == true)) {
                continue;
              }
              if (seen.add('${map['id']}')) players.add(map);
            }
          } catch (_) {}
        }

        // Also query player_join_requests table
        try {
          final rows = await client
              .from('player_join_requests')
              .select()
              .eq('organizationId', organizationId);
          for (final row in rows) {
            final map = Map<String, dynamic>.from(row);
            final status = map['status'] ?? 'pending';
            if (onlyApproved && status != 'approved') continue;

            final reqPlayerId = map['playerId'] ?? map['id'];
            final reqEmail = map['playerEmail'] ?? '';
            final reqPhone = map['playerPhone'] ?? '';

            Map<String, dynamic>? fullPlayerRecord;

            if (reqPlayerId != null && '$reqPlayerId'.isNotEmpty) {
              try {
                final pRes = await client
                    .from('players')
                    .select()
                    .eq('id', reqPlayerId)
                    .maybeSingle();
                if (pRes != null) {
                  fullPlayerRecord = Map<String, dynamic>.from(pRes);
                }
              } catch (_) {}
            }

            if (fullPlayerRecord == null && reqEmail.toString().isNotEmpty) {
              try {
                final pRes = await client
                    .from('players')
                    .select()
                    .eq('email', reqEmail)
                    .maybeSingle();
                if (pRes != null) {
                  fullPlayerRecord = Map<String, dynamic>.from(pRes);
                }
              } catch (_) {}
            }

            if (fullPlayerRecord == null && reqPhone.toString().isNotEmpty) {
              try {
                final pRes = await client
                    .from('players')
                    .select()
                    .eq('phone', reqPhone)
                    .maybeSingle();
                if (pRes != null) {
                  fullPlayerRecord = Map<String, dynamic>.from(pRes);
                }
              } catch (_) {}
            }

            final effectivePlayerId = fullPlayerRecord?['id'] ?? reqPlayerId;
            if (seen.add('$effectivePlayerId')) {
              final playerMap = <String, dynamic>{
                ...?fullPlayerRecord,
                'id': effectivePlayerId,
                'full_name':
                    fullPlayerRecord?['full_name'] ??
                    map['playerName'] ??
                    'لاعب جديد',
                'primary_position':
                    fullPlayerRecord?['primary_position'] ??
                    map['position'] ??
                    'لاعب',
                'approval_status': status,
                'status': status,
                'is_pending': status == 'pending',
                'requestedAt': map['requestedAt'],
                'join_code': map['referralCode'] ?? '',
              };
              players.add(playerMap);
            }
          }
        } catch (_) {}
      }
    }

    return players;
  }

  Future<void> approvePlayerJoinRequest({
    required String playerId,
    required AccountType accountType,
  }) async {
    _requireSupabase();
    final client = Supabase.instance.client;
    try {
      await client.rpc(
        'approve_organization_join',
        params: {'p_player_id': playerId},
      );
    } on PostgrestException {
      throw const ApiException(
        'The join request could not be approved.',
        translationKey: 'joinActionFailed',
      );
    }
  }

  Future<void> rejectPlayerJoinRequest({
    required String playerId,
    required AccountType accountType,
  }) async {
    _requireSupabase();
    final client = Supabase.instance.client;
    try {
      await client.rpc(
        'reject_organization_join',
        params: {'p_player_id': playerId},
      );
    } on PostgrestException {
      throw const ApiException(
        'The join request could not be rejected.',
        translationKey: 'joinActionFailed',
      );
    }
  }

  Future<Map<String, dynamic>> createInviteCode({
    required AccountType accountType,
    required String organizationName,
    required String description,
    int? maxUsage,
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
    final refId = 'ref_${DateTime.now().microsecondsSinceEpoch}_$code';
    final payload = <String, dynamic>{
      'id': refId,
      'organizationId': organizationId,
      'organizationType': accountType.value,
      'organizationName': organizationName,
      'referralCode': code,
      'inviteLink': '${AppConfig.webBaseUrl}/join/org/$code',
      'description': description.trim().isNotEmpty
          ? description.trim()
          : 'انضم إلى $organizationName',
      'isActive': true,
      'maxUsage': maxUsage,
      'currentUsage': 0,
      'createdAt': now,
      'updatedAt': now,
    };
    await client.from('organization_referrals').insert(payload);
    return payload;
  }

  Future<List<Map<String, dynamic>>> fetchAllInviteCodes() async {
    _requireSupabase();
    final client = Supabase.instance.client;
    final authId = _auth.authUserId;
    final legacyId = await _auth.legacyUserId();
    final organizationIds = {
      authId,
      legacyId,
    }.whereType<String>().where((value) => value.isNotEmpty).toList();

    try {
      if (organizationIds.isEmpty) return const [];

      final seen = <String>{};
      final list = <Map<String, dynamic>>[];
      for (final orgId in organizationIds) {
        final rows = await client
            .from('organization_referrals')
            .select()
            .eq('organizationId', orgId)
            .order('createdAt', ascending: false);
        for (final row in rows) {
          final map = Map<String, dynamic>.from(row);
          if (seen.add('${map['id']}')) list.add(map);
        }
      }
      return list;
    } catch (_) {
      return const [];
    }
  }

  Future<Map<String, dynamic>?> fetchExistingInviteCode() async {
    _requireSupabase();
    final client = Supabase.instance.client;
    final organizationId = _auth.authUserId;
    if (organizationId == null || organizationId.isEmpty) return null;

    try {
      final rows = await client
          .from('organization_referrals')
          .select()
          .eq('organizationId', organizationId)
          .eq('isActive', true)
          .order('createdAt', ascending: false)
          .limit(1);

      if (rows.isNotEmpty) {
        return Map<String, dynamic>.from(rows.first);
      }
    } catch (_) {}
    return null;
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

  Future<void> _enrichPlayerOrganization(
    SupabaseClient client,
    Map<String, dynamic> data,
  ) async {
    final organizationId = _firstNonEmpty([
      data['organizationId'],
      data['club_id'],
      data['clubId'],
      data['academy_id'],
      data['academyId'],
      data['trainer_id'],
      data['trainerId'],
      data['agent_id'],
      data['agentId'],
    ]);
    final organizationType = _firstNonEmpty([
      data['organizationType'],
      if (_hasValue(data['club_id']) || _hasValue(data['clubId'])) 'club',
      if (_hasValue(data['academy_id']) || _hasValue(data['academyId']))
        'academy',
      if (_hasValue(data['trainer_id']) || _hasValue(data['trainerId']))
        'trainer',
      if (_hasValue(data['agent_id']) || _hasValue(data['agentId'])) 'agent',
    ]);
    final storedName = _firstNonEmpty([
      data['organizationName'],
      data['club_name'],
      data['clubName'],
      data['academy_name'],
      data['academyName'],
      data['trainer_name'],
      data['trainerName'],
      data['agent_name'],
      data['agentName'],
    ]);
    if (organizationId.isEmpty && storedName.isEmpty) return;

    Map<String, dynamic>? organization;
    final table = switch (organizationType) {
      'club' => 'clubs',
      'academy' => 'academies',
      'trainer' => 'trainers',
      'agent' => 'agents',
      _ => '',
    };
    if (table.isNotEmpty && organizationId.isNotEmpty) {
      try {
        organization = await client
            .from(table)
            .select()
            .eq('id', organizationId)
            .maybeSingle();
        organization ??= await client
            .from(table)
            .select()
            .eq('uid', organizationId)
            .maybeSingle();
      } catch (_) {
        // Stored organization fields remain sufficient if directory RLS changes.
      }
    }

    var logo = _firstNonEmpty([
      organization?['profile_image'],
      organization?['profile_image_url'],
      organization?['logo'],
      organization?['photoURL'],
    ]);
    if (logo.isNotEmpty && !logo.startsWith('http')) {
      final buckets = switch (organizationType) {
        'academy' => ['academyavatar', 'academy-logos'],
        'trainer' => ['traineravatar', 'trainer-logos'],
        'agent' => ['agentavatar', 'agent-logos'],
        _ => ['clubavatar', 'club-logos'],
      };
      logo = client.storage.from(buckets.first).getPublicUrl(logo);
    }
    data['_organization'] = {
      'id': organizationId,
      'type': organizationType,
      'name': _firstNonEmpty([
        organization?['name'],
        organization?['full_name'],
        organization?['displayName'],
        storedName,
      ]),
      'logo': logo,
      'joinedViaReferral':
          data['joinedViaReferral'] == true ||
          _hasValue(data['referralCodeUsed']),
    };
  }

  Future<void> _resolvePlayerMedia(
    SupabaseClient client,
    Map<String, dynamic> data,
  ) async {
    const r2DevBase = 'https://pub-d4c7563dad1f41f3adf319c6a25a5f44.r2.dev';
    const supabaseBase =
        'https://mjuaefipdzxfqazzbyke.supabase.co/storage/v1/object/public';

    Future<Object?> resolve(Object? value) async {
      if (value is String) {
        var str = value.trim();
        if (str.isEmpty || str == 'null') return '';

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

        if (str.startsWith('https://') ||
            str.startsWith('http://') ||
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

        if (!str.startsWith('/')) {
          return '$r2DevBase/$str';
        }
        return '$r2DevBase$str';
      }
      if (value is List) return Future.wait(value.map(resolve));
      if (value is Map) {
        final result = Map<String, dynamic>.from(value);
        for (final key in [
          'url',
          'video_url',
          'videoUrl',
          'src',
          'uri',
          'path',
          'thumbnail',
        ]) {
          if (result.containsKey(key)) result[key] = await resolve(result[key]);
        }
        return result;
      }
      return value;
    }

    for (final key in [
      'profile_image_url',
      'profile_image',
      'image',
      'avatar',
      'additional_images',
      'images',
      'gallery',
      'photos',
      'videos',
      'video_urls',
      'youtube_links',
      'documents',
      'documents_urls',
    ]) {
      if (data.containsKey(key)) data[key] = await resolve(data[key]);
    }
  }

  static bool _hasValue(Object? value) =>
      value != null && '$value'.trim().isNotEmpty && '$value' != 'null';

  static String _firstNonEmpty(
    Iterable<Object?> values, {
    String fallback = '',
  }) {
    for (final value in values) {
      if (_hasValue(value)) return '$value'.trim();
    }
    return fallback;
  }

  Future<void> joinOrganizationByCode(String rawInput) async {
    _requireSupabase();
    final accountType = await _auth.savedAccountType();
    if (accountType != AccountType.player) {
      throw const ApiException(
        'Only player accounts can request to join an organization.',
        translationKey: 'playerOnlyJoin',
      );
    }

    final normalizedCode = rawInput.trim().toUpperCase().replaceAll(
      RegExp(r'\s+'),
      '',
    );
    final effectiveCode = _extractCodeFromInput(normalizedCode);
    if (effectiveCode.isEmpty) {
      throw const ApiException(
        'The invitation code is required.',
        translationKey: 'invalidOrgCode',
      );
    }

    final client = Supabase.instance.client;
    if (_auth.authUserId == null || _auth.authUserId!.isEmpty) {
      throw const ApiException(
        'Authentication required.',
        translationKey: 'accountLookupUnavailable',
      );
    }

    try {
      final response = await client.rpc(
        'request_organization_join',
        params: {'p_referral_code': effectiveCode},
      );
      final result = response is Map
          ? Map<String, dynamic>.from(response)
          : const <String, dynamic>{};
      if (result['ok'] != true) {
        throw _joinRequestException(result['code']?.toString());
      }
    } on PostgrestException catch (error) {
      throw _joinRequestException(error.message);
    }
  }

  ApiException _joinRequestException(String? code) {
    final normalized = (code ?? '').toUpperCase();
    final translationKey = switch (normalized) {
      'PLAYER_ACCOUNT_REQUIRED' => 'playerOnlyJoin',
      'INVALID_INVITATION_CODE' ||
      'INVITATION_EXPIRED' ||
      'INVITATION_LIMIT_REACHED' => 'invalidOrgCode',
      'ALREADY_AFFILIATED' => 'alreadyAffiliated',
      'JOIN_REQUEST_ALREADY_PENDING' => 'joinRequestAlreadyPending',
      _ => 'joinServiceUnavailable',
    };
    return ApiException(
      code ?? 'The organization join request could not be completed.',
      code: code,
      translationKey: translationKey,
    );
  }

  Future<void> deleteReferralCode(String referralId) async {
    _requireSupabase();
    final client = Supabase.instance.client;

    // 1. Fetch referral record — try by UUID id first, then by referralCode string
    Map<String, dynamic>? refRow;

    try {
      final res = await client
          .from('organization_referrals')
          .select()
          .eq('id', referralId)
          .maybeSingle();
      if (res != null) refRow = Map<String, dynamic>.from(res);
    } catch (_) {}

    if (refRow == null) {
      try {
        final res = await client
            .from('organization_referrals')
            .select()
            .eq('referralCode', referralId)
            .maybeSingle();
        if (res != null) refRow = Map<String, dynamic>.from(res);
      } catch (_) {}
    }

    if (refRow == null) {
      throw Exception('كود الدعوة غير موجود أو تم حذفه سابقاً.');
    }

    final dbId = '${refRow['id']}';
    final code = '${refRow['referralCode'] ?? refRow['code'] ?? ''}';
    final currentUsage = (refRow['currentUsage'] as num? ?? 0).toInt();

    // 2. Count players linked to this code
    var linkedCount = currentUsage;
    if (code.isNotEmpty) {
      try {
        final pRows = await client
            .from('players')
            .select('id')
            .eq('referralCodeUsed', code);
        if (pRows.length > linkedCount) linkedCount = pRows.length;
      } catch (_) {}

      try {
        final reqRows = await client
            .from('player_join_requests')
            .select('id')
            .eq('referralCode', code);
        linkedCount += reqRows.length;
      } catch (_) {}
    }

    // 3. Block deletion if players are linked
    if (linkedCount > 0) {
      throw Exception(
        'لا يمكن حذف كود الدعوة لأنه مرتبط بالفعل بـ $linkedCount لاعب(ين) مسجلين عبره.',
      );
    }

    // 4. Delete using the real DB uuid id (most reliable)
    await client.from('organization_referrals').delete().eq('id', dbId);
  }

  Future<Map<String, dynamic>?> fetchJoinedOrganization() async {
    _requireSupabase();
    final client = Supabase.instance.client;
    final userId = _auth.authUserId ?? await _auth.legacyUserId();
    if (userId == null || userId.isEmpty) return null;

    // 1. Try reading from local storage for 0ms loading
    try {
      const storage = FlutterSecureStorage();
      final local = await storage.read(key: 'player_organization_$userId');
      if (local != null && local.isNotEmpty) {
        final map = Map<String, dynamic>.from(jsonDecode(local));
        if (map['name'] != null && map['name'].toString().isNotEmpty) {
          return map;
        }
      }
    } catch (_) {}

    // 2. Query players table
    try {
      final rows = await client
          .from('players')
          .select(
            'organizationId, organizationType, organization_name, referralCodeUsed, joinedAt',
          )
          .eq('id', userId)
          .limit(1);

      if (rows.isNotEmpty) {
        final row = Map<String, dynamic>.from(rows.first);
        final orgName = row['organization_name']?.toString() ?? '';
        if (orgName.isNotEmpty) {
          return {
            'id': row['organizationId'] ?? '',
            'type': row['organizationType'] ?? 'academy',
            'name': orgName,
            'code': row['referralCodeUsed'] ?? '',
            'joinedAt': row['joinedAt'] ?? '',
          };
        }
      }
    } catch (_) {}

    return null;
  }

  /// Extracts clean referral code from any input (plain code or URL)
  static String _extractCodeFromInput(String input) {
    final trimmed = input.trim();
    if (trimmed.isEmpty) return '';

    // Try as URL first
    try {
      final uri = Uri.parse(trimmed);
      if (uri.scheme.startsWith('http')) {
        // ?code=XXXX query param
        final codeParam = uri.queryParameters['code']?.trim().toUpperCase();
        if (codeParam != null && codeParam.isNotEmpty) return codeParam;
        // /join/org/XXXX path segment
        final segments = uri.pathSegments;
        for (int i = segments.length - 1; i >= 0; i--) {
          final seg = segments[i].toUpperCase();
          if (seg.length >= 4 && seg != 'JOIN' && seg != 'ORG') return seg;
        }
      }
    } catch (_) {}

    // Plain code - just return trimmed uppercase
    return trimmed.toUpperCase().replaceAll(RegExp(r'\s+'), '');
  }

  /// Keep for backwards-compat with profile screen paste button
  static String parseReferralCodeInput(String raw) =>
      _extractCodeFromInput(raw);

  Future<List<ChatContact>> fetchChatContacts({String? accountType}) async {
    _requireSupabase();
    final client = Supabase.instance.client;
    final currentUserId = _auth.authUserId ?? await _auth.legacyUserId() ?? '';
    const sources = <String, String>{
      'player': 'players',
      'club': 'clubs',
      'academy': 'academies',
      'trainer': 'trainers',
      'agent': 'agents',
      'marketer': 'marketers',
    };
    final selectedSources = accountType == null || accountType == 'all'
        ? sources.entries
        : sources.entries.where((entry) => entry.key == accountType);
    final contacts = <ChatContact>[];
    final seen = <String>{};

    for (final source in selectedSources) {
      try {
        final rows = await client.from(source.value).select().limit(150);
        for (final raw in rows) {
          final row = Map<String, dynamic>.from(raw);
          final id = _firstNonEmpty([row['uid'], row['id']]);
          if (id.isEmpty || id == currentUserId || !seen.add(id)) continue;
          final name = _firstNonEmpty([
            row['full_name'],
            row['name'],
            row['displayName'],
            row['club_name'],
            row['academy_name'],
          ]);
          if (name.isEmpty) continue;
          final avatar = _firstNonEmpty([
            row['profile_image_url'],
            row['profile_image'],
            row['image'],
            row['logoUrl'],
            row['logo_url'],
          ]);
          contacts.add(
            ChatContact(
              id: id,
              name: name,
              accountType: source.key,
              country: _firstNonEmpty([row['country'], row['nationality']]),
              city: _firstNonEmpty([row['city'], row['region']]),
              detail: _firstNonEmpty([
                row['primary_position'],
                row['position'],
                row['specialization'],
                row['coaching_level'],
                row['description'],
              ]),
              avatarUrl: avatar.startsWith('http') ? avatar : '',
              isVerified:
                  row['isVerified'] == true ||
                  row['is_verified'] == true ||
                  '${row['verificationStatus'] ?? ''}'.toLowerCase() ==
                      'verified',
            ),
          );
        }
      } catch (_) {
        // A missing optional account table must not break the whole directory.
      }
    }

    contacts.sort((left, right) {
      if (left.isVerified != right.isVerified) return left.isVerified ? -1 : 1;
      return left.name.toLowerCase().compareTo(right.name.toLowerCase());
    });
    return contacts;
  }

  Future<ConversationModel> startOrCreateConversation({
    required String targetId,
    required String targetName,
    required String targetType,
    String? targetAvatar,
  }) async {
    _requireSupabase();
    final client = Supabase.instance.client;
    final senderId =
        _auth.authUserId ?? await _auth.legacyUserId() ?? 'user_anonymous';
    final senderName = _auth.currentDisplayName.isNotEmpty
        ? _auth.currentDisplayName
        : 'User';
    final senderType = (await _auth.savedAccountType())?.value ?? 'player';

    // 1. Check if conversation already exists between participants
    try {
      final jsonArray = jsonEncode([senderId]);
      final res = await client
          .from('conversations')
          .select()
          .filter('participants', 'cs', jsonArray)
          .limit(20);

      if (res.isNotEmpty) {
        for (final row in res) {
          final map = Map<String, dynamic>.from(row);
          final parts = List<String>.from(map['participants'] ?? []);
          if (parts.contains(targetId)) {
            return ConversationModel.fromJson(map);
          }
        }
      }
    } catch (_) {}

    // 2. Create new conversation record
    final now = DateTime.now().toUtc();
    final subId = senderId.length > 6 ? senderId.substring(0, 6) : senderId;
    final convId = 'conv_${DateTime.now().millisecondsSinceEpoch}_$subId';

    final payload = {
      'id': convId,
      'participants': [senderId, targetId],
      'participantNames': {senderId: senderName, targetId: targetName},
      'participantTypes': {senderId: senderType, targetId: targetType},
      'participantAvatars': {senderId: '', targetId: targetAvatar ?? ''},
      'lastMessage': '',
      'lastMessageTime': now.toIso8601String(),
      'lastSenderId': senderId,
      'unreadCount': {senderId: 0, targetId: 0},
      'updatedAt': now.toIso8601String(),
    };

    try {
      final inserted = await client
          .from('conversations')
          .insert(payload)
          .select()
          .single();
      return ConversationModel.fromJson(Map<String, dynamic>.from(inserted));
    } catch (_) {
      // Local fallback conversation model so chat opens seamlessly 100% of the time!
      return ConversationModel(
        id: convId,
        participants: [senderId, targetId],
        participantNames: {senderId: senderName, targetId: targetName},
        participantTypes: {senderId: senderType, targetId: targetType},
        participantAvatars: {senderId: '', targetId: targetAvatar ?? ''},
        subject: 'General Chat',
        lastMessage: '',
        lastMessageTime: now,
        lastSenderId: senderId,
        unreadCount: {senderId: 0, targetId: 0},
        updatedAt: now,
      );
    }
  }

  Future<List<ConversationModel>> fetchConversations() async {
    _requireSupabase();
    final client = Supabase.instance.client;
    final userId = _auth.authUserId ?? await _auth.legacyUserId() ?? '';
    if (userId.isEmpty) return const [];

    try {
      final jsonArray = jsonEncode([userId]);
      final res = await client
          .from('conversations')
          .select()
          .filter('participants', 'cs', jsonArray)
          .order('updatedAt', ascending: false);
      return (res as List)
          .map((e) => ConversationModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (_) {
      try {
        final res = await client
            .from('conversations')
            .select()
            .order('updatedAt', ascending: false)
            .limit(30);
        return (res as List)
            .map(
              (e) => ConversationModel.fromJson(Map<String, dynamic>.from(e)),
            )
            .where((conv) => conv.participants.contains(userId))
            .toList();
      } catch (_) {
        return const [];
      }
    }
  }

  Future<List<ChatMessageModel>> fetchMessages(String conversationId) async {
    _requireSupabase();
    final client = Supabase.instance.client;
    try {
      final res = await client
          .from('messages')
          .select()
          .eq('conversationId', conversationId)
          .order('timestamp', ascending: false)
          .limit(100);
      return (res as List)
          .map((e) => ChatMessageModel.fromJson(e))
          .toList()
          .reversed
          .toList();
    } catch (_) {
      try {
        final res2 = await client
            .from('messages')
            .select()
            .eq('conversation_id', conversationId)
            .order('created_at', ascending: false)
            .limit(100);
        return (res2 as List)
            .map((e) => ChatMessageModel.fromJson(e))
            .toList()
            .reversed
            .toList();
      } catch (_) {
        return const [];
      }
    }
  }

  Future<void> sendMessage({
    required String conversationId,
    required String receiverId,
    required String receiverName,
    required String receiverType,
    required String message,
    String messageType = 'text',
    String imageUrl = '',
    String voiceUrl = '',
    int voiceDuration = 0,
  }) async {
    _requireSupabase();
    final client = Supabase.instance.client;
    final senderId = _auth.authUserId ?? await _auth.legacyUserId() ?? '';
    final senderType = (await _auth.savedAccountType())?.value ?? 'player';
    final now = DateTime.now().toUtc().toIso8601String();

    final payload = {
      'conversationId': conversationId,
      'senderId': senderId,
      'receiverId': receiverId,
      'senderName': _auth.currentDisplayName.isNotEmpty
          ? _auth.currentDisplayName
          : 'User',
      'receiverName': receiverName,
      'senderType': senderType,
      'receiverType': receiverType,
      'message': message,
      'messageType': messageType,
      'imageUrl': imageUrl.isEmpty ? null : imageUrl,
      'voiceUrl': voiceUrl.isEmpty ? null : voiceUrl,
      'voiceDuration': voiceDuration,
      'deliveryStatus': 'sent',
      'timestamp': now,
      'isRead': false,
    };

    await client.from('messages').insert(payload);

    try {
      await client
          .from('conversations')
          .update({
            'lastMessage': message,
            'lastMessageTime': now,
            'lastSenderId': senderId,
            'updatedAt': now,
          })
          .eq('id', conversationId);
    } catch (_) {}

    try {
      InAppNotificationService().playChatSound();
    } catch (_) {}
  }

  Future<String> uploadChatMedia({
    required String conversationId,
    required List<int> bytes,
    required String extension,
    required String contentType,
  }) async {
    _requireSupabase();
    final client = Supabase.instance.client;
    final senderId = _auth.authUserId ?? await _auth.legacyUserId() ?? '';
    if (senderId.isEmpty) {
      throw const ApiException(
        'A signed-in user is required.',
        translationKey: 'sessionCreationFailed',
      );
    }
    final safeExtension = extension.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '');
    final path =
        'chat/$conversationId/$senderId/${DateTime.now().microsecondsSinceEpoch}.${safeExtension.isEmpty ? 'bin' : safeExtension}';
    await client.storage
        .from('documents')
        .uploadBinary(
          path,
          Uint8List.fromList(bytes),
          fileOptions: FileOptions(contentType: contentType, upsert: false),
        );
    return client.storage.from('documents').getPublicUrl(path);
  }

  RealtimeChannel subscribeToMessages(
    String conversationId,
    void Function(ChatMessageModel message) onMessage,
  ) {
    _requireSupabase();
    final client = Supabase.instance.client;
    final channel = client.channel('public:messages:$conversationId')
      ..onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'messages',
        filter: PostgresChangeFilter(
          type: PostgresChangeFilterType.eq,
          column: 'conversationId',
          value: conversationId,
        ),
        callback: (payload) {
          if (payload.newRecord.isNotEmpty) {
            onMessage(ChatMessageModel.fromJson(payload.newRecord));
          }
        },
      )
      ..subscribe();
    return channel;
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
