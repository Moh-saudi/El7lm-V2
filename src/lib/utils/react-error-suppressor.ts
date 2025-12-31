export const suppressReactMinifiedErrors = () => {
  if (typeof window === 'undefined') return;

  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = function (...args: any[]) {
    const message = args.join(' ');

    if (
      message.includes('Minified React error #418') ||
      message.includes('Minified React error #423') ||
      message.includes('visit https://react.dev/errors/418') ||
      message.includes('visit https://react.dev/errors/423') ||
      message.includes('use the non-minified dev environment')
    ) {
      console.warn('🔧 React minified error suppressed:', message);
      return;
    }

    originalError.apply(console, args);
  };

  console.warn = function (...args: any[]) {
    const message = args.join(' ');

    if (
      message.includes('Minified React error #418') ||
      message.includes('Minified React error #423') ||
      message.includes('visit https://react.dev/errors/418') ||
      message.includes('visit https://react.dev/errors/423')
    ) {
      console.info('🔧 React minified warning suppressed:', message);
      return;
    }

    originalWarn.apply(console, args);
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason;

    if (error && typeof error === 'object') {
      const message = error.message || error.toString();

      if (
        message.includes('Minified React error #418') ||
        message.includes('Minified React error #423') ||
        message.includes('visit https://react.dev/errors/418') ||
        message.includes('visit https://react.dev/errors/423')
      ) {
        console.warn('🔧 React minified promise rejection suppressed:', message);
        event.preventDefault();
        return false;
      }
    }
  };

  const handleError = (event: ErrorEvent) => {
    const message = event.message || '';

    if (
      message.includes('Minified React error #418') ||
      message.includes('Minified React error #423') ||
      message.includes('visit https://react.dev/errors/418') ||
      message.includes('visit https://react.dev/errors/423')
    ) {
      console.warn('🔧 React minified error event suppressed:', message);
      event.preventDefault();
      return false;
    }
  };

  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  window.addEventListener('error', handleError);

  return () => {
    console.error = originalError;
    console.warn = originalWarn;
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    window.removeEventListener('error', handleError);
  };
};

export const initializeReactErrorSuppression = () => {
  console.log('🔧 Initializing React minified error suppression...');

  const cleanup = suppressReactMinifiedErrors();

  if (typeof window !== 'undefined') {
    const originalConsoleError = console.error;
    console.error = function (...args: any[]) {
      const message = args.join(' ');

      if (
        message.includes('message port closed before a response was received') ||
        message.includes('MessagePort') ||
        message.includes('ERR_BLOCKED_BY_CLIENT')
      ) {
        return;
      }

      originalConsoleError.apply(console, args);
    };
  }

  return cleanup;
};

export const setupDevelopmentErrorHandling = () => {
  if (process.env.NODE_ENV !== 'development') return;

  console.log('🔧 Initializing development error handling...');

  const originalError = console.error;
  console.error = function (...args: any[]) {
    const message = args.join(' ');

    if (message.includes('Minified React error #418')) {
      console.group('🚨 React Error #418 - Hydration Mismatch');
      console.error('This error occurs when the content rendered on server differs from client.');
      console.error('Solutions:');
      console.error('1. Ensure content is identical between SSR and CSR');
      console.error('2. Use suppressHydrationWarning for dynamic content');
      console.error('3. Avoid using window or localStorage during SSR');
      console.groupEnd();
      return;
    }

    if (message.includes('Minified React error #423')) {
      console.group('🚨 React Error #423 - Invalid Hook Call');
      console.error('This error occurs when hooks are called outside of a React component.');
      console.error('Solutions:');
      console.groupEnd();
      return;
    }

    originalError.apply(console, args);
  };
};
