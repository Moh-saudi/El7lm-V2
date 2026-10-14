class ChatMessageModel {
  const ChatMessageModel({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.receiverId,
    required this.senderName,
    required this.receiverName,
    required this.senderType,
    required this.receiverType,
    required this.message,
    required this.timestamp,
    required this.isRead,
    this.messageType = 'text',
    this.imageUrl = '',
    this.voiceUrl = '',
    this.voiceDuration = 0,
    this.deliveryStatus = 'sent',
  });

  final String id;
  final String conversationId;
  final String senderId;
  final String receiverId;
  final String senderName;
  final String receiverName;
  final String senderType;
  final String receiverType;
  final String message;
  final DateTime? timestamp;
  final bool isRead;
  final String messageType;
  final String imageUrl;
  final String voiceUrl;
  final int voiceDuration;
  final String deliveryStatus;

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    return ChatMessageModel(
      id: '${json['id'] ?? ''}',
      conversationId:
          '${json['conversationId'] ?? json['conversation_id'] ?? ''}',
      senderId: '${json['senderId'] ?? json['sender_id'] ?? ''}',
      receiverId: '${json['receiverId'] ?? json['receiver_id'] ?? ''}',
      senderName: '${json['senderName'] ?? json['sender_name'] ?? ''}',
      receiverName: '${json['receiverName'] ?? json['receiver_name'] ?? ''}',
      senderType: '${json['senderType'] ?? json['sender_type'] ?? ''}',
      receiverType: '${json['receiverType'] ?? json['receiver_type'] ?? ''}',
      message: '${json['message'] ?? ''}',
      timestamp: DateTime.tryParse(
        '${json['timestamp'] ?? json['created_at'] ?? ''}',
      ),
      isRead: json['isRead'] == true || json['is_read'] == true,
      messageType: '${json['messageType'] ?? json['message_type'] ?? 'text'}',
      imageUrl: '${json['imageUrl'] ?? json['image_url'] ?? ''}',
      voiceUrl: '${json['voiceUrl'] ?? json['voice_url'] ?? ''}',
      voiceDuration:
          (json['voiceDuration'] as num? ?? json['voice_duration'] as num? ?? 0)
              .toInt(),
      deliveryStatus:
          '${json['deliveryStatus'] ?? json['delivery_status'] ?? 'sent'}',
    );
  }
}
