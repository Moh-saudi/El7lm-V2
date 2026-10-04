import 'dart:convert';

import 'api_client.dart';
import 'auth_service.dart';

class NisrReply {
  const NisrReply({
    required this.answer,
    required this.title,
    required this.mode,
    this.audioBase64,
  });

  final String answer;
  final String title;
  final String mode;
  final String? audioBase64;

  factory NisrReply.fromJson(Map<String, dynamic> json) {
    return NisrReply(
      answer: '${json['answer'] ?? ''}'.trim(),
      title: '${json['title'] ?? 'NISR'}'.trim(),
      mode: '${json['mode'] ?? 'ai'}'.trim(),
      audioBase64: json['audioBase64'] as String?,
    );
  }
}

class NisrContext {
  const NisrContext({
    required this.name,
    this.position = '',
    this.organization = '',
    required this.profileCompletion,
    required this.opportunityCount,
  });

  final String name;
  final String position;
  final String organization;
  final int profileCompletion;
  final int opportunityCount;

  factory NisrContext.fromJson(Map<String, dynamic> json) {
    final opportunities = json['recentOpportunities'];
    return NisrContext(
      name: '${json['name'] ?? ''}'.trim(),
      position: '${json['position'] ?? ''}'.trim(),
      organization: '${json['organization'] ?? ''}'.trim(),
      profileCompletion:
          (json['profileCompletion'] as num?)?.toInt().clamp(0, 100) ?? 0,
      opportunityCount: opportunities is List ? opportunities.length : 0,
    );
  }
}

/// Authenticated client for NISR. The Gemini key is intentionally never stored
/// in Flutter; all AI calls go through the EL7LM server.
class NisrService {
  const NisrService(this._api, this._auth);

  final ApiClient _api;
  final AuthService _auth;

  Future<NisrContext> fetchContext(String locale) async {
    final response = await _api.get(
      '/api/nisr/context',
      query: {'locale': locale},
      accessToken: _auth.accessToken,
    );
    return NisrContext.fromJson(response);
  }

  Future<NisrReply> ask({
    required String locale,
    String? message,
    List<int>? audioBytes,
  }) async {
    final response = await _api.post(
      '/api/nisr/chat',
      accessToken: _auth.accessToken,
      body: {
        'locale': locale,
        if (message != null && message.trim().isNotEmpty)
          'message': message.trim(),
        if (audioBytes != null && audioBytes.isNotEmpty)
          'audioBase64': base64Encode(audioBytes),
        if (audioBytes != null && audioBytes.isNotEmpty)
          'audioMimeType': 'audio/l16',
        if (audioBytes != null && audioBytes.isNotEmpty)
          'audioSampleRate': 16000,
      },
    );
    return NisrReply.fromJson(response);
  }
}
