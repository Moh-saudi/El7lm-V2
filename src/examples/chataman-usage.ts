/**
 * مثال على استخدام ChatAman API Service
 * يوضح كيفية إرسال رسائل واتساب باستخدام ChatAman
 */

import ChatAmanService from '@/services/chataman.service';

// خدمة ChatAman تم تهيئتها مسبقاً
const chataman = ChatAmanService;

/**
 * مثال 1: إرسال رسالة نصية بسيطة
 */
export async function sendWelcomeMessage(phoneNumber: string, userName: string) {
    const message = `مرحباً ${userName}! 👋\n\nشكراً لتسجيلك في منصة الحلم.\nنحن سعداء بانضمامك إلينا! 🎉`;

    const result = await chataman.sendMessage({
        phone: phoneNumber,
        message: message
    });

    if (result.success) {
        console.log('✅ تم إرسال رسالة الترحيب بنجاح');
        return result.data;
    } else {
        console.error('❌ فشل إرسال رسالة الترحيب:', result.error);
        throw new Error(result.error);
    }
}

/**
 * مثال 2: إرسال إشعار بحجز جديد
 */
export async function sendBookingNotification(
    phoneNumber: string,
    bookingDetails: {
        bookingId: string;
        serviceName: string;
        date: string;
        time: string;
        price: number;
    }
) {
    const message = `
🎫 تأكيد الحجز

رقم الحجز: ${bookingDetails.bookingId}
الخدمة: ${bookingDetails.serviceName}
📅 التاريخ: ${bookingDetails.date}
⏰ الوقت: ${bookingDetails.time}
💰 المبلغ: ${bookingDetails.price} ريال

شكراً لثقتكم بنا! 🙏
  `.trim();

    const result = await chataman.sendMessage({
        phone: phoneNumber,
        message: message
    });

    return result;
}

/**
 * مثال 3: إرسال فاتورة مع ملف PDF
 */
export async function sendInvoice(
    phoneNumber: string,
    invoiceUrl: string,
    invoiceNumber: string,
    totalAmount: number
) {
    const caption = `
📄 فاتورة رقم: ${invoiceNumber}

💵 المبلغ الإجمالي: ${totalAmount} ريال

شكراً لتعاملكم معنا! 🌟
  `.trim();

    const result = await chataman.sendFile({
        phone: phoneNumber,
        fileUrl: invoiceUrl,
        caption: caption
    });

    return result;
}

/**
 * مثال 4: إرسال صورة ترويجية
 */
export async function sendPromotionalImage(
    phoneNumber: string,
    imageUrl: string,
    promotionText: string
) {
    const result = await chataman.sendFile({
        phone: phoneNumber,
        fileUrl: imageUrl,
        caption: promotionText
    });

    return result;
}

/**
 * مثال 5: إرسال رسالة صوتية
 */
export async function sendVoiceMessage(
    phoneNumber: string,
    audioUrl: string
) {
    const result = await (chataman as any).sendAudio(phoneNumber, audioUrl);
    return result;
}

/**
 * مثال 6: إرسال رسالة قالب (Template)
 */
export async function sendTemplateMessage(
    phoneNumber: string,
    templateName: string,
    parameters: Record<string, any>
) {
    const result = await (chataman as any).sendTemplate({
        phone: phoneNumber,
        templateName: templateName,
        parameters: parameters
    });

    return result;
}

/**
 * مثال 7: التحقق من حالة الاتصال
 */
export async function checkChatAmanConnection() {
    const result = await chataman.checkConnection();

    if (result.success) {
        console.log('✅ الاتصال مع ChatAman يعمل بشكل صحيح');
        return true;
    } else {
        console.error('❌ فشل الاتصال مع ChatAman:', result.error);
        return false;
    }
}

/**
 * مثال 8: الحصول على معلومات الحساب
 */
export async function getChatAmanAccountInfo() {
    const result = await chataman.getAccountInfo();

    if (result.success) {
        console.log('معلومات الحساب:', result.data);
        return result.data;
    } else {
        console.error('فشل الحصول على معلومات الحساب:', result.error);
        return null;
    }
}

/**
 * مثال 9: إرسال رسالة مع معالجة الأخطاء المتقدمة
 */
export async function sendMessageWithRetry(
    phoneNumber: string,
    message: string,
    maxRetries: number = 3
): Promise<boolean> {
    let attempts = 0;

    while (attempts < maxRetries) {
        try {
            const result = await chataman.sendMessage({
                phone: phoneNumber,
                message: message
            });

            if (result.success) {
                console.log(`✅ تم إرسال الرسالة بنجاح في المحاولة ${attempts + 1}`);
                return true;
            }

            // إذا فشلت، انتظر قليلاً قبل المحاولة مرة أخرى
            attempts++;
            if (attempts < maxRetries) {
                console.log(`⏳ إعادة المحاولة ${attempts + 1}/${maxRetries}...`);
                await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
            }
        } catch (error) {
            console.error(`❌ خطأ في المحاولة ${attempts + 1}:`, error);
            attempts++;
        }
    }

    console.error(`❌ فشل إرسال الرسالة بعد ${maxRetries} محاولات`);
    return false;
}

/**
 * مثال 10: إرسال رسائل جماعية (Bulk Messages)
 */
export async function sendBulkMessages(
    recipients: Array<{ phone: string; message: string }>,
    delayMs: number = 1000
) {
    const results = [];

    for (const recipient of recipients) {
        const result = await chataman.sendMessage({
            phone: recipient.phone,
            message: recipient.message
        });

        results.push({
            phone: recipient.phone,
            success: result.success,
            error: result.error
        });

        // انتظر قليلاً بين كل رسالة لتجنب Rate Limiting
        if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`📊 نتائج الإرسال الجماعي:`);
    console.log(`✅ نجح: ${successCount}`);
    console.log(`❌ فشل: ${failCount}`);

    return results;
}

// تصدير جميع الدوال
export default {
    sendWelcomeMessage,
    sendBookingNotification,
    sendInvoice,
    sendPromotionalImage,
    sendVoiceMessage,
    sendTemplateMessage,
    checkChatAmanConnection,
    getChatAmanAccountInfo,
    sendMessageWithRetry,
    sendBulkMessages
};
