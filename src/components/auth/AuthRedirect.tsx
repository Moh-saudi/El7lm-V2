'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LockKeyhole, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function AuthRedirect() {
    const [countdown, setCountdown] = useState(3);

    useEffect(() => {
        // عد تنازلي
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // التوجيه الفعلي يتم في layout.tsx، هذا للعرض فقط
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-purple-100 overflow-hidden relative">

            {/* خلفية متحركة */}
            <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
                <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-20 -right-20 w-96 h-96 bg-blue-300 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{ scale: [1, 1.5, 1], rotate: [0, -45, 0] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/2 -left-20 w-72 h-72 bg-purple-300 rounded-full blur-3xl"
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md p-1"
            >
                {/* البطاقة ذات تأثير الزجاج */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 text-center overflow-hidden relative">

                    {/* شريط التقدم العلوي */}
                    <motion.div
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: 3.5, ease: "linear" }}
                        className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-600"
                    />

                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <motion.div
                                animate={{ boxShadow: ["0 0 0 0px rgba(59, 130, 246, 0.2)", "0 0 0 20px rgba(59, 130, 246, 0)"] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg transform rotate-3"
                            >
                                <LockKeyhole className="w-10 h-10" />
                            </motion.div>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.3 }}
                                className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-white shadow-sm"
                            >
                                <ShieldCheck className="w-4 h-4 text-white" />
                            </motion.div>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-800 mb-2">
                        منطقة الأعضاء
                    </h2>

                    <p className="text-slate-600 mb-8 leading-relaxed">
                        انتهت مدة الجلسة الحالية. حفاظاً على أمان بياناتك، يرجى تسجيل الدخول مرة أخرى للمتابعة.
                    </p>

                    <div className="space-y-4">
                        <a
                            href="/auth/login"
                            className="group relative w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-gray-900 text-white rounded-xl font-medium transition-all hover:bg-black hover:scale-[1.02] shadow-lg hover:shadow-xl"
                        >
                            <span>تسجيل الدخول الآن</span>
                            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />

                            {/* تلميح العداد */}
                            <span className="absolute right-2 top-2 w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                        </a>

                        <p className="text-xs font-medium text-slate-400">
                            جاري نقلك تلقائياً خلال <span className="text-blue-600 font-bold text-base mx-1">{countdown}</span> ثواني
                        </p>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}
