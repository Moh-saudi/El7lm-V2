import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
    Search,
    Filter,
    Clock,
    CheckCircle2,
    AlertCircle,
    MoreVertical
} from 'lucide-react';
import { SupportConversation } from '../types'; // We will define this type shared

interface TicketListProps {
    conversations: SupportConversation[];
    selectedId?: string;
    onSelect: (conversation: SupportConversation) => void;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    filter: string;
    onFilterChange: (filter: string) => void;
}

export const TicketList: React.FC<TicketListProps> = ({
    conversations,
    selectedId,
    onSelect,
    searchTerm,
    onSearchChange,
    filter,
    onFilterChange
}) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'in_progress': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'resolved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'closed': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'urgent': return <AlertCircle className="h-3 w-3 text-red-500" />;
            case 'high': return <AlertCircle className="h-3 w-3 text-orange-500" />;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Search & Filter Header */}
            <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="بحث في المحادثات..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pr-9 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {['all', 'open', 'in_progress', 'resolved'].map((f) => (
                        <Button
                            key={f}
                            variant={filter === f ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => onFilterChange(f)}
                            className={cn(
                                "rounded-full text-xs h-7 px-3 whitespace-nowrap",
                                filter === f
                                    ? "bg-slate-900 text-white hover:bg-slate-800"
                                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                            )}
                        >
                            {f === 'all' && 'الكل'}
                            {f === 'open' && 'مفتوحة'}
                            {f === 'in_progress' && 'جاري العمل'}
                            {f === 'resolved' && 'منتهية'}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Ticket List */}
            <ScrollArea className="flex-1">
                <div className="flex flex-col p-2 gap-1">
                    {conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                <Search className="h-6 w-6 opacity-50" />
                            </div>
                            <p className="text-sm">لا توجد محادثات</p>
                        </div>
                    ) : (
                        conversations.map((ticket) => (
                            <div
                                key={ticket.id}
                                onClick={() => onSelect(ticket)}
                                className={cn(
                                    "relative flex flex-col gap-2 p-3 rounded-xl cursor-pointer transition-all duration-200 group border",
                                    selectedId === ticket.id
                                        ? "bg-blue-50/50 border-blue-200 ring-1 ring-blue-100"
                                        : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-100"
                                )}
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full flex-shrink-0",
                                            ticket.unreadCount > 0 ? "bg-blue-500" : "bg-transparent"
                                        )} />
                                        <h4 className={cn(
                                            "text-sm truncate",
                                            ticket.unreadCount > 0 ? "font-bold text-slate-900" : "font-medium text-slate-700"
                                        )}>
                                            {ticket.userName}
                                        </h4>
                                        {getPriorityIcon(ticket.priority)}
                                    </div>
                                    <span className="text-[10px] text-slate-400 flex-shrink-0 whitespace-nowrap">
                                        {ticket.lastMessageTime && formatDistanceToNow(ticket.lastMessageTime.toDate(), { locale: ar, addSuffix: false })}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                    <p className={cn(
                                        "text-xs line-clamp-1 flex-1",
                                        ticket.unreadCount > 0 ? "text-slate-700 font-medium" : "text-slate-500"
                                    )}>
                                        {ticket.lastMessage || 'لا توجد رسائل'}
                                    </p>
                                    {ticket.unreadCount > 0 && (
                                        <Badge className="h-5 min-w-[1.25rem] px-1 bg-blue-600 hover:bg-blue-700 flex items-center justify-center">
                                            {ticket.unreadCount}
                                        </Badge>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 font-normal border-0", getStatusColor(ticket.status))}>
                                        {ticket.status === 'open' && 'مفتوحة'}
                                        {ticket.status === 'in_progress' && 'قيد المعالجة'}
                                        {ticket.status === 'resolved' && 'تم الحل'}
                                        {ticket.status === 'closed' && 'مغلقة'}
                                    </Badge>
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                        {ticket.category}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};
