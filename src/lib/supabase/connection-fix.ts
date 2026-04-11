import { supabase } from '@/lib/supabase/config';

export const retryOperation = async (
  operation: () => Promise<any>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<any> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Retrying operation (${attempt}/${maxRetries})`);
      const result = await operation();
      console.log('✅ Operation successful');
      return result;
    } catch (error: any) {
      lastError = error;
      console.warn(`⚠️ Operation failed (${attempt}/${maxRetries}):`, error.message);

      if (
        error.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError')
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

  throw lastError || new Error('Failed after all attempts');
};

// Alias for backward compatibility
export const retryFirebaseConnection = retryOperation;

export const checkConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error && error.code === 'PGRST301') return true; // permission denied = connected
    return !error;
  } catch (error: any) {
    console.warn('❌ Connection check failed:', error.message);
    return false;
  }
};

export const checkFirebaseConnection = checkConnection;

export const handleConnectionError = (error: any): string => {
  const errorMessage = error.message || error.toString();

  if (errorMessage.includes('ERR_BLOCKED_BY_CLIENT')) {
    return 'Connection blocked by AdBlocker. Please disable it for this site.';
  }
  if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
    return 'Internet connection issue. Please check your connectivity.';
  }
  if (errorMessage.includes('permission-denied') || errorMessage.includes('PGRST301')) {
    return 'Permission denied.';
  }
  if (errorMessage.includes('unavailable')) {
    return 'Service currently unavailable. Please try again later.';
  }
  return 'An unexpected error occurred. Please try again.';
};

export const handleFirebaseError = handleConnectionError;

export const setupConnectionMonitor = () => {
  if (typeof window === 'undefined') return;

  let isOnline = navigator.onLine;
  let connectionCheckInterval: NodeJS.Timeout | null = null;

  const handleOnline = () => {
    console.log('🌐 Online status restored');
    isOnline = true;
    checkConnection().then(connected => {
      if (connected) console.log('✅ Connection restored');
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
      const connected = await checkConnection();
      if (!connected) console.warn('⚠️ Lost connection to database');
    }
  }, 30000);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (connectionCheckInterval) clearInterval(connectionCheckInterval);
  };
};

export const setupFirebaseErrorHandler = () => {
  if (typeof window === 'undefined') return;

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason;
    if (error && typeof error === 'object' && error.code) {
      const message = handleConnectionError(error);
      console.error('🚨 Unhandled error:', message);
      event.preventDefault();
    }
  };

  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
};

export const initializeConnectionFixes = () => {
  console.log('🔧 Initializing connection fixes...');
  const cleanupConnectionMonitor = setupConnectionMonitor();
  const cleanupErrorHandler = setupFirebaseErrorHandler();

  return () => {
    if (cleanupConnectionMonitor) cleanupConnectionMonitor();
    if (cleanupErrorHandler) cleanupErrorHandler();
  };
};
