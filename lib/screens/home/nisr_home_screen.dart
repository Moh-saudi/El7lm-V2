import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:record/record.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../l10n/app_localizations.dart';
import '../../services/data_service.dart';
import '../../services/nisr_service.dart';

enum NisrPhase { idle, listening, thinking, answered, error }

// ─── Ivory & Daylight Design Tokens ──────────────────────────────────────────
const _bg            = Color(0xFFF9F8F5); // Warm luxury ivory
const _surface       = Color(0xFFFFFFFF); // Pure crisp white
const _surfaceWarm   = Color(0xFFF2EFE9); // Soft ivory tint
const _border        = Color(0xFFE5E2DA); // Subtle warm hairline
const _borderFocus   = Color(0xFF0E7054); // El7lm Emerald focus
const _primary       = Color(0xFF0E7054); // El7lm Emerald Signature
const _primaryLight  = Color(0xFFE8F5EE); // Light emerald container
const _gold          = Color(0xFFD97706); // Warm athlete brass
const _red           = Color(0xFFDC2626);
const _redLight      = Color(0xFFFEE2E2);
const _textPrimary   = Color(0xFF0F172A); // Slate 900
const _textSecondary = Color(0xFF475569); // Slate 600
const _textMuted     = Color(0xFF94A3B8); // Slate 400
const _bubbleUser    = Color(0xFFEBF3EE); // Gentle ivory-emerald for player

// ─── Date & Time Formatter ────────────────────────────────────────────────────
String _formatDateTime(DateTime dt, [String locale = 'ar']) {
  final y = dt.year;
  final m = dt.month.toString().padLeft(2, '0');
  final d = dt.day.toString().padLeft(2, '0');
  final hourRaw = dt.hour;
  final period = locale == 'ar'
      ? (hourRaw >= 12 ? 'م' : 'ص')
      : (hourRaw >= 12 ? 'PM' : 'AM');
  final hour = hourRaw == 0 ? 12 : (hourRaw > 12 ? hourRaw - 12 : hourRaw);
  final min = dt.minute.toString().padLeft(2, '0');
  return '$y/$m/$d • $hour:$min $period';
}

// ─── Position & Organization Localization Helpers ─────────────────────────────
String _localizePosition(String rawPos, String locale) {
  final p = rawPos.trim().toUpperCase();
  final isAr = locale == 'ar';
  final isEs = locale == 'es';
  final isFr = locale == 'fr';
  final isPt = locale == 'pt';

  switch (p) {
    case 'RB':
      if (isAr) return 'ظهير أيمن (RB)';
      if (isEs) return 'Lateral Derecho (RB)';
      if (isFr) return 'Arrière Droit (RB)';
      if (isPt) return 'Lateral-Direito (RB)';
      return 'Right Back (RB)';
    case 'LB':
      if (isAr) return 'ظهير أيسر (LB)';
      if (isEs) return 'Lateral Izquierdo (LB)';
      if (isFr) return 'Arrière Gauche (LB)';
      if (isPt) return 'Lateral-Esquerdo (LB)';
      return 'Left Back (LB)';
    case 'CB':
      if (isAr) return 'قلب دفاع (CB)';
      if (isEs) return 'Defensa Central (CB)';
      if (isFr) return 'Défenseur Central (CB)';
      if (isPt) return 'Defesa Central (CB)';
      return 'Centre Back (CB)';
    case 'GK':
      if (isAr) return 'حارس مرمى (GK)';
      if (isEs) return 'Portero (GK)';
      if (isFr) return 'Gardien de But (GK)';
      if (isPt) return 'Guarda-Redes (GK)';
      return 'Goalkeeper (GK)';
    case 'CDM':
    case 'DM':
      if (isAr) return 'وسط دفاعي (CDM)';
      if (isEs) return 'Pivote Defensivo (CDM)';
      if (isFr) return 'Milieu Défensif (CDM)';
      if (isPt) return 'Médio Defensivo (CDM)';
      return 'Defensive Midfield (CDM)';
    case 'CM':
      if (isAr) return 'وسط ميدان (CM)';
      if (isEs) return 'Mediocentro (CM)';
      if (isFr) return 'Milieu Central (CM)';
      if (isPt) return 'Médio Centro (CM)';
      return 'Central Midfield (CM)';
    case 'CAM':
    case 'AM':
      if (isAr) return 'وسط هجومي (CAM)';
      if (isEs) return 'Mediapunta (CAM)';
      if (isFr) return 'Milieu Offensif (CAM)';
      if (isPt) return 'Médio Ofensivo (CAM)';
      return 'Attacking Midfield (CAM)';
    case 'RW':
    case 'RM':
      if (isAr) return 'جناح أيمن (RW)';
      if (isEs) return 'Extremo Derecho (RW)';
      if (isFr) return 'Ailier Droit (RW)';
      if (isPt) return 'Extremo-Direito (RW)';
      return 'Right Wing (RW)';
    case 'LW':
    case 'LM':
      if (isAr) return 'جناح أيسر (LW)';
      if (isEs) return 'Extremo Izquierdo (LW)';
      if (isFr) return 'Ailier Gauche (LW)';
      if (isPt) return 'Extremo-Esquerdo (LW)';
      return 'Left Wing (LW)';
    case 'ST':
    case 'CF':
      if (isAr) return 'مهاجم صريح (ST)';
      if (isEs) return 'Delantero Centro (ST)';
      if (isFr) return 'Avant-Centre (ST)';
      if (isPt) return 'Ponta de Lança (ST)';
      return 'Striker (ST)';
    default:
      return rawPos;
  }
}

String _localizeOrg(String rawOrg, String locale) {
  final o = rawOrg.trim().toLowerCase();
  final isAr = locale == 'ar';
  final isEs = locale == 'es';
  final isFr = locale == 'fr';
  final isPt = locale == 'pt';

  if (o.isEmpty || o.contains('free agent') || o.contains('no club') || o.contains('لاعب حر') || o.contains('بدون ناد')) {
    if (isAr) return 'لاعب حر / بدون نادٍ';
    if (isEs) return 'Jugador Libre / Sin Club';
    if (isFr) return 'Joueur Libre / Sans Club';
    if (isPt) return 'Jogador Livre / Sem Clube';
    return 'Free Agent / No Club';
  }
  return rawOrg;
}

