'use client';

import PlayerImage from '@/components/ui/player-image';
import { useAuth } from '@/lib/firebase/auth-provider';
import { supabase } from '@/lib/supabase/config';
import { dispatchNotification } from '@/lib/notifications/notification-dispatcher';
import { MessageData, UnifiedNotificationService } from '@/lib/notifications/unified-notification-service';
import { getPlayerAvatarUrl } from '@/lib/supabase/image-utils';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, MessageSquare, Send, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface MessageComposerSheetProps {
  playerId: string;
  playerName: string;
  playerImage: string;
  playerPosition?: string;
  isOpen: boolean;
  onClose: () => void;
  senderAccountType: string;
}


export default function MessageComposerSheet({
  playerId, playerName, playerImage, playerPosition,
  isOpen, onClose, senderAccountType,
}: MessageComposerSheetProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { user, userData } = useAuth();

  useEffect(() => {
    if (isOpen && !sent) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
    if (!isOpen) {
      setTimeout(() => { setText(''); setSent(false); setError(''); }, 300);
    }
  }, [isOpen, sent]);

  const getSenderInfo = useCallback(async () => {
    let name = user?.user_metadata?.full_name || 'مستخدم';
    let avatar = user?.user_metadata?.avatar_url || '';

    if (userData) {
      name = userData.full_name || userData.club_name || userData.academy_name
        || userData.agent_name || userData.trainer_name || userData.name || name;
      avatar = userData.avatar || userData.image || userData.logo || avatar;
    }

    // fallback: try players collection
    if (!name || name === 'مستخدم') {
      try {
        const { data } = await supabase.from('players').select('*').eq('id', user!.id).maybeSingle();
        if (data) {
          name = data.full_name || data.name || name;
          avatar = getPlayerAvatarUrl(data) || avatar;
        }
      } catch {}
    }

    return { name, avatar };
  }, [user, userData]);

  const handleSend = async () => {
    if (!text.trim() || sending || !user) return;
    setSending(true);
    setError('');

    try {
      const { name: senderName, avatar: senderAvatar } = await getSenderInfo();

      // 1. Save message to Supabase
      const msgData: MessageData = {
        senderId: user.id,
        receiverId: playerId,
        content: text.trim(),
        type: 'text',
        priority: 'medium',
        senderName,
        senderAvatar,
        receiverName: playerName,
        receiverAvatar: playerImage,
        senderAccountType,
        receiverAccountType: 'player',
        metadata: { source: 'cinema_video' },
      };
      await UnifiedNotificationService.createMessage(msgData);

      // 2. Dispatch message notification (in-app + WhatsApp)
      await dispatchNotification({
        eventType: 'message_received',
        targetUserId: playerId,
        actorId: user.id,
        actorName: senderName,
        actorAccountType: senderAccountType,
        metadata: { messagePreview: text.trim().substring(0, 40) },
      });

      setSent(true);
    } catch (err) {
      console.error('MessageComposer error:', err);
      setError('تعذّر إرسال الرسالة، حاول مجدداً');
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-[110] flex flex-col justify-end" dir="rtl">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="relative z-10 w-full bg-zinc-900/98 backdrop-blur-xl border-t border-white/10 rounded-t-3xl shadow-2xl"
            style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif", paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
          >
            {/* Handle */}
            <div className="pt-3 pb-4 flex justify-center">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {sent ? (
              /* ── Success state ── */
              <div className="flex flex-col items-center gap-4 px-6 pb-6 text-white">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </motion.div>
                <div className="text-center">
                  <p className="font-black text-lg">تم الإرسال بنجاح!</p>
                  <p className="text-white/50 text-sm mt-1">
                    سيتلقى {playerName} إشعاراً برسالتك
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="mt-2 px-8 py-3 bg-white/10 border border-white/15 rounded-full font-bold text-sm active:scale-95 transition-transform"
                >
                  إغلاق
                </button>
              </div>
            ) : (
              /* ── Compose state ── */
              <>
                {/* Player info header */}
                <div className="flex items-center gap-3 px-5 pb-4 border-b border-white/8">
                  <div className="w-11 h-11 rounded-full border-2 border-white/20 overflow-hidden shrink-0">
                    <PlayerImage src={playerImage} alt={playerName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-base leading-tight truncate">
                      {playerName}
                    </p>
                    {playerPosition && (
                      <p className="text-white/45 text-xs mt-0.5">{playerPosition}</p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/8 text-white/50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Compose */}
                <div className="px-5 pt-4 pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-4 h-4 text-blue-400 shrink-0" />
                    <p className="text-white/60 text-xs font-bold">رسالة جديدة</p>
                  </div>
                  <textarea
                    ref={inputRef}
                    value={text}
                    onChange={(e) => { setText(e.target.value); setError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={`اكتب رسالتك لـ ${playerName}...`}
                    rows={3}
                    maxLength={500}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/25
                      focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-white/8 transition-all
                      text-sm resize-none leading-relaxed"
                    style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-white/25 text-xs">{text.length}/500</span>
                    {error && <span className="text-red-400 text-xs">{error}</span>}
                  </div>
                </div>

                {/* Send button */}
                <div className="px-5 pt-1">
                  <button
                    onClick={handleSend}
                    disabled={!text.trim() || sending || !user}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm
                      bg-blue-600 text-white disabled:opacity-30 active:scale-98 transition-all shadow-lg shadow-blue-600/25"
                    style={{ touchAction: 'manipulation' }}
                  >
                    {sending ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        إرسال الرسالة
                      </>
                    )}
                  </button>
                  {!user && (
                    <p className="text-center text-white/30 text-xs mt-2">يجب تسجيل الدخول للإرسال</p>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
