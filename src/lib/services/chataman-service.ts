import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
  sendMessage: async (phone: string, message: string, configOverride?: ChatAmanConfig): Promise<{ success: boolean; error?: string }> => {
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

      return { success: true };
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
  ): Promise<{ success: boolean; error?: string }> => {
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

      return { success: true };
    } catch (error: any) {
      console.error('ChatAman Template Send Error:', error);
      return { success: false, error: error.message };
    }
  }
};
