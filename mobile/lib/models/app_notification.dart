class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.isRead,
    required this.createdAt,
    required this.sourceTable,
    this.type,
    this.actionUrl,
    this.priority,
    this.metadata,
  });

  final String id;
  final String title;
  final String message;
  final bool isRead;
  final DateTime? createdAt;
  final String sourceTable;
  final String? type;
  final String? actionUrl;
  final String? priority;
  final Map<String, dynamic>? metadata;

  factory AppNotification.fromJson(
    Map<String, dynamic> json, {
    required String sourceTable,
  }) {
    final meta = json['metadata'] is Map
        ? Map<String, dynamic>.from(json['metadata'] as Map)
        : null;
    final action = json['actionUrl']?.toString() ??
        json['link']?.toString() ??
        meta?['actionUrl']?.toString();

    return AppNotification(
      id: '${json['id'] ?? ''}',
      title: '${json['title'] ?? json['type'] ?? ''}',
      message: '${json['message'] ?? json['body'] ?? ''}',
      isRead: json['isRead'] == true || json['read'] == true,
      createdAt: DateTime.tryParse(
        '${json['createdAt'] ?? json['sentAt'] ?? ''}',
      ),
      sourceTable: sourceTable,
      type: json['type']?.toString(),
      actionUrl: (action != null && action.trim().isNotEmpty) ? action.trim() : null,
      priority: json['priority']?.toString(),
      metadata: meta,
    );
  }
}
