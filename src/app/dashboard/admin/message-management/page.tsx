'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import {
    MessageSquare,
    Users,
    TrendingUp,
    BarChart3,
    Download,
    Mic,
    Image as ImageIcon,
    FileText,
    Activity,
    RefreshCw,
    ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/config';
import { toast } from 'sonner';
import { Bar, BarChart, Line, LineChart, CartesianGrid, XAxis, Pie, PieChart } from 'recharts';
import * as XLSX from 'xlsx';

interface MessageStats {
    totalMessages: number;
    todayMessages: number;
    activeConversations: number;
    totalUsers: number;
    textMessages: number;
    voiceMessages: number;
    imageMessages: number;
}

export default function MessageManagementPage() {
    const [stats, setStats] = useState<MessageStats>({
        totalMessages: 0,
        todayMessages: 0,
        activeConversations: 0,
        totalUsers: 0,
        textMessages: 0,
        voiceMessages: 0,
        imageMessages: 0,
    });
    const [loading, setLoading] = useState(true);
    const [dailyMessages, setDailyMessages] = useState<any[]>([]);
    const [messageTypes, setMessageTypes] = useState<any[]>([]);

    useEffect(() => {
        loadStatistics();
    }, []);

    const loadStatistics = async () => {
        try {
            setLoading(true);

            // Get all messages
            const { data: allMessagesData } = await supabase
                .from('messages')
                .select('*');
            const allMessages = allMessagesData || [];

            // Calculate today's messages
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayMessages = allMessages.filter((msg: any) => {
                const timestamp = msg.timestamp ? new Date(msg.timestamp) : null;
                return timestamp && timestamp >= today;
            });

            // Count message types
            let textCount = 0;
            let voiceCount = 0;
            let imageCount = 0;

            allMessages.forEach((msg: any) => {
                const type = msg.messageType || 'text';
                if (type === 'voice') voiceCount++;
                else if (type === 'image') imageCount++;
                else textCount++;
            });

            // Get conversations
            const { data: conversationsData } = await supabase
                .from('conversations')
                .select('id');
            const conversationsCount = conversationsData?.length || 0;

            // Get unique users
            const uniqueUsers = new Set<string>();
            allMessages.forEach((msg: any) => {
                if (msg.senderId) uniqueUsers.add(msg.senderId);
                if (msg.receiverId) uniqueUsers.add(msg.receiverId);
            });

            setStats({
                totalMessages: allMessages.length,
                todayMessages: todayMessages.length,
                activeConversations: conversationsCount,
                totalUsers: uniqueUsers.size,
                textMessages: textCount,
                voiceMessages: voiceCount,
                imageMessages: imageCount,
            });

            // Calculate daily messages for last 7 days
            const last7Days = [];
            const dayNames = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                const nextDate = new Date(date);
                nextDate.setDate(nextDate.getDate() + 1);

                const count = allMessages.filter((msg: any) => {
                    const timestamp = msg.timestamp ? new Date(msg.timestamp) : null;
                    return timestamp && timestamp >= date && timestamp < nextDate;
                }).length;

                const dayName = i === 0 ? 'اليوم' : i === 1 ? 'أمس' : dayNames[date.getDay()];
                last7Days.push({
                    day: dayName,
                    messages: count,
                });
            }
            setDailyMessages(last7Days);

            // Message types for pie chart
            setMessageTypes([
                { name: 'نصية', value: textCount, fill: 'var(--color-text)' },
                { name: 'صوتية', value: voiceCount, fill: 'var(--color-voice)' },
                { name: 'صور', value: imageCount, fill: 'var(--color-image)' },
            ]);

            toast.success('تم تحميل الإحصائيات');
        } catch (error) {
            console.error('Error loading statistics:', error);
            toast.error('فشل تحميل الإحصائيات');
        } finally {
            setLoading(false);
        }
    };

    const chartConfig = {
        messages: {
            label: 'الرسائل',
            color: 'hsl(142, 76%, 36%)',
        },
        text: {
            label: 'نصية',
            color: 'hsl(142, 76%, 36%)',
        },
        voice: {
            label: 'صوتية',
            color: 'hsl(221, 83%, 53%)',
        },
        image: {
            label: 'صور',
            color: 'hsl(25, 95%, 53%)',
        },
    } satisfies ChartConfig;

    const exportToExcel = () => {
        try {
            const wb = XLSX.utils.book_new();

            const statsData = [
                ['تقرير إحصائيات الرسائل'],
                ['تاريخ التقرير:', new Date().toLocaleString('ar')],
                [],
                ['الإحصائيات العامة'],
                ['البند', 'القيمة'],
                ['إجمالي الرسائل', stats.totalMessages],
                ['رسائل اليوم', stats.todayMessages],
                ['المحادثات النشطة', stats.activeConversations],
                ['المستخدمون النشطون', stats.totalUsers],
                [],
                ['توزيع أنواع الرسائل'],
                ['النوع', 'العدد', 'النسبة %'],
                ['رسائل نصية', stats.textMessages, stats.totalMessages > 0 ? Math.round((stats.textMessages / stats.totalMessages) * 100) : 0],
                ['رسائل صوتية', stats.voiceMessages, stats.totalMessages > 0 ? Math.round((stats.voiceMessages / stats.totalMessages) * 100) : 0],
                ['صور', stats.imageMessages, stats.totalMessages > 0 ? Math.round((stats.imageMessages / stats.totalMessages) * 100) : 0],
            ];
            const ws1 = XLSX.utils.aoa_to_sheet(statsData);
            XLSX.utils.book_append_sheet(wb, ws1, 'الإحصائيات');

            const dailyData = [
                ['الرسائل اليومية'],
                ['اليوم', 'عدد الرسائل'],
                ...dailyMessages.map(d => [d.day, d.messages])
            ];
            const ws2 = XLSX.utils.aoa_to_sheet(dailyData);
            XLSX.utils.book_append_sheet(wb, ws2, 'الرسائل اليومية');

            const fileName = `تقرير-الرسائل-${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            toast.success('تم تصدير التقرير بصيغة Excel');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            toast.error('فشل تصدير التقرير');
        }
    };

    const exportToPDF = () => {
        try {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                toast.error('يرجى السماح بفتح النوافذ المنبثقة');
                return;
            }

            const htmlContent = `
                <!DOCTYPE html>
                <html dir="rtl" lang="ar">
                <head>
                    <meta charset="UTF-8">
                    <title>تقرير إحصائيات الرسائل</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            padding: 40px;
                            direction: rtl;
                        }
                        h1 {
                            color: #047857;
                            border-bottom: 3px solid #047857;
                            padding-bottom: 10px;
                        }
                        h2 {
                            color: #059669;
                            margin-top: 30px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 20px 0;
                        }
                        th, td {
                            border: 1px solid #ddd;
                            padding: 12px;
                            text-align: right;
                        }
                        th {
                            background-color: #10b981;
                            color: white;
                        }
                        tr:nth-child(even) {
                            background-color: #f3f4f6;
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 30px;
                        }
                        .footer {
                            margin-top: 40px;
                            text-align: center;
                            color: #6b7280;
                            font-size: 12px;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>تقرير إحصائيات الرسائل</h1>
                        <p>تاريخ التقرير: ${new Date().toLocaleString('ar')}</p>
                    </div>

                    <h2>الإحصائيات العامة</h2>
                    <table>
                        <tr><th>البند</th><th>القيمة</th></tr>
                        <tr><td>إجمالي الرسائل</td><td>${stats.totalMessages.toLocaleString('ar')}</td></tr>
                        <tr><td>رسائل اليوم</td><td>${stats.todayMessages.toLocaleString('ar')}</td></tr>
                        <tr><td>المحادثات النشطة</td><td>${stats.activeConversations.toLocaleString('ar')}</td></tr>
                        <tr><td>المستخدمون النشطون</td><td>${stats.totalUsers.toLocaleString('ar')}</td></tr>
                    </table>

                    <h2>توزيع أنواع الرسائل</h2>
                    <table>
                        <tr><th>النوع</th><th>العدد</th><th>النسبة</th></tr>
                        <tr>
                            <td>رسائل نصية</td>
                            <td>${stats.textMessages.toLocaleString('ar')}</td>
                            <td>${stats.totalMessages > 0 ? Math.round((stats.textMessages / stats.totalMessages) * 100) : 0}%</td>
                        </tr>
                        <tr>
                            <td>رسائل صوتية</td>
                            <td>${stats.voiceMessages.toLocaleString('ar')}</td>
                            <td>${stats.totalMessages > 0 ? Math.round((stats.voiceMessages / stats.totalMessages) * 100) : 0}%</td>
                        </tr>
                        <tr>
                            <td>صور</td>
                            <td>${stats.imageMessages.toLocaleString('ar')}</td>
                            <td>${stats.totalMessages > 0 ? Math.round((stats.imageMessages / stats.totalMessages) * 100) : 0}%</td>
                        </tr>
                    </table>

                    <h2>الرسائل اليومية (آخر 7 أيام)</h2>
                    <table>
                        <tr><th>اليوم</th><th>عدد الرسائل</th></tr>
                        ${dailyMessages.map(d => `<tr><td>${d.day}</td><td>${d.messages.toLocaleString('ar')}</td></tr>`).join('')}
                    </table>

                    <div class="footer">
                        <p>تم إنشاء هذا التقرير تلقائياً من لوحة إدارة الرسائل</p>
                    </div>
                </body>
                </html>
            `;

            printWindow.document.write(htmlContent);
            printWindow.document.close();

            setTimeout(() => {
                printWindow.print();
                toast.success('جاري تصدير التقرير بصيغة PDF');
            }, 500);
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            toast.error('فشل تصدير التقرير');
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">إدارة الرسائل</h1>
                    <p className="text-gray-500 mt-1">مراقبة وتحليل نظام الرسائل</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={loadStatistics} disabled={loading}>
                        {loading ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Activity className="h-4 w-4 mr-2" />
                        )}
                        تحديث
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                <Download className="h-4 w-4 mr-2" />
                                تصدير التقرير
                                <ChevronDown className="h-4 w-4 ml-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={exportToExcel}>
                                <FileText className="h-4 w-4 ml-2" />
                                تصدير Excel (.xlsx)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={exportToPDF}>
                                <FileText className="h-4 w-4 ml-2" />
                                تصدير PDF
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            إجمالي الرسائل
                        </CardTitle>
                        <MessageSquare className="h-5 w-5 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {loading ? '...' : stats.totalMessages.toLocaleString('ar')}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            +{stats.todayMessages} اليوم
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            المحادثات النشطة
                        </CardTitle>
                        <Users className="h-5 w-5 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {loading ? '...' : stats.activeConversations}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {stats.totalUsers} مستخدم نشط
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            رسائل اليوم
                        </CardTitle>
                        <TrendingUp className="h-5 w-5 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {loading ? '...' : stats.todayMessages}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            منذ منتصف الليل
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            أنواع الرسائل
                        </CardTitle>
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">3</div>
                        <p className="text-xs text-gray-500 mt-1">
                            نص، صوت، صور
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Line Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>الرسائل خلال آخر 7 أيام</CardTitle>
                        <CardDescription>تتبع نشاط الرسائل اليومي</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <LineChart data={dailyMessages} accessibilityLayer>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="day"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Line
                                    type="monotone"
                                    dataKey="messages"
                                    stroke="var(--color-messages)"
                                    strokeWidth={2}
                                    dot={{ fill: 'var(--color-messages)' }}
                                />
                            </LineChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* Pie Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>توزيع أنواع الرسائل</CardTitle>
                        <CardDescription>نصية، صوتية، صور</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <PieChart accessibilityLayer>
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Pie
                                    data={messageTypes}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label
                                />
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Message Types Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>تفصيل أنواع الرسائل</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                            <div className="p-3 bg-emerald-600 rounded-lg">
                                <FileText className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">رسائل نصية</p>
                                <p className="text-2xl font-bold text-emerald-600">
                                    {stats.textMessages.toLocaleString('ar')}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {stats.totalMessages > 0 ? Math.round((stats.textMessages / stats.totalMessages) * 100) : 0}% من الإجمالي
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="p-3 bg-blue-600 rounded-lg">
                                <Mic className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">رسائل صوتية</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {stats.voiceMessages.toLocaleString('ar')}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {stats.totalMessages > 0 ? Math.round((stats.voiceMessages / stats.totalMessages) * 100) : 0}% من الإجمالي
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
                            <div className="p-3 bg-orange-600 rounded-lg">
                                <ImageIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">صور</p>
                                <p className="text-2xl font-bold text-orange-600">
                                    {stats.imageMessages.toLocaleString('ar')}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {stats.totalMessages > 0 ? Math.round((stats.imageMessages / stats.totalMessages) * 100) : 0}% من الإجمالي
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
