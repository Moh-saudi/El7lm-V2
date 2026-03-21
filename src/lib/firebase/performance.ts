import { db } from './config';
import { enableNetwork, disableNetwork } from 'firebase/firestore';

// إعدادات تحسين الأداء
export class FirebasePerformanceOptimizer {
  private static isOnline = true;
  private static networkListeners: Array<() => void> = [];

  // تفعيل وضع عدم الاتصال عند الحاجة
  static async enableOfflineMode() {
    try {
      await disableNetwork(db);
      this.isOnline = false;
      console.log('📱 Firebase offline mode enabled');
    } catch (error) {
      console.error('❌ Failed to enable offline mode:', error);
    }
  }

  // إعادة تفعيل الاتصال
  static async enableOnlineMode() {
    try {
      await enableNetwork(db);
      this.isOnline = true;
      console.log('🌐 Firebase online mode enabled');
    } catch (error) {
      console.error('❌ Failed to enable online mode:', error);
    }
  }

  // مسح الـ cache عند الحاجة
  static async clearCache() {
    try {
      // clearPersistence removed: not exported by firebase/firestore in this SDK version
      // await clearPersistence(db);
      console.log('🧹 Firebase cache cleared');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  // مراقبة حالة الشبكة
  static monitorNetworkStatus() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 Network is online');
        this.enableOnlineMode();
      });

      window.addEventListener('offline', () => {
        console.log('📱 Network is offline');
        this.enableOfflineMode();
      });
    }
  }

  // إضافة مستمع لتغييرات الشبكة
  static addNetworkListener(listener: () => void) {
    this.networkListeners.push(listener);
  }

  // إزالة مستمع الشبكة
  static removeNetworkListener(listener: () => void) {
    const index = this.networkListeners.indexOf(listener);
    if (index > -1) {
      this.networkListeners.splice(index, 1);
    }
  }

  // الحصول على حالة الاتصال
  static getNetworkStatus() {
    return this.isOnline;
  }

  // تحسين استعلامات Firestore
  static optimizeQuery(query: any, options: {
    limit?: number;
    orderBy?: string;
    where?: Array<{ field: string; operator: string; value: any }>;
  }) {
    let optimizedQuery = query;

    // إضافة حد للنتائج إذا لم يكن موجوداً
    if (options.limit && !query._query.limit) {
      optimizedQuery = optimizedQuery.limit(options.limit);
    }

    // إضافة ترتيب إذا لم يكن موجوداً
    if (options.orderBy && !query._query.orderBy.length) {
      optimizedQuery = optimizedQuery.orderBy(options.orderBy);
    }

    return optimizedQuery;
  }

  // تحسين عمليات الكتابة
  static async batchWrite(operations: Array<() => Promise<any>>, batchSize: number = 500) {
    const results = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch.map(op => op()));
      results.push(...batchResults);
      
      // انتظار قصير بين الـ batches لتجنب الضغط على الخادم
      if (i + batchSize < operations.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  // تحسين عمليات القراءة
  static async batchRead(operations: Array<() => Promise<any>>, batchSize: number = 100) {
    const results = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch.map(op => op()));
      results.push(...batchResults);
    }
    
    return results;
  }
}

// تهيئة مراقبة الشبكة
if (typeof window !== 'undefined') {
  FirebasePerformanceOptimizer.monitorNetworkStatus();
}

export default FirebasePerformanceOptimizer; 
