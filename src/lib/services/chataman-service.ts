import { supabase } from '@/lib/supabase/config';
import { authenticatedFetch } from '@/lib/api/authenticated-fetch';

export interface ChatAmanConfig {
  apiKey: string;
  hasApiKey?: boolean;
  baseUrl: string;
  isActive: boolean;
  senderName?: string;
  defaultCountryCode?: string;
}

export interface ChatAmanTemplate {
  uuid: string;
  name: string;
  category: string;
  language: string;
  status: string;
  body: string;
  header_type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'NONE';
  header?: string;
  footer?: string;
  buttons?: Record<string, unknown>[];
}

const CONFIG_ROW_ID = 'chataman_config';

export const ChatAmanService = {
  getConfig: async (): Promise<ChatAmanConfig | null> => {
    try {
      const response = await authenticatedFetch('/api/chataman/config', {
        method: 'GET',
        cache: 'no-store',
      });
      if (!response.ok) return null;
      const result = await response.json();
      if (!result?.success || !result?.data) return null;
      return {
        apiKey: '',
        hasApiKey: Boolean(result.data.hasApiKey),
        baseUrl: result.data.baseUrl || 'https://chataman.com',
        isActive: Boolean(result.data.isActive),
        senderName: result.data.senderName || '',
        defaultCountryCode: result.data.defaultCountryCode || '',
      };
    } catch (error) {
      console.error('Error fetching ChatAman config:', error);
      return null;
    }
  },

  saveConfig: async (config: ChatAmanConfig): Promise<boolean> => {
    try {
      const response = await authenticatedFetch('/api/chataman/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.apiKey || undefined,
          baseUrl: config.baseUrl,
          isActive: config.isActive,
          senderName: config.senderName,
          defaultCountryCode: config.defaultCountryCode,
        }),
      });
      return response.ok;
    } catch (error) {
      console.error('Error saving ChatAman config:', error);
      return false;
    }
  },

  sendMessage: async (phone: string, message: string, _configOverride?: ChatAmanConfig): Promise<{ success: boolean; error?: string; data?: unknown }> => {
    try {
      let cleaned = phone.replace(/\D/g, '');
      if (cleaned.startsWith('01') && cleaned.length === 11) cleaned = `20${cleaned.substring(1)}`;
      else if (cleaned.startsWith('1') && cleaned.length === 10) cleaned = `20${cleaned}`;
      const formattedPhone = `+${cleaned}`;

      const response = await authenticatedFetch('/api/chataman/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: { phone: formattedPhone, message } }),
      });

      const data = await response.json();
      if (!data.success) {
        const errorDetails = typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
        throw new Error(`${data.message || 'Failed to send'}: ${errorDetails}`);
      }
      return { success: true, data };
    } catch (error: unknown) {
      console.error('ChatAman Send Error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
  },

  verifyConnection: async (apiKey?: string, baseUrl?: string): Promise<boolean> => {
    try {
      const response = await authenticatedFetch('/api/chataman/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey?.trim() || undefined,
          baseUrl: baseUrl || undefined,
        }),
      });
      if (!response.ok) return false;
      const result = await response.json();
      return Boolean(result?.success);
    } catch (error) {
      console.error('Verification failed', error);
      return false;
    }
  },

  getTemplates: async (_apiKey?: string): Promise<ChatAmanTemplate[]> => {
    try {
      const response = await authenticatedFetch('/api/chataman/get-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) return [];
      const result = await response.json();
      const data = result.data || [];
      const rawTemplates = Array.isArray(data) ? data : (data.data || []);

      return rawTemplates.map((item: Record<string, unknown>) => {
        if (item.metadata) {
          try {
            const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata as Record<string, unknown>;
            if (meta.body_text) item.body = meta.body_text;
            else if (meta.components) {
              const bodyComp = (meta.components as Record<string, unknown>[]).find(c => c.type === 'BODY' || c.type === 'body');
              if (bodyComp && bodyComp.text) item.body = bodyComp.text;
            }
          } catch (e) { console.error("Failed to parse metadata for template", item.name, e); }
        }
        return item as unknown as ChatAmanTemplate;
      });
    } catch (error) {
      console.error('ChatAman Templates Error:', error);
      return [];
    }
  },

  sendTemplate: async (
    phone: string,
    templateName: string,
    params: { language: string; bodyParams?: string[]; headerUrl?: string; headerParams?: string[]; buttons?: Record<string, unknown>[] },
    _configOverride?: ChatAmanConfig
  ): Promise<{ success: boolean; error?: string; data?: unknown }> => {
    try {
      let cleaned = phone.replace(/\D/g, '');
      if (cleaned.length >= 7) {
        if (cleaned.startsWith('01') && cleaned.length === 11) cleaned = `20${cleaned.substring(1)}`;
        else if (cleaned.startsWith('05') && cleaned.length === 10) cleaned = `966${cleaned.substring(1)}`;
        else if (cleaned.startsWith('0') && cleaned.length >= 9) cleaned = cleaned.substring(1);
      }
      if (cleaned.length < 7) return { success: false, error: `رقم غير صالح (قصير جداً): "${phone}" → "${cleaned}"` };
      const formattedPhone = `+${cleaned}`;

      const components: Record<string, unknown>[] = [];
      if (params.headerUrl) {
        components.push({ type: "header", parameters: [{ type: "image", image: { link: params.headerUrl } }] });
      }
      if (params.bodyParams && params.bodyParams.length > 0) {
        components.push({ type: "body", parameters: params.bodyParams.map(p => ({ type: "text", text: p })) });
      }
      if (params.buttons && params.buttons.length > 0) {
        params.buttons.forEach(btn => components.push(btn));
      }

      const payload = { phone: formattedPhone, template: { name: templateName, language: { code: params.language || 'ar' }, components } };

      const response = await authenticatedFetch('/api/chataman/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      });

      const data = await response.json();
      if (!data.success) {
        const errorDetails = typeof data.error === 'object' ? JSON.stringify(data.error) : (data.error || '');
        const phoneErrors = data.errors?.phone ? ` | هاتف: ${data.errors.phone.join(', ')}` : '';
        throw new Error(`فشل الإرسال إلى ${formattedPhone}${phoneErrors} — ${data.message || errorDetails}`);
      }
      return { success: true, data };
    } catch (error: unknown) {
      console.error(`ChatAman Send Error [${phone}]:`, error instanceof Error ? error.message : error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
  },

  sendOtp: async (phone: string, otpCode: string, language: string = 'ar') => {
    const config = await ChatAmanService.getConfig();
    if (!config || !config.isActive) return { success: false, error: 'Service inactive' };
    try {
      const templateResult = await ChatAmanService.sendTemplate(phone, 'otp_el7lmplatform', { language, bodyParams: [otpCode], buttons: [{ type: 'button', sub_type: 'url', index: 0, parameters: [{ type: 'text', text: otpCode }] }] });
      if (templateResult.success) return templateResult;
    } catch {
      // Fallback to direct message
    }
    const directMessage = `‏*${otpCode}*‏ هو كود التحقق الخاص بك على منصة الحلم (el7lm.com).\n\nللحفاظ على أمانك، لا تشارك هذا الكود مع أي شخص.\nتنتهي صلاحية الرمز خلال 3 دقائق.`;
    return await ChatAmanService.sendMessage(phone, directMessage);
  },

  sendProfileViewNotification: async (targetPhone: string, viewerName: string, userName: string) => {
    const config = await ChatAmanService.getConfig();
    if (!config || !config.isActive) return { success: false };
    const templates = await ChatAmanService.getTemplates(config.apiKey);
    const template = templates.find(t => t.name === 'profile_notification');
    if (!template) return { success: false, error: 'Profile Notification template not found' };
    return await ChatAmanService.sendTemplate(targetPhone, template.name, { language: 'ar', bodyParams: [userName, viewerName] });
  },

  sendNewMessageNotification: async (targetPhone: string, senderName: string) => {
    const config = await ChatAmanService.getConfig();
    if (!config || !config.isActive) return { success: false };
    const templates = await ChatAmanService.getTemplates(config.apiKey);
    const template = templates.find(t => t.name === 'new_message_alert');
    if (!template) return { success: false, error: 'Message Alert template not found' };
    return await ChatAmanService.sendTemplate(targetPhone, template.name, { language: 'ar', bodyParams: [senderName] });
  },

  sendWelcomeMessage: async (targetPhone: string, userName: string, verificationItem: string = 'your email') => {
    const config = await ChatAmanService.getConfig();
    if (!config || !config.isActive) return { success: false };
    const templates = await ChatAmanService.getTemplates(config.apiKey);
    const template = templates.find(t => t.name === 'our_website' || t.name === 'welcome_general');
    if (!template) return { success: false, error: 'Welcome template not found' };
    const lang = template.name === 'our_website' ? 'en' : 'ar';
    return await ChatAmanService.sendTemplate(targetPhone, template.name, { language: lang, bodyParams: [userName, verificationItem] });
  },

  sendActivationReminder: async (targetPhone: string, userName: string, promoCode?: string) => {
    const config = await ChatAmanService.getConfig();
    if (!config || !config.isActive) return { success: false };
    const templates = await ChatAmanService.getTemplates(config.apiKey);
    const template = templates.find(t => t.name === 'account_activation_reminder');
    if (!template) return { success: false, error: 'Activation Reminder template not found' };

    // Fetch active activation promo code from DB if not provided
    let resolvedPromo = promoCode;
    if (!resolvedPromo) {
      try {
        const { data: offers } = await supabase
          .from('promotional_offers')
          .select('code')
          .eq('isActive', true)
          .eq('scope', 'activation')
          .limit(1);
        resolvedPromo = offers?.[0]?.code || 'EL7LM2026';
      } catch {
        resolvedPromo = 'EL7LM2026';
      }
    }

    return await ChatAmanService.sendTemplate(targetPhone, template.name, { language: 'ar', bodyParams: [userName, resolvedPromo] });
  },

  sendCustomTemplate: async (targetPhone: string, templateName: string, bodyParams: string[], language: string = 'ar') => {
    const config = await ChatAmanService.getConfig();
    if (!config || !config.isActive) return { success: false };
    const templates = await ChatAmanService.getTemplates(config.apiKey);
    const template = templates.find(t => t.name === templateName);
    if (!template) return { success: false, error: `Template ${templateName} not found` };
    return await ChatAmanService.sendTemplate(targetPhone, template.name, { language, bodyParams });
  },
};