// ─── NISR Multi-Language Strings ──────────────────────────────────────────────
class _NisrL10n {
  const _NisrL10n({
    required this.coachRole,
    required this.coachReady,
    required this.coachThinking,
    required this.coachListening,
    required this.newChat,
    required this.welcomeGreeting,
    required this.welcomeSubtitle,
    required this.promptsHeader,
    required this.promptTrainingTitle,
    required this.promptTrainingPrompt,
    required this.promptNutritionTitle,
    required this.promptNutritionPrompt,
    required this.promptSkillsTitle,
    required this.promptSkillsPrompt,
    required this.composerHint,
    required this.listeningBanner,
    required this.cancel,
    required this.send,
    required this.historyTitle,
    required this.historySubtitle,
    required this.clearAll,
    required this.emptyHistoryTitle,
    required this.emptyHistorySubtitle,
    required this.openChat,
    required this.deleteChat,
    required this.msgCount,
    required this.alreadyInNewChat,
    required this.archivedSuccess,
    required this.coachAnalyzing,
    required this.listenCoachVoice,
    required this.coachSpeaking,
    required this.listenUserVoice,
    required this.stopUserVoice,
    required this.copySuccess,
    required this.platformBadge,
    required this.nisrTitle,
    required this.chatWithCoach,
  });

  final String coachRole;
  final String coachReady;
  final String coachThinking;
  final String coachListening;
  final String newChat;
  final String Function(String name) welcomeGreeting;
  final String welcomeSubtitle;
  final String promptsHeader;
  final String promptTrainingTitle;
  final String promptTrainingPrompt;
  final String promptNutritionTitle;
  final String promptNutritionPrompt;
  final String promptSkillsTitle;
  final String promptSkillsPrompt;
  final String composerHint;
  final String listeningBanner;
  final String cancel;
  final String send;
  final String historyTitle;
  final String historySubtitle;
  final String clearAll;
  final String emptyHistoryTitle;
  final String emptyHistorySubtitle;
  final String openChat;
  final String deleteChat;
  final String Function(int count) msgCount;
  final String alreadyInNewChat;
  final String archivedSuccess;
  final String coachAnalyzing;
  final String listenCoachVoice;
  final String coachSpeaking;
  final String listenUserVoice;
  final String stopUserVoice;
  final String copySuccess;
  final String platformBadge;
  final String nisrTitle;
  final String chatWithCoach;

