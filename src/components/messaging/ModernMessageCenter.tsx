'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    getDocs,
    getDoc,
    doc as firestoreDoc,
    addDoc,
    updateDoc,
    serverTimestamp,
    deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { useMediaQuery } from '@/hooks/use-media-query';
import {
    Send,
    Search,
    Plus,
    MoreVertical,
    Phone,
    Video,
    Paperclip,
    Smile,
    Mic,
    ChevronRight,
    ChevronLeft,
    ArrowRight,
    Loader2,
    MessageSquare,
    Check,
    CheckCheck,
    Info,
    Bell,
    BellOff,
    Archive,
    Pin,
    Trash2,
    Download,
    Image as ImageIcon,
    File,
    X,
    Volume2,
    Play,
    Pause
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { NewChatModal } from '@/components/messaging/NewChatModal';
import dynamic from 'next/dynamic';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import SimpleEmojiPicker from './SimpleEmojiPicker';

interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    receiverId: string;
    senderName: string;
    message: string;
    timestamp: any;
    isRead: boolean;
    isPinned?: boolean;
}

interface Conversation {
    id: string;
    participants: string[];
    participantNames: Record<string, string>;
    participantTypes: Record<string, string>;
    lastMessage: string;
    lastMessageTime: any;
    lastSenderId: string;
    unreadCount: Record<string, number>;
    participantAvatars?: Record<string, string>;
    isMuted?: Record<string, boolean>;
    isArchived?: Record<string, boolean>;
    isPinned?: Record<string, boolean>;
}

interface ParticipantInfo {
    id: string;
    name: string;
    type: string;
    avatar: string;
    email?: string;
    phone?: string;
    isOnline?: boolean;
}

