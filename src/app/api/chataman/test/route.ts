/**
 * API Endpoint للاختبار السريع لخدمة ChatAman
 * المسار: /api/chataman/test
 */

import { NextRequest, NextResponse } from 'next/server';
import chatAmanService from '@/services/chataman.service';

export async function GET(request: NextRequest) {
    try {
        // التحقق من وجود Access Token
        if (!process.env.CHATAMAN_ACCESS_TOKEN) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'CHATAMAN_ACCESS_TOKEN غير موجود في ملف .env.local'
                },
                { status: 500 }
            );
        }

        // التحقق من الاتصال
        const connectionResult = await chatAmanService.checkConnection();

        // الحصول على معلومات الحساب
        const accountInfo = await chatAmanService.getAccountInfo();

        return NextResponse.json({
            success: true,
            message: connectionResult.message || 'ChatAman service is configured ✅',
            connection: connectionResult.data,
            account: accountInfo.data,
            config: {
                enabled: process.env.CHATAMAN_ENABLED,
                hasToken: !!process.env.CHATAMAN_ACCESS_TOKEN
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('خطأ في اختبار ChatAman:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'حدث خطأ غير متوقع',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // قراءة البيانات من الطلب
        const body = await request.json();
        const { phone, message, type = 'text' } = body;

        // التحقق من البيانات المطلوبة
        if (!phone) {
            return NextResponse.json(
                { success: false, error: 'رقم الهاتف مطلوب' },
                { status: 400 }
            );
        }

        if (!message && type === 'text') {
            return NextResponse.json(
                { success: false, error: 'نص الرسالة مطلوب' },
                { status: 400 }
            );
        }

        // التحقق من تنسيق رقم الهاتف
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(phone)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'رقم الهاتف يجب أن يكون بالصيغة الدولية (مثال: +966501234567)'
                },
                { status: 400 }
            );
        }

        // التحقق من وجود Access Token
        if (!process.env.CHATAMAN_ACCESS_TOKEN) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'CHATAMAN_ACCESS_TOKEN غير موجود في ملف .env.local'
                },
                { status: 500 }
            );
        }

        let result;

        // إرسال الرسالة حسب النوع
        if (type === 'text') {
            result = await chatAmanService.sendMessage({
                phone,
                message
            });
        } else if (type === 'file') {
            const { fileUrl, caption } = body;
            if (!fileUrl) {
                return NextResponse.json(
                    { success: false, error: 'رابط الملف مطلوب' },
                    { status: 400 }
                );
            }
            result = await chatAmanService.sendFile({
                phone,
                fileUrl,
                caption
            });
        } else {
            return NextResponse.json(
                {
                    success: false,
                    error: 'نوع الرسالة غير مدعوم. الأنواع المدعومة: text, file'
                },
                { status: 400 }
            );
        }

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'تم إرسال الرسالة بنجاح! ✅',
                data: result.data,
                timestamp: new Date().toISOString()
            });
        } else {
            return NextResponse.json(
                {
                    success: false,
                    error: 'فشل إرسال الرسالة',
                    details: result.error
                },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('خطأ في إرسال الرسالة:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'حدث خطأ غير متوقع',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