  static _NisrL10n of(String locale) {
    switch (locale) {
      case 'es':
        return _NisrL10n(
          coachRole: 'Entrenador IA',
          coachReady: 'En línea y listo',
          coachThinking: 'Analizando y respondiendo...',
          coachListening: 'Escuchándote ahora',
          newChat: 'Nuevo',
          welcomeGreeting: (name) => '¡Hola, Capitán $name!',
          welcomeSubtitle: 'Soy NISR, tu entrenador personal en El7lm. ¿Cómo puedo ayudarte a potenciar tu rendimiento deportivo hoy?',
          promptsHeader: 'Sugerencias para empezar:',
          promptTrainingTitle: '⚡ Plan de Entrenamiento',
          promptTrainingPrompt: 'Quiero un plan de entrenamiento enfocado en mi posición y condición física.',
          promptNutritionTitle: '🥗 Plan Nutricional',
          promptNutritionPrompt: 'Quiero un plan de nutrición deportiva adaptado a mi peso y estatura.',
          promptSkillsTitle: '🎯 Desarrollo Técnico',
          promptSkillsPrompt: '¿Cómo puedo mejorar la toma de decisiones y precisión bajo presión?',
          composerHint: 'Pregunta a NISR sobre tu entrenamiento...',
          listeningBanner: 'Te escucho ahora...',
          cancel: 'Cancelar',
          send: 'Enviar',
          historyTitle: 'Historial de Conversaciones',
          historySubtitle: 'Explora y recupera tus sesiones y consejos anteriores',
          clearAll: 'Borrar todo',
          emptyHistoryTitle: 'No hay conversaciones guardadas aún',
          emptyHistorySubtitle: 'Al pulsar "+ Nuevo", tu conversación actual se guardará aquí automáticamente.',
          openChat: 'Abrir',
          deleteChat: 'Eliminar',
          msgCount: (c) => '$c mensajes',
          alreadyInNewChat: 'Ya estás en una conversación nueva',
          archivedSuccess: 'Conversación archivada e iniciada una nueva',
          coachAnalyzing: 'NISR analiza tus datos y escribe...',
          listenCoachVoice: 'Escuchar la voz del entrenador NISR',
          coachSpeaking: 'El entrenador está hablando...',
          listenUserVoice: 'Escuchar tu audio enviado',
          stopUserVoice: 'Pausar audio',
          copySuccess: 'Texto copiado con éxito',
          platformBadge: 'Plataforma Deportiva El7lm',
          nisrTitle: 'NISR | Entrenador Deportivo',
          chatWithCoach: 'Conversación deportiva',
        );
      case 'en':
        return _NisrL10n(
          coachRole: 'AI Coach',
          coachReady: 'Online & Ready',
          coachThinking: 'Analyzing & typing...',
          coachListening: 'Listening to you now',
          newChat: 'New',
          welcomeGreeting: (name) => 'Hello, Captain $name!',
          welcomeSubtitle: 'I am NISR, your personal coach on El7lm. How can I help boost your athletic performance today?',
          promptsHeader: 'Quick suggestions:',
          promptTrainingTitle: '⚡ Training Plan',
          promptTrainingPrompt: 'I want an intensive workout plan tailored to my position and fitness level.',
          promptNutritionTitle: '🥗 Sports Nutrition',
          promptNutritionPrompt: 'I need a sports nutrition plan that matches my height, weight, and role.',
          promptSkillsTitle: '🎯 Technical Skills',
          promptSkillsPrompt: 'How can I improve my passing accuracy and decision making under pressure?',
          composerHint: 'Ask NISR anything about your training...',
          listeningBanner: 'Listening now...',
          cancel: 'Cancel',
          send: 'Send',
          historyTitle: 'Chat History',
          historySubtitle: 'Browse and restore previous tactical consultations',
          clearAll: 'Clear all',
          emptyHistoryTitle: 'No saved conversations yet',
          emptyHistorySubtitle: 'Tapping "+ New" will automatically archive your session here.',
          openChat: 'Open',
          deleteChat: 'Delete',
          msgCount: (c) => '$c messages',
          alreadyInNewChat: 'You are already in a new chat',
          archivedSuccess: 'Chat archived and new chat started successfully',
          coachAnalyzing: 'NISR is analyzing your data and replying...',
          listenCoachVoice: 'Listen to Coach NISR\'s voice note',
          coachSpeaking: 'Coach is speaking now...',
          listenUserVoice: 'Play your sent voice note',
          stopUserVoice: 'Pause audio',
          copySuccess: 'Copied to clipboard',
          platformBadge: 'EL7LM Sports Platform',
          nisrTitle: 'NISR | Sports Coach',
          chatWithCoach: 'Sports coaching session',
        );
      case 'fr':
        return _NisrL10n(
          coachRole: 'Coach IA',
          coachReady: 'En ligne & Prêt',
          coachThinking: 'Analyse et rédaction...',
          coachListening: 'À votre écoute',
          newChat: 'Nouveau',
          welcomeGreeting: (name) => 'Bonjour Capitaine $name !',
          welcomeSubtitle: 'Je suis NISR, votre entraîneur personnel sur El7lm. Comment puis-je vous aider à progresser aujourd\'hui ?',
          promptsHeader: 'Suggestions rapides :',
          promptTrainingTitle: '⚡ Plan d\'entraînement',
          promptTrainingPrompt: 'Je souhaite un programme d\'entraînement adapté à mon poste et ma condition physique.',
          promptNutritionTitle: '🥗 Nutrition Sportive',
          promptNutritionPrompt: 'Je souhaite un plan de nutrition sportive adapté à ma taille et mon poids.',
          promptSkillsTitle: '🎯 Perfectionnement Technique',
          promptSkillsPrompt: 'Comment améliorer ma précision de passe et ma prise de décision sous pression ?',
          composerHint: 'Posez une question à NISR sur votre entraînement...',
          listeningBanner: 'Je vous écoute...',
          cancel: 'Annuler',
          send: 'Envoyer',
          historyTitle: 'Historique des conversations',
          historySubtitle: 'Consultez et restaurez vos séances et conseils précédents',
          clearAll: 'Tout effacer',
          emptyHistoryTitle: 'Aucune conversation enregistrée',
          emptyHistorySubtitle: 'En appuyant sur "+ Nouveau", votre session actuelle sera archivée ici.',
          openChat: 'Ouvrir',
          deleteChat: 'Supprimer',
          msgCount: (c) => '$c messages',
          alreadyInNewChat: 'Vous êtes déjà dans une nouvelle conversation',
          archivedSuccess: 'Conversation archivée et nouvelle séance démarrée',
          coachAnalyzing: 'NISR analyse vos données et rédige la réponse...',
          listenCoachVoice: 'Écouter les conseils vocaux du coach NISR',
          coachSpeaking: 'L\'entraîneur parle en ce moment...',
          listenUserVoice: 'Écouter votre message vocal envoyé',
          stopUserVoice: 'Arrêter l\'audio',
          copySuccess: 'Texte copié avec succès',
          platformBadge: 'Plateforme Sportive El7lm',
          nisrTitle: 'NISR | Entraîneur Sportif',
          chatWithCoach: 'Séance d\'entraînement',
        );
      case 'pt':
        return _NisrL10n(
          coachRole: 'Treinador IA',
          coachReady: 'Online e pronto',
          coachThinking: 'A analisar e a responder...',
          coachListening: 'A ouvir agora',
          newChat: 'Novo',
          welcomeGreeting: (name) => 'Olá Capitão $name!',
          welcomeSubtitle: 'Sou o NISR, o teu treinador pessoal no El7lm. Como posso ajudar a melhorar o teu rendimento hoje?',
          promptsHeader: 'Sugestões rápidas:',
          promptTrainingTitle: '⚡ Plano de Treino',
          promptTrainingPrompt: 'Quero um plano de treino focado na minha posição e forma física.',
          promptNutritionTitle: '🥗 Nutrição Desportiva',
          promptNutritionPrompt: 'Quero um plano nutricional adaptado à minha altura e peso.',
          promptSkillsTitle: '🎯 Desenvolvimento Técnico',
          promptSkillsPrompt: 'Como posso melhorar a velocidade de decisão e passe sob pressão?',
          composerHint: 'Pergunta ao NISR sobre o teu treino...',
          listeningBanner: 'A ouvir agora...',
          cancel: 'Cancelar',
          send: 'Enviar',
          historyTitle: 'Histórico de Conversas',
          historySubtitle: 'Explora e recupera os teus conselhos e treinos anteriores',
          clearAll: 'Limpar tudo',
          emptyHistoryTitle: 'Nenhuma conversa guardada',
          emptyHistorySubtitle: 'Ao tocar em "+ Novo", a tua conversa será guardada aqui.',
          openChat: 'Abrir',
          deleteChat: 'Eliminar',
          msgCount: (c) => '$c mensagens',
          alreadyInNewChat: 'Já estás numa conversa nova',
          archivedSuccess: 'Conversa guardada e nova sessão iniciada',
          coachAnalyzing: 'O NISR está a analisar os teus dados e a escrever...',
          listenCoachVoice: 'Ouvir a voz do treinador NISR',
          coachSpeaking: 'O treinador está a falar...',
          listenUserVoice: 'Ouvir o teu áudio enviado',
          stopUserVoice: 'Parar áudio',
          copySuccess: 'Texto copiado com sucesso',
          platformBadge: 'Plataforma Desportiva El7lm',
          nisrTitle: 'NISR | Treinador Desportivo',
          chatWithCoach: 'Sessão de treino',
        );
      case 'ar':
      default:
        return _NisrL10n(
          coachRole: 'المدرب الذكي',
          coachReady: 'متصل وجاهز للتدريب',
          coachThinking: 'جاري التحليل والكتابة...',
          coachListening: 'يستمع إليك الآن',
          newChat: 'جديدة',
          welcomeGreeting: (name) => 'أهلاً كابتن $name',
          welcomeSubtitle: 'أنا نسر، مدربك الشخصي في منصة الحلم. كيف أستطيع مساعدتك في تطوير أدائك الرياضي اليوم؟',
          promptsHeader: 'اقتراحات لبدء المحادثة:',
          promptTrainingTitle: '⚡ خطة التدريب',
          promptTrainingPrompt: 'أريد خطة تدريب مكثفة لليوم تناسب مركزي ومستواي البدني.',
          promptNutritionTitle: '🥗 نظام غذائي',
          promptNutritionPrompt: 'أريد خطة غذائية مناسبة لمركزي وطولي ووزني.',
          promptSkillsTitle: '🎯 تطوير المهارات',
          promptSkillsPrompt: 'كيف أطور دقة التمرير وسرعة اتخاذ القرار تحت الضغط؟',
          composerHint: 'اسأل نسر عن أي شيء في تدريبك...',
          listeningBanner: 'أنا أسمعك الآن...',
          cancel: 'إلغاء',
          send: 'إرسال',
          historyTitle: 'سجل المحادثات السابقة',
          historySubtitle: 'تصفح واستعد استشاراتك وتوجيهاتك السابقة',
          clearAll: 'مسح الكل',
          emptyHistoryTitle: 'لا توجد محادثات سابقة محفوظة بعد',
          emptyHistorySubtitle: 'عند الضغط على "+ جديدة"، ستُحفظ محادثتك هنا تلقائياً.',
          openChat: 'فتح',
          deleteChat: 'حذف',
          msgCount: (c) => '$c رسالة',
          alreadyInNewChat: 'أنت بالفعل في محادثة جديدة',
          archivedSuccess: 'تم أرشفة المحادثة وبدء محادثة جديدة بنجاح',
          coachAnalyzing: 'نسر يحلل بياناتك ويكتب الرد...',
          listenCoachVoice: 'استمع لتوجيهات المدرب نسر بصوته',
          coachSpeaking: 'المدرب يتحدث الآن...',
          listenUserVoice: 'استمع لصوتك المرسل',
          stopUserVoice: 'إيقاف الصوت',
          copySuccess: 'تم نسخ النص بنجاح',
          platformBadge: 'منصة الحلم الرياضية',
          nisrTitle: 'نسر | المدرب الرياضي',
          chatWithCoach: 'محادثة رياضية',
        );
    }
  }
}

