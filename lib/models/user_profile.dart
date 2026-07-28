class UserProfile {
  UserProfile({
    required this.userId,
    required this.accountType,
    required this.values,
  });

  final String userId;
  final String accountType;

  /// Full server payload. Unknown and future fields are retained here and
  /// merged back on save so the mobile client never truncates web data.
  final Map<String, dynamic> values;

  String value(String key, [String fallback = '']) =>
      '${values[key] ?? fallback}';

  Map<String, dynamic> mergeUpdates(Map<String, dynamic> updates) => {
    ...values,
    ...updates,
    'updatedAt': DateTime.now().toUtc().toIso8601String(),
  };
}
