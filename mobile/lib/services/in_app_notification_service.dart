import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../core/app_theme.dart';
import '../models/app_notification.dart';

class InAppNotificationService {
  factory InAppNotificationService() => _instance;
  InAppNotificationService._internal() {
    _loadSettings();
  }
  static final InAppNotificationService _instance =
      InAppNotificationService._internal();

  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final AudioPlayer _audioPlayer = AudioPlayer();

  bool chatSoundEnabled = true;
  bool notificationSoundEnabled = true;
  bool inAppPopupEnabled = true;

  static const profileReminderSource = 'local_profile_reminder';
  static const _profileReminderKey = 'profile_completion_notification';

  Future<void> _loadSettings() async {
    try {
      final chatS = await _storage.read(key: 'setting_chat_sound');
      if (chatS != null) chatSoundEnabled = chatS == 'true';

      final notifS = await _storage.read(key: 'setting_notif_sound');
      if (notifS != null) notificationSoundEnabled = notifS == 'true';

      final popupS = await _storage.read(key: 'setting_inapp_popup');
      if (popupS != null) inAppPopupEnabled = popupS == 'true';
    } catch (_) {}
  }

  Future<void> setChatSoundEnabled(bool enabled) async {
    chatSoundEnabled = enabled;
    await _storage.write(key: 'setting_chat_sound', value: '$enabled');
  }

  Future<void> setNotificationSoundEnabled(bool enabled) async {
    notificationSoundEnabled = enabled;
    await _storage.write(key: 'setting_notif_sound', value: '$enabled');
  }

  Future<void> setInAppPopupEnabled(bool enabled) async {
    inAppPopupEnabled = enabled;
    await _storage.write(key: 'setting_inapp_popup', value: '$enabled');
  }

  Future<AppNotification?> getProfileCompletionNotification({
    int? currentPercent,
  }) async {
    try {
      final raw = await _storage.read(key: _profileReminderKey);
      if (raw == null || raw.isEmpty) return null;
      final json = Map<String, dynamic>.from(jsonDecode(raw) as Map);
      if (currentPercent != null) {
        if (currentPercent >= 100) {
          await clearProfileCompletionNotification();
          return null;
        }
        json['percent'] = currentPercent;
      }
      return AppNotification.fromJson(json, sourceTable: profileReminderSource);
    } catch (_) {
      return null;
    }
  }

  Future<void> clearProfileCompletionNotification() async {
    try {
      await _storage.delete(key: _profileReminderKey);
    } catch (_) {}
  }

  Future<AppNotification?> updateOrSyncProfileReminder({
    required int completionPercent,
    required String title,
    required String message,
  }) async {
    if (completionPercent >= 100) {
      await clearProfileCompletionNotification();
      return null;
    }
    final existing = await getProfileCompletionNotification();
    final now = DateTime.now();
    final previousPercent = existing != null
        ? (RegExp(r'(\d+)').firstMatch(existing.message)?.group(1))
        : null;
    final percentChanged = previousPercent != null && previousPercent != '$completionPercent';

    final json = <String, dynamic>{
      'id': 'profile-completion-reminder',
      'title': title,
      'message': message,
      'percent': completionPercent,
      'isRead': percentChanged ? false : (existing?.isRead ?? false),
      'createdAt': (percentChanged || existing == null)
          ? now.toIso8601String()
          : (existing.createdAt?.toIso8601String() ?? now.toIso8601String()),
      'type': 'profile_completion',
    };
    await _storage.write(key: _profileReminderKey, value: jsonEncode(json));
    return AppNotification.fromJson(json, sourceTable: profileReminderSource);
  }

  Future<AppNotification?> createProfileReminderIfDue({
    required int completionPercent,
    required String title,
    required String message,
  }) async {
    return updateOrSyncProfileReminder(
      completionPercent: completionPercent,
      title: title,
      message: message,
    );
  }

  Future<void> markProfileCompletionNotificationRead() async {
    final notification = await getProfileCompletionNotification();
    if (notification == null) return;
    await _storage.write(
      key: _profileReminderKey,
      value: jsonEncode({
        'id': notification.id,
        'title': notification.title,
        'message': notification.message,
        'isRead': true,
        'createdAt': notification.createdAt?.toIso8601String(),
        'type': notification.type,
      }),
    );
  }

