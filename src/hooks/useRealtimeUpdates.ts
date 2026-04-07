import { supabase } from '@/lib/supabase/config';
import { useCallback, useEffect, useRef } from 'react';

export interface RealtimeQueryConfig {
  table: string;
  schema?: string;
  filter?: string; // e.g. "userId=eq.123"
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}

interface UseRealtimeUpdatesOptions {
  enabled?: boolean;
  onUpdate?: (data: any[]) => void;
  onError?: (error: Error) => void;
  debounceMs?: number;
}

interface UseRealtimeUpdatesReturn {
  isConnected: boolean;
  lastUpdate: Date | null;
  error: Error | null;
  reconnect: () => void;
  disconnect: () => void;
}

export const useRealtimeUpdates = (
  queryConfig: RealtimeQueryConfig,
  options: UseRealtimeUpdatesOptions = {}
): UseRealtimeUpdatesReturn => {
  const {
    enabled = true,
    onUpdate,
    onError,
    debounceMs = 1000
  } = options;

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isConnectedRef = useRef(false);
  const lastUpdateRef = useRef<Date | null>(null);
  const errorRef = useRef<Error | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleUpdate = useCallback((data: any[]) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      lastUpdateRef.current = new Date();
      onUpdate?.(data);
    }, debounceMs);
  }, [onUpdate, debounceMs]);

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    isConnectedRef.current = false;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled || channelRef.current) return;

    const channelName = `realtime-${queryConfig.table}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    const pgConfig: Record<string, unknown> = {
      event: queryConfig.event || '*',
      schema: queryConfig.schema || 'public',
      table: queryConfig.table
    };
    if (queryConfig.filter) {
      pgConfig.filter = queryConfig.filter;
    }

    channel.on('postgres_changes' as any, pgConfig, (payload: any) => {
      isConnectedRef.current = true;
      errorRef.current = null;
      handleUpdate([payload.new || payload.old]);
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isConnectedRef.current = true;
      } else if (status === 'CHANNEL_ERROR') {
        const err = new Error('Realtime channel error');
        errorRef.current = err;
        isConnectedRef.current = false;
        onError?.(err);
      }
    });

    channelRef.current = channel;
  }, [queryConfig, enabled, handleUpdate, onError]);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [disconnect, connect]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected: isConnectedRef.current,
    lastUpdate: lastUpdateRef.current,
    error: errorRef.current,
    reconnect,
    disconnect
  };
};
