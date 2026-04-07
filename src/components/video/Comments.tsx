'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/config';
import { useAuth } from '@/lib/firebase/auth-provider';
import { dispatchNotification } from '@/lib/notifications/notification-dispatcher';
import { Send, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import PlayerImage from '@/components/ui/player-image';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ar';
dayjs.extend(relativeTime);

interface Comment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userImage: string;
  createdAt: any;
}

interface CommentsProps {
  videoId: string;
  isOpen: boolean;
  onClose: (newCount?: number) => void;
  inline?: boolean;
}

export default function Comments({ videoId, isOpen, onClose, inline = false }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, videoId]);

  const fetchComments = async () => {
    try {
      const [playerId, videoIndex] = videoId.split('_');

      const { data: playerData } = await supabase.from('players').select('*').eq('id', playerId).maybeSingle();

      if (playerData) {
        const videos = playerData.videos || [];
        const videoIndexNum = parseInt(videoIndex);

        if (videos[videoIndexNum] && videos[videoIndexNum].comments) {
          setComments(videos[videoIndexNum].comments);
        } else {
          setComments([]);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (submitting) return;
    if (!newComment.trim()) {
      setError('يرجى إدخال تعليق');
      return;
    }
    if (!user) {
      setError('يجب تسجيل الدخول أولاً');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const [playerId, videoIndex] = videoId.split('_');
      const { data: playerData } = await supabase.from('players').select('*').eq('id', playerId).maybeSingle();

      if (!playerData) {
        setError('لم يتم العثور على الفيديو');
        return;
      }

      // Fetch commenter's display info
      let userName = user.user_metadata?.full_name || 'مستخدم';
      let userImage = user.user_metadata?.avatar_url || '';
      try {
        const { data: ud } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
        if (ud) {
          userName = ud.displayName || ud.full_name || ud.name || userName;
          userImage = ud.photoURL || ud.avatar || userImage;
        }
        const { data: pd } = await supabase.from('players').select('*').eq('id', user.id).maybeSingle();
        if (pd) {
          userName = pd.full_name || pd.name || userName;
          userImage = pd.avatar || pd.image || userImage;
        }
      } catch {}

      const newCommentObj: Comment = {
        id: `${user.id}_${Date.now()}`,
        text: newComment.trim(),
        userId: user.id,
        userName,
        userImage,
        createdAt: { toDate: () => new Date() }, // local mock for instant display
      };

      // Write to Supabase
      const videos = [...(playerData.videos || [])];
      const idx = parseInt(videoIndex);
      if (videos[idx]) {
        const existingComments = Array.isArray(videos[idx].comments) ? videos[idx].comments : [];
        const supabaseComment = {
          id: newCommentObj.id,
          text: newCommentObj.text,
          userId: user.id,
          userName,
          userImage,
          createdAt: new Date().toISOString(),
        };
        videos[idx] = {
          ...videos[idx],
          comments: [...existingComments, supabaseComment],
          commentsCount: (videos[idx].commentsCount || existingComments.length) + 1,
        };
        await supabase.from('players').update({ videos }).eq('id', playerId);
      }

      // Dispatch video_comment notification
      if (user.id !== playerId) {
        const { data: userDataForType } = await supabase.from('users').select('accountType').eq('id', user.id).maybeSingle();
        const actorAccountType = userDataForType?.accountType || 'player';
        dispatchNotification({
          eventType: 'video_comment',
          targetUserId: playerId,
          actorId: user.id,
          actorName: userName,
          actorAccountType,
          metadata: { videoId, commentText: newComment.trim().substring(0, 40) },
        });
      }

      // Optimistic UI update
      setComments(prev => [...prev, newCommentObj]);
      setNewComment('');
      setMessage('تم إرسال التعليق بنجاح!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Comment error:', err);
      setError('حدث خطأ في إرسال التعليق');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={inline ? "absolute inset-0 z-30 flex flex-col justify-end" : "fixed inset-0 z-50 flex flex-col justify-end"}>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => onClose(comments.length)}
        className={inline ? "absolute inset-0 bg-black/40 backdrop-blur-sm" : "absolute inset-0 bg-black/60 backdrop-blur-md"}
      />

      {/* Bottom Sheet Panel */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={`relative z-10 w-full ${inline ? 'max-h-[75%]' : 'max-h-[85vh]'} bg-zinc-900/95 backdrop-blur-xl border-t border-white/10 rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col`}
      >
        {/* Drag Handle */}
        <div className="pt-3 pb-1 flex justify-center sticky top-0 bg-zinc-900/50 backdrop-blur-sm z-20">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between sticky top-6 bg-zinc-900/50 backdrop-blur-sm z-20">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            التعليقات
            <span className="text-sm font-normal text-white/50 bg-white/5 px-2 py-0.5 rounded-full">
              {comments.length}
            </span>
          </h2>
          <button
            onClick={() => onClose(comments.length)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20 space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/10 border-t-white"></div>
              <p className="text-white/40 text-sm">جاري تحميل التعليقات...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-20 opacity-40">
              <MessageCircle className="w-16 h-16 mb-4" />
              <p className="text-lg">لا توجد تعليقات بعد</p>
              <p className="text-sm">كن أول من يعلق على هذا الفيديو!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                key={comment.id}
                className="flex items-start gap-4"
              >
                <div className="flex-shrink-0">
                  <PlayerImage
                    src={comment.userImage}
                    alt={comment.userName}
                    className="w-10 h-10 rounded-full border border-white/10"
                    fallback="/default-player-avatar.png"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{comment.userName}</span>
                    <span className="text-[10px] text-white/30">
                      {comment.createdAt
                        ? dayjs(
                            typeof comment.createdAt.toDate === 'function'
                              ? comment.createdAt.toDate()
                              : comment.createdAt
                          ).locale('ar').fromNow()
                        : ''}
                    </span>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-3 text-white/90 text-sm leading-relaxed">
                    {comment.text}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Comment Input */}
        <div className="px-4 pt-3 pb-safe border-t border-white/10 bg-zinc-900/90 backdrop-blur-md"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          {/* Error / success feedback */}
          {(error || message) && (
            <div className={`mb-2 px-4 py-2 rounded-xl text-xs font-bold text-center
              ${error ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {error || message}
            </div>
          )}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSubmitComment(); }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={newComment}
              onChange={(e) => { setNewComment(e.target.value); if (error) setError(''); }}
              placeholder="أضف تعليقاً..."
              className="flex-1 bg-white/8 border border-white/10 rounded-full py-3 px-5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-white/10 transition-all text-sm"
              style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-blue-600 text-white
                disabled:opacity-30 transition-all active:scale-90 shadow-lg shadow-blue-600/30"
              style={{ touchAction: 'manipulation' }}
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
