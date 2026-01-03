/**
 * Console Filter & Error Handling - Unified v4.0
 * This file serves as the single source for console overrides, error suppression, and ad-blocker handling.
 */

const errorsToHide = [
  // Firebase & Auth
  'missing or invalid firebase environment variables',
  'using fallback configuration',
  'firebase analytics initialized',
  'firebase initialized successfully',
  'auth state changed',
  'authprovider: state updated',
  'firebase scripts loaded',
  'firebase auth exists',

  // Network & External Services
  'geidea',
  'cors',
  'cross-origin',
  'refused to connect',
  'refused to frame',
  'blocked a frame with origin',
  'failed to load resource: the server responded with a status of 404',
  'net::err_name_not_resolved',
  'err_name_not_resolved',
  'network request filtered',
  'clarity.ms',
  'b.clarity.ms',
  'clarity script failed to load',
  'quic_protocol_error',
  'message port closed before a response was received',
  'messageport',
  'err_blocked_by_client',
  'blocked by client',

  // React & Hydration (Suppression)
  'minified react error #418', // Hydration mismatch
  'minified react error #423', // Invalid hook call
  'hydration',
  'validatedomnesting',
  'images loaded lazily',
  'each child in a list should have a unique "key" prop',

  // SVG & Path issues
  'expected moveto path command',
  'svg path',
  'path attribute d',

  // Supabase
  'supabase',
  'gotrueclient',
  'multiple gotrueclient instances',

  // Infrastructure & Development
  'webpack',
  'hot reload',
  'chunk',
  'passive event listener',
  'deprecated',
  'preload',
  'prefetch',
  'onload={function onload}',
  'strategy=... onload',
  'current url',
  'current pathname',
  'smart-script-loader.js'
];

// Reference to original console methods to prevent infinite loops
let originalError: any = null;
let originalWarn: any = null;
let originalLog: any = null;
let isInitialized = false;

const shouldHideMessage = (message: string): boolean => {
  if (!message || typeof message !== 'string') return false;
  const lowerMessage = message.toLowerCase();
  return errorsToHide.some(error => lowerMessage.includes(error.toLowerCase()));
};

export const initializeConsoleFilter = () => {
  if (typeof window === 'undefined' || isInitialized) return;

  // Capture originals once
  originalError = console.error;
  originalWarn = console.warn;
  originalLog = console.log;

  // 1. Console Error Filter
  console.error = function (...args: any[]) {
    const message = args.join(' ');
    if (shouldHideMessage(message)) return;

    // Special handling for hydration mismatch
    if (message.includes('Minified React error #418') || message.includes('Minified React error #423')) {
      originalWarn.call(console, '🔧 Unified Console: Suppressed React Minified Error', message.substring(0, 100) + '...');
      return;
    }

    originalError.apply(console, args);
  };

  // 2. Console Warn Filter
  console.warn = function (...args: any[]) {
    const message = args.join(' ');
    if (shouldHideMessage(message)) return;
    originalWarn.apply(console, args);
  };

  // 3. Console Log Filter
  console.log = function (...args: any[]) {
    const message = args.join(' ');
    if (shouldHideMessage(message)) return;

    // Hide common noise in production
    if (process.env.NODE_ENV === 'production') {
      if (message.includes('loading:') || message.includes('user:')) return;
    }

    originalLog.apply(console, args);
  };

  // 4. Global Error Handlers (Ad-blockers / Promise Rejections)
  const handleGlobalErrors = (event: ErrorEvent | PromiseRejectionEvent) => {
    let message = '';
    if ('message' in event) {
      message = event.message;
    } else if ('reason' in event && event.reason) {
      message = event.reason.message || event.reason.toString();
    }

    if (shouldHideMessage(message)) {
      if (process.env.NODE_ENV === 'development') {
        originalLog.call(console, '🛡️ Unified Filter: Global error suppressed:', message.substring(0, 50));
      }
      event.preventDefault();
      return false;
    }
  };

  window.addEventListener('error', handleGlobalErrors);
  window.addEventListener('unhandledrejection', handleGlobalErrors);

  // 5. Fetch Interceptor (Network Filter)
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    return originalFetch(...args).catch(error => {
      if (error instanceof Error && shouldHideMessage(error.message)) {
        return Promise.reject(new Error('Network request filtered by Unified Console'));
      }
      return Promise.reject(error);
    });
  };

  isInitialized = true;
  originalLog.call(console, '🛡️ Unified Console Filter v4.0 Activated');
};

if (typeof window !== 'undefined') {
  initializeConsoleFilter();
}

export default initializeConsoleFilter;