  static Uint8List _generateWavHeader(int dataSize, int sampleRate) {
    final fileSize = 44 + dataSize;
    final bytes = ByteData(44);
    // RIFF
    bytes.setUint8(0, 0x52);
    bytes.setUint8(1, 0x49);
    bytes.setUint8(2, 0x46);
    bytes.setUint8(3, 0x46);
    bytes.setUint32(4, fileSize - 8, Endian.little);
    // WAVE
    bytes.setUint8(8, 0x57);
    bytes.setUint8(9, 0x41);
    bytes.setUint8(10, 0x56);
    bytes.setUint8(11, 0x45);
    // fmt subchunk
    bytes.setUint8(12, 0x66);
    bytes.setUint8(13, 0x6D);
    bytes.setUint8(14, 0x74);
    bytes.setUint8(15, 0x20);
    bytes.setUint32(16, 16, Endian.little);
    bytes.setUint16(20, 1, Endian.little); // PCM
    bytes.setUint16(22, 1, Endian.little); // Mono
    bytes.setUint32(24, sampleRate, Endian.little);
    bytes.setUint32(28, sampleRate * 2, Endian.little); // byte rate (16-bit mono)
    bytes.setUint16(32, 2, Endian.little); // block align
    bytes.setUint16(34, 16, Endian.little); // bits per sample
    // data subchunk
    bytes.setUint8(36, 0x64);
    bytes.setUint8(37, 0x61);
    bytes.setUint8(38, 0x74);
    bytes.setUint8(39, 0x61);
    bytes.setUint32(40, dataSize, Endian.little);
    return bytes.buffer.asUint8List();
  }

  /// ✈️ نغمة المطار الكلاسيكية للإشعارات (Airport Announcement Ding-Dong Chime)
  /// نغمة ثنائية فخمة (F5 ثم C5 أو D5 ثم A4) مع صدى هارموني متلاشي
  static Uint8List _generateAirportChimeWav() {
    const sampleRate = 22050;
    // Tone 1: High chime (587.33 Hz - D5) for 0.38s
    // Tone 2: Low chime (440.0 Hz - A4) for 0.65s
    const note1Dur = 0.38;
    const note2Dur = 0.65;
    const totalDur = note1Dur + note2Dur;
    final totalSamples = (sampleRate * totalDur).toInt();
    final dataSize = totalSamples * 2;

    final header = _generateWavHeader(dataSize, sampleRate);
    final pcmBytes = ByteData(dataSize);

    final n1Samples = (sampleRate * note1Dur).toInt();
    final n2Samples = totalSamples - n1Samples;

    // Helper to synthesize a rich bell harmonic sample
    double bellSample(double freq, double tInNote, double totalNoteDur, double decayRate) {
      final attack = (tInNote < 0.008) ? (tInNote / 0.008) : 1.0;
      final env = attack * math.exp(-decayRate * (tInNote / totalNoteDur));
      // Fundamental + 2nd harmonic + 3rd harmonic + metallic shimmer
      final f1 = math.sin(2 * math.pi * freq * tInNote);
      final f2 = 0.28 * math.sin(2 * math.pi * (freq * 2.0) * tInNote);
      final f3 = 0.12 * math.sin(2 * math.pi * (freq * 3.0) * tInNote);
      final fRing = 0.05 * math.sin(2 * math.pi * (freq * 4.15) * tInNote);
      return (f1 + f2 + f3 + fRing) * env;
    }

    var writeIdx = 0;
    // Note 1: 587.33 Hz
    for (var i = 0; i < n1Samples; i++) {
      final t = i / sampleRate;
      final val = (bellSample(587.33, t, note1Dur, 3.8) * 20000).toInt().clamp(-32768, 32767);
      pcmBytes.setInt16(writeIdx * 2, val, Endian.little);
      writeIdx++;
    }

    // Note 2: 440.0 Hz (longer warm resonant tail)
    for (var i = 0; i < n2Samples; i++) {
      final t = i / sampleRate;
      final val = (bellSample(440.0, t, note2Dur, 2.9) * 22000).toInt().clamp(-32768, 32767);
      pcmBytes.setInt16(writeIdx * 2, val, Endian.little);
      writeIdx++;
    }

    final out = Uint8List(44 + dataSize);
    out.setRange(0, 44, header);
    out.setRange(44, 44 + dataSize, pcmBytes.buffer.asUint8List());
    return out;
  }

