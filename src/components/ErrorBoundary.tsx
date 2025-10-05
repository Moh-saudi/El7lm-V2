'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Suppress React hydration errors and other common errors
    if (error.message.includes('hydration') ||
        error.message.includes('Minified React error') ||
        error.message.includes('418') ||
        error.message.includes('423')) {
      console.warn('Suppressed React error:', error.message);
      this.setState({ hasError: false });
      return;
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;

      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              حدث خطأ غير متوقع
            </h2>
            <p className="text-gray-600 mb-6">
              نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.
            </p>
            <button
              onClick={this.resetError}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook to suppress React errors
export const useErrorSuppression = () => {
  React.useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('Minified React error #418') ||
          message.includes('Minified React error #423') ||
          message.includes('hydration')) {
        console.warn('Suppressed React error:', message);
        return;
      }
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const message = args.join(' ');
      if (message.includes('hydration') ||
          message.includes('Extra attributes from the server')) {
        console.info('Suppressed hydration warning:', message);
        return;
      }
      originalWarn.apply(console, args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);
};
