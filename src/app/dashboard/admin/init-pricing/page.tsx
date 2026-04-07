'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { initializeRealPricingSystem } from '@/lib/services/init-real-pricing';
import { CheckCircle, AlertCircle, Loader2, PlayCircle } from 'lucide-react';

export default function InitPricingPage() {
    const { user } = useAuth();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [logs, setLogs] = useState<string[]>([]);

    const handleInitialize = async () => {
        if (!user?.id) {
            setStatus('error');
            setMessage('يجب تسجيل الدخول أولاً');
            return;
        }

        setStatus('loading');
        setMessage('جاري تهيئة نظام التسعير...');
        setLogs([]);

        // Override console.log to capture logs
        const originalLog = console.log;
        console.log = (...args) => {
            const logMessage = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            setLogs(prev => [...prev, logMessage]);
            originalLog(...args);
        };

        try {
            await initializeRealPricingSystem(user.id);
            setStatus('success');
            setMessage('✅ تم تهيئة نظام التسعير بنجاح!');
        } catch (error) {
            setStatus('error');
            setMessage('❌ حدث خطأ: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            // Restore console.log
            console.log = originalLog;
        }
    };

    return (
        <div className="p-8 min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="mx-auto max-w-4xl">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-gray-900">
                        🚀 تهيئة نظام التسعير
                    </h1>
                    <p className="mt-2 text-gray-600">
                        هذه الصفحة ستقوم بإنشاء البيانات الأولية لنظام التسعير في Firebase
                    </p>
                </div>

                {/* Info Card */}
                <div className="p-6 mb-6 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="mb-3 text-lg font-semibold text-blue-900">
                        ℹ️ ما الذي سيتم إنشاؤه؟
                    </h3>
                    <ul className="space-y-2 text-blue-800">
                        <li>✅ 3 باقات أساسية للاعبين (3 شهور، 6 شهور، سنة)</li>
                        <li>✅ 3 تخصيصات أسعار لمصر بالجنيه المصري</li>
                        <li>✅ 2 عروض ترويجية (خصم 50% لمصر والعالم)</li>
                    </ul>
                </div>

                {/* Warning Card */}
                <div className="p-6 mb-6 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h3 className="mb-3 text-lg font-semibold text-yellow-900">
                        ⚠️ تحذير مهم
                    </h3>
                    <p className="text-yellow-800">
                        تأكد من تطبيق Security Rules في Firebase قبل التشغيل!
                        <br />
                        <code className="px-2 py-1 mt-2 text-sm bg-yellow-100 rounded inline-block">
                            Firebase Console → Firestore → Rules
                        </code>
                    </p>
                </div>

                {/* Action Button */}
                <div className="mb-6 text-center">
                    <button
                        onClick={handleInitialize}
                        disabled={status === 'loading' || !user}
                        className={`
                            inline-flex items-center gap-3 px-8 py-4 text-lg font-semibold text-white
                            rounded-lg shadow-lg transition-all transform hover:scale-105
                            ${status === 'loading'
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                            }
                        `}
                    >
                        {status === 'loading' ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                جاري التهيئة...
                            </>
                        ) : (
                            <>
                                <PlayCircle className="w-6 h-6" />
                                بدء التهيئة
                            </>
                        )}
                    </button>

                    {!user && (
                        <p className="mt-3 text-red-600">
                            ⚠️ يجب تسجيل الدخول أولاً
                        </p>
                    )}
                </div>

                {/* Status Message */}
                {message && (
                    <div className={`
                        p-6 mb-6 rounded-lg border-2
                        ${status === 'success' ? 'bg-green-50 border-green-200' : ''}
                        ${status === 'error' ? 'bg-red-50 border-red-200' : ''}
                        ${status === 'loading' ? 'bg-blue-50 border-blue-200' : ''}
                    `}>
                        <div className="flex gap-3 items-center">
                            {status === 'success' && <CheckCircle className="w-6 h-6 text-green-600" />}
                            {status === 'error' && <AlertCircle className="w-6 h-6 text-red-600" />}
                            {status === 'loading' && <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />}
                            <p className={`
                                font-medium
                                ${status === 'success' ? 'text-green-900' : ''}
                                ${status === 'error' ? 'text-red-900' : ''}
                                ${status === 'loading' ? 'text-blue-900' : ''}
                            `}>
                                {message}
                            </p>
                        </div>
                    </div>
                )}

                {/* Logs */}
                {logs.length > 0 && (
                    <div className="p-6 bg-gray-900 rounded-lg">
                        <h3 className="mb-3 text-lg font-semibold text-white">
                            📋 سجل العمليات
                        </h3>
                        <div className="overflow-y-auto p-4 max-h-96 font-mono text-sm leading-relaxed text-green-400 bg-black rounded">
                            {logs.map((log, index) => (
                                <div key={index} className="mb-1">
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Success Actions */}
                {status === 'success' && (
                    <div className="p-6 mt-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                        <h3 className="mb-4 text-xl font-bold text-green-900">
                            🎉 ممتاز! ماذا بعد؟
                        </h3>
                        <div className="space-y-3 text-green-800">
                            <p>✅ الآن يمكنك:</p>
                            <ul className="mr-6 space-y-2 list-disc">
                                <li>
                                    <a
                                        href="/dashboard/admin/pricing-management"
                                        className="font-semibold text-blue-600 hover:underline"
                                    >
                                        إدارة الأسعار والباقات →
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="/dashboard/shared/bulk-payment"
                                        className="font-semibold text-blue-600 hover:underline"
                                    >
                                        صفحة الدفع (سترى الأسعار الجديدة) →
                                    </a>
                                </li>
                                <li>
                                    التحقق من Firebase Console لرؤية البيانات المنشأة
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
