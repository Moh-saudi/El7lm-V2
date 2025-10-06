import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ErrorToastProps {
  error: string | Error;
  title?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const showErrorToast = ({
  error,
  title = 'خطأ',
  duration = 5000,
  action
}: ErrorToastProps) => {
  const errorMessage = error instanceof Error ? error.message : error;

  toast.error(title, {
    description: errorMessage,
    duration,
    action: action ? {
      label: action.label,
      onClick: action.onClick
    } : undefined,
    className: 'border-red-200 bg-red-50 text-red-800',
    icon: <AlertTriangle className="h-4 w-4 text-red-600" />
  });
};

export const showSuccessToast = (message: string, title = 'نجح') => {
  toast.success(title, {
    description: message,
    duration: 3000,
    className: 'border-green-200 bg-green-50 text-green-800'
  });
};

export const showWarningToast = (message: string, title = 'تحذير') => {
  toast.warning(title, {
    description: message,
    duration: 4000,
    className: 'border-yellow-200 bg-yellow-50 text-yellow-800'
  });
};

export const showInfoToast = (message: string, title = 'معلومة') => {
  toast.info(title, {
    description: message,
    duration: 3000,
    className: 'border-blue-200 bg-blue-50 text-blue-800'
  });
};

// Hook for consistent error handling
export const useErrorHandler = () => {
  const handleError = (error: unknown, context?: string) => {
    const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
    const title = context ? `خطأ في ${context}` : 'خطأ';

    showErrorToast({
      error: errorMessage,
      title,
      action: {
        label: 'إعادة المحاولة',
        onClick: () => window.location.reload()
      }
    });

    // Log error for debugging
    console.error(`Error in ${context || 'unknown context'}:`, error);
  };

  const handleSuccess = (message: string, context?: string) => {
    const title = context ? `تم ${context} بنجاح` : 'نجح';
    showSuccessToast(message, title);
  };

  const handleWarning = (message: string, context?: string) => {
    const title = context ? `تحذير في ${context}` : 'تحذير';
    showWarningToast(message, title);
  };

  const handleInfo = (message: string, context?: string) => {
    const title = context ? `معلومة حول ${context}` : 'معلومة';
    showInfoToast(message, title);
  };

  return {
    handleError,
    handleSuccess,
    handleWarning,
    handleInfo
  };
};
