'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard,
    Activity,
    Shield,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    RefreshCw,
    ExternalLink,
    Lock,
    Eye,
    EyeOff,
    Server,
    Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-hot-toast';

export default function SkipCashManagerPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);
    const [showSecrets, setShowSecrets] = useState(false);

    // This would typically come from an API endpoint that reads non-sensitive env vars
    // For now, we hardcode the structure and assume the API test will confirm values
    const configInfo = {
        mode: process.env.NEXT_PUBLIC_SKIPCASH_MODE || 'test', // We might need to expose this public var
        hasClientId: true,
        hasKeyId: true,
        hasSecret: true, // We assume true if env is set
        hasWebhook: true
    };

    const runConnectionTest = async () => {
        setIsLoading(true);
        setTestResult(null);
        try {
            const response = await fetch('/api/skipcash/test');
            const data = await response.json();
            setTestResult(data);

            if (data.success) {
                toast.success('تم الاتصال بنجاح بـ SkipCash');
            } else {
                toast.error('فشل الاتصال: ' + (data.message || 'خطأ غير معروف'));
            }
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء إجراء الاختبار');
            setTestResult({ success: false, message: 'Network error calling API' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 space-y-8" dir="rtl">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-blue-600" />
                        إدارة ربط SkipCash
                    </h1>
                    <p className="text-gray-500 mt-2">
                        لوحة التحكم الخاصة ببوابة الدفع القطرية SkipCash
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.open('https://skipcashmerchantportal.azurewebsites.net/', '_blank')}>
                        <ExternalLink className="w-4 h-4 ml-2" />
                        بوابة التاجر (SkipCash Portal)
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Status Card */}
                <Card className="lg:col-span-1 border-t-4 border-t-blue-500 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            حالة النظام
                            {configInfo.mode === 'live' ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-200">Live Production</Badge>
                            ) : (
                                <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200">Sandbox Test</Badge>
                            )}
                        </CardTitle>
                        <CardDescription>حالة الاتصال الحالية بالبوابة</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Server className="w-5 h-5 text-gray-500" />
                                <span className="text-sm font-medium">البيئة الحالية</span>
                            </div>
                            <span className="font-mono font-bold text-blue-600">
                                {configInfo.mode === 'live' ? 'Production' : 'Test / Sandbox'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Activity className="w-5 h-5 text-gray-500" />
                                <span className="text-sm font-medium">آخر فحص</span>
                            </div>
                            {testResult ? (
                                testResult.success ? (
                                    <span className="flex items-center text-green-600 font-bold text-sm">
                                        <CheckCircle2 className="w-4 h-4 ml-1" /> متصل
                                    </span>
                                ) : (
                                    <span className="flex items-center text-red-600 font-bold text-sm">
                                        <XCircle className="w-4 h-4 ml-1" /> مفصول
                                    </span>
                                )
                            ) : (
                                <span className="text-gray-400 text-sm">لم يتم الفحص</span>
                            )}
                        </div>

                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={runConnectionTest}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                            ) : (
                                <Activity className="w-4 h-4 ml-2" />
                            )}
                            {isLoading ? 'جاري الفحص...' : 'اختبار الاتصال الآن'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Configuration Card */}
                <Card className="lg:col-span-2 shadow-sm">
                    <CardHeader>
                        <CardTitle>إعدادات الربط (Credentials)</CardTitle>
                        <CardDescription>
                            مفاتيح الربط المستخدمة حالياً في ملف <code>.env.local</code>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <CredentialItem label="Client ID" status={configInfo.hasClientId} />
                                <CredentialItem label="Key ID" status={configInfo.hasKeyId} />
                                <CredentialItem label="Secret Key" status={configInfo.hasSecret} isSecret />
                                <CredentialItem label="Webhook Key" status={configInfo.hasWebhook} isSecret />
                            </div>

                            <div className="mt-6 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm flex gap-3 items-start">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                <div>
                                    <p className="font-bold mb-1">تنبيه أمني</p>
                                    لتغيير هذه المفاتيح، يجب تعديل متغيرات البيئة في الخادم مباشرة. لا يمكن تعديلها من واجهة المتصفح لأسباب أمنية.
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Test Results Console */}
                <div className="lg:col-span-3">
                    <AnimatePresence>
                        {testResult && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <Card className={`border-t-4 ${testResult.success ? 'border-t-green-500' : 'border-t-red-500'}`}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            {testResult.success ? (
                                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                                            ) : (
                                                <XCircle className="w-6 h-6 text-red-500" />
                                            )}
                                            نتيجة اختبار الاتصال
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-slate-900 text-slate-50 p-4 rounded-lg font-mono text-sm overflow-x-auto" dir="ltr">
                                            <div className="mb-2 text-gray-400">// API Request Response</div>
                                            <pre>{JSON.stringify(testResult, null, 2)}</pre>
                                        </div>

                                        {testResult.success && testResult.data?.payUrl && (
                                            <div className="mt-4 flex justify-end">
                                                <Button
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => window.open(testResult.data.payUrl, '_blank')}
                                                >
                                                    فتح رابط الدفع التجريبي <ExternalLink className="w-4 h-4 ml-2" />
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </div>
        </div>
    );
}



function CredentialItem({ label, status, isSecret = false }: { label: string, status: boolean, isSecret?: boolean }) {
    return (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
            <div className="flex items-center gap-3">
                {isSecret ? <Lock className="w-4 h-4 text-orange-500" /> : <Globe className="w-4 h-4 text-blue-500" />}
                <span className="font-medium text-gray-700">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                {status ? (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                        موجود
                    </Badge>
                ) : (
                    <Badge variant="destructive">
                        مفقود
                    </Badge>
                )}
            </div>
        </div>
    );
}