// ─── PCM to WAV helper ────────────────────────────────────────────────────────
Uint8List _pcmToWav(Uint8List pcm, {int sampleRate = 16000, int channels = 1}) {
  final byteRate = sampleRate * channels * 2;
  final blockAlign = channels * 2;
  final totalDataLen = pcm.length;
  final totalAudioLen = totalDataLen + 36;
  final header = ByteData(44);

  header.setUint8(0, 0x52); header.setUint8(1, 0x49); header.setUint8(2, 0x46); header.setUint8(3, 0x46); // RIFF
  header.setUint32(4, totalAudioLen, Endian.little);
  header.setUint8(8, 0x57); header.setUint8(9, 0x41); header.setUint8(10, 0x56); header.setUint8(11, 0x45); // WAVE
  header.setUint8(12, 0x66); header.setUint8(13, 0x6D); header.setUint8(14, 0x74); header.setUint8(15, 0x20); // fmt 
  header.setUint32(16, 16, Endian.little);
  header.setUint16(20, 1, Endian.little); // PCM
  header.setUint16(22, channels, Endian.little);
  header.setUint32(24, sampleRate, Endian.little);
  header.setUint32(28, byteRate, Endian.little);
  header.setUint16(32, blockAlign, Endian.little);
  header.setUint16(34, 16, Endian.little); // bits per sample
  header.setUint8(36, 0x64); header.setUint8(37, 0x61); header.setUint8(38, 0x74); header.setUint8(39, 0x61); // data
  header.setUint32(40, totalDataLen, Endian.little);

  final builder = BytesBuilder();
  builder.add(header.buffer.asUint8List());
  builder.add(pcm);
  return builder.toBytes();
}

// ─── Chat Message Model ───────────────────────────────────────────────────────
class _ChatMessage {
  _ChatMessage({
    required this.isUser,
    required this.text,
    this.reply,
    this.audioBytes,
    required this.time,
  });

  final bool isUser;
  final String text;
  final NisrReply? reply;
  final Uint8List? audioBytes;
  final DateTime time;
  bool isPlaying = false;

  Map<String, dynamic> toJson() => {
    'isUser': isUser,
    'text': text,
    'time': time.toIso8601String(),
    'audioBase64': audioBytes != null ? base64Encode(audioBytes!) : null,
  };

  factory _ChatMessage.fromJson(Map<String, dynamic> json) => _ChatMessage(
    isUser: json['isUser'] as bool? ?? false,
    text: json['text'] as String? ?? '',
    time: json['time'] != null
        ? (DateTime.tryParse(json['time'] as String) ?? DateTime.now())
        : DateTime.now(),
    audioBytes: json['audioBase64'] != null
        ? base64Decode(json['audioBase64'] as String)
        : null,
  );
}

// ─── Saved Chat Session Model ─────────────────────────────────────────────────
class _ChatSession {
  _ChatSession({
    required this.id,
    required this.title,
    required this.time,
    required this.messages,
  });

  final String id;
  final String title;
  final DateTime time;
  final List<_ChatMessage> messages;

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'time': time.toIso8601String(),
    'messages': messages.map((m) => m.toJson()).toList(),
  };

  factory _ChatSession.fromJson(Map<String, dynamic> json) => _ChatSession(
    id: json['id'] as String? ?? '',
    title: json['title'] as String? ?? 'محادثة رياضية',
    time: json['time'] != null
        ? (DateTime.tryParse(json['time'] as String) ?? DateTime.now())
        : DateTime.now(),
    messages: (json['messages'] as List<dynamic>? ?? [])
        .map((m) => _ChatMessage.fromJson(m as Map<String, dynamic>))
        .toList(),
  );
}

class NisrHomeScreen extends StatefulWidget {
  const NisrHomeScreen({
    super.key,
    required this.displayName,
    required this.dataService,
    required this.onNavigate,
  });

  final String displayName;
  final DataService dataService;
  final ValueChanged<int> onNavigate;

  @override
  State<NisrHomeScreen> createState() => _NisrHomeScreenState();
}

