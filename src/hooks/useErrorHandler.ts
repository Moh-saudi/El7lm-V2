import { useCallback } from 'react';
import { showErrorToast, showSuccessToast, showWarningToast, showInfoToast } from '@/components/admin/ErrorToast';

interface ErrorHandlerOptions {
  context?: string;
  showToast?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
}

export const useErrorHandler = () => {
  const handleError = useCallback((
    error: unknown, 
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      context = 'العملية',
      showToast = true,
      logError = true,
      fallbackMessage = 'حدث خطأ غير متوقع'
    } = options;

    const errorMessage = error instanceof Error ? error.message : fallbackMessage;
    const title = `خطأ في ${context}`;

    if (logError) {
      console.error(`Error in ${context}:`, error);
    }

    if (showToast) {
      showErrorToast({
        error: errorMessage,
        title,
        action: {
          label: 'إعادة المحاولة',
          onClick: () => window.location.reload()
        }
      });
    }

    return {
      message: errorMessage,
      title,
      originalError: error
    };
  }, []);

  const handleSuccess = useCallback((message: string, context?: string) => {
    const title = context ? `تم ${context} بنجاح` : 'نجح';
    showSuccessToast(message, title);
  }, []);

  const handleWarning = useCallback((message: string, context?: string) => {
    const title = context ? `تحذير في ${context}` : 'تحذير';
    showWarningToast(message, title);
  }, []);

  const handleInfo = useCallback((message: string, context?: string) => {
    const title = context ? `معلومة حول ${context}` : 'معلومة';
    showInfoToast(message, title);
  }, []);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, options);
      return null;
    }
  }, [handleError]);

  return {
    handleError,
    handleSuccess,
    handleWarning,
    handleInfo,
    handleAsyncError
  };
};
