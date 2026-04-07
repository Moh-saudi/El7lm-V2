import { supabase } from '@/lib/supabase/config';

export interface ChatAmanConfig {
  apiKey: string;
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
      const { data } = await supabase.from('system_configs').select('*').eq('id', CONFIG_ROW_ID).limit(1);
      return data?.length ? data[0] as ChatAmanConfig : null;
    } catch (error) {
      console.error('Error fetching ChatAman config:', error);
      return null;
    }
  },

  saveConfig: async (config: ChatAmanConfig): Promise<boolean> => {
    try {
      await supabase.from('system_configs').upsert({ id: CONFIG_ROW_ID, ...config });
      return true;
    } catch (error) {
      console.error('Error saving ChatAman config:', error);
      return false;
    }
  },

  sendMessage: async (phone: string, message: string, configOverride?: ChatAmanConfig): Promise<{ success: boolean; error?: string; data?: unknown }> => {
    const config = configOverride || await ChatAmanService.getConfig();
    if (!config || !config.isActive || !config.apiKey) return { success: false, error: 'ChatAman service is not configured or active' };

    try {
      let cleaned = phone.replace(/\D/g, '');
      if (cleaned.startsWith('01') && cleaned.length === 11) cleaned = `20${cleaned.substring(1)}`;
      else if (cleaned.startsWith('1') && cleaned.length === 10) cleaned = `20${cleaned}`;
      const formattedPhone = `+${cleaned}`;

      const response = await fetch('/api/chataman/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: { phone: formattedPhone, message }, apiKey: config.apiKey, baseUrl: config.baseUrl || 'https://chataman.com' }),
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

  verifyConnection: async (apiKey: string): Promise<boolean> => {
    try {
      const response = await fetch('https://chataman.com/api/templates', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey.trim()}`, 'Accept': 'application/json' },
      });
      return response.status === 200;
    } catch (e) {
      console.error("Verification failed", e);
      return false;
    }
  },

  getTemplates: async (apiKey?: string): Promise<ChatAmanTemplate[]> => {
    const config = apiKey ? { apiKey } as ChatAmanConfig : await ChatAmanService.getConfig();
    if (!config?.apiKey) { console.error('ChatAman: API Key not found'); return []; }

    try {
      const response = await fetch('/api/chataman/get-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: config.apiKey, baseUrl: config.baseUrl || 'https://chataman.com' }),
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
    configOverride?: ChatAmanConfig
  ): Promise<{ success: boolean; error?: string; data?: unknown }> => {
    const config = configOverride || await ChatAmanService.getConfig();
    if (!config || !config.isActive || !config.apiKey) return { success: false, error: 'Service not active' };

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

      const response = await fetch('/api/chataman/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, apiKey: config.apiKey, baseUrl: (config.baseUrl || 'https://chataman.com').trim() }),
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

  handleWebhook: async (payload: Record<string, unknown>): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('ChatAman Service: Processing Webhook:', JSON.stringify(payload));

      if (payload.object === 'whatsapp_business_account' && payload.entry) {
        for (const entry of payload.entry as Record<string, unknown>[]) {
          for (const change of (entry.changes as Record<string, unknown>[])) {
            const value = change.value as Record<string, unknown>;
            if (value && value.messages) {
              for (const message of value.messages as Record<string, unknown>[]) {
                await ChatAmanService.processIncomingMessage({
                  phone: String(message.from),
                  text: String((message.text as Record<string, unknown>)?.body || ''),
                  type: String(message.type),
                  messageId: String(message.id),
                  timestamp: message.timestamp,
                });
              }
            }
          }
        }
        return { success: true };
      }

      if (payload.event === 'message.received' || payload.event === 'message') {
        const data = (payload.data || payload) as Record<string, unknown>;
        await ChatAmanService.processIncomingMessage({
          phone: String(data.phone || data.from),
          text: String(data.message || data.body || data.text),
          type: 'text',
          messageId: String(data.id || Date.now()),
          timestamp: Date.now() / 1000,
        });
        return { success: true };
      }

      if (payload.event === 'message.status.update' || payload.event === 'message.ack') {
        const data = (payload.data || payload) as Record<string, unknown>;
        await ChatAmanService.handleStatusUpdate({ messageId: String(data.id || data.messageId), status: String(data.status), timestamp: data.timestamp });
        return { success: true };
      }

      console.warn('Unknown ChatAman payload format');
      return { success: true };
    } catch (error: unknown) {
      console.error('Error handling webhook in service:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
  },

  processIncomingMessage: async (msgData: { phone: string; text: string; type: string; messageId: string; timestamp: unknown }) => {
    try {
      let phone = msgData.phone.replace(/\D/g, '');
      if (!phone) return;
      console.log(`Processing message from ${phone}`);

      let { data: users } = await supabase.from('users').select('id, full_name, name').eq('phone', phone).limit(1);
      if (!users?.length) {
        ({ data: users } = await supabase.from('users').select('id, full_name, name').eq('phone', `+${phone}`).limit(1));
      }

      if (!users?.length) { console.log('User not found for phone:', phone); return; }

      const user = users[0] as Record<string, unknown>;
      const userId = String(user.id);
      const userName = String(user.full_name || user.name || 'مستخدم واتساب');

      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .filter('participants', 'cs', `["${userId}"]`)
        .order('lastMessageTime', { ascending: false })
        .limit(1);

      if (!convs?.length) { console.log('No active conversation found for user'); return; }

      const conversationId = String((convs[0] as Record<string, unknown>).id);
      const now = new Date().toISOString();

      await supabase.from('messages').insert({
        id: crypto.randomUUID(),
        conversationId,
        senderId: userId,
        receiverId: 'admin',
        senderName: userName,
        message: msgData.text,
        timestamp: now,
        isRead: false,
        messageType: 'text',
        metadata: { isWhatsApp: true, whatsappMessageId: msgData.messageId },
      });

      await supabase.from('conversations').update({ lastMessage: msgData.text, lastMessageTime: now, lastSenderId: userId }).eq('id', conversationId);

      console.log('WhatsApp message saved successfully');
    } catch (error) {
      console.error('Error processing incoming message:', error);
    }
  },

  handleStatusUpdate: async (statusData: { messageId: string; status: string; timestamp: unknown }) => {
    try {
      console.log(`Processing status update for ${statusData.messageId}: ${statusData.status}`);

      const { data: msgs } = await supabase.from('messages').select('id').eq('metadata->>whatsappMessageId', statusData.messageId).limit(1);
      if (!msgs?.length) { console.log('Message not found for status update:', statusData.messageId); return; }

      const updates: Record<string, unknown> = { 'metadata': { lastStatus: statusData.status, lastStatusTime: statusData.timestamp || new Date().toISOString() } };
      if (statusData.status === 'read') { updates.isDelivered = true; updates.isSeen = true; }
      else if (statusData.status === 'delivered') { updates.isDelivered = true; }

      await supabase.from('messages').update(updates).eq('id', (msgs[0] as Record<string, unknown>).id);
      console.log('Message status updated');
    } catch (error) {
      console.error('Error handling status update:', error);
    }
  },

  sendOtp: async (phone: string, otpCode: string, language: string = 'ar') => {
    const config = await ChatAmanService.getConfig();
    if (!config || !config.isActive) return { success: false, error: 'Service inactive' };
    return await ChatAmanService.sendTemplate(phone, 'otp_el7lmplatform', { language, bodyParams: [otpCode], buttons: [{ type: 'button', sub_type: 'url', index: 0, parameters: [{ type: 'text', text: otpCode }] }] });
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
