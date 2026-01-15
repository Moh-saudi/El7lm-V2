import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp, limit, orderBy } from 'firebase/firestore';

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
  buttons?: any[];
}

const CONFIG_DOC_ID = 'chataman_config';

export const ChatAmanService = {
  // Get configuration from Firestore
  getConfig: async (): Promise<ChatAmanConfig | null> => {
    try {
      const docRef = doc(db, 'system_configs', CONFIG_DOC_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as ChatAmanConfig;
      }
      return null;
    } catch (error) {
      console.error('Error fetching ChatAman config:', error);
      return null;
    }
  },

  // Save configuration to Firestore
  saveConfig: async (config: ChatAmanConfig): Promise<boolean> => {
    try {
      const docRef = doc(db, 'system_configs', CONFIG_DOC_ID);
      await setDoc(docRef, config, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving ChatAman config:', error);
      return false;
    }
  },

  // Send a text message
  sendMessage: async (phone: string, message: string, configOverride?: ChatAmanConfig): Promise<{ success: boolean; error?: string; data?: any }> => {
    const config = configOverride || await ChatAmanService.getConfig();

    if (!config || !config.isActive || !config.apiKey) {
      return { success: false, error: 'ChatAman service is not configured or active' };
    }

    try {
      // Format phone number
      const formattedPhone = phone.replace(/\D/g, '');

      const response = await fetch(`${config.baseUrl || 'https://chataman.com'}/api/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey.trim()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: message
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message via ChatAman');
      }

      return { success: true, data: data };
    } catch (error: any) {
      console.error('ChatAman Send Error:', error);
      return { success: false, error: error.message };
    }
  },

  // Verify connection (test endpoint via templates listing)
  verifyConnection: async (apiKey: string): Promise<boolean> => {
    try {
      const response = await fetch('https://chataman.com/api/templates', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      return response.status === 200;
    } catch (e) {
      console.error("Verification failed", e);
      return false;
    }
  },

  // Get available templates
  getTemplates: async (apiKey?: string): Promise<ChatAmanTemplate[]> => {
    const config = apiKey ? { apiKey } as ChatAmanConfig : await ChatAmanService.getConfig();

    if (!config?.apiKey) {
      console.error('ChatAman: API Key not found');
      return [];
    }

    try {
      const response = await fetch(`${config.baseUrl || 'https://chataman.com'}/api/templates`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey.trim()}`,
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) return [];

      const data = await response.json();
      // Adjust based on actual API response structure (assuming data.data or direct array)
      return Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
      console.error('ChatAman Templates Error:', error);
      return [];
    }
  },

  // Send a template message
  sendTemplate: async (
    phone: string,
    templateId: string,
    params: {
      language: string,
      bodyParams?: string[],
      headerUrl?: string,
      headerParams?: string[],
      buttons?: any[]
    },
    configOverride?: ChatAmanConfig
  ): Promise<{ success: boolean; error?: string; data?: any }> => {
    const config = configOverride || await ChatAmanService.getConfig();

    if (!config || !config.isActive || !config.apiKey) {
      return { success: false, error: 'Service not active' };
    }

    try {
      const formattedPhone = phone.replace(/\D/g, '');

      const payload: any = {
        phone: formattedPhone,
        template_id: templateId, // or template_uuid/name depending on API
        language: params.language || 'ar',
        params: params.bodyParams || [] // ChatAman likely expects params as array
      };

      // Add header/media if applicable
      if (params.headerUrl) {
        payload.media = params.headerUrl;
      }

      // Add buttons if applicable
      if (params.buttons) {
        payload.buttons = params.buttons;
      }

      const response = await fetch(`${config.baseUrl || 'https://chataman.com'}/api/send/template`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey.trim()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send template');
      }

      return { success: true, data: data };
    } catch (error: any) {
      console.error('ChatAman Template Send Error:', error);
      return { success: false, error: error.message };
    }
  },

  // Handle incoming webhooks
  handleWebhook: async (payload: any): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('ChatAman Service: Processing Webhook:', JSON.stringify(payload));

      // Attempt to detect payload structure

      // Case 1: Standard Meta/WhatsApp Structure
      if (payload.object === 'whatsapp_business_account' && payload.entry) {
        for (const entry of payload.entry) {
          for (const change of entry.changes) {
            if (change.value && change.value.messages) {
              for (const message of change.value.messages) {
                await ChatAmanService.processIncomingMessage({
                  phone: message.from,
                  text: message.text?.body || '',
                  type: message.type,
                  messageId: message.id,
                  timestamp: message.timestamp
                });
              }
            }
            // Handle Statues
            if (change.value && change.value.statuses) {
              // TODO: Handle delivery receipts
            }
          }
        }
        return { success: true };
      }

      // Case 2: Simplified structure (Common in some BSPs)
      // Example: { event: 'message', data: { phone: '...', message: '...' } }
      if (payload.event === 'message.received' || payload.event === 'message') {
        const data = payload.data || payload;
        await ChatAmanService.processIncomingMessage({
          phone: data.phone || data.from,
          text: data.message || data.body || data.text,
          type: 'text',
          messageId: data.id || Date.now().toString(),
          timestamp: Date.now() / 1000
        });
        return { success: true };
      }

      // Case 3: Status Update (Sent, Delivered, Read)
      if (payload.event === 'message.status.update' || payload.event === 'message.ack') {
        const data = payload.data || payload;
        await ChatAmanService.handleStatusUpdate({
          messageId: data.id || data.messageId,
          status: data.status,
          timestamp: data.timestamp
        });
        return { success: true };
      }

      // Log unknown format
      console.warn('Unknown ChatAman payload format');
      return { success: true }; // Return success to avoid retry loops from provider

    } catch (error: any) {
      console.error('Error handling webhook in service:', error);
      return { success: false, error: error.message };
    }
  },

  // Private helper to process a single logical message
  processIncomingMessage: async (msgData: { phone: string; text: string; type: string; messageId: string; timestamp: any }) => {
    try {
      // 1. Sanitize Phone
      let phone = msgData.phone.replace(/\D/g, '');
      // Remove leading zeros if present (unlikely in API but possible)
      // Check for User
      console.log(`Processing message from ${phone}`);

      if (!phone) return;

      // Try to find user by phone
      // We might need to try multiple formats of the phone (with/without country code)
      // For now, exact match or simple variations

      let userQuery = query(collection(db, 'users'), where('phone', '==', phone));
      let userSnapshot = await getDocs(userQuery);

      // Fallback: Try with '+'
      if (userSnapshot.empty) {
        userQuery = query(collection(db, 'users'), where('phone', '==', '+' + phone));
        userSnapshot = await getDocs(userQuery);
      }

      let userId = '';
      let userName = '';

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        userId = userDoc.id;
        userName = userDoc.data().full_name || userDoc.data().name || 'مستخدم واتساب';
      } else {
        console.log('User not found for phone:', phone);
        // Option: Create a "Lead" or ignore?
        // For now, we will return to avoid polluting DB with unknown messages 
        // OR we can create a placeholder user logic here. 
        // Returning for safety.
        return;
      }

      // 2. Find conversation
      // We look for a conversation where 'participants' array contains userId
      // AND maybe we can check if there's an admin involved? 
      // For now, we look for *any* conversation involving this user.
      // If multiple, picking the most recent one is tricky without compound queries.
      // We'll query conversations containing this participant.

      const convQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId),
        orderBy('lastMessageTime', 'desc'),
        limit(1)
      );

      const convSnapshot = await getDocs(convQuery);
      let conversationId = '';

      if (!convSnapshot.empty) {
        conversationId = convSnapshot.docs[0].id;
      } else {
        // Create new conversation (with a default admin or "support" role?)
        // This is tricky. Who is the other participant?
        // We usually assign it to the "System Admin" or leave it open.
        // ModernMessageCenter expects 2 participants usually.
        // Let's assume we have a SUPPORT_AGENT_ID env or just fail if no convo exists.
        // Better: Create a message in a "new" conversation state?
        console.log('No active conversation found for user');
        return;
      }

      // 3. Add Message
      await addDoc(collection(db, 'messages'), {
        conversationId: conversationId,
        senderId: userId,
        receiverId: 'admin', // Or the other participant ID from conversation
        // Actually we should get the other specific participant:
        // const otherPart = convSnapshot.docs[0].data().participants.find(p => p !== userId);
        senderName: userName,
        message: msgData.text,
        timestamp: serverTimestamp(),
        isRead: false,
        messageType: 'text',
        metadata: {
          isWhatsApp: true,
          whatsappMessageId: msgData.messageId
        }
      });

      // 4. Update Conversation
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: msgData.text,
        lastMessageTime: serverTimestamp(),
        lastSenderId: userId,
        // Increment unread count for everyone EXCEPT the sender
        // We need to fetch the conversation data to know who to increment
        // Simple hack: increment for everyone else?
        // Since we are server-side(ish), we can't easily do atomic map updates for unknown keys.
        // We'll leave unread count simple for now.
      });

      console.log('WhatsApp message saved successfully');

    } catch (error) {
      console.error('Error processing incoming message:', error);
    }
  },

  // Helper to handle status updates (Delivered/Read)
  handleStatusUpdate: async (statusData: { messageId: string; status: string; timestamp: any }) => {
    try {
      console.log(`Processing status update for ${statusData.messageId}: ${statusData.status}`);

      // Find the message with this WhatsApp ID
      // Note: This requires a composite index on metadata.whatsappMessageId if the collection is large.
      // For now we assume we can query it or stick to recent.
      // Ideally 'messages' collection should have this field indexed.

      const q = query(
        collection(db, 'messages'),
        where('metadata.whatsappMessageId', '==', statusData.messageId),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log('Message not found for status update:', statusData.messageId);
        return;
      }

      const msgDoc = snapshot.docs[0];
      const updates: any = {
        'metadata.lastStatus': statusData.status,
        'metadata.lastStatusTime': statusData.timestamp || serverTimestamp()
      };

      // If read, mark as read (though usually 'isRead' refers to Admin reading it, 
      // but for outgoing messages, it means User read it).
      // Let's add a visual indicator field explicitly for outgoing:
      if (statusData.status === 'read') {
        updates['isDelivered'] = true;
        updates['isSeen'] = true; // Use isSeen to distinguish from internal isRead
      } else if (statusData.status === 'delivered') {
        updates['isDelivered'] = true;
      }

      await updateDoc(msgDoc.ref, updates);
      console.log('Message status updated');

    } catch (error) {
      console.error('Error handling status update:', error);
    }
  },

  // ---------------------------------------------------
  // Specialized Template Helpers
  // ---------------------------------------------------

  // 1. Send OTP
  sendOtp: async (phone: string, otpCode: string, language: string = 'ar') => {
    // Template Name: auth_otp (suggested)
    // Params: {{1}} = otp code
    // Note: Authentication templates usually have fixed structure enforced by Meta. 
    // We assume a template that takes one parameter (the code).
    // Sometimes Auth templates use specific 'Copy Code' button components which are handled in the template config itself,
    // but the variable mapping remains the same.

    // We need to fetch templates to find the exact ID if we want to be dynamic, 
    // OR we can store the Template ID in config.
    // For now, let's assume the user configures the ID in a constant or passed in config.
    // We'll search for a template named 'auth_otp' or 'otp_code'.

    // Ideally, we get the template ID from the config.
    const config = await ChatAmanService.getConfig();
    if (!config || !config.isActive) return { success: false, error: 'Service inactive' };

    // Fallback: search for template by name
    const templates = await ChatAmanService.getTemplates(config.apiKey);
    const otpTemplate = templates.find(t => t.name.includes('otp') || t.name.includes('auth'));

    if (!otpTemplate) {
      return { success: false, error: 'OTP Template not found' };
    }

    return await ChatAmanService.sendTemplate(phone, otpTemplate.uuid, {
      language: language,
      bodyParams: [otpCode],
      // Auth templates often require the button parameter for the code copy button
      // Format: { type: 'button', sub_type: 'url', index: 0, parameters: [{ type: 'text', text: otpCode }] }
      // We'll add this just in case the template uses a copy code button
      buttons: [
        {
          type: 'button',
          sub_type: 'url',
          index: 0,
          parameters: [{ type: 'text', text: otpCode }]
        }
      ]
    });
  },

  // 2. Profile View Notification (Updated Name: profile_notification)
  sendProfileViewNotification: async (targetPhone: string, viewerName: string, userName: string) => {
    // Template Name: profile_notification (as created by user)
    // Body: مرحباً كابتن *{{1}}*،قام* {{2}}* بزيارة ملفك الشخصي الآن.للمزيد من التفاصيل يرجى مراجعة حسابك.

    const config = await ChatAmanService.getConfig();
    if (!config || !config.isActive) return { success: false };

    const templates = await ChatAmanService.getTemplates(config.apiKey);
    // Search effectively for the user's template name
    const template = templates.find(t => t.name === 'profile_notification');

    if (!template) return { success: false, error: 'Profile Notification template not found' };

    return await ChatAmanService.sendTemplate(targetPhone, template.uuid, {
      language: 'ar',
      bodyParams: [userName, viewerName]
    });
  },

  // 3. New Message Notification
  sendNewMessageNotification: async (targetPhone: string, senderName: string) => {
    // Template Name: new_message_alert
    // Body: لديك رسالة جديدة من *{{1}}* في حسابك.قم بتسجيل الدخول للاطلاع عليها والرد.

    const config = await ChatAmanService.getConfig();
    if (!config || !config.isActive) return { success: false };

    const templates = await ChatAmanService.getTemplates(config.apiKey);
    const template = templates.find(t => t.name === 'new_message_alert');

    if (!template) return { success: false, error: 'Message Alert template not found' };

    return await ChatAmanService.sendTemplate(targetPhone, template.uuid, {
      language: 'ar',
      bodyParams: [senderName]
    });
  },

  // 4. General Welcome / Website Notification
  sendWelcomeMessage: async (targetPhone: string, userName: string, verificationItem: string = 'your email') => {
    // Template Name: our_website (approved)
    // Body: Hi {{1}}, Your new account has been created successfully. Please verify {{2}} to complete your profile.

    const config = await ChatAmanService.getConfig();
    if (!config || !config.isActive) return { success: false };

    const templates = await ChatAmanService.getTemplates(config.apiKey);
    // Map to 'our_website' or fallback to 'welcome_general' if created later
    const template = templates.find(t => t.name === 'our_website' || t.name === 'welcome_general');

    if (!template) return { success: false, error: 'Welcome template not found' };

    // Determine language based on template name (our_website seems English from user prompt)
    // We can check template.language or default to 'en' for 'our_website' and 'ar' for others.
    const lang = template.name === 'our_website' ? 'en' : 'ar';

    return await ChatAmanService.sendTemplate(targetPhone, template.uuid, {
      language: lang,
      bodyParams: [userName, verificationItem]
    });
  },

  // 5. Activation Reminder
  sendActivationReminder: async (targetPhone: string, userName: string, promoCode: string = '꿈2026') => {
    const config = await ChatAmanService.getConfig();
    if (!config || !config.isActive) return { success: false };

    const templates = await ChatAmanService.getTemplates(config.apiKey);
    const template = templates.find(t => t.name === 'account_activation_reminder');

    if (!template) return { success: false, error: 'Activation Reminder template not found' };

    return await ChatAmanService.sendTemplate(targetPhone, template.uuid, {
      language: 'ar',
      bodyParams: [userName, promoCode]
    });
  },

  // 6. Generic Template Sender (by name)
  sendCustomTemplate: async (targetPhone: string, templateName: string, bodyParams: string[], language: string = 'ar') => {
    const config = await ChatAmanService.getConfig();
    if (!config || !config.isActive) return { success: false };

    const templates = await ChatAmanService.getTemplates(config.apiKey);
    const template = templates.find(t => t.name === templateName);

    if (!template) return { success: false, error: `Template ${templateName} not found` };

    return await ChatAmanService.sendTemplate(targetPhone, template.uuid, {
      language,
      bodyParams
    });
  }
};
