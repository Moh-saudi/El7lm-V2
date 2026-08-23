class LocationCountry {
  const LocationCountry({
    required this.iso2,
    required this.name,
    this.nameAr,
    this.phoneCode,
    this.flagEmoji,
  });

  final String iso2;
  final String name;
  final String? nameAr;
  final String? phoneCode;
  final String? flagEmoji;

  factory LocationCountry.fromJson(Map<String, dynamic> json) =>
      LocationCountry(
        iso2: '${json['iso2'] ?? ''}',
        name: '${json['name'] ?? ''}',
        nameAr: json['name_ar']?.toString(),
        phoneCode: json['phone_code']?.toString(),
        flagEmoji: json['flag_emoji']?.toString(),
      );

  Map<String, dynamic> toJson() => {
    'iso2': iso2,
    'name': name,
    'name_ar': nameAr,
    'phone_code': phoneCode,
    'flag_emoji': flagEmoji,
  };
}

class LocationRegion {
  const LocationRegion({
    required this.geonameId,
    required this.countryIso2,
    required this.name,
    this.nameAr,
  });

  final int geonameId;
  final String countryIso2;
  final String name;
  final String? nameAr;

  factory LocationRegion.fromJson(Map<String, dynamic> json) => LocationRegion(
    geonameId: (json['geoname_id'] as num).toInt(),
    countryIso2: '${json['country_iso2'] ?? ''}',
    name: '${json['name'] ?? ''}',
    nameAr: json['name_ar']?.toString(),
  );
}

class LocationCity {
  const LocationCity({
    required this.geonameId,
    required this.countryIso2,
    required this.name,
    required this.population,
    this.nameAr,
    this.regionGeonameId,
  });

  final int geonameId;
  final String countryIso2;
  final String name;
  final String? nameAr;
  final int? regionGeonameId;
  final int population;

  factory LocationCity.fromJson(Map<String, dynamic> json) => LocationCity(
    geonameId: (json['geoname_id'] as num).toInt(),
    countryIso2: '${json['country_iso2'] ?? ''}',
    name: '${json['name'] ?? ''}',
    nameAr: json['name_ar']?.toString(),
    regionGeonameId: (json['region_geoname_id'] as num?)?.toInt(),
    population: (json['population'] as num? ?? 0).toInt(),
  );
}
