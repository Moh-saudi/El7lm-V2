import 'dart:convert';
import 'package:http/http.dart' as http;

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

/// Authenticated client for NISR with smart resilient fallback.
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
    try {
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
      final reply = NisrReply.fromJson(response);
      final answer = reply.answer.trim();
      final isTruncated = answer.length < 80 &&
          !answer.endsWith('.') &&
          !answer.endsWith('!') &&
          !answer.endsWith('؟') &&
          !answer.endsWith('?') &&
          !answer.endsWith(':');
      if (answer.isNotEmpty && !isTruncated) {
        return reply;
      }
    } catch (_) {}

    // Resilient fallback to direct Gemini API with generous 2048 token allowance
    if (message != null && message.trim().isNotEmpty) {
      final direct = await _askDirectGemini(locale: locale, message: message.trim());
      if (direct != null) return direct;
    }

    return const NisrReply(
      answer: 'أهلاً كابتن، معك الكابتن نسر. أنا جاهز لمساعدتك في كل ما يخص تدريباتك ونظامك الغذائي وتطوير مستواك الرياضي. كيف يمكنني مساعدتك اليوم؟',
      title: 'نسر — مساعدك الرياضي',
      mode: 'ai',
    );
  }

  Future<NisrReply?> _askDirectGemini({
    required String locale,
    required String message,
  }) async {
    try {
      const apiKey = String.fromEnvironment('GEMINI_API_KEY', defaultValue: '');
      if (apiKey.isEmpty) {
        return null;
      }
      final url = Uri.parse(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=$apiKey',
      );
      const sysPrompt =
          'أنت "نسر" (الكابتن نسر)، المدرب والمستشار الرياضي الذكي لمنصة الحلم (EL7LM). '
          'تحدث دائماً كمدرب كرة قدم محترف، ناصح، ملهم، وودود. '
          'أجب دائماً باللغة العربية حصراً وبشكل متكامل ومفيد وعملي دون انقطاع.';
      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'system_instruction': {
            'parts': [
              {'text': sysPrompt}
            ],
          },
          'contents': [
            {
              'role': 'user',
              'parts': [
                {'text': message}
              ],
            }
          ],
          'generationConfig': {
            'maxOutputTokens': 2048,
            'temperature': 0.7,
          },
        }),
      ).timeout(const Duration(seconds: 15));

      if (res.statusCode == 200) {
        final Map<String, dynamic> data =
            jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
        final candidates = data['candidates'] as List?;
        if (candidates != null && candidates.isNotEmpty) {
          final firstCandidate = candidates[0] as Map<String, dynamic>;
          final content = firstCandidate['content'] as Map<String, dynamic>?;
          final parts = content?['parts'] as List?;
          if (parts != null && parts.isNotEmpty) {
            final text = parts[0]['text'] as String?;
            if (text != null && text.trim().isNotEmpty) {
              return NisrReply(
                answer: text.trim(),
                title: 'نسر — مساعدك الرياضي',
                mode: 'ai',
              );
            }
          }
        }
      }
    } catch (_) {}
    return null;
  }
}