const ModernMessageCenter: React.FC = () => {
    const { user, userData } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [chatSearchTerm, setChatSearchTerm] = useState('');
    const [newChatModalOpen, setNewChatModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [participantsData, setParticipantsData] = useState<Record<string, ParticipantInfo>>({});
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const [showProfileSheet, setShowProfileSheet] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);

    const isMobile = useMediaQuery('(max-width: 768px)');
    const isTablet = useMediaQuery('(max-width: 1024px)');

    // إغلاق Emoji Picker عند النقر خارجه
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showEmojiPicker && !(event.target as Element).closest('.emoji-picker-container')) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showEmojiPicker]);

    const cloudflareUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-ef6e461732904df2ba5b13e7ec5e9bb5.r2.dev';

    const getAvatarUrl = (userId: string, type: string) => {
        if (type === 'club') {
            return `${cloudflareUrl}/club-logos/${userId}.jpg`;
        } else if (type === 'academy') {
            return `${cloudflareUrl}/academy-logos/${userId}.jpg`;
        } else {
            return `${cloudflareUrl}/avatars/${userId}.jpg`;
        }
    };

    const loadParticipantData = async (participantId: string, type: string): Promise<ParticipantInfo> => {
        try {
            const collections = [
                type === 'club' ? 'clubs' :
                    type === 'academy' ? 'academies' :
                        type === 'player' ? 'players' :
                            type === 'trainer' ? 'trainers' :
                                type === 'agent' ? 'agents' : 'users'
            ];

            for (const collectionName of collections) {
                try {
                    const docRef = firestoreDoc(db, collectionName, participantId);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        return {
                            id: participantId,
                            name: data.displayName || data.name || data.full_name || data.club_name || data.academy_name || 'مستخدم',
                            type: type || 'user',
                            avatar: getAvatarUrl(participantId, type),
                            email: data.email || '',
                            phone: data.phone || '',
                            isOnline: false
                        };
                    }
                } catch (error) {
                    console.log(`Not found in ${collectionName}`);
                }
            }

            return {
                id: participantId,
                name: 'مستخدم',
                type: type || 'user',
                avatar: getAvatarUrl(participantId, type)
            };
        } catch (error) {
            console.error('Error loading participant:', error);
            return {
                id: participantId,
                name: 'مستخدم',
                type: type || 'user',
                avatar: getAvatarUrl(participantId, type)
            };
        }
    };

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'conversations'),
            where('participants', 'array-contains', user.uid)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const convs: Conversation[] = [];

            snapshot.forEach((doc) => {
                const data = doc.data() as Conversation;
                if (!data.isArchived?.[user.uid]) {
                    convs.push({ id: doc.id, ...data });
                }
            });

            convs.sort((a, b) => {
                const aPinned = a.isPinned?.[user.uid] || false;
                const bPinned = b.isPinned?.[user.uid] || false;
                if (aPinned && !bPinned) return -1;
                if (!aPinned && bPinned) return 1;

                const aTime = a.lastMessageTime?.toMillis() || 0;
                const bTime = b.lastMessageTime?.toMillis() || 0;
                return bTime - aTime;
            });

            const participantsMap: Record<string, ParticipantInfo> = {};
            for (const conv of convs) {
                for (const participantId of conv.participants) {
                    if (participantId !== user.uid && !participantsMap[participantId]) {
                        const type = conv.participantTypes?.[participantId] || 'user';
                        participantsMap[participantId] = await loadParticipantData(participantId, type);
                    }
                }
            }

            setParticipantsData(participantsMap);
            setConversations(convs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!selectedConversation) return;

        const q = query(
            collection(db, 'messages'),
            where('conversationId', '==', selectedConversation.id),
            orderBy('timestamp', 'asc')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const msgs: Message[] = [];
            snapshot.forEach((doc) => {
                msgs.push({ id: doc.id, ...doc.data() } as Message);
            });
            setMessages(msgs);

            const unreadMessages = msgs.filter(msg =>
                msg.receiverId === user?.uid && !msg.isRead
            );

            for (const msg of unreadMessages) {
                try {
                    await updateDoc(firestoreDoc(db, 'messages', msg.id), { isRead: true });
                } catch (error) {
                    console.error('Error marking message as read:', error);
                }
            }

            if (unreadMessages.length > 0) {
                try {
                    await updateDoc(firestoreDoc(db, 'conversations', selectedConversation.id), {
                        [`unreadCount.${user?.uid}`]: 0
                    });
                } catch (error) {
                    console.error('Error updating unread count:', error);
                }
            }

            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        });

        return () => unsubscribe();
    }, [selectedConversation, user]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation || !user) return;

        const otherParticipantId = selectedConversation.participants.find(id => id !== user.uid);
        if (!otherParticipantId) return;

        try {
            await addDoc(collection(db, 'messages'), {
                conversationId: selectedConversation.id,
                senderId: user.uid,
                receiverId: otherParticipantId,
                senderName: userData?.full_name || user.email || 'مستخدم',
                message: newMessage.trim(),
                timestamp: serverTimestamp(),
                isRead: false,
                messageType: 'text',
                isPinned: false
            });

            await updateDoc(firestoreDoc(db, 'conversations', selectedConversation.id), {
                lastMessage: newMessage.trim(),
                lastMessageTime: serverTimestamp(),
                lastSenderId: user.uid,
                [`unreadCount.${otherParticipantId}`]: (selectedConversation.unreadCount?.[otherParticipantId] || 0) + 1
            });

            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('فشل إرسال الرسالة');
        }
    };

    const handleStartChat = async (selectedUser: any) => {
        if (!user) return;

        try {
            const existingConv = conversations.find(conv =>
                conv.participants.includes(selectedUser.id)
            );

            if (existingConv) {
                setSelectedConversation(existingConv);
                setNewChatModalOpen(false);
                toast.success('تم فتح المحادثة');
                return;
            }

            await addDoc(collection(db, 'conversations'), {
                participants: [user.uid, selectedUser.id],
                participantNames: {
                    [user.uid]: userData?.full_name || user.email || 'مستخدم',
                    [selectedUser.id]: selectedUser.name
                },
                participantTypes: {
                    [user.uid]: userData?.accountType || 'user',
                    [selectedUser.id]: selectedUser.type
                },
                lastMessage: '',
                lastMessageTime: serverTimestamp(),
                lastSenderId: '',
                unreadCount: { [user.uid]: 0, [selectedUser.id]: 0 },
                isActive: true,
                createdAt: serverTimestamp()
            });

            toast.success('تم إنشاء محادثة جديدة');
            setNewChatModalOpen(false);
        } catch (error) {
            console.error('Error creating conversation:', error);
            toast.error('فشل إنشاء المحادثة');
        }
    };

    const handleMuteConversation = async () => {
        if (!selectedConversation || !user) return;
        try {
            const isMuted = selectedConversation.isMuted?.[user.uid] || false;
            await updateDoc(firestoreDoc(db, 'conversations', selectedConversation.id), {
                [`isMuted.${user.uid}`]: !isMuted
            });
            toast.success(isMuted ? 'تم إلغاء كتم الإشعارات' : 'تم كتم الإشعارات');
        } catch (error) {
            toast.error('فشل تحديث الإشعارات');
        }
    };

    const handleArchiveConversation = async () => {
        if (!selectedConversation || !user) return;
        try {
            await updateDoc(firestoreDoc(db, 'conversations', selectedConversation.id), {
                [`isArchived.${user.uid}`]: true
            });
            setSelectedConversation(null);
            toast.success('تم أرشفة المحادثة');
        } catch (error) {
            toast.error('فشل الأرشفة');
        }
    };

    const handlePinConversation = async (convId: string) => {
        if (!user) return;
        try {
            const conv = conversations.find(c => c.id === convId);
            const isPinned = conv?.isPinned?.[user.uid] || false;
            await updateDoc(firestoreDoc(db, 'conversations', convId), {
                [`isPinned.${user.uid}`]: !isPinned
            });
            toast.success(isPinned ? 'تم إلغاء التثبيت' : 'تم تثبيت المحادثة');
        } catch (error) {
            toast.error('فشل التثبيت');
        }
    };

    const handleDeleteConversation = async () => {
        if (!selectedConversation || !user) return;
        try {
            const messagesQuery = query(
                collection(db, 'messages'),
                where('conversationId', '==', selectedConversation.id)
            );
            const messagesSnapshot = await getDocs(messagesQuery);

            for (const doc of messagesSnapshot.docs) {
                await deleteDoc(doc.ref);
            }

            await deleteDoc(firestoreDoc(db, 'conversations', selectedConversation.id));
            setSelectedConversation(null);
            toast.success('تم حذف المحادثة');
        } catch (error) {
            toast.error('فشل الحذف');
        }
    };

    const startVoiceRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecordingVoice(true);
            setRecordingTime(0);

            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            toast.success('بدأ التسجيل الصوتي');
        } catch (error) {
            console.error('Error starting voice recording:', error);
            toast.error('فشل بدء التسجيل - تحقق من أذونات الميكروفون');
        }
    };

    const stopVoiceRecording = () => {
        if (mediaRecorderRef.current && isRecordingVoice) {
            mediaRecorderRef.current.stop();
            setIsRecordingVoice(false);

            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
                recordingIntervalRef.current = null;
            }
        }
    };

    const playVoiceMessage = (messageId: string, audioUrl: string) => {
        if (playingVoiceId === messageId) {
            // إيقاف التشغيل
            audioElementRef.current?.pause();
            setPlayingVoiceId(null);
        } else {
            // إيقاف أي صوت آخر يتم تشغيله
            audioElementRef.current?.pause();

            // تشغيل الصوت الجديد
            const audio = new Audio(audioUrl);
            audioElementRef.current = audio;

            audio.onended = () => {
                setPlayingVoiceId(null);
            };

            audio.onerror = () => {
                toast.error('فشل تشغيل الرسالة الصوتية');
                setPlayingVoiceId(null);
            };

            audio.play()
                .then(() => {
                    setPlayingVoiceId(messageId);
                })
                .catch((error) => {
                    console.error('Error playing audio:', error);
                    toast.error('فشل تشغيل الرسالة الصوتية');
                    setPlayingVoiceId(null);
                });
        }
    };

    const cancelVoiceRecording = () => {
        stopVoiceRecording();
        setAudioBlob(null);
        setRecordingTime(0);
        toast.info('تم إلغاء التسجيل');
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('الرجاء اختيار صورة فقط');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
            return;
        }

        setSelectedImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const uploadImageToCloudflare = async (file: File): Promise<string> => {
        // في الواقع، يجب رفع الصورة إلى Cloudflare R2
        // للآن، سنستخدم base64 كحل مؤقت
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result as string);
            };
            reader.readAsDataURL(file);
        });
    };

    const sendImageMessage = async () => {
        if (!selectedImage || !selectedConversation || !user) return;

        const otherParticipantId = selectedConversation.participants.find(id => id !== user.uid);
        if (!otherParticipantId) return;

        try {
            setIsUploadingImage(true);
            const imageUrl = await uploadImageToCloudflare(selectedImage);

            await addDoc(collection(db, 'messages'), {
                conversationId: selectedConversation.id,
                senderId: user.uid,
                receiverId: otherParticipantId,
                senderName: userData?.full_name || user.email || 'مستخدم',
                message: '📷 صورة',
                imageUrl: imageUrl,
                timestamp: serverTimestamp(),
                isRead: false,
                messageType: 'image',
                isPinned: false
            });

            await updateDoc(firestoreDoc(db, 'conversations', selectedConversation.id), {
                lastMessage: '📷 صورة',
                lastMessageTime: serverTimestamp(),
                lastSenderId: user.uid,
                [`unreadCount.${otherParticipantId}`]: (selectedConversation.unreadCount?.[otherParticipantId] || 0) + 1
            });

            setSelectedImage(null);
            setImagePreview(null);
            toast.success('تم إرسال الصورة');
        } catch (error) {
            console.error('Error sending image:', error);
            toast.error('فشل إرسال الصورة');
        } finally {
            setIsUploadingImage(false);
        }
    };

    const sendVoiceMessage = async () => {
        if (!audioBlob || !selectedConversation || !user) return;

        const otherParticipantId = selectedConversation.participants.find(id => id !== user.uid);
        if (!otherParticipantId) return;

        try {
            // رفع الملف الصوتي إلى Cloudflare R2
            const formData = new FormData();
            formData.append('audio', audioBlob, 'voice-message.webm');
            formData.append('userId', user.uid);

            toast.info('جاري رفع الرسالة الصوتية...');

            const uploadResponse = await fetch('/api/upload-voice', {
                method: 'POST',
                body: formData,
            });

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload voice message');
            }

            const { url: voiceUrl } = await uploadResponse.json();

            // حفظ الرسالة في Firestore مع رابط الملف
            await addDoc(collection(db, 'messages'), {
                conversationId: selectedConversation.id,
                senderId: user.uid,
                receiverId: otherParticipantId,
                senderName: userData?.full_name || user.email || 'مستخدم',
                message: `🎤 رسالة صوتية (${recordingTime} ثانية)`,
                voiceUrl: voiceUrl,
                timestamp: serverTimestamp(),
                isRead: false,
                messageType: 'voice',
                voiceDuration: recordingTime,
                isPinned: false
            });

            await updateDoc(firestoreDoc(db, 'conversations', selectedConversation.id), {
                lastMessage: '🎤 رسالة صوتية',
                lastMessageTime: serverTimestamp(),
                lastSenderId: user.uid,
                [`unreadCount.${otherParticipantId}`]: (selectedConversation.unreadCount?.[otherParticipantId] || 0) + 1
            });

            setAudioBlob(null);
            setRecordingTime(0);
            toast.success('تم إرسال الرسالة الصوتية');
        } catch (error) {
            console.error('Error sending voice message:', error);
            toast.error('فشل إرسال الرسالة الصوتية');
        }
    };

    const filteredConversations = conversations.filter(conv => {
        if (!searchTerm) return true;
        const otherParticipantId = conv.participants.find(id => id !== user?.uid);
        const otherParticipant = otherParticipantId ? participantsData[otherParticipantId] : null;
        const otherName = otherParticipant?.name || '';
        return otherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            conv.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const filteredMessages = messages.filter(msg => {
        if (!chatSearchTerm) return true;
        return msg.message.toLowerCase().includes(chatSearchTerm.toLowerCase());
    });

    const getOtherParticipant = (conv: Conversation): ParticipantInfo | null => {
        const otherParticipantId = conv.participants.find(id => id !== user?.uid);
        if (!otherParticipantId) return null;
        return participantsData[otherParticipantId] || null;
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (hours < 24) {
            return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        } else if (hours < 48) {
            return 'أمس';
        } else {
            return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
                    <p className="text-sm font-medium text-gray-600">جاري تحميل المحادثات...</p>
                </div>
            </div>
        );
    }

    const currentOtherUser = selectedConversation ? getOtherParticipant(selectedConversation) : null;

    return (
        <div className="flex h-screen bg-white overflow-hidden" dir="rtl">
            {/* Sidebar */}
            <motion.div
                initial={false}
                animate={{
                    width: isSidebarCollapsed ? 0 : (isMobile && selectedConversation) ? 0 : isMobile ? '100%' : 380,
                    opacity: isSidebarCollapsed ? 0 : 1
                }}
                transition={{ duration: 0.25 }}
                className={cn(
                    "border-l border-gray-100 bg-white overflow-hidden flex-shrink-0",
                    isMobile && "absolute inset-0 z-20",
                    isMobile && selectedConversation && "hidden"
                )}
            >
                <div className={cn("flex flex-col h-full", isMobile ? "w-full" : "w-[380px]")}>
                    {/* Header */}
                    <div className="px-5 py-6 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-5">
                            <h1 className="text-2xl font-bold text-gray-900">المحادثات</h1>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-10 w-10 rounded-full hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                                onClick={() => setNewChatModalOpen(true)}
                            >
                                <Plus className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="relative">
                            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="ابحث عن محادثة..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pr-10 h-11 bg-gray-50 border-0 focus-visible:ring-1 focus-visible:ring-emerald-500 rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Conversations List */}
                    <ScrollArea className="flex-1">
                        {filteredConversations.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center h-full px-6 py-12 text-center"
                            >
                                <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                                    <MessageSquare className="h-10 w-10 text-gray-300" />
                                </div>
                                <h3 className="text-base font-semibold text-gray-900 mb-1.5">لا توجد محادثات</h3>
                                <p className="text-sm text-gray-500 mb-5">ابدأ محادثة جديدة الآن</p>
                                <Button
                                    onClick={() => setNewChatModalOpen(true)}
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 h-10 rounded-lg"
                                >
                                    <Plus className="h-4 w-4 ml-1.5" />
                                    محادثة جديدة
                                </Button>
                            </motion.div>
                        ) : (
                            <div>
                                <AnimatePresence>
                                    {filteredConversations.map((conv) => {
                                        const otherUser = getOtherParticipant(conv);
                                        if (!otherUser) return null;

                                        const unreadCount = conv.unreadCount?.[user?.uid || ''] || 0;
                                        const isSelected = selectedConversation?.id === conv.id;
                                        const isPinned = conv.isPinned?.[user?.uid || ''] || false;
                                        const isMuted = conv.isMuted?.[user?.uid || ''] || false;

                                        return (
                                            <motion.div
                                                key={conv.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className={cn(
                                                    "px-5 py-4 cursor-pointer transition-all border-b border-gray-50 group relative",
                                                    "hover:bg-gray-50",
                                                    isSelected && "bg-emerald-50 hover:bg-emerald-50 border-l-4 border-l-emerald-600"
                                                )}
                                            >
                                                <div onClick={() => setSelectedConversation(conv)} className="flex items-start gap-3.5">
                                                    <div className="relative flex-shrink-0">
                                                        <Avatar className="h-12 w-12 ring-2 ring-white shadow-sm">
                                                            <AvatarImage src={otherUser.avatar} />
                                                            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-semibold text-sm">
                                                                {otherUser.name?.[0]?.toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        {unreadCount > 0 && (
                                                            <div className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center">
                                                                <span className="text-[10px] text-white font-bold">{unreadCount}</span>
                                                            </div>
                                                        )}
                                                        {otherUser.isOnline && (
                                                            <div className="absolute bottom-0 left-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-baseline justify-between mb-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                {isPinned && <Pin className="h-3 w-3 text-gray-400" />}
                                                                <h3 className="font-semibold text-gray-900 text-[15px] truncate">{otherUser.name}</h3>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                {isMuted && <BellOff className="h-3 w-3 text-gray-400" />}
                                                                <span className="text-[11px] text-gray-400 flex-shrink-0">{formatTime(conv.lastMessageTime)}</span>
                                                            </div>
                                                        </div>
                                                        <p className={cn(
                                                            "text-[13px] truncate leading-relaxed",
                                                            unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500"
                                                        )}>
                                                            {conv.lastMessage || 'لا توجد رسائل بعد'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="absolute left-2 top-4 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start">
                                                        <DropdownMenuItem onClick={() => handlePinConversation(conv.id)}>
                                                            <Pin className="h-4 w-4 ml-2" />
                                                            {isPinned ? 'إلغاء التثبيت' : 'تثبيت المحادثة'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => {
                                                            setSelectedConversation(conv);
                                                            setTimeout(() => handleMuteConversation(), 100);
                                                        }}>
                                                            {isMuted ? <Bell className="h-4 w-4 ml-2" /> : <BellOff className="h-4 w-4 ml-2" />}
                                                            {isMuted ? 'إلغاء الكتم' : 'كتم الإشعارات'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => {
                                                            setSelectedConversation(conv);
                                                            setTimeout(() => handleArchiveConversation(), 100);
                                                        }}>
                                                            <Archive className="h-4 w-4 ml-2" />
                                                            أرشفة
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </motion.div>

            {/* Toggle Button */}
            {!isMobile && (
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className={cn(
                        "absolute z-10 top-6 h-10 w-10 rounded-full bg-white border-2 border-gray-200 hover:bg-emerald-50 hover:border-emerald-300 shadow-lg transition-all",
                        isSidebarCollapsed ? "left-6" : "left-[395px]"
                    )}
                >
                    {isSidebarCollapsed ? (
                        <ChevronLeft className="h-5 w-5 text-gray-700" />
                    ) : (
                        <ChevronRight className="h-5 w-5 text-gray-700" />
                    )}
                </Button>
            )}

            {/* Chat Area */}
            {selectedConversation ? (
                <div className="flex-1 flex flex-col bg-gray-50">
                    {/* Chat Header */}
                    <div className="px-4 lg:px-6 py-4 bg-white border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 lg:gap-3">
                                {isMobile && (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-9 w-9 rounded-full -mr-2"
                                        onClick={() => setSelectedConversation(null)}
                                    >
                                        <ArrowRight className="h-5 w-5" />
                                    </Button>
                                )}
                                {currentOtherUser && (
                                    <>
                                        <div className="relative">
                                            <Avatar className="h-10 w-10 lg:h-11 lg:w-11 cursor-pointer" onClick={() => setShowProfileSheet(true)}>
                                                <AvatarImage src={currentOtherUser.avatar} />
                                                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-semibold text-sm">
                                                    {currentOtherUser.name?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            {currentOtherUser.isOnline && (
                                                <div className="absolute bottom-0 left-0 h-2.5 w-2.5 lg:h-3 lg:w-3 rounded-full bg-green-500 border-2 border-white"></div>
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="font-semibold text-gray-900 text-sm lg:text-[15px]">{currentOtherUser.name}</h2>
                                            <p className="text-[11px] lg:text-xs text-gray-500 mt-0.5">
                                                {isTyping ? (
                                                    <span className="flex items-center gap-1">
                                                        <motion.span
                                                            animate={{ opacity: [0.3, 1, 0.3] }}
                                                            transition={{ duration: 1.5, repeat: Infinity }}
                                                        >
                                                            يكتب...
                                                        </motion.span>
                                                    </span>
                                                ) : currentOtherUser.isOnline ? 'متصل الآن' :
                                                    currentOtherUser.type === 'club' ? 'نادي' :
                                                        currentOtherUser.type === 'player' ? 'لاعب' : 'غير متصل'}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center gap-1">
                                {chatSearchTerm && (
                                    <Badge variant="secondary" className="mr-2">
                                        {filteredMessages.length} نتيجة
                                    </Badge>
                                )}
                                <div className="relative">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-9 w-9 rounded-full hover:bg-gray-100"
                                        onClick={() => setChatSearchTerm(chatSearchTerm ? '' : ' ')}
                                    >
                                        <Search className="h-4 w-4 text-gray-600" />
                                    </Button>
                                    {chatSearchTerm !== '' && (
                                        <div className="absolute left-0 top-full mt-2 w-64 p-2 bg-white rounded-lg shadow-lg border">
                                            <Input
                                                placeholder="بحث في المحادثة..."
                                                value={chatSearchTerm}
                                                onChange={(e) => setChatSearchTerm(e.target.value)}
                                                className="h-9"
                                                autoFocus
                                            />
                                        </div>
                                    )}
                                </div>
                                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full hover:bg-gray-100">
                                    <Phone className="h-4 w-4 text-gray-600" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full hover:bg-gray-100">
                                    <Video className="h-4 w-4 text-gray-600" />
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full hover:bg-gray-100">
                                            <MoreVertical className="h-4 w-4 text-gray-600" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-52">
                                        <DropdownMenuItem onClick={() => setShowProfileSheet(true)}>
                                            <Info className="h-4 w-4 ml-2" />
                                            معلومات المحادثة
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleMuteConversation}>
                                            {selectedConversation.isMuted?.[user?.uid || ''] ? (
                                                <><Bell className="h-4 w-4 ml-2" />إلغاء كتم الإشعارات</>
                                            ) : (
                                                <><BellOff className="h-4 w-4 ml-2" />كتم الإشعارات</>
                                            )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleArchiveConversation}>
                                            <Archive className="h-4 w-4 ml-2" />
                                            أرشفة المحادثة
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={handleDeleteConversation} className="text-red-600">
                                            <Trash2 className="h-4 w-4 ml-2" />
                                            حذف المحادثة
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-6">
                        <div className="space-y-3">
                            <AnimatePresence>
                                {filteredMessages.map((msg, index) => {
                                    const isMine = msg.senderId === user?.uid;
                                    const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId;
                                    const senderInfo = isMine ? null : participantsData[msg.senderId];
                                    const isVoiceMessage = msg.message?.includes('🎤') || (msg as any).messageType === 'voice';
                                    const isImageMessage = msg.message?.includes('📷') || (msg as any).messageType === 'image';
                                    const voiceDuration = (msg as any).voiceDuration || 0;
                                    const imageUrl = (msg as any).imageUrl;

                                    return (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={cn("flex items-end gap-2 group", isMine ? "flex-row-reverse" : "flex-row")}
                                        >
                                            {!isMine && (
                                                <Avatar className={cn("h-7 w-7", !showAvatar && "opacity-0")}>
                                                    <AvatarImage src={senderInfo?.avatar} />
                                                    <AvatarFallback className="text-xs">{msg.senderName?.[0]}</AvatarFallback>
                                                </Avatar>
                                            )}

                                            <div className={cn("max-w-[65%] flex flex-col", isMine && "items-end")}>
                                                <div className="relative">
                                                    {msg.isPinned && (
                                                        <Pin className="h-3 w-3 text-emerald-600 absolute -top-3 right-2" />
                                                    )}
                                                    <div
                                                        className={cn(
                                                            "rounded-2xl",
                                                            isMine
                                                                ? "bg-emerald-600 text-white rounded-br-md shadow-sm"
                                                                : "bg-white text-gray-900 rounded-bl-md border border-gray-100 shadow-sm"
                                                        )}
                                                    >
                                                        {isImageMessage ? (
                                                            <div className="relative group/image cursor-pointer" onClick={() => window.open(imageUrl, '_blank')}>
                                                                <img
                                                                    src={imageUrl}
                                                                    alt="صورة"
                                                                    className="max-w-[280px] max-h-[400px] object-cover rounded-2xl"
                                                                    loading="lazy"
                                                                />
                                                                <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors flex items-center justify-center rounded-2xl">
                                                                    <ImageIcon className="h-8 w-8 text-white opacity-0 group-hover/image:opacity-100 transition-opacity" />
                                                                </div>
                                                            </div>
                                                        ) : isVoiceMessage ? (
                                                            <div className="px-3 py-2.5 flex items-center gap-2 min-w-[200px]">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className={cn(
                                                                        "h-8 w-8 rounded-full flex-shrink-0",
                                                                        isMine ? "hover:bg-emerald-700" : "hover:bg-gray-100"
                                                                    )}
                                                                    onClick={() => {
                                                                        const voiceUrl = (msg as any).voiceUrl;
                                                                        if (voiceUrl) {
                                                                            playVoiceMessage(msg.id, voiceUrl);
                                                                        } else {
                                                                            toast.error('رابط الرسالة الصوتية غير متوفر');
                                                                        }
                                                                    }}
                                                                >
                                                                    {playingVoiceId === msg.id ? (
                                                                        <Pause className={cn("h-4 w-4", isMine ? "text-white" : "text-emerald-600")} />
                                                                    ) : (
                                                                        <Play className={cn("h-4 w-4", isMine ? "text-white" : "text-emerald-600")} />
                                                                    )}
                                                                </Button>
                                                                <div className="flex-1 flex flex-col gap-1">
                                                                    <div className="flex gap-0.5">
                                                                        {[...Array(20)].map((_, i) => (
                                                                            <div
                                                                                key={i}
                                                                                className={cn(
                                                                                    "w-0.5 rounded-full",
                                                                                    isMine ? "bg-white/60" : "bg-gray-300"
                                                                                )}
                                                                                style={{
                                                                                    height: `${Math.random() * 16 + 8}px`
                                                                                }}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                    <span className={cn(
                                                                        "text-[11px]",
                                                                        isMine ? "text-white/80" : "text-gray-500"
                                                                    )}>
                                                                        {Math.floor(voiceDuration / 60)}:{(voiceDuration % 60).toString().padStart(2, '0')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="px-4 py-2.5">
                                                                {(msg as any).metadata?.isWhatsApp && (
                                                                    <div className="flex items-center gap-1 mb-1 text-[10px] text-green-600 bg-green-50 w-fit px-1.5 py-0.5 rounded-full">
                                                                        <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WA" className="w-3 h-3" />
                                                                        <span>واتساب</span>
                                                                    </div>
                                                                )}
                                                                <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={cn("flex items-center gap-1 mt-1 px-1", isMine && "flex-row-reverse")}>
                                                    <span className="text-[11px] text-gray-400">{formatTime(msg.timestamp)}</span>
                                                    {isMine && msg.isRead && <CheckCheck className="h-3 w-3 text-emerald-600" />}
                                                    {isMine && !msg.isRead && <Check className="h-3 w-3 text-gray-400" />}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>

                    {/* Message Input */}
                    <div className="px-3 lg:px-4 py-3 lg:py-4 bg-white border-t border-gray-100 relative">
                        {showEmojiPicker && (
                            <div className={cn(
                                isMobile
                                    ? "fixed left-4 right-4 bottom-24 z-[100]"
                                    : "absolute bottom-[calc(100%+0.5rem)] left-4 z-[100]"
                            )}>
                                <SimpleEmojiPicker
                                    onEmojiClick={(emoji) => {
                                        setNewMessage((prev) => prev + emoji);
                                        setShowEmojiPicker(false);
                                        toast.success(`تمت إضافة ${emoji}`);
                                    }}
                                    className={cn(
                                        isMobile ? "w-full" : "w-[350px]"
                                    )}
                                />
                            </div>
                        )}

                        {imagePreview ? (
                            <div className="flex flex-col gap-3">
                                <div className="relative bg-gray-50 rounded-2xl p-2">
                                    <img
                                        src={imagePreview}
                                        alt="معاينة"
                                        className="max-h-[300px] rounded-xl mx-auto"
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="absolute top-3 left-3 h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-sm"
                                        onClick={() => {
                                            setSelectedImage(null);
                                            setImagePreview(null);
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="أضف تعليق (اختياري)..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        className="flex-1 rounded-xl"
                                    />
                                    <Button
                                        size="icon"
                                        onClick={sendImageMessage}
                                        disabled={isUploadingImage}
                                        className="h-11 w-11 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                                    >
                                        {isUploadingImage ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <Send className="h-4.5 w-4.5" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ) : isRecordingVoice || audioBlob ? (
                            <div className="flex items-center gap-2 bg-red-50 rounded-2xl px-4 py-3">
                                <div className="flex-1 flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse"></div>
                                        <span className="text-sm font-medium text-red-900">
                                            {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                                        </span>
                                    </div>
                                    <div className="flex-1 flex gap-1">
                                        {[...Array(20)].map((_, i) => (
                                            <div
                                                key={i}
                                                className="w-1 bg-red-600 rounded-full animate-pulse"
                                                style={{
                                                    height: `${Math.random() * 20 + 10}px`,
                                                    animationDelay: `${i * 50}ms`
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                {isRecordingVoice ? (
                                    <>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-10 w-10 rounded-full hover:bg-red-100"
                                            onClick={cancelVoiceRecording}
                                        >
                                            <X className="h-5 w-5 text-red-600" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            className="h-10 w-10 rounded-full bg-emerald-600 hover:bg-emerald-700"
                                            onClick={stopVoiceRecording}
                                        >
                                            <Check className="h-5 w-5" />
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-10 w-10 rounded-full hover:bg-gray-100"
                                            onClick={() => setAudioBlob(null)}
                                        >
                                            <X className="h-5 w-5" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            className="h-10 w-10 rounded-full bg-emerald-600 hover:bg-emerald-700"
                                            onClick={sendVoiceMessage}
                                        >
                                            <Send className="h-4.5 w-4.5" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-end gap-1.5 lg:gap-2">
                                <div className="emoji-picker-container">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-9 w-9 lg:h-10 lg:w-10 rounded-full hover:bg-gray-100 flex-shrink-0"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    >
                                        <Smile className="h-4 w-4 lg:h-5 lg:w-5 text-gray-500" />
                                    </Button>
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-9 w-9 lg:h-10 lg:w-10 rounded-full hover:bg-emerald-50 flex-shrink-0"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Paperclip className="h-4 w-4 lg:h-5 lg:w-5 text-emerald-600" />
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                />

                                <div className="flex-1 relative">
                                    <Input
                                        placeholder="اكتب رسالة..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                        className="min-h-[42px] lg:min-h-[44px] max-h-32 resize-none pr-4 pl-4 py-2.5 lg:py-3 text-sm rounded-2xl border-gray-200 focus-visible:ring-1 focus-visible:ring-emerald-500"
                                    />
                                </div>

                                {newMessage.trim() ? (
                                    <Button
                                        size="icon"
                                        onClick={handleSendMessage}
                                        className="h-10 w-10 lg:h-11 lg:w-11 rounded-full bg-emerald-600 hover:bg-emerald-700 flex-shrink-0 shadow-sm"
                                    >
                                        <Send className="h-4 w-4 lg:h-4.5 lg:w-4.5" />
                                    </Button>
                                ) : (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-10 w-10 lg:h-11 lg:w-11 rounded-full hover:bg-emerald-50 flex-shrink-0"
                                        onClick={startVoiceRecording}
                                    >
                                        <Mic className="h-4 w-4 lg:h-5 lg:w-5 text-emerald-600" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 px-6">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center max-w-md"
                    >
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center mx-auto mb-6">
                            <MessageSquare className="h-12 w-12 text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">مرحباً بك في مركز الرسائل</h2>
                        <p className="text-gray-500 mb-6 text-[15px]">اختر محادثة من القائمة أو ابدأ محادثة جديدة</p>
                        <Button
                            onClick={() => setNewChatModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 h-11 rounded-lg shadow-sm"
                        >
                            <Plus className="h-4 w-4 ml-2" />
                            بدء محادثة جديدة
                        </Button>
                    </motion.div>
                </div>
            )}

            {/* Profile Sheet */}
            <Sheet open={showProfileSheet} onOpenChange={setShowProfileSheet}>
                <SheetContent side="left" className="w-96">
                    <SheetHeader>
                        <SheetTitle>معلومات المحادثة</SheetTitle>
                        <SheetDescription>
                            تفاصيل المستخدم والإعدادات
                        </SheetDescription>
                    </SheetHeader>
                    {currentOtherUser && (
                        <div className="mt-6 space-y-6">
                            <div className="flex flex-col items-center">
                                <Avatar className="h-24 w-24 mb-4">
                                    <AvatarImage src={currentOtherUser.avatar} />
                                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-2xl">
                                        {currentOtherUser.name?.[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <h3 className="text-xl font-bold">{currentOtherUser.name}</h3>
                                <p className="text-sm text-gray-500">
                                    {currentOtherUser.type === 'club' ? 'نادي' :
                                        currentOtherUser.type === 'player' ? 'لاعب' :
                                            currentOtherUser.type === 'trainer' ? 'مدرب' : 'مستخدم'}
                                </p>
                            </div>

                            <div className="space-y-4">
                                {currentOtherUser.email && (
                                    <div>
                                        <label className="text-xs text-gray-500">البريد الإلكتروني</label>
                                        <p className="text-sm font-medium">{currentOtherUser.email}</p>
                                    </div>
                                )}
                                {currentOtherUser.phone && (
                                    <div>
                                        <label className="text-xs text-gray-500">رقم الهاتف</label>
                                        <p className="text-sm font-medium">{currentOtherUser.phone}</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 pt-4">
                                <Button variant="outline" className="w-full justify-start" onClick={handleMuteConversation}>
                                    {selectedConversation?.isMuted?.[user?.uid || ''] ? (
                                        <><Bell className="h-4 w-4 ml-2" />إلغاء كتم الإشعارات</>
                                    ) : (
                                        <><BellOff className="h-4 w-4 ml-2" />كتم الإشعارات</>
                                    )}
                                </Button>
                                <Button variant="outline" className="w-full justify-start" onClick={handleArchiveConversation}>
                                    <Archive className="h-4 w-4 ml-2" />
                                    أرشفة المحادثة
                                </Button>
                                <Button variant="outline" className="w-full justify-start text-red-600 hover:bg-red-50" onClick={handleDeleteConversation}>
                                    <Trash2 className="h-4 w-4 ml-2" />
                                    حذف المحادثة
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            <NewChatModal
                isOpen={newChatModalOpen}
                onOpenChange={setNewChatModalOpen}
                onStartChat={handleStartChat}
            />
        </div>
    );
};

export default ModernMessageCenter;