  /// 💬 نغمة الرسائل الفورية (Chat Bubble Pop / Water Droplet)
  /// صوت نقرة صاعدة خاطفة ومرحة (~90ms) توحي بوصول فقاعة محادثة
  static Uint8List _generateChatPopWav() {
    const sampleRate = 22050;
    const dur = 0.095; // 95 ms
    final totalSamples = (sampleRate * dur).toInt();
    final dataSize = totalSamples * 2;

    final header = _generateWavHeader(dataSize, sampleRate);
    final pcmBytes = ByteData(dataSize);

    for (var i = 0; i < totalSamples; i++) {
      final t = i / sampleRate;
      final progress = i / totalSamples;
      // Fast upward pitch sweep from 450Hz to 1100Hz
      final freq = 450.0 + (650.0 * progress * progress);
      final attack = (progress < 0.05) ? (progress / 0.05) : 1.0;
      final env = attack * math.exp(-14.0 * progress);

      final valNorm = (math.sin(2 * math.pi * freq * t) +
              0.25 * math.sin(2 * math.pi * (freq * 2.1) * t)) *
          env;
      final val = (valNorm * 23000).toInt().clamp(-32768, 32767);
      pcmBytes.setInt16(i * 2, val, Endian.little);
    }

    final out = Uint8List(44 + dataSize);
    out.setRange(0, 44, header);
    out.setRange(44, 44 + dataSize, pcmBytes.buffer.asUint8List());
    return out;
  }

  static Uint8List? _cachedChatWav;
  static Uint8List? _cachedNotificationWav;

  /// تشغيل نغمة الرسائل (Chat Bubble Pop 💬)
  Future<void> playChatSound() async {
    if (!chatSoundEnabled) return;
    try {
      _cachedChatWav ??= _generateChatPopWav();
      await _audioPlayer.stop();
      await _audioPlayer.play(BytesSource(_cachedChatWav!));
    } catch (_) {}
  }

  /// تشغيل نغمة الإشعارات الرسمية (Airport Chime ✈️🛎️)
  Future<void> playNotificationSound() async {
    if (!notificationSoundEnabled) return;
    try {
      _cachedNotificationWav ??= _generateAirportChimeWav();
      await _audioPlayer.stop();
      await _audioPlayer.play(BytesSource(_cachedNotificationWav!));
    } catch (_) {}
  }

  void showInAppMessageBanner({
    required BuildContext context,
    required String senderName,
    required String messageText,
    String? senderAvatar,
    VoidCallback? onTap,
  }) {
    if (!inAppPopupEnabled) return;
    playChatSound();
    _showOverlayBanner(
      context: context,
      title: senderName,
      body: messageText,
      avatarUrl: senderAvatar,
      icon: Icons.chat_bubble_rounded,
      iconColor: AppColors.green,
      onTap: onTap,
    );
  }

  void showInAppNotificationBanner({
    required BuildContext context,
    required String title,
    required String body,
    VoidCallback? onTap,
  }) {
    if (!inAppPopupEnabled) return;
    playNotificationSound();
    _showOverlayBanner(
      context: context,
      title: title,
      body: body,
      icon: Icons.notifications_active_rounded,
      iconColor: AppColors.gold,
      onTap: onTap,
    );
  }

