class ConversationModel {
  const ConversationModel({
    required this.id,
    required this.participants,
    required this.participantNames,
    required this.participantTypes,
    required this.participantAvatars,
    required this.subject,
    required this.lastMessage,
    required this.lastMessageTime,
    required this.lastSenderId,
    required this.unreadCount,
    required this.updatedAt,
  });

  final String id;
  final List<String> participants;
  final Map<String, String> participantNames;
  final Map<String, String> participantTypes;
  final Map<String, String> participantAvatars;
  final String subject;
  final String lastMessage;
  final DateTime? lastMessageTime;
  final String lastSenderId;
  final Map<String, dynamic> unreadCount;
  final DateTime? updatedAt;

  factory ConversationModel.fromJson(Map<String, dynamic> json) {
    final participantsList = (json['participants'] as List?)?.map((e) => e.toString()).toList() ?? [];
    final names = json['participantNames'] is Map
        ? Map<String, String>.from(json['participantNames'].map((k, v) => MapEntry(k.toString(), v.toString())))
        : <String, String>{};
    final types = json['participantTypes'] is Map
        ? Map<String, String>.from(json['participantTypes'].map((k, v) => MapEntry(k.toString(), v.toString())))
        : <String, String>{};
    final avatars = json['participantAvatars'] is Map
        ? Map<String, String>.from(json['participantAvatars'].map((k, v) => MapEntry(k.toString(), v.toString())))
        : <String, String>{};

    return ConversationModel(
      id: '${json['id'] ?? ''}',
      participants: participantsList,
      participantNames: names,
      participantTypes: types,
      participantAvatars: avatars,
      subject: '${json['subject'] ?? ''}',
      lastMessage: '${json['lastMessage'] ?? ''}',
      lastMessageTime: DateTime.tryParse('${json['lastMessageTime'] ?? json['updatedAt'] ?? ''}'),
      lastSenderId: '${json['lastSenderId'] ?? ''}',
      unreadCount: json['unreadCount'] is Map ? Map<String, dynamic>.from(json['unreadCount']) : {},
      updatedAt: DateTime.tryParse('${json['updatedAt'] ?? ''}'),
    );
  }
}