class _NisrHomeScreenState extends State<NisrHomeScreen>
    with TickerProviderStateMixin {
  final _msgCtrl        = TextEditingController();
  final _focusNode      = FocusNode();
  final _scrollCtrl     = ScrollController();
  final _recorder       = AudioRecorder();
  final _audioPlayer    = AudioPlayer();
  final _buf            = BytesBuilder(copy: false);

  late final NisrService _svc;
  late final AnimationController _pulseCtrl;
  late final AnimationController _spinCtrl;
  late final Animation<double> _pulse;

  String? _locale;
  StreamSubscription<Uint8List>? _sub;
  Timer? _timer;

  NisrContext? _playerCtx;
  NisrPhase _phase = NisrPhase.idle;
  int _secs = 0;
  bool _stopping = false;
  final List<_ChatMessage> _messages = [];
  _ChatMessage? _currentPlayingMessage;
  List<_ChatSession> _savedSessions = [];

  static const _activeChatKey = 'nisr_active_chat_v1';
  static const _savedSessionsKey = 'nisr_saved_sessions_v1';

  @override
  void initState() {
    super.initState();
    _svc = NisrService(
      widget.dataService.apiClient,
      widget.dataService.authService,
    );
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);
    _pulse = Tween<double>(begin: 0.94, end: 1.06).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );

    _spinCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 12),
    )..repeat();

    _audioPlayer.onPlayerComplete.listen((_) {
      if (mounted && _currentPlayingMessage != null) {
        setState(() {
          _currentPlayingMessage!.isPlaying = false;
          _currentPlayingMessage = null;
        });
      }
    });

    _initChatStorage();
  }

  Future<void> _initChatStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      final sessionsJson = prefs.getString(_savedSessionsKey);
      if (sessionsJson != null && sessionsJson.isNotEmpty) {
        final List<dynamic> decoded = jsonDecode(sessionsJson);
        _savedSessions = decoded
            .map((e) => _ChatSession.fromJson(e as Map<String, dynamic>))
            .toList();
      }

      final activeJson = prefs.getString(_activeChatKey);
      if (activeJson != null && activeJson.isNotEmpty) {
        final List<dynamic> decoded = jsonDecode(activeJson);
        final loaded = decoded
            .map((e) => _ChatMessage.fromJson(e as Map<String, dynamic>))
            .toList();
        if (loaded.isNotEmpty) {
          // Auto-archive active chat from previous session so the screen opens clean on login
          final firstUserMsg = loaded.firstWhere(
            (m) => m.isUser,
            orElse: () => loaded.first,
          ).text;
          final title = firstUserMsg.length > 40
              ? '${firstUserMsg.substring(0, 40)}...'
              : (firstUserMsg.isNotEmpty ? firstUserMsg : 'محادثة رياضية');

          final session = _ChatSession(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            title: title,
            time: loaded.last.time,
            messages: loaded,
          );
          _savedSessions.insert(0, session);
          await _saveSessionsList();
          await prefs.remove(_activeChatKey);
          if (mounted) {
            setState(() {
              _messages.clear();
            });
          }
        }
      }
    } catch (_) {}
  }

  Future<void> _saveActiveChat() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (_messages.isEmpty) {
        await prefs.remove(_activeChatKey);
      } else {
        final encoded = jsonEncode(_messages.map((m) => m.toJson()).toList());
        await prefs.setString(_activeChatKey, encoded);
      }
    } catch (_) {}
  }

  Future<void> _saveSessionsList() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final encoded = jsonEncode(_savedSessions.map((s) => s.toJson()).toList());
      await prefs.setString(_savedSessionsKey, encoded);
    } catch (_) {}
  }

  Future<void> _startNewChat() async {
    final strings = _NisrL10n.of(context.languageCode);
    if (_messages.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(strings.alreadyInNewChat),
          duration: const Duration(seconds: 2),
        ),
      );
      return;
    }

    await _audioPlayer.stop();

    final firstUserMsg = _messages.firstWhere(
      (m) => m.isUser,
      orElse: () => _messages.first,
    ).text;
    final title = firstUserMsg.length > 40
        ? '${firstUserMsg.substring(0, 40)}...'
        : firstUserMsg;

    final session = _ChatSession(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: title.isNotEmpty ? title : strings.chatWithCoach,
      time: DateTime.now(),
      messages: List.from(_messages),
    );

    setState(() {
      _savedSessions.insert(0, session);
      _messages.clear();
      _phase = NisrPhase.idle;
    });

    await _saveSessionsList();
    await _saveActiveChat();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(strings.archivedSuccess),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  void _loadSession(_ChatSession session) {
    _audioPlayer.stop();
    setState(() {
      _messages.clear();
      _messages.addAll(session.messages);
      _phase = NisrPhase.answered;
    });
    _saveActiveChat();
    _scrollToBottom();
    Navigator.of(context).pop();
  }

  void _deleteSession(String id) {
    setState(() {
      _savedSessions.removeWhere((s) => s.id == id);
    });
    _saveSessionsList();
  }

  void _clearAllHistory() {
    setState(() {
      _savedSessions.clear();
    });
    _saveSessionsList();
    Navigator.of(context).pop();
  }

  void _openHistorySheet() {
    final strings = _NisrL10n.of(context.languageCode);
    showModalBottomSheet(
      context: context,
      backgroundColor: _surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return SafeArea(
              child: Container(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.75,
                ),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 40,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: _border,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: const BoxDecoration(
                            color: _primaryLight,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.history_rounded,
                            color: _primary,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                strings.historyTitle,
                                style: const TextStyle(
                                  color: _textPrimary,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              Text(
                                strings.historySubtitle,
                                style: const TextStyle(
                                  color: _textMuted,
                                  fontSize: 11.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (_savedSessions.isNotEmpty)
                          TextButton(
                            onPressed: () {
                              _clearAllHistory();
                            },
                            child: Text(
                              strings.clearAll,
                              style: const TextStyle(
                                color: _red,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    const Divider(height: 1, color: _border),
                    const SizedBox(height: 10),
                    Expanded(
                      child: _savedSessions.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.chat_bubble_outline_rounded,
                                    size: 48,
                                    color: _textMuted.withValues(alpha: 0.4),
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    strings.emptyHistoryTitle,
                                    style: const TextStyle(
                                      color: _textSecondary,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    strings.emptyHistorySubtitle,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                      color: _textMuted,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : ListView.separated(
                              itemCount: _savedSessions.length,
                              separatorBuilder: (_, _) => const SizedBox(height: 8),
                              itemBuilder: (ctx, i) {
                                final s = _savedSessions[i];
                                return Container(
                                  decoration: BoxDecoration(
                                    color: _surfaceWarm,
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(color: _border),
                                  ),
                                  child: ListTile(
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 14,
                                      vertical: 4,
                                    ),
                                    title: Text(
                                      s.title,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        color: _textPrimary,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    subtitle: Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Row(
                                        children: [
                                          const Icon(
                                            Icons.calendar_today_rounded,
                                            size: 11,
                                            color: _textMuted,
                                          ),
                                          const SizedBox(width: 4),
                                          Text(
                                            _formatDateTime(s.time, context.languageCode),
                                            style: const TextStyle(
                                              color: _textMuted,
                                              fontSize: 10.5,
                                            ),
                                          ),
                                          const SizedBox(width: 10),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 6,
                                              vertical: 1.5,
                                            ),
                                            decoration: BoxDecoration(
                                              color: _primaryLight,
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Text(
                                              strings.msgCount(s.messages.length),
                                              style: const TextStyle(
                                                color: _primary,
                                                fontSize: 9.5,
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    trailing: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        IconButton(
                                          icon: const Icon(
                                            Icons.delete_outline_rounded,
                                            color: _red,
                                            size: 18,
                                          ),
                                          tooltip: strings.deleteChat,
                                          onPressed: () {
                                            _deleteSession(s.id);
                                            setSheetState(() {});
                                          },
                                        ),
                                        ElevatedButton(
                                          onPressed: () => _loadSession(s),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: _primary,
                                            foregroundColor: Colors.white,
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 10,
                                              vertical: 6,
                                            ),
                                            visualDensity: VisualDensity.compact,
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(10),
                                            ),
                                          ),
                                          child: Text(
                                            strings.openChat,
                                            style: const TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final l = context.languageCode;
    if (_locale != l) {
      _locale = l;
      _loadContext();
    }
  }

  Future<void> _loadContext() async {
    try {
      final p = await _svc.fetchContext(context.languageCode);
      if (mounted) setState(() => _playerCtx = p);
    } catch (_) {}
  }

  Future<void> _refresh() async {
    await _loadContext();
  }

  String get _firstName {
    final n = _playerCtx?.name.trim() ?? widget.displayName.trim();
    if (n.isEmpty) return context.tr('captain');
    return n.split(RegExp(r'\s+')).first;
  }

  String get _roleSubtitle {
    final locale = context.languageCode;
    final rawPos = _playerCtx?.position ?? '';
    final rawOrg = _playerCtx?.organization ?? '';
    final pos = rawPos.isNotEmpty ? _localizePosition(rawPos, locale) : '';
    final org = _localizeOrg(rawOrg, locale);
    if (pos.isNotEmpty && org.isNotEmpty) return '$pos • $org';
    if (pos.isNotEmpty) return pos;
    if (org.isNotEmpty) return org;
    return '';
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 320),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _toggleAudioPlay(_ChatMessage msg, Uint8List wavBytes) async {
    try {
      if (_currentPlayingMessage == msg && msg.isPlaying) {
        await _audioPlayer.pause();
        if (mounted) setState(() => msg.isPlaying = false);
        return;
      }

      if (_currentPlayingMessage != null && _currentPlayingMessage != msg) {
        _currentPlayingMessage!.isPlaying = false;
        await _audioPlayer.stop();
      }

      await _audioPlayer.play(BytesSource(wavBytes));
      if (mounted) {
        setState(() {
          msg.isPlaying = true;
          _currentPlayingMessage = msg;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تعذر تشغيل الصوت')),
        );
      }
    }
  }

  Future<void> _ask({String? message, Uint8List? rawPcmAudio}) async {
    if (_phase == NisrPhase.thinking || _phase == NisrPhase.listening) return;
    final txt = message?.trim() ?? '';
    final hasAudio = rawPcmAudio != null && rawPcmAudio.isNotEmpty;
    if (txt.isEmpty && !hasAudio) return;
    if (!mounted) return;

    // Convert raw PCM to playable WAV for user replay
    Uint8List? userWav;
    if (hasAudio) {
      userWav = _pcmToWav(rawPcmAudio, sampleRate: 16000, channels: 1);
    }

    final userDisplayTxt = txt.isNotEmpty ? txt : '🎤 رسالة صوتية (${_secs}s)';
    setState(() {
      _messages.add(_ChatMessage(
        isUser: true,
        text: userDisplayTxt,
        audioBytes: userWav,
        time: DateTime.now(),
      ));
      _phase = NisrPhase.thinking;
    });
    _msgCtrl.clear();
    _saveActiveChat();
    _scrollToBottom();

    try {
      final r = await _svc.ask(
        locale: context.languageCode,
        message: txt,
        audioBytes: rawPcmAudio,
      );
      if (!mounted) return;

      Uint8List? coachAudioWav;
      if (r.audioBase64 != null && r.audioBase64!.isNotEmpty) {
        try {
          coachAudioWav = base64Decode(r.audioBase64!);
        } catch (_) {}
      }

      final assistantMsg = _ChatMessage(
        isUser: false,
        text: r.answer,
        reply: r,
        audioBytes: coachAudioWav,
        time: DateTime.now(),
      );

      setState(() {
        _messages.add(assistantMsg);
        _phase = NisrPhase.answered;
      });
      _saveActiveChat();
      _scrollToBottom();

      // Automatically play voice answer if speech was synthesized
      if (coachAudioWav != null && coachAudioWav.isNotEmpty) {
        _toggleAudioPlay(assistantMsg, coachAudioWav);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _phase = NisrPhase.error);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(context.errorText(e)),
          backgroundColor: _red,
        ),
      );
    }
  }

  Future<void> _toggleVoice() async {
    if (_phase == NisrPhase.listening) {
      await _stopVoice(send: true);
      return;
    }
    if (_phase == NisrPhase.thinking || _stopping) return;

    if (!await _recorder.hasPermission()) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('microphonePermissionRequired'))),
        );
      }
      return;
    }

    _buf.clear();
    final stream = await _recorder.startStream(
      const RecordConfig(
        encoder: AudioEncoder.pcm16bits,
        sampleRate: 16000,
        numChannels: 1,
      ),
    );
    _sub = stream.listen(_buf.add);

    if (!mounted) return;
    setState(() {
      _phase = NisrPhase.listening;
      _secs = 0;
    });

    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _secs++);
      if (_secs >= 25) _stopVoice(send: true);
    });
  }

  Future<void> _stopVoice({required bool send}) async {
    if (_stopping) return;
    _stopping = true;
    _timer?.cancel();
    _timer = null;

    try {
      await _recorder.stop();
      await _sub?.cancel();
    } catch (_) {}
    _sub = null;

    final bytes = _buf.takeBytes();
    _stopping = false;
    if (!mounted) return;

    setState(() => _phase = NisrPhase.idle);

    if (!send) return;

    if (bytes.length < 8000) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('nisrVoiceTooShort'))),
      );
      return;
    }

    await _ask(rawPcmAudio: bytes);
  }

  void _onInputTap() {
    if (_phase == NisrPhase.listening) {
      _stopVoice(send: false);
    }
    _focusNode.requestFocus();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _sub?.cancel();
    _recorder.dispose();
    _audioPlayer.dispose();
    _pulseCtrl.dispose();
    _spinCtrl.dispose();
    _msgCtrl.dispose();
    _focusNode.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = _NisrL10n.of(context.languageCode);
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: Column(
          children: [
            _TopAppBar(
              phase: _phase,
              onNewChat: _startNewChat,
              onOpenHistory: _openHistorySheet,
              savedCount: _savedSessions.length,
              strings: strings,
            ),
            const Divider(height: 1, color: _border),
            Expanded(
              child: RefreshIndicator(
                onRefresh: _refresh,
                color: _primary,
                backgroundColor: _surface,
                child: _messages.isEmpty
                    ? _WelcomeView(
                        name: _firstName,
                        roleSubtitle: _roleSubtitle,
                        pulse: _pulse,
                        spin: _spinCtrl,
                        strings: strings,
                        onPromptSelected: (prompt) => _ask(message: prompt),
                      )
                    : ListView.builder(
                        controller: _scrollCtrl,
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                        itemCount: _messages.length +
                            (_phase == NisrPhase.thinking ? 1 : 0),
                        itemBuilder: (ctx, i) {
                          if (i == _messages.length) {
                            return _ThinkingBubble(strings: strings);
                          }
                          return _MessageItem(
                            message: _messages[i],
                            onPlayAudio: (bytes) =>
                                _toggleAudioPlay(_messages[i], bytes),
                            strings: strings,
                          );
                        },
                      ),
              ),
            ),
            if (_phase == NisrPhase.listening)
              _VoiceRecordingBar(
                secs: _secs,
                onStopAndSend: () => _stopVoice(send: true),
                onCancel: () => _stopVoice(send: false),
                strings: strings,
              ),
            _ChatComposer(
              ctrl: _msgCtrl,
              focusNode: _focusNode,
              busy: _phase == NisrPhase.thinking,
              listening: _phase == NisrPhase.listening,
              onTap: _onInputTap,
              onSend: () => _ask(message: _msgCtrl.text),
              onVoice: _toggleVoice,
              strings: strings,
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Top App Bar ─────────────────────────────────────────────────────────────
class _TopAppBar extends StatelessWidget {
  const _TopAppBar({
    required this.phase,
    required this.onNewChat,
    required this.onOpenHistory,
    required this.savedCount,
    required this.strings,
  });

  final NisrPhase phase;
  final VoidCallback onNewChat;
  final VoidCallback onOpenHistory;
  final int savedCount;
  final _NisrL10n strings;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: _surface,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            padding: const EdgeInsets.all(5),
            decoration: BoxDecoration(
              color: _surfaceWarm,
              shape: BoxShape.circle,
              border: Border.all(color: _border),
            ),
            child: Image.asset(
              'assets/images/el7lm-logo.png',
              fit: BoxFit.contain,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    const Text(
                      'NISR',
                      style: TextStyle(
                        color: _textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 1.5,
                      ),
                      decoration: BoxDecoration(
                        color: _primaryLight,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        strings.coachRole,
                        style: const TextStyle(
                          color: _primary,
                          fontSize: 9.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: phase == NisrPhase.thinking
                            ? _gold
                            : phase == NisrPhase.listening
                                ? _red
                                : _primary,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      phase == NisrPhase.thinking
                          ? strings.coachThinking
                          : phase == NisrPhase.listening
                              ? strings.coachListening
                              : strings.coachReady,
                      style: const TextStyle(
                        color: _textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // History Button
          IconButton(
            onPressed: onOpenHistory,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
            icon: Stack(
              clipBehavior: Clip.none,
              children: [
                const Icon(
                  Icons.history_rounded,
                  color: _textSecondary,
                  size: 22,
                ),
                if (savedCount > 0)
                  Positioned(
                    top: -2,
                    right: -2,
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(
                        color: _primary,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(
                        minWidth: 14,
                        minHeight: 14,
                      ),
                      child: Text(
                        '$savedCount',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 8.5,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            tooltip: strings.historyTitle,
          ),
          const SizedBox(width: 4),
          // New Chat Button
          InkWell(
            onTap: onNewChat,
            borderRadius: BorderRadius.circular(14),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
              decoration: BoxDecoration(
                color: _primaryLight,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: _primary.withValues(alpha: 0.2)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.add_rounded, color: _primary, size: 16),
                  const SizedBox(width: 3),
                  Text(
                    strings.newChat,
                    style: const TextStyle(
                      color: _primary,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Welcome View (Empty State with Fluid ChatGPT-Style Glowing Orb) ─────────
class _WelcomeView extends StatelessWidget {
  const _WelcomeView({
    required this.name,
    required this.roleSubtitle,
    required this.pulse,
    required this.spin,
    required this.strings,
    required this.onPromptSelected,
  });

  final String name;
  final String roleSubtitle;
  final Animation<double> pulse;
  final Animation<double> spin;
  final _NisrL10n strings;
  final ValueChanged<String> onPromptSelected;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Column(
        children: [
          const SizedBox(height: 8),
          // ─── Glowing Fluid Orb (Centered & Majestic Hero) ───────────────────
          ScaleTransition(
            scale: pulse,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Outer celestial breathing aura
                Container(
                  width: 144,
                  height: 144,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF38BDF8).withValues(alpha: 0.35),
                        blurRadius: 40,
                        spreadRadius: 8,
                      ),
                      BoxShadow(
                        color: _primary.withValues(alpha: 0.28),
                        blurRadius: 50,
                        spreadRadius: 14,
                      ),
                    ],
                  ),
                ),
                // Fluid rotating gradient orb
                RotationTransition(
                  turns: spin,
                  child: Container(
                    width: 114,
                    height: 114,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: SweepGradient(
                        colors: [
                          Color(0xFF38BDF8),
                          Color(0xFF0E7054),
                          Color(0xFF60A5FA),
                          Color(0xFF10B981),
                          Color(0xFF38BDF8),
                        ],
                      ),
                    ),
                  ),
                ),
                // Inner pure white capsule containing the official El7lm logo
                Container(
                  width: 82,
                  height: 82,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Image.asset(
                    'assets/images/el7lm-logo.png',
                    fit: BoxFit.contain,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Text(
            strings.welcomeGreeting(name),
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: _textPrimary,
              fontSize: 22,
              fontWeight: FontWeight.w900,
            ),
          ),
          if (roleSubtitle.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: _surfaceWarm,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _border),
              ),
              child: Text(
                roleSubtitle,
                style: const TextStyle(
                  color: _textSecondary,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              strings.welcomeSubtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: _textSecondary,
                fontSize: 13,
                height: 1.55,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(height: 22),
          // Sleek, compact suggestion pills (Takes minimal space so the emblem shines)
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 8,
            runSpacing: 8,
            children: [
              _CompactPromptChip(
                label: strings.promptTrainingTitle,
                color: _gold,
                onTap: () => onPromptSelected(strings.promptTrainingPrompt),
              ),
              _CompactPromptChip(
                label: strings.promptNutritionTitle,
                color: const Color(0xFF0284C7),
                onTap: () => onPromptSelected(strings.promptNutritionPrompt),
              ),
              _CompactPromptChip(
                label: strings.promptSkillsTitle,
                color: _primary,
                onTap: () => onPromptSelected(strings.promptSkillsPrompt),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CompactPromptChip extends StatelessWidget {
  const _CompactPromptChip({
    required this.label,
    required this.color,
    required this.onTap,
  });

  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: _surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: _border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Text(
            label,
            style: const TextStyle(
              color: _textPrimary,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Chat Message Item with Voice Note Audio Player ───────────────────────────
class _MessageItem extends StatelessWidget {
  const _MessageItem({
    required this.message,
    required this.onPlayAudio,
    required this.strings,
  });

  final _ChatMessage message;
  final ValueChanged<Uint8List> onPlayAudio;
  final _NisrL10n strings;

  void _copy(BuildContext context, String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(strings.copySuccess),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (message.isUser) {
      final hasAudio = message.audioBytes != null && message.audioBytes!.isNotEmpty;

      return Padding(
        padding: const EdgeInsets.only(bottom: 12, right: 28),
        child: Align(
          alignment: Alignment.centerRight,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: _bubbleUser,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(18),
                topRight: Radius.circular(18),
                bottomLeft: Radius.circular(18),
                bottomRight: Radius.circular(4),
              ),
              border: Border.all(color: _primary.withValues(alpha: 0.15)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  message.text,
                  style: const TextStyle(
                    color: _textPrimary,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    height: 1.5,
                  ),
                ),
                if (hasAudio) ...[
                  const SizedBox(height: 6),
                  InkWell(
                    onTap: () => onPlayAudio(message.audioBytes!),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _primaryLight,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            message.isPlaying
                                ? Icons.pause_circle_filled_rounded
                                : Icons.play_circle_fill_rounded,
                            color: _primary,
                            size: 20,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            message.isPlaying ? strings.stopUserVoice : strings.listenUserVoice,
                            style: const TextStyle(
                              color: _primary,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 6),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.done_all_rounded,
                        size: 13,
                        color: _primary.withValues(alpha: 0.7),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _formatDateTime(message.time, context.languageCode),
                        style: TextStyle(
                          color: _textMuted.withValues(alpha: 0.9),
                          fontSize: 9.5,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Assistant reply
    final hasCoachVoice = message.audioBytes != null && message.audioBytes!.isNotEmpty;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: _surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: _border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: _surfaceWarm,
                    shape: BoxShape.circle,
                    border: Border.all(color: _border),
                  ),
                  child: Image.asset(
                    'assets/images/el7lm-logo.png',
                    fit: BoxFit.contain,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    strings.nisrTitle,
                    style: const TextStyle(
                      color: _textPrimary,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                if (hasCoachVoice) ...[
                  IconButton(
                    onPressed: () => onPlayAudio(message.audioBytes!),
                    icon: Icon(
                      message.isPlaying
                          ? Icons.pause_circle_filled_rounded
                          : Icons.volume_up_rounded,
                      color: _primary,
                      size: 22,
                    ),
                    tooltip: message.isPlaying ? strings.stopUserVoice : strings.listenCoachVoice,
                    visualDensity: VisualDensity.compact,
                  ),
                ],
                IconButton(
                  onPressed: () => _copy(context, message.text),
                  icon: const Icon(
                    Icons.copy_rounded,
                    color: _textMuted,
                    size: 16,
                  ),
                  tooltip: strings.copySuccess,
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            if (hasCoachVoice) ...[
              const SizedBox(height: 6),
              InkWell(
                onTap: () => onPlayAudio(message.audioBytes!),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: _primaryLight,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: _primary.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        message.isPlaying
                            ? Icons.pause_rounded
                            : Icons.play_arrow_rounded,
                        color: _primary,
                        size: 18,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        message.isPlaying ? strings.coachSpeaking : strings.listenCoachVoice,
                        style: const TextStyle(
                          color: _primary,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 10),
            SelectableText(
              message.text,
              style: const TextStyle(
                color: _textPrimary,
                fontSize: 13.5,
                height: 1.65,
                fontWeight: FontWeight.w400,
              ),
            ),
            const SizedBox(height: 10),
            const Divider(height: 1, color: _border),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.access_time_rounded,
                      size: 12,
                      color: _textMuted,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      _formatDateTime(message.time, context.languageCode),
                      style: const TextStyle(
                        color: _textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                Text(
                  strings.platformBadge,
                  style: const TextStyle(
                    color: _textMuted,
                    fontSize: 9.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Thinking Bubble (ChatGPT Style) ──────────────────────────────────────────
class _ThinkingBubble extends StatelessWidget {
  const _ThinkingBubble({required this.strings});

  final _NisrL10n strings;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: _surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: _border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 24,
              height: 24,
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: _surfaceWarm,
                shape: BoxShape.circle,
                border: Border.all(color: _border),
              ),
              child: Image.asset(
                'assets/images/el7lm-logo.png',
                fit: BoxFit.contain,
              ),
            ),
            const SizedBox(width: 10),
            const SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: _primary,
              ),
            ),
            const SizedBox(width: 10),
            Text(
              strings.coachAnalyzing,
              style: const TextStyle(
                color: _textSecondary,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Voice Recording Banner ───────────────────────────────────────────────────
class _VoiceRecordingBar extends StatelessWidget {
  const _VoiceRecordingBar({
    required this.secs,
    required this.onStopAndSend,
    required this.onCancel,
    required this.strings,
  });

  final int secs;
  final VoidCallback onStopAndSend;
  final VoidCallback onCancel;
  final _NisrL10n strings;

  @override
  Widget build(BuildContext context) {
    final s = (secs % 60).toString().padLeft(2, '0');
    final m = (secs ~/ 60).toString().padLeft(2, '0');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: _redLight,
        border: Border(top: BorderSide(color: _red.withValues(alpha: 0.3))),
      ),
      child: Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: _red,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '${strings.listeningBanner} $m:$s',
            style: const TextStyle(
              color: _red,
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
            ),
          ),
          const Spacer(),
          TextButton(
            onPressed: onCancel,
            child: Text(
              strings.cancel,
              style: const TextStyle(color: _textSecondary, fontSize: 12),
            ),
          ),
          ElevatedButton.icon(
            onPressed: onStopAndSend,
            style: ElevatedButton.styleFrom(
              backgroundColor: _red,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              visualDensity: VisualDensity.compact,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
              ),
            ),
            icon: const Icon(Icons.send_rounded, size: 14),
            label: Text(strings.send, style: const TextStyle(fontSize: 12)),
          ),
        ],
      ),
    );
  }
}

// ─── Chat Composer ───────────────────────────────────────────────────────────
class _ChatComposer extends StatefulWidget {
  const _ChatComposer({
    required this.ctrl,
    required this.focusNode,
    required this.busy,
    required this.listening,
    required this.onTap,
    required this.onSend,
    required this.onVoice,
    required this.strings,
  });

  final TextEditingController ctrl;
  final FocusNode focusNode;
  final bool busy;
  final bool listening;
  final VoidCallback onTap;
  final VoidCallback onSend;
  final VoidCallback onVoice;
  final _NisrL10n strings;

  @override
  State<_ChatComposer> createState() => _ChatComposerState();
}

class _ChatComposerState extends State<_ChatComposer> {
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    widget.ctrl.addListener(_checkText);
  }

  void _checkText() {
    final has = widget.ctrl.text.trim().isNotEmpty;
    if (has != _hasText) {
      setState(() => _hasText = has);
    }
  }

  @override
  void dispose() {
    widget.ctrl.removeListener(_checkText);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: _surface,
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
      child: Container(
        decoration: BoxDecoration(
          color: _surfaceWarm,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: widget.focusNode.hasFocus ? _borderFocus : _border,
          ),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            // Voice Mic Button
            IconButton(
              onPressed: widget.busy ? null : widget.onVoice,
              icon: Icon(
                widget.listening ? Icons.stop_circle_rounded : Icons.mic_rounded,
                color: widget.listening ? _red : _primary,
                size: 24,
              ),
              tooltip: widget.listening ? widget.strings.stopUserVoice : widget.strings.listenUserVoice,
            ),
            // Text Input Field
            Expanded(
              child: GestureDetector(
                onTap: widget.onTap,
                child: TextField(
                  controller: widget.ctrl,
                  focusNode: widget.focusNode,
                  enabled: !widget.busy,
                  keyboardType: TextInputType.multiline,
                  minLines: 1,
                  maxLines: 4,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) {
                    if (_hasText && !widget.busy) widget.onSend();
                  },
                  style: const TextStyle(
                    color: _textPrimary,
                    fontSize: 14,
                    height: 1.4,
                  ),
                  decoration: InputDecoration(
                    hintText: widget.strings.composerHint,
                    hintStyle: const TextStyle(
                      color: _textMuted,
                      fontSize: 13,
                    ),
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 10,
                    ),
                  ),
                ),
              ),
            ),
            // Send Button
            Padding(
              padding: const EdgeInsets.only(bottom: 2),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _hasText && !widget.busy
                      ? _primary
                      : _textMuted.withValues(alpha: 0.2),
                ),
                child: IconButton(
                  onPressed: (_hasText && !widget.busy) ? widget.onSend : null,
                  padding: EdgeInsets.zero,
                  icon: widget.busy
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Icon(
                          Icons.arrow_upward_rounded,
                          size: 20,
                          color: _hasText ? Colors.white : _textMuted,
                        ),
                  tooltip: widget.strings.send,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