  /// Checks if a 24-hour profile completion reminder is due and shows an in-app banner notification.
  Future<void> checkAndShow24hProfileReminder(
    BuildContext context, {
    VoidCallback? onTap,
  }) async {
    try {
      final scheduledStr = await _storage.read(
        key: 'profile_reminder_scheduled_at',
      );
      if (scheduledStr == null) return;
      final scheduledTime = DateTime.tryParse(scheduledStr);
      if (scheduledTime == null) return;

      if (DateTime.now().isAfter(scheduledTime)) {
        final skippedCount =
            await _storage.read(key: 'profile_reminder_skipped_count') ?? '1';
        // Clear reminder state so it only triggers once per 24h
        await _storage.delete(key: 'profile_reminder_scheduled_at');

        if (!context.mounted) return;
        final lang = Localizations.localeOf(context).languageCode;
        final title = switch (lang) {
          'es' => '🔔 ¡Ojeador IA en espera!',
          'pt' => '🔔 Olheiro IA à espera!',
          'fr' => '🔔 Le recruteur IA vous attend !',
          'en' => '🔔 AI Scout Waiting!',
          _ => '🔔 كابتن حلم بانتظارك!',
        };
        final body = switch (lang) {
          'es' =>
            'Solo quedan $skippedCount preguntas rápidas para completar tu tarjeta de talento.',
          'pt' =>
            'Restam apenas $skippedCount perguntas rápidas para completar o teu cartão.',
          'fr' =>
            'Il ne reste que $skippedCount questions rapides pour compléter votre carte de talent.',
          'en' =>
            'Only $skippedCount quick questions left to complete your talent card.',
          _ =>
            'يتبقى $skippedCount أسئلة بسيطة لإكمال كارت موهبتك وتصدر نتائج البحث لدى الكشافين.',
        };

        showInAppNotificationBanner(
          context: context,
          title: title,
          body: body,
          onTap: onTap,
        );
      }
    } catch (_) {}
  }

  void _showOverlayBanner({
    required BuildContext context,
    required String title,
    required String body,
    String? avatarUrl,
    required IconData icon,
    required Color iconColor,
    VoidCallback? onTap,
  }) {
    final overlay = Overlay.maybeOf(context, rootOverlay: true);
    if (overlay == null) return;
    late OverlayEntry entry;

    entry = OverlayEntry(
      builder: (context) => _InAppOverlayWidget(
        title: title,
        body: body,
        avatarUrl: avatarUrl,
        icon: icon,
        iconColor: iconColor,
        onTap: () {
          entry.remove();
          if (onTap != null) onTap();
        },
        onDismiss: () => entry.remove(),
      ),
    );

    overlay.insert(entry);
    Future.delayed(const Duration(seconds: 4), () {
      if (entry.mounted) {
        entry.remove();
      }
    });
  }
}

class _InAppOverlayWidget extends StatefulWidget {
  const _InAppOverlayWidget({
    required this.title,
    required this.body,
    this.avatarUrl,
    required this.icon,
    required this.iconColor,
    required this.onTap,
    required this.onDismiss,
  });

  final String title;
  final String body;
  final String? avatarUrl;
  final IconData icon;
  final Color iconColor;
  final VoidCallback onTap;
  final VoidCallback onDismiss;

  @override
  State<_InAppOverlayWidget> createState() => _InAppOverlayWidgetState();
}

class _InAppOverlayWidgetState extends State<_InAppOverlayWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _offsetAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 350),
      vsync: this,
    );
    _offsetAnimation = Tween<Offset>(
      begin: const Offset(0.0, -1.0),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: MediaQuery.of(context).padding.top + 8,
      left: 14,
      right: 14,
      child: SlideTransition(
        position: _offsetAnimation,
        child: Material(
          color: Colors.transparent,
          child: GestureDetector(
            onTap: widget.onTap,
            onVerticalDragUpdate: (details) {
              if (details.primaryDelta != null && details.primaryDelta! < -5) {
                widget.onDismiss();
              }
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.3),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
                border: Border.all(
                  color: AppColors.green.withValues(alpha: 0.4),
                  width: 1.5,
                ),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: widget.iconColor.withValues(alpha: 0.2),
                    child: Icon(widget.icon, color: widget.iconColor, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          widget.title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          widget.body,
                          style: const TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 12,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(
                      Icons.close_rounded,
                      color: Colors.white54,
                      size: 18,
                    ),
                    onPressed: widget.onDismiss,
                    visualDensity: VisualDensity.compact,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
