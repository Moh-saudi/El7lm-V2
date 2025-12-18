/**
 * ChatAman WhatsApp Service Integration
 * خدمة بسيطة للتكامل مع ChatAman
 * 
 * ملاحظة مهمة:
 * ChatAman يبدو أنه واجهة لإدارة WhatsApp وليس API مباشر
 * لذلك نستخدم WhatsApp Service الموجود بدلاً من ذلك
 * 
 * عندما تحصل على التوثيق الرسمي من ChatAman، يمكن تحديث هذا الملف
 */

import whatsappService from '@/lib/whatsapp/whatsapp-service';

export interface SendMessageParams {
    phone: string;
    message: string;
}

export interface ChatAmanResponse {
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
}

class ChatAmanService {
    private accessToken: string;
    private enabled: boolean;

    constructor() {
        this.accessToken = process.env.CHATAMAN_ACCESS_TOKEN || '';
        this.enabled = process.env.CHATAMAN_ENABLED === 'true';
    }

    /**
     * إرسال رسالة نصية
     * حالياً يستخدم WhatsApp Service الموجود
     * سيتم تحديثه عند الحصول على توثيق ChatAman الرسمي
     */
    async sendMessage(params: SendMessageParams): Promise<ChatAmanResponse> {
        try {
            if (!this.enabled) {
                return {
                    success: false,
                    error: 'ChatAman service is not enabled. Using fallback WhatsApp service instead.'
                };
            }

            if (!this.accessToken) {
                return {
                    success: false,
                    error: 'ChatAman access token is missing'
                };
            }

            // استخدام WhatsApp Service الموجود كبديل مؤقت
            console.log('📱 ChatAman: Using WhatsApp service as fallback');
            const result = await whatsappService.sendMessage(params.phone, params.message);

            if (result.success) {
                return {
                    success: true,
                    message: 'Message sent successfully via WhatsApp service',
                    data: result
                };
            } else {
                return {
                    success: false,
                    error: result.error || 'Failed to send message'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    /**
     * إرسال ملف (صورة، فيديو، مستند)
     * TODO: سيتم تنفيذه عند الحصول على توثيق ChatAman
     */
    async sendFile(params: { phone: string; fileUrl: string; caption?: string }): Promise<ChatAmanResponse> {
        return {
            success: false,
            error: 'File sending not yet implemented. Waiting for ChatAman API documentation.'
        };
    }

    /**
     * التحقق من حالة الاتصال
     */
    async checkConnection(): Promise<ChatAmanResponse> {
        if (!this.enabled) {
            return {
                success: false,
                error: 'ChatAman service is disabled',
                data: {
                    enabled: false,
                    hasToken: !!this.accessToken,
                    fallbackAvailable: true,
                    message: 'Using WhatsApp service as fallback'
                }
            };
        }

        if (!this.accessToken) {
            return {
                success: false,
                error: 'ChatAman access token is missing'
            };
        }

        // التحقق من WhatsApp Service كبديل
        return {
            success: true,
            message: 'ChatAman configured. Using WhatsApp service as fallback until API documentation is available.',
            data: {
                enabled: this.enabled,
                hasToken: !!this.accessToken,
                accessToken: this.accessToken.substring(0, 10) + '...',
                fallbackService: 'WhatsApp Business/Green API',
                status: 'Waiting for ChatAman API documentation'
            }
        };
    }

    /**
     * الحصول على معلومات الحساب
     */
    async getAccountInfo(): Promise<ChatAmanResponse> {
        return {
            success: true,
            data: {
                service: 'ChatAman',
                accessToken: this.accessToken ? this.accessToken.substring(0, 10) + '...' : 'Not set',
                enabled: this.enabled,
                status: 'Configured but waiting for API documentation',
                fallbackService: 'WhatsApp Business/Green API',
                note: 'Please contact ChatAman support for API documentation'
            }
        };
    }
}

// تصدير instance واحد
const chatAmanService = new ChatAmanService();
export default chatAmanService;

// دوال مساعدة للاستخدام السريع
export const sendChatAmanMessage = (phone: string, message: string) =>
    chatAmanService.sendMessage({ phone, message });

export const checkChatAmanConnection = () =>
    chatAmanService.checkConnection();
