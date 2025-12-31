import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from './config';

export const retryFirebaseConnection = async (
  operation: () => Promise<any>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<any> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Retrying Firebase connection (${attempt}/${maxRetries})`);
      const result = await operation();
      console.log('✅ Firebase connection successful');
      return result;
    } catch (error: any) {
      lastError = error;
      console.warn(`⚠️ Connection failed (${attempt}/${maxRetries}):`, error.message);

      if (
        error.message.includes('ERR_BLOCKED_BY_CLIENT') ||
        error.message.includes('net::ERR_BLOCKED_BY_CLIENT') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError')
      ) {
        console.warn('🚫 Connection blocked by AdBlocker or Network issues');
        break;
      }

      if (attempt < maxRetries) {
        const waitTime = delay * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${waitTime}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError || new Error('Failed to connect to Firebase after all attempts');
};

export const checkFirebaseConnection = async (): Promise<boolean> => {
  try {
    const testRef = query(collection(db, '_test_connection'), limit(1));
    await getDocs(testRef);
    return true;
  } catch (error: any) {
    if (error?.code === 'permission-denied') return true;
    console.warn('❌ Firebase connection check failed:', error.message);
    return false;
  }
};

export const handleFirebaseError = (error: any): string => {
  const errorMessage = error.message || error.toString();

  if (errorMessage.includes('ERR_BLOCKED_BY_CLIENT')) {
    return 'Connection blocked by AdBlocker. Please disable it for this site.';
  }

  if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
    return 'Internet connection issue. Please check your connectivity.';
  }

  if (errorMessage.includes('permission-denied')) {
    return 'Permission denied.';
  }

  if (errorMessage.includes('unavailable')) {
    return 'Firebase service currently unavailable. Please try again later.';
  }

  if (errorMessage.includes('deadline-exceeded')) {
    return 'Connection timed out. Please try again.';
  }

  return 'An unexpected error occurred. Please try again.';
};

export const setupConnectionMonitor = () => {
  if (typeof window === 'undefined') return;

  let isOnline = navigator.onLine;
  let connectionCheckInterval: NodeJS.Timeout | null = null;

  const handleOnline = () => {
    console.log('🌐 Online status restored');
    isOnline = true;

    checkFirebaseConnection().then(connected => {
      if (connected) {
        console.log('✅ Firebase connection restored');
      }
    });
  };

  const handleOffline = () => {
    console.log('📴 Offline status detected');
    isOnline = false;
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  connectionCheckInterval = setInterval(async () => {
    if (isOnline) {
      const connected = await checkFirebaseConnection();
      if (!connected) {
        console.warn('⚠️ Lost connection to Firebase');
      }
    }
  }, 30000);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
    }
  };
};

export const setupFirebaseErrorHandler = () => {
  if (typeof window === 'undefined') return;

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason;

    if (error && typeof error === 'object' && error.code) {
      const message = handleFirebaseError(error);
      console.error('🚨 Unhandled Firebase error:', message);
      event.preventDefault();
    }
  };

  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  return () => {
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
};

export const initializeConnectionFixes = () => {
  console.log('🔧 Initializing Firebase connection fixes...');

  const cleanupConnectionMonitor = setupConnectionMonitor();
  const cleanupErrorHandler = setupFirebaseErrorHandler();

  return () => {
    if (cleanupConnectionMonitor) cleanupConnectionMonitor();
    if (cleanupErrorHandler) cleanupErrorHandler();
  };
};
