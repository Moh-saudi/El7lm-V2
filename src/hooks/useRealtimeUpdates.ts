import { DocumentData, onSnapshot, Query, Unsubscribe } from 'firebase/firestore';
import { useCallback, useEffect, useRef } from 'react';

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
  query: Query<DocumentData>,
  options: UseRealtimeUpdatesOptions = {}
): UseRealtimeUpdatesReturn => {
  const {
    enabled = true,
    onUpdate,
    onError,
    debounceMs = 1000
  } = options;

  const unsubscribeRef = useRef<Unsubscribe | null>(null);
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

  const handleError = useCallback((error: Error) => {
    errorRef.current = error;
    isConnectedRef.current = false;
    onError?.(error);
  }, [onError]);

  const connect = useCallback(() => {
    if (!enabled || unsubscribeRef.current) return;

    try {
      unsubscribeRef.current = onSnapshot(
        query,
        (snapshot) => {
          isConnectedRef.current = true;
          errorRef.current = null;

          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          handleUpdate(data);
        },
        (error) => {
          handleError(error);
        }
      );
    } catch (error) {
      handleError(error as Error);
    }
  }, [query, enabled, handleUpdate, handleError]);

  const disconnect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    isConnectedRef.current = false;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

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
