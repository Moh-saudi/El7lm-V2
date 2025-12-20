'use client';

import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    MoreHorizontal,
    ArrowUpDown,
    MessageSquare,
    Clock,
    AlertCircle
} from 'lucide-react';
import { SupportConversation } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface TicketTableViewProps {
    conversations: SupportConversation[];
    onSelect: (conversation: SupportConversation) => void;
    selectedId?: string;
    onSort: (field: string) => void;
}

export const TicketTableView: React.FC<TicketTableViewProps> = ({
    conversations,
    onSelect,
    selectedId,
    onSort
}) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
            case 'in_progress': return 'bg-amber-100 text-amber-700 hover:bg-amber-200';
            case 'resolved': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200';
            case 'closed': return 'bg-slate-100 text-slate-700 hover:bg-slate-200';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getPriorityElement = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">عاجل</Badge>;
            case 'high':
                return <Badge className="bg-orange-500 hover:bg-orange-600 h-5 px-1.5 text-[10px]">مرتفع</Badge>;
            case 'medium':
                return <Badge variant="secondary" className="bg-amber-100 text-amber-700 h-5 px-1.5 text-[10px]">متوسط</Badge>;
            case 'low':
                return <Badge variant="outline" className="text-slate-500 h-5 px-1.5 text-[10px]">منخفض</Badge>;
            default: return null;
        }
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="w-[40px] text-right">
                            <Checkbox />
                        </TableHead>
                        <TableHead className="w-[200px] text-right text-xs font-semibold text-slate-600">
                            <Button variant="ghost" size="sm" onClick={() => onSort('userName')} className="h-8 -mr-3 text-xs font-semibold hover:bg-transparent">
                                المستخدم
                                <ArrowUpDown className="mr-2 h-3 w-3" />
                            </Button>
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-600">الموضوع / آخر رسالة</TableHead>
                        <TableHead className="w-[120px] text-right text-xs font-semibold text-slate-600">
                            <Button variant="ghost" size="sm" onClick={() => onSort('status')} className="h-8 -mr-3 text-xs font-semibold hover:bg-transparent">
                                الحالة
                                <ArrowUpDown className="mr-2 h-3 w-3" />
                            </Button>
                        </TableHead>
                        <TableHead className="w-[100px] text-right text-xs font-semibold text-slate-600">
                            <Button variant="ghost" size="sm" onClick={() => onSort('priority')} className="h-8 -mr-3 text-xs font-semibold hover:bg-transparent">
                                الأولوية
                                <ArrowUpDown className="mr-2 h-3 w-3" />
                            </Button>
                        </TableHead>
                        <TableHead className="w-[140px] text-right text-xs font-semibold text-slate-600">
                            <Button variant="ghost" size="sm" onClick={() => onSort('updatedAt')} className="h-8 -mr-3 text-xs font-semibold hover:bg-transparent">
                                آخر تحديث
                                <ArrowUpDown className="mr-2 h-3 w-3" />
                            </Button>
                        </TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {conversations.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-32 text-center text-slate-500 text-sm">
                                لا توجد تذاكر تطابق البحث
                            </TableCell>
                        </TableRow>
                    ) : (
                        conversations.map((ticket) => (
                            <TableRow
                                key={ticket.id}
                                className={cn(
                                    "cursor-pointer transition-colors hover:bg-blue-50/50 group",
                                    selectedId === ticket.id && "bg-blue-50 border-l-4 border-l-blue-500"
                                )}
                                onClick={() => onSelect(ticket)}
                            >
                                <TableCell className="py-3">
                                    <Checkbox onClick={(e) => e.stopPropagation()} />
                                </TableCell>
                                <TableCell className="py-3 font-medium">
                                    <div className="flex flex-col">
                                        <span className="text-sm text-slate-900">{ticket.userName}</span>
                                        <span className="text-[10px] text-slate-400">{ticket.userType}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-3 max-w-[300px]">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal bg-white">
                                            {ticket.category}
                                        </Badge>
                                        {ticket.unreadCount > 0 && (
                                            <Badge className="h-5 px-1.5 bg-blue-600 text-[10px]">
                                                {ticket.unreadCount} جديد
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 truncate font-normal">
                                        {ticket.lastMessage || 'لا توجد رسائل'}
                                    </p>
                                </TableCell>
                                <TableCell className="py-3">
                                    <Badge className={cn("text-[10px] font-medium shadow-none", getStatusColor(ticket.status))}>
                                        {ticket.status === 'open' && 'مفتوحة'}
                                        {ticket.status === 'in_progress' && 'قيد المعالجة'}
                                        {ticket.status === 'resolved' && 'محلولة'}
                                        {ticket.status === 'closed' && 'مغلقة'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="py-3">
                                    {getPriorityElement(ticket.priority)}
                                </TableCell>
                                <TableCell className="py-3 text-xs text-slate-500">
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3 text-slate-400" />
                                        {ticket.updatedAt ? formatDistanceToNow(ticket.updatedAt.toDate(), { addSuffix: true, locale: ar }) : '-'}
                                    </div>
                                </TableCell>
                                <TableCell className="py-3">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
};
