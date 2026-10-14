import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/location_catalog.dart';

class LocationCatalogService {
  LocationCatalogService({SupabaseClient? client})
    : _client = client ?? Supabase.instance.client;

  final SupabaseClient _client;
  static List<LocationCountry>? _memoryCountries;
  static const _countriesCacheKey = 'location_catalog_countries_v1';
  static const _countriesCacheTimeKey = 'location_catalog_countries_time_v1';

  Future<List<LocationCountry>> countries() async {
    if (_memoryCountries case final cached?) return cached;
    final preferences = await SharedPreferences.getInstance();
    final cachedAt = DateTime.tryParse(
      preferences.getString(_countriesCacheTimeKey) ?? '',
    );
    final cachedJson = preferences.getString(_countriesCacheKey);
    if (cachedAt != null &&
        DateTime.now().difference(cachedAt) < const Duration(days: 7) &&
        cachedJson != null) {
      final decoded = jsonDecode(cachedJson) as List;
      return _memoryCountries = decoded
          .map((item) => LocationCountry.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList(growable: false);
    }
    final rows = await _client
        .from('location_countries')
        .select('iso2,name,name_ar,phone_code,flag_emoji')
        .eq('is_active', true)
        .order('name');
    final result = rows
        .map((row) => LocationCountry.fromJson(Map<String, dynamic>.from(row)))
        .toList(growable: false);
    _memoryCountries = result;
    await preferences.setString(
      _countriesCacheKey,
      jsonEncode(result.map((item) => item.toJson()).toList()),
    );
    await preferences.setString(
      _countriesCacheTimeKey,
      DateTime.now().toIso8601String(),
    );
    return result;
  }

  Future<List<LocationRegion>> regions(String countryIso2) async {
    final rows = await _client
        .from('location_regions')
        .select('geoname_id,country_iso2,name,name_ar')
        .eq('country_iso2', countryIso2.toUpperCase())
        .order('name');
    return rows
        .map((row) => LocationRegion.fromJson(Map<String, dynamic>.from(row)))
        .toList(growable: false);
  }

  Future<List<LocationCity>> cities({
    required String countryIso2,
    int? regionGeonameId,
    String query = '',
    int limit = 50,
    int offset = 0,
  }) async {
    final rows = await _client.rpc<List<dynamic>>(
      'search_location_cities',
      params: {
        'p_country_iso2': countryIso2.toUpperCase(),
        'p_query': query.trim(),
        'p_region_geoname_id': regionGeonameId,
        'p_limit': limit.clamp(1, 100),
        'p_offset': offset < 0 ? 0 : offset,
      },
    );
    return rows
        .map((row) => LocationCity.fromJson(Map<String, dynamic>.from(row as Map)))
        .toList(growable: false);
  }
}
