'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/firebase/auth-provider';
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
  onClose: () => void;
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
      // استخراج معرف اللاعب من معرف الفيديو
      const [playerId, videoIndex] = videoId.split('_');

      // جلب بيانات اللاعب
      const playerRef = doc(db, 'players', playerId);
      const playerDoc = await getDoc(playerRef);

      if (playerDoc.exists()) {
        const playerData = playerDoc.data();
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
    // منع الإرسال المتكرر
    if (submitting) {
      console.log('🛑 Comment submission blocked - already submitting');
      return;
    }

    if (!newComment.trim()) {
      setError('يرجى إدخال تعليق');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: videoId,
          comment: newComment,
          userId: user?.uid
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage('تم إرسال التعليق بنجاح!');
        setComments(prev => [...prev, result.comment]);
        setNewComment('');
      } else {
        setError(result.error || 'فشل في إرسال التعليق');
      }
    } catch (error: any) {
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
        onClick={onClose}
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
            onClick={onClose}
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
                      {comment.createdAt?.toDate?.() ? dayjs(comment.createdAt.toDate()).locale('ar').fromNow() : ''}
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
        <div className="p-6 border-t border-white/10 bg-zinc-900/80 backdrop-blur-md pb-10">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSubmitComment(); }}
            className="relative flex items-center"
          >
            <div className="relative flex-1 group">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="أضف تعليقاً..."
                className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-14 pr-6 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all text-sm"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white disabled:bg-white/5 disabled:text-white/20 transition-all hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-600/20"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5 -rotate-45 ml-1" />
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
} 
