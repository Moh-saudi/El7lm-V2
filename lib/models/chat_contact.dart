class ChatContact {
  const ChatContact({
    required this.id,
    required this.name,
    required this.accountType,
    required this.country,
    required this.city,
    required this.detail,
    required this.avatarUrl,
    required this.isVerified,
  });

  final String id;
  final String name;
  final String accountType;
  final String country;
  final String city;
  final String detail;
  final String avatarUrl;
  final bool isVerified;

  bool matches(String query) {
    final normalized = query.trim().toLowerCase();
    if (normalized.isEmpty) return true;
    return [
      name,
      accountType,
      country,
      city,
      detail,
    ].any((value) => value.toLowerCase().contains(normalized));
  }
}
