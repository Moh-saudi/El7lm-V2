import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/app_theme.dart';
import '../../l10n/app_localizations.dart';
import '../../models/chat_message.dart';
import '../../models/conversation.dart';
import '../../services/data_service.dart';
import '../../services/in_app_notification_service.dart';

class ChatDetailScreen extends StatefulWidget {
  const ChatDetailScreen({
    super.key,
    required this.conversation,
    required this.targetId,
    required this.targetName,
    required this.targetType,
    required this.dataService,
  });

  final ConversationModel conversation;
  final String targetId;
  final String targetName;
  final String targetType;
  final DataService dataService;

  @override
  State<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends State<ChatDetailScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  final List<ChatMessageModel> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;
  RealtimeChannel? _subscription;

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _subscribeRealtime();

    // Safety fallback so loading spinner never hangs!
    Future.delayed(const Duration(milliseconds: 600), () {
      if (mounted && _isLoading) {
        setState(() => _isLoading = false);
      }
    });
  }

  Future<void> _loadMessages() async {
    try {
      final list = await widget.dataService.fetchMessages(
        widget.conversation.id,
      );
      if (mounted) {
        setState(() {
          _messages.clear();
          _messages.addAll(list);
          _isLoading = false;
        });
        _scrollToBottom();
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _subscribeRealtime() {
    _subscription = widget.dataService.subscribeToMessages(
      widget.conversation.id,
      (newMessage) {
        if (!mounted) return;
        if (!_messages.any((m) => m.id == newMessage.id)) {
          setState(() => _messages.add(newMessage));
          _scrollToBottom();
          InAppNotificationService().playChatSound();
        }
      },
    );
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty || _isSending) return;

    final currentUserId = widget.dataService.authService.authUserId ?? 'me';
    final now = DateTime.now();

    // 1. Optimistic instant message creation
    final optimisticMsg = ChatMessageModel(
      id: 'msg_${now.millisecondsSinceEpoch}',
      conversationId: widget.conversation.id,
      senderId: currentUserId,
      receiverId: widget.targetId,
      senderName: 'Me',
      receiverName: widget.targetName,
      senderType: 'user',
      receiverType: widget.targetType,
      message: text,
      timestamp: now,
      isRead: false,
    );

    _messageController.clear();
    setState(() {
      _messages.add(optimisticMsg);
      _isSending = false;
    });
    _scrollToBottom();
    InAppNotificationService().playChatSound();

    // 2. Async send to Supabase
    try {
      await widget.dataService.sendMessage(
        conversationId: widget.conversation.id,
        receiverId: widget.targetId,
        receiverName: widget.targetName,
        receiverType: widget.targetType,
        message: text,
      );
    } catch (_) {}
  }

  @override
  void dispose() {
    _subscription?.unsubscribe();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currentUserId = widget.dataService.authService.authUserId ?? '';
    final badgeInfo = _getAccountTypeBadge(widget.targetType);

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Row(
          children: [
            CircleAvatar(
              backgroundColor: badgeInfo.color.withValues(alpha: .15),
              child: Text(
                widget.targetName.isNotEmpty
                    ? widget.targetName[0].toUpperCase()
                    : '?',
                style: TextStyle(
                  color: badgeInfo.color,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.targetName,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Row(
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        decoration: const BoxDecoration(
                          color: AppColors.green,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'نشط الآن • ${badgeInfo.label}',
                        style: TextStyle(
                          fontSize: 11,
                          color: badgeInfo.color,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.chat_bubble_outline_rounded,
                              size: 56,
                              color: AppColors.muted,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              context.trOr(
                                'noMessagesYet',
                                'No messages yet. Start the conversation!',
                              ),
                              style: const TextStyle(color: AppColors.muted),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[index];
                          final isMe =
                              msg.senderId == currentUserId ||
                              msg.senderId == 'me';
                          return _ChatBubble(message: msg, isMe: isMe);
                        },
                      ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: .06),
                  blurRadius: 10,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
                      decoration: InputDecoration(
                        hintText: context.trOr(
                          'typeMessage',
                          'Type a message...',
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        filled: true,
                        fillColor: AppColors.muted.withValues(alpha: 0.12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.green,
                      foregroundColor: Colors.white,
                      shape: const CircleBorder(),
                      padding: const EdgeInsets.all(12),
                    ),
                    onPressed: _sendMessage,
                    icon: const Icon(Icons.send_rounded, size: 20),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  _BadgeInfo _getAccountTypeBadge(String type) {
    return switch (type.toLowerCase()) {
      'club' => const _BadgeInfo(label: 'نادي ⚽', color: Color(0xFF2563EB)),
      'academy' => const _BadgeInfo(
        label: 'أكاديمية 🏆',
        color: Color(0xFFD97706),
      ),
      'trainer' => const _BadgeInfo(
        label: 'مدرب 👟',
        color: Color(0xFF7C3AED),
      ),
      'agent' => const _BadgeInfo(label: 'وكيل 💼', color: Color(0xFFDC2626)),
      'marketer' => const _BadgeInfo(
        label: 'مسوق 📣',
        color: Color(0xFF059669),
      ),
      _ => const _BadgeInfo(label: 'لاعب 🏃', color: AppColors.green),
    };
  }
}

class _BadgeInfo {
  const _BadgeInfo({required this.label, required this.color});
  final String label;
  final Color color;
}

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({required this.message, required this.isMe});

  final ChatMessageModel message;
  final bool isMe;

  @override
  Widget build(BuildContext context) {
    final ts = message.timestamp ?? DateTime.now();
    final timeStr =
        '${ts.hour.toString().padLeft(2, '0')}:${ts.minute.toString().padLeft(2, '0')}';

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        decoration: BoxDecoration(
          color: isMe ? AppColors.green : const Color(0xFFE2E8F0),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isMe ? 16 : 4),
            bottomRight: Radius.circular(isMe ? 4 : 16),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment:
              isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Text(
              message.message,
              style: TextStyle(
                color: isMe ? Colors.white : AppColors.ink,
                fontSize: 15,
                height: 1.3,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  timeStr,
                  style: TextStyle(
                    fontSize: 10,
                    color: isMe
                        ? Colors.white.withValues(alpha: 0.75)
                        : AppColors.muted,
                  ),
                ),
                if (isMe) ...[
                  const SizedBox(width: 4),
                  Icon(
                    message.isRead ? Icons.done_all_rounded : Icons.done_rounded,
                    size: 14,
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
