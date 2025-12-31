import { initializeReactErrorSuppression, setupDevelopmentErrorHandling } from './react-error-suppressor';

export const initializeErrorHandling = () => {
  if (typeof window === 'undefined') return;

  console.log('🔧 Initializing comprehensive error handling...');

  try {
    const cleanupReactErrors = initializeReactErrorSuppression();

    setupDevelopmentErrorHandling();

    const originalConsoleError = console.error;
    console.error = function (...args: any[]) {
      const message = args.join(' ');

      if (
        message.includes('message port closed before a response was received') ||
        message.includes('MessagePort') ||
        message.includes('ERR_BLOCKED_BY_CLIENT') ||
        message.includes('net::ERR_BLOCKED_BY_CLIENT')
      ) {
        return;
      }

      originalConsoleError.apply(console, args);
    };

    const handleAdBlockerError = (event: ErrorEvent) => {
      if (
        event.message.includes('ERR_BLOCKED_BY_CLIENT') ||
        event.message.includes('net::ERR_BLOCKED_BY_CLIENT') ||
        event.message.includes('blocked by client')
      ) {
        console.warn('🚫 Request blocked by AdBlocker:', event.message);
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', handleAdBlockerError);

    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;

      if (error && typeof error === 'object') {
        const message = error.message || error.toString();

        if (
          message.includes('ERR_BLOCKED_BY_CLIENT') ||
          message.includes('net::ERR_BLOCKED_BY_CLIENT') ||
          message.includes('blocked by client')
        ) {
          console.warn('🚫 Promise blocked by AdBlocker:', message);
          event.preventDefault();
          return false;
        }
      }
    };

    window.addEventListener('unhandledrejection', handlePromiseRejection);

    console.log('✅ Error handling initialized successfully');

    return () => {
      if (cleanupReactErrors) cleanupReactErrors();
      console.error = originalConsoleError;
      window.removeEventListener('error', handleAdBlockerError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };

  } catch (error) {
    console.warn('Failed to initialize error handling:', error);
  }
};

if (typeof window !== 'undefined') {
  initializeErrorHandling();
}
