import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/index';

interface ConnectionStatusProps {
  isConnected: boolean;
  lastUpdate: Date | null;
  error: Error | null;
  onReconnect: () => void;
  className?: string;
  showLastUpdate?: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  lastUpdate,
  error,
  onReconnect,
  className = '',
  showLastUpdate = true
}) => {
  const getStatusColor = () => {
    if (error) return 'destructive';
    if (isConnected) return 'default';
    return 'secondary';
  };

  const getStatusText = () => {
    if (error) return 'خطأ في الاتصال';
    if (isConnected) return 'متصل';
    return 'غير متصل';
  };

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="h-3 w-3" />;
    if (isConnected) return <Wifi className="h-3 w-3" />;
    return <WifiOff className="h-3 w-3" />;
  };

  const formatLastUpdate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return date.toLocaleDateString('ar-EG');
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge variant={getStatusColor()} className="flex items-center gap-1">
        {getStatusIcon()}
        <span className="text-xs">{getStatusText()}</span>
      </Badge>

      {showLastUpdate && lastUpdate && (
        <span className="text-xs text-gray-500">
          آخر تحديث: {formatLastUpdate(lastUpdate)}
        </span>
      )}

      {error && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReconnect}
          className="h-6 px-2"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};

export default ConnectionStatus;
