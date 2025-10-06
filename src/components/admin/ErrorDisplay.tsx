import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import React from 'react';

interface ErrorDisplayProps {
  error: string | Error;
  title?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'default' | 'destructive' | 'warning';
  showDetails?: boolean;
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title = 'حدث خطأ',
  onRetry,
  onDismiss,
  variant = 'destructive',
  showDetails = false,
  className = ''
}) => {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'destructive':
        return 'border-red-200 bg-red-50 text-red-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'warning':
        return 'text-yellow-600';
      case 'destructive':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Alert className={`${getVariantStyles()} ${className}`}>
      <AlertTriangle className={`h-4 w-4 ${getIconColor()}`} />
      <AlertTitle className="flex items-center justify-between">
        <span>{title}</span>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 hover:bg-transparent"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">{errorMessage}</p>

        {showDetails && errorStack && (
          <details className="mt-2">
            <summary className="cursor-pointer text-sm opacity-75 hover:opacity-100">
              تفاصيل الخطأ
            </summary>
            <pre className="mt-2 text-xs bg-white/50 p-2 rounded overflow-auto max-h-32">
              {errorStack}
            </pre>
          </details>
        )}

        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-3 flex items-center gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            إعادة المحاولة
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default ErrorDisplay;
