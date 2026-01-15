'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import { Loader2, Save, Send, CheckCircle2, XCircle, MessageSquare, Key, Globe, Activity, Info } from 'lucide-react';
import { ChatAmanService, ChatAmanConfig, ChatAmanTemplate } from '@/lib/services/chataman-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';

export default function ChatAmanSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    // Configuration State
    const [config, setConfig] = useState<ChatAmanConfig>({
        apiKey: 'lmVt2Y62QMdZUp52JnkTeJNhgKERlCA92Oyv1aEh',
        baseUrl: 'https://chataman.com',
        isActive: true,
        senderName: 'El7lm',
        defaultCountryCode: '20'
    });

    // Test Message State
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('تجربة إرسال رسالة من منصة الحلم');

    // Template State
    const [testMode, setTestMode] = useState<'text' | 'template'>('text');
    const [templates, setTemplates] = useState<ChatAmanTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [templateParams, setTemplateParams] = useState<string[]>([]);
    const [webhookUrl, setWebhookUrl] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setWebhookUrl(`${window.location.origin}/api/chataman/webhook`);
        }
    }, []);

    useEffect(() => {
        if (testMode === 'template' && templates.length === 0) {
            fetchTemplates();
        }
    }, [testMode]);

    const fetchTemplates = async () => {
        if (!config.apiKey) return;
        setLoadingTemplates(true);
        const fetched = await ChatAmanService.getTemplates(config.apiKey);
        setTemplates(fetched);
        setLoadingTemplates(false);
    };

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        const data = await ChatAmanService.getConfig();
        if (data) {
            setConfig(data);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const success = await ChatAmanService.saveConfig(config);
        if (success) {
            toast.success('تم حفظ الإعدادات بنجاح');
        } else {
            toast.error('فشل في حفظ الإعدادات');
        }
        setIsSaving(false);
    };

    const handleVerifyToken = async () => {
        if (!config.apiKey) {
            toast.error('يرجى إدخال مفتاح API أولاً');
            return;
        }

        setIsVerifying(true);
        const isValid = await ChatAmanService.verifyConnection(config.apiKey);
        if (isValid) {
            toast.success('تم الاتصال بنجاح! المفتاح صالح.');
        } else {
            toast.error('فشل الاتصال. يرجى التحقق من مفتاح API.');
        }
        setIsVerifying(false);
    };

    const handleTestSend = async () => {
        if (!testPhone) {
            toast.error('يرجى إدخال رقم الهاتف للتجربة');
            return;
        }

        setIsTesting(true);
        // Ensure config is saved locally if modified, but service reads from DB mostly.
        // For testing, we might want to temporarily use the local config state if the service supported passing it directly.
        // Since our service reads from Firestore, we should ensure settings are saved first or update service to accept config.
        // For now, we assume settings are saved.

        let result;

        if (testMode === 'text') {
            result = await ChatAmanService.sendMessage(testPhone, testMessage);
        } else {
            if (!selectedTemplateId) {
                toast.error('يرجى اختيار قالب للإرسال');
                setIsTesting(false);
                return;
            }
            const selectedTemplate = templates.find(t => t.uuid === selectedTemplateId);
            // For testing simple templates without params for now, or just sending empty params
            result = await ChatAmanService.sendTemplate(testPhone, selectedTemplateId, {
                language: selectedTemplate?.language || 'ar',
                bodyParams: templateParams
            });
        }

        if (result.success) {
            toast.success('تم إرسال الطلب بنجاح. تحقق من هاتفك.');
            console.log('ChatAman Success:', result);
        } else {
            console.error('ChatAman Failure:', result);
            toast.error(`فشل الإرسال: ${result.error || 'خطأ غير معروف'}`);
            // Show raw error for debugging if available
            if (result.details) {
                toast.error(`التفاصيل: ${JSON.stringify(result.details)}`);
            }
        }
        setIsTesting(false);
    };

    if (loading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">إعدادات بوابة الرسائل (ChatAman)</h1>
                    <p className="text-gray-500 mt-2">إدارة الربط مع مزود خدمة الواتساب والرسائل النصية</p>
                </div>
                <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${config.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    <Activity className="h-4 w-4" />
                    <span className="font-bold">{config.isActive ? 'الخدمة نشطة' : 'الخدمة متوقفة'}</span>
                </div>
            </div>

            <Tabs defaultValue="settings" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                    <TabsTrigger value="settings">إعدادات الربط</TabsTrigger>
                    <TabsTrigger value="integration">دليل الويب (Webhooks)</TabsTrigger>
                    <TabsTrigger value="test">اختبار الإرسال</TabsTrigger>
                </TabsList>

                <TabsContent value="integration">
                    <Card>
                        <CardHeader>
                            <CardTitle>إعداد استقبال الرسائل (Webhook)</CardTitle>
                            <CardDescription>اربط نظامك مع ChatAman لاستقبال ردود العملاء وتحديثات الحالة</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <Info className="h-5 w-5 text-yellow-400" />
                                    </div>
                                    <div className="mr-3">
                                        <p className="text-sm text-yellow-700">
                                            لكي تعمل استجابة النظام للرسائل الواردة، يجب نسخ الرابط بالأسفل ووضعه في إعدادات Webhooks في لوحة تحكم ChatAman.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Webhook URL (رابط الاستقبال)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={webhookUrl}
                                        readOnly
                                        className="bg-gray-50 font-mono text-left ltr"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            navigator.clipboard.writeText(webhookUrl);
                                            toast.success('تم نسخ الرابط');
                                        }}
                                    >
                                        نسخ
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">قم بلصق هذا الرابط في خانة Notification URL في إعدادات ChatAman.</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Events (الأحداث المطلوبة)</Label>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        message.received
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        message.status.update
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        message.sent
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>بيانات الاتصال API</CardTitle>
                            <CardDescription>قم بإدخال مفتاح الربط الخاص بحسابك على ChatAman</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                                <div className="space-y-0.5">
                                    <Label className="text-base">تفعيل الخدمة</Label>
                                    <p className="text-sm text-gray-500">تشغيل أو إيقاف إرسال الرسائل عبر النظام</p>
                                </div>
                                <Switch
                                    checked={config.isActive}
                                    onCheckedChange={checked => setConfig(prev => ({ ...prev, isActive: checked }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>API Key (مفتاح الربط)</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Key className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                                        <Input
                                            value={config.apiKey}
                                            onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                                            className="pr-9 font-mono border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                            type="password"
                                            placeholder="أدخل مفتاح الـ API الخاص بك هنا"
                                        />
                                    </div>
                                    <Button variant="outline" onClick={handleVerifyToken} disabled={isVerifying} className="border-gray-300 hover:bg-gray-50 hover:text-blue-600">
                                        {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تحقق من المفتاح'}
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Base URL (رابط المنصة)</Label>
                                    <div className="relative">
                                        <Globe className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                                        <Input
                                            value={config.baseUrl}
                                            onChange={e => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                                            className="pr-9 ltr:text-left"
                                            placeholder="https://chataman.com"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Sender Name (اسم المرسل الافتراضي)</Label>
                                    <Input
                                        value={config.senderName}
                                        onChange={e => setConfig(prev => ({ ...prev, senderName: e.target.value }))}
                                        placeholder="El7lm"
                                    />
                                </div>
                            </div>

                            <Separator />

                            <div className="flex justify-end gap-3">
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="bg-blue-600 hover:bg-blue-700 w-32"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            جاري الحفظ...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            حفظ الإعدادات
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="test">
                    <Card>
                        <CardHeader>
                            <CardTitle>محاكاة إرسال رسالة</CardTitle>
                            <CardDescription>قم بتجربة الربط عن طريق إرسال رسالة حقيقية لرقم هاتفك</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>رقم الهاتف (مع كود الدولة)</Label>
                                <Input
                                    value={testPhone}
                                    onChange={e => setTestPhone(e.target.value)}
                                    placeholder="مثال: 201000000000"
                                    className="ltr:text-left font-mono border-gray-300 focus:ring-2"
                                />
                            </div>

                            <div className="flex gap-4 mb-6 p-1 bg-gray-100/50 rounded-lg border border-gray-200">
                                <Button
                                    variant="ghost"
                                    onClick={() => setTestMode('text')}
                                    className={`flex-1 transition-all duration-200 ${testMode === 'text' ? 'bg-white shadow-sm text-blue-700 font-bold border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                                >
                                    رسالة نصية (Session)
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setTestMode('template')}
                                    className={`flex-1 transition-all duration-200 ${testMode === 'template' ? 'bg-white shadow-sm text-blue-700 font-bold border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                                >
                                    قالب واتساب (Template)
                                </Button>
                            </div>

                            {testMode === 'text' ? (
                                <div className="space-y-2">
                                    <Label>نص الرسالة</Label>
                                    <Input
                                        value={testMessage}
                                        onChange={e => setTestMessage(e.target.value)}
                                        placeholder="الرسائل النصية الحرة تتطلب أن يكون المستخدم قد قام بمراسلتك أولاً خلال 24 ساعة"
                                    />
                                    <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                                        تنبيه: الرسائل النصية المباشرة (Session Messages) قد لا تصل إذا لم يبدأ العميل المحادثة خلال آخر 24 ساعة. لبدء محادثة جديدة، استخدم القوالب.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>اختر القالب</Label>
                                        <div className="flex gap-2">
                                            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                                <SelectTrigger className="w-full text-right" dir="rtl">
                                                    <SelectValue placeholder={loadingTemplates ? "جاري تحميل القوالب..." : "اختر قالب..."} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {templates.length === 0 && !loadingTemplates && (
                                                        <div className="p-2 text-center text-gray-500 text-sm">لا توجد قوالب متاحة</div>
                                                    )}
                                                    {templates.map((t) => (
                                                        <SelectItem key={t.uuid} value={t.uuid}>
                                                            <div className="flex justify-between w-full gap-4">
                                                                <span>{t.name}</span>
                                                                <Badge variant="outline" className="text-xs">{t.category}</Badge>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button variant="ghost" size="icon" onClick={fetchTemplates} title="تحديث القائمة">
                                                <Activity className={`h-4 w-4 ${loadingTemplates ? 'animate-spin' : ''}`} />
                                            </Button>
                                        </div>
                                    </div>

                                    {selectedTemplateId && (
                                        <div className="bg-gray-50 p-4 rounded border space-y-2">
                                            <Label className="text-xs text-gray-500">معاينة نص القالب:</Label>
                                            <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                {templates.find(t => t.uuid === selectedTemplateId)?.body}
                                            </p>
                                        </div>
                                    )}

                                    {selectedTemplateId && (() => {
                                        const template = templates.find(t => t.uuid === selectedTemplateId);
                                        const matches = template?.body?.match(/{{(\d+)}}/g);
                                        const paramCount = matches ? new Set(matches).size : 0;

                                        if (paramCount === 0) return null;

                                        return (
                                            <div className="space-y-3 border p-4 rounded-lg bg-gray-50/50">
                                                <Label className="text-sm font-semibold text-gray-700">متغيرات القالب (Parameters)</Label>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {Array.from({ length: paramCount }).map((_, i) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <span className="text-xs font-mono text-gray-500 w-8">{`{{${i + 1}}}`}</span>
                                                            <Input
                                                                placeholder={`قيمة المتغير ${i + 1}`}
                                                                value={templateParams[i] || ''}
                                                                onChange={(e) => {
                                                                    const newParams = [...templateParams];
                                                                    newParams[i] = e.target.value;
                                                                    setTemplateParams(newParams);
                                                                }}
                                                                className="h-9 text-sm"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-blue-700 text-sm">
                                <MessageSquare className="h-5 w-5 shrink-0" />
                                <p>ملاحظة: سيتم إرسال هذه الرسالة فعلياً وقد يتم خصم رصيد من حسابك في ChatAman.</p>
                            </div>

                            <div className="flex justify-end">
                                <Button
                                    onClick={handleTestSend}
                                    disabled={isTesting || !config.isActive}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {isTesting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            جاري الإرسال...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="mr-2 h-4 w-4" />
                                            إرسال رسالة تجريبية
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
