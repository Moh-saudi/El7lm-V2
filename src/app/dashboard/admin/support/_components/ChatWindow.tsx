import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
    Send,
    Paperclip,
    MoreVertical,
    Phone,
    CheckCircle2,
    Clock,
    User,
    Check,
    MessageSquarePlus
} from 'lucide-react';
import { SupportConversation, SupportMessage } from '../types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import { SUPPORT_TEMPLATES } from '@/lib/support-templates';

interface ChatWindowProps {
    conversation: SupportConversation | null;
    messages: SupportMessage[];
    newMessage: string;
    onNewMessageChange: (val: string) => void;
    onSendMessage: () => void;
    loading: boolean;
    onStatusChange: (status: string) => void;
    onWhatsAppClick: (phone: string | undefined) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
    conversation,
    messages,
    newMessage,
    onNewMessageChange,
    onSendMessage,
    loading,
    onStatusChange,
    onWhatsAppClick
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    if (!conversation) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                    <User className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">اختر محادثة للبدء</h3>
                <p className="text-sm text-slate-500">يمكنك استعراض تفاصيل التذاكر والرد على العملاء من هنا</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                        {conversation.userName.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                            {conversation.userName}
                            <Badge variant="outline" className="text-[10px] font-normal">
                                {conversation.userType}
                            </Badge>
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {conversation.createdAt ? formatDistanceToNow(new Date(conversation.createdAt), { addSuffix: true, locale: ar }) : 'غير محدد'}
                            </span>
                            <span>•</span>
                            <span className="text-blue-600 font-medium">#{conversation.id.slice(0, 6)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Status Dropdown could go here or separate actions */}
                    <Button variant="outline" size="sm" onClick={() => onStatusChange('resolved')} className="hidden sm:flex border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100">
                        <CheckCircle2 className="h-4 w-4 ml-2" />
                        تحديد كمحلولة
                    </Button>
                    <Button variant="ghost" size="icon" className="text-slate-400">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4 bg-slate-50/50">
                <div className="flex flex-col gap-4 max-w-3xl mx-auto">
                    {messages.map((msg, idx) => {
                        const isMe = msg.senderType === 'admin';
                        const isSystem = msg.senderType === 'system';

                        if (isSystem) {
                            return (
                                <div key={msg.id} className="flex justify-center my-2">
                                    <span className="bg-slate-200/50 text-slate-600 text-xs px-3 py-1 rounded-full">
                                        {msg.message}
                                    </span>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex gap-3 max-w-[80%]",
                                    isMe ? "self-end flex-row-reverse" : "self-start"
                                )}
                            >
                                {!isMe && (
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-600 text-xs font-bold">
                                        {msg.senderName.charAt(0)}
                                    </div>
                                )}

                                <div className={cn(
                                    "flex flex-col gap-1 p-3 rounded-2xl shadow-sm",
                                    isMe
                                        ? "bg-blue-600 text-white rounded-tr-sm"
                                        : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                                )}>
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                    <div className={cn(
                                        "flex items-center gap-1 text-[10px]",
                                        isMe ? "text-blue-100 justify-end" : "text-slate-400"
                                    )}>
                                        <span>
                                            {msg.timestamp && formatDistanceToNow(new Date(msg.timestamp), { locale: ar })}
                                        </span>
                                        {isMe && (
                                            <Check className={cn("h-3 w-3", msg.isRead ? "text-blue-200" : "opacity-50")} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
                <div className="flex flex-col gap-3 max-w-4xl mx-auto">
                    {/* Quick Actions Bar (Optional) */}
                    {/* <div className="flex gap-2">
             <Button variant="ghost" size="xs" className="text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-full h-7">
               رد جاهز: ترحيب
             </Button>
           </div> */}

                    <div className="flex items-end gap-2 p-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full flex-shrink-0 mb-1" title="نماذج ردود جاهزة">
                                    <MessageSquarePlus className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>نماذج الردود</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel className="text-xs font-normal text-slate-500">ترحيب</DropdownMenuLabel>
                                    {SUPPORT_TEMPLATES.filter(t => t.category === 'greeting').map(t => (
                                        <DropdownMenuItem key={t.id} onClick={() => onNewMessageChange(t.content)}>
                                            {t.title}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel className="text-xs font-normal text-slate-500">إغلاق</DropdownMenuLabel>
                                    {SUPPORT_TEMPLATES.filter(t => t.category === 'closing').map(t => (
                                        <DropdownMenuItem key={t.id} onClick={() => onNewMessageChange(t.content)}>
                                            {t.title}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel className="text-xs font-normal text-slate-500">عام</DropdownMenuLabel>
                                    {SUPPORT_TEMPLATES.filter(t => t.category === 'technical').map(t => (
                                        <DropdownMenuItem key={t.id} onClick={() => onNewMessageChange(t.content)}>
                                            {t.title}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full flex-shrink-0 mb-1">
                            <Paperclip className="h-5 w-5" />
                        </Button>

                        <div className="flex-1 relative bg-slate-50 border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all">
                            <Textarea
                                value={newMessage}
                                onChange={(e) => onNewMessageChange(e.target.value)}
                                placeholder="اكتب ردك هنا..."
                                className="w-full min-h-[60px] max-h-[300px] bg-transparent border-0 focus-visible:ring-0 resize-none py-3 px-4 text-sm custom-scrollbar"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                        onSendMessage();
                                    }
                                }}
                            />
                        </div>

                        <Button
                            onClick={onSendMessage}
                            disabled={!newMessage.trim() || loading}
                            size="icon"
                            className={cn(
                                "h-10 w-10 rounded-full transition-all flex-shrink-0 mb-0.5",
                                newMessage.trim()
                                    ? "bg-blue-600 hover:bg-blue-700 shadow-md"
                                    : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            )}
                        >
                            <Send className={cn("h-4 w-4", newMessage.trim() && "ml-0.5")} />
                        </Button>
                    </div>

                    <div className="flex justify-between items-center px-2">
                        <span className="text-[10px] text-slate-400">
                            Ctrl+Enter للإرسال
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-full px-2"
                            onClick={() => onWhatsAppClick(conversation.userPhone)}
                        >
                            <Phone className="h-3 w-3 ml-1" />
                            تواصل عبر واتساب
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
