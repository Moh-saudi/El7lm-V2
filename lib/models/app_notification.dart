class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.isRead,
    required this.createdAt,
    required this.sourceTable,
    this.type,
  });

  final String id;
  final String title;
  final String message;
  final bool isRead;
  final DateTime? createdAt;
  final String sourceTable;
  final String? type;

  factory AppNotification.fromJson(
    Map<String, dynamic> json, {
    required String sourceTable,
  }) {
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
    );
  }
}
