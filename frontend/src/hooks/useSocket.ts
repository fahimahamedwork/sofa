import { useEffect, useCallback, useRef } from 'react';
import { socketManager } from '@/lib/socket';

export function useSocket(event?: string, handler?: (...args: unknown[]) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const token = localStorage.getItem('sofa_token');
    socketManager.connect(token || undefined);
  }, []);

  useEffect(() => {
    if (!event || !handlerRef.current) return;

    const callback = (...args: unknown[]) => {
      handlerRef.current?.(...args);
    };

    socketManager.on(event, callback);

    return () => {
      socketManager.off(event, callback);
    };
  }, [event]);

  const joinRoom = useCallback((room: string) => {
    socketManager.joinRoom(room);
  }, []);

  const leaveRoom = useCallback((room: string) => {
    socketManager.leaveRoom(room);
  }, []);

  const emit = useCallback((event: string, ...args: unknown[]) => {
    socketManager.emit(event, ...args);
  }, []);

  return {
    connected: socketManager.connected,
    joinRoom,
    leaveRoom,
    emit,
  };
}
