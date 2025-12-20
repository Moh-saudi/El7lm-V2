import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Shield,
    Globe,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { SupportConversation } from '../types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface CustomerProfileProps {
    conversation: SupportConversation | null;
    compact?: boolean;
}

export const CustomerProfile: React.FC<CustomerProfileProps> = ({ conversation, compact = false }) => {
    const [isCollapsed, setIsCollapsed] = React.useState(compact);

    if (!conversation) return null;

    return (
        <div className="h-full space-y-4 animate-in fade-in slide-in-from-left-4 duration-500 overflow-y-auto">
            <Card className="border border-slate-200 shadow-sm overflow-hidden h-full">
                {!compact && (
                    <div className="h-24 bg-gradient-to-r from-slate-800 to-slate-900 overflow-hidden relative">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    </div>
                )}
                <CardContent className={compact ? "p-0" : "pt-0 relative"}>
                    {!compact && (
                        <div className="absolute -top-12 right-6">
                            <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg transform rotate-3 hover:rotate-0 transition-all duration-300">
                                <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl shadow-inner text-white">
                                    {conversation.userName.charAt(0)}
                                </div>
                            </div>
                        </div>
                    )}

                    {compact ? (
                        <div
                            className="bg-slate-50 p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-200"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                                    {conversation.userName.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-slate-900">{conversation.userName}</h3>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <Shield className="h-3 w-3 text-blue-500" />
                                        {conversation.userType}
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                        </div>
                    ) : (
                        <div className="mt-14 px-2">
                            <h3 className="font-bold text-xl text-slate-900">{conversation.userName}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                                    {conversation.userType}
                                </Badge>
                                <Badge variant="outline" className="border-slate-200 text-slate-600">
                                    مجاني
                                </Badge>
                            </div>
                        </div>
                    )}

                    {(!isCollapsed || !compact) && (
                        <div className="p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">بيانات التواصل</h4>

                                <div className="flex items-center gap-3 text-sm text-slate-600 group cursor-pointer hover:text-blue-600 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-blue-50">
                                        <Mail className="h-4 w-4" />
                                    </div>
                                    <span className="truncate">user@example.com</span>
                                </div>

                                <div className="flex items-center gap-3 text-sm text-slate-600 group cursor-pointer hover:text-blue-600 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-blue-50">
                                        <Phone className="h-4 w-4" />
                                    </div>
                                    <span dir="ltr">+966 50 123 4567</span>
                                </div>

                                <div className="flex items-center gap-3 text-sm text-slate-600">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                        <MapPin className="h-4 w-4" />
                                    </div>
                                    <span>الرياض، السعودية</span>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">تفاصيل التذكرة</h4>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                        <p className="text-[10px] text-slate-400 mb-1">تاريخ الإنشاء</p>
                                        <p className="text-xs font-medium text-slate-800">
                                            {conversation.createdAt ? format(conversation.createdAt.toDate(), 'dd MMM yyyy', { locale: ar }) : '-'}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                        <p className="text-[10px] text-slate-400 mb-1">القسم</p>
                                        <p className="text-xs font-medium text-slate-800 flex items-center gap-1">
                                            <Shield className="h-3 w-3 text-blue-500" />
                                            {conversation.category}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="pt-2">
                                <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-md">
                                    عرض الملف الشخصي الكامل
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
