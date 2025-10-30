/**
 * Baba Service Instance Manager
 * إدارة Instance ID لـ Baba Service
 */

import { BABASERVICE_CONFIG } from './babaservice-config';

export interface InstanceInfo {
  instanceId: string;
  status: 'connected' | 'disconnected' | 'invalidated' | 'unknown';
  qrCode?: string;
  lastChecked: Date;
  error?: string;
}

class InstanceManager {
  private static instance: InstanceManager;
  private currentInstance: InstanceInfo | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): InstanceManager {
    if (!InstanceManager.instance) {
      InstanceManager.instance = new InstanceManager();
    }
    return InstanceManager.instance;
  }

  /**
   * الحصول على Instance ID صالح
   */
  async getValidInstanceId(): Promise<string> {
    // إذا كان لدينا instance صالح، استخدمه
    if (this.currentInstance && this.currentInstance.status === 'connected') {
      return this.currentInstance.instanceId;
    }

    // إنشاء instance جديد
    return await this.createNewInstance();
  }

  /**
   * إنشاء Instance جديد
   */
  async createNewInstance(): Promise<string> {
    try {
      console.log('🔄 إنشاء Instance جديد...');

      const response = await fetch(`${BABASERVICE_CONFIG.BASE_URL}${BABASERVICE_CONFIG.ENDPOINTS.CREATE_INSTANCE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: BABASERVICE_CONFIG.ACCESS_TOKEN
        })
      });

      const data = await response.json();
      console.log('📱 استجابة إنشاء Instance:', data);

      if (data && data.instance_id) {
        const instanceId = data.instance_id;

        this.currentInstance = {
          instanceId,
          status: 'disconnected',
          lastChecked: new Date()
        };

        console.log('✅ تم إنشاء Instance جديد:', instanceId);
        return instanceId;
      } else {
        throw new Error(data.error || 'فشل في إنشاء Instance');
      }
    } catch (error: any) {
      console.error('❌ خطأ في إنشاء Instance:', error);
      throw new Error(`فشل في إنشاء Instance: ${error.message}`);
    }
  }

  /**
   * فحص حالة Instance
   */
  async checkInstanceStatus(instanceId: string): Promise<InstanceInfo> {
    try {
      console.log('🔍 فحص حالة Instance:', instanceId);

      const response = await fetch(`${BABASERVICE_CONFIG.BASE_URL}${BABASERVICE_CONFIG.ENDPOINTS.GET_QR_CODE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instance_id: instanceId,
          access_token: BABASERVICE_CONFIG.ACCESS_TOKEN
        })
      });

      const data = await response.json();
      console.log('📱 استجابة فحص Instance:', data);

      const instanceInfo: InstanceInfo = {
        instanceId,
        status: 'unknown',
        lastChecked: new Date()
      };

      if (data && data.qrcode) {
        instanceInfo.status = 'disconnected';
        instanceInfo.qrCode = data.qrcode;
      } else if (data && data.status === 'connected') {
        instanceInfo.status = 'connected';
      } else if (data && data.error) {
        instanceInfo.status = 'invalidated';
        instanceInfo.error = data.error;
      }

      this.currentInstance = instanceInfo;
      return instanceInfo;
    } catch (error: any) {
      console.error('❌ خطأ في فحص Instance:', error);
      const instanceInfo: InstanceInfo = {
        instanceId,
        status: 'invalidated',
        lastChecked: new Date(),
        error: error.message
      };
      this.currentInstance = instanceInfo;
      return instanceInfo;
    }
  }

  /**
   * إعادة تشغيل Instance
   */
  async rebootInstance(instanceId: string): Promise<boolean> {
    try {
      console.log('🔄 إعادة تشغيل Instance:', instanceId);

      const response = await fetch(`${BABASERVICE_CONFIG.BASE_URL}${BABASERVICE_CONFIG.ENDPOINTS.REBOOT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instance_id: instanceId,
          access_token: BABASERVICE_CONFIG.ACCESS_TOKEN
        })
      });

      const data = await response.json();
      console.log('📱 استجابة إعادة التشغيل:', data);

      if (data && data.success) {
        this.currentInstance = {
          instanceId,
          status: 'disconnected',
          lastChecked: new Date()
        };
        return true;
      } else {
        throw new Error(data.error || 'فشل في إعادة تشغيل Instance');
      }
    } catch (error: any) {
      console.error('❌ خطأ في إعادة تشغيل Instance:', error);
      return false;
    }
  }

  /**
   * إعادة تعيين Instance
   */
  async resetInstance(instanceId: string): Promise<boolean> {
    try {
      console.log('🔄 إعادة تعيين Instance:', instanceId);

      const response = await fetch(`${BABASERVICE_CONFIG.BASE_URL}${BABASERVICE_CONFIG.ENDPOINTS.RESET_INSTANCE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instance_id: instanceId,
          access_token: BABASERVICE_CONFIG.ACCESS_TOKEN
        })
      });

      const data = await response.json();
      console.log('📱 استجابة إعادة التعيين:', data);

      if (data && data.success) {
        this.currentInstance = null;
        return true;
      } else {
        throw new Error(data.error || 'فشل في إعادة تعيين Instance');
      }
    } catch (error: any) {
      console.error('❌ خطأ في إعادة تعيين Instance:', error);
      return false;
    }
  }

  /**
   * الحصول على معلومات Instance الحالي
   */
  getCurrentInstance(): InstanceInfo | null {
    return this.currentInstance;
  }

  /**
   * بدء مراقبة Instance
   */
  startMonitoring(intervalMs: number = 30000) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      if (this.currentInstance) {
        await this.checkInstanceStatus(this.currentInstance.instanceId);
      }
    }, intervalMs);
  }

  /**
   * إيقاف مراقبة Instance
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export const instanceManager = InstanceManager.getInstance();





